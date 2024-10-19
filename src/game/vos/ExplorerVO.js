define(['ash'], function (Ash) {

	let ExplorerVO = Ash.Class.extend({

		id: "",
		name: "",
		abilityType: null,
		abilityLevel: 0,
		icon: "",
		gender: null,
		source: null,
		dialogueSource: null,
		
		inParty: false,
		pendingAbilityLevel: 0,
		numFights: 0,
		numSteps: 0,
		numExcursions: 0,
		seenDialogues: [],
		trust: 0, // 0-3

		constructor: function (id, name, abilityType, abilityLevel, icon, gender, source, dialogueSource) {
			this.id = id;
			this.name = name;
			this.abilityType = abilityType;
			this.abilityLevel = abilityLevel;
			this.icon = icon;
			this.gender = gender;
			this.source = source;
			this.dialogueSource = dialogueSource;
		},
	});

	return ExplorerVO;
});
