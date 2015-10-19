define([
    'ash', 'game/constants/GameConstants', 'game/nodes/player/StaminaNode', 'game/constants/PerkConstants'
], function (Ash, GameConstants, StaminaNode, PerkConstants) {
    var VisionSystem = Ash.System.extend({
        creator: null,
        nodeList: null,

        constructor: function (creator) {
            this.creator = creator;
        },

        addToEngine: function (engine) {
            this.nodeList = engine.getNodeList(StaminaNode);
        },

        removeFromEngine: function (engine) {
            this.nodeList = null;
        },

        update: function (time) {
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
			staminaComponent.health = Math.round(20 * Math.abs(healthEffects) * injuryEffects) * 5;
			
			var healthVal = staminaComponent.health;
			var staminaPerS = staminaComponent.health / 100 * 5 * GameConstants.gameSpeed;
			
			staminaComponent.stamina += time * staminaPerS;
			staminaComponent.accSources[0] = { source: "Base", amount: staminaPerS };
			staminaComponent.accumulation = staminaPerS;
			
			if (node.position.inCamp) {
				staminaComponent.stamina += time * staminaPerS;
				staminaComponent.accSources[1] = { source: "Being in camp", amount: staminaPerS };
				staminaComponent.accumulation += staminaPerS;
			} else if (staminaComponent.accSources.length > 1) {
				delete staminaComponent.accSources[1];
			}
				
			if (staminaComponent.stamina > healthVal) {
				staminaComponent.stamina = healthVal;
			}
				
			if (staminaComponent.stamina < 0) {
				staminaComponent.stamina = 0;
			}
        }
    });

    return VisionSystem;
});
