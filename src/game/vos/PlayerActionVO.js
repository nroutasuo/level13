define(['ash'], function (Ash) {
	
	var PlayerActionVO = Ash.Class.extend({
	
		action: "",
		param: "",
		isBusy: false,
	
		constructor: function (action, param, isBusy) {
			this.action = action;
			this.param = param;
			this.isBusy = isBusy;
		},
		
	});

	return PlayerActionVO;
});
