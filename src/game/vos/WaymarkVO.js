define(['ash'], function (Ash) {
	
	var WaymarkVO = Ash.Class.extend({
	
		fromPosition: null,
		toPosition: null,
		type: null,
	
		constructor: function (from, to, type) {
			this.fromPosition = from;
			this.toPosition = to;
			this.type = type;
		},
		
	});

	return WaymarkVO;
});
