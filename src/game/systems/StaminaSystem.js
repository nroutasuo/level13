define([
    'ash', 
    'game/constants/GameConstants', 
    'game/constants/LogConstants', 
    'game/constants/PlayerStatConstants', 
    'game/constants/PerkConstants',
    'game/nodes/player/StaminaNode', 
    'game/components/common/LogMessagesComponent'
], function (Ash, GameConstants, LogConstants, PlayerStatConstants, PerkConstants, StaminaNode, LogMessagesComponent) {
    var StaminaSystem = Ash.System.extend({
        
        gameState: null,
        nodeList: null,
        isWarning: true, // skip warning log on first update

        constructor: function (gameState, playerActionsHelper) {
            this.gameState = gameState;
            this.playerActionsHelper = playerActionsHelper;
        },

        addToEngine: function (engine) {
            this.engine = engine;
            this.nodeList = engine.getNodeList(StaminaNode);
        },

        removeFromEngine: function (engine) {
            this.nodeList = null;
            this.engine = null;
        },

        update: function (time) {
            if (this.gameState.isPaused) return;
            for (var node = this.nodeList.head; node; node = node.next) {
                this.updateNode(node, time + this.engine.extraUpdateTime);
            }
        },

        updateNode: function (node, time) {
			var staminaComponent = node.stamina;
			var perksComponent = node.perks;
			
			var injuryEffects = perksComponent.getTotalEffect(PerkConstants.perkTypes.injury);
			var healthEffects = perksComponent.getTotalEffect(PerkConstants.perkTypes.health);
			healthEffects = healthEffects === 0 ? 1 : healthEffects;
			staminaComponent.health = Math.max(PlayerStatConstants.HEALTH_MINIMUM, Math.round(200 * healthEffects * injuryEffects) / 2);
			
			var healthVal = staminaComponent.health;
            var staminaPerS = 2 * staminaComponent.health / 100 / 60 * GameConstants.gameSpeedExploration;
            var staminaPerSBase = staminaPerS / staminaComponent.health * 100;
            var staminaPerSHealth = staminaPerS - staminaPerSBase;
			
			staminaComponent.stamina += time * staminaPerS;
            staminaComponent.accSources = [];
			staminaComponent.accSources[0] = { source: "Base", amount: staminaPerSBase };
			staminaComponent.accSources[1] = { source: "Health", amount: staminaPerSHealth };
			staminaComponent.accumulation = staminaPerS;
			
			if (node.position.inCamp) {
                var staminaPerSCamp = staminaPerS * 9;
				staminaComponent.stamina += time * staminaPerSCamp;
				staminaComponent.accSources[2] = { source: "Being in camp", amount: staminaPerSCamp };
				staminaComponent.accumulation += staminaPerS;
			}
				
			if (staminaComponent.stamina > healthVal * PlayerStatConstants.HEALTH_TO_STAMINA_FACTOR) {
				staminaComponent.stamina = healthVal * PlayerStatConstants.HEALTH_TO_STAMINA_FACTOR;
			}
				
			if (staminaComponent.stamina < 0) {
				staminaComponent.stamina = 0;
			}
            
            var staminaWarningLimit = PlayerStatConstants.getStaminaWarningLimit(this.playerActionsHelper, staminaComponent);
            var isWarning = staminaComponent.stamina <= staminaWarningLimit;
            if (isWarning && !this.isWarning) {
                var logComponent = node.entity.get(LogMessagesComponent);
                var hasCamp = this.gameState.unlockedFeatures.camp;
                if (node.position.inCamp)
                    logComponent.addMessage(LogConstants.MSG_ID_STAMINA_WARNING, "Getting tired. Should have a rest soon.");
                else if (hasCamp)
                    logComponent.addMessage(LogConstants.MSG_ID_STAMINA_WARNING, "Getting tired. Should head back to camp soon.");
                else
                    logComponent.addMessage(LogConstants.MSG_ID_STAMINA_WARNING, "Getting tired. Should find a place to rest soon.");
            }
            this.isWarning = isWarning;
        }
    });

    return StaminaSystem;
});
