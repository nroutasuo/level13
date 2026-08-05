// Locale / point of interest: an additional scoutable location in a sector
define(['ash', 'game/constants/WorldConstants', 'game/constants/ItemConstants', 'game/vos/ResourcesVO', 'game/constants/LocaleConstants', 'game/constants/PlayerStatConstants'],
function (Ash, WorldConstants, ItemConstants, ResourcesVO, LocaleConstants, PlayerStatConstants) {

	localeTypes = {
		// uninhabited
		bunker: "bunker",
		factory: "factory",
		farm: "farm",
		garden: "garden",
		grocery: "grocery",
		hospital: "hospital",
		house: "house",
		junkyard: "junkyard",
		lab: "lab",
		library: "library",
		maintenance: "maintenance",
		market: "market",
		office: "office",
		pharmacy: "pharmacy",
		restaurant: "restaurant",
		shortcut: "shortcut",
		store: "store",
		train: "train",
		transport: "transport",
		warehouse: "warehouse",
		
		// inhabited
		butcher: "butcher",
		camp: "camp",
		clinic: "clinic",
		tradingpartner: "tradingpartner",
		repairshop: "repairshop",

		// unique / story
		compound: "compound",
		depot: "depot", // x2
		expedition: "expedition",
		greenhouse: "greenhouse", // x2
		grove: "grove",
		healthCenter: "healthCenter",
		isolationCenter: "isolationCenter", // x2
		seedDepot: "seedDepot",
		shelter: "shelter",
		spaceFactory: "spaceFactory", // x3 
	};
	
	let LocaleVO = Ash.Class.extend({
		
		type: -1,
		isEasy: false,
		isEarly: true,
		requirements: {},
		costs: {},
		
		hasBlueprints: false,
		explorerID: null,
		luxuryResource: null,
		textKey: null, // optional addition to text key for texts like name to create superficial variations
	
		constructor: function (type, isEasy, isEarly) {
			this.type = type;
			this.isEasy = isEasy || false;
			this.isEarly = isEarly || false;
			
			this.updateCostsAndRequirements();
		},

		updateCostsAndRequirements: function () {
			this.requirements = {};
			this.requirements.vision = [this.getVisionRequirement(), -1];
			this.costs = {};
			this.costs.stamina = this.getStaminaRequirement();
			
			switch (this.type) {
				case localeTypes.butcher:
				case localeTypes.camp:
				case localeTypes.clinic:
				case localeTypes.grove:
				case localeTypes.tradingpartner:
				case localeTypes.repairshop:
				case localeTypes.shortcut:
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
			let maxCost = PlayerStatConstants.MAX_SCOUT_LOCALE_STAMINA_COST;
			let minCost = 100;
			let difficulty = 0.5;

			switch (this.type) {
				case localeTypes.bunker: difficulty = 1; break;
				case localeTypes.butcher: return 3;
				case localeTypes.camp: difficulty = 0.15; break;
				case localeTypes.clinic: return 3;
				case localeTypes.depot: difficulty = 1; break;
				case localeTypes.expedition: difficulty = 0.1; break;
				case localeTypes.factory: difficulty = 1; break;
				case localeTypes.farm: difficulty = 0.4; break;
				case localeTypes.garden: difficulty = 0.2; break;
				case localeTypes.greenhouse: difficulty = 0.2; break;
				case localeTypes.grocery: difficulty = 0.4; break;
				case localeTypes.grove: difficulty = 0; break;
				case localeTypes.hospital: difficulty = 0.5; break;
				case localeTypes.house: difficulty = 0.2; break;
				case localeTypes.isolationCenter: difficulty = 1; break;
				case localeTypes.junkyard: difficulty = 0.75; break;
				case localeTypes.lab: difficulty = 0.85; break;
				case localeTypes.library: difficulty = 0.3; break;
				case localeTypes.maintenance: difficulty = 0.75; break;
				case localeTypes.market: difficulty = 0.15; break;
				case localeTypes.office: difficulty = 0.35; break;
				case localeTypes.pharmacy: difficulty = 0.35; break;
				case localeTypes.restaurant: difficulty = 0.25; break;
				case localeTypes.seedDepot: difficulty = 0.6; break;
				case localeTypes.shelter: difficulty = 0.15; break;
				case localeTypes.shortcut: difficulty = 0.25; break;
				case localeTypes.spaceFactory: difficulty = 1; break;
				case localeTypes.store: difficulty = 0.3; break;
				case localeTypes.tradingpartner: difficulty = 0.15; break;
				case localeTypes.train: difficulty = 0.6; break;
				case localeTypes.transport: difficulty = 0.5; break;
				case localeTypes.warehouse: difficulty = 0.4; break;
				case localeTypes.repairshop: return 3;
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
				case localeTypes.spaceFactory:
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
				case localeTypes.pharmacy:
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
				case localeTypes.train:
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
				case localeTypes.shortcut:
				case localeTypes.spaceFactory:
				case localeTypes.train:
				case localeTypes.warehouse:
					return 0;
				case localeTypes.butcher:
				case localeTypes.camp:
				case localeTypes.clinic:
				case localeTypes.tradingpartner:
				case localeTypes.repairshop:
					return 0;
				case localeTypes.grocery:
				case localeTypes.lab:
				case localeTypes.office:
				case localeTypes.pharmacy:
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
					return [ ItemConstants.itemTags.old, ItemConstants.itemTags.equipment, ItemConstants.itemTags.household ];
				case localeTypes.clinic: 
					return [ ItemConstants.itemTags.medical, ItemConstants.itemTags.new ];
				case localeTypes.factory:
					return [ ItemConstants.itemTags.industrial, ItemConstants.itemTags.clothing ];
				case localeTypes.farm:
					return [ ItemConstants.itemTags.nature, ItemConstants.itemTags.old ];
				case localeTypes.garden:
					return [ ItemConstants.itemTags.nature, ItemConstants.itemTags.community ];
				case localeTypes.grove:
					return [ ItemConstants.itemTags.nature ];
				case localeTypes.greenhouse:
					return [ ItemConstants.itemTags.nature ];
				case localeTypes.library:
					return [ ItemConstants.itemTags.science, ItemConstants.itemTags.history, ItemConstants.itemTags.book ];
				case localeTypes.maintenance:
					return [ ItemConstants.itemTags.maintenance, ItemConstants.itemTags.indutrial, ItemConstants.itemTags.electric ];
				case localeTypes.junkyard:
					return [ ItemConstants.itemTags.maintenance, ItemConstants.itemTags.valuable, ItemConstants.itemTags.household ];
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
					return [ ItemConstants.itemTags.science, ItemConstants.itemTags.valuable, ItemConstants.itemTags.community, ItemConstants.itemTags.electric ];
				case localeTypes.lab:
				case localeTypes.spaceFactory:
					return [ ItemConstants.itemTags.science, ItemConstants.itemTags.industrial, ItemConstants.itemTags.electric ];
				case localeTypes.hospital:
				case localeTypes.pharmacy:
				case localeTypes.healthCenter:
					return [ ItemConstants.itemTags.medical, ItemConstants.itemTags.science ];
				case localeTypes.restaurant:
					return [ ItemConstants.itemTags.perishabl, ItemConstants.itemTags.community ];
				case localeTypes.train:
					return [ ItemConstants.itemTags.maintenance, ItemConstants.itemTags.industrial ];
				case localeTypes.transport:
					return [ ItemConstants.itemTags.maintenance, ItemConstants.itemTags.community ];
				case localeTypes.house:
					return [ ItemConstants.itemTags.valuable, ItemConstants.itemTags.keepsake, ItemConstants.itemTags.household ];
				case localeTypes.market:
					return [ ItemConstants.itemTags.clothing, ItemConstants.itemTags.community ];
				case localeTypes.store:
					return [ ItemConstants.itemTags.clothing, ItemConstants.itemTags.valuable, ItemConstants.itemTags.household ];
				case localeTypes.shortcut:
					return [ ItemConstants.itemTags.equipment, ItemConstants.itemTags.weapon ];
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

		isInvestigatable: function () {
			switch (this.type) {
				case localeTypes.spaceFactory:
				case localeTypes.depot:
				case localeTypes.isolationCenter:
				case localeTypes.healthCenter:
					return true;
				default: 
					return false;
			}
		},

		getStressedProbability: function () {
			switch (this.type) {
				case localeTypes.bunker: return 0.1;
				case localeTypes.butcher: return 0.25;
				case localeTypes.house: return 0.1;
				case localeTypes.junkyard: return 0.3;
				case localeTypes.lab: return 0.2;
				case localeTypes.shortcut: return 0.25;
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
		},

		getCustomSaveObject: function () {
			let copy = {};
			copy.type = this.type;
			copy.isEasy = this.isEasy ? 1 : 0;
			copy.isEarly = this.isEarly ? 1 : 0;

			if (this.explorerID) copy.explorerID = this.explorerID;
			copy.hasBlueprints = this.hasBlueprints ? 1 : 0;
			if (this.luxuryResource) copy.luxuryResource = this.luxuryResource;
			if (this.textKey) copy.textKey = this.textKey;
			return copy;
		},

		customLoadFromSave: function (saveObject) {
			this.type = saveObject.type;
			this.isEasy = saveObject.isEasy ? true : false;
			this.isEarly = saveObject.isEarly ? true : false;

			this.explorerID = saveObject.explorerID || null;
			this.hasBlueprints = saveObject.hasBlueprints ? true : false;
			this.luxuryResource = saveObject.luxuryResource || null;
			this.textKey = saveObject.textKey || null;

			this.updateCostsAndRequirements();
		},
		
	});

	return LocaleVO;
});
