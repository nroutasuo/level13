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
			// TODO handle actions that completed while offline better (correct timestamp for log message, add resources from caravans etc silently)

			extraUpdateTime = extraUpdateTime || 0;
			let now = new Date().getTime();
			let newDict = {};
			let newList = [];
			let actionsToPerform = [];
			
			if (extraUpdateTime != 0) {
				node.playerActions.applyExtraTime(extraUpdateTime);
			}
			
			for (let i = 0; i < node.playerActions.endTimeStampList.length; i++) {
				let timeStamp = node.playerActions.endTimeStampList[i];
				let actionVO = node.playerActions.endTimeStampToActionDict[timeStamp];
				if (!actionVO) continue;
				if (timeStamp > now) {
					newDict[timeStamp] = actionVO;
					newList.push(timeStamp);
				} else {
					actionsToPerform.push(actionVO);
				}
			}
			
			node.playerActions.endTimeStampToActionDict = newDict;
			node.playerActions.endTimeStampList = newList;
			
			for (let i = 0; i < actionsToPerform.length; i++) {
				let actionVO = actionsToPerform[i];
				if (actionVO.action) {
					let sector = GameGlobals.levelHelper.getSectorByPositionVO(actionVO.position);
					this.playerActionFunctions.performAction(actionVO.action, actionVO.param, sector, actionVO.deductedCosts);
				}
			}
		},
	});

	return PlayerActionSystem;
});
