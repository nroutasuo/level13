define(['ash'], function (Ash) {
	
	let DialoguePageVO = Ash.Class.extend({

        pageID: null,
		titleTextKey: null,
        textKey: null,
		randomTextKeys: [],
		logMessageKey: null,
		action: null,
		resultTemplate: null,
		selection: {}, // type, source 
	
		constructor: function (pageID) {
			this.pageID = pageID;
            this.options = [];
            this.optionsByID = {};
		},
		
	});

	return DialoguePageVO;
});
