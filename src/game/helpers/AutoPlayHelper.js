define(['ash',
	'game/GameGlobals',
	'game/constants/AutoPlayConstants',
	'game/constants/BagConstants',
	'game/constants/ItemConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/PerkConstants',
	'game/constants/PositionConstants',
	'game/components/common/PositionComponent',
	'game/components/common/ResourcesComponent',
	'game/components/common/VisitedComponent',
	'game/components/player/BagComponent',
	'game/components/player/PlayerActionResultComponent',
	'game/components/player/PerksComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
], function (Ash,
	GameGlobals,
	AutoPlayConstants,
	BagConstants,
	ItemConstants,
	PlayerActionConstants,
	PerkConstants,
	PositionConstants,
	PositionComponent,
	ResourcesComponent,
	VisitedComponent,
	BagComponent,
	PlayerActionResultComponent,
	PerksComponent,
	SectorStatusComponent,
	SectorFeaturesComponent,
	SectorImprovementsComponent) {
	
	var AutoPlayHelper = Ash.Class.extend({

		constructor: function () { },
		
		setExploreObjective: function (autoExploratioVO) {
			var playerPosition = GameGlobals.playerActionFunctions.playerPositionNodes.head.position;
			var itemsComponent = GameGlobals.movementHelper.itemsNodes.head.items;
			var perksComponent = GameGlobals.playerActionFunctions.playerStatsNodes.head.entity.get(PerksComponent);
			var campResources = GameGlobals.playerActionFunctions.nearestCampNodes.head ? GameGlobals.resourcesHelper.getCurrentCampStorage(GameGlobals.playerActionFunctions.nearestCampNodes.head.entity) : null;

			var injuries = perksComponent.getPerksByType(PerkConstants.perkTypes.injury);
			var hasInjuries = injuries.length > 0;
			var hasHospital = this.getTotalImprovementsCount(improvementNames.hospital) > 0;
			var prioritizeHeal = hasInjuries && hasHospital;
			var prioritizeScouting = campResources ? campResources.isStocked(GameGlobals.gameState) : false;
			var hasLockPick = itemsComponent.getCountById("exploration_1", true);

			// 1. check sectors
			var numAccessibleSectors = 0;
			var numUnscoutedSectors = 0;
			var nearestUnscoutedSector = null;
			var nearestUnscoutedLocaleSector = null;
			var nearestUnclearedWorkshopSector = null;

			var checkSector = function (sector) {
				var isScouted = sector.get(SectorStatusComponent).scouted;
				var hasUnscoutedLocales = GameGlobals.levelHelper.getSectorLocalesForPlayer(sector).length > 0;
				var hasUnclearedWorkshops = GameGlobals.levelHelper.getSectorUnclearedWorkshopCount(sector) > 0;

				if (!nearestUnscoutedSector && !isScouted) {
					if (GameGlobals.playerActionsHelper.checkAvailability("scout", false, sector)) {
						nearestUnscoutedSector = sector;
					}
				}
				if (!nearestUnscoutedLocaleSector && hasUnscoutedLocales) nearestUnscoutedLocaleSector = sector;
				if (!nearestUnclearedWorkshopSector && hasUnclearedWorkshops) nearestUnclearedWorkshopSector = sector;

				numAccessibleSectors++;
				if (!isScouted)
					numUnscoutedSectors++;

				return false;
			};

			GameGlobals.levelHelper.forEverySectorFromLocation(playerPosition, checkSector, autoExploratioVO.limitToCurrentLevel);

			// 3. set goal
			var goal = null
			var sector = null;
			var path = null;
			var resource = null;

			var ratioUnscoutedSectors = numUnscoutedSectors / numAccessibleSectors;
			var startSector = GameGlobals.playerActionFunctions.playerPositionNodes.head.entity;
			var hasCamp = GameGlobals.playerActionFunctions.nearestCampNodes.head;
			
			var prioritizeScavenge = hasInjuries;

			if (hasCamp && !prioritizeHeal && !prioritizeScavenge && nearestUnclearedWorkshopSector && !hasInjuries) {
				goal = AutoPlayConstants.GOALTYPES.CLEAR_WORKSHOP;
				sector = nearestUnclearedWorkshopSector;
				path = GameGlobals.levelHelper.findPathTo(startSector, sector);
			}
			else if (hasCamp && !prioritizeHeal && !prioritizeScavenge && hasLockPick && nearestUnscoutedLocaleSector && !hasInjuries) {
				goal = AutoPlayConstants.GOALTYPES.SCOUT_LOCALE;
				sector = nearestUnscoutedLocaleSector;
				path = GameGlobals.levelHelper.findPathTo(startSector, sector);
			}
			else if (hasCamp && !prioritizeHeal && !prioritizeScavenge && nearestUnscoutedSector && numUnscoutedSectors > 0) {
				goal = AutoPlayConstants.GOALTYPES.SCOUT_SECTORS;
				sector = nearestUnscoutedSector;
				path = GameGlobals.levelHelper.findPathTo(startSector, sector);
			} else {
				var goalSectorsByRes = this.getGoalSectorsByRes(autoExploratioVO);
				goal = AutoPlayConstants.GOALTYPES.SCAVENGE_RESOURCES;
				resource = this.getExploreResource(goalSectorsByRes);
				sector = goalSectorsByRes[resource];
				path = GameGlobals.levelHelper.findPathTo(startSector, sector);
			}
			
			autoExploratioVO.setExploreObjective(goal, sector, path, resource);
		},
		
		getMoveSector: function (autoExploratioVO) {
			var targetSector = autoExploratioVO.exploreSector;
			var targetPosition = targetSector ? targetSector.get(PositionComponent) : null;
			var playerPosition = GameGlobals.playerActionFunctions.playerPositionNodes.head.position;
			
			if (!GameGlobals.gameState.unlockedFeatures.camp)
				return null;

			if (playerPosition.equals(targetPosition))
				return null;

			if (autoExploratioVO.isExploreGoalComplete)
				return null;

			if (targetSector) {
				// move towards target
				var nextSector = autoExploratioVO.explorePath.shift();
				return { sector: nextSector, type: "path" };
			} else {
				// move to random sector
				var playerSector = GameGlobals.playerActionFunctions.playerPositionNodes.head.entity;
				var neighbours = GameGlobals.levelHelper.getSectorNeighboursList(playerSector);
				let i = Math.floor(Math.random() * neighbours.length);
				var randomNeighbour = neighbours[i];
				return { sector: randomNeighbour, type: "random" };
			}
		},

		getGoalSectorsByRes: function (autoExploratioVO) {
			let maxSteps = this.getMaxMoveSteps();
			let result = {};
			let result2 = {};
			let playerLocation = GameGlobals.playerActionFunctions.playerLocationNodes.head.entity;
			let playerPosition = GameGlobals.playerActionFunctions.playerPositionNodes.head.position;
			let getDistanceFactor = function (resourceName, pathlen) {
				let len = Math.min(pathlen, maxSteps);
				if (resourceName == resourceNames.metal) {
					let ideallen = Math.min(maxSteps, 5);
					return Math.abs(len - ideallen);
				} else {
					return (maxSteps - len)
				}
			}
			let getScore = function (sector, resourceName, pathlen) {
				let featuresComponent = sector.get(SectorFeaturesComponent);
				let scavengeable = featuresComponent.resourcesScavengable.getResource(resourceName) || 0;
				let collectable = featuresComponent.resourcesCollectable.getResource(resourceName) || 0;
				if (scavengeable == 0 && collectable == 0)
					return 0;
				// TODO account for scavenged percent
				let distanceFactor = getDistanceFactor(resourceName, pathlen);
				return (scavengeable + collectable) * distanceFactor;
			};
			let checkSector = function (sector) {
				if (!sector.has(VisitedComponent))
					return false;
				let position = sector.get(PositionComponent).getPosition();
				let distance = PositionConstants.getDistanceTo(position, playerPosition);
				if (distance > maxSteps) {
					return true;
				}
				let path = GameGlobals.levelHelper.findPathTo(playerLocation, sector, { skipBlockers: true, skipUnvisited: true });
				if (!path || path.length > maxSteps) {
					return false;
				}
				for (let key in resourceNames) {
					let name = resourceNames[key];
					let score = getScore(sector, name, path.length);
					if (score <= 0)
						continue;
					let existing = result[name];
					if (!existing) {
						result[name] = sector;
						result2[name] = position;
						continue;
					}
					
					let existingScore = getScore(existing, name, path.length);
					if (score > existingScore) {
						result[name] = sector;
						result2[name] = position;
						continue;
					}
				}
				return false;
			};
			GameGlobals.levelHelper.forEverySectorFromLocation(playerPosition, checkSector, autoExploratioVO.limitToCurrentLevel);
			log.i(result2)
			return result;
		},

		getExploreResource: function (goalSectorsByRes) {
			if (!GameGlobals.gameState.unlockedFeatures.camp || !GameGlobals.playerActionFunctions.nearestCampNodes.head.entity)
				return resourceNames.metal;

			var campStorage = GameGlobals.resourcesHelper.getCurrentCampStorage(GameGlobals.playerActionFunctions.nearestCampNodes.head.entity);
			var campResources = campStorage.resources;
			var campPopulation = GameGlobals.playerActionFunctions.nearestCampNodes.head.camp.population;
			
			var hasHospital = this.getTotalImprovementsCount(improvementNames.hospital) > 0;
			var healCosts = hasHospital ? GameGlobals.playerActionsHelper.getCosts("use_in_hospital") : { resource_water: 0, resource_food: 0};
			var isWaterLow = campResources.getResource(resourceNames.water) < Math.max(5 + campPopulation * 2.5, healCosts.resource_water);
			if (isWaterLow)
				if (goalSectorsByRes[resourceNames.water])
					return resourceNames.water;

			var isFoodLow = campResources.getResource(resourceNames.food) < Math.max(5 + campPopulation * 2.5, healCosts.resource_food);
			if (isFoodLow)
				if (goalSectorsByRes[resourceNames.food])
					return resourceNames.food;

			var action = this.getNextImprovementAction() || this.getNextProjectAction();
			if (action) {
				var missingResource = action.costFactorRes;
				if (missingResource && goalSectorsByRes[missingResource])
					return missingResource;
			}

			var leastAmount = -1;
			var leastRes = null;
			for (var key in resourceNames) {
				var name = resourceNames[key];
				if (!GameGlobals.gameState.unlockedFeatures.resources[name])
					continue;
				if (!goalSectorsByRes[name])
					continue;
				var campAmount = campResources.getResource(name);
				if (campAmount < leastAmount || leastAmount < 0) {
					leastAmount = campAmount;
					leastRes = name;
				}
			}

			return leastRes || resourceNames.metal;
		},
		
		selectAllFromPendingResult: function () {
			var itemsComponent = GameGlobals.movementHelper.itemsNodes.head.items;
			var inCamp = GameGlobals.playerActionFunctions.playerStatsNodes.head.entity.get(PositionComponent).inCamp;
			var resultVO = GameGlobals.playerActionFunctions.playerStatsNodes.head.entity.get(PlayerActionResultComponent).pendingResultVO;
			var bagComponent = GameGlobals.playerActionFunctions.playerStatsNodes.head.entity.get(BagComponent);
			var playerResources = GameGlobals.playerActionFunctions.playerStatsNodes.head.entity.get(ResourcesComponent);
			var playerAllItems = itemsComponent.getAll(inCamp);
			
			resultVO.selectedItems = resultVO.gainedItems;
			resultVO.selectedResources = resultVO.gainedResources;
			BagConstants.updateCapacity(bagComponent, resultVO, playerResources, playerAllItems);
		},
		
		deselectFromPendingResult: function () {
			var itemsComponent = GameGlobals.movementHelper.itemsNodes.head.items;
			var inCamp = GameGlobals.playerActionFunctions.playerStatsNodes.head.entity.get(PositionComponent).inCamp;
			var resultVO = GameGlobals.playerActionFunctions.playerStatsNodes.head.entity.get(PlayerActionResultComponent).pendingResultVO;
			var bagComponent = GameGlobals.playerActionFunctions.playerStatsNodes.head.entity.get(BagComponent);
			var playerResources = GameGlobals.playerActionFunctions.playerStatsNodes.head.entity.get(ResourcesComponent);
			var playerAllItems = itemsComponent.getAll(inCamp);
	
			// TODO prioritize item types to discard
			var prioritizedResources = [
				{ name: resourceNames.metal, min: 8 },
				{ name: resourceNames.concrete, min: 0 },
				{ name: resourceNames.tools, min: 0 },
				{ name: resourceNames.medicine, min: 0 },
				{ name: resourceNames.rope, min: 0 },
				{ name: resourceNames.herbs, min: 0 },
				{ name: resourceNames.fuel, min: 0 },
				{ name: resourceNames.rubber, min: 0 },
				{ name: resourceNames.food, min: 5 },
				{ name: resourceNames.water, min: 8 },
				{ name: resourceNames.metal, min: 0 },
				{ name: resourceNames.food, min: 0 },
				{ name: resourceNames.water, min: 0 },
			];

			while (bagComponent.selectedCapacity > bagComponent.totalCapacity) {
				var discarded = false;
				for (let i = 0; i < prioritizedResources.length; i++) {
					var resourceCheck = prioritizedResources[i];
					var name = resourceCheck.name;
					var totalAmount = resultVO.selectedResources.getResource(name) + playerResources.resources.getResource(name);
					var min = resourceCheck.min + (goalres == name ? goalamount : 0);

					// leave from selected resources
					if (resultVO.selectedResources.getResource(name) > 0 && totalAmount > min) {
						resultVO.selectedResources.addResource(name, -1);
						// this.printStep("leave 1 " + name);
						discarded = true;
						break;
					}

					// discard from already carried resources
					if (playerResources.resources.getResource(name) > 0 && totalAmount > min) {
						resultVO.discardedResources.addResource(name, 1);
						// this.printStep("discard 1 " + name);
						discarded = true;
						break;
					}
				}

				if (!discarded && resultVO.selectedItems.length > 0) {
					// this.printStep("leave 1 item");
					resultVO.selectedItems.splice(0, 1);
					discarded = true;
				}

				BagConstants.updateCapacity(bagComponent, resultVO, playerResources, playerAllItems);
				if (!discarded)
					break;
			}
		},
		
		canScavenge: function () {
			if (!GameGlobals.playerActionsHelper.checkAvailability("scavenge"))
				return false;
				
			var bagComponent = GameGlobals.playerActionFunctions.playerStatsNodes.head.entity.get(BagComponent);
			var bagFull = this.isBagFull() && bagComponent.totalCapacity > ItemConstants.PLAYER_DEFAULT_STORAGE;
			if (bagFull)
				return false;
			
			return true;
		},
		
		canScout: function () {
			if (!GameGlobals.playerActionsHelper.checkAvailability("scout"))
				return false;
			return true;
		},

		getNextImprovementAction: function () {
			var campStorage = GameGlobals.resourcesHelper.getCurrentCampStorage(GameGlobals.playerActionFunctions.nearestCampNodes.head.entity).resources;

			// get all available improvements in camp
			var improvements = [];
			for (var key in improvementNames) {
				var improvementName = improvementNames[key];
				var actionName = PlayerActionConstants.getActionNameForImprovement(improvementName);
				if (!actionName)
					continue;

				var requirementCheck = GameGlobals.playerActionsHelper.checkRequirements(actionName, false, null);
				var actionEnabled = requirementCheck.value >= 1;
				if (!actionEnabled)
					continue;

				var actionAvailable = GameGlobals.playerActionsHelper.checkAvailability(actionName, false, null);
				if (actionAvailable)
					continue;

				var costs = GameGlobals.playerActionsHelper.getCosts(actionName);

				var costFactor = 1;
				var costFactorRes = null;
				for (var costName in costs) {
					var costNameParts = costName.split("_");
					var costAmount = costs[costName];
					if (costNameParts[0] !== "resource")
						continue;
					var resourceName = costNameParts[1];
					var factor = campStorage.getResource(resourceName) / costAmount;
					if (factor < costFactor) {
						costFactor = factor;
						costFactorRes = resourceName;
					}

				}
				if (costFactor < 1) {
					improvements.push({improvementName: improvementName, actionName: actionName, costFactor: costFactor, costFactorRes: costFactorRes});
				}
			}

			if (improvements.length === 0)
				return null;

			// sort by a) hasn't built any yet b) resource cost
			var campImprovements = GameGlobals.playerActionFunctions.nearestCampNodes.head.entity.get(SectorImprovementsComponent);
			improvements = improvements.sort(function(a,b) {
				var counta = campImprovements.getCount(a.improvementName);
				var countb = campImprovements.getCount(b.improvementName);
				if (counta === 0 && countb !== 0)
					return -1;
				if (countb === 0 && counta !== 0)
					return 1;
				return a.costFactor - b.costFactor;

			});

			return improvements[0];
		},

		getNextProjectAction: function () {
			// TODO implement
			return null;
		},

		isBagFull: function () {
			var bagComponent = GameGlobals.playerActionFunctions.playerStatsNodes.head.entity.get(BagComponent);
			return bagComponent.totalCapacity - bagComponent.usedCapacity < 2;
		},
		
		getMaxMoveSteps: function () {
			let playerResources = GameGlobals.resourcesHelper.getPlayerStorage();
			let water = playerResources.resources.getResource(resourceNames.water);
			let food = playerResources.resources.getResource(resourceNames.food);
			let result = Math.min(
				Math.floor(Math.min(water, food) / 2),
				Math.floor(GameGlobals.playerActionFunctions.playerStatsNodes.head.stamina.stamina / 10) / 2
			);
			return result;
		},

		getTotalImprovementsCount: function (name) {
			let result = 0;
			for (var node = GameGlobals.campHelper.campNodes.head; node; node = node.next) {
				var improvements = node.entity.get(SectorImprovementsComponent);
				result += improvements.getCount(name);
			}
			return result;
		}
		
	});

	return AutoPlayHelper;
});
