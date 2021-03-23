// Manages player actions that have a duration
define([
	'ash',
	'game/GameGlobals',
	'game/nodes/PlayerActionNode',
], function (Ash, GameGlobals, PlayerActionNode) {
	var PlayerActionSystem = Ash.System.extend({
	
		playerActionNodes: null,
		
		gameState: null,

		constructor: function () {
			this.playerActionFunctions = GameGlobals.playerActionFunctions;
		},

		addToEngine: function (engine) {
			this.engine = engine;
			this.playerActionNodes = engine.getNodeList(PlayerActionNode);
		},

		removeFromEngine: function (engine) {
			this.playerActionNodes = null;
			this.engine = null;
		},

		update: function (time) {
			if (GameGlobals.gameState.isPaused) return;
			var extraUpdateTime = GameGlobals.gameState.frameExtraUpdateTime;
			for (var node = this.playerActionNodes.head; node; node = node.next) {
				this.updateNode(node, extraUpdateTime);
			}
		},

		updateNode: function (node, extraUpdateTime) {
			extraUpdateTime = extraUpdateTime || 0;
			var now = new Date().getTime();
			var newDict = {};
			var newList = [];
			
			if (extraUpdateTime != 0) {
				node.playerActions.applyExtraTime(extraUpdateTime);
			}
			
			var timeStamp;
			var action;
			for (var i = 0; i < node.playerActions.endTimeStampList.length; i++) {
				timeStamp = node.playerActions.endTimeStampList[i];
				action = node.playerActions.endTimeStampToActionDict[timeStamp];
				if (!action)
					continue;
				if (timeStamp > now) {
					newDict[timeStamp] = action;
					newList.push(timeStamp);
				} else {
					if (action.action) {
						this.playerActionFunctions.performAction(action.action, action.param);
					}
				}
			}
			
			node.playerActions.endTimeStampToActionDict = newDict;
			node.playerActions.endTimeStampList = newList;
		},
	});

	return PlayerActionSystem;
});
