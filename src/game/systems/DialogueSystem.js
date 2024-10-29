// A system that updates the player's resource storage capacity based on their currently equipped bag
define([
	'ash',
	'game/GameGlobals',
    'game/nodes/player/DialogueNode',
], function (Ash, GameGlobals, DialogueNode) {
	
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


			if (dialogueComponent.isClosed) {
				this.endDialogue();
				return;
			}

			if (dialogueComponent.pendingSelectionID) {
				this.selectPendingOption();
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
			log.i("start dialogue page: " + pageID);
			this.dialogueNodes.head.dialogue.currentPageID = pageID;
		},

		selectPendingOption: function () {
			let dialogueComponent = this.dialogueNodes.head.dialogue;

			let currentPageID = dialogueComponent.currentPageID;

			let currentPageVO = this.dialogueNodes.head.dialogue.activeDialogue.pagesByID[currentPageID];

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

			this.startPage(responsePageID);
		},

		endDialogue: function () {
			GameGlobals.playerActionFunctions.endDialogue();
		},

		selectNextPage: function () {
			return this.dialogueNodes.head.dialogue.activeDialogue.pages[0].pageID;
		},

        onDialogueNodeAdded: function (node) {
            this.startDialogue();
        }
		
		
	});

	return DialogueSystem;
});
