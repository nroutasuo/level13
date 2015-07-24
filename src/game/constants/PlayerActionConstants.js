define(['ash',
    'game/vos/ResourcesVO',
    'game/constants/ItemConstants', 'game/constants/UpgradeConstants', 'game/constants/CampConstants'
],
    function (Ash, ResourcesVO, ItemConstants, UpgradeConstants, CampConstants) {

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
                    },
                        
                    scavenge: {
                        vision: 10,
                    },
                        
                    fightcheck: {
                        vision: 30,
                        health: 70,
                        stamina: 10,
                        sector: {
                            control: false,
                            enemies: true,
                            scouted: true,
                        }
                    },
                        
                    fight: {
                        vision: 30,
                        health: 70,
                        sector: {
                            control: false,
                            enemies: true,
                            scouted: true,
                        }
                    },
                            
                    move_sector_left: {
                        sector: {
                            blockerLeft: false,
                        },
                    },
                            
                    move_sector_right: {
                        sector: {
                            blockerRight: false,
                        },
                    },
                        
                    move_level_up: {
                        sector: {
                            passageUp: true,
                        },
                        improvements: {
                            passageUp: [1, -1],
                        },
                    },
                        
                    move_level_down: {
                        sector: {
                            passageDown: true,
                        },
                        improvements: {
                            passageDown: [1, -1],
                        },
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
                            camp: [1, -1],
                            bridge: [0, 1],
                        },
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
                
                    build_in_house: {
                        improvements: {
                            camp: [1, -1],
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
                
                    build_in_tradingPost: {
                        numCamps: 2,
                        improvements: {
                            tradepost: [0,1],
                        }
                    },
                
                    build_in_inn: {
                        improvements: {
                            inn: [0,1],
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
                    },
                
                    build_in_market: {
                        improvements: {
                            tradepost: [1,-1],
                            market: [0, 1],
                        },
                        upgrades: {
                            unlock_building_trade: true,
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
                    },
                
                    build_in_ceiling: {
                        sunlit: true,
                    },
                
                    build_in_fortification: {
                        upgrades: {
                            unlock_building_fortifications: true,
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
                
                    unlock_worker_rope: {
                
                    },
                
                    unlock_building_darkfarm: {
                    },
                
                    unlock_building_inn: {
                        upgrades: {
                            
                            unlock_building_hospital: true,
                            unlock_building_trade: true,
                        },
                    },
                
                    upgrade_building_hospital: {
                        upgrades: {
                            unlock_building_hospital: true,
                        },
                    },
                
                    unlock_building_library: {
                        upgrades: {
                            unlock_worker_rope: true,    
                        },
                    },
                
                    unlock_building_house2: {		
                        improvements: {
                            house: [5,-1],
                        },
                    },
                
                    unlock_building_lights: {
                        upgrades: {
                            unlock_building_library: true,
                        }
                    },
                
                    unlock_building_cementmill: {
                        upgrades: {
                            unlock_building_library: true,
                            unlock_building_fortifications: true,
                        },
                    },
                
                    unlock_building_smithy: {
                        upgrades: {
                            unlock_building_library: true,
                            unlock_building_trade: true,
                        },
                    },
                
                    unlock_building_apothecary: {
                        upgrades: {
                            unlock_building_library: true,
                            unlock_building_hospital: true,
                        },
                    },
                
                    unlock_building_barracks: {
                        upgrades: {
                            unlock_building_fortifications: true,
                        },
                    },
                
                    unlock_building_trade: {
                        upgrades: {
                            unlock_worker_rope: true,
                        }
                    },
                
                    unlock_building_radio: {
                        upgrades: {
                            unlock_building_smithy: true,
                        }
                    },
                    
                    unlock_building_passage_staircase: {
                        upgrades: {
                            unlock_building_library: true,
                        }
                    },
                
                    unlock_building_passage_hole: {
                        upgrades: {
                            unlock_building_passage_staircase: true,
                        }
                    },
                
                    unlock_building_passage_elevator: {
                        upgrades: {
                            unlock_building_passage_staircase: true,
                        }
                    },
                },
                
                costs: {
                        
                    scout: {
                        stamina: 10,
                    },
                
                    scavenge: {
                        stamina: 5,
                    },
                
                    fight: {
                        stamina: 10,
                    },
                    
                    move_level_up: {
                        stamina: 75,
                    },
                
                    move_level_down: {
                        stamina: 75,
                    },
                
                    move_sector_left: {
                        stamina: 10,
                    },
                
                    move_sector_right: {
                        stamina: 10,
                    },
                    
                    build_out_camp: {
                        resource_metal: 20,
                        resource_food: 15,
                        resource_water: 15,
                    },
                
                    build_out_bridge: {
                        resource_metal: 150,
                        resource_rope: 150,
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
                        resource_rope: 5,
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
                    
                    craft_light: {
                        resource_metal: 8,
                    },
                    
                    craft_weapon: {
                        resource_metal: 10,
                        resource_rope: 1
                    },
                
                    unlock_worker_rope: {
                        rumours: 2
                    },
                
                    unlock_building_library: {
                        evidence: 4
                    },
                
                    unlock_building_darkfarm: {
                        rumours: 10
                    },
                
                    unlock_building_hospital: {
                        evidence: 8,
                        rumours: 2,
                    },
                
                    unlock_building_inn: {
                        evidence: 10,
                        rumours: 10
                    },
                
                    unlock_building_house2: {
                        rumours: 20,
                    },
                
                    unlock_building_trade: {
                        rumours: 30,
                    },
                    
                    unlock_building_lights:  {
                        evidence: 25,
                    },
                
                    unlock_building_fortifications: {
                        rumours: 20,
                        evidence: 2,
                    },
                
                    unlock_building_barracks: {
                        rumours: 40,
                    },
                
                    unlock_building_cementmill: {
                        evidence: 20,
                    },
                
                    unlock_building_smithy: {
                        evidence: 20,
                    },
                
                    unlock_building_apothecary: {
                        evidence: 20,
                    },
                
                    upgrade_building_campfire: {
                        rumours: 4
                    },
                
                    upgrade_building_hospital: {
                        rumours: 10
                    },
                
                    unlock_building_radio: {
                        evidence: 20,
                    },
                    
                    unlock_building_passage_staircase: {
                        evidence: 2,
                        rumours: 2,
                    },
                
                    unlock_building_passage_hole: {
                        evidence: 50,
                    },
                
                    unlock_building_passage_elevator: {
                        evidence: 50,
                    }
                },
            
                cooldowns: {
                    scavenge: 12,
                    fightCheck: 20,
                    use_in_campfire: 60,
                    use_in_inn: 60 * 30,
                },
            
                descriptions: {
                    scout: "Scout the area for evidence.",
                    scavenge: "Look for resources.",
                    build_out_collector_food: "Collect food.",
                    build_out_collector_water: "Collect water.",
                    build_in_house: "A place for people to stay.",
                    build_in_storage: "Increases resource storage.",
                    build_in_campfire: "Increases rumour generation and unlocks upgrades.",
                    build_in_library: "Accumulate and store more evidence.",
                    build_in_hospital: "Enables healing injuries.",
                    build_in_darkfarm: "Produces food",
                    build_in_tradingPost: "Connect camps to a trade network.",
                    build_in_market: "Enables foreign traders to visit.",
                    build_in_barracks: "Allows 10 soldiers.",
                    use_in_campfire: "Collect rumours from the population.",
                    use_in_hospital: "Heal injuries.",
                    use_in_inn: "Recruit followers.",
                },
            
                getCosts: function(action, ordinal, statusCostFactor) {
                    var result = {};
                    if (this.costs[action]) {
                        var costFactor = this.costs[action].cost_factor;
                        if (!costFactor) costFactor = 1;
                        if (!ordinal) ordinal = 1;
                        var ordinalCostFactor = Math.pow(costFactor, ordinal-1);
                        
                        for(var key in this.costs[action]) {
                            if (key != "cost_factor" && key != "cost_source") {
                                result[key] = Math.round(this.costs[action][key] * ordinalCostFactor * statusCostFactor);
                            }
                        }
                    } else {
                        switch(action) {
                            case "move_camp_level":
                            case "move_camp_global":
                            result.stamina = 5*this.costs.move_sector_left.stamina * statusCostFactor;
                            break;
                        }
                    }
                
                    return result;
                },
            
                getCostSource: function (action) {
                    var rawSource = this.costs[action].cost_source;
                    if (rawSource) return rawSource;
                    return COST_SOURCE_DEFAULT;
                },
                
                getReqs: function (action, ordinal) {
                    switch (action) {
                        default:
                            return this.requirements[action];
                        }
                },
                
                getDescription: function (action) {
                    if (this.descriptions[action]) {
                        return this.descriptions[action];
                    }
                    return "";
                },
            
                getCooldown: function (action) {
                    if (this.cooldowns[action]) {
                        return this.cooldowns[action];
                    }
                    return 0;
                },
                
                getScavengeEfficiency: function (playerVision, playerHealth) {
                    return (playerHealth/100) * (playerVision/100);
                },
            
                getResourcesForScavenge: function (playerVision, playerHealth, sectorResources, isPlayer) {
                    var results = new ResourcesVO();
                
                    if (isPlayer) {
                        var efficiency = this.getScavengeEfficiency(playerVision, playerHealth);
                        for (var key in resourceNames) {
                            var name = resourceNames[key];
                            var sectorAmount = sectorResources.getResource(name);
                            var probability = 0.2;
                            var amountFactor = 1;
                            if(name === "metal") {
                                probability = 0.98;
                                amountFactor = 2;
                            } else if(name == "water" || name == "food") {
                                probability = 0.3;
                                amountFactor = 3;
                            }
                            var resultAmount = Math.random() < probability ?
                                Math.ceil(efficiency * amountFactor * sectorAmount * Math.random()) :
                                0;
                    
                            results.setResource(name, resultAmount);
                        }
                    } else {
                        results.metal = CampConstants.PRODUCTION_METAL_PER_WORKER_PER_S;
                    }
                    
                    return results;
                },
            
                getResourcesForScout: function (sectorResources) {
                    var results = new ResourcesVO();
                    var commonResName;
                    var commonResAmount = 0;
                    for (var key in resourceNames) {
                        var name = resourceNames[key];
                        var sectorAmount = sectorResources.getResource(name);
                        
                        if (sectorAmount > commonResAmount) {
                            commonResAmount = sectorAmount;
                            commonResName = name;
                        }
                    }
                
                    if (commonResAmount > 0) {
                        var probability = 0.75;
                        if (Math.random() < probability) {
                            var resultAmount = Math.ceil(commonResAmount*(Math.random()+1));
                            results.setResource(commonResName, resultAmount);
                        }
                    }
                    
                    return results;
                },
            
            getItemsForScavange: function(playerVision, currentItems, levelOrdinal) {
                return this.getScaFIItems( 0.0075, playerVision * 0.25, currentItems, levelOrdinal );
            },
            
            // probability of getting something: 0-1 for one item
            // typical rarity of items: 0-100
            getScaFIItems: function( itemProbability, itemRarity, currentItems, levelOrdinal ) {
                var items = [];
                
                // Neccessity items that the player should find quickly if missing
                var necessityItem = this.getNecessityItem(currentItems);
                if (necessityItem && Math.random() < itemProbability * 33) {
                items.push(necessityItem);
                }
                
                // Normal items
                if (Math.random() < itemProbability) {		
                var itemTypeRand = Math.random();
                if(itemTypeRand < 0.2) {
                    items.push( ItemConstants.itemDefinitions.shoes[0].clone());
                } else if (itemTypeRand < 0.25) {
                    var i = Math.floor(Math.random()*ItemConstants.itemDefinitions.bag.length-1);
                    items.push( ItemConstants.itemDefinitions.bag[i+1].clone());
                } else if (itemTypeRand < 0.5) {
                    items.push(ItemConstants.getDefaultClothing(levelOrdinal));		    
                } else if (itemTypeRand < 0.75) {
                    items.push(ItemConstants.getDefaultWeapon(levelOrdinal));
                } else {
                    var i = Math.floor(Math.random()*ItemConstants.itemDefinitions.artefact.length);
                    items.push( ItemConstants.itemDefinitions.artefact[i].clone());
                }
                }
                return items;
            },
            
            getNecessityItem: function(currentItems) {
                if(currentItems.getCurrentBonus(ItemConstants.itemTypes.bag) <= 0) {
                return ItemConstants.itemDefinitions.bag[0];
                }
                
                return null;
            },
            
        };
    
    return PlayerActionConstants;
    
});
