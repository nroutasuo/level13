// Helpers for camp stuff that can use current game state
define([
	'ash',
	'utils/MathUtils',
	'utils/RandomUtils',
	'game/GameGlobals',
	'game/constants/GameConstants',
	'game/constants/CampConstants',
	'game/constants/FollowerConstants',
	'game/constants/ImprovementConstants',
	'game/constants/ItemConstants',
	'game/constants/OccurrenceConstants',
	'game/constants/TradeConstants',
	'game/constants/WorldConstants',
	'game/components/common/CampComponent',
	'game/components/common/PositionComponent',
	'game/components/sector/events/RecruitComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/type/LevelComponent',
	'game/nodes/sector/CampNode',
	'game/nodes/tribe/TribeUpgradesNode',
	'game/vos/ResourcesVO',
	'game/vos/IncomingCaravanVO'
], function (Ash, MathUtils, RandomUtils, GameGlobals, GameConstants, CampConstants, FollowerConstants, ImprovementConstants, ItemConstants, OccurrenceConstants, TradeConstants, WorldConstants,
	CampComponent, PositionComponent, RecruitComponent, SectorImprovementsComponent, LevelComponent, CampNode, TribeUpgradesNode, ResourcesVO, IncomingCaravanVO) {
	
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
		
		getAvailableLuxuryResources: function (campEntity) {
			let result = [];
			let hasAccessToTradeNetwork = true;
			let campOrdinal = GameGlobals.gameState.numCamps;
			
			if (campEntity) {
				let position = campEntity.get(PositionComponent);
				let level = position.level;
				campOrdinal = GameGlobals.gameState.getCampOrdinal(level);
				hasAccessToTradeNetwork = GameGlobals.resourcesHelper.hasAccessToTradeNetwork(campEntity);
			}
			
			let builtProjects = GameGlobals.levelHelper.getBuiltProjects();
			for (let i = 0; i < builtProjects.length; i++) {
				let project = builtProjects[i];
				if (project.improvement.name != improvementNames.luxuryOutpost) continue;
				
				let projectLevel = project.position.level;
				let projectCampOrdinal = GameGlobals.gameState.getCampOrdinal(projectLevel);
				if (hasAccessToTradeNetwork || projectCampOrdinal == campOrdinal) {
					let levelsForCamp = GameGlobals.gameState.getLevelsForCamp(projectCampOrdinal);
					for (let i = 0; i < levelsForCamp.length; i++) {
						let campLevel = levelsForCamp[i];
						let resource = GameGlobals.levelHelper.getLuxuryResourceOnLevel(campLevel);
						if (resource) {
							result.push(resource);
						}
					}
				}
			}
			return result;
		},
		
		getMetalProductionPerSecond: function (workers, improvementsComponent, robots) {
			return GameGlobals.campBalancingHelper.getMetalProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades, robots) * GameConstants.gameSpeedCamp;
		},
		
		getFoodProductionPerSecond: function (workers, improvementsComponent, robots) {
			return GameGlobals.campBalancingHelper.getFoodProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades, robots) * GameConstants.gameSpeedCamp;
		},
		
		getWaterProductionPerSecond: function (workers, improvementsComponent, robots) {
			return GameGlobals.campBalancingHelper.getWaterProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades, robots) * GameConstants.gameSpeedCamp;
		},
		
		getRopeProductionPerSecond: function (workers, improvementsComponent, robots) {
			return GameGlobals.campBalancingHelper.getRopeProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades, robots) * GameConstants.gameSpeedCamp;
		},
		
		getFuelProductionPerSecond: function (workers, improvementsComponent, robots) {
			return GameGlobals.campBalancingHelper.getFuelProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades, robots) * GameConstants.gameSpeedCamp;
		},
		
		getRubberProductionPerSecond: function (workers, improvementsComponent, robots) {
			return GameGlobals.campBalancingHelper.getRubberProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades, robots) * GameConstants.gameSpeedCamp;
		},
		
		getHerbsProductionPerSecond: function (workers, improvementsComponent, robots) {
			return GameGlobals.campBalancingHelper.getHerbsProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades, robots) * GameConstants.gameSpeedCamp;
		},
		
		getMedicineProductionPerSecond: function (workers, improvementsComponent, robots) {
			return GameGlobals.campBalancingHelper.getMedicineProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades, robots) * GameConstants.gameSpeedCamp;
		},
		
		getToolsProductionPerSecond: function (workers, improvementsComponent, robots) {
			return GameGlobals.campBalancingHelper.getToolsProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades, robots) * GameConstants.gameSpeedCamp;
		},
		
		getConcreteProductionPerSecond: function (workers, improvementsComponent, robots) {
			return GameGlobals.campBalancingHelper.getConcreteProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades, robots) * GameConstants.gameSpeedCamp;
		},
		
		getRobotsProductionPerSecond: function (workers, improvementsComponent, robots) {
			return GameGlobals.campBalancingHelper.getRobotsProductionPerSecond(workers, improvementsComponent, this.tribeUpgradesNodes.head.upgrades, robots) * GameConstants.gameSpeedCamp;
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
		
		getToolsConsumptionPerSecondRobots: function (workers) {
			workers = workers || 0;
			return workers * CampConstants.CONSUMPTION_TOOLS_PER_ROBOT_MAKER_PER_S * GameConstants.gameSpeedCamp;
		},
		
		getDarkFarmProductionPerSecond: function (improvementsComponent) {
			let count = improvementsComponent.getCountWithModifierForDamaged(improvementNames.darkfarm, 0.5);
			let level = improvementsComponent.getLevel(improvementNames.darkfarm);
			return count * (0.01 + level * 0.01);
		},
		
		getAqueductProductionPerSecond: function (improvementsComponent) {
			let count = improvementsComponent.getCountWithModifierForDamaged(improvementNames.aqueduct, 0.5);
			let level = improvementsComponent.getLevel(improvementNames.aqueduct);
			return count * (0.01 + level * 0.01);
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
			return CampConstants.getTempleFavourGenerationPerSecond(templeCount, templeLevel) * GameConstants.gameSpeedCamp;
		},
		
		getCampfireRumourGenerationPerSecond: function (improvementsComponent, accSpeedPopulation) {
			var campfireCount = improvementsComponent.getCount(improvementNames.campfire);
			var campfireLevel = improvementsComponent.getLevel(improvementNames.campfire);
			return CampConstants.getCampfireRumourGenerationPerSecond(campfireCount, campfireLevel, accSpeedPopulation);
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
		
		getCampRaidDanger: function (sector) {
			let improvements = sector.get(SectorImprovementsComponent);
			let soldiers = sector.get(CampComponent).assignedWorkers.soldier || 0;
			let soldierLevel = GameGlobals.upgradeEffectsHelper.getWorkerLevel("soldier", this.tribeUpgradesNodes.head.upgrades);
			var levelComponent = GameGlobals.levelHelper.getLevelEntityForSector(sector).get(LevelComponent);
			let levelRaidDangerFactor = levelComponent.raidDangerFactor;
				
			return OccurrenceConstants.getRaidDanger(improvements, soldiers, soldierLevel, levelRaidDangerFactor);
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
		
		getRandomIncomingCaravan: function (campOrdinal, levelOrdinal, traderLevel, unlockedResources, neededIngredient) {
			let traderTypeRelativeProbabilities = {};
			traderTypeRelativeProbabilities[TradeConstants.traderType.EQUIPMENT] = 1;
			traderTypeRelativeProbabilities[TradeConstants.traderType.GENERAL] = 1;
			traderTypeRelativeProbabilities[TradeConstants.traderType.CRAFTING] = 1 - (traderLevel - 1) * 0.1;
			traderTypeRelativeProbabilities[TradeConstants.traderType.RESOURCES] = 1 + traderLevel * 0.1;
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
				var amount = Math.ceil(Math.random() * maxAmount);
				for (let j = 0; j < amount; j++) {
					sellItems.push(itemDefinition.clone());
				}
			}
			
			// TODO fix probability of ending up with some items depending on number of matching items
			let addSellItemsFromCategories = function (categories, probability, maxAmount, maxDifferentItems, includeCommon, filter) {
				let numDifferentItemsAdded = 0;
				for (let j in categories) {
					var category = categories[j];
					var isObsoletable = ItemConstants.isObsoletable(category);
					var itemList = ItemConstants.itemDefinitions[category];
					for (let i in itemList) {
						let itemDefinition = itemList[i];
						if (filter && itemDefinition.id.indexOf(filter) !== 0)
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
			
			let rand = Math.random();
			let rand2 = Math.random();
			
			if (traderType == TradeConstants.traderType.EQUIPMENT) {
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
					addSellItemsFromCategories(categories, prob, 1, 4, true);
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
				}
				var prob = 0.05;
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
				}
				buyItemTypes = Object.keys(ItemConstants.itemTypes);
				usesCurrency = traderLevel > 1;
			} else if (traderType == TradeConstants.traderType.CRAFTING) {
				// 3) ingredient trader: sells ingredients, buys ingredients, occational items, no currency
				name = "crafting trader";
				let ingredientProbability = 0.25;
				let num = 5 + campOrdinal * 3;
				while (sellItems.length < num && ingredientProbability < 1) {
					addSellItemsFromCategories([ "ingredient"], ingredientProbability, num / 3, num, true);
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
						name = "medicine trader";
						sellResources.addResource(resourceNames.medicine, minResAmount + Math.random() * randResAmount);
						buyResources.push(resourceNames.medicine);
					}
					if (traderLevel > 1 && Math.random() < 0.1 * traderLevel) {
						addSellItemsFromCategories([ "voucher" ], 0.3, 1, 1, true, "cache_favour");
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
					sellResources.addResource(partner.sellsResources[i], minResAmount + Math.random() * randResAmount);
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
					addSellItemsFromCategories([ "voucher" ], 0.1, 1, 1, true, "cache_favour");
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
			
			var currency = usesCurrency ? traderLevel * 2 + Math.floor(Math.random() * levelOrdinal) : 0;
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
		
		hasUnlockedWorker: function (workerID) {
			for (let campNode = this.campNodes.head; campNode; campNode = campNode.next) {
				if (this.getMaxWorkers(campNode.entity, workerID) > 0) {
					return true;
				}
			}
			return false;
		},
		
		getRobotStorageCapacity: function (camp) {
			let improvements = camp.get(SectorImprovementsComponent);
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
		
		getCurrentMaxFollowersRecruited: function () {
			let innMajorLevels = [];
			for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
				let improvements = campNode.entity.get(SectorImprovementsComponent);
				let count = improvements.getCount(improvementNames.inn);
				if (count < 1) continue;
				let level = improvements.getLevel(improvementNames.inn);
				let majorLevel = ImprovementConstants.getMajorLevel("inn", level);
				innMajorLevels.push(majorLevel);
			}
			return FollowerConstants.getMaxFollowersRecruited(innMajorLevels);
		},
		
		findRecruitComponentWithFollowerId: function (followerId) {
			for (var node = this.campNodes.head; node; node = node.next) {
				let campRecruitComponent = node.entity.get(RecruitComponent);
				if (!campRecruitComponent) continue;
				let campFollower = campRecruitComponent.follower;
				if (campFollower.id == followerId) {
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
		
		getTargetReputation: function (campEntity, baseValue, improvementsComponent, resourcesVO, population, populationFactor, danger, isSunlit) {
			let availableLuxuryResources = this.getAvailableLuxuryResources(campEntity);
			return GameGlobals.campBalancingHelper.getTargetReputation(baseValue, improvementsComponent, availableLuxuryResources.length, resourcesVO, population, populationFactor, danger, isSunlit);
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
