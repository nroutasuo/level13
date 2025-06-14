define([
	'ash',
	'text/Text',
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
	'game/components/sector/improvements/SectorImprovementsComponent'
], function (Ash, Text, GameGlobals, GlobalSignals, GameConstants, LogConstants, PlayerActionConstants, PerkConstants, CampConstants,
	CampNode, PlayerPositionNode, PlayerLocationNode, NearestCampNode,
	ResourcesComponent,
	PositionComponent,
	ResourceAccumulationComponent,
	PerksComponent,
	CampComponent,
	SectorImprovementsComponent
) {
	var WorkerSystem = Ash.System.extend({
		
		campNodes: null,
		playerNodes: null,
		playerLocationNodes: null,
		nearestCampNodes: null,
	
		isPendingProductionRateUpdate: false,
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
			
			GlobalSignals.add(this, GlobalSignals.slowUpdateSignal, this.slowUpdate);
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
		},

		slowUpdate: function () {
			this.logAmbientPlayer();
			for (let node = this.campNodes.head; node; node = node.next) {
				this.updateWorkerAutoAssignment(node);
				this.updateCampfire(node);
				this.logAmbientCamp(node);
			}
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
			let numAssigned = 0;
			while (numToAssign > 0) {
				let assignType = getAssignType();
				if (assignType == null) break;
				node.camp.assignedWorkers[assignType] = (node.camp.assignedWorkers[assignType] || 0) + 1;
				numAssigned++;
				numToAssign--;
				this.log(LogConstants.getUniqueID(), "A previously unassigned worker has started working as " + CampConstants.getWorkerDisplayName(assignType), node);
			}
			
			if (numAssigned > 0) {
				GlobalSignals.workersAssignedSignal.dispatch(node.entity);
			}
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
			GameGlobals.gameState.increaseGameStatKeyed("amountResourcesProducedInCampsPerName", resourceNames.metal, metal);
			
			// Basic: Trappers
			var food = time * (node.camp.foodProductionPerSecond || 0);
			campResources.addResource(resourceNames.food, food);
			resourceAccComponent.addChange(resourceNames.food, food / time, "Trappers", camp.assignedWorkers.trapper);
			if (food > 0) GameGlobals.playerActionFunctions.unlockFeature("resource_food");
			GameGlobals.gameState.increaseGameStatKeyed("amountResourcesProducedInCampsPerName", resourceNames.food, food);
			
			// Basic: Water collectors
			var water = time * (node.camp.waterProductionPerSecond || 0);
			campResources.addResource(resourceNames.water, water);
			resourceAccComponent.addChange(resourceNames.water, water / time, "Collectors", camp.assignedWorkers.water);
			if (water > 0) GameGlobals.playerActionFunctions.unlockFeature("resource_water");
			GameGlobals.gameState.increaseGameStatKeyed("amountResourcesProducedInCampsPerName", resourceNames.water, water);
			
			// Basic: Rope-makers
			var rope = time * (node.camp.ropeProductionPerSecond || 0);
			campResources.addResource(resourceNames.rope, rope);
			resourceAccComponent.addChange(resourceNames.rope, rope / time, "Rope-makers", camp.assignedWorkers.ropemaker);
			if (rope > 0) GameGlobals.playerActionFunctions.unlockFeature("resource_rope");
			GameGlobals.gameState.increaseGameStatKeyed("amountResourcesProducedInCampsPerName", resourceNames.rope, rope);
			
			// Workshop: Chemists
			var fuel = time * (node.camp.fuelProductionPerSecond || 0);
			campResources.addResource(resourceNames.fuel, fuel);
			resourceAccComponent.addChange(resourceNames.fuel, fuel / time, "Chemists", camp.assignedWorkers.chemist);
			if (fuel > 0) GameGlobals.playerActionFunctions.unlockFeature("resource_fuel");
			GameGlobals.gameState.increaseGameStatKeyed("amountResourcesProducedInCampsPerName", resourceNames.fuel, fuel);
			
			// Workshop: Rubbermakers
			var rubber = time * (node.camp.rubberProductionPerSecond || 0);
			campResources.addResource(resourceNames.rubber, rubber);
			resourceAccComponent.addChange(resourceNames.rubber, rubber / time, "Plantation workers", camp.assignedWorkers.rubbermaker);
			if (rubber > 0) GameGlobals.playerActionFunctions.unlockFeature("resource_rubber");
			GameGlobals.gameState.increaseGameStatKeyed("amountResourcesProducedInCampsPerName", resourceNames.rubber, rubber);
			
			// Greenhouses
			var herbs = time * (node.camp.herbsProductionPerSecond || 0);
			campResources.addResource(resourceNames.herbs, herbs);
			resourceAccComponent.addChange(resourceNames.herbs, herbs / time, "Gardeners", camp.assignedWorkers.gardener);
			if (herbs > 0) GameGlobals.playerActionFunctions.unlockFeature("resource_herbs");
			GameGlobals.gameState.increaseGameStatKeyed("amountResourcesProducedInCampsPerName", resourceNames.herbs, herbs);
			
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
				GameGlobals.gameState.increaseGameStatKeyed("amountResourcesProducedInCampsPerName", resourceNames.medicine, medicine);
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
				GameGlobals.gameState.increaseGameStatKeyed("amountResourcesProducedInCampsPerName", resourceNames.tools, tools);
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
				GameGlobals.gameState.increaseGameStatKeyed("amountResourcesProducedInCampsPerName", resourceNames.concrete, concrete);
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
				GameGlobals.gameState.increaseGameStatKeyed("amountResourcesProducedInCampsPerName", resourceNames.robots, robots);
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
			
			camp.herbConsumptionPerSecond = GameGlobals.campHelper.getWorkerHerbsConsumptionPerSecond(camp.assignedWorkers.apothecary) || 0;
			camp.metalConsumptionPerSecondConcrete = GameGlobals.campHelper.getMetalConsumptionPerSecondConcrete(camp.assignedWorkers.concrete) || 0;
			camp.metalConsumptionPerSecondSmith = GameGlobals.campHelper.getMetalConsumptionPerSecondSmith(camp.assignedWorkers.toolsmith) || 0;
			camp.toolsConsumptionPerSecondRobots = GameGlobals.campHelper.getToolsConsumptionPerSecondRobots(camp.assignedWorkers.robotmaker) || 0;
		},
		
		updateWorkerHunger: function (node, time) {
			if (GameGlobals.gameState.isLaunched) return;

			this.deductHunger(time, node, false);
			this.deductHunger(time, node, true);
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
					let msg = this.getPlayerPerkChangeLogMsgAndMarkPerksLogged(addedPerks, removedPerks);
					this.log(LogConstants.MSG_ID_PLAYER_HUNGER, msg);
				}, 1500);
			}
		},
		
		getPlayerPerkChangeLogMsgAndMarkPerksLogged: function (addedPerks, removedPerks) {
			if (addedPerks.length == 0 && removedPerks.length == 0) return null;

			let inCamp = this.playerNodes.head.position.inCamp;

			if (inCamp) return null;
			
			let isThirsty = this.isPlayerThirsty();
			let isHungry = this.isPlayerHungry();
			
			let addedHungerPerk = addedPerks.find(perk => perk.id == PerkConstants.perkIds.hunger);
			let addedThirstPerk = addedPerks.find(perk => perk.id == PerkConstants.perkIds.thirst);
			
			let removedHungerPerk = removedPerks.find(perk => perk.id == PerkConstants.perkIds.hunger);
			let removedThirstPerk = removedPerks.find(perk => perk.id == PerkConstants.perkIds.thirst);
			
			let logAddHunger = addedHungerPerk && isHungry && !this.isInOrOutsideCampWithProduction(resourceNames.food);
			let logAddThirst = addedThirstPerk  && isThirsty && !this.isInOrOutsideCampWithProduction(resourceNames.water);
			
			let logRemovedHunger = removedHungerPerk && removedHungerPerk.loggedAdd && !isHungry;
			let logRemovedThirst = removedThirstPerk && removedThirstPerk.loggedAdd && !isThirsty;
			
			if (logAddHunger && logAddThirst) {
				addedHungerPerk.loggedAdd = true;
				addedThirstPerk.loggedAdd = true;
				return "ui.exploration.supplies_no_supplies_message";
			}
			
			if (logAddThirst) {
				addedThirstPerk.loggedAdd = true;
				return "ui.exploration.supplies_no_water_message";
			}
			
			if (logAddHunger) {
				addedHungerPerk.loggedAdd = true;
				return "ui.exploration.supplies_no_food_message";
			}
			
			if (logRemovedHunger && logRemovedThirst) {
				return "ui.exploration.supplies_got_supplies_message";
			}
			
			if (logRemovedThirst) {
				return "ui.exploration.supplies_got_water_message";
			}
			
			if (logRemovedHunger) {
				return "ui.exploration.supplies_got_food_message";
			}
			
			return null;
		},

		updateCampfire: function (node) {
			if (node.camp.population >= 1) return;
			let playerPos = this.playerNodes.head.position;
			if (playerPos.getPosition().equals(node.position.getPosition())) return;

			node.camp.campFireStarted = false;
		},
		
		isPlayerThirsty: function () {
			let playerFoodSource = GameGlobals.resourcesHelper.getCurrentStorage();
			let playerFoodAccumulation = GameGlobals.resourcesHelper.getCurrentStorageAccumulation();
			return this.isThirsty(playerFoodSource, playerFoodAccumulation);
		},

		isCampThirsty: function (campNode) {
			let foodSource = GameGlobals.resourcesHelper.getCurrentCampStorage(campNode.entity);
			let foodAccumulation = GameGlobals.resourcesHelper.getCampStorageAccumulation(campNode.entity);
			return this.isThirsty(foodSource, foodAccumulation);
		},

		isThirsty: function (waterSource, waterAccumulation) {
			return waterSource.resources.water < 1 && waterAccumulation.resourceChange.water <= 0;
		},

		hasCampResource: function (name, campNode) {
			let resSource = GameGlobals.resourcesHelper.getCurrentCampStorage(campNode.entity);
			let resAccumulation = GameGlobals.resourcesHelper.getCampStorageAccumulation(campNode.entity);
			return this.hasResource(resSource, resAccumulation, name);
		},

		hasResource: function (resSource, resAccumulation, resourceName) {
			return resSource.resources.getResource(resourceName) > 0 || resAccumulation.resourceChange.getResource(resourceName) > 0;
		},
		
		isPlayerHungry: function () {
			let playerFoodSource = GameGlobals.resourcesHelper.getCurrentStorage();
			let playerFoodAccumulation = GameGlobals.resourcesHelper.getCurrentStorageAccumulation();
			return this.isHungry(playerFoodSource, playerFoodAccumulation);
		},

		isCampHungry: function (campNode) {
			let foodSource = GameGlobals.resourcesHelper.getCurrentCampStorage(campNode.entity);
			let foodAccumulation = GameGlobals.resourcesHelper.getCampStorageAccumulation(campNode.entity);
			return this.isHungry(foodSource, foodAccumulation);
		},

		isHungry: function (foodSource, foodAccumulation) {
			return foodSource.resources.food < 1 && foodAccumulation.resourceChange.food <= 0;
		},
		
		isInOrOutsideCampWithProduction: function (resourceName) {
			if (!this.nearestCampNodes.head) return false;
			if (!this.playerNodes.head.position.equals(this.nearestCampNodes.head.position, true)) return false;
			
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
			GameGlobals.gameState.increaseGameStatKeyed("amountResourcesProducedInCampsPerName", resourceNames.food, farmFood);
			
			// Aqueduct
			let aqueductWater = GameGlobals.campHelper.getAqueductProductionPerSecond(improvementsComponent) * time * GameConstants.gameSpeedCamp;
			resources.addResource(resourceNames.water, aqueductWater);
			resourceAcc.addChange(resourceNames.water, aqueductWater / time, "Aqueducts", improvementsComponent.getCount(improvementNames.aqueduct));
			GameGlobals.gameState.increaseGameStatKeyed("amountResourcesProducedInCampsPerName", resourceNames.water, aqueductWater);
		},
		
		deductHunger: function (time, node, isAccumulation) {
			let campResources = node.entity.get(ResourcesComponent);

			let resourceVO = campResources.resources;
			let population =  node.camp.getAssignedPopulation();

			let timeMod = isAccumulation ? 1 : time;

			let hasHerbs = this.hasCampResource(resourceNames.herbs, node);
			let hasMedicine = this.hasCampResource(resourceNames.medicine, node);

			let waterChange = timeMod * GameGlobals.campHelper.getWaterConsumptionPerSecond(population);
			let foodChange = timeMod * GameGlobals.campHelper.getFoodConsumptionPerSecond(population);
			let herbsChange = hasHerbs ? timeMod * GameGlobals.campHelper.getPopulationHerbsConsumptionPerSecond(population, hasMedicine) : 0;
			let medicineChange = hasMedicine ? timeMod * GameGlobals.campHelper.getMedicineConsumptionPerSecond(population) : 0;
			
			if (!isAccumulation) {
				resourceVO.water -= waterChange;
				resourceVO.food -= foodChange;
				resourceVO.herbs -= herbsChange;
				resourceVO.medicine -= medicineChange;
			} else {
				let sourceName = "Workers";
				let campResourceAcc = node.entity.get(ResourceAccumulationComponent);
				campResourceAcc.addChange(resourceNames.water, -waterChange, sourceName, population);
				campResourceAcc.addChange(resourceNames.food, -foodChange, sourceName, population);
				campResourceAcc.addChange(resourceNames.herbs, -herbsChange, sourceName, population);
				campResourceAcc.addChange(resourceNames.medicine, -medicineChange, sourceName, population);
			}
		},
		
		queueProductionRateUpdate: function () {
			this.isPendingProductionRateUpdate = true;
		},
		
		logAmbientPlayer: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			if (!this.playerLocationNodes.head || !this.playerLocationNodes.head.position) return;
			if (!GameGlobals.playerHelper.isAwake()) return;
			if (GameGlobals.playerHelper.isInCamp()) return;

			let timeStamp = new Date().getTime();

			if (timeStamp - GameGlobals.playerHelper.getLastVisibileLogMessageTimestamp() < 3000) return;
			
			let playerLevelCamp = this.nearestCampNodes.head !== null ? this.nearestCampNodes.head.entity : null;
			let inCampSector = playerLevelCamp !== null && playerLevelCamp.get(PositionComponent).sector === this.playerLocationNodes.head.position.sector;
			
			let log = timeStamp - this.lastPerksChangedTimestamp > this.msgFrequency;
			if (log) {
				let isThirsty = this.isPlayerThirsty();
				let isHungry = this.isPlayerHungry();
				let msgID = null;
				
				if (!inCampSector && isThirsty && Math.random() < 0.25) {
					msgID = "ui.log.player_hungry_message";
				}
				
				if (!inCampSector && msgID === null && isHungry && Math.random() < 0.25) {
					msgID = "ui.log.player_thirsty_message";
				}
				
				if (msgID != null) {
					let msg = Text.t(msgID)
					this.log(LogConstants.MSG_ID_AMBIENT_PLAYER, msg);
				}
			}
		},

		logAmbientCamp: function (campNode) {
			let hasPopulation = campNode.camp.population >= 1;

			if (!hasPopulation) return;

			let timeStamp = new Date().getTime();

			if (timeStamp - GameGlobals.playerHelper.getLastVisibileLogMessageTimestamp() < 3000) return;

			let isThirsty = this.isCampThirsty(campNode);
			let isHungry = this.isCampHungry(campNode);

			if (!isHungry && !isThirsty) return;

			let msg = null;

			if (isThirsty && Math.random() < 0.25) {
				msg = "There is no more water.";
			}  else if (isHungry && Math.random() < 0.25) {
				msg = "There is no more food.";
			}

			this.log(LogConstants.MSG_ID_AMBIENT_CAMP, msg, campNode);
		},
		
		log: function (id, msg, campNode) {
			if (msg == null || msg.length == 0) return;

			if (campNode) {
				let pos = campNode.position.getPosition();
				pos.inCamp = true;
				GameGlobals.playerHelper.addLogMessageWithPosition(id, msg, pos);
			} else {
				GameGlobals.playerHelper.addLogMessage(id, msg);
			}
		},

	});

	return WorkerSystem;
});
