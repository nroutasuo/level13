define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/ExplorerConstants',
	'game/constants/ExplorationConstants',
	'game/nodes/player/PlayerStatsNode',
	'game/components/player/ExcursionComponent',
], function (Ash, GameGlobals, GlobalSignals, GameConstants, ExplorerConstants, ExplorationConstants, PlayerStatsNode, ExcursionComponent) {
	
	let ExcursionSystem = Ash.System.extend({

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
		
		onPlayerPositionChanged: function (newPosition, oldPosition, action) {
			if (newPosition.inCamp && !oldPosition.inCamp) {
				this.updateExplorersTrust();
			}

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

		updateExplorersTrust: function () {
			let explorers = this.playerStatsNodes.head.explorers.getParty();
			for (let i = 0; i < explorers.length; i++) {
				let explorerVO = explorers[i];
				this.updateExplorerTrust(explorerVO);
			}
		},

		updateExplorerTrust: function (explorerVO) {
			let isFighter = ExplorerConstants.isFighter(explorerVO);

			let fightThresholds = isFighter ? [ 1, 10, 50 ] : [ 0, 0, 0 ]
			let stepThresholds = [ 30, 100, 500 ];
			let excursionTresholds = [ 2, 10, 50 ];

			for (let i = 1; i <= 3; i++) {
				if (explorerVO.numFights < fightThresholds[i]) break;
				if (explorerVO.numSteps < stepThresholds[i]) break;
				if (explorerVO.numExcursions < excursionTresholds[i]) break;
				explorerVO.trust = i;
			}
		},
		
	});

	return ExcursionSystem;
});
