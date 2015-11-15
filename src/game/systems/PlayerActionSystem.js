// Manages player actions that have a duration
define([
    'ash',
    'game/nodes/PlayerActionNode',
], function (Ash, PlayerActionNode) {
    var PlayerActionSystem = Ash.System.extend({
	
        playerActionNodes: null,
		
		uiFunctions: null,

        constructor: function (uiFunctions) {
			this.uiFunctions = uiFunctions;
        },

        addToEngine: function (engine) {
            this.playerActionNodes = engine.getNodeList(PlayerActionNode);
        },

        removeFromEngine: function (engine) {
            this.playerActionNodes = null;
        },

        update: function (time) {
            for (var node = this.playerActionNodes.head; node; node = node.next) {
                this.updateNode(node, time);
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
					this.uiFunctions.completeAction(action);
				}
            }
            
            node.playerActions.endTimeStampToActionDict = newDict;
            node.playerActions.endTimeStampList = newList;
        },
    });

    return PlayerActionSystem;
});
