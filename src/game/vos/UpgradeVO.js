define(['ash'], function (Ash) {
	
	let UpgradeVO = Ash.Class.extend({
	
		id: "",
		campOrdinal: 0,
	
		constructor: function (id, name, description) {
			this.id = id;
		},
	});

	return UpgradeVO;
});
