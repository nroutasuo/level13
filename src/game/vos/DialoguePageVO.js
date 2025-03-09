define(['ash'], function (Ash) {
	
	let DialoguePageVO = Ash.Class.extend({

        pageID: null,
		titleTextKey: null,
        textKey: null,
		resultTemplate: null,
	
		constructor: function (pageID) {
			this.pageID = pageID;
            this.options = [];
            this.optionsByID = {};
		},
		
	});

	return DialoguePageVO;
});
