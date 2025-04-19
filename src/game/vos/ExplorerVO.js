define(['ash'], function (Ash) {

	let ExplorerVO = Ash.Class.extend({

		id: "",
		name: "",
		abilityType: null,
		abilityLevel: 0,
		icon: "",
		gender: null,
		animalType: null,
		source: null,
		dialogueSource: null,
		
		meetCampOrdinal: -1, // camp ordinal (player progression) when met
		inParty: false,
		pendingAbilityLevel: 0,
		pendingDialogue: null, // storyTag
		numFights: 0,
		numSteps: 0,
		numExcursions: 0,
		numDialogues: 0,
		seenDialogues: [],
		trust: 0, // 0-10, derived from other stats
		injuredTimer: -1,

		constructor: function (id, name, abilityType, abilityLevel, icon, gender, source, dialogueSource) {
			this.id = id;
			this.name = name;
			this.abilityType = abilityType;
			this.abilityLevel = abilityLevel;
			this.icon = icon;
			this.gender = gender;
			this.source = source;
			this.dialogueSource = dialogueSource;
			
			this.injuredTimer = -1;
			this.trust = 0;
		},
	});

	return ExplorerVO;
});
