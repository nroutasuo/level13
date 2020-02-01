define([
    'ash',
    'game/GameGlobals',
	'game/constants/GameConstants',
	'game/constants/CampConstants',
	'game/constants/LogConstants',
	'game/constants/OccurrenceConstants',
	'game/nodes/sector/CampNode',
    'game/nodes/PlayerPositionNode',
	'game/nodes/tribe/TribeUpgradesNode',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/components/common/LogMessagesComponent',
    'game/components/type/LevelComponent',
], function (Ash, GameGlobals, GameConstants, CampConstants, LogConstants, OccurrenceConstants, CampNode, PlayerPositionNode, TribeUpgradesNode,
    SectorImprovementsComponent, LogMessagesComponent, LevelComponent) {
    var ReputationSystem = Ash.System.extend({
	
        playerNodes: null,
		campNodes: null,
        tribeUpgradeNodes: null,
        
        lastUpdatePenalties: {},

        constructor: function () {
        },

        addToEngine: function (engine) {
            this.engine = engine;
            this.playerNodes = engine.getNodeList(PlayerPositionNode);
            this.campNodes = engine.getNodeList(CampNode);
            this.tribeUpgradeNodes = engine.getNodeList(TribeUpgradesNode);
        },

        removeFromEngine: function (engine) {
            this.playerNodes = null;
            this.campNodes = null;
            this.tribeUpgradeNodes = null;
            this.engine = null;
        },

        update: function (time) {
            if (GameGlobals.gameState.isPaused) return;
            
			if (this.campNodes.head) {
				for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
                    var reputationComponent = campNode.reputation;
                    var sectorImprovements = campNode.entity.get(SectorImprovementsComponent);
                    
                    reputationComponent.accSources = [];
                    reputationComponent.targetValueSources = [];
                    reputationComponent.accumulation = 0;
                    
                    reputationComponent.targetValue = this.getTargetReputation(campNode);
                    
					this.applyReputationAccumulation(campNode, time);
                    
                    reputationComponent.value = Math.max(0, reputationComponent.value);
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
                        var generatorBonus = numHouses * CampConstants.REPUTATION_PER_HOUSE_FROM_GENERATOR * (1 + improvementVO.level * 0.02);
                        generatorBonus = Math.round(generatorBonus * 100) / 100;
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
            var storage = GameGlobals.resourcesHelper.getCurrentCampStorage(campNode.entity);
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
            this.logReputationPenalty(campNode, CampConstants.REPUTATION_PENALTY_TYPE_FOOD, noFood);
            this.logReputationPenalty(campNode, CampConstants.REPUTATION_PENALTY_TYPE_WATER, noWater);
            
            // penalties: defences
            var defenceLimit = CampConstants.REPUTATION_PENALTY_DEFENCES_THRESHOLD;
            var soldiers = campNode.camp.assignedWorkers.soldier;
            var soldierLevel = GameGlobals.upgradeEffectsHelper.getWorkerLevel("soldier", this.tribeUpgradeNodes.head.upgrades);
            var danger = OccurrenceConstants.getRaidDanger(sectorImprovements, soldiers, soldierLevel);
            var noDefences = danger > defenceLimit;
            if (noDefences) {
                var steppedDanger = Math.ceil((danger - defenceLimit) * 100 / 5) * 5;
                var penaltyRatio = steppedDanger / (100 - defenceLimit);
                var defencePenalty = Math.ceil(targetReputationWithoutPenalties * penaltyRatio * 4) / 4;
                if (penaltyRatio > 0.25) {
                    addValue(-defencePenalty, "Terrible defences");
                } else if (penaltyRatio > 0.15) {
                    addValue(-defencePenalty, "Poor defences");
                } else {
                    addValue(-defencePenalty, "Inadequate defences");
                }
            }
            this.logReputationPenalty(campNode, CampConstants.REPUTATION_PENALTY_TYPE_DEFENCES, noDefences);
            
            // penalties: over-crowding
            var housingCap = CampConstants.getHousingCap(sectorImprovements);
            var population = Math.floor(campNode.camp.population);
            var noHousing = population > housingCap;
            if (noHousing) {
                var housingPenaltyRatio = Math.ceil((population - housingCap) / population * 20) / 20;
                var housingPenalty = Math.ceil(targetReputationWithoutPenalties * housingPenaltyRatio);
                addValue(-housingPenalty, "Overcrowding");
            }
            this.logReputationPenalty(campNode, CampConstants.REPUTATION_PENALTY_TYPE_HOUSING, noHousing);
            
            // penalties: level population
            var levelVO = GameGlobals.levelHelper.getLevelEntityForSector(campNode.entity).get(LevelComponent).levelVO;
            if (levelVO.populationGrowthFactor < 1) {
                var levelPopPenalty = targetReputationWithoutPenalties * (1 - levelVO.populationGrowthFactor);
                addValue(-levelPopPenalty, "Level population");
            }
            this.logReputationPenalty(campNode, CampConstants.REPUTATION_PENALTY_TYPE_LEVEL_POP, levelVO.populationGrowthFactor < 1);
            
            return Math.max(0, targetReputation);
        },
        
        applyReputationAccumulation: function (campNode, time) {
            var reputationComponent = campNode.reputation;
            var sectorImprovements = campNode.entity.get(SectorImprovementsComponent);
            var levelVO = GameGlobals.levelHelper.getLevelEntityForSector(campNode.entity).get(LevelComponent).levelVO;
            
            // improvements
            var accRadio = sectorImprovements.getCount(improvementNames.radio) * CampConstants.REPUTATION_PER_RADIO_PER_SEC * GameConstants.gameSpeedCamp;
            var accTargetDiff = reputationComponent.targetValue - reputationComponent.value;
            if (Math.abs(accTargetDiff) < 0.01) accTargetDiff = 0;
            if (accTargetDiff > 0) accTargetDiff = Math.min(10, Math.max(1, accTargetDiff));
            if (accTargetDiff < 0) accTargetDiff = Math.max(-10, Math.min(-1, accTargetDiff));
            var accTarget = (accTargetDiff < 0 ? accTargetDiff * 0.05 : accTargetDiff * 0.01) * GameConstants.gameSpeedCamp;
            
            // level population factor
            var accLevelPop = 0;
            if (accTarget > 0) {
                accLevelPop += accTarget * levelVO.populationGrowthFactor - accTarget;
                accTarget *= levelVO.populationGrowthFactor;
            }
            if (accRadio > 0) {
                accLevelPop += accRadio * levelVO.populationGrowthFactor - accRadio;
                accRadio *= levelVO.populationGrowthFactor;
            }
            
            // limits
            var accSpeed = accTarget + accRadio;
            accSpeed = Math.max(-0.05, accSpeed);
            accSpeed = Math.min(0.05, accSpeed);
                    
            // set accumulation
            reputationComponent.addChange("Base", accTarget);
            reputationComponent.addChange("Radio", accRadio);
            if (accLevelPop) {
                reputationComponent.addChange("Level population", accLevelPop)
            }
            reputationComponent.accumulation += accSpeed;
            
            // apply accumulation
            reputationComponent.value += time * accSpeed;
            if (accTargetDiff === 0) {
                reputationComponent.value = reputationComponent.targetValue;
            } else if (reputationComponent.value > reputationComponent.targetValue && accTargetDiff > 0) {
                reputationComponent.value = reputationComponent.targetValue;
            }
            else if (reputationComponent.value < reputationComponent.targetValue && accTargetDiff < 0) {
                reputationComponent.value = reputationComponent.targetValue;
            }
        },
        
        logReputationPenalty: function (campNode, penaltyType, hasPenalty) {
            if (GameGlobals.gameState.uiStatus.isHidden) return;
            var campID = campNode.position.getPosition().toString();
            if (!(this.lastUpdatePenalties[campID])) {
                this.lastUpdatePenalties[campID] = {};
            }
            var hadPenalty = this.lastUpdatePenalties[campID][penaltyType];
            if (hasPenalty === hadPenalty) return;
            
            if (hasPenalty && !hadPenalty) {
                var playerPosition = this.playerNodes.head.position;
                var campPosition = campNode.position;
                if (playerPosition.level === campNode.position.level && playerPosition.sectorId() === campPosition.sectorId()) {
                    var logComponent = this.playerNodes.head.entity.get(LogMessagesComponent);
                    switch (penaltyType) {
                        case CampConstants.REPUTATION_PENALTY_TYPE_DEFENCES:
                            logComponent.addMessage(LogConstants.MSG_ID_REPUTATION_PENALTY_DEFENCES, "People are anxious. They say the camp needs better defences.");
                            break;
                        case CampConstants.REPUTATION_PENALTY_TYPE_HOUSING:
                            logComponent.addMessage(LogConstants.MSG_ID_REPUTATION_PENALTY_HOUSING, "People are unhappy because the camp is over-crowded.");
                            break;
                    }
                }
            }
            this.lastUpdatePenalties[campID][penaltyType] = hasPenalty;
        },
    });

    return ReputationSystem;
});
