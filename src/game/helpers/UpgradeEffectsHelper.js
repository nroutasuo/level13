// Helper to check effects of upgrades on workers and buildings
define([
	'ash',
	'game/GameGlobals',
	'game/constants/ImprovementConstants',
	'game/constants/UpgradeConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/WorldConstants',
	'game/constants/OccurrenceConstants',
	'game/vos/ImprovementVO',
], function (Ash, GameGlobals, ImprovementConstants, UpgradeConstants, PlayerActionConstants, WorldConstants, OccurrenceConstants, ImprovementVO) {
	
	var UpgradeEffectsHelper = Ash.Class.extend({
		
		improvementsByOccurrence: {},
		
		constructor: function () {
			this.improvementsByOccurrence[OccurrenceConstants.campOccurrenceTypes.trader] = improvementNames.market;
			this.improvementsByOccurrence[OccurrenceConstants.campOccurrenceTypes.recruit] = improvementNames.inn;
		},
		
		getUnlockedBuildings: function (upgradeID) {
			// TODO separate in and out improvements
			let actions = this.getUnlockedActions(upgradeID, function (action) {
				let improvementName = GameGlobals.playerActionsHelper.getImprovementNameForAction(action, true);
				return improvementName;
			});
			return actions.map(action => GameGlobals.playerActionsHelper.getImprovementNameForAction(action, true));
		},
		
		getUnlockedItems: function (upgradeID) {
			// TODO performance
			var items = [];
			var reqsDefinition;
			var item;
			for (var action in PlayerActionConstants.requirements) {
				reqsDefinition = PlayerActionConstants.requirements[action];
				if (reqsDefinition.upgrades) {
					for (var requiredUpgradeId in reqsDefinition.upgrades) {
						if (requiredUpgradeId === upgradeID) {
							item = GameGlobals.playerActionsHelper.getItemForCraftAction(action);
							if (item) items.push(item);
						}
					}
				}
			}
			return items;
		},
		
		getUnlockedWorkers: function (upgradeID) {
			var workers = [];
			var workerUpgrade;
			for (var worker in UpgradeConstants.unlockingUpgradesByWorker) {
				workerUpgrade = UpgradeConstants.unlockingUpgradesByWorker[worker];
				if (workerUpgrade === upgradeID) {
					workers.push(worker);
				}
			}
			return workers;
		},
		
		getUnlockedOccurrences: function (upgradeID) {
			var unlockedBuildings = this.getUnlockedBuildings(upgradeID);
			var occurrences = [];
			if(unlockedBuildings.length > 0) {
				var occurrenceBuilding;
				var unlockedBuilding;
				for (let i = 0; i < unlockedBuildings.length; i++) {
					unlockedBuilding = unlockedBuildings[i];
					for (var occurrence in this.improvementsByOccurrence) {
						occurrenceBuilding = this.improvementsByOccurrence[occurrence];
						if (occurrenceBuilding === unlockedBuilding) {
							occurrences.push(occurrence);
						}
					}
				}
			}
			return occurrences;
		},
		
		getUnlockedUI: function (upgradeID) {
			var uiEffects = [];
			var uiUpgrade;
			for (var ui in UpgradeConstants.unlockingUpgradesByUIEffect) {
				uiUpgrade = UpgradeConstants.unlockingUpgradesByUIEffect[ui];
				if (uiUpgrade === upgradeID) {
					uiEffects.push(ui);
				}
			}
			return uiEffects;
		},
		
		getImprovedBuildings: function (upgradeID) {
			var buildings = [];
			var buildingUpgrade;
			var buildingUpgradeList;
			for (var building in UpgradeConstants.improvingUpgradesByImprovement) {
				buildingUpgradeList = UpgradeConstants.improvingUpgradesByImprovement[building];
				for(let i = 0; i < buildingUpgradeList.length; i++) {
					buildingUpgrade = buildingUpgradeList[i];
					if (buildingUpgrade === upgradeID) {
						buildings.push(building);
					}
				}
			}
			return buildings;
		},
		
		getImprovedWorkers: function (upgradeID) {
			var workers = [];
			var workerUpgrade;
			var workerUpgradeList;
			for (var worker in UpgradeConstants.improvingUpgradesByWorker) {
				workerUpgradeList = UpgradeConstants.improvingUpgradesByWorker[worker];
				for(let i = 0; i < workerUpgradeList.length; i++) {
					workerUpgrade = workerUpgradeList[i];
					if (workerUpgrade === upgradeID) {
						workers.push(worker);
					}
				}
			}
			return workers;
		},
		
		getImprovedOccurrences: function (upgradeID) {
			var events = [];
			var eventUpgrade;
			var eventUpgradeList;
			for (var event in UpgradeConstants.improvingUpgradesByEvent) {
				eventUpgradeList = UpgradeConstants.improvingUpgradesByEvent[event];
				for(let i = 0; i < eventUpgradeList.length; i++) {
					eventUpgrade = eventUpgradeList[i];
					if (eventUpgrade === upgradeID) {
						events.push(event);
					}
				}
			}
			return events;
		},
		
		getUnlockedGeneralActions: function (upgradeID) {
			return this.getUnlockedActions(upgradeID, function (action) {
				let baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(action);
				if (action == "build_out_greenhouse") return true;
				if (action == "build_out_tradepost_connector") return true;
				if (UpgradeConstants.upgradeDefinitions[action]) return false;
				if (baseActionID.indexOf("build_") >= 0) return false;
				if (baseActionID.indexOf("craft") >= 0) return false;
				if (baseActionID.indexOf("use_in_") >= 0) return false;
				return true;
			});
		},
		
		getUnlockedActions: function (upgradeID, filter) {
			// TODO performance
			let result = [];
			var reqsDefinition;
			for (var action in PlayerActionConstants.requirements) {
				reqsDefinition = PlayerActionConstants.requirements[action];
				if (reqsDefinition.upgrades && filter(action)) {
					for (var requiredUpgradeId in reqsDefinition.upgrades) {
						if (requiredUpgradeId === upgradeID) {
							result.push(action);
						}
					}
				}
			}
			return result;
		},
		
		getUpgradeIdForWorker: function (worker) {
			return UpgradeConstants.unlockingUpgradesByWorker[worker];
		},
		
		getUpgradeIdForUIEffect: function (effect) {
			return UpgradeConstants.unlockingUpgradesByUIEffect[effect];
		},
		
		getImprovingUpgradeIdsForWorker: function (worker) {
			return UpgradeConstants.improvingUpgradesByWorker[worker];
		},
		
		getUpgradeIdsForImprovement: function (improvementName) {
			let id = ImprovementConstants.getImprovementID(improvementName);
			return UpgradeConstants.improvingUpgradesByImprovement[id] || [];
		},
		
		getImprovementForOccurrence: function (occurrence) {
			return this.improvementsByOccurrence[occurrence];
		},
		
		getImprovingUpgradeIdsForOccurrence: function (occurrence) {
			return UpgradeConstants.improvingUpgradesByEvent[occurrence];
		},
		
		getBuildingUpgradeLevel: function (building, upgradesComponent) {
			var upgradeLevel = 1;
			var buildingUpgrades = this.getUpgradeIdsForImprovement(building);
			var buildingUpgrade;
			for (let i in buildingUpgrades) {
				buildingUpgrade = buildingUpgrades[i];
				if (upgradesComponent.hasUpgrade(buildingUpgrade)) upgradeLevel++;
			}
			return upgradeLevel;
		},
		
		getExpectedBuildingUpgradeLevel: function (building, campOrdinal) {
			if (campOrdinal < this.getCampOrdinalToUnlockBuilding(building)) {
				return 0;
			}
			var upgradeLevel = 1;
			var buildingUpgrades = this.getUpgradeIdsForImprovement(building);
			var buildingUpgrade;
			for (let i in buildingUpgrades) {
				buildingUpgrade = buildingUpgrades[i];
				var requiredTechCampOrdinal = this.getExpectedCampOrdinalForUpgrade(buildingUpgrade);
				if (requiredTechCampOrdinal <= campOrdinal) upgradeLevel++;
			}
			return upgradeLevel;
		},
		
		getWorkerLevel: function (worker, upgradesComponent) {
			let result = 0;
			var isUnlocked = true;
			var unlockingUpgrade = UpgradeConstants.unlockingUpgradesByWorker[worker];
			if (unlockingUpgrade) {
				isUnlocked = upgradesComponent.hasUpgrade(unlockingUpgrade);
			}
			
			if (isUnlocked) {
				result = 1;
				var improvingUpgrades = UpgradeConstants.improvingUpgradesByWorker[worker];
				if (improvingUpgrades) {
					for (let i = 0; i < improvingUpgrades.length; i++) {
						if (upgradesComponent.hasUpgrade(improvingUpgrades[i])) {
							result += 1;
						}
					}
				}
			}
			
			return result;
		},

		getUpgradeToUnlockBuilding: function (improvementName) {
			let action = PlayerActionConstants.getActionNameForImprovement(improvementName);
			let reqsDefinition = PlayerActionConstants.requirements[action];
			let result = null;
			let resultCampOrdinal = 1;
			
			if (reqsDefinition && reqsDefinition.upgrades) {
				for (var requiredUpgradeId in reqsDefinition.upgrades) {
					var upgradeCampOrdinal = GameGlobals.upgradeEffectsHelper.getMinimumCampOrdinalForUpgrade(requiredUpgradeId);
					if (!result || upgradeCampOrdinal > resultCampOrdinal) {
						result = requiredUpgradeId;
						resultCampOrdinal = upgradeCampOrdinal;
					}
				}
			}
			
			return result;
		},

		getMinimumCampOrdinalForUpgrade: function (upgrade, ignoreCosts, milestone) {
			if (!upgrade) return 1;
			
			let cacheKey = upgrade + "__" + (ignoreCosts ? "i" : "c") + "__" + (milestone ? milestone.index : "A");
			
			// TODO also cache ignoreCosts version for each upgrade
			if (UpgradeConstants.minimumCampOrdinalForUpgrade[cacheKey]) return UpgradeConstants.minimumCampOrdinalForUpgrade[cacheKey];
			
			if (!UpgradeConstants.upgradeDefinitions[upgrade]) {
				log.w("no such upgrade: " + upgrade);
				UpgradeConstants.minimumCampOrdinalForUpgrade[cacheKey] = 99;
				return 99;
			}
			
			// required tech
			var requiredTech = UpgradeConstants.getRequiredTech(upgrade);
			var requiredTechCampOrdinal = 0;
			for (let i = 0; i < requiredTech.length; i++) {
				requiredTechCampOrdinal = Math.max(requiredTechCampOrdinal, this.getMinimumCampOrdinalForUpgrade(requiredTech[i], ignoreCosts, milestone));
			}
			
			// blueprint
			let blueprintCampOrdinal = UpgradeConstants.getBlueprintCampOrdinal(upgrade);
			
			// misc reqs
			var reqs = PlayerActionConstants.requirements[upgrade];
			if (reqs && reqs.deity) {
				requiredTechCampOrdinal = Math.max(requiredTechCampOrdinal, WorldConstants.CAMP_ORDINAL_GROUND);
			}
			if (reqs && reqs.milestone) {
				if (milestone) {
					// break infinite recursion if milestone is given
					if (milestone.index < reqs.milestone) {
						requiredTechCampOrdinal = 99;
					}
				} else {
					let milestoneCampOrdinal = GameGlobals.milestoneEffectsHelper.getMinimumCampOrdinalForMilestone(reqs.milestone);
					requiredTechCampOrdinal = Math.max(requiredTechCampOrdinal, milestoneCampOrdinal);
				}
			}
			
			// costs
			var costCampOrdinal = 1;
			var costs = PlayerActionConstants.costs[upgrade];
			if (!ignoreCosts) {
				if (!costs) {
					log.w("upgrade has no costs: " + upgrade);
				} else {
					if (costs.favour) {
						costCampOrdinal = Math.max(costCampOrdinal, WorldConstants.CAMPS_BEFORE_GROUND);
					}
				}
			}
			if (costs.favour) {
				costCampOrdinal = WorldConstants.CAMP_ORDINAL_GROUND;
			}
			
			result = Math.max(1, blueprintCampOrdinal, requiredTechCampOrdinal, costCampOrdinal);
			
			UpgradeConstants.minimumCampOrdinalForUpgrade[cacheKey] = result;
			
			return result;
		},
	
		getMinimumCampStepForUpgrade: function (upgrade) {
			let result = 0;
			var blueprintType = UpgradeConstants.getBlueprintBracket(upgrade);
			if (blueprintType == UpgradeConstants.BLUEPRINT_BRACKET_EARLY)
				result = WorldConstants.CAMP_STEP_START;
			if (blueprintType == UpgradeConstants.BLUEPRINT_BRACKET_LATE)
				result = WorldConstants.CAMP_STEP_POI_2;
				
			var requiredTech = UpgradeConstants.getRequiredTech(upgrade);
			for (let i = 0; i < requiredTech.length; i++) {
				result = Math.max(result, this.getMinimumCampStepForUpgrade(requiredTech[i]));
			}
			
			let costs = PlayerActionConstants.costs[upgrade];
			if (costs && costs.favour) {
				result = WorldConstants.CAMP_STEP_POI_2;
			}
			
			return result;
		},
		
		getMinimumCampAndStepForUpgrade: function (upgradeID, ignoreCosts) {
			return {
				campOrdinal: this.getMinimumCampOrdinalForUpgrade(upgradeID, ignoreCosts),
				step: this.getMinimumCampStepForUpgrade(upgradeID)
			};
		},
		
		getExpectedCampOrdinalForUpgrade: function (upgrade) {
			return UpgradeConstants.upgradeDefinitions[upgrade].campOrdinal || 1;
		},
		
		getExpectedCampAndStepForUpgrade: function (upgradeID) {
			return {
				campOrdinal: this.getExpectedCampOrdinalForUpgrade(upgradeID),
				step: this.getMinimumCampStepForUpgrade(upgradeID)
			};
		},

		getCampOrdinalToUnlockBuilding: function (improvementName) {
			// TODO extend with checking for required buildings' requirements
			// TODO extend for checking required resources
			let result = 1;
			let requiredUpgradeId = this.getUpgradeToUnlockBuilding(improvementName);
			result = Math.max(result, GameGlobals.upgradeEffectsHelper.getMinimumCampOrdinalForUpgrade(requiredUpgradeId))
			switch (improvementName) {
				case improvementNames.temple: return 8;
				case improvementNames.shrine: return 8;
			}
			return result;
		},
		
	});
	
	return UpgradeEffectsHelper;
});
