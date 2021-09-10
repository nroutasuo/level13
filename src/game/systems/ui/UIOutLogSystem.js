define([
	'ash', 'game/GameGlobals', 'game/GlobalSignals', 'game/nodes/LogNode', 'game/constants/UIConstants',
], function (Ash, GameGlobals, GlobalSignals, LogNode, UIConstants) {
	var UIOutLogSystem = Ash.System.extend({
	
		gameState: null,
		logNodes: null,
		
		lastUpdateTimeStamp: 0,
		updateFrequency: 1000 * 15,

		constructor: function () {},

		addToEngine: function (engine) {
			var logSystem = this;
			this.logNodes = engine.getNodeList(LogNode);
			this.onPlayerMoved = function(playerPosition) {
				logSystem.checkPendingMessages(playerPosition);
			};
			GlobalSignals.playerMovedSignal.add(this.onPlayerMoved);
			this.updateMessages();
		},

		removeFromEngine: function (engine) {
			this.logNodes = null;
			GlobalSignals.playerMovedSignal.remove(this.onPlayerMoved);
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
			this.updateMessageList(messages);
		},
	
		updateMessageList: function (messages) {
			var animateFromIndex = messages.length - (messages.length - $("#log ul li").length);
			$("#log ul").empty();
				
			var msg;
			var liMsg;
			for	(var index = 0; index < messages.length; index++) {
				msg = messages[index];
				if (msg.text.length < 3) {
					log.w("log contains empty message")
					log.w(msg);
				}
				var li = '<li';
				if (msg.loadedFromSave)
					li += ' class="log-loaded"';
				li += '><span class="time">' + UIConstants.getTimeSinceText(msg.time) + " ago" + '</span> ';
				if (msg.campLevel) li += '<span class="msg-camp-level"> (level ' + msg.campLevel + ')</span>';
				li += '<span class="msg">' + msg.text;
				if (msg.combined > 0) li += '<span class="msg-count"> (x' + (msg.combined + 1) + ')</span>';
				li += '</span></li>';
				liMsg = $(li);
				$("#log ul").prepend(liMsg);
				var animate = index >= animateFromIndex;
				if (animate) {
					liMsg.toggle(false);
					liMsg.fadeIn(600);
				}
			}
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
