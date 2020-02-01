define(['ash', 'game/constants/PlayerActionConstants', 'game/constants/TribeConstants', 'game/constants/WorldCreatorConstants', 'game/vos/UpgradeVO'],
function (Ash, PlayerActionConstants, TribeConstants, WorldCreatorConstants, UpgradeVO) {
    
    var UpgradeConstants = {
        
        BLUEPRINT_TYPE_EARLY: "b-early",
        BLUEPRINT_TYPE_LATE: "b-late",
        
        upgradeIds: {
        	unlock_item_clothing5l: "unlock_item_clothing5l",
        	unlock_item_clothing8: "unlock_item_clothing8",
        	unlock_item_weapon8: "unlock_item_weapon8",
        	unlock_building_ceiling: "unlock_building_ceiling",
        	unlock_building_spaceship1: "unlock_building_spaceship1",
        	unlock_building_spaceship2: "unlock_building_spaceship2",
        	unlock_building_spaceship3: "unlock_building_spaceship3",
        	unlock_item_bag_4: "unlock_item_bag_4",
        	improve_building_market3: "improve_building_market3",
        	upgrade_building_cementmill: "upgrade_building_cementmill",
        	unlock_building_researchcenter: "unlock_building_researchcenter",
        	unlock_item_weapon7: "unlock_item_weapon7",
        	unlock_item_clothing_head_5: "unlock_item_clothing_head_5",
        	upgrade_building_apothecary: "upgrade_building_apothecary",
        	unlock_item_weapon6: "unlock_item_weapon6",
        	unlock_building_radio: "unlock_building_radio",
        	upgrade_building_hospital: "upgrade_building_hospital",
        	unlock_itemclothing_lower_45: "unlock_itemclothing_lower_45",
        	unlock_item_weapon58: "unlock_item_weapon58",
        	unlock_item_scavenger_gear: "unlock_item_scavenger_gear",
        	upgrade_worker_chemist: "upgrade_worker_chemist",
        	unlock_item_clothing_upper_4: "unlock_item_clothing_upper_4",
        	upgrade_building_shrine: "upgrade_building_shrine",
        	unlock_item_weapon52: "unlock_item_weapon52",
        	unlock_item_clothing6: "unlock_item_clothing6",
        	upgrade_building_storage2: "upgrade_building_storage2",
        	upgrade_building_fortifications: "upgrade_building_fortifications",
        	unlock_item_clothing3h: "unlock_item_clothing3h",
        	unlock_item_clothing4he: "unlock_item_clothing4he",
        	unlock_item_bag3: "unlock_item_bag3",
        	unlock_item_weapon5: "unlock_item_weapon5",
        	unlock_building_aqueduct: "unlock_building_aqueduct",
        	unlock_item_clothing4: "unlock_item_clothing4",
        	upgrade_building_library2: "upgrade_building_library2",
        	unlock_building_apothecary: "unlock_building_apothecary",
        	upgrade_worker_trapper: "upgrade_worker_trapper",
        	unlock_building_barracks: "unlock_building_barracks",
        	upgrade_building_campfire: "upgrade_building_campfire",
        	upgrade_building_inn: "upgrade_building_inn",
        	upgrade_building_market2: "upgrade_building_market2",
        	unlock_item_weapon4: "unlock_item_weapon4",
        	unlock_item_clothing5: "unlock_item_clothing5",
        	unlock_item_clothing3: "unlock_item_clothing3",
        	upgrade_outgoing_caravans: "upgrade_outgoing_caravans",
        	unlock_item_clothing_hands_25: "unlock_item_clothing_hands_25",
        	upgrade_building_storage1: "upgrade_building_storage1",
        	unlock_building_passage_hole: "unlock_building_passage_hole",
        	unlock_building_house2: "unlock_building_house2",
        	unlock_building_smithy: "unlock_building_smithy",
        	unlock_item_bag22: "unlock_item_bag22",
        	unlock_item_firstaid: "unlock_item_firstaid",
        	upgrade_building_market: "upgrade_building_market",
        	upgrade_worker_collector1: "upgrade_worker_collector1",
        	unlock_building_cementmill: "unlock_building_cementmill",
        	unlock_item_clothing4h: "unlock_item_clothing4h",
        	unlock_building_passage_elevator: "unlock_building_passage_elevator",
        	unlock_item_weapon25: "unlock_item_weapon25",
        	unlock_building_bridge: "unlock_building_bridge",
        	upgrade_building_library: "upgrade_building_library",
        	unlock_building_lights: "unlock_building_lights",
        	unlock_item_weapon2: "unlock_item_weapon2",
        	upgrade_worker_scavenger: "upgrade_worker_scavenger",
        	unlock_outgoing_caravans: "unlock_outgoing_caravans",
        	unlock_building_library: "unlock_building_library",
        	unlock_building_inn: "unlock_building_inn",
        	unlock_building_market: "unlock_building_market",
        	unlock_building_fortifications: "unlock_building_fortifications",
        	unlock_item_bag2: "unlock_item_bag2",
        	unlock_weapon_15: "unlock_weapon_15",
        	unlock_clothing_basic: "unlock_clothing_basic",
        	unlock_clothing_warm: "unlock_clothing_warm",
        	unlock_building_darkfarm: "unlock_building_darkfarm",
        	unlock_building_tradingpost: "unlock_building_tradingpost",
        	unlock_item_clothing2: "unlock_item_clothing2",
        	unlock_building_passage_staircase: "unlock_building_passage_staircase",
        	unlock_building_hospital: "unlock_building_hospital",
        	unlock_worker_rope: "unlock_worker_rope",
        	unlock_item_shoe1: "unlock_item_shoe1",
        },

        upgradeDefinitions: {},
        
        upgradeUIEffects: {
            calendar: "calendar",
        },
        
        // camp ordinal > a list of blueprints, first array is early and second is late
        blueprintsByCampOrdinal: {
        	1: [["unlock_item_shoe1"], ["unlock_building_passage_staircase"]],
        	2: [["unlock_building_tradingpost"], ["unlock_clothing_warm", "unlock_building_darkfarm"]],
        	3: [["unlock_building_library", "unlock_building_market"], ["unlock_building_inn", "unlock_building_fortifications"]],
        	4: [["unlock_item_weapon2"], ["upgrade_worker_scavenger"]],
        	5: [["unlock_item_clothing4h", "unlock_building_bridge"], ["unlock_building_passage_elevator", "unlock_building_lights"]],
        	6: [["unlock_building_smithy", "unlock_item_bag22"], ["upgrade_building_market", "upgrade_worker_collector1", "unlock_building_cementmill"]],
        	7: [["upgrade_building_storage1"], ["unlock_building_passage_hole", "unlock_building_house2"]],
        	8: [["unlock_item_weapon4", "unlock_item_clothing5"], ["upgrade_building_market2", "unlock_item_clothing3"]],
        	9: [["upgrade_building_campfire"], ["upgrade_worker_trapper"]],
        	10: [["unlock_item_weapon5", "unlock_item_clothing4"], ["unlock_item_bag3", "unlock_building_aqueduct", "upgrade_building_library2"]],
        	11: [["unlock_item_clothing6", "unlock_item_clothing4he"], ["unlock_item_weapon52", "upgrade_building_storage2", "upgrade_building_fortifications"]],
        	12: [["unlock_item_weapon58"], ["unlock_item_scavenger_gear", "upgrade_worker_chemist"]],
        	13: [["unlock_item_weapon6"], ["upgrade_building_apothecary", "unlock_building_radio", "upgrade_building_hospital"]],
        	14: [["unlock_building_researchcenter", "unlock_item_weapon7"], ["unlock_item_bag_4", "improve_building_market3", "upgrade_building_cementmill"]],
        	15: [["unlock_building_ceiling", "unlock_item_clothing5l"], ["unlock_item_clothing8", "unlock_item_weapon8", "unlock_building_spaceship1", "unlock_building_spaceship2", "unlock_building_spaceship3"]],
        },
        
        piecesByBlueprint: {
            unlock_item_clothing5l: 3,
        	unlock_item_clothing8: 4,
        	unlock_item_weapon8: 2,
        	unlock_building_ceiling: 3,
        	unlock_building_spaceship1: 3,
        	unlock_building_spaceship2: 2,
        	unlock_building_spaceship3: 5,
        	unlock_item_bag_4: 4,
        	improve_building_market3: 3,
        	upgrade_building_cementmill: 3,
        	unlock_building_researchcenter: 2,
        	unlock_item_weapon7: 5,
        	upgrade_building_apothecary: 5,
        	unlock_item_weapon6: 4,
        	unlock_building_radio: 3,
        	upgrade_building_hospital: 3,
        	unlock_item_weapon58: 3,
        	unlock_item_scavenger_gear: 3,
        	upgrade_worker_chemist: 2,
        	unlock_item_weapon52: 2,
        	unlock_item_clothing6: 3,
        	upgrade_building_storage2: 5,
        	upgrade_building_fortifications: 3,
        	unlock_item_clothing4he: 2,
        	unlock_item_bag3: 2,
        	unlock_item_weapon5: 5,
        	unlock_building_aqueduct: 4,
        	unlock_item_clothing4: 3,
        	upgrade_building_library2: 3,
        	upgrade_worker_trapper: 2,
        	upgrade_building_campfire: 3,
        	upgrade_building_market2: 3,
        	unlock_item_weapon4: 3,
        	unlock_item_clothing5: 4,
        	unlock_item_clothing3: 2,
        	upgrade_building_storage1: 2,
        	unlock_building_passage_hole: 5,
        	unlock_building_house2: 2,
        	unlock_building_smithy: 3,
        	unlock_item_bag22: 2,
        	upgrade_building_market: 3,
        	upgrade_worker_collector1: 2,
        	unlock_building_cementmill: 3,
        	unlock_item_clothing4h: 3,
        	unlock_building_passage_elevator: 3,
        	unlock_building_bridge: 3,
        	unlock_building_lights: 2,
        	unlock_item_weapon2: 3,
        	upgrade_worker_scavenger: 4,
        	unlock_building_library: 3,
        	unlock_building_inn: 3,
        	unlock_building_market: 3,
        	unlock_building_fortifications: 3,
        	unlock_clothing_warm: 2,
        	unlock_building_darkfarm: 4,
        	unlock_building_tradingpost: 2,
        	unlock_building_passage_staircase: 3,
            unlock_item_shoe1: 2,
        },
		
        // caches for faster world generation / page load
        campOrdinalsByBlueprint: {},
        minCampOrdinalsByUpgrade: {},
        
		getBlueprintCampOrdinal: function (upgradeId) {
            if (this.campOrdinalsByBlueprint[upgradeId]) {
                return this.campOrdinalsByBlueprint[upgradeId];
            }
            for (var key in this.blueprintsByCampOrdinal) {
                if (this.blueprintsByCampOrdinal[key][0].indexOf(upgradeId) >= 0) {
                    this.campOrdinalsByBlueprint[upgradeId] = key;
                    return key;
                }
                if (this.blueprintsByCampOrdinal[key][1].indexOf(upgradeId) >= 0) {
                    this.campOrdinalsByBlueprint[upgradeId] = key;
                    return key;
                }
            }
			return 1;
		},
        
        getMaxPiecesForBlueprint: function (upgradeId) {
            if (this.piecesByBlueprint[upgradeId]) return this.piecesByBlueprint[upgradeId];
            return 3;
        },
        
        getBlueprintType: function (upgradeId) {
            var ordinal = this.getBlueprintCampOrdinal(upgradeId);
            if (this.blueprintsByCampOrdinal[ordinal][0].indexOf(upgradeId) >= 0) return this.BLUEPRINT_TYPE_EARLY;
            if (this.blueprintsByCampOrdinal[ordinal][1].indexOf(upgradeId) >= 0) return this.BLUEPRINT_TYPE_LATE;
            return null;
        },
        
        getblueprintsByCampOrdinal: function (campOrdinal, blueprintType) {
            if (!this.blueprintsByCampOrdinal[campOrdinal]) return [];
            if (blueprintType == this.BLUEPRINT_TYPE_EARLY) {
                return this.blueprintsByCampOrdinal[campOrdinal][0];
            } else if (blueprintType == this.BLUEPRINT_TYPE_LATE) {
                return this.blueprintsByCampOrdinal[campOrdinal][1];
            } else {
                return this.blueprintsByCampOrdinal[campOrdinal][0].concat(this.blueprintsByCampOrdinal[campOrdinal][1]);
            }
        },
        
        getPiecesByCampOrdinal: function (campOrdinal, blueprintType) {
            var pieceCount = 0;
            var blueprints = this.getblueprintsByCampOrdinal(campOrdinal, blueprintType);
            for (var i = 0; i < blueprints.length; i++) {
                pieceCount += this.getMaxPiecesForBlueprint(blueprints[i]);
            }
            return pieceCount;
        },
        
        getRequiredTech: function (upgradeID) {
            var reqs = PlayerActionConstants.requirements[upgradeID];
            if (reqs && reqs.upgrades) {
                return Object.keys(reqs.upgrades);
            }
            return [];
        },
        
        getMinimumCampOrdinalForUpgrade: function (upgrade) {
            if (this.getMinimumCampOrdinalForUpgrade[upgrade]) return this.getMinimumCampOrdinalForUpgrade[upgrade];
            
            // required tech
            var requiredTech = this.getRequiredTech(upgrade);
            var requiredTechCampOrdinal = 0;
            for (var i = 0; i < requiredTech.length; i++) {
                requiredTechCampOrdinal = Math.max(requiredTechCampOrdinal, this.getMinimumCampOrdinalForUpgrade(requiredTech[i]));
            }
            
            // blueprint
            var blueprintCampOrdinal = this.getBlueprintCampOrdinal(upgrade);
            
            // costs
            var costCampOrdinal = 1;
            var costs = PlayerActionConstants.costs[upgrade];
            if (!costs) log.w("upgrade has no costs: " + upgrade);
            if (costs.evidence) {
                var evidenceOrdinal = TribeConstants.getFirstCampOrdinalWithMinStat("evidence", costs.evidence);
                costCampOrdinal = Math.max(costCampOrdinal, evidenceOrdinal);
            }
            if (costs.rumours) {
                var rumoursOrdinal = TribeConstants.getFirstCampOrdinalWithMinStat("rumours", costs.rumours);
                costCampOrdinal = Math.max(costCampOrdinal, rumoursOrdinal);
            }
            if (costs.favour) {
                costCampOrdinal = Math.max(costCampOrdinal, WorldCreatorConstants.CAMPS_BEFORE_GROUND);
                var favourCampOrdinal = TribeConstants.getFirstCampOrdinalWithMinStat("favour", costs.favour);
                costCampOrdinal = Math.max(costCampOrdinal, favourCampOrdinal);
            }
            
            result = Math.max(1, blueprintCampOrdinal, requiredTechCampOrdinal, costCampOrdinal);
            this.getMinimumCampOrdinalForUpgrade[upgrade] = result;
            return result;
        },
    
        getMinimumLevelStepForUpgrade: function (upgrade) {
            var result = 0;
            var blueprintType = this.getBlueprintType(upgrade);
            if (blueprintType == this.BLUEPRINT_TYPE_EARLY)
                result = WorldCreatorConstants.CAMP_STEP_START;
            if (blueprintType == this.BLUEPRINT_TYPE_LATE)
                result = WorldCreatorConstants.CAMP_STEP_POI_2;
                
            var requiredTech = this.getRequiredTech(upgrade);
            for (var i = 0; i < requiredTech.length; i++) {
                result = Math.max(result, this.getMinimumLevelStepForUpgrade(requiredTech[i]));
            }
            
            return result;
        },
        
    };
    
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing5l]
    = new UpgradeVO("unlock_item_clothing5l", "Scavenger Gear", "Augmented clothing made to withstand the harshest of environments.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing8]
    = new UpgradeVO("unlock_item_clothing8", "Exoskeletons", "Modern armour that takes inspiration from military automatons.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_weapon8]
    = new UpgradeVO("unlock_item_weapon8", "Rifle", "Knowledge to make the deadliest weapons.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_ceiling]
    = new UpgradeVO("unlock_building_ceiling", "UV Protection", "Protection from sunlight.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_spaceship1]
    = new UpgradeVO("unlock_building_spaceship1", "Space Colony Hull", "Part of constructing a space colony.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_spaceship2]
    = new UpgradeVO("unlock_building_spaceship2", "Space Colony Shield", "Part of constructing a space colony.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_spaceship3]
    = new UpgradeVO("unlock_building_spaceship3", "Space Colony Life Support", "Part of constructing a space colony.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_bag_4]
    = new UpgradeVO("unlock_item_bag_4", "Bag-making 3", "Leather-working for making better bags.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.improve_building_market3]
    = new UpgradeVO("improve_building_market3", "Network", "Partially restore the Network that (according to legends) used to cover the whole City.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_cementmill]
    = new UpgradeVO("upgrade_building_cementmill", "Internal Combustion Engine", "More powerful engines for large-scale manufacturing.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_researchcenter]
    = new UpgradeVO("unlock_building_researchcenter", "Laboratories", "Places to generate new knowledge instead of just collecting and archiving the old.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_weapon7]
    = new UpgradeVO("unlock_item_weapon7", "Jet engine", "Taking weapons and fighting to a new level of destructiveness.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing_head_5]
    = new UpgradeVO("unlock_item_clothing_head_5", "Helmet-making", "The art of making helmets.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_apothecary]
    = new UpgradeVO("upgrade_building_apothecary", "Medicine", "Rediscovered modern technology for disease prevention and treatment.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_weapon6]
    = new UpgradeVO("unlock_item_weapon6", "Automatic pistols", "Unlocks a new class of lethal weapons.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_radio]
    = new UpgradeVO("unlock_building_radio", "Radio", "Build radio towers to increase your civilization's reputation.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_hospital]
    = new UpgradeVO("upgrade_building_hospital", "Surgery", "Complex procedures for fixing the human body.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_itemclothing_lower_45]
    = new UpgradeVO("unlock_itemclothing_lower_45", "Augmented Clothing 4", "Even better use of spider silk and recycled materials.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_weapon58]
    = new UpgradeVO("unlock_item_weapon58", "Shotgun", "");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_scavenger_gear]
    = new UpgradeVO("unlock_item_scavenger_gear", "Augmented Clothing 3", "New techniques for improving old designs.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_worker_chemist]
    = new UpgradeVO("upgrade_worker_chemist", "Chemistry", "Rediscovering the study of substances and chemical reactions.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing_upper_4]
    = new UpgradeVO("unlock_item_clothing_upper_4", "Augmented Clothing 2", "");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_shrine]
    = new UpgradeVO("upgrade_building_shrine", "Philosophy", "Another way to find answers to questions.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_weapon52]
    = new UpgradeVO("unlock_item_weapon52", "Axe-making 2", "Improved war axes.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing6]
    = new UpgradeVO("unlock_item_clothing6", "Augmented Clothing 1", "Techniques for improving existing clothing for exploration");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_storage2]
    = new UpgradeVO("upgrade_building_storage2", "Refrigeration", "Improving storage by controlling temperature.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_fortifications]
    = new UpgradeVO("upgrade_building_fortifications", "Concrete Fortifications", "Better fortifications");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing3h]
    = new UpgradeVO("unlock_item_clothing3h", "Glove-making 2", "Good gloves to keep explorers safe");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing4he]
    = new UpgradeVO("unlock_item_clothing4he", "Gas Masks", "Protection against environmental hazards");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_bag3]
    = new UpgradeVO("unlock_item_bag3", "Bag-making 2", "Unlock the automatic luggage.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_weapon5]
    = new UpgradeVO("unlock_item_weapon5", "Revolvers", "A gun that allows the user to fire multiple rounds without reloading.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_aqueduct]
    = new UpgradeVO("unlock_building_aqueduct", "Aqueducts", "Tapping into the decaying water infrastructure and extending it to efficiently store and convey water.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing4]
    = new UpgradeVO("unlock_item_clothing4", "Vest plating", "Basic protective clothing to give an edge in fights.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_library2]
    = new UpgradeVO("upgrade_building_library2", "Scientific Method", "An organized approach to growing new knowledge");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_apothecary]
    = new UpgradeVO("unlock_building_apothecary", "Alchemy", "Basic knowledge of making herbal medicines.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_worker_trapper]
    = new UpgradeVO("upgrade_worker_trapper", "Food preservation", "Salting, smoking and pickling food to make it last longer.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_barracks]
    = new UpgradeVO("unlock_building_barracks", "Military", "A dedicated and trained class of workers for protecting and fighting.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_campfire]
    = new UpgradeVO("upgrade_building_campfire", "Brewing", "Production of beer, which helps bring people together.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_inn]
    = new UpgradeVO("upgrade_building_inn", "Music", "Another useful way to raise spirits and bond groups.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_market2]
    = new UpgradeVO("upgrade_building_market2", "Paper Money", "Further improve trade by using lighter currency that is easier to carry around.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_weapon4]
    = new UpgradeVO("unlock_item_weapon4", "Metal working 2", "Better techniques for metal-working allow better weapons and more tools.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing5]
    = new UpgradeVO("unlock_item_clothing5", "Armour", "Adapting the new metal working techniques for protection.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing3]
    = new UpgradeVO("unlock_item_clothing3", "Guard Uniform", "A standardised outfit that offest basic protection.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_outgoing_caravans]
    = new UpgradeVO("upgrade_outgoing_caravans", "Bigger caravans", "Managing bigger caravans that can carry more goods");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing_hands_25]
    = new UpgradeVO("unlock_item_clothing_hands_25", "Glove-making", "Gloves are a scavenger's best tool.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_storage1]
    = new UpgradeVO("upgrade_building_storage1", "Pest control", "Keeping other animals away from food and materials for more reliable storage.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_passage_hole]
    = new UpgradeVO("unlock_building_passage_hole", "Engineering", "Enables building huge structures to bridge levels when there is no existing staircase or elevator, and lays the foundation for more construction projects.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_house2]
    = new UpgradeVO("unlock_building_house2", "Tower blocks", "Reclaiming tower blocks that can house more people.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_smithy]
    = new UpgradeVO("unlock_building_smithy", "Metal working 1", "Smiths can turn scrap metal into tools and weapons.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_bag22]
    = new UpgradeVO("unlock_item_bag22", "Bag-making", "Making better bags for explorers.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_firstaid]
    = new UpgradeVO("unlock_item_firstaid", "First Aid", "Heal injuries on the go.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_market]
    = new UpgradeVO("upgrade_building_market", "Currency", "Common medium of exchange makes trading more efficient.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_worker_collector1]
    = new UpgradeVO("upgrade_worker_collector1", "Water purification", "Techniques for large-scale filtering and disinfecting drinking water that permit using more water sources.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_cementmill]
    = new UpgradeVO("unlock_building_cementmill", "Cement", "Unlocks the production of concrete, a strong and versatile building material.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing4h]
    = new UpgradeVO("unlock_item_clothing4h", "Advanced Textiles", "Create and manipulate new, stronger fibers for better protection and easier manufacturing.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_passage_elevator]
    = new UpgradeVO("unlock_building_passage_elevator", "Elevator mechanics", "Repairing elevators that allow passage to new levels.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_weapon25]
    = new UpgradeVO("unlock_item_weapon25", "Axe-making", "A weapon made for war.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_bridge]
    = new UpgradeVO("unlock_building_bridge", "Bridge-building", "Building bridges over collapsed sectors.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_library]
    = new UpgradeVO("upgrade_building_library", "Education", "A more systematic approach to knowledge gathering and preservation. Will enable more specialized workers later on.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_lights]
    = new UpgradeVO("unlock_building_lights", "Electric light", "Lights that defeat the darkness in the camp once and for all.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_weapon2]
    = new UpgradeVO("unlock_item_weapon2", "Spear", "An ancient but effective weapon.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_worker_scavenger]
    = new UpgradeVO("upgrade_worker_scavenger", "Smelting", "Processing technique that allows more metal left behind by previous inhabitants to be salvaged.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_outgoing_caravans]
    = new UpgradeVO("unlock_outgoing_caravans", "Caravans", "Travelling to other factions to trade for goods");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_library]
    = new UpgradeVO("unlock_building_library", "Libraries", "Concentrated effort to build and store knowledge.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_inn]
    = new UpgradeVO("unlock_building_inn", "Hospitality", "Sometimes strangers pass by the camp. Perhaps we can offer them a place to sleep?");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_market]
    = new UpgradeVO("unlock_building_market", "Trade", "Trade with people from foreign camps and cooperatives.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_fortifications]
    = new UpgradeVO("unlock_building_fortifications", "Fortifications", "Constructions to keep unwelcome strangers away.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_bag2]
    = new UpgradeVO("unlock_item_bag2", "Leather-working", "The art of crafting durable bags.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_weapon_15]
    = new UpgradeVO("unlock_weapon_15", "Knife", "Slightly more reliable than the shiv.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_clothing_basic]
    = new UpgradeVO("unlock_clothing_basic", "Weaving", "Technique for making basic clothing.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_clothing_warm]
    = new UpgradeVO("unlock_clothing_warm", "Textile Arts", "New ways of making textiles.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_darkfarm]
    = new UpgradeVO("unlock_building_darkfarm", "Urban Heliculture", "Alternative source of food.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_tradingpost]
    = new UpgradeVO("unlock_building_tradingpost", "Compass", "A tool for reliable navigation in the vast city, enabling the establishment of basic trade routes.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing2]
    = new UpgradeVO("unlock_item_clothing2", "Sewing", "The craft of making clothes out of fabric.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_passage_staircase]
    = new UpgradeVO("unlock_building_passage_staircase", "Building projects", "Managing large building projects and building structures that allow passage to different levels.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_hospital]
    = new UpgradeVO("unlock_building_hospital", "Field medicine", "Treating basic injuries.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_worker_rope]
    = new UpgradeVO("unlock_worker_rope", "Rope-making", "Using scavenged fiber and cloth to make rope, a useful building and crafting material.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_shoe1]
    = new UpgradeVO("unlock_item_shoe1", "Crafting", "The varied skill of making useful things out of whatever happens to be available");
    
    return UpgradeConstants;
    
});
