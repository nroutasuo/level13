define(['ash', 'text/Text', 'game/vos/ResourcesVO'], function (Ash, Text, ResourcesVO) {
	
	var CampConstants = {
	
		// population
		POPULATION_PER_HOUSE: 4,
		POPULATION_PER_HOUSE2: 6,
		POPULATION_PER_HOUSE2_LEVEL_2: 8,
		POOL_RUMOURS_PER_POPULATION: 3,
		POPULATION_DECREASE_COOLDOWN: 60,
		POPULATION_DECREASE_COOLDOWN_REFUGEES: 60 * 5,

		POPULATION_FOR_UNLOCK_MILESTONES: 2,
		
		// Storage
		BASE_STORAGE: 50,
		STORAGE_PER_IMPROVEMENT: 50,
		STORAGE_PER_IMPROVEMENT_LEVEL_2: 75,
		STORAGE_PER_IMPROVEMENT_LEVEL_3: 125,
		
		// special resource storage (robots)
		SPECIAL_STORAGE_PER_FACTORY: 50,
		
		// Rumours
		RUMOURS_PER_POP_PER_SEC_BASE: 0.0003,
		RUMOUR_BONUS_PER_CAMPFIRE_BASE: 1.2,
		RUMOURS_BONUS_PER_CAMPFIRE_PER_LEVEL: 0.1,
		RUMOUR_BONUS_PER_MARKET_BASE: 1.1,
		RUMOURS_BONUS_PER_MARKET_PER_UPGRADE: 0.01,
		RUMOUR_BONUS_PER_INN_BASE: 1.1,
		RUMOURS_BONUS_PER_INN_PER_UPGRADE: 0.01,
		RUMOURS_PER_VISIT_CAMPFIRE_BASE: 1,
		RUMOURS_PER_VISIT_MARKET_BASE: 2,
		RUMOURS_PER_VISIT_LIBRARY_BASE: 1,
		
		// Evidence
		EVIDENCE_BONUS_PER_LIBRARY_LEVEL: 0.15,
		EVIDENCE_BONUS_PER_RESEARCH_CENTER_LEVEL: 0.25,
		
		// Hope
		HOPE_BONUS_PER_TEMPLE_LEVEL: 0.1,
		HOPE_PER_DONATION: 5,
		
		// Cost of workers
		CONSUMPTION_WATER_PER_WORKER_PER_S: 0.02,
		CONSUMPTION_FOOD_PER_WORKER_PER_S: 0.01,
		CONSUMPTION_HERBS_PER_REGULAR_WORKER_PER_S: 0.0005,
		CONSUMPTION_MEDICINE_PER_WORKER_PER_S: 0.0002,

		CONSUMPTION_HERBS_PER_MEDICINE_WORKER_PER_S: 0.05,
		CONSUMPTION_METAL_PER_TOOLSMITH_PER_S: 0.03,
		CONSUMPTION_METAL_PER_CONCRETE_PER_S: 0.03,
		CONSUMPTION_TOOLS_PER_ROBOT_MAKER_PER_S: 0.03,
		
		// Production
		PRODUCTION_METAL_PER_WORKER_PER_S: 0.02,
		PRODUCTION_FOOD_PER_WORKER_PER_S: 0.05,
		PRODUCTION_WATER_PER_WORKER_PER_S: 0.05,
		PRODUCTION_ROPE_PER_WORKER_PER_S: 0.03,
		PRODUCTION_FUEL_PER_WORKER_PER_S: 0.02,
		PRODUCTION_RUBBER_PER_WORKER_PER_S: 0.02,
		PRODUCTION_HERBS_PER_WORKER_PER_S: 0.05,
		PRODUCTION_MEDICINE_PER_WORKER_PER_S: 0.005,
		PRODUCTION_TOOLS_PER_WORKER_PER_S: 0.01,
		PRODUCTION_CONCRETE_PER_WORKER_PER_S: 0.01,
		PRODUCTION_ROBOTS_PER_WORKER_PER_S: 0.001,
		PRODUCTION_EVIDENCE_PER_WORKER_PER_S: 0.00075,
		PRODUCTION_HOPE_PER_WORKER_PER_S: 0.00075,
		
		PRODUCTION_BONUS_PER_ROBOT_PER_SEC: 0.02,
		
		// reputation
		REPUTATION_TO_POPULATION_FACTOR: 0.91,
		REPUTATION_TO_POPULATION_OFFSET: -0.75,
		REPUTATION_PER_RADIO_PER_SEC: 0.1,
		REPUTATION_PER_HOUSE_FROM_GENERATOR: 0.3,
		REPUTATION_PENALTY_DEFENCES_THRESHOLD: 0.25,
		REPUTATION_FROM_HERBS: 1,
		REPUTATION_FROM_MEDICINE: 2,
		REPUTATION_PENALTY_TYPE_FOOD: "FOOD",
		REPUTATION_PENALTY_TYPE_WATER: "WATER",
		REPUTATION_PENALTY_TYPE_DEFENCES: "DEFENCES",
		REPUTATION_PENALTY_TYPE_HOUSING: "HOUSING",
		REPUTATION_PENALTY_TYPE_LEVEL_POP: "LEVEL_POPULATION",
		REPUTATION_PENALTY_TYPE_SUNLIT: "SUNLIT",
		REPUTATION_PENALTY_TYPE_DAMAGED_BUILDINGS: "DAMAGED_BUILDINGS",
		REPUTATION_SOURCE_MILESTONES: "milestones",
		REPUTATION_SOURCE_LUXURY_RESOURCES: "luxury-resources",
		REPUTATION_SOURCE_LEVEL_POP: "level-population",
		MAX_REPUTATION: 30,
		
		// raids
		CAMP_BASE_DEFENCE: 7,
		FORTIFICATION_1_DEFENCE: 6,

		// other events
		DISASTER_TYPE_EARTHQUAKE: "earthquake",
		DISASTER_TYPE_STORM: "storm",
		DISASTER_TYPE_FLOOD: "flood",
		DISASTER_TYPE_COLLAPSE: "collapse",

		DISABLED_POPULATION_REASON_DISEASE: "disease",
		DISABLED_POPULATION_REASON_ACCIDENT: "accident",

		DISEASE_UPDATE_TYPE_SPREAD: "spread",
		DISEASE_UPDATE_TYPE_WANE: "wane",
		DISEASE_UPDATE_TYPE_KILL: "kill",
		DISEASE_UPDATE_TYPE_END: "end",
		
		// Workers per building
		CHEMISTS_PER_WORKSHOP: 5,
		RUBBER_WORKER_PER_WORKSHOP: 5,
		GARDENER_PER_GREENHOUSE: 5,

		// misc
		MAX_DEITY_NAME_LENGTH: 20,
		MAX_CAMP_NAME_LENGTH: 20,
		MAX_IMPROVEMENTS_PER_TYPE: 100,
		MIN_CAMP_ORDINAL_FOR_EXPEDITION_VISITORS: 12,
	
		workerTypes: {
			scavenger: {
				id: "scavenger",
				resourceProduced: resourceNames.metal,
			},
			trapper: {
				id: "trapper",
				resourceProduced: resourceNames.food,
			},
			water: {
				id: "water",
				resourceProduced: resourceNames.water,
			},
			ropemaker: {
				id: "ropemaker",
				resourceProduced: resourceNames.rope,
			},
			chemist: {
				id: "chemist",
				resourceProduced: resourceNames.fuel,
				getLimitNum: function (improvements, workshops) { return workshops.fuel || 0; },
				getLimitText: function (num) { return num + " refineries cleared"; },
			},
			rubbermaker: {
				id: "rubbermaker",
				resourceProduced: resourceNames.rubber,
				getLimitNum: function (improvements, workshops) { return workshops.rubber || 0; },
				getLimitText: function (num) { return num + " plantations found"; },
			},
			gardener: {
				id: "gardener",
				resourceProduced: resourceNames.herbs,
				getLimitNum: function (improvements, workshops) { return workshops.herbs || 0; },
				getLimitText: function (num) { return num + " greenhouses"; },
			},
			apothecary: {
				id: "apothecary",
				resourceProduced: resourceNames.medicine,
				getLimitNum: function (improvements, workshops) { return improvements.getCount(improvementNames.apothecary); },
				getLimitText: function (num) { return num + " apothecaries built"; },
			},
			toolsmith: {
				id: "toolsmith",
				resourceProduced: resourceNames.tools,
				getLimitNum: function (improvements, workshops) { return improvements.getCount(improvementNames.smithy); },
				getLimitText: function (num) { return num + " smithies built"; },
			},
			concrete: {
				id: "concrete",
				resourceProduced: resourceNames.concrete,
				getLimitNum: function (improvements, workshops) { return improvements.getCount(improvementNames.cementmill); },
				getLimitText: function (num) { return num + " cement mills built"; },
			},
			robotmaker: {
				id: "robotmaker",
				resourceProduced: resourceNames.robots,
				getLimitNum: function (improvements, workshops) { return improvements.getCount(improvementNames.robotFactory); },
				getLimitText: function (num) { return num + " robot factories built"; },
			},
			scientist: {
				id: "scientist",
				getLimitNum: function (improvements, workshops) { return improvements.getCount(improvementNames.library); },
				getLimitText: function (num) { return num + " libraries built"; },
			},
			soldier: {
				id: "soldier",
				getLimitNum: function (improvements, workshops) { return improvements.getCount(improvementNames.barracks); },
				getLimitText: function (num) { return num + " barracks built"; },
			},
			cleric: {
				id: "cleric",
				getLimitNum: function (improvements, workshops) { return improvements.getCount(improvementNames.temple); },
				getLimitText: function (num) { return num + " temples built"; },
			},
		},
		
		isLocalResource: function (resourceName) {
			return resourceName == resourceNames.robots;
		},
		
		getWorkerIDByProducedResource: function (resourceName) {
			for (var key in CampConstants.workerTypes) {
				var def = CampConstants.workerTypes[key];
				if (def.resourceProduced && def.resourceProduced == resourceName) return def.id;
			}
			return null;
		},
		
		// storage capacity of one camp
		getStorageCapacity: function (storageCount, storageLevel) {
			let storagePerImprovement = this.getStorageCapacityPerBuilding(storageLevel);
			return CampConstants.BASE_STORAGE + storageCount * storagePerImprovement;
		},

		getStorageCapacityPerBuilding: function (storageLevel) {
			let storagePerImprovement = CampConstants.STORAGE_PER_IMPROVEMENT;
			if (storageLevel > 1) storagePerImprovement = CampConstants.STORAGE_PER_IMPROVEMENT_LEVEL_2;
			if (storageLevel > 2) storagePerImprovement = CampConstants.STORAGE_PER_IMPROVEMENT_LEVEL_3;
			return storagePerImprovement;
		},
		
		getRobotStorageCapacity: function (factoryCount, factoryLevel) {
			factoryCount = factoryCount || 0;
			factoryLevel = factoryLevel || 1;
			var storagePerFactory = CampConstants.SPECIAL_STORAGE_PER_FACTORY;
			return factoryCount * storagePerFactory;
		},
		
		// population cap of one camp
		getHousingCap: function (improvementsComponent) {
			return this.getHousingCap2(
				improvementsComponent.getCount(improvementNames.house),
				improvementsComponent.getCount(improvementNames.house2),
				improvementsComponent.getLevel(improvementNames.house2));
		},
		
		getHousingCap2: function (numHouses, numHouses2, levelHouses2) {
			let result = numHouses * CampConstants.POPULATION_PER_HOUSE;
			result += numHouses2 * this.getPopulationPerHouse2(levelHouses2);
			return result;
		},
		
		getPopulationPerHouse2: function (improvementLevel) {
			return improvementLevel == 1 ? CampConstants.POPULATION_PER_HOUSE2 : CampConstants.POPULATION_PER_HOUSE2_LEVEL_2;
		},
		
		getSmithsPerSmithy: function (upgradeLevel) {
			return 2 + (upgradeLevel - 1) * 2;
		},
		
		getRobotMakersPerFactory: function (upgradeLevel) {
			return upgradeLevel;
		},
		
		getWearPerRobotPerSec: function () {
			return this.PRODUCTION_ROBOTS_PER_WORKER_PER_S / this.SPECIAL_STORAGE_PER_FACTORY / 2;
		},
		
		getApothecariesPerShop: function (upgradeLevel) {
			return 2 + (upgradeLevel - 1) * 2;
		},
		
		getWorkersPerMill: function (upgradeLevel) {
			return 2 + (upgradeLevel - 1) * 2;
		},
		
		getSoldiersPerBarracks: function (upgradeLevel) {
			return 5 + Math.floor((upgradeLevel - 1) * 2.5);
		},
		
		getScientistsPerLibrary: function (upgradeLevel) {
			return 2;
		},
		
		getClericsPerTemple: function (upgradeLevel) {
			return 5;
		},
		
		getRequiredReputation: function (pop) {
			if (pop < 1) return 0;
			pop = Math.ceil(pop);
			let result = Math.max(1, Math.pow(pop, CampConstants.REPUTATION_TO_POPULATION_FACTOR) + CampConstants.REPUTATION_TO_POPULATION_OFFSET);
			return Math.floor(result * 100) / 100;
		},
		
		getMaxPopulation: function (reputation) {
			if (reputation < 1) return 0;
			return Math.floor(Math.pow(reputation - CampConstants.REPUTATION_TO_POPULATION_OFFSET, 1 / CampConstants.REPUTATION_TO_POPULATION_FACTOR));
		},
		
		getSoldierDefence: function (workerLevel, barracksLevel) {
			return (1 + workerLevel + 0.25 * barracksLevel);
		},
		
		getRumoursPerVisitCampfire: function (campfireLevel, majorLevel) {
			campfireLevel = campfireLevel || 1;
			majorLevel = majorLevel || majorLevel;
			return CampConstants.RUMOURS_PER_VISIT_CAMPFIRE_BASE * majorLevel;
		},
		
		getRumoursPerVisitMarket: function (marketLevel, majorLevel) {
			marketLevel = marketLevel || 1;
			majorLevel = majorLevel || majorLevel;
			return CampConstants.RUMOURS_PER_VISIT_MARKET_BASE * majorLevel;
		},
		
		getEvidencePerUseLibrary: function (libraryLevel, majorLevel) {
			libraryLevel = libraryLevel || 1;
			majorLevel = majorLevel || majorLevel;
			return CampConstants.RUMOURS_PER_VISIT_LIBRARY_BASE * majorLevel;
		},
		
		getLibraryEvidenceGenerationPerSecond: function (libraryCount, libraryLevel) {
			var libraryLevelFactor = (1 + libraryLevel * CampConstants.EVIDENCE_BONUS_PER_LIBRARY_LEVEL);
			return 0.0015 * libraryCount * libraryLevelFactor;
		},
		
		getResearchCenterEvidenceGenerationPerSecond: function (centerCount, centerLevel, majorLevel) {
			let majorLevelFactor = 1 + (majorLevel - 1) * 0.2;
			let levelFactor = (1 + centerLevel * CampConstants.EVIDENCE_BONUS_PER_RESEARCH_CENTER_LEVEL);
			return 0.0025 * centerCount * levelFactor * majorLevelFactor;
		},
		
		getTempleHopeGenerationPerSecond: function (templeCount, templeLevel) {
			if (templeCount <= 0) return 0;
			templeLevel = templeLevel || 1;
			var templeLevelFactor = (1 + templeLevel * CampConstants.HOPE_BONUS_PER_TEMPLE_LEVEL);
			return 0.0015 * templeCount * templeLevelFactor;
		},
		
		getCampfireRumourGenerationPerSecond: function (campfireCount, campfireLevel, accSpeedPopulation) {
			if (campfireCount <= 0) return 0;
			if (accSpeedPopulation <= 0) return 0;
			let campfireFactor = CampConstants.RUMOUR_BONUS_PER_CAMPFIRE_BASE;
			campfireFactor += campfireLevel > 1 ? (campfireLevel - 1) * CampConstants.RUMOURS_BONUS_PER_CAMPFIRE_PER_LEVEL : 0;
			return campfireCount * campfireFactor * accSpeedPopulation - accSpeedPopulation;
		},
		
		getMarketRumourGenerationPerSecond: function (marketCount, marketLevel, accSpeedPopulation) {
			var marketFactor = CampConstants.RUMOUR_BONUS_PER_MARKET_BASE;
			marketFactor += marketLevel > 1 ? (marketLevel - 1) * CampConstants.RUMOURS_BONUS_PER_MARKET_PER_UPGRADE : 0;
			return marketCount > 0 ? Math.pow(marketFactor, marketCount) * accSpeedPopulation - accSpeedPopulation : 0;
		},
		
		getInnRumourGenerationPerSecond: function (innCount, innLevel, accSpeedPopulation) {
			var innFactor = CampConstants.RUMOUR_BONUS_PER_INN_BASE;
			innFactor += innLevel > 1 ? (innLevel - 1) * CampConstants.RUMOURS_BONUS_PER_INN_PER_UPGRADE : 0;
			return innCount > 0 ? Math.pow(innFactor, innCount) * accSpeedPopulation - accSpeedPopulation : 0;
		},
		
		getMeditationSuccessRate: function (shrineLevel, majorLevel) {
			shrineLevel = shrineLevel || 1;
			majorLevel = majorLevel || 1;
			return 0.55 + (majorLevel - 1) * 0.2;
		},

		getNextDiseaseUpdateTimer: function () {
			 // 3-7 min
			return 60 * 3 + Math.floor(Math.random() * 60 * 7);
		},
		
		getWorkerDisplayName: function (workerType) {
			return Text.t(CampConstants.getWorkerDisplayNameKey(workerType));
		},

		getWorkerDisplayNameKey: function (workerType) {
			return "game.workers." + workerType + "_name";
		}
	
	};
	
	return CampConstants;
	
});
