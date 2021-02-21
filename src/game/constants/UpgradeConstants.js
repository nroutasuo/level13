define(['ash', 'game/constants/PlayerActionConstants', 'game/constants/TribeConstants', 'game/constants/WorldConstants', 'game/vos/UpgradeVO'],
function (Ash, PlayerActionConstants, TribeConstants, WorldConstants, UpgradeVO) {
    
    var UpgradeConstants = {
        
        BLUEPRINT_BRACKET_EARLY: "b-early",
        BLUEPRINT_BRACKET_LATE: "b-late",
        
        UPGRADE_TYPE_RUMOURS: "rumours",
        UPGRADE_TYPE_FAVOUR: "favour",
        UPGRADE_TYPE_EVIDENCE: "evidence",
        
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
        	upgrade_building_hospital: "upgrade_building_hospital",
        	upgrade_building_apothecary: "upgrade_building_apothecary",
        	unlock_item_weapon6: "unlock_item_weapon6",
        	unlock_building_radio: "unlock_building_radio",
        	unlock_itemclothing_lower_45: "unlock_itemclothing_lower_45",
        	unlock_item_clothing_head_5: "unlock_item_clothing_head_5",
        	upgrade_building_temple3: "upgrade_building_temple3",
        	unlock_item_weapon58: "unlock_item_weapon58",
        	unlock_item_scavenger_gear: "unlock_item_scavenger_gear",
        	upgrade_worker_chemist: "upgrade_worker_chemist",
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
        	upgrade_building_temple2: "upgrade_building_temple2",
        	upgrade_worker_trapper: "upgrade_worker_trapper",
        	unlock_building_barracks: "unlock_building_barracks",
        	upgrade_building_campfire: "upgrade_building_campfire",
        	upgrade_building_inn: "upgrade_building_inn",
        	upgrade_building_market2: "upgrade_building_market2",
        	unlock_item_clothingl14: "unlock_item_clothingl14",
        	unlock_item_weapon4: "unlock_item_weapon4",
        	unlock_item_clothing5: "unlock_item_clothing5",
        	unlock_item_clothing3: "unlock_item_clothing3",
        	unlock_action_clear_waste_t: "unlock_action_clear_waste_t",
        	unlock_building_greenhouse: "unlock_building_greenhouse",
        	upgrade_outgoing_caravans: "upgrade_outgoing_caravans",
        	unlock_item_clothing_hands_25: "unlock_item_clothing_hands_25",
        	upgrade_building_storage1: "upgrade_building_storage1",
        	unlock_building_passage_hole: "unlock_building_passage_hole",
        	unlock_building_house2: "unlock_building_house2",
        	unlock_building_smithy: "unlock_building_smithy",
        	unlock_action_clear_waste_r: "unlock_action_clear_waste_r",
        	unlock_item_bag22: "unlock_item_bag22",
        	unlock_item_weapon3: "unlock_item_weapon3",
        	unlock_item_firstaid: "unlock_item_firstaid",
        	upgrade_worker_collector1: "upgrade_worker_collector1",
        	unlock_building_cementmill: "unlock_building_cementmill",
        	upgrade_building_market: "upgrade_building_market",
        	unlock_item_clothing4h: "unlock_item_clothing4h",
        	unlock_building_passage_elevator: "unlock_building_passage_elevator",
        	unlock_building_lights: "unlock_building_lights",
        	unlock_item_weapon25: "unlock_item_weapon25",
        	upgrade_building_library: "upgrade_building_library",
        	unlock_building_beacon: "unlock_building_beacon",
        	unlock_building_bridge: "unlock_building_bridge",
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
        
        // camp ordinal > a list of blueprints, first array is early, second is late, third is blueprints that can appear on campless levels
        blueprintsByCampOrdinal: {
        	1: [["unlock_item_shoe1"], ["unlock_building_passage_staircase"], []],
        	2: [["unlock_clothing_warm", "unlock_building_tradingpost"], ["unlock_weapon_15"], ["unlock_building_darkfarm"]],
        	3: [["unlock_building_library", "unlock_building_market"], ["unlock_building_inn", "unlock_building_fortifications"], []],
        	4: [["unlock_building_bridge", "unlock_item_weapon2"], ["upgrade_worker_scavenger"], ["unlock_building_beacon"]],
        	5: [["unlock_item_clothing4h"], ["upgrade_building_market", "unlock_building_passage_elevator"], ["unlock_building_lights", "upgrade_building_library"]],
        	6: [["unlock_action_clear_waste_t", "unlock_item_bag22", "unlock_item_weapon3"], ["unlock_building_cementmill"], ["upgrade_worker_collector1"]],
        	7: [["upgrade_building_storage1", "unlock_building_smithy"], ["unlock_building_passage_hole"], ["unlock_building_house2"]],
        	8: [["unlock_item_weapon4", "unlock_item_clothing5", "unlock_action_clear_waste_r"], ["unlock_item_clothing3"], ["unlock_item_clothingl14"]],
        	9: [["upgrade_building_campfire"], ["upgrade_building_market2"], ["upgrade_worker_trapper"]],
        	10: [["unlock_item_weapon5", "unlock_item_clothing4"], ["unlock_building_aqueduct", "upgrade_building_library2"], ["unlock_item_bag3"]],
        	11: [["unlock_item_clothing6", "unlock_item_clothing4he"], ["unlock_item_weapon52", "upgrade_building_storage2", "upgrade_building_fortifications"], []],
        	12: [["unlock_item_weapon58"], ["unlock_item_scavenger_gear", "upgrade_worker_chemist"], []],
        	13: [["unlock_item_weapon6", "unlock_itemclothing_lower_45"], ["unlock_building_radio"], ["upgrade_building_apothecary"]],
        	14: [["unlock_building_researchcenter", "unlock_item_weapon7"], ["unlock_item_bag_4", "improve_building_market3", "upgrade_building_hospital"], ["upgrade_building_cementmill"]],
        	15: [["unlock_item_clothing5l", "unlock_building_ceiling"], ["unlock_item_clothing8", "unlock_item_weapon8", "unlock_building_spaceship1", "unlock_building_spaceship3"], ["unlock_building_spaceship2"]],
        },
        
        upgradeDescriptions: {
        	unlock_item_clothing5l: "Augmented clothing made to withstand the harshest of environments.",
            unlock_item_clothing8: "Modern armour that takes inspiration from military automatons.",
            unlock_item_weapon8: "Knowledge to make the deadliest weapons.",
            unlock_building_ceiling: "Protection from sunlight.",
            unlock_building_spaceship1: "Part of constructing a space colony.",
            unlock_building_spaceship2: "Part of constructing a space colony.",
            unlock_building_spaceship3: "Part of constructing a space colony.",
            unlock_item_bag_4: "Leather-working for making better bags.",
            improve_building_market3: "Partially restore the Network that (according to legends) used to cover the whole City.",
            upgrade_building_cementmill: "More powerful engines for large-scale manufacturing.",
            unlock_building_researchcenter: "Places to generate new knowledge instead of just collecting and archiving the old.",
            unlock_item_weapon7: "Taking weapons and fighting to a new level of destructiveness.",
            unlock_item_clothing_head_5: "The art of making helmets.",
            upgrade_building_apothecary: "Rediscovered modern technology for disease prevention and treatment.",
            unlock_item_weapon6: "Unlocks a new class of lethal weapons.",
            unlock_building_radio: "Build radio towers to increase your civilization's reputation.",
            upgrade_building_hospital: "Complex procedures for fixing the human body.",
            unlock_itemclothing_lower_45: "Even better use of spider silk and recycled materials.",
            unlock_item_weapon58: "",
            unlock_item_scavenger_gear: "New techniques for improving old designs.",
            upgrade_worker_chemist: "Rediscovering the study of substances and chemical reactions.",
            unlock_item_clothing_upper_4: "",
            upgrade_building_shrine: "Another way to find answers to questions.",
            unlock_item_weapon52: "Improved war axes.",
            unlock_item_clothing6: "Techniques for improving existing clothing for exploration",
            upgrade_building_storage2: "Improving storage by controlling temperature.",
            upgrade_building_fortifications: "Better fortifications",
            unlock_item_clothing3h: "Good gloves to keep explorers safe",
            unlock_item_clothing4he: "Protection against environmental hazards",
            unlock_item_bag3: "Unlock the automatic luggage.",
            unlock_item_weapon5: "A gun that allows the user to fire multiple rounds without reloading.",
            unlock_building_aqueduct: "Tapping into the decaying water infrastructure and extending it to efficiently store and convey water.",
            unlock_item_clothing4: "Basic protective clothing to give an edge in fights.",
            upgrade_building_library2: "An organized approach to growing new knowledge",
            unlock_building_apothecary: "Basic knowledge of making herbal medicines.",
            upgrade_worker_trapper: "Salting, smoking and pickling food to make it last longer.",
            unlock_building_barracks: "A dedicated and trained class of workers for protecting and fighting.",
            upgrade_building_campfire: "Production of beer, which helps bring people together.",
            upgrade_building_inn: "Another useful way to raise spirits and bond groups.",
            upgrade_building_market2: "Further improve trade by using lighter currency that is easier to carry around.",
            unlock_item_weapon4: "Better techniques for metal-working allow better weapons and more tools.",
            unlock_item_clothing5: "Adapting the new metal working techniques for protection.",
            unlock_item_clothing3: "A standardised outfit that offest basic protection.",
            upgrade_outgoing_caravans: "Managing bigger caravans that can carry more goods",
            unlock_item_clothing_hands_25: "Gloves are a scavenger's best tool.",
            upgrade_building_storage1: "Keeping other animals away from food and materials for more reliable storage.",
            unlock_building_passage_hole: "Enables building passages to bridge levels when there is no existing staircase or elevator.",
            unlock_building_house2: "Reclaiming tower blocks that can house more people.",
            unlock_building_smithy: "Smiths can turn scrap metal into tools and weapons.",
            unlock_item_bag22: "Making better bags for explorers.",
            unlock_item_weapon3: "A deadly ranged weapon crafted from fairly simple materials.",
            unlock_item_firstaid: "Heal injuries on the go.",
            upgrade_building_market: "Common medium of exchange makes trading more efficient.",
            upgrade_worker_collector1: "Techniques for large-scale filtering and disinfecting drinking water that permit using more water sources.",
            unlock_building_cementmill: "Unlocks the production of concrete, a strong and versatile building material.",
            unlock_item_clothing4h: "Create and manipulate new, stronger fibers for better protection and easier manufacturing.",
            unlock_building_passage_elevator: "Repairing elevators that allow passage to new levels.",
            unlock_item_weapon25: "A weapon made for war.",
            unlock_building_bridge: "Building bridges over collapsed sectors.",
            upgrade_building_library: "A more systematic approach to knowledge gathering and preservation. Will enable more specialized workers later on.",
            unlock_building_lights: "Lights that defeat the darkness in the camp once and for all.",
            unlock_item_weapon2: "An ancient but effective weapon.",
            upgrade_worker_scavenger: "Processing technique that allows more metal left behind by previous inhabitants to be salvaged.",
            unlock_outgoing_caravans: "Travel to other factions to trade for goods.",
            unlock_building_library: "Concentrated effort to build and store knowledge.",
            unlock_building_inn: "Sometimes travellers pass by the camp. Perhaps we can offer them a place to sleep?",
            unlock_building_market: "Trade with people from foreign camps and cooperatives.",
            unlock_building_fortifications: "Constructions to keep unwelcome strangers away.",
            unlock_item_bag2: "The art of crafting durable items out of leather.",
            unlock_weapon_15: "Slightly more reliable than the shiv.",
            unlock_clothing_basic: "Technique for making basic clothing.",
            unlock_clothing_warm: "New ways of making textiles.",
            unlock_building_darkfarm: "Alternative source of food.",
            unlock_building_tradingpost: "A tool for reliable navigation in the vast city, enabling the establishment of basic trade routes.",
            unlock_item_clothing2: "The craft of making clothes out of fabric.",
            unlock_building_passage_staircase: "Managing large building projects and building structures that allow passage to different levels.",
            unlock_building_hospital: "Treating basic injuries.",
            unlock_worker_rope: "Using scavenged fiber and cloth to make rope, a useful building and crafting material.",
            unlock_item_shoe1: "The varied skill of making useful things out of whatever happens to be available",
            unlock_action_clear_waste_r: "Allow clearing some radioactive waste in the environment.",
            unlock_action_clear_waste_t: "Allow clearing some toxic waste in the environment.",
            upgrade_building_temple2: "Bring the community together.",
            unlock_building_greenhouse: "Grow herbs in some rare locations in the City where conditions are right.",
            unlock_item_clothingl14: "Clothing to protect from radiactive environments.",
            unlock_building_beacon: "Lights out in the city that make exploration less dangerous."
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
        	upgrade_building_hospital: 3,
        	upgrade_building_apothecary: 5,
        	unlock_item_weapon6: 4,
        	unlock_building_radio: 3,
        	unlock_itemclothing_lower_45: 2,
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
        	unlock_item_clothingl14: 2,
        	unlock_item_weapon4: 3,
        	unlock_item_clothing5: 4,
        	unlock_item_clothing3: 2,
        	unlock_action_clear_waste_r: 3,
        	upgrade_building_storage1: 2,
        	unlock_building_passage_hole: 5,
        	unlock_building_house2: 2,
        	unlock_building_smithy: 3,
        	unlock_action_clear_waste_t: 3,
        	unlock_item_bag22: 2,
        	unlock_item_weapon3: 3,
        	upgrade_worker_collector1: 2,
        	unlock_building_cementmill: 3,
        	upgrade_building_market: 3,
        	unlock_item_clothing4h: 3,
        	unlock_building_passage_elevator: 3,
        	unlock_building_lights: 2,
        	upgrade_building_library: 2,
        	unlock_building_beacon: 3,
        	unlock_building_bridge: 3,
        	unlock_item_weapon2: 3,
        	upgrade_worker_scavenger: 4,
        	unlock_building_library: 3,
        	unlock_building_inn: 3,
        	unlock_building_market: 3,
        	unlock_building_fortifications: 3,
        	unlock_weapon_15: 2,
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
                for (var i = 0; i < 3; i++) {
                    if (this.blueprintsByCampOrdinal[key][i].indexOf(upgradeId) >= 0) {
                        this.campOrdinalsByBlueprint[upgradeId] = key;
                        return key;
                    }
                }
            }
			return 1;
		},
        
        getMaxPiecesForBlueprint: function (upgradeId) {
            if (this.piecesByBlueprint[upgradeId]) return this.piecesByBlueprint[upgradeId];
            return 3;
        },
        
        getBlueprintBracket: function (upgradeId) {
            var ordinal = this.getBlueprintCampOrdinal(upgradeId);
            if (this.blueprintsByCampOrdinal[ordinal][0].indexOf(upgradeId) >= 0) return this.BLUEPRINT_BRACKET_EARLY;
            if (this.blueprintsByCampOrdinal[ordinal][1].indexOf(upgradeId) >= 0) return this.BLUEPRINT_BRACKET_LATE;
            if (this.blueprintsByCampOrdinal[ordinal][2].indexOf(upgradeId) >= 0) return this.BLUEPRINT_BRACKET_LATE;
            return null;
        },
        
        getUpgradeType: function (upgradeId) {
			let costs = PlayerActionConstants.costs[upgradeId];
			let type = UpgradeConstants.UPGRADE_TYPE_RUMOURS;
			if (costs.favour > 0) type = UpgradeConstants.UPGRADE_TYPE_FAVOUR;
			else if (costs.evidence > 0) type = UpgradeConstants.UPGRADE_TYPE_EVIDENCE;
            return type;
        },
        
        getBlueprintsByCampOrdinal: function (campOrdinal, blueprintType, levelIndex, maxLevelIndex) {
            if (!this.blueprintsByCampOrdinal[campOrdinal]) return [];
            let result = [];
            
            if (blueprintType == this.BLUEPRINT_BRACKET_EARLY || !blueprintType) {
                if (levelIndex == 0 || levelIndex == undefined) {
                    result = result.concat(this.blueprintsByCampOrdinal[campOrdinal][0]);
                }
            }
            if (blueprintType == this.BLUEPRINT_BRACKET_LATE || !blueprintType) {
                if (levelIndex == 0 || levelIndex == undefined) {
                    result = result.concat(this.blueprintsByCampOrdinal[campOrdinal][1]);
                }
                
                if (levelIndex == 1 || maxLevelIndex < 1 || levelIndex == undefined) {
                    result = result.concat(this.blueprintsByCampOrdinal[campOrdinal][2]);
                }
            }
            
            return result;
        },
        
        getPiecesByCampOrdinal: function (campOrdinal, blueprintType, levelIndex, maxLevelIndex) {
            var pieceCount = 0;
            var blueprints = this.getBlueprintsByCampOrdinal(campOrdinal, blueprintType, levelIndex, maxLevelIndex);
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
            
            if (!this.upgradeDefinitions[upgrade]) {
                log.w("no such upgrade: " + upgrade);
                this.getMinimumCampOrdinalForUpgrade[upgrade] = 99;
                return 99;
            }
            
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
            if (!costs) {
                log.w("upgrade has no costs: " + upgrade);
            } else {
                if (costs.evidence) {
                    var evidenceOrdinal = TribeConstants.getFirstCampOrdinalWithMinStat("evidence", costs.evidence);
                    costCampOrdinal = Math.max(costCampOrdinal, evidenceOrdinal);
                }
                if (costs.rumours) {
                    var rumoursOrdinal = TribeConstants.getFirstCampOrdinalWithMinStat("rumours", costs.rumours);
                    costCampOrdinal = Math.max(costCampOrdinal, rumoursOrdinal);
                }
                if (costs.favour) {
                    costCampOrdinal = Math.max(costCampOrdinal, WorldConstants.CAMPS_BEFORE_GROUND);
                    var favourCampOrdinal = TribeConstants.getFirstCampOrdinalWithMinStat("favour", costs.favour);
                    costCampOrdinal = Math.max(costCampOrdinal, favourCampOrdinal);
                }
            }
            result = Math.max(1, blueprintCampOrdinal, requiredTechCampOrdinal, costCampOrdinal);
            this.getMinimumCampOrdinalForUpgrade[upgrade] = result;
            return result;
        },
    
        getMinimumLevelStepForUpgrade: function (upgrade) {
            var result = 0;
            var blueprintType = this.getBlueprintBracket(upgrade);
            if (blueprintType == this.BLUEPRINT_BRACKET_EARLY)
                result = WorldConstants.CAMP_STEP_START;
            if (blueprintType == this.BLUEPRINT_BRACKET_LATE)
                result = WorldConstants.CAMP_STEP_POI_2;
                
            var requiredTech = this.getRequiredTech(upgrade);
            for (var i = 0; i < requiredTech.length; i++) {
                result = Math.max(result, this.getMinimumLevelStepForUpgrade(requiredTech[i]));
            }
            
            return result;
        },
        
    };
    
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing5l]
    = new UpgradeVO("unlock_item_clothing5l", "Scavenger Gear", UpgradeConstants.upgradeDescriptions.unlock_item_clothing5l);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing8]
    = new UpgradeVO("unlock_item_clothing8", "Exoskeletons", UpgradeConstants.upgradeDescriptions.unlock_item_clothing8);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_weapon8]
    = new UpgradeVO("unlock_item_weapon8", "Rifle", UpgradeConstants.upgradeDescriptions.unlock_item_weapon8);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_ceiling]
    = new UpgradeVO("unlock_building_ceiling", "UV Protection", UpgradeConstants.upgradeDescriptions.unlock_building_ceiling);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_spaceship1]
    = new UpgradeVO("unlock_building_spaceship1", "Space Colony Hull", UpgradeConstants.upgradeDescriptions.unlock_building_spaceship1);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_spaceship2]
    = new UpgradeVO("unlock_building_spaceship2", "Space Colony Shield", UpgradeConstants.upgradeDescriptions.unlock_building_spaceship2);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_spaceship3]
    = new UpgradeVO("unlock_building_spaceship3", "Space Colony Life Support", UpgradeConstants.upgradeDescriptions.unlock_building_spaceship3);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_bag_4]
    = new UpgradeVO("unlock_item_bag_4", "Bag-making 3", UpgradeConstants.upgradeDescriptions.unlock_item_bag_4);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.improve_building_market3]
    = new UpgradeVO("improve_building_market3", "Network", UpgradeConstants.upgradeDescriptions.improve_building_market3);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_cementmill]
    = new UpgradeVO("upgrade_building_cementmill", "Internal Combustion Engine", UpgradeConstants.upgradeDescriptions.upgrade_building_cementmill);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_researchcenter]
    = new UpgradeVO("unlock_building_researchcenter", "Laboratories", UpgradeConstants.upgradeDescriptions.unlock_building_researchcenter);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_weapon7]
    = new UpgradeVO("unlock_item_weapon7", "Jet engine", UpgradeConstants.upgradeDescriptions.unlock_item_weapon7);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_hospital]
    = new UpgradeVO("upgrade_building_hospital", "Surgery", UpgradeConstants.upgradeDescriptions.upgrade_building_hospital);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_apothecary]
    = new UpgradeVO("upgrade_building_apothecary", "Medicine", UpgradeConstants.upgradeDescriptions.upgrade_building_apothecary);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_weapon6]
    = new UpgradeVO("unlock_item_weapon6", "Automatic pistols", UpgradeConstants.upgradeDescriptions.unlock_item_weapon6);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_radio]
    = new UpgradeVO("unlock_building_radio", "Radio", UpgradeConstants.upgradeDescriptions.unlock_building_radio);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_itemclothing_lower_45]
    = new UpgradeVO("unlock_itemclothing_lower_45", "Augmented Clothing 3", UpgradeConstants.upgradeDescriptions.unlock_itemclothing_lower_45);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing_head_5]
    = new UpgradeVO("unlock_item_clothing_head_5", "Helmet-making", UpgradeConstants.upgradeDescriptions.unlock_item_clothing_head_5);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_temple3]
    = new UpgradeVO("upgrade_building_temple3", "Worship", UpgradeConstants.upgradeDescriptions.upgrade_building_temple3);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_weapon58]
    = new UpgradeVO("unlock_item_weapon58", "Shotgun", UpgradeConstants.upgradeDescriptions.unlock_item_weapon58);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_scavenger_gear]
    = new UpgradeVO("unlock_item_scavenger_gear", "Augmented Clothing 2", UpgradeConstants.upgradeDescriptions.unlock_item_scavenger_gear);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_worker_chemist]
    = new UpgradeVO("upgrade_worker_chemist", "Chemistry", UpgradeConstants.upgradeDescriptions.upgrade_worker_chemist);
    /*
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_shrine]
    = new UpgradeVO("upgrade_building_shrine", "Philosophy", UpgradeConstants.upgradeDescriptions.upgrade_building_shrine);
    */
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_weapon52]
    = new UpgradeVO("unlock_item_weapon52", "Axe-making 2", UpgradeConstants.upgradeDescriptions.unlock_item_weapon52);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing6]
    = new UpgradeVO("unlock_item_clothing6", "Augmented Clothing 1", UpgradeConstants.upgradeDescriptions.unlock_item_clothing6);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_storage2]
    = new UpgradeVO("upgrade_building_storage2", "Refrigeration", UpgradeConstants.upgradeDescriptions.upgrade_building_storage2);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_fortifications]
    = new UpgradeVO("upgrade_building_fortifications", "Concrete Fortifications", UpgradeConstants.upgradeDescriptions.upgrade_building_fortifications);
    /*
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing3h]
    = new UpgradeVO("unlock_item_clothing3h", "Glove-making 2", UpgradeConstants.upgradeDescriptions.unlock_item_clothing3h);
    */
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing4he]
    = new UpgradeVO("unlock_item_clothing4he", "Gas Masks", UpgradeConstants.upgradeDescriptions.unlock_item_clothing4he);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_bag3]
    = new UpgradeVO("unlock_item_bag3", "Bag-making 2", UpgradeConstants.upgradeDescriptions.unlock_item_bag3);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_weapon5]
    = new UpgradeVO("unlock_item_weapon5", "Revolvers", UpgradeConstants.upgradeDescriptions.unlock_item_weapon5);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_aqueduct]
    = new UpgradeVO("unlock_building_aqueduct", "Aqueducts", UpgradeConstants.upgradeDescriptions.unlock_building_aqueduct);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing4]
    = new UpgradeVO("unlock_item_clothing4", "Vest plating", UpgradeConstants.upgradeDescriptions.unlock_item_clothing4);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_library2]
    = new UpgradeVO("upgrade_building_library2", "Scientific Method", UpgradeConstants.upgradeDescriptions.upgrade_building_library2);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_apothecary]
    = new UpgradeVO("unlock_building_apothecary", "Alchemy", UpgradeConstants.upgradeDescriptions.unlock_building_apothecary);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_temple2]
    = new UpgradeVO("upgrade_building_temple2", "Rituals", UpgradeConstants.upgradeDescriptions.upgrade_building_temple2);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_worker_trapper]
    = new UpgradeVO("upgrade_worker_trapper", "Food preservation", UpgradeConstants.upgradeDescriptions.upgrade_worker_trapper);
    /*
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_barracks]
    = new UpgradeVO("unlock_building_barracks", "Military", UpgradeConstants.upgradeDescriptions.unlock_building_barracks);
    */
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_campfire]
    = new UpgradeVO("upgrade_building_campfire", "Brewing", UpgradeConstants.upgradeDescriptions.upgrade_building_campfire);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_inn]
    = new UpgradeVO("upgrade_building_inn", "Music", UpgradeConstants.upgradeDescriptions.upgrade_building_inn);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_market2]
    = new UpgradeVO("upgrade_building_market2", "Paper Money", UpgradeConstants.upgradeDescriptions.upgrade_building_market2);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothingl14]
    = new UpgradeVO("unlock_item_clothingl14", "Hazmat Clothing", UpgradeConstants.upgradeDescriptions.unlock_item_clothingl14);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_weapon4]
    = new UpgradeVO("unlock_item_weapon4", "Metal working 2", UpgradeConstants.upgradeDescriptions.unlock_item_weapon4);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing5]
    = new UpgradeVO("unlock_item_clothing5", "Armour", UpgradeConstants.upgradeDescriptions.unlock_item_clothing5);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing3]
    = new UpgradeVO("unlock_item_clothing3", "Guard Uniform", UpgradeConstants.upgradeDescriptions.unlock_item_clothing3);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_action_clear_waste_r]
    = new UpgradeVO("unlock_action_clear_waste_r", "Hazard Management 2", UpgradeConstants.upgradeDescriptions.unlock_action_clear_waste_t);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_greenhouse]
    = new UpgradeVO("unlock_building_greenhouse", "Greenhouses", UpgradeConstants.upgradeDescriptions.unlock_building_greenhouse);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_outgoing_caravans]
    = new UpgradeVO("upgrade_outgoing_caravans", "Bigger caravans", UpgradeConstants.upgradeDescriptions.upgrade_outgoing_caravans);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing_hands_25]
    = new UpgradeVO("unlock_item_clothing_hands_25", "Glove-making", UpgradeConstants.upgradeDescriptions.unlock_item_clothing_hands_25);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_storage1]
    = new UpgradeVO("upgrade_building_storage1", "Pest control", UpgradeConstants.upgradeDescriptions.upgrade_building_storage1);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_passage_hole]
    = new UpgradeVO("unlock_building_passage_hole", "Engineering", UpgradeConstants.upgradeDescriptions.unlock_building_passage_hole);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_house2]
    = new UpgradeVO("unlock_building_house2", "Tower blocks", UpgradeConstants.upgradeDescriptions.unlock_building_house2);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_smithy]
    = new UpgradeVO("unlock_building_smithy", "Metal working 1", UpgradeConstants.upgradeDescriptions.unlock_building_smithy);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_action_clear_waste_t]
    = new UpgradeVO("unlock_action_clear_waste_t", "Hazard Management 1", UpgradeConstants.upgradeDescriptions.unlock_action_clear_waste_r);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_bag22]
    = new UpgradeVO("unlock_item_bag22", "Bag-making", UpgradeConstants.upgradeDescriptions.unlock_item_bag22);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_weapon3]
    = new UpgradeVO("unlock_item_weapon3", "Crossbow", UpgradeConstants.upgradeDescriptions.unlock_item_weapon3);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_firstaid]
    = new UpgradeVO("unlock_item_firstaid", "First Aid", UpgradeConstants.upgradeDescriptions.unlock_item_firstaid);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_worker_collector1]
    = new UpgradeVO("upgrade_worker_collector1", "Water purification", UpgradeConstants.upgradeDescriptions.upgrade_worker_collector1);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_cementmill]
    = new UpgradeVO("unlock_building_cementmill", "Cement", UpgradeConstants.upgradeDescriptions.unlock_building_cementmill);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_market]
    = new UpgradeVO("upgrade_building_market", "Currency", UpgradeConstants.upgradeDescriptions.upgrade_building_market);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing4h]
    = new UpgradeVO("unlock_item_clothing4h", "Advanced Textiles", UpgradeConstants.upgradeDescriptions.unlock_item_clothing4h);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_passage_elevator]
    = new UpgradeVO("unlock_building_passage_elevator", "Elevator mechanics", UpgradeConstants.upgradeDescriptions.unlock_building_passage_elevator);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_lights]
    = new UpgradeVO("unlock_building_lights", "Electric light", UpgradeConstants.upgradeDescriptions.unlock_building_lights);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_weapon25]
    = new UpgradeVO("unlock_item_weapon25", "Axe-making", UpgradeConstants.upgradeDescriptions.unlock_item_weapon25);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_library]
    = new UpgradeVO("upgrade_building_library", "Education", UpgradeConstants.upgradeDescriptions.upgrade_building_library);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_beacon]
    = new UpgradeVO("unlock_building_beacon", "Beacons", UpgradeConstants.upgradeDescriptions.unlock_building_beacon);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_bridge]
    = new UpgradeVO("unlock_building_bridge", "Bridge-building", UpgradeConstants.upgradeDescriptions.unlock_building_bridge);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_weapon2]
    = new UpgradeVO("unlock_item_weapon2", "Spear", UpgradeConstants.upgradeDescriptions.unlock_item_weapon2);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_worker_scavenger]
    = new UpgradeVO("upgrade_worker_scavenger", "Smelting", UpgradeConstants.upgradeDescriptions.upgrade_worker_scavenger);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_outgoing_caravans]
    = new UpgradeVO("unlock_outgoing_caravans", "Caravans", UpgradeConstants.upgradeDescriptions.unlock_outgoing_caravans);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_library]
    = new UpgradeVO("unlock_building_library", "Libraries", UpgradeConstants.upgradeDescriptions.unlock_building_library);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_inn]
    = new UpgradeVO("unlock_building_inn", "Hospitality", UpgradeConstants.upgradeDescriptions.unlock_building_inn);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_market]
    = new UpgradeVO("unlock_building_market", "Trade", UpgradeConstants.upgradeDescriptions.unlock_building_market);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_fortifications]
    = new UpgradeVO("unlock_building_fortifications", "Fortifications", UpgradeConstants.upgradeDescriptions.unlock_building_fortifications);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_bag2]
    = new UpgradeVO("unlock_item_bag2", "Leather-working", UpgradeConstants.upgradeDescriptions.unlock_item_bag2);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_weapon_15]
    = new UpgradeVO("unlock_weapon_15", "Knife", UpgradeConstants.upgradeDescriptions.unlock_weapon_15);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_clothing_basic]
    = new UpgradeVO("unlock_clothing_basic", "Weaving", UpgradeConstants.upgradeDescriptions.unlock_clothing_basic);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_clothing_warm]
    = new UpgradeVO("unlock_clothing_warm", "Textile Arts", UpgradeConstants.upgradeDescriptions.unlock_clothing_warm);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_darkfarm]
    = new UpgradeVO("unlock_building_darkfarm", "Urban Heliculture", UpgradeConstants.upgradeDescriptions.unlock_building_darkfarm);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_tradingpost]
    = new UpgradeVO("unlock_building_tradingpost", "Compass", UpgradeConstants.upgradeDescriptions.unlock_building_tradingpost);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing2]
    = new UpgradeVO("unlock_item_clothing2", "Sewing", UpgradeConstants.upgradeDescriptions.unlock_item_clothing2);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_passage_staircase]
    = new UpgradeVO("unlock_building_passage_staircase", "Building projects", UpgradeConstants.upgradeDescriptions.unlock_building_passage_staircase);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_hospital]
    = new UpgradeVO("unlock_building_hospital", "Field medicine", UpgradeConstants.upgradeDescriptions.unlock_building_hospital);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_worker_rope]
    = new UpgradeVO("unlock_worker_rope", "Rope-making", UpgradeConstants.upgradeDescriptions.unlock_worker_rope);
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_shoe1]
    = new UpgradeVO("unlock_item_shoe1", "Crafting", UpgradeConstants.upgradeDescriptions.unlock_item_shoe1);

    return UpgradeConstants;
    
});
