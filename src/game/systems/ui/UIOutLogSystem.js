define([
	'ash', 'utils/UIList', 'game/GameGlobals', 'game/GlobalSignals', 'game/nodes/LogNode', 'game/constants/UIConstants', 'game/vos/PositionVO'], 
function (Ash, UIList, GameGlobals, GlobalSignals, LogNode, UIConstants, PositionVO) {
	
	var UIOutLogSystem = Ash.System.extend({
	
		gameState: null,
		logNodes: null,
		
		lastUpdateTimeStamp: 0,
		updateFrequency: 1000 * 15,

		constructor: function () {
			this.initElements();
		},

		addToEngine: function (engine) {
			var logSystem = this;
			this.logNodes = engine.getNodeList(LogNode);
			this.onPlayerPositionChanged = function(playerPosition) {
				logSystem.updatePendingMessages(playerPosition);
			};
			GlobalSignals.playerPositionChangedSignal.add(this.onPlayerPositionChanged);
			this.updateMessages();
		},

		removeFromEngine: function (engine) {
			this.logNodes = null;
			GlobalSignals.playerPositionChangedSignal.remove(this.onPlayerPositionChanged);
		},

		initElements: function () {
			this.logList = UIList.create($("#log ul"), this.createLogListItem, this.updateLogListItem, this.isLogListItemDataEqual);
			this.logListLatest = UIList.create($("#log-latest ul"), this.createLogListItem, this.updateLogListItem, this.isLogListItemDataEqual);
		},

		update: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			if (GameGlobals.gameState.isPaused) return;
			
			var timeStamp = new Date().getTime();
			var isTime = timeStamp - this.lastUpdateTimeStamp > this.updateFrequency;
			
			var hasNewMessages = false;
			for (var node = this.logNodes.head; node; node = node.next) {
				hasNewMessages = hasNewMessages || node.logMessages.hasNewMessages;
				node.logMessages.hasNewMessages = false;
			}
		
			if (!hasNewMessages && !isTime) return;
			
			this.updateMessages();
			this.lastUpdateTimeStamp = timeStamp;
		},
	
		updatePendingMessages: function (playerPosition) {
			for (let node = this.logNodes.head; node; node = node.next) {
				let pendingMessages = node.logMessages.messagesPendingMovement;
				for (let i in pendingMessages) {
					let msg = node.logMessages.messagesPendingMovement[i];
					let validLevel = !msg.pendingLevel || msg.pendingLevel == playerPosition.level;
					let validSector = !msg.pendingSector || msg.pendingSector == playerPosition.sectorId();
					let validInCamp = (typeof msg.pendingInCamp === "undefined") || msg.pendingInCamp === playerPosition.inCamp;
					if (validLevel && validSector && validInCamp) {
						node.logMessages.showPendingMessage(msg);
					}
				}
			}
		},
		
		updateMessages: function () {
			var messages = [];
			for (var node = this.logNodes.head; node; node = node.next) {
				messages = messages.concat(node.logMessages.messages);
				node.logMessages.hasNewMessages = false;
			}
			this.pruneMessages();
			this.updateMessageList(messages.reverse());
		},
	
		updateMessageList: function (messages) {
			let newItems = UIList.update(this.logList, messages);
			
			UIList.update(this.logListLatest, newItems.map(li => li.data));

			for (var i = 0; i < newItems.length; i++) {
				newItems[i].$root.toggle(false);
				newItems[i].$root.fadeIn(600);
			}
		},

		createLogListItem: function () {
			let li = {};
			li.$root = $("<li><span class='time'></span><span class='msg-camp-level'></span><span class='msg'></span><span class='msg-count'></span></li>");
			li.$spanTime = li.$root.find(".time");
			li.$spanLevel = li.$root.find(".msg-camp-level");
			li.$spanMsg = li.$root.find(".msg");
			li.$spanMsgCount = li.$root.find(".msg-count");
			return li;
		},

		updateLogListItem: function (li, data) {
			let hasPosition = data.position != null;
			let hasCount = data.combined > 0;

			let positionText = "";
			if (hasPosition) {
				positionText += " (";
				let campNode = GameGlobals.campHelper.getCampNodeForLevel(data.position.level);
				if (data.position.inCamp && campNode) {
					positionText += UIConstants.getCampDisplayName(campNode, true);
				} else {
					positionText += new PositionVO(data.position.level, data.position.sectorX, data.position.sectorY).getInGameFormat(true, true);
				}
				positionText += ")"
			}

			li.$root.toggleClass("log-loaded", data.loadedFromSave);
			li.$spanMsg.text(data.text);
			li.$spanTime.text(UIConstants.getTimeSinceText(data.time) + " ago");
			li.$spanLevel.toggle(hasPosition);
			if (hasPosition) li.$spanLevel.text(positionText);
			li.$spanMsgCount.toggle(hasCount);
			if (hasCount) li.$spanMsgCount.text(' (x ' + (parseInt(data.combined) + 1) + ')');
		},

		isLogListItemDataEqual: function (d1, d2) {
			return d1.logMsgID == d2.logMsgID && d1.time == d2.time;
		},
		
		pruneMessages: function () {
			var maxMessages = 30;
			var messagesToPrune = 10;
					
			var nodeMessages;
			for (var node = this.logNodes.head; node; node = node.next) {
				nodeMessages = node.logMessages.messages;
				if (nodeMessages.length > maxMessages) {
					nodeMessages.splice(0, nodeMessages.length - maxMessages + messagesToPrune);
				}
			}
		},

	});

	return UIOutLogSystem;
});
