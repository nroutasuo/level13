define([
    'ash',
    'game/GameGlobals',
	'game/constants/CampConstants',
	'game/constants/GameConstants',
	'game/constants/UpgradeConstants',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/tribe/TribeUpgradesNode',
	'game/nodes/sector/CampNode',
    'game/components/sector/improvements/SectorImprovementsComponent',
], function (Ash, GameGlobals, CampConstants, GameConstants, UpgradeConstants, PlayerStatsNode, TribeUpgradesNode, CampNode, SectorImprovementsComponent) {
    var EvidenceSystem = Ash.System.extend({
	
        gameState: null,
	
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
            
			var evidenceComponent = this.playerStatsNodes.head.evidence;
			
			evidenceComponent.accSources = [];
			evidenceComponent.accumulation = 0;
			var libraryUpgradeLevel = this.getLibraryUpgradeLevel();
			
			if (this.campNodes.head) {
				var accSpeed = 0;
				var improvementsComponent;
				var libraryCount = 0;
				var numScientists = 0;
				for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
					improvementsComponent = campNode.entity.get(SectorImprovementsComponent);
					libraryCount = improvementsComponent.getCount(improvementNames.library);
                    numScientists = campNode.camp.assignedWorkers.scientist;
                    
					var accLibrary = 0.0005 * libraryCount * libraryUpgradeLevel * GameConstants.gameSpeedCamp;
                    var accScientists = GameGlobals.campHelper.getEvidenceProductionPerSecond(numScientists, improvementsComponent);
					var accSpeedCamp = accLibrary + accScientists;
					accSpeed += accSpeedCamp;
					
					evidenceComponent.addChange("Libraries", accLibrary);
					evidenceComponent.addChange("Scientists", accScientists);
					evidenceComponent.accumulation += accSpeed;
				}
				
				evidenceComponent.value += (time + this.engine.extraUpdateTime) * accSpeed;
				evidenceComponent.isAccumulating = true;
			}
            
            if (evidenceComponent.value < 0 )
                evidenceComponent.value = 0;
            
            GameGlobals.gameState.unlockedFeatures.projects = this.tribeUpgradesNodes.head.upgrades.hasUpgrade(UpgradeConstants.upgradeIds.unlock_building_passage_staircase);
        },
		
		getLibraryUpgradeLevel: function () {
            return GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.library, this.tribeUpgradesNodes.head.upgrades);
		},
    });

    return EvidenceSystem;
});
