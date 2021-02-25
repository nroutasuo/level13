define(['ash'], function (Ash) {

	var PlayerActionResultComponent = Ash.Class.extend({
		
		pendingResultVO: null,
		
		constructor: function (resultVO) {
			this.pendingResultVO = resultVO;
		},
	});

	return PlayerActionResultComponent;
});
