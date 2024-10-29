define(['ash'], function (Ash) {
	
	let DialoguePageVO = Ash.Class.extend({

        pageID: null,
        textKey: null,
        options: [],
	
		constructor: function (pageID) {
			this.pageID = pageID;
            this.options = [];
            this.optionsByID = {};
		},
		
	});

	return DialoguePageVO;
});
