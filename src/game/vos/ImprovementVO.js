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
		
		getReputationBonus: function () {
			return getImprovementReputationBonus(this.name, this.level);
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
			
		}
	});
	
	// TODO move to ImprovementConstants
	
	getImprovementType = function (name) {
		if (!name) return null;
		switch (name) {
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
	
	getImprovementReputationBonus = function (name, level) {
		if (getImprovementType(name) == improvementTypes.level) return 0;
		level = level || 1;
		switch (name) {
			case improvementNames.home:
			case improvementNames.apothecary:
			case improvementNames.smithy:
			case improvementNames.cementmill:
			case improvementNames.barracks:
			case improvementNames.fortification:
			case improvementNames.storage:
			case improvementNames.stable:
				return 0;
			case improvementNames.house:
			case improvementNames.house2:
			case improvementNames.darkfarm:
			case improvementNames.library:
			case improvementNames.lights:
			case improvementNames.generator:
			case improvementNames.shrine:
				return 0.5;
			case improvementNames.inn:
			case improvementNames.market:
			case improvementNames.tradepost:
				return 1;
			case improvementNames.campfire:
			case improvementNames.hospital:
			case improvementNames.sundome:
				return 2;
			case improvementNames.temple:
				return 3;
			case improvementNames.square:
			case improvementNames.garden:
				return 1.9 + level * 0.1;
			case improvementNames.radiotower:
				let fullUpgradeEffect = 2;
				let upgradeFactor = (level - 1) / 9;
				let upgradePart = fullUpgradeEffect * upgradeFactor;
				return 2 + Math.round(upgradeFactor * 10) / 10;
			default:
				return 1;
		}
	};
	
	return ImprovementVO;
});
