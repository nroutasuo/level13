define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/MovementConstants',
	'game/constants/PositionConstants',
	'game/constants/ExplorationConstants',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/sector/SectorNode',
	'game/components/player/ExcursionComponent',
], function (Ash, GameGlobals, GlobalSignals, GameConstants, MovementConstants, PositionConstants, ExplorationConstants, PlayerStatsNode, SectorNode, ExcursionComponent) {
	
	let ExcursionSystem = Ash.System.extend({

		constructor: function () { },
		
		playerStatsNodes: null,
		sectorNodes: null,

		addToEngine: function (engine) {
			this.engine = engine;
			
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			this.sectorNodes = engine.getNodeList(SectorNode);
				
			GlobalSignals.add(this, GlobalSignals.playerPositionChangedSignal, this.onPlayerPositionChanged);
			GlobalSignals.add(this, GlobalSignals.playerEnteredCampSignal, this.onPlayerEnteredCamp);
			GlobalSignals.add(this, GlobalSignals.playerLeftCampSignal, this.onPlayerLeftCamp);
		},

		removeFromEngine: function (engine) {
			this.engine = null;
			this.playerStatsNodes = null;
			this.sectorNodes = null;
			GlobalSignals.removeAll(this);
		},

		resetWorldBetweenExcursions: function () {
			for (let node = this.sectorNodes.head; node; node = node.next) {
				for (let i in PositionConstants.getLevelDirections()) {
					let direction = PositionConstants.getLevelDirections()[i];
					let blocker = node.passages.getBlocker(direction);
					if (!blocker) continue;
					if (blocker.type != MovementConstants.BLOCKER_TYPE_TOLL_GATE) continue;
					node.status.unsetBlockerCleared(direction, blocker.type);
				}
			}
		},
		
		onPlayerPositionChanged: function (newPosition, oldPosition, action) {
			let excursionComponent = this.playerStatsNodes.head.entity.get(ExcursionComponent);
			if (!excursionComponent) return;
			
			excursionComponent.numConsecutiveScavengeUselessSameLocation = 0;

			if (!newPosition.inCamp && !oldPosition.inCamp) {
				excursionComponent.numSteps++;

				if (action && action.startsWith("move_sector_grit")) {
					excursionComponent.numGritSteps++;
				}

				if (excursionComponent.numSteps == ExplorationConstants.MIN_EXCURSION_LENGTH) {
					GameGlobals.gameState.increaseGameStatSimple("numExcursionsStarted");
				}

				if (excursionComponent.numSteps >= ExplorationConstants.MIN_EXCURSION_LENGTH) {
					GameGlobals.gameState.increaseGameStatHighScore("longestExcrusion", newPosition.level, excursionComponent.numSteps);
				}
			}
		},

		onPlayerLeftCamp: function () {
			this.resetWorldBetweenExcursions();
		},

		onPlayerEnteredCamp: function () {
			this.resetWorldBetweenExcursions();
		}
		
	});

	return ExcursionSystem;
});
