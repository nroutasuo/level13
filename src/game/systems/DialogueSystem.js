// A system that updates the player's resource storage capacity based on their currently equipped bag
define([
	'ash',
	'game/GameGlobals',
    'game/nodes/player/DialogueNode',
	'game/components/player/DialogueComponent'
], function (Ash, GameGlobals, DialogueNode, DialogueComponent) {
	
	let DialogueSystem = Ash.System.extend({

        dialogueNodes: null,
		
		constructor: function () {
		},

		addToEngine: function (engine) {
			this.engine = engine;
            
			this.dialogueNodes = engine.getNodeList(DialogueNode);
			this.dialogueNodes.nodeAdded.add(this.onDialogueNodeAdded, this);
		},

		removeFromEngine: function (engine) {
            this.engine = null;

			this.dialogueNodes.nodeAdded.remove(this.onDialogueNodeAdded, this);
            this.dialogueNodes = null;
		},

		update: function () {
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

		startDialogue: function () {
			let pageID = this.selectNextPage();

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
				let currentResultVO = pageVO.resultTemplate.clone();
				GameGlobals.playerActionResultsHelper.preCollectRewards(currentResultVO);
				this.dialogueNodes.head.dialogue.currentResultVO = currentResultVO;
			} else {
				this.dialogueNodes.head.dialogue.currentResultVO = null;
			}

			this.dialogueNodes.head.dialogue.currentPageID = pageID;
		},

		endPage: function () {
			if (this.dialogueNodes.head.dialogue.currentResultVO) {
				GameGlobals.playerActionResultsHelper.collectRewards(true, this.dialogueNodes.head.dialogue.currentResultVO);
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
			this.startPage(responsePageID);
		},

		endDialogue: function () {
			this.endPage();

			this.dialogueNodes.head.entity.remove(DialogueComponent);
		},

		selectNextPage: function () {
			if (!this.dialogueNodes.head.dialogue || !this.dialogueNodes.head.dialogue.activeDialogue || this.dialogueNodes.head.dialogue.activeDialogue.pages.length == 0) return null;
			return this.dialogueNodes.head.dialogue.activeDialogue.pages[0].pageID;
		},

        onDialogueNodeAdded: function (node) {
            this.startDialogue();
        }
		
		
	});

	return DialogueSystem;
});
