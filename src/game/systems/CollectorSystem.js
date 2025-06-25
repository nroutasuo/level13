// A system that updates accumulates resources in collectors
define([
	'ash', 
	'game/GameGlobals', 
	'game/GlobalSignals',
	'game/constants/GameConstants', 
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/nodes/sector/SectorCollectorsNode', 
	'game/nodes/PlayerLocationNode',
	'game/vos/ResourcesVO'
], function (Ash, GameGlobals, GlobalSignals, GameConstants, SectorImprovementsComponent, SectorCollectorsNode, PlayerLocationNode, ResourcesVO) {

	let CollectorSystem = Ash.System.extend({

		collectorNodes: null,
		playerLocationNodes: null,

		constructor: function () { },

		addToEngine: function (engine) {
			this.collectorNodes = engine.getNodeList(SectorCollectorsNode);
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);

			GlobalSignals.add(this, GlobalSignals.improvementBuiltSignal, this.onImprovementBuilt);
			GlobalSignals.add(this, GlobalSignals.slowUpdateSignal, this.slowUpdate);
		},

		removeFromEngine: function (engine) {
			GlobalSignals.removeAll(this);

			this.collectorNodes = null;
			this.playerLocationNodes = null;
		},

		update: function (time) {
			if (GameGlobals.gameState.isPaused) return;
			if (GameGlobals.gameState.isLaunched) return;

			let sectorImprovements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			this.updateSector(time, sectorImprovements);
		},

		slowUpdate: function (time) {
			if (GameGlobals.gameState.isPaused) return;
			if (GameGlobals.gameState.isLaunched) return;
			this.updateNodes(time);
		},
		
		updateNodes: function (time) {
			for (var node = this.collectorNodes.head; node; node = node.next) {
				if ( this.playerLocationNodes.head && node.entity == this.playerLocationNodes.head.entity) continue;
				this.updateNode(time, node);
			}
		},
	
		updateNode: function (time, node) {
			this.updateSector(time, node.improvements);
		},

		updateSector: function (time, sectorImprovements) {
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
			
			collector.storedResources.addResource(resource, time * 0.06 * GameConstants.gameSpeedExploration);
			
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
