// Locale / point of interest: an additional scoutable location in a sector
define(['ash', 'game/constants/WorldConstants', 'game/vos/ResourcesVO', 'game/constants/LocaleConstants', 'game/constants/PlayerStatConstants'],
function (Ash, WorldConstants, ResourcesVO, LocaleConstants, PlayerStatConstants) {

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
		farm: 10,
		
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
		
		hasBlueprints: false,
		followerID: null,
		luxuryResource: null,
	
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
			let res = new ResourcesVO();
			let abundant = WorldConstants.resourcePrevalence.ABUNDANT;
			let defaultAmount = WorldConstants.resourcePrevalence.DEFAULT;
			switch (this.type) {
			case localeTypes.factory:
				res.addResource(resourceNames.metal, abundant);
				if (unlockedResources.concrete) res.addResource(resourceNames.concrete, abundant);
				if (unlockedResources.robots) res.addResource(resourceNames.robots, defaultAmount);
				if (unlockedResources.tools) res.addResource(resourceNames.tools, defaultAmount);
				break;
			case localeTypes.house:
				res.addResource(resourceNames.food, abundant);
				res.addResource(resourceNames.water, abundant);
				if (campOrdinal > 3) res.addResource(resourceNames.medicine, defaultAmount);
				break;
			case localeTypes.lab:
				res.addResource(resourceNames.water, defaultAmount);
				if (campOrdinal > 3) res.addResource(resourceNames.medicine, abundant);
				break;
			case localeTypes.grove:
				res.addResource(resourceNames.water, defaultAmount);
				res.addResource(resourceNames.herbs, abundant);
				break;
			case localeTypes.market:
				res.addResource(resourceNames.food, abundant);
				res.addResource(resourceNames.water, defaultAmount);
				if (unlockedResources.tools) res.addResource(resourceNames.tools, defaultAmount);
				break;
			case localeTypes.maintenance:
			case localeTypes.transport:
				res.addResource(resourceNames.water, defaultAmount);
				if (unlockedResources.tools) res.addResource(resourceNames.tools, defaultAmount);
				if (unlockedResources.robots) res.addResource(resourceNames.robots, defaultAmount);
				break;
			case localeTypes.sewer:
			case localeTypes.warehouse:
				res.addResource(resourceNames.metal, abundant);
				res.addResource(resourceNames.food, abundant);
				if (unlockedResources.concrete) res.addResource(resourceNames.concrete, abundant);
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
		
		getDebugName: function () {
			var value = this.type;
			var key = Object.keys(localeTypes).filter(function(key) {return localeTypes[key] === value})[0];
			return key;
		}
		
	});

	return LocaleVO;
});
