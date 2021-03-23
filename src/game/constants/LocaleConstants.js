define(['ash'], function (Ash) {

	var LocaleConstants = {

		LOCALE_ID_WORKSHOP: "w",
		LOCALE_ID_PASSAGE: "p",
		
		LOCALE_BRACKET_EARLY: "locale-early",
		LOCALE_BRACKET_LATE: "locale-late",
		
		getPassageLocaleId: function (direction) {
			return this.LOCALE_ID_PASSAGE + "_" + direction;
		},
	
	};
	
	return LocaleConstants;
	
});
