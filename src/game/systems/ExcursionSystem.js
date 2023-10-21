define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/ExplorationConstants',
	'game/nodes/player/PlayerStatsNode',
	'game/components/player/ExcursionComponent',
], function (Ash, GameGlobals, GlobalSignals, GameConstants, ExplorationConstants, PlayerStatsNode, ExcursionComponent) {
	
	var ExcursionSystem = Ash.System.extend({

		constructor: function () { },
		
		playerStatsNodes: null,

		addToEngine: function (engine) {
			this.engine = engine;
			
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
				
			GlobalSignals.add(this, GlobalSignals.playerPositionChangedSignal, this.onPlayerPositionChanged);
		},

		removeFromEngine: function (engine) {
			this.engine = null;
			GlobalSignals.removeAll(this);
		},
		
		onPlayerPositionChanged: function (newPosition, oldPosition) {
			let excursionComponent = this.playerStatsNodes.head.entity.get(ExcursionComponent);
			if (!excursionComponent) return;
			
			excursionComponent.numConsecutiveScavengeUselessSameLocation = 0;

			if (!newPosition.inCamp && !oldPosition.inCamp) {
				excursionComponent.numSteps++;

				if (excursionComponent.numSteps == ExplorationConstants.MIN_EXCURSION_LENGTH) {
					GameGlobals.gameState.increaseGameStatSimple("numExcursionsStarted");
				}
			}
		},
		
	});

	return ExcursionSystem;
});
