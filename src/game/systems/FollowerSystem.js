// A system that keeps track of followers
define([
    'ash',
    'game/GameGlobals',
    'game/GlobalSignals',
    'game/constants/FightConstants',
    'game/constants/ItemConstants',
    'game/nodes/player/ItemsNode',
], function (Ash, GameGlobals, GlobalSignals, FightConstants, ItemConstants, ItemsNode) {
	
    var FollowerSystem = Ash.System.extend({
        
		itemNodes: null,

		constructor: function () {
			return this;
		},

		addToEngine: function (engine) {
			this.itemNodes = engine.getNodeList(ItemsNode);
		},
        
        removeFromEngine: function (engine) {
			this.itemsNodes = null;
		},
        
        update: function () {
            var itemsComponent = this.itemNodes.head.items;
			var items = itemsComponent.getAllByType(ItemConstants.itemTypes.follower, true);
            var max = FightConstants.getMaxFollowers(GameGlobals.gameState.numCamps);
            if (items.length > max) {
                itemsComponent.discardItem(items[0], false);
                return;
            }
        },

        
    });

    return FollowerSystem;
});
