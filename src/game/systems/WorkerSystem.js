define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/LogConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/PerkConstants',
	'game/constants/CampConstants',
	'game/nodes/sector/CampNode',
	'game/nodes/PlayerPositionNode',
	'game/nodes/PlayerLocationNode',
	'game/nodes/NearestCampNode',
	'game/components/common/ResourcesComponent',
	'game/components/common/PositionComponent',
	'game/components/common/ResourceAccumulationComponent',
	'game/components/player/PerksComponent',
	'game/components/common/CampComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/common/LogMessagesComponent',
], function (Ash, GameGlobals, GlobalSignals, GameConstants, LogConstants, PlayerActionConstants, PerkConstants, CampConstants,
	CampNode, PlayerPositionNode, PlayerLocationNode, NearestCampNode,
	ResourcesComponent,
	PositionComponent,
	ResourceAccumulationComponent,
	PerksComponent,
	CampComponent,
	SectorImprovementsComponent,
	LogMessagesComponent
) {
	var WorkerSystem = Ash.System.extend({
		
		campNodes: null,
		playerNodes: null,
		playerLocationNodes: null,
		nearestCampNodes: null,
	
		isPendingProductionRateUpdate: false,
		lastMsgTimeStamp: 0,
		lastPerksChangedTimestamp: 0,
		msgFrequency: 1000 * 120,

		constructor: function () { },

		addToEngine: function (engine) {
			this.engine = engine;
			this.campNodes = engine.getNodeList(CampNode);
			this.playerNodes = engine.getNodeList(PlayerPositionNode);
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			this.nearestCampNodes = engine.getNodeList(NearestCampNode);
			
			this.isPendingProductionRateUpdate = true;
			
			GlobalSignals.add(this, GlobalSignals.gameStateReadySignal, this.queueProductionRateUpdate);
			GlobalSignals.add(this, GlobalSignals.campBuiltSignal, this.queueProductionRateUpdate);
			GlobalSignals.add(this, GlobalSignals.improvementBuiltSignal, this.queueProductionRateUpdate);
			GlobalSignals.add(this, GlobalSignals.upgradeUnlockedSignal, this.queueProductionRateUpdate);
			GlobalSignals.add(this, GlobalSignals.workersAssignedSignal, this.queueProductionRateUpdate);
		},

		removeFromEngine: function (engine) {
			GlobalSignals.removeAll(this);
			this.campNodes = null;
			this.playerNodes = null;
			this.playerLocationNodes = null;
			this.nearestCampNodes = null;
			this.engine = null;
		},

		update: function (time) {
			if (GameGlobals.gameState.isPaused) return;
			if (GameGlobals.gameState.isLaunched) return;
			
			for (var node = this.campNodes.head; node; node = node.next) {
				this.updateWorkerAutoAssignment(node);
				if (this.isPendingProductionRateUpdate) {
					this.updateWorkerProductionRate(node);
				}
				this.updateWorkerHunger(node, time);
				this.updateRobotWear(node, time);
				this.updateWorkerProduction(node, time);
				this.updateImprovementProduction(node, time);
			}
			
			this.isPendingProductionRateUpdate = false;
		
			this.updatePlayerPerks();
			this.logAmbient();
		},
		
		updateWorkerAutoAssignment: function (node) {
			if (!GameGlobals.gameState.unlockedFeatures.workerAutoAssignment) return;
			
			let freePopulation = node.camp.getFreePopulation();
			if (freePopulation <= 0) return;
			
			let playerPos = this.playerNodes.head.position;
			if (playerPos.inCamp && playerPos.getPosition().equals(node.position.getPosition())) return;
			
			let autoAssignedWorkers = node.camp.getAutoAssignedWorkers();
			if (autoAssignedWorkers.length == 0) return;
			
			let getAssignType = function () {
				let result = null;
				let resultCurrentAssigned = 0;
				for (let i = 0; i < autoAssignedWorkers.length; i++) {
					let workerType = autoAssignedWorkers[i];
					let max = GameGlobals.campHelper.getMaxWorkers(node.entity, workerType);
					let current = node.camp.assignedWorkers[workerType] || 0;
					if (max > 0 && current >= max) continue;
					if (result == null || resultCurrentAssigned > current) {
						result = workerType;
						resultCurrentAssigned = current;
					}
				}
				return result;
			};
			
			let numToAssign = freePopulation;
			while (numToAssign > 0) {
				let assignType = getAssignType();
				if (assignType == null) break;
				node.camp.assignedWorkers[assignType] = (node.camp.assignedWorkers[assignType] || 0) + 1;
				numToAssign--;
				this.log("A previously unassigned worker has started working as " + CampConstants.getWorkerDisplayName(assignType), false, node);
			}
			
			GlobalSignals.workersAssignedSignal.dispatch(node.entity);
		},
		
		updateWorkerProduction: function (node, time) {
			time = time || 0;
			if (time <= 0) return;
			
			var camp = node.camp;
			var campResources = node.entity.get(ResourcesComponent).resources;
			var availableResources = GameGlobals.resourcesHelper.getCurrentCampStorage(node.entity).resources;
			var resourceAccComponent = node.entity.get(ResourceAccumulationComponent);
			
			if (GameGlobals.gameState.isLaunched) return;
			
			// Basic: Scavengers
			var metal = time * (node.camp.metalProductionPerSecond || 0);
			campResources.addResource(resourceNames.metal, metal);
			resourceAccComponent.addChange(resourceNames.metal, metal / time, "Scavengers", camp.assignedWorkers.scavenger);
			if (metal > 0) GameGlobals.playerActionFunctions.unlockFeature("resource_metal");
			
			// Basic: Trappers
			var food = time * (node.camp.foodProductionPerSecond || 0);
			campResources.addResource(resourceNames.food, food);
			resourceAccComponent.addChange(resourceNames.food, food / time, "Trappers", camp.assignedWorkers.trapper);
			if (food > 0) GameGlobals.playerActionFunctions.unlockFeature("resource_food");
			
			// Basic: Water collectors
			var water = time * (node.camp.waterProductionPerSecond || 0);
			campResources.addResource(resourceNames.water, water);
			resourceAccComponent.addChange(resourceNames.water, water / time, "Collectors", camp.assignedWorkers.water);
			if (water > 0) GameGlobals.playerActionFunctions.unlockFeature("resource_water");
			
			// Basic: Rope-makers
			var rope = time * (node.camp.ropeProductionPerSecond || 0);
			campResources.addResource(resourceNames.rope, rope);
			resourceAccComponent.addChange(resourceNames.rope, rope / time, "Rope-makers", camp.assignedWorkers.ropemaker);
			if (rope > 0) GameGlobals.playerActionFunctions.unlockFeature("resource_rope");
			
			// Workshop: Chemists
			var fuel = time * (node.camp.fuelProductionPerSecond || 0);
			campResources.addResource(resourceNames.fuel, fuel);
			resourceAccComponent.addChange(resourceNames.fuel, fuel / time, "Chemists", camp.assignedWorkers.chemist);
			if (fuel > 0) GameGlobals.playerActionFunctions.unlockFeature("resource_fuel");
			
			// Workshop: Rubbermakers
			var rubber = time * (node.camp.rubberProductionPerSecond || 0);
			campResources.addResource(resourceNames.rubber, rubber);
			resourceAccComponent.addChange(resourceNames.rubber, rubber / time, "Plantation workers", camp.assignedWorkers.rubbermaker);
			if (rubber > 0) GameGlobals.playerActionFunctions.unlockFeature("resource_rubber");
			
			// Greenhouses
			var herbs = time * (node.camp.herbsProductionPerSecond || 0);
			campResources.addResource(resourceNames.herbs, herbs);
			resourceAccComponent.addChange(resourceNames.herbs, herbs / time, "Gardeners", camp.assignedWorkers.gardener);
			if (herbs > 0) GameGlobals.playerActionFunctions.unlockFeature("resource_herbs");
			
			// Advanced: Apothecaries
			var herbsRequired = time * (node.camp.herbConsumptionPerSecond || 0);
			if (herbsRequired > 0) {
				var herbsUsed = Math.min(availableResources.getResource(resourceNames.herbs), herbsRequired);
				var medicine = time * (herbsUsed / herbsRequired) * node.camp.medicineProductionPerSecond;
				campResources.addResource(resourceNames.medicine, medicine);
				campResources.addResource(resourceNames.herbs, -herbsUsed);
				resourceAccComponent.addChange(resourceNames.medicine, medicine / time, "Apothecaries", camp.assignedWorkers.apothecary);
				resourceAccComponent.addChange(resourceNames.herbs, -herbsUsed / time, "Apothecaries", camp.assignedWorkers.apothecary);
				if (medicine > 0) GameGlobals.playerActionFunctions.unlockFeature("resource_medicine");
			}
			
			// Advanced: Toolsmiths
			var metalRequiredTools = time * (node.camp.metalConsumptionPerSecondSmith || 0);
			if (metalRequiredTools > 0) {
				var metalUsedTools = Math.min(availableResources.getResource(resourceNames.metal), metalRequiredTools);
				var tools = time * (metalUsedTools / metalRequiredTools) * node.camp.toolsProductionPerSecond;
				campResources.addResource(resourceNames.tools, tools);
				campResources.addResource(resourceNames.metal, -metalUsedTools);
				resourceAccComponent.addChange(resourceNames.tools, tools / time, "Toolsmiths", camp.assignedWorkers.toolsmith);
				resourceAccComponent.addChange(resourceNames.metal, -metalUsedTools / time, "Toolsmiths", camp.assignedWorkers.toolsmith);
				if (tools > 0) GameGlobals.playerActionFunctions.unlockFeature("resource_tools");
			}
			
			// Advanced: Concrete mixers
			var metalRequiredConcrete = time * (node.camp.metalConsumptionPerSecondConcrete || 0);
			if (metalRequiredConcrete > 0) {
				var metalUsedConcrete = Math.min(availableResources.getResource(resourceNames.metal), metalRequiredConcrete);
				var concrete = time * (metalUsedConcrete / metalRequiredConcrete) * node.camp.concreteProductionPerSecond;
				campResources.addResource(resourceNames.concrete, concrete);
				campResources.addResource(resourceNames.metal, -metalUsedConcrete);
				resourceAccComponent.addChange(resourceNames.concrete, concrete / time, "Concrete mixers", camp.assignedWorkers.concrete);
				resourceAccComponent.addChange(resourceNames.metal, -metalUsedConcrete / time, "Concrete mixers", camp.assignedWorkers.concrete);
				if (concrete > 0) GameGlobals.playerActionFunctions.unlockFeature("resource_concrete");
			}
			
			// Advanced: Robot makers
			let maxRobots = GameGlobals.campHelper.getRobotStorageCapacity(node.entity);
			let toolsRequiredRobots = time * (node.camp.toolsConsumptionPerSecondRobots || 0);
			if (toolsRequiredRobots > 0) {
				let toolsUsedRobots = Math.min(availableResources.getResource(resourceNames.tools), toolsRequiredRobots);
				let robots = time * (toolsUsedRobots / toolsRequiredRobots) * node.camp.robotsProductionPerSecond;
				campResources.addResource(resourceNames.robots, robots);
				campResources.addResource(resourceNames.tools, -toolsUsedRobots);
				resourceAccComponent.addChange(resourceNames.robots, robots / time, "Robot makers", camp.assignedWorkers.robotmaker);
				resourceAccComponent.addChange(resourceNames.tools, -toolsUsedRobots / time, "Robot makers", camp.assignedWorkers.robotmaker);
				if (robots > 0) GameGlobals.playerActionFunctions.unlockFeature("resource_robots");
			}
		},
		
		updateWorkerProductionRate: function (node) {
			let camp = node.camp;
			let improvementsComponent = node.entity.get(SectorImprovementsComponent);
			let campResources = node.entity.get(ResourcesComponent);
				
			let robots = campResources.resources.robots;
			
			camp.metalProductionPerSecond = GameGlobals.campHelper.getMetalProductionPerSecond(camp.assignedWorkers.scavenger, improvementsComponent, robots) || 0;
			camp.foodProductionPerSecond = GameGlobals.campHelper.getFoodProductionPerSecond(camp.assignedWorkers.trapper, improvementsComponent, robots) || 0;
			camp.waterProductionPerSecond = GameGlobals.campHelper.getWaterProductionPerSecond(camp.assignedWorkers.water, improvementsComponent, robots) || 0;
			camp.ropeProductionPerSecond = GameGlobals.campHelper.getRopeProductionPerSecond(camp.assignedWorkers.ropemaker, improvementsComponent, robots) || 0;
			camp.fuelProductionPerSecond = GameGlobals.campHelper.getFuelProductionPerSecond(camp.assignedWorkers.chemist, improvementsComponent, robots) || 0;
			camp.rubberProductionPerSecond = GameGlobals.campHelper.getRubberProductionPerSecond(camp.assignedWorkers.rubbermaker, improvementsComponent, robots) || 0;
			camp.herbsProductionPerSecond = GameGlobals.campHelper.getHerbsProductionPerSecond(camp.assignedWorkers.gardener, improvementsComponent, robots) || 0;
			camp.medicineProductionPerSecond = GameGlobals.campHelper.getMedicineProductionPerSecond(camp.assignedWorkers.apothecary, improvementsComponent, robots) || 0;
			camp.toolsProductionPerSecond = GameGlobals.campHelper.getToolsProductionPerSecond(camp.assignedWorkers.toolsmith, improvementsComponent, robots) || 0;
			camp.concreteProductionPerSecond = GameGlobals.campHelper.getConcreteProductionPerSecond(camp.assignedWorkers.concrete, improvementsComponent, robots) || 0;
			camp.robotsProductionPerSecond = GameGlobals.campHelper.getRobotsProductionPerSecond(camp.assignedWorkers.robotmaker, improvementsComponent, robots) || 0;
			
			camp.herbConsumptionPerSecond = GameGlobals.campHelper.getHerbsConsumptionPerSecond(camp.assignedWorkers.apothecary) || 0;
			camp.metalConsumptionPerSecondConcrete = GameGlobals.campHelper.getMetalConsumptionPerSecondConcrete(camp.assignedWorkers.concrete) || 0;
			camp.metalConsumptionPerSecondSmith = GameGlobals.campHelper.getMetalConsumptionPerSecondSmith(camp.assignedWorkers.toolsmith) || 0;
			camp.toolsConsumptionPerSecondRobots = GameGlobals.campHelper.getToolsConsumptionPerSecondRobots(camp.assignedWorkers.robotmaker) || 0;
		},
		
		updateWorkerHunger: function (node, time) {
			if (GameGlobals.gameState.isLaunched) return;
			
			var campResources = node.entity.get(ResourcesComponent);
			var campResourceAcc = node.entity.get(ResourceAccumulationComponent);
			this.deductHunger(time, campResources.resources, node.camp.getAssignedPopulation(), false, false);
			this.deductHunger(time, campResourceAcc.resourceChange, node.camp.getAssignedPopulation(), false, true, campResourceAcc, "Workers");
		},
		
		updateRobotWear: function (node, time) {
			let campResources = node.entity.get(ResourcesComponent).resources;
			let resourceAccComponent = node.entity.get(ResourceAccumulationComponent);
			
			let numRobots = Math.floor(campResources.getResource(resourceNames.robots));
			let robotsChangePerSec = numRobots * CampConstants.getWearPerRobotPerSec();
			let robotsChange = time * robotsChangePerSec;
			
			campResources.addResource(resourceNames.robots, -robotsChange);
			resourceAccComponent.addChange(resourceNames.robots, -robotsChangePerSec, "Robot wear", numRobots);
		},
		
		updatePlayerPerks: function () {
			let inCamp = this.playerNodes.head.position.inCamp;
			let hasCampHere = this.playerLocationNodes.head.entity.has(CampComponent);
			
			let isThirsty = this.isPlayerThirsty();
			let isHungry = this.isPlayerHungry();
			let perksComponent = this.playerNodes.head.entity.get(PerksComponent);
			
			let hasThirstPerk = perksComponent.hasPerk(PerkConstants.perkIds.thirst);
			let hasHungerPerk = perksComponent.hasPerk(PerkConstants.perkIds.hunger);
			
			let addedPerks = [];
			let removedPerks = [];
			
			if (!isThirsty) {
				if (hasThirstPerk) {
					let perk = perksComponent.removePerkById(PerkConstants.perkIds.thirst);
					removedPerks.push(perk);
				}
			} else if (!hasThirstPerk) {
				let thirstPerk = PerkConstants.getPerk(PerkConstants.perkIds.thirst, PerkConstants.ACTIVATION_TIME_HEALTH_DEBUFF);
				perksComponent.addPerk(thirstPerk);
				addedPerks.push(thirstPerk);
			}
			
			if (!isHungry) {
				if (hasHungerPerk) {
					let perk = perksComponent.removePerkById(PerkConstants.perkIds.hunger);
					removedPerks.push(perk);
				}
			} else if (!hasHungerPerk) {
				let hungerPerk = PerkConstants.getPerk(PerkConstants.perkIds.hunger, PerkConstants.ACTIVATION_TIME_HEALTH_DEBUFF);
				perksComponent.addPerk(hungerPerk);
				addedPerks.push(hungerPerk);
			}
			
			if (addedPerks.length > 0 || removedPerks.length > 0) {
				this.lastPerksChangedTimestamp = new Date().getTime();
				setTimeout(() => {
					let msg = this.getPlayerPerkChangeLogMsg(addedPerks, removedPerks, perksComponent);
					if (msg && msg.length > 0) {
						for (let i in addedPerks) {
							addedPerks[i].loggedAdd = true;
						}
					}
					this.log(msg, true);
				}, 1000);
			}
		},
		
		getPlayerPerkChangeLogMsg: function (addedPerks, removedPerks, perksComponent) {
			if (addedPerks.length == 0 && removedPerks.length == 0) return;
			
			let isThirsty = this.isPlayerThirsty();
			let isHungry = this.isPlayerHungry();
			
			let addedHungerPerk = addedPerks.find(perk => perk.id == PerkConstants.perkIds.hunger);
			let addedThirstPerk = addedPerks.find(perk => perk.id == PerkConstants.perkIds.thirst);
			
			let removedHungerPerk = removedPerks.find(perk => perk.id == PerkConstants.perkIds.hunger);
			let removedThirstPerk = removedPerks.find(perk => perk.id == PerkConstants.perkIds.thirst);
			
			let logAddHunger = addedHungerPerk && isHungry && !this.isInCampWithProduction(resourceNames.food);
			let logAddThirst = addedThirstPerk  && isThirsty && !this.isInCampWithProduction(resourceNames.water);
			
			let logRemovedHunger = removedHungerPerk && removedHungerPerk.loggedAdd && !isHungry;
			let logRemovedThirst = removedThirstPerk && removedThirstPerk.loggedAdd && !isThirsty;
			
			if (logAddHunger && logAddThirst) {
				return "Out of food and water!";
			}
			
			if (logAddThirst) {
				return "Out of water!";
			}
			
			if (logAddHunger) {
				return "Out of food!";
			}
			
			if (logRemovedHunger && logRemovedThirst) {
				return "No longer hungry or thirsty";
			}
			
			if (logRemovedThirst) {
				return "No longer thirsty";
			}
			
			if (logRemovedHunger) {
				return "No longer hungry";
			}
			
			return null;
		},
		
		isPlayerThirsty: function () {
			let playerFoodSource = GameGlobals.resourcesHelper.getCurrentStorage();
			return playerFoodSource.resources.water < 1;
		},
		
		isPlayerHungry: function () {
			let playerFoodSource = GameGlobals.resourcesHelper.getCurrentStorage();
			return playerFoodSource.resources.food < 1;
		},
		
		isInCampWithProduction: function (resourceName) {
			if (!GameGlobals.playerHelper.isInCamp()) return false;
			
			let camp = this.nearestCampNodes.head.camp;
			let resourceAccComponent = this.nearestCampNodes.head.entity.get(ResourceAccumulationComponent);
			
			return resourceAccComponent.getChange(resourceName) > 0;
		},
		
		updateImprovementProduction: function (node, time) {
			time = time || 0;
			if (time <= 0) return;
			
			let resources = node.entity.get(ResourcesComponent).resources;
			let resourceAcc = node.entity.get(ResourceAccumulationComponent);
			let improvementsComponent = node.entity.get(SectorImprovementsComponent);
			
			// Darkfarms
			let farmFood = GameGlobals.campHelper.getDarkFarmProductionPerSecond(improvementsComponent) * time * GameConstants.gameSpeedCamp;
			resources.addResource(resourceNames.food, farmFood);
			resourceAcc.addChange(resourceNames.food, farmFood / time, "Snail farms", improvementsComponent.getCount(improvementNames.darkfarm));
			
			// Aqueduct
			let aqueductWater = GameGlobals.campHelper.getAqueductProductionPerSecond(improvementsComponent) * time * GameConstants.gameSpeedCamp;
			resources.addResource(resourceNames.water, aqueductWater);
			resourceAcc.addChange(resourceNames.water, aqueductWater / time, "Aqueducts", improvementsComponent.getCount(improvementNames.aqueduct));
		},
		
		deductHunger: function (time, resourceVO, population, isExplorationMode, accumulation, accComponent, sourceName) {
			var timeMod = accumulation ? 1 : time;
			var waterChange = timeMod * GameGlobals.campHelper.getWaterConsumptionPerSecond(population, isExplorationMode);
			var foodChange = timeMod * GameGlobals.campHelper.getFoodConsumptionPerSecond(population, isExplorationMode);
			if (!accumulation) {
				resourceVO.water -= waterChange;
				resourceVO.food -= foodChange;
			} else {
				accComponent.addChange(resourceNames.water, -waterChange, sourceName, population);
				accComponent.addChange(resourceNames.food, -foodChange, sourceName, population);
			}
		},
		
		queueProductionRateUpdate: function () {
			this.isPendingProductionRateUpdate = true;
		},
		
		logAmbient: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			if (!this.playerLocationNodes.head || !this.playerLocationNodes.head.position) return;
			
			let playerPos = this.playerNodes.head.position;
			let playerFoodSource = GameGlobals.resourcesHelper.getCurrentStorage().resources;
			
			let playerLevelCamp = this.nearestCampNodes.head !== null ? this.nearestCampNodes.head.entity : null;
			let inCamp = playerPos.inCamp;
			let inCampSector = playerLevelCamp !== null && playerLevelCamp.get(PositionComponent).sector === this.playerLocationNodes.head.position.sector;
			let hasPopulation = this.nearestCampNodes.head !== null ? this.nearestCampNodes.head.camp.population >= 1 : false;
			
			let timeStamp = new Date().getTime();
			let log = timeStamp - this.lastMsgTimeStamp > this.msgFrequency && timeStamp - this.lastPerksChangedTimestamp > this.msgFrequency;;
			if (log) {
				let isThirsty = playerFoodSource.water < 1;
				let isHungry = playerFoodSource.food < 1;
				let msg = null;
				
				if (inCamp && hasPopulation && isThirsty && Math.random() < 0.05) {
					msg = "There is no more water.";
				}
				
				if (inCamp && hasPopulation && msg === null && isHungry && Math.random() < 0.05) {
					msg = "There is no more food.";
				}
				
				if (!inCamp && !inCampSector && isThirsty && Math.random() < 0.05) {
					msg = "Your throat is dry.";
				}
				
				if (!inCamp && !inCampSector && msg === null && isHungry && Math.random() < 0.05) {
					msg = "Your stomach is grumbling.";
				}
				
				if (msg != null) {
					this.log(msg, true);
				}
			}
		},
		
		log: function (msg, isAmbient, campNode) {
			if (msg == null || msg.length == 0) return;
			let logComponent = this.playerNodes.head.entity.get(LogMessagesComponent);
			if (campNode) {
				logComponent.addMessage(LogConstants.getUniqueID(), msg, null, null, null, null, true, campNode.position.level);
			} else {
				logComponent.addMessage(LogConstants.MSG_ID_WORKER_STATUS, msg);
			}
			if (isAmbient) {
				this.lastMsgTimeStamp = new Date().getTime();
			}
		},

	});

	return WorkerSystem;
});
