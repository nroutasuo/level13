define(['ash', 'json!game/data/UpgradeData.json', 'game/constants/PlayerActionConstants', 'game/constants/WorldConstants', 'game/vos/UpgradeVO'],
function (Ash, UpgradeData, PlayerActionConstants, WorldConstants, UpgradeVO) {
	
	let UpgradeConstants = {
		
		BLUEPRINT_BRACKET_EARLY: "b-early",
		BLUEPRINT_BRACKET_LATE: "b-late",
		
		UPGRADE_TYPE_RUMOURS: "rumours",
		UPGRADE_TYPE_HOPE: "hope",
		UPGRADE_TYPE_EVIDENCE: "evidence",
		UPGRADE_TYPE_INSIGHT: "insight",

		upgradeStatus: {
			HIDDEN: "HIDDEN",
			BLUEPRINT_IN_PROGRESS: "BLUEPRINT_IN_PROGRESS",
			BLUEPRINT_USABLE: "BLUEPRINT_USABLE", 
			VISIBLE_HINT: "VISIBLE_HINT",
			VISIBLE_FULL: "VISIBLE_FULL",
			UNLOCKABLE: "UNLOCKABLE", 
			UNLOCKED: "UNLOCKED", 
		},

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
			
			UpgradeConstants.upgradeDefinitions[def.id] = new UpgradeVO(def.id);
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

		hasUpgrade: function (id) {
			if (this.upgradeDefinitions[id]) return true;
			return false;
		},

		getDisplayNameTextKey: function (id) {
			return "game.upgrades." + id + "_name";
		},

		getDescriptionTextKey: function (id) {
			return "game.upgrades." + id + "_description";
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
		
		getBlueprintLevelIndex: function (upgradeID) {
			var ordinal = this.getBlueprintCampOrdinal(upgradeID);
			if (this.blueprintsByCampOrdinal[ordinal][0].indexOf(upgradeID) >= 0) return 0;
			if (this.blueprintsByCampOrdinal[ordinal][1].indexOf(upgradeID) >= 0) return 0;
			if (this.blueprintsByCampOrdinal[ordinal][2].indexOf(upgradeID) >= 0) return 1;
			return null;
		},
		
		getUpgradeType: function (upgradeID) {
			let costs = PlayerActionConstants.costs[upgradeID] || {};
			let type = UpgradeConstants.UPGRADE_TYPE_RUMOURS;
			if (costs.insight > 0) type = UpgradeConstants.UPGRADE_TYPE_INSIGHT;
			if (costs.hope > 0) type = UpgradeConstants.UPGRADE_TYPE_HOPE;
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

		getUnlockedTech: function (upgradeID) {
			let result = [];
			for (let otherID in UpgradeConstants.upgradeDefinitions) {
				let requiredTech = this.getRequiredTech(otherID);
				if (requiredTech.indexOf(upgradeID) >= 0) {
					result.push(otherID);
				}
			}
			return result;
		},
		
		getAllUpgradesRequiringInsight: function () {
			if (this.allUpgradesRequiringInsight) return this.allUpgradesRequiringInsight;
			
			let result = [];
			
			for (let upgradeID in UpgradeConstants.upgradeDefinitions) {
				let costs = PlayerActionConstants.costs[upgradeID] || {};
				if (costs.insight > 0) {
					result.push(upgradeID);
				}
			}
			
			this.allUpgradesRequiringInsight = result;
			
			return result;
		},
		
	};
	
	UpgradeConstants.loadData(UpgradeData);

	return UpgradeConstants;
	
});
