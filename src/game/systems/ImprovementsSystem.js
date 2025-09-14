// A system that updates built improvements, such as accumulates resources in collectors
define([
	'ash', 
	'game/GameGlobals', 
	'game/GlobalSignals',
	'game/constants/GameConstants', 
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/nodes/sector/SectorNode',
	'game/nodes/sector/SectorCollectorsNode', 
	'game/nodes/PlayerLocationNode',
	'game/vos/ResourcesVO'
], function (Ash, GameGlobals, GlobalSignals, GameConstants, SectorImprovementsComponent, SectorNode, SectorCollectorsNode, PlayerLocationNode, ResourcesVO) {

	let ImprovementsSystem = Ash.System.extend({

		sectorNodes: null,
		collectorNodes: null,
		playerLocationNodes: null,

		constructor: function () { },

		addToEngine: function (engine) {
			this.sectorNodes = engine.getNodeList(SectorNode);
			this.collectorNodes = engine.getNodeList(SectorCollectorsNode);
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);

			GlobalSignals.add(this, GlobalSignals.slowUpdateSignal, this.slowUpdate);
			GlobalSignals.add(this, GlobalSignals.gameStateReadySignal, this.onGameStateReady);
			GlobalSignals.add(this, GlobalSignals.improvementBuiltSignal, this.onImprovementBuilt);
			GlobalSignals.add(this, GlobalSignals.levelGeneratedSignal, this.onLevelGenerated);
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
			this.updateSectorCollectors(time, sectorImprovements);
		},

		slowUpdate: function (time) {
			if (GameGlobals.gameState.isPaused) return;
			if (GameGlobals.gameState.isLaunched) return;

			this.updateAllCollectors(time);
		},
		
		updateAllCollectors: function (time) {
			for (var node = this.collectorNodes.head; node; node = node.next) {
				if (this.playerLocationNodes.head && node.entity == this.playerLocationNodes.head.entity) continue;
				this.updateSectorCollectors(time, node.improvements);
			}
		},

		updateSectorCollectors: function (time, sectorImprovements) {
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

		updateAllLevelPassages: function () {
			for (let node = this.sectorNodes.head; node; node = node.next) {
				this.updateSectorPassages(node);
			}
		},

		updateLevelPassages: function (level) {
			for (let node = this.sectorNodes.head; node; node = node.next) {
				if (node.position.level === level) {
					this.updateSectorPassages(node);
				}
			}
		},

		updateSectorPassages: function (node) {
			let sectorPosition = node.position;
			let levelUp = sectorPosition.level + 1;
			if (GameGlobals.worldHelper.isLevelGenerated(levelUp)) {
				let neighbourUp = GameGlobals.levelHelper.getSectorByPosition(levelUp, sectorPosition.sectorX, sectorPosition.sectorY);
				if (neighbourUp) {
					let neighbourUpPassageTypes = [];
					neighbourUpPassageTypes.push([ improvementNames.passageDownStairs, improvementNames.passageUpStairs ]);
					neighbourUpPassageTypes.push([ improvementNames.passageDownElevator, improvementNames.passageUpElevator ]);
					neighbourUpPassageTypes.push([ improvementNames.passageDownHole, improvementNames.passageUpHole ]);
					this.updateSectorPassagesFromNeighbour(node.entity, neighbourUp, neighbourUpPassageTypes);
				}
			}

			let levelDown = sectorPosition.level - 1;
			if (GameGlobals.worldHelper.isLevelGenerated(levelDown)) {
				let neighbourDown = GameGlobals.levelHelper.getSectorByPosition(levelDown, sectorPosition.sectorX, sectorPosition.sectorY);
				if (neighbourDown) {
					let neighbourDownPassageTypes = [];
					neighbourDownPassageTypes.push([ improvementNames.passageUpStairs, improvementNames.passageDownStairs ]);
					neighbourDownPassageTypes.push([ improvementNames.passageUpElevator, improvementNames.passageDownElevator ]);
					neighbourDownPassageTypes.push([ improvementNames.passageUpHole, improvementNames.passageDownHole ]);
					this.updateSectorPassagesFromNeighbour(node.entity, neighbourDown, neighbourDownPassageTypes);
				}
			}
		},

		// passages: array of pairs of improvement types (if neighbour has first of pair then sector should have second)
		updateSectorPassagesFromNeighbour: function (sector, neighbour, passageTypes) {
			let sectorImprovements = sector.get(SectorImprovementsComponent);
			let neighbourImprovements = neighbour.get(SectorImprovementsComponent);
			
			for (let i = 0; i < passageTypes.length; i++) {
				let passageTypePair = passageTypes[i];
				let neighbourPassageType = passageTypePair[0];
				let sectorPassageType = passageTypePair[1];

				if (neighbourImprovements.getCount(neighbourPassageType) > 0 && sectorImprovements.getCount(sectorPassageType) == 0) {
					log.i("automatically build matching passage")
					GameGlobals.playerActionFunctions.buildImprovement(null, sectorPassageType, sector);
				}
			}
		},
		
		onImprovementBuilt: function () {
			this.updateAllCollectors(0);
			this.updateAllLevelPassages();
		},

		onLevelGenerated: function (level) {
			this.updateLevelPassages(level);
		},

		onGameStateReady: function () {
			this.updateAllLevelPassages();
		},
		
	});

	return ImprovementsSystem;
});
