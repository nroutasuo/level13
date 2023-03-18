define(['ash'], function (Ash) {
	
	var PlayerActionVO = Ash.Class.extend({
	
		action: "",
		level: 13,
		param: "",
		deductedCosts: {},
		startTime: null,
		isBusy: false,
	
		constructor: function (action, level, param, deductCosts, startTime, isBusy) {
			this.action = action;
			this.level = level;
			this.param = param;
			this.deductedCosts = {};
			this.startTime = startTime;
			this.isBusy = isBusy;
		},
		
	});

	return PlayerActionVO;
});
