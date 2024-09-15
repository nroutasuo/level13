define(['ash'], function (Ash) {
	
	let PassageVO = Ash.Class.extend({
	
		constructor: function (type) {
			this.type = type;
			this.name = type;
		},
	});

	return PassageVO;
});
