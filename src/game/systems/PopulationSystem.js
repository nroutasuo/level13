define([
    'ash',
    'utils/MathUtils',
	'game/constants/GameConstants',
	'game/constants/LogConstants',
	'game/constants/CampConstants',
    'game/nodes/sector/CampNode',
    'game/nodes/player/PlayerStatsNode',
    'game/components/type/LevelComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/components/common/PositionComponent',
    'game/components/common/LogMessagesComponent',
], function (Ash, MathUtils, GameConstants, LogConstants, CampConstants, CampNode, PlayerStatsNode, LevelComponent, SectorImprovementsComponent, PositionComponent, LogMessagesComponent) {
    var PopulationSystem = Ash.System.extend({
	
        campNodes: null,
        playerNodes: null,
		
		lastPopulationIncreaseTimestamps: [],

        constructor: function (gameState, levelHelper) {
            this.gameState = gameState;
            this.levelHelper = levelHelper;
        },

        addToEngine: function (engine) {
            this.engine = engine;
            this.campNodes = engine.getNodeList(CampNode);
            this.playerNodes = engine.getNodeList(PlayerStatsNode);
        },

        removeFromEngine: function (engine) {
            this.campNodes = null;
            this.playerNodes = null;
            this.engine = null;
        },

        update: function (time) {
            if (this.gameState.isPaused) return;
            for (var node = this.campNodes.head; node; node = node.next) {
                this.updateNode(node, time + this.engine.extraUpdateTime);
            }
        },

        updateNode: function (node, time) {
			var camp = node.camp;
			
			this.updatePopulationCooldown(node);
			
			if (camp.populationCooldownSec === 0) {
                this.updatePopulation(node, time);
            } else {
                camp.populationChangePerSec = 0;
            }
        },
        
        updatePopulationCooldown: function (node) {
			var campPosition = node.entity.get(PositionComponent);
			var level = campPosition.level;
            var timeStamp = new Date().getTime();
            var cooldownMillis = CampConstants.POPULATION_COOLDOWN_SECONDS * 1000 / GameConstants.gameSpeedCamp;
			var lastIncreaseTimeStamp = this.lastPopulationIncreaseTimestamps[level] ? this.lastPopulationIncreaseTimestamps[level] : 0;
            node.camp.populationCooldownSec = Math.max(0, (cooldownMillis - (timeStamp - lastIncreaseTimeStamp)) / 1000);
        },
        
        updatePopulation: function (node, time) {
			var camp = node.camp;

            var changePerSec = this.getPopulationChangePerSec(node);
            var change = time * changePerSec * GameConstants.gameSpeedCamp;
            
            var oldPopulation = camp.population;
            var newPopulation = oldPopulation + change;

			var improvements = node.entity.get(SectorImprovementsComponent);
            var housingCap = improvements.getCount(improvementNames.house) * CampConstants.POPULATION_PER_HOUSE;
            housingCap += improvements.getCount(improvementNames.house2) * CampConstants.POPULATION_PER_HOUSE2;
            
            newPopulation = MathUtils.clamp(newPopulation, 0, housingCap);
            change = newPopulation - oldPopulation;
            changePerSec = change / time / GameConstants.gameSpeedCamp;
            
            camp.addPopulation(change);
            camp.populationChangePerSec = changePerSec;

            if (Math.floor(camp.population) !== Math.floor(oldPopulation)) {
                this.handlePopulationChange(node, camp.population > oldPopulation);
            }
        },
        
        getPopulationChangePerSec: function (node) {
			var camp = node.camp;
			var reputation = node.reputation.value;
            var levelVO = this.levelHelper.getLevelEntityForSector(node.entity).get(LevelComponent).levelVO;
            var reqRepCurPop = CampConstants.getRequiredReputation(Math.floor(camp.population));
            var reqRepNextPop = CampConstants.getRequiredReputation(Math.floor(camp.population) + 1);
            
            var changePerSec;
            if (reputation >= reqRepCurPop && reputation < reqRepNextPop) {
                changePerSec = 0;
            } else if (reputation >= reqRepNextPop) {
                var repDiffValue = (reputation - reqRepNextPop) / 100 / 50;
                var popValue = 1 / Math.floor(camp.population+1) / 100;
                changePerSec = repDiffValue + popValue;
            } else {
                changePerSec = MathUtils.clamp((reputation - reqRepCurPop)/60/60, -1/60/5, -1/60/30);
            }

            changePerSec *= levelVO.populationGrowthFactor;
            return changePerSec;
        },
        
        handlePopulationChange: function (node, isIncrease) {
			var campPosition = node.entity.get(PositionComponent);
			var level = campPosition.level;
            
            if (isIncrease) {
                this.lastPopulationIncreaseTimestamps[level] = new Date().getTime();
                node.camp.rumourpoolchecked = false;
            } else {
                if (node.camp.getAssignedPopulation() > node.camp.population) {                
                    for(var key in node.camp.assignedWorkers) {
                        var count = node.camp.assignedWorkers[key];
                        if (count > 0) {
                            node.camp.assignedWorkers[key]--;
                            break;
                        }
                    }
                }
            }
            this.logChangePopulation(campPosition, isIncrease);
        },
        
        logChangePopulation: function (campPosition, isIncrease) {
            var playerPosition = this.playerNodes.head.entity.get(PositionComponent);
            if (playerPosition.level === campPosition.level && playerPosition.sectorId() === campPosition.sectorId()) {
                var logComponent = this.playerNodes.head.entity.get(LogMessagesComponent);
                if (isIncrease) {
                    logComponent.addMessage(LogConstants.MSG_ID_POPULATION_NATURAL, "A stranger shows up.");
                } else {
                    logComponent.addMessage(LogConstants.MSG_ID_POPULATION_NATURAL, "An inhabitant packs their things and heads out into the City alone.");
                }
            }
        }
    });

    return PopulationSystem;
});
