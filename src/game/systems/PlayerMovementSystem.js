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
		
		constructor: function () { },

		addToEngine: function (engine) {
			this.playerPositionNodes = engine.getNodeList(PlayerPositionNode);
			this.playerMovementNodes = engine.getNodeList(PlayerMovementNode);
			this.playerMovementNodes.nodeAdded.add(this.onPlayerMovementNodeAdded, this);
		},

		removeFromEngine: function (engine) {
			this.playerPositionNodes = null;
			this.playerMovementNodes = null;
			this.playerMovementNodes.nodeAdded.remove(this.onPlayerMovementNodeAdded, this);
		},
		
		update: function (time) {
			this.startPendingMovement();
		},
		
		startPendingMovement: function () {
			if (this.currentMovementTarget != null) return;
			if (this.pendingMovementTarget == null) return;
			let position = this.pendingMovementTarget;
			this.movePlayer(position);
			this.pendingMovementTarget = null;
		},
		
		movePlayer: function (position) {
			let player = this.playerPositionNodes.head.entity;
			let playerPositionComponent = this.playerPositionNodes.head.position;
			let oldPosition = playerPositionComponent.getPosition();
			let isCampTransition = oldPosition.inCamp != position.inCamp;
			
			let oldSector = GameGlobals.levelHelper.getSectorByPosition(oldPosition.level, oldPosition.sectorX, oldPosition.sectorY);
			let newSector = GameGlobals.levelHelper.getSectorByPosition(position.level, position.sectorX, position.sectorY);
			let isThemeTransition = oldSector.get(SectorFeaturesComponent).sunlit != newSector.get(SectorFeaturesComponent).sunlit;
			let moveDuration = isThemeTransition ? UIConstants.THEME_TRANSITION_DURATION : 50;
			let blockUI = moveDuration > 100;
			
			log.i("start player movement from [" + oldPosition + "] to: [" + position + "]", this);
			this.currentMovementTarget = position;
			if (blockUI) GameGlobals.gameState.uiStatus.isTransitioning = true;
			GlobalSignals.playerMoveStartedSignal.dispatch(position);
			
			setTimeout(() => {
				log.i("set player position to: [" + position + "]", this);
				playerPositionComponent.level = position.level;
				playerPositionComponent.sectorX = position.sectorX;
				playerPositionComponent.sectorY = position.sectorY;
				
				if (isCampTransition) {
					playerPositionComponent.inCamp = position.inCamp;
					if (position.inCamp) {
						this.enterCamp(position);
					} else {
						this.leaveCamp(position);
					}
				}
				
				GlobalSignals.playerPositionChangedSignal.dispatch(position);
				GameGlobals.uiFunctions.onPlayerPositionChanged();
				
				setTimeout(() => {
					log.i("finish player movement to: [" + position + "]", this);
					player.remove(MovementComponent);
					this.currentMovementTarget = null;
					if (blockUI) GameGlobals.gameState.uiStatus.isTransitioning = false;
					GlobalSignals.playerMoveCompletedSignal.dispatch(position);
					if (isCampTransition) GlobalSignals.saveGameSignal.dispatch(GameConstants.SAVE_SLOT_DEFAULT, false);
				}, moveDuration / 2);
			}, moveDuration / 2);
		},
		
		enterCamp: function (position) {
		 	let sector = GameGlobals.levelHelper.getSectorByPosition(position.level, position.sectorX, position.sectorY);
			
			GameGlobals.resourcesHelper.moveResFromBagToCamp();
			GameGlobals.resourcesHelper.moveCurrencyFromBagToCamp();
			
			this.playerPositionNodes.head.entity.remove(ExcursionComponent);
			GameGlobals.uiFunctions.showTab(GameGlobals.uiFunctions.elementIDs.tabs.in);
			
			GlobalSignals.playerEnteredCampSignal.dispatch();
		},
		
		leaveCamp: function (position) {
		 	let sector = GameGlobals.levelHelper.getSectorByPosition(position.level, position.sectorX, position.sectorY);
			
			this.playerPositionNodes.head.entity.add(new ExcursionComponent());
			GameGlobals.uiFunctions.showTab(GameGlobals.uiFunctions.elementIDs.tabs.out);
			
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
			
			this.pendingMovementTarget = position;
		},

	});

	return PlayerMovementSystem;
});
