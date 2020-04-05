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

        constructor: function () {},

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
				var numScientists = 0;
				for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
					improvementsComponent = campNode.entity.get(SectorImprovementsComponent);
					var accLibrary = GameGlobals.campHelper.getLibraryEvidenceGenerationPerSecond(improvementsComponent, libraryUpgradeLevel);
                    
                    numScientists = campNode.camp.assignedWorkers.scientist || 0;
                    var accScientists = GameGlobals.campHelper.getEvidenceProductionPerSecond(numScientists, improvementsComponent);
					var accSpeedCamp = accLibrary + accScientists;
					accSpeed += accSpeedCamp;
					
					evidenceComponent.addChange("Libraries", accLibrary, campNode.position.level);
					evidenceComponent.addChange("Scientists", accScientists, campNode.position.level);
					evidenceComponent.accumulation += accSpeed;
                    evidenceComponent.accumulationPerCamp[campNode.position.level] = accSpeedCamp;
				}
				
				evidenceComponent.value += time * accSpeed;
				evidenceComponent.isAccumulating = true;
			}
            
            if (evidenceComponent.value < 0)
                evidenceComponent.value = 0;
        },
		
		getLibraryUpgradeLevel: function () {
            return GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.library, this.tribeUpgradesNodes.head.upgrades);
		},
    });

    return EvidenceSystem;
});
