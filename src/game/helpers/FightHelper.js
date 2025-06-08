// Helper methods related to player actions (costs, requirements, descriptions) - common definitions for all actions
define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/EnemyConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/FightConstants',
	'game/constants/StoryConstants',
	'game/constants/WorldConstants',
	'game/components/sector/EnemiesComponent',
	'game/components/sector/FightComponent',
	'game/components/sector/FightEncounterComponent',
	'game/components/type/GangComponent',
	'game/nodes/PlayerLocationNode',
	'game/nodes/player/PlayerStatsNode',
	'game/systems/FaintingSystem',
	'worldcreator/EnemyCreator',
], function (
	Ash, GameGlobals, GlobalSignals, GameConstants, EnemyConstants, PlayerActionConstants, FightConstants, StoryConstants, WorldConstants,
	EnemiesComponent, FightComponent, FightEncounterComponent, GangComponent,
	PlayerLocationNode, PlayerStatsNode,
	FaintingSystem, EnemyCreator
) {
	let FightHelper = Ash.Class.extend({

		playerLocationNodes: null,
		playerStatsNodes: null,

		pendingEnemies: 0,
		totalEnemies: 0,
		pendingWinCallback: null,
		pendingFleeCallback: null,
		pendingLoseCallback: null,

		constructor: function (engine) {
			this.engine = engine;
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			this.enemyCreator = new EnemyCreator();
			this.enemyCreator.createEnemies();
		},

		handleFight: function (numEnemies, chance, action, winCallback, fleeCallback, loseCallback) {
			if (numEnemies === 0) {
				winCallback();
				return;
			}
			
			chance = this.getFightChance(chance || 0);
			numEnemies = numEnemies || 1;

			if (Math.random() > chance) {
				winCallback();
				return;
			}

			this.initFightSequence(action, numEnemies, winCallback, fleeCallback, loseCallback);
		},

		handleRandomEncounter: function (action, winCallback, fleeCallback, loseCallback) {
			let hasEnemies = this.hasEnemiesCurrentLocation(action);
			
			if (!hasEnemies) {
				winCallback();
				return;
			}
			
			if (!GameGlobals.gameState.unlockedFeatures.camp) {
				winCallback();
				return;
			}

			let encounterProbability = this.getRandomEncounterProbability(action);

			if (Math.random() > encounterProbability) {
				winCallback();
				return;
			}

			let numEnemies = this.getEnemyCount(action);
			this.initFightSequence(action, numEnemies, winCallback, fleeCallback, loseCallback);
		},

		getRandomEncounterProbability: function (action) {
			let baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(action);

			let vision = this.playerStatsNodes.head.vision.value;
			let sectorFactor = GameGlobals.sectorHelper.getDangerFactor(this.playerLocationNodes.head.entity);
			let encounterFactor = GameGlobals.playerActionsHelper.getEncounterFactor(action);

			let encounterProbability = PlayerActionConstants.getRandomEncounterProbability(baseActionID, vision, sectorFactor, encounterFactor);
			return this.getFightChance(encounterProbability);
		},

		getFightChance: function (chance) {
			let result = chance;

			if (GameGlobals.gameState.getStoryFlag(StoryConstants.flags.SPIRITS_MAGIC_PENDING)) {
				let magicEnemy = this.getValidEnemyWithTag("magic");
				if (magicEnemy) {
					result *= 3;
				}
			}

			return result;
		},

		initFightSequence: function (action, numEnemies, winCallback, fleeCallback, loseCallback) {
			this.pendingEnemies = numEnemies;
			this.totalEnemies = this.pendingEnemies;
			this.pendingWinCallback = winCallback;
			this.pendingFleeCallback = fleeCallback;
			this.pendingLoseCallback = loseCallback;

			this.initFight(action);
			
			GameGlobals.uiFunctions.showFight();
		},

		hasEnemiesCurrentLocation: function (action) {
			if (!this.playerLocationNodes.head) return false;
			var enemiesComponent = this.playerLocationNodes.head.entity.get(EnemiesComponent);
			if (enemiesComponent.hasEnemies) return true;
			var baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(action);
			switch (baseActionID) {
				case "fight_gang":
					return true;
				default:
					return false;
			}
		},

		initFight: function (action) {
			var sector = this.playerLocationNodes.head.entity;
			sector.remove(FightComponent);
			
			var enemiesComponent = sector.get(EnemiesComponent);
			enemiesComponent.selectNextEnemy();

			var baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(action);
			var gangComponent = null;

			if (baseActionID == "fight_gang") {
				var direction = parseInt(action.split("_")[2]);
				var position = this.playerLocationNodes.head.position;
				var gangEntity = GameGlobals.levelHelper.getGang(position, direction);
				gangComponent = gangEntity.get(GangComponent);
				log.i("gang enemy: " + gangComponent.enemyIDs.join(",") + ", previous attempts: " + gangComponent.numAttempts);
			}

			var enemy = this.getEnemy(enemiesComponent, gangComponent);
			if (!enemy) {
				log.w("couldn't start fight because there is no valid enemy for location");
				return;
			}

			sector.add(new FightEncounterComponent(enemy, action, this.pendingEnemies, this.totalEnemies, gangComponent));
		},

		startFight: function () {
			// TODO move to PlayerActionFunctions
			if (GameGlobals.playerActionsHelper.checkAvailability("fight", true)) {
				GameGlobals.playerActionsHelper.deductCosts("fight");
				var sector = this.playerLocationNodes.head.entity;
				var encounterComponent = sector.get(FightEncounterComponent);
				if (encounterComponent && encounterComponent.enemy) {
					sector.add(new FightComponent(encounterComponent.enemy));
				} else {
					if (GameGlobals.logWarnings) log.w("Encounter or enemy not initialized - cannot start fight.");
				}
			} else {
				if (GameGlobals.logWarnings) log.w("Can't start fight - availability check failed");
			}
		},

		endFight: function (isTakeAll, isFlee) {
			let sector = this.playerLocationNodes.head.entity;
			let encounterComponent = sector.get(FightEncounterComponent);
			let fightComponent = sector.get(FightComponent);

			if (isFlee || !fightComponent || fightComponent.fled) {
				if (this.pendingFleeCallback) this.pendingFleeCallback();
			} else if (fightComponent.won) {
				GameGlobals.playerActionResultsHelper.collectRewards(isTakeAll, fightComponent.resultVO);
				sector.get(EnemiesComponent).resetNextEnemy();
				this.pendingEnemies--;
				if (this.pendingEnemies > 0) {
					this.initFight(encounterComponent.context);
					return;
				}
				if (this.pendingWinCallback) {
					this.pendingWinCallback();
				}
			} else {
				GameGlobals.playerActionResultsHelper.collectRewards(isTakeAll, fightComponent.resultVO);
				if (this.pendingLoseCallback) this.pendingLoseCallback();
				this.engine.getSystem(FaintingSystem).fadeOutToLastVisitedCamp(false);
			}

			GameGlobals.uiFunctions.popupManager.closePopup("fight-popup");
			
			sector.remove(FightComponent);
			this.pendingWinCallback = null;
			this.pendingFleeCallback = null;
			this.pendingLoseCallback = null;
			GlobalSignals.fightEndedSignal.dispatch();
			this.save();
		},

		getEnemyCount: function (action) {
			var position = this.playerLocationNodes.head.position.getPosition();
			var baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(action);
			switch (baseActionID) {
				case "fight_gang":
					var direction = parseInt(action.split("_")[2]);
					var gangEntity = GameGlobals.levelHelper.getGang(position, direction);
					var gangComponent = gangEntity.get(GangComponent);
					return gangComponent.getEnemyCount();
				default: return 1;
			}
		},
		
		getEnemy: function (enemiesComponent, gangComponent) {
			if (gangComponent) {
				let gangEnemy = EnemyConstants.getEnemy(gangComponent.getNextEnemyID());
				if (gangEnemy) return gangEnemy;
			}

			if (GameGlobals.gameState.getStoryFlag(StoryConstants.flags.SPIRITS_MAGIC_PENDING)) {
				let magicEnemy = this.getValidEnemyWithTag("magic");
				if (magicEnemy) return magicEnemy;
			}

			return enemiesComponent.getNextEnemy()
		},

		getValidEnemyWithTag: function (tag) {
			let position = this.playerLocationNodes.head.position;

			let campOrdinal = GameGlobals.gameState.getCampOrdinal(position.level);
			let campStep = WorldConstants.CAMP_STEP_POI_2;
			let environmentTags = null;
			let enemyDifficulty = this.enemyCreator.getDifficulty(campOrdinal, campStep);

			let possibleEnemies = this.enemyCreator.getEnemies(enemyDifficulty, environmentTags, 1);
			possibleEnemies = possibleEnemies.concat(this.enemyCreator.getEnemies(enemyDifficulty - 1, environmentTags));
			possibleEnemies = possibleEnemies.concat(this.enemyCreator.getEnemies(enemyDifficulty + 1, environmentTags));
			possibleEnemies = possibleEnemies.concat(this.enemyCreator.getEnemies(enemyDifficulty + 2, environmentTags));

			possibleEnemies = possibleEnemies.filter(e => e.tags.indexOf(tag) >= 0);

			if (possibleEnemies.length == 0) return null;

			let index = Math.floor(Math.random() * possibleEnemies.length);
			return possibleEnemies[index].clone();
		},

		save: function () {
			GlobalSignals.saveGameSignal.dispatch(GameConstants.SAVE_SLOT_DEFAULT, false);
		},

	});

	return FightHelper;
});
