define([
	'ash',
	'game/GameGlobals',
	'game/constants/ExplorerConstants',
	'game/constants/StoryConstants',
], function (
	Ash,
	GameGlobals,
	ExplorerConstants,
	StoryConstants,
) {
	
	let ExplorerHelper = Ash.Class.extend({

		constructor: function (engine) { },

        getNewPredefinedExplorer: function (explorerID) {
            return ExplorerConstants.getNewPredefinedExplorer(explorerID);
        },

        getNewRandomExplorer: function (source, campOrdinal, appearLevel, options) {
            return ExplorerConstants.getNewRandomExploer(source, campOrdinal, appearLevel, options);
        },

		isDismissable: function (explorerVO) {
			if (this.isStoryCriticalExplorer(explorerVO)) return false;
			return true;
		},

		isStoryCriticalExplorer: function (explorerVO) {
			if (explorerVO.pendingDialogue) return true;

			// TODO consider upcoming dialogue tags

			return false;
		},
		
	});

	return ExplorerHelper;
});
