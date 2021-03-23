// Locale / point of interest: an additional scoutable location in a sector
define(['ash', 'game/vos/ResourcesVO', 'game/constants/LocaleConstants', 'game/constants/PlayerStatConstants'],
function (Ash, ResourcesVO, LocaleConstants, PlayerStatConstants) {

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
		library: 9,
		
		camp: 50,
		hut: 51,
		hermit: 52,
		caravan: 53,
		tradingpartner: 54
	};
	
	var LocaleVO = Ash.Class.extend({
		
		type: -1,
		isEasy: false,
		isEarly: true,
		requirements: {},
		costs: {},
	
		constructor: function (type, isEasy, isEarly) {
			this.type = type;
			this.isEasy = isEasy;
			this.isEarly = isEarly;
			this.requirements.vision = [this.getVisionRequirement(), -1];
			this.costs = {};
			this.costs.stamina = this.getStaminaRequirement();
			if (type !== localeTypes.grove) {
				 this.costs.item_exploration_1 = 1;
			}
		},
		
		getVisionRequirement: function () {
			return 50;
		},
		
		getStaminaRequirement: function () {
			var maxCost = PlayerStatConstants.MAX_SCOUT_LOCALE_STAMINA_COST;
			var minCost = 100;
			var difficulty = 0.5;
			switch (this.type) {
				case localeTypes.factory: difficulty = 1; break;
				case localeTypes.house: difficulty = 0.15; break;
				case localeTypes.lab: difficulty = 0.85; break;
				case localeTypes.grove: difficulty = 0; break;
				case localeTypes.market: difficulty = 0.15; break;
				case localeTypes.maintenance: difficulty = 1; break;
				case localeTypes.transport: difficulty = 0.5; break;
				case localeTypes.sewer: difficulty = 1; break;
				case localeTypes.warehouse: difficulty = 0; break;
				case localeTypes.camp: difficulty = 0.15; break;
				case localeTypes.tradingpartner: difficulty = 0.15; break;
				case localeTypes.hut: difficulty = 0.35; break;
				case localeTypes.hermit: difficulty = 0.5; break;
				default: return 20;
			}
			return Math.floor((minCost + (maxCost - minCost) * difficulty) / 100) * 100;
		},
		
		getResourceBonus: function (unlockedResources, campOrdinal) {
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
				if (campOrdinal > 2) res.addResource(resourceNames.medicine, 5);
				break;
			case localeTypes.lab:
				res.addResource(resourceNames.water, 5);
				if (campOrdinal > 1) res.addResource(resourceNames.medicine, 10);
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
				case localeTypes.tradingpartner:
					return "i";
				
				default:
					return "u";
			}
		},
		
		getBracket: function () {
			return this.isEarly ? LocaleConstants.LOCALE_BRACKET_EARLY : LocaleConstants.LOCALE_BRACKET_LATE;
		},
		
		hasBlueprints: function () {
			switch (this.type) {
				case localeTypes.grove:
				case localeTypes.tradingpartner:
					return false;
				
				default:
					return true;
			}
		},
		
		getDebugName: function () {
			var value = this.type;
			var key = Object.keys(localeTypes).filter(function(key) {return localeTypes[key] === value})[0];
			return key;
		}
		
	});

	return LocaleVO;
});
