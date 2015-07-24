// A system that updates a global resources based on the camps' resources. Rules:
//  - no camp on player's level: player carries all resources
//  - camp exists: collectors and scavanging contribute to the nearest camp
//  - the camp has a trading post: camp contributes to global resources
define([
    'ash',
    'game/nodes/sector/SectorResourcesNode',
    'game/nodes/player/PlayerResourcesNode',
    'game/nodes/tribe/TribeResourcesNode',
    'game/nodes/NearestCampNode',
    'game/components/common/ResourcesComponent',
    'game/components/sector/improvements/CampComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/vos/ResourcesVO'
], function (Ash,
	SectorResourcesNode, PlayerResourcesNode, TribeResourcesNode, NearestCampNode,
	ResourcesComponent, CampComponent, SectorImprovementsComponent,
	ResourcesVO) {
    var GlobalResourcesSystem = Ash.System.extend({	
	    
	playerNodes: null,
	sectorNodes: null,
	nearestCampNodes: null,
	tribeNodes: null,
	
	gameState: null,
	
        constructor: function (gameState) {
	    this.gameState = gameState;
        },

        addToEngine: function (engine) {
	    this.playerNodes = engine.getNodeList( PlayerResourcesNode );
	    this.sectorNodes = engine.getNodeList( SectorResourcesNode );
	    this.nearestCampNodes = engine.getNodeList( NearestCampNode );
	    this.tribeNodes = engine.getNodeList( TribeResourcesNode );
        },

        removeFromEngine: function (engine) {
	    this.playerNodes = null;
	    this.sectorNodes = null;
	    this.nearestCampNodes = null;
	    this.tribeNodes = null;
        },

        update: function (time) {
	    var globalResourcesComponent = this.tribeNodes.head.resources;
	    var globalResources = globalResourcesComponent.resources;
	    var globalResourceAccumulationComponent = this.tribeNodes.head.resourceAccumulation;
	    var globalResourcesChange = globalResourceAccumulationComponent.resourceChange;
	    var playerResources = this.playerNodes.head.resources.resources;		
	    
	    // Update sectors and tribe
	    globalResourcesComponent.resetStorage();	    
	    globalResourcesComponent.storageCapacity = 0;
	    globalResourceAccumulationComponent.reset();
	    
	    var updateSectorResource = function(node, name) {
		globalResources[name] += node.resources.resources[name];
		var sources = node.resourceAccumulation.getSources(name);
		if (sources) {
		    for (var i = 0; i < sources.length; i++) {
			var source = sources[i];
			globalResourceAccumulationComponent.addChange(name, source.amount, source.source);
		    }
		}
	    };
	    var campImprovements;
	    for (var node = this.sectorNodes.head; node; node = node.next) {
		campImprovements = node.entity.get(SectorImprovementsComponent);
		if (campImprovements.getCount(improvementNames.tradepost) > 0) {
		    for(var key in resourceNames) {
		        var name = resourceNames[key];
		        updateSectorResource(node, name);
		    }
		    globalResourcesComponent.storageCapacity += node.resources.storageCapacity;
		}
		node.resources.storageCapacity = campImprovements.getCount(improvementNames.storage) * 100;
		node.resources.limitToStorage();
	    }
	
	    // Update player
	    this.playerNodes.head.resources.limitToStorage();
	    this.playerNodes.head.resourcesAcc.reset();
	    
	    // Set unlocked features
	    var gameState = this.gameState;
	    var sectorNodes = this.sectorNodes;
	    var checkUnlockedResource = function(name) {
		if(gameState.unlockedFeatures.resources[name]) return true;
		if(playerResources[name] > 0) return true;
		for (var node = sectorNodes.head; node; node = node.next) {
		    if(node.resources.resources[name] > 0) return true;
		}
		if(globalResources[name] > 0) return true;
		return false;
	    };
	    
	    this.gameState.unlockedFeatures.resources.food = checkUnlockedResource("food");
	    this.gameState.unlockedFeatures.resources.water = checkUnlockedResource("water");
	    this.gameState.unlockedFeatures.resources.metal = checkUnlockedResource("metal");
	    this.gameState.unlockedFeatures.resources.rope = checkUnlockedResource("rope");
	    this.gameState.unlockedFeatures.resources.herbs = checkUnlockedResource("herbs");
	    this.gameState.unlockedFeatures.resources.fuel = checkUnlockedResource("fuel");
	    this.gameState.unlockedFeatures.resources.medicine = checkUnlockedResource("medicine");
	    this.gameState.unlockedFeatures.resources.concrete = checkUnlockedResource("concrete");
	    this.gameState.unlockedFeatures.resources.tools = checkUnlockedResource("tools");
        }
        
    });

    return GlobalResourcesSystem;
});
