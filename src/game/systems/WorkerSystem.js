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
			
			for (var node = this.campNodes.head; node; node = node.next) {
				this.updateWorkerAssignment(node);
				if (this.isPendingProductionRateUpdate) {
					this.updateWorkerProductionRate(node);
				}
				this.updateWorkerHunger(node, time);
				this.updateWorkerProduction(node, time);
				this.updateImprovementProduction(node, time);
			}
			
			this.isPendingProductionRateUpdate = false;
		
			this.updatePlayer(time);
			this.logAmbient();
		},
		
		updateWorkerAssignment: function (node) {
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
					let current = node.camp.assignedWorkers[workerType];
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
				node.camp.assignedWorkers[assignType] = node.camp.assignedWorkers[assignType] + 1;
				numToAssign--;
				this.log("A previously unassigned worker has started working as " + CampConstants.getWorkerDisplayName(assignType), false, node);
			}
			
			GlobalSignals.workersAssignedSignal.dispatch(node.entity);
		},
		
		updateWorkerProduction: function (node, time) {
			var camp = node.camp;
			var campResources = node.entity.get(ResourcesComponent).resources;
			var availableResources = GameGlobals.resourcesHelper.getCurrentCampStorage(node.entity).resources;
			var resourceAccComponent = node.entity.get(ResourceAccumulationComponent);
			
			if (GameGlobals.gameState.isLaunched) return;
			
			// Basic: Scavengers
			var metal = time * (node.camp.metalProductionPerSecond || 0);
			campResources.addResource(resourceNames.metal, metal);
			resourceAccComponent.addChange(resourceNames.metal, metal / time, "Scavengers");
			if (metal > 0) GameGlobals.gameState.unlockedFeatures.resources.metal = true;
			
			// Basic: Trappers
			var food = time * (node.camp.foodProductionPerSecond || 0);
			campResources.addResource(resourceNames.food, food);
			resourceAccComponent.addChange(resourceNames.food, food / time, "Trappers");
			if (food > 0) GameGlobals.gameState.unlockedFeatures.resources.food = true;
			
			// Basic: Water collectors
			var water = time * (node.camp.waterProductionPerSecond || 0);
			campResources.addResource(resourceNames.water, water);
			resourceAccComponent.addChange(resourceNames.water, water / time, "Collectors");
			if (water > 0) GameGlobals.gameState.unlockedFeatures.resources.water = true;
			
			// Basic: Rope-makers
			var rope = time * (node.camp.ropeProductionPerSecond || 0);
			campResources.addResource(resourceNames.rope, rope);
			resourceAccComponent.addChange(resourceNames.rope, rope / time, "Rope-makers");
			if (rope > 0) GameGlobals.gameState.unlockedFeatures.resources.rope = true;
			
			// Workshop: Chemists
			var fuel = time * (node.camp.fuelProductionPerSecond || 0);
			campResources.addResource(resourceNames.fuel, fuel);
			resourceAccComponent.addChange(resourceNames.fuel, fuel / time, "Chemists");
			if (fuel > 0) GameGlobals.gameState.unlockedFeatures.resources.fuel = true;
			
			// Workshop: Rubbermakers
			var rubber = time * (node.camp.rubberProductionPerSecond || 0);
			campResources.addResource(resourceNames.rubber, rubber);
			resourceAccComponent.addChange(resourceNames.rubber, rubber / time, "Plantation workers");
			if (rubber > 0) GameGlobals.gameState.unlockedFeatures.resources.rubber = true;
			
			// Greenhouses
			var herbs = time * (node.camp.herbsProductionPerSecond || 0);
			campResources.addResource(resourceNames.herbs, herbs);
			resourceAccComponent.addChange(resourceNames.herbs, herbs / time, "Gardeners");
			if (herbs > 0) GameGlobals.gameState.unlockedFeatures.resources.herbs = true;
			
			// Advanced: Apothecaries
			var herbsRequired = time * (node.camp.herbConsumptionPerSecond || 0);
			if (herbsRequired > 0) {
				var herbsUsed = Math.min(availableResources.getResource(resourceNames.herbs), herbsRequired);
				var medicine = time * (herbsUsed / herbsRequired) * node.camp.medicineProductionPerSecond;
				campResources.addResource(resourceNames.medicine, medicine);
				campResources.addResource(resourceNames.herbs, -herbsUsed);
				resourceAccComponent.addChange(resourceNames.medicine, medicine / time, "Apothecaries");
				resourceAccComponent.addChange(resourceNames.herbs, -herbsUsed / time, "Apothecaries");
				if (medicine > 0) GameGlobals.gameState.unlockedFeatures.resources.medicine = true;
			}
			
			// Advanced: Toolsmiths
			var metalRequiredTools = time * (node.camp.metalConsumptionPerSecondSmith || 0);
			if (metalRequiredTools > 0) {
				var metalUsedTools = Math.min(availableResources.getResource(resourceNames.metal), metalRequiredTools);
				var tools = time * (metalUsedTools / metalRequiredTools) * node.camp.toolsProductionPerSecond;
				campResources.addResource(resourceNames.tools, tools);
				campResources.addResource(resourceNames.metal, -metalUsedTools);
				resourceAccComponent.addChange(resourceNames.tools, tools / time, "Toolsmiths");
				resourceAccComponent.addChange(resourceNames.metal, -metalUsedTools / time, "Toolsmiths");
				if (tools > 0) GameGlobals.gameState.unlockedFeatures.resources.tools = true;
			}
			
			// Advanced: Concrete mixers
			var metalRequiredConcrete = time * (node.camp.metalConsumptionPerSecondConcrete || 0);
			if (metalRequiredConcrete > 0) {
				var metalUsedConcrete = Math.min(availableResources.getResource(resourceNames.metal), metalRequiredConcrete);
				var concrete = time * (metalUsedConcrete / metalRequiredConcrete) * node.camp.concreteProductionPerSecond;
				campResources.addResource(resourceNames.concrete, concrete);
				campResources.addResource(resourceNames.metal, -metalUsedConcrete);
				resourceAccComponent.addChange(resourceNames.concrete, concrete / time, "Concrete mixers");
				resourceAccComponent.addChange(resourceNames.metal, -metalUsedConcrete / time, "Concrete mixers");
				if (concrete > 0) GameGlobals.gameState.unlockedFeatures.resources.concrete = true;
			}
			
			// Advanced: Robot makers
			var toolsRequiredRobots = time * (node.camp.toolsConsumptionPerSecondRobots || 0);
			if (toolsRequiredRobots > 0) {
				var toolsUsedRobots = Math.min(availableResources.getResource(resourceNames.tools), toolsRequiredRobots);
				var robots = time * (toolsUsedRobots / toolsRequiredRobots) * node.camp.robotsProductionPerSecond;
				campResources.addResource(resourceNames.robots, robots);
				campResources.addResource(resourceNames.tools, -toolsUsedRobots);
				resourceAccComponent.addChange(resourceNames.robots, robots / time, "Robot makers");
				resourceAccComponent.addChange(resourceNames.tools, -toolsUsedRobots / time, "Robot makers");
				if (robots > 0) GameGlobals.gameState.unlockedFeatures.resources.robots = true;
			}
		},
		
		updateWorkerProductionRate: function (node) {
			let camp = node.camp;
			let improvementsComponent = node.entity.get(SectorImprovementsComponent);
			let campResources = node.entity.get(ResourcesComponent);
				
			let robots = campResources.resources.robots;
			
			camp.metalProductionPerSecond = GameGlobals.campHelper.getMetalProductionPerSecond(camp.assignedWorkers.scavenger, improvementsComponent, robots);
			camp.foodProductionPerSecond = GameGlobals.campHelper.getFoodProductionPerSecond(camp.assignedWorkers.trapper, improvementsComponent, robots);
			camp.waterProductionPerSecond = GameGlobals.campHelper.getWaterProductionPerSecond(camp.assignedWorkers.water, improvementsComponent, robots);
			camp.ropeProductionPerSecond = GameGlobals.campHelper.getRopeProductionPerSecond(camp.assignedWorkers.ropemaker, improvementsComponent, robots);
			camp.fuelProductionPerSecond = GameGlobals.campHelper.getFuelProductionPerSecond(camp.assignedWorkers.chemist, improvementsComponent, robots);
			camp.rubberProductionPerSecond = GameGlobals.campHelper.getRubberProductionPerSecond(camp.assignedWorkers.rubbermaker, improvementsComponent, robots);
			camp.herbsProductionPerSecond = GameGlobals.campHelper.getHerbsProductionPerSecond(camp.assignedWorkers.gardener, improvementsComponent, robots);
			camp.medicineProductionPerSecond = GameGlobals.campHelper.getMedicineProductionPerSecond(camp.assignedWorkers.apothecary, improvementsComponent, robots);
			camp.toolsProductionPerSecond = GameGlobals.campHelper.getToolsProductionPerSecond(camp.assignedWorkers.toolsmith, improvementsComponent, robots);
			camp.concreteProductionPerSecond = GameGlobals.campHelper.getConcreteProductionPerSecond(camp.assignedWorkers.concrete, improvementsComponent, robots);
			camp.robotsProductionPerSecond = GameGlobals.campHelper.getRobotsProductionPerSecond(camp.assignedWorkers.robotmaker, improvementsComponent, robots);
			
			camp.herbConsumptionPerSecond = GameGlobals.campHelper.getHerbsConsumptionPerSecond(camp.assignedWorkers.apothecary);
			camp.metalConsumptionPerSecondConcrete = GameGlobals.campHelper.getMetalConsumptionPerSecondConcrete(camp.assignedWorkers.concrete);
			camp.metalConsumptionPerSecondSmith = GameGlobals.campHelper.getMetalConsumptionPerSecondSmith(camp.assignedWorkers.toolsmith);
			camp.toolsConsumptionPerSecondRobots = GameGlobals.campHelper.getToolsConsumptionPerSecondRobots(camp.assignedWorkers.robotmaker);
		},
		
		updateWorkerHunger: function (node, time) {
			if (GameGlobals.gameState.isLaunched) return;
			
			var campResources = node.entity.get(ResourcesComponent);
			var campResourceAcc = node.entity.get(ResourceAccumulationComponent);
			this.deductHunger(time, campResources.resources, node.camp.getAssignedPopulation(), false, false);
			this.deductHunger(time, campResourceAcc.resourceChange, node.camp.getAssignedPopulation(), false, true, campResourceAcc, "Workers");
		},
		
		updatePlayer: function (time) {
			var inCamp = this.playerNodes.head.position.inCamp;
			var playerFoodSource = GameGlobals.resourcesHelper.getCurrentStorage();
			var playerFoodSourceAcc = GameGlobals.resourcesHelper.getCurrentStorageAccumulation(true);
			
			// Manage perks
			var isThirsty = playerFoodSource.resources.water < 1;
			var isHungry = playerFoodSource.resources.food < 1;
			var perksComponent = this.playerNodes.head.entity.get(PerksComponent);
			
			var hasThirstPerk = perksComponent.hasPerk(PerkConstants.perkIds.thirst);
			var hasHungerPerk = perksComponent.hasPerk(PerkConstants.perkIds.hunger);
			
			if (!isThirsty) {
				if (hasThirstPerk) {
					if (!inCamp) this.log("No longer thirsty.", true);
					perksComponent.removePerkById(PerkConstants.perkIds.thirst);
				}
			} else if (!hasThirstPerk) {
				if (!inCamp && (GameGlobals.gameState.unlockedFeatures.resources.water)) this.log("Out of water!", true);
				var thirstPerk = PerkConstants.getPerk(PerkConstants.perkIds.thirst, PerkConstants.ACTIVATION_TIME_HEALTH_DEBUFF);
				perksComponent.addPerk(thirstPerk);
			}
			
			if (!isHungry) {
				if (hasHungerPerk) {
					if (!inCamp) this.log("No longer hungry.", true);
					perksComponent.removePerkById(PerkConstants.perkIds.hunger);
				}
			} else if (!hasHungerPerk) {
				if (!inCamp && (GameGlobals.gameState.unlockedFeatures.resources.food)) this.log("Out of food!", true);
				var hungerPerk = PerkConstants.getPerk(PerkConstants.perkIds.hunger, PerkConstants.ACTIVATION_TIME_HEALTH_DEBUFF);
				perksComponent.addPerk(hungerPerk);
			}
		},
		
		updateImprovementProduction: function (node, time) {
			let resources = node.entity.get(ResourcesComponent).resources;
			let resourceAcc = node.entity.get(ResourceAccumulationComponent);
			let improvementsComponent = node.entity.get(SectorImprovementsComponent);
			
			// Darkfarms
			let farmFood = GameGlobals.campHelper.getDarkFarmProductionPerSecond(improvementsComponent) * time * GameConstants.gameSpeedCamp;
			resources.addResource(resourceNames.food, farmFood);
			resourceAcc.addChange(resourceNames.food, farmFood / time, "Snail farms");
			
			// Aqueduct
			let aqueductWater = GameGlobals.campHelper.getAqueductProductionPerSecond(improvementsComponent) * time * GameConstants.gameSpeedCamp;
			resources.addResource(resourceNames.water, aqueductWater);
			resourceAcc.addChange(resourceNames.water, aqueductWater / time, "Aqueducts");
		},
		
		deductHunger: function (time, resourceVO, population, isExplorationMode, accumulation, accComponent, sourceName) {
			var timeMod = accumulation ? 1 : time;
			var waterChange = timeMod * GameGlobals.campHelper.getWaterConsumptionPerSecond(population, isExplorationMode);
			var foodChange = timeMod * GameGlobals.campHelper.getFoodConsumptionPerSecond(population, isExplorationMode);
			if (!accumulation) {
				resourceVO.water -= waterChange;
				resourceVO.food -= foodChange;
			} else {
				accComponent.addChange(resourceNames.water, -waterChange, sourceName);
				accComponent.addChange(resourceNames.food, -foodChange, sourceName);
			}
		},
		
		queueProductionRateUpdate: function () {
			this.isPendingProductionRateUpdate = true;
		},
		
		logAmbient: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			if (!this.playerLocationNodes.head || !this.playerLocationNodes.head.position) return;
			
			var playerFoodSource = GameGlobals.resourcesHelper.getCurrentStorage().resources;
			
			var playerLevelCamp = this.nearestCampNodes.head !== null ? this.nearestCampNodes.head.entity : null;
			var inCamp = playerLevelCamp !== null;
			var hasPopulation = this.nearestCampNodes.head !== null ? this.nearestCampNodes.head.camp.population >= 1 : false;
			inCamp = inCamp && playerLevelCamp.get(PositionComponent).sector === this.playerLocationNodes.head.position.sector;
			
			var timeStamp = new Date().getTime();
			var log = timeStamp - this.lastMsgTimeStamp > this.msgFrequency;
			if (log) {
				var isThirsty = playerFoodSource.water < 1;
				var isHungry = playerFoodSource.food < 1;
				var msg = null;
				
				if (inCamp && hasPopulation && isThirsty && Math.random() < 0.05) {
					msg = "There is no more water.";
				}
				
				if (inCamp && hasPopulation && msg === null && isHungry && Math.random() < 0.05) {
					msg = "There is no more food.";
				}
				
				if (!inCamp && isThirsty && Math.random() < 0.05) {
					msg = "Your throat is dry.";
				}
				
				if (!inCamp && msg === null && isHungry && Math.random() < 0.05) {
					msg = "Your stomach is grumbling.";
				}
				
				if (msg != null) {
					this.log(msg, true);
				}
			}
		},
		
		log: function (msg, isAmbient, campNode) {
			let logComponent = this.playerNodes.head.entity.get(LogMessagesComponent);
			if (campNode) {
				logComponent.addMessage(LogConstants.getUniqueID(), msg, null, null, null, null, true, campNode.position.level);
			} else {
				logComponent.addMessage(LogConstants.MSG_ID_WORKER_STATUS, msg);
			}
			if (isAmbient) {
				this.lastMsgTimeStamp = new Date().getTime();
			}
		}

	});

	return WorkerSystem;
});
