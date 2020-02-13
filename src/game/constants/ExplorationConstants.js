define(['ash'], function (Ash) {

    var ExplorationConstants = {
		
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
