define(['ash', 'game/vos/LocaleVO'], function (Ash, LocaleVO) {

	var ExplorationConstants = {
		
		BEACON_RADIUS: 4,
		
		getScoutLocaleReward: function (localeType, campOrdinal) {
			switch (localeType) {
				case localeTypes.grove:
				case localeTypes.tradingpartner:
					return 0;
				
				default:
					return Math.ceil(campOrdinal / 3);
			}
		},
		
	};
	return ExplorationConstants;
});
