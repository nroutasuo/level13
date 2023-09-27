define([
	'ash', 'utils/UIList', 'game/GameGlobals', 'game/GlobalSignals', 'game/nodes/LogNode', 'game/constants/UIConstants',
], function (Ash, UIList, GameGlobals, GlobalSignals, LogNode, UIConstants) {
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
				logSystem.checkPendingMessages(playerPosition);
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
	
		checkPendingMessages: function (playerPosition) {
			var validLevel;
			var validSector;
			var validInCamp;
			for (var node = this.logNodes.head; node; node = node.next) {
				var pendingMessages = node.logMessages.messagesPendingMovement;
				for (let i in pendingMessages) {
					var msg = node.logMessages.messagesPendingMovement[i];
					validLevel = !msg.pendingLevel || msg.pendingLevel == playerPosition.level;
					validSector = !msg.pendingSector || msg.pendingSector == playerPosition.sectorId();
					validInCamp = (typeof msg.pendingInCamp === "undefined") || msg.pendingInCamp === playerPosition.inCamp;
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
			/*
			var animateFromIndex = messages.length - (messages.length - $("#log ul li").length);
			var animate = index >= animateFromIndex;
			*/

			let newItems = UIList.update(this.logList, messages);

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
			let hasLevel = data.campLevel || data.campLevel == 0;
			let hasCount = data.combined > 0;
			li.$root.toggleClass("log-loaded", data.loadedFromSave);
			li.$spanMsg.text(data.text);
			li.$spanTime.text(UIConstants.getTimeSinceText(data.time) + " ago");
			li.$spanLevel.toggle(hasLevel);
			if (hasLevel) li.$spanLevel.text(' (level ' + data.campLevel + ')');
			li.$spanMsgCount.toggle(hasCount);
			if (hasCount) li.$spanMsgCount.text(' (x ' + data.combined + 1 + ')');
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
