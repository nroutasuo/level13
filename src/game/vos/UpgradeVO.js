define(['ash'], function (Ash) {
	
	var UpgradeVO = Ash.Class.extend({
	
	id: "",
	name: "",
	description: "",
	
		constructor: function (id, name, description) {
			this.id = id;
			this.name = name;
			this.description = description;
		},
	});

	return UpgradeVO;
});
