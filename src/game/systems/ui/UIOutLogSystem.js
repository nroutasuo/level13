define([
	'ash', 
	'utils/UIList', 
	'game/GameGlobals', 
	'game/GlobalSignals', 
	'game/constants/LogConstants',
	'game/nodes/LogNode', 
	'game/nodes/PlayerPositionNode', 
	'game/constants/UIConstants', 
	'game/vos/PositionVO'],
function (Ash, UIList, GameGlobals, GlobalSignals, LogConstants, LogNode, PlayerPositionNode, UIConstants, PositionVO) {

	var UIOutLogSystem = Ash.System.extend({
	
		gameState: null,
		logNodes: null,
		playerPositionNodes: null,
		
		lastUpdateTimeStamp: 0,
		updateFrequency: 1000 * 15,

		currentMessages: [],

		constructor: function () {
			this.initElements();
		},

		addToEngine: function (engine) {
			this.logNodes = engine.getNodeList(LogNode);
			this.playerPositionNodes = engine.getNodeList(PlayerPositionNode);

			GlobalSignals.add(this, GlobalSignals.markLogMessagesSeenSignal, this.onMarkLogMessagesSeen);
			GlobalSignals.add(this, GlobalSignals.playerPositionChangedSignal, function (position) { this.onPlayerPositionChanged(position); });

			this.updateMessages();
		},

		removeFromEngine: function (engine) {
			this.logNodes = null;
			this.playerPositionNodes = null;
			GlobalSignals.removeAll(this);
		},

		initElements: function () {
			this.logList = UIList.create(this, $("#log ul"), this.createLogListItem, this.updateLogListItem, this.isLogListItemDataEqual);
			this.logListLatest = UIList.create(this, $("#log-latest ul"), this.createLogListItem, this.updateLogListItem, this.isLogListItemDataEqual);
		},

		update: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			if (GameGlobals.gameState.isPaused) return;
			
			var timeStamp = new Date().getTime();
			var isTime = timeStamp - this.lastUpdateTimeStamp > this.updateFrequency;
			
			let hasNewMessages = false;
			for (var node = this.logNodes.head; node; node = node.next) {
				hasNewMessages = hasNewMessages || node.logMessages.hasNewMessages;
				node.logMessages.hasNewMessages = false;
			}
		
			if (!hasNewMessages && !isTime) return;
			
			this.updateMessages();
			this.lastUpdateTimeStamp = timeStamp;
		},
		
		updateMessages: function () {
			this.pruneMessages();

			let messages = [];
			for (let node = this.logNodes.head; node; node = node.next) {
				messages = messages.concat(node.logMessages.messages);
				node.logMessages.hasNewMessages = false;
			}
			
			this.updateMessageList(messages.reverse());
		},
	
		updateMessageList: function (messages) {
			if (!this.playerPositionNodes.head) return;

			let playerPosition = this.playerPositionNodes.head.position;

			if (!playerPosition) return;

			let showMessage = function (message) {
				if (!message.position) return true;

				if (message.visibility == LogConstants.MSG_VISIBILITY_GLOBAL) {
					return true;
				}

				if (message.visibility == LogConstants.MSG_VISIBILITY_PRIORITY) {
					return message.position.inCamp == playerPosition.inCamp;
				}

				if (message.visibility == LogConstants.MGS_VISIBILITY_LEVEL) {
					return message.position.level == playerPosition.level;
				}

				// default priority:
				if (playerPosition.inCamp) {
					return message.position.inCamp == playerPosition.inCamp && message.position.level == playerPosition.level;
				} else {
					return message.position.inCamp == playerPosition.inCamp;
				}
			};

			let shownMessages = messages.filter(m => showMessage(m));

			let newItems = UIList.update(this.logList, shownMessages);
			let latestMessages = newItems.map(li => li.data).filter(m => !m.markedAsSeen && !m.loadedFromSave);
			
			UIList.update(this.logListLatest, latestMessages);

			for (let i = 0; i < shownMessages.length; i++) {
				if (!shownMessages[i].hasBeenShown) {
					log.i("mark as shown: " + shownMessages[i].message);
					shownMessages[i].hasBeenShown = true;
				}
			}

			for (let i = 0; i < newItems.length; i++) {
				newItems[i].$root.toggle(false);
				newItems[i].$root.fadeIn(600);
			}

			this.currentMessages = shownMessages;
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

			li.$root.toggleClass("log-loaded", (data.loadedFromSave || data.markedAsSeen == true));
			li.$root.attr("data-loadedFromSave", data.loadedFromSave);
			li.$root.attr("data-hasBeenShown", data.hasBeenShown);
			li.$root.attr("data-markedAsSeen", data.markedAsSeen);
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

		markLogMessagesSeen: function () {
			if (!this.currentMessages || this.currentMessages.length == 0) return;

			for (let i = 0; i < this.currentMessages.length; i++) {
				if (!this.currentMessages[i].markedAsSeen) {
					log.i("mark as seen: " + this.currentMessages[i].message);
					this.currentMessages[i].markedAsSeen = true;
				}
			}
		},
		
		pruneMessages: function () {
			let maxMessagesByKey = 20;
			let getVisibilityKey = function (message) {
				if (!message.position || message.visibility == LogConstants.MSG_VISIBILITY_GLOBAL) return "global";
				if (!message.position.inCamp) return "out";
				return message.position.level;
			}

			for (let node = this.logNodes.head; node; node = node.next) {
				let nodeMessages = node.logMessages.messages;
				let messagesToPrune = [];
				let messagesByKey = {};

				for (let i = nodeMessages.length - 1; i >= 0; i--) {
					let message = nodeMessages[i];
					let k = getVisibilityKey(message);
					if (!messagesByKey[k]) messagesByKey[k] = [];

					if (messagesByKey[k].length > maxMessagesByKey) {
						messagesToPrune.push(message);
					}

					messagesByKey[k].push(message);
				}

				for (let i = 0; i < messagesToPrune.length; i++) {
					let messageToPrune = messagesToPrune[i];
					let index = nodeMessages.indexOf(messageToPrune);
					nodeMessages.splice(index, 1);
				}
			}
		},

		onMarkLogMessagesSeen: function () {
			this.markLogMessagesSeen();
		},

		onPlayerPositionChanged: function (position) {
			this.updateMessages();
		}

	});

	return UIOutLogSystem;
});
