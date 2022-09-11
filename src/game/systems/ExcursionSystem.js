define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/nodes/player/PlayerStatsNode',
	'game/components/player/ExcursionComponent',
], function (Ash, GameGlobals, GlobalSignals, GameConstants, PlayerStatsNode, ExcursionComponent) {
	
	var ExcursionSystem = Ash.System.extend({

		constructor: function () { },
		
		playerStatsNodes: null,

		addToEngine: function (engine) {
			this.engine = engine;
			
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
				
			GlobalSignals.add(this, GlobalSignals.playerMovedSignal, this.onPlayerMoved);
		},

		removeFromEngine: function (engine) {
			this.engine = null;
			GlobalSignals.removeAll(this);
		},
		
		onPlayerMoved: function () {
			let excursionComponent = this.playerStatsNodes.head.entity.get(ExcursionComponent);
			if (excursionComponent) {
				excursionComponent.numConsecutiveScavengeUselessSameLocation = 0;
			}
		},
		
	});

	return ExcursionSystem;
});
