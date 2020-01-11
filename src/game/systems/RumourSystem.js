define([
    'ash',
    'game/GameGlobals',
	'game/constants/GameConstants',
	'game/constants/CampConstants',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/sector/CampNode',
	'game/nodes/tribe/TribeUpgradesNode',
    'game/components/sector/improvements/SectorImprovementsComponent',
], function (Ash, GameGlobals, GameConstants, CampConstants, PlayerStatsNode, CampNode, TribeUpgradesNode, SectorImprovementsComponent) {
    var RumourSystem = Ash.System.extend({
	
        playerStatsNodes: null,
		campNodes: null,
        tribeUpgradesNodes: null,

        constructor: function () {
        },

        addToEngine: function (engine) {
            this.engine = engine;
            this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
            this.campNodes = engine.getNodeList(CampNode);
            this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
        },

        removeFromEngine: function (engine) {
            this.playerStatsNodes = null;
            this.campNodes = null;
            this.tribeUpgradesNodes = null;
            this.engine = null;
        },

        update: function (time) {
            if (GameGlobals.gameState.isPaused) return;
            
			var rumoursComponent = this.playerStatsNodes.head.rumours;
			
			rumoursComponent.accSources = [];
			rumoursComponent.accumulation = 0;
			
			var campfireUpgradeLevel = this.getImprovementUpgradeLevel(improvementNames.campfire);
            var marketUpgradeLevel = this.getImprovementUpgradeLevel(improvementNames.market);
			var innUpgradeLevel = this.getImprovementUpgradeLevel(improvementNames.inn);
			
			if (this.campNodes.head) {
				var accSpeed = 0;
				
                var improvementsComponent;
                var campfireCount = 0;
                var campfireLevel = 0;
				var campfireFactor = 1;
                var marketCount;
                var marketFactor = 1;
                var innCount = 0;
                var innFactor = 1;
				for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
					improvementsComponent = campNode.entity.get(SectorImprovementsComponent);
					
					campfireCount = improvementsComponent.getCount(improvementNames.campfire);
                    campfireLevel = improvementsComponent.getLevel(improvementNames.campfire);
					campfireFactor = CampConstants.RUMOUR_BONUS_PER_CAMPFIRE_BASE;
					campfireFactor += campfireLevel > 1 ? (campfireLevel - 1) * CampConstants.RUMOURS_BONUS_PER_CAMPFIRE_PER_LEVEL : 0;
					campfireFactor += campfireUpgradeLevel > 1 ? (campfireUpgradeLevel - 1) * CampConstants.RUMOURS_BONUS_PER_CAMPFIRE_PER_UPGRADE : 0;
                    
                    marketCount = improvementsComponent.getCount(improvementNames.market);
                    marketFactor = CampConstants.RUMOUR_BONUS_PER_MARKET_BASE;
					marketFactor += marketUpgradeLevel > 1 ? (marketUpgradeLevel - 1) * CampConstants.RUMOURS_BONUS_PER_MARKET_PER_UPGRADE : 0;
                    
                    innCount = improvementsComponent.getCount(improvementNames.inn);
                    innFactor = CampConstants.RUMOUR_BONUS_PER_INN_BASE;
					innFactor += innUpgradeLevel > 1 ? (innUpgradeLevel - 1) * CampConstants.RUMOURS_BONUS_PER_INN_PER_UPGRADE : 0;
                    
					var accSpeedPopulation = CampConstants.RUMOURS_PER_POP_PER_SEC_BASE * Math.floor(campNode.camp.population) * GameConstants.gameSpeedCamp;
					var accSpeedCampfire = campfireCount > 0 ? Math.pow(campfireFactor, campfireCount) * accSpeedPopulation - accSpeedPopulation : 0;
                    var accSpeedMarket = marketCount > 0 ?  Math.pow(marketFactor, marketCount) * accSpeedPopulation - accSpeedPopulation : 0;
					var accSpeedInn = innCount > 0 ? Math.pow(innFactor, innCount) * accSpeedPopulation - accSpeedPopulation : 0;
                    
					var accSpeedCamp = accSpeedPopulation + accSpeedCampfire + accSpeedMarket + accSpeedInn;
					accSpeed += accSpeedCamp;
					
					rumoursComponent.addChange("Population", accSpeedPopulation);
					rumoursComponent.addChange("Campfires", accSpeedCampfire);
					if (marketFactor > 1) rumoursComponent.addChange("Markets", accSpeedMarket);
					if (innFactor > 1) rumoursComponent.addChange("Inns", accSpeedInn);
					rumoursComponent.accumulation += accSpeed;
                    rumoursComponent.accumulationPerCamp[campNode.position.level] = accSpeedCamp;
				}
				
				rumoursComponent.value += time * accSpeed;
				rumoursComponent.isAccumulating = true;
			}
            
            if (rumoursComponent.value < 0 )
                rumoursComponent.value = 0;
        },
		
		getImprovementUpgradeLevel: function (improvementName) {
            return GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementName, this.tribeUpgradesNodes.head.upgrades);
		},
    });

    return RumourSystem;
});
