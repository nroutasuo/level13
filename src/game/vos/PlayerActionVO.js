define(['ash'], function (Ash) {
	
	let PlayerActionVO = Ash.Class.extend({
	
		action: "",
		position: null, // PositionVO
		level: 13,
		param: "",
		deductedCosts: {},
		startTime: null,
		isBusy: false,
	
		constructor: function (action, position, param, deductCosts, startTime, isBusy) {
			this.action = action;
			this.position = position;
			this.level = position.level;
			this.param = param;
			this.deductedCosts = deductCosts;
			this.startTime = startTime;
			this.isBusy = isBusy;
		},
		
	});

	return PlayerActionVO;
});
