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
			
			this.updateLimit();
			this.updateValue(time);
		},
		
		updateLimit: function () {
			let rumoursComponent = this.playerStatsNodes.head.rumours;
			rumoursComponent.maxValue = GameGlobals.tribeHelper.getCurrentRumoursLimit();
		},
		
		updateValue: function (time) {
			let rumoursComponent = this.playerStatsNodes.head.rumours;
			
			rumoursComponent.accSources = [];
			rumoursComponent.accumulation = 0;
			
			let oldValue = rumoursComponent.value;
			
			if (this.campNodes.head) {
				let accSpeed = 0;
				let improvementsComponent;
				for (let campNode = this.campNodes.head; campNode; campNode = campNode.next) {
					improvementsComponent = campNode.entity.get(SectorImprovementsComponent);
					
					var accSpeedPopulation = CampConstants.RUMOURS_PER_POP_PER_SEC_BASE * Math.floor(campNode.camp.population || 0) * GameConstants.gameSpeedCamp;
					var accSpeedCampfire = GameGlobals.campHelper.getCampfireRumourGenerationPerSecond(improvementsComponent, accSpeedPopulation) || 0;
					var accSpeedMarket = GameGlobals.campHelper.getMarketRumourGenerationPerSecond(improvementsComponent, accSpeedPopulation) || 0;
					var accSpeedInn = GameGlobals.campHelper.getInnRumourGenerationPerSecond(improvementsComponent, accSpeedPopulation) || 0;
					
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
			}
			
			if (rumoursComponent.value < 0) {
				rumoursComponent.value = 0;
			}
			
			if (rumoursComponent.maxValue > 0 && rumoursComponent.value > rumoursComponent.maxValue) {
				rumoursComponent.value = rumoursComponent.maxValue;
			}
			
			rumoursComponent.isAccumulating = rumoursComponent.value > oldValue;
		},
		
		getImprovementUpgradeLevel: function (improvementName) {
			return GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementName, this.tribeUpgradesNodes.head.upgrades);
		},
	});

	return RumourSystem;
});
