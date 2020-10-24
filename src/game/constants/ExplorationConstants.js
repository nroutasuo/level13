define(['ash'], function (Ash) {

    var ExplorationConstants = {
        
        BEACON_RADIUS: 4,
		
        getScoutLocaleReward: function (localeCategory, campOrdinal) {
            if (localeCategory === "u") {
                return Math.ceil(campOrdinal / 3);
            } else {
                return 0;
            }
        },
        
    };
    return ExplorationConstants;
});
