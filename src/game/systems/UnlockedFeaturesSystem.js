// A system that updates various GameState.unlockedFeatures based on improvements etc
define([
    'ash',
    'game/constants/ItemConstants',
    'game/nodes/sector/CampNode',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/components/player/ItemsComponent',
    'game/vos/ResourcesVO'
], function (Ash, ItemConstants, CampNode, SectorImprovementsComponent, ItemsComponent, ResourcesVO) {
    var UnlockedFeaturesSystem = Ash.System.extend({
	    
		gameState: null,
		campNodes: null,
	
        constructor: function (gameState) {
			this.gameState = gameState;
        },

        addToEngine: function (engine) {
			this.campNodes = engine.getNodeList(CampNode);
        },

        removeFromEngine: function (engine) {
			this.campNodes = null;
        },

        update: function (time) {
			var numCamps = 0;
			var numTradePostCamps = 0;
            
            this.gameState.gamePlayedSeconds += time;
			
			// Global improvements
			for (var node = this.campNodes.head; node; node = node.next) {
				var improvementsComponent = node.entity.get(SectorImprovementsComponent);
				if (improvementsComponent.getCount(improvementNames.tradepost) > 0) {
					this.gameState.unlockedFeatures.trade = true;
					numTradePostCamps++;
				}
				if (improvementsComponent.getCount(improvementNames.inn) > 0) {
					this.gameState.unlockedFeatures.followers = true;
				}
				if (improvementsComponent.getCount(improvementNames.campfire) > 0) {
					this.gameState.unlockedFeatures.upgrades = true;
				}
				numCamps++;
			}
			this.gameState.numCamps = numCamps;
			this.gameState.numTradePostCamps = numTradePostCamps;
		}
        
    });

    return UnlockedFeaturesSystem;
});
