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
            return ExplorerConstants.getNewRandomExplorer(source, campOrdinal, appearLevel, options);
        },

		isDismissable: function (explorerVO) {
			if (this.isStoryCriticalExplorer(explorerVO)) return false;
			return true;
		},

		isStoryCriticalExplorer: function (explorerVO) {
			if (explorerVO.pendingDialogue) return true;

			// TODO consider upcoming dialogue tags

			let forcedExplorerID = this.getForcedExplorerID();
			if (forcedExplorerID && explorerVO.id == forcedExplorerID) return true;

			return false;
		},

		getForcedExplorerID: function () {
			if (GameGlobals.gameState.getStoryFlag(StoryConstants.flags.SPIRITS_SEARCHING_FOR_SPIRITS)) {
				return "gambler";
			}
			if (GameGlobals.gameState.getStoryFlag(StoryConstants.flags.RESCUE_PASSAGE_UP_BUILT)) {
				if (!GameGlobals.gameState.getStoryFlag(StoryConstants.RESCUE_LEVEL_14_HAZARD_FOUND)) {
					return "prospector";
				}
			}
			return null;
		},
		
	});

	return ExplorerHelper;
});
