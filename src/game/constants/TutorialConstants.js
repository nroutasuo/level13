define(['ash'], function (Ash) {

	let TutorialConstants = {
		
		TUTORIAL_REPEATS_TYPE_NEVER: "NEVER",
		TUTORIAL_REPEATS_TYPE_ALWAYS: "ALWAYS",
		TUTORIAL_REPEATS_TYPE_COOLDOWN: "COOLDOWN",
		
		TUTORIAL_COOLDOWN_DURATION: 1000 * 60 * 10,
		
		tutorials: {
			/*
			TUTORIAL_BUILT_TRAP: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_trap_message",
				conditions: { improvements: { collector_food: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_BUCKET: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_bucket_message",
				conditions: { improvements: { collector_water: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_HUT: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_hut_message",
				conditions: { improvements: { house: [ 1, 2 ] } }
			},
			*/
			TUTORIAL_BUILT_BEACON: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_beacon_message",
				conditions: { improvements: { beacon: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_TOWER_BLOCK: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_tower_block_message",
				conditions: { improvements: { house2: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_GENERATOR: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_generator_message",
				conditions: { improvements: { generator: [ 1, 2 ] } }
			},
			/*
			TUTORIAL_BUILT_STORAGE: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_storage_message",
				conditions: { improvements: { storage: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_AQUEDUCT: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_aqueduct_message",
				conditions: { improvements: { aqueduct: [ 1, 2 ] } }
			},
			*/
			TUTORIAL_BUILT_STABLE: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_stable_message",
				conditions: { improvements: { stable: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_BARRACKS: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_barracks_message",
				conditions: { improvements: { barracks: [ 1, 2 ] } }
			},
			/*
			TUTORIAL_BUILT_SMITHY: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_smithy_message",
				conditions: { improvements: { smithy: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_APOTHECARY: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_apothecary_message",
				conditions: { improvements: { apothecary: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_CEMENT_MILL: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_cement_mill_message",
				conditions: { improvements: { cementmill: [ 1, 2 ] } }
			},
			*/
			TUTORIAL_BUILT_ROBOT_FACTORY: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_robot_factory_message",
				conditions: { improvements: { robotfactory: [ 1, 2 ] } }
			},
			/*
			TUTORIAL_BUILT_ROBOT_RADIO: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_robot_radio_message",
				conditions: { improvements: { radiotower: [ 1, 2 ] } }
			},
			*/
			TUTORIAL_BUILT_CAMPFIRE: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_campfire_message",
				conditions: { improvements: { campfire: [ 1, 2 ] } }
			},
			/*
			TUTORIAL_BUILT_DARKFARM: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_darkfarm_message",
				conditions: { improvements: { darkfarm: [ 1, 2 ] } }
			},
			*/
			TUTORIAL_BUILT_HOSPITAL: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_hospital_message",
				conditions: { improvements: { hospital: [ 1, 2 ] } }
			},
			/*
			TUTORIAL_BUILT_LIBRARY: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_library_message",
				conditions: { improvements: { library: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_MARKET: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_market_message",
				conditions: { improvements: { market: [ 1, 2 ] } }
			},
			*/
			TUTORIAL_BUILT_INN: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_inn_message",
				conditions: { improvements: { inn: [ 1, 2 ] } }
			},
			/*
			TUTORIAL_BUILT_SQUARE: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_square_message",
				conditions: { improvements: { square: [ 1, 2 ] } }
			},
			*/
			TUTORIAL_BUILT_SHRINE: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_shrine_message",
				conditions: { improvements: { shrine: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_GARDEN: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_garden_message",
				conditions: { improvements: { garden: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_TEMPLE: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_temple_message",
				conditions: { improvements: { temple: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_RESEARCH_CENTER: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_research_center_message",
				conditions: { improvements: { researchcenter: [ 1, 2 ] } }
			},
			TUTORIAL_BUILT_TRADEPOST_1: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_tradepost_1_message",
				conditions: { tribe: { improvements: { tradepost: [ 1, 2 ] } } }
			},
			TUTORIAL_BUILT_TRADEPOST_2: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_built_tradepost_2_message",
				conditions: { tribe: { improvements: { tradepost: [ 2, 3 ] } } }
			},
			/*
			TUTORIAL_USED_HOSPITAL: {
				triggers: [ "action_any" ],
				repeats: "NEVER",
				delay: 1000,
				logMessage: "ui.log.tutorial_used_hospital_message",
				conditions: { perkEffects: { "injury": [ -1, 0 ] } }
			},
			*/
			TUTORIAL_PRODUCED_ROBOT: {
				triggers: [ "feature_unlocked", "action_any" ],
				repeats: "NEVER",
				delay: 1000,
				logMessage: "ui.log.tutorial_produced_robot_message",
				conditions: { featureUnlocked: { resource_robots: true }, inCamp: true, campInventory: { resource_robots: [ 1, -1 ] } }
			},
			TUTORIAL_CAN_MAKE_LIGHT: {
				triggers: [ "change_inventory" ],
				repeats: "COOLDOWN",
				delay: 1500,
				logMessage: "ui.log.tutorial_can_make_light_message",
				conditions: { inCamp: false, maxVision: [-1, 50], actionsAvailable: ["craft_light1"], featureUnlocked: { bag: true } }
			},
			TUTORIAL_CAN_BUILD_SHRINE: {
				triggers: [ "change_inventory", "change_position" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "ui.log.tutorial_can_build_shrine_message",
				conditions: { inCamp: true, deity: true }
			},
			TUTORIAL_CAN_BUILD_TEMPLE: {
				triggers: [ "change_inventory", "change_position" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "ui.log.tutorial_can_build_temple_message",
				conditions: { inCamp: true, actionsAvailable: ["build_in_temple"] }
			},
			TUTORIAL_ENCOUNTER_BLOCKER_TYPE_GAP_NO_TECH: {
				group: "TUTORIAL_ENCOUNTER_BLOCKER_TYPE_GAP",
				triggers: [ "change_position" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "ui.log.tutorial_encounter_blocker_type_gap_no_tech_message",
				conditions: { sector: { blockers: { 1: true } }, upgrades: { "unlock_building_bridge": false } },
			},
			TUTORIAL_ENCOUNTER_BLOCKER_TYPE_GAP_HAS_TECH: {
				group: "TUTORIAL_ENCOUNTER_BLOCKER_TYPE_GAP",
				triggers: [ "change_position" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "ui.log.tutorial_encounter_blocker_type_gap_has_tech_message",
				conditions: { sector: { blockers: { 1: true } }, upgrades: { "unlock_building_bridge": true } },
			},
			TUTORIAL_ENCOUNTER_BLOCKER_TYPE_GANG: {
				triggers: [ "change_position" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "ui.log.tutorial_encounter_blocker_type_gang_message",
				conditions: { sector: { blockers: { 3: true } } },
			},
			TUTORIAL_ENCOUNTER_BLOCKER_TYPE_DEBRIS: {
				triggers: [ "change_position" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "ui.log.tutorial_encounter_blocker_type_debris_message",
				conditions: { sector: { blockers: { 4: true } } }
			},
			TUTORIAL_ENCOUNTER_BLOCKER_TYPE_EXPLOSIVES: {
				triggers: [ "change_position" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "ui.log.tutorial_encounter_blocker_type_explosives_message",
				conditions: { sector: { blockers: { 7: true } } }
			},
			TUTORIAL_ENCOUNTER_BLOCKER_TYPE_TOLL_GATE: {
				triggers: [ "change_position" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "ui.log.tutorial_encounter_blocker_type_toll_gate_message",
				conditions: { sector: { blockers: { 8: true } } }
			},
			TUTORIAL_ENCOUNTER_BLOCKER_TYPE_WASTE_RADIOACTIVE_NO_TECH: {
				group: "TUTORIAL_ENCOUNTER_BLOCKER_TYPE_WASTE_RADIOACTIVE",
				triggers: [ "change_position" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "ui.log.tutorial_encounter_blocker_type_waste_radioactive_no_tech_message",
				conditions: { sector: { blockers: { 5: true } }, upgrades: { "unlock_action_clear_waste_r": false } },
			},
			TUTORIAL_ENCOUNTER_BLOCKER_TYPE_WASTE_RADIOACTIVE_HAS_TECH: {
				group: "TUTORIAL_ENCOUNTER_BLOCKER_TYPE_WASTE_RADIOACTIVE",
				triggers: [ "change_position" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "ui.log.tutorial_encounter_blocker_type_waste_radioactive_has_tech_message",
				conditions: { sector: { blockers: { 5: true } }, upgrades: { "unlock_action_clear_waste_r": true } },
			},
			TUTORIAL_ENCOUNTER_BLOCKER_TYPE_WASTE_TOXIC_NO_TECH: {
				group: "TUTORIAL_ENCOUNTER_BLOCKER_TYPE_WASTE_TOXIC",
				triggers: [ "change_position" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "ui.log.tutorial_encounter_blocker_type_waste_toxic_no_tech_message",
				conditions: { sector: { blockers: { 6: true } }, upgrades: { "unlock_action_clear_waste_t": false } },
			},
			TUTORIAL_ENCOUNTER_BLOCKER_TYPE_WASTE_TOXIC_HAS_TECH: {
				group: "TUTORIAL_ENCOUNTER_BLOCKER_TYPE_WASTE_TOXIC",
				triggers: [ "change_position" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "ui.log.tutorial_encounter_blocker_type_waste_toxic_has_tech_message",
				conditions: { sector: { blockers: { 6: true } }, upgrades: { "unlock_action_clear_waste_t": true } },
			},
			TUTORIAL_ENCOUNTER_LEVEL_14_RADIATION: {
				triggers: [ "change_position" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "ui.log.tutorial_encounter_level_14_radiation_message",
				conditions: { sector: { hazards: { radiation: [ 1, -1 ] } }, player: { affectedByHazard: true, position: { level: 14 } } },
			},
			TUTORIAL_ENCOUNTER_HAZARD_DEBRIS: {
				triggers: [ "change_position" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "ui.log.tutorial_encounter_hazard_debris_message",
				conditions: { sector: { hazards: { debris: [ 1, -1 ] } } },
			},
			TUTORIAL_ENCOUNTER_SPRING: {
				triggers: [ "action_scout" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_encounter_spring_message",
				conditions: { sector: { spring: true } },
			},
			TUTORIAL_ENCOUNTER_SUNLIGHT: {
				triggers: [ "change_position" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_encounter_sunlight_message",
				conditions: { sunlit: true },
			},
			TUTORIAL_ENCOUNTER_INGREDIENT_SECTOR: {
				triggers: [ "action_scout" ],
				repeats: "NEVER",
				delay: 500,
				logMessage: "ui.log.tutorial_encounter_ingredient_sector_message",
				conditions: { sector: { scavengeableItems: { count: [ 1, -1 ] } } },
			},
			TUTORIAL_ENCOUNTER_INGREDIENT_SECTOR_FOR_NEEDED_HAIRPIN: {
				triggers: [ "change_position" ],
				repeats: "COOLDOWN",
				delay: 500,
				logMessage: "ui.log.tutorial_encounter_ingredient_sector_for_needed_hairpin_message",
				conditions: { 
					sector: { scouted: true, scavengeableItems: { res_hairpin: true }, scavengedPercent: [ -1, 1 ] }, 
					playerInventoryComplete: { item_res_hairpin: [ -1, 1 ], item_exploration_1: [ -1, 1 ] }
				},
			},
			TUTORIAL_ENCOUNTER_SECTOR_ENEMIES: {
				triggers: [ "action_scout" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "ui.log.tutorial_encounter_sector_enemies_message",
				conditions: { sector: { enemies: true } },
			},
			TUTORIAL_ENCOUNTER_OUTPOST: {
				triggers: [ "action_enter_camp" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "ui.log.tutorial_encounter_outpost_message",
				conditions: { inCamp: true, "level": { "population": [ -1, 1 ] } }
			},
			TUTORIAL_FEATURE_UNLOCKED_MOVE: {
				triggers: [ "feature_unlocked", "change_inventory" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "ui.log.tutorial_feature_unlocked_move_message",
				conditions: { featureUnlocked: { move: true }, playerInventory: { resource_food: [2, -1], resource_water: [2, -1 ], inCamp: false } }
			},
			TUTORIAL_FEATURE_UNLOCKED_UPGRADES: {
				triggers: [ "feature_unlocked", "action_enter_camp", "population_changed" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "ui.log.tutorial_feature_unlocked_upgrades_message",
				conditions: { featureUnlocked: { upgrades: true }, inCamp: true, "population": [ 1, -1 ], }
			},
			TUTORIAL_FEATURE_UNLOCKED_MILESTONES: {
				triggers: [ "feature_unlocked", "action_enter_camp" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "ui.log.tutorial_feature_unlocked_milestones_message",
				conditions: { featureUnlocked: { milestones: true }, inCamp: true }
			},
			TUTORIAL_FEATURE_UNLOCKED_BAG: {
				triggers: [ "feature_unlocked" ],
				repeats: "NEVER",
				delay: 1500,
				logMessage: "ui.log.tutorial_feature_unlocked_bag_message",
				conditions: { featureUnlocked: { bag: true } }
			},
			TUTORIAL_FOUND_METAL: {
				triggers: [ "action_collect_rewards" ],
				delay: 0,
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_found_metal_message",
				conditions: { playerInventory: { resource_food: [1, -1] } }
			},
			TUTORIAL_FOUND_FOOD: {
				triggers: [ "action_collect_rewards" ],
				repeats: "NEVER",
				delay: 0,
				logMessage: "ui.log.tutorial_found_food_message",
				conditions: { playerInventory: { resource_metal: [1, -1] } }
			},
			TUTORIAL_FOUND_ROPE: {
				triggers: [ "action_collect_rewards" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_found_rope_message",
				conditions: { playerInventory: { resource_rope: [1, -1] }, campInventory: { resource_rope: [ -1, 1 ] } }
			},
			TUTORIAL_FOUND_HERBS: {
				triggers: [ "action_collect_rewards" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_found_herbs_message",
				conditions: { playerInventory: { resource_herbs: [1, -1] } }
			},
			TUTORIAL_FOUND_FUEL: {
				triggers: [ "action_collect_rewards" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_found_fuel_message",
				conditions: { playerInventory: { resource_fuel: [1, -1] } }
			},
			TUTORIAL_FOUND_RUBBER: {
				triggers: [ "action_collect_rewards" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_found_rubber_message",
				conditions: { playerInventory: { resource_rubber: [1, -1] } }
			},
			TUTORIAL_FOUND_MEDICINE: {
				triggers: [ "action_collect_rewards" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_found_medicine_message",
				conditions: { playerInventory: { resource_medicine: [1, -1] } }
			},
			TUTORIAL_FOUND_TOOLS: {
				triggers: [ "action_collect_rewards" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_found_tools_message",
				conditions: { playerInventory: { resource_tools: [1, -1] } }
			},
			TUTORIAL_FOUND_CONCRETE: {
				triggers: [ "action_collect_rewards" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_found_concrete_message",
				conditions: { playerInventory: { resource_concrete: [1, -1] } }
			},
			TUTORIAL_FOUND_ROBOT: {
				triggers: [ "action_collect_rewards" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_found_robot_message",
				conditions: { playerInventory: { resource_robots: [1, -1] } }
			},
			TUTORIAL_FOUND_SILVER: {
				triggers: [ "action_collect_rewards" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_found_silver_message",
				conditions: { playerInventory: { silver: [1, -1] } }
			},
			TUTORIAL_WARNING_STORAGE_FULL: {
				triggers: [ "update" ],
				repeats: "COOLDOWN",
				logMessageParams: { resource: "RESOURCE_AT_CAPACITY" },
				logMessage: "ui.log.tutorial_warning_storage_full_message",
				delay: 3000,
				conditions: { inCamp: true, campInventoryFull: true } 
			},
			TUTORIAL_WARNING_SUNDOME_MISSING: {
				triggers: [ "action_enter_camp" ],
				repeats: "COOLDOWN",
				logMessage: "ui.log.tutorial_warning_sundome_missing_message",
				delay: 3000,
				conditions: { inCamp: true, sunlit: true, improvements: { sundome: [ -1, 1 ] } } 
			},
			TUTORIAL_WARNING_FIRST_CAMP_COMPLETED: {
				triggers: [ "action_build" ],
				repeats: "NEVER",
				logMessage: "ui.log.tutorial_warning_first_camp_completed_message",
				conditions: { inCamp: true, camp: { isExpansionBlockedByStorage: true }, player: { position: { level: 13 } } }
			}
		},

	};
	
	return TutorialConstants;
});
