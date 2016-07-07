// Costs, requirements, descriptions, and cooldowns for all player actions plus some related helper functions
define(['ash',
    'game/constants/GameConstants',
    'game/vos/ResourcesVO',
    'game/constants/ItemConstants',
    'game/constants/UpgradeConstants',
    'game/constants/CampConstants',
    'game/constants/WorldCreatorConstants'
],
function (Ash, GameConstants, ResourcesVO, ItemConstants, UpgradeConstants, CampConstants, WorldCreatorConstants) {

    const COST_SOURCE_CAMP = "camp";
    const COST_SOURCE_DEFAULT = "default";

    var PlayerActionConstants = {
        
            COST_SOURCE_CAMP: COST_SOURCE_CAMP,
            COST_SOURCE_DEFAULT: COST_SOURCE_DEFAULT,
   
            requirements: {
    
                scout: {
                    vision: 30,
                    sector: {
                        scouted: false,
                    },
                    busy: false,
                },
                    
                scavenge: {
                    vision: 10,
                },
                    
                fightcheck: {
                    health: 70,
                    stamina: 10,
                    sector: {
                        control: false,
                        enemies: true,
                        scouted: true,
                    },
                    perks: {
                        Injury: [1, -1],
                    },
                    busy: false,
                },
                    
                fight: {
                    health: 70,
                    perks: {
                        Injury: [1, -1],
                    },
                    busy: false,
                },
                
                clear_workshop: {
                    vision: 30,
                    health: 70,
                    sector: {
                        scouted: true,
                    },
                },
                
                use_spring: {
                    vision: 10,
                    sector: {
                        scouted: true,
                    },
                },
                
                fight_gang: {
                    health: 70,
                },
                        
                move_sector_north: {
                    vision: 10,
                    sector: {
                        blockerNorth: false,
                    },
                    busy: false,
                },
                        
                move_sector_south: {
                    vision: 10,
                    sector: {
                        blockerSouth: false,
                    },
                    busy: false,
                },
                        
                move_sector_east: {
                    vision: 10,
                    sector: {
                        blockerEast: false,
                    },
                    busy: false,
                },
                        
                move_sector_west: {
                    vision: 10,
                    sector: {
                        blockerWest: false,
                    },
                    busy: false,
                },
                        
                move_sector_ne: {
                    vision: 10,
                    sector: {
                        blockerNE: false,
                    },
                    busy: false,
                },
                        
                move_sector_se: {
                    vision: 10,
                    sector: {
                        blockerSE: false,
                    },
                    busy: false,
                },
                        
                move_sector_sw: {
                    vision: 10,
                    sector: {
                        blockerSW: false,
                    },
                    busy: false,
                },
                        
                move_sector_nw: {
                    vision: 10,
                    sector: {
                        blockerNW: false,
                    },
                    busy: false,
                },
                    
                move_level_up: {
                    sector: {
                        passageUp: true,
                    },
                    improvements: {
                        passageUp: [1, -1],
                    },
                    busy: false,
                },
                    
                move_level_down: {
                    sector: {
                        passageDown: true,
                    },
                    improvements: {
                        passageDown: [1, -1],
                    },
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
                    vision: 30,
                    improvements: {
                        camp: [0, 1],
                    },
                    sector: {
                        canHaveCamp: true,
                    }
                },
            
                build_out_bridge: {
                    vision: 30,
                    improvements: {
                        bridge: [0, 1],
                    },
                    upgrades: {
                        unlock_building_bridge: true,
                    }
                },
            
                build_out_collector_food: {
                    vision: 30,
                },
            
                build_out_collector_water: {
                    vision: 30,
                },
            
                use_out_collector_food: {
                    improvements: {
                        collector_food: [1, -1],
                    },
                    sector: {
                        collected_food: 1,
                    },
                },
            
                use_out_collector_water: {
                    improvements: {
                        collector_water: [1, -1],
                    },
                    sector: {
                        collected_water: 1,
                    },
                },
            
                build_out_passage_up_stairs:  {
                    vision: 30,
                    sector: {
                        passageUp: 3,
                    },
                    improvements: {
                        passageUpStairs: [0, 1],
                    },
                },
            
                build_out_passage_up_elevator:  {
                    vision: 30,
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
                    vision: 30,
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
                    vision: 30,
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
                    vision: 30,
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
                    vision: 30,
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
                    },
                },
            
                use_in_campfire: {
                    rumourpoolchecked: false,
                    population: [1, -1],
                },
                
                use_in_home: {
                    maxStamina: false,
                },
            
                build_in_darkfarm: {
                    upgrades: {
                        unlock_building_darkfarm: true,
                    }
                },
                
                build_in_hospital: {
                    improvements: {
                        camp: [1, -1],
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
            
                build_in_market: {
                    improvements: {
                        tradepost: [1, -1],
                        market: [0, 1],
                    },
                    upgrades: {
                        unlock_building_market: true,
                    }
                },
            
                build_in_library: {
                    upgrades: {
                        unlock_building_library: true,
                    }
                },
            
                build_in_house2: {
                    upgrades: {
                        unlock_building_house2: true,
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
                },
            
                build_in_fortification: {
                    upgrades: {
                        unlock_building_fortifications: true,
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
                    improvements: {},
                    upgrades: {
                        unlock_building_apothecary: true,
                    }
                },
            
                build_in_smithy: {
                    improvements: {},
                    upgrades: {
                        unlock_building_smithy: true,
                    }
                },
            
                build_in_cementmill: {
                    improvements: {},
                    upgrades: {
                        unlock_building_cementmill: true,
                    }
                },
            
                build_in_radio: {
                    improvements: {},
                    upgrades: {
                        unlock_building_radio: true,
                    }
                },
            
                build_in_shrine: {
                    deity: true,
                },
            
                build_in_researchcenter: {
                    upgrades: {
                        unlock_building_researchcenter: true,
                    }
                },
                
                craft_light1: {
                },
                
                craft_light2: {
                    upgrades: {
                        unlock_building_lights: true,
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
                
                craft_shade1: {
                    upgrades: {
                        unlock_item_shades1: true,
                    }
                },
                
                craft_shade2: {
                    upgrades: {
                        unlock_item_shades2: true,
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
                
                craft_clothing1: {
                    upgrades: {
                        unlock_worker_rope: true,
                    }
                },
                
                craft_clothing2: {
                    upgrades: {
                        unlock_item_clothing2: true,
                    }
                },
                
                craft_clothing3: {
                    upgrades: {
                        unlock_item_clothing3: true,
                    }
                },
                
                craft_clothing4: {
                    upgrades: {
                        unlock_item_clothing4: true,
                    }
                },
                
                craft_clothing5: {
                    upgrades: {
                        unlock_item_clothing5: true,
                    }
                },
                
                craft_clothing6: {
                    upgrades: {
                        unlock_item_clothing6: true,
                    }
                },
                
                craft_clothing7: {
                    upgrades: {
                        unlock_item_clothing7: true,
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
                        unlock_item_bag3: true,
                    }
                },
                
                use_item_first_aid_kit_1: {
                    perks: {
                        Injury: [0.6, 0.99, true],
                    },
                    
                },

                use_item_first_aid_kit_2: {
                    perks: {
                        Injury: [0.05, 0.99, true],
                    },
                },
                
                create_blueprint: {
                    inCamp: true,
                },
				
                unlock_building_hospital: {
                    upgrades: {
                        unlock_worker_rope: true,
                    }
                },
                
                unlock_worker_rope: {
                },
                
                unlock_building_passage_staircase: {
                    blueprint: 1,
                },
                
                unlock_item_shoe1: {
                },
                
                unlock_item_clothing2: {
                    upgrades: {
                        unlock_item_shoe1: true,
                    }
                },
                
                unlock_building_darkfarm: {
                    blueprint: 2,
                },
                
                unlock_building_tradingpost: {
                    blueprint: 2,
                },
                
                unlock_building_lights: {
                    blueprint: 3,
                },
                
                unlock_building_market: {
                    blueprint: 3,
                    upgrades: {
                        unlock_building_tradingpost: true,
                    }
                },
                
                unlock_building_inn: {
                    blueprint: 3,
                    upgrades: {
                        unlock_building_market: true,
                    }
                },
                
                upgrade_worker_scavenger: {
                    blueprint: 4,
                    upgrades: {
                        unlock_item_shoe1: true,
                    }
                },
                
                unlock_building_library: {
                    blueprint: 4,
                },
                
                unlock_building_passage_hole: {
                    blueprint: 4,
                    upgrades: {
                        unlock_building_passage_staircase: true,
                    }
                },
                
                unlock_item_weapon2: {
                    blueprint: 4,
                    upgrades: {
                        unlock_item_shoe1: true,
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
                
                unlock_building_passage_elevator: {
                    blueprint: 5,
                    upgrades: {
                        unlock_building_passage_staircase: true,
                    }
                },
                
                unlock_item_clothing3: {
                    blueprint: 5,
                    upgrades: {
                        unlock_item_shoe1: true,
                    }
                },
                
                upgrade_worker_collector1: {
                    upgrades: {
                        unlock_item_shoe1: true,
                    }
                },
                
                unlock_building_house2: {
                    upgrades: {
                        unlock_building_passage_hole: true,
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
                
                unlock_building_bridge: {
                    blueprint: 7,
                    upgrades: {
                        unlock_building_passage_hole: true,
                    }
                },
                
                upgrade_building_storage1: {
                    blueprint: 7,
                },
                
                unlock_item_clothing4: {
                    blueprint: 7,
                    upgrades: {
                        unlock_item_shoe1: true,
                    }
                },
                
                unlock_item_firstaid: {
                    upgrades: {
                        upgrade_worker_collector1: true,
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
                
                upgrade_building_campfire: {
                },
                
                upgrade_worker_trapper: {
                    blueprint: 9,
                },
                
                upgrade_building_inn: {
                    upgrades: {
                        upgrade_building_campfire: true,
                    }
                },
                
                unlock_item_clothing5: {
                    blueprint: 9,
                    upgrades: {
                        unlock_item_weapon4: true,
                    }
                },
                
                unlock_building_aqueduct: {
                    blueprint: 10,
                    upgrades: {
                        upgrade_worker_collector1: true,
                    }
                },
                
                unlock_building_apothecary: {
                    blueprint: 10,
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
                
                unlock_building_fortifications: {
                    upgrades: {
                        unlock_building_cementmill: true,
                    }
                },
                
                unlock_building_cementmill: {
                    blueprint: 11,
                    upgrades: {
                        upgrade_building_library: true,
                    }
                },
                
                unlock_item_clothing6: {
                    blueprint: 11,
                },
                
                upgrade_worker_chemist: {
                    blueprint: 12,
                    upgrades: {
                        unlock_building_apothecary: true,
                    }
                },
                
                unlock_item_bag3: {
                    blueprint: 12,
                },
                
                unlock_building_barracks: {
                    upgrades: {
                        unlock_building_fortifications: true,
                    }
                },
                
                unlock_building_radio: {
                    blueprint: 13,
                },
                
                upgrade_building_hospital: {
                    blueprint: 13,
                    upgrades: {
                        unlock_building_hospital: true,
                    }
                },
                
                unlock_item_weapon6: {
                    blueprint: 13,
                },
                
                unlock_item_clothing7: {
                    blueprint: 13,
                    upgrades: {
                        unlock_building_apothecary: true,
                    }
                },
                
                unlock_item_shades1: {
                    upgrades: {
                        upgrade_worker_chemist: true,
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
                },
                
                unlock_item_weapon7: {
                    blueprint: 14,
                },
                
                upgrade_building_apothecary: {
                    blueprint: 15,
                },
                
                unlock_item_shades2: {
                    blueprint: 15,
                },
                
                unlock_building_ceiling: {
                    blueprint: 15,
                },

            },
            
            costs: {
                    
                scout: {
                    stamina: 5,
                },
            
                scavenge: {
                    stamina: 3,
                },
            
                fight: {
                    stamina: 10,
                },
                
                clear_workshop: {
                    stamina: 10,
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
                
                build_out_camp: {
                    resource_metal: 10,
                    resource_food: 2,
                },
            
                build_out_bridge: {
                    resource_metal: 150,
                    resource_rope: 150,
                    cost_source: COST_SOURCE_CAMP,
                },
            
                build_out_passage_up_hole: {
                    resource_metal: 200,
                    resource_concrete: 10,
                    cost_factor: 1.5,
                    cost_source: COST_SOURCE_CAMP,
                },
            
                build_out_passage_up_stairs: {
                    resource_metal: 200,
                    resource_rope: 10,
                    cost_factor: 1.5,
                    cost_source: COST_SOURCE_CAMP,
                },
            
                build_out_passage_up_elevator: {
                    resource_metal: 200,
                    resource_fuel: 10,
                    cost_factor: 1.5,
                    cost_source: COST_SOURCE_CAMP,
                },
            
                build_out_passage_down_hole: {
                    resource_metal: 200,
                    resource_concrete: 10,
                    cost_factor: 1.5,
                    cost_source: COST_SOURCE_CAMP,
                },
            
                build_out_passage_down_stairs: {
                    resource_metal: 200,
                    resource_rope: 10,
                    cost_factor: 1.5,
                    cost_source: COST_SOURCE_CAMP,
                },
            
                build_out_passage_down_elevator: {
                    resource_metal: 200,
                    resource_fuel: 10,
                    cost_factor: 1.5,
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
                    cost_factor: 2,
                },
            
                build_in_house2: {
                    resource_metal: 300,
                    resource_rope: 25,
                    cost_factor: 1.5,
                },
            
                build_in_lights: {
                    resource_metal: 100,
                    resource_rope: 10,
                },
            
                build_in_ceiling: {
                    resource_rope: 1000,
                },
                
                build_in_storage: {
                    resource_metal: 50,
                    resource_rope: [8, 2],
                    cost_factor: 1.8,
                },
                
                build_in_campfire: {
                    resource_metal: 5,
                    resource_food: 15,
                    cost_factor: 2,
                },
                
                build_in_darkfarm: {
                    resource_metal: 50,
                    resource_water: 20,
                    resource_rope: 5,
                    cost_factor: 2,
                },
            
                build_in_hospital: {
                    resource_metal: 150,
                    resource_rope: 30,
                },
            
                use_in_hospital: {
                    resource_water: 50,
                    resource_food: 15,
                },
            
                use_in_hospital2: {
                    resource_water: 100,
                    resource_food: 15,
                },
            
                build_in_tradingPost: {
                    resource_metal: 100,
                },
            
                build_in_inn: {
                    resource_metal: 50,
                    resource_rope: 20,
                    resource_fuel: 10,
                },
            
                use_in_inn: {
                    resource_food: 50,
                    resource_water: 50,
                    cost_factor: 1.5,
                },
            
                build_in_market: {
                    resource_metal: 50,
                    resource_rope: 100,
                    cost_factor: 1.5,
                },
            
                build_in_library: {
                    resource_metal: 100,
                    resource_rope: 100,
                    cost_factor: 2,
                },
            
                build_in_fortification: {
                    resource_metal: 500,
                    resource_rope: 100,
                    resource_concrete: 10,
                    cost_factor: 1.75,
                },
                
                build_in_aqueduct: {
                    resource_metal: 300,
                    cost_factor: 2,
                },
            
                build_in_barracks: {
                    resource_metal: 100,
                    resource_rope: 50,
                    resource_concrete: 50,
                    cost_factor: 1.2,
                },
            
                build_in_apothecary: {
                    resource_metal: 100,
                    resource_rope: 50,
                    cost_factor: 1.5,
                },
            
                build_in_smithy: {
                    resource_metal: 100,
                    resource_rope: 50,
                    cost_factor: 1.5,
                },
            
                build_in_cementmill: {
                    resource_metal: 500,
                    resource_rope: 50,
                    cost_factor: 1.5,
                },
            
                build_in_radio: {
                    resource_metal: 500,
                    resource_rope: 50,
                    cost_factor: 1.5,
                },
            
                build_in_shrine: {
                    resource_water: 500,
                    resource_metal: 200,
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
                
                craft_clothing1: {
                    resource_rope: 10,
                },
                
                craft_clothing2: {
                    resource_rope: 30,
                },
                
                craft_clothing3: {
                    resource_rope: 100,
                    resource_metal: 20,
                },
                
                craft_clothing4: {
                    resource_rope: 100,
                    resource_metal: 200,
                    item_res_silk: 5,
                },
                
                craft_clothing5: {
                    resource_rope: 100,
                    resource_metal: 500,
                    item_res_silk: 5,
                },
                
                craft_clothing6: {
                    resource_rope: 100,
                    resource_fuel: 100,
                    item_res_silk: 20,
                },
                
                craft_clothing7: {
                    resource_rope: 200,
                    resource_fuel: 100,
                    resouce_herbs: 10,
                    item_res_silk: 50,
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
                
                craft_bag_3: {
                    resource_rope: 100,
                    resource_herbs: 10,
                    resource_fuel: 10,
                },
				
                unlock_building_hospital: {
                    evidence: 4,
                },
                
                unlock_worker_rope: {
                    rumours: 2,
                },
                
                unlock_building_passage_staircase: {
                    evidence: 6,
                },
                
                unlock_item_shoe1: {
                    rumours: 13,
                },
                
                unlock_item_clothing2: {
                    rumours: 21,
                },
                
                unlock_building_darkfarm: {
                    rumours: 28,
                    evidence: 6,
                },
                
                unlock_building_tradingpost: {
                    rumours: 21,
                    evidence: 5,
                },
                
                unlock_building_lights: {
                    evidence: 6,
                },
                
                unlock_building_market: {
                    rumours: 69,
                    evidence: 6,
                },
                
                unlock_building_inn: {
                    rumours: 69,
                },
                
                upgrade_worker_scavenger: {
                    rumours: 55,
                    evidence: 8,
                },
                
                unlock_building_library: {
                    rumours: 55,
                },
                
                unlock_building_passage_hole: {
                    evidence: 8,
                },
                
                unlock_item_weapon2: {
                    rumours: 55,
                },
                
                unlock_item_bag2: {
                    rumours: 121,
                },
                
                upgrade_building_library: {
                    rumours: 121,
                },
                
                unlock_building_passage_elevator: {
                    rumours: 121,
                    evidence: 9,
                },
                
                unlock_item_clothing3: {
                    evidence: 9,
                },
                
                upgrade_worker_collector1: {
                    rumours: 704,
                },
                
                unlock_building_house2: {
                    rumours: 704,
                    evidence: 11,
                },
                
                upgrade_building_market: {
                    rumours: 704,
                },
                
                unlock_building_smithy: {
                    evidence: 11,
                },
                
                unlock_building_bridge: {
                    evidence: 8,
                },
                
                upgrade_building_storage1: {
                    rumours: 637,
                    evidence: 8,
                },
                
                unlock_item_clothing4: {
                    rumours: 637,
                    evidence: 8,
                },

                unlock_item_firstaid: {
                    rumours: 775,
                },
                
                upgrade_building_market2: {
                    rumours: 2637,
                },
                
                unlock_item_weapon4: {
                    evidence: 25,
                },
                
                upgrade_building_campfire: {
                    rumours: 674,
                    evidence: 27,
                    favour: 1,
                },
                
                upgrade_worker_trapper: {
                    favour: 1,
                },
                
                upgrade_building_inn: {
                    rumours: 674,
                    favour: 1,
                },
                
                unlock_item_clothing5: {
                    rumours: 674,
                },
                
                unlock_building_aqueduct: {
                    evidence: 34,
                },
                
                unlock_building_apothecary: {
                    favour: 1,
                },
                
                unlock_item_weapon5: {
                    rumours: 566,
                    evidence: 8,
                },
                
                upgrade_building_storage2: {
                    rumours: 755,
                    evidence: 10,
                },
                
                unlock_building_fortifications: {
                    rumours: 755,
                },
                
                unlock_building_cementmill: {
                    evidence: 10,
                },
                
                unlock_item_clothing6: {
                    rumours: 755,
                },
                
                upgrade_worker_chemist: {
                    evidence: 32,
                    favour: 4,
                },
                
                unlock_item_bag3: {
                    rumours: 3455,
                },
                
                unlock_building_barracks: {
                    rumours: 948,
                },
                
                unlock_building_radio: {
                    rumours: 948,
                    evidence: 17,
                },
                
                upgrade_building_hospital: {
                    rumours: 805,
                },
                
                unlock_item_weapon6: {
                    evidence: 14,
                },
                
                unlock_item_clothing7: {
                    rumours: 948,
                },
                
                unlock_item_shades1: {
                    rumours: 1981,
                    evidence: 6,
                },
                
                upgrade_building_cementmill: {
                    evidence: 9,
                },
                
                unlock_building_researchcenter: {
                    evidence: 9,
                },
                
                unlock_item_weapon7: {
                    rumours: 3963,
                    evidence: 13,
                },
                
                upgrade_building_apothecary: {
                    evidence: 11,
                    favour: 7,
                },
                
                unlock_item_shades2: {
                    rumours: 4446,
                    evidence: 11,
                },
                
                unlock_building_ceiling: {
                    evidence: 11,
                },
            },
        
            cooldowns: {
                scavenge: 10,
                use_spring: 30,
                fightCheck: 20,
                use_in_campfire: 60,
                use_in_home: 180,
                scout_locale_i: 60,
                scout_locale_u: 60,
                clear_workshop: 60,
                fight_gang: 60,
                use_in_inn: 60 * 30,
                despair: 60,
            },
            
            durations: {
                use_in_hospital: 60 * 2,
                use_in_campfire: 5,
                use_in_home: 60,
            },
            
            randomEncounterProbabilities: {
                scavenge: 0.03,
                scout_locale_i: 0.2,
                scout_locale_u: 0.1,
                use_spring: 0.1,
                clear_workshop: 1,
                fight_gang: 1,
            },
            
            injuryProbabilities: {
                scout: 0.005,
                scavenge: 0.05,
                despair: 0.7, // TODO make dynamic and link to cases in FaintingSystem
            },
            
            loseInventoryProbabilities: {
                despair: 0.75, // TODO make dynamic and link to cases in FaintingSystem
            },
        
            descriptions: {
                scout: "Scout the area for evidence.",
                scout_locale_i: "Find out if there is anyone living here.",
                scout_locale_u: "Scout for additional resources and evidence.",
                scavenge: "Look for resources.",
                clear_workshop: "Scout the workshop to see if it can be used.",
                use_spring: "Get water.",
                fight_gang: "Clear the enemies blocking passage.",
                move_camp_level: "Shortcut back to the nearest camp.",
                create_blueprint: "Combine pieces to a blueprint.",
                despair: "Give up. Stop moving. Rest.",
                build_out_collector_food: "Accumulates food.",
                build_out_collector_water: "Accumulates water.",
                build_out_camp: "A place to rest.",
                build_in_house: "A place for " + CampConstants.POPULATION_PER_HOUSE + " people to stay.",
                build_in_house2: "Houses " + CampConstants.POPULATION_PER_HOUSE2 + " people.",
                build_in_storage: "Increases resource storage.",
                build_in_campfire: "Increases rumour generation and unlocks upgrades.",
                build_in_library: "Accumulate and store more evidence.",
                build_in_hospital: "Enables healing injuries.",
                build_in_hospital2: "Improve your general health.",
                build_in_darkfarm: "Produces food",
                build_in_tradingPost: "Connect camps to a trade network.",
                build_in_market: "Enables foreign traders to visit.",
                build_in_barracks: "Allows 10 soldiers.",
                build_in_lights: "Keep darkness at for good.",
                build_in_aqueduct: "Water infrastructure to improve collecting efficiency.",
                use_in_home: "Recover stamina.",
                use_in_campfire: "Collect rumours from the population.",
                use_in_hospital: "Heal injuries.",
                use_in_inn: "Recruit followers.",
                use_out_collector_food: "Collect accumulated food.",
                use_out_collector_water: "Collect accumulated water.",
                leave_camp: "Venture out into the corridors.",
            },
        
            getCostSource: function (action) {
                var rawSource = this.costs[action].cost_source;
                if (rawSource) return rawSource;
                return COST_SOURCE_DEFAULT;
            },
                   
            getCooldown: function (action) {
                if (this.cooldowns[action]) {
                    return this.cooldowns[action] / GameConstants.gameSpeed;
                }
                return 0;
            },
                   
            getDuration: function (action) {
                if (this.durations[action]) {
                    return this.durations[action] / GameConstants.gameSpeed;
                }
                return 0;
            },
            
            getRandomEncounterProbability: function (baseActionID) {
                // TODO for locales get probability based on locale type
                if (this.randomEncounterProbabilities[baseActionID]) {
                    return this.randomEncounterProbabilities[baseActionID];
                }
                return 0;
            },
            
            getInjuryProbability: function (action) {
                if (this.injuryProbabilities[action]) {
                    return this.injuryProbabilities[action];
                }
                return 0;
            },
            
            getLoseInventoryProbability: function (action) {
                if (this.loseInventoryProbabilities[action]) {
                    return this.loseInventoryProbabilities[action];
                }
                return 0;
            },
            
            getFirstCampForUpgrade: function (upgradeId) {
                var blueprintCamp = UpgradeConstants.getBlueprintCampOrdinal(upgradeId);
                
                var requiredTechCamp = 1;
                var requiredTech;
                for (var i = 0; i < this.requirements[upgradeId].upgrades; i++) {
                    console.log(this.requirements.upgradeId.upgrades[i]);
                }
                
                var requiredStatCamp = 1;
                if (this.costs[upgradeId].favour > 0) requiredStatCamp = WorldCreatorConstants.CAMPS_BEFORE_GROUND;
                
                return Math.max(blueprintCamp, requiredTechCamp, requiredStatCamp);
            },

        };
    
    return PlayerActionConstants;
    
});
