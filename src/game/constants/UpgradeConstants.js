define(['ash', 'json!game/data/UpgradeData.json', 'game/constants/PlayerActionConstants', 'game/constants/WorldConstants', 'game/vos/UpgradeVO'],
function (Ash, UpgradeData, PlayerActionConstants, WorldConstants, UpgradeVO) {
	
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
			unlock_item_clothing_body_15: "Augmented clothing made to withstand the harshest of environments.",
			unlock_item_clothing_over_15: "Modern armour that takes inspiration from military automatons.",
			unlock_item_weapon_15: "Knowledge to make the deadliest weapons.",
			unlock_building_spaceship1: "Part of constructing a space colony.",
			unlock_building_spaceship2: "Part of constructing a space colony.",
			unlock_building_spaceship3: "Part of constructing a space colony.",
			unlock_item_bag_4: "Leather-working for making better bags.",
			improve_building_market3: "Partially restore the Network that (according to legends) used to cover the whole City.",
			improve_building_cementmill: "New cement mixture for stronger concrete.",
			unlock_building_researchcenter: "Places to generate new knowledge instead of just collecting and archiving the old.",
			unlock_item_weapon_14: "Taking weapons and fighting to a new level of destructiveness.",
			unlock_item_clothing_head_5: "The art of making some serious helmets.",
			improve_building_apothecary: "Rediscovered modern technology for disease prevention and treatment.",
			unlock_item_weapon_13: "Unlocks a new class of lethal weapons.",
			unlock_building_radio: "Build radio towers to increase your civilization's reputation.",
			unlock_building_robots: "Build robots that can help workers do their jobs more efficiently.",
			improve_building_hospital: "Complex procedures for fixing the human body.",
			unlock_item_clothing_body_13: "Even better use of spider silk and recycled materials.",
			unlock_item_weapon_12: "A powerful firearm that is particularly devastating in close range",
			unlock_item_scavenger_gear: "New techniques for improving old designs.",
			improve_worker_chemist_2: "Rediscovering the study of substances and chemical reactions.",
			unlock_item_clothing_upper_4: "",
			improve_building_shrine: "Another way to find answers to questions.",
			unlock_item_weapon_11: "Improved war axes.",
			unlock_item_clothing6: "Techniques for improving existing clothing for exploration",
			improve_building_storage2: "Improving storage by controlling temperature.",
			improve_building_fortification_2: "Better fortifications",
			unlock_item_clothing3h: "Good gloves to keep explorers safe",
			unlock_item_clothing4he: "Protection against environmental hazards",
			unlock_item_bag_3: "Unlock the automatic luggage.",
			unlock_item_weapon_10: "A gun that allows the user to fire multiple rounds without reloading.",
			unlock_building_aqueduct: "Tapping into the decaying water infrastructure and extending it to efficiently store and convey water.",
			unlock_item_clothing4: "Basic protective clothing to give an edge in fights.",
			improve_building_library2: "An organized approach to growing new knowledge",
			unlock_building_apothecary: "Basic knowledge of making herbal medicines.",
			improve_worker_trapper_2: "Salting, smoking and pickling food to make it last longer.",
			unlock_building_barracks: "A dedicated and trained class of workers for protecting the camp.",
			improve_building_campfire_1: "Turn the campfire into the pride of the settlement.",
			improve_building_inn: "Another useful way to raise spirits and bond groups.",
			improve_building_market2: "Further improve trade by using lighter currency that is easier to carry around.",
			unlock_item_weapon_8: "Better techniques for metal-working allow better weapons and more tools.",
			unlock_item_clothing5: "Adapting the new metal working techniques for protection.",
			unlock_item_clothing3: "A standardised outfit that offers basic protection.",
			improve_building_stable: "Managing bigger caravans that can carry more goods",
			unlock_item_clothing_hands_25: "Gloves are a scavenger's best tool.",
			improve_building_storage1: "Keeping other animals away from food and materials for more reliable storage.",
			unlock_building_passage_hole: "Enables building passages to bridge levels when there is no existing staircase or elevator.",
			unlock_building_house2: "Reclaiming tower blocks that can house more people.",
			unlock_building_smithy: "Smiths can turn scrap metal into tools and weapons.",
			unlock_item_bag_2: "Making better bags for explorers.",
			unlock_item_weapon_6: "A deadly ranged weapon crafted from fairly simple materials.",
			unlock_item_firstaid: "Heal injuries on the go.",
			improve_building_market: "Common medium of exchange makes trading more efficient.",
			improve_worker_water_2: "Techniques for large-scale filtering and disinfecting drinking water that permit using more water sources.",
			unlock_building_cementmill: "Unlocks the production of concrete, a strong and versatile building material.",
			unlock_item_clothing4h: "Create and manipulate new, stronger fibers for better protection and easier manufacturing.",
			unlock_building_passage_elevator: "Repairing elevators that allow passage to new levels.",
			unlock_item_weapon_5: "A weapon made for war.",
			unlock_building_bridge: "Building bridges over collapsed sectors.",
			improve_building_library: "A more systematic approach to knowledge gathering and preservation. Will enable more specialized workers later on.",
			unlock_building_lights: "Lights that defeat the darkness in the camp once and for all.",
			unlock_item_weapon_4: "An ancient but effective weapon.",
			improve_worker_scavenger_2: "Processing technique that allows more metal left behind by previous inhabitants to be salvaged.",
			improve_worker_scavenger_4: "Take advantage of the most advanced materials left behind by previous civilizations",
			unlock_building_stable: "Travel to other factions to trade for goods.",
			unlock_building_library: "Concentrated effort to build and store knowledge.",
			unlock_building_inn: "Sometimes travellers pass by the camp. Perhaps we can offer them a place to sleep?",
			unlock_building_market: "Trade with people from foreign camps and cooperatives.",
			unlock_building_fortifications: "Constructions to keep unwelcome strangers away.",
			unlock_building_fortifications2: "Build better fortifications.",
			unlock_item_bag_1: "The art of crafting durable items out of leather.",
			unlock_item_weapon_2: "Slightly more reliable than the shiv.",
			unlock_clothing_basic: "Technique for making basic clothing.",
			unlock_clothing_warm: "New ways of making textiles.",
			unlock_building_darkfarm: "Alternative source of food.",
			unlock_building_tradingpost: "Establish basic trade routes between camps, allowing them to share resources.",
			unlock_item_clothing2: "The craft of making clothes out of fabric.",
			unlock_building_passage_staircase: "Managing large building projects and building structures that allow passage to different levels.",
			unlock_building_hospital: "Treating basic injuries.",
			unlock_worker_rope: "Using scavenged fiber and cloth to make rope, a useful building and crafting material.",
			unlock_item_shoe1: "The skill of making useful things out of whatever happens to be available",
			unlock_action_clear_waste_r: "Allow clearing some radioactive waste in the environment.",
			unlock_action_clear_waste_t: "Allow clearing some toxic waste in the environment.",
			improve_building_temple2: "Perhaps the spirits would appreciate offerings of food, jewelry, bones, plants, or clothing?",
			improve_building_temple3: "Expand places into places where anyone can come meditate.",
			unlock_building_greenhouse: "Grow herbs in some rare locations in the City where conditions are right.",
			unlock_item_clothingl14: "Clothing to protect from radiactive environments.",
			unlock_building_beacon: "Lights out in the city that make exploration less dangerous.",
			improve_building_campfire_2: "Improve the campfire to be a gathering place for the whole settlement.",
			unlock_building_square: "Build a space just for relaxation and socializing.",
			unlock_item_clothing_head_27: "Craft more things from leather.",
			improve_building_collector_water_2: "Improve buckets and collect more water.",
			improve_building_stable_2: "Improve caravan capacity by bringing more pack animals",
			improve_building_collector_food_2: "Improve traps so they can collect more food.",
			unlock_building_generator: "Build simple generators that provide electricity to the settlement, improving overall quality of life.",
			improve_worker_cleric_2: "Bring the community closer together with shared rituals",
			improve_worker_cleric_3: "Use scripture to store knowledge about the spirits - and allow clerics assert their authority.",
			improve_worker_gardener_2: "Develop different herb species to survive better in the new conditions",
			improve_worker_gardener_3: "Automated irrigation systems to increase greenhouse yield",
			improve_worker_rubber_2: "Better processing techniques for rubber production",
			improve_worker_rubber_3: "A new kind of rubber, quicker to produce",
			improve_building_barracks_3: "Establish more roles within the barracks to keep things running efficiently",
			improve_worker_scavenger_3: "Further process scavenged metal so that metal from sources previously unworkable become usable again",
			improve_worker_smith_2: "Improve metal working techniques and allow toolsmiths to work more efficiently",
			improve_worker_smith_3: "Modularity is the basis of mass production",
			improve_worker_trapper_3: "Processed foods last longer and enable using ingredients otherwise too unpleasant, ultimately improving efficiency of trappers",
			improve_worker_water_3: "Get more out of all water that is collected",
			unlock_project_tradingpost_connector: "A massive elevator, spanning a whole level, and allowing traders bypass entire hazardous environment.",
			improve_building_hospital_3: "Make hospital visits less traumatic and enable new implants.",
			improve_worker_chemist_3: "Further refine fuel production",
			improve_building_radiotower: "Improve the radio station and send messages over longer distances",
			improve_building_robots: "Improve robot factories and build robots faster.",
			improve_worker_scientist: "Add dedicated working spaces to the libraries",
		},
		
		piecesByBlueprint: {},
		
		// caches for faster world generation / page load
		campOrdinalsByBlueprint: {},
		minCampOrdinalsByUpgrade: {},
		minimumCampOrdinalForUpgrade: {},
		
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
			UpgradeConstants.upgradeDefinitions[def.id].campOrdinal = def.campOrdinal;
			
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
		
		getBlueprintCampOrdinal: function (upgradeID) {
			if (this.campOrdinalsByBlueprint[upgradeID]) {
				return this.campOrdinalsByBlueprint[upgradeID];
			}
			for (var key in this.blueprintsByCampOrdinal) {
				for (let i = 0; i < 3; i++) {
					if (this.blueprintsByCampOrdinal[key][i].indexOf(upgradeID) >= 0) {
						this.campOrdinalsByBlueprint[upgradeID] = key;
						return key;
					}
				}
			}
			return 1;
		},
		
		getMaxPiecesForBlueprint: function (upgradeID) {
			if (this.piecesByBlueprint[upgradeID]) return this.piecesByBlueprint[upgradeID];
			return 3;
		},
		
		getBlueprintBracket: function (upgradeID) {
			var ordinal = this.getBlueprintCampOrdinal(upgradeID);
			if (this.blueprintsByCampOrdinal[ordinal][0].indexOf(upgradeID) >= 0) return this.BLUEPRINT_BRACKET_EARLY;
			if (this.blueprintsByCampOrdinal[ordinal][1].indexOf(upgradeID) >= 0) return this.BLUEPRINT_BRACKET_LATE;
			if (this.blueprintsByCampOrdinal[ordinal][2].indexOf(upgradeID) >= 0) return this.BLUEPRINT_BRACKET_LATE;
			return null;
		},
		
		getUpgradeType: function (upgradeID) {
			let costs = PlayerActionConstants.costs[upgradeID] || {};
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
			for (let i = 0; i < blueprints.length; i++) {
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
		
	};
	
	UpgradeConstants.loadData(UpgradeData);

	return UpgradeConstants;
	
});
