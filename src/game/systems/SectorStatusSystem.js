// A system that updates a Sector's MovementOptionsComponent based on its neighbours and improvements
define([
    'ash',
    'game/constants/PositionConstants',
    'game/constants/LocaleConstants',
    'game/nodes/sector/SectorNode',
    'game/nodes/PlayerLocationNode',
    'game/components/common/PositionComponent',
    'game/components/common/CampComponent',
    'game/components/sector/MovementOptionsComponent',
    'game/components/sector/PassagesComponent',
    'game/components/sector/SectorControlComponent',
    'game/components/sector/SectorStatusComponent',
    'game/components/sector/SectorFeaturesComponent',
    'game/components/sector/SectorControlComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
], function (Ash,
		PositionConstants,
		LocaleConstants,
		SectorNode,
		PlayerLocationNode,
		PositionComponent,
		CampComponent,
		MovementOptionsComponent,
		PassagesComponent,
		SectorConrolComponent,
		SectorStatusComponent,
		SectorFeaturesComponent,
		SectorControlComponent,
		SectorImprovementsComponent) {
	
    var SectorStatusSystem = Ash.System.extend({
	    
		sectorNodes: null,
		playerLocationNodes: null,
		
		movementHelper: null,
		levelHelper: null,
		
		playerMovedSignal: null,
		
		sectorNeighboursDict: null,
		
		constructor: function (movementHelper, levelHelper, playerMovedSignal) {
			this.movementHelper = movementHelper;
			this.levelHelper = levelHelper;
			this.playerMovedSignal = playerMovedSignal;
		},
	
		addToEngine: function (engine) {
			this.sectorNodes = engine.getNodeList(SectorNode);
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			this.findNeighbours();

			var sys = this;
			this.playerMovedSignal.add(function () {
				sys.update();
			});
		},
	
        removeFromEngine: function (engine) {
			this.sectorNodes = null;
		},
	
		update: function () {
			if (this.playerLocationNodes.head)
				this.updateSector(this.playerLocationNodes.head.entity);
		},
		
		updateSector: function (entity) {
			var positionComponent = entity.get(PositionComponent);
			var sectorStatusComponent = entity.get(SectorStatusComponent);
			var featuresComponent = entity.get(SectorFeaturesComponent);
			var passagesComponent = entity.get(PassagesComponent);
			var hasEnemies = entity.get(SectorControlComponent).maxSectorEnemies > 0;
			
			if (!positionComponent) return;
			
			var levelEntity = this.levelHelper.getLevelEntityForSector(entity);
			
			var isScouted = sectorStatusComponent.scouted;
			var hasCampLevel = levelEntity.has(CampComponent);
			var hasCampSector = entity.has(CampComponent);
			
			this.updateGangs(entity);
			this.updateMovementOptions(entity);
			
			sectorStatusComponent.canBuildCamp = isScouted && !hasCampLevel && featuresComponent.canHaveCamp() && !passagesComponent.passageUp && !passagesComponent.passageDown && !hasEnemies;
			
			if (hasCampSector && !hasCampLevel) levelEntity.add(entity.get(CampComponent));
		},
		
		updateGangs: function (entity) {
			var sectorControlComponent = entity.get(SectorControlComponent);
			var positionComponent = entity.get(PositionComponent);
			
			var sectorKey = this.getSectorKey(positionComponent);
			if (!this.neighboursDict[sectorKey]) this.findNeighbours();
			var sys = this;
			
			function checkNeighbour(direction) {
				var localeId = LocaleConstants.getPassageLocaleId(direction === 0 ? 0 : 1);
				var currentEnemies = sectorControlComponent.getCurrentEnemies(localeId);
				
				var neighbour = sys.getNeighbour(sectorKey, direction);
				
				if (neighbour) {
					var neighbourSectorControlComponent = neighbour.get(SectorControlComponent);
					var neighbourLocaleID = LocaleConstants.getPassageLocaleId(direction === 0 ? 1 : 0);
					var neighbourEnemies = neighbourSectorControlComponent.getCurrentEnemies(neighbourLocaleID);
					var targetEnemies = Math.min(currentEnemies, neighbourEnemies);
					
					if (targetEnemies < currentEnemies) {
						console.log("set sector control for " + localeId + " at " + positionComponent.level + "-" + positionComponent.sectorId() + " | " + targetEnemies + " < " + currentEnemies);
						sectorControlComponent.defeatedLocaleEnemies[localeId] += (currentEnemies - targetEnemies);
						sectorControlComponent.currentLocaleEnemies[localeId] -= (currentEnemies - targetEnemies);
					}
				}
			}
			
			checkNeighbour(PositionConstants.DIRECTION_NORTH);
			checkNeighbour(PositionConstants.DIRECTION_SOUTH);
			checkNeighbour(PositionConstants.DIRECTION_WEST);
			checkNeighbour(PositionConstants.DIRECTION_EAST);
		},
		
		updateMovementOptions: function (entity) {
			var movementOptions = entity.get(MovementOptionsComponent);
			var passagesComponent = entity.get(PassagesComponent);
			var positionComponent = entity.get(PositionComponent);
			
			var sectorKey = this.getSectorKey(positionComponent);
			if (!this.neighboursDict[sectorKey]) this.findNeighbours();
			
			var neighbourWest = this.neighboursDict[sectorKey].west;
			var neighbourEast = this.neighboursDict[sectorKey].east;
			var neighbourNorth = this.neighboursDict[sectorKey].north;
			var neighbourSouth = this.neighboursDict[sectorKey].south;
			
			// Allow n/s/w/e movement if neighbour exists
			movementOptions.canMoveNorth = neighbourNorth != null;
			movementOptions.canMoveSouth = neighbourSouth != null;
			movementOptions.canMoveWest = neighbourWest != null;
			movementOptions.canMoveEast = neighbourEast != null;
			
			// Block n/s/w/e movement if blocker exits and there is no bridge/sector control/other improvement
			var blockedNorth = this.movementHelper.isBlocked(entity, PositionConstants.DIRECTION_NORTH);
			var blockedSouth = this.movementHelper.isBlocked(entity, PositionConstants.DIRECTION_SOUTH);
			var blockedWest = this.movementHelper.isBlocked(entity, PositionConstants.DIRECTION_WEST);
			var blockedEast = this.movementHelper.isBlocked(entity, PositionConstants.DIRECTION_EAST);
			
			movementOptions.canMoveNorth = movementOptions.canMoveNorth && !blockedNorth;
			movementOptions.cantMoveNorthReason = this.movementHelper.getBlockedReason(entity, PositionConstants.DIRECTION_NORTH);
			if (!neighbourNorth) movementOptions.cantMoveNorthReason = "Nothing here.";
			movementOptions.canMoveSouth = movementOptions.canMoveSouth && !blockedSouth;
			movementOptions.cantMoveSouthReason = this.movementHelper.getBlockedReason(entity, PositionConstants.DIRECTION_SOUTH);
			if (!neighbourSouth) movementOptions.cantMoveSouthReason = "Nothing here.";
			movementOptions.canMoveWest = movementOptions.canMoveWest && !blockedWest;
			movementOptions.cantMoveWestReason = this.movementHelper.getBlockedReason(entity, PositionConstants.DIRECTION_WEST);
			if (!neighbourWest) movementOptions.cantMoveWestReason = "Nothing here.";
			movementOptions.canMoveEast = movementOptions.canMoveEast && !blockedEast;
			movementOptions.cantMoveEastReason = this.movementHelper.getBlockedReason(entity, PositionConstants.DIRECTION_EAST);
			if (!neighbourEast) movementOptions.cantMoveEastReason = "Nothing here.";
			
			// Allow up/down movement if passages exists
			movementOptions.canMoveUp = passagesComponent != null && !this.movementHelper.isBlocked(entity, PositionConstants.DIRECTION_UP);
			movementOptions.cantMoveUpReason = this.movementHelper.getBlockedReason(entity, PositionConstants.DIRECTION_UP);
			movementOptions.canMoveDown = passagesComponent != null && !this.movementHelper.isBlocked(entity, PositionConstants.DIRECTION_DOWN);
			movementOptions.cantMoveDownReason = this.movementHelper.getBlockedReason(entity, PositionConstants.DIRECTION_DOWN);
		},
		
		getNeighbour: function (sectorKey, direction) {
            switch (direction) {
            case this.DIRECTION_NORTH: return this.neighboursDict[sectorKey].north;
            case this.DIRECTION_EAST: return this.neighboursDict[sectorKey].east;
            case this.DIRECTION_SOUTH: return this.neighboursDict[sectorKey].south;
            case this.DIRECTION_WEST: return this.neighboursDict[sectorKey].west;
            default:
                return null;
            }
		},
		
		findNeighbours: function () {
			this.neighboursDict = {};
			var sectorKey;
			var otherPositionComponent;
			var positionComponent;
			for (var node = this.sectorNodes.head; node; node = node.next) {
				positionComponent = node.entity.get(PositionComponent);
				sectorKey = this.getSectorKey(positionComponent);
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
			}
		},
		
		getSectorKey: function (positionComponent) {
			return positionComponent.level + "." + positionComponent.sectorId();
		}
        
    });

    return SectorStatusSystem;
});
