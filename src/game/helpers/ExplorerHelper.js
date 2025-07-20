define([
	'ash',
	'game/GameGlobals',
	'game/constants/DialogueConstants',
	'game/constants/ExplorerConstants',
	'game/constants/StoryConstants',
], function (
	Ash,
	GameGlobals,
	DialogueConstants,
	ExplorerConstants,
	StoryConstants,
) {
	
	let ExplorerHelper = Ash.Class.extend({

		constructor: function (engine) { },

		getNewPredefinedExplorer: function (explorerID) {
			return ExplorerConstants.getNewPredefinedExplorer(explorerID);
		},

		getNewRandomExplorer: function (source, campOrdinal, appearLevel, options) {
			options = options || {};

			// add current non generic explorers to excluded dialogue sources to avoid duplicates
			options.excludedDialogueSources = options.excludedDialogueSources || [];
			let currentExplorers = GameGlobals.playerHelper.getExplorers();
			for (let i = 0; i < currentExplorers.length; i++) {
				let explorerVO = currentExplorers[i];
				if (explorerVO.dialogueSource.indexOf("_generic") < 0) {
					options.excludedDialogueSources.push(explorerVO.dialogueSource);
				}
			}

			options.explorerStats = GameGlobals.playerHelper.getExplorerStats();

			return ExplorerConstants.getNewRandomExplorer(source, campOrdinal, appearLevel, options);
		},

		isDismissable: function (explorerVO) {
			return this.getIsNotDismissableReason(explorerVO) == null;
		},

		getIsNotDismissableReason: function (explorerVO) {
			if (!explorerVO) return "ui.actions.unavailable_reason_invalid_message";

			let quest = GameGlobals.storyHelper.getExplorerQuestStory(explorerVO);
			if (quest) return "ui.actions.unavailable_reason_quest_message";

			let forcedExplorerID = this.getForcedExplorerID();
			if (forcedExplorerID && explorerVO.id == forcedExplorerID) return "ui.actions.unavailable_reason_quest_message";

			if (GameGlobals.dialogueHelper.hasValidPendingDialogue(explorerVO)) return "ui.actions.unavailable_reason_pending_dialogue_message";

			let dialogueStatus = GameGlobals.dialogueHelper.getExplorerDialogueStatus(explorerVO);
			if (dialogueStatus == DialogueConstants.STATUS_FORCED) return "ui.actions.unavailable_reason_pending_dialogue_message";
			if (dialogueStatus == DialogueConstants.STATUS_URGENT) return "ui.actions.unavailable_reason_pending_dialogue_message";

			return null;
		},

		isSelectable: function (explorerVO) {
			return this.getIsNotSelectableReason(explorerVO) == null;
		},

		getIsNotSelectableReason: function (explorerVO) {
			if (!explorerVO) return "ui.actions.unavailable_reason_invalid_message";

			if (explorerVO.injuredTimer >= 0) return "Explorer injured";

			return null;
		},

		getForcedExplorerID: function () {
			if (GameGlobals.gameState.getStoryFlag(StoryConstants.flags.SPIRITS_SEARCHING_FOR_SPIRITS) && !GameGlobals.tribeHelper.hasDeity()) {
				return "gambler";
			}

			if (GameGlobals.gameState.getStoryFlag(StoryConstants.flags.RESCUE_PASSAGE_UP_BUILT)) {
				if (!GameGlobals.gameState.getStoryFlag(StoryConstants.flags.RESCUE_LEVEL_14_HAZARD_FOUND)) {
					if (!GameGlobals.gameState.getStoryFlag(StoryConstants.flags.RESCUE_EXPLORER_FOUND)) {
						return "prospector";
					}
				}
			}

			if (GameGlobals.gameState.isFeatureUnlocked("investigate")) {
				if (!GameGlobals.gameState.isFeatureUsed("investigate")) {
					return "journalist";
				}
			}

			return null;
		},
		
	});

	return ExplorerHelper;
});
