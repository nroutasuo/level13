define([
    'ash',
	'game/constants/GameConstants',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/tribe/TribeUpgradesNode',
	'game/nodes/sector/CampNode',
    'game/components/sector/improvements/SectorImprovementsComponent',
], function (Ash, GameConstants, PlayerStatsNode, TribeUpgradesNode, CampNode, SectorImprovementsComponent) {
    var EvidenceSystem = Ash.System.extend({
	
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
            
			var evidenceComponent = this.playerStatsNodes.head.evidence;
			
			evidenceComponent.accSources = [];
			evidenceComponent.accumulation = 0;
			var cap = 100;
			var libraryUpgradeLevel = this.getLibraryUpgradeLevel();
			
			if (this.campNodes.head) {
				var accSpeed = 0;
				var improvementsComponent;
				var libraryCount = 0;
				for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
					improvementsComponent = campNode.entity.get(SectorImprovementsComponent);
					libraryCount = improvementsComponent.getCount(improvementNames.library);
					var accLibrary = 0.0005 * libraryCount * libraryUpgradeLevel * GameConstants.gameSpeed;
					var accSpeedCamp = accLibrary;
					accSpeed += accSpeedCamp;
					cap += libraryCount * 100;
					
					evidenceComponent.addChange("Libraries", accSpeedCamp);
					evidenceComponent.accumulation += accSpeed;
				}
				
				evidenceComponent.value += time * accSpeed;
				evidenceComponent.isAccumulating = true;
			}
			
			evidenceComponent.cap = cap;
        },
		
		getLibraryUpgradeLevel: function () {
			var upgradeLevel = 1;
			var libraryUpgrades = this.upgradeEffectsHelper.getUpgradeIdsForImprovement(improvementNames.library);
			var libraryUpgrade;
			for (var i in libraryUpgrades) {
				libraryUpgrade = libraryUpgrades[i];
				if (this.tribeUpgradesNodes.head.upgrades.hasUpgrade(libraryUpgrade)) upgradeLevel++;
			}
			return upgradeLevel;
		},
    });

    return EvidenceSystem;
});
