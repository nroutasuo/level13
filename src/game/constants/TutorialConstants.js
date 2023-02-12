define(['ash'], function (Ash) {

	let TutorialConstants = {
		
		TUTORIAL_REPEATS_TYPE_NEVER: "NEVER",
		TUTORIAL_REPEATS_TYPE_ALWAYS: "ALWAYS",
		TUTORIAL_REPEATS_TYPE_COOLDOWN: "COOLDOWN",
		
		TUTORIAL_COOLDOWN_DURATION: 1000 * 60 * 10,
		
		tutorials: {
			TUTORIAL_CAN_MAKE_LIGHT: { trigger: "change_inventory", logMessage: "Collected enough metal to craft a Lantern", repeats: "COOLDOWN", conditions: { vision: [ -1, 50 ], actionsAvailable: [ "craft_light1" ] } },
			
			TUTORIAL_FOUND_FOOD: { trigger: "action_collect_rewards", logMessage: "Found some canned food", repeats: "NEVER", conditions: { playerInventory: { resource_food: [ 1, -1 ] } } },
			TUTORIAL_FOUND_WATER: { trigger: "action_collect_rewards", logMessage: "Found some water", repeats: "NEVER", conditions: { playerInventory: { resource_water: [ 1, -1 ] } } },
			TUTORIAL_FOUND_ROPE: { trigger: "action_collect_rewards", logMessage: "Found some rope. Could be useful for building and crafting.", repeats: "NEVER", conditions: { playerInventory: { resource_rope: [ 1, -1 ] } } },
			TUTORIAL_FOUND_HERBS: { trigger: "action_collect_rewards", logMessage: "Found some dried herbs", repeats: "NEVER", conditions: { playerInventory: { resource_herbs: [ 1, -1 ] } } },
			TUTORIAL_FOUND_FUEL: { trigger: "action_collect_rewards", logMessage: "Found some fuel.", repeats: "NEVER", conditions: { playerInventory: { resource_fuel: [ 1, -1 ] } } },
			TUTORIAL_FOUND_RUBBER: { trigger: "action_collect_rewards", logMessage: "Found some rubber.", repeats: "NEVER", conditions: { playerInventory: { resource_rubber: [ 1, -1 ] } } },
			TUTORIAL_FOUND_MEDICINE: { trigger: "action_collect_rewards", logMessage: "Found some medicine. Rare to find it just lying around like this.", repeats: "NEVER", conditions: { playerInventory: { resource_medicine: [ 1, -1 ] } } },
			TUTORIAL_FOUND_TOOLS: { trigger: "action_collect_rewards", logMessage: "Found some useful tools.", repeats: "NEVER", conditions: { playerInventory: { resource_tools: [ 1, -1 ] } } },
			TUTORIAL_FOUND_CONCRETE: { trigger: "action_collect_rewards", logMessage: "Found some concrete.", repeats: "NEVER", conditions: { playerInventory: { resource_concrete: [ 1, -1 ] } } },
			TUTORIAL_FOUND_ROBOT: { trigger: "action_collect_rewards", logMessage: "Found a working robot. This could be useful back in camp.", repeats: "NEVER", conditions: { playerInventory: { resource_robots: [ 1, -1 ] } } },
			TUTORIAL_FOUND_SILVER: { trigger: "action_collect_rewards", logMessage: "Found some silver coins. Some traders accept these.", repeats: "NEVER", conditions: { playerInventory: { silver: [ 1, -1 ] } } },
		},

	};
	
	return TutorialConstants;
});
