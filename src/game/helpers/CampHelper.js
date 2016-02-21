// Singleton with helper methods for movement, blockers etc
define([
    'ash', 'game/constants/GameConstants', 'game/constants/CampConstants',
    'game/nodes/tribe/TribeUpgradesNode',
], function (Ash, GameConstants, CampConstants, TribeUpgradesNode) {
    
    var CampHelper = Ash.Class.extend({
        
		upgradeEffectsHelper: null,
		
		constructor: function (engine, upgradeEffectsHelper) {
			this.upgradeEffectsHelper = upgradeEffectsHelper;
            this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
		},
        
        getMetalProductionPerSecond: function (workers, improvementsComponent) {
			var metalUpgradeBonus = this.getUpgradeBonus("scavenger");
			return workers * CampConstants.PRODUCTION_METAL_PER_WORKER_PER_S * metalUpgradeBonus * GameConstants.gameSpeed;
        },
        
        getFoodProductionPerSecond: function (workers, improvementsComponent) {
			var foodUpgradeBonus = this.getUpgradeBonus("trapper");
			return workers * CampConstants.PRODUCTION_FOOD_PER_WORKER_PER_S * foodUpgradeBonus * GameConstants.gameSpeed;
        },
        
        getWaterProductionPerSecond: function (workers, improvementsComponent) {
			var waterUpgradeBonus = this.getUpgradeBonus("collector");
			var waterImprovementBonus = 1 + (improvementsComponent.getCount(improvementNames.aqueduct) / 4);
            return CampConstants.PRODUCTION_WATER_PER_WORKER_PER_S * workers * waterUpgradeBonus * waterImprovementBonus * GameConstants.gameSpeed;
        },
        
        getRopeProductionPerSecond: function (workers, improvementsComponent) {
			var ropeUpgradeBonus = this.getUpgradeBonus("weaver");
			return workers * CampConstants.PRODUCTION_ROPE_PER_WORKER_PER_S * ropeUpgradeBonus * GameConstants.gameSpeed;
        },
        
        getFuelProductionPerSecond: function (workers, improvementsComponent) {
			var fuelUpgradeBonus = this.getUpgradeBonus("chemist");
			return workers * CampConstants.PRODUCTION_FUEL_PER_WORKER_PER_S * fuelUpgradeBonus * GameConstants.gameSpeed;
        },
        
        getMedicineProductionPerSecond: function (workers, improvementsComponent) {
			var medicineUpgradeBonus = this.getUpgradeBonus("apothecary");
			return workers * CampConstants.PRODUCTION_MEDICINE_PER_WORKER_PER_S * medicineUpgradeBonus * GameConstants.gameSpeed;
        },
        
        getToolsProductionPerSecond: function (workers, improvementsComponent) {
			var toolsUpgradeBonus = this.getUpgradeBonus("smith");
			return workers * CampConstants.PRODUCTION_TOOLS_PER_WORKER_PER_S * toolsUpgradeBonus * GameConstants.gameSpeed;
        },
        
        getConcreteProductionPerSecond: function (workers, improvementComponent) {
			var concreteUpgradeBonus = this.getUpgradeBonus("concrete");
			return workers * CampConstants.PRODUCTION_CONCRETE_PER_WORKER_PER_S * concreteUpgradeBonus * GameConstants.gameSpeed;
        },
        
        getWaterConsumptionPerSecond: function (population) {
            return CampConstants.CONSUMPTION_WATER_PER_WORKER_PER_S * Math.floor(population) * GameConstants.gameSpeed;
        },
        
        getFoodConsumptionPerSecond: function (population) {
            return CampConstants.CONSUMPTION_FOOD_PER_WORKER_PER_S * Math.floor(population) * GameConstants.gameSpeed;
        },
        
        getHerbsConsumptionPerSecond: function (workers) {
            return workers * CampConstants.CONSUMPTION_HERBS_PER_WORKER_PER_S * GameConstants.gameSpeed;
        },
        
        getMetalConsumptionPerSecondSmith: function (workers) {
            return workers * CampConstants.CONSUMPTION_METAL_PER_TOOLSMITH_PER_S * GameConstants.gameSpeed;
        },
        
        getMetalConsumptionPerSecondConcrete: function (workers) {
            return workers * CampConstants.CONSUMPTION_METAL_PER_CONCRETE_PER_S * GameConstants.gameSpeed;
        },
		
		getUpgradeBonus: function (worker) {
			var upgradeLevel = 1;
			var workerUpgrades = this.upgradeEffectsHelper.getImprovingUpgradeIdsForWorker(worker);
			var workerUpgrade;
			for (var i in workerUpgrades) {
				workerUpgrade = workerUpgrades[i];
				if (this.tribeUpgradesNodes.head.upgrades.hasUpgrade(workerUpgrade)) upgradeLevel += 0.25;
			}
			return upgradeLevel;
		},
		
    });
    
    return CampHelper;
});