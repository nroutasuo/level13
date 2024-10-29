define(['ash'], function (Ash) {
	
	let DialogueVO = Ash.Class.extend({
	
		constructor: function (dialogueID) {
			this.dialogueID = dialogueID;
			this.pages = [];
			this.pagesByID = {};
		},
		
	});

	return DialogueVO;
});
