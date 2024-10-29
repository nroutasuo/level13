define(['ash'], function (Ash) {
	
	let DialogueComponent = Ash.Class.extend({
		
		constructor: function (dialogueVO) {
            this.activeDialogue = dialogueVO;

			this.currentPageID = null;
			this.pendingSelectionID = null;

			this.isStarted = false;
			this.isShown = false;
			this.isClosed  = false;
		},
	});

	return DialogueComponent;
});
