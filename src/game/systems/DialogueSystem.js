// A system that updates the player's resource storage capacity based on their currently equipped bag
define([
	'ash',
	'game/GlobalSignals',
	'game/GameGlobals',
	'game/constants/DialogueConstants',
	'game/constants/ExplorerConstants',
    'game/nodes/player/DialogueNode',
	'game/components/player/DialogueComponent'
], function (Ash, GlobalSignals, GameGlobals, DialogueConstants, ExplorerConstants, DialogueNode, DialogueComponent) {
	
	let DialogueSystem = Ash.System.extend({

        dialogueNodes: null,

		addToEngine: function (engine) {
			this.engine = engine;
            
			this.dialogueNodes = engine.getNodeList(DialogueNode);
			this.dialogueNodes.nodeAdded.add(this.onDialogueNodeAdded, this);

			GlobalSignals.add(this, GlobalSignals.triggerDialogueSignal, this.onTriggerDialogue);
		},

		removeFromEngine: function (engine) {
            this.engine = null;

			this.dialogueNodes.nodeAdded.remove(this.onDialogueNodeAdded, this);
            this.dialogueNodes = null;
		},

		update: function () {
			if (this.dialogueNodes && this.dialogueNodes.head) {
				this.updateActiveDialogue();
			} else {
				this.updatePendingDialogues();
			}
		},

		updateActiveDialogue: function () {
			if (!this.dialogueNodes.head) return;
			
			let dialogueComponent = this.dialogueNodes.head.dialogue;

			if (dialogueComponent.pendingSelectionID) {
				this.selectPendingOption();
				return;
			}

			if (dialogueComponent.isEnded) {
				this.endDialogue();
				return;
			}
		},

		updatePendingDialogues: function () {			
			let pendingDialogues = GameGlobals.gameState.pendingDialogues;
			for (let i = 0; i < pendingDialogues.length; i++) {
				let pendingDialogue = pendingDialogues[i]; 
				if (this.tryTriggerPendingDialogue(pendingDialogue)) {
					GameGlobals.gameState.pendingDialogues.splice(i, 1);
					return;
				}
			}
		},

		tryTriggerPendingDialogue: function (pendingDialogueVO) {
			// TODO formalize

			let owner = pendingDialogueVO.owner;
			
			switch (owner) {
				case "explorer":
					return this.tryTriggerPendingExplorerDialogue(pendingDialogueVO.storyTag);
				default:
					log.w("unknown owner for pending dialogue: " + owner);
					return false;
			}
		},

		tryTriggerPendingExplorerDialogue: function (storyTag) {
			let explorers = GameGlobals.playerHelper.getExplorers();
			let explorerScore = function (explorerVO) {
				let score = 0;
				if (explorerVO.inParty) score += 1;
				if (ExplorerConstants.isUnique(explorerVO)) score += 3;
				return score;
			}
			let sortedExplorers = explorers.sort((a, b) => explorerScore(b) - explorerScore(a));
			
			let setting = DialogueConstants.dialogueSettings.interact;

			for (let i = 0; i < sortedExplorers.length; i++) {
				let explorerVO = sortedExplorers[i];
				let validDialogues = GameGlobals.dialogueHelper.getExplorerValidDialogues(explorerVO, setting, storyTag);
				if (validDialogues.length > 0) {
					log.i("add pending dialogue: " + storyTag, this);
					explorerVO.pendingDialogue = storyTag;
					return true;
				}
			}

			return false;
		},

		startDialogue: function () {
			let pageID = this.selectFirstPage();

			if (!pageID && pageID !== 0) {
				log.w("no first page found for dialogue");
				debugger
				return;
			}
			
			this.startPage(pageID);

			this.dialogueNodes.head.dialogue.isStarted = true;
		},

		startPage: function (pageID) {
			let pageVO = this.dialogueNodes.head.dialogue.activeDialogue.pagesByID[pageID];

			if (!pageVO) return;

			log.i("start dialogue page: " + pageID);

			if (pageVO.resultTemplate) {
				let currentResultVO = this.getPageResult(pageVO.resultTemplate);
				GameGlobals.playerActionResultsHelper.preCollectRewards(currentResultVO);
				this.dialogueNodes.head.dialogue.currentResultVO = currentResultVO;
			} else {
				this.dialogueNodes.head.dialogue.currentResultVO = null;
			}

			this.dialogueNodes.head.dialogue.currentPageID = pageID;
		},

		endPage: function () {
			if (this.dialogueNodes.head.dialogue.currentResultVO) {
				let resultVO = this.dialogueNodes.head.dialogue.currentResultVO;
				GameGlobals.playerActionResultsHelper.collectRewards(true, resultVO);

				if (resultVO.removeCharacter) {
					let characterVO = this.dialogueNodes.head.dialogue.characterVO;
					if (characterVO) {
						GlobalSignals.removeCharacterSignal.dispatch(characterVO.instanceID);
					}
				}

				this.dialogueNodes.head.dialogue.currentResultVO = null;
			}
		},

		selectPendingOption: function () {
			let dialogueComponent = this.dialogueNodes.head.dialogue;

			let currentPageVO = GameGlobals.dialogueHelper.getCurrentPageVO();

			if (!currentPageVO) {
				debugger
				log.w("no page found for id " + pageID);
				this.endDialogue();
				return;
			}

			let optionID = dialogueComponent.pendingSelectionID;

			dialogueComponent.pendingSelectionID = null;

			let optionVO = currentPageVO.optionsByID[optionID];

			if (!optionVO) {
				debugger
				log.w("no option for id " + optionID);
				this.endDialogue();
				return;
			}

			// TODO check conditions
			// TODO DEDUCT COSTS

			let responsePageID = optionVO.responsePageID;

			this.endPage(); 

			if (responsePageID === "END") {
				this.endDialogue();
				return;
			}

			this.startPage(responsePageID);
		},

		endDialogue: function () {
			let dialogueVO = this.dialogueNodes.head.dialogue.activeDialogue;
			let explorerVO = this.dialogueNodes.head.dialogue.explorerVO;
			
			this.endPage();

			this.dialogueNodes.head.entity.remove(DialogueComponent);

			if (explorerVO && explorerVO.pendingDialogue == dialogueVO.storyTag) {
				log.i("complete pending dialogue: " + dialogueVO.storyTag, this);
				explorerVO.pendingDialogue = null;
			}

			if (dialogueVO) {
				GlobalSignals.dialogueCompletedSignal.dispatch(dialogueVO.storyTag);
			}
		},

		selectFirstPage: function () {
			if (!this.dialogueNodes.head.dialogue) return null;
			if (!this.dialogueNodes.head.dialogue.activeDialogue) return null;
			if (!this.dialogueNodes.head.dialogue.activeDialogue.pages) return null;
			if (this.dialogueNodes.head.dialogue.activeDialogue.pages.length == 0) return null;
			return this.dialogueNodes.head.dialogue.activeDialogue.pages[0].pageID;
		},

		getPageResult: function (resultTemplate) {
			if (resultTemplate.templateAction) {
				return GameGlobals.playerActionResultsHelper.getResultVOByAction(resultTemplate.templateAction);
			} else {
				return resultTemplate.clone();
			}
		},

        onDialogueNodeAdded: function (node) {
            this.startDialogue();
        },

		onTriggerDialogue: function (owner, storyTag) {
			GameGlobals.gameState.pendingDialogues.push({ owner: owner, storyTag: storyTag });
		},
		
		
	});

	return DialogueSystem;
});
