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
		
		upgradesByWorker: {
			"weaver": UpgradeConstants.upgradeIds.unlock_worker_rope,
			"apothecary": UpgradeConstants.upgradeIds.unlock_building_apothecary,
			"concrete": UpgradeConstants.upgradeIds.unlock_building_cementmill,
			"smith": UpgradeConstants.upgradeIds.unlock_building_smithy,
			"soldier": UpgradeConstants.upgradeIds.unlock_building_barracks,
            "scientist": UpgradeConstants.upgradeIds.upgrade_building_library2,
		},
        
        upgradesByUIEffects: {
        },
		
		improvementsByOccurrence: {
		},
		
		improvingUpgradesByImprovement: {
		},
		
		improvingUpgradesByWorker: {
		},
		
		improvingUpgradesByEvent: {
		},
		
		constructor: function () {
			this.improvementsByOccurrence[OccurrenceConstants.campOccurrenceTypes.trader] = improvementNames.market;
			
			this.improvingUpgradesByImprovement[improvementNames.storage] = ["upgrade_building_storage1", "upgrade_building_storage2" ];
			this.improvingUpgradesByImprovement[improvementNames.smithy] = ["unlock_item_weapon4"];
			this.improvingUpgradesByImprovement[improvementNames.market] = ["upgrade_building_market", "upgrade_building_market2", "improve_building_market3"];
			this.improvingUpgradesByImprovement[improvementNames.library] = ["upgrade_building_library", "upgrade_building_library2", "unlock_building_researchcenter", "improve_building_market3"];
			this.improvingUpgradesByImprovement[improvementNames.inn] = ["upgrade_building_inn", "unlock_building_radio"];
			this.improvingUpgradesByImprovement[improvementNames.hospital] = ["upgrade_building_hospital"];
			this.improvingUpgradesByImprovement[improvementNames.cementmill] = ["upgrade_building_cementmill"];
			this.improvingUpgradesByImprovement[improvementNames.campfire] = ["upgrade_building_campfire"];
			this.improvingUpgradesByImprovement[improvementNames.barracks] = ["unlock_item_weapon5", "unlock_item_weapon7"];
			this.improvingUpgradesByImprovement[improvementNames.apothecary] = ["upgrade_building_apothecary"];
			this.improvingUpgradesByImprovement[improvementNames.radiotower] = ["improve_building_market3"];
			this.improvingUpgradesByImprovement[improvementNames.shrine] = ["upgrade_building_shrine"];
			this.improvingUpgradesByImprovement[improvementNames.stable] = ["upgrade_outgoing_caravans"];
			this.improvingUpgradesByImprovement[improvementNames.temple] = ["upgrade_building_temple2", "upgrade_building_temple3"];
			
			this.improvingUpgradesByWorker["scavenger"] = ["upgrade_worker_scavenger"];
			this.improvingUpgradesByWorker["trapper"] = ["upgrade_worker_trapper"];
			this.improvingUpgradesByWorker["soldier"] = ["unlock_item_weapon5", "unlock_item_weapon7"];
			this.improvingUpgradesByWorker["smith"] = ["unlock_item_weapon4"];
			this.improvingUpgradesByWorker["weaver"] = ["unlock_item_clothing4h"];
			this.improvingUpgradesByWorker["concrete"] = ["upgrade_building_cementmill"];
			this.improvingUpgradesByWorker["collector"] = ["upgrade_worker_collector1"];
			this.improvingUpgradesByWorker["chemist"] = ["upgrade_worker_chemist"];
			this.improvingUpgradesByWorker["apothecary"] = ["upgrade_building_apothecary"];
			this.improvingUpgradesByWorker["scientist"] = ["unlock_building_researchcenter"];
			
			this.improvingUpgradesByEvent[OccurrenceConstants.campOccurrenceTypes.trader] = [ "upgrade_building_market", "upgrade_building_market2" ];
            
            this.upgradesByUIEffects[UpgradeConstants.upgradeUIEffects.calendar] = UpgradeConstants.upgradeIds.unlock_building_library;
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
							if (item) items.push(item.name);
						}
					}
				}
			}
			return items;
		},
		
		getUnlockedWorkers: function (upgradeId) {
			var workers = [];
			var workerUpgrade;
			for (var worker in this.upgradesByWorker) {
				workerUpgrade = this.upgradesByWorker[worker];
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
			for (var ui in this.upgradesByUIEffects) {
				uiUpgrade = this.upgradesByUIEffects[ui];
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
			for (var building in this.improvingUpgradesByImprovement) {
				buildingUpgradeList = this.improvingUpgradesByImprovement[building];
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
			for (var worker in this.improvingUpgradesByWorker) {
				workerUpgradeList = this.improvingUpgradesByWorker[worker];
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
			for (var event in this.improvingUpgradesByEvent) {
				eventUpgradeList = this.improvingUpgradesByEvent[event];
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
			return this.upgradesByWorker[worker];
		},
        
        getUpgradeIdForUIEffect: function (effect) {
            return this.upgradesByUIEffects[effect];
        },
		
		getImprovingUpgradeIdsForWorker: function (worker) {
			return this.improvingUpgradesByWorker[worker];
		},
		
		getUpgradeIdsForImprovement: function (improvementName) {
			return this.improvingUpgradesByImprovement[improvementName];
		},
		
		getImprovementForOccurrence: function (occurrence) {
			return this.improvementsByOccurrence[occurrence];
		},
		
		getImprovingUpgradeIdsForOccurrence: function (occurrence) {
			return this.improvingUpgradesByEvent[occurrence];
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
            var unlockingUpgrade = this.upgradesByWorker[worker];
            if (unlockingUpgrade) {
                isUnlocked = upgradesComponent.hasUpgrade(unlockingUpgrade);
            }
            
            if (isUnlocked) {
                result = 1;
				var improvingUpgrades = this.improvingUpgradesByWorker[worker];
                if (improvingUpgrades) {
    				for (var i = 0; i < improvingUpgrades.length; i++) {
    					if (upgradesComponent.hasUpgrade(improvingUpgrades[i])) {
                            result += 1;
                        }
    				}
                }
            }
            
            return result;
        }
		
    });
    
    return UpgradeEffectsHelper;
});
