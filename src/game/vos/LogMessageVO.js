define(['ash', 'game/constants/LogConstants', 'game/constants/TextConstants'], function (Ash, LogConstants, TextConstants) {
	
	let LogMessageVO = Ash.Class.extend({
		
		constructor: function (logMsgID, message, replacements, values, position, visibility, timeOffset) {
			timeOffset = timeOffset || 0;
			this.logMsgID = logMsgID;
			this.message = message;
			this.replacements = replacements ? replacements : [];
			this.values = values ? values : [];

			this.position = position ? position.getPosition().clone() : null;
			this.visibility = visibility || LogConstants.MSG_VISIBILITY_DEFAULT;
			
			this.time = new Date();
			if (timeOffset != 0) {
				this.time.setSeconds(this.time.getSeconds() - timeOffset);
			}

			this.loadedFromSave = false;
			this.combined = 0;
			this.text = this.createText();
		},
		
		createText: function () {
			this.text = TextConstants.createTextFromLogMessage(this.message, this.replacements, this.values, true);
			
			return this.text;
		},
		
		getText: function () {
			if (!this.text) {
				this.createText();
			}
			return this.text;
		},
	
	});

	return LogMessageVO;
});
