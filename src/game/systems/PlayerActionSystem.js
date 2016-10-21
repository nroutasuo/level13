// Manages player actions that have a duration
define([
    'ash',
    'game/nodes/PlayerActionNode',
], function (Ash, PlayerActionNode) {
    var PlayerActionSystem = Ash.System.extend({
	
        playerActionNodes: null,
		
        gameState: null,
		uiFunctions: null,

        constructor: function (gameState, uiFunctions) {
            this.gameState = gameState;
			this.uiFunctions = uiFunctions;
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
            if (this.gameState.isPaused) return;
            for (var node = this.playerActionNodes.head; node; node = node.next) {
                this.updateNode(node, time + this.engine.extraUpdateTime);
            }
        },

        updateNode: function (node, time) {
            var now = new Date().getTime();
            var newDict = {};
            var newList = [];
            
            var timeStamp;
			var action;
            for (var i = 0; i < node.playerActions.endTimeStampList.length; i++) {
                timeStamp = node.playerActions.endTimeStampList[i];
				action = node.playerActions.endTimeStampToActionDict[timeStamp];
                if (timeStamp > now) {
                    newDict[timeStamp] = action;
                    newList.push(timeStamp);
                } else {
					this.uiFunctions.performAction(action);
				}
            }
            
            node.playerActions.endTimeStampToActionDict = newDict;
            node.playerActions.endTimeStampList = newList;
        },
    });

    return PlayerActionSystem;
});
