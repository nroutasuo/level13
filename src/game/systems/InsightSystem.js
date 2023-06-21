define([
	'ash',
	'game/GameGlobals',
	'game/constants/CampConstants',
	'game/constants/GameConstants',
	'game/constants/UpgradeConstants',
	'game/nodes/player/PlayerStatsNode'
], function (Ash, GameGlobals, CampConstants, GameConstants, UpgradeConstants, PlayerStatsNode) {
	
	var InsightSystem = Ash.System.extend({
	
		gameState: null,
	
		playerStatsNodes: null,
		tribeUpgradesNodes: null,

		constructor: function () {},

		addToEngine: function (engine) {
			this.engine = engine;
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
		},

		removeFromEngine: function (engine) {
			this.playerStatsNodes = null;
			this.tribeUpgradesNodes = null;
			this.engine = null;
		},

		update: function (time) {
			if (GameGlobals.gameState.isPaused) return;
			
			this.updateLimit();
			this.updateValue(time);
		},
		
		updateLimit: function () {
			let insightComponent = this.playerStatsNodes.head.insight;
			insightComponent.maxValue = GameGlobals.tribeHelper.getCurrentInsightLimit();
		},
		
		updateValue: function (time) {
			let insightComponent = this.playerStatsNodes.head.insight;
			
			let oldValue = insightComponent.value;
			
			if (insightComponent.value < 0) {
				insightComponent.value = 0;
			}
			
			if (insightComponent.maxValue > 0 && insightComponent.value > insightComponent.maxValue) {
				insightComponent.value = insightComponent.maxValue;
			}
			
			insightComponent.isAccumulating = insightComponent.value > oldValue;
		},
		
	});

	return InsightSystem;
});
