// Locale / point of interest: an additional scoutable location in a sector
define(['ash', 'game/constants/WorldConstants', 'game/constants/ItemConstants', 'game/vos/ResourcesVO', 'game/constants/LocaleConstants', 'game/constants/PlayerStatConstants'],
function (Ash, WorldConstants, ItemConstants, ResourcesVO, LocaleConstants, PlayerStatConstants) {

	localeTypes = {
		// uninhabited
		factory: "factory",
		house: "house",
		lab: "lab",
		market: "market",
		maintenance: "maintenance",
		transport: "transport",
		junkyard: "junkyard",
		warehouse: "warehouse",
		library: "library",
		farm: "farm",
		bunker: "bunker",
		restaurant: "restaurant",
		grocery: "grocery",
		store: "store",
		office: "office",
		hospital: "hospital",
		
		// inhabited
		camp: "camp",
		tradingpartner: "tradingpartner",
		clinic: "clinic",

		// unique
		grove: "grove",
		greenhouse: "greenhouse", // x2
		depot: "depot", // x2
		spacefactory: "spacefactory",
		seedDepot: "seedDepot",
		shelter: "shelter",
		compound: "compound",
		expedition: "expedition",
		isolationCenter: "isolationCenter"
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
			
			switch (type) {
				case localeTypes.grove:
				case localeTypes.tradingpartner:
				case localeTypes.clinic:
				case localeTypes.camp:
					break;
				default:
					this.costs.item_exploration_1 = 1;
					break;
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
				case localeTypes.clinic: return 3;
				case localeTypes.depot: difficulty = 1; break;
				case localeTypes.expedition: difficulty = 0.1; break;
				case localeTypes.isolationCenter: difficulty = 1; break;
				case localeTypes.factory: difficulty = 1; break;
				case localeTypes.farm: difficulty = 0.4; break;
				case localeTypes.greenhouse: difficulty = 0.2; break;
				case localeTypes.grocery: difficulty = 0.4; break;
				case localeTypes.grove: difficulty = 0; break;
				case localeTypes.hospital: difficulty = 0.25; break;
				case localeTypes.house: difficulty = 0.15; break;
				case localeTypes.lab: difficulty = 0.85; break;
				case localeTypes.library: difficulty = 0.3; break;
				case localeTypes.maintenance: difficulty = 1; break;
				case localeTypes.market: difficulty = 0.15; break;
				case localeTypes.office: difficulty = 0.25; break;
				case localeTypes.restaurant: difficulty = 0.25; break;
				case localeTypes.seedDepot: difficulty = 0.5; break;
				case localeTypes.junkyard: difficulty = 1; break;
				case localeTypes.shelter: difficulty = 0.15; break;
				case localeTypes.spacefactory: difficulty = 1; break;
				case localeTypes.store: difficulty = 0.3; break;
				case localeTypes.tradingpartner: difficulty = 0.15; break;
				case localeTypes.transport: difficulty = 0.5; break;
				case localeTypes.warehouse: difficulty = 0; break;
			}
			return Math.floor((minCost + (maxCost - minCost) * difficulty) / 100) * 100;
		},
		
		getResourceBonus: function (unlockedResources, campOrdinal) {
			// TODO make robot rewards work (figure out what to do if camp has space, and make sure to assign to camp and not to global resources)
			let res = new ResourcesVO();
			let abundant = WorldConstants.resourcePrevalence.ABUNDANT;
			let defaultAmount = WorldConstants.resourcePrevalence.DEFAULT;
			switch (this.type) {
				case localeTypes.bunker:
					res.addResource(resourceNames.fuel, defaultAmount);
					if (unlockedResources.tools) res.addResource(resourceNames.tools, defaultAmount);
					break;
				case localeTypes.clinic:
					res.addResource(resourceNames.rope, defaultAmount);
					if (unlockedResources.medicine) res.addResource(resourceNames.medicine, defaultAmount);
					break;
				case localeTypes.factory:
				case localeTypes.spacefactory:
					res.addResource(resourceNames.metal, abundant);
					if (unlockedResources.concrete) res.addResource(resourceNames.concrete, abundant);
					//if (unlockedResources.robots) res.addResource(resourceNames.robots, defaultAmount);
					if (unlockedResources.tools) res.addResource(resourceNames.tools, defaultAmount);
					break;
				case localeTypes.farm:
					res.addResource(resourceNames.food, defaultAmount);
					res.addResource(resourceNames.fuel, defaultAmount);
					res.addResource(resourceNames.herbs, defaultAmount);
					if (unlockedResources.tools) res.addResource(resourceNames.tools, defaultAmount);
					break;
				case localeTypes.house:
					res.addResource(resourceNames.food, abundant);
					res.addResource(resourceNames.water, abundant);
					if (campOrdinal > 3) res.addResource(resourceNames.medicine, defaultAmount);
					break;
				case localeTypes.hospital:
				case localeTypes.lab:
					res.addResource(resourceNames.water, defaultAmount);
					if (campOrdinal > 3) res.addResource(resourceNames.medicine, abundant);
					break;
				case localeTypes.grocery:
				case localeTypes.store:
					res.addResource(resourceNames.food, defaultAmount);
					res.addResource(resourceNames.water, defaultAmount);
					res.addResource(resourceNames.rope, defaultAmount);
					break;
				case localeTypes.grove:
					res.addResource(resourceNames.water, defaultAmount);
					res.addResource(resourceNames.herbs, abundant);
					break;
				case localeTypes.greenhouse:
					res.addResource(resourceNames.water, defaultAmount);
					break;
				case localeTypes.market:
					res.addResource(resourceNames.food, abundant);
					res.addResource(resourceNames.water, defaultAmount);
					res.addResource(resourceNames.rope, defaultAmount);
					if (unlockedResources.tools) res.addResource(resourceNames.tools, defaultAmount);
					break;
				case localeTypes.office:
					res.addResource(resourceNames.food, defaultAmount);
					res.addResource(resourceNames.water, defaultAmount);
					res.addResource(resourceNames.rope, defaultAmount);
					break;
				case localeTypes.maintenance:
				case localeTypes.transport:
					res.addResource(resourceNames.water, defaultAmount);
					res.addResource(resourceNames.fuel, defaultAmount);
					res.addResource(resourceNames.metal, abundant);
					if (unlockedResources.tools) res.addResource(resourceNames.tools, defaultAmount);
					//if (unlockedResources.robots) res.addResource(resourceNames.robots, defaultAmount);
					break;
				case localeTypes.restaurant:
					res.addResource(resourceNames.food, defaultAmount);
					res.addResource(resourceNames.water, defaultAmount);
					break;
				case localeTypes.junkyard:
				case localeTypes.warehouse:
				case localeTypes.depot:
					res.addResource(resourceNames.metal, abundant);
					res.addResource(resourceNames.food, abundant);
					if (unlockedResources.concrete) res.addResource(resourceNames.concrete, abundant);
					break;
			}
			
			return res;
		},

		getCurrencyFindProbabilityModifier: function () {
			switch (this.type) {
				case localeTypes.bunker:
				case localeTypes.clinic:
				case localeTypes.depot:
				case localeTypes.expedition:
				case localeTypes.factory:
				case localeTypes.farm:
				case localeTypes.greenhouse:
				case localeTypes.grove:
				case localeTypes.hospital:
				case localeTypes.isolationCenter:
				case localeTypes.junkyard:
				case localeTypes.library:
				case localeTypes.maintenance:
				case localeTypes.seedDepot:
				case localeTypes.spacefactory:
				case localeTypes.warehouse:
					return 0;
				case localeTypes.camp:
				case localeTypes.tradingpartner:
					return 0;
				case localeTypes.grocery:
				case localeTypes.lab:
				case localeTypes.office:
				case localeTypes.restaurant:
				case localeTypes.transport:
					return 0.5;
				case localeTypes.house:
				case localeTypes.market:
				case localeTypes.store:
				case localeTypes.compound:
					return 1;
			}

			return 0;
		},

		getItemTags: function () {
			switch (this.type) {
				case localeTypes.bunker: 
					return [ ItemConstants.itemTags.old, ItemConstants.itemTags.equipment ];
				case localeTypes.clinic: 
					return [ ItemConstants.itemTags.medical, ItemConstants.itemTags.new ];
				case localeTypes.factory:
					return [ ItemConstants.itemTags.industrial, ItemConstants.itemTags.clothing ];
				case localeTypes.farm:
					return [ ItemConstants.itemTags.nature, ItemConstants.itemTags.old ];
				case localeTypes.grove:
					return [ ItemConstants.itemTags.nature ];
				case localeTypes.greenhouse:
					return [ ItemConstants.itemTags.nature ];
				case localeTypes.library:
					return [ ItemConstants.itemTags.science, ItemConstants.itemTags.history, ItemConstants.itemTags.book ];
				case localeTypes.maintenance:
					return [ ItemConstants.itemTags.maintenance, ItemConstants.itemTags.indutrial ];
				case localeTypes.junkyard:
					return [ ItemConstants.itemTags.maintenance, ItemConstants.itemTags.valuable ];
				case localeTypes.warehouse:
				case localeTypes.depot:
					return [ ItemConstants.itemTags.perishable, ItemConstants.itemTags.clothing ];
				case localeTypes.camp:
					return [ ItemConstants.itemTags.new, ItemConstants.itemTags.equipment ];
				case localeTypes.tradingpartner:
					return [ ItemConstants.itemTags.valuable ];
				case localeTypes.grocery:
					return [ ItemConstants.itemTags.perishable, ItemConstants.itemTags.medical ];
				case localeTypes.office:
					return [ ItemConstants.itemTags.science, ItemConstants.itemTags.valuable, ItemConstants.itemTags.community ];
				case localeTypes.lab:
				case localeTypes.spacefactory:
					return [ ItemConstants.itemTags.science, ItemConstants.itemTags.industrial ];
				case localeTypes.hospital:
					return [ ItemConstants.itemTags.medical, ItemConstants.itemTags.science ];
				case localeTypes.restaurant:
					return [ ItemConstants.itemTags.perishabl, ItemConstants.itemTags.community ];
				case localeTypes.transport:
					return [ ItemConstants.itemTags.maintenance, ItemConstants.itemTags.community ];
				case localeTypes.house:
					return [ ItemConstants.itemTags.valuable, ItemConstants.itemTags.keepsake ];
				case localeTypes.market:
					return [ ItemConstants.itemTags.clothing, ItemConstants.itemTags.community ];
				case localeTypes.store:
					return [ ItemConstants.itemTags.clothing, ItemConstants.itemTags.valuable ];
				default: return [];
			}
		},
		
		getCategory: function () {
			switch (this.type) {
				case localeTypes.camp:
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
				case localeTypes.lab: return 0.2;
				case localeTypes.junkyard: return 0.3;
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
