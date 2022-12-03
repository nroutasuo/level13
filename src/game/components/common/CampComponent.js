// Marks that given entity (should be a Sector) contains a Camp
define(['ash', 'game/constants/CampConstants', 'game/vos/RaidVO'], function (Ash, CampConstants, RaidVO) {
	
	var CampComponent = Ash.Class.extend({
		
		id: "",
		population: 0,
		maxPopulation: 0, // maximum population ever reached in this camp
		populationChangePerSec: 0,
		rumourpool: 0,
		rumourpoolchecked: false,
		assignedWorkers: {}, // id => number
		autoAssignedWorkers: {}, // id => bool
		campName: "",
		lastRaid: null,
		
		pendingPopulation: 0,
		pendingRecruits: [],
		
		constructor: function (id) {
			this.id = id;
			this.population = 0;
			this.maxPopulation = 0;
			this.rumourpool = 0;
			this.rumourpoolchecked = false;
			this.assignedWorkers = {};
			this.autoAssignedWorkers = {};
			for(var worker in CampConstants.workerTypes) {
				this.assignedWorkers[worker.id] = 0;
				this.autoAssignedWorkers[worker.id] = false;
			}
			this.campName = "";
			this.lastRaid = new RaidVO(null);
			
			this.pendingPopulation = 0;
			this.pendingRecruits = [];
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
		
		getAutoAssignedWorkers: function () {
			let result = [];
			for(var key in this.autoAssignedWorkers) {
				if (this.autoAssignedWorkers[key]) {
					result.push(key);
				}
			}
			return result;
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

		getCustomSaveObject: function () {
			var copy = {};
			copy.id = this.id;
			copy.campName = this.campName;
			copy.population = this.population || 0;
			copy.maxPopulation = this.maxPopulation || 0;
			copy.foundedTimeStamp = this.foundedTimeStamp;
			copy.lastRaid = this.lastRaid;
			copy.assignedWorkers = this.assignedWorkers;
			copy.autoAssignedWorkers = this.autoAssignedWorkers;
			copy.rumourpool = this.rumourpool;
			copy.rumourpoolchecked = this.rumourpoolchecked;
			
			copy.pendingPopulation = this.pendingPopulation;
			if (this.pendingRecruits.length > 0) {
				copy.pendingRecruits = this.pendingRecruits;
			}
			
			return copy;
		},
	});

	return CampComponent;
});
