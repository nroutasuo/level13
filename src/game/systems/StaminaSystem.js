define([
    'ash',
    'game/GameGlobals',
    'game/GlobalSignals',
    'game/constants/GameConstants',
    'game/constants/LogConstants',
    'game/constants/PlayerStatConstants',
    'game/constants/PerkConstants',
    'game/nodes/player/StaminaNode',
    'game/components/common/LogMessagesComponent',
    'game/components/player/PlayerActionComponent'
], function (Ash, GameGlobals, GlobalSignals, GameConstants, LogConstants, PlayerStatConstants, PerkConstants, StaminaNode, LogMessagesComponent, PlayerActionComponent) {
    var StaminaSystem = Ash.System.extend({
        
        gameState: null,
        nodeList: null,
        
        warningLimit: -1,
        isWarning: true, // skip warning log on first update

        constructor: function () {
        },

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
                this.updateNode(node, time);
            }
        },

        updateNode: function (node, time) {
			var staminaComponent = node.stamina;
			var perksComponent = node.perks;
            var busyComponent = node.entity.get(PlayerActionComponent);
            var isResting = busyComponent && busyComponent.getLastActionName() == "use_in_home";
            var isHealing = busyComponent && busyComponent.getLastActionName() == "use_in_hospital";
			
            // health
			var injuryEffects = perksComponent.getTotalEffect(PerkConstants.perkTypes.injury);
			var healthEffects = perksComponent.getTotalEffect(PerkConstants.perkTypes.health);
			healthEffects = healthEffects === 0 ? 1 : healthEffects;
            var newHealth = Math.max(PlayerStatConstants.HEALTH_MINIMUM, Math.round(200 * healthEffects * injuryEffects) / 2);
            var oldHealth = staminaComponent.health;
			staminaComponent.health = newHealth;
            staminaComponent.maxHP = newHealth;
            if (staminaComponent.hp > newHealth) staminaComponent.hp = newHealth;
            
            if (newHealth !== oldHealth) {
                staminaComponent.resetHP();
                GlobalSignals.healthChangedSignal.dispatch();
            }
			
            // stamina
            var healthVal = staminaComponent.health;
            var maxVal = healthVal * PlayerStatConstants.HEALTH_TO_STAMINA_FACTOR;
            var staminaPerSec = 0;
            staminaComponent.accSources = [];
            var addAccumulation = function (sourceName, value) {
                var staminaPerSecSource = Math.floor(value * GameConstants.gameSpeedCamp * 100) / 100;
                staminaPerSec += staminaPerSecSource;
                staminaComponent.accSources.push({ source: sourceName, amount: staminaPerSecSource });
            };
            if (node.position.inCamp) {
                addAccumulation("Base",  2 * staminaComponent.health / 10 / 60);
            }
            if (isResting) {
                var timeLeft = busyComponent.getBusyTimeLeft();
                addAccumulation("Resting",  Math.floor((maxVal - staminaComponent.stamina) / timeLeft * 4) / 4);
            }
            if (isHealing) {
                var timeLeft = busyComponent.getBusyTimeLeft();
                addAccumulation("Treatment",  Math.floor((maxVal - staminaComponent.stamina) / timeLeft * 4) / 4);
            }
			staminaComponent.stamina += time * staminaPerSec;
			staminaComponent.accumulation = staminaPerSec;
            
			if (staminaComponent.stamina > maxVal) {
				staminaComponent.stamina = maxVal;
			}
				
			if (staminaComponent.stamina < 0) {
				staminaComponent.stamina = 0;
			}
            
            // stamina warning
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
        
        updateWarningLimit: function () {
            if (GameGlobals.gameState.uiStatus.isHidden) return;
            this.warningLimit = PlayerStatConstants.getStaminaWarningLimit(this.nodeList.head.stamina);
        }
    });

    return StaminaSystem;
});
