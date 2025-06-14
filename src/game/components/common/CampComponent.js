// Marks that given entity (should be a Sector) contains a Camp
define(['ash', 'game/constants/CampConstants', 'game/vos/EventVO'], function (Ash, CampConstants, EventVO) {
	
	let CampComponent = Ash.Class.extend({
		
		id: "",

		population: 0,
		disabledPopulation: [], // population not available for work, { num: int, reason: string, timer: int (seconds), initialTimer: int (seconds) }
		maxPopulation: 0, // maximum population ever reached in this camp
		populationByOrigin: {}, // origin: number

		populationChangePerSec: 0,
		populationChangePerSecWithoutCooldown: 0,
		populationDecreaseCooldown: 0,
		
		rumourpool: 0,
		rumourpoolchecked: false,
		
		assignedWorkers: {}, // id => number
		autoAssignedWorkers: {}, // id => bool
		
		campName: "",

		availableLuxuryResources: [],
		
		lastRaid: null,
		lastEvent: null,
		
		pendingPopulation: 0,
		pendingRecruits: [],
		
		constructor: function (id) {
			this.id = id;
			this.population = 0;
			this.disabledPopulation = [];
			this.maxPopulation = 0;
			this.populationByOrigin = {};
			
			this.rumourpool = 0;
			this.rumourpoolchecked = false;
			this.campFireStarted = false;

			this.assignedWorkers = {};
			this.autoAssignedWorkers = {};
			for(var worker in CampConstants.workerTypes) {
				this.assignedWorkers[worker.id] = 0;
				this.autoAssignedWorkers[worker.id] = false;
			}
			this.campName = "";

			this.availableLuxuryResources = [];
			
			this.lastRaid = new EventVO(null);
			this.lastEvent = new EventVO(null);
			
			this.pendingPopulation = 0;
			this.pendingRecruits = [];
			
			this.displayedCharacters = [];
		},
		
		// population available for work
		getFreePopulation: function () {
			return Math.floor(this.population) - this.getAssignedPopulation() - this.getDisabledPopulation();
		},
		
		// population assigned to work
		getAssignedPopulation: function () {
			var assigned = 0;
			for(var key in this.assignedWorkers) {
				assigned += this.assignedWorkers[key] || 0;
			}
			return assigned;
		},

		// population unable to work
		getDisabledPopulation: function () {
			let result = 0;
			for (let i = 0; i < this.disabledPopulation.length; i++) {
				result += this.disabledPopulation[i].num;
			}
			return result;
		},

		getDisabledPopulationBySource: function (source) {
			for (let i = 0; i < this.disabledPopulation.length; i++) {
				let pop = this.disabledPopulation[i];
				if (pop.reason == source) {
					return pop;
				}
			}
			return null;
		},
		
		getCurrentWorkerAssignment: function () {
			return this.assignedWorkers;
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
			let oldPopulation = this.population;
			this.population += value;
			this.maxPopulation = Math.max(this.population, this.maxPopulation);
			let change = this.population - oldPopulation;
			this.rumourpool += change * CampConstants.POOL_RUMOURS_PER_POPULATION;
		},

		addDisabledPopulation: function (num, workerType, reason, timer) {
			let initialTimer = timer > 0 ? timer : null;
			this.disabledPopulation.push({ num: num, workerType: workerType, reason: reason, timer: initialTimer, initialTimer: initialTimer });
		},

		handlePopulationDecreased: function (value) {
			for (let i = 0; i < value; i++) {
				let numDisabled = this.getDisabledPopulation();
				let disabledChance = Math.pow(numDisabled, 2) / Math.pow(this.population, 2);
				if (numDisabled >= this.population) disabledChance = 1;
				if (Math.random() < disabledChance) {
					this.removeDisabledPopulation(1);
				}
			}
		},

		removeDisabledPopulation: function (num) {
			let remaining = num;
			for (let i = 0; i < this.disabledPopulation.length; i++) {
				let pop = this.disabledPopulation[i];
				let removed = Math.min(pop.num, remaining);
				pop.num -= removed;
				remaining -= removed;
				if (remaining <= 0) {
					break;
				}
			}
		},

		removeAllDisabledPopulationByReason: function (reason) {
			let newValue = [];

			for (let i = 0; i < this.disabledPopulation.length; i++) {
				let pop = this.disabledPopulation[i];
				if (pop.reason == reason) continue;
				newValue.push(pop);
			}

			this.disabledPopulation = newValue;
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
			let copy = {};
			
			copy.id = this.id;
			copy.campName = this.campName;
			copy.population = this.population || 0;
			copy.disabledPopulation = this.disabledPopulation || [];
			copy.maxPopulation = this.maxPopulation || 0;
			copy.populationByOrigin = this.populationByOrigin || {};
			copy.foundedTimeStamp = this.foundedTimeStamp;
			copy.foundedTimeStampGameTime = this.foundedTimeStampGameTime;
			copy.lastRaid = this.lastRaid;
			copy.lastEvent = this.lastEvent;
			copy.assignedWorkers = this.assignedWorkers;
			copy.autoAssignedWorkers = this.autoAssignedWorkers;
			copy.rumourpool = this.rumourpool;
			copy.rumourpoolchecked = this.rumourpoolchecked;
			copy.campFireStarted = this.campFireStarted;
			
			copy.populationDecreaseCooldown = this.populationDecreaseCooldown;
			
			copy.pendingPopulation = this.pendingPopulation;
			if (this.pendingRecruits.length > 0) {
				copy.pendingRecruits = this.pendingRecruits;
			}
			
			return copy;
		},
	});

	return CampComponent;
});
