// Singleton with helper methods for movement, blockers etc
define([
    'ash',
    'game/GameGlobals',
    'game/constants/GameConstants',
    'game/constants/CampConstants',
    'game/nodes/tribe/TribeUpgradesNode',
], function (Ash, GameGlobals, GameConstants, CampConstants, TribeUpgradesNode) {
    
    var CampHelper = Ash.Class.extend({
		
		constructor: function (engine) {
            this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
		},
        
        getMetalProductionPerSecond: function (workers, improvementsComponent) {
			var metalUpgradeBonus = this.getUpgradeBonus("scavenger");
			return workers * CampConstants.PRODUCTION_METAL_PER_WORKER_PER_S * metalUpgradeBonus * GameConstants.gameSpeedCamp;
        },
        
        getFoodProductionPerSecond: function (workers, improvementsComponent) {
			var foodUpgradeBonus = this.getUpgradeBonus("trapper");
			return workers * CampConstants.PRODUCTION_FOOD_PER_WORKER_PER_S * foodUpgradeBonus * GameConstants.gameSpeedCamp;
        },
        
        getWaterProductionPerSecond: function (workers, improvementsComponent) {
			var waterUpgradeBonus = this.getUpgradeBonus("collector");
			var waterImprovementBonus = 1 + (improvementsComponent.getCount(improvementNames.aqueduct) / 4);
            return CampConstants.PRODUCTION_WATER_PER_WORKER_PER_S * workers * waterUpgradeBonus * waterImprovementBonus * GameConstants.gameSpeedCamp;
        },
        
        getRopeProductionPerSecond: function (workers, improvementsComponent) {
			var ropeUpgradeBonus = this.getUpgradeBonus("weaver");
			return workers * CampConstants.PRODUCTION_ROPE_PER_WORKER_PER_S * ropeUpgradeBonus * GameConstants.gameSpeedCamp;
        },
        
        getFuelProductionPerSecond: function (workers, improvementsComponent) {
			var fuelUpgradeBonus = this.getUpgradeBonus("chemist");
			return workers * CampConstants.PRODUCTION_FUEL_PER_WORKER_PER_S * fuelUpgradeBonus * GameConstants.gameSpeedCamp;
        },
        
        getMedicineProductionPerSecond: function (workers, improvementsComponent) {
			var medicineUpgradeBonus = this.getUpgradeBonus("apothecary");
			return workers * CampConstants.PRODUCTION_MEDICINE_PER_WORKER_PER_S * medicineUpgradeBonus * GameConstants.gameSpeedCamp;
        },
        
        getToolsProductionPerSecond: function (workers, improvementsComponent) {
			var toolsUpgradeBonus = this.getUpgradeBonus("smith");
			return workers * CampConstants.PRODUCTION_TOOLS_PER_WORKER_PER_S * toolsUpgradeBonus * GameConstants.gameSpeedCamp;
        },
        
        getConcreteProductionPerSecond: function (workers, improvementComponent) {
			var concreteUpgradeBonus = this.getUpgradeBonus("concrete");
			return workers * CampConstants.PRODUCTION_CONCRETE_PER_WORKER_PER_S * concreteUpgradeBonus * GameConstants.gameSpeedCamp;
        },
        
        getEvidenceProductionPerSecond: function (workers, improvementComponent) {
			var evidenceUpgradeBonus = this.getUpgradeBonus("scientist");
			return workers * CampConstants.PRODUCTION_EVIDENCE_PER_WORKER_PER_S * evidenceUpgradeBonus * GameConstants.gameSpeedCamp;
        },
        
        getWaterConsumptionPerSecond: function (population, useExplorationSpeed) {
            var speed = useExplorationSpeed ? GameConstants.gameSpeedExploration : GameConstants.gameSpeedCamp;
            return CampConstants.CONSUMPTION_WATER_PER_WORKER_PER_S * Math.floor(population) * speed;
        },
        
        getFoodConsumptionPerSecond: function (population, useExplorationSpeed) {
            var speed = useExplorationSpeed ? GameConstants.gameSpeedExploration : GameConstants.gameSpeedCamp;
            return CampConstants.CONSUMPTION_FOOD_PER_WORKER_PER_S * Math.floor(population) * speed;
        },
        
        getHerbsConsumptionPerSecond: function (workers) {
            return workers * CampConstants.CONSUMPTION_HERBS_PER_WORKER_PER_S * GameConstants.gameSpeedCamp;
        },
        
        getMetalConsumptionPerSecondSmith: function (workers) {
            return workers * CampConstants.CONSUMPTION_METAL_PER_TOOLSMITH_PER_S * GameConstants.gameSpeedCamp;
        },
        
        getMetalConsumptionPerSecondConcrete: function (workers) {
            return workers * CampConstants.CONSUMPTION_METAL_PER_CONCRETE_PER_S * GameConstants.gameSpeedCamp;
        },
		
		getUpgradeBonus: function (worker) {
			var upgradeLevel = 1;
			var workerUpgrades = GameGlobals.upgradeEffectsHelper.getImprovingUpgradeIdsForWorker(worker);
			var workerUpgrade;
			for (var i in workerUpgrades) {
				workerUpgrade = workerUpgrades[i];
				if (this.tribeUpgradesNodes.head.upgrades.hasUpgrade(workerUpgrade)) upgradeLevel += 0.1;
			}
			return upgradeLevel;
		},
		
    });
    
    return CampHelper;
});
