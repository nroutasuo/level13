// Helper to check effects of upgrades on workers and buildings
define([
	'ash',
	'game/GameGlobals',
	'game/constants/UpgradeConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/OccurrenceConstants',
	'game/vos/ImprovementVO',
], function (Ash, GameGlobals, UpgradeConstants, PlayerActionConstants, OccurrenceConstants, ImprovementVO) {
	
	var UpgradeEffectsHelper = Ash.Class.extend({
		
		constructor: function () {},
		
		improvementsByOccurrence: {},
		
		constructor: function () {
			this.improvementsByOccurrence[OccurrenceConstants.campOccurrenceTypes.trader] = improvementNames.market;
		},
		
		getUnlockedBuildings: function (upgradeId) {
			// TODO separate in and out improvements
			let actions = this.getUnlockedActions(upgradeId, function (action) {
				let improvementName = GameGlobals.playerActionsHelper.getImprovementNameForAction(action, true);
				return improvementName;
			});
			return actions.map(action => GameGlobals.playerActionsHelper.getImprovementNameForAction(action, true));
		},
		
		getUnlockedItems: function (upgradeId) {
			// TODO performance
			var items = [];
			var reqsDefinition;
			var item;
			for (var action in PlayerActionConstants.requirements) {
				reqsDefinition = PlayerActionConstants.requirements[action];
				if (reqsDefinition.upgrades) {
					for (var requiredUpgradeId in reqsDefinition.upgrades) {
						if (requiredUpgradeId === upgradeId) {
							item = GameGlobals.playerActionsHelper.getItemForCraftAction(action);
							if (item) items.push(item);
						}
					}
				}
			}
			return items;
		},
		
		getUnlockedWorkers: function (upgradeId) {
			var workers = [];
			var workerUpgrade;
			for (var worker in UpgradeConstants.unlockingUpgradesByWorker) {
				workerUpgrade = UpgradeConstants.unlockingUpgradesByWorker[worker];
				if (workerUpgrade === upgradeId) {
					workers.push(worker);
				}
			}
			return workers;
		},
		
		getUnlockedOccurrences: function (upgradeId) {
			var unlockedBuildings = this.getUnlockedBuildings(upgradeId);
			var occurrences = [];
			if(unlockedBuildings.length > 0) {
				var occurrenceBuilding;
				var unlockedBuilding;
				for (var i = 0; i < unlockedBuildings.length; i++) {
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
		
		getUnlockedUI: function (upgradeId) {
			var uiEffects = [];
			var uiUpgrade;
			for (var ui in UpgradeConstants.unlockingUpgradesByUIEffect) {
				uiUpgrade = UpgradeConstants.unlockingUpgradesByUIEffect[ui];
				if (uiUpgrade === upgradeId) {
					uiEffects.push(ui);
				}
			}
			return uiEffects;
		},
		
		getImprovedBuildings: function (upgradeId) {
			var buildings = [];
			var buildingUpgrade;
			var buildingUpgradeList;
			for (var building in UpgradeConstants.improvingUpgradesByImprovement) {
				buildingUpgradeList = UpgradeConstants.improvingUpgradesByImprovement[building];
				for(var i = 0; i < buildingUpgradeList.length; i++) {
					buildingUpgrade = buildingUpgradeList[i];
					if (buildingUpgrade === upgradeId) {
						buildings.push(building);
					}
				}
			}
			return buildings;
		},
		
		getImprovedWorkers: function (upgradeId) {
			var workers = [];
			var workerUpgrade;
			var workerUpgradeList;
			for (var worker in UpgradeConstants.improvingUpgradesByWorker) {
				workerUpgradeList = UpgradeConstants.improvingUpgradesByWorker[worker];
				for(var i = 0; i < workerUpgradeList.length; i++) {
					workerUpgrade = workerUpgradeList[i];
					if (workerUpgrade === upgradeId) {
						workers.push(worker);
					}
				}
			}
			return workers;
		},
		
		getImprovedOccurrences: function (upgradeId) {
			var events = [];
			var eventUpgrade;
			var eventUpgradeList;
			for (var event in UpgradeConstants.improvingUpgradesByEvent) {
				eventUpgradeList = UpgradeConstants.improvingUpgradesByEvent[event];
				for(var i = 0; i < eventUpgradeList.length; i++) {
					eventUpgrade = eventUpgradeList[i];
					if (eventUpgrade === upgradeId) {
						events.push(event);
					}
				}
			}
			return events;
		},
		
		getUnlockedGeneralActions: function (upgradeId) {
			return this.getUnlockedActions(upgradeId, function (action) {
				let baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(action);
				if (action == "build_out_greenhouse") return true;
				if (baseActionID.indexOf("build_") >= 0) return false;
				if (baseActionID.indexOf("craft") >= 0) return false;
				if (baseActionID.indexOf("unlock_") >= 0) return false;
				if (baseActionID.indexOf("upgrade_") >= 0) return false;
				if (baseActionID.indexOf("use_in_") >= 0) return false;
				return true;
			});
		},
		
		getUnlockedActions: function (upgradeId, filter) {
			// TODO performance
			var result = [];
			var reqsDefinition;
			for (var action in PlayerActionConstants.requirements) {
				reqsDefinition = PlayerActionConstants.requirements[action];
				if (reqsDefinition.upgrades && filter(action)) {
					for (var requiredUpgradeId in reqsDefinition.upgrades) {
						if (requiredUpgradeId === upgradeId) {
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
			return UpgradeConstants.improvingUpgradesByImprovement[improvementName];
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
			for (var i in buildingUpgrades) {
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
			for (var i in buildingUpgrades) {
				buildingUpgrade = buildingUpgrades[i];
				var requiredTechCampOrdinal = UpgradeConstants.getMinimumCampOrdinalForUpgrade(buildingUpgrade);
				if (requiredTechCampOrdinal <= campOrdinal) upgradeLevel++;
			}
			return upgradeLevel;
		},
		
		getWorkerLevel: function (worker, upgradesComponent) {
			var result = 0;
			var isUnlocked = true;
			var unlockingUpgrade = UpgradeConstants.unlockingUpgradesByWorker[worker];
			if (unlockingUpgrade) {
				isUnlocked = upgradesComponent.hasUpgrade(unlockingUpgrade);
			}
			
			if (isUnlocked) {
				result = 1;
				var improvingUpgrades = UpgradeConstants.improvingUpgradesByWorker[worker];
				if (improvingUpgrades) {
					for (var i = 0; i < improvingUpgrades.length; i++) {
						if (upgradesComponent.hasUpgrade(improvingUpgrades[i])) {
							result += 1;
						}
					}
				}
			}
			
			return result;
		},

		getCampOrdinalToUnlockBuilding: function (building) {
			// TODO extend with checking for required buildings' requirements
			// TODO extend for checking required resources
			let result = 1;
			let action = GameGlobals.playerActionsHelper.getActionNameForImprovement(building);
			let reqsDefinition = PlayerActionConstants.requirements[action];
			if (reqsDefinition && reqsDefinition.upgrades) {
				for (var requiredUpgradeId in reqsDefinition.upgrades) {
					result = Math.max(result, UpgradeConstants.getMinimumCampOrdinalForUpgrade(requiredUpgradeId));
				}
			}
			switch (building) {
				case improvementNames.temple: return 8;
				case improvementNames.shrine: return 8;
			}
			return result;
		},
		
	});
	
	return UpgradeEffectsHelper;
});
