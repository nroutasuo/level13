define(['ash'], function (Ash) {
	
	var PlayerActionVO = Ash.Class.extend({
	
		action: "",
		param: "",
		deductedCosts: {},
		isBusy: false,
	
		constructor: function (action, param, deductCosts, isBusy) {
			this.action = action;
			this.param = param;
			this.deductedCosts = {};
			this.isBusy = isBusy;
		},
		
	});

	return PlayerActionVO;
});
