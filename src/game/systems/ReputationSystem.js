define([
    'ash',
	'game/constants/GameConstants',
	'game/constants/CampConstants',
	'game/nodes/sector/CampNode',
    'game/components/sector/improvements/SectorImprovementsComponent'
], function (Ash, GameConstants, CampConstants, CampNode, SectorImprovementsComponent) {
    var ReputationSystem = Ash.System.extend({
	
        gameState: null,
	
		campNodes: null,

        constructor: function (gameState) {
            this.gameState = gameState;
        },

        addToEngine: function (engine) {
            this.engine = engine;
            this.campNodes = engine.getNodeList(CampNode);
        },

        removeFromEngine: function (engine) {
            this.campNodes = null;
            this.engine = null;
        },

        update: function (time) {
            if (this.gameState.isPaused) return;
			
			if (this.campNodes.head) {
				var accSpeed = 0;
				var accRadio;
				var accImprovements;
				
				for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
                    var reputationComponent = campNode.reputation;
                    reputationComponent.accSources = [];
                    reputationComponent.accumulation = 0;
            
					var sectorImprovements = campNode.entity.get(SectorImprovementsComponent);
					accImprovements = 0;//0.001 * (sectorImprovements.getTotal(improvementTypes.camp)) * GameConstants.gameSpeedCamp;
					accRadio = accImprovements * sectorImprovements.getCount(improvementNames.radio) * CampConstants.REPUTATION_PER_RADIO_PER_SEC * GameConstants.gameSpeedCamp;
					accSpeed = Math.max(0, accImprovements + accRadio);
                    
					reputationComponent.addChange("Buildings", accImprovements);
					reputationComponent.addChange("Radio", accRadio);
					reputationComponent.accumulation += accSpeed;
				
                    reputationComponent.value += (time + this.engine.extraUpdateTime) * accSpeed;
                    reputationComponent.value = Math.max(0, Math.min(100, reputationComponent.value));
                    reputationComponent.isAccumulating = campNode.camp.population > 0 || sectorImprovements.getTotal(improvementTypes.camp) > 0;
				}
			}
        },
    });

    return ReputationSystem;
});
