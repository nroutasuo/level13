define(['ash'], function (Ash) {

	let TutorialConstants = {
		
		TUTORIAL_REPEATS_TYPE_NEVER: "NEVER",
		TUTORIAL_REPEATS_TYPE_ALWAYS: "ALWAYS",
		TUTORIAL_REPEATS_TYPE_COOLDOWN: "COOLDOWN",
		
		TUTORIAL_COOLDOWN_DURATION: 1000 * 60 * 10,
		
		tutorials: {
			TUTORIAL_BUILT_TRAP: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Built a trap. It will catch food.",
				conditions: { improvements: { collector_food: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_BUCKET: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Built a bucket. It will collect water.",
				conditions: { improvements: { collector_water: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_HUT: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Built a hut. People will come if they hear about the camp.",
				conditions: { improvements: { house: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_BEACON: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Beacon is ready. Its pale light paints the surroundings in sharp and fixed lines.",
				conditions: { improvements: { beacon: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_TOWER_BLOCK: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Repaired an old tower block. It can house several households.",
				conditions: { improvements: { house2: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_GENERATOR: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Set up a generator. It will make life in the camp more comfortable.",
				conditions: { improvements: { generator: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_STORAGE: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Built a storage.",
				conditions: { improvements: { storage: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_AQUEDUCT: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Built an aqueduct.",
				conditions: { improvements: { aqueduct: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_STABLE: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Built a caravan stable. We can now send out traders of our own.",
				conditions: { improvements: { stable: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_BARRACKS: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Built a barracks. We can now recruit soldiers to defend the camp.",
				conditions: { improvements: { barracks: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_SMITHY: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Built a smithy.",
				conditions: { improvements: { smithy: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_APOTHECARY: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Built an apothecary.",
				conditions: { improvements: { apothecary: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_CEMENT_MILL: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Built a cement mill for making concrete.",
				conditions: { improvements: { cementmill: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_ROBOT_FACTORY: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Built a robot factory.",
				conditions: { improvements: { robotFactory: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_ROBOT_RADIO: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Built a radio tower.",
				conditions: { improvements: { radiotower: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_CAMPFIRE: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Built a campfire. Here, ideas are shared and discussed.",
				conditions: { improvements: { campfire: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_DARKFARM: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Built a snail farm. It will produce food.",
				conditions: { improvements: { darkfarm: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_HOSPITAL: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Built a clinic.",
				conditions: { improvements: { hospital: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_LIBRARY: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Built a library.",
				conditions: { improvements: { library: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_MARKET: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Built a market.",
				conditions: { improvements: { market: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_INN: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Built an inn. Maybe it will attract visitors.",
				conditions: { improvements: { inn: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_SQUARE: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Built a square. The camp feels more like a town within the City already.",
				conditions: { improvements: { square: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_SHRINE: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Built a shrine to the strange powers of the Earth.",
				conditions: { improvements: { shrine: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_GARDEN: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Built a moss garden. It is a soothing place amid the jagged metal edges of the City.",
				conditions: { improvements: { garden: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_TEMPLE: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Built a temple. Here, people can explore this new religion together.",
				conditions: { improvements: { temple: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_RESEARCH_CENTER: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Built a research center, rivaling those old ones built by the Surfacers.",
				conditions: { improvements: { researchcenter: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_TRADEPOST_1: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Built a trading post for trade between camps. Need another one connect to.",
				conditions: { improvements: { tradepost: [ 1, 2 ] }, tribe: { improvements: { tradepost: [ 1, 2 ] } } }
			},
			TUTORIAL_BUILT_TRADEPOST_2: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "Built a trading post. The two camps now share resources and storage.",
				conditions: { improvements: { tradepost: [ 1, 2 ] }, tribe: { improvements: { tradepost: [ 2, 3 ] } } }
			},
			TUTORIAL_USED_HOSPITAL: {
				triggers: [ "action_any" ],
				repeats: "NEVER",
				delay: 1000,
				logMessage: "Healed all injuries.",
				conditions: { perkEffects: { "Injury": [ -1, 0 ] } }
			},
			TUTORIAL_CAN_MAKE_LIGHT: {
				triggers: [ "change_inventory" ],
				repeats: "COOLDOWN",
				delay: 1500,
				logMessage: "Collected enough metal to craft a Lantern",
				conditions: { vision: [-1, 50], actionsAvailable: ["craft_light1"], featureUnlocked: { bag: true } }
			},
			TUTORIAL_ENCOUNTER_BLOCKER_TYPE_GAP_NO_TECH: {
				group: "TUTORIAL_ENCOUNTER_BLOCKER_TYPE_GAP",
				triggers: [ "change_position" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "There is a huge gap here. Need to figure out how to bridge it.",
				conditions: { sector: { blockers: { 1: true } }, upgrades: { "unlock_building_bridge": false } },
			},
			TUTORIAL_ENCOUNTER_BLOCKER_TYPE_GAP_HAS_TECH: {
				group: "TUTORIAL_ENCOUNTER_BLOCKER_TYPE_GAP",
				triggers: [ "change_position" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "There is a huge gap here, but workers from the camp can bridge it.",
				conditions: { sector: { blockers: { 1: true } }, upgrades: { "unlock_building_bridge": true } },
			},
			TUTORIAL_ENCOUNTER_BLOCKER_TYPE_GANG: {
				triggers: [ "change_position" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "There are some pests blocking the way.",
				conditions: { sector: { blockers: { 3: true } } },
			},
			TUTORIAL_ENCOUNTER_BLOCKER_TYPE_DEBRIS: {
				triggers: [ "change_position" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "There is too much debris blocking the path. Workers from the camp can clear it.",
				conditions: { sector: { blockers: { 4: true } } }
			},
			TUTORIAL_ENCOUNTER_BLOCKER_TYPE_WASTE_RADIOACTIVE_NO_TECH: {
				group: "TUTORIAL_ENCOUNTER_BLOCKER_TYPE_WASTE_RADIOACTIVE",
				triggers: [ "change_position" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "There is too much radiactive waste to continue. Need to learn more before you can clear it.",
				conditions: { sector: { blockers: { 5: true } }, upgrades: { "unlock_action_clear_waste_r": false } },
			},
			TUTORIAL_ENCOUNTER_BLOCKER_TYPE_WASTE_RADIOACTIVE_HAS_TECH: {
				group: "TUTORIAL_ENCOUNTER_BLOCKER_TYPE_WASTE_RADIOACTIVE",
				triggers: [ "change_position" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "There is too much radiactive waste to continue, but it can be cleared.",
				conditions: { sector: { blockers: { 5: true } }, upgrades: { "unlock_action_clear_waste_r": true } },
			},
			TUTORIAL_ENCOUNTER_BLOCKER_TYPE_WASTE_TOXIC_NO_TECH: {
				group: "TUTORIAL_ENCOUNTER_BLOCKER_TYPE_WASTE_TOXIC",
				triggers: [ "change_position" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "Encountered BLOCKER_TYPE_WASTE_TOXIC for the first time. Missing the tech to deal with it",
				conditions: { sector: { blockers: { 6: true } }, upgrades: { "unlock_action_clear_waste_t": false } },
			},
			TUTORIAL_ENCOUNTER_BLOCKER_TYPE_WASTE_TOXIC_HAS_TECH: {
				group: "TUTORIAL_ENCOUNTER_BLOCKER_TYPE_WASTE_TOXIC",
				triggers: [ "change_position" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "Encountered BLOCKER_TYPE_WASTE_TOXIC for the first time. Have the tech to deal with it",
				conditions: { sector: { blockers: { 6: true } }, upgrades: { "unlock_action_clear_waste_t": true } },
			},
			TUTORIAL_ENCOUNTER_LEVEL_14_RADIATION: {
				triggers: [ "change_position" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "This area is dangerous. Will require much better equipment to explore.",
				conditions: { sector: { hazards: { radiation: [ 1, -1 ] } }, player: { affectedByHazard: true, position: { level: 14 } } },
			},
			TUTORIAL_ENCOUNTER_SPRING: {
				triggers: [ "action_scout" ],
				repeats: "NEVER",
				logMessage: "There is a reliable source of water here.",
				conditions: { sector: { spring: true } },
			},
			TUTORIAL_ENCOUNTER_INGREDIENT_SECTOR: {
				triggers: [ "action_scout" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "Seems like the kind of place where you might find crafting ingredients.",
				conditions: { sector: { scavengeableItems: { count: [ 1, -1 ] } } },
			},
			TUTORIAL_ENCOUNTER_SECTOR_ENEMIES: {
				triggers: [ "action_scout" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "There are some hostile creatures here. Scavenging is more risky.",
				conditions: { sector: { enemies: true } },
			},
			TUTORIAL_FEATURE_UNLOCKED_MOVE: {
				triggers: [ "feature_unlocked", "change_inventory" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "Might be worthwhile to explore the neighbourhood a bit.",
				conditions: { featureUnlocked: { move: true }, playerInventory: { resource_food: [2, -1], resource_water: [2, -1 ], inCamp: false } }
			},
			TUTORIAL_FEATURE_UNLOCKED_UPGRADES: {
				triggers: [ "feature_unlocked", "action_enter_camp" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "Evidence and rumours can be distilled into knowledge at the Campfire.",
				conditions: { featureUnlocked: { upgrades: true }, inCamp: true }
			},
			TUTORIAL_FEATURE_UNLOCKED_MILESTONES: {
				triggers: [ "feature_unlocked", "action_enter_camp" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "The camp is small now, but it will grow. Together we can do more.",
				conditions: { featureUnlocked: { milestones: true }, inCamp: true }
			},
			TUTORIAL_FEATURE_UNLOCKED_BAG: {
				triggers: [ "feature_unlocked" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "A bag allows carrying more stuff.",
				conditions: { featureUnlocked: { bag: true } }
			},
			TUTORIAL_FEATURE_UNLOCKED_FOLLOWERS: {
				triggers: [ "feature_unlocked" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "It is good to have some company for the excursions to the City.",
				conditions: { featureUnlocked: { followers: true } }
			},
			TUTORIAL_FOUND_METAL: {
				triggers: [ "action_collect_rewards" ],
				delay: 0,
				repeats: "NEVER",
				logMessage: "Found some canned food",
				conditions: { playerInventory: { resource_food: [1, -1] } }
			},
			TUTORIAL_FOUND_FOOD: {
				triggers: [ "action_collect_rewards" ],
				repeats: "NEVER",
				delay: 0,
				logMessage: "Found some scrap metal. It could be useful for crafting.",
				conditions: { playerInventory: { resource_metal: [1, -1] } }
			},
			TUTORIAL_FOUND_ROPE: {
				triggers: [ "action_collect_rewards" ],
				repeats: "NEVER",
				logMessage: "Found some rope. Could be useful for building and crafting.",
				conditions: { playerInventory: { resource_rope: [1, -1] } }
			},
			TUTORIAL_FOUND_HERBS: {
				triggers: [ "action_collect_rewards" ],
				repeats: "NEVER",
				logMessage: "Found some dried herbs",
				conditions: { playerInventory: { resource_herbs: [1, -1] } }
			},
			TUTORIAL_FOUND_FUEL: {
				triggers: [ "action_collect_rewards" ],
				repeats: "NEVER",
				logMessage: "Found some fuel.",
				conditions: { playerInventory: { resource_fuel: [1, -1] } }
			},
			TUTORIAL_FOUND_RUBBER: {
				triggers: [ "action_collect_rewards" ],
				repeats: "NEVER",
				logMessage: "Found some rubber.",
				conditions: { playerInventory: { resource_rubber: [1, -1] } }
			},
			TUTORIAL_FOUND_MEDICINE: {
				triggers: [ "action_collect_rewards" ],
				repeats: "NEVER",
				logMessage: "Found some medicine. Rare to find it just lying around like this.",
				conditions: { playerInventory: { resource_medicine: [1, -1] } }
			},
			TUTORIAL_FOUND_TOOLS: {
				triggers: [ "action_collect_rewards" ],
				repeats: "NEVER",
				logMessage: "Found some useful tools.",
				conditions: { playerInventory: { resource_tools: [1, -1] } }
			},
			TUTORIAL_FOUND_CONCRETE: {
				triggers: [ "action_collect_rewards" ],
				repeats: "NEVER",
				logMessage: "Found some concrete.",
				conditions: { playerInventory: { resource_concrete: [1, -1] } }
			},
			TUTORIAL_FOUND_ROBOT: {
				triggers: [ "action_collect_rewards" ],
				repeats: "NEVER",
				logMessage: "Found a working robot. This could be useful back in camp.",
				conditions: { playerInventory: { resource_robots: [1, -1] } }
			},
			TUTORIAL_FOUND_SILVER: {
				triggers: [ "action_collect_rewards" ],
				repeats: "NEVER",
				logMessage: "Found some silver coins. Some traders accept these.",
				conditions: { playerInventory: { silver: [1, -1] } }
			},
		},

	};
	
	return TutorialConstants;
});
