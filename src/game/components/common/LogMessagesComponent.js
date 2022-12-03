// Contains a list of messages to be shown in the log
define(
['ash', 'game/GameGlobals', 'game/constants/LogConstants', 'game/vos/LogMessageVO'],
function (Ash, GameGlobals, LogConstants, LogMessageVO) {
	var LogMessagesComponent = Ash.Class.extend({

		messages: [],
		messagesPendingMovement: [],

		constructor: function () {
			this.messages = [];
			this.messagesPendingMovement = [];
			this.hasNewMessages = true;
		},

		addMessage: function (logMsgID, message, replacements, values, visibleLevel, visibleSector, visibleInCamp, campLevel) {
			message = message.replace(/<br\s*[\/]?>/gi, " ");
			var isPending = Boolean(visibleLevel || visibleSector || visibleInCamp);
			var timeOffset = GameGlobals.gameState.pendingUpdateTime;
			var newMsg = new LogMessageVO(logMsgID, message, replacements, values, campLevel, timeOffset);

			if (!isPending) {
				this.addMessageImmediate(newMsg);
			} else {
				newMsg.setPending(visibleLevel, visibleSector, visibleInCamp);
				this.messagesPendingMovement.push(newMsg);
			}
		},

		addMessageImmediate: function (message) {
			this.hasNewMessages = true;
			var merged = this.getMergedMessage(message);
			var combined = this.combineMessagesCheck(merged);
			if (!combined) {
				this.messages.push(merged);
			}
		},

		removeMessage: function (message) {
			this.messages.splice(this.messages.indexOf(message), 1);
		},

		showPendingMessage: function (message) {
			// TODO this doesn't work for some reason
			// message.setPendingOver();
			this.messagesPendingMovement.splice(this.messagesPendingMovement.indexOf(message), 1);
			this.addMessageImmediate(message);
		},

		combineMessagesCheck: function (newMsg) {
			var prevMsg = this.messages[this.messages.length-1];
			if (!prevMsg) return false;
			if (newMsg.time.getTime() - prevMsg.time.getTime() > 1000 * 60 * 5) return false

			// Combine with previous single message?
			if (this.canCombineMessages(prevMsg, newMsg)) {
				this.combineMessages(prevMsg, newMsg);
				return true;
			}

			// Combine with previous pair of messages?
			var prev2Msg = this.messages[this.messages.length - 2];
			if (this.canCombineMessages(prev2Msg, newMsg) && newMsg.replacements.length === 0) {
				var prev3Msg = this.messages[this.messages.length-3];
				if (!prev3Msg.loadedFromSave && prevMsg.message === prev3Msg.message) {
					this.combineMessages(prev2Msg, newMsg);
					this.combineMessages(prev3Msg, prevMsg);
					this.removeMessage(prevMsg);
					return true;
				}
			}

			return false;
		},

		canCombineMessages: function (prevMsg, newMsg) {
			if (!prevMsg) return false;
			if (prevMsg.loadedFromSave) return false;
			if (newMsg.message !== prevMsg.message) return false;
			if (newMsg.logMsgID !== prevMsg.logMsgID) return false;
			if (newMsg.campLevel !== prevMsg.campLevel) return false;
			return true;
		},

		combineMessages: function (oldMsg, newMsg) {
			this.mergeReplacements(oldMsg, newMsg);
			oldMsg.time = newMsg.time;
			oldMsg.combined++;
			oldMsg.createText();
		},

		mergeReplacements: function (baseMsg, toAddMsg) {
			var oldVal;
			var newVal;
			for (let i = 0; i < baseMsg.values.length; i++) {
				oldVal = baseMsg.values[i];
				newVal = toAddMsg.values[i];
				if (typeof oldVal === 'number' && typeof newVal === 'number') {
					baseMsg.values[i] += newVal;
				} else {
					baseMsg.values[i] += ", " + newVal;
				}
			}
		},

		getMergedMessage: function (newMsg) {
			var prevMsg = this.messages[this.messages.length - 1];
			if (!prevMsg || prevMsg.loadedFromSave) return newMsg;

			var mergedMsgID;
			var prevMsg2 = this.messages[this.messages.length - 2];
			if (prevMsg2 && !prevMsg2.loadedFromSave)
				mergedMsgID = LogConstants.getMergedMsgID([newMsg, prevMsg, prevMsg2]);
			if (!mergedMsgID)
				mergedMsgID = LogConstants.getMergedMsgID([newMsg, prevMsg]);

			if (mergedMsgID) {
				var mergedText = LogConstants.getMergedMsgText(mergedMsgID);
				var timeOffset = GameGlobals.gameState.pendingUpdateTime;
				var mergedMsg = new LogMessageVO(mergedMsgID, mergedText, null, null, null, timeOffset);
				this.mergeReplacements(mergedMsg, prevMsg);
				this.mergeReplacements(mergedMsg, newMsg);
				return mergedMsg;
			}

			return newMsg;
		},

		getSaveKey: function () {
			return "Log";
		},

		getCustomSaveObject: function () {
			var copy = {};
			copy.messages = this.messages.slice(0, 10);
			copy.messagesPendingMovement = this.messagesPendingMovement;
			copy.hasNewMessages = this.hasNewMessages;
			return copy;
		},

	});

	return LogMessagesComponent;
});
