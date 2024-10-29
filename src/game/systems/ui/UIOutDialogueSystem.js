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

			$("#dialogue-module-dialogue p").text(Text.t(pageVO.textKey));

			let hasOptions = pageVO.options.length > 0;

			$("#dialogue-popup .buttonbox").empty();

			if (hasOptions) {
				for (let i in pageVO.options) {
					// TODO check conditions
					// TODO show costs
					let optionVO = pageVO.options[i];
					let label = Text.t(optionVO.buttonTextKey);
					let action = "select_dialogue_option_" + optionVO.optionID;
					$("#dialogue-popup .buttonbox").append("<button class='action dialogue-option' action='" + action + "'>" + label + "</button>");
				}
			} else {
				let defaultLabel = Text.t("ui.common.continue_button_label");
				$("#dialogue-popup .buttonbox").append("<button class='action dialogue-option' action='end_dialogue'>" + defaultLabel + "</button>");
			}
			
			GameGlobals.uiFunctions.createButtons("#dialogue-popup .buttonbox");

			this.shownPageID = pageID;
		},

		closeDialogue: function () {
			if (this.dialogueNodes.head) {
				this.dialogueNodes.head.dialogue.isClosed = true;
			}
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
