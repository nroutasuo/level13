// A system that updates a Sector's MovementOptionsComponent based on its neighbours and improvements
define([
    'ash',
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
			
			var blockerLeft = this.movementHelper.getBlockerLeft(entity);
			var blockerRight = this.movementHelper.getBlockerRight(entity);
			
			var neighboursDict = this.neighboursDict;
			
			function checkNeighbour(direction) {
				var localeId = LocaleConstants.getPassageLocaleId(direction === 0 ? 0 : 1);
				var currentEnemies = sectorControlComponent.getCurrentEnemies(localeId);
				
				var neighbour = direction === 0 ? neighboursDict[sectorKey].left : neighboursDict[sectorKey].right;
				if (neighbour) {
					var neighbourSectorControlComponent = neighbour.get(SectorControlComponent);
					var neighbourLocaleID = LocaleConstants.getPassageLocaleId(direction === 0 ? 1 : 0);
					var neighbourEnemies = neighbourSectorControlComponent.getCurrentEnemies(neighbourLocaleID);
					var targetEnemies = Math.min(currentEnemies, neighbourEnemies);
					
					if (targetEnemies < currentEnemies) {
						console.log("set sector control for " + localeId + " at " + positionComponent.level + "-" + positionComponent.sector + " | " + targetEnemies + " < " + currentEnemies);
						sectorControlComponent.defeatedLocaleEnemies[localeId] += (currentEnemies - targetEnemies);
						sectorControlComponent.currentLocaleEnemies[localeId] -= (currentEnemies - targetEnemies);
					}
				}
			}
			
			if (blockerLeft && blockerLeft.type === 3) {
				checkNeighbour(0);
			}
			
			if (blockerRight && blockerRight.type === 3) {
				checkNeighbour(1);
			}
		},
		
		updateMovementOptions: function (entity) {
			var movementOptions = entity.get(MovementOptionsComponent);
			var passagesComponent = entity.get(PassagesComponent);
			var positionComponent = entity.get(PositionComponent);
			
			var sectorKey = this.getSectorKey(positionComponent);
			if (!this.neighboursDict[sectorKey]) this.findNeighbours();
			
			var neighbourLeft = this.neighboursDict[sectorKey].left;
			var neighbourRight = this.neighboursDict[sectorKey].right;
			
			// Allow left/right movement if neighbour exists
			movementOptions.canMoveLeft = neighbourLeft != null;
			movementOptions.canMoveRight = neighbourRight != null;
			
			// Block left/right movement if blocker exits and there is no bridge/sector control/other improvement
			var blockedLeft = this.movementHelper.isBlockedLeft(entity);
			var blockedRight = this.movementHelper.isBlockedRight(entity);
			movementOptions.canMoveLeft = movementOptions.canMoveLeft && !blockedLeft;
			movementOptions.cantMoveLeftReason = this.movementHelper.getBlockedReasonLeft(entity);
			if (!neighbourLeft) movementOptions.cantMoveLeftReason = "Nothing here.";
			movementOptions.canMoveRight = movementOptions.canMoveRight && !blockedRight;
			movementOptions.cantMoveRightReason = this.movementHelper.getBlockedReasonRight(entity);
			if (!neighbourRight) movementOptions.cantMoveRightReason = "Nothing here.";
			
			// Allow up/down movement if passages exists
			movementOptions.canMoveUp = passagesComponent != null && !this.movementHelper.isBlockedUp(entity);
			movementOptions.cantMoveUpReason = this.movementHelper.getBlockedReasonUp(entity);
			movementOptions.canMoveDown = passagesComponent != null && !this.movementHelper.isBlockedDown(entity);
			movementOptions.cantMoveDownReason = this.movementHelper.getBlockedReasonDown(entity);
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
					
					if (positionComponent.level == otherPositionComponent.level) {
						if (positionComponent.sector - 1 == otherPositionComponent.sector) {
							this.neighboursDict[sectorKey].left = otherNode.entity;
						}
						if (positionComponent.sector + 1 == otherPositionComponent.sector) {
							this.neighboursDict[sectorKey].right = otherNode.entity;
						}
					}
					
					if (positionComponent.sector == otherPositionComponent.sector) {
						if (positionComponent.level - 1 == otherPositionComponent.level) {
							this.neighboursDict[sectorKey].down = otherNode.entity;
						}
						if (positionComponent.level + 1 == otherPositionComponent.level) {
							this.neighboursDict[sectorKey].up = otherNode.entity;
						} 
					}
				}
			}
		},
		
		getSectorKey: function (positionComponent) {
			return positionComponent.level + "-" + positionComponent.sector;
		}
        
    });

    return SectorStatusSystem;
});
