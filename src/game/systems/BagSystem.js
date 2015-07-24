// A system that updates the player's resource storage capacity based on their currently equipped bag
define([
    'ash',
    'game/constants/ItemConstants',
    'game/nodes/player/PlayerResourcesNode',
    'game/components/player/ItemsComponent',
    'game/vos/ResourcesVO'
], function (Ash, ItemConstants, PlayerResourcesNode, ItemsComponent, ResourcesVO) {
    var BagSystem = Ash.System.extend({	
	    
	gameState: null,
	
	playerNodes: null,
	
        constructor: function (gameState) {
	    this.gameState = gameState;
        },

        addToEngine: function (engine) {
	    this.playerNodes = engine.getNodeList( PlayerResourcesNode );
        },

        removeFromEngine: function (engine) {
	    this.playerNodes = null;
        },

        update: function (time) {
	    var playerResources = this.playerNodes.head.resources;
	    var playerItems = this.playerNodes.head.entity.get(ItemsComponent);
	    var playerBagBonus = playerItems.getCurrentBonus(ItemConstants.itemTypes.bag);
	    
	    playerResources.storageCapacity = Math.max(playerBagBonus, ItemConstants.PLAYER_DEFAULT_STORAGE);
	    
	    this.gameState.unlockedFeatures.bag = playerBagBonus > 0;
	}
        
    });

    return BagSystem;
});
