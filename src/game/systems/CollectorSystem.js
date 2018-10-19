// A system that updates accumulates resources in collectors
define([
    'ash', 'game/GameGlobals', 'game/constants/GameConstants', 'game/nodes/sector/SectorCollectorsNode', 'game/vos/ResourcesVO'
], function (Ash, GameGlobals, GameConstants, SectorCollectorsNode, ResourcesVO) {
    var CollectorSystem = Ash.System.extend({

		collectorNodes: null,

        constructor: function () {
        },

        addToEngine: function (engine) {
            this.engine = engine;
			this.collectorNodes = engine.getNodeList(SectorCollectorsNode);
        },

        removeFromEngine: function (engine) {
			this.collectorNodes = null;
        },

        update: function (time) {
            if (GameGlobals.gameState.isPaused) return;
			for (var node = this.collectorNodes.head; node; node = node.next) {
				this.updateNode(time + this.engine.extraUpdateTime, node);
			}
        },
	
		updateNode: function (time, node) {
			var sectorImprovements = node.improvements;
			
			if (sectorImprovements.getCount(improvementNames.collector_food) > 0) {
				this.updateCollector(time, sectorImprovements.getVO(improvementNames.collector_food), resourceNames.food );
			}
			
			if (sectorImprovements.getCount(improvementNames.collector_water) > 0) {
				this.updateCollector(time, sectorImprovements.getVO(improvementNames.collector_water), resourceNames.water);
			}
		},
		
		updateCollector: function (time, collector, resource) {
			collector.storedResources.addResource(resource, time * 0.05 * GameConstants.gameSpeedExploration);
			
			var storage = collector.storageCapacity.getResource(resource) * collector.count;
			if (collector.storedResources.getResource(resource) > storage) {
				collector.storedResources.setResource(resource, storage);
			}
		},
        
    });

    return CollectorSystem;
});
