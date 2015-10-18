// Singleton with helper methods for resource storage etc
define([
    'ash',
    'game/nodes/player/PlayerResourcesNode',
    'game/nodes/NearestCampNode',
    'game/nodes/tribe/TribeResourcesNode',
    'game/components/common/PositionComponent',
    'game/components/common/ResourcesComponent',
    'game/components/common/ResourceAccumulationComponent',
    'game/components/sector/improvements/SectorImprovementsComponent'
], function (Ash, PlayerResourcesNode, NearestCampNode, TribeResourcesNode,
	PositionComponent, ResourcesComponent, ResourceAccumulationComponent,
	SectorImprovementsComponent) {
    
    var ResourceHelper = Ash.Class.extend({
        
		playerResourcesNodes: null,
		nearestCampNodes: null,
		globalResourcesNodes: null,
		
		constructor: function (engine) {
			this.nearestCampNodes = engine.getNodeList(NearestCampNode);
			this.playerResourcesNodes = engine.getNodeList(PlayerResourcesNode);
			this.globalResourcesNodes = engine.getNodeList(TribeResourcesNode);
		},
		
		getCurrentStorage: function () {
			var playerResources = this.getPlayerStorage();
			var campResources = this.nearestCampNodes.head != null ? this.nearestCampNodes.head.entity.get(ResourcesComponent) : null;
			var globalResources = this.globalResourcesNodes.head.resources;
			
			var currentResources = playerResources;
			
			var playerPosition = this.playerResourcesNodes.head.entity.get(PositionComponent);
			if (playerPosition.inCamp && this.hasCampStorage()) {
				currentResources = campResources;
				if (this.hasAccessToTradeNetwork()) {
					currentResources = globalResources;
				}
			}
				
			return currentResources;
		},
		
		getCurrentStorageCap: function () {
			var playerPosition = this.playerResourcesNodes.head.entity.get(PositionComponent);
			var showStorage =  this.playerResourcesNodes.head.entity.get(ResourcesComponent).storageCapacity;
			
			if (playerPosition.inCamp && this.hasCampStorage()) {
				showStorage = this.nearestCampNodes.head.entity.get(ResourcesComponent).storageCapacity;
				if (this.hasAccessToTradeNetwork()) {
					showStorage = this.globalResourcesNodes.head.resources.storageCapacity;
				}
			}
			
			return showStorage;
		},
		
		getCurrentStorageName: function () {
			var playerPosition = this.playerResourcesNodes.head.entity.get(PositionComponent);
			var showStorage =  this.playerResourcesNodes.head.entity.get(ResourcesComponent).storageCapacity;
			var storageName = "Bag capacity";
			
			if (showStorage < 10) {
				storageName = "Carry capacity";
			}
			
			if (playerPosition.inCamp && this.hasCampStorage()) {
				storageName = "Camp storage";
				if (this.hasAccessToTradeNetwork()) {
					storageName = "Tribe storage";
				}
			}
			
			return storageName;
		},
		
		getCurrentStorageAccumulation: function (forWrite) {
			var playerPosition = this.playerResourcesNodes.head.entity.get(PositionComponent);
			
			var playerResourceAcc = this.playerResourcesNodes.head.entity.get(ResourceAccumulationComponent);
			var campResourceAcc = this.nearestCampNodes.head != null ? this.nearestCampNodes.head.entity.get(ResourceAccumulationComponent) : null;
			var globalResourceAcc = this.globalResourcesNodes.head.resourceAccumulation;
			
			var showResourceAcc = playerResourceAcc;
			if (playerPosition.inCamp && this.hasCampStorage()) {
				showResourceAcc = campResourceAcc;
				if (!forWrite && this.hasAccessToTradeNetwork()) {
					showResourceAcc = globalResourceAcc;
				}
			}
			
			return showResourceAcc;
		},
		
		hasAccessToTradeNetwork: function () {
			if (this.nearestCampNodes.head) {
				var improvements = this.nearestCampNodes.head.entity.get(SectorImprovementsComponent);
				if (improvements.getCount(improvementNames.tradepost) > 0) {
					return true;
				}
			}
			return false;
		},
		
		hasCampStorage: function () {
			if (this.nearestCampNodes.head) {
				return this.nearestCampNodes.head.entity.get(ResourcesComponent).storageCapacity > 0;
			}
			return false;
		},
		
		getPlayerStorage: function () {
			return this.playerResourcesNodes.head.resources;
		},
    });
    
    return ResourceHelper;
});