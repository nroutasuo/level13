define(['ash'], function (Ash) {

	var FollowerVO = Ash.Class.extend({

		id: "",
		name: "",
		description: "",
		abilityType: null,
		abilityLevel: 0,
		icon: "",
		
		inParty: false,

		constructor: function (id, name, description, abilityType, abilityLevel, icon) {
			this.id = id;
			this.name = name;
			this.description = description;
			this.abilityType = abilityType;
			this.abilityLevel = abilityLevel;
			this.icon = icon;
		},
	});

	return FollowerVO;
});
