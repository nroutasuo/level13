// A system that updates the player's resource storage capacity based on their currently equipped bag
define([
    'ash',
    'game/constants/ItemConstants',
    'game/nodes/player/PlayerResourcesNode',
    'game/components/player/ItemsComponent',
    'game/components/player/BagComponent',
    'game/vos/ResourcesVO'
], function (Ash, ItemConstants, PlayerResourcesNode, ItemsComponent, BagComponent, ResourcesVO) {
    var BagSystem = Ash.System.extend({	
	    
		gameState: null,
		
		playerNodes: null,
	
        constructor: function (gameState) {
			this.gameState = gameState;
        },

        addToEngine: function (engine) {
			this.playerNodes = engine.getNodeList(PlayerResourcesNode);
        },

        removeFromEngine: function (engine) {
			this.playerNodes = null;
        },

        update: function (time) {
			var playerResources = this.playerNodes.head.resources;
            var playerBag = this.playerNodes.head.entity.get(BagComponent);
			var playerItems = this.playerNodes.head.entity.get(ItemsComponent);
            
			var playerBagBonus = playerItems.getCurrentBonus(ItemConstants.itemTypes.bag);
			playerResources.storageCapacity = Math.max(playerBagBonus, ItemConstants.PLAYER_DEFAULT_STORAGE);
			playerBag.totalCapacity = Math.max(playerBagBonus, ItemConstants.PLAYER_DEFAULT_STORAGE);
            
            var usedCapacity = 0;
            var carriedItems = playerItems.getAll(false);
            usedCapacity += playerResources.resources.getTotal();
            for (var i = 0; i < carriedItems.length; i++) {
                if (!carriedItems[i].equipped) usedCapacity += 1;
            }
            playerBag.usedCapacity = usedCapacity;
			
			this.gameState.unlockedFeatures.bag = playerBagBonus > 0;
		}
        
    });

    return BagSystem;
});
