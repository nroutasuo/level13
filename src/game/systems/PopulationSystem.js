define([
    'ash',
	'game/constants/GameConstants',
	'game/constants/CampConstants',
    'game/nodes/sector/CampNode',
    'game/nodes/player/PlayerStatsNode',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/components/common/PositionComponent',
    'game/components/common/LogMessagesComponent',
], function (Ash, GameConstants, CampConstants, CampNode, PlayerStatsNode, SectorImprovementsComponent, PositionComponent, LogMessagesComponent) {
    var PopulationSystem = Ash.System.extend({
	
        campNodes: null,
        playerNodes: null,
		
		populationCooldownSecondsMin: 30,
		lastPopulationIncreaseTimestamps: [],

        constructor: function () {
        },

        addToEngine: function (engine) {
            this.campNodes = engine.getNodeList( CampNode );
            this.playerNodes = engine.getNodeList( PlayerStatsNode );
        },

        removeFromEngine: function (engine) {
            this.campNodes = null;
            this.playerNodes = null;
        },

        update: function (time) {
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
			
			var populationBonus = Math.max(1 + reputation/10-Math.floor(camp.population), 0)/5;
			var changePerSec = populationBonus + reputation/2000 * GameConstants.gameSpeed;
			var change = time * changePerSec;
			
			var timeStamp = new Date().getTime();
			var lastIncreaseTimeStamp = this.lastPopulationIncreaseTimestamps[level] ? this.lastPopulationIncreaseTimestamps[level] : 0;
			var isPopulationCooldown  = timeStamp - lastIncreaseTimeStamp < this.populationCooldownSecondsMin * 1000 * GameConstants.gameSpeed;
			
			if (!isPopulationCooldown) {
				var oldPopulation = camp.population;
				var housingCap = improvements.getCount(improvementNames.house) * CampConstants.POPULATION_PER_HOUSE;
				housingCap += improvements.getCount(improvementNames.house2) * CampConstants.POPULATION_PER_HOUSE2;
			
				if (oldPopulation + change <= housingCap) {
					camp.addPopulation(change);
				}
			
				// Log new arrivals in current location
				var playerPosition = this.playerNodes.head.entity.get(PositionComponent);
				if (Math.floor(camp.population) > Math.floor(oldPopulation)) {
					this.lastPopulationIncreaseTimestamps[level] = new Date().getTime();
					if (playerPosition.level === campPosition.level && playerPosition.sector === campPosition.sector) {
						camp.rumourpoolchecked = false;
						var logComponent = this.playerNodes.head.entity.get(LogMessagesComponent);
						logComponent.addMessage("A stranger shows up.");
					}
				}
			}
        }
    });

    return PopulationSystem;
});
