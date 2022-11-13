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
			
			this.updateLimit();
			this.updateValue(time);
		},
		
		updateLimit: function () {
			let evidenceComponent = this.playerStatsNodes.head.evidence;
			evidenceComponent.maxValue = GameGlobals.tribeHelper.getCurrentEvidenceLimit();
		},
		
		updateValue: function (time) {
			let evidenceComponent = this.playerStatsNodes.head.evidence;
			
			evidenceComponent.accSources = [];
			evidenceComponent.accumulation = 0;
			let libraryUpgradeLevel = this.getLibraryUpgradeLevel();
			
			let oldValue = evidenceComponent.value;
			
			if (this.campNodes.head) {
				var accSpeed = 0;
				var improvementsComponent;
				var numScientists = 0;
				for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
					improvementsComponent = campNode.entity.get(SectorImprovementsComponent);
					var accLibrary = GameGlobals.campHelper.getLibraryEvidenceGenerationPerSecond(improvementsComponent);
					var accResearchCenter = GameGlobals.campHelper.getResearchCenterEvidenceGenerationPerSecond(improvementsComponent);
					
					numScientists = campNode.camp.assignedWorkers.scientist || 0;
					var accScientists = GameGlobals.campHelper.getEvidenceProductionPerSecond(numScientists, improvementsComponent);
					var accSpeedCamp = accLibrary + accResearchCenter + accScientists;
					accSpeed += accSpeedCamp;
					
					evidenceComponent.addChange("Libraries", accLibrary, campNode.position.level);
					evidenceComponent.addChange("Scientists", accScientists, campNode.position.level);
					evidenceComponent.addChange("Research Center", accResearchCenter, campNode.position.level);
					evidenceComponent.accumulation += accSpeed;
					evidenceComponent.accumulationPerCamp[campNode.position.level] = accSpeedCamp;
				}
				
				evidenceComponent.value += time * accSpeed;
			}
			
			if (evidenceComponent.value < 0) {
				evidenceComponent.value = 0;
			}
			
			if (evidenceComponent.maxValue > 0 && evidenceComponent.value > evidenceComponent.maxValue) {
				evidenceComponent.value = evidenceComponent.maxValue;
			}
			
			evidenceComponent.isAccumulating = evidenceComponent.value > oldValue;
		},
		
		getLibraryUpgradeLevel: function () {
			return GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.library, this.tribeUpgradesNodes.head.upgrades);
		},
	});

	return EvidenceSystem;
});
