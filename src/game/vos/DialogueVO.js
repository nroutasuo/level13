define(['ash'], function (Ash) {
	
	let DialogueVO = Ash.Class.extend({

		dialogueID: "",
		titleTextKey: null,
		pages: [],
		pagesByID: {},
		conditions: {},
		storyTag: null,
		isRepeatable: true,
		isUrgent: false,
		isPriority: false,
	
		constructor: function (dialogueID) {
			this.dialogueID = dialogueID;
			this.pages = [];
			this.pagesByID = {};
		},
		
	});

	return DialogueVO;
});
