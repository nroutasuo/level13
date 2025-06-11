// A system that saves the player's current location (level&sector) based on their PositionComponent
// and handles updating sector components related to the player's position
define([
	'ash',
	'text/Text',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/LevelConstants',
	'game/constants/LogConstants',
	'game/constants/PositionConstants',
	'game/constants/StoryConstants',
	'game/nodes/PlayerPositionNode',
	'game/nodes/level/LevelNode',
	'game/nodes/PlayerLocationNode',
	'game/nodes/LastVisitedCampNode',
	'game/nodes/sector/SectorNode',
	'game/nodes/sector/CampNode',
	'game/components/common/CurrentPlayerLocationComponent',
	'game/components/sector/CurrentNearestCampComponent',
	'game/components/sector/LastVisitedCampComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/sector/PassagesComponent',
	'game/components/level/LevelStatusComponent',
	'game/components/common/MovementComponent',
	'game/components/common/PositionComponent',
	'game/components/common/RevealedComponent',
	'game/components/common/CampComponent',
	'game/components/type/LevelComponent',
], function (Ash, Text, GameGlobals, GlobalSignals, GameConstants, LevelConstants, LogConstants, PositionConstants, StoryConstants,
	PlayerPositionNode, LevelNode, PlayerLocationNode, LastVisitedCampNode, SectorNode, CampNode,
	CurrentPlayerLocationComponent, CurrentNearestCampComponent, LastVisitedCampComponent, SectorFeaturesComponent, SectorStatusComponent, PassagesComponent,
	LevelStatusComponent, MovementComponent, PositionComponent,
	RevealedComponent, CampComponent, LevelComponent) {

	var PlayerPositionSystem = Ash.System.extend({

		sectorNodes: null,
		levelNodes: null,
		playerPositionNodes: null,
		playerLocationNodes: null,
		campNodes: null,
		lastVisitedCampNodes: null,

		lastUpdatePosition: null,
		visitedSectorsPendingRevealNeighbours: [],
		mapRevealedSectorsPendingRevealNeighbours: [],

		constructor: function () { },
		
		previousLocation: null,
		currentLocation: null,

		addToEngine: function (engine) {
			this.sectorNodes = engine.getNodeList(SectorNode);
			this.levelNodes = engine.getNodeList(LevelNode);
			this.playerPositionNodes = engine.getNodeList(PlayerPositionNode);
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			this.campNodes = engine.getNodeList(CampNode);
			this.lastVisitedCampNodes = engine.getNodeList(LastVisitedCampNode);

			let sys = this;
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
			GlobalSignals.add(this, GlobalSignals.gameResetSignal, this.onGameStarted);
			GlobalSignals.add(this, GlobalSignals.playerPositionChangedSignal, this.onPlayerPositionChanged);
			GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.onTabChanged);
			GlobalSignals.add(this, GlobalSignals.campBuiltSignal, this.updateCamps);
			GlobalSignals.add(this, GlobalSignals.mapPieceUsedSignal, this.onMapPieceUsed);
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
			this.lastValidPosition = null;
		},
		
		onPlayerPositionChanged: function () {
			this.updateEntities(true);
		},

		onTabChanged: function () {
			this.lastUpdatePosition = null;
			this.lastValidPosition = null;
		},
		
		onMapPieceUsed: function () {
			for (let sectorNode = this.sectorNodes.head; sectorNode; sectorNode = sectorNode.next) {
				let statusComponent = sectorNode.entity.get(SectorStatusComponent);
				if (statusComponent.pendingRevealByMap) {
					statusComponent.revealedByMap = true;
					statusComponent.pendingRevealByMap = false;
					this.mapRevealedSectorsPendingRevealNeighbours.push(sectorNode.entity);
				}
			}
		},

		update: function (time) {
			let playerPos = this.playerPositionNodes.head.position;
			let updateAll = !this.lastUpdatePosition;
			
			if (!this.lastValidPosition) {
				this.updateEntities(updateAll);
			} else if (!this.lastValidPosition.equals(playerPos)) {
				this.updateEntities(updateAll);
			} else {
				this.revealVisitedSectorsNeighbours();
			}
		},

		updateEntities: function (updateAll) {
			let playerPos = this.playerPositionNodes.head.position;
			let playerSector = GameGlobals.levelHelper.getSectorByPosition(playerPos.level, playerPos.sectorX, playerPos.sectorY);
			
			if (playerSector) {
				this.updateLevelEntities(updateAll);
				this.updateSectors(updateAll);
				this.updateCamps();
				this.lastValidPosition = playerPos.clone();
			} else {
				this.handleInvalidPosition();
			}
			this.lastUpdatePosition = playerPos.clone();
		},

		updateLevelEntities: function (updateAll) {
			let playerPos = this.playerPositionNodes.head.position;
			let startPos = playerPos.getPosition();
			let levelpos;
			for (let levelNode = this.levelNodes.head; levelNode; levelNode = levelNode.next) {
				levelpos = levelNode.level.position;
				if (levelpos == playerPos.level && !levelNode.entity.has(CurrentPlayerLocationComponent)) {
					levelNode.entity.add(new CurrentPlayerLocationComponent());
					if (!GameGlobals.levelHelper.isVisited(levelNode.entity)) {
						this.handleNewLevel(levelNode, levelpos);
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
				if (this.lastValidPosition) {
					var previousPlayerSector = GameGlobals.levelHelper.getSectorByPosition(this.lastValidPosition.level, this.lastValidPosition.sectorX, this.lastValidPosition.sectorY);
					this.updateSector(previousPlayerSector);
				}
				this.updateSector(playerSector);
			}
		},

		updateSector: function (sector) {
			if (!sector) return;
			let playerPos = this.playerPositionNodes.head.position;
			if (!playerPos) return;
			let levelpos = sector.get(PositionComponent).level;
			let sectorPos = sector.get(PositionComponent).sectorId();
			let hasLocationComponent = sector.has(CurrentPlayerLocationComponent);

			if (levelpos === playerPos.level && sectorPos === playerPos.sectorId() && !hasLocationComponent) {
				this.setCurrentPlayerLocation(sector);
			} else if ((levelpos !== playerPos.level || sectorPos !== playerPos.sectorId()) && hasLocationComponent) {
				sector.remove(CurrentPlayerLocationComponent);
			}
		},
		
		setCurrentPlayerLocation: function (sector) {
			if (this.playerLocationNodes.head) {
				this.playerLocationNodes.head.entity.remove(CurrentPlayerLocationComponent);
			}
			
			sector.add(new CurrentPlayerLocationComponent());
			
			if (!GameGlobals.sectorHelper.isVisited(sector)) {
				this.handleNewSector(sector, true);
			} else {
				this.handleOldSector(sector, this.currentLocation);
			}
			
			this.previousLocation = this.currentLocation;
			this.currentLocation = sector;
			
			GlobalSignals.playerLocationChangedSignal.dispatch();
		},

		updateCamps: function () {
			let playerPos = this.playerPositionNodes.head.position;
			for (let campNode = this.campNodes.head; campNode; campNode = campNode.next) {
				let hasCurrentCampComponent = campNode.entity.has(CurrentNearestCampComponent);
				let levelpos = campNode.position.level;
				if (levelpos === playerPos.level && !hasCurrentCampComponent) {
					campNode.entity.add(new CurrentNearestCampComponent());
				} else if (levelpos !== playerPos.level && hasCurrentCampComponent) {
					campNode.entity.remove(CurrentNearestCampComponent);
				}
				
				if (playerPos.inCamp && playerPos.equals(campNode.position, true)) {
					this.updateLastVisitedCamp(campNode.entity);
				}
			}
		},
		
		updateLastVisitedCamp: function (entity) {
			if (this.lastVisitedCampNodes.head && this.lastVisitedCampNodes.head.entity == entity) return;
			if (this.lastVisitedCampNodes.head) this.lastVisitedCampNodes.head.entity.remove(LastVisitedCampComponent);
			entity.add(new LastVisitedCampComponent());
		},

		revealVisitedSectorsNeighbours: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			let visitedSector = this.visitedSectorsPendingRevealNeighbours.shift() || this.mapRevealedSectorsPendingRevealNeighbours.shift();
			if (!visitedSector) return;
			this.revealSectorNeighbours(visitedSector);
		},
		
		revealSectorNeighbours: function (sectorEntity) {
			let neighbours = GameGlobals.levelHelper.getSectorNeighboursMap(sectorEntity);
			for (let direction in neighbours) {
				let revealedNeighbour = neighbours[direction];
				if (!revealedNeighbour) continue;
				if (GameGlobals.sectorHelper.isVisited(revealedNeighbour)) continue;
				
				if (!revealedNeighbour.has(RevealedComponent)) {
					revealedNeighbour.add(new RevealedComponent());
					GlobalSignals.sectorRevealedSignal.dispatch();
				}
			}
		},

		handleNewLevel: function (levelNode, levelPos) {
			let levelStatus = levelNode.entity.get(LevelStatusComponent);
			levelStatus.isVisited = true;
			let levelOrdinal = GameGlobals.gameState.getLevelOrdinal(levelPos);
			let campOrdinal = GameGlobals.gameState.getCampOrdinal(levelPos);
			GameGlobals.gameState.level = Math.max(GameGlobals.gameState.level, levelOrdinal);
			gtag('set', { 'max_level': levelOrdinal });
			gtag('event', 'reach_new_level', { event_category: 'progression', value: levelOrdinal});
			gtag('event', 'reach_new_level_time', { event_category: 'game_time', event_label: levelOrdinal, value: GameGlobals.gameState.playTime });
			if (levelPos !== 13) GameGlobals.playerActionFunctions.unlockFeature("levels");
			
			if (this.isGroundLevel(levelPos)) {
				this.showLevelPopup("Ground", this.getGroundMessage());
			}
			
			if (this.isSurfaceLevel(levelPos)) {
				this.showLevelPopup("Surface", this.getSurfaceMessage());
			}
			
			if (levelPos != 13) {
				this.addLogMessage(LogConstants.MSG_ID_ENTER_LEVEL, this.getRegularLevelMessage(levelNode, levelPos));
			}
		},

		getRegularLevelMessage: function (levelNode, levelPos) {			
			let surfaceLevel = GameGlobals.gameState.getSurfaceLevel();
			let groundLevel = GameGlobals.gameState.getGroundLevel();
			
			let playerPos = this.playerPositionNodes.head.position;
			if (playerPos.inCamp) return;

			let msgVO = { textFragments: [], delimiter: "ui.common.sentence_separator" };
			msgVO.textFragments.push({ textKey: "ui.exploration.enter_level_message_intro", textParams: { level: levelPos} });

			let isOddLevel = levelPos % 2 == 1;
			let isRescueActive = GameGlobals.gameState.getStoryFlag(StoryConstants.flags.RESCUE_EXPLORER_LEFT) && !GameGlobals.gameState.getStoryFlag(StoryConstants.flags.RESCUE_EXPLORER_FOUND);
			let isLookingForGroundEscapeActive = GameGlobals.gameState.getStoryFlag(StoryConstants.flags.ESCAPE_SEARCHING_FOR_GROUND);
			let isInvestigatingFall = GameGlobals.gameState.getStoryFlag(StoryConstants.flags.FALL_INVESTIGATING);
			
			if (levelPos == surfaceLevel) {
				msgVO.textFragments.push({ textKey: "ui.exploration.enter_level_surface_message" });
			} else if (levelPos == groundLevel) {
				msgVO.textFragments.push({ textKey: "ui.exploration.enter_level_ground_message" });
			} else if (levelPos == 15) {
				msgVO.textFragments.push({ textKey: "ui.exploration.enter_level_15_message" });
			} else if (!isOddLevel && isRescueActive) {
				msgVO.textFragments.push({ textKey: "ui.exploration.enter_level_rescue_message" });
			} else if (isOddLevel && isLookingForGroundEscapeActive) {
				msgVO.textFragments.push({ textKey: "ui.exploration.enter_level_escape_message" });
			} else if (isOddLevel && isInvestigatingFall && levelPos > 15) {
				msgVO.textFragments.push({ textKey: "ui.exploration.enter_level_fall_message" });
			} else {
				msgVO.textFragments.push({ textKey: "ui.exploration.enter_level_default_message" });
			}
			
			return msgVO;
		},

		handleNewSector: function (sectorEntity, isNew) {
			let statusComponent = sectorEntity.get(SectorStatusComponent);
			
			sectorEntity.remove(RevealedComponent);
			statusComponent.visited = true;

			let sectorPos = sectorEntity.get(PositionComponent);
			let isGround = this.isGroundLevel(sectorPos.level);

			this.visitedSectorsPendingRevealNeighbours.push(sectorEntity);

			if (isNew) {
				GameGlobals.gameState.numVisitedSectors++;
				GameGlobals.playerActionFunctions.unlockFeature("sectors");
				if (isGround) GameGlobals.playerActionFunctions.unlockFeature("ground");
				this.logNewSector(sectorEntity);
				GlobalSignals.sectorVisitedSignal.dispatch();
			}
		},

		logNewSector: function (sectorEntity) {
			let sectorPos = sectorEntity.get(PositionComponent);
			let featuresComponentCurrent = sectorEntity.get(SectorFeaturesComponent);

			let previousSectorEntity = this.previousLocation;

			let levelCampOrdinal = GameGlobals.gameState.getCampOrdinal(sectorPos.level);
			let isLevelCampable = GameGlobals.levelHelper.isLevelCampable(sectorPos.level);

			let isEarlyZone = featuresComponentCurrent.isEarlyZone();
			
			let isSearchingForGreenHouse = 
				GameGlobals.gameState.getStoryFlag(StoryConstants.flags.GREENHOUSE_SEARCHING_FOR_CURE) 
				&& !GameGlobals.gameState.getStoryFlag(StoryConstants.flags.GREENHOUSE_FOUND);

			if (!isLevelCampable && levelCampOrdinal < 6) {
				let levelSectors = GameGlobals.levelHelper.getSectorsByLevel(sectorPos.level);
				let levelVisitedSectors = levelSectors.filter(s => GameGlobals.sectorHelper.isVisited(s));
				if (levelVisitedSectors.length == 15) {
					this.addLogMessage(LogConstants.getUniqueID(), "Another inhospitable street. There won't be a place for a camp on this level.");
					return;
				}
			}
			
			if (previousSectorEntity != null && previousSectorEntity != sectorEntity && isLevelCampable) {
				let featuresComponentPrevious = previousSectorEntity.get(SectorFeaturesComponent);
				
				let isPreviousEarlyZone = featuresComponentPrevious.isEarlyZone();
				if (isPreviousEarlyZone && !isEarlyZone && !GameGlobals.playerHelper.isAffectedByHazardAt(sectorEntity)) {
					this.addLogMessage(LogConstants.MSG_ID_ENTER_OUTSKIRTS, "Entering the outskirts.");
					return;
				}
			}
			
			if (!isEarlyZone && isSearchingForGreenHouse && Math.random() < 0.01) {
				this.addLogMessage(LogConstants.getUniqueID(), "Need to find a Greenhouse.");
				return;
			}
		},

		handleOldSector: function (sector, previousSector) {
			let logAmbient = Math.random() < 0.01;

			if (sector && !sector.has(CampComponent) && previousSector && previousSector.has(CampComponent) && logAmbient) {
				if (GameGlobals.gameState.getStoryFlag(StoryConstants.flags.GREENHOUSE_SEARCHING_FOR_CURE)) {
					this.addLogMessage(LogConstants.getUniqueID(), "Out into the City again. Somewhere out there is a cure waiting to be found.");
				} else if (GameGlobals.gameState.getStoryFlag(StoryConstants.flags.ESCAPE_SEARCHING_FOR_GROUND)) {
					this.addLogMessage(LogConstants.getUniqueID(), "Out into the City again. The camp is comfortable, but you have a goal.");
				} else {
					this.addLogMessage(LogConstants.getUniqueID(), "Out into the City again. The darkness envelops you like water.");
				}
			}
		},

		handleInvalidPosition: function () {
			if (this.playerPositionNodes.head.entity.has(MovementComponent)) return;
			
			let playerPos = this.playerPositionNodes.head.position;
			log.w("Player location could not be found (" + playerPos.level + "." + playerPos.sectorId() + ").");
			if (this.lastValidPosition) {
				log.w("Moving to a known valid position " + this.lastValidPosition);
				GameGlobals.playerHelper.moveTo(this.lastValidPosition.level, this.lastValidPosition.sectorX, this.lastValidPosition.sectorY, this.lastValidPosition.inCamp, "system", false);
			} else {
				let sectors = GameGlobals.levelHelper.getSectorsByLevel(playerPos.level);
				let newPos = sectors[0].get(PositionComponent);
				log.w("Moving to random position " + newPos);
				GameGlobals.playerHelper.moveTo(newPos.level, newPos.sectorX, newPos.sectorY, false, "system", false);
			}
			this.lastUpdatePosition = null;
		},
		
		showLevelPopup: function (title, msg) {
			setTimeout(function () {
				GameGlobals.uiFunctions.showInfoPopup(title, msg, "Continue", null, null, true, false);
			}, 300);
		},

		isGroundLevel: function (level) {
			return level == GameGlobals.gameState.getGroundLevel();
		},

		isSurfaceLevel: function (level) {
			return level == GameGlobals.gameState.getSurfaceLevel();
		},

		getGroundMessage: function () {
			return Text.t("ui.exploration.enter_level_ground_message");
		},

		getSurfaceMessage: function () {
			return Text.t("ui.exploration.enter_level_surface_message");
		},

		addLogMessage: function (msgID, msg) {
			GameGlobals.playerHelper.addLogMessage(msgID, msg);
		},

	});

	return PlayerPositionSystem;
});
