// Contains a list of messages to be shown in the log
define(['ash', 'game/GameGlobals', 'game/constants/LogConstants', 'game/constants/TextConstants', 'game/vos/LogMessageVO'],
function (Ash, GameGlobals, LogConstants, TextConstants, LogMessageVO) {
	
	var LogMessagesComponent = Ash.Class.extend({

		messages: [],

		constructor: function () {
			this.messages = [];
			this.hasNewMessages = true;
		},

		addMessage: function (logMsgID, messageTextVO, position, visibility) {
			let timeOffset = GameGlobals.gameState.pendingUpdateTime;
			let messageVO = new LogMessageVO(logMsgID, messageTextVO, position, visibility, timeOffset);

			this.hasNewMessages = true;
			this.messages.push(messageVO);
		},

		removeMessage: function (message) {
			this.messages.splice(this.messages.indexOf(message), 1);
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
