define([
	'ash',
	'text/Text',
	'utils/UIList',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
    'game/nodes/player/DialogueNode',
], function (Ash, Text, UIList, GameGlobals, GlobalSignals, GameConstants, DialogueNode) {
	
    let UIOutDialogueSystem = Ash.System.extend({

        dialogueNodes: null,
		shownPageID: null,

		constructor: function () {
		},

		addToEngine: function (engine) {
            this.engine = engine;

			this.dialogueNodes = engine.getNodeList(DialogueNode);
			this.dialogueNodes.nodeAdded.add(this.onDialogueNodeAdded, this);
			this.dialogueNodes.nodeRemoved.add(this.onDialogueNodeRemoved, this);

			GlobalSignals.add(this, GlobalSignals.popupOpenedSignal, this.onPopupOpened);
			GlobalSignals.add(this, GlobalSignals.popupClosedSignal, this.onPopupClosed);
		},

		removeFromEngine: function (engine) {
            this.engine = null;

			this.dialogueNodes.nodeAdded.remove(this.onDialogueNodeAdded, this);
            this.dialogueNodes = null;

			GlobalSignals.removeAll(this);
		},

		update: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			if (!this.dialogueNodes.head) return;
			if (!this.dialogueNodes.head.dialogue.isStarted) return;

			let dialogueComponent = this.dialogueNodes.head.dialogue;

			if (!dialogueComponent.isShown) {
				this.showDialogue();
				return;
			}

			if (dialogueComponent.currentPageID != this.shownPageID) {
				this.refreshPage();
			}
		},

		showDialogue: function () {
			let dialogueComponent = this.dialogueNodes.head.dialogue;

			let sys = this;

			GameGlobals.uiFunctions.showSpecialPopup("dialogue-popup", { setupCallback: () => sys.setupDialogue() });
			dialogueComponent.isShown = true;
		},

		setupDialogue: function () {
			this.refreshPage();
		},

		refreshPage: function () {
			let pageID = this.dialogueNodes.head.dialogue.currentPageID;

			if (!pageID && pageID !== 0) return;

			let pageVO = this.dialogueNodes.head.dialogue.activeDialogue.pagesByID[pageID];

			if (!pageVO) return;

			this.refreshPageText(pageVO);
			this.refreshPageResults(pageVO);
			this.refreshPageOptions(pageVO);

			this.shownPageID = pageID;
		},

		refreshPageText: function (pageVO) {
			$("#dialogue-module-dialogue p").text(Text.t(pageVO.textKey));
		},

		refreshPageResults: function (pageVO) {
			let resultVO = this.dialogueNodes.head.dialogue.currentResultVO;
			let hasResults = pageVO.resultTemplate && !pageVO.resultTemplate.isEmpty() && resultVO != null;

			$("#dialogue-module-results").empty();
			GameGlobals.uiFunctions.toggle("#dialogue-module-results", hasResults);

			if (!hasResults) return;

			let rewardDiv = GameGlobals.playerActionResultsHelper.getRewardDiv(resultVO, { hideInventoryManagement: true });

			$("#dialogue-module-results").append(rewardDiv);
		},

		refreshPageOptions: function (pageVO) {
			let hasOptions = pageVO.options.length > 0;

			$("#dialogue-popup .buttonbox").empty();

			let defaultLabelKey = "ui.common.continue_button_label";

			if (hasOptions) {
				for (let i in pageVO.options) {
					// TODO check conditions
					// TODO show costs
					let optionVO = pageVO.options[i];
					let buttonKey = optionVO.buttonTextKey || defaultLabelKey;
					let label = Text.t(buttonKey);
					let action = "select_dialogue_option_" + optionVO.optionID;
					$("#dialogue-popup .buttonbox").append("<button class='action dialogue-option' action='" + action + "'>" + label + "</button>");
				}
			} else {
				let defaultLabel = Text.t(defaultLabelKey);
				$("#dialogue-popup .buttonbox").append("<button class='action dialogue-option' action='end_dialogue'>" + defaultLabel + "</button>");
			}
			
			GameGlobals.uiFunctions.createButtons("#dialogue-popup .buttonbox");

			GlobalSignals.elementCreatedSignal.dispatch();
		},

		closeDialogue: function () {
			GameGlobals.uiFunctions.popupManager.closePopup("dialogue-popup");
		},

		onDialogueNodeAdded: function () {

		},

		onDialogueNodeRemoved: function () {
			this.closeDialogue();
		},

		onPopupOpened: function (popupID) {
		},

        onPopupClosed: function (popupID) {
        },

	});

	return UIOutDialogueSystem;
});
