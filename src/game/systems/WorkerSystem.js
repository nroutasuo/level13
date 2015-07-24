define([
    'ash',
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
    'game/components/sector/improvements/CampComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/components/common/LogMessagesComponent',
], function (Ash, PlayerActionConstants, PerkConstants, CampConstants,
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
	
	resourcesHelper: null,
	
	lastMsgTimeStamp: 0,
	msgFrequency: 1000 * 120,

        constructor: function (resourcesHelper) {
	    this.resourcesHelper = resourcesHelper;
        },

        addToEngine: function (engine) {
            this.campNodes = engine.getNodeList( CampNode );
            this.playerNodes = engine.getNodeList( PlayerPositionNode );
            this.playerLocationNodes = engine.getNodeList( PlayerLocationNode );
            this.nearestCampNodes = engine.getNodeList( NearestCampNode );
        },

        removeFromEngine: function (engine) {
            this.campNodes = null;
            this.playerNodes = null;
	    this.playerLocationNodes = null;
            this.nearestCampNodes = null;
        },

        update: function (time) {
            for (var node = this.campNodes.head; node; node = node.next) {
                this.updateNode(node, time);
            }
	    
			this.updatePlayer(time);
			this.logAmbient();
		},
	
        updateNode: function (node, time) {
	    node.entity.get(ResourceAccumulationComponent).reset();
	    this.updateWorkerHunger(node, time);
	    this.updateWorkers(node, time);
	    this.updateResourceImprovements(node, time);
	},
	
	updateWorkers: function(node, time) {
	    var camp = node.camp;
	    var resources = node.entity.get(ResourcesComponent).resources;
	    var resourceAccComponent = node.entity.get(ResourceAccumulationComponent);
	    
	    // Basic: Scavengers
	    var scavengeResult = PlayerActionConstants.getResourcesForScavenge(0, 0, null, false);
	    var metal = camp.assignedWorkers.scavenger * scavengeResult.metal * time;
	    resources.addResource(resourceNames.metal, metal);
	    resourceAccComponent.addChange(resourceNames.metal, metal / time, "Scavengers");
	    
	    // Basic: Trappers
	    var food = camp.assignedWorkers.trapper * time * CampConstants.PRODUCTION_FOOD_PER_WORKER_PER_S;
	    resources.addResource(resourceNames.food, food);	  
	    resourceAccComponent.addChange(resourceNames.food, food / time, "Trappers");  
	    
	    // Basic: Water collectors
	    var water = camp.assignedWorkers.water * CampConstants.PRODUCTION_WATER_PER_WORKER_PER_S * time;
	    resources.addResource(resourceNames.water, water);
	    resourceAccComponent.addChange(resourceNames.water, water / time, "Collectors");
	    
	    // Basic: Rope-makers
	    var rope = camp.assignedWorkers.ropemaker * CampConstants.PRODUCTION_ROPE_PER_WORKER_PER_S * time;
	    resources.addResource(resourceNames.rope, rope);
	    resourceAccComponent.addChange(resourceNames.rope, rope / time, "Rope-makers");
	    
	    // Workshop: Chemists
	    var fuel = camp.assignedWorkers.chemist * CampConstants.PRODUCTION_FUEL_PER_WORKER_PER_S * time;
	    resources.addResource(resourceNames.fuel, fuel);
	    resourceAccComponent.addChange(resourceNames.fuel, fuel / time, "Chemists");
	    
	    // Advanced: Apothecaries
	    var herbsRequired = camp.assignedWorkers.apothecary * CampConstants.CONSUMPTION_HERBS_PER_WORKER_PER_S * time;
	    if (herbsRequired > 0) {
		var herbsUsed = Math.min(resources.getResource(resourceNames.herbs), herbsRequired);
		var medicine = (herbsUsed/herbsRequired) * camp.assignedWorkers.apothecary * CampConstants.PRODUCTION_MEDICINE_PER_WORKER_PER_S * time;
		resources.addResource(resourceNames.medicine, medicine);
		resources.addResource(resourceNames.herbs, -herbsUsed);
		resourceAccComponent.addChange(resourceNames.medicine, medicine / time, "Apothecaries");
		resourceAccComponent.addChange(resourceNames.herbs, -herbsUsed / time, "Apothecaries");
	    }
	    
	    // Advanced: Toolsmiths
	    var metalRequiredTools = camp.assignedWorkers.toolsmith * CampConstants.CONSUMPTION_METAL_PER_TOOLSMITH_PER_S * time;
	    if (metalRequiredTools > 0) {
		var metalUsedTools = Math.min(resources.getResource(resourceNames.metal), metalRequiredTools);
		var tools = (metalUsedTools/metalRequiredTools) * camp.assignedWorkers.toolsmith * CampConstants.PRODUCTION_TOOLS_PER_WORKER_PER_S * time;
		resources.addResource(resourceNames.tools, tools);
		resources.addResource(resourceNames.metal, -metalUsedTools);
		resourceAccComponent.addChange(resourceNames.tools, tools / time, "Toolsmiths");
		resourceAccComponent.addChange(resourceNames.metal, -metalUsedTools / time, "Toolsmiths");
	    }
	    
	    // Advanced: Concrete mixers
	    var metalRequiredConcrete = camp.assignedWorkers.concrete * CampConstants.CONSUMPTION_METAL_PER_CONCRETE_PER_S * time;
	    if (metalRequiredConcrete > 0) {
		var metalUsedConcrete = Math.min(resources.getResource(resourceNames.metal), metalRequiredConcrete);
		var concrete = (metalUsedConcrete/metalRequiredConcrete) * camp.assignedWorkers.concrete * CampConstants.PRODUCTION_CONCRETE_PER_WORKER_PER_S * time;
		resources.addResource(resourceNames.concrete, concrete);
		resources.addResource(resourceNames.metal, -metalUsedConcrete);
		resourceAccComponent.addChange(resourceNames.concrete, concrete / time, "Concrete mixers");
		resourceAccComponent.addChange(resourceNames.metal, -metalUsedConcrete / time, "Concrete mixers");
	    }
        },
	
	updateWorkerHunger: function(node, time) {	    
	    campResources = node.entity.get(ResourcesComponent);
	    campResourceAcc = node.entity.get(ResourceAccumulationComponent);
	    this.deductHunger(time, campResources.resources, node.camp.getAssignedPopulation(), false);
	    this.deductHunger(time, campResourceAcc.resourceChange, node.camp.getAssignedPopulation(), true, campResourceAcc, "Workers");
	},
	
	updatePlayer: function(time) {
	    var playerFoodSource = this.resourcesHelper.getCurrentStorage(true);
	    var playerFoodSourceAcc = this.resourcesHelper.getCurrentStorageAccumulation(true);
	    this.deductHunger(time, playerFoodSource.resources, 1, false);
	    this.deductHunger(time, playerFoodSourceAcc.resourceChange, 1, true, playerFoodSourceAcc, "Player");
	    
	    // Manage perks
	    var isThirsty = playerFoodSource.resources.water <= 0;
	    var isHungry = playerFoodSource.resources.food <= 0;    
	    var perksComponent = this.playerNodes.head.entity.get(PerksComponent);
	    
	    var hasThirstPerk = perksComponent.hasPerk(PerkConstants.perkIds.thirst);
	    var hasHungerPerk = perksComponent.hasPerk(PerkConstants.perkIds.hunger);
	    if (!isThirsty) {
		if (hasThirstPerk) {
		    this.log("No longer thirsty.");
		    perksComponent.removeItemsById(PerkConstants.perkIds.thirst);
		}
	    }
	    else if(!hasThirstPerk) {
		this.log("Out of water!");
		perksComponent.addPerk(PerkConstants.getPerk(PerkConstants.perkIds.thirst));
	    }
	    if (!isHungry) {
		if (hasHungerPerk) {
		    this.log("No longer hungry.");
		    perksComponent.removeItemsById(PerkConstants.perkIds.hunger);
		}
	    }
	    else if (!hasHungerPerk) {
		this.log("Out of food!");
		perksComponent.addPerk(PerkConstants.getPerk(PerkConstants.perkIds.hunger));
	    }
	},
	
	updateResourceImprovements: function(node, time) {
	    var resources = node.entity.get(ResourcesComponent).resources;
	    var resourceAcc = node.entity.get(ResourceAccumulationComponent);
	    var improvementsComponent = node.entity.get(SectorImprovementsComponent);
	    
	    // Darkfarms
	    var farmFood = improvementsComponent.getCount(improvementNames.darkfarm) * 0.01 * time;
	    resources.addResource(resourceNames.food, farmFood);
	    resourceAcc.addChange(resourceNames.food, farmFood / time, "Snail farms");	    
	},
	
	deductHunger: function(time, resourceVO, population, accumulation, accComponent, sourceName) {
	    var timeMod = accumulation ? 1 : time;
	    var waterChange = timeMod  * CampConstants.CONSUMPTION_WATER_PER_WORKER_PER_S * Math.floor(population);
	    var foodChange = timeMod * CampConstants.CONSUMPTION_FOOD_PER_WORKER_PER_S * Math.floor(population);
	    if (!accumulation) {
		resourceVO.water -= waterChange;
		resourceVO.food -= foodChange;
	        if (resourceVO.water < 0 ) resourceVO.water = 0;
	        if (resourceVO.food < 0 ) resourceVO.food = 0;
	    } else {
		accComponent.addChange(resourceNames.water, -waterChange, sourceName);
		accComponent.addChange(resourceNames.food, -foodChange, sourceName);
	    }
	},
	
	logAmbient: function() {
		if (!this.playerLocationNodes.head || !this.playerLocationNodes.head.position) return;
		
	    var playerSource = this.playerNodes.head.entity;
	    var playerFoodSource = playerSource.get(ResourcesComponent).resources;
	    
	    var playerLevelCamp = this.nearestCampNodes.head != null ? this.nearestCampNodes.head.entity : null;
	    var campFoodSource = playerLevelCamp !=null ? playerLevelCamp.get(ResourcesComponent) : null;
	    var campFoodSourceAcc = playerLevelCamp != null ? playerLevelCamp.get(ResourceAccumulationComponent) : null;
	    var inCamp = playerLevelCamp != null;
	    inCamp = inCamp && playerLevelCamp.get(PositionComponent).sector == this.playerLocationNodes.head.position.sector;
	    
	    if (inCamp) {
			playerFoodSource = campFoodSource;
	    }
	    
	    var timeStamp = new Date().getTime();
	    var log = timeStamp - this.lastMsgTimeStamp > this.msgFrequency;
	    if (log) {
		var isThirsty = playerFoodSource.water <= 0;
		var isHungry = playerFoodSource.food <= 0;
		var msg = null;
		
		if(inCamp && isThirsty && Math.random() < 0.1) {
		    msg = "People are thirsty.";
		}
		
		if(inCamp && msg == null && isHungry && Math.random() < 0.1) {
		    msg = "Workers are hungry.";
		}
		
		if(isThirsty && Math.random() < 0.1) {
		    msg = "Your throat is dry.";
		}
		
		if(msg == null && isHungry && Math.random() < 0.1) {
		    msg = "Your stomach is grumbling.";
		}
		
		this.log(msg);
	    }
        },
	
	log: function(msg) {
	    if (msg) {
		var logComponent = this.playerNodes.head.entity.get(LogMessagesComponent);
		logComponent.addMessage(msg);
		this.lastMsgTimeStamp = new Date().getTime();
	    }
	}

    });

    return WorkerSystem;
});
