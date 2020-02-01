define(['ash'], function (Ash) {
    
    var CampConstants = {
    
        // population
        POPULATION_PER_HOUSE: 4,
        POPULATION_PER_HOUSE2: 10,
        POOL_RUMOURS_PER_POPULATION: 3,
        
        // Storage
        BASE_STORAGE: 50,
        STORAGE_PER_IMPROVEMENT: 50,
        STORAGE_PER_IMPROVEMENT_LEVEL_2: 100,
        STORAGE_PER_IMPROVEMENT_LEVEL_3: 200,
        
        // Rumours
        RUMOURS_PER_POP_PER_SEC_BASE: 0.0003,
        RUMOUR_BONUS_PER_CAMPFIRE_BASE: 1.2,
        RUMOURS_BONUS_PER_CAMPFIRE_PER_LEVEL: 0.1,
        RUMOURS_BONUS_PER_CAMPFIRE_PER_UPGRADE: 0.2,
        RUMOUR_BONUS_PER_MARKET_BASE: 1.1,
        RUMOURS_BONUS_PER_MARKET_PER_UPGRADE: 0.01,
        RUMOUR_BONUS_PER_INN_BASE: 1.1,
        RUMOURS_BONUS_PER_INN_PER_UPGRADE: 0.01,
        RUMOURS_PER_VISIT_MARKET: 2,
        
        // Evidence
        EVIDENCE_BONUS_PER_LIBRARY_LEVEL: 0.15,
        
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
        PRODUCTION_EVIDENCE_PER_WORKER_PER_S: 0.0005,
        
        // reputation
        REPUTATION_TO_POPULATION_FACTOR: 0.82,
        REPUTATION_TO_POPULATION_OFFSET: -0.25,
        REPUTATION_PER_RADIO_PER_SEC: 0.1,
        REPUTATION_PER_HOUSE_FROM_GENERATOR: 0.3,
        REPUTATION_PENALTY_DEFENCES_THRESHOLD: 0.25,
        REPUTATION_PENALTY_TYPE_FOOD: "FOOD",
        REPUTATION_PENALTY_TYPE_WATER: "WATER",
        REPUTATION_PENALTY_TYPE_DEFENCES: "DEFENCES",
        REPUTATION_PENALTY_TYPE_HOUSING: "HOUSING",
        REPUTATION_PENALTY_TYPE_LEVEL_POP: "LEVEL_POPULATION",
        
        // raids
        CAMP_BASE_DEFENCE: 5,
        FORTIFICATION_1_DEFENCE: 6,
        FORTIFICATION_2_DEFENCE: 10,
        
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
            scientist: "scientist",
            soldier: "soldier",
        },
        
        // storage capacity of one camp
        getStorageCapacity: function (storageCount, storageUpgradeLevel) {
			var storagePerImprovement = CampConstants.STORAGE_PER_IMPROVEMENT;
			if (storageUpgradeLevel > 1) storagePerImprovement = CampConstants.STORAGE_PER_IMPROVEMENT_LEVEL_2;
			if (storageUpgradeLevel > 2) storagePerImprovement = CampConstants.STORAGE_PER_IMPROVEMENT_LEVEL_3;
            return CampConstants.BASE_STORAGE + storageCount * storagePerImprovement;
        },
        
        // population cap of one camp
        getHousingCap: function (improvementsComponent) {
            var result = improvementsComponent.getCount(improvementNames.house) * CampConstants.POPULATION_PER_HOUSE;
            result += improvementsComponent.getCount(improvementNames.house2) * CampConstants.POPULATION_PER_HOUSE2;
            return result;
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
        
        getScientistsPerLibrary: function (upgradeLevel) {
            return 2;
        },
        
        getRequiredReputation: function (pop) {
            if (pop < 1) return 0;
            pop = Math.ceil(pop);
            var result = Math.max(1, Math.pow(pop, CampConstants.REPUTATION_TO_POPULATION_FACTOR) + CampConstants.REPUTATION_TO_POPULATION_OFFSET);
            return Math.floor(result * 100) / 100;
        },
        
        getMaxPopulation: function (reputation) {
            if (reputation < 1) return 0;
            return Math.floor(Math.pow(reputation - CampConstants.REPUTATION_TO_POPULATION_OFFSET, 1 / CampConstants.REPUTATION_TO_POPULATION_FACTOR));
        },
        
        getSoldierDefence: function (upgradeLevel) {
            return (1 + upgradeLevel);
        }
    
    };
    
    return CampConstants;
    
});
