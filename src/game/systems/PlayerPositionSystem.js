// A system that saves the player's current location (level&sector) based on their PositionComponent
// and handles updating sector components related to the player's position
define([
    'ash',
    'game/GameGlobals',
    'game/GlobalSignals',
    'game/constants/WorldCreatorConstants',
    'game/nodes/PlayerPositionNode',
    'game/nodes/level/LevelNode',
    'game/nodes/PlayerLocationNode',
    'game/nodes/sector/SectorNode',
    'game/nodes/sector/CampNode',
    'game/components/common/CurrentPlayerLocationComponent',
    'game/components/sector/CurrentNearestCampComponent',
    'game/components/common/PositionComponent',
    'game/components/common/VisitedComponent',
    'game/components/common/RevealedComponent',
    'game/components/common/CampComponent',
    'game/components/type/LevelComponent',
], function (Ash, GameGlobals, GlobalSignals, WorldCreatorConstants,
    PlayerPositionNode, LevelNode, PlayerLocationNode, SectorNode, CampNode,
	CurrentPlayerLocationComponent, CurrentNearestCampComponent, PositionComponent,
	VisitedComponent, RevealedComponent, CampComponent, LevelComponent) {
    
    var PlayerPositionSystem = Ash.System.extend({
		
		sectorNodes: null,
		levelNodes: null,
		playerPositionNodes: null,
		playerLocationNodes: null,
        
        lastUpdatePosition: null,
        
        constructor: function () { },
	
		addToEngine: function (engine) {
			this.sectorNodes = engine.getNodeList(SectorNode);
			this.levelNodes = engine.getNodeList(LevelNode);
			this.playerPositionNodes = engine.getNodeList(PlayerPositionNode);
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
            this.campNodes = engine.getNodeList(CampNode);
            
            var sys = this;
            this.playerPositionNodes.nodeAdded.addOnce(function(node) {
                sys.lastUpdatePosition = null;
            });
            this.campNodes.nodeAdded.addOnce(function (node) {
                sys.lastUpdatePosition = null;
            });
            this.playerLocationNodes.nodeAdded.addOnce(function (node) {
                sys.handleNewSector(node, node.entity.get(PositionComponent).sectorId());
            });
            
            GlobalSignals.add(this, GlobalSignals.gameStartedSignal, this.onGameStarted);
		},
	
		removeFromEngine: function (engine) {
			this.sectorNodes = null;
			this.levelNodes = null;
			this.playerPositionNodes = null;
			this.playerLocationNodes = null;
            
            GlobalSignals.removeAll(this);
		},
        
        onGameStarted: function () {
            this.lastUpdatePosition = null;
        },
	
		update: function (time) {
            var playerPos = this.playerPositionNodes.head.position;
            if (!this.lastUpdatePosition || !this.lastUpdatePosition.equals(playerPos)) {
                this.updateLevelEntities();
                this.updateSectors();
                this.lastUpdatePosition = playerPos.clone();
            }
		},
        
        updateLevelEntities: function() {
            var playerPos = this.playerPositionNodes.head.position;
            var levelpos;
            for (var levelNode = this.levelNodes.head; levelNode; levelNode = levelNode.next) {
                levelpos = levelNode.level.position;
                if (levelpos == playerPos.level && !levelNode.entity.has(CurrentPlayerLocationComponent)) {
                    levelNode.entity.add(new CurrentPlayerLocationComponent());
                    if (!levelNode.entity.has(VisitedComponent)) {
                        this.handleNewLevel(levelNode, levelpos);
                    } else {
                        this.handleEnterLevel(levelNode, levelpos);
                    }
                } else if (levelpos != playerPos.level && levelNode.entity.has(CurrentPlayerLocationComponent)) {
                    levelNode.entity.remove(CurrentPlayerLocationComponent);
                }
            }
        },
        
        updateSectors: function() {
            var playerPos = this.playerPositionNodes.head.position; 
            var playerSectorFound = false;
            
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
                    if (this.playerLocationNodes.head)
                        this.playerLocationNodes.head.entity.remove(CurrentPlayerLocationComponent);
                    sectorNode.entity.add(new CurrentPlayerLocationComponent());
                    if (!sectorNode.entity.has(VisitedComponent)) {
                        this.handleNewSector(sectorNode, sectorPos);
                    }
                    GlobalSignals.playerMovedSignal.dispatch(playerPos);
                    GameGlobals.uiFunctions.onPlayerMoved();
                } else if ((levelpos !== playerPos.level || sectorPos !== playerPos.sectorId()) && hasLocationComponent) {
                    sectorNode.entity.remove(CurrentPlayerLocationComponent);
                }
            }

            if (!playerSectorFound) {
                this.handleInvalidPosition();
            }
        },
		
		handleNewLevel: function (levelNode, levelPos) {
			levelNode.entity.add(new VisitedComponent());
			levelNode.entity.add(new RevealedComponent());
            var levelOrdinal = GameGlobals.gameState.getLevelOrdinal(levelPos);
            GameGlobals.gameState.level = Math.max(GameGlobals.gameState.level, levelOrdinal);
            gtag('set', { 'max_level': levelOrdinal });
            gtag('event', 'reach_new_level', { event_category: 'progression', value: levelOrdinal})
			if (levelPos !== 13) GameGlobals.gameState.unlockedFeatures.levels = true;
			if (levelPos === GameGlobals.gameState.getGroundLevel()) GameGlobals.gameState.unlockedFeatures.favour = true;
		},
        
        handleEnterLevel: function (levelNode) {
            var levelEntity = levelNode.entity;
            var levelComponent = levelEntity.get(LevelComponent);
            var levelVO = levelComponent.levelVO;
            if (!levelVO.isCampable) {
                var msg = "This level seems eerily devoid of any signs of recent human activity.";
                this.addLogMessage(LogConstants.MSG_ID_ENTER_LEVEL, msg);
            }
        },
		
		handleNewSector: function (sectorNode) {			
			sectorNode.entity.add(new VisitedComponent());
			sectorNode.entity.add(new RevealedComponent());
            
            var sectorPosition = sectorNode.entity.get(PositionComponent);
            var revealDiameter = 1;
            
            var revealedNeighbour;
            for (var dx = -revealDiameter; dx <= revealDiameter; dx++) {
                for (var dy = -revealDiameter; dy <= revealDiameter; dy++) {
                    revealedNeighbour = GameGlobals.levelHelper.getSectorByPosition(sectorPosition.level, sectorPosition.sectorX + dx, sectorPosition.sectorY + dy);
                    if (revealedNeighbour && !revealedNeighbour.has(RevealedComponent)) {
                        revealedNeighbour.add(new RevealedComponent());
                    }
                }
            }
            
            GameGlobals.gameState.numVisitedSectors++;
			GameGlobals.gameState.unlockedFeatures.sectors = true;
		},
        
        handleInvalidPosition: function () {
            var playerPos = this.playerPositionNodes.head.position; 
            console.log("WARN: Player location could not be found (" + playerPos.level + "." + playerPos.sectorId() + ").");
            console.log("WARN: Moving to a known valid position.");
            playerPos.level = 13;
            playerPos.sectorX = WorldCreatorConstants.FIRST_CAMP_X;
            playerPos.sectorY = WorldCreatorConstants.FIRST_CAMP_Y;
            playerPos.inCamp = false;
            this.lastUpdatePosition = null;
        },
        
        addLogMessage: function (msgID, msg, replacements, values) {
            var logComponent = this.logNodes.head.logMessages;
            logComponent.addMessage(msgID, msg, replacements, values);
        },
        
    });

    return PlayerPositionSystem;
});
