define([
    'ash',
	'game/constants/GameConstants',
	'game/constants/UpgradeConstants',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/tribe/TribeUpgradesNode',
	'game/nodes/sector/CampNode',
    'game/components/sector/improvements/SectorImprovementsComponent',
], function (Ash, GameConstants, UpgradeConstants, PlayerStatsNode, TribeUpgradesNode, CampNode, SectorImprovementsComponent) {
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
            if (this.gameState.isPaused) return;
            
			var evidenceComponent = this.playerStatsNodes.head.evidence;
			
			evidenceComponent.accSources = [];
			evidenceComponent.accumulation = 0;
			var libraryUpgradeLevel = this.getLibraryUpgradeLevel();
			
			if (this.campNodes.head) {
				var accSpeed = 0;
				var improvementsComponent;
				var libraryCount = 0;
				for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
					improvementsComponent = campNode.entity.get(SectorImprovementsComponent);
					libraryCount = improvementsComponent.getCount(improvementNames.library);
					var accLibrary = 0.0005 * libraryCount * libraryUpgradeLevel * GameConstants.gameSpeedCamp;
					var accSpeedCamp = accLibrary;
					accSpeed += accSpeedCamp;
					
					evidenceComponent.addChange("Libraries", accSpeedCamp);
					evidenceComponent.accumulation += accSpeed;
				}
				
				evidenceComponent.value += (time + this.engine.extraUpdateTime) * accSpeed;
				evidenceComponent.isAccumulating = true;
			}
            
            this.gameState.unlockedFeatures.projects = this.tribeUpgradesNodes.head.upgrades.hasUpgrade(UpgradeConstants.upgradeIds.unlock_building_passage_staircase);
        },
		
		getLibraryUpgradeLevel: function () {
            return this.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.library, this.tribeUpgradesNodes.head.upgrades);
		},
    });

    return EvidenceSystem;
});
