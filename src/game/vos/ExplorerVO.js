define(['ash'], function (Ash) {

	let ExplorerVO = Ash.Class.extend({

		id: "",
		name: "",
		abilityType: null,
		abilityLevel: 0,
		icon: "",
		gender: null,
		
		inParty: false,
		numFights: 0,
		numSteps: 0,

		constructor: function (id, name, abilityType, abilityLevel, icon, gender, source) {
			this.id = id;
			this.name = name;
			this.abilityType = abilityType;
			this.abilityLevel = abilityLevel;
			this.icon = icon;
			this.gender = gender;
			this.source = source;
		},
	});

	return ExplorerVO;
});
