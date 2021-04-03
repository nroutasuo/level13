define(['ash', 'json!game/data/UpgradeData.json', 'game/constants/PlayerActionConstants', 'game/constants/TribeConstants', 'game/constants/WorldConstants', 'game/vos/UpgradeVO'],
function (Ash, UpgradeData, PlayerActionConstants, TribeConstants, WorldConstants, UpgradeVO) {
	
	var UpgradeConstants = {
		
		BLUEPRINT_BRACKET_EARLY: "b-early",
		BLUEPRINT_BRACKET_LATE: "b-late",
		
		UPGRADE_TYPE_RUMOURS: "rumours",
		UPGRADE_TYPE_FAVOUR: "favour",
		UPGRADE_TYPE_EVIDENCE: "evidence",

		upgradeDefinitions: {},
		
		upgradeUIEffects: {
			calendar: "calendar",
		},
		
		unlockingUpgradesByWorker: {},
		unlockingUpgradesByUIEffect: {},
		improvingUpgradesByImprovement: {},
		improvingUpgradesByWorker: {},
		improvingUpgradesByEvent: {},
		
		// camp ordinal > a list of blueprints, first array is early, second is late, third is blueprints that can appear on campless levels
		blueprintsByCampOrdinal: {},
		
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
			unlock_item_clothing3: "A standardised outfit that offers basic protection.",
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
			unlock_item_shoe1: "The skill of making useful things out of whatever happens to be available",
			unlock_action_clear_waste_r: "Allow clearing some radioactive waste in the environment.",
			unlock_action_clear_waste_t: "Allow clearing some toxic waste in the environment.",
			upgrade_building_temple2: "Bring the community together.",
			unlock_building_greenhouse: "Grow herbs in some rare locations in the City where conditions are right.",
			unlock_item_clothingl14: "Clothing to protect from radiactive environments.",
			unlock_building_beacon: "Lights out in the city that make exploration less dangerous."
		},
		
		piecesByBlueprint: {},
		
		// caches for faster world generation / page load
		campOrdinalsByBlueprint: {},
		minCampOrdinalsByUpgrade: {},
		
		loadData: function (data) {
			for (upgradeID in data) {
				this.loadUpgradeData(data[upgradeID])
			}
		},
		
		loadUpgradeData: function (def) {
			let addUpgradeEffectToList = function (dict, key, upgradeID) {
				if (!dict[key]) dict[key] = [];
				dict[key].push(upgradeID);
			};
			let desc = UpgradeConstants.upgradeDescriptions[def.id];
			if (!desc) {
				log.w("No description found for upgrade id: " + def.id);
			}
			UpgradeConstants.upgradeDefinitions[def.id] = new UpgradeVO(def.id, def.name, desc);
			
			if (def.blueprintPieces) {
				UpgradeConstants.piecesByBlueprint[def.id] = def.blueprintPieces;
				
				if (!UpgradeConstants.blueprintsByCampOrdinal[def.blueprintCampOrdinal])
					UpgradeConstants.blueprintsByCampOrdinal[def.blueprintCampOrdinal] = [[],[],[]];
				let index = def.blueprintIsCampless ? 2 : def.blueprintIsEarly ? 0 : 1;
				UpgradeConstants.blueprintsByCampOrdinal[def.blueprintCampOrdinal][index].push(def.id);
			}
			
			if (def.effects) {
				if (def.effects.unlocksWorker) {
					UpgradeConstants.unlockingUpgradesByWorker[def.effects.unlocksWorker] = def.id;
				}
				if (def.effects.improvesBuildings) {
					let buildings = def.effects.improvesBuildings.split(" ");
					for (let i = 0; i < buildings.length; i++) {
						let building = buildings[i];
						if (building.length < 2) continue;
						addUpgradeEffectToList(UpgradeConstants.improvingUpgradesByImprovement, building, def.id);
					}
				}
				if (def.effects.improvesWorker) {
					addUpgradeEffectToList(UpgradeConstants.improvingUpgradesByWorker, def.effects.improvesWorker, def.id);
				}
				if (def.effects.unlocksUI) {
					UpgradeConstants.unlockingUpgradesByUIEffect[def.effects.unlocksUI] = def.id;
				}
				if (def.effects.improvesOccurrence) {
					let occurrence = def.effects.improvesOccurrence.replaceAll("+", "");
					addUpgradeEffectToList(UpgradeConstants.improvingUpgradesByEvent, occurrence, def.id);
				}
			}
		},
		
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
		
		getRequiredTechAll: function (upgradeID) {
			let result = [];
			let direct = this.getRequiredTech(upgradeID);
			for (let i = 0; i < direct.length; i++) {
				result.push(direct[i])
				let indirect = this.getRequiredTechAll(direct[i]);
				for (let j = 0; j < indirect.length; j++) {
					result.push(indirect[j]);
				}
			}
			return result;
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
	
		getMinimumCampStepForUpgrade: function (upgrade) {
			var result = 0;
			var blueprintType = this.getBlueprintBracket(upgrade);
			if (blueprintType == this.BLUEPRINT_BRACKET_EARLY)
				result = WorldConstants.CAMP_STEP_START;
			if (blueprintType == this.BLUEPRINT_BRACKET_LATE)
				result = WorldConstants.CAMP_STEP_POI_2;
				
			var requiredTech = this.getRequiredTech(upgrade);
			for (var i = 0; i < requiredTech.length; i++) {
				result = Math.max(result, this.getMinimumCampStepForUpgrade(requiredTech[i]));
			}
			
			return result;
		},
		
	};
	
	UpgradeConstants.loadData(UpgradeData);
	
	console.log(UpgradeConstants);

	return UpgradeConstants;
	
});
