define(['ash'], function (Ash) {
	
	var PlayerActionVO = Ash.Class.extend({
	
		action: "",
		level: 13,
		sector: null,
		param: "",
		deductedCosts: {},
		startTime: null,
		isBusy: false,
	
		constructor: function (action, sector, level, param, deductCosts, startTime, isBusy) {
			this.action = action;
			this.sector = sector;
			this.level = level;
			this.param = param;
			this.deductedCosts = deductCosts;
			this.startTime = startTime;
			this.isBusy = isBusy;
		},
		
	});

	return PlayerActionVO;
});
