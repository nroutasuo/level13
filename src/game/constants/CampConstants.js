define(['ash'], function (Ash) {
    
    var CampConstants = {
    
        POPULATION_PER_HOUSE: 4,
        POPULATION_PER_HOUSE2: 10,
        POOL_RUMOURS_PER_POPULATION: 2,
        
        // Cost of workers
        CONSUMPTION_WATER_PER_WORKER_PER_S: 0.01,
        CONSUMPTION_FOOD_PER_WORKER_PER_S: 0.02,
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
        
        // Workers per building
        SOLDIERS_PER_BARRACKS: 10,
        SMIHTS_PER_SMITHY: 2,
        CONCRETE_WORKERS_PER_MILL: 2,
        APOTECARIES_PER_SHOP: 2,
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
    
    };
    
    return CampConstants;
    
});
