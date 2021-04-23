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
		
		fightNodes: null,
		playerStatsNodes: null,
		totalFightTime: 0,
		
		context: "fight",
		
		constructor: function () { },

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
			this.fightNodes.head.fight.nextTurnEnemy = startDelay + FightConstants.getEnemyAttackTime(enemy) * Math.random();
			this.fightNodes.head.fight.nextTurnPlayer = startDelay + FightConstants.getPlayerAttackTime(itemsComponent) * Math.random();
			this.totalFightTime = 0;
			
			var playerStamina = this.playerStatsNodes.head.stamina;
			playerStamina.resetHP();
			
			var duration = FightConstants.getFightExpectedDuration(enemy, playerStamina, itemsComponent);
			var winChance = FightConstants.getFightWinProbability(enemy, playerStamina, itemsComponent);
			this.log("init fight | enemy IV: " + enemy.getIVAverage() + " | expected duration: " + Math.round(duration*100)/100 + ", win chance: " + Math.round(winChance*100)/100);
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
			var damageByPlayer = 0;
			var enemyChange = 0;
			this.fightNodes.head.fight.nextTurnPlayer -= fightTime;
			if (this.fightNodes.head.fight.nextTurnPlayer <= 0) {
				var isMiss = Math.random() < FightConstants.getMissChance(FightConstants.PARTICIPANT_TYPE_FRIENDLY);
				if (!isMiss) {
					damageByPlayer = FightConstants.getDamageByPlayerPerHit(enemy, playerStamina, itemsComponent);
					var attackTime = FightConstants.getPlayerAttackTime(itemsComponent);
					this.fightNodes.head.fight.nextTurnPlayer = attackTime;
					enemyChange = this.getFinalDamage(damageByPlayer, FightConstants.PARTICIPANT_TYPE_FRIENDLY);
					this.log("player hit: " + enemyChange);
				} else {
					this.log("player missed");
				}
			}
			
			// enemy turn
			var damageByEnemy = 0;
			var playerChange = 0;
			if (itemEffects.enemyStunnedSeconds <= 0) {
				this.fightNodes.head.fight.nextTurnEnemy -= fightTime;
				if (this.fightNodes.head.fight.nextTurnEnemy <= 0) {
					var isMiss = Math.random() < FightConstants.getMissChance(FightConstants.PARTICIPANT_TYPE_ENEMY);
					if (!isMiss) {
						damageByEnemy = FightConstants.getDamageByPlayerPerHit(enemy, playerStamina, itemsComponent);
						var attackTime = FightConstants.getEnemyAttackTime(enemy);
						this.fightNodes.head.fight.nextTurnEnemy = attackTime;
						playerChange = this.getFinalDamage(damageByEnemy, FightConstants.PARTICIPANT_TYPE_ENEMY);
						this.log("enemy hit: " + playerChange);
					} else {
						this.log("enemy missed");
					}
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
			enemy.hp -= (enemyChange + extraDamageToEnemy);
			enemy.hp = Math.max(enemy.hp, 0);
			playerStamina.hp -= playerChange;
			playerStamina.hp = Math.max(playerStamina.hp, 0);
			
			if (playerChange !== 0 || enemyChange !== 0 || extraDamageToEnemy !== 0) {
				GlobalSignals.fightUpdateSignal.dispatch(playerChange, enemyChange);
			}
		},
		
		getFinalDamage: function (value, participantType) {
			if (value <= 0) return 0;
			var result = value;
			if (result < 1) result = 1;
			if (Math.random() < FightConstants.getCriticalHitChance(participantType))
				result = result * 2;
			return Math.round(result * 4)/4;
		},
		
		endFight: function () {
			var sector = this.fightNodes.head.entity;
			var enemy = this.fightNodes.head.fight.enemy;
			var playerStamina = this.playerStatsNodes.head.stamina;
			var won = playerStamina.hp > enemy.hp;
			
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
				
				this.fightNodes.head.fight.resultVO = GameGlobals.playerActionResultsHelper.getFightRewards(won, enemy);
				this.playerStatsNodes.head.entity.add(new PlayerActionResultComponent(this.fightNodes.head.fight.resultVO));
				
				enemy.resetHP();
				playerStamina.resetHP();
				this.fightNodes.head.fight.won = won;
				this.fightNodes.head.fight.finished = true;
			}.bind(this), 700);
		},
		
		fleeFight: function () {
			var enemy = this.fightNodes.head.fight.enemy;
			var playerStamina = this.playerStatsNodes.head.stamina;
			enemy.resetHP();
			playerStamina.resetHP();
			this.fightNodes.head.fight.fled = true;
		},
		
		log: function (msg) {
			log.i("[" + Math.round(this.totalFightTime * 100)/100 + "] " + msg, this);
		}
		
	});

	return FightSystem;
});
