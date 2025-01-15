// Contains a list of messages to be shown in the log
define(['ash', 'game/GameGlobals', 'game/constants/LogConstants', 'game/constants/TextConstants', 'game/vos/LogMessageVO'],
function (Ash, GameGlobals, LogConstants, TextConstants, LogMessageVO) {
	
	var LogMessagesComponent = Ash.Class.extend({

		messages: [],

		constructor: function () {
			this.messages = [];
			this.hasNewMessages = true;
		},

		addMessage: function (logMsgID, message, replacements, values, position, visibility) {
			message = message.replace(/<br\s*[\/]?>/gi, " ");

			let timeOffset = GameGlobals.gameState.pendingUpdateTime;
			let messageVO = new LogMessageVO(logMsgID, message, replacements, values, position, visibility, timeOffset);

			this.hasNewMessages = true;

			let merged = this.getMergedMessage(messageVO);
			let combined = this.combineMessagesCheck(merged);

			if (!combined) {
				this.messages.push(merged);
			}
		},

		removeMessage: function (message) {
			this.messages.splice(this.messages.indexOf(message), 1);
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
			if (prevMsg.markedAsSeen) return false;
			if (newMsg.message !== prevMsg.message) return false;
			if (newMsg.logMsgID !== prevMsg.logMsgID) return false;
			if (newMsg.contextLevel !== prevMsg.contextLevel) return false;
			if (newMsg.contextInCamp !== prevMsg.contextInCamp) return false;
			if (!prevMsg.createText) return false;
			return true;
		},

		combineMessages: function (oldMsg, newMsg) {
			this.mergeReplacements(oldMsg, newMsg);
			oldMsg.time = newMsg.time;
			oldMsg.combined++;
			oldMsg.text = TextConstants.createTextFromLogMessage(oldMsg.message, oldMsg.replacements, oldMsg.values, true);
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
			let prevMsg = this.messages[this.messages.length - 1];
			if (!prevMsg || prevMsg.loadedFromSave || prevMsg.markedAsSeen) return newMsg;

			let mergedMsgID;
			let prevMsg2 = this.messages[this.messages.length - 2];
			if (prevMsg2 && !prevMsg2.loadedFromSave)
				mergedMsgID = LogConstants.getMergedMsgID([newMsg, prevMsg, prevMsg2]);
			if (!mergedMsgID)
				mergedMsgID = LogConstants.getMergedMsgID([newMsg, prevMsg]);

			if (mergedMsgID) {
				let mergedText = LogConstants.getMergedMsgText(mergedMsgID);
				let timeOffset = GameGlobals.gameState.pendingUpdateTime;
				let mergedMsg = new LogMessageVO(mergedMsgID, mergedText, null, null, newMsg.contextLevel, newMsg.contextInCamp, timeOffset);
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
			copy.messages = this.messages.slice(-30);
			for (let i = 0; i < copy.messages.length; i++) {
				delete copy.messages[i].loadedFromSave;
			}
			copy.hasNewMessages = this.hasNewMessages;
			return copy;
		},

	});

	return LogMessagesComponent;
});
