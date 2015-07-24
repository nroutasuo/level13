// A system that saves the player's current location (level&sector) based on their PositionComponent
define([
    'ash',
    'game/nodes/PlayerPositionNode',
    'game/nodes/LevelNode',
    'game/nodes/sector/SectorNode',
    'game/components/common/CurrentPlayerLocationComponent',
    'game/components/sector/CurrentNearestCampComponent',
    'game/components/common/PositionComponent',
    'game/components/common/VisitedComponent',
    'game/components/sector/improvements/CampComponent',
], function (Ash, PlayerPositionNode, LevelNode, SectorNode,
	CurrentPlayerLocationComponent, CurrentNearestCampComponent, PositionComponent,
	VisitedComponent, CampComponent) {
    var PlayerPositionSystem = Ash.System.extend({	
	    
		gameState: null,
		uiFunctions: null,
		occurrenceFunctions: null,
		
		sectorNodes: null,
		levelNodes: null,
		playerPositionNodes: null,
		
			constructor: function (gameState, uiFunctions, occurrenceFunctions, playerMovedSignal) {
			this.gameState = gameState;
			this.uiFunctions = uiFunctions;
			this.occurrenceFunctions = occurrenceFunctions;
			this.playerMovedSignal = playerMovedSignal;
			},
	
			addToEngine: function (engine) {
			this.sectorNodes = engine.getNodeList( SectorNode );
			this.levelNodes = engine.getNodeList( LevelNode );
			this.playerPositionNodes = engine.getNodeList( PlayerPositionNode );
			},
	
			removeFromEngine: function (engine) {
			this.sectorNodes = null;
			this.levelNodes = null;
			this.playerPositionNodes = null;
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
			var hasCamp;
				for(var sectorNode = this.sectorNodes.head; sectorNode; sectorNode = sectorNode.next) {
			levelpos = sectorNode.entity.get(PositionComponent).level;
			sectorPos = sectorNode.entity.get(PositionComponent).sector;
			hasLocationComponent = sectorNode.entity.has(CurrentPlayerLocationComponent);
			hasCurrentCampComponent = sectorNode.entity.has(CurrentNearestCampComponent);
			hasCamp = sectorNode.entity.has(CampComponent);
			
			if (levelpos == playerPos.level && sectorPos == playerPos.sector) {
				playerSectorFound = true;		    
			}		
			
			if (hasCamp && levelpos == playerPos.level && !hasCurrentCampComponent) {
				sectorNode.entity.add(new CurrentNearestCampComponent());
			} else if (hasCamp && levelpos != playerPos.level && hasCurrentCampComponent) {
				sectorNode.entity.remove(CurrentNearestCampComponent);
			}
			
			if (levelpos == playerPos.level && sectorPos == playerPos.sector && !hasLocationComponent) {
				sectorNode.entity.add(new CurrentPlayerLocationComponent());
				this.playerMovedSignal.dispatch(playerPos);
				this.uiFunctions.onPlayerMoved();
				if (!sectorNode.entity.has(VisitedComponent)) {
				this.handleNewSector(sectorNode, sectorPos);
				}
			} else if((levelpos != playerPos.level || sectorPos != playerPos.sector) && hasLocationComponent) {
				sectorNode.entity.remove(CurrentPlayerLocationComponent);
			}
			}
			
			if (!playerSectorFound) {
			console.log("WARN: Player location could not be found (" + playerPos.level + "." + playerPos.sector + ")");
			}
			},
		
		handleNewLevel: function(levelNode, levelPos) {
			levelNode.entity.add(new VisitedComponent());
			if (levelPos != 13) this.gameState.unlockedFeatures.levels = true;
		},
		
		handleNewSector: function(sectorNode, sectorPos) {	    
			// occurrences
			this.occurrenceFunctions.onEnterNewSector(sectorNode.entity);
			
			sectorNode.entity.add(new VisitedComponent());
			if (sectorPos != 2) this.gameState.unlockedFeatures.sectors = true;
		},
        
    });

    return PlayerPositionSystem;
});
