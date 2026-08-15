define(['ash'], function (Ash) {

	var LocaleConstants = {

		LOCALE_ID_WORKSHOP: "w",
		LOCALE_ID_PASSAGE: "p",
		
		LOCALE_BRACKET_EARLY: "locale-early",
		LOCALE_BRACKET_LATE: "locale-late",
		
		getPassageLocaleId: function (direction) {
			return this.LOCALE_ID_PASSAGE + "_" + direction;
		},

		canBeScoutedAgain: function (localeType) {
			switch (localeType) {
				case localeTypes.butcher: return true;
				case localeTypes.clinic: return true;
				case localeTypes.shortcut: return true;
				case localeTypes.repairshop: return true;
			}
			return false;
		},

		isLocaleScoutActionMovement: function (localeType) {
			switch (localeType) {
				case localeTypes.shortcut: return true;
			}
			return false;
		},

		isInvestigatable: function (localeType) {
			switch (localeType) {
				case localeTypes.spaceFactory:
				case localeTypes.depot:
				case localeTypes.isolationCenter:
				case localeTypes.healthCenter:
					return true;
				default: 
					return false;
			}
		},
	
	};
	
	return LocaleConstants;
	
});
