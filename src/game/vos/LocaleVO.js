// Locale / point of interest: an additional scoutable location in a sector
define(['ash', 'game/vos/ResourcesVO'], function (Ash, ResourcesVO) {

	localeTypes = {
		factory: 0,
		house: 1,
		lab: 2,
		grove: 3,
		market: 4,
		maintenance: 5,
		transport: 6,
		sewer: 7,
        warehouse: 8,
		
		camp: 50,
		hut: 51,
		hermit: 52,
		caravan: 53,
	};
    
    var LocaleVO = Ash.Class.extend({
		
		type: -1,
		isEasy: false,
		requirements: {},
        costs: {},
	
        constructor: function (type, isEasy) {
			this.type = type;
			this.isEasy = isEasy;
			this.requirements.vision = this.getVisionRequirement();
			this.costs = {};
			this.costs.stamina = this.getStaminaRequirement();
			this.costs.item_exploration_1 = this.getCategory() == "u" ? 1 : 0;
		},
        
        getVisionRequirement: function () {
            switch (this.type) {
                case localeTypes.factory: return 50;
                case localeTypes.house: return 30;
                case localeTypes.lab: return this.isEasy ? 50 : 90;
                case localeTypes.grove: return 20;
                case localeTypes.market: return 40;
                case localeTypes.maintenance: return 50;
                case localeTypes.transport: return 50;
                case localeTypes.sewer: return this.isEasy ? 50 : 80;
                case localeTypes.warehouse: return this.isEasy ? 50 : 60;
                case localeTypes.camp: return 20;
                case localeTypes.hut: return 30;
                case localeTypes.hermit: return 30;
                case localeTypes.caravan: return 30;
                default: return 30;
            }
        },
        
        getStaminaRequirement: function () {
            switch (this.type) {
                case localeTypes.factory: return 80;
                case localeTypes.house: return 20;
                case localeTypes.lab: return 60;
                case localeTypes.grove: return 10;
                case localeTypes.market: return 20;
                case localeTypes.maintenance: return 75;
                case localeTypes.transport: return 40;
                case localeTypes.sewer: return 70;
                case localeTypes.warehouse: return 10;
                case localeTypes.camp: return 20;
                case localeTypes.hut: return 30;
                case localeTypes.hermit: return 40;
                case localeTypes.caravan: return 40;
                default: return 20;
            }
        },
        
        getResourceBonus: function (unlockedResources) {
            var res = new ResourcesVO();
            switch (this.type) {
            case localeTypes.factory:
                res.addResource(resourceNames.metal, 10);
                if (unlockedResources.concrete) res.addResource(resourceNames.concrete, 10);
                if (unlockedResources.tools) res.addResource(resourceNames.tools, 5);
                break;
            case localeTypes.house:
                res.addResource(resourceNames.food, 10);
                res.addResource(resourceNames.water, 10);
                res.addResource(resourceNames.medicine, 5);
                break;
            case localeTypes.lab:
                res.addResource(resourceNames.water, 5);
                res.addResource(resourceNames.medicine, 10);
                break;
            case localeTypes.grove:
                res.addResource(resourceNames.water, 5);
                res.addResource(resourceNames.herbs, 10);
                break;
            case localeTypes.market:
                res.addResource(resourceNames.food, 10);
                res.addResource(resourceNames.water, 5);
                if (unlockedResources.tools) res.addResource(resourceNames.tools, 5);
                break;
            case localeTypes.maintenance:
            case localeTypes.transport:
                res.addResource(resourceNames.water, 5);
                if (unlockedResources.tools) res.addResource(resourceNames.tools, 5);
                break;
            case localeTypes.sewer:
            case localeTypes.warehouse:
                res.addResource(resourceNames.metal, 10);
                res.addResource(resourceNames.food, 10);
                if (unlockedResources.concrete) res.addResource(resourceNames.concrete, 10);
                break;
            }
            
            return res;
        },
        
		getCategory: function () {
			switch (this.type) {
                case localeTypes.camp:
                case localeTypes.hut:
                case localeTypes.hermit:
                case localeTypes.caravan:
					return "i";
				
				default:
					return "u";
			}
		},
		
    });

    return LocaleVO;
});
