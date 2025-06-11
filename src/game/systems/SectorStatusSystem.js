// A system that updates a Sector's MovementOptionsComponent based on its neighbours and improvements
define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/PositionConstants',
	'game/constants/LocaleConstants',
	'game/constants/MovementConstants',
	'game/nodes/sector/SectorNode',
	'game/nodes/PlayerLocationNode',
	'game/nodes/player/ItemsNode',
	'game/components/common/PositionComponent',
	'game/components/common/CampComponent',
	'game/components/common/VisitedComponent',
	'game/components/sector/MovementOptionsComponent',
	'game/components/sector/PassagesComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/SectorControlComponent',
], function (Ash,
	GameGlobals,
	GlobalSignals,
	PositionConstants,
	LocaleConstants,
	MovementConstants,
	SectorNode,
	PlayerLocationNode,
	ItemsNode,
	PositionComponent,
	CampComponent,
	VisitedComponent,
	MovementOptionsComponent,
	PassagesComponent,
	SectorStatusComponent,
	SectorFeaturesComponent,
	SectorControlComponent) {
	
	let SectorStatusSystem = Ash.System.extend({
		
		sectorNodes: null,
		playerLocationNodes: null,
		itemsNodes: null,
		
		neighboursDict: {},

		contest: "SectorStatusSystem",
		
		constructor: function () {
		},
	
		addToEngine: function (engine) {
			this.sectorNodes = engine.getNodeList(SectorNode);
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			this.itemsNodes = engine.getNodeList(ItemsNode);

			var sys = this;
			GlobalSignals.playerPositionChangedSignal.add(function () {
				sys.updateCurrentLocation();
			});
			GlobalSignals.fightEndedSignal.add(function () {
				sys.updateCurrentLocation();
			});
			GlobalSignals.gameShownSignal.add(function () {
				sys.updateCurrentLocation();
			});
			GlobalSignals.gameStateReadySignal.add(function () {
				sys.queueFindAllNeighbours();
			});
			GlobalSignals.gameStateRefreshSignal.add(function () {
				sys.updateAllSectors();
			});
			GlobalSignals.sectorScoutedSignal.add(function () {
				sys.updateCurrentLocation();
			});
			GlobalSignals.equipmentChangedSignal.add(function () {
				sys.updateCurrentLocation();
			});
			GlobalSignals.improvementBuiltSignal.add(function () {
				sys.updateCurrentLocation();
			});
			GlobalSignals.movementBlockerClearedSignal.add(function () {
				sys.updateCurrentLocation();
			});
			GlobalSignals.gameResetSignal.add(function () {
				sys.reset();
			});
		},
	
		removeFromEngine: function (engine) {
			this.sectorsPendingFindNeighbours = null;
			this.sectorNodes = null;
		},
	
		updateCurrentLocation: function () {
			if (!this.playerLocationNodes.head) return;
			if (!this.playerLocationNodes.head.entity) return;
			
			log.i("update current location", this);
			this.findNeighboursIfNotAlready(this.playerLocationNodes.head.entity);
			this.updateSector(this.playerLocationNodes.head.entity);
		},

		update: function () {
			this.findNeigbhoursForQueued();
		},
		
		reset: function () {
			this.sectorsPendingFindNeighbours = null;
			this.neighboursDict = {};
		},

		updateAllSectors: function () {
			log.i("update all sectors | " + Object.keys(this.neighboursDict).length, this);
			for (let sectorNode = this.sectorNodes.head; sectorNode; sectorNode = sectorNode.next) {
				this.updateSector(sectorNode.entity);
			}
		},
		
		updateSector: function (entity) {
			var positionComponent = entity.get(PositionComponent);
			var sectorStatusComponent = entity.get(SectorStatusComponent);
			var featuresComponent = entity.get(SectorFeaturesComponent);
			
			if (!positionComponent) return;
			
			let levelEntity = GameGlobals.levelHelper.getLevelEntityForSector(entity);
			
			let isVisited = GameGlobals.sectorHelper.isVisited(entity);
			let isScouted = sectorStatusComponent.scouted;
			let hasCampLevel = levelEntity.has(CampComponent);
			let hasCampSector = entity.has(CampComponent);

			sectorStatusComponent.visited = isVisited;

			entity.remove(VisitedComponent);
			
			if (isVisited) {
				this.updateGangs(entity);
			}

			this.updateMovementOptions(entity);
			this.updateHazardReduction(entity);
			
			sectorStatusComponent.canBuildCamp = isScouted && !hasCampLevel && featuresComponent.canHaveCamp();
			
			if (hasCampSector && !hasCampLevel) levelEntity.add(entity.get(CampComponent));
		},
		
		updateGangs: function (entity) {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			let sectorControlComponent = entity.get(SectorControlComponent);
			let positionComponent = entity.get(PositionComponent);
			
			let sectorKey = this.getSectorKey(positionComponent);

			if (!this.neighboursDict[sectorKey]) return;

			let sys = this;
			
			function checkNeighbour(direction) {
				let localeId = LocaleConstants.getPassageLocaleId(direction);
				let currentEnemies = sectorControlComponent.getCurrentEnemies(localeId);
				if (currentEnemies <= 0) return;
				
				let neighbour = sys.getNeighbour(sectorKey, direction);
				
				if (neighbour) {
					var neighbourSectorControlComponent = neighbour.get(SectorControlComponent);
					var neighbourLocaleID = LocaleConstants.getPassageLocaleId(PositionConstants.getOppositeDirection(direction));
					var neighbourEnemies = neighbourSectorControlComponent.getCurrentEnemies(neighbourLocaleID);
					var targetEnemies = Math.min(currentEnemies, neighbourEnemies);
					
					if (targetEnemies < currentEnemies) {
						log.w("set sector control for " + localeId + " at " + positionComponent.level + "-" + positionComponent.sectorId() + " | " + targetEnemies + " < " + currentEnemies);
						sectorControlComponent.currentLocaleEnemies[localeId] -= (currentEnemies - targetEnemies);
					}
				}
			}
			
			for (let i in PositionConstants.getLevelDirections()) {
				let direction = PositionConstants.getLevelDirections()[i];
				checkNeighbour(direction);
			}
		},
		
		updateMovementOptions: function (entity) {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			var movementOptions = entity.get(MovementOptionsComponent);
			var passagesComponent = entity.get(PassagesComponent);
			var positionComponent = entity.get(PositionComponent);
			var featuresComponent = entity.get(SectorFeaturesComponent);
			var statusComponent = entity.get(SectorStatusComponent);
			
			var sectorKey = this.getSectorKey(positionComponent);

			if (!this.neighboursDict[sectorKey]) return;
			
			var isAffectedByHazard = GameGlobals.sectorHelper.isAffectedByHazard(featuresComponent, statusComponent, this.itemsNodes.head.items);
			
			// Allow n/s/w/e movement if neighbour exists and there is no active blocker AND no hazard
			for (let i in PositionConstants.getLevelDirections()) {
				var direction = PositionConstants.getLevelDirections()[i];
				var neighbour = this.getNeighbour(sectorKey, direction);
				var isNeighbourAffectedByHazard = neighbour ? GameGlobals.sectorHelper.isAffectedByHazard(neighbour.get(SectorFeaturesComponent), neighbour.get(SectorStatusComponent), this.itemsNodes.head.items) : false;
				var isBlockedByHazard = neighbour ? isAffectedByHazard && !(GameGlobals.sectorHelper.isVisited(neighbour) && !isNeighbourAffectedByHazard) : false;
				movementOptions.canMoveTo[direction] = neighbour != null;
				movementOptions.canMoveTo[direction] = movementOptions.canMoveTo[direction] && !isBlockedByHazard;
				movementOptions.canMoveTo[direction] = movementOptions.canMoveTo[direction] && !GameGlobals.movementHelper.isBlocked(entity, direction);
				movementOptions.cantMoveToReason[direction] = GameGlobals.movementHelper.getBlockedReason(entity, direction);
				if (isBlockedByHazard) movementOptions.cantMoveToReason[direction] = GameGlobals.sectorHelper.getHazardDisabledReason(featuresComponent, statusComponent, this.itemsNodes.head.items);
				if (!neighbour) movementOptions.cantMoveToReason[direction] = "Nothing here.";
				
				//log.i(PositionConstants.getDirectionName(direction) + "\t" + isBlockedByHazard + " | " + movementOptions.cantMoveToReason[direction]);
			}
			
			// Allow up/down movement if passages exists AND no hazard
			movementOptions.canMoveTo[PositionConstants.DIRECTION_UP] = passagesComponent != null && !GameGlobals.movementHelper.isBlocked(entity, PositionConstants.DIRECTION_UP);
			movementOptions.cantMoveToReason[PositionConstants.DIRECTION_UP] = GameGlobals.movementHelper.getBlockedReason(entity, PositionConstants.DIRECTION_UP);
			movementOptions.canMoveTo[PositionConstants.DIRECTION_DOWN] = passagesComponent != null && !GameGlobals.movementHelper.isBlocked(entity, PositionConstants.DIRECTION_DOWN);
			movementOptions.cantMoveToReason[PositionConstants.DIRECTION_DOWN] = GameGlobals.movementHelper.getBlockedReason(entity, PositionConstants.DIRECTION_DOWN);
		},
		
		updateHazardReduction: function (entity) {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			var statusComponent = entity.get(SectorStatusComponent);
			var passagesComponent = entity.get(PassagesComponent);
			var positionComponent = entity.get(PositionComponent);
			var sectorKey = this.getSectorKey(positionComponent);

			if (!this.neighboursDict[sectorKey]) return;
			
			statusComponent.hazardReduction = { radiation: 0, poison: 0 };
			
			var reductionSelf = this.getHazardReduction(entity, 0);
			statusComponent.hazardReduction.radiation += reductionSelf.radiation;
			statusComponent.hazardReduction.poison += reductionSelf.poison;
			
			var directions = PositionConstants.getLevelDirections();
			for (let i in directions) {
				var direction = directions[i];
				var neighbour = this.getNeighbour(sectorKey, direction);
				if (!neighbour) continue;
				var reductionNeighbour = this.getHazardReduction(neighbour, 1);
				statusComponent.hazardReduction.radiation += reductionNeighbour.radiation;
				statusComponent.hazardReduction.poison += reductionNeighbour.poison;
			}
		},
		
		getHazardReduction: function (entity, distance) {
			var passagesComponent = entity.get(PassagesComponent);
			let result = { radiation: 0, poison: 0 };
			var reduction = Math.pow(Math.max(0, 2-distance), 2) * 5;
			var directions = PositionConstants.getLevelDirections();
			for (let i in directions) {
				var direction = directions[i];
				var blocker = passagesComponent.getBlocker(direction);
				if (!blocker) continue;
				if (GameGlobals.movementHelper.isCleaned(entity, direction)) {
					switch (blocker.type) {
						case MovementConstants.BLOCKER_TYPE_WASTE_TOXIC:
							result.poison += reduction;
							break;
						case MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE:
							result.radiation += reduction;
							break;
					}
				}
			}
			return result;
		},
		
		getNeighbour: function (sectorKey, direction) {
			switch (direction) {
				case PositionConstants.DIRECTION_NORTH: return this.neighboursDict[sectorKey].north;
				case PositionConstants.DIRECTION_EAST: return this.neighboursDict[sectorKey].east;
				case PositionConstants.DIRECTION_SOUTH: return this.neighboursDict[sectorKey].south;
				case PositionConstants.DIRECTION_WEST: return this.neighboursDict[sectorKey].west;
				case PositionConstants.DIRECTION_NE: return this.neighboursDict[sectorKey].ne;
				case PositionConstants.DIRECTION_SE: return this.neighboursDict[sectorKey].se;
				case PositionConstants.DIRECTION_SW: return this.neighboursDict[sectorKey].sw;
				case PositionConstants.DIRECTION_NW: return this.neighboursDict[sectorKey].nw;
				default:
					return null;
			}
		},

		queueFindAllNeighbours: function () {
			let queue = this.sectorsPendingFindNeighbours || [];

			for (let sectorNode = this.sectorNodes.head; sectorNode; sectorNode = sectorNode.next) {
				queue.push(sectorNode.entity);
			}

			this.sectorsPendingFindNeighbours = queue;
		},

		findNeigbhoursForQueued: function () {
			if (!this.sectorsPendingFindNeighbours) return;

			let sector = this.sectorsPendingFindNeighbours.pop();

			if (!sector) return;

			this.findNeighboursIfNotAlready(sector);

			if (this.sectorsPendingFindNeighbours.length == 0) {
				// queue cleared, update all
				this.updateAllSectors();
			}
		},

		findNeighboursIfNotAlready: function (entity) {
			let positionComponent = entity.get(PositionComponent);
			let sectorKey = this.getSectorKey(positionComponent);
			if (!this.neighboursDict[sectorKey]) this.findNeighbours(entity);
		},
		
		findNeighbours: function (entity) {
			var positionComponent = entity.get(PositionComponent);
			var sectorKey = this.getSectorKey(positionComponent);
			
			var otherPositionComponent;
			this.neighboursDict[sectorKey] = {};
			for (var otherNode = this.sectorNodes.head; otherNode; otherNode = otherNode.next) {
				otherPositionComponent = otherNode.entity.get(PositionComponent);
					
				if (positionComponent.level === otherPositionComponent.level) {
					if (positionComponent.sectorY === otherPositionComponent.sectorY) {
						if (positionComponent.sectorX - 1 === otherPositionComponent.sectorX) {
							this.neighboursDict[sectorKey].west = otherNode.entity;
						}
						if (positionComponent.sectorX + 1 === otherPositionComponent.sectorX) {
							this.neighboursDict[sectorKey].east = otherNode.entity;
						}
					}
					
					if (positionComponent.sectorX === otherPositionComponent.sectorX) {
						if (positionComponent.sectorY - 1 === otherPositionComponent.sectorY) {
							this.neighboursDict[sectorKey].north = otherNode.entity;
						}
						if (positionComponent.sectorY + 1 === otherPositionComponent.sectorY) {
							this.neighboursDict[sectorKey].south = otherNode.entity;
						}
					}
						
					if (positionComponent.sectorX - 1 === otherPositionComponent.sectorX && positionComponent.sectorY - 1 === otherPositionComponent.sectorY) {
						this.neighboursDict[sectorKey].nw = otherNode.entity;
					}
						
					if (positionComponent.sectorX - 1 === otherPositionComponent.sectorX && positionComponent.sectorY + 1 === otherPositionComponent.sectorY) {
						this.neighboursDict[sectorKey].sw = otherNode.entity;
					}
						
					if (positionComponent.sectorX + 1 === otherPositionComponent.sectorX && positionComponent.sectorY - 1 === otherPositionComponent.sectorY) {
						this.neighboursDict[sectorKey].ne = otherNode.entity;
					}
						
					if (positionComponent.sectorX + 1 === otherPositionComponent.sectorX && positionComponent.sectorY + 1 === otherPositionComponent.sectorY) {
						this.neighboursDict[sectorKey].se = otherNode.entity;
					}
				}
					
				if (positionComponent.sectorId() === otherPositionComponent.sectorId()) {
					if (positionComponent.level - 1 === otherPositionComponent.level) {
						this.neighboursDict[sectorKey].down = otherNode.entity;
					}
					if (positionComponent.level + 1 === otherPositionComponent.level) {
						this.neighboursDict[sectorKey].up = otherNode.entity;
					}
				}
			}
		},
		
		getSectorKey: function (positionComponent) {
			return positionComponent.level + "." + positionComponent.sectorId();
		}
		
	});

	return SectorStatusSystem;
});
