define(['ash', 'game/vos/ResourcesVO'], function (Ash, ResourcesVO) {
	
	// Global static definitions
	improvementNames = {
		camp: "Camp",
		collector_food: "Trap",
		collector_water: "Bucket",
		beacon: "Beacon",
		
		passageUpStairs: "Staircase Up",
		passageUpElevator: "Elevator Up (Repair)",
		passageUpHole: "Elevator Up (Build)",
		passageDownStairs: "Staircase Down",
		passageDownElevator: "Elevator Down (Repair)",
		passageDownHole: "Elevator Down (Build)",
		spaceship1: "Colony Hull",
		spaceship2: "Colony Shield",
		spaceship3: "Colony Life Support",
		greenhouse: "Greenhouse",
		tradepost_connector: "Great Elevator",
		sundome: "Sun Dome",
		luxuryOutpost: "Resource outpost",
		
		home: "Tent",
		house: "Hut",
		house2: "Tower block",
		storage: "Storage",
		campfire: "Campfire",
		darkfarm: "Snail farm",
		hospital: "Clinic",
		generator: "Generator",
		tradepost: "Trading post",
		inn: "Inn",
		apothecary: "Apothecary",
		smithy: "Smithy",
		cementmill: "Cement mill",
		robotFactory: "Robot factory",
		library: "Library",
		shrine: "Shrine",
		temple: "Temple",
		market: "Market",
		radiotower: "Radio tower",
		barracks: "Barracks",
		fortification: "Fortification",
		stable: "Caravan Stable",
		aqueduct: "Aqueduct",
		researchcenter: "Research center",
		lights: "Lights",
		square: "Square",
		garden: "Moss garden",
	};
	
	improvementTypes = {
		camp: "Camp",
		level: "Level",
	};
	
	var ImprovementVO = Ash.Class.extend({
	
		constructor: function (name) {
			this.name = name;
			this.count = 0;
			this.level = 1;
			this.numDamaged = 0;
			this.damagedSource = null;
			
			this.initStorage();
		},
	
		initStorage: function() {
			switch (this.name) {
				case improvementNames.collector_food:
					this.storedResources = new ResourcesVO();
					this.storageCapacity = new ResourcesVO();
					this.storageCapacity.food = 10;
					break;
				case improvementNames.collector_water:
					this.storedResources = new ResourcesVO();
					this.storageCapacity = new ResourcesVO();
					this.storageCapacity.water = 10;
					break;
			}
		},
		
		getType: function() {
			return getImprovementType(this.name);
		},
		
		getKey: function () {
			return this.name.toLowerCase().replace(" ", "-");
		},
		
		isPassage: function () {
			switch (this.name) {
				case improvementNames.passageUpStairs:
				case improvementNames.passageUpElevator:
				case improvementNames.passageUpHole:
				case improvementNames.passageDownStairs:
				case improvementNames.passageDownElevator:
				case improvementNames.passageDownHole:
					return true;
				default:
					return false;
			}
		},
		
		getVisCount: function () {
			switch (this.name) {
				case improvementNames.lights:
					return 4;
				case improvementNames.fortification:
					return 2;
				default:
					return 1;
			}
		},
		
		getCustomSaveObject: function () {
			let copy = {};
			copy.name = this.name;
			if (this.count !== 1) {
				copy.count = this.count;
			}
			if (this.level > 1) {
				copy.level = this.level;
			}
			if (this.numDamaged > 0) {
				copy.numDamaged = this.numDamaged;
			}
			if (this.damagedSource) {
				copy.damagedSource = this.damagedSource;
			}
			if (this.storedResources) copy.storedResources = this.storedResources.getCustomSaveObject();
			if (this.storageCapacity) copy.storageCapacity = this.storageCapacity.getCustomSaveObject();
			return copy;
		},

		customLoadFromSave: function (componentValues) {
			if (!componentValues) return;
			if (componentValues.name) this.name = componentValues.name;
			if (componentValues.count) this.count = componentValues.count;
			
			this.count = componentValues.count === 0 ? 0 : componentValues.count ? componentValues.count : 1;
			this.level = componentValues.level ? componentValues.level : 1;
			this.numDamaged = componentValues.numDamaged ? componentValues.numDamaged : 0;
			this.damagedSource = componentValues.damagedSource ? componentValues.damagedSource : null;
			
			if (this.storedResources) this.storedResources.customLoadFromSave(componentValues.storedResources);
			if (this.storageCapacity) this.storageCapacity.customLoadFromSave(componentValues.storageCapacity);
		},
	});
	
	// TODO move to ImprovementConstants
	
	getImprovementType = function (name) {
		if (!name) return null;
		switch (name) {
			case improvementNames.camp:
			case improvementNames.collector_food:
			case improvementNames.collector_water:
			case improvementNames.greenhouse:
			case improvementNames.spaceship1:
			case improvementNames.spaceship2:
			case improvementNames.spaceship3:
			case improvementNames.passageUpStairs:
			case improvementNames.passageUpElevator:
			case improvementNames.passageUpHole:
			case improvementNames.passageDownStairs:
			case improvementNames.passageDownElevator:
			case improvementNames.passageDownHole:
			case improvementNames.beacon:
			case improvementNames.tradepost_connector:
			case improvementNames.sundome:
			case improvementNames.luxuryOutpost:
				return improvementTypes.level;

			default:
				return improvementTypes.camp;
		}
	};
	
	return ImprovementVO;
});
