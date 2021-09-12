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
		},

		
	});

	return FollowerSystem;
});
