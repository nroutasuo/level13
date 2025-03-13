define(['ash', 'game/constants/LogConstants', 'game/constants/TextConstants'], function (Ash, LogConstants, TextConstants) {
	
	let LogMessageVO = Ash.Class.extend({
		
		constructor: function (logMsgID, messageTextVO, position, visibility, timeOffset) {
			timeOffset = timeOffset || 0;

			this.logMsgID = logMsgID;
			this.messageTextVO = messageTextVO;

			this.position = position ? position.getPosition().clone() : null;
			this.visibility = visibility || LogConstants.MSG_VISIBILITY_DEFAULT;
			
			this.time = new Date();
			if (timeOffset != 0) {
				this.time.setSeconds(this.time.getSeconds() - timeOffset);
			}

			this.loadedFromSave = false;
			this.combined = 0;
		},
	
	});

	return LogMessageVO;
});
