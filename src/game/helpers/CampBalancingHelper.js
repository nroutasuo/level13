// Helpers for camp balancing that are independent of game state
define([
	'ash',
	'game/GameGlobals',
	'game/constants/GameConstants',
	'game/constants/CampConstants',
	'game/constants/ImprovementConstants',
	'game/constants/OccurrenceConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/UpgradeConstants',
	'game/constants/WorldConstants',
	'game/components/common/CampComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/tribe/UpgradesComponent',
	'game/vos/ResourcesVO',
	'worldcreator/WorldCreatorConstants',
], function (Ash, GameGlobals, GameConstants, CampConstants, ImprovementConstants, OccurrenceConstants, PlayerActionConstants, UpgradeConstants, WorldConstants,
	CampComponent, SectorImprovementsComponent, UpgradesComponent, ResourcesVO, WorldCreatorConstants) {
	
	var CampBalancingHelper = Ash.Class.extend({
		
		constructor: function () {},
		
		getImprovementCost: function (improvementName, actionOrdinal, isOutpost, costKey) {
			let actionName = GameGlobals.playerActionsHelper.getActionNameForImprovement(improvementName);
			let costs = GameGlobals.playerActionsHelper.getCostsByOrdinal(actionName, 1, actionOrdinal, isOutpost);
			return cost = costs[costKey] || 0;
		},
		
		getMaxCostKeyForImprovement: function (improvementName, actionOrdinal, isOutpost) {
			let actionName = GameGlobals.playerActionsHelper.getActionNameForImprovement(improvementName);
			let costs = GameGlobals.playerActionsHelper.getCostsByOrdinal(actionName, 1, actionOrdinal, isOutpost);
			let maxCost = 0;
			let maxCostKey = null;
			
			for (var key in costs) {
				let cost = costs[key];
				if (cost > maxCost) {
					maxCost = cost;
					maxCostKey = key;
				}
			}
			
			return maxCostKey;
		},
		
		getSlowestCostKeyForImprovement: function (improvementName, actionOrdinal, isOutpost, maxCampOrdinal) {
			let actionName = GameGlobals.playerActionsHelper.getActionNameForImprovement(improvementName);
			let costs = GameGlobals.playerActionsHelper.getCostsByOrdinal(actionName, 1, actionOrdinal, isOutpost);
			
			let longestDuration = 0;
			let longestDurationKey = null;
			
			for (var key in costs) {
				let cost = costs[key];
				let resourceName = key.replace("resource_", "");
				let duration = this.getDurationToProduce(resourceName, cost, maxCampOrdinal);
				if (duration > longestDuration) {
					longestDuration = duration;
					longestDurationKey = key;
				}
			}
			
			return longestDurationKey;
		},
		
		getMaxWorkers: function (workerID, improvements, upgrades, workshops) {
			var def = CampConstants.workerTypes[workerID];
			switch (def.id) {
				case CampConstants.workerTypes.scavenger.id:
				case CampConstants.workerTypes.water.id:
				case CampConstants.workerTypes.trapper.id:
					return -1;
				case CampConstants.workerTypes.ropemaker.id:
					var hasUnlockedRopers = GameGlobals.upgradeEffectsHelper.getWorkerLevel("weaver", upgrades) > 0;
					return hasUnlockedRopers ? -1 : 0;
				case CampConstants.workerTypes.chemist.id:
					return def.getLimitNum(improvements, workshops) * CampConstants.CHEMISTS_PER_WORKSHOP;
				case CampConstants.workerTypes.rubbermaker.id:
					return def.getLimitNum(improvements, workshops) * CampConstants.RUBBER_WORKER_PER_WORKSHOP;
				case CampConstants.workerTypes.gardener.id:
					return def.getLimitNum(improvements, workshops) * CampConstants.GARDENER_PER_GREENHOUSE;
				case CampConstants.workerTypes.apothecary.id:
					return def.getLimitNum(improvements, workshops) * CampConstants.getApothecariesPerShop(GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.apothecary, upgrades));
				case CampConstants.workerTypes.concrete.id:
					return def.getLimitNum(improvements, workshops) * CampConstants.getWorkersPerMill(GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.cementmill, upgrades));
				case CampConstants.workerTypes.toolsmith.id:
					return def.getLimitNum(improvements, workshops) * CampConstants.getSmithsPerSmithy(GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.smithy, upgrades));
				case CampConstants.workerTypes.scientist.id:
					var hasUnlockedScientists = GameGlobals.upgradeEffectsHelper.getWorkerLevel(def.id, upgrades) > 0;
					return hasUnlockedScientists ? def.getLimitNum(improvements, workshops) * CampConstants.getScientistsPerLibrary(GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.library, upgrades)) : 0;
				case CampConstants.workerTypes.cleric.id:
					return def.getLimitNum(improvements, workshops) * CampConstants.getClericsPerTemple(GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.temple, upgrades));
				case CampConstants.workerTypes.soldier.id:
					return def.getLimitNum(improvements, workshops) * CampConstants.getSoldiersPerBarracks(GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.barracks, upgrades));
				default:
					return -1;
			}
		},
		
		getMaxWorkersByCamp: function (workerID, campOrdinal, maxCampOrdinal) {
			let storage = this.getMaxTotalStorage(maxCampOrdinal);
			let improvements = this.getDefaultImprovements(maxCampOrdinal, campOrdinal, storage);
			let upgrades = this.getDefaultUpgrades(maxCampOrdinal);
			let workshops = this.getDefaultWorkshops(campOrdinal, maxCampOrdinal);

			return this.getMaxWorkers(workerID, improvements, upgrades, workshops);
		},

		getMaxTotalPopulation: function (maxCampOrdinal) {
			let result = 0;
			for (let campOrdinal = 1; campOrdinal <= maxCampOrdinal; campOrdinal++) {
				let pop = GameGlobals.campBalancingHelper.getMaxPopulation(campOrdinal, maxCampOrdinal);
				result += pop;
			}
			return result;
		},
		
		getMaxPopulation: function (campOrdinal, maxCampOrdinal) {
			let housingCap = GameGlobals.campBalancingHelper.getMaxHousing(campOrdinal, maxCampOrdinal);
			let reputation = GameGlobals.campBalancingHelper.getMaxReputation(campOrdinal, maxCampOrdinal);
			let reputationCap = CampConstants.getMaxPopulation(reputation);
			
			return Math.min(housingCap, reputationCap);
		},
		
		getTypicalTotalPopulation: function (maxCampOrdinal) {
			let result = 0;
			for (let campOrdinal = 1; campOrdinal <= maxCampOrdinal; campOrdinal++) {
				let pop = GameGlobals.campBalancingHelper.getTypicalPopulation(campOrdinal, maxCampOrdinal);
				result += pop;
			}
			return result;
		},
			
		getTypicalPopulation: function (campOrdinal, maxCampOrdinal) {
			return Math.round((this.getMaxPopulation(campOrdinal, maxCampOrdinal - 1) + this.getMaxPopulation(campOrdinal, maxCampOrdinal)) / 2);
		},
		
		getMaxReputation: function (campOrdinal, maxCampOrdinal) {
			let totalStorage = GameGlobals.campBalancingHelper.getMaxTotalStorage(maxCampOrdinal);
			let improvementsComponent = GameGlobals.campBalancingHelper.getMaxImprovements(maxCampOrdinal, campOrdinal, totalStorage);
			let populationFactor = GameGlobals.campBalancingHelper.getPopulationFactor(campOrdinal);
			let danger = 0;
			return GameGlobals.campBalancingHelper.getTargetReputation(improvementsComponent, null, 0, populationFactor, danger).value;
		},
		
		getTargetReputation: function (improvementsComponent, resourcesVO, population, populationFactor, danger) {
			let result = 0;
			var sources = {}; // text -> value
			var penalties = {}; // id -> bool
			
			var addValue = function (value, name) {
				result += value;
				if (!sources[name]) sources[name] = 0;
				sources[name] += value;
			};
			
			var addPenalty = function (id, active) {
				penalties[id] = active;
			};
			
			// base: building happiness values
			var allImprovements = improvementsComponent.getAll(improvementTypes.camp);
			for (let i in allImprovements) {
				var improvementVO = allImprovements[i];
				var level = improvementVO.level || 1;
				var defaultBonus = improvementVO.getReputationBonus();
				switch (improvementVO.name) {
					case improvementNames.generator:
						var numHouses = improvementsComponent.getCount(improvementNames.house) + improvementsComponent.getCount(improvementNames.house2);
						var generatorBonus = numHouses * CampConstants.REPUTATION_PER_HOUSE_FROM_GENERATOR * (1 + level * 0.1);
						generatorBonus = Math.round(generatorBonus * 100) / 100;
						addValue(generatorBonus, "Generator");
						break;
					case improvementNames.radiotower:
						addValue(improvementVO.count * defaultBonus, "Radio");
						break;
					case improvementNames.shrine:
						let levelBonus = (level - 1) * 0.25;
						addValue(improvementVO.count * defaultBonus * levelBonus, "Shrine");
						break;
					default:
						addValue(improvementVO.count * defaultBonus, "Buildings");
						break;
				}
			}
			
			var resultWithoutPenalties = result;
			
			// penalties: food and water
			if (population >= 1) {
				var noFood = resourcesVO && resourcesVO.getResource(resourceNames.food) <= 0;
				var noWater = resourcesVO && resourcesVO.getResource(resourceNames.water) <= 0;
				var penalty = Math.max(5, Math.ceil(resultWithoutPenalties));
				if (noFood) {
					addValue(-penalty, "No food");
				}
				if (noWater) {
					addValue(-penalty, "No water");
				}
				addPenalty(CampConstants.REPUTATION_PENALTY_TYPE_FOOD, noFood);
				addPenalty(CampConstants.REPUTATION_PENALTY_TYPE_WATER, noWater);
			}
			
			// penalties: defences
			var defenceLimit = CampConstants.REPUTATION_PENALTY_DEFENCES_THRESHOLD;
			var noDefences = danger > defenceLimit;
			if (noDefences) {
				var steppedDanger = Math.ceil((danger - defenceLimit) * 100 / 5) * 5;
				var penaltyRatio = steppedDanger / (100 - defenceLimit);
				var defencePenalty = Math.ceil(resultWithoutPenalties * penaltyRatio * 4) / 4;
				if (penaltyRatio > 0.25) {
					addValue(-defencePenalty, "Terrible defences");
				} else if (penaltyRatio > 0.15) {
					addValue(-defencePenalty, "Poor defences");
				} else {
					addValue(-defencePenalty, "Inadequate defences");
				}
			}
			addPenalty(CampConstants.REPUTATION_PENALTY_TYPE_DEFENCES, noDefences);
			
			// penalties: over-crowding
			var housingCap = CampConstants.getHousingCap(improvementsComponent);
			var population = Math.floor(population);
			var noHousing = population > housingCap;
			if (noHousing) {
				var housingPenaltyRatio = Math.ceil((population - housingCap) / population * 20) / 20;
				var housingPenalty = Math.ceil(resultWithoutPenalties * housingPenaltyRatio);
				addValue(-housingPenalty, "Overcrowding");
			}
			addPenalty(CampConstants.REPUTATION_PENALTY_TYPE_HOUSING, noHousing);
			
			// penalties: level population
			if (populationFactor < 1) {
				var levelPopPenalty = resultWithoutPenalties * (1 - populationFactor);
				addValue(-levelPopPenalty, "Level population");
			}
			addPenalty(CampConstants.REPUTATION_PENALTY_TYPE_LEVEL_POP, populationFactor < 1);
			
			return { value: Math.max(0, result), sources: sources, penalties: penalties };
		},
		
		getMaxImprovementActionOrdinal: function (improvementName, actionName) {
			switch (improvementName) {
				case improvementNames.passageUpStairs:
				case improvementNames.passageUpElevator:
				case improvementNames.passageUpHole:
				case improvementNames.passageDownStairs:
				case improvementNames.passageDownElevator:
				case improvementNames.passageDownHole:
					return WorldConstants.CAMPS_TOTAL;
				case improvementNames.greenhouse:
					return 2;
			}
			return GameGlobals.campBalancingHelper.getMaxImprovementCountPerSector(improvementName, actionName);
		},
		
		getMaxImprovementCountPerSector: function (improvementName, actionName) {
			let reqs = PlayerActionConstants.requirements[actionName];
			if (!reqs || !reqs.improvements) return -1;
			
			for (var improvementID in reqs.improvements) {
				var requiredImprovementName = improvementNames[improvementID];
				if (requiredImprovementName != improvementName) continue;
				var range = reqs.improvements[improvementID];
				var max = range[1];
				if (max > 0) return max;
			}
			
			return -1;
		},
		
		getMaxImprovementLevelOnCamp: function (campOrdinal, improvementName) {
			let techLevel = GameGlobals.upgradeEffectsHelper.getExpectedBuildingUpgradeLevel(improvementName, campOrdinal);
			if (techLevel == 0) return 0;
			return this.getMaxImprovementLevel(improvementName, techLevel);
		},
		
		getMaxImprovementLevel: function (improvementName, upgradeLevel) {
			upgradeLevel = upgradeLevel || this.getMaxImprovementTechLevel(improvementName);
			let improvementID = ImprovementConstants.getImprovementID(improvementName);
			return ImprovementConstants.getMaxLevel(improvementID, upgradeLevel);
		},
		
		getMaxImprovementTechLevel: function (improvementName) {
			let numTechs = GameGlobals.upgradeEffectsHelper.getUpgradeIdsForImprovement(improvementName).length;
			return numTechs + 1;
		},
		
		getTotalMaxHousing: function (campOrdinal) {
			let result = 0;
			for (let i = 1; i <= campOrdinal; i++) {
				result += GameGlobals.campBalancingHelper.getMaxHousing(i, campOrdinal);
			}
			return result;
		},
		
		getMaxHousing: function (campOrdinal, maxCampOrdinal) {
			let totalStorage = GameGlobals.campBalancingHelper.getMaxTotalStorage(maxCampOrdinal);
			let isOutpost = GameGlobals.campBalancingHelper.isOutpost(campOrdinal);
			let numHouses = GameGlobals.campBalancingHelper.getMaxImprovementsPerCamp(improvementNames.house, totalStorage, isOutpost);
			let numHouses2 = GameGlobals.campBalancingHelper.getMaxImprovementsPerCamp(improvementNames.house2, totalStorage, isOutpost);
			return CampConstants.getHousingCap2(numHouses, numHouses2);
		},
		
		getMaxImprovements: function (maxCampOrdinal, campOrdinal, storage) {
			return this.getDefaultImprovements(maxCampOrdinal, campOrdinal, storage, true);
		},
		
		getDefaultImprovementsCache: {},
		
		getDefaultImprovements: function (maxCampOrdinal, campOrdinal, storage, maximize) {
			let cacheKey = maxCampOrdinal + "-" + campOrdinal + "-" + storage + "-" + (maximize || false);
			if (this.getDefaultImprovementsCache[cacheKey]) return this.getDefaultImprovementsCache[cacheKey];
			
			let isOutpost = this.isOutpost(campOrdinal);
			let levelRaidDangerFactor = WorldCreatorConstants.getRaidDangerFactor(campOrdinal);
			
			let canBuild = function (improvementName, actionName, ordinal) {
				if (ordinal >= 100) return false;
				
				let reqs = GameGlobals.playerActionsHelper.getReqs(actionName);
				
				// check for deity
				if (reqs && reqs.deity && maxCampOrdinal < 8) {
					return false;
				}
				
				// check required other improvements
				if (reqs && reqs.improvements) {
					var improvementRequirements = reqs.improvements;
					for (var requiredImprovementID in improvementRequirements) {
						if (requiredImprovementID == "camp") continue;
						let requiredImprovementName = improvementNames[requiredImprovementID];
						var amount = requiredImprovementName == improvementName ?
							ordinal - 1 :
							result.getCount(requiredImprovementName);
						var range = improvementRequirements[requiredImprovementID];
						if (range) {
							let reqsCheck = GameGlobals.playerActionsHelper.checkRequirementsRange(range, amount);
							if (reqsCheck) {
								return false;
							}
						}
					}
				}
				
				// check required upgrades
				if (reqs && reqs.upgrades) {
					var upgradeRequirements = reqs.upgrades;
					for (let upgradeID in upgradeRequirements) {
						var requirementBoolean = upgradeRequirements[upgradeID];
						var requiredTechCampOrdinal = UpgradeConstants.getMinimumCampOrdinalForUpgrade(upgradeID);
						var hasBoolean = requiredTechCampOrdinal <= maxCampOrdinal;
						if (requirementBoolean != hasBoolean) {
							return false;
						}
					}
				}
				
				// check costs
				let costs = GameGlobals.playerActionsHelper.getCostsByOrdinal(actionName, 1, ordinal, isOutpost);
				if (costs) {
					for (let key in costs) {
						if (key == "resource_fuel" && maxCampOrdinal < WorldConstants.CAMP_ORDINAL_FUEL) {
							return false;
						}
						if (key == "resource_rubber" && maxCampOrdinal < 8) {
							return false;
						}
						var costAmount = costs[key];
						if (costAmount > storage) {
							return false;
						}
					}
				}
				
				return true;
			}
			
			let shouldBuild = function (improvementName, actionName, ordinal) {
				if (ordinal == 1) return true;
				
				// check danger
				var soldiers = CampConstants.workerTypes.soldier.getLimitNum(result);
				var soldierLevel = 1;
				var danger = OccurrenceConstants.getRaidDanger(result, soldiers, soldierLevel, levelRaidDangerFactor);
				var defenceLimit = CampConstants.REPUTATION_PENALTY_DEFENCES_THRESHOLD;
				var noDefences = danger > defenceLimit;
				if (noDefences) {
					if (improvementName != improvementNames.fortification && improvementName != improvementNames.barracks && improvementName != improvementNames.square) {
						return false;
					}
				}
				
				if (maximize) return true;
				
				return true;
			};
			
			let checkBuild = function (improvementName) {
				let actionName = GameGlobals.playerActionsHelper.getActionNameForImprovement(improvementName);
				let ordinal = result.getCount(improvementName) + 1;
				
				if (!canBuild(improvementName, actionName, ordinal)) {
					return false;
				}
				
				if (!shouldBuild(improvementName, actionName, ordinal)) {
					return false;
				}
				
				return true;
			};
			
			let canImprove = function (improvementName, actionName, ordinal) {
				if (!PlayerActionConstants.hasAction(actionName)) return false;
				if (result.getCount(improvementName) < 1) return false;
				
				let upgradeLevel  = GameGlobals.upgradeEffectsHelper.getExpectedBuildingUpgradeLevel(improvementName, maxCampOrdinal);
				let maxLevel = GameGlobals.campBalancingHelper.getMaxImprovementLevel(improvementName, upgradeLevel);
				if (ordinal > maxLevel) return false;
				
				return true;
			};
			
			let checkImprove = function (improvementName) {
				let actionName = ImprovementConstants.getImproveActionName(improvementName);
				let ordinal = result.getLevel(improvementName) + 1;
				
				if (!canImprove(improvementName, actionName, ordinal)) {
					return false;
				}
				
				return true;
			};
			
			let result = new SectorImprovementsComponent();
			
			let builtSomething = true;
			let improvedSomething = false;
			while (builtSomething || improvedSomething) {
				builtSomething = false;
				improvedSomething = false;
				for (var improvementID in ImprovementConstants.improvements) {
					let improvementName = improvementNames[improvementID];
					if (getImprovementType(improvementName) !== improvementTypes.camp) continue;
					
					if (checkBuild(improvementName)) {
						builtSomething = true;
						result.add(improvementName, 1);
						break;
					}
					
					if (checkImprove(improvementName)) {
						improvedSomething = true;
						result.improve(improvementName);
						break;
					}
				}
			}
			
			this.getDefaultImprovementsCache[cacheKey] = result;
			
			return result;
		},
		
		getMaxImprovementsPerCamp: function (improvementName, totalStorage, isOutpost) {
			let result = 0;
			let actionName = GameGlobals.playerActionsHelper.getActionNameForImprovement(improvementName);
			let getNextCost = function () {
				let ordinal = result + 1;
				return GameGlobals.playerActionsHelper.getCostsByOrdinal(actionName, 1, ordinal, isOutpost).resource_metal;
			};
			while (getNextCost() <= totalStorage) {
				result++;
			}
			return result;
		},
		
		maxTotalStorageCache: {},
		
		getMaxTotalStorage: function (maxCampOrdinal) {
			if (this.maxTotalStorageCache[maxCampOrdinal]) {
				return this.maxTotalStorageCache[maxCampOrdinal];
			}
			
			let result = 0;
			let storageUpgradeLevel = GameGlobals.upgradeEffectsHelper.getExpectedBuildingUpgradeLevel(improvementNames.storage, maxCampOrdinal);
			
			let storageCounts = {};
			let builtSomething = true;
			while (builtSomething) {
				builtSomething = false;
				let totalStorage = 0;
				
				// calculate current total
				for (var campOrdinal = 1; campOrdinal <= maxCampOrdinal; campOrdinal++) {
					if (!this.isConnectedToTradeNetwork(maxCampOrdinal, campOrdinal)) continue;
					if (!storageCounts[campOrdinal]) storageCounts[campOrdinal] = 0;
					let storageCount = storageCounts[campOrdinal];
					let storageLevel = GameGlobals.campBalancingHelper.getMaxImprovementLevel(improvementNames.storage, storageUpgradeLevel)
					let campStorage = CampConstants.getStorageCapacity(storageCount, storageLevel);
					totalStorage += campStorage;
				}
				
				// build more
				for (var campOrdinal = 1; campOrdinal <= maxCampOrdinal; campOrdinal++) {
					let storageCount = storageCounts[campOrdinal];
					let isOutpost = GameGlobals.campBalancingHelper.isOutpost(campOrdinal);
					let nextCost = GameGlobals.playerActionsHelper.getCostsByOrdinal("build_in_storage", 1, storageCount + 1, isOutpost).resource_metal;
					if (nextCost <= totalStorage) {
						storageCounts[campOrdinal]++;
						builtSomething = true;
					}
				}
				
				result = totalStorage;
			}
			
			this.maxTotalStorageCache[maxCampOrdinal] = result;

			return result;
		},
		
		isConnectedToTradeNetwork: function (maxCampOrdinal, campOrdinal) {
			// TODO remove hard-coded levels and check for when The Great Elevator is unlocked
			if (campOrdinal == 9 && maxCampOrdinal == 9) return false;
			return true;
		},
		
		getDefaultWorkshops: function (campOrdinal, maxCampOrdinal) {
			let workshops = {};
			if (campOrdinal == WorldConstants.CAMP_ORDINAL_FUEL) {
				workshops.fuel = 1;
			}
			if (campOrdinal == WorldConstants.CAMP_ORDINAL_FUEL_2) {
				workshops.fuel = 1;
			}
			if (campOrdinal == WorldConstants.CAMP_ORDINAL_GROUND && maxCampOrdinal >= campOrdinal) {
				workshops.rubber = 1;
			}
			if (campOrdinal == WorldConstants.CAMP_ORDINAL_GREENHOUSE_1 && maxCampOrdinal >= WorldConstants.CAMP_ORDINAL_GROUND) {
				workshops.herbs = 1;
			}
			if (campOrdinal == WorldConstants.CAMP_ORDINAL_GREENHOUSE_2 && maxCampOrdinal >= WorldConstants.CAMP_ORDINAL_GROUND) {
				workshops.herbs = 1;
			}
			return workshops;
		},

		getDefaultUpgrades: function (campOrdinal, step) {
			let result = new UpgradesComponent();
			step = step || WorldConstants.CAMP_STEP_END;
			var minOrdinal;
			var minStep;
			for (let id in UpgradeConstants.upgradeDefinitions) {
				minOrdinal = UpgradeConstants.getMinimumCampOrdinalForUpgrade(id);
				minStep = UpgradeConstants.getMinimumCampStepForUpgrade(id);
				if (WorldConstants.isHigherOrEqualCampOrdinalAndStep(campOrdinal, step, minOrdinal, minStep)) {
					result.addUpgrade(id);
				}
			}
			return result;
		},
		
		totalResourceProductionCache: {},
		
		getDefaultTotalResourceProduction: function (maxCampOrdinal) {
			if (this.totalResourceProductionCache[maxCampOrdinal]) {
				return this.totalResourceProductionCache[maxCampOrdinal];
			}
			
			let upgrades = this.getDefaultUpgrades(maxCampOrdinal);
			
			// default worker assignment
			let workersByCamp = {};
			let totalWorkers = {};
			let totalProduction = new ResourcesVO();
			for (let campOrdinal = 1; campOrdinal <= maxCampOrdinal; campOrdinal++) {
				let maxPopulation = this.getMaxPopulation(campOrdinal, maxCampOrdinal);
				let storage = this.getMaxTotalStorage(maxCampOrdinal);
				let improvements = this.getDefaultImprovements(maxCampOrdinal, campOrdinal, storage);
				
				workersByCamp[campOrdinal] = {};
				for (var workerID in CampConstants.workerTypes) {
					let workerDef = CampConstants.workerTypes[workerID];
					let producedResource = workerDef.resourceProduced;
					if (!producedResource) continue;
					let defaultAssignment = this.getDefaultWorkerAssignment(maxPopulation, false, false, workerID, (id) => this.getMaxWorkersByCamp(id, campOrdinal, maxCampOrdinal));
					let numWorkers = defaultAssignment[workerID];
					let production = numWorkers * this.getProductionPerWorkerPerSec(workerID, improvements, upgrades);
					
					workersByCamp[campOrdinal][workerID] = numWorkers;
					if (!totalWorkers[workerID]) totalWorkers[workerID] = 0;
					totalWorkers[workerID] += numWorkers;
					
					totalProduction.addResource(producedResource, production);
				}
			}
			
			// workers (limit by ingredients)
			for (var workerID in CampConstants.workerTypes) {
				let requiredResources = this.getRequiredResourcesByWorkerID(workerID);
				let allowedNum = totalWorkers[workerID];
				for (let i = 0; i < requiredResources.length; i++) {
					let requiredResource = requiredResources[i];
					let resProduction = totalProduction.getResource(requiredResource.name);
					let supportedWorkers = Math.floor(resProduction / requiredResource.consumption);
					allowedNum = Math.min(allowedNum, supportedWorkers);
				}
				totalWorkers[workerID] = allowedNum;
			}
			
			// production per worker
			// TODO take correct improvements (per camp) into account here too (affects only a few resources)
			let emptyImprovements = new SectorImprovementsComponent();
			let result = new ResourcesVO();
			for (var workerID in totalWorkers) {
				let workerDef = CampConstants.workerTypes[workerID];
				let producedResource = workerDef.resourceProduced;
				if (!producedResource) continue;
				let numWorkers = totalWorkers[workerID];
				let production = numWorkers * this.getProductionPerWorkerPerSec(workerID, emptyImprovements, upgrades);
				result.addResource(producedResource, production);
			}
			
			// TODO add dark farm Production
			// TODO deduct worker food/water consumption
			
			this.totalResourceProductionCache[maxCampOrdinal] = result;
			
			return result;
		},
		
		getDurationToProduce: function (resourceName, amount, maxCampOrdinal) {
			let totalProduction = GameGlobals.campBalancingHelper.getDefaultTotalResourceProduction(maxCampOrdinal);
			let production = totalProduction.getResource(resourceName);
			return Math.ceil(amount / production);
		},
		
		getDefaultWorkerAssignment: function (population, prioritizeFood, prioritizeWater, preferredWorker, getMaxWorkers) {
			// sort worker types by priority
			var workersByPrio = [[], [], []];
			for (var key in CampConstants.workerTypes) {
				var prio = 1;
				var min = 0;
				var preferred = 1;
				var max = getMaxWorkers(key);
				switch (key) {
					case CampConstants.workerTypes.trapper.id:
						prio = 0;
						min = Math.max(1, Math.floor(population / (prioritizeFood ? 3.5 : 4.75)));
						preferred = min;
						break;
					case CampConstants.workerTypes.water.id:
						prio = 0;
						min = Math.max(1, Math.floor(population / (prioritizeWater ? 1.95 : 2.25)));
						preferred = min;
						break;
					case CampConstants.workerTypes.gardener.id:
					case CampConstants.workerTypes.chemist.id:
					case CampConstants.workerTypes.rubbermaker.id:
						prio = 0;
						min = 1;
						preferred = 2;
						break;
					case CampConstants.workerTypes.ropemaker.id:
					case CampConstants.workerTypes.scavenger.id:
						prio = 2;
						break;
				}
				workersByPrio[prio].push({ id: key, min: min, preferred: preferred, max: max });
			}
			
			// assign workers by priority
			var assignment = {};
			var remaining = population;
			// - minimum
			for (let i = 0; i < workersByPrio.length; i++) {
				for (let j = 0; j < workersByPrio[i].length; j++) {
					var def = workersByPrio[i][j];
					var min = def.min;
					var max = def.max < 0 ? remaining : def.max;
					var num = Math.min(min, remaining, max);
					assignment[def.id] = num;
					remaining -= num;
				}
			}
			// - preferred
			if (remaining > 0) {
				for (let i = 0; i < workersByPrio.length; i++) {
					for (let j = 0; j < workersByPrio[i].length; j++) {
						var def = workersByPrio[i][j];
						var max = def.max < 0 ? remaining : def.max;
						var preferred = def.preferred;
						var current = assignment[def.id];
						var num = Math.min(preferred - current, remaining, max);
						assignment[def.id] = current + num;
						remaining -= num;
					}
				}
			}
			
			// rest to preferredWorker if defined
			if (preferredWorker) {
				let preferredMax = getMaxWorkers(preferredWorker);
				let hasIngredientWorkers = preferredWorker == CampConstants.workerTypes.toolsmith.id || preferredWorker == CampConstants.workerTypes.concrete.id || preferredWorker == CampConstants.workerTypes.apothecary.id;
				let preferredAssigned = remaining;
				if (preferredMax >= 0) {
					 preferredAssigned = Math.min(preferredAssigned, preferredMax - assignment[preferredWorker]);
					 preferredAssigned = Math.max(preferredAssigned, 0);
					 if (hasIngredientWorkers) preferredAssigned = Math.floor(hasIngredientWorkers / 2); // estimate 1 ingredient worker per 1 refined resource worker
				}
				assignment[preferredWorker] += preferredAssigned;
				remaining -= preferredAssigned;
			}
			
			// rest to scavengers
			assignment[CampConstants.workerTypes.scavenger.id] += remaining;
			
			return assignment;
		},
		
		getRequiredResourcesByWorkerID: function (workerID) {
			switch (workerID) {
				case "apothecary":
					return [ { name: resourceNames.herbs, consumption: CampConstants.CONSUMPTION_HERBS_PER_WORKER_PER_S } ];
				case "toolsmith":
					return [ { name: resourceNames.metal, consumption: CampConstants.CONSUMPTION_METAL_PER_TOOLSMITH_PER_S } ];
				case "concrete":
					return [ { name: resourceNames.metal, consumption: CampConstants.CONSUMPTION_METAL_PER_CONCRETE_PER_S } ];
			}
			return [];
		},
		
		getProductionPerWorkerPerSec: function (workerID, improvements, upgrades) {
			switch (workerID) {
				case "scavenger": return this.getMetalProductionPerSecond(1, improvements, upgrades);
				case "trapper": return this.getFoodProductionPerSecond(1, improvements, upgrades);
				case "water": return this.getWaterProductionPerSecond(1, improvements, upgrades);
				case "ropemaker": return this.getRopeProductionPerSecond(1, improvements, upgrades);
				case "chemist": return this.getFuelProductionPerSecond(1, improvements, upgrades);
				case "rubbermaker": return this.getRubberProductionPerSecond(1, improvements, upgrades);
				case CampConstants.workerTypes.gardener.id: return this.getHerbsProductionPerSecond(1, improvements, upgrades);
				case "apothecary": return this.getMedicineProductionPerSecond(1, improvements, upgrades);
				case "toolsmith": return this.getToolsProductionPerSecond(1, improvements, upgrades);
				case "concrete": return this.getConcreteProductionPerSecond(1, improvements, upgrades);
			}
			return 0;
		},
		
		getMetalProductionPerSecond: function (workers, improvements, upgrades) {
			workers = workers || 0;
			var metalUpgradeBonus = this.getWorkerUpgradeBonus("scavenger", upgrades);
			return workers * CampConstants.PRODUCTION_METAL_PER_WORKER_PER_S * metalUpgradeBonus;
		},
		
		getFoodProductionPerSecond: function (workers, improvementsComponent, upgrades) {
			workers = workers || 0;
			var foodUpgradeBonus = this.getWorkerUpgradeBonus("trapper", upgrades);
			return workers * CampConstants.PRODUCTION_FOOD_PER_WORKER_PER_S * foodUpgradeBonus;
		},
		
		getWaterProductionPerSecond: function (workers, improvementsComponent, upgrades) {
			workers = workers || 0;
			let acqueductCount = improvementsComponent.getCount(improvementNames.aqueduct);
			let acqueductLevel = improvementsComponent.getLevel(improvementNames.aqueduct);
			var waterUpgradeBonus = this.getWorkerUpgradeBonus("water", upgrades);
			var waterImprovementBonus = 1 + (acqueductCount / 4) + (acqueductLevel / 10);
			return CampConstants.PRODUCTION_WATER_PER_WORKER_PER_S * workers * waterUpgradeBonus * waterImprovementBonus;
		},
		
		getRopeProductionPerSecond: function (workers, improvementsComponent, upgrades) {
			workers = workers || 0;
			var ropeUpgradeBonus = this.getWorkerUpgradeBonus("weaver", upgrades);
			return workers * CampConstants.PRODUCTION_ROPE_PER_WORKER_PER_S * ropeUpgradeBonus;
		},
		
		getFuelProductionPerSecond: function (workers, improvementsComponent, upgrades) {
			workers = workers || 0;
			var fuelUpgradeBonus = this.getWorkerUpgradeBonus("chemist", upgrades);
			return workers * CampConstants.PRODUCTION_FUEL_PER_WORKER_PER_S * fuelUpgradeBonus;
		},
		
		getRubberProductionPerSecond: function (workers, improvementsComponent, upgrades) {
			workers = workers || 0;
			var upgradeBonus = this.getWorkerUpgradeBonus("rubbermaker", upgrades);
			return workers * CampConstants.PRODUCTION_RUBBER_PER_WORKER_PER_S * upgradeBonus;
		},
		
		getHerbsProductionPerSecond: function (workers, improvementsComponent, upgrades) {
			workers = workers || 0;
			var upgradeBonus = this.getWorkerUpgradeBonus(CampConstants.workerTypes.gardener.id, upgrades) || 1;
			return workers * CampConstants.PRODUCTION_HERBS_PER_WORKER_PER_S * upgradeBonus;
		},
		
		getMedicineProductionPerSecond: function (workers, improvementsComponent, upgrades) {
			workers = workers || 0;
			var medicineUpgradeBonus = this.getWorkerUpgradeBonus("apothecary", upgrades);
			var levelBonus = 1 + improvementsComponent.getLevel(improvementNames.apothecary) / 10;
			return workers * CampConstants.PRODUCTION_MEDICINE_PER_WORKER_PER_S * medicineUpgradeBonus * levelBonus;
		},
		
		getToolsProductionPerSecond: function (workers, improvementsComponent, upgrades) {
			workers = workers || 0;
			var toolsUpgradeBonus = this.getWorkerUpgradeBonus("smith", upgrades);
			var levelBonus = 1 + improvementsComponent.getLevel(improvementNames.smithy) / 10;
			return workers * CampConstants.PRODUCTION_TOOLS_PER_WORKER_PER_S * toolsUpgradeBonus * levelBonus;
		},
		
		getConcreteProductionPerSecond: function (workers, improvementsComponent, upgrades) {
			workers = workers || 0;
			var concreteUpgradeBonus = this.getWorkerUpgradeBonus("concrete", upgrades);
			var levelBonus = 1 + improvementsComponent.getLevel(improvementNames.cementmill) / 10;
			return workers * CampConstants.PRODUCTION_CONCRETE_PER_WORKER_PER_S * concreteUpgradeBonus * levelBonus;
		},
		
		getMeditationSuccessRate: function (shrineLevel) {
			shrineLevel = shrineLevel || 1;
			let id = ImprovementConstants.getImprovementID(improvementNames.shrine);
			let majorLevel = ImprovementConstants.getMajorLevel(id, shrineLevel);
			return CampConstants.getMeditationSuccessRate(shrineLevel, majorLevel);
		},
		
		getRumoursPerVisitCampfire: function (campfireLevel) {
			campfireLevel = campfireLevel || 1;
			let id = ImprovementConstants.getImprovementID(improvementNames.campfire);
			let majorLevel = ImprovementConstants.getMajorLevel(id, campfireLevel);
			return CampConstants.getRumoursPerVisitCampfire(campfireLevel, majorLevel);
		},
		
		getRumoursPerVisitMarket: function (marketLevel) {
			marketLevel = marketLevel || 1;
			let id = ImprovementConstants.getImprovementID(improvementNames.market);
			let majorLevel = ImprovementConstants.getMajorLevel(id, marketLevel);
			return CampConstants.getRumoursPerVisitMarket(marketLevel, majorLevel);
		},
		
		getWorkerUpgradeBonus: function (workerID, upgrades) {
			var upgradeBonus = 1;
			var workerUpgrades = GameGlobals.upgradeEffectsHelper.getImprovingUpgradeIdsForWorker(workerID);
			var workerUpgrade;
			for (let i in workerUpgrades) {
				workerUpgrade = workerUpgrades[i];
				if (upgrades.hasUpgrade(workerUpgrade)) upgradeBonus += 0.15;
			}
			return upgradeBonus;
		},
		
		isOutpost: function (campOrdinal) {
			return this.getPopulationFactor(campOrdinal) < 1;
		},
		
		getPopulationFactor: function (campOrdinal) {
			return WorldCreatorConstants.getPopulationFactor(campOrdinal);
		},
	
	});

	return CampBalancingHelper;
});
