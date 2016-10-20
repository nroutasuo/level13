define([
    'ash',
	'game/constants/GameConstants',
	'game/constants/LogConstants',
	'game/constants/CampConstants',
    'game/nodes/sector/CampNode',
    'game/nodes/player/PlayerStatsNode',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/components/common/PositionComponent',
    'game/components/common/LogMessagesComponent',
], function (Ash, GameConstants, LogConstants, CampConstants, CampNode, PlayerStatsNode, SectorImprovementsComponent, PositionComponent, LogMessagesComponent) {
    var PopulationSystem = Ash.System.extend({
	
        campNodes: null,
        playerNodes: null,
		
		lastPopulationIncreaseTimestamps: [],

        constructor: function (gameState) {
            this.gameState = gameState;
        },

        addToEngine: function (engine) {
            this.campNodes = engine.getNodeList(CampNode);
            this.playerNodes = engine.getNodeList(PlayerStatsNode);
        },

        removeFromEngine: function (engine) {
            this.campNodes = null;
            this.playerNodes = null;
        },

        update: function (time) {
            if (this.gameState.isPaused) return;
            for (var node = this.campNodes.head; node; node = node.next) {
                this.updateNode(node, time);
            }
        },

        updateNode: function (node, time) {
			var camp = node.camp;
			var reputation = this.playerNodes.head.reputation.value;
			var improvements = node.entity.get(SectorImprovementsComponent);
			var campPosition = node.entity.get(PositionComponent);
			var level = campPosition.level;
			
			var changePerSec = reputation / (camp.population * camp.population * camp.population * camp.population * camp.population + 1) / 25 * GameConstants.gameSpeedCamp;
			var change = time * changePerSec;
            camp.populationChangePerSec = changePerSec;
			
			var timeStamp = new Date().getTime();
            var cooldownMillis = CampConstants.POPULATION_COOLDOWN_SECONDS * 1000 * GameConstants.gameSpeedCamp;
			var lastIncreaseTimeStamp = this.lastPopulationIncreaseTimestamps[level] ? this.lastPopulationIncreaseTimestamps[level] : 0;
            camp.populationCooldownSec = Math.max(0, (cooldownMillis - (timeStamp - lastIncreaseTimeStamp)) / 1000);
			
			if (camp.populationCooldownSec === 0) {
				var oldPopulation = camp.population;
				var housingCap = improvements.getCount(improvementNames.house) * CampConstants.POPULATION_PER_HOUSE;
				housingCap += improvements.getCount(improvementNames.house2) * CampConstants.POPULATION_PER_HOUSE2;
			
				if (oldPopulation + change <= housingCap) {
					camp.addPopulation(change);
				} else if (oldPopulation < housingCap) {
					camp.addPopulation(housingCap - oldPopulation);
				}
			
				// Log new arrivals in current location
				var playerPosition = this.playerNodes.head.entity.get(PositionComponent);
				if (Math.floor(camp.population) > Math.floor(oldPopulation)) {
					this.lastPopulationIncreaseTimestamps[level] = new Date().getTime();
					camp.rumourpoolchecked = false;
					if (playerPosition.level === campPosition.level && playerPosition.sectorId() === campPosition.sectorId()) {
						var logComponent = this.playerNodes.head.entity.get(LogMessagesComponent);
						logComponent.addMessage(LogConstants.MSG_ID_POPULATION_NATURAL, "A stranger shows up.");
					}
				}
            }
        }
    });

    return PopulationSystem;
});
