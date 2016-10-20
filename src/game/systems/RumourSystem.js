define([
    'ash',
	'game/constants/GameConstants',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/sector/CampNode',
	'game/nodes/tribe/TribeUpgradesNode',
    'game/components/sector/improvements/SectorImprovementsComponent',
], function (Ash, GameConstants, PlayerStatsNode, CampNode, TribeUpgradesNode, SectorImprovementsComponent) {
    var RumourSystem = Ash.System.extend({
	
        gameState: null,
		upgradeEffectsHelper: null,
	
        playerStatsNodes: null,
		campNodes: null,
        tribeUpgradesNodes: null,

        constructor: function (gameState, upgradeEffectsHelper) {
			this.gameState = gameState;
			this.upgradeEffectsHelper = upgradeEffectsHelper;
        },

        addToEngine: function (engine) {
            this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
            this.campNodes = engine.getNodeList(CampNode);
            this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
        },

        removeFromEngine: function (engine) {
            this.playerStatsNodes = null;
            this.campNodes = null;
            this.tribeUpgradesNodes = null;
        },

        update: function (time) {
            if (this.gameState.isPaused) return;
            
			var rumoursComponent = this.playerStatsNodes.head.rumours;
			
			rumoursComponent.accSources = [];
			rumoursComponent.accumulation = 0;
			
			var campfireUpgradeLevel = this.getCampfireUpgradeLevel();
			
			if (this.campNodes.head) {
				var accSpeed = 0;
				
				var campfireFactor = 1;
				var improvementsComponent;
				var campfireCount = 0;
				for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
					improvementsComponent = campNode.entity.get(SectorImprovementsComponent);
					
					campfireCount = improvementsComponent.getCount(improvementNames.campfire);
					campfireFactor = 1 + (campfireCount > 0 ? (campfireCount/10) : 0);
					campfireFactor = campfireFactor * campfireUpgradeLevel;
					var accSpeedPopulation = 0.00005 * (Math.floor(campNode.camp.population)+1) * GameConstants.gameSpeedCamp;
					var accSpeedCampfire = (accSpeedPopulation * campfireFactor - accSpeedPopulation) * GameConstants.gameSpeedCamp;
					var accSpeedCamp = accSpeedPopulation + accSpeedCampfire;
					accSpeed += accSpeedCamp;
					
					rumoursComponent.addChange("Population", accSpeedPopulation);
					rumoursComponent.addChange("Campfire", accSpeedCampfire);
					rumoursComponent.accumulation += accSpeed;
				}
				
				rumoursComponent.value += time * accSpeed;
				rumoursComponent.isAccumulating = true;
			}
        },
		
		getCampfireUpgradeLevel: function () {
			var upgradeLevel = 1;
			var campfireUpgrades = this.upgradeEffectsHelper.getUpgradeIdsForImprovement(improvementNames.campfire);
			var campfireUpgrade;
			for (var i in campfireUpgrades) {
				campfireUpgrade = campfireUpgrades[i];
				if (this.tribeUpgradesNodes.head.upgrades.hasUpgrade(campfireUpgrade)) upgradeLevel++;
			}
			return upgradeLevel;
		},
    });

    return RumourSystem;
});
