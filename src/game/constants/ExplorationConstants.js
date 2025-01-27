define(['ash', 'game/vos/LocaleVO'], function (Ash, LocaleVO) {

	var ExplorationConstants = {
		
		MIN_EXCURSION_LENGTH: 1,
		BEACON_RADIUS: 4,
		THRESHOLD_SCAVENGED_PERCENT_REVEAL_NO_RESOURCES: 10,
		
		getScoutLocaleEvidenceReward: function (localeType, campOrdinal) {
			let defaultValue = Math.ceil(campOrdinal / 3);
			switch (localeType) {
				case localeTypes.grove:
				case localeTypes.greenhouse:
				case localeTypes.tradingpartner:
					return 0;
				
				case localeTypes.depot:
					return defaultValue * 2;

				case localeTypes.spacefactory:
					return defaultValue * 4;
				
				default:
					return defaultValue;
			}
		},
		
	};
	return ExplorationConstants;
});
