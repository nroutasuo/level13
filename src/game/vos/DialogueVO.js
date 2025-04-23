define(['ash'], function (Ash) {
	
	let DialogueVO = Ash.Class.extend({

		dialogueID: "",
		titleTextKey: null,
		pages: [],
		pagesByID: {},
		conditions: {},
		storyTag: null,

		isRepeatable: true, // can be repeated by the same character
		isUnique: false, // can be only seen once by the player across different characters
		isPriority: false,
		isUrgent: false,
		isForced: false,
	
		constructor: function (dialogueID) {
			this.dialogueID = dialogueID;
			this.pages = [];
			this.pagesByID = {};
		},
		
	});

	return DialogueVO;
});
