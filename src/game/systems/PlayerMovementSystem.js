// a system that actually moves the player from one location to another (updates player's PositionComponent based on MovementComponent)

define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/PositionConstants',
	'game/constants/UIConstants',
	'game/nodes/player/PlayerMovementNode',
	'game/nodes/PlayerPositionNode',
	'game/components/common/CampComponent',
	'game/components/common/MovementComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/player/ExcursionComponent',
	'game/vos/PositionVO',
], function (Ash, GameGlobals, GlobalSignals, GameConstants, PositionConstants, UIConstants, PlayerMovementNode, PlayerPositionNode, CampComponent, MovementComponent, SectorFeaturesComponent, ExcursionComponent, PositionVO) {

	let PlayerMovementSystem = Ash.System.extend({
		
		context: "PlayerMovementSystem",

		playerPositionNodes: null,
		playerMovementNodes: null,
		
		currentMovementTarget: null,
		pendingMovementTarget: null,

		pendingMovementAction: null,
		
		constructor: function () { },

		addToEngine: function (engine) {
			this.playerPositionNodes = engine.getNodeList(PlayerPositionNode);
			this.playerMovementNodes = engine.getNodeList(PlayerMovementNode);
			this.playerMovementNodes.nodeAdded.add(this.onPlayerMovementNodeAdded, this);
		},

		removeFromEngine: function (engine) {
			this.playerPositionNodes = null;
			this.playerMovementNodes.nodeAdded.remove(this.onPlayerMovementNodeAdded, this);
			this.playerMovementNodes = null;
		},
		
		update: function (time) {
			this.startPendingMovement();
		},
		
		startPendingMovement: function () {
			if (this.currentMovementTarget != null) return;
			if (this.pendingMovementTarget == null) return;
			let position = this.pendingMovementTarget;
			let action = this.pendingMovementAction;
			this.movePlayer(position, false, action);
			this.pendingMovementTarget = null;
			this.pendingMovementAction = null;
		},
		
		movePlayer: function (position, isInstant, action) {
			let playerPositionComponent = this.playerPositionNodes.head.position;
			let oldPosition = playerPositionComponent.getPosition();
			let isCampTransition = oldPosition.inCamp != position.inCamp;
			let isCampToCampTransition = oldPosition.level != position.level && oldPosition.inCamp && position.inCamp;

			if (isCampTransition || isCampToCampTransition) {
				GlobalSignals.markLogMessagesSeenSignal.dispatch();
			}
			
			let oldSector = GameGlobals.levelHelper.getSectorByPosition(oldPosition.level, oldPosition.sectorX, oldPosition.sectorY);
			let newSector = GameGlobals.levelHelper.getSectorByPosition(position.level, position.sectorX, position.sectorY);
			let isThemeTransition = oldSector.get(SectorFeaturesComponent).sunlit != newSector.get(SectorFeaturesComponent).sunlit;
			let moveDuration = isThemeTransition ? UIConstants.THEME_TRANSITION_DURATION : 50;
			let blockUI = moveDuration > 100;
			
			this.startPlayerMovement(oldPosition, position, blockUI);

			if (isInstant) {
				this.setPlayerPosition(oldPosition, position, isCampTransition, isCampToCampTransition, action);
				this.updateStatsAfterMove(position, oldSector, newSector);
				this.completePlayerMovement(position, blockUI, isCampTransition);
				return;
			}

			let sys = this;
			
			setTimeout(() => {
				this.setPlayerPosition(oldPosition, position, isCampTransition, isCampToCampTransition, action);
				this.updateStatsAfterMove(position, oldSector, newSector);
				
				setTimeout(() => {
					sys.completePlayerMovement(position, blockUI, isCampTransition);
				}, moveDuration / 2);
			}, moveDuration / 2);
		},

		startPlayerMovement: function (oldPosition, position, blockUI) {
			log.i("start player movement from [" + oldPosition + "] to: [" + position + "]", this);
			this.currentMovementTarget = position;
			if (blockUI) GameGlobals.gameState.uiStatus.isTransitioning = true;
			GlobalSignals.playerMoveStartedSignal.dispatch(position);
		},

		setPlayerPosition: function (oldPosition, position, isCampTransition, isCampToCampTransition, action) {
			let playerPositionComponent = this.playerPositionNodes.head.position;

			log.i("set player position to: [" + position + "]", this);
			playerPositionComponent.level = position.level;
			playerPositionComponent.sectorX = position.sectorX;
			playerPositionComponent.sectorY = position.sectorY;

			if (isCampTransition) {
				GlobalSignals.triggerSoundSignal.dispatch(UIConstants.soundTriggerIDs.moveTransition);
			} else {
				GlobalSignals.triggerSoundSignal.dispatch(UIConstants.soundTriggerIDs.moveNormal);
			}
				
			if (isCampTransition) {
				playerPositionComponent.inCamp = position.inCamp;
				if (position.inCamp) {
					this.enterCamp(position);
				} else {
					this.leaveCamp(position);
				}
			} else if (isCampToCampTransition) {
				GameGlobals.uiFunctions.showTab(GameGlobals.uiFunctions.elementIDs.tabs.in, {}, true);
			}
			
			GlobalSignals.playerPositionChangedSignal.dispatch(position, oldPosition, action);
			if (!oldPosition || oldPosition.level != position.level) GlobalSignals.playerEnteredLevelSignal.dispatch(position.level);
			GameGlobals.uiFunctions.onPlayerPositionChanged();
		},

		updateStatsAfterMove: function (position, oldSector, newSector) {
			let pathToCamp = GameGlobals.playerActionsHelper.getPathToNearestCamp();
			let distanceToCamp = pathToCamp ? pathToCamp.length : -1;
			let distanceToCenter = PositionConstants.getDistanceTo(position, new PositionVO(position.level, 0, 0, false));

			GameGlobals.gameState.increaseGameStatHighScore("mostDistantSectorFromCampVisited", position, distanceToCamp);
			GameGlobals.gameState.increaseGameStatHighScore("mostDistantSectorFromCenterVisited", position, distanceToCenter);
			if (newSector.get(SectorFeaturesComponent).sunlit) GameGlobals.playerActionFunctions.unlockFeature("sunlight");
		},

		completePlayerMovement: function (position, blockUI, isCampTransition) {
			let player = this.playerPositionNodes.head.entity;

			log.i("finish player movement to: [" + position + "]", this);
			player.remove(MovementComponent);
			this.currentMovementTarget = null;

			if (blockUI) GameGlobals.gameState.uiStatus.isTransitioning = false;
			GlobalSignals.playerMoveCompletedSignal.dispatch(position);
			if (isCampTransition) GlobalSignals.saveGameSignal.dispatch(GameConstants.SAVE_SLOT_DEFAULT, false);
		},
		
		enterCamp: function (position) {			
			GameGlobals.resourcesHelper.moveResFromBagToCamp();
			GameGlobals.resourcesHelper.moveCurrencyFromBagToCamp();
			
			this.playerPositionNodes.head.entity.remove(ExcursionComponent);
			GameGlobals.uiFunctions.showTab(GameGlobals.uiFunctions.elementIDs.tabs.in, {}, true);
			
			GlobalSignals.playerEnteredCampSignal.dispatch();
		},
		
		leaveCamp: function (position) {
		 	let sector = GameGlobals.levelHelper.getSectorByPosition(position.level, position.sectorX, position.sectorY);
			
			this.playerPositionNodes.head.entity.add(new ExcursionComponent());
			GameGlobals.uiFunctions.showTab(GameGlobals.uiFunctions.elementIDs.tabs.out, {}, true);
			
			if (GameGlobals.playerHelper.isReadyForExploration()) {
				GameGlobals.playerActionFunctions.unlockFeature("move");
			}
			
			GlobalSignals.playerLeftCampSignal.dispatch();
		},
		
		isValidPosition: function (position) {
		 	let sector = GameGlobals.levelHelper.getSectorByPosition(position.level, position.sectorX, position.sectorY);
			if (!sector) return false;
			if (position.inCamp && !sector.has(CampComponent)) return false;
			return true;
		},
		
		onPlayerMovementNodeAdded: function (node) {
			let position = node.movement.getPosition();
			let action = node.movement.action || null;
			
			log.i("player movement node added: " + position, this);
			
			if (!this.isValidPosition(position)) {
				log.w("tried to move to an invalid position: " + position);
				node.entity.remove(MovementComponent);
				return;
			}
			
			if (this.pendingMovementTarget != null) {
				log.w("tried to move while a move was already pending: " + position);
				return;
			}
			
			if (this.currentMovementTarget != null) {
				log.w("tried to move while already moving: " + position);
				return;
			}

			let isInstant = node.movement.isInstant;
			if (isInstant) {
				this.movePlayer(position, true, action);
				return;
			}
			
			this.pendingMovementTarget = position;
			this.pendingMovementAction = action;
		},

	});

	return PlayerMovementSystem;
});
