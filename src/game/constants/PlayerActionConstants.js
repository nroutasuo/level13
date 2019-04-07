// Costs, requirements, descriptions, and cooldowns for all player actions plus some related helper functions
define(['ash',
    'game/constants/GameConstants',
    'game/constants/CampConstants',
],
function (Ash, GameConstants, CampConstants) {

    var COST_SOURCE_CAMP = "camp";
    var COST_SOURCE_DEFAULT = "default";

    var PlayerActionConstants = {

            COST_SOURCE_CAMP: COST_SOURCE_CAMP,
            COST_SOURCE_DEFAULT: COST_SOURCE_DEFAULT,

            requirements: {

                scout: {
                    vision: [30, -1],
                    sector: {
                        scouted: false,
                    },
                    busy: false,
                },

                scavenge: {
                    vision: [10, -1],
                },

                fight: {
                    busy: false,
                },

                clear_workshop: {
                    vision: [30, -1],
                    health: 70,
                    sector: {
                        scouted: true,
                    },
                },

                clear_waste: {
                    vision: [50, -1],
                    health: 80,
                    sector: {
                        scouted: true,
                    },
                },

                use_spring: {
                    vision: [10, -1],
                    sector: {
                        scouted: true,
                        spring: true,
                    },
                    bag: {
                        full: false,
                    },
                },

                fight_gang: {
                    health: 70,
                },

                send_caravan: {
                    outgoingcaravan: {
                        available: true,
                        validSelection: true,
                    },
                    improvements: {
                        tradepost: [1, -1],
                    },
                },

                trade_with_caravan: {
                    incomingcaravan: {
                        validSelection: true,
                    }
                },

                move_sector_north: {
                    vision: [5, -1],
                    sector: {
                        blockerNorth: false,
                    },
                    busy: false,
                },

                move_sector_south: {
                    vision: [5, -1],
                    sector: {
                        blockerSouth: false,
                    },
                    busy: false,
                },

                move_sector_east: {
                    vision: [5, -1],
                    sector: {
                        blockerEast: false,
                    },
                    busy: false,
                },

                move_sector_west: {
                    vision: [5, -1],
                    sector: {
                        blockerWest: false,
                    },
                    busy: false,
                },

                move_sector_ne: {
                    vision: [5, -1],
                    sector: {
                        blockerNE: false,
                    },
                    busy: false,
                },

                move_sector_se: {
                    vision: [5 -1],
                    sector: {
                        blockerSE: false,
                    },
                    busy: false,
                },

                move_sector_sw: {
                    vision: [5, -1],
                    sector: {
                        blockerSW: false,
                    },
                    busy: false,
                },

                move_sector_nw: {
                    vision: [5, -1],
                    sector: {
                        blockerNW: false,
                    },
                    busy: false,
                },

                move_level_up: {
                    vision: [25, -1],
                    sector: {
                        passageUp: true,
                    },
                    improvements: {
                        passageUp: [1, -1],
                    },
                    busy: false,
                },

                move_level_down: {
                    vision: [25, -1],
                    sector: {
                        passageDown: true,
                    },
                    improvements: {
                        passageDown: [1, -1],
                    },
                    busy: false,
                },

                launch: {
                    improvements: {
                        spaceship1: [1, -1],
                        spaceship2: [1, -1],
                        spaceship3: [1, -1],
                    },
                    busy: false,
                },

                move_camp_global: {
                    busy: false
                },
                
                move_camp_level: {
                    path_to_camp: true,
                },

                leave_camp: {
                    busy: false,
                    bag: {
                        validSelection: true,
                    },
                },

                accept_inventory: {
                    bag: {
                        validSelection: true,
                    },
                },

                take_all: {
                    bag: {
                        validSelectionAll: true,
                    }
                },

                build_out_camp: {
                    vision: [30, -1],
                    improvements: {
                        camp: [0, 1],
                    },
                    sector: {
                        canHaveCamp: true,
                    }
                },

                build_out_bridge: {
                    improvements: {
                        bridge: [0, 1],
                    },
                    upgrades: {
                        unlock_building_bridge: true,
                    }
                },

                build_out_spaceship1: {
                    improvements: {
                        spaceship1: [0, 1],
                    },
                    upgrades: {
                        unlock_building_spaceship1: true,
                    }
                },

                build_out_spaceship2: {
                    improvements: {
                        spaceship1: [1, -1],
                        spaceship2: [0, 1],
                    },
                    upgrades: {
                        unlock_building_spaceship2: true,
                    }
                },

                build_out_spaceship3: {
                    improvements: {
                        spaceship3: [0, 1],
                    },
                    upgrades: {
                        unlock_building_spaceship3: true,
                    }
                },

                build_out_collector_food: {
                    vision: [30, -1],
                    sector: {
                        collectable_food: true,
                        scouted: true,
                    }
                },

                build_out_collector_water: {
                    vision: [30, -1],
                    sector: {
                        collectable_water: true,
                        scouted: true,
                    }
                },

                use_out_collector_food: {
                    vision: [10, -1],
                    improvements: {
                        collector_food: [1, -1],
                    },
                    sector: {
                        collected_food: 1,
                    },
                    bag: {
                        full: false,
                    },
                },

                use_out_collector_water: {
                    vision: [10, -1],
                    improvements: {
                        collector_water: [1, -1],
                    },
                    sector: {
                        collected_water: 1,
                    },
                    bag: {
                        full: false,
                    },
                },

                build_out_passage_up_stairs:  {
                    sector: {
                        passageUp: 3,
                    },
                    improvements: {
                        passageUpStairs: [0, 1],
                    },
                    upgrades: {
                        unlock_building_passage_staircase: true
                    }
                },

                build_out_passage_up_elevator:  {
                    sector: {
                        passageUp: 2,
                    },
                    improvements: {
                        passageUpElevator: [0, 1],
                    },
                    upgrades: {
                        unlock_building_passage_elevator: true,
                    }
                },

                build_out_passage_up_hole:  {
                    sector: {
                        passageUp: 1,
                    },
                    improvements: {
                        passageUpHole: [0, 1],
                    },
                    upgrades: {
                        unlock_building_passage_hole: true,
                    }
                },

                build_out_passage_down_stairs:  {
                    sector: {
                        passageDown: 3,
                    },
                    improvements: {
                        passageDownStairs: [0, 1],
                    },
                    upgrades: {
                        unlock_building_passage_staircase: true
                    }
                },

                build_out_passage_down_elevator:  {
                    sector: {
                        passageDown: 2,
                    },
                    improvements: {
                        passageDownElevator: [0, 1],
                    },
                    upgrades: {
                        unlock_building_passage_elevator: true,
                    }
                },

                build_out_passage_down_hole:  {
                    sector: {
                        passageDown: 1,
                    },
                    improvements: {
                        passageDownHole: [0, 1],
                    },
                    upgrades: {
                        unlock_building_passage_hole: true,
                    }
                },

                build_in_home: {
                    improvements: {
                        home: [-1, 1],
                    }
                },

                build_in_house: {
                    improvements: {
                        camp: [1, -1],
                        campfire: [1, -1],
                    },
                },

                build_in_campfire: {
                    improvements: {
                        camp: [1, -1],
                        campfire: [-1, 1],
                    },
                },

                use_in_campfire: {
                    rumourpoolchecked: false,
                    population: [1, -1],
                    busy: false,
                },

                use_in_home: {
                    maxStamina: false,
                    busy: false,
                },

                build_in_darkfarm: {
                    improvements: {
                        campfire: [1, -1],
                    },
                    upgrades: {
                        unlock_building_darkfarm: true,
                    }
                },

                build_in_square: {
                    improvements: {
                        camp: [1, -1],
                        campfire: [1, -1],
                        storage: [2, -1],
                        tradepost: [1, -1],
                        square: [0, 1],
                    },
                    upgrades: {
                        unlock_building_passage_staircase: true,
                    }
                },

                build_in_garden: {
                    upgrades: {
                        upgrade_building_inn: true,
                    },
                    improvements: {
                        house: [1, -1],
                    },
                },

                build_in_hospital: {
                    improvements: {
                        camp: [1, -1],
                        campfire: [1, -1],
                        hospital: [0, 1],
                    },
                    upgrades: {
                        unlock_building_hospital: true,
                    }
                },

                use_in_hospital: {
                    improvements: {
                        hospital: [1, -1],
                    },
                    perks: {
                        Injury: [0.1, 1],
                    },
                },

                use_in_hospital2: {
                    improvements: {
                        hospital: [1, -1],
                    },
                    upgrades: {
                        upgrade_building_hospital: true,
                    },
                },

                build_in_tradingPost: {
                    numCamps: 2,
                    improvements: {
                        tradepost: [0, 1],
                        house: [1, -1],
                    },
                    upgrades: {
                        unlock_building_tradingpost: true,
                    }
                },

                build_in_inn: {
                    improvements: {
                        inn: [0, 1],
                    },
                    upgrades: {
                        unlock_building_inn: true,
                    },
                    level: {
                        population: [1, -1]
                    }
                },

                use_in_inn: {
                    improvements: {
                        inn: [1, -1],
                    },
                    upgrades: {
                        unlock_building_inn: true,
                    },
                    busy: false,
                },

                use_in_inn_select: {
                    max_followers_reached: false,
                },

                build_in_market: {
                    improvements: {
                        tradepost: [1, -1],
                        market: [0, 1],
                    },
                    upgrades: {
                        unlock_building_market: true,
                    },
                    level: {
                        population: [1, -1]
                    }
                },

                build_in_library: {
                    upgrades: {
                        unlock_building_library: true,
                    },
                    improvements: {
                        house: [1, -1],
                        library: [-1, 1],
                    },
                },

                build_in_house2: {
                    upgrades: {
                        unlock_building_house2: true,
                    },
                    improvements: {
                        house: [3, -1],
                    }
                },

                build_in_generator: {
                    upgrades: {
                        unlock_building_lights: true,
                    },
                    improvements: {
                        generator: [0, 1],
                        campfire: [1, -1],
                    }
                },

                build_in_lights: {
                    upgrades: {
                        unlock_building_lights: true,
                    },
                    sunlit: false,
                    improvements: {
                        lights: [0, 1]
                    },
                },

                build_in_ceiling: {
                    sunlit: true,
                    upgrades: {
                        unlock_building_ceiling: true,
                    }
                },

                build_in_fortification: {
                    improvements: {
                        house: [1, -1],
                    },
                    upgrades: {
                        unlock_building_fortifications: true,
                    }
                },

                build_in_fortification2: {
                    improvements: {
                        house: [1, -1],
                    },
                    upgrades: {
                        upgrade_building_fortifications: true,
                    }
                },
                
                build_in_stable: {
                    improvements: {
                        market: [1, -1],
                        stable: [-1, 2],
                    },
                	upgrades: {
                		unlock_outgoing_caravans: true
                	}
                },

                build_in_aqueduct: {
                    upgrades: {
                        unlock_building_aqueduct: true,
                    }
                },

                build_in_barracks: {
                    improvements: {},
                    upgrades: {
                        unlock_building_barracks: true,
                    }
                },

                build_in_apothecary: {
                    improvements: {
                        house: [2, -1],
                    },
                    upgrades: {
                        unlock_building_apothecary: true,
                    }
                },

                build_in_smithy: {
                    improvements: {
                        house: [2, -1],
                    },
                    upgrades: {
                        unlock_building_smithy: true,
                    }
                },

                build_in_cementmill: {
                    improvements: {
                        house: [2, -1],
                    },
                    upgrades: {
                        unlock_building_cementmill: true,
                    }
                },

                build_in_researchcenter: {
                    improvements: {
                        library: [1, -1],
                    },
                    upgrades: {
                        unlock_building_researchcenter: true,
                    }
                },

                build_in_radio: {
                    improvements: {},
                    upgrades: {
                        unlock_building_radio: true
                    },
                    level: {
                        population: [1.1, -1]
                    }
                },

                build_in_shrine: {
                    deity: true,
                },

                craft_light1: {
                },

                craft_light2: {
                    upgrades: {
                        unlock_building_lights: true
                    }
                },

                craft_exploration_1: {
                    upgrades: {
                        unlock_item_shoe1: true,
                    }
                },

                craft_first_aid_kit_1: {
                    upgrades: {
                        unlock_item_firstaid: true,
                    }
                },

                craft_first_aid_kit_2: {
                    upgrades: {
                        upgrade_building_hospital: true,
                    }
                },

                craft_glowstick_1: {
                    upgrades: {
                        upgrade_worker_chemist: true,
                    }
                },

                craft_weapon1: {
                },

                craft_weapon2: {
                    upgrades: {
                        unlock_item_weapon2: true,
                    }
                },

                craft_weapon3: {
                    upgrades: {
                        unlock_building_smithy: true,
                    }
                },

                craft_weapon4: {
                    upgrades: {
                        unlock_item_weapon4: true,
                    }
                },

                craft_weapon5: {
                    upgrades: {
                        unlock_item_weapon5: true,
                    }
                },

                craft_weapon6: {
                    upgrades: {
                        unlock_item_weapon6: true,
                    }
                },

                craft_weapon7: {
                    upgrades: {
                        unlock_item_weapon7: true,
                    }
                },
                craft_clothing_over_1: {
                    upgrades: {
                        unlock_item_clothing2: true,
                    }
                },

                craft_clothing_over_4: {
                    upgrades: {
                        unlock_item_clothing4: true,
                    }
                },

                craft_clothing_over_6: {
                    upgrades: {
                        unlock_building_ceiling: true,
                    }
                },

                craft_clothing_over_3: {
                    upgrades: {
                        unlock_item_clothing5: true,
                    }
                },

                craft_clothing_upper_3: {
                    upgrades: {
                        unlock_item_clothing3: true
                    }
                },

                craft_clothing_upper_4: {
                    upgrades: {
                        unlock_item_clothing6: true,
                    }
                },

                craft_clothing_upper_5: {
                    upgrades: {
                        unlock_item_clothing5l: true
                    }
                },

                craft_clothing_lower_3: {
                    upgrades: {
                        unlock_item_clothing3: true
                    }
                },

                craft_clothing_lower_4: {
                    upgrades: {
                        unlock_item_clothing6: true,
                    }
                },

                craft_clothing_lower_5: {
                    upgrades: {
                        unlock_item_clothing5l: true,
                    }
                },

                craft_clothing_head_1: {
                    upgrades: {
                        unlock_clothing_warm: true,
                    }
                },

                craft_clothing_head_3: {
                    upgrades: {
                        unlock_item_clothing5: true,
                    }
                },

                craft_clothing_head_4: {
                    upgrades: {
                        unlock_item_clothing4he: true
                    }
                },

                craft_clothing_head_5: {
                    upgrades: {
                        unlock_item_clothing7: true,
                    }
                },

                craft_clothing_hands_1: {
                    upgrades: {
                        unlock_clothing_warm: true,
                    }
                },

                craft_clothing_hands_2: {
                    upgrades: {
                        unlock_item_clothing4h: true
                    }
                },

                craft_clothing_hands_3: {
                    upgrades: {
                        unlock_item_clothing3h: true,
                    }
                },

                craft_clothing_hands_4: {
                    upgrades: {
                        unlock_item_clothing7: true,
                    }
                },

                craft_shoe_1: {
                    upgrades: {
                        unlock_item_shoe1: true
                    }
                },

                craft_bag_0: {
                    upgrades: {
                        unlock_item_shoe1: true,
                    }
                },

                craft_bag_1: {
                    upgrades: {
                        unlock_item_bag2: true,
                    }
                },

                craft_bag_2: {
                    upgrades: {
                        unlock_item_bag3: true
                    }
                },

                craft_bag_4: {
                    upgrades: {
                        unlock_item_clothing8: true
                    }
                },

                use_item_glowstick_1: {
                    vision: [0, 30],
                },

                use_item_first_aid_kit_1: {
                    perks: {
                        Injury: [0.6, 0.99, true],
                    }
                },

                use_item_first_aid_kit_2: {
                    perks: {
                        Injury: [0.05, 0.99, true],
                    },
                },

                create_blueprint: {
                    inCamp: true,
                },
                
                unlock_item_clothing8: {
                	blueprint: 15,
                	upgrades: {
                		unlock_item_clothing7: true,
                	}
                },

                unlock_item_clothing5l: {
                    blueprint: 15,
                    upgrades: {
                        unlock_item_clothing7: true,
                    }
                },

                upgrade_building_apothecary: {
                	blueprint: 13,
                	upgrades: {
                		upgrade_building_library2: true,
                	}
                },

                unlock_item_clothing8: {
                    blueprint: 15,
                    upgrades: {
                        unlock_item_clothing7: true,
                    }
                },

                unlock_building_ceiling: {
                    blueprint: 15,
                    upgrades: {
                        upgrade_building_library2: true,
                    }
                },

                improve_building_market3: {
                    blueprint: 14,
                    upgrades: {
                        unlock_building_radio: true,
                    }
                },

                upgrade_building_cementmill: {
                    blueprint: 14,
                    upgrades: {
                        unlock_building_cementmill: true,
                    }
                },

                unlock_building_researchcenter: {
                    blueprint: 14,
                    upgrades: {
                        upgrade_building_library2: true,
                    }
                },

                unlock_item_weapon7: {
                    blueprint: 14,
                    upgrades: {
                        upgrade_building_library2: true,
                    }
                },

                upgrade_building_hospital: {
                    blueprint: 13,
                    upgrades: {
                        unlock_item_firstaid: true,
                    }
                },

                unlock_item_clothing7: {
                    blueprint: 13,
                    upgrades: {
                        upgrade_worker_chemist: true,
                    }
                },

                unlock_item_weapon6: {
                    blueprint: 13,
                },

                unlock_building_radio: {
                    blueprint: 13,
                },

                upgrade_building_shrine: {
                    upgrades: {
                        unlock_building_apothecary: true,
                    }
                },

                unlock_item_bag3: {
                    blueprint: 12,
                },

                upgrade_worker_chemist: {
                    blueprint: 12,
                    upgrades: {
                        upgrade_building_library2: true,
                    }
                },

                unlock_item_clothing6: {
                    blueprint: 12,
                },

                unlock_item_clothing3h: {
                    upgrades: {
                        unlock_item_clothing4h: true,
                    }
                },

                unlock_building_cementmill: {
                    blueprint: 11,
                    upgrades: {
                        upgrade_building_library: true,
                    }
                },

                unlock_item_weapon5: {
                    blueprint: 11,
                },

                upgrade_building_storage2: {
                    blueprint: 11,
                    upgrades: {
                        upgrade_building_storage1: true,
                    }
                },

                upgrade_building_fortifications: {
                    blueprint: 11,
                    upgrades: {
                        unlock_building_cementmill: true,
                    }
                },

                unlock_building_apothecary: {
                    upgrades: {
                        upgrade_building_library: true,
                    }
                },

                unlock_building_aqueduct: {
                    blueprint: 10,
                    upgrades: {
                        upgrade_worker_collector1: true,
                    }
                },

                unlock_item_clothing4: {
                    blueprint: 10,
                    upgrades: {
                        unlock_item_shoe1: true,
                    }
                },

                upgrade_building_library2: {
                    blueprint: 10,
                    upgrades: {
                        unlock_building_apothecary: true,
                    }
                },

                unlock_building_barracks: {
                    upgrades: {
                        unlock_building_fortifications: true,
                    }
                },

                upgrade_worker_trapper: {
                    blueprint: 9,
                },

				unlock_item_clothing4he: {
                	upgrades: {
                		unlock_item_clothing4h: true,
                	}
				},

                upgrade_building_inn: {
                    upgrades: {
                        upgrade_building_campfire: true,
                    }
                },

                upgrade_building_market2: {
                    blueprint: 8,
                    upgrades: {
                        upgrade_building_market: true,
                    }
                },

                unlock_item_weapon4: {
                    blueprint: 8,
                },

                unlock_item_clothing3: {
                    blueprint: 8,
                    upgrades: {
                        unlock_building_passage_hole: true,
                    }
                },

                upgrade_outgoing_caravans: {
                	upgrades: {
                		unlock_outgoing_caravans: true,
                	}
                },

                unlock_item_clothing5: {
                    blueprint: 7,
                    upgrades: {
                        unlock_building_smithy: true,
                    }
                },

                unlock_building_bridge: {
                    blueprint: 5,
                    upgrades: {
                        upgrade_worker_scavenger: true,
                    }
                },

                unlock_building_spaceship1: {
                    blueprint: 15,
                    upgrades: {
                        unlock_building_bridge: true,
                    }
                },

                unlock_building_spaceship2: {
                    blueprint: 15,
                    upgrades: {
                        unlock_building_bridge: true,
                    }
                },

                unlock_building_spaceship3: {
                    blueprint: 15,
                    upgrades: {
                        unlock_building_bridge: true,
                    }
                },

                upgrade_building_storage1: {
                    blueprint: 7,
                },

                unlock_item_firstaid: {
                    upgrades: {
                        upgrade_worker_collector1: true,
                    }
                },

                unlock_item_clothing4h: {
                    blueprint: 7,
                    upgrades: {
                        unlock_item_shoe1: true,
                    }
                },

                upgrade_building_market: {
                    blueprint: 6,
                    upgrades: {
                        unlock_building_market: true,
                    }
                },

                unlock_building_smithy: {
                    blueprint: 6,
                    upgrades: {
                        upgrade_building_library: true,
                    }
                },

                upgrade_worker_collector1: {
                    blueprint: 6,
                    upgrades: {
                        unlock_item_shoe1: true,
                    }
                },

                unlock_building_house2: {
                    upgrades: {
                        unlock_building_passage_elevator: true,
                    }
                },

                unlock_building_passage_elevator: {
                    blueprint: 6,
                    upgrades: {
                        unlock_building_passage_staircase: true,
                    }
                },

                unlock_item_bag2: {
                    upgrades: {
                        unlock_item_clothing2: true,
                    }
                },

                upgrade_building_library: {
                    upgrades: {
                        unlock_building_library: true,
                    }
                },

                unlock_item_weapon2: {
                    blueprint: 4,
                    upgrades: {
                        unlock_item_shoe1: true,
                    }
                },

                unlock_building_passage_hole: {
                    blueprint: 7,
                    upgrades: {
                        unlock_building_passage_staircase: true,
                    }
                },

                upgrade_worker_scavenger: {
                    blueprint: 4,
                    upgrades: {
                        unlock_item_shoe1: true,
                    }
                },

                unlock_outgoing_caravans: {
                	upgrades: {
                		unlock_building_market: true,
                	}
                },

                unlock_building_library: {
                    blueprint: 3,
                },

                unlock_building_inn: {
                    blueprint: 3,
                    upgrades: {
                        unlock_building_market: true,
                    }
                },

                unlock_building_lights: {
                    blueprint: 4,
                },

                unlock_building_market: {
                    blueprint: 3,
                    upgrades: {
                        unlock_building_tradingpost: true,
                    }
                },

                unlock_building_fortifications: {
                   blueprint: 3,
                    upgrades: {
                        unlock_building_passage_staircase: true,
                    }
                },

                unlock_clothing_warm: {
                    blueprint: 2,
                    upgrades: {
                        unlock_worker_rope: true,
                    }
                },

                unlock_building_darkfarm: {
                    blueprint: 2,
                },

                unlock_building_tradingpost: {
                    blueprint: 2,
                },

                unlock_item_clothing2: {
                    upgrades: {
                        unlock_item_shoe1: true,
                    }
                },

                unlock_building_passage_staircase: {
                    blueprint: 1,
                },

                unlock_building_hospital: {
                    upgrades: {
                        unlock_worker_rope: true,
                    }
                },

                unlock_worker_rope: {
                },

                unlock_item_shoe1: {
                },

            },

            // structure: resource: cost
            // cost can be a simple number (baseCost) or a table with the following values
            // [baseCost, linearScale, e1Scale, e2Scale, requiredOrdinal]
            // additional keys: cost_source, cost_factor_e1_base, cost_factor_e2_exp
            // cost = baseCost + (linearScale * ordinal1) + (e1Scale * pow(e1Base, ordinal1-1)) + (e2Scale * (pow(ordinal2, e2Exp)))

            costs: {

                scout: {
                    stamina: 5,
                },

                scavenge: {
                    stamina: 3,
                },

                flee: {
                    stamina: 20,
                },

                clear_workshop: {
                    stamina: 10,
                },

                clear_waste: {
                    stamina: 100,
                },

                use_spring: {
                    stamina: 1,
                },

                fight_gang: {
                    stamina: 10,
                },

                move_level_up: {
                    stamina: 100,
                    resource_food: 1,
                    resource_water: 1,
                },

                move_level_down: {
                    stamina: 100,
                    resource_food: 1,
                    resource_water: 1,
                },

                move_sector_north: {
                    stamina: 10,
                    resource_food: 1,
                    resource_water: 1,
                },

                move_sector_south: {
                    stamina: 10,
                    resource_food: 1,
                    resource_water: 1,
                },

                move_sector_west: {
                    stamina: 10,
                    resource_food: 1,
                    resource_water: 1,
                },

                move_sector_east: {
                    stamina: 10,
                    resource_food: 1,
                    resource_water: 1,
                },

                move_sector_ne: {
                    stamina: 10,
                    resource_food: 1,
                    resource_water: 1,
                },

                move_sector_se: {
                    stamina: 10,
                    resource_food: 1,
                    resource_water: 1,
                },

                move_sector_sw: {
                    stamina: 10,
                    resource_food: 1,
                    resource_water: 1,
                },

                move_sector_nw: {
                    stamina: 10,
                    resource_food: 1,
                    resource_water: 1,
                },

                launch: {
                    resource_fuel: 10000,
                },

                build_out_camp: {
                    resource_metal: 10,
                    resource_food: 2,
                },

                build_out_bridge: {
                    resource_metal: 150,
                    resource_rope: 150,
                    cost_source: COST_SOURCE_CAMP,
                },

                build_out_spaceship1: {
                    resource_metal: 20000,
                    resource_rope: 3000,
                    resource_concrete: 10000,
                    resource_tools: 1000,
                    cost_source: COST_SOURCE_CAMP,
                },

                build_out_spaceship2: {
                    resource_metal: 10000,
                    resource_rope: 5000,
                    resource_concrete: 1000,
                    resource_tools: 2000,
                    cost_source: COST_SOURCE_CAMP,
                },

                build_out_spaceship3: {
                    resource_metal: 10000,
                    resource_rope: 5000,
                    resource_concrete: 1000,
                    resource_fuel: 800,
                    resource_medicine: 3000,
                    resource_tools: 1000,
                    cost_source: COST_SOURCE_CAMP,
                },

                build_out_passage_up_hole: {
                    resource_metal: [50, 100, 50, 5500, 0],
                    resource_concrete: 10,
                    cost_factor_e1_base: 1.295,
                    cost_factor_e2_exp: 2.3,
                    cost_source: COST_SOURCE_CAMP,
                },

                build_out_passage_up_stairs: {
                    resource_metal: [50, 100, 50, 5500, 0],
                    resource_rope: 10,
                    cost_factor_e1_base: 1.295,
                    cost_factor_e2_exp: 2.3,
                    cost_source: COST_SOURCE_CAMP,
                },

                build_out_passage_up_elevator: {
                    resource_metal: [50, 100, 50, 5500, 0],
                    resource_fuel: 10,
                    cost_factor_e1_base: 1.295,
                    cost_factor_e2_exp: 2.3,
                    cost_source: COST_SOURCE_CAMP,
                },

                build_out_passage_down_hole: {
                    resource_metal: [50, 100, 50, 5500, 0],
                    resource_concrete: 10,
                    cost_factor_e1_base: 1.295,
                    cost_factor_e2_exp: 2.3,
                    cost_source: COST_SOURCE_CAMP,
                },

                build_out_passage_down_stairs: {
                    resource_metal: [50, 100, 50, 5500, 0],
                    resource_rope: 10,
                    cost_factor_e1_base: 1.295,
                    cost_factor_e2_exp: 2.3,
                    cost_source: COST_SOURCE_CAMP,
                },

                build_out_passage_down_elevator: {
                    resource_metal: [50, 100, 50, 5500, 0],
                    resource_fuel: 10,
                    cost_factor_e1_base: 1.295,
                    cost_factor_e2_exp: 2.3,
                    cost_source: COST_SOURCE_CAMP,
                },

                build_out_collector_food: {
                    resource_metal: 8
                },

                build_out_collector_water: {
                    resource_metal: 8
                },

                build_in_house: {
                    resource_metal: 30,
                    cost_factor_e1_base: 2.25,
                },

                build_in_house2: {
                    resource_metal: 300,
                    resource_rope: 25,
                    cost_factor_e1_base: 1.5,
                },

                build_in_generator: {
                    resource_metal: 50,
                    resource_fuel: 100
                },

                build_in_lights: {
                    resource_metal: 100,
                    resource_rope: 10,
                },

                build_in_ceiling: {
                    resource_rope: 1000,
                },

                build_in_storage: {
                    resource_metal: [0, 0, 50, 0, 0],
                    resource_rope: [5, 2, 2, 0, 2],
                    cost_factor_e1_base: 1.65,
                    cost_factor_e1_base_outpost: 2.5,
                },

                build_in_campfire: {
                    resource_metal: 5,
                    resource_food: 10,
                    cost_factor_e1_base: 2,
                },

                build_in_darkfarm: {
                    resource_metal: 50,
                    resource_water: 20,
                    resource_fuel: 5,
                    cost_factor_e1_base: 2,
                },

                build_in_square: {
                    resource_metal: 300,
                    resource_rope: 100,
                },

                build_in_garden: {
                    resource_metal: 100,
                    resource_water: 50,
                    resource_rope: 50,
                    cost_factor_e1_base: 3,
                },

                build_in_hospital: {
                    resource_metal: 150,
                    resource_rope: 30,
                },

                use_in_hospital: {
                    resource_water: 30,
                    resource_food: 15,
                },

                use_in_hospital2: {
                    resource_water: 100,
                    resource_food: 15,
                },

                build_in_tradingPost: {
                    resource_metal: 78,
                },

                build_in_inn: {
                    resource_metal: 50,
                    resource_rope: 20,
                    resource_fuel: 10,
                },

                use_in_inn: {
                },

                use_in_inn_select: {
                    resource_food: 15,
                    resource_water: 15,
                    cost_factor_e1_base: 1.5,
                },

                build_in_market: {
                    resource_metal: 50,
                    resource_rope: 100,
                    cost_factor_e1_base: 1.5,
                },

                build_in_library: {
                    resource_metal: 100,
                    resource_rope: 100,
                    cost_factor_e1_base: 2,
                },

                build_in_fortification: {
                    resource_metal: 350,
                    resource_rope: 100,
                    cost_factor_e1_base: 1.75,
                },

                build_in_fortification2: {
                    resource_concrete: 100,
                    cost_factor_e1_base: 1.75,
                },

                build_in_aqueduct: {
                    resource_metal: 300,
                    cost_factor_e1_base: 2,
                },

                build_in_stable: {
                    resource_metal: 100,
                    resource_rope: 50,
                    cost_factor_e1_base: 1.75,
                },

                build_in_barracks: {
                    resource_metal: 100,
                    resource_rope: 50,
                    resource_concrete: 50,
                    cost_factor_e1_base: 1.2,
                },

                build_in_apothecary: {
                    resource_metal: 100,
                    resource_rope: 50,
                    cost_factor_e1_base: 1.5,
                },

                build_in_smithy: {
                    resource_metal: 100,
                    resource_rope: 50,
                    cost_factor_e1_base: 1.5,
                },

                build_in_cementmill: {
                    resource_metal: 500,
                    resource_rope: 50,
                    cost_factor_e1_base: 1.5,
                },

                build_in_radio: {
                    resource_metal: 500,
                    resource_rope: 50,
                    cost_factor_e1_base: 1.5,
                },

                build_in_shrine: {
                    resource_water: 500,
                    resource_metal: 200,
                },

                build_in_researchcenter: {
                    resource_water: 200,
                    resource_metal: 1200,
                    resource_rope: 100,
                },

                craft_light1: {
                    resource_metal: 8,
                },

                craft_light2: {
                    resource_metal: 50,
                    resource_fuel: 20,
                    item_res_matches: 2
                },

                craft_exploration_1: {
                    resource_metal: 5,
                    item_res_silk: 1,
                },

                craft_first_aid_kit_1: {
                    item_res_bands: 2,
                    resource_water: 10,
                    resource_herbs: 10
                },

                craft_glowstick_1: {
                    resource_metal: 2,
                    resource_water: 10,
                    resource_fuel: 10
                },

                craft_first_aid_kit_2: {
                    item_res_bands: 2,
                    resource_water: 10,
                    resource_medicine: 5,
                },

                craft_shade1: {
                    resource_metal: 10,
                },

                craft_shade2: {
                    resource_metal: 20,
                },

                craft_weapon1: {
                    resource_metal: 10,
                    resource_rope: 1
                },

                craft_weapon2: {
                    resource_metal: 20,
                    resource_rope: 10,
                    item_res_bands: 1,
                },

                craft_weapon3: {
                    resource_metal: 100,
                    resource_rope: 10,
                    item_res_bands: 1,
                },

                craft_weapon4: {
                    resource_metal: 100,
                    resource_rope: 5,
                    resource_fuel: 5,
                    item_res_bands: 10,
                },

                craft_weapon5: {
                    resource_metal: 200,
                    resource_tools: 20,
                    resource_fuel: 50,
                    item_res_bands: 50,
                },

                craft_weapon6: {
                    resource_metal: 300,
                    resource_tools: 50,
                    resource_fuel: 100,
                    item_res_bands: 50,
                },

                craft_weapon7: {
                    resource_metal: 500,
                    resource_tools: 50,
                    resource_fuel: 100,
                    item_res_bands: 75,
                },

                craft_clothing_head_1: {
                    resource_rope: 10,
                },

                craft_clothing_head_2: {
                    resource_rope: 50,
                },

                craft_clothing_head_3: {
                    resource_metal: 60,
                    resource_rope: 10
                },

                craft_clothing_head_4: {
                    resource_metal: 20,
                    resource_rope: 10,
                    item_res_bands: 5
                },

                craft_clothing_head_5: {
                    resource_metal: 20,
                    resource_rope: 20,
                    resource_tools: 10,
                    item_res_bands: 5,
                    item_res_silk: 10
                },

                craft_clothing_hands_1: {
                    resource_rope: 10
                },

                craft_clothing_hands_2: {
                    resource_rope: 10,
                    item_res_bands: 2
                },

                craft_clothing_hands_3: {
                    resource_rope: 10,
                    item_res_bands: 3
                },

                craft_clothing_hands_4: {
                    resource_rope: 10,
                    resource_tools: 1,
                    item_res_silk: 10
                },

                craft_clothing_over_1: {
                    resource_rope: 10,
                },

                craft_clothing_over_2: {
                    resource_metal: 5,
                    resource_rope: 10,
                    item_res_silk: 2
                },

                craft_clothing_over_3: {
                    resource_metal: 50
                },

                craft_clothing_over_4: {
                    resource_metal: 10,
                    resource_rope: 10,
                    item_res_silk: 10,
                },

                craft_clothing_over_5: {
                    resource_metal: 20,
                    resource_rope: 10,
                    item_res_silk: 10,
                },

                craft_clothing_over_6: {
                    resource_metal: 100,
                    resource_concrete: 10,
                    item_res_medicine: 10,
                    item_res_silk: 10,
                },

                craft_clothing_lower_2: {
                    resource_rope: 10,
                },

                craft_clothing_lower_3: {
                    resource_rope: 20,
                },

                craft_clothing_lower_4: {
                    resource_rope: 20,
                    resource_concrete: 10
                },

                craft_clothing_lower_5: {
                    resource_rope: 50
                },

                craft_clothing_upper_1: {
                    resource_rope: 5
                },

                craft_clothing_upper_2: {
                    resource_rope: 20
                },

                craft_clothing_upper_3: {
                    resource_rope: 30
                },

                craft_clothing_upper_4: {
                    resource_rope: 30,
                    item_res_silk: 2,
                },

                craft_clothing_upper_5: {
                    resource_rope: 5,
                    resource_medicine: 10,
                    item_res_silk: 20
                },

                craft_shoe_1: {
                    resource_rope: 10,
                },

                craft_bag_0: {
                    resource_rope: 20,
                },

                craft_bag_1: {
                    resource_rope: 100,
                },

                craft_bag_2: {
                    resource_rope: 100,
                    resource_herbs: 10,
                },

                craft_bag_5: {
                    resource_rope: 100,
                    resource_herbs: 10,
                    resource_fuel: 10,
                },

                unlock_item_clothing5l: {
                    rumours: 24882,
                },

                upgrade_building_apothecary: {
					evidence: 117,
					favour: 180,
                },

                unlock_item_clothing8: {
                    rumours: 14779,
                },

                unlock_building_ceiling: {
                	rumours: 8868,
                	evidence: 129,
                },

                improve_building_market3: {
					rumours: 25976,
					evidence: 127,
					favour: 296,
                },

                upgrade_building_cementmill: {
					evidence: 102,
                },

                unlock_building_researchcenter: {
					evidence: 76,
                },

                unlock_item_weapon7: {
					rumours: 31171,
					evidence: 153,
                },

                upgrade_building_hospital: {
					rumours: 11040,
                },

                unlock_item_clothing7: {
					rumours: 12988,
                },

                unlock_item_weapon6: {
					evidence: 99,
                },

                unlock_building_radio: {
					rumours: 12988,
					evidence: 117,
                },

				unlock_item_clothing4he: {
					rumours: 2893,
					favour: 11,
				},

                upgrade_building_shrine: {
					rumours: 10105,
					favour: 76,
                },

                unlock_item_bag3: {
					rumours: 7579,
                },

                upgrade_worker_chemist: {
					evidence: 322,
					favour: 76,
                },

                unlock_item_clothing6: {
					rumours: 10105,
                },

                unlock_item_clothing3h: {
					rumours: 5071,
                },

                unlock_building_cementmill: {
					evidence: 92,
                },

                unlock_item_weapon5: {
					rumours: 3803,
					evidence: 69,
                },

                upgrade_building_storage2: {
					rumours: 5071,
					evidence: 92,
                },

                upgrade_building_fortifications: {
					rumours: 5071,
                },

                unlock_building_apothecary: {
					favour: 91,
                },

                unlock_building_aqueduct: {
					evidence: 104,
                },

                unlock_item_clothing4: {
					evidence: 87,
                },

                upgrade_building_library2: {
					rumours: 10504,
					evidence: 87,
                },

                unlock_building_barracks: {
					rumours: 2314,
					favour: 9,
                },

                upgrade_worker_trapper: {
					favour: 9,
                },

                upgrade_building_campfire: {
					rumours: 2314,
					evidence: 178,
					favour: 9,
                },

                upgrade_building_inn: {
					rumours: 2314,
					favour: 9,
                },

                upgrade_building_market2: {
					rumours: 1139,
                },

                unlock_item_weapon4: {
					evidence: 162,
                },

                unlock_item_clothing3: {
					rumours: 912,
                },

				upgrade_outgoing_caravans: {
					rumours: 855,
					favour: 58,
				},

                unlock_item_clothing5: {
					rumours: 481,
                },

                unlock_building_bridge: {
					evidence: 171,
                },

                unlock_building_spaceship1: {
                	rumours: 14779,
                	evidence: 215,
                },

                unlock_building_spaceship2: {
        			rumours: 17735,
        			evidence: 258,
                },

                unlock_building_spaceship3: {
					rumours: 17735,
					evidence: 258,
                },

                upgrade_building_storage1: {
					evidence: 96,
                },

                unlock_item_firstaid: {
                   rumours: 577,
                },

                unlock_item_clothing4h: {
                	rumours: 481,
                	evidence: 64,
                },

                upgrade_building_market: {
					rumours: 278,
                },

                unlock_building_smithy: {
                    evidence: 64,
                },

                upgrade_worker_collector1: {
					rumours: 278,
                },

                unlock_building_house2: {
					rumours: 347,
					evidence: 80,
                },

                unlock_building_passage_elevator: {
					rumours: 278,
					evidence: 64,
                },

                unlock_item_bag2: {
					rumours: 184,
                },

                upgrade_building_library: {
					rumours: 245,
                },

                unlock_item_weapon2: {
                	rumours: 110,
                	evidence: 55,
                },

                unlock_building_passage_hole: {
					evidence: 80,
                },

                upgrade_worker_scavenger: {
                	rumours: 110,
                	evidence: 55,
                },

				unlock_outgoing_caravans: {
					rumours: 110,
				},

                unlock_building_library: {
					rumours: 24,
                },

                unlock_building_inn: {
                	rumours: 32,
                	evidence: 84,
                },

                unlock_building_lights: {
                    evidence: 69,
                },

                unlock_building_market: {
					rumours: 32,
                },

                unlock_building_fortifications: {
					rumours: 24,
					evidence: 63,
                },

                unlock_clothing_warm: {
					evidence: 79,
                },

                unlock_building_darkfarm: {
					rumours: 29,
                },

                unlock_building_tradingpost: {
					rumours: 12,
					evidence: 40,
                },

                unlock_item_clothing2: {
					evidence: 17,
                },

                unlock_building_passage_staircase: {
					evidence: 26,
                },

                unlock_building_hospital: {
					evidence: 12,
                },

                unlock_worker_rope: {
					rumours: 4,
                },

                unlock_item_shoe1: {
					rumours: 6,
                },

            },

            cooldowns: {
                scavenge: 10,
                use_spring: 30,
                use_in_campfire: 60,
                use_in_home: 180,
                scout_locale_i: 60,
                scout_locale_u: 60,
                clear_workshop: 60,
                fight_gang: 60,
                send_caravan: 60 * 10,
                use_in_inn: 60 * 30,
                despair: 60,
                nap: 120,
            },

            durations: {
                use_in_hospital: 60 * 3,
                use_in_campfire: 5,
                use_in_home: 60,
                send_caravan: 60 * 10
            },

            // [ base-value, vision-dependent-value ]
            randomEncounterProbabilities: {
                scavenge: [0.01, 0.01],
                scout_locale_i: [0.2, 0.1],
                scout_locale_u: [0.1, 0.1],
                use_spring: [0.1, 0.1],
                clear_workshop: [1, 0],
                clear_waste: [0.1, 0.1],
                fight_gang: [1, 0],
                nap: [0.1, 0]
            },

            // [ base-value, vision-dependent-value ]
            injuryProbabilities: {
                scout: [0.005, 0.01],
                scavenge: [0.001, 0.005],
                despair: [0.75, 0], // TODO make dynamic and link to cases in FaintingSystem
            },

            loseInventoryProbabilities: {
                scout: [0, 0.01],
                scavenge: [0, 0.01],
                despair: [0.75, 0], // TODO make dynamic and link to cases in FaintingSystem
            },

            descriptions: {
                build_in_home: "Set up camp.",
                scout: "Scout the area for evidence.",
                scout_locale_i: "Find out if there is anyone living here.",
                scout_locale_u: "Scout for additional resources and evidence.",
                scavenge: "Look for resources.",
                investigate: "Look for resources.",
                clear_workshop: "Scout the workshop to see if it can be used.",
                clear_waste: "Clear the pollution.",
                enter_camp: "Rest and manage camp.",
                use_spring: "Get water.",
                fight_gang: "Clear the enemies blocking passage.",
                send_caravan: "Send caravan out.",
                trade_with_caravan: "Confirm trade.",
                move_camp_level: "Shortcut back to the nearest camp.",
                move_camp_global: "Shortcut to the camp on this level.",
                create_blueprint: "Combine pieces to a blueprint.",
                flee: "Abandon what you were doing and run.",
                nap: "Sleep rough and regain a bit of stamina.",
                despair: "Give up. Stop moving. Rest.",
                build_out_collector_food: "Accumulates food.",
                build_out_collector_water: "Accumulates water.",
                build_out_camp: "A place to rest.",
                build_in_house: "A place for " + CampConstants.POPULATION_PER_HOUSE + " people to stay.",
                build_in_house2: "Houses " + CampConstants.POPULATION_PER_HOUSE2 + " people.",
                build_in_storage: "Increases resource storage.",
                build_in_generator: "Increases reputation bonus from housing (" + CampConstants.REPUTATION_PER_HOUSE_FROM_GENERATOR + "% per house)",
                build_in_campfire: "Increases rumour generation and unlocks upgrades.",
                build_in_library: "Accumulate and store more evidence.",
                build_in_hospital: "Enables healing injuries.",
                build_in_hospital2: "Improve your general health.",
                build_in_inn: "Increases rumours and enables recruitment.",
                build_in_darkfarm: "Produces food",
                build_in_square: "A place to relax and socialize.",
                build_in_garden: "A dash of beauty in the concrete desert.",
                build_in_tradingPost: "Connect camps to a trade network.",
                build_in_market: "Enables foreign traders to visit.",
                build_in_barracks: "Allows 10 soldiers.",
                build_in_lights: "Keep the darkness at bay for good.",
                build_in_smithy: "Workspace for toolsmiths.",
                build_in_aqueduct: "Water infrastructure to improve collecting efficiency.",
                build_in_stable: "Space to set up a trading caravan.",
                build_in_fortification: "Camp defences: +" + CampConstants.FORTIFICATION_1_DEFENCE,
                build_in_fortification2: "Camp defences: +" + CampConstants.FORTIFICATION_2_DEFENCE,
                use_in_home: "Recover stamina.",
                use_in_campfire: "Collect rumours from the population.",
                use_in_hospital: "Heal injuries.",
                use_in_inn: "Recruit followers.",
                use_item_glowstick_1: "Create a temporary light in this location.",
                use_out_collector_food: "Collect accumulated food.",
                use_out_collector_water: "Collect accumulated water.",
                leave_camp: "Venture out into the corridors.",
                launch: "Leave this planet and launch for the great unknown."
            },

            // overrides for rules defined in isLocationAction
            location_actions: {
                use_in_hospital: false,
                use_in_hospital2: false,
                use_in_home: false,
                use_in_inn_cancel: false,
                scavenge: true,
                scout: true,
                investigate: true,
                clear_workshop: true,
                despair: true,
            },

            UNAVAILABLE_REASON_LOCKED_RESOURCES: "Requires undiscovered resources.",
            UNAVAILABLE_REASON_BAG_FULL: "Bag full.",
            DISABLED_REASON_NOT_ENOUGH_LEVEL_POP: "Not enough people on this level.",

            getCostSource: function (action) {
                var rawSource = this.costs[action].cost_source;
                if (rawSource) return rawSource;
                return COST_SOURCE_DEFAULT;
            },

            getCooldown: function (action) {
                var speed = this.isExplorationAction(action) ? GameConstants.gameSpeedExploration : GameConstants.gameSpeedCamp;
                if (this.cooldowns[action]) {
                    return this.cooldowns[action] / speed;
                }
                return 0;
            },

            getDuration: function (baseActionID) {
                var speed = this.isExplorationAction(baseActionID) ? GameConstants.gameSpeedExploration : GameConstants.gameSpeedCamp;
                // TODO make send_caravan duration dependent on the trade partner's location
                if (this.durations[baseActionID]) {
                    return this.durations[baseActionID] / speed;
                }
                return 0;
            },

            getRandomEncounterProbability: function (baseActionID, vision) {
                if (vision === undefined) vision = 100;
                // TODO for locales get probability based on locale type - for trading partners no encounters!
                if (this.randomEncounterProbabilities[baseActionID]) {
                    var baseProbability = this.randomEncounterProbabilities[baseActionID][0];
                    var visionFactor = Math.pow(1 - (vision / 100), 2);
                    var visionProbability = this.randomEncounterProbabilities[baseActionID][1] * visionFactor;
                    return baseProbability + visionProbability;
                }
                return 0;
            },

            getInjuryProbability: function (action, vision) {
                if (vision === undefined) vision = 100;
                if (this.injuryProbabilities[action]) {
                    var baseProbability = this.injuryProbabilities[action][0];
                    var visionFactor = Math.pow(1 - (vision / 100), 2);
                    var visionProbability = this.injuryProbabilities[action][1] * visionFactor;
                    return baseProbability + visionProbability;
                }
                return 0;
            },

            getLoseInventoryProbability: function (action, vision) {
                if (vision === undefined) vision = 100;
                if (this.loseInventoryProbabilities[action]) {
                    var baseProbability = this.loseInventoryProbabilities[action][0];
                    var visionFactor = Math.pow(1 - (vision / 100), 2);
                    var visionProbability = this.loseInventoryProbabilities[action][1] * visionFactor;
                    return baseProbability + visionProbability;
                }
                return 0;
            },

            isExplorationAction: function (action) {
                switch (action) {
                    case "scavenge":
                    case "use_spring":
                    case "scout_locale_i":
                    case "scout_locale_u":
                    case "clear_workshop":
                    case "clear_waste":
                    case "fight_gang":
                        return true;
                    default:
                        return false;
                }
            },

            isLocationAction: function (action) {
                if (!action) return false;
                if (typeof this.location_actions[action] !== "undefined") {
                    return this.location_actions[action];
                }
                if (action.indexOf("build_in_") === 0) return true;
                if (action.indexOf("build_out_") === 0) return true;
                if (action.indexOf("use_in_") === 0) return true;
                if (action.indexOf("use_out_") === 0) return true;
                return false;
            },

            // defines if the action (with duration) marks the player as "busy" or if it can happen in the background
            isBusyAction: function (baseActionID) {
                switch (baseActionID) {
                    case "send_caravan":
                        return false;
                    default:
                        return true;
                }
            }

        };

    return PlayerActionConstants;

});
