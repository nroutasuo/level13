// Manages player actions that have a duration
define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/nodes/PlayerActionNode',
], function (Ash, GameGlobals, GlobalSignals, PlayerActionNode) {
	
	let PlayerActionSystem = Ash.System.extend({
	
		playerActionNodes: null,

		context: "PlayerActionSystem",
		
		gameState: null,

		constructor: function () {
			this.playerActionFunctions = GameGlobals.playerActionFunctions;
		},

		addToEngine: function (engine) {
			this.engine = engine;
			this.playerActionNodes = engine.getNodeList(PlayerActionNode);
			GlobalSignals.add(this, GlobalSignals.playerEnteredCampSignal, this.onPlayerEnteredCamp);
			GlobalSignals.add(this, GlobalSignals.playerLeftCampSignal, this.onPlayerLeftCamp);
		},

		removeFromEngine: function (engine) {
			this.playerActionNodes = null;
			this.engine = null;

			GlobalSignals.removeAll(this);
		},

		update: function (time) {
			if (GameGlobals.gameState.isPaused) return;
			var extraUpdateTime = GameGlobals.gameState.frameExtraUpdateTime;
			for (let node = this.playerActionNodes.head; node; node = node.next) {
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

			this.performActions(actionsToPerform);
		},

		completeExpeditionActions: function () {
			for (let node = this.playerActionNodes.head; node; node = node.next) {
				this.completeExpeditionActionsOnNode(node);
			}
		},

		completeExpeditionActionsOnNode: function (node) {
			let actionsToPerform = [];
			
			for (let i = 0; i < node.playerActions.expeditionActions.length; i++) {
				let actionVO = node.playerActions.expeditionActions[i];
				if (!actionVO) continue;
				actionsToPerform.push(actionVO);
			}

			node.playerActions.expeditionActions = [];
			
			this.performActions(actionsToPerform);
		},

		performActions: function (actions) {
			for (let i = 0; i < actions.length; i++) {
				let actionVO = actions[i];
				if (actionVO.action) {
					try {
						let sector = GameGlobals.levelHelper.getSectorByPositionVO(actionVO.position);
						this.playerActionFunctions.performAction(actionVO.action, actionVO.param, sector, actionVO.deductedCosts, actionVO.cb);
					} catch (e) {
						log.w("error performing action " + actionVO.action + ": "+ e, this);
					}
				}
			}
		},

		onPlayerEnteredCamp: function () {
			this.completeExpeditionActions();
		},

		onPlayerLeftCamp: function () {
			this.completeExpeditionActions();
		},
	});

	return PlayerActionSystem;
});
