// A system that handles fights. A fight is started by creating a FightNode and ended by this system.
define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/FightConstants',
	'game/constants/PositionConstants',
	'game/constants/EnemyConstants',
	'game/nodes/FightNode',
	'game/nodes/player/PlayerStatsNode',
	'game/components/common/PositionComponent',
	'game/components/sector/FightEncounterComponent',
	'game/components/sector/SectorControlComponent',
	'game/components/player/ItemsComponent',
	'game/components/player/PlayerActionResultComponent',
], function (Ash, GameGlobals, GlobalSignals, FightConstants, PositionConstants, EnemyConstants,
	FightNode, PlayerStatsNode,
	PositionComponent,
	FightEncounterComponent, SectorControlComponent,
	ItemsComponent, PlayerActionResultComponent) {
	
	var FightSystem = Ash.System.extend({
		
		isLoggingEnabled: false,
		
		fightNodes: null,
		playerStatsNodes: null,
		totalFightTime: 0,
		
		context: "fight",
		
		constructor: function (isLoggingEnabled) { this.isLoggingEnabled = isLoggingEnabled },

		addToEngine: function (engine) {
			this.engine = engine;
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			this.fightNodes = engine.getNodeList(FightNode);
			this.fightNodes.nodeAdded.add(this.onFightNodeAdded, this);
		},

		removeFromEngine: function (engine) {
			this.engine = null;
			this.fightNodes.nodeAdded.remove(this.onFightNodeAdded, this);
			this.playerStatsNodes = null;
			this.fightNodes = null;
		},
		
		onFightNodeAdded: function (node) {
			this.initFight();
		},

		update: function (time) {
			if (!this.fightNodes.head) return;
			if (this.fightNodes.head.fight.finishedPending) return;
			if (this.fightNodes.head.fight.finished) return;
			if (this.fightNodes.head.fight.fled) return;
			
			var enemy = this.fightNodes.head.fight.enemy;
			var playerStamina = this.playerStatsNodes.head.stamina;
			var itemEffects = this.fightNodes.head.fight.itemEffects;
			
			if (itemEffects.fled) {
				this.fleeFight();
			}
			
			if (enemy.hp <= 0 || playerStamina.hp <= 0) {
				this.endFight();
			}
			
			this.applyFightStep(time);
		},
		
		initFight: function () {
			var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			var enemy = this.fightNodes.head.fight.enemy;
			var startDelay = 0.25;
			enemy.resetHP();
			enemy.resetShield();
			
			this.fightNodes.head.fight.nextTurnEnemy = startDelay + FightConstants.getFirstTurnTime(FightConstants.getEnemyAttackTime(enemy), Math.random());
			this.fightNodes.head.fight.nextTurnPlayer = startDelay + FightConstants.getFirstTurnTime(FightConstants.getPlayerAttackTime(itemsComponent), Math.random());
			this.totalFightTime = 0;
			
			var playerStamina = this.playerStatsNodes.head.stamina;
			playerStamina.resetHP();
			playerStamina.resetShield();
			
			this.log("init fight | enemy IV: " + enemy.getIVAverage());
		},
		
		applyFightStep: function (time) {
			var fightTime = Math.min(time, 1);
			this.totalFightTime += fightTime;
			
			var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			var enemy = this.fightNodes.head.fight.enemy;
			var playerStamina = this.playerStatsNodes.head.stamina;
			var itemEffects = this.fightNodes.head.fight.itemEffects;
			
			// item effects: stun
			itemEffects.enemyStunnedSeconds -= fightTime;
			itemEffects.enemyStunnedSeconds = Math.max(itemEffects.enemyStunnedSeconds, 0);
			
			// player turn
			var damageToEnemy = 0;
			this.fightNodes.head.fight.nextTurnPlayer -= fightTime;
			if (this.fightNodes.head.fight.nextTurnPlayer <= 0) {
				let scenarios = FightConstants.getTurnScenarios(FightConstants.PARTICIPANT_TYPE_FRIENDLY, enemy, playerStamina, itemsComponent, this.totalFightTime);
				let scenario = this.pickTurnScenario(scenarios);
				damageToEnemy = scenario.damage;
				this.log(scenario.logMessage);
				this.fightNodes.head.fight.nextTurnPlayer = FightConstants.getPlayerAttackTime(itemsComponent);
			}
			
			// enemy turn
			var damageByEnemy = 0;
			var damageToPlayer = 0;
			if (itemEffects.enemyStunnedSeconds <= 0) {
				this.fightNodes.head.fight.nextTurnEnemy -= fightTime;
				if (this.fightNodes.head.fight.nextTurnEnemy <= 0) {
					let scenarios = FightConstants.getTurnScenarios(FightConstants.PARTICIPANT_TYPE_ENEMY, enemy, playerStamina, itemsComponent, this.totalFightTime);
					let scenario = this.pickTurnScenario(scenarios);
					damageToPlayer = scenario.damage;
					this.log(scenario.logMessage);
					this.fightNodes.head.fight.nextTurnEnemy = FightConstants.getEnemyAttackTime(enemy);
				}
			} else {
				this.log("enemy stunned");
			}
			
			// item effects: extra damage
			var extraDamageToEnemy = 0;
			if (itemEffects.damage > 0) {
				extraDamageToEnemy += itemEffects.damage;
				itemEffects.damage = 0;
				this.log("item damage: " + extraDamageToEnemy);
			}

			// apply effects
			let damageToEnemyRemaining = damageToEnemy + extraDamageToEnemy;
			if (enemy.shield > 0) {
				let damageToEnemyShield = Math.min(enemy.shield, damageToEnemyRemaining);
				enemy.shield -= damageToEnemyShield;
				damageToEnemyRemaining -= damageToEnemyShield;
			}
			enemy.hp -= damageToEnemyRemaining;
			enemy.hp = Math.max(enemy.hp, 0);
			
			let damageToPlayerRemaining = damageToPlayer;
			if (playerStamina.shield > 0) {
				let damageToPlayerShield = Math.min(playerStamina.shield, damageToPlayerRemaining);
				playerStamina.shield -= damageToPlayerShield;
				damageToPlayerRemaining -= damageToPlayerShield;
			}
			playerStamina.hp -= damageToPlayerRemaining;
			playerStamina.hp = Math.max(playerStamina.hp, 0);
			
			if (damageToPlayer !== 0 || damageToEnemy !== 0 || extraDamageToEnemy !== 0) {
				this.log("fight status: playerHP: " + playerStamina.hp + "+" + playerStamina.shield + ", enemyHP: " + enemy.hp + "+" + enemy.shield);
				GlobalSignals.fightUpdateSignal.dispatch(damageToPlayer, damageToEnemy);
			}
		},
		
		pickTurnScenario: function (scenarios) {
			let turnRoll = Math.random();
			let total = 0;
			for (let i = 0; i < scenarios.length; i++) {
				total += scenarios[i].probability;
				if (turnRoll < total) {
					return scenarios[i];
				}
			}
			log.w("fight turn scenarios don't add up to 1");
			return scenarios[scenarios.length-1];
		},
		
		endFight: function () {
			var sector = this.fightNodes.head.entity;
			var enemy = this.fightNodes.head.fight.enemy;
			var playerStamina = this.playerStatsNodes.head.stamina;
			var won = FightConstants.isWin(playerStamina.hp, enemy.hp);
			
			GlobalSignals.fightUpdateSignal.dispatch(0, 0);
			
			this.fightNodes.head.fight.finishedPending = true;
			setTimeout(function () {
				var encounterComponent = sector.get(FightEncounterComponent);
				if (encounterComponent.gangComponent) {
					// gang
					encounterComponent.gangComponent.addAttempt();
					if (won) encounterComponent.gangComponent.addWin();
				} else {
					// random encounter
					if (won) {
						var sectorControlComponent = sector.get(SectorControlComponent);
						var baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(encounterComponent.context);
						var localeId = FightConstants.getEnemyLocaleId(baseActionID, encounterComponent.context);
						sectorControlComponent.addWin(localeId);
					}
				}
				
				this.fightNodes.head.fight.resultVO = GameGlobals.playerActionResultsHelper ? GameGlobals.playerActionResultsHelper.getFightRewards(won, enemy) : null;
				this.playerStatsNodes.head.entity.add(new PlayerActionResultComponent(this.fightNodes.head.fight.resultVO));
				
				enemy.resetHP();
				enemy.resetShield();
				playerStamina.resetHP();
				playerStamina.resetShield();
				this.fightNodes.head.fight.won = won;
				this.fightNodes.head.fight.finished = true;
			}.bind(this), 700);
		},
		
		fleeFight: function () {
			var enemy = this.fightNodes.head.fight.enemy;
			var playerStamina = this.playerStatsNodes.head.stamina;
			enemy.resetHP();
			enemy.resetShield();
			playerStamina.resetHP();
			playerStamina.resetShield();
			this.fightNodes.head.fight.fled = true;
		},
		
		log: function (msg) {
			if (!msg) return;
			if (this.isLoggingEnabled) {
				log.i("[" + Math.round(this.totalFightTime * 100)/100 + "] " + msg, this);
			}
		}
		
	});

	return FightSystem;
});
