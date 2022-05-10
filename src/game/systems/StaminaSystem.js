define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/FightConstants',
	'game/constants/GameConstants',
	'game/constants/LogConstants',
	'game/constants/PlayerStatConstants',
	'game/constants/PerkConstants',
	'game/nodes/player/StaminaNode',
	'game/components/common/LogMessagesComponent',
	'game/components/player/PlayerActionComponent'
], function (Ash, GameGlobals, GlobalSignals, FightConstants, GameConstants, LogConstants, PlayerStatConstants, PerkConstants, StaminaNode, LogMessagesComponent, PlayerActionComponent) {
	var StaminaSystem = Ash.System.extend({
		
		gameState: null,
		nodeList: null,
		
		warningLimit: -1,
		isWarning: true, // skip warning log on first update

		constructor: function () { },

		addToEngine: function (engine) {
			this.engine = engine;
			this.nodeList = engine.getNodeList(StaminaNode);
			
			var sys = this;
			GlobalSignals.playerMovedSignal.add(function () { sys.updateWarningLimit(); });
			GlobalSignals.healthChangedSignal.add(function () { sys.updateWarningLimit(); });
			GlobalSignals.gameShownSignal.add(function () { sys.updateWarningLimit(); });
		},

		removeFromEngine: function (engine) {
			this.nodeList = null;
			this.engine = null;
		},

		update: function (time) {
			if (GameGlobals.gameState.isPaused) return;
			for (var node = this.nodeList.head; node; node = node.next) {
				this.updateStamina(node, time);
			}
		},

		updateStamina: function (node, time) {
			this.updateHealth(node, time);
			this.updateStaminaValue(node, time);
			this.updateStaminaWarning(node, time);
			this.updateShield(node, time);
		},
		
		updateHealth: function (node, time) {
			var staminaComponent = node.stamina;
			var perksComponent = node.perks;
			var healthPerks = perksComponent.getPerksByType(PerkConstants.perkTypes.health);
			
			var newHealth = PlayerStatConstants.getMaxHealth(perksComponent);
			var oldHealth = staminaComponent.health;
			staminaComponent.healthAccSources = [];
			staminaComponent.health = newHealth;
			staminaComponent.maxStamina = PlayerStatConstants.getMaxStamina(perksComponent);
			
			var healthPerSec = 0;
			var addHealthAccumulation = function (sourceName, value) {
				var healthPerSecSource = Math.floor(value * GameConstants.gameSpeedCamp * 100) / 100;
				healthPerSec += value;
				staminaComponent.healthAccSources.push({ source: sourceName, amount: null });
			};
			for (var i = 0; i < healthPerks.length; i++) {
				var perk = healthPerks[i];
				if (PerkConstants.getStatus(perk) == PerkConstants.perkStatus.ACTIVATING) {
					if (PerkConstants.isNegative(perk)) {
						addHealthAccumulation(perk.name, -1);
					} else {
						addHealthAccumulation(perk.name, 1);
					}
				}
			}
			staminaComponent.healthAccumulation = healthPerSec;
			
			staminaComponent.maxHP = newHealth;
			if (staminaComponent.hp > newHealth) staminaComponent.hp = newHealth;
			
			if (newHealth !== oldHealth) {
				staminaComponent.resetHP();
				GlobalSignals.healthChangedSignal.dispatch();
			}
		},
		
		updateStaminaValue: function (node, time) {
			var staminaComponent = node.stamina;
			var busyComponent = node.entity.get(PlayerActionComponent);
			var isResting = busyComponent && busyComponent.getLastActionName() == "use_in_home";
			var isHealing = busyComponent && busyComponent.getLastActionName() == "use_in_hospital";
			
			var maxVal = staminaComponent.maxStamina;
			var staminaPerSec = 0;
			staminaComponent.accSources = [];
			var addAccumulation = function (sourceName, value) {
				var staminaPerSecSource = Math.floor(value * GameConstants.gameSpeedCamp * 100) / 100;
				staminaPerSec += staminaPerSecSource;
				staminaComponent.accSources.push({ source: sourceName, amount: staminaPerSecSource });
			};
			if (node.position.inCamp) {
				addAccumulation("Base", 2 * staminaComponent.health / 10 / 60);
			}
			if (isResting) {
				var timeLeft = busyComponent.getBusyTimeLeft();
				addAccumulation("Resting", Math.floor((maxVal - staminaComponent.stamina) / timeLeft * 4) / 4);
			}
			if (isHealing) {
				var timeLeft = busyComponent.getBusyTimeLeft();
				addAccumulation("Treatment", Math.floor((maxVal - staminaComponent.stamina) / timeLeft * 4) / 4);
			}
			staminaComponent.stamina += time * staminaPerSec;
			staminaComponent.accumulation = staminaPerSec;
			
			if (staminaComponent.stamina > maxVal) {
				staminaComponent.stamina = maxVal;
			}
				
			if (staminaComponent.stamina < 0) {
				staminaComponent.stamina = 0;
			}
		},
		
		updateStaminaWarning: function (node, time) {
			var staminaComponent = node.stamina;
			var isWarning = staminaComponent.stamina <= this.warningLimit;
			if (isWarning && !this.isWarning) {
				var logComponent = node.entity.get(LogMessagesComponent);
				var hasCamp = GameGlobals.gameState.unlockedFeatures.camp;
				if (!node.position.inCamp) {
					if (hasCamp)
						logComponent.addMessage(LogConstants.MSG_ID_STAMINA_WARNING, "Getting tired. Should head back to camp soon.");
					else
						logComponent.addMessage(LogConstants.MSG_ID_STAMINA_WARNING, "Getting tired. Should find a place to rest soon.");
				}
			}
			this.isWarning = isWarning;
		},
		
		updateShield: function (node, time) {
			var staminaComponent = node.stamina;
			var itemsComponent = node.items;
			staminaComponent.maxShield = FightConstants.getPlayerShield(staminaComponent, itemsComponent);
		},
		
		updateWarningLimit: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			this.warningLimit = PlayerStatConstants.getStaminaWarningLimit(this.nodeList.head.stamina);
		}
	});

	return StaminaSystem;
});
