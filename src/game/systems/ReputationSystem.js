define([
    'ash',
	'game/constants/GameConstants',
	'game/constants/CampConstants',
	'game/constants/OccurrenceConstants',
	'game/nodes/sector/CampNode',
    'game/components/sector/improvements/SectorImprovementsComponent'
], function (Ash, GameConstants, CampConstants, OccurrenceConstants, CampNode, SectorImprovementsComponent) {
    var ReputationSystem = Ash.System.extend({
	
        gameState: null,
        resourcesHelper: null,
	
		campNodes: null,

        constructor: function (gameState, resourcesHelper) {
            this.gameState = gameState;
            this.resourcesHelper = resourcesHelper;
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
                var accTarget;
				var accRadio;
				
				for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
                    var reputationComponent = campNode.reputation;
                    var sectorImprovements = campNode.entity.get(SectorImprovementsComponent);
                    
                    reputationComponent.accSources = [];
                    reputationComponent.targetValueSources = [];
                    reputationComponent.accumulation = 0;
                    
                    reputationComponent.targetValue = this.getTargetReputation(campNode);
                    
					accRadio = sectorImprovements.getCount(improvementNames.radio) * CampConstants.REPUTATION_PER_RADIO_PER_SEC * GameConstants.gameSpeedCamp;
                    var accTargetDiff = reputationComponent.targetValue - reputationComponent.value;
                    if (Math.abs(accTargetDiff) < 0.01) accTargetDiff = 0;
                    if (accTargetDiff > 0) accTargetDiff = Math.min(10, Math.max(1, accTargetDiff));
                    if (accTargetDiff < 0) accTargetDiff = Math.max(-10, Math.min(-1, accTargetDiff));
                    accTarget = (accTargetDiff < 0 ? accTargetDiff * 0.05 : accTargetDiff * 0.01) * GameConstants.gameSpeedCamp;
					accSpeed = accTarget + accRadio;
                    
					reputationComponent.addChange("Base", accTarget);
					reputationComponent.addChange("Radio", accRadio);
					reputationComponent.accumulation += accSpeed;
				
                    reputationComponent.value += (time + this.engine.extraUpdateTime) * accSpeed;
                    if (accTargetDiff === 0) {
                        reputationComponent.value = reputationComponent.targetValue;
                    } else if (reputationComponent.value > reputationComponent.targetValue && accTargetDiff > 0) {
                        reputationComponent.value = reputationComponent.targetValue;
                    }
                    else if (reputationComponent.value < reputationComponent.targetValue && accTargetDiff < 0) {
                        reputationComponent.value = reputationComponent.targetValue;
                    }
                    reputationComponent.value = Math.max(0, Math.min(100, reputationComponent.value));
                    
                    reputationComponent.isAccumulating = campNode.camp.population > 0 || sectorImprovements.getTotal(improvementTypes.camp) > 0;
				}
			}
        },
        
        getTargetReputation: function (campNode) {
            var sectorImprovements = campNode.entity.get(SectorImprovementsComponent);
            
			var resources = this.resourcesHelper.getCurrentStorage().resources;
            var noFood = resources.getResource(resourceNames.food) <= 0;
            var noWater = resources.getResource(resourceNames.water) <= 0;
            var soldiers = campNode.camp.assignedWorkers.soldier;
            var badDefences = OccurrenceConstants.getRaidDanger(sectorImprovements, soldiers) > 25;
            
            var targetReputation = 0;            
            var allImprovements = sectorImprovements.getAll(improvementTypes.camp);
            for (var i in allImprovements) {
                var improvementVO = allImprovements[i];
                switch (improvementVO.name) {
                    case improvementNames.radio:
                        targetReputation += improvementVO.count;
                        campNode.reputation.addTargetValueSource("Radio", improvementVO.count);
                        break;
                    default:
                        targetReputation += improvementVO.count;
                        campNode.reputation.addTargetValueSource("Buildings", improvementVO.count);
                        break;
                }
            }
            targetReputation = Math.max(0, Math.min(100, targetReputation));
            if (noFood) {
                targetReputation -= 50;
                campNode.reputation.addTargetValueSource("No food", -50);
            }
            if (noWater) {
                targetReputation -= 50;
                campNode.reputation.addTargetValueSource("No water", -50);
            }
            if (badDefences) {
                targetReputation -= 10;
                campNode.reputation.addTargetValueSource("No defences", -10);
            }
            targetReputation = Math.max(0, Math.min(100, targetReputation));
            return targetReputation;
        }
    });

    return ReputationSystem;
});
