// A system that updates accumulates resources in collectors
define([
    'ash', 'game/constants/GameConstants', 'game/nodes/sector/SectorImprovementsNode', 'game/vos/ResourcesVO'
], function (Ash, GameConstants, SectorImprovementsNode, ResourcesVO) {
    var CollectorSystem = Ash.System.extend({

		improvementNodes: null,
	
        constructor: function () {
        },

        addToEngine: function (engine) {
			this.improvementNodes = engine.getNodeList(SectorImprovementsNode);
        },

        removeFromEngine: function (engine) {
			this.improvementNodes = null;
        },

        update: function (time) {
			for (var node = this.improvementNodes.head; node; node = node.next) {
				this.updateNode(time, node);
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
			collector.storedResources.addResource(resource, time * 0.05 * GameConstants.gameSpeed);
			
			var storage = collector.storageCapacity.getResource(resource) * collector.count;
			if (collector.storedResources.getResource(resource) > storage) {
				collector.storedResources.setResource(resource, storage);
			}
		},
        
    });

    return CollectorSystem;
});
