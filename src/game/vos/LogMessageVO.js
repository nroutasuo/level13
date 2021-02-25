define(['ash', 'game/constants/TextConstants'], function (Ash, TextConstants) {
	
	var LogMessageVO = Ash.Class.extend({
		
		constructor: function (logMsgID, message, replacements, values, campLevel, timeOffset) {
			timeOffset = timeOffset || 0;
			this.logMsgID = logMsgID;
			this.message = message;
			this.replacements = replacements ? replacements : [];
			this.values = values ? values : [];
			this.campLevel = campLevel;
			
			this.time = new Date();
			if (timeOffset != 0) {
				this.time.setSeconds(this.time.getSeconds() - timeOffset);
			}
			this.loadedFromSave = false;
			this.combined = 0;
			this.text = this.createText();
		},
	
		setPending: function (visibleLevel, visibleSector, visibleInCamp) {
			this.pendingLevel = visibleLevel;
			this.pendingSector = visibleSector;
			this.pendingInCamp = visibleInCamp;
		},
	
		setPendingOver: function () {
			this.loadedFromSave = false;
			this.time = new Date();
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
		}
	
	});

	return LogMessageVO;
});
