define([
	'ash',
	'game/GameGlobals',
	'game/constants/ExplorerConstants',
], function (
	Ash,
	GameGlobals,
	ExplorerConstants,
) {
	
	let ExplorerHelper = Ash.Class.extend({

		constructor: function (engine) { },

        getNewPredefinedExplorer: function (explorerID) {
            return ExplorerConstants.getNewPredefinedExplorer(explorerID);
        },

        getNewRandomExplorer: function (source, campOrdinal, appearLevel, options) {
            return ExplorerConstants.getNewRandomExploer(source, campOrdinal, appearLevel, options);
        }
		
	});

	return ExplorerHelper;
});
