// Marks that given entity (should be a Sector) contains a Camp
define(['ash', 'game/constants/CampConstants', 'game/vos/RaidVO'], function (Ash, CampConstants, RaidVO) {
    
    var CampComponent = Ash.Class.extend({
        
        id: "",
        population: 0,
        maxPopulation: 0, // maximum population ever reached in this camp
        populationChangePerSec: 0,
        rumourpool: 0,
        rumourpoolchecked: false,
        assignedWorkers: {},
        campName: "",
        lastRaid: null,
        
        pendingPopulation: 0,
        
        constructor: function (id) {
            this.id = id;
            this.population = 0;
            this.maxPopulation = 0;
            this.rumourpool = 0;
            this.rumourpoolchecked = false;
            this.assignedWorkers = {};
            for(var worker in CampConstants.WORKER_TYPES) {
                this.assignedWorkers[worker] = 0;
            }
            this.campName = "";
            this.lastRaid = new RaidVO(null);
            
            this.pendingPopulation = 0;
        },
        
        getFreePopulation: function () {
            return Math.floor(this.population - this.getAssignedPopulation());
        },
        
        getAssignedPopulation: function () {
            var assigned = 0;
            for(var key in this.assignedWorkers) {
                assigned += this.assignedWorkers[key];
            }
            return assigned;
        },
        
        addPopulation: function (value) {
            var oldPopulation = this.population;
            this.population += value;
            this.maxPopulation = Math.max(this.population, this.maxPopulation);
            var change = this.population - oldPopulation;
            this.rumourpool += change * CampConstants.POOL_RUMOURS_PER_POPULATION;
        },
        
        getType: function () {
            return "Camp";
        },
        
        getSaveKey: function () {
            return "Camp";
        },
        
        getName: function () {
            if (this.campName) {
                return this.getType() + " " + this.campName;
            } else {
                return this.getType();
            }
        },
    });

    return CampComponent;
});
