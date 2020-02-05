define(['ash', 'game/vos/ResourcesVO'], function (Ash, ResourcesVO) {
    
    // Global static definitions
    improvementNames = {
		collector_food: "Trap",
		collector_water: "Bucket",
		
		passageUpStairs: "Staircase Up",
		passageUpElevator: "Elevator Up (Repair)",
		passageUpHole: "Elevator Up (Build)",
		passageDownStairs: "Staircase Down",
		passageDownElevator: "Elevator Down (Repair)",
		passageDownHole: "Elevator Down (Build)",
        spaceship1: "Colony Hull",
        spaceship2: "Colony Shield",
        spaceship3: "Colony Life Support",
		
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
		library: "Library",
		shrine: "Shrine",
		market: "Market",
		radiotower: "Radio tower",
		barracks: "Barracks",
		fortification: "Fortification",
		fortification2: "Concrete Fortification",
        stable: "Caravan Stable",
		aqueduct: "Aqueduct",
		researchcenter: "Research center",
		lights: "Lights",
		ceiling: "Ceiling",
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
                case improvementNames.fortification2:
                    return 2;
                default:
                    return 1;
            }
            
        }
    });
    
    // TODO make ImprovementConstants
    
    getImprovementType = function (name) {
        if (!name) return null;
        switch (name) {
            case improvementNames.collector_food:
            case improvementNames.collector_water:
            case improvementNames.spaceship1:
            case improvementNames.spaceship2:
            case improvementNames.spaceship3:
            case improvementNames.passageUpStairs:
            case improvementNames.passageUpElevator:
            case improvementNames.passageUpHole:
            case improvementNames.passageDownStairs:
            case improvementNames.passageDownElevator:
            case improvementNames.passageDownHole:
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
            case improvementNames.fortification2:
            case improvementNames.storage:
            case improvementNames.stable:
                return 0;
            case improvementNames.house:
            case improvementNames.house2:
            case improvementNames.darkfarm:
            case improvementNames.library:
            case improvementNames.lights:
            case improvementNames.generator:
                return 0.5;
            case improvementNames.inn:
            case improvementNames.market:
            case improvementNames.tradepost:
                return 1;
            case improvementNames.campfire:
            case improvementNames.hospital:
                return 2;
            case improvementNames.shrine:
                return 3;
            case improvementNames.square:
            case improvementNames.garden:
                return 1.9 + level * 0.1;
            default:
                return 1;
        }
    };
    
    return ImprovementVO;
});
