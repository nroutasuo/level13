// A system that updates accumulates resources in collectors
define([
	'ash', 'game/GameGlobals', 'game/GlobalSignals', 'game/constants/GameConstants', 'game/nodes/sector/SectorCollectorsNode', 'game/vos/ResourcesVO'
], function (Ash, GameGlobals, GlobalSignals, GameConstants, SectorCollectorsNode, ResourcesVO) {
	var CollectorSystem = Ash.System.extend({

		collectorNodes: null,

		constructor: function () { },

		addToEngine: function (engine) {
			this.engine = engine;
			this.collectorNodes = engine.getNodeList(SectorCollectorsNode);
			GlobalSignals.add(this, GlobalSignals.improvementBuiltSignal, this.onImprovementBuilt);
		},

		removeFromEngine: function (engine) {
			GlobalSignals.removeAll(this);
			this.collectorNodes = null;
		},

		update: function (time) {
			if (GameGlobals.gameState.isPaused) return;
			this.updateNodes(time);
		},
		
		updateNodes: function (time) {
			for (var node = this.collectorNodes.head; node; node = node.next) {
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
			let level = collector.level;
			let storageCapacity = level * 10;
			collector.storageCapacity[resource] = storageCapacity;
			
			let oldValue = collector.storedResources.getResource(resource);
			let totalStorage = storageCapacity * collector.count;
			
			if (oldValue == totalStorage) return;
			
			collector.storedResources.addResource(resource, time * 0.05 * GameConstants.gameSpeedExploration);
			
			if (collector.storedResources.getResource(resource) > totalStorage) {
				collector.storedResources.setResource(resource, totalStorage);
			}
			
			var newValue = collector.storedResources.getResource(resource);
			if (oldValue < 1 && newValue >= 1) {
				GlobalSignals.updateButtonsSignal.dispatch();
			}
		},
		
		onImprovementBuilt: function () {
			this.updateNodes(0);
		},
		
	});

	return CollectorSystem;
});
