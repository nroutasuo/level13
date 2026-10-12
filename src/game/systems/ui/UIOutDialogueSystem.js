define([
	'ash',
	'text/Text',
	'utils/UIList',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/UIConstants',
    'game/nodes/player/DialogueNode',
], function (Ash, Text, UIList, GameGlobals, GlobalSignals, GameConstants, UIConstants, DialogueNode) {
	
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
			GameGlobals.uiFunctions.focus($("#dialogue-popup .buttonbox button"));
		},

		refreshPage: function () {
			let dialogueVO = this.dialogueNodes.head.dialogue.activeDialogue;

			if (!dialogueVO) return;

			let pageID = this.dialogueNodes.head.dialogue.currentPageID;

			if (!pageID && pageID !== 0) return;

			let pageVO = dialogueVO.pagesByID[pageID];

			if (!pageVO) return;

			let explorerVO = this.dialogueNodes.head.dialogue.explorerVO;
			let characterVO = this.dialogueNodes.head.dialogue.characterVO;

			this.refreshPageCharacter(explorerVO, characterVO);
			this.refreshPageText(dialogueVO, pageVO, explorerVO);
			this.refreshPageResults(pageVO);
			this.refreshPageSelection(pageVO);
			this.refreshPageOptions(pageVO);

			this.shownPageID = pageID;
			
			GameGlobals.uiFunctions.generateInfoCallouts("#dialogue-popup");

			setTimeout(function () {
				GameGlobals.uiFunctions.popupManager.repositionPopups();
			});
		},

		refreshPageCharacter: function (explorerVO, characterVO) {
			$("#dialogue-module-character").empty();

			if (explorerVO) {
				let portrait = UIConstants.getExplorerPortrait(explorerVO);
				$("#dialogue-module-character").append(portrait);
				GameGlobals.uiFunctions.toggle("#dialogue-module-character", true);
			} else if (characterVO) {
				let randomIndex = characterVO.randomIndex || characterVO.instanceID || 0;
				let portrait = UIConstants.getNPCPortrait(characterVO.characterType, randomIndex);
				$("#dialogue-module-character").append(portrait);
				GameGlobals.uiFunctions.toggle("#dialogue-module-character", true);
			} else {
				GameGlobals.uiFunctions.toggle("#dialogue-module-character", false);
			}
		},

		refreshPageText: function (dialogueVO, pageVO, explorerVO) {
			let resultVO = this.dialogueNodes.head.dialogue.currentResultVO;
			
			let textParams = GameGlobals.dialogueHelper.getDialogueTextParams(dialogueVO, pageVO, resultVO, explorerVO != null);

			if (explorerVO) {
				textParams.animalType = explorerVO.animalType || explorerVO.name; 
			}

			let titleTextKey = dialogueVO.titleTextKey || pageVO.titleTextKey || GameGlobals.gameState.uiStatus.sequenceTitleKey;
			if (titleTextKey) {
				$("#dialogue-module-title h3").text(Text.t(titleTextKey, textParams));
				GameGlobals.uiFunctions.toggle("#dialogue-module-title", true);
			} else {
				GameGlobals.uiFunctions.toggle("#dialogue-module-title", false);
			}
			
			let textKey = this.getPageTextKey(pageVO);
			$("#dialogue-module-dialogue p").html(Text.t(textKey, textParams));

			let metaTextKey = pageVO.metaTextKey;
			if (metaTextKey) {
				$("#dialogue-module-meta p").html(Text.t(metaTextKey, textParams));
				GameGlobals.uiFunctions.toggle("#dialogue-module-meta", true);
			} else {
				GameGlobals.uiFunctions.toggle("#dialogue-module-meta", false);
			}
		},

		refreshPageResults: function (pageVO) {
			let resultVO = this.dialogueNodes.head.dialogue.currentResultVO;
			let hasResults = resultVO && !resultVO.isVisuallyEmpty();

			$("#dialogue-module-results").empty();
			GameGlobals.uiFunctions.toggle("#dialogue-module-results", hasResults);

			if (!hasResults) return;

			let rewardDiv = GameGlobals.playerActionResultsHelper.getRewardDiv(resultVO, { hideInventoryManagement: true });

			$("#dialogue-module-results").append(rewardDiv);
		},

		refreshPageSelection: function (pageVO) {
			let selectionDef = pageVO.selection;
			let hasSelection = selectionDef && Object.keys(selectionDef).length > 0;

			$("#dialogue-module-selection").empty();
			GameGlobals.uiFunctions.toggle("#dialogue-module-selection", hasSelection);

			if (!hasSelection) return;

			let selectionDiv = this.getSelectionDiv(selectionDef);

			$("#dialogue-module-selection").append(selectionDiv);
		},

		refreshPageOptions: function (pageVO) {
			let hasOptions = pageVO.options.length > 0;

			$("#dialogue-popup .buttonbox").empty();

			let defaultLabelKey = "ui.common.continue_button_label";

			if (hasOptions) {
				for (let i in pageVO.options) {
					// TODO check conditions
					let optionVO = pageVO.options[i];
					let buttonKey = optionVO.buttonTextKey || defaultLabelKey;
					let label = Text.t(buttonKey);
					let action = "select_dialogue_option_" + optionVO.optionID;
					$("#dialogue-popup .buttonbox").append("<button class='action dialogue-option' action='" + action + "'>" + label + "</button>");
				}
			} else {
				let label = pageVO.Text.t(defaultLabelKey);
				$("#dialogue-popup .buttonbox").append("<button class='action dialogue-option' action='end_dialogue'>" + label + "</button>");
			}
			
			GameGlobals.uiFunctions.createButtons("#dialogue-popup .buttonbox");

			GlobalSignals.elementCreatedSignal.dispatch();
		},

		getPageTextKey: function (pageVO) {
			// choose from random
			if (pageVO.textKey == "random" && pageVO.randomTextKeys && pageVO.randomTextKeys.length > 0) {
				let validRandomKeys = [];
				for (let i = 0; i < pageVO.randomTextKeys.length; i++) {
					let randomKeyData = pageVO.randomTextKeys[i];
					let reqsCheck = GameGlobals.playerActionsHelper.checkGeneralRequirementaInternal(randomKeyData.conditions);
					if (reqsCheck.value < 1) continue;
					if (!randomKeyData.textKey) continue;
					validRandomKeys.push(randomKeyData);
				}
				if (validRandomKeys.length > 0) {
					let random = pageVO.randomSeed || 0;
					return validRandomKeys[random & validRandomKeys.length].textKey;
				}
			}
			// plain text key
			if (pageVO.textKey) return pageVO.textKey;
			// default fallback with result
			if (pageVO.resultTemplate) return "ui.exploration.action_rewards_generic_message_01";
			// nothing
			return "";
		},

		getSelectionDiv: function (selectionDef) {
			let type = selectionDef.type;
			let source = selectionDef.source;

			let options = GameGlobals.dialogueHelper.getSelectionOptions(source);

			let div = "<div>";

			if (type == "DROPDOWN") {
				div += UIConstants.getDropdown("dialogue-page-selection", options);
			}

			div += "<div>";

			return div;
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
