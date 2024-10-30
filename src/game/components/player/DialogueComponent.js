define(['ash'], function (Ash) {
	
	let DialogueComponent = Ash.Class.extend({
		
		constructor: function (dialogueVO) {
            this.activeDialogue = dialogueVO;

			this.currentPageID = null;
			this.pendingSelectionID = null;
			this.currentResultVO = null;

			this.isStarted = false;
			this.isShown = false;
			this.isEnded = false;
		},
	});

	return DialogueComponent;
});
