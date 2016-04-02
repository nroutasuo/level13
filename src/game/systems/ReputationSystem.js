define([
    'ash',
	'game/constants/GameConstants',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/sector/CampNode',
    'game/components/sector/improvements/SectorImprovementsComponent'
], function (Ash, GameConstants, PlayerStatsNode, CampNode, SectorImprovementsComponent) {
    var ReputationSystem = Ash.System.extend({
	
        gameState: null,
	
        playerStatsNodes: null,
		campNodes: null,

        constructor: function (gameState) {
            this.gameState = gameState;
        },

        addToEngine: function (engine) {
            this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
            this.campNodes = engine.getNodeList(CampNode);
        },

        removeFromEngine: function (engine) {
            this.playerStatsNodes = null;
            this.campNodes = null;
        },

        update: function (time) {
            if (this.gameState.isPaused) return;
			var reputationComponent = this.playerStatsNodes.head.reputation;
			reputationComponent.accSources = [];
			reputationComponent.accumulation = 0;
			
			if (this.campNodes.head) {
				var accSpeed = 0;
				var limit = 0;
				var accRadio;
				var accImprovements;
				
				for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
					var sectorImprovements = campNode.entity.get(SectorImprovementsComponent);
					accImprovements = 0.001 * (sectorImprovements.getTotal(improvementTypes.camp)) * GameConstants.gameSpeed;
					accRadio = accImprovements * sectorImprovements.getCount(improvementNames.radio) * 0.5 * GameConstants.gameSpeed;
					accSpeed = Math.max(0, accImprovements + accRadio);
					limit += 100;
					reputationComponent.addChange("Buildings", accImprovements);
					reputationComponent.addChange("Radio", accRadio);
					reputationComponent.accumulation += accSpeed;
				}
				
				reputationComponent.limit = limit;
				reputationComponent.value += time * accSpeed;
				reputationComponent.value = Math.min(limit, reputationComponent.value);
				reputationComponent.isAccumulating = true;
			}
        },
    });

    return ReputationSystem;
});
