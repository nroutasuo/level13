define([
    'ash', 'game/constants/GameConstants', 'game/constants/PlayerStatConstants', 'game/nodes/player/StaminaNode', 'game/constants/PerkConstants'
], function (Ash, GameConstants, PlayerStatConstants, StaminaNode, PerkConstants) {
    var StaminaSystem = Ash.System.extend({
        
        gameState: null,
        nodeList: null,

        constructor: function (gameState) {
            this.gameState = gameState;
        },

        addToEngine: function (engine) {
            this.nodeList = engine.getNodeList(StaminaNode);
        },

        removeFromEngine: function (engine) {
            this.nodeList = null;
        },

        update: function (time) {
            if (this.gameState.isPaused) return;
            for (var node = this.nodeList.head; node; node = node.next) {
                this.updateNode(node, time);
            }
        },

        updateNode: function (node, time) {
			var staminaComponent = node.stamina;
			var perksComponent = node.perks;
			
			var injuryEffects = perksComponent.getTotalEffect(PerkConstants.perkTypes.injury);
			var healthEffects = perksComponent.getTotalEffect(PerkConstants.perkTypes.health);
			healthEffects = Math.abs(healthEffects);
			healthEffects = healthEffects === 0 ? 1 : healthEffects;
			staminaComponent.health = Math.max(PlayerStatConstants.HEALTH_MINIMUM, Math.round(20 * Math.abs(healthEffects) * injuryEffects) * 5);
			
			var healthVal = staminaComponent.health;
            var staminaPerS = 20 * staminaComponent.health / 100 / 60 * GameConstants.gameSpeed;
            var staminaPerSBase = staminaPerS / staminaComponent.health * 100;
            var staminaPerSHealth = staminaPerS - staminaPerSBase;
			
			staminaComponent.stamina += time * staminaPerS;
			staminaComponent.accSources[0] = { source: "Base", amount: staminaPerSBase };
			staminaComponent.accSources[1] = { source: "Health", amount: staminaPerSHealth };
			staminaComponent.accumulation = staminaPerS;
			
			if (node.position.inCamp) {
                var staminaPerSCamp = staminaPerS * 3;
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
        }
    });

    return StaminaSystem;
});
