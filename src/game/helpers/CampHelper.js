// Helpers for camp stuff that can use current game state
define([
	'ash',
	'utils/MathUtils',
	'utils/RandomUtils',
	'game/GameGlobals',
	'game/constants/GameConstants',
	'game/constants/CampConstants',
	'game/constants/CharacterConstants',
	'game/constants/CultureConstants',
	'game/constants/ExplorerConstants',
	'game/constants/ImprovementConstants',
	'game/constants/ItemConstants',
	'game/constants/OccurrenceConstants',
	'game/constants/StoryConstants',
	'game/constants/TradeConstants',
	'game/constants/WorldConstants',
	'game/components/common/CampComponent',
	'game/components/common/PositionComponent',
	'game/components/sector/events/DisasterComponent',
	'game/components/sector/events/DiseaseComponent',
	'game/components/sector/events/RaidComponent',
	'game/components/sector/events/TraderComponent',
	'game/components/sector/events/RecruitComponent',
	'game/components/sector/events/RefugeesComponent',
	'game/components/sector/events/VisitorComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/type/LevelComponent',
	'game/nodes/sector/CampNode',
	'game/nodes/tribe/TribeUpgradesNode',
	'game/vos/ResourcesVO',
	'game/vos/IncomingCaravanVO'
], function (Ash, MathUtils, RandomUtils, GameGlobals, 
	GameConstants, CampConstants, CharacterConstants, CultureConstants, ExplorerConstants, ImprovementConstants, ItemConstants, OccurrenceConstants, StoryConstants, TradeConstants, WorldConstants,
	CampComponent, PositionComponent, 
	DisasterComponent, DiseaseComponent, RaidComponent, TraderComponent, RecruitComponent, RefugeesComponent, VisitorComponent, 
	SectorImprovementsComponent, SectorFeaturesComponent, LevelComponent, CampNode, TribeUpgradesNode, ResourcesVO, IncomingCaravanVO) {
	
	var CampHelper = Ash.Class.extend({
		
		constructor: function (engine) {
			if (engine) {
				this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
				this.campNodes = engine.getNodeList(CampNode);
			}
		},
		
		getCurrentCampOrdinal: function () {
			return Math.max(1, GameGlobals.gameState.numCamps);
		},
		
		getCurrentCampStep: function () {
			let campOrdinal = this.getCurrentCampOrdinal();
			let level = GameGlobals.gameState.getLevelForCamp(campOrdinal);
			let levelStats = GameGlobals.levelHelper.getLevelStats(level);
			let scoutedPercent = levelStats.percentClearedSectors;
			if (scoutedPercent < 0.25)
				return WorldConstants.CAMP_STEP_START;
			else if (scoutedPercent < 0.5)
				return WorldConstants.CAMP_STEP_POI_2;
			return WorldConstants.CAMP_STEP_END;
		},
		
		getCampNodeForLevel: function (level) {
			for (var node = this.campNodes.head; node; node = node.next) {
				if (node.position.level == level) {
					return node;
				}
			}
			return null;
		},
		
		getTotalNumImprovementsBuilt: function (improvementName) {
			if (!this.campNodes.head) return 0;
			let result = 0;
			for (let campNode = this.campNodes.head; campNode; campNode = campNode.next) {
				let improvements = campNode.entity.get(SectorImprovementsComponent);
				result += improvements.getCount(improvementName);
			}
			return result;
		},

		isCampInventoryFull: function (sector) {
			let currentStorage = sector ? GameGlobals.resourcesHelper.getCurrentCampStorage(sector) : GameGlobals.resourcesHelper.getCurrentStorage();
			return currentStorage.isAtCapacity();
		},

		getCampInventoryFullResource: function (sector) {
			let currentStorage = sector ? GameGlobals.resourcesHelper.getCurrentCampStorage(sector) : GameGlobals.resourcesHelper.getCurrentStorage();
			return currentStorage.getAtCapacityResource();
		},

		getMinimumFreeStorage: function (sector) {
			let currentStorage = sector ? GameGlobals.resourcesHelper.getCurrentCampStorage(sector) : GameGlobals.resourcesHelper.getCurrentStorage();
			return currentStorage.getMinimumFreeStorage();
		},

		getStorageCapacityPerBuilding: function (sector) {
			let improvements = sector.get(SectorImprovementsComponent);
			let storageLevel = improvements.getLevel(improvementNames.storage);
			return CampConstants.getStorageCapacityPerBuilding(storageLevel);
		},
		
		getAvailableLuxuryResources: function (campEntity) {
			if (campEntity) return this.getAvailableLuxuryResourcesForCamp(campEntity);

			let result = [];
			
			for (let campNode = this.campNodes.head; campNode; campNode = campNode.next) {
				let campLuxuryResources = this.getAvailableLuxuryResources(campNode.entity);
				for (let i = 0; i < campLuxuryResources.length; i++) {
					let res = campLuxuryResources[i];
					if (result.indexOf(res) < 0) {
						result.push(res);
					}
				}
			}

			return result;
		},

		getAvailableLuxuryResourcesForCamp: function (campEntity) {
			let campComponent = campEntity.get(CampComponent);
			if (!campComponent) return [];
			return campComponent.availableLuxuryResources || [];
		},

		getCampProductionMultiplier: function () {
			let result = GameConstants.gameSpeedCamp;
			if (GameConstants.cheatModeCampProduction) result *= 2;
			return result;
		},
		
		getMetalProductionPerSecond: function (workers, improvementsComponent, robots) {
			let multiplier = this.getCampProductionMultiplier();
			return GameGlobals.campBalancingHelper.getMetalProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades, robots) * multiplier;
		},
		
		getFoodProductionPerSecond: function (workers, improvementsComponent, robots) {
			let multiplier = this.getCampProductionMultiplier();
			return GameGlobals.campBalancingHelper.getFoodProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades, robots) * multiplier;
		},
		
		getWaterProductionPerSecond: function (workers, improvementsComponent, robots) {
			let multiplier = this.getCampProductionMultiplier();
			return GameGlobals.campBalancingHelper.getWaterProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades, robots) * multiplier;
		},
		
		getRopeProductionPerSecond: function (workers, improvementsComponent, robots) {
			let multiplier = this.getCampProductionMultiplier();
			return GameGlobals.campBalancingHelper.getRopeProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades, robots) * multiplier;
		},
		
		getFuelProductionPerSecond: function (workers, improvementsComponent, robots) {
			let multiplier = this.getCampProductionMultiplier();
			return GameGlobals.campBalancingHelper.getFuelProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades, robots) * multiplier;
		},
		
		getRubberProductionPerSecond: function (workers, improvementsComponent, robots) {
			let multiplier = this.getCampProductionMultiplier();
			return GameGlobals.campBalancingHelper.getRubberProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades, robots) * multiplier;
		},
		
		getHerbsProductionPerSecond: function (workers, improvementsComponent, robots) {
			let multiplier = this.getCampProductionMultiplier();
			return GameGlobals.campBalancingHelper.getHerbsProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades, robots) * multiplier;
		},
		
		getMedicineProductionPerSecond: function (workers, improvementsComponent, robots) {
			let multiplier = this.getCampProductionMultiplier();
			return GameGlobals.campBalancingHelper.getMedicineProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades, robots) * multiplier;
		},
		
		getToolsProductionPerSecond: function (workers, improvementsComponent, robots) {
			let multiplier = this.getCampProductionMultiplier();
			return GameGlobals.campBalancingHelper.getToolsProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades, robots) * multiplier;
		},
		
		getConcreteProductionPerSecond: function (workers, improvementsComponent, robots) {
			let multiplier = this.getCampProductionMultiplier();
			return GameGlobals.campBalancingHelper.getConcreteProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades, robots) * multiplier;
		},
		
		getRobotsProductionPerSecond: function (workers, improvementsComponent, robots) {
			let multiplier = this.getCampProductionMultiplier();
			return GameGlobals.campBalancingHelper.getRobotsProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades, robots) * multiplier;
		},
		
		getEvidenceProductionPerSecond: function (workers, improvementComponent) {
			workers = workers || 0;
			let evidenceUpgradeBonus = this.getUpgradeBonus("scientist");
			let multiplier = this.getCampProductionMultiplier();
			return workers * CampConstants.PRODUCTION_EVIDENCE_PER_WORKER_PER_S * evidenceUpgradeBonus * multiplier;
		},
		
		getHopeProductionPerSecond: function (workers, improvementComponent) {
			workers = workers || 0;
			let upgradeBonus = this.getUpgradeBonus("cleric");
			let multiplier = this.getCampProductionMultiplier();
			return workers * CampConstants.PRODUCTION_HOPE_PER_WORKER_PER_S * upgradeBonus * multiplier;
		},
		
		getWaterConsumptionPerSecond: function (population) {
			let speed = GameConstants.gameSpeedCamp;
			return CampConstants.CONSUMPTION_WATER_PER_WORKER_PER_S * Math.floor(population) * speed;
		},
		
		getFoodConsumptionPerSecond: function (population) {
			let speed = GameConstants.gameSpeedCamp;
			return CampConstants.CONSUMPTION_FOOD_PER_WORKER_PER_S * Math.floor(population) * speed;
		},

		getPopulationHerbsConsumptionPerSecond: function (population, hasMedicine) {
			let speed = GameConstants.gameSpeedCamp;
			return hasMedicine ? 0 : CampConstants.CONSUMPTION_HERBS_PER_REGULAR_WORKER_PER_S * Math.floor(population) * speed;
		},

		getMedicineConsumptionPerSecond: function (population) {
			let speed = GameConstants.gameSpeedCamp;
			return CampConstants.CONSUMPTION_MEDICINE_PER_WORKER_PER_S * Math.floor(population) * speed;
		},
		
		getWorkerHerbsConsumptionPerSecond: function (workers) {
			workers = workers || 0;
			let multiplier = this.getCampProductionMultiplier();
			return workers * CampConstants.CONSUMPTION_HERBS_PER_MEDICINE_WORKER_PER_S * multiplier;
		},
		
		getMetalConsumptionPerSecondSmith: function (workers) {
			workers = workers || 0;
			let multiplier = this.getCampProductionMultiplier();
			return workers * CampConstants.CONSUMPTION_METAL_PER_TOOLSMITH_PER_S * multiplier;
		},
		
		getMetalConsumptionPerSecondConcrete: function (workers) {
			workers = workers || 0;
			let multiplier = this.getCampProductionMultiplier();
			return workers * CampConstants.CONSUMPTION_METAL_PER_CONCRETE_PER_S * multiplier;
		},
		
		getToolsConsumptionPerSecondRobots: function (workers) {
			workers = workers || 0;
			let multiplier = this.getCampProductionMultiplier();
			return workers * CampConstants.CONSUMPTION_TOOLS_PER_ROBOT_MAKER_PER_S * multiplier;
		},
		
		getDarkFarmProductionPerSecond: function (improvementsComponent) {
			let count = improvementsComponent.getCountWithModifierForDamaged(improvementNames.darkfarm, 0.5);
			let level = improvementsComponent.getLevel(improvementNames.darkfarm);
			let multiplier = this.getCampProductionMultiplier();
			return count * (0.02 + level * 0.01) * multiplier;
		},
		
		getAqueductProductionPerSecond: function (improvementsComponent) {
			let count = improvementsComponent.getCountWithModifierForDamaged(improvementNames.aqueduct, 0.5);
			let level = improvementsComponent.getLevel(improvementNames.aqueduct);
			let multiplier = this.getCampProductionMultiplier();
			return count * (0.02 + level * 0.01) * multiplier;
		},
		
		getLibraryEvidenceGenerationPerSecond: function (improvementsComponent) {
			var libraryCount = improvementsComponent.getCountWithModifierForDamaged(improvementNames.library, 0.5);
			var libraryLevel = improvementsComponent.getLevel(improvementNames.library);
			let multiplier = this.getCampProductionMultiplier();
			return CampConstants.getLibraryEvidenceGenerationPerSecond(libraryCount, libraryLevel) * multiplier;
		},
		
		getResearchCenterEvidenceGenerationPerSecond: function (improvementsComponent) {
			var centerCount = improvementsComponent.getCount(improvementNames.researchcenter);
			var centerLevel = improvementsComponent.getLevel(improvementNames.researchcenter);
			let centerMajorLevel = ImprovementConstants.getMajorLevel(improvementNames.researchcenter, centerLevel);
			let multiplier = this.getCampProductionMultiplier();
			return CampConstants.getResearchCenterEvidenceGenerationPerSecond(centerCount, centerLevel, centerMajorLevel) * multiplier;
		},
		
		getTempleHopeGenerationPerSecond: function (improvementsComponent) {
			var templeCount = improvementsComponent.getCount(improvementNames.temple);
			var templeLevel = improvementsComponent.getLevel(improvementNames.temple);
			let multiplier = this.getCampProductionMultiplier();
			return CampConstants.getTempleHopeGenerationPerSecond(templeCount, templeLevel) * multiplier;
		},

		getPopulationRumourGenerationPerSecond: function (population) {
			let multiplier = this.getCampProductionMultiplier();
			return CampConstants.RUMOURS_PER_POP_PER_SEC_BASE * Math.floor(population || 0) * multiplier;
		},
		
		getCampfireRumourGenerationPerSecond: function (improvementsComponent, accSpeedPopulation) {
			var campfireCount = improvementsComponent.getCount(improvementNames.campfire);
			var campfireLevel = improvementsComponent.getLevel(improvementNames.campfire);
			let multiplier = this.getCampProductionMultiplier();
			return CampConstants.getCampfireRumourGenerationPerSecond(campfireCount, campfireLevel, accSpeedPopulation) * multiplier;
		},
		
		getMarketRumourGenerationPerSecond: function (improvementsComponent, accSpeedPopulation) {
			var marketCount = improvementsComponent.getCountWithModifierForDamaged(improvementNames.market, 0.5);
			var marketLevel = improvementsComponent.getLevel(improvementNames.market);
			let multiplier = this.getCampProductionMultiplier();
			return CampConstants.getMarketRumourGenerationPerSecond(marketCount, marketLevel, accSpeedPopulation) * multiplier;
		},
		
		getInnRumourGenerationPerSecond: function (improvementsComponent, accSpeedPopulation) {
			var innCount = improvementsComponent.getCount(improvementNames.inn);
			let innLevel = improvementsComponent.getLevel(improvementNames.inn);
			let multiplier = this.getCampProductionMultiplier();
			return CampConstants.getInnRumourGenerationPerSecond(innCount, innLevel, accSpeedPopulation) * multiplier;
		},

		getCampMaxPopulation: function (sector) {
			var improvements = sector.get(SectorImprovementsComponent);
			return CampConstants.getHousingCap(improvements);
		},

		getCampFreeHousing: function (sector) {
			let campComponent = sector.get(CampComponent);
			let currentPopulation = campComponent ? Math.floor(campComponent.population) : 0;
			return GameGlobals.campHelper.getCampMaxPopulation(sector) - currentPopulation;
		},
		
		getCampRaidDanger: function (sector) {
			let improvements = sector.get(SectorImprovementsComponent);
			let soldiers = sector.get(CampComponent).assignedWorkers.soldier || 0;
			let population = sector.get(CampComponent).population;
			let soldierLevel = GameGlobals.upgradeEffectsHelper.getWorkerLevel("soldier", this.tribeUpgradesNodes.head.upgrades);
			var levelComponent = GameGlobals.levelHelper.getLevelEntityForSector(sector).get(LevelComponent);
			let levelRaidDangerFactor = levelComponent.raidDangerFactor;
				
			return OccurrenceConstants.getRaidDanger(improvements, population, soldiers, soldierLevel, levelRaidDangerFactor);
		},

		hasEvent: function (sector, event) {
			switch (event) {
				case OccurrenceConstants.campOccurrenceTypes.accident: 
					return false; // instant

				case OccurrenceConstants.campOccurrenceTypes.disaster:
					return sector.has(DisasterComponent);

				case OccurrenceConstants.campOccurrenceTypes.disease:
					return sector.has(DiseaseComponent);

				case OccurrenceConstants.campOccurrenceTypes.raid:
					return sector.has(RaidComponent);
					
				case OccurrenceConstants.campOccurrenceTypes.recruit:
					return sector.has(RecruitComponent);
					
				case OccurrenceConstants.campOccurrenceTypes.refugees:
					return sector.has(RefugeesComponent);

				case OccurrenceConstants.campOccurrenceTypes.trader:
					return sector.has(TraderComponent);

				case OccurrenceConstants.campOccurrenceTypes.visitor:
					return sector.has(VisitorComponent);

				default:
					return false;
			}
		},

		hasNewEvent: function (sector, event) {
			switch (event) {
				case OccurrenceConstants.campOccurrenceTypes.visitor:
					let visitorComponent = sector.get(VisitorComponent);
					return visitorComponent && !visitorComponent.hasInteracted;

				default:
					return this.hasEvent(sector, event);
			}
		},

		getEventUpgradeLevel: function (event) {
			var upgradeLevel = 1;
			var eventUpgrades = GameGlobals.upgradeEffectsHelper.getImprovingUpgradeIdsForOccurrence(event);
			var eventUpgrade;
			for (let i in eventUpgrades) {
				eventUpgrade = eventUpgrades[i];
				if (this.tribeUpgradesNodes.head.upgrades.hasUpgrade(eventUpgrade)) upgradeLevel++;
			}
			return upgradeLevel;
		},

		getValidDisasterTypes: function (sector) {
			let result = [];

			let position = sector.get(PositionComponent);
			let features = sector.get(SectorFeaturesComponent);

			let surfaceLevel = GameGlobals.gameState.getSurfaceLevel();
			let groundLevel = GameGlobals.gameState.getGroundLevel();

			result.push(CampConstants.DISASTER_TYPE_COLLAPSE);
			result.push(CampConstants.DISASTER_TYPE_EARTHQUAKE);
			result.push(CampConstants.DISASTER_TYPE_EARTHQUAKE);
			if (features.sunlit) result.push(CampConstants.DISASTER_TYPE_STORM);
			if (position.level != surfaceLevel && position.level != groundLevel) result.push(CampConstants.DISASTER_TYPE_FLOOD);

			return result;
		},

		getValidVisitorTypes: function (sector) {
			let result = [];
			
			let position = sector.get(PositionComponent);
			let campOrdinal = GameGlobals.gameState.getCampOrdinal(position.level);

			let isForceExpedition = this.isValidCampForExpeditionVisitors(campOrdinal);

			if (isForceExpedition) {
				result.push(CharacterConstants.characterTypes.scout);
				return result;
			}

			result.push(CharacterConstants.characterTypes.bard);
			result.push(CharacterConstants.characterTypes.crafter);
			result.push(CharacterConstants.characterTypes.drifter);
			result.push(CharacterConstants.characterTypes.fortuneTeller);

			if (position.level < 14) {
				result.push(CharacterConstants.characterTypes.drifter);
				result.push(CharacterConstants.characterTypes.shaman);
			}
			
			if (position.level > 14) {
				result.push(CharacterConstants.characterTypes.crafter);
				result.push(CharacterConstants.characterTypes.bard);
				result.push(CharacterConstants.characterTypes.doomsayer);
			}

			return result;
		},

		isValidCampForExpeditionVisitors: function (campOrdinal) {
			if (!GameGlobals.gameState.getStoryFlag(StoryConstants.flags.EXPEDITION_PENDING_VISITORS)) return false;
			if (campOrdinal < CampConstants.MIN_CAMP_ORDINAL_FOR_EXPEDITION_VISITORS) return false;
			return true;
		},

		getValidCampCharacters: function (campComponent) {
			let result = [];

			for (let origin in campComponent.populationByOrigin) {
				let num = campComponent.populationByOrigin[origin];
				if (num <= 0) continue;
				switch (origin) {
					case CultureConstants.origins.SURFACE: 
						result.push(CharacterConstants.characterTypes.surfaceRefugee);
						break;
					case CultureConstants.origins.SLUMS: 
						result.push(CharacterConstants.characterTypes.slumRefugee);
						break;
					case CultureConstants.origins.DARKLEVELS: 
						result.push(CharacterConstants.characterTypes.darkDweller);
						break;
				}
			}

			
			for(let key in campComponent.assignedWorkers) {
				let num = campComponent.assignedWorkers[key] || 0;
				if (num <= 0) continue;
				switch (key) {
					case CampConstants.workerTypes.scavenger.id:
						result.push(CharacterConstants.characterTypes.workerScavenger);
						break;
					case CampConstants.workerTypes.trapper.id:
						result.push(CharacterConstants.characterTypes.workerTrapper);
						break;
					case CampConstants.workerTypes.water.id:
						result.push(CharacterConstants.characterTypes.workerWater);
						break;
					case CampConstants.workerTypes.ropemaker.id:
						result.push(CharacterConstants.characterTypes.workerRope);
						break;
					case CampConstants.workerTypes.chemist.id:
						result.push(CharacterConstants.characterTypes.workerChemist);
						break;
					case CampConstants.workerTypes.rubbermaker.id:
						result.push(CharacterConstants.characterTypes.workerRubber);
						break;
					case CampConstants.workerTypes.gardener.id:
						result.push(CharacterConstants.characterTypes.workerGardener);
						break;
					case CampConstants.workerTypes.apothecary.id:
						result.push(CharacterConstants.characterTypes.workerApothecary);
						break;
					case CampConstants.workerTypes.toolsmith.id:
						result.push(CharacterConstants.characterTypes.workerToolsmith);
						break;
					case CampConstants.workerTypes.concrete.id:
						result.push(CharacterConstants.characterTypes.workerConcrete);
						break;
					case CampConstants.workerTypes.robotmaker.id:
						result.push(CharacterConstants.characterTypes.workerRobotmaker);
						break;
					case CampConstants.workerTypes.scientist.id:
						result.push(CharacterConstants.characterTypes.workerScientist);
						break;
					case CampConstants.workerTypes.soldier.id:
						result.push(CharacterConstants.characterTypes.workerSoldier);
						break;
					case CampConstants.workerTypes.cleric.id:
						result.push(CharacterConstants.characterTypes.workerCleric);
						break;
				}
			}


			return result;
		},

		getRandomOrigin: function (sector) {
			let campComponent = sector.get(CampComponent);
			let position = sector.get(PositionComponent);
			let level = position.level;
			let maxPopulation = campComponent.maxPopulation;

			let possibleOrigins = [];

			possibleOrigins.push(CultureConstants.origins.SURFACE);
			if (level > 20) possibleOrigins.push(CultureConstants.origins.SURFACE);
			if (level > 17) possibleOrigins.push(CultureConstants.origins.SURFACE);
			if (level > 14) possibleOrigins.push(CultureConstants.origins.SURFACE);

			possibleOrigins.push(CultureConstants.origins.SLUMS);
			if (level < 20) possibleOrigins.push(CultureConstants.origins.SLUMS);
			if (level > 14) possibleOrigins.push(CultureConstants.origins.SLUMS);
			if (level > 6) possibleOrigins.push(CultureConstants.origins.SLUMS);

			possibleOrigins.push(CultureConstants.origins.DARKLEVELS);
			if (level < 13) possibleOrigins.push(CultureConstants.origins.DARKLEVELS);
			if (level < 10) possibleOrigins.push(CultureConstants.origins.DARKLEVELS);
			if (maxPopulation < 24) possibleOrigins.push(CultureConstants.origins.DARKLEVELS);

			return MathUtils.randomElement(possibleOrigins);
		},
		
		getRandomIncomingCaravan: function (campOrdinal, levelOrdinal, traderLevel, unlockedResources, neededIngredient) {
			let traderTypeRelativeProbabilities = {};
			traderTypeRelativeProbabilities[TradeConstants.traderType.EQUIPMENT] = 1;
			traderTypeRelativeProbabilities[TradeConstants.traderType.GENERAL] = 1;
			traderTypeRelativeProbabilities[TradeConstants.traderType.CRAFTING] = 0.75 - (traderLevel - 1) * 0.1;
			traderTypeRelativeProbabilities[TradeConstants.traderType.RESOURCES] = 1.5 + traderLevel * 0.1;
			traderTypeRelativeProbabilities[TradeConstants.traderType.PARTNER] = 1.1;
			traderTypeRelativeProbabilities[TradeConstants.traderType.VALUABLES] = (traderLevel - 1) * 0.2;
			
			if (neededIngredient) {
				traderTypeRelativeProbabilities[TradeConstants.traderType.CRAFTING] = 10;
			}
			
			let traderType = RandomUtils.selectOneFromRelativeProbabilities(traderTypeRelativeProbabilities);
			return this.getRandomIncomingCaravanWithType(traderType, campOrdinal, levelOrdinal, traderLevel, unlockedResources, neededIngredient);
		},
		
		getRandomIncomingCaravanWithType: function (traderType, campOrdinal, levelOrdinal, traderLevel, unlockedResources, neededIngredient) {
			let name = "";
			let sellItems = [];
			let sellResources = new ResourcesVO();
			let buyItemTypes = [];
			let buyResources = [];
			let usesCurrency = false;

			// TODO adjust resource amounts based on resource rarity / value (plenty of metal, less herbs)
			let minResAmount = 40 + campOrdinal * 10;
			let randResAmount = 450 + campOrdinal * 50;
			
			// TODO unify logic with scavenge rewards - many similar checks
			let addSellItemIfValid = function (itemDefinition, probability, maxAmount) {
				// check hard requirements
				var tradeRarity = itemDefinition.tradeRarity;
				if (tradeRarity <= 0)
					return;
				if (itemDefinition.requiredCampOrdinal > campOrdinal + 1)
					return;
				if (campOrdinal <= 8 && itemDefinition.requiredCampOrdinal >= 9)
					return;
				if (ItemConstants.isQuicklyObsoletable(itemDefinition.type)) {
					if (itemDefinition.requiredCampOrdinal > 0 && itemDefinition.requiredCampOrdinal <= campOrdinal - 5)
						return;
				}
				var craftingReq = GameGlobals.itemsHelper.getRequiredCampAndStepToCraft(itemDefinition);
				if (craftingReq.campOrdinal > campOrdinal + 1)
					return;
				// check probability
				var isNeededIngredient = neededIngredient && itemDefinition.id == neededIngredient;
				var itemProbability = probability * (1/tradeRarity);
				if (craftingReq.campOrdinal > campOrdinal || itemDefinition.requiredCampOrdinal > campOrdinal) {
					itemProbability *= 0.5;
				}
				if (Math.random() > itemProbability && !isNeededIngredient) {
					return;
				}
				// add item
				let amount = Math.ceil(Math.random() * maxAmount);
				for (let j = 0; j < amount; j++) {
					let level = ItemConstants.getRandomItemLevel(ItemConstants.itemSource.trade, itemDefinition);
					sellItems.push(ItemConstants.getNewItemInstanceByDefinition(itemDefinition, level));
				}
			}
			
			// TODO fix probability of ending up with some items depending on number of matching items
			let addSellItemsFromCategories = function (categories, probability, maxAmount, maxDifferentItems, includeCommon, filter) {
				let matchesFilter = function (itemDefinition) {
					if (!filter) return true;
					if (typeof filter == "string") {
						return itemDefinition.id.indexOf(filter) >= 0;
					}

					for (let i in filter) {
						let id = filter[i];
						if (itemDefinition.id.indexOf(id) >= 0) return true;
					}

					return false;
				};

				let numDifferentItemsAdded = 0;
				for (let j in categories) {
					var category = categories[j];
					var isObsoletable = ItemConstants.isObsoletable(category);
					var itemList = ItemConstants.itemDefinitions[category];
					for (let i in itemList) {
						let itemDefinition = itemList[i];
						if (!matchesFilter(itemDefinition))
							continue;
						if (!includeCommon && isObsoletable && itemDefinition.craftable && itemDefinition.requiredCampOrdinal < campOrdinal)
							continue;
						let numBefore = sellItems.length;
						addSellItemIfValid(itemDefinition, probability, maxAmount);
						let numAfter = sellItems.length;
						if (numBefore < numAfter) numDifferentItemsAdded++;
						if (numDifferentItemsAdded >= maxDifferentItems) return;
					}
				}
			}

			let addSellItemsByIDs = function (ids, probability, maxAmount, maxDifferentItems, includeCommon) {
				let allCategories = Object.keys(ItemConstants.itemTypes);
				addSellItemsFromCategories(allCategories, probability, maxAmount, maxDifferentItems, includeCommon, ids);
			}
			
			let rand = Math.random();
			let rand2 = Math.random();
			
			if (traderType == TradeConstants.traderType.EQUIPMENT) {
				// 1) equipment trader: sells (equipment caterogy), buys equipment, uses currency
				let categories = [];
				let ids = [];

				if (rand2 <= 0.33) {
					name = "weapons trader";
					categories.push("weapon");
					ids.push("consumable_weapon");
					ids.push("stamina_potion_1");
				} else if (rand2 <= 0.66) {
					name = "clothing trader";
					categories.push("clothing_over");
					categories.push("clothing_upper");
					categories.push("clothing_lower");
					categories.push("clothing_hands");
					categories.push("clothing_head");
					categories.push("shoes");
				} else {
					name = "equipment trader";
					categories.push("light");
					categories.push("bag");
					categories.push("exploration");
					ids.push("cache_water");
					ids.push("cache_food");
				}
				
				let prob = 0.75;
				while (sellItems.length < 4 && prob <= 1) {
					addSellItemsFromCategories(categories, prob, 1, 4, true);
					addSellItemsByIDs(ids, prob, 2, 1, true);
					prob += 0.05;
				}
				if (neededIngredient) {
					addSellItemsFromCategories([ "ingredient"], 0.25, 5 + campOrdinal + 2, 2, true);
				}
				buyItemTypes = categories;
				buyItemTypes.push("trade");
				usesCurrency = traderLevel > 1;
			} else if (traderType == TradeConstants.traderType.GENERAL) {
				// 2) misc trader: sells ingredients, random items, buys all items, uses currency
				name = "general trader";
				let categories = [];
				while (categories.length < 3) {
					if (Math.random() <= 0.2) categories.push("light");
					if (Math.random() <= 0.5) categories.push("weapon");
					if (Math.random() <= 0.3) categories.push("clothing_over");
					if (Math.random() <= 0.3) categories.push("clothing_upper");
					if (Math.random() <= 0.3) categories.push("clothing_lower");
					if (Math.random() <= 0.3) categories.push("clothing_hands");
					if (Math.random() <= 0.3) categories.push("clothing_head");
					if (Math.random() <= 0.3) categories.push("shoes");
					if (Math.random() <= 0.2) categories.push("bag");
					if (Math.random() <= 0.7) categories.push("exploration");
				}
				let prob = 0.05;
				while (sellItems.length < 5 && prob < 1) {
					addSellItemsFromCategories(categories, prob, 1, 5, true);
					prob += 0.05;
				}
				if (Math.random() < 0.5 || neededIngredient) {
					addSellItemsFromCategories([ "ingredient"], 0.7, 5 + campOrdinal + 2, 2, true);
				} else if (Math.random() < 0.2 * traderLevel) {
					addSellItemsFromCategories([ "voucher" ], 0.5, 1, 1, true, "cache_rumours");
				} else if (Math.random() < 0.1 * traderLevel) {
					addSellItemsFromCategories([ "voucher" ], 0.2, 1, 1, true, "cache_evidence");
				} else {
					addSellItemsByIDs([ "cache_water", "cache_food" ], 0.2, 2, 2, true);
				}
				buyItemTypes = Object.keys(ItemConstants.itemTypes);
				usesCurrency = traderLevel > 1;
			} else if (traderType == TradeConstants.traderType.CRAFTING) {
				// 3) ingredient trader: sells ingredients, buys ingredients, occational items, no currency
				name = "crafting trader";
				let ingredientProbability = 0.25;
				let num = 5 + campOrdinal * 3;
				while (sellItems.length < num && ingredientProbability <= 1) {
					addSellItemsFromCategories([ "ingredient"], ingredientProbability, num, 3, true);
					ingredientProbability += 0.05;
				}
				addSellItemsFromCategories([ "clothing_over", "clothing_upper", "clothing_lower", "clothing_hands", "clothing_head", "shoes", "bag" ], 0.05, 1, num, false);
				addSellItemsFromCategories([ "exploration" ], 0.1, 1, 2, true);
				buyItemTypes.push("ingredient");
				buyItemTypes.push("trade");
				usesCurrency = false;
			} else if (traderType == TradeConstants.traderType.RESOURCES) {
				// 4) resource trader: sells and buys a specific resource
				let mainResourceRelativeProbabilities = {};
				mainResourceRelativeProbabilities[resourceNames.metal] = 1; // building materials
				mainResourceRelativeProbabilities[resourceNames.water] = 1; // supplies
				if (unlockedResources.herbs) mainResourceRelativeProbabilities[resourceNames.herbs] = 0.5;
				if (unlockedResources.tools) mainResourceRelativeProbabilities[resourceNames.tools] = 0.4 + traderLevel * 2 * 0.5;
				if (unlockedResources.fuel) mainResourceRelativeProbabilities[resourceNames.fuel] = 0.4 + traderLevel * 2 * 0.5;
				if (unlockedResources.rubber) mainResourceRelativeProbabilities[resourceNames.rubber] = 0.2;
				let mainResource = RandomUtils.selectOneFromRelativeProbabilities(mainResourceRelativeProbabilities);
					
				if (mainResource == resourceNames.herbs) {
					name = "herbs trader";
					sellResources.addResource(resourceNames.herbs, minResAmount + Math.random() * randResAmount);
					buyResources.push(resourceNames.herbs);
					if (unlockedResources.medicine && Math.random() < 0.75) {
						if (campOrdinal > 8) {
							name = "medicine trader";
							sellResources.addResource(resourceNames.medicine, minResAmount + Math.random() * randResAmount);
						}
						buyResources.push(resourceNames.medicine);
					}
					if (traderLevel > 1 && Math.random() < 0.1 * traderLevel) {
						addSellItemsFromCategories([ "voucher" ], 0.3, 1, 1, true, "cache_hope");
					}
				} else if (mainResource == resourceNames.tools) {
					name = "tools trader";
					sellResources.addResource(resourceNames.tools, minResAmount + Math.random() * randResAmount);
					buyResources.push(resourceNames.tools);
				} else if (mainResource == resourceNames.fuel) {
					name = "fuel trader";
					sellResources.addResource(resourceNames.fuel, minResAmount + Math.random() * randResAmount);
					buyResources.push(resourceNames.fuel);
				} else if (mainResource == resourceNames.rubber) {
					name = "rubber trader";
					sellResources.addResource(resourceNames.rubber, minResAmount + Math.random() * randResAmount);
					buyResources.push(resourceNames.rubber);
				} else if (mainResource == resourceNames.water) {
					name = "supplies trader";
					sellResources.addResource(resourceNames.water, minResAmount + Math.random() * randResAmount);
					sellResources.addResource(resourceNames.food, minResAmount + Math.random() * randResAmount);
					buyResources.push(resourceNames.water);
					buyResources.push(resourceNames.food);
				} else {
					name = "materials trader";
					sellResources.addResource(resourceNames.metal, minResAmount + Math.random() * randResAmount);
					buyResources.push(resourceNames.metal);
					sellResources.addResource(resourceNames.rope, minResAmount + Math.random() * randResAmount);
					buyResources.push(resourceNames.rope);
					if (unlockedResources.concrete) {
						sellResources.addResource(resourceNames.concrete, minResAmount + Math.random() * randResAmount);
						buyResources.push(resourceNames.concrete);
					}
				}
				buyItemTypes.push("trade");
				usesCurrency = true;
			} else if (traderType == TradeConstants.traderType.PARTNER) {
				// 5) trading partner trader: buys and sells same stuff as partner, plus occational items, currency based on partner
				var partner = TradeConstants.getRandomTradePartner(campOrdinal);
				name = "trader from " + partner.name;
				for (let i = 0; i < partner.sellsResources.length; i++) {
					sellResources.addResource(partner.sellsResources[i], minResAmount + Math.random() * randResAmount, "get-trader");
				}
				for (let i = 0; i < partner.buysResources.length; i++) {
					buyResources.push(partner.buysResources[i]);
				}
				var prob = 0.01;
				var numItems = Math.floor(Math.random() * 2);
				while (sellItems.length < numItems && prob < 1) {
					addSellItemsFromCategories(partner.sellItemTypes, prob, 1, numItems, true);
					prob += 0.01;
				}
				for (let i = 0; i < partner.buyItemTypes.length; i++) {
					buyItemTypes.push(partner.buyItemTypes[i]);
				}
				if (!partner.usesCurrency || neededIngredient)
					buyItemTypes.push("ingredient");
				addSellItemsFromCategories([ "voucher" ], traderLevel * 0.15, 1, 1, true, "cache_rumours");
				buyItemTypes.push("trade");
				usesCurrency = partner.usesCurrency;
			} else if (traderType == TradeConstants.traderType.VALUABLES) {
				// 6) valuables trader (artefacts, cahces)
				name = "rarities trader";
				addSellItemsFromCategories([ "bag" ], 0.1, 1, 1, false);
				addSellItemsFromCategories([ "light" ], 0.1, 1, 1, false);
				addSellItemsFromCategories([ "artefact" ], 0.3, 1, 2, true);
				if (Math.random() < 0.15 * traderLevel) {
					addSellItemsFromCategories([ "voucher" ], 0.2, 1, 1, true, "cache_evidence");
				} else if (Math.random() < 0.25 * traderLevel) {
					addSellItemsFromCategories([ "voucher" ], 0.1, 1, 1, true, "cache_hope");
				} else if (Math.random() < 0.25 * traderLevel) {
					addSellItemsFromCategories([ "voucher" ], 0.5, 1, 1, true, "cache_rumours");
				}
				buyItemTypes.push("artefact");
				buyItemTypes.push("trade");
				usesCurrency = true;
			} else {
				log.w("unknown trader type: " + traderType);
				return null;
			}
			
			let currency = usesCurrency ? Math.floor(traderLevel * 2 + Math.floor(Math.random() * levelOrdinal) * 0.5) : 0;
			return new IncomingCaravanVO(name, sellItems, sellResources, buyItemTypes, buyResources, usesCurrency, currency);
		},
		
		getMaxWorkers: function (sector, workerID) {
			var position = sector.get(PositionComponent);
			var level = position.level;
			var campOrdinal = GameGlobals.gameState.getCampOrdinal(position.level);
			
			var improvements = sector.get(SectorImprovementsComponent);
			var upgrades = this.tribeUpgradesNodes.head.upgrades;
			var workshops = GameGlobals.levelHelper.getWorkshopsByResourceForCamp(campOrdinal);
		
			return GameGlobals.campBalancingHelper.getMaxWorkers(workerID, improvements, upgrades, workshops);
		},
		
		getTotalWorkers: function (workerType) {
			if (!this.campNodes.head) return 0;
			let result = 0;
			for (let campNode = this.campNodes.head; campNode; campNode = campNode.next) {
				result += campNode.camp.assignedWorkers[workerType] || 0;
			}
			return result;
		},

		
		addDisabledPopulation: function (sector, num, workerType, reason, timer) {
			let campComponent = sector.get(CampComponent);
			campComponent.addDisabledPopulation(num, workerType, reason, timer);

			if (workerType) {
				if (campComponent.assignedWorkers[workerType] > 0) {
					campComponent.assignedWorkers[workerType] -= num;
				}
			}
		},
		
		hasUnlockedWorker: function (workerID) {
			for (let campNode = this.campNodes.head; campNode; campNode = campNode.next) {
				if (this.getMaxWorkers(campNode.entity, workerID) > 0) {
					return true;
				}
			}
			return false;
		},

		hasMedicine: function (sector) {
			let storage = GameGlobals.resourcesHelper.getCurrentCampStorage(sector);
			return storage && storage.resources.getResource(resourceNames.medicine) > 0;
		},

		hasHerbs: function (sector) {
			let storage = GameGlobals.resourcesHelper.getCurrentCampStorage(sector);
			return storage && storage.resources.getResource(resourceNames.herbs) > 0;
		},
		
		getRobotStorageCapacity: function (camp) {
			let improvements = camp.get(SectorImprovementsComponent);
			if (!improvements) return 0;
			let factoryCount = improvements.getCount(improvementNames.robotFactory);
			let factoryLevel = improvements.getLevel(improvementNames.robotFactory);
			return CampConstants.getRobotStorageCapacity(factoryCount, factoryLevel);
		},
		
		getCurrentMaxImprovementLevel: function (improvementName) {
            let techLevel = GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementName, this.tribeUpgradesNodes.head.upgrades);
			return GameGlobals.campBalancingHelper.getMaxImprovementLevel(improvementName, techLevel);
		},
		
		getCurrentMajorImprovementLevel: function (improvementsComponent, improvementName) {
			let level = improvementsComponent.getLevel(improvementName);
			let id = ImprovementConstants.getImprovementID(improvementName);
			return ImprovementConstants.getMajorLevel(id, level);
		},
		
		getCurrentMaxBuiltImprovementLevel: function (improvementID) {
			let result = 1;
			let improvementName = improvementNames[improvementID];
			for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
				let improvements = campNode.entity.get(SectorImprovementsComponent);
				result = Math.max(result, improvements.getLevel(improvementName))
			}
			return result;
		},
		
		getCurrentMaxExplorersRecruited: function () {
			return ExplorerConstants.getMaxExplorersRecruited();
		},
		
		findRecruitComponentWithExplorerId: function (explorerId) {
			for (var node = this.campNodes.head; node; node = node.next) {
				let campRecruitComponent = node.entity.get(RecruitComponent);
				if (!campRecruitComponent) continue;
				let campExplorer = campRecruitComponent.explorer;
				if (campExplorer.id == explorerId) {
					return campRecruitComponent;
				}
			}
			return null;
		},
		
		getNextMajorImprovementLevel: function (improvementsComponent, improvementName) {
			let level = improvementsComponent.getLevel(improvementName);
			let id = ImprovementConstants.getImprovementID(improvementName);
			return ImprovementConstants.getMajorLevel(id, level + 1);
		},
		
		getTargetReputation: function (campEntity, baseValue, improvementsComponent, resourcesVO, population, habitability, danger, isSunlit) {
			let availableLuxuryResources = this.getAvailableLuxuryResources(campEntity);
			return GameGlobals.campBalancingHelper.getTargetReputation(baseValue, improvementsComponent, availableLuxuryResources.length, resourcesVO, population, habitability, danger, isSunlit);
		},
		
		getUpgradeBonus: function (worker) {
			return GameGlobals.campBalancingHelper.getWorkerUpgradeBonus(worker, this.tribeUpgradesNodes.head.upgrades);
		},
		
		getDefaultWorkerAssignment: function (sector, ignoreFoodWaterStatus) {
			var campComponent = sector.get(CampComponent);
			
			var pop = campComponent.population;
			var currentStorage = GameGlobals.resourcesHelper.getCurrentStorage();
			var maxStorage = currentStorage.storageCapacity;
			var currentFood = currentStorage.resources.getResource(resourceNames.food);
			var currentWater = currentStorage.resources.getResource(resourceNames.water);
			
			let prioritizeFood = ignoreFoodWaterStatus ? false : currentFood / maxStorage < 0.5;
			let prioritizeWater = ignoreFoodWaterStatus ? false : currentWater / maxStorage < 0.5;
			
			return GameGlobals.campBalancingHelper.getDefaultWorkerAssignment(pop, prioritizeFood, prioritizeWater, null, (id) => this.getMaxWorkers(sector, id));
		}
	});
	
	return CampHelper;
});
