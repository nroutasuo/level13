// Helper methods related to player actions (costs, requirements, descriptions) - common definitions for all actions
define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/EnemyConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/LocaleConstants',
	'game/constants/FightConstants',
	'game/components/sector/EnemiesComponent',
	'game/components/sector/SectorControlComponent',
	'game/components/sector/FightComponent',
	'game/components/sector/FightEncounterComponent',
	'game/components/type/GangComponent',
	'game/nodes/PlayerLocationNode',
	'game/nodes/player/PlayerStatsNode',
	'game/systems/FaintingSystem'
], function (
	Ash, GameGlobals, GlobalSignals, GameConstants, EnemyConstants, PlayerActionConstants, LocaleConstants, FightConstants,
	EnemiesComponent, SectorControlComponent, FightComponent, FightEncounterComponent, GangComponent,
	PlayerLocationNode, PlayerStatsNode,
	FaintingSystem
) {
	var FightHelper = Ash.Class.extend({

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
		},

		handleRandomEncounter: function (action, winCallback, fleeCallback, loseCallback) {
			var baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(action);
			var hasEnemies = this.hasEnemiesCurrentLocation(action);
			if (hasEnemies && GameGlobals.gameState.unlockedFeatures.camp && !GameGlobals.gameState.isAutoPlaying) {
				var vision = this.playerStatsNodes.head.vision.value;
				var encounterFactor = GameGlobals.playerActionsHelper.getEncounterFactor(action);
				var sectorFactor = GameGlobals.sectorHelper.getDangerFactor(this.playerLocationNodes.head.entity);
				var encounterProbability = PlayerActionConstants.getRandomEncounterProbability(baseActionID, vision, sectorFactor, encounterFactor);
				if (Math.random() < encounterProbability) {
					this.pendingEnemies = this.getEnemyCount(action);
					this.totalEnemies = this.pendingEnemies;
					this.pendingWinCallback = winCallback;
					this.pendingFleeCallback = fleeCallback;
					this.pendingLoseCallback = loseCallback;
					this.initFight(action);
					return;
				}
			}

			winCallback();
		},

		hasEnemiesCurrentLocation: function (action) {
			if (!this.playerLocationNodes.head) return false;
			var enemiesComponent = this.playerLocationNodes.head.entity.get(EnemiesComponent);
			if (enemiesComponent.hasEnemies) return true;
			var baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(action);
			switch (baseActionID) {
				case "fight_gang":
				case "clear_workshop":
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
			if (GameGlobals.gameFlowLogger.isEnabled) log.i("init fight: " + action);
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
			sector.add(new FightEncounterComponent(enemy, action, this.pendingEnemies, this.totalEnemies, gangComponent));
			GameGlobals.uiFunctions.showFight();
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

		endFight: function (isTakeAll) {
			var sector = this.playerLocationNodes.head.entity;
			var encounterComponent = sector.get(FightEncounterComponent);
			var fightComponent = sector.get(FightComponent);
			if (fightComponent && !fightComponent.fled) {
				if (fightComponent.won) {
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
			} else {
				if (this.pendingFleeCallback) this.pendingFleeCallback();
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
			var sectorControlComponent = this.playerLocationNodes.head.entity.get(SectorControlComponent);
			var baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(action);
			var localeId = FightConstants.getEnemyLocaleId(baseActionID, action);
			switch (baseActionID) {
				case "clear_workshop":
					return sectorControlComponent.getCurrentEnemies(localeId);
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
				var gangEnemy = EnemyConstants.getEnemy(gangComponent.getNextEnemyID());
				if (gangEnemy) {
					return gangEnemy;
				}
			}
			return enemiesComponent.getNextEnemy()
		},

		save: function () {
			GlobalSignals.saveGameSignal.dispatch();
		},

	});

	return FightHelper;
});
