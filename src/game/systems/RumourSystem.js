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
				for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
					improvementsComponent = campNode.entity.get(SectorImprovementsComponent);
					
					var accSpeedPopulation = CampConstants.RUMOURS_PER_POP_PER_SEC_BASE * Math.floor(campNode.camp.population) * GameConstants.gameSpeedCamp;
					var accSpeedCampfire = GameGlobals.campHelper.getCampfireRumourGenerationPerSecond(improvementsComponent, campfireUpgradeLevel, accSpeedPopulation);
					var accSpeedMarket = GameGlobals.campHelper.getMarketRumourGenerationPerSecond(improvementsComponent, marketUpgradeLevel, accSpeedPopulation);
					var accSpeedInn = GameGlobals.campHelper.getInnRumourGenerationPerSecond(improvementsComponent, innUpgradeLevel, accSpeedPopulation);
					
					var accSpeedBuildings = accSpeedCampfire + accSpeedMarket + accSpeedInn;
					var accSpeedCamp = accSpeedPopulation + accSpeedBuildings;
					accSpeed += accSpeedCamp;
					
					rumoursComponent.addChange("Population", accSpeedPopulation);
					rumoursComponent.addChange("Campfires", accSpeedCampfire);
					if (accSpeedMarket > 0) rumoursComponent.addChange("Markets", accSpeedMarket);
					if (accSpeedInn > 0) rumoursComponent.addChange("Inns", accSpeedInn);
					rumoursComponent.accumulation += accSpeed;
					rumoursComponent.accumulationPerCamp[campNode.position.level] = accSpeedCamp;
				}
				
				rumoursComponent.value += time * accSpeed;
				rumoursComponent.isAccumulating = true;
			}
			
			if (rumoursComponent.value < 0) {
				rumoursComponent.value = 0;
			}
		},
		
		getImprovementUpgradeLevel: function (improvementName) {
			return GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementName, this.tribeUpgradesNodes.head.upgrades);
		},
	});

	return RumourSystem;
});
