define(['ash'], function (Ash) {
	
	let DialogueOptionVO = Ash.Class.extend({
	
        optionID: null,
        
        responsePageID: null,
		buttonTextKey: "",
		costs: {},

		constructor: function (optionID) {
            this.optionID = optionID;
		},
		
	});

	return DialogueOptionVO;
});
