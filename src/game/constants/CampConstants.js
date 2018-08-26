define(['ash'], function (Ash) {
    
    var CampConstants = {
    
        POPULATION_PER_HOUSE: 4,
        POPULATION_PER_HOUSE2: 10,
        POOL_RUMOURS_PER_POPULATION: 2,
        
        // Storage
        BASE_STORAGE: 50,
        STORAGE_PER_IMPROVEMENT: 50,
        STORAGE_PER_IMPROVEMENT_LEVEL_2: 150,
        STORAGE_PER_IMPROVEMENT_LEVEL_3: 450,
        
        // Rumours
        RUMOURS_PER_POP_PER_SEC_BASE: 0.0001,
        RUMOUR_BONUS_PER_CAMPFIRE_BASE: 1.1,
        RUMOURS_BONUS_PER_CAMPFIRE_PER_UPGRADE: 1.02,
        RUMOUR_BONUS_PER_INN_BASE: 1.03,
        RUMOURS_BONUS_PER_INN_PER_UPGRADE: 1.02,
        
        // Cost of workers
        CONSUMPTION_WATER_PER_WORKER_PER_S: 0.02,
        CONSUMPTION_FOOD_PER_WORKER_PER_S: 0.01,
        CONSUMPTION_HERBS_PER_WORKER_PER_S: 0.05,
        CONSUMPTION_METAL_PER_TOOLSMITH_PER_S: 0.03,
        CONSUMPTION_METAL_PER_CONCRETE_PER_S: 0.02,
        
        // Production
        PRODUCTION_METAL_PER_WORKER_PER_S: 0.02,
        PRODUCTION_FOOD_PER_WORKER_PER_S: 0.05,
        PRODUCTION_WATER_PER_WORKER_PER_S: 0.05,
        PRODUCTION_ROPE_PER_WORKER_PER_S: 0.03,
        PRODUCTION_FUEL_PER_WORKER_PER_S: 0.02,
        PRODUCTION_MEDICINE_PER_WORKER_PER_S: 0.01,
        PRODUCTION_TOOLS_PER_WORKER_PER_S: 0.02,
        PRODUCTION_CONCRETE_PER_WORKER_PER_S: 0.03,
        
        // reputation
        REPUTATION_PER_RADIO_PER_SEC: 0.1,
        REPUTATION_PER_HOUSE_FROM_GENERATOR: 0.3,
        REPUTATION_PENALTY_TYPE_FOOD: "FOOD",
        REPUTATION_PENALTY_TYPE_WATER: "WATER",
        REPUTATION_PENALTY_TYPE_DEFENCES: "DEFENCES",
        REPUTATION_PENALTY_TYPE_HOUSING: "HOUSING",
        REPUTATION_PENALTY_TYPE_LEVEL_POP: "LEVEL_POPULATION",
        
        // Workers per building
        CHEMISTS_PER_WORKSHOP: 5,
        
        WORKER_TYPES: {
            scavenger: "scavenger",
            trapper: "trapper",
            water: "water",
            ropemaker: "ropemaker",
            chemist: "chemist",
            apothecary: "apothecary",
            toolsmith: "toolsmith",
            concrete: "concrete",
            soldier: "soldier",
        },
        
        // storage capacity of one camp
        getStorageCapacity: function (storageCount, storageUpgradeLevel) {
			var storagePerImprovement = CampConstants.STORAGE_PER_IMPROVEMENT;
			if (storageUpgradeLevel > 1) storagePerImprovement = CampConstants.STORAGE_PER_IMPROVEMENT_LEVEL_2;
			if (storageUpgradeLevel > 2) storagePerImprovement = CampConstants.STORAGE_PER_IMPROVEMENT_LEVEL_3;
            return CampConstants.BASE_STORAGE + storageCount * storagePerImprovement;
        },
        
        getSmithsPerSmithy: function (upgradeLevel) {
            return 2 + (upgradeLevel - 1) * 2;
        },
        
        getApothecariesPerShop: function (upgradeLevel) {
            return 2 + (upgradeLevel - 1) * 2;
        },
        
        getWorkersPerMill: function (upgradeLevel) {
            return 2 + (upgradeLevel - 1) * 2;            
        },
        
        getSoldiersPerBarracks: function (upgradeLevel) {
            return 5 + Math.floor((upgradeLevel - 1) * 2.5);
        },
        
        getRequiredReputation: function (pop) {
            if (pop < 1) return 0;
            var rawValue = Math.max(0, pop)/(pop+100)*100;
            return Math.max(1, Math.floor(rawValue * 100) / 100);
        },
    
    };
    
    return CampConstants;
    
});
