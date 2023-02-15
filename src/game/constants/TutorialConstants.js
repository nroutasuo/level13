define(['ash'], function (Ash) {

	let TutorialConstants = {
		
		TUTORIAL_REPEATS_TYPE_NEVER: "NEVER",
		TUTORIAL_REPEATS_TYPE_ALWAYS: "ALWAYS",
		TUTORIAL_REPEATS_TYPE_COOLDOWN: "COOLDOWN",
		
		TUTORIAL_COOLDOWN_DURATION: 1000 * 60 * 10,
		
		tutorials: {
			TUTORIAL_CAN_MAKE_LIGHT: {
				trigger: "change_inventory",
				repeats: "COOLDOWN",
				logMessage: "Collected enough metal to craft a Lantern",
				conditions: { vision: [-1, 50], actionsAvailable: ["craft_light1"] }
			},
			TUTORIAL_ENCOUNTER_BLOCKER_TYPE_GAP_NO_TECH: {
				group: "TUTORIAL_ENCOUNTER_BLOCKER_TYPE_GAP",
				trigger: "change_position",
				repeats: "NEVER",
				logMessage: "There is a huge gap here. Need to figure out how to bridge it.",
				conditions: { sector: { blockers: { 1: true } }, upgrades: { "unlock_building_bridge": false } },
			},
			TUTORIAL_ENCOUNTER_BLOCKER_TYPE_GAP_HAS_TECH: {
				group: "TUTORIAL_ENCOUNTER_BLOCKER_TYPE_GAP",
				trigger: "change_position",
				repeats: "NEVER",
				logMessage: "There is a huge gap here, but workers from the camp can bridge it.",
				conditions: { sector: { blockers: { 1: true } }, upgrades: { "unlock_building_bridge": true } },
			},
			TUTORIAL_ENCOUNTER_BLOCKER_TYPE_GANG: {
				trigger: "change_position",
				repeats: "NEVER",
				logMessage: "There are some hostile creatures blocking the way.",
				conditions: { sector: { blockers: { 3: true } } },
			},
			TUTORIAL_ENCOUNTER_BLOCKER_TYPE_DEBRIS: {
				trigger: "change_position",
				repeats: "NEVER",
				logMessage: "There is too much debris blocking the path. Workers from the camp can clear it.",
				conditions: { sector: { blockers: { 4: true } } }
			},
			TUTORIAL_ENCOUNTER_BLOCKER_TYPE_WASTE_RADIOACTIVE_NO_TECH: {
				group: "TUTORIAL_ENCOUNTER_BLOCKER_TYPE_WASTE_RADIOACTIVE",
				trigger: "change_position",
				repeats: "NEVER",
				logMessage: "There is too much radiactive waste to continue. Need to learn more before I can clear it.",
				conditions: { sector: { blockers: { 5: true } }, upgrades: { "unlock_action_clear_waste_r": false } },
			},
			TUTORIAL_ENCOUNTER_BLOCKER_TYPE_WASTE_RADIOACTIVE_HAS_TECH: {
				group: "TUTORIAL_ENCOUNTER_BLOCKER_TYPE_WASTE_RADIOACTIVE",
				trigger: "change_position",
				repeats: "NEVER",
				logMessage: "There is too much radiactive waste to continue, but it can be cleared.",
				conditions: { sector: { blockers: { 5: true } }, upgrades: { "unlock_action_clear_waste_r": true } },
			},
			TUTORIAL_ENCOUNTER_BLOCKER_TYPE_WASTE_TOXIC_NO_TECH: {
				group: "TUTORIAL_ENCOUNTER_BLOCKER_TYPE_WASTE_TOXIC",
				trigger: "change_position",
				repeats: "NEVER",
				logMessage: "Encountered BLOCKER_TYPE_WASTE_TOXIC for the first time. Missing the tech to deal with it",
				conditions: { sector: { blockers: { 6: true } }, upgrades: { "unlock_action_clear_waste_t": false } },
			},
			TUTORIAL_ENCOUNTER_BLOCKER_TYPE_WASTE_TOXIC_HAS_TECH: {
				group: "TUTORIAL_ENCOUNTER_BLOCKER_TYPE_WASTE_TOXIC",
				trigger: "change_position",
				repeats: "NEVER",
				logMessage: "Encountered BLOCKER_TYPE_WASTE_TOXIC for the first time. Have the tech to deal with it",
				conditions: { sector: { blockers: { 6: true } }, upgrades: { "unlock_action_clear_waste_t": true } },
			},
			TUTORIAL_ENCOUNTER_LEVEL_14_RADIATION: {
				trigger: "change_position",
				repeats: "NEVER",
				logMessage: "This area is dangerous. Will require much better equipment to explore.",
				conditions: { sector: { hazards: { radiation: [ 1, -1 ] } }, player: { affectedByHazard: true, position: { level: 14 } } },
			},
			TUTORIAL_ENCOUNTER_SPRING: {
				trigger: "action_scout",
				repeats: "NEVER",
				logMessage: "There is a reliable source of water here.",
				conditions: { sector: { spring: true } },
			},
			TUTORIAL_ENCOUNTER_INGREDIENT_SECTOR: {
				trigger: "action_scout",
				repeats: "NEVER",
				logMessage: "Seems like the kind of place where you might find crafting ingredients.",
				conditions: { sector: { scavengeableItems: { count: [ 1, -1 ] } } },
			},
			TUTORIAL_FOUND_FOOD: {
				trigger: "action_collect_rewards",
				repeats: "NEVER",
				logMessage: "Found some canned food",
				conditions: { playerInventory: { resource_food: [1, -1] } }
			},
			TUTORIAL_FOUND_WATER: {
				trigger: "action_collect_rewards",
				repeats: "NEVER",
				logMessage: "Found some water",
				conditions: { playerInventory: { resource_water: [1, -1] } }
			},
			TUTORIAL_FOUND_ROPE: {
				trigger: "action_collect_rewards",
				repeats: "NEVER",
				logMessage: "Found some rope. Could be useful for building and crafting.",
				conditions: { playerInventory: { resource_rope: [1, -1] } }
			},
			TUTORIAL_FOUND_HERBS: {
				trigger: "action_collect_rewards",
				repeats: "NEVER",
				logMessage: "Found some dried herbs",
				conditions: { playerInventory: { resource_herbs: [1, -1] } }
			},
			TUTORIAL_FOUND_FUEL: {
				trigger: "action_collect_rewards",
				repeats: "NEVER",
				logMessage: "Found some fuel.",
				conditions: { playerInventory: { resource_fuel: [1, -1] } }
			},
			TUTORIAL_FOUND_RUBBER: {
				trigger: "action_collect_rewards",
				repeats: "NEVER",
				logMessage: "Found some rubber.",
				conditions: { playerInventory: { resource_rubber: [1, -1] } }
			},
			TUTORIAL_FOUND_MEDICINE: {
				trigger: "action_collect_rewards",
				repeats: "NEVER",
				logMessage: "Found some medicine. Rare to find it just lying around like this.",
				conditions: { playerInventory: { resource_medicine: [1, -1] } }
			},
			TUTORIAL_FOUND_TOOLS: {
				trigger: "action_collect_rewards",
				repeats: "NEVER",
				logMessage: "Found some useful tools.",
				conditions: { playerInventory: { resource_tools: [1, -1] } }
			},
			TUTORIAL_FOUND_CONCRETE: {
				trigger: "action_collect_rewards",
				repeats: "NEVER",
				logMessage: "Found some concrete.",
				conditions: { playerInventory: { resource_concrete: [1, -1] } }
			},
			TUTORIAL_FOUND_ROBOT: {
				trigger: "action_collect_rewards",
				repeats: "NEVER",
				logMessage: "Found a working robot. This could be useful back in camp.",
				conditions: { playerInventory: { resource_robots: [1, -1] } }
			},
			TUTORIAL_FOUND_SILVER: {
				trigger: "action_collect_rewards",
				repeats: "NEVER",
				logMessage: "Found some silver coins. Some traders accept these.",
				conditions: { playerInventory: { silver: [1, -1] } }
			},
		},

	};
	
	return TutorialConstants;
});
