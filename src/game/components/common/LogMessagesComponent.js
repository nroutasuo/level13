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
			let copy = {};
			copy.messages = [];

			// just in case prune some messages here if way too big but normal purning is done in systems
			let max = Math.min(this.messages.length, 500);
			for (let i = 0; i < max; i++) {
				copy.messages[i] = this.messages[i].getCustomSaveObject();
			}
			copy.hasNewMessages = this.hasNewMessages;
			return copy;
		},

		customLoadFromSave: function (componentValues) {
			this.hasNewMessages = componentValues.hasNewMessages;
			this.messages = [];

			for (let i = 0; i < componentValues.messages.length; i++) {
				let messageData = componentValues.messages[i];
				
				let messageVO = new LogMessageVO(messageData.logMsgID);
				messageVO.customLoadFromSave(messageData);

				this.messages.push(messageVO);
			}
		}


	});

	return LogMessagesComponent;
});
