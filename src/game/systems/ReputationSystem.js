define([
    'ash',
	'game/constants/GameConstants',
	'game/constants/CampConstants',
	'game/constants/OccurrenceConstants',
	'game/nodes/sector/CampNode',
	'game/nodes/tribe/TribeUpgradesNode',
    'game/components/sector/improvements/SectorImprovementsComponent'
], function (Ash, GameConstants, CampConstants, OccurrenceConstants, CampNode, TribeUpgradesNode, SectorImprovementsComponent) {
    var ReputationSystem = Ash.System.extend({
	
        gameState: null,
        resourcesHelper: null,
        upgradeEffectsHelper: null,
	
		campNodes: null,
        tribeUpgradeNodes: null,

        constructor: function (gameState, resourcesHelper, upgradeEffectsHelper) {
            this.gameState = gameState;
            this.resourcesHelper = resourcesHelper;
            this.upgradeEffectsHelper = upgradeEffectsHelper;
        },

        addToEngine: function (engine) {
            this.engine = engine;
            this.campNodes = engine.getNodeList(CampNode);
            this.tribeUpgradeNodes = engine.getNodeList(TribeUpgradesNode);
        },

        removeFromEngine: function (engine) {
            this.campNodes = null;
            this.engine = null;
            this.tribeUpgradeNodes = null;
        },

        update: function (time) {
            if (this.gameState.isPaused) return;
			
			if (this.campNodes.head) {				
				for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
                    var reputationComponent = campNode.reputation;
                    var sectorImprovements = campNode.entity.get(SectorImprovementsComponent);
                    
                    reputationComponent.accSources = [];
                    reputationComponent.targetValueSources = [];
                    reputationComponent.accumulation = 0;
                    
                    reputationComponent.targetValue = this.getTargetReputation(campNode);
                    
					this.applyReputationAccumulation(campNode, time);
                    
                    reputationComponent.value = Math.max(0, Math.min(100, reputationComponent.value));
                    
                    reputationComponent.isAccumulating = campNode.camp.population > 0 || sectorImprovements.getTotal(improvementTypes.camp) > 0;
				}
			}
        },
        
        getTargetReputation: function (campNode) {
            var sectorImprovements = campNode.entity.get(SectorImprovementsComponent);
            var targetReputation = 0;
            
            var addValue = function (value, name) {
                targetReputation += value;
                campNode.reputation.addTargetValueSource(name, value);                
            };
            
            // base: building happiness values
            var allImprovements = sectorImprovements.getAll(improvementTypes.camp);
            for (var i in allImprovements) {
                var improvementVO = allImprovements[i];
                var defaultBonus = improvementVO.getReputationBonus();
                switch (improvementVO.name) {
                    case improvementNames.generator:
                        var numHouses = sectorImprovements.getCount(improvementNames.house) + sectorImprovements.getCount(improvementNames.house2);
                        var generatorBonus = numHouses * CampConstants.REPUTATION_PER_HOUSE_FROM_GENERATOR;
                        addValue(generatorBonus, "Generator");
                        break;
                    case improvementNames.radio:
                        addValue(improvementVO.count * defaultBonus, "Radio");
                        break;
                    default:
                        addValue(improvementVO.count * defaultBonus, "Buildings");
                        break;
                }
            }
            
            var targetReputationWithoutPenalties = targetReputation;
            
            // penalties: food and water            
            var storage = this.resourcesHelper.getCurrentStorage(true);
			var resources = storage ? storage.resources : null;
            var noFood = resources && resources.getResource(resourceNames.food) <= 0;
            var noWater = resources && resources.getResource(resourceNames.water) <= 0;
            var penalty = Math.max(5, Math.ceil(targetReputationWithoutPenalties));
            if (noFood) {
                addValue(-penalty, "No food");
            }
            if (noWater) {
                addValue(-penalty, "No water");
            }
            
            // penalties: defences            
            var defenceLimit = 25;
            var soldiers = campNode.camp.assignedWorkers.soldier;
            var fortificationUpgradeLevel = this.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.fortification, this.tribeUpgradeNodes.head.upgrades);
            var danger = OccurrenceConstants.getRaidDanger(sectorImprovements, soldiers, fortificationUpgradeLevel);
            if (danger > defenceLimit) {
                var steppedDanger = Math.ceil(danger / 5) * 5;
                var penaltyRatio = (steppedDanger - defenceLimit) / 200;
                var defencePenalty = Math.ceil(targetReputationWithoutPenalties * penaltyRatio);
                if (steppedDanger >= 75) {
                    addValue(-defencePenalty, "Terrible defences");
                } else if (steppedDanger >= 0) {
                    addValue(-defencePenalty, "Poor defences");
                } else {
                    addValue(-defencePenalty, "Inadequate defences");
                }
            }
            
            // penalties: over-crowding
            var housingCap = sectorImprovements.getCount(improvementNames.house) * CampConstants.POPULATION_PER_HOUSE;
            housingCap += sectorImprovements.getCount(improvementNames.house2) * CampConstants.POPULATION_PER_HOUSE2;
            var population = Math.floor(campNode.camp.population);
            if (population > housingCap) {
                var housingPenaltyRatio = Math.ceil((population - housingCap) / population * 20) / 20;
                var housingPenalty = Math.ceil(targetReputationWithoutPenalties * housingPenaltyRatio);
                addValue(-housingPenalty, "Overcrowding");
            }
            return Math.max(0, targetReputation);
        },
        
        applyReputationAccumulation: function (campNode, time) {
            var reputationComponent = campNode.reputation;
            var sectorImprovements = campNode.entity.get(SectorImprovementsComponent);
            
            var accRadio = sectorImprovements.getCount(improvementNames.radio) * CampConstants.REPUTATION_PER_RADIO_PER_SEC * GameConstants.gameSpeedCamp;
            var accTargetDiff = reputationComponent.targetValue - reputationComponent.value;
            if (Math.abs(accTargetDiff) < 0.01) accTargetDiff = 0;
            if (accTargetDiff > 0) accTargetDiff = Math.min(10, Math.max(1, accTargetDiff));
            if (accTargetDiff < 0) accTargetDiff = Math.max(-10, Math.min(-1, accTargetDiff));
            var accTarget = (accTargetDiff < 0 ? accTargetDiff * 0.05 : accTargetDiff * 0.01) * GameConstants.gameSpeedCamp;
            var accSpeed = accTarget + accRadio;
                    
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
        },
    });

    return ReputationSystem;
});
