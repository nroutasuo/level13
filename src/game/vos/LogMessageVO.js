define(['ash', 'game/constants/LogConstants'], function (Ash, LogConstants) {
	
	let LogMessageVO = Ash.Class.extend({
		
		constructor: function (logMsgID, messageTextVO, position, visibility, timeOffset) {
			timeOffset = timeOffset || 0;

			this.logMsgID = logMsgID;
			this.messageTextVO = messageTextVO;

			this.position = position ? position.getPosition().clone() : null;
			this.visibility = visibility || LogConstants.MSG_VISIBILITY_DEFAULT;

			this.timestamp = new Date().getTime();

			this.loadedFromSave = false;
			this.combined = 0;
		},
	
	});

	return LogMessageVO;
});
