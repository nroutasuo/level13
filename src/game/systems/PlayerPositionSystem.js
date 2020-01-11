// A system that saves the player's current location (level&sector) based on their PositionComponent
// and handles updating sector components related to the player's position
define([
    'ash',
    'game/GameGlobals',
    'game/GlobalSignals',
    'game/constants/GameConstants',
    'game/constants/LogConstants',
    'game/constants/WorldCreatorConstants',
    'game/nodes/PlayerPositionNode',
    'game/nodes/level/LevelNode',
    'game/nodes/PlayerLocationNode',
    'game/nodes/sector/SectorNode',
    'game/nodes/sector/CampNode',
    'game/components/common/CurrentPlayerLocationComponent',
    'game/components/sector/CurrentNearestCampComponent',
    'game/components/common/LogMessagesComponent',
    'game/components/common/PositionComponent',
    'game/components/common/VisitedComponent',
    'game/components/common/RevealedComponent',
    'game/components/common/CampComponent',
    'game/components/type/LevelComponent',
], function (Ash, GameGlobals, GlobalSignals, GameConstants, LogConstants, WorldCreatorConstants,
    PlayerPositionNode, LevelNode, PlayerLocationNode, SectorNode, CampNode,
	CurrentPlayerLocationComponent, CurrentNearestCampComponent, LogMessagesComponent, PositionComponent,
	VisitedComponent, RevealedComponent, CampComponent, LevelComponent) {

    var PlayerPositionSystem = Ash.System.extend({

		sectorNodes: null,
		levelNodes: null,
		playerPositionNodes: null,
		playerLocationNodes: null,
		campNodes: null,

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
                sys.handleNewSector(node.entity, false);
            });

            GlobalSignals.add(this, GlobalSignals.gameStartedSignal, this.onGameStarted);
            GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.ontabChanged);
            GlobalSignals.add(this, GlobalSignals.campBuiltSignal, this.updateCamps);
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

        ontabChanged: function () {
            this.lastUpdatePosition = null;
        },

		update: function (time) {
            var playerPos = this.playerPositionNodes.head.position;
            if (!this.lastUpdatePosition || !this.lastUpdatePosition.equals(playerPos)) {
                this.updateEntities(!this.lastUpdatePosition);
            }
		},

		updateEntities: function (updateAll) {
            var playerPos = this.playerPositionNodes.head.position;
            this.updateLevelEntities(updateAll);
            this.updateSectors(updateAll);
            this.updateCamps();
            this.lastUpdatePosition = playerPos.clone();
        },

        updateLevelEntities: function(updateAll) {
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

        updateSectors: function (updateAll) {
            var playerPos = this.playerPositionNodes.head.position;
            var playerSector = GameGlobals.levelHelper.getSectorByPosition(playerPos.level, playerPos.sectorX, playerPos.sectorY);
            updateAll = updateAll && this.lastUpdatePosition;

            if (updateAll) {
                for (var sectorNode = this.sectorNodes.head; sectorNode; sectorNode = sectorNode.next) {
                    this.updateSector(sectorNode.entity);
                }
            } else {
                if (this.lastUpdatePosition) {
                    var previousPlayerSector = GameGlobals.levelHelper.getSectorByPosition(this.lastUpdatePosition.level, this.lastUpdatePosition.sectorX, this.lastUpdatePosition.sectorY);
                    this.updateSector(previousPlayerSector);
                }
                this.updateSector(playerSector);
            }

            if (!playerSector) {
                this.handleInvalidPosition();
            }
        },

        updateSector: function (sector) {
            if (!sector) return;
            var playerPos = this.playerPositionNodes.head.position;
            if (!playerPos) return;
            var levelpos = sector.get(PositionComponent).level;
            var sectorPos = sector.get(PositionComponent).sectorId();
            var hasLocationComponent = sector.has(CurrentPlayerLocationComponent);

            if (levelpos === playerPos.level && sectorPos === playerPos.sectorId() && !hasLocationComponent) {
                if (this.playerLocationNodes.head)
                    this.playerLocationNodes.head.entity.remove(CurrentPlayerLocationComponent);
                sector.add(new CurrentPlayerLocationComponent());
                if (!sector.has(VisitedComponent)) {
                    this.handleNewSector(sector, true);
                }
                GlobalSignals.playerMovedSignal.dispatch(playerPos);
                GameGlobals.uiFunctions.onPlayerMoved();
            } else if ((levelpos !== playerPos.level || sectorPos !== playerPos.sectorId()) && hasLocationComponent) {
                sector.remove(CurrentPlayerLocationComponent);
            }
        },

        updateCamps: function () {
            var playerPos = this.playerPositionNodes.head.position;
            var levelpos;
            var hasCurrentCampComponent;
            for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
                hasCurrentCampComponent = campNode.entity.has(CurrentNearestCampComponent);
                levelpos = campNode.entity.get(PositionComponent).level;
                if (levelpos === playerPos.level && !hasCurrentCampComponent) {
                    campNode.entity.add(new CurrentNearestCampComponent());
                } else if (levelpos !== playerPos.level && hasCurrentCampComponent) {
                    campNode.entity.remove(CurrentNearestCampComponent);
                }
            }
        },

		handleNewLevel: function (levelNode, levelPos) {
			levelNode.entity.add(new VisitedComponent());
			levelNode.entity.add(new RevealedComponent());
            var levelOrdinal = GameGlobals.gameState.getLevelOrdinal(levelPos);
            var campOrdinal = GameGlobals.gameState.getCampOrdinal(levelPos);
            GameGlobals.gameState.level = Math.max(GameGlobals.gameState.level, levelOrdinal);
            gtag('set', { 'max_level': levelOrdinal });
            gtag('event', 'reach_new_level', { event_category: 'progression', value: levelOrdinal})
			if (levelPos !== 13) GameGlobals.gameState.unlockedFeatures.levels = true;
			if (levelPos === GameGlobals.gameState.getGroundLevel()) GameGlobals.gameState.unlockedFeatures.favour = true;
            
            setTimeout(function () {
                if (campOrdinal == WorldCreatorConstants.CAMP_ORDINAL_LIMIT) {
                    gtag('event', 'camp_ordinal_limit_level_reached', { event_category: 'progression' })
                    var msg = "You've reached the last level of the current version of Level 13. ";
                    msg += "You can still explore this level and find many new things, but you won't be able to progress further down.";
                    msg += "<br/><br/>"
                    msg += "<span class='p-meta'>Thank you for playing this far! The developer would love to hear your feedback. You can use any of these channels:</span>";
    				msg += "<p>" + GameConstants.getFeedbackLinksHTML() + "</p>";
                    GameGlobals.uiFunctions.showInfoPopup(
                        "Last level",
                        msg,
                        "Continue"
                    );
                }
            }, 200);
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

		handleNewSector: function (sectorEntity, isNew) {
			sectorEntity.add(new VisitedComponent());
			sectorEntity.add(new RevealedComponent());

            var sectorPosition = sectorEntity.get(PositionComponent);
            var revealDiameter = 1;

            var neighbours = GameGlobals.levelHelper.getSectorNeighboursMap(sectorEntity);
            for (var direction in neighbours) {
                var revealedNeighbour = neighbours[direction];
                if (revealedNeighbour && !revealedNeighbour.has(RevealedComponent)) {
                    revealedNeighbour.add(new RevealedComponent());
                }
            }

            if (isNew) {
                GameGlobals.gameState.numVisitedSectors++;
    			GameGlobals.gameState.unlockedFeatures.sectors = true;
            }
		},

        handleInvalidPosition: function () {
            var playerPos = this.playerPositionNodes.head.position;
            log.w("Player location could not be found  (" + playerPos.level + "." + playerPos.sectorId() + ").");
            log.w("Moving to a known valid position.");
            playerPos.level = 13;
            playerPos.sectorX = WorldCreatorConstants.FIRST_CAMP_X;
            playerPos.sectorY = WorldCreatorConstants.FIRST_CAMP_Y;
            playerPos.inCamp = false;
            this.lastUpdatePosition = null;
        },

        addLogMessage: function (msgID, msg, replacements, values) {
            var logComponent = this.playerPositionNodes.head.entity.get(LogMessagesComponent);
            logComponent.addMessage(msgID, msg, replacements, values);
        },

    });

    return PlayerPositionSystem;
});
