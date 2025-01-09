// Locale / point of interest: an additional scoutable location in a sector
define(['ash', 'game/constants/WorldConstants', 'game/vos/ResourcesVO', 'game/constants/LocaleConstants', 'game/constants/PlayerStatConstants'],
function (Ash, WorldConstants, ResourcesVO, LocaleConstants, PlayerStatConstants) {

	localeTypes = {
		// uninhabited
		factory: 0,
		house: 1,
		lab: 2,
		market: 4,
		maintenance: 5,
		transport: 6,
		sewer: 7,
		warehouse: 8,
		library: 9,
		farm: 10,
		bunker: 11,
		restaurant: 12,
		grocery: 13,
		store: 14,
		
		// inhabited
		camp: 50,
		hut: 51,
		hermit: 52,
		caravan: 53,
		tradingpartner: 54,
		clinic: 55,

		// unique
		grove: 3,
		greenhouse: "greenhouse",
	};
	
	var LocaleVO = Ash.Class.extend({
		
		type: -1,
		isEasy: false,
		isEarly: true,
		requirements: {},
		costs: {},
		
		hasBlueprints: false,
		explorerID: null,
		luxuryResource: null,
	
		constructor: function (type, isEasy, isEarly) {
			this.type = type;
			this.isEasy = isEasy;
			this.isEarly = isEarly;
			
			this.requirements.vision = [this.getVisionRequirement(), -1];
			this.costs = {};
			this.costs.stamina = this.getStaminaRequirement();
			if (type !== localeTypes.grove && type !== localeTypes.tradingpartner) {
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
				case localeTypes.bunker: difficulty = 0.6; break;
				case localeTypes.camp: difficulty = 0.15; break;
				case localeTypes.caravan: difficulty = 0.1; break;
				case localeTypes.clinic: difficulty = 0.2; break;
				case localeTypes.factory: difficulty = 1; break;
				case localeTypes.farm: difficulty = 0.4; break;
				case localeTypes.greenhouse: difficulty = 0.2; break;
				case localeTypes.grocery: difficulty = 0.4; break;
				case localeTypes.grove: difficulty = 0; break;
				case localeTypes.hermit: difficulty = 0.5; break;
				case localeTypes.house: difficulty = 0.15; break;
				case localeTypes.hut: difficulty = 0.35; break;
				case localeTypes.lab: difficulty = 0.85; break;
				case localeTypes.library: difficulty = 0.3; break;
				case localeTypes.maintenance: difficulty = 1; break;
				case localeTypes.market: difficulty = 0.15; break;
				case localeTypes.restaurant: difficulty = 0.25; break;
				case localeTypes.sewer: difficulty = 1; break;
				case localeTypes.store: difficulty = 0.3; break;
				case localeTypes.tradingpartner: difficulty = 0.15; break;
				case localeTypes.transport: difficulty = 0.5; break;
				case localeTypes.warehouse: difficulty = 0; break;
			}
			return Math.floor((minCost + (maxCost - minCost) * difficulty) / 100) * 100;
		},
		
		getResourceBonus: function (unlockedResources, campOrdinal) {
			// TODO make robot rewards work (figure out what to do if camp has space, and make sure to assign to camp and not to global resources)
			let res = new ResourcesVO(storageTypes.DEFINITION);
			let abundant = WorldConstants.resourcePrevalence.ABUNDANT;
			let defaultAmount = WorldConstants.resourcePrevalence.DEFAULT;
			switch (this.type) {
				case localeTypes.bunker:
					res.addResource(resourceNames.fuel, defaultAmount, "definition");
					if (unlockedResources.tools) res.addResource(resourceNames.tools, defaultAmount, "definition");
					break;
				case localeTypes.clinic:
					res.addResource(resourceNames.rope, defaultAmount, "definition");
					if (unlockedResources.medicine) res.addResource(resourceNames.medicine, defaultAmount, "definition");
					break;
				case localeTypes.factory:
					res.addResource(resourceNames.metal, abundant, "definition");
					if (unlockedResources.concrete) res.addResource(resourceNames.concrete, abundant, "definition");
					//if (unlockedResources.robots) res.addResource(resourceNames.robots, defaultAmount, "definition");
					if (unlockedResources.tools) res.addResource(resourceNames.tools, defaultAmount, "definition");
					break;
				case localeTypes.farm:
					res.addResource(resourceNames.food, defaultAmount, "definition");
					res.addResource(resourceNames.fuel, defaultAmount, "definition");
					res.addResource(resourceNames.herbs, defaultAmount, "definition");
					if (unlockedResources.tools) res.addResource(resourceNames.tools, defaultAmount, "definition");
					break;
				case localeTypes.house:
					res.addResource(resourceNames.food, abundant, "definition");
					res.addResource(resourceNames.water, abundant, "definition");
					if (campOrdinal > 3) res.addResource(resourceNames.medicine, defaultAmount, "definition");
					break;
				case localeTypes.lab:
					res.addResource(resourceNames.water, defaultAmount, "definition");
					if (campOrdinal > 3) res.addResource(resourceNames.medicine, abundant, "definition");
					break;
				case localeTypes.grocery:
				case localeTypes.store:
					res.addResource(resourceNames.food, defaultAmount, "definition");
					res.addResource(resourceNames.water, defaultAmount, "definition");
					res.addResource(resourceNames.rope, defaultAmount, "definition");
					break;
				case localeTypes.grove:
					res.addResource(resourceNames.water, defaultAmount, "definition");
					res.addResource(resourceNames.herbs, abundant, "definition");
					break;
				case localeTypes.greenhouse:
					res.addResource(resourceNames.water, defaultAmount, "definition");
					break;
				case localeTypes.market:
					res.addResource(resourceNames.food, abundant, "definition");
					res.addResource(resourceNames.water, defaultAmount, "definition");
					res.addResource(resourceNames.rope, defaultAmount, "definition");
					if (unlockedResources.tools) res.addResource(resourceNames.tools, defaultAmount, "definition");
					break;
				case localeTypes.maintenance:
				case localeTypes.transport:
					res.addResource(resourceNames.water, defaultAmount, "definition");
					res.addResource(resourceNames.fuel, defaultAmount, "definition");
					res.addResource(resourceNames.metal, abundant, "definition");
					if (unlockedResources.tools) res.addResource(resourceNames.tools, defaultAmount, "definition");
					//if (unlockedResources.robots) res.addResource(resourceNames.robots, defaultAmount, "definition");
					break;
				case localeTypes.restaurant:
					res.addResource(resourceNames.food, defaultAmount, "definition");
					res.addResource(resourceNames.water, defaultAmount, "definition");
					break;
				case localeTypes.sewer:
				case localeTypes.warehouse:
					res.addResource(resourceNames.metal, abundant, "definition");
					res.addResource(resourceNames.food, abundant, "definition");
					if (unlockedResources.concrete) res.addResource(resourceNames.concrete, abundant, "definition");
					break;
			}
			
			return res;
		},

		getCurrencyFindProbabilityModifier: function () {
			switch (this.type) {
				case localeTypes.bunker:
				case localeTypes.clinic:
				case localeTypes.factory:
				case localeTypes.farm:
				case localeTypes.grove:
				case localeTypes.greenhouse:
				case localeTypes.library:
				case localeTypes.maintenance:
				case localeTypes.sewer:
				case localeTypes.warehouse:
					return 0;
				case localeTypes.camp:
				case localeTypes.caravan:
				case localeTypes.hermit:
				case localeTypes.tradingpartner:
					return 0;
				case localeTypes.grocery:
				case localeTypes.hut:
				case localeTypes.lab:
				case localeTypes.restaurant:
				case localeTypes.transport:
					return 0.5;
				case localeTypes.house:
				case localeTypes.market:
				case localeTypes.store:
					return 1;
			}

			return 0;
		},

		getItemTags: function () {
			switch (this.type) {
				case localeTypes.bunker: 
					return [ "old" ];
				case localeTypes.clinic: 
					return [ "medical" ];
				case localeTypes.factory:
					return [ "industrial" ];
				case localeTypes.farm:
					return [ "agriculture" ];
				case localeTypes.grove:
					return [ "nature" ];
				case localeTypes.greenhouse:
					return [ "nature" ];
				case localeTypes.library:
					return [ "science" ];
				case localeTypes.maintenance:
					return [ "maintenance" ];
				case localeTypes.sewer:
					return [ "maintenance" ];
				case localeTypes.warehouse:
					return [ "old" ];
				case localeTypes.camp:
					return [ "keepsake" ];
				case localeTypes.caravan:
					return [ "valuable" ];
				case localeTypes.hermit:
					return [ "keepsake" ];
				case localeTypes.tradingpartner:
					return [ "valuable" ];
				case localeTypes.grocery:
					return [ "perishable" ];
				case localeTypes.hut:
					return [ "keepsake" ];
				case localeTypes.lab:
					return [ "science" ];
				case localeTypes.restaurant:
					return [ "perishable" ];
				case localeTypes.transport:
					return [ "maintenance" ];
				case localeTypes.house:
					return [ "keepsake" ];
				case localeTypes.market:
					return [ "clothing" ];
				case localeTypes.store:
					return [ "clothing" ];
				default: return [];
			}
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

		getStressedProbability: function () {
			switch (this.type) {
				case localeTypes.house: return 0.1;
				case localeTypes.bunker: return 0.1;
				case localeTypes.clinic: return 0.1;
				case localeTypes.lab: return 0.2;
				case localeTypes.sewer: return 0.3;
				default: return 0;
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
