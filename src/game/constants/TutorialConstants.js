define(['ash'], function (Ash) {

	let TutorialConstants = {
		
		TUTORIAL_REPEATS_TYPE_NEVER: "NEVER",
		TUTORIAL_REPEATS_TYPE_ALWAYS: "ALWAYS",
		TUTORIAL_REPEATS_TYPE_COOLDOWN: "COOLDOWN",
		
		TUTORIAL_COOLDOWN_DURATION: 1000 * 60 * 10,
		
		tutorials: {
			//TUTORIAL_FIRST_SCAVENGE: { trigger: "action_scavenge", conditions: {}, logMessage: "Scavenged!", repeats: "NEVER" },
			//TUTORIAL_CAN_MAKE_LIGHT: { trigger: "change_inventory", conditions: { vision: [ -1, 50 ] }, logMessage: "Can make light!", repeats: "COOLDOWN" },
		},

	};
	
	return TutorialConstants;
});
