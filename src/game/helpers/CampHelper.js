// Helpers for camp stuff that can use current game state
define([
	'ash',
	'game/GameGlobals',
	'game/constants/GameConstants',
	'game/constants/CampConstants',
	'game/constants/ImprovementConstants',
	'game/constants/ItemConstants',
	'game/constants/OccurrenceConstants',
	'game/constants/WorldConstants',
	'game/components/common/CampComponent',
	'game/components/common/PositionComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/type/LevelComponent',
	'game/nodes/sector/CampNode',
	'game/nodes/tribe/TribeUpgradesNode',
	'game/vos/ResourcesVO',
	'game/vos/IncomingCaravanVO',
	'worldcreator/WorldCreatorConstants',
], function (Ash, GameGlobals, GameConstants, CampConstants, ImprovementConstants, ItemConstants, OccurrenceConstants, WorldConstants,
	CampComponent, PositionComponent, SectorImprovementsComponent, LevelComponent, CampNode, TribeUpgradesNode, ResourcesVO, IncomingCaravanVO, WorldCreatorConstants) {
	
	var CampHelper = Ash.Class.extend({
		
		constructor: function (engine) {
			if (engine) {
				this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
				this.campNodes = engine.getNodeList(CampNode);
			}
		},
		
		getTotalNumImprovementsBuilt: function (improvementName) {
			if (!this.campNodes.head) return 0;
			var result = 0;
			for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
				var improvements = campNode.entity.get(SectorImprovementsComponent);
				result += improvements.getCount(improvementName);
			}
			return result;
		},
		
		getMetalProductionPerSecond: function (workers, improvementsComponent) {
			return GameGlobals.campBalancingHelper.getMetalProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades) * GameConstants.gameSpeedCamp;
		},
		
		getFoodProductionPerSecond: function (workers, improvementsComponent) {
			return GameGlobals.campBalancingHelper.getFoodProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades) * GameConstants.gameSpeedCamp;
		},
		
		getWaterProductionPerSecond: function (workers, improvementsComponent) {
			return GameGlobals.campBalancingHelper.getWaterProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades) * GameConstants.gameSpeedCamp;
		},
		
		getRopeProductionPerSecond: function (workers, improvementsComponent) {
			return GameGlobals.campBalancingHelper.getRopeProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades) * GameConstants.gameSpeedCamp;
		},
		
		getFuelProductionPerSecond: function (workers, improvementsComponent) {
			return GameGlobals.campBalancingHelper.getFuelProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades) * GameConstants.gameSpeedCamp;
		},
		
		getRubberProductionPerSecond: function (workers, improvementsComponent) {
			return GameGlobals.campBalancingHelper.getRubberProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades) * GameConstants.gameSpeedCamp;
		},
		
		getHerbsProductionPerSecond: function (workers, improvementsComponent) {
			return GameGlobals.campBalancingHelper.getHerbsProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades) * GameConstants.gameSpeedCamp;
		},
		
		getMedicineProductionPerSecond: function (workers, improvementsComponent) {
			return GameGlobals.campBalancingHelper.getMedicineProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades) * GameConstants.gameSpeedCamp;
		},
		
		getToolsProductionPerSecond: function (workers, improvementsComponent) {
			return GameGlobals.campBalancingHelper.getToolsProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades) * GameConstants.gameSpeedCamp;
		},
		
		getConcreteProductionPerSecond: function (workers, improvementsComponent) {
			return GameGlobals.campBalancingHelper.getConcreteProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades) * GameConstants.gameSpeedCamp;
		},
		
		getEvidenceProductionPerSecond: function (workers, improvementComponent) {
			workers = workers || 0;
			var evidenceUpgradeBonus = this.getUpgradeBonus("scientist");
			return workers * CampConstants.PRODUCTION_EVIDENCE_PER_WORKER_PER_S * evidenceUpgradeBonus * GameConstants.gameSpeedCamp;
		},
		
		getFavourProductionPerSecond: function (workers, improvementComponent) {
			workers = workers || 0;
			var upgradeBonus = this.getUpgradeBonus("cleric");
			return workers * CampConstants.PRODUCTION_FAVOUR_PER_WORKER_PER_S * upgradeBonus * GameConstants.gameSpeedCamp;
		},
		
		getWaterConsumptionPerSecond: function (population, useExplorationSpeed) {
			var speed = useExplorationSpeed ? GameConstants.gameSpeedExploration : GameConstants.gameSpeedCamp;
			return CampConstants.CONSUMPTION_WATER_PER_WORKER_PER_S * Math.floor(population) * speed;
		},
		
		getFoodConsumptionPerSecond: function (population, useExplorationSpeed) {
			var speed = useExplorationSpeed ? GameConstants.gameSpeedExploration : GameConstants.gameSpeedCamp;
			return CampConstants.CONSUMPTION_FOOD_PER_WORKER_PER_S * Math.floor(population) * speed;
		},
		
		getHerbsConsumptionPerSecond: function (workers) {
			workers = workers || 0;
			return workers * CampConstants.CONSUMPTION_HERBS_PER_WORKER_PER_S * GameConstants.gameSpeedCamp;
		},
		
		getMetalConsumptionPerSecondSmith: function (workers) {
			workers = workers || 0;
			return workers * CampConstants.CONSUMPTION_METAL_PER_TOOLSMITH_PER_S * GameConstants.gameSpeedCamp;
		},
		
		getMetalConsumptionPerSecondConcrete: function (workers) {
			workers = workers || 0;
			return workers * CampConstants.CONSUMPTION_METAL_PER_CONCRETE_PER_S * GameConstants.gameSpeedCamp;
		},
		
		getDarkFarmProductionPerSecond: function (improvementsComponent) {
			let count = improvementsComponent.getCount(improvementNames.darkfarm);
			let level = improvementsComponent.getLevel(improvementNames.darkfarm);
			return count * (0.01 + level * 0.05);
		},
		
		getLibraryEvidenceGenerationPerSecond: function (improvementsComponent) {
			var libraryCount = improvementsComponent.getCount(improvementNames.library);
			var libraryLevel = improvementsComponent.getLevel(improvementNames.library);
			return CampConstants.getLibraryEvidenceGenerationPerSecond(libraryCount, libraryLevel) * GameConstants.gameSpeedCamp;
		},
		
		getResearchCenterEvidenceGenerationPerSecond: function (improvementsComponent) {
			var centerCount = improvementsComponent.getCount(improvementNames.researchcenter);
			var centerLevel = improvementsComponent.getLevel(improvementNames.researchcenter);
			return CampConstants.getResearchCenterEvidenceGenerationPerSecond(centerCount, centerLevel) * GameConstants.gameSpeedCamp;
		},
		
		getTempleFavourGenerationPerSecond: function (improvementsComponent) {
			var templeCount = improvementsComponent.getCount(improvementNames.temple);
			var templeLevel = improvementsComponent.getLevel(improvementNames.temple);
			var templeLevelFactor = (1 + templeLevel * CampConstants.FAVOUR_BONUS_PER_TEMPLE_LEVEL);
			return 0.0015 * templeCount * templeLevelFactor;
		},
		
		getCampfireRumourGenerationPerSecond: function (improvementsComponent, campfireUpgradeLevel, accSpeedPopulation) {
			var campfireCount = improvementsComponent.getCount(improvementNames.campfire);
			var campfireLevel = improvementsComponent.getLevel(improvementNames.campfire);
			return CampConstants.getCampfireRumourGenerationPerSecond(campfireCount, campfireLevel, campfireUpgradeLevel, accSpeedPopulation);
		},
		
		getMarketRumourGenerationPerSecond: function (improvementsComponent, accSpeedPopulation) {
			var marketCount = improvementsComponent.getCount(improvementNames.market);
			var marketLevel = improvementsComponent.getLevel(improvementNames.market);
			return CampConstants.getMarketRumourGenerationPerSecond(marketCount, marketLevel, accSpeedPopulation);
		},
		
		getInnRumourGenerationPerSecond: function (improvementsComponent, accSpeedPopulation) {
			var innCount = improvementsComponent.getCount(improvementNames.inn);
			let innLevel = improvementsComponent.getLevel(improvementNames.inn);
			return CampConstants.getInnRumourGenerationPerSecond(innCount, innLevel, accSpeedPopulation);
		},

		getCampMaxPopulation: function (sector) {
			var improvements = sector.get(SectorImprovementsComponent);
			return CampConstants.getHousingCap(improvements);
		},
		
		getRandomIncomingCaravan: function (campOrdinal, levelOrdinal, unlockedResources, neededIngredient) {
			var name = "";
			var sellItems = [];
			var sellResources = new ResourcesVO();
			var buyItemTypes = [];
			var buyResources = [];
			var usesCurrency = false;
			
			// TODO adjust resource amounts based on resource rarity / value (plenty of metal, less herbs)
			var minResAmount = 40 + campOrdinal * 10;
			var randResAmount = 450 + campOrdinal * 50;
			
			// TODO unify logic with scavenge rewards - many similar checks
			var addSellItemsFromCategories = function (categories, probability, maxAmount, includeCommon) {
				for (var j in categories) {
					var category = categories[j];
					var isObsoletable = ItemConstants.isObsoletable(category);
					var itemList = ItemConstants.itemDefinitions[category];
					for (var i in itemList) {
						var itemDefinition = itemList[i];
						// check hard requirements
						var tradeRarity = itemDefinition.tradeRarity;
						if (tradeRarity <= 0)
							continue;
						if (itemDefinition.requiredCampOrdinal > campOrdinal + 1)
							continue;
						if (campOrdinal <= 8 && itemDefinition.requiredCampOrdinal >= 9)
							continue;
						if (ItemConstants.isQuicklyObsoletable(category)) {
							if (itemDefinition.requiredCampOrdinal > 0 && itemDefinition.requiredCampOrdinal <= campOrdinal - 5)
								continue;
						}
						if (!includeCommon && isObsoletable && itemDefinition.craftable && itemDefinition.requiredCampOrdinal < campOrdinal)
							continue;
						var craftingReq = GameGlobals.itemsHelper.getRequiredCampAndStepToCraft(itemDefinition);
						if (craftingReq.campOrdinal > campOrdinal + 1)
							continue;
						// check probability
						var isNeededIngredient = neededIngredient && itemDefinition.id == neededIngredient;
						var itemProbability = probability * (1/tradeRarity);
						if (craftingReq.campOrdinal > campOrdinal || itemDefinition.requiredCampOrdinal > campOrdinal) {
							itemProbability *= 0.5;
						}
						if (Math.random() > itemProbability && !isNeededIngredient) {
							continue;
						}
						// add item
						var amount = Math.ceil(Math.random() * maxAmount);
						for (var j = 0; j < amount; j++) {
							sellItems.push(itemDefinition.clone());
						}
					}
				}
			}
			
			var rand = Math.random();
			var rand2 = Math.random();
			if (rand <= 0.2) {
				// 1) equipment trader: sells (equipment caterogy), buys equipment, uses currency
				var categories = [];
				if (rand2 <= 0.33) {
					name = "weapons trader";
					categories.push("weapon");
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
				}
				var prob = 0.75;
				while (sellItems.length < 4 && prob <= 1) {
					addSellItemsFromCategories(categories, prob, 1, true);
					prob += 0.05;
				}
				if (neededIngredient) {
					addSellItemsFromCategories([ "ingredient"], 0.25, 5 + campOrdinal + 2, true);
				}
				buyItemTypes = categories;
				usesCurrency = true;
			} else if (rand <= 0.4) {
				// 2) misc trader: sells ingredients, random items, buys all items, uses currency
				name = "general trader";
				var categories = [];
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
					if (Math.random() <= 0.1) categories.push("artefact");
				}
				var prob = 0.05;
				while (sellItems.length < 5 && prob < 1) {
					addSellItemsFromCategories(categories, prob, 1, true);
					prob += 0.05;
				}
				if (Math.random() < 0.5 || neededIngredient) {
					addSellItemsFromCategories([ "ingredient"], 0.7, 5 + campOrdinal + 2, true);
				}
				buyItemTypes = Object.keys(ItemConstants.itemTypes);
				usesCurrency = true;
			} else if (rand <= 0.6 || neededIngredient) {
				// 3) ingredient trader: sells ingredients, buys ingredients, occational items, no currency
				name = "crafting trader";
				var prob = 0.25;
				var num = 5 + campOrdinal * 3;
				while (sellItems.length < num && prob < 1) {
					addSellItemsFromCategories([ "ingredient"], prob, num / 3, true);
					prob += 0.05;
				}
				addSellItemsFromCategories([ "clothing_over", "clothing_upper", "clothing_lower", "clothing_hands", "clothing_head", "shoes", "bag", "exploration" ], 0.05, 1, false);
				buyItemTypes.push("ingredient");
				usesCurrency = false;
			} else if (rand <= 0.8) {
				// 4) resource trader: sells and buys a specific resource
				if (rand2 <= 0.2 && unlockedResources.herbs) {
					name = "herbs trader";
					sellResources.addResource(resourceNames.herbs, minResAmount + Math.random() * randResAmount);
					buyResources.push(resourceNames.herbs);
					if (unlockedResources.medicine && Math.random() < 0.75) {
						name = "medicine trader";
						sellResources.addResource(resourceNames.medicine, minResAmount + Math.random() * randResAmount);
						buyResources.push(resourceNames.medicine);
					}
				} else if (rand2 <= 0.3 && unlockedResources.tools) {
					name = "tools trader";
					sellResources.addResource(resourceNames.tools, minResAmount + Math.random() * randResAmount);
					buyResources.push(resourceNames.tools);
				} else if (rand2 <= 0.4 && unlockedResources.fuel) {
					name = "fuel trader";
					sellResources.addResource(resourceNames.fuel, minResAmount + Math.random() * randResAmount);
					buyResources.push(resourceNames.fuel);
				} else if (rand2 < 0.7) {
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
				usesCurrency = true;
			} else {
				// 5) trading partner trader: buys and sells same stuff as partner, plus occational items, currency based on partner
				var partner = this.getRandomTradePartner(campOrdinal);
				name = "trader from " + partner.name;
				for (var i = 0; i < partner.sellsResources.length; i++) {
					sellResources.addResource(partner.sellsResources[i], minResAmount + Math.random() * randResAmount);
				}
				for (var i = 0; i < partner.buysResources.length; i++) {
					buyResources.push(partner.buysResources[i]);
				}
				var prob = 0.01;
				var numItems = Math.floor(Math.random() * 2);
				while (sellItems.length < numItems && prob < 1) {
					addSellItemsFromCategories(partner.sellItemTypes, prob, 1, true);
					prob += 0.01;
				}
				for (var i = 0; i < partner.buyItemTypes.length; i++) {
					buyItemTypes.push(partner.buyItemTypes[i]);
				}
				if (!partner.usesCurrency || neededIngredient)
					buyItemTypes.push("ingredient");
				usesCurrency = partner.usesCurrency;
			}
			
			var currency = usesCurrency ? 2 + Math.floor(Math.random() * levelOrdinal) : 0;
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
		
		getTargetReputation: function (improvementsComponent, resourcesVO, population, populationFactor, danger) {
			return GameGlobals.campBalancingHelper.getTargetReputation(improvementsComponent, resourcesVO, population, populationFactor, danger);
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
