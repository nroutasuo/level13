// A system that saves the player's current location (level&sector) based on their PositionComponent
// and handles updating sector components related to the player's position
define([
    'ash',
    'game/constants/UIConstants',
    'game/nodes/PlayerPositionNode',
    'game/nodes/LevelNode',
    'game/nodes/PlayerLocationNode',
    'game/nodes/sector/SectorNode',
    'game/components/common/CurrentPlayerLocationComponent',
    'game/components/sector/CurrentNearestCampComponent',
    'game/components/common/PositionComponent',
    'game/components/common/VisitedComponent',
    'game/components/common/RevealedComponent',
    'game/components/common/CampComponent',
], function (Ash, UIConstants,
    PlayerPositionNode, LevelNode, PlayerLocationNode, SectorNode,
	CurrentPlayerLocationComponent, CurrentNearestCampComponent, PositionComponent,
	VisitedComponent, RevealedComponent, CampComponent) {
    
    var PlayerPositionSystem = Ash.System.extend({
	    
		gameState: null,
		levelHelper: null,
		uiFunctions: null,
		occurrenceFunctions: null,
		
		sectorNodes: null,
		levelNodes: null,
		playerPositionNodes: null,
		playerLocationNodes: null,
		
		constructor: function (gameState, levelHelper, uiFunctions, occurrenceFunctions, playerMovedSignal) {
			this.gameState = gameState;
            this.levelHelper = levelHelper;
			this.uiFunctions = uiFunctions;
			this.occurrenceFunctions = occurrenceFunctions;
			this.playerMovedSignal = playerMovedSignal;
		},
	
		addToEngine: function (engine) {
			this.sectorNodes = engine.getNodeList(SectorNode);
			this.levelNodes = engine.getNodeList(LevelNode);
			this.playerPositionNodes = engine.getNodeList(PlayerPositionNode);
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
		},
	
		removeFromEngine: function (engine) {
			this.sectorNodes = null;
			this.levelNodes = null;
			this.playerPositionNodes = null;
			this.playerLocationNodes = null;
		},
	
		update: function (time) {
			var playerPos = this.playerPositionNodes.head.position;
			var playerSectorFound = false;
			
			// Level
			var levelpos;
			for(var levelNode = this.levelNodes.head; levelNode; levelNode = levelNode.next) {
				levelpos = levelNode.level.position;
				if (levelpos == playerPos.level && !levelNode.entity.has(CurrentPlayerLocationComponent)) {
					levelNode.entity.add(new CurrentPlayerLocationComponent());
					if (!levelNode.entity.has(VisitedComponent)) {
						this.handleNewLevel(levelNode, levelpos);
					}
				} else if(levelpos != playerPos.level && levelNode.entity.has(CurrentPlayerLocationComponent)) {
					levelNode.entity.remove(CurrentPlayerLocationComponent);
				}
			}
			
			// Sector & camp
			var sectorPos;
			var hasLocationComponent;
			var hasCurrentCampComponent;
			var hasCamp;
			for (var sectorNode = this.sectorNodes.head; sectorNode; sectorNode = sectorNode.next) {
				levelpos = sectorNode.entity.get(PositionComponent).level;
				sectorPos = sectorNode.entity.get(PositionComponent).sectorId();
				hasLocationComponent = sectorNode.entity.has(CurrentPlayerLocationComponent);
				hasCurrentCampComponent = sectorNode.entity.has(CurrentNearestCampComponent);
				hasCamp = sectorNode.entity.has(CampComponent);
			
				if (levelpos === playerPos.level && sectorPos === playerPos.sectorId()) {
					playerSectorFound = true;
				}
			
				if (hasCamp && levelpos === playerPos.level && !hasCurrentCampComponent) {
					sectorNode.entity.add(new CurrentNearestCampComponent());
				} else if (hasCamp && levelpos !== playerPos.level && hasCurrentCampComponent) {
					sectorNode.entity.remove(CurrentNearestCampComponent);
				}
				if (levelpos === playerPos.level && sectorPos === playerPos.sectorId() && !hasLocationComponent) {
					if (this.playerLocationNodes.head) this.playerLocationNodes.head.entity.remove(CurrentPlayerLocationComponent);
					sectorNode.entity.add(new CurrentPlayerLocationComponent());
					if (!sectorNode.entity.has(VisitedComponent)) {
						this.handleNewSector(sectorNode, sectorPos);
					}
					this.playerMovedSignal.dispatch(playerPos);
					this.uiFunctions.onPlayerMoved();
				} else if ((levelpos !== playerPos.level || sectorPos !== playerPos.sectorId()) && hasLocationComponent) {
					sectorNode.entity.remove(CurrentPlayerLocationComponent);
				}
			}
			
			if (!playerSectorFound) {
				console.log("WARN: Player location could not be found (" + playerPos.level + "." + playerPos.sectorId() + ")");
			}
		},
		
		handleNewLevel: function (levelNode, levelPos) {
			levelNode.entity.add(new VisitedComponent());
			levelNode.entity.add(new RevealedComponent());
			if (levelPos !== 13) this.gameState.unlockedFeatures.levels = true;
			if (levelPos === this.gameState.getGroundLevel()) this.gameState.unlockedFeatures.favour = true;
		},
		
		handleNewSector: function (sectorNode, sectorPos) {
			// occurrences
			this.occurrenceFunctions.onEnterNewSector(sectorNode.entity);
			
			sectorNode.entity.add(new VisitedComponent());
			sectorNode.entity.add(new RevealedComponent());
            
            var sectorPosition = sectorNode.entity.get(PositionComponent);
            var revealedRange = UIConstants.MAP_MINIMAP_SIZE;
            var revealDiameter = Math.ceil(revealedRange - 1) / 2;
            
            var revealedNeighbour;
            for (var dx = -revealDiameter; dx <= revealDiameter; dx++) {
                for (var dy = -revealDiameter; dy <= revealDiameter; dy++) {
                    revealedNeighbour = this.levelHelper.getSectorByPosition(sectorPosition.level, sectorPosition.sectorX + dx, sectorPosition.sectorY + dy);
                    if (revealedNeighbour && !revealedNeighbour.has(RevealedComponent)) {
                        revealedNeighbour.add(new RevealedComponent());
                    }
                }
            }
            
			this.gameState.unlockedFeatures.sectors = true;
		},
        
    });

    return PlayerPositionSystem;
});
