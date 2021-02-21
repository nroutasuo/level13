// Costs, requirements, descriptions, and cooldowns for all player actions plus some related helper functions
define(['ash',
    'game/constants/GameConstants',
    'game/constants/CampConstants',
    'game/constants/ImprovementConstants',
],
function (Ash, GameConstants, CampConstants, ImprovementConstants) {

    var PlayerActionConstants = {

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
                    busy: false,
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

                clear_waste_t: {
                    vision: [50, -1],
                    health: 80,
                    sector: {
                        scouted: true,
                    },
                    busy: false,
                    upgrades: {
                        unlock_action_clear_waste_t: true,
                    }
                },

                clear_waste_r: {
                    vision: [50, -1],
                    health: 100,
                    sector: {
                        scouted: true,
                    },
                    busy: false,
                    upgrades: {
                        unlock_action_clear_waste_r: true,
                    }
                },
                
                clear_debris: {
                    sector: {
                        scouted: true,
                        acessible_to_workers: true,
                    },
                },

                bridge_gap: {
                    upgrades: {
                        unlock_building_bridge: true,
                    }
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
                    vision: [50, -1],
                    health: 70,
                },
                
                nap: {
                    sector: {
                        hasCamp: false,
                        scouted: true,
                        hazards: {
                            poison: [0, 1],
                            radiation: [0, 1]
                        }
                    },
                    excursion: {
                        numNaps: [0, 1],
                    },
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
                        blockerNORTH: false,
                    },
                    busy: false,
                    inCamp: false,
                },

                move_sector_south: {
                    vision: [5, -1],
                    sector: {
                        blockerSOUTH: false,
                    },
                    busy: false,
                    inCamp: false,
                },

                move_sector_east: {
                    vision: [5, -1],
                    sector: {
                        blockerEAST: false,
                    },
                    busy: false,
                    inCamp: false,
                },

                move_sector_west: {
                    vision: [5, -1],
                    sector: {
                        blockerWEST: false,
                    },
                    busy: false,
                    inCamp: false,
                },

                move_sector_ne: {
                    vision: [5, -1],
                    sector: {
                        blockerNE: false,
                    },
                    busy: false,
                    inCamp: false,
                },

                move_sector_se: {
                    vision: [5 -1],
                    sector: {
                        blockerSE: false,
                    },
                    busy: false,
                    inCamp: false,
                },

                move_sector_sw: {
                    vision: [5, -1],
                    sector: {
                        blockerSW: false,
                    },
                    busy: false,
                    inCamp: false,
                },

                move_sector_nw: {
                    vision: [5, -1],
                    sector: {
                        blockerNW: false,
                    },
                    busy: false,
                    inCamp: false,
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
                    busy: false,
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
                    improvements: {
                        collector_food:  [-1, 1],
                    },
                    sector: {
                        collectable_food: true,
                        scouted: true,
                        hazards: {
                            radiation: [0, 1]
                        }
                    }
                },

                build_out_collector_water: {
                    vision: [30, -1],
                    improvements: {
                        collector_water: [-1, 1],
                    },
                    sector: {
                        collectable_water: true,
                        scouted: true,
                        hazards: {
                            radiation: [0, 1]
                        }
                    }
                },
                
                build_out_beacon: {
                    vision: [30, -1],
                    improvements: {
                        beacon: [-1, 1],
                    },
                    improvementsOnLevel: {
                        beacon: [-1, 3],
                    },
                    sector: {
                        scouted: true,
                        hazards: {
                            poison: [0, 1],
                            radiation: [0, 1]
                        },
                        buildingDensity: [2, 8]
                    },
                    upgrades: {
                        unlock_building_beacon: true,
                    }
                },
                
                build_out_greenhouse: {
                    upgrades: {
                        unlock_building_greenhouse: true,
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

                use_out_collector_food_one: {
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

                use_out_collector_water_one: {
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

                use_in_home: {
                    maxStamina: false,
                    busy: false,
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
                    }
                },
                
                improve_in_campfire: {
                    improvements: {
                        camp: [1, -1],
                        campfire: [1, -1],
                    },
                    population: [1, -1],
                },

                use_in_campfire: {
                    rumourpoolchecked: false,
                    population: [1, -1],
                    busy: false,
                },

                build_in_darkfarm: {
                    improvements: {
                        campfire: [1, -1],
                        storage: [1, -1],
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
                
                improve_in_square: {
                    improvements: {
                        camp: [1, -1],
                        square: [1, -1],
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

                build_in_tradepost: {
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
                
                improve_in_market: {
                    improvements: {
                        camp: [1, -1],
                        market: [1, -1],
                    }
                },
                
                use_in_market: {
                    improvements: {
                        market: [1, -1],
                    },
                    busy: false,
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
                
                improve_in_library: {
                    improvements: {
                        camp: [1, -1],
                        library: [1, -1],
                    }
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
                        house: [2, -1],
                        campfire: [1, -1],
                    }
                },
                
                improve_in_generator: {
                    improvements: {
                        camp: [1, -1],
                        generator: [1, -1],
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
                    improvements: {
                        ceiling: [-1, 1],
                    },
                    upgrades: {
                        unlock_building_ceiling: true,
                    },
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
                    improvements: {
                        barracks: [-1, 10],
                    },
                    upgrades: {
                        unlock_building_barracks: true,
                    }
                },

                build_in_apothecary: {
                    improvements: {
                        house: [2, -1],
                        apothecary: [-1, 10],
                    },
                    upgrades: {
                        unlock_building_apothecary: true,
                    }
                },
                
                improve_in_apothecary: {
                    improvements: {
                        camp: [1, -1],
                        apothecary: [1, -1],
                    }
                    
                },

                build_in_smithy: {
                    improvements: {
                        house: [2, -1],
                        smithy: [-1, 10],
                    },
                    upgrades: {
                        unlock_building_smithy: true,
                    },
                    population: [9, -1],
                },
                
                improve_in_smithy: {
                    improvements: {
                        camp: [1, -1],
                        smithy: [1, -1],
                    }
                },

                build_in_cementmill: {
                    improvements: {
                        house: [2, -1],
                        cementmill: [-1, 10],
                    },
                    upgrades: {
                        unlock_building_cementmill: true,
                    },
                    population: [9, -1],
                },
                
                improve_in_cementmill: {
                    improvements: {
                        camp: [1, -1],
                        cementmill: [1, -1],
                    }
                },

                build_in_researchcenter: {
                    improvements: {
                        library: [1, -1],
                        researchcenter: [-1, 1],
                    },
                    upgrades: {
                        unlock_building_researchcenter: true,
                    }
                },

                build_in_radiotower: {
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
                    improvements: {
                        house: [1, -1],
                        storage: [1, -1],
                        shrine: [-1, 1],
                    },
                },

                use_in_shrine: {
                    busy: false,
                },
                
                build_in_temple: {
                    deity: true,
                    improvements: {
                        house: [2, -1],
                        storage: [2, -1],
                        temple: [0, 1]
                    },
                },

                use_in_temple: {
                    busy: false,
                },
                
                craft_clothing_over_6: {
                	upgrades: {
                		unlock_item_clothing8: true
                	}
                },
                craft_weapon8: {
                	upgrades: {
                		unlock_item_weapon8: true
                	}
                },
                craft_clothing_lower_45: {
                	upgrades: {
                		unlock_building_spaceship3: true
                	}
                },
                craft_clothing_upper_45: {
                	upgrades: {
                		unlock_building_spaceship3: true
                	}
                },
                craft_bag_4: {
                	upgrades: {
                		unlock_item_bag_4: true
                	}
                },
                craft_weapon7: {
                	upgrades: {
                		unlock_item_weapon7: true
                	}
                },
                craft_clothing_head_5: {
                	upgrades: {
                		unlock_item_clothing_head_5: true
                	}
                },
                craft_weapon6: {
                	upgrades: {
                		unlock_item_weapon6: true
                	}
                },
                craft_first_aid_kit_2: {
                	upgrades: {
                		upgrade_building_hospital: true
                	}
                },
                craft_clothing_lower_45: {
                	upgrades: {
                		unlock_itemclothing_lower_45: true
                	}
                },
                craft_clothing_upper_45: {
                	upgrades: {
                		unlock_itemclothing_lower_45: true
                	}
                },
                craft_weapon58: {
                	upgrades: {
                		unlock_item_weapon58: true
                	}
                },
                craft_clothing_hands_4: {
                	upgrades: {
                		unlock_item_scavenger_gear: true
                	}
                },
                craft_clothing_head_45: {
                	upgrades: {
                		unlock_item_scavenger_gear: true
                	}
                },
                craft_clothing_over_45: {
                	upgrades: {
                		unlock_item_scavenger_gear: true
                	}
                },
                craft_glowstick_1: {
                	upgrades: {
                		unlock_building_apothecary: true
                	}
                },
                craft_consumable_weapon_1: {
                    upgrades: {
                        upgrade_worker_scavenger: true,
                    }
                },
                
                craft_flee_1: {
                    upgrades: {
                        unlock_building_darkfarm: true,
                    }
                },
                craft_weapon52: {
                	upgrades: {
                		unlock_item_weapon52: true
                	}
                },
                craft_clothing_upper_4: {
                	upgrades: {
                		unlock_item_clothing6: true
                	}
                },
                craft_clothing_lower_4: {
                	upgrades: {
                		unlock_item_clothing6: true
                	}
                },
                craft_clothing_hands_3: {
                	upgrades: {
                		unlock_item_clothing3h: true
                	}
                },
                craft_clothing_head_4: {
                	upgrades: {
                		unlock_item_clothing4he: true
                	}
                },
                craft_bag_3: {
                	upgrades: {
                		unlock_item_bag3: true
                	}
                },
                craft_weapon5: {
                	upgrades: {
                		unlock_item_weapon5: true
                	}
                },
                craft_clothing_over_4: {
                	upgrades: {
                		unlock_item_clothing4: true
                	}
                },
                craft_weapon4: {
                	upgrades: {
                		unlock_item_weapon4: true
                	}
                },
                craft_clothing_over_3: {
                	upgrades: {
                		unlock_item_clothing5: true
                	}
                },
                craft_clothing_head_3: {
                	upgrades: {
                		unlock_item_clothing5: true
                	}
                },
                craft_clothing_upper_3: {
                	upgrades: {
                		unlock_item_clothing3: true
                	}
                },
                craft_shoe_l14: {
                	upgrades: {
                		unlock_action_clear_waste_r: true
                	}
                },
                craft_clothing_lower_3: {
                	upgrades: {
                		unlock_item_clothing3: true
                	}
                },
                craft_clothing_hands_25: {
                	upgrades: {
                		unlock_item_clothing_hands_25: true
                	}
                },
                craft_clothing_hands_l14: {
                	upgrades: {
                		unlock_item_clothingl14: true
                	}
                },
                craft_clothing_head_l14: {
                	upgrades: {
                		unlock_item_clothingl14: true
                	}
                },
                craft_clothing_over_l14: {
                	upgrades: {
                		unlock_item_clothingl14: true
                	}
                },
                craft_weapon3: {
                	upgrades: {
                		unlock_item_weapon3: true
                	}
                },
                craft_bag_2: {
                	upgrades: {
                		unlock_item_bag22: true
                	}
                },
                craft_first_aid_kit_1: {
                	upgrades: {
                		unlock_item_firstaid: true
                	}
                },
                craft_clothing_hands_2: {
                	upgrades: {
                		unlock_item_clothing4h: true
                	}
                },
                craft_weapon25: {
                	upgrades: {
                		unlock_item_weapon25: true
                	}
                },
                craft_light2: {
                	upgrades: {
                		unlock_building_lights: true
                	}
                },
                craft_weapon2: {
                	upgrades: {
                		unlock_item_weapon2: true
                	}
                },
                
                craft_bag_1: {
                	upgrades: {
                		unlock_item_bag2: true
                	}
                },
                craft_clothing_hands_12: {
                	upgrades: {
                		unlock_item_bag2: true
                	}
                },
                craft_weapon12: {
                	upgrades: {
                		unlock_weapon_15: true
                	}
                },
                craft_clothing_lower_15: {
                	upgrades: {
                		unlock_clothing_basic: true
                	}
                },
                craft_clothing_upper_15: {
                	upgrades: {
                		unlock_clothing_basic: true
                	}
                },
                craft_clothing_hands_1: {
                	upgrades: {
                		unlock_clothing_warm: true
                	}
                },
                craft_clothing_head_1: {
                	upgrades: {
                		unlock_clothing_warm: true
                	}
                },
                craft_clothing_over_1: {
                	upgrades: {
                		unlock_item_clothing2: true
                	}
                },
                craft_clothing_over_15: {
                	upgrades: {
                		unlock_item_bag2: true
                	}
                },
                craft_clothing_over_w: {
                	upgrades: {
                		unlock_item_clothing4h: true
                	}
                },
                craft_clothing_upper_5: {
                	upgrades: {
                		unlock_item_clothing5l: true
                	}
                },
                craft_clothing_lower_5: {
                	upgrades: {
                		unlock_item_clothing5l: true
                	}
                },
                craft_shoe_1: {
                	upgrades: {
                		unlock_item_shoe1: true
                	}
                },
                craft_bag_0: {
                	upgrades: {
                		unlock_item_shoe1: true
                	}
                },
                craft_exploration_1: {
                },

                use_item_glowstick_1: {
                    vision: [0, 30],
                },

                use_item_first_aid_kit_1: {
                    busy: false,
                    perks: {
                        Injury: [0.6, 0.99, true],
                    }
                },

                use_item_first_aid_kit_2: {
                    busy: false,
                    perks: {
                        Injury: [0.05, 0.99, true],
                    },
                },
                
                use_item_fight_consumable_weapon_1: {
                    uses_in_fight: {
                        consumable_weapon_1: [-1, 1],
                    },
                },
                
                use_item_fight_glowstick_1: {
                    uses_in_fight: {
                        glowstick_1: [-1, 1],
                    },
                },
                
                use_item_cache_metal_1: {
                    inCamp: true,
                },
                
                use_item_cache_metal_2: {
                    inCamp: true,
                },
                
                use_item_stamina_potion_1: {
                    inCamp: false,
                },

                create_blueprint: {
                    inCamp: true,
                },
                
                unlock_item_clothing5l: {
                	blueprint: 15,
                	upgrades: {
                		unlock_item_scavenger_gear: true,
                	}
                },

                unlock_item_clothing8: {
                	blueprint: 15,
                	upgrades: {
                		unlock_item_scavenger_gear: true,
                	}
                },

                unlock_item_weapon8: {
                	blueprint: 15,
                	upgrades: {
                		unlock_item_weapon6: true,
                	}
                },

                unlock_building_ceiling: {
                	blueprint: 15,
                	upgrades: {
                		upgrade_building_library2: true,
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

                unlock_item_bag_4: {
                	blueprint: 14,
                	upgrades: {
                		unlock_item_bag3: true,
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
                	blueprint: 14,
                	upgrades: {
                		unlock_item_firstaid: true,
                	}
                },

                upgrade_building_apothecary: {
                	blueprint: 13,
                	upgrades: {
                		upgrade_building_library2: true,
                	}
                },

                unlock_item_weapon6: {
                	blueprint: 13,
                },

                unlock_building_radio: {
                	blueprint: 13,
                },

                unlock_itemclothing_lower_45: {
                	blueprint: 13,
                	upgrades: {
                		unlock_item_scavenger_gear: true,
                	}
                },

                unlock_item_clothing_head_5: {
                	upgrades: {
                		unlock_itemclothing_lower_45: true,
                	}
                },

                upgrade_building_temple3: {
                	upgrades: {
                		upgrade_building_temple2: true,
                	}
                },

                unlock_item_weapon58: {
                	blueprint: 12,
                	upgrades: {
                		unlock_item_weapon5: true,
                	}
                },

                unlock_item_scavenger_gear: {
                	blueprint: 12,
                	upgrades: {
                		upgrade_worker_chemist: true,
                	}
                },

                upgrade_worker_chemist: {
                	blueprint: 12,
                	upgrades: {
                		upgrade_building_library2: true,
                	}
                },

                upgrade_building_shrine: {
                	upgrades: {
                		unlock_building_apothecary: true,
                	}
                },

                unlock_item_weapon52: {
                	blueprint: 11,
                },

                unlock_item_clothing6: {
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

                unlock_item_clothing3h: {
                	upgrades: {
                		unlock_item_bag3: true,
                	}
                },

                unlock_item_clothing4he: {
                	blueprint: 11,
                },

                unlock_item_bag3: {
                	blueprint: 10,
                },

                unlock_item_weapon5: {
                	blueprint: 10,
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

                unlock_building_apothecary: {
                	upgrades: {
                		unlock_building_greenhouse: true,
                	}
                },

                upgrade_building_temple2: {
                	upgrades: {
                		upgrade_building_inn: true,
                	}
                },

                upgrade_worker_trapper: {
                	blueprint: 9,
                },

                unlock_building_barracks: {
                	upgrades: {
                		unlock_building_house2: true,
                	}
                },

                upgrade_building_campfire: {
                	blueprint: 9,
                },

                upgrade_building_inn: {
                	upgrades: {
                		upgrade_building_campfire: true,
                	}
                },

                upgrade_building_market2: {
                	blueprint: 9,
                	upgrades: {
                		upgrade_building_market: true,
                	}
                },

                unlock_item_clothingl14: {
                	blueprint: 8,
                	upgrades: {
                		upgrade_building_storage1: true,
                	}
                },

                unlock_item_weapon4: {
                	blueprint: 8,
                	upgrades: {
                		unlock_building_smithy: true,
                	}
                },

                unlock_item_clothing5: {
                	blueprint: 8,
                	upgrades: {
                		unlock_building_smithy: true,
                	}
                },

                unlock_item_clothing3: {
                	blueprint: 8,
                	upgrades: {
                		unlock_building_passage_hole: true,
                	}
                },

                unlock_action_clear_waste_r: {
                	blueprint: 8,
                	upgrades: {
                		upgrade_building_library: true,
                	}
                },

                unlock_building_greenhouse: {
                	upgrades: {
                		upgrade_worker_collector1: true,
                	}
                },

                upgrade_outgoing_caravans: {
                	upgrades: {
                		unlock_outgoing_caravans: true,
                	}
                },

                unlock_item_clothing_hands_25: {
                	upgrades: {
                		unlock_item_bag22: true,
                	}
                },

                upgrade_building_storage1: {
                	blueprint: 7,
                },

                unlock_building_passage_hole: {
                	blueprint: 7,
                	upgrades: {
                		unlock_building_passage_staircase: true,
                	}
                },

                unlock_building_house2: {
                	blueprint: 7,
                	upgrades: {
                		unlock_building_passage_elevator: true,
                	}
                },

                unlock_building_smithy: {
                	blueprint: 7,
                	upgrades: {
                		upgrade_building_library: true,
                	}
                },

                unlock_action_clear_waste_t: {
                	blueprint: 6,
                	upgrades: {
                		upgrade_building_library: true,
                	}
                },

                unlock_item_bag22: {
                	blueprint: 6,
                	upgrades: {
                		unlock_item_shoe1: true,
                	}
                },

                unlock_item_weapon3: {
                	blueprint: 6,
                },

                unlock_item_firstaid: {
                	upgrades: {
                		upgrade_worker_collector1: true,
                	}
                },

                upgrade_worker_collector1: {
                	blueprint: 6,
                	upgrades: {
                		unlock_item_shoe1: true,
                	}
                },

                unlock_building_cementmill: {
                	blueprint: 6,
                	upgrades: {
                		upgrade_building_library: true,
                	}
                },

                upgrade_building_market: {
                	blueprint: 5,
                	upgrades: {
                		unlock_building_market: true,
                	}
                },

                unlock_item_clothing4h: {
                	blueprint: 5,
                	upgrades: {
                		unlock_clothing_basic: true,
                	}
                },

                unlock_building_passage_elevator: {
                	blueprint: 5,
                	upgrades: {
                		unlock_building_passage_staircase: true,
                	}
                },

                unlock_building_lights: {
                	blueprint: 5,
                	upgrades: {
                		unlock_building_darkfarm: true,
                	}
                },

                unlock_item_weapon25: {
                	upgrades: {
                		unlock_item_weapon2: true,
                	}
                },

                upgrade_building_library: {
                	blueprint: 5,
                	upgrades: {
                		unlock_building_library: true,
                	}
                },

                unlock_building_beacon: {
                	blueprint: 4,
                	upgrades: {
                		unlock_building_tradingpost: true,
                	}
                },

                unlock_building_bridge: {
                	blueprint: 4,
                	upgrades: {
                		unlock_building_passage_staircase: true,
                	}
                },

                unlock_item_weapon2: {
                	blueprint: 4,
                	upgrades: {
                		unlock_weapon_15: true,
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

                unlock_item_bag2: {
                	upgrades: {
                		unlock_clothing_warm: true,
                	}
                },

                unlock_weapon_15: {
                	blueprint: 2,
                	upgrades: {
                		unlock_item_shoe1: true,
                	}
                },

                unlock_clothing_basic: {
                	upgrades: {
                		unlock_item_shoe1: true,
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
                	upgrades: {
                		unlock_building_tradingpost: true,
                	}
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
                	blueprint: 1,
                },

            },

            // structure: resource: cost
            // cost can be a simple number (baseCost) or a table with the following values
            // [baseCost, linearScale, e1Scale, e2Scale, requiredOrdinal]
            // additional keys: cost_factor_e1_base, cost_factor_e2_exp
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

                clear_waste_t: {
                    stamina: 50,
                },

                clear_waste_r: {
                    stamina: 50,
                },

                use_spring: {
                    stamina: 1,
                },

                fight_gang: {
                    stamina: 10,
                },
                
                nap: {
                    resource_food: 1,
                    resource_water: 1,
                },

                move_level_up: {
                    stamina: 30,
                    resource_food: 1,
                    resource_water: 1,
                },

                move_level_down: {
                    stamina: 30,
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

                build_out_spaceship1: {
                    resource_metal: 20000,
                    resource_rope: 3000,
                    resource_concrete: 10000,
                    resource_tools: 1000,
                    resource_rubber: 1000,
                },

                build_out_spaceship2: {
                    resource_metal: 10000,
                    resource_rope: 5000,
                    resource_concrete: 1000,
                    resource_tools: 2000,
                },

                build_out_spaceship3: {
                    resource_metal: 10000,
                    resource_rope: 5000,
                    resource_concrete: 1000,
                    resource_fuel: 800,
                    resource_medicine: 3000,
                    resource_tools: 1000,
                },

                build_out_passage_up_hole: {
                    resource_metal: [50, 100, 50, 5500, 0],
                    resource_concrete: 50,
                    cost_factor_e1_base: 1.295,
                    cost_factor_e2_exp: 2.3,
                },

                build_out_passage_up_stairs: {
                    resource_metal: [50, 100, 50, 5500, 0],
                    resource_rope: 10,
                    cost_factor_e1_base: 1.295,
                    cost_factor_e2_exp: 2.3,
                },

                build_out_passage_up_elevator: {
                    resource_metal: [50, 100, 50, 5500, 0],
                    resource_fuel: 10,
                    cost_factor_e1_base: 1.295,
                    cost_factor_e2_exp: 2.3,
                },

                build_out_passage_down_hole: {
                    resource_metal: [0, 100, 50, 500, 0],
                    resource_concrete: [50, 25, 0, 0, 0],
                    cost_factor_e1_base: 1.35,
                    cost_factor_e2_exp: 2.3,
                },

                build_out_passage_down_stairs: {
                    resource_metal: [0, 100, 50, 500, 0],
                    resource_rope: 10,
                    cost_factor_e1_base: 1.35,
                    cost_factor_e2_exp: 2.3,
                },

                build_out_passage_down_elevator: {
                    resource_metal: [0, 100, 50, 500, 0],
                    resource_fuel: [10, 10, 0, 0, 0],
                    cost_factor_e1_base: 1.35,
                    cost_factor_e2_exp: 2.3,
                },
                
                build_out_greenhouse: {
                    resource_metal: 300,
                    resource_fuel: 100,
                    resource_tools: 100,
                },

                build_out_collector_food: {
                    resource_metal: 8
                },

                build_out_collector_water: {
                    resource_metal: 8
                },

                build_out_beacon: {
                    resource_metal: 10,
                    resource_fuel: 1,
                },
                
                clear_debris_e: {
                    resource_rope: 30,
                },
                
                clear_debris_l: {
                    resource_rope: 50,
                },

                bridge_gap: {
                    resource_metal: 300,
                    resource_rope: 500,
                },

                build_in_house: {
                    resource_metal: 28,
                    cost_factor_e1_base: 2,
                },

                build_in_house2: {
                    resource_metal: 800,
                    resource_rope: 50,
                    resource_concrete: 100,
                    cost_factor_e1_base: 1.75,
                },

                build_in_generator: {
                    resource_metal: 100,
                    resource_rope: 100,
                    resource_fuel: 200
                },

                improve_in_generator: {
                    resource_metal: [0, 0, 20, 0, 0],
                    resource_fuel: [10, 3, 2, 0, 0],
                    resource_concrete: 50,
                    resource_fuel: 50,
                    cost_factor_e1_base: 1.5,
                },

                build_in_lights: {
                    resource_metal: 200,
                    resource_rope: 100,
                    resource_concrete: 50,
                    resource_fuel: 50,
                },

                build_in_ceiling: {
                    resource_rope: 1000,
                },

                build_in_storage: {
                    resource_metal: [0, 0, 50, 0, 0],
                    resource_rope: [5, 2, 2, 0, 2],
                    resource_concrete: [20, 2, 2, 0, 8],
                    cost_factor_e1_base: 1.75,
                    cost_factor_e1_base_outpost: 2.5,
                },

                build_in_campfire: {
                    resource_metal: 5,
                    resource_food: 10,
                    cost_factor_e1_base: 2,
                },

                improve_in_campfire: {
                    resource_metal: [2, 18, 10, 0, 0],
                    resource_rope: [5, 5, 0, 0, 2],
                    resource_food: 5,
                    cost_factor_e1_base: 2,
                },

                build_in_darkfarm: {
                    resource_metal: 50,
                    resource_water: 20,
                    resource_fuel: 5,
                    cost_factor_e1_base: 2,
                },

                build_in_square: {
                    resource_metal: 200,
                    resource_rope: 100,
                },
                
                improve_in_square: {
                    resource_metal: [0, 0, 80, 0, 0],
                    resource_rope: [0, 0, 20, 0, 0],
                    resource_tools: [0, 0, 10, 0, 2],
                    cost_factor_e1_base: 1.25,
                },

                build_in_garden: {
                    resource_metal: 100,
                    resource_water: 50,
                    resource_rope: 50,
                    cost_factor_e1_base: 3,
                },

                build_in_hospital: {
                    resource_metal: 120,
                    resource_rope: 30,
                },

                use_in_hospital: {
                    resource_water: 30,
                    resource_food: 50,
                },

                use_in_hospital2: {
                    resource_water: 100,
                    resource_food: 15,
                },

                build_in_tradepost: {
                    resource_metal: 72,
                },

                build_in_inn: {
                    resource_metal: 50,
                    resource_rope: 20,
                    resource_fuel: 20,
                },

                use_in_inn: {
                },

                use_in_inn_select: {
                    resource_food: 100,
                    resource_water: 15,
                    cost_factor_e1_base: 1.5,
                },

                build_in_market: {
                    resource_metal: 200,
                    resource_rope: 100,
                    cost_factor_e1_base: 1.5,
                },
                
                improve_in_market: {
                    resource_metal: [40, 50, 10, 0, 0],
                    resource_rope: [40, 50, 10, 0, 0],
                    cost_factor_e1_base: 1.5,
                },

                build_in_library: {
                    resource_metal: 200,
                    resource_rope: 150,
                    cost_factor_e1_base: 2,
                },

                improve_in_library: {
                    resource_metal: [55, 20, 10, 0, 0],
                    resource_rope: 50,
                    cost_factor_e1_base: 1.8,
                },

                build_in_fortification: {
                    resource_metal: 350,
                    resource_rope: 100,
                    cost_factor_e1_base: 1.5,
                },

                build_in_fortification2: {
                    resource_concrete: 100,
                    cost_factor_e1_base: 1.5,
                },

                build_in_aqueduct: {
                    resource_metal: 300,
                    resource_concrete: 50,
                    resource_rubber: 10,
                    cost_factor_e1_base: 2,
                },

                build_in_stable: {
                    resource_metal: 200,
                    resource_rope: 50,
                    resource_fuel: 30,
                    cost_factor_e1_base: 1.75,
                },

                build_in_barracks: {
                    resource_metal: 100,
                    resource_rope: 50,
                    resource_concrete: 200,
                    cost_factor_e1_base: 1.2,
                },

                build_in_apothecary: {
                    resource_metal: 100,
                    resource_rope: 50,
                    cost_factor_e1_base: 1.5,
                },
                
                improve_in_apothecary: {
                    resource_metal: [30, 0, 5, 0, 0],
                    resource_rope: [10, 0, 5, 0, 0],
                    resource_tools: 10,
                    cost_factor_e1_base: 2,
                },

                build_in_smithy: {
                    resource_metal: 200,
                    resource_rope: 50,
                    resource_fuel: 10,
                    cost_factor_e1_base: 1.5,
                },
                
                improve_in_smithy: {
                    resource_metal: [100, 0, 5, 0, 0],
                    resource_rope: [50, 0, 5, 0, 0],
                    resource_tools: 50,
                    cost_factor_e1_base: 2,
                },

                build_in_cementmill: {
                    resource_metal: 500,
                    resource_rope: 10,
                    resource_fuel: 10,
                    cost_factor_e1_base: 1.5,
                },
                
                improve_in_cementmill: {
                    resource_metal: [40, 0, 5, 0, 0],
                    resource_rope: [10, 0, 5, 0, 0],
                    resource_tools: 10,
                    cost_factor_e1_base: 2,
                },

                build_in_radiotower: {
                    resource_metal: 500,
                    resource_rope: 50,
                    cost_factor_e1_base: 1.5,
                },

                build_in_shrine: {
                    resource_food: 50,
                    resource_water: 50,
                    resource_metal: 100,
                },
                
                build_in_temple: {
                    resource_herbs: 50,
                    resource_food: 100,
                    resource_metal: 200,
                },
                
                improve_in_temple: {
                    resource_herbs: [50, 0, 5, 0, 0],
                    resource_metal: [50, 0, 5, 0, 0],
                    cost_factor_e1_base: 2,
                },

                use_in_temple: {
                    silver: 1,
                },

                build_in_researchcenter: {
                    resource_water: 200,
                    resource_metal: 1200,
                    resource_rope: 100,
                    resource_rubber: 100,
                },

                craft_light1: {
                    resource_metal: 7,
                },

                craft_light2: {
                    resource_metal: 50,
                    resource_fuel: 20,
                    item_res_hairpin: 2,
                    item_res_bottle: 1,
                },

                craft_exploration_1: {
                    resource_metal: 5,
                    item_res_hairpin: 1,
                },

                craft_first_aid_kit_1: {
                    item_res_bands: 3,
                    resource_water: 10,
                    resource_herbs: 10,
                    item_res_bottle: 1,
                },

                craft_first_aid_kit_2: {
                    item_res_bands: 5,
                    resource_water: 20,
                    resource_medicine: 10,
                    item_res_bottle: 3,
                },

                craft_glowstick_1: {
                    resource_fuel: 10,
                    item_res_tape: 2,
                    item_res_glowbug: 1,
                },
                
                craft_consumable_weapon_1: {
                    resource_metal: 10,
                    item_res_bands: 1,
                },
                
                craft_flee_1: {
                    resource_water: 5,
                    item_res_tape: 2,
                    item_res_bottle: 1,
                },

                craft_weapon1: {
                    resource_metal: 10,
                    resource_rope: 1,
                },

                craft_weapon12: {
                    resource_metal: 15,
                    resource_rope: 5,
                    item_res_bands: 2,
                },

                craft_weapon2: {
                    resource_metal: 20,
                    resource_rope: 10,
                    item_res_bands: 3,
                    item_res_tape: 3,
                },

                craft_weapon25: {
                    resource_metal: 50,
                    resource_rope: 10,
                    item_res_bands: 3,
                    item_res_tape: 5,
                },

                craft_weapon3: {
                    resource_metal: 100,
                    resource_rope: 10,
                    item_res_tape: 1,
                    item_res_bottle: 1,
                },

                craft_weapon4: {
                    resource_metal: 100,
                    resource_rope: 5,
                    resource_fuel: 5,
                    item_res_bands: 10,
                    item_res_hairpin: 3,
                },

                craft_weapon5: {
                    resource_metal: 200,
                    resource_tools: 20,
                    resource_fuel: 50,
                    item_res_bands: 10,
                    item_res_hairpin: 1,
                },
                
                craft_weapon52: {
                    resource_metal: 100,
                    item_res_leather: 2,
                    item_res_tape: 5,
                },
                
                craft_weapon58: {
                    resource_metal: 100,
                    resource_fuel: 10,
                    item_res_bands: 10,
                    item_res_hairpin: 1,
                },

                craft_weapon6: {
                    resource_metal: 300,
                    resource_tools: 50,
                    resource_fuel: 100,
                    item_res_bands: 20,
                    item_res_hairpin: 2,
                },

                craft_weapon7: {
                    resource_metal: 500,
                    resource_tools: 50,
                    resource_fuel: 100,
                    item_res_bands: 20,
                    item_res_tape: 5,
                },

                craft_weapon8: {
                    resource_metal: 300,
                    resource_tools: 50,
                    resource_fuel: 100,
                    item_res_bands: 20,
                    item_res_hairpin: 3,
                },

                craft_clothing_head_1: {
                    resource_rope: 10,
                    item_res_silk: 1,
                },

                craft_clothing_head_2: {
                    resource_rope: 50,
                    item_res_silk: 3,
                },

                craft_clothing_head_3: {
                    resource_metal: 60,
                    resource_rope: 10,
                    item_res_tape: 3,
                },
                
                craft_clothing_head_l14: {
                    resource_rubber: 10,
                    resource_fuel: 2,
                    item_res_bands: 5,
                },

                craft_clothing_head_4: {
                    item_res_bands: 6,
                    item_res_leather: 3,
                },

                craft_clothing_head_45: {
                    resource_rope: 50,
                    item_res_silk: 2,
                },

                craft_clothing_head_5: {
                    resource_metal: 20,
                    resource_rope: 20,
                    resource_tools: 10,
                    item_res_bands: 5,
                    item_res_silk: 10
                },

                craft_clothing_hands_1: {
                    resource_rope: 10,
                    item_res_silk: 1,
                },

                craft_clothing_hands_12: {
                    resource_rope: 10,
                    item_res_leather: 2,
                },

                craft_clothing_hands_2: {
                    resource_rope: 10,
                    item_res_leather: 3
                },

                craft_clothing_hands_25: {
                    resource_rope: 20,
                    item_res_leather: 3,
                    item_res_silk: 3,
                },
                
                craft_clothing_hands_l14: {
                    resource_rubber: 10,
                    item_res_leather: 1,
                    resource_tools: 10,
                    item_res_silk: 3,
                },

                craft_clothing_hands_3: {
                    resource_rope: 20,
                    item_res_leather: 3,
                    item_res_silk: 5,
                },

                craft_clothing_hands_4: {
                    resource_rope: 20,
                    item_res_tape: 5,
                    item_res_silk: 5,
                },

                craft_clothing_over_1: {
                    resource_rope: 10,
                    item_res_silk: 1
                },

                craft_clothing_over_15: {
                    resource_rope: 30,
                    item_res_leather: 5,
                },

                craft_clothing_over_3: {
                    resource_metal: 50,
                    item_res_tape: 1,
                    item_res_bands: 2,
                },

                craft_clothing_over_w: {
                    resource_rope: 20,
                    item_res_silk: 5
                },
                
                craft_clothing_over_l14: {
                    resource_rubber: 60,
                    item_res_silk: 2,
                    item_res_tape: 2,
                },

                craft_clothing_over_4: {
                    resource_metal: 10,
                    resource_rope: 10,
                    item_res_silk: 10,
                    item_res_bands: 3,
                },
                
                craft_clothing_over_45: {
                    resource_rope: 10,
                    item_res_silk: 10,
                    item_res_tape: 3,
                },

                craft_clothing_over_6: {
                    resource_metal: 100,
                    resource_rubber: 10,
                    item_res_silk: 10,
                },
                
                craft_clothing_lower_15: {
                    resource_rope: 10,
                    item_res_leather: 1,
                },

                craft_clothing_lower_2: {
                    resource_rope: 10,
                    item_res_bands: 1,
                },

                craft_clothing_lower_3: {
                    resource_rope: 20,
                    item_res_silk: 2,
                },

                craft_clothing_lower_4: {
                    resource_rope: 20,
                    item_res_silk: 5,
                    item_res_bands: 1,
                },

                craft_clothing_lower_45: {
                    resource_rope: 50,
                    item_res_silk: 3,
                    item_res_bands: 5,
                },

                craft_clothing_lower_5: {
                    resource_rope: 50,
                    item_res_silk: 10,
                },

                craft_clothing_upper_1: {
                    resource_rope: 5
                },
                
                craft_clothing_upper_15: {
                    resource_rope: 10,
                    item_res_silk: 1,
                },
                
                craft_clothing_upper_3: {
                    resource_rope: 30,
                    item_res_silk: 5,
                },

                craft_clothing_upper_4: {
                    resource_rope: 30,
                    item_res_silk: 10,
                },

                craft_clothing_upper_5: {
                    resource_rope: 5,
                    item_res_silk: 20
                },

                craft_shoe_1: {
                    resource_rope: 10,
                    item_res_tape: 2,
                    item_res_leather: 5,
                },
                
                craft_shoe_l14: {
                    resource_rubber: 20,
                    item_res_bands: 10
                },

                craft_bag_0: {
                    resource_rope: 20,
                    item_res_tape: 1,
                },

                craft_bag_1: {
                    resource_rope: 80,
                    item_res_leather: 5,
                },
                
                craft_bag_2: {
                    resource_rope: 100,
                    item_res_leather: 10,
                    item_res_bands: 5,
                },
                
                unlock_item_clothing5l: {
                	rumours: 19234,
                },

                unlock_item_clothing8: {
                	rumours: 20036,
                },

                unlock_item_weapon8: {
                	evidence: 107,
                	favour: 826,
                },

                unlock_building_ceiling: {
                	evidence: 80,
                	favour: 620,
                },

                unlock_building_spaceship1: {
                	rumours: 20036,
                	evidence: 133,
                },

                unlock_building_spaceship2: {
                	rumours: 24043,
                	evidence: 160,
                },

                unlock_building_spaceship3: {
                	rumours: 24043,
                	evidence: 160,
                },

                unlock_item_bag_4: {
                	evidence: 101,
                	favour: 538,
                },

                improve_building_market3: {
                	rumours: 14859,
                	evidence: 126,
                	favour: 673,
                },

                upgrade_building_cementmill: {
                	evidence: 101,
                },

                unlock_building_researchcenter: {
                	evidence: 75,
                },

                unlock_item_weapon7: {
                	rumours: 17831,
                	evidence: 151,
                },

                upgrade_building_hospital: {
                	rumours: 10104,
                },

                upgrade_building_apothecary: {
                	evidence: 147,
                	favour: 252,
                },

                unlock_item_weapon6: {
                	evidence: 125,
                },

                unlock_building_radio: {
                	rumours: 13750,
                	evidence: 147,
                },

                unlock_itemclothing_lower_45: {
                	rumours: 13750,
                	favour: 252,
                },

                unlock_item_clothing_head_5: {
                	favour: 189,
                },

                upgrade_building_temple3: {
                	favour: 252,
                },

                unlock_item_weapon58: {
                	evidence: 189,
                },

                unlock_item_scavenger_gear: {
                	rumours: 10416,
                },

                upgrade_worker_chemist: {
                	evidence: 142,
                	favour: 220,
                },

                upgrade_building_shrine: {
                	rumours: 8333,
                	favour: 234,
                },

                unlock_item_weapon52: {
                	evidence: 132,
                	favour: 121,
                },

                unlock_item_clothing6: {
                	rumours: 2898,
                },

                upgrade_building_storage2: {
                	rumours: 3221,
                	evidence: 132,
                },

                upgrade_building_fortifications: {
                	rumours: 3221,
                },

                unlock_item_clothing3h: {
                	rumours: 2898,
                	favour: 109,
                },

                unlock_item_clothing4he: {
                	evidence: 99,
                	favour: 91,
                },

                unlock_item_bag3: {
                	rumours: 1723,
                	evidence: 74,
                },

                unlock_item_weapon5: {
                	rumours: 2297,
                	evidence: 99,
                },

                unlock_building_aqueduct: {
                	rumours: 2757,
                	favour: 163,
                },

                unlock_item_clothing4: {
                	evidence: 99,
                },

                upgrade_building_library2: {
                	rumours: 2527,
                	evidence: 109,
                },

                unlock_building_apothecary: {
                	favour: 135,
                },

                upgrade_building_temple2: {
                	favour: 21,
                },

                upgrade_worker_trapper: {
                	favour: 21,
                },

                unlock_building_barracks: {
                	rumours: 1860,
                	evidence: 244,
                },

                upgrade_building_campfire: {
                	rumours: 1674,
                	evidence: 146,
                	favour: 19,
                },

                upgrade_building_inn: {
                	rumours: 1860,
                	favour: 21,
                },

                upgrade_building_market2: {
                	rumours: 1488,
                	favour: 25,
                },

                unlock_item_clothingl14: {
                	rumours: 618,
                	favour: 11,
                },

                unlock_item_weapon4: {
                	evidence: 338,
                },

                unlock_item_clothing5: {
                	rumours: 618,
                	evidence: 169,
                },

                unlock_item_clothing3: {
                	rumours: 618,
                },

                unlock_action_clear_waste_r: {
                	evidence: 253,
                	favour: 14,
                },

                unlock_building_greenhouse: {
                	rumours: 580,
                	favour: 11,
                },

                upgrade_outgoing_caravans: {
                	rumours: 513,
                },

                unlock_item_clothing_hands_25: {
                	rumours: 479,
                },

                upgrade_building_storage1: {
                	evidence: 121,
                },

                unlock_building_passage_hole: {
                	evidence: 121,
                },

                unlock_building_house2: {
                	rumours: 547,
                	evidence: 242,
                },

                unlock_building_smithy: {
                	evidence: 121,
                },

                unlock_action_clear_waste_t: {
                	rumours: 415,
                	evidence: 100,
                },

                unlock_item_bag22: {
                	evidence: 125,
                },

                unlock_item_weapon3: {
                	rumours: 519,
                },

                unlock_item_firstaid: {
                	rumours: 467,
                },

                upgrade_worker_collector1: {
                	rumours: 648,
                },

                unlock_building_cementmill: {
                	evidence: 125,
                },

                upgrade_building_market: {
                	rumours: 170,
                },

                unlock_item_clothing4h: {
                	rumours: 127,
                	evidence: 73,
                },

                unlock_building_passage_elevator: {
                	rumours: 170,
                	evidence: 97,
                },

                unlock_building_lights: {
                	evidence: 194,
                },

                unlock_item_weapon25: {
                	rumours: 170,
                },

                upgrade_building_library: {
                	rumours: 204,
                },

                unlock_building_beacon: {
                	evidence: 141,
                },

                unlock_building_bridge: {
                	evidence: 88,
                },

                unlock_item_weapon2: {
                	rumours: 223,
                	evidence: 57,
                },

                upgrade_worker_scavenger: {
                	rumours: 278,
                	evidence: 71,
                },

                unlock_outgoing_caravans: {
                	rumours: 306,
                },

                unlock_building_library: {
                	evidence: 69,
                },

                unlock_building_inn: {
                	rumours: 75,
                	evidence: 86,
                },

                unlock_building_market: {
                	rumours: 62,
                },

                unlock_building_fortifications: {
                	rumours: 47,
                	evidence: 129,
                },

                unlock_item_bag2: {
                	rumours: 62,
                },

                unlock_weapon_15: {
                	rumours: 58,
                },

                unlock_clothing_basic: {
                	rumours: 47,
                },

                unlock_clothing_warm: {
                	evidence: 56,
                },

                unlock_building_darkfarm: {
                	rumours: 73,
                	evidence: 100,
                },

                unlock_building_tradingpost: {
                	evidence: 80,
                },

                unlock_item_clothing2: {
                	rumours: 9,
                },

                unlock_building_passage_staircase: {
                	evidence: 50,
                },

                unlock_building_hospital: {
                	evidence: 18,
                },

                unlock_worker_rope: {
                	rumours: 7,
                },

                unlock_item_shoe1: {
                	rumours: 9,
                	evidence: 28,
                },

            },

            cooldowns: {
                scavenge: 10,
                use_spring: 60,
                use_in_campfire: 60,
                use_in_home: 180,
                use_in_market: 360,
                use_in_shrine: 600,
                use_in_temple: 120,
                scout_locale_i: 60,
                scout_locale_u: 60,
                clear_workshop: 60,
                fight_gang: 60,
                send_caravan: 60 * 10,
                use_in_inn: 60 * 30,
                despair: 10
            },

            durations: {
                clear_waste_t: 5,
                clear_waste_r: 10,
                use_in_hospital: 60 * 3,
                use_in_campfire: 5,
                use_in_market: 10,
                use_in_home: 60,
                use_in_shrine: 10,
                use_in_temple: 5,
                send_caravan: 60 * 10
            },

            // [ base-value, vision-dependent-value ]
            randomEncounterProbabilities: {
                scavenge: [0.02, 0.02],
                scout_locale_i: [0.2, 0.1],
                scout_locale_u: [0.1, 0.1],
                use_spring: [0.1, 0.1],
                clear_workshop: [1, 0],
                clear_waste_t: [0.1, 0.1],
                clear_waste_r: [0.1, 0.1],
                fight_gang: [1, 0],
                nap: [0.1, 0]
            },

            // [ base-value, vision-dependent-value ]
            injuryProbabilities: {
                scout: [0.005, 0.01],
                scavenge: [0.0005, 0.005],
                despair: [0.75, 0], // TODO make dynamic and link to cases in FaintingSystem
            },

            loseInventoryProbabilities: {
                scout: [0, 0.03],
                scavenge: [0, 0.03],
                despair: [0.75, 0], // TODO make dynamic and link to cases in FaintingSystem
            },

            // build_in action descriptions are based on building descriptions on ImprovementConstants
            descriptions: {
                scout: "Scout the area for evidence.",
                scout_locale_i: "Find out if there is anyone living here.",
                scout_locale_u: "Scout for additional resources and evidence.",
                scavenge: "Look for resources.",
                investigate: "Look for resources.",
                clear_workshop: "Scout the workshop to see if it can be used.",
                clear_waste_t: "Clear the pollution.",
                clear_waste_r: "Clear the radiactive waste.",
                clear_debris: "Clear the debris blocking the way.",
                bridge_gap: "Build a bridge to cross the gap",
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
                build_out_beacon: "Makes exploration in surrounding sectors easier",
                build_out_camp: "A place to rest.",
                improve_in_campfire: "Increase rumour generation",
                improve_in_library: "Increase evidence generation",
                improve_in_square: "Increase reputation bonus",
                improve_in_generator: "Increase reputation bonus",
                improve_in_apothecary: "Increase efficiency",
                improve_in_market: "Increase rumours gained from visiting",
                improve_in_smithy: "Increase efficiency",
                improve_in_cementmill: "Increase efficiency",
                improve_in_temple: "Increase favour generation",
                use_in_home: "Recover stamina.",
                use_in_campfire: "Collect rumours from the population.",
                use_in_market: "Go hear the latest gossip.",
                use_in_hospital: "Heal injuries.",
                use_in_inn: "Recruit followers.",
                use_in_shrine: "Reconnect with the spirits",
                use_in_temple: "Donate silver for favour with the spirits",
                use_item_glowstick_1: "Create a temporary light in this location.",
                use_out_collector_food: "Collect accumulated food.",
                use_out_collector_food_one: "Collect 1 food.",
                use_out_collector_water: "Collect accumulated water.",
                use_out_collector_water_one: "Collect 1 water.",
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
                use_spring: true,
                investigate: true,
                clear_workshop: true,
                fight_gang: true,
                despair: true,
            },

            UNAVAILABLE_REASON_LOCKED_RESOURCES: "Requires undiscovered resources.",
            UNAVAILABLE_REASON_BAG_FULL: "Bag full.",
            UNAVAILABLE_REASON_NOT_IN_CAMP: "Must be in camp to do this.",
            DISABLED_REASON_NOT_ENOUGH_LEVEL_POP: "Not enough people on this level.",
            UNAVAILABLE_REASON_BUSY: "Busy",

            hasAction: function (action) {
                return this.requirements[action] || this.costs[action] || this.cooldowns[action] || this.durations[action] || this.descriptions[action] || false;
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
                    return parseInt(this.durations[baseActionID]) / speed;
                }
                return 0;
            },

            getRandomEncounterProbability: function (baseActionID, vision, sectorFactor, actionFactor) {
                if (vision === undefined) vision = 100;
                if (actionFactor === undefined) actionFactor = 1;
                if (this.randomEncounterProbabilities[baseActionID]) {
                    var baseProbability = this.randomEncounterProbabilities[baseActionID][0];
                    var visionFactor = Math.pow(1 - (vision / 100), 2);
                    var visionProbability = this.randomEncounterProbabilities[baseActionID][1] * visionFactor;
                    return (baseProbability + visionProbability) * actionFactor * sectorFactor;
                }
                return 0;
            },

            getInjuryProbability: function (action, vision) {
                if (vision === undefined) vision = 100;
                if (this.injuryProbabilities[action]) {
                    var baseProbability = this.injuryProbabilities[action][0];
                    var visionFactor = Math.pow(1 - (vision / 100), 2);
                    var visionProbability = this.injuryProbabilities[action][1] * visionFactor;
                    var result = baseProbability + visionProbability;
                    if (result < 0.001) result = 0;
                    return result;
                }
                return 0;
            },

            getLoseInventoryProbability: function (action, vision) {
                if (vision === undefined) vision = 100;
                if (this.loseInventoryProbabilities[action]) {
                    var baseProbability = this.loseInventoryProbabilities[action][0];
                    var visionFactor = Math.pow(1 - (vision / 100), 4);
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
                    case "clear_waste_t":
                    case "clear_waste_r":
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
                if (action.indexOf("fight_") === 0) return true;
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
