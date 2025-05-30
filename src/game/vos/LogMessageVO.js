define(['ash', 'game/constants/LogConstants', 'game/vos/PositionVO'], function (Ash, LogConstants, PositionVO) {
	
	let LogMessageVO = Ash.Class.extend({
		
		constructor: function (logMsgID, messageTextVO, position, visibility, timeOffset) {
			timeOffset = timeOffset || 0;

			this.logMsgID = logMsgID;
			this.messageTextVO = messageTextVO;

			this.position = position ? position.getPosition().clone() : null;
			this.visibility = visibility || LogConstants.MSG_VISIBILITY_DEFAULT;

			this.timestamp = new Date().getTime();

			this.loadedFromSave = false;
		},

		getCustomSaveObject: function () {
			let copy = {};

			copy.id = this.logMsgID;
			copy.timestamp = this.timestamp;
			copy.visibility = this.getVisibilityShortName(this.visibility);
			copy.msg = this.messageTextVO;
			copy.pos = this.position.getCustomSaveObject();
			
			if (this.hasBeenShown) copy.shown = 1;
			if (this.markedAsSeen) copy.seen = 1;

			return copy;
		},

		customLoadFromSave: function (componentValues) {
			this.logMsgID = componentValues.id || componentValues.logMsgID;
			this.timestamp = componentValues.timestamp;
			this.visibility = this.getVisibilityLongName(componentValues.visibility);
			this.messageTextVO = componentValues.msg || componentValues.messageTextVO;

			this.position = new PositionVO();
			this.position.customLoadFromSave(componentValues.pos || componentValues.position);

			this.hasBeenShown = componentValues.shown == 1 || componentValues.hasBeenShown || false;
			this.markedAsSeen = componentValues.seen == 1 || componentValues.markedAsSeen || false;

			// backwards compatibility (used to save a Date object called time but switched to a timestamp)
			if (componentValues.time) {
				timestamp = Date.parse(componentValues.time);
			}

			// backwards compatibility (used to save raw text rather than text vo)
			if (componentValues.text) this.text = componentValues.text;
		},

		getVisibilityShortName: function (visibility) {
			switch (visibility) {
				case LogConstants.MSG_VISIBILITY_DEFAULT: return LogConstants.MSG_VISIBILITY_DEFAULT_SHORT;
				case LogConstants.MGS_VISIBILITY_LEVEL: return LogConstants.MGS_VISIBILITY_LEVEL_SHORT;
				case LogConstants.MSG_VISIBILITY_CAMP: return LogConstants.MSG_VISIBILITY_CAMP_SHORT;
				case LogConstants.MSG_VISIBILITY_GLOBAL: return  LogConstants.MSG_VISIBILITY_GLOBAL_SHORT;
			}
		},

		getVisibilityLongName: function (visibility) {
			switch (visibility) {
				case LogConstants.MSG_VISIBILITY_DEFAULT_SHORT: LogConstants.MSG_VISIBILITY_DEFAULT;
				case LogConstants.MGS_VISIBILITY_LEVEL_SHORT: LogConstants.MGS_VISIBILITY_LEVEL;
				case LogConstants.MSG_VISIBILITY_CAMP_SHORT: LogConstants.MSG_VISIBILITY_CAMP;
				case LogConstants.MSG_VISIBILITY_GLOBAL_SHORT: LogConstants.MSG_VISIBILITY_GLOBAL;
			}

			return visibility;
		},
	
	});

	return LogMessageVO;
});
