define(['ash'], function (Ash) {

	var FollowerVO = Ash.Class.extend({

		id: "",
		name: "",
		abilityType: null,
		abilityLevel: 0,
		icon: "",
		
		inParty: false,

		constructor: function (id, name, abilityType, abilityLevel, icon) {
			this.id = id;
			this.name = name;
			this.abilityType = abilityType;
			this.abilityLevel = abilityLevel;
			this.icon = icon;
		},
	});

	return FollowerVO;
});
