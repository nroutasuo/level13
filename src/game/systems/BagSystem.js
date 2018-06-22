// A system that updates the player's resource storage capacity based on their currently equipped bag
define([
    'ash',
    'game/constants/ItemConstants',
    'game/constants/BagConstants',
    'game/nodes/player/PlayerResourcesNode',
    'game/components/player/ItemsComponent',
    'game/components/player/BagComponent',
    'game/vos/ResourcesVO'
], function (Ash, ItemConstants, BagConstants, PlayerResourcesNode, ItemsComponent, BagComponent, ResourcesVO) {
    var BagSystem = Ash.System.extend({	
	    
		gameState: null,
		
		playerNodes: null,
	
        constructor: function (gameState) {
			this.gameState = gameState;
        },

        addToEngine: function (engine) {
            this.engine = engine;
			this.playerNodes = engine.getNodeList(PlayerResourcesNode);
        },

        removeFromEngine: function (engine) {
			this.playerNodes = null;
        },

        update: function (time) {
            var playerBag = this.playerNodes.head.entity.get(BagComponent);
			var playerResources = this.playerNodes.head.resources;
			var playerItems = this.playerNodes.head.entity.get(ItemsComponent);
            
			var playerBagBonus = playerItems.getCurrentBonus(ItemConstants.itemBonusTypes.bag, null, true);
			playerResources.storageCapacity = Math.max(playerBagBonus, ItemConstants.PLAYER_DEFAULT_STORAGE);
			playerBag.totalCapacity = Math.max(playerBagBonus, ItemConstants.PLAYER_DEFAULT_STORAGE);
            
            this.updateUsedCapacity(playerBag, playerResources, playerItems);
			
			this.gameState.unlockedFeatures.bag = this.gameState.unlockedFeatures.bag || playerItems.getAll().length > 0;
		},
        
        updateUsedCapacity: function (playerBag, playerResources, playerItems) {
            var usedCapacity = 0;
            var carriedItems = playerItems.getAll(false);
            usedCapacity += BagConstants.getResourcesCapacity(playerResources.resources);
            for (var i = 0; i < carriedItems.length; i++) {
                if (carriedItems[i].equipped) continue;
                 usedCapacity += BagConstants.getItemCapacity(carriedItems[i]);
            }
            playerBag.usedCapacity = usedCapacity;
        },
        
    });

    return BagSystem;
});
