// Helper methods related to rewards from player actions such as scavenging and scouting
define([
	'ash',
	'text/Text',
	'utils/MathUtils',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/EnemyConstants',
	'game/constants/ExplorationConstants',
	'game/constants/ExplorerConstants',
	'game/constants/LocaleConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/LogConstants',
	'game/constants/SectorConstants',
	'game/constants/TextConstants',
	'game/constants/ItemConstants',
	'game/constants/PerkConstants',
	'game/constants/UpgradeConstants',
	'game/constants/UIConstants',
	'game/constants/WorldConstants',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/PlayerLocationNode',
	'game/nodes/player/PlayerResourcesNode',
	'game/nodes/tribe/TribeUpgradesNode',
	'game/nodes/sector/CampNode',
	'game/nodes/LastVisitedCampNode',
	'game/nodes/NearestCampNode',
	'game/components/common/CampComponent',
	'game/components/common/PositionComponent',
	'game/components/common/ResourcesComponent',
	'game/components/common/CurrencyComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/sector/SectorLocalesComponent',
	'game/components/player/ItemsComponent',
	'game/components/player/BagComponent',
	'game/components/player/HopeComponent',
	'game/components/player/ExcursionComponent',
	'game/components/type/LevelComponent',
	'game/vos/ResultVO',
	'game/vos/ResourcesVO'
], function (
	Ash,
	Text,
	MathUtils,
	GameGlobals,
	GlobalSignals,
	GameConstants,
	EnemyConstants,
	ExplorationConstants,
	ExplorerConstants,
	LocaleConstants,
	PlayerActionConstants,
	LogConstants,
	SectorConstants,
	TextConstants,
	ItemConstants,
	PerkConstants,
	UpgradeConstants,
	UIConstants,
	WorldConstants,
	PlayerStatsNode,
	PlayerLocationNode,
	PlayerResourcesNode,
	TribeUpgradesNode,
	CampNode,
	LastVisitedCampNode,
	NearestCampNode,
	CampComponent,
	PositionComponent,
	ResourcesComponent,
	CurrencyComponent,
	SectorFeaturesComponent,
	SectorStatusComponent,
	SectorLocalesComponent,
	ItemsComponent,
	BagComponent,
	HopeComponent,
	ExcursionComponent,
	LevelComponent,
	ResultVO,
	ResourcesVO
) {
	var PlayerActionResultsHelper = Ash.Class.extend({

		playerStatsNodes: null,
		playerResourcesNodes: null,
		playerLocationNodes: null,
		tribeUpgradesNodes: null,

		RESULT_MGS_FORMAT_LOG: "RESULT_MGS_FORMAT_LOG",
		RESULT_MSG_FORMAT_PREVIW: "RESULT_MSG_FORMAT_PREVIW",

		fixedRewards: {
			"scavenge": [
				{ resources: { metal: 1 } },
				{ resources: { metal: 1 } },
				{ resources: { food: 1, metal: 1 } },
				{ },
				{ resources: { metal: 1 }, items: { "bag_0": 1 } },
				{ resources: { food: 1, metal: 1 } },
				{ resources: { metal: 1 } },
				{ resources: { metal: 1 } },
			]
		},
		
		context: "results",

		constructor: function (engine) {
			this.engine = engine;

			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			this.playerResourcesNodes = engine.getNodeList(PlayerResourcesNode);
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
			this.nearestCampNodes = engine.getNodeList(NearestCampNode);
			this.lastVisitedCampNodes = engine.getNodeList(LastVisitedCampNode);
			this.campNodes = engine.getNodeList(CampNode);
		},

		getResultVOByAction: function (action, hasCustomReward) {
			var baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(action);

			var resultVO;
			switch (baseActionID) {
				case "scavenge":
					resultVO = this.getScavengeRewards();
					break;
				case "scavenge_heap":
					resultVO = this.getScavengeHeapRewards();
					break;
				case "scout":
					resultVO = this.getScoutRewards();
					break;
				case "scout_locale_i":
				case "scout_locale_u":
					// TODO global helper to get locale vo from action?
					var localei = parseInt(action.split("_")[3]);
					var sectorLocalesComponent = this.playerLocationNodes.head.entity.get(SectorLocalesComponent);
					var localeVO = sectorLocalesComponent.locales[localei];
					resultVO = this.getScoutLocaleRewards(localeVO);
					break;
				case "investigate":
					resultVO = this.getInvestigateRewards();
					break;
				case "examine":
					resultVO = this.getExamineRewards();
					break;
				case "use_spring":
					resultVO = this.getUseSpringRewards();
					break;
				case "clear_workshop":
					resultVO = this.getClearWorkshopRewards();
					break;
				case "nap":
					resultVO = this.getNapRewards();
					break;
				case "clear_waste_r":
				case "clear_waste_t":
				case "flee":
				case "wait":
					resultVO = new ResultVO(baseActionID);
					break;
				default:
					log.w("Unknown action: " + baseActionID + ". Can't create result vo.");
					return null;
			}

			let playerVision = this.playerStatsNodes.head.vision.value;
			let perksComponent = this.playerStatsNodes.head.perks;
			let playerLuck = perksComponent.getTotalEffect(PerkConstants.perkTypes.luck);
			let loseInventoryProbability = PlayerActionConstants.getLoseInventoryProbability(action, playerVision, playerLuck);
			this.addLostAndBrokenItems(resultVO, action, loseInventoryProbability, true);
			
			let gainedInjuries =  this.getResultInjuries(PlayerActionConstants.getInjuryProbability(action, playerVision, playerLuck), action);
			resultVO.gainedPerks = resultVO.gainedPerks.concat(gainedInjuries);

			resultVO.hasCustomReward = hasCustomReward;

			resultVO.collected = false;
			
			return resultVO;
		},

		getUseItemRewards: function (itemID) {
			let rewards = new ResultVO("use_item");
			
			let baseItemId = ItemConstants.getBaseItemId(itemID);
			let itemConfig = ItemConstants.getItemDefinitionByID(itemID);

			switch (baseItemId) {
				case "cache_food":
					rewards.gainedResources.addResource(resourceNames.food, itemConfig.configData.foodValue || 10);
					break;
				case "cache_water":
					rewards.gainedResources.addResource(resourceNames.water, itemConfig.configData.waterValue || 10);
					break;
				case "cache_robots":
					// robots wear out so if we gave just 1 it would instantly become 0.999
					rewards.gainedResources.addResource(resourceNames.robots, 1.25);
					break;
			}

			return rewards;
		},

		getScavengeRewards: function () {
			let rewards = new ResultVO("scavenge");
			
			let sectorFeatures = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			let sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			let sectorResources = sectorFeatures.resourcesScavengable;
			let sectorIngredients = sectorFeatures.itemsScavengeable || [];
			let efficiency = this.getCurrentScavengeEfficiency();
			let clearedPercent = this.getCurrentSectorScavengedFactor();

			let itemTags = this.getSectorItemTags();
			
			let fixedRewards = this.getFixedRewards("scavenge");
			let isUsingFixedRewards = false;
			
			if (fixedRewards != null) {
				isUsingFixedRewards = true;
				this.addFixedRewards(rewards, fixedRewards, sectorResources);
			}
			
			if (!isUsingFixedRewards) {
				rewards.gainedResources = this.getRewardResources(1, 1, efficiency, sectorResources);

				let currencyModifier = this.getSectorCurrencyFindProbabilityModifier();
				rewards.gainedCurrency = this.getRewardCurrency(currencyModifier, efficiency, clearedPercent);
			}
			
			this.addStashes(rewards, sectorFeatures.stashes, sectorStatus.stashesFound);
			
			if (!isUsingFixedRewards) {			
				let itemOptions = { rarityKey: "scavengeRarity", tags: itemTags };

				if (rewards.gainedItems.length == 0) {
					rewards.gainedItems = this.getRewardItems(0.02, 0.5, sectorIngredients, itemOptions);
				}
			
				if (rewards.foundStashVO == null && rewards.gainedCurrency == 0) {
					this.addExplorerBonuses(rewards, sectorResources, sectorIngredients, itemOptions);
				}
	
				rewards.gainedExplorers = this.getFallbackExplorers(0.1);
			}

			return rewards;
		},

		getScavengeHeapRewards: function () {
			let rewards = new ResultVO("scavenge_heap");
			
			let sectorFeatures = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			let efficiency = this.getCurrentScavengeEfficiency();

			let heapResource = sectorFeatures.heapResource;

			if (!heapResource) return rewards;

			let heapResources = new ResourcesVO(storageTypes.DEFINITION);
			heapResources.addResource(heapResource, WorldConstants.resourcePrevalence.HEAP);

			rewards.gainedResources = this.getRewardResources(1, 1, efficiency, heapResources);

			return rewards;
		},

		getInvestigateRewards: function () {
			let rewards = new ResultVO("investigate");

			let sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			
			let efficiency = this.getCurrentScavengeEfficiency();
			let weightedInvestigateAdded = Math.min(1, efficiency);
			let investigatePercentAfter = sectorStatus.getInvestigatedPercent(weightedInvestigateAdded);
			let isCompletion = investigatePercentAfter >= 100;
			
			let playerPos = this.playerLocationNodes.head.position;
			let campOrdinal = GameGlobals.gameState.getCampOrdinal(playerPos.level);
			
			log.i("getInvestigateRewards | isCompletion: " + isCompletion, this);
			
			if (isCompletion) {
				let possibleCompletionRewards = ItemConstants.getAvailableInsightCaches(campOrdinal);
	 			rewards.gainedItems = [ this.getSpecificRewardItem(1, possibleCompletionRewards) ];
			} else {
				let itemTags = this.getSectorItemTags();
				let itemOptions = { rarityKey: "investigateRarity", allowNextCampOrdinal: isCompletion, tags: itemTags };
	 			rewards.gainedItems = this.getRewardItems(0.25, 0, [], itemOptions);
				rewards.gainedEvidence = 1;
			}
			
			return rewards;
		},

		getExamineRewards: function () {
			let rewards = new ResultVO("examine");
			
			if (GameGlobals.gameState.isFeatureUnlocked("insight")) {
				rewards.gainedInsight = 1;
			} else {
				rewards.gainedEvidence = 1;
			}
			
			return rewards;
		},

		getScoutRewards: function () {
			var rewards = new ResultVO("scout");
			rewards.gainedEvidence = 1;
			return rewards;
		},

		getScoutLocaleRewards: function (localeVO) {
			let rewards = new ResultVO("scout");

			let localeCategory = localeVO.getCategory();
			let sector = this.playerLocationNodes.head.entity;
			let playerPos = this.playerLocationNodes.head.position;
			let campOrdinal = GameGlobals.gameState.getCampOrdinal(playerPos.level);

			let availableResources = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent).resourcesScavengable.clone();
			availableResources.addAll(localeVO.getResourceBonus(GameGlobals.gameState.getUnlockedResources(), campOrdinal), "scout-rewards");
			availableResources.limitAll(WorldConstants.resourcePrevalence.RARE, WorldConstants.resourcePrevalence.ABUNDANT, "scout-rewards");
			let efficiency = this.getCurrentScavengeEfficiency();
			let localeDifficulty = (localeVO.requirements.vision[0] + localeVO.costs.stamina / 10) / 100;

			// blueprints
			rewards.gainedBlueprintPiece = this.getResultBlueprint(0.35, localeVO);
			
			// tribe stats
			if (localeVO.type == localeTypes.grove) {
				rewards.gainedHope = 2;
			} else if (localeVO.type == localeTypes.tradingpartner) {
			} else {
				rewards.gainedEvidence = ExplorationConstants.getScoutLocaleReward(localeVO.type, campOrdinal);
			}
			
			let explorerID = localeVO.explorerID;
			if (explorerID) {
				// hard-coded explorer
				rewards.gainedExplorers = [ GameGlobals.explorerHelper.getNewPredefinedExplorer(explorerID) ];
			} else {
				if (localeVO.type !== localeTypes.tradingpartner && localeVO.type != localeTypes.grove) {
					// population and explorers
					if (localeCategory !== "u") {
						rewards.gainedExplorers = this.getRewardExplorers(0.075);
						if (rewards.gainedExplorers.length == 0 && this.nearestCampNodes.head && campOrdinal > 1) {
							rewards.gainedPopulation = Math.random() < 0.1 ? 1 : 0;
						}
					}
					
					// items and resources
					let itemTags = this.getSectorItemTags().concat(localeVO.getItemTags());
					if (localeCategory === "u") {
						let itemOptions = { rarityKey: "localeRarity", allowNextCampOrdinal: true, tags: itemTags };
						rewards.gainedResources = this.getRewardResources(1, 5 * localeDifficulty, efficiency, availableResources);
						rewards.gainedItems = this.getRewardItems(0.5, 0.1, null, itemOptions);
					} else {
						let itemOptions = { rarityKey: "tradeRarity", allowNextCampOrdinal: true, tags: itemTags };
						rewards.gainedItems = this.getRewardItems(0.25, 0, null, itemOptions);
					}

					let currencyModifier = localeVO.getCurrencyFindProbabilityModifier();
					rewards.gainedCurrency = this.getRewardCurrency(currencyModifier, efficiency, 0);

					let perkProbabilities = {};
					perkProbabilities[PerkConstants.perkIds.accomplished] = 
						rewards.gainedBlueprintPiece ? 0.5 : 
						GameGlobals.levelHelper.isDeadEnd(sector) ? 0.25 :
						rewards.gainedItems.length > 0 ? 0.1 : 
						0;
					perkProbabilities[PerkConstants.perkIds.stressed] = localeVO.getStressedProbability();

					// temporary perks
					rewards.gainedPerks = this.getGainedPerks(perkProbabilities);
				}
			}

			return rewards;
		},

		getUseSpringRewards: function () {
			var rewards = new ResultVO("use_spring");
			var bagComponent = this.playerResourcesNodes.head.entity.get(BagComponent);
			var water = Math.floor(Math.min(bagComponent.totalCapacity - bagComponent.usedCapacity, 30));
			rewards.gainedResources = new ResourcesVO(storageTypes.RESULT);
			rewards.gainedResources.water = water;
			return rewards;
		},

		getClearWorkshopRewards: function () {
			var rewards = new ResultVO("clear_workshop");
			return rewards;
		},

		getNapRewards: function () {
			var rewards = new ResultVO("nap");
			return rewards;
		},

		getFightRewards: function (won, enemyVO) {
			let rewards = new ResultVO("fight");

			if (won) {
				// TODO make fight rewards dependent on enemy difficulty (amount)
				let availableResources = this.getAvailableResourcesForEnemy(enemyVO);
				let efficiency = this.getCurrentScavengeEfficiency();
				
				rewards.gainedResources = this.getRewardResources(0.5, 2, efficiency, availableResources);
				rewards.gainedItems = this.getRewardItems(0, 1, enemyVO.droppedIngredients, {});
				rewards.gainedPerks = this.getGainedCurses(enemyVO.curseProbability);
				rewards.gainedReputation = 1;

				let currencyModifier = EnemyConstants.getDropsCurrency(enemyVO) ? 1 : 0;
				rewards.gainedCurrency = this.getRewardCurrency(currencyModifier, efficiency, 0);

				let playerVision = this.playerStatsNodes.head.vision.value;
				let perksComponent = this.playerStatsNodes.head.perks;
				let playerLuck = perksComponent.getTotalEffect(PerkConstants.perkTypes.luck);
				let loseInventoryProbability = PlayerActionConstants.getLoseInventoryProbability("fight", playerVision, playerLuck);
				this.addLostAndBrokenItems(rewards, "fight", loseInventoryProbability, true);
			} else {
				rewards = this.getFadeOutResults("fight", 0.5, 1, 0.75, 0.5, enemyVO);
			}

			return rewards;
		},

		getFadeOutResults: function (sourceAction, loseInventoryProbability, injuryProbability, loseAugmentationProbability, loseExplorerProbability, enemyVO) {
			log.i("get fade out results: loseInventoryProbability:" + loseInventoryProbability + ", injuryProbability:" + injuryProbability + ", loseAugmentationProbability:" + loseAugmentationProbability + ", loseExplorerProbability:" + loseExplorerProbability);
			let resultVO = new ResultVO("despair");
			if (Math.random() < loseInventoryProbability) {
				resultVO.lostResources = this.playerResourcesNodes.head.resources.resources.clone();
				resultVO.lostCurrency = this.playerResourcesNodes.head.entity.get(CurrencyComponent).currency;
				this.addLostAndBrokenItems(resultVO, "despair", 1, false)
			}
			resultVO.lostExplorers = this.getLostExplorers(loseExplorerProbability);
			
			resultVO.lostPerks = this.getLostPerks(loseAugmentationProbability);
			
			let finalInjuryProbability = resultVO.lostPerks.length > 0 ? injuryProbability / 2 : injuryProbability;
			resultVO.gainedPerks = this.getResultInjuries(finalInjuryProbability, sourceAction, enemyVO);

			return resultVO;
		},

		getSectorsRevealedByMap: function (foundPosition) {
			// NOTE: This should be deterministic so you can't save scum
			let campSector = GameGlobals.levelHelper.getCampSectorOnLevel(foundPosition.level);
			let campPosition = campSector ? campSector.get(PositionComponent) : null;

			let entranceSector = GameGlobals.levelHelper.getEntranceSectorOnLevel(foundPosition.level);
			let entrancePosition = entranceSector ? entranceSector.get(PositionComponent) : null;

			let revealRadius = 3;

			let getCenterSectorScore = function (s) {
				let score = 0;
				
				let featuresComponent = s.get(SectorFeaturesComponent);
				let localesComponent = s.get(SectorLocalesComponent);
				let sectorPosition = s.get(PositionComponent);

				// most important: sector is POI
				if (!campSector && featuresComponent.campable) score += 30;
				if (localesComponent.locales.length > 0) score += 20;
				if (featuresComponent.itemsScavengeable.length > 0) score += 10;
				if (featuresComponent.hasSpring) score += 10;
				if (featuresComponent.isInvestigatable) score += 5;
				if (featuresComponent.resourcesCollectable.getTotal() > 0) score += 5;
				if (featuresComponent.resourcesCollectable.length > 0) score += 5;

				// second important: distance to found position, camp and entrance				
				let foundDistance = GameGlobals.levelHelper.getSimpleDistance(foundPosition, sectorPosition);
				score += foundDistance <= revealRadius * 2 ? 0 : foundDistance * (-3);
				if (campPosition) score += GameGlobals.levelHelper.getSimpleDistance(campPosition, sectorPosition);
				if (entrancePosition) score += GameGlobals.levelHelper.getSimpleDistance(entrancePosition, sectorPosition);

				// tie-breakers: small things
				switch (featuresComponent.zone) {
					case WorldConstants.ZONE_ENTRANCE: score += -1; break;
					case WorldConstants.ZONE_POI_1: score += 1; break;
					case WorldConstants.ZONE_POI_2: score += 1; break;
				}
				if (featuresComponent.sunlit) score += -1;
				score += Math.min(revealRadius * 3, GameGlobals.levelHelper.getSectorsAround(sectorPosition, revealRadius).length);

				return score;
			};

			let candidates = GameGlobals.levelHelper.getSectorsByLevel(foundPosition.level);

			candidates = candidates.sort((a, b) => getCenterSectorScore(b) - getCenterSectorScore(a));

			let centerSector = candidates[0];
			
			let centerPosition = centerSector.get(PositionComponent);
			let sectorsToReveal = GameGlobals.levelHelper.getSectorsAround(centerPosition, revealRadius);
			
			log.i("sectors revealed by map: center: " + centerPosition + " radius: " + revealRadius + ", num: " + sectorsToReveal.length, this);

			return sectorsToReveal;
		},
		
		saveDiscoveredGoods: function (rewards) {
			let result = {};

			if (!rewards) return result;
			
			var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			var sectorFeatures = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			var sectorResources = sectorFeatures.resourcesScavengable;
			for (var key in resourceNames) {
				var name = resourceNames[key];
				var amount = rewards.gainedResources.getResource(name);
				var inSector = sectorResources.getResource(name) > 0;
				if (amount > 0 && inSector) {
					sectorStatus.addDiscoveredResource(name);
					if (!result.resources) result.resources = [];
					result.resources.push(name);
				}
			}
			let sectorItems = sectorFeatures.itemsScavengeable;
			for (let i = 0; i < rewards.gainedItems.length; i++) {
				let item = rewards.gainedItems[i];
				if (item.type == ItemConstants.itemTypes.ingredient) {
					if (sectorItems.indexOf(item.id) >= 0) {
						if (!sectorStatus.hasDiscoveredItem(item.id)) {
							sectorStatus.addDiscoveredItem(item.id);
							if (!result.items) result.items = [];
							result.items.push(item);
						}
					}
				}
			}
			
			return result;
		},
		
		preCollectRewards: function (rewards) {
			if (!rewards) return;
			if (rewards.brokenItems) {
				for (let i = 0; i < rewards.brokenItems.length; i++) {
					rewards.brokenItems[i].broken = true;
					GameGlobals.gameState.increaseGameStatSimple("numItemsBroken");
				}
			}
		},

		collectRewards: function (isTakeAll, rewards, campSector) {
			if (!rewards) return;
			
			if (rewards.collected) {
				log.w("trying to collect rewards twice: " + rewards.action);
				return false;
			}

			let actionCampSector = campSector || GameGlobals.playerActionsHelper.getActionCampSector();

			rewards.collected = true;

			if (rewards && rewards.action == "scavenge") {
				var excursionComponent = this.playerResourcesNodes.head.entity.get(ExcursionComponent);
				if (excursionComponent) {
					if (this.isSomethingUsefulResult(rewards)) {
						excursionComponent.numConsecutiveScavengeUseless = 0;
						excursionComponent.numConsecutiveScavengeUselessSameLocation = 0;
					} else {
						excursionComponent.numConsecutiveScavengeUseless++;
						excursionComponent.numConsecutiveScavengeUselessSameLocation++;
					}
				}
			}
			
			if (rewards == null || rewards.isEmpty()) {
				return true;
			}
			
			let sourceSector = this.playerLocationNodes.head.entity;
			
			if (rewards.foundStashVO) {
				let sectorStatus = sourceSector.get(SectorStatusComponent);
				sectorStatus.stashesFound++;
			}
			
			let defaultRewardCampNode = this.getDefaultRewardCampNode();
			let currentStorage = campSector ? GameGlobals.resourcesHelper.getCurrentCampStorage(campSector) : GameGlobals.resourcesHelper.getCurrentStorage();
			let campStorage = actionCampSector ? GameGlobals.resourcesHelper.getCampStorage(actionCampSector) : null;

			let playerPos = this.playerLocationNodes.head.position;
			let sourcePos = campSector ? campSector.get(PositionComponent) : playerPos;

			if (isTakeAll) {
				rewards.selectedItems = rewards.gainedItems;
				rewards.selectedResources = rewards.gainedResources;
				rewards.discardedItems = [];
				rewards.discardedResources = new ResourcesVO(storageTypes.RESULT);
			}

			let gainedRobots = rewards.selectedResources.getResource(resourceNames.robots);
			if (gainedRobots > 0) {
				rewards.selectedResources.setResource(resourceNames.robots, 0);
				if (campStorage) {
					campStorage.addResource(resourceNames.robots, gainedRobots);
				} else {
					log.w("gained robots from rewards but found no camp storage to put them");
				}
			}

			currentStorage.addResources(rewards.selectedResources);
			currentStorage.substractResources(rewards.discardedResources);
			currentStorage.substractResources(rewards.lostResources);

			for (let key in resourceNames) {
				let name = resourceNames[key];
				let amount = rewards.selectedResources.getResource(name);
				if (amount > 0) {
					GameGlobals.gameState.increaseGameStatKeyed("amountResourcesFoundPerName", name, amount);
				}
			}

			let currencyComponent = this.playerStatsNodes.head.entity.get(CurrencyComponent);
			currencyComponent.currency += rewards.gainedCurrency;
			currencyComponent.currency -= rewards.lostCurrency;
			if (rewards.gainedCurrency > 0) {
				GameGlobals.playerActionFunctions.unlockFeature("currency");
				GameGlobals.gameState.increaseGameStatSimple("amountFoundCurrency", rewards.gainedCurrency);
			}

			let itemsComponent = this.playerStatsNodes.head.items;
			if (rewards.selectedItems) {
				for (let i = 0; i < rewards.selectedItems.length; i++) {
					let item = rewards.selectedItems[i];
					GameGlobals.playerHelper.addItem(item, item.level, sourcePos);
					GameGlobals.gameState.increaseGameStatKeyed("numItemsFoundPerId", item.id);
					GameGlobals.gameState.increaseGameStatList("uniqueItemsFound", item.id);
				}
			}
			
			let explorersComponent = this.playerStatsNodes.head.explorers;
			if (rewards.gainedExplorers && rewards.gainedExplorers.length > 0) {
				for (let i = 0; i < rewards.gainedExplorers.length; i++) {
					let explorer = rewards.gainedExplorers[i];
					if (this.willGainedExplorerJoinParty(explorer)) {
						explorersComponent.addExplorer(explorer);
						explorersComponent.setExplorerInParty(explorer, true);
						GameGlobals.gameState.increaseGameStatSimple("numExplorersRecruited");
						GlobalSignals.explorersChangedSignal.dispatch();
					} else if (defaultRewardCampNode) {
						defaultRewardCampNode.camp.pendingRecruits.push(explorer);
					} else {
						log.w("no place to put reward explorer!")
					}
				}
				GameGlobals.playerActionFunctions.unlockFeature("explorers");
			}

			if (rewards.gainedBlueprintPiece) {
				this.tribeUpgradesNodes.head.upgrades.addNewBlueprintPiece(rewards.gainedBlueprintPiece);
				GameGlobals.playerActionFunctions.unlockFeature("blueprints");
				GameGlobals.gameState.increaseGameStatSimple("numBlueprintPiecesFound");
			}

			if (rewards.lostItems) {
				for (let i = 0; i < rewards.lostItems.length; i++) {
					itemsComponent.removeItem(rewards.lostItems[i], false);
					GameGlobals.gameState.increaseGameStatSimple("numItemsLost");
				}
			}
			
			if (rewards.brokenItems) {
				for (let i = 0; i < rewards.brokenItems.length; i++) {
					rewards.brokenItems[i].broken = true;
				}
			}

			if (rewards.lostExplorers) {
				for (let i = 0; i < rewards.lostExplorers.length; i++) {
					explorersComponent.removeExplorer(rewards.lostExplorers[i]);
					GameGlobals.gameState.increaseGameStatSimple("numExplorersLost");
				}
			}

			if (rewards.discardedItems) {
				for (let i = 0; i < rewards.discardedItems.length; i++) {
					itemsComponent.discardItem(rewards.discardedItems[i], false);
				}
			}

			if (rewards.gainedPerks) {
				for (let i = 0; i < rewards.gainedPerks.length; i++) {
					let perkID = rewards.gainedPerks[i].id;
					GameGlobals.playerHelper.addPerk(perkID);
				}

				GameGlobals.gameState.increaseGameStatSimple("numInjuriesReceived", rewards.getGainedInjuries().length);
			}
			
			if (rewards.lostPerks) {
				let perksComponent = this.playerStatsNodes.head.perks;
				for (let i = 0; i < rewards.lostPerks.length; i++) {
					perksComponent.removePerkById(rewards.lostPerks[i].id);
				}
			}

			if (rewards.gainedPopulation > 0) {
				if (defaultRewardCampNode) {
					defaultRewardCampNode.camp.pendingPopulation += 1;
				} else {
					log.w("No reward camp found for reward population.");
				}
			}

			// TODO assign reputation to nearest camp

			if (rewards.gainedEvidence) {
				this.playerStatsNodes.head.evidence.value += rewards.gainedEvidence;
				GameGlobals.gameState.increaseGameStatKeyed("amountPlayerStatsFoundPerId", "evidence", rewards.gainedEvidence);
			}

			if (rewards.gainedRumours) {
				this.playerStatsNodes.head.rumours.value += rewards.gainedRumours;
				GameGlobals.gameState.increaseGameStatKeyed("amountPlayerStatsFoundPerId", "rumours", rewards.gainedRumours);
			}

			if (rewards.gainedHope) {
				this.playerStatsNodes.head.entity.get(HopeComponent).hope += rewards.gainedHope;
				GameGlobals.gameState.increaseGameStatKeyed("amountPlayerStatsFoundPerId", "hope", rewards.gainedHope);
			}

			if (rewards.gainedInsight) {
				this.playerStatsNodes.head.insight.value += rewards.gainedInsight;
				GameGlobals.gameState.increaseGameStatKeyed("amountPlayerStatsFoundPerId", "insight", rewards.gainedInsight);
				GameGlobals.playerActionFunctions.unlockFeature("insight");
			}

			GlobalSignals.inventoryChangedSignal.dispatch();

			return true;
		},

		getRewardsMessageText: function (rewards, baseMsg, format) {
			let msg = this.getRewardsMessage(rewards, baseMsg, format);
			return TextConstants.createTextFromLogMessage(msg.msg, msg.replacements, msg.values);
		},

		getRewardsMessage: function (rewards, baseMsg, format) {
			if (!rewards) return null;

			baseMsg = baseMsg || "";
			format = format || this.RESULT_MGS_FORMAT_LOG;

			let msg = baseMsg;
			let replacements = [];
			let values = [];
			let foundSomething = rewards.gainedResources.getTotal() > 0;

			if (baseMsg.length > 0) baseMsg += " ";


			if (rewards.gainedResources.getTotal() > 0) {
				let resourceTemplate = TextConstants.getLogResourceText(rewards.gainedResources);

				if (format == this.RESULT_MGS_FORMAT_LOG) msg += "Gained ";
				if (format == this.RESULT_MSG_FORMAT_PREVIW) msg += "+";

				msg += resourceTemplate.msg;
				replacements = replacements.concat(resourceTemplate.replacements);
				values = values.concat(resourceTemplate.values);
			}

			if (rewards.gainedCurrency) {
				msg += ", ";
				foundSomething = true;
				msg += "$" + replacements.length + ", ";
				replacements.push("#" + replacements.length + " currency");
				values.push(rewards.gainedCurrency);
			}

			if (rewards.selectedItems && rewards.selectedItems.length > 0) {
				msg += ", ";
				foundSomething = true;

				var loggedItems = {};
				for (let i = 0; i < rewards.selectedItems.length; i++) {
					var item = rewards.selectedItems[i];
					if (typeof loggedItems[item.id] === 'undefined') {
						msg += "$" + replacements.length + ", ";
						let itemName = ItemConstants.getItemDisplayName(item);
						replacements.push("#" + replacements.length + " " + itemName.toLowerCase());
						values.push(1);
						loggedItems[item.id] = replacements.length - 1;
					} else {
						values[loggedItems[item.id]]++;
					}
				}
			}

			if (rewards.gainedExplorers && rewards.gainedExplorers.length > 0) {
				msg += ", ";
				foundSomething = true;
				for (let i = 0; i < rewards.gainedExplorers.length; i++) {
					var explorer = rewards.gainedExplorers[i];
					msg += "$" + replacements.length + ", ";
					replacements.push("#" + replacements.length + " " + explorer.name.toLowerCase());
					values.push(1);
				}
			}

			if (rewards.gainedEvidence) {
				msg += ", ";
				foundSomething = true;
				msg += "$" + replacements.length + ", ";
				replacements.push("#" + replacements.length + " evidence");
				values.push(rewards.gainedEvidence);
			}
			
			if (rewards.gainedInsight) {
				msg += ", ";
				foundSomething = true;
				msg += "$" + replacements.length + ", ";
				replacements.push("#" + replacements.length + " insight");
				values.push(rewards.gainedInsight);
			}

			if (rewards.gainedRumours) {
				msg += ", ";
				foundSomething = true;
				msg += "$" + replacements.length + ", ";
				replacements.push("#" + replacements.length + " rumours");
				values.push(rewards.gainedRumours);
			}

			if (rewards.gainedHope) {
				msg += ", ";
				foundSomething = true;
				msg += "$" + replacements.length + ", ";
				replacements.push("#" + replacements.length + " hope");
				values.push(rewards.gainedHope);
			}

			if (rewards.gainedBlueprintPiece) {
				msg += ", ";
				foundSomething = true;
				msg += "$" + replacements.length + ", ";
				replacements.push("#" + replacements.length + " piece of forgotten technology");
				values.push(1);
			}

			if (rewards.gainedPopulation) {
				msg += ", ";
				foundSomething = true;
				msg += "$" + replacements.length + ", ";
				replacements.push("#" + replacements.length + " population");
				values.push(rewards.gainedPopulation);
			}

			if (foundSomething) {
				if (format == this.RESULT_MGS_FORMAT_LOG) {
					msg = TextConstants.sentencify(msg);
				} else {
					msg = msg.trim();
				}
			} else {
				msg = "Didn't find anything.";
			}

			// TODO more (varied?) messages for getting injured

			if (rewards.getGainedInjuries().length > 0) {
				msg += " Got injured.";
			}

			if (rewards.getGainedCurses().length > 0) {
				msg += " Got cursed.";
			}
			
			if (rewards.lostPerks.length > 0) {
				msg += " Lost" + TextConstants.getListText(rewards.lostPerks.map(perkVO => perkVO.name));
			}

			return { msg: msg, replacements: replacements, values: values };
		},

		getRewardDiv: function (resultVO, isFight, forceShowInventoryManagement) {
			forceShowInventoryManagement = forceShowInventoryManagement || false;
			
			let itemsComponent = this.playerStatsNodes.head.items;
			let explorersComponent = this.playerStatsNodes.head.explorers;
			let hasBag = itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.bag) > 0;
			let bagComponent = this.playerResourcesNodes.head.entity.get(BagComponent);
			let isInitialSelectionValid = bagComponent.usedCapacity <= bagComponent.totalCapacity;

			if (!isInitialSelectionValid && !GameGlobals.playerHelper.isInCamp()) {
				forceShowInventoryManagement = true;
			}

			let div = "<div id='reward-div'>";
			
			if (resultVO.gainedResourcesFromExplorers.getTotal() > 0 || resultVO.gainedItemsFromExplorers.length > 0) {
				// assuming only explorers of certain type find items
				let explorer = explorersComponent.getExplorerInPartyByType(ExplorerConstants.explorerType.SCAVENGER);
				let displayName = explorer ? "<span class='hl-functionality'>" + explorer.name + "</span>" : "Explorers";
				
				let displayFinds = "";
				let totalResources = resultVO.gainedResourcesFromExplorers.getTotal();
				let totalItems = resultVO.gainedItemsFromExplorers.length;
				if (totalResources > 0 && totalItems == 0) {
					if (resultVO.gainedResourcesFromExplorers.isOnlySupplies()) {
						displayFinds = "some supplies";
					} else if (resultVO.gainedResourcesFromExplorers.isOneResource()) {
						displayFinds = "some " + resultVO.gainedResourcesFromExplorers.getNames()[0];
					} else {
						displayFinds = "some resources";
					}
				} else if (totalItems == 1 && totalResources == 0) {
					displayFinds = Text.addArticle(resultVO.gainedItemsFromExplorers[0].name);
				} else if (totalItems > 1 && totalResources == 0) {
					let uniqueNames = [];
					let uniqueTypes = [];
					for (let i = 0; i < resultVO.gainedItemsFromExplorers.length; i++) {
						let item = resultVO.gainedItemsFromExplorers[i];
						let itemName = ItemConstants.getItemDisplayName(item);
						if (uniqueNames.indexOf(itemName) < 0) uniqueNames.push(itemName);
						if (uniqueTypes.indexOf(item.type) < 0) uniqueTypes.push(item.type);
					}
					if (uniqueNames.length == 1) {
						displayFinds = totalItems + " " + Text.pluralify(uniqueNames[0]);
					} else if (uniqueTypes.length == 1) {
						displayFinds = "some " + ItemConstants.getItemTypeDisplayName(uniqueTypes[0]);
					} else {
						displayFinds = "some items";
					}
				} else {
					displayFinds = "some things";
				}
				
				div += "<div>";
				div += displayName + " found " + displayFinds;
				div += "</div>";
			}
			
			if (resultVO.gainedExplorers && resultVO.gainedExplorers.length > 0) {
				for (let i = 0; i < resultVO.gainedExplorers.length; i++) {
					let explorer = resultVO.gainedExplorers[i];
					let explorerType = ExplorerConstants.getExplorerTypeForAbilityType(explorer.abilityType);
					let willJoin = this.willGainedExplorerJoinParty(explorer);
					let explorerCamp = this.getDefaultRewardCampNode();
					let pronoun = ExplorerConstants.getPronoun(explorer);
					let explorerTypeName = ExplorerConstants.getExplorerTypeDisplayName(explorerType);
					div += "<div>"
					div += UIConstants.getExplorerDiv(explorer, false, false, true);
					div += "<br/>";
					div += "Met <span class='hl-functionality'>" + Text.addArticle(explorerTypeName) + "</span> called " + explorer.name + ". ";
					
					if (willJoin) {
						div += Text.capitalize(pronoun) + " joined the party.";
					} else if (explorerCamp) {
						div += Text.capitalize(pronoun) +" will meet you at " + explorerCamp.camp.getName() + " on level " + explorerCamp.position.level + ".";
					}
					div += "</div>";
				}
			}

			let gainedhtml = "";
			gainedhtml += "<ul class='resultlist resultlist-positive'>";
			if (resultVO.gainedEvidence) {
				gainedhtml += "<li>" + resultVO.gainedEvidence + " evidence</li>";
			}
			if (resultVO.gainedRumours) {
				gainedhtml += "<li>" + resultVO.gainedRumours + " rumours</li>";
			}
			if (resultVO.gainedHope) {
				gainedhtml += "<li>" + resultVO.gainedHope + " hope</li>";
			}
			if (resultVO.gainedInsight) {
				gainedhtml += "<li>" + resultVO.gainedInsight + " insight</li>";
			}
			if (resultVO.gainedPopulation) {
				gainedhtml += "<li>" + resultVO.gainedPopulation + " population</li>";
			}
			if (resultVO.gainedBlueprintPiece) {
				gainedhtml += UIConstants.getBlueprintPieceLI(resultVO.gainedBlueprintPiece);
			}
			if (resultVO.gainedCurrency) {
				gainedhtml += "<li>" + resultVO.gainedCurrency + " silver</li>";
			}

			gainedhtml += "</ul>";
			let hasGainedStuff = gainedhtml.indexOf("<li") > 0;
			if (hasGainedStuff || forceShowInventoryManagement) div += gainedhtml;

			let hasLostInventoryStuff = resultVO.lostResources.getTotal() > 0 || resultVO.lostItems.length > 0 || resultVO.lostCurrency > 0;
			let hasLostSomething = 
				resultVO.lostResources.getTotal() > 0 || 
				resultVO.lostItems.length > 0 || 
				resultVO.lostCurrency > 0 || 
				resultVO.brokenItems > 0 || 
				resultVO.lostExplorers.length > 0 || 
				resultVO.gainedPerks.length > 0 || 
				resultVO.lostPerks.length > 0;

			if (hasLostInventoryStuff) {
				var lostMsg = resultVO.lostItems.length > 1 ? "Lost some items." : resultVO.lostItems.length > 0 ? "Lost an item." : ""
				var losthtml = "<div id='resultlist-loststuff' class='infobox'>";
				var losthtml = "<div class='warning'>" + lostMsg + "</span>";
				losthtml += "<div id='resultlist-loststuff-lost' class='infobox inventorybox inventorybox-negative'>";
				losthtml += "<ul></ul>";
				losthtml += "</div>"
				losthtml += "</div>";
				div += losthtml;
			}
			
			if (resultVO.brokenItems.length > 0) {
				if (resultVO.brokenItems.length == 1) {
					div += "<p class='warning'>Broke an item (" + ItemConstants.getItemDisplayName(resultVO.brokenItems[0]) + ").</p>";
				} else {
					div += "<p class='warning'>Broke some items.</p>";
				}
			}

			if (resultVO.gainedResources.getTotal() > 0 || resultVO.gainedItems.length > 0 || forceShowInventoryManagement) {
				var baghtml = "<div id='resultlist-inventorymanagement' class='unselectable'>";

				baghtml += "<div id='resultlist-inventorymanagement-found' class='infobox inventorybox'>";
				baghtml += "<h4 class='hide-from-visual-layout'>Found</h4>";
				baghtml += "<ul></ul>";
				baghtml += "<p class='msg-empty p-meta'>" + (isFight ? "Nothing left of the opponent." : "Nothing left here.") + "</p>";
				baghtml += "</div>"

				baghtml += "<div id='resultlist-inventorymanagement-kept' class='infobox inventorybox'>";
				baghtml += "<h4 class='hide-from-visual-layout'>Bag</h4>";
				baghtml += "<ul></ul>";
				baghtml += "<p class='msg-empty p-meta'>Your " + (hasBag ? "bag is" : "pockets are") + " empty.</p>";
				baghtml += "</div>"

				baghtml += "<div id='inventory-popup-bar' class='progress-wrap progress centered' style='margin-top: 10px'><div class='progress-bar progress'></div><span class='progress-label progress'>?/?</span></div>";
				baghtml += "</div>"
				div += baghtml;
			}

			hasGainedStuff = hasGainedStuff || resultVO.gainedResources.getTotal() > 0 || resultVO.gainedItems.length > 0 || resultVO.gainedExplorers.length > 0;
			
			if (!hasGainedStuff && !hasLostSomething && !forceShowInventoryManagement) {
				if (isFight) div += "<p class='p-meta'>Nothing left behind.</p>"
				else if (resultVO.action === "despair") div += "";
				else if (resultVO.action === "clear_workshop") div += "";
				else if (resultVO.action === "clear_waste_r") div += "";
				else if (resultVO.action === "clear_waste_t") div += "";
				else if (resultVO.hasCustomReward) div += "";
				else div += "<p class='p-meta'>" + Text.t("ui.inventory_management.result_nothing_found_description") + ".</p>";
			}
			
			if (resultVO.lostExplorers && resultVO.lostExplorers.length > 0) {
				for (let i = 0; i < resultVO.lostExplorers.length; i++) {
					div += "<p class='warning'><span class='hl-functionality'>" + resultVO.lostExplorers[i].name + "</span> left.</p>";
				}
			}

			if (resultVO.getGainedInjuries().length > 0) {
				div += "<p class='warning'>You got injured.</p>";
			}

			if (resultVO.getGainedCurses().length > 0) {
				div += "<p class='warning'>You got cursed.</p>";
			}

			if (resultVO.lostPerks.length > 0) {
				div += "<p class='warning'>You lost " + TextConstants.getListText(resultVO.lostPerks.map(perkVO => perkVO.name)) + ".</p>";
			}

			if (resultVO.lostCurrency > 0) {
				div += "<p class='warning'>You lost " + resultVO.lostCurrency + " silver.</p>";
			}

			div += "</div>";
			return div;
		},

		getResultMessagesBeforeSelection: function (resultVO) {
			let messages = [];
			
			if (!resultVO) return messages;
			
			if (resultVO && resultVO.foundStashVO) {
				messages.push({ id: LogConstants.getUniqueID(), text: TextConstants.getFoundStashMessage(resultVO.foundStashVO), addToPopup: true, addToLog: false });
			}
			
			return messages;
		},
		
		getResultMessagesAfterSelection: function (resultVO) {
			let messages = [];
			let itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			
			if (!resultVO) return messages;
				
			if (resultVO.gainedBlueprintPiece) {
				if (!this.tribeUpgradesNodes.head.upgrades.hasUpgrade(resultVO.gainedBlueprintPiece)) {
					let blueprintVO = this.tribeUpgradesNodes.head.upgrades.getBlueprint(resultVO.gainedBlueprintPiece);
					let blueprintMessage = { addToPopup: true, addToLog: true, visibility: LogConstants.MSG_VISIBILITY_GLOBAL };
					if (blueprintVO.currentPieces === 1) {
						blueprintMessage.id = LogConstants.MSG_ID_FOUND_BLUEPRINT_FIRST;
						blueprintMessage.text = "Found a piece of a forgotten technology.";
					} else if (blueprintVO.currentPieces == blueprintVO.maxPieces) {
						blueprintMessage.id = LogConstants.MSG_ID_FOUND_BLUEPRINT_LAST;
						blueprintMessage.text = "Found the last piece of a blueprint";
					} else {
						blueprintMessage.id = LogConstants.MSG_ID_FOUND_BLUEPRINT_CONSECUTIVE;
						blueprintMessage.text = "Found another piece of a blueprint";
					}
					messages.push(blueprintMessage);
				}
			}
	
			if (resultVO.selectedItems) {
				for (let i = 0; i < resultVO.selectedItems.length; i++) {
					var item = resultVO.selectedItems[i];
					var isInteresting = 
						itemsComponent.getCountById(item.id, true) === 1 &&
						!(item.equippable && !item.equipped) &&
						item.type !== ItemConstants.itemTypes.artefact &&
						item.type !== ItemConstants.itemTypes.trade;
					if (isInteresting) {
						let itemName = ItemConstants.getItemDisplayName(item);
						messages.push({ id: LogConstants.MSG_ID_FOUND_ITEM_FIRST, text: "Found " + Text.addArticle(itemName) + ".", addToPopup: true, addToLog: true });
					}
				}
			}
				
			if (resultVO.gainedExplorers && resultVO.gainedExplorers.length > 0) {
				messages.push({ id: LogConstants.getUniqueID(), text: "Met a new explorer.", addToPopup: true, addToLog: true });
			}
	
			if (resultVO.lostItems && resultVO.lostItems.length > 0) {
				let messageTemplate = LogConstants.getLostItemMessage(resultVO);
				let text = TextConstants.createTextFromLogMessage(messageTemplate.msg, messageTemplate.replacements, messageTemplate.values);
				messages.push({ id: LogConstants.MSG_ID_LOST_ITEM, text: text, addToPopup: true, addToLog: true });
			}
	
			if (resultVO.brokenItems && resultVO.brokenItems.length > 0) {
				let messageTemplate = LogConstants.getBrokeItemMessage(resultVO);
				let text = TextConstants.createTextFromLogMessage(messageTemplate.msg, messageTemplate.replacements, messageTemplate.values);
				messages.push({ id: LogConstants.MSG_ID_BROKE_ITEM, text: text, addToPopup: true, addToLog: true });
			}
				
			if (resultVO.lostExplorers && resultVO.lostExplorers.length > 0) {
				messages.push({ id: LogConstants.MSG_ID_LOST_EXPLORER, text: "Lost " + resultVO.lostExplorers.length + " explorers.", addToPopup: true, addToLog: true });
			}

			if (resultVO.getGainedInjuries().length > 0) {
				messages.push({ id: LogConstants.MSG_ID_GOT_INJURED, text: "Got injured.", addToPopup: true, addToLog: true });
			}

			if (resultVO.getGainedCurses().length > 0) {
				messages.push({ id: LogConstants.MSG_ID_GOT_INJURED, text: "Got cursed.", addToPopup: true, addToLog: true });
			}

			if (resultVO.lostPerks.length > 0) {
				messages.push({ id: LogConstants.MSG_ID_GOT_INJURED, text: LogConstants.getLostPerksMessage(resultVO), addToPopup: true, addToLog: true });
			}

			return messages;
		},

		getCurrentScavengeEfficiency: function () {
			let playerVision = this.playerStatsNodes.head.vision.value || 0;
			let result = MathUtils.map(playerVision, 0, 150, 0, 1.5);
			return MathUtils.clamp(result, 0, 1);
		},

		getCurrentSectorScavengedFactor: function () {
            let sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
            let scavengedPercent = sectorStatus.getScavengedPercent();
            let scavengedFactor = MathUtils.map(scavengedPercent, 0, 100, 0, 1);
            return MathUtils.clamp(scavengedFactor, 0, 1);
		},

		// probabilityFactor (action-specific): base chance to get any resources at all (0-1)
		// amountFactor (action-specific): relative amount of resources found if found any, where regular scavenge is 1
		// efficiency: 0-1 current scavenge efficiency of the player, affects chance to find something and amount found
		// available resources: name -> relative amount depending on sector, affects both chance and amount (WorldConstants.resourcePrevalence)
		getRewardResources: function (probabilityFactor, amountFactor, efficiency, availableResources) {
			probabilityFactor = probabilityFactor || 0;
			amountFactor = amountFactor || 1;
			efficiency = efficiency || this.getCurrentScavengeEfficiency();
			
			var results = new ResourcesVO(storageTypes.RESULT);
			
			if (probabilityFactor == 0) return results;
			if (Math.random() > probabilityFactor) return results;
			if (!availableResources || !availableResources.getTotal || availableResources.getTotal() <= 0) return results;

			// select resources
			for (let key in resourceNames) {
				let name = resourceNames[key];
				let availableAmount = availableResources.getResource(name);
				if (availableAmount <= 0) continue;
					
				let baseProbability = this.getBaseResourceFindProbability(availableAmount);
				let finalProbability = MathUtils.clamp(baseProbability * efficiency, 0, 1);
				if (Math.random() > finalProbability) continue;
				
				let baseAmount = this.getBaseResourceFindAmount(name, availableAmount);
				let resultAmount = this.getFinalResourceFindAmount(name, baseAmount, efficiency, Math.random());
				
				results.setResource(name, resultAmount, "reward");
			}
			
			// consolation prize: if found nothing (useful) at this point, add 1 resource every few tries
			if (!this.isSomethingUsefulResources(results)) {
				let excursionComponent = this.playerResourcesNodes.head.entity.get(ExcursionComponent);
				if (excursionComponent && excursionComponent.numConsecutiveScavengeUselessSameLocation > 0) {
					let highestResources = availableResources.getResourcesWithHighestAmount();
					if (highestResources.length > 0) {
						let resourceName = highestResources[Math.floor(Math.random() * highestResources.length)];
						let resourceAmount = availableResources.getResource(resourceName);
						if (resourceAmount > WorldConstants.resourcePrevalence.RARE) {
							results.setResource(resourceName, 1, "reward-consolation");
						}
					}
				}
			}

			return results;
		},

		getRewardCurrency: function (contextModifier, efficiency, clearedPercent) {
			if (contextModifier <= 0) return 0;

			let campCount = GameGlobals.gameState.numCamps;
			let sectorFeatures = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);

			if (!GameGlobals.gameState.isFeatureUnlocked("trade")) return 0;
			if (campCount < 2) return 0;
			if (efficiency < 0.25) return 0;
			if (sectorFeatures.campable)  return 0;

			let findProbability = 0.035 * contextModifier

			if (clearedPercent > 50) {
				findProbability = findProbability / 2;
			}

			if (Math.random() > findProbability * efficiency) {
				return 0;
			}
			
			let max = 1 + Math.round(campCount / 3);

			return Math.ceil(Math.random() * max);
		},

		getSectorCurrencyFindProbabilityModifier: function () {
			let sectorFeatures = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			
			let modifier = 0;
			switch (sectorFeatures.sectorType) {
				case SectorConstants.SECTOR_TYPE_RESIDENTIAL:
				case SectorConstants.SECTOR_TYPE_PUBLIC:
					modifier = 0.5;
					break;
				case SectorConstants.SECTOR_TYPE_COMMERCIAL:
					modifier = 1;
					break;
			}

			return modifier;
		},

		// itemProbability: base probability of finding one item (0-1)
		// ingredientProbability: base probability of finding some ingredients (0-1)
		// availableIngredients: optional list of ingredients that can drop (if null, any can drop, but if empty, none found)
		// options: see getRewardItem
		getRewardItems: function (itemProbability, ingredientProbability, availableIngredients, options) {
			let currentItems = this.playerStatsNodes.head.items;
			let hasBag = currentItems.getCurrentBonus(ItemConstants.itemBonusTypes.bag) > 0;
			let hasCamp = GameGlobals.gameState.unlockedFeatures.camp;
			let hasCampHere = this.playerLocationNodes.head.entity.has(CampComponent);
			let efficiency = this.getCurrentScavengeEfficiency();
			
			var playerPos = this.playerLocationNodes.head.position;
			var campOrdinal = GameGlobals.gameState.getCampOrdinal(playerPos.level);
			var step = GameGlobals.levelHelper.getCampStep(playerPos);
			
			let hasDecentEfficiency = efficiency > 0.25;
			
			let result = [];
			
			// Regular items
			if (itemProbability > 0) {
				
				// - Neccessity items (map, bag) that the player should find quickly if missing
				let minNecessityItemProbability = hasCamp ? 0.15 : 0.35;
				let necessityItemProbability = MathUtils.clamp(itemProbability * 5, minNecessityItemProbability, 0.35);
				if (Math.random() < necessityItemProbability) {
					var necessityItem = this.getNecessityItem(currentItems, campOrdinal);
					if (necessityItem) result.push(necessityItem);
				}

				// - Normal items
				let itemProbabilityWithEfficiency = itemProbability * efficiency;
				if (Math.random() < itemProbabilityWithEfficiency && hasBag && hasDecentEfficiency && result.length == 0) {
					var item = this.getRewardItem(campOrdinal, step, options);
					if (item) result.push(item);
				}
			}
			
			// Ingredients
			if (ingredientProbability > 0) {
				let ingredientProbabilityWithEfficiency = ingredientProbability / 2 + ingredientProbability / 2 * efficiency;
				let max = Math.floor(Math.random() * 3);
				let amount = Math.floor(Math.random() * efficiency * max) + 1;
				let addedIngredient = false;
				let canDropAnyIngredient = !availableIngredients;
				let hasSectorIngredients = availableIngredients && availableIngredients.length > 0;
				
				// - Necessity ingredient (stuff blocking the player from progressing)
				// TODO replace with something that's not random & is better communicated in-game
				if (hasCamp && !hasCampHere && hasDecentEfficiency) {
					let necessityIngredient = this.getNecessityIngredient(ingredientProbability);
					if (necessityIngredient != null) {
						if (!hasSectorIngredients || availableIngredients.indexOf(necessityIngredient) >= 0) {
							for (let i = 0; i <= amount; i++) {
								result.push(ItemConstants.getNewItemInstanceByDefinition(necessityIngredient));
							}
							addedIngredient = true;
						}
					}
				}

				// - Normal ingredients
				if (canDropAnyIngredient || hasSectorIngredients) {
					if (hasBag && hasCamp && !addedIngredient && Math.random() < ingredientProbabilityWithEfficiency) {
						let ingredient = GameGlobals.itemsHelper.getUsableIngredient(availableIngredients);
						for (let i = 0; i <= amount; i++) {
							result.push(ItemConstants.getNewItemInstanceByDefinition(ingredient));
						}
						addedIngredient = true;
					}
				}
			}
			
			return result;
		},

		getRewardExplorers: function (probability) {
			var explorers = [];
			
			var playerPos = this.playerLocationNodes.head.position;
			let campOrdinal = GameGlobals.gameState.getCampOrdinal(playerPos.level);
			if (campOrdinal <= ExplorerConstants.FIRST_EXPLORER_CAMP_ORDINAL)
				return explorers;
			
			if (Math.random() < probability) {
				let campOrdinal = GameGlobals.gameState.numCamps;
				let appearLevel = playerPos.level;
				let explorer = ExplorerConstants.getNewRandomExplorer(ExplorerConstants.explorerSource.SCOUT, campOrdinal, appearLevel);
				explorers.push(explorer);
			}
			
			return explorers;
		},

		// options
		// - rarityKey: context-specific key used to determine item rarity (scavengeRarity/localeRarity/tradeRarity/investigateRarity)
		// - allowNextCampOrdinal: include items that require next camp ordinal in the valid items (for high value rewards)
		// - tags: context tags that increase chances of items with those tags
		getRewardItem: function (campOrdinal, step, options) {
			let rarityKey = options.rarityKey || "scavengeRarity";
			let itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			let hasDeity = GameGlobals.tribeHelper.hasDeity();
			
			// choose rarity and camp ordinal thresholds
			let maxPossibleRarity = Math.min(campOrdinal * 4, 10);
			let maxRarity = MathUtils.clamp(maxPossibleRarity * Math.random(), 2, 10);
			
			let maxCampOrdinalBonus = 0;
			if (step == WorldConstants.CAMP_STEP_END) maxCampOrdinalBonus++;
			if (options.allowNextCampOrdinal) maxCampOrdinalBonus++;
			let maxCampOrdinal = campOrdinal + maxCampOrdinalBonus;
			
			let getMaximumCampOrdinal = function (itemDefinition, isObsolete) {
				if (isObsolete) return itemDefinition.requiredCampOrdinal || 1;
				return itemDefinition.maximumCampOrdinal > 0 ? itemDefinition.maximumCampOrdinal : 100;
			};
			
			let isUseActionBlockedByProgress = function (itemDefinition) {
				let useActionName = "use_item_" + itemDefinition.id;
				let useActionReqs = GameGlobals.playerActionsHelper.getReqs(useActionName);
				if (!useActionReqs) return false;
				if (useActionReqs.deity && !hasDeity) return true;
				return false;
			}
			
			let isPlayerInventoryTooMany = function (itemDefinition) {
				if (itemDefinition.equippable) return false;
				if (itemDefinition.type == ItemConstants.itemTypes.ingredient) return false;
				if (itemDefinition.type == ItemConstants.itemTypes.exploration) return false;
				if (itemDefinition.type == ItemConstants.itemTypes.trade) return false;
				if (itemDefinition.type == ItemConstants.itemTypes.artefact) return false;
				let numOwned = itemsComponent.getCountByBaseId(ItemConstants.getBaseItemId(itemDefinition.id), true);
				return numOwned >= 5;
			}
			
			// list and score possible items
			let validItems = [];
			let itemScores = {};
			for (var type in ItemConstants.itemDefinitions) {
				if (type == ItemConstants.itemTypes.ingredient) continue;
				let isObsoletable = ItemConstants.isObsoletable(type);
				let itemList = ItemConstants.itemDefinitions[type];
				for (let i in itemList) {
					let itemDefinition = itemList[i];
					let isObsolete = GameGlobals.itemsHelper.isObsolete(itemDefinition, itemsComponent, false);
					let rarity = itemDefinition[rarityKey] || -1;
					
					if (rarity <= 0) continue;
					if (rarity > maxRarity) continue;
					
					if (itemDefinition.requiredCampOrdinal > maxCampOrdinal) continue;
					if (getMaximumCampOrdinal(itemDefinition, isObsolete) < campOrdinal) continue;
					if (isUseActionBlockedByProgress(itemDefinition)) continue;
					if (isPlayerInventoryTooMany(itemDefinition)) continue;
					
					validItems.push(itemDefinition);
					
					let score = 1;

					for (let tag in itemDefinition.tags) {
						if (options.tags && options.tags.indexOf(tag) >= 0) {
							score += 1;
						}
					}
					
					if (itemDefinition.requiredCampOrdinal && itemDefinition.requiredCampOrdinal >= campOrdinal)
						score = score + 2;
					if (itemDefinition.requiredCampOrdinal && itemDefinition.requiredCampOrdinal > campOrdinal)
						score = score + 2;
					if (itemDefinition.craftable)
						score = score - 2;
					if (itemDefinition.craftable && isObsoletable)
						score = score / 2;
					if (isObsolete)
						score = score / 2;
					
					itemScores[itemDefinition.id] = score;
				}
			}
			
			if (validItems.length === 0) {
				log.w("No valid reward items found for campOrdinal " + campOrdinal + ", step " + step);
				return null;
			}
			
			// sort by score
			validItems.sort(function (a, b) {
				return itemScores[b.id] - itemScores[a.id];
			});
			
			if (!GameGlobals.gameState.uiStatus.isHidden) {
				log.i("valid items: " + validItems.length + " (max rarity: " + maxRarity + "/" + maxPossibleRarity + ", camp ordinal: " + campOrdinal + "/" + maxCampOrdinal + ")")
				// log.i(validItems);
			}
			
			// pick one random valid item, higher score more likely but all possible
			var index = MathUtils.getWeightedRandom(0, validItems.length);
			var item = validItems[index];
			if (!GameGlobals.gameState.uiStatus.isHidden)
				log.i("- selected index " + index + "/" + validItems.length + ": "+ item.id);
			
			
			// select level / quality
			let level = ItemConstants.getRandomItemLevel(item, ItemConstants.itemSource.exploration);

			return ItemConstants.getNewItemInstanceByDefinition(item, level);
		},

		getSectorItemTags: function () {
			let tags = [];
			let sectorFeatures = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			
			switch (sectorFeatures.sectorType) {
				case SectorConstants.SECTOR_TYPE_RESIDENTIAL:
					tags.push("keepsake");
					tags.push("book");
					tags.push("perishable");
					tags.push("clothing");
					break;
				case SectorConstants.SECTOR_TYPE_INDUSTRIAL:
					tags.push("technology");
					tags.push("industrial");
					tags.push("clothing");
					tags.push("medical");
					break;
				case SectorConstants.SECTOR_TYPE_MAINTENANCE:
					tags.push("maintenance");
					break;
				case SectorConstants.SECTOR_TYPE_PUBLIC:
					tags.push("history");
					tags.push("book");
					tags.push("medical");
					break;
				case SectorConstants.SECTOR_TYPE_COMMERCIAL:
					tags.push("perishable");
					tags.push("clothing");
					tags.push("valuable");
					break;
				case SectorConstants.SECTOR_TYPE_SLUM:
					tags.push("keepsake");
					tags.push("perishable");
					tags.push("weapon");
					break;
			}

			if (sectorFeatures.wear > 5) tags.push("old");
			if (sectorFeatures.wear < 5) tags.push("modern");
			if (sectorFeatures.ground) tags.push("nature");
			if (sectorFeatures.sunlit) tags.push("nature");

			return tags;
		},

		getSpecificRewardItem: function (itemProbability, possibleItemIds) {
			if (!possibleItemIds || possibleItemIds.length === 0) {
				log.w("No valid reward items for getSpecificRewardItem");
				return null;
			}
			
			let index = MathUtils.getWeightedRandom(0, possibleItemIds.length);
			let itemID = possibleItemIds[index];
			let level = ItemConstants.getRandomItemLevel(item, ItemConstants.itemSource.exploration);
			return ItemConstants.getNewItemInstanceByID(itemID, level);
		},

		getNecessityItem: function (currentItems, campOrdinal) {
			// first bag
			if (GameGlobals.gameState.numCamps < 2) {
				let firstBag = ItemConstants.getBag(1);
				if (currentItems.getCurrentBonus(ItemConstants.itemBonusTypes.bag) < firstBag.getBaseBonus(ItemConstants.itemBonusTypes.bag)) {
					let res = this.playerResourcesNodes.head.resources;
					if (res.resources.getTotal() > 2) {
						return ItemConstants.getNewItemInstanceByDefinition(firstBag);
					}
				}
			}

			// map
			let visitedSectors = GameGlobals.gameState.numVisitedSectors;
			let numSectorsRequiredForMap = 5;
			if (visitedSectors > numSectorsRequiredForMap && currentItems.getCountById("equipment_map", true) <= 0) {
				return ItemConstants.getNewItemInstanceByID("equipment_map");
			}
			
			let playerPos = this.playerLocationNodes.head.position;
			if (playerPos.level < WorldConstants.LEVEL_NUMBER_STASH_ADVANCED_MAP && currentItems.getCountById("equipment_map_2", true) <= 0) {
				return ItemConstants.getNewItemInstanceByID("equipment_map_2");
			}

			// non-craftable level clothing
			var clothing = GameGlobals.itemsHelper.getScavengeNecessityClothing(campOrdinal, 1);
			for (let i = 0; i < clothing.length; i++) {
				if (currentItems.getCountById(clothing[i].id, true) <= 0) {
					return clothing[i];
				}
			}

			return null;
		},
		
		getNecessityIngredient: function (ingredientProbability) {			
			var playerPos = this.playerLocationNodes.head.position;
			var campOrdinal = GameGlobals.gameState.getCampOrdinal(playerPos.level);
			var step = GameGlobals.levelHelper.getCampStep(playerPos);
			var levelComponent = GameGlobals.levelHelper.getLevelEntityForPosition(playerPos.level).get(LevelComponent);
			var isHardLevel = levelComponent.isHard;
			
			let itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			let playerStamina = this.playerStatsNodes.head.stamina;
			let niCampOrdinal = campOrdinal;
			let niStep = step + 1;
			let niIsHardlevel = isHardLevel;
			if (step > WorldConstants.CAMP_STEP_END) {
				niCampOrdinal += 1;
				niStep = WorldConstants.CAMP_STEP_START;
				niIsHardlevel = false;
			}
			
			let neededIngredients = GameGlobals.itemsHelper.getNeededIngredients(niCampOrdinal, step, niIsHardlevel, itemsComponent, true);
			let neededIngredientsWithoutScavengingSpots = neededIngredients.filter(ingredient => !GameGlobals.levelHelper.hasUsableScavengingSpotsForItem(ingredient));
			if (neededIngredientsWithoutScavengingSpots.length > 0) {
				let neededIngredientProp = MathUtils.clamp(ingredientProbability * 10, 0.25, 0.5);
				let numAvailableGangs = GameGlobals.levelHelper.getNumAvailableGangs(campOrdinal, playerStamina, itemsComponent);
				if (numAvailableGangs <= 1 && Math.random() < neededIngredientProp) {
					let ingredient = neededIngredientsWithoutScavengingSpots[0];
					return ingredient;
				}
			}
			
			return null;
		},

		getFixedRewards: function (action) {
			if (action == "scavenge") {
				let numTimesScavenged = GameGlobals.gameState.stats.numTimesScavenged || 0;
				let fixedRewardsDef = this.fixedRewards[action][numTimesScavenged];
				return fixedRewardsDef || null;
			}
			return  null;
		},
		
		addFixedRewards: function (rewardsVO, fixedRewards, availableResources) {
			let efficiency = this.getCurrentScavengeEfficiency();
			
			log.i("applying fixed rewards", this);
			if (GameGlobals.logInfo) console.log(fixedRewards);
			
			this.addFixedRewardsResources(rewardsVO, fixedRewards, efficiency, availableResources);
			this.addFixedRewardsItems(rewardsVO, fixedRewards);
		},
		
		addFixedRewardsResources: function (rewardsVO, fixedRewards, efficiency, availableResources) {
			let results = new ResourcesVO(storageTypes.RESULT);
			for (let key in fixedRewards.resources) {
				let name = resourceNames[key];
				let availableAmount = availableResources.getResource(name);
				if (availableAmount <= 0) continue;
				
				let randomVal = fixedRewards.resources[key];
				let baseAmount = this.getBaseResourceFindAmount(name, availableAmount);
				let resultAmount = this.getFinalResourceFindAmount(name, baseAmount, efficiency, randomVal);
				
				results.setResource(name, resultAmount, "reward-fixed");
			}
			
			rewardsVO.gainedResources = results;
		},
		
		addFixedRewardsItems: function (rewardsVO, fixedRewards) {
			let result = [];
			
			for (let key in fixedRewards.items) {
				let num = fixedRewards.items[key] || 1;
				let itemVO = ItemConstants.getItemDefinitionByID(key);
				if (itemVO) {
					for (let i = 0; i < num; i++) {
						let level = ItemConstants.getRandomItemLevel(itemVO, ItemConstants.itemSource.exploration);
						result.push(ItemConstants.getNewItemInstanceByDefinition(itemVO, level));
					}
				}
			}
			
			rewardsVO.gainedItems = result;
		},

		addStashes: function (rewardsVO, stashes, stashesFound) {
			if (!stashes || stashes.length <= stashesFound) return;
			var stashVO = stashes[stashesFound];
			if (!GameGlobals.gameState.uiStatus.isHidden)
				log.i("found stash: " + stashVO.stashType + " " + stashVO.itemID + " " + (stashesFound+1) + "/" + stashes.length);
			rewardsVO.foundStashVO = stashVO;
			switch (stashVO.stashType) {
				case ItemConstants.STASH_TYPE_ITEM:
					let item = ItemConstants.getItemDefinitionByID(stashVO.itemID);
					if (item) {
						for (let i = 0; i < stashVO.amount; i++) {
							let level = ItemConstants.getRandomItemLevel(item, ItemConstants.itemSource.exploration);
							rewardsVO.gainedItems.push(ItemConstants.getNewItemInstanceByDefinition(item, level));
						}
					}
					break;
				case ItemConstants.STASH_TYPE_SILVER:
					rewardsVO.gainedCurrency += stashVO.amount;
					break;
			}
		},
		
		addExplorerBonuses: function (rewards, sectorResources, sectorIngredients, itemOptions) {
			var efficiency = this.getCurrentScavengeEfficiency();
			
			let generalBonus = GameGlobals.playerHelper.getCurrentBonus(ItemConstants.itemBonusTypes.scavenge_general);
			let suppliesBonus = GameGlobals.playerHelper.getCurrentBonus(ItemConstants.itemBonusTypes.scavenge_supplies);
			let ingredientsBonus = GameGlobals.playerHelper.getCurrentBonus(ItemConstants.itemBonusTypes.scavenge_ingredients);
			
			// general (resources)
			let bonusResourceProb = generalBonus - 1;
			let bonusResources = this.getRewardResources(bonusResourceProb, 1, efficiency, sectorResources);
			rewards.gainedResourcesFromExplorers = bonusResources;
			rewards.gainedResources.addAll(bonusResources, "reward-explorer-bonus");
			
			if (bonusResources.getTotal() > 0) {
				generalBonus = 0;
			}
			
			// supplies
			let bonusSuppliesProb = suppliesBonus - 1;
			let sectorSupplies = new ResourcesVO(storageTypes.RESULT);
			sectorSupplies.setResource(resourceNames.food, sectorResources.getResource(resourceNames.food), "reward-explorer-bonus");
			sectorSupplies.setResource(resourceNames.water, sectorResources.getResource(resourceNames.water), "reward-explorer-bonus");
			let bonusSupplies = this.getRewardResources(bonusSuppliesProb, 1, efficiency, sectorSupplies);
			rewards.gainedResourcesFromExplorers.addAll(bonusSupplies, "reward-explorer-bonus");
			rewards.gainedResources.addAll(bonusSupplies, "reward-explorer-bonus");
			
			// ingredients
			if (rewards.gainedItems.length == 0) {
				let bonusItemProb = generalBonus - 1;
				let bonusIngredientProb = generalBonus - 1 + ingredientsBonus - 1;
				let bonusItems = this.getRewardItems(bonusItemProb, bonusIngredientProb, sectorIngredients, itemOptions);
				rewards.gainedItemsFromExplorers = bonusItems;
				for (let i = 0; i < bonusItems.length; i++) {
					rewards.gainedItems.push(bonusItems[i]);
				}
			}
		},
		
		isSomethingUsefulResult: function (result) {
			return this.isSomethingUsefulResources(result.gainedResources)
				|| result.gainedItems.length > 0
				|| result.gainedCurrency > 0
				|| result.gainedExplorers.length > 0
				|| result.gainedBlueprintPiece
				|| result.gainedEvidence > 0
				|| result.gainedRumours > 0
				|| result.gainedHope > 0
				|| result.gainedInsight > 0
				|| result.gainedReputation > 0
				|| result.gainedPopulation > 0;
		},
		
		isSomethingUsefulResources: function (resources) {
			if (resources.getTotal() === 0) {
				return false;
			}
			for (var key in resourceNames) {
				var name = resourceNames[key];
				var amount = resources.getResource(name);
				if (amount > 0) {
					switch (name) {
						case resourceNames.water:
						case resourceNames.food:
							if (GameGlobals.gameState.unlockedFeatures.camp) return true;
							break;
						default:
							return true;
					}
				}
			}
			return false;
		},

		isRewardItemTypeLocked: function (itemType) {
			if (itemType === ItemConstants.itemBonusTypes.light) {
				return !GameGlobals.gameState.unlockedFeatures.vision;
			}
			return false;
		},

		addLostAndBrokenItems: function (resultVO, action, probability, onlySingleItem) {
			if (Math.random() > probability) return;
			if (!GameGlobals.gameState.unlockedFeatures.camp) return;
			
			let lostItems = [];
			let brokenItems = [];
			
			let itemsComponent = this.playerStatsNodes.head.items;
			let playerItems = itemsComponent.getAll(false);

			if (playerItems.length <= 0) return;

			// 1) regular items (excluding ingredients)
			// - make list with duplicates based on probabilities
			let itemList = [];
			let numValidItems = 0;
			let weightSum = 0;
			for (let i = 0; i < playerItems.length; i++) {
				let item = playerItems[i];
				if (item.type == ItemConstants.itemTypes.ingredient) continue;
				let weight = this.getItemLoseOrBreakWeight(action, item);
				if (weight <= 0) continue;
				let count = Math.round(weight * 10);
				for (let j = 0; j < count; j++) {
					itemList.push(item);
				}
				weightSum += weight;
				numValidItems++;
			}
			
			// - pick n items from the list and mark them as either broken or lost (per item)
			if (numValidItems > 0) {
				let maxItems = Math.min(5, Math.floor(numValidItems / 2));
				let numItems = onlySingleItem ? 1 : Math.ceil(Math.random() * maxItems);
				numItems = Math.min(numValidItems, numItems);

				for (let i = 0; i < numItems; i++) {
					let itemi = Math.floor(Math.random() * itemList.length);
					let selectedItem = itemList[itemi];
					let breakProbability = this.getItemBreakProbability(action, selectedItem);
					let isBreak = Math.random() < breakProbability;
					
					if (isBreak) {
						brokenItems.push(selectedItem);
					} else {
						lostItems.push(selectedItem);
					}
					
					let optionsToRemove = [];
					for (let j = 0; j < itemList.length; j++) {
						if (itemList[j] == selectedItem) {
							optionsToRemove.push(j);
						}
					}
					itemList.splice(optionsToRemove[0], optionsToRemove.length);
				}
			}
			
			// 2) ingredients: lose all or nothing
			if (!onlySingleItem) {
				for (let i = 0; i < playerItems.length; i++) {
					var item = playerItems[i];
					if (item.type !== ItemConstants.itemTypes.ingredient) continue;
					lostItems.push(item);
				}
			}
			
			resultVO.lostItems = lostItems;
			resultVO.brokenItems = brokenItems;
		},

		// normalized (0-1) weight of the given item to be lost or broken, used when selecting which items(s) to lose or break
		getItemLoseOrBreakWeight: function (action, item) {
			if (!ItemConstants.isUnselectable(item)) return 0;
			if (item.type == ItemConstants.itemTypes.uniqueEquipment) return 0;
			if (item.type == ItemConstants.itemTypes.ingredient) return 0;
			
			let campCount = GameGlobals.gameState.numCamps;
			let hasFirstCamp = campCount > 0;
			let isFight = action == "fight";
			let isDespair = action == "despair";
			let isLowerChanceForEquipment = item.equipped && !isDespair;

			let result = 0.5;

			if (isFight) {
				// fights: only equipment, mainly weapon
				if (item.equipped) {
					if (item.type == ItemConstants.itemTypes.weapon) {
						result = 1;
					}
					result = 0.5;
				}
				result = 0;
			} else {
				// other actions: by item type
				switch (item.type) {
					case ItemConstants.itemTypes.voucher:
						result = isDespair ? 0.5 : 0.25;
						break;
					case ItemConstants.itemTypes.exploration:
					case ItemConstants.itemTypes.artefact:
					case ItemConstants.itemTypes.trade:
					case ItemConstants.itemTypes.note:
						result = 0.5;
						break;
					case ItemConstants.itemTypes.clothing_over:
					case ItemConstants.itemTypes.clothing_upper:
					case ItemConstants.itemTypes.clothing_lower:
					case ItemConstants.itemTypes.clothing_head:
					case ItemConstants.itemTypes.clothing_hands:
					case ItemConstants.itemTypes.shoes:
						result = isLowerChanceForEquipment ? 0.1 : 0.65;
						break;
					case ItemConstants.itemTypes.weapon:
						result = isLowerChanceForEquipment ? 0.25 : 0.75;
						break;
					case ItemConstants.itemTypes.bag:
					case ItemConstants.itemTypes.light:
						result = hasFirstCamp ? item.equipped ? 0.25 : 0.75 : 0;
						break;
				}
			}
			
			if (item.broken) result = result / 2;
				
			return result;
		},

		// probability (0-1) that an item will break (rather than be lost), used when item has already been selected for lose/break to choose which
		getItemBreakProbability: function (action, item) {
			if (!item) return 0;
			let isFight = action == "fight";
			let isDespair = action == "despair";
			
			if (!item.repairable) return 0;
			if (item.broken) return 0;
			if (isDespair) return 0.95;
			if (isFight) return 1;
			if (item.equipped) return 0.99;
			return 0.9;
		},
		
		getLostExplorers: function (loseProbability) {
			let lostExplorers = [];
			
			if (loseProbability <= 0)
				return lostExplorers;
			
			let playerExplorers = this.playerStatsNodes.head.explorers.getParty();
			if (playerExplorers.length < 1)
				return lostExplorers;
				
			let fightExplorers = this.playerStatsNodes.head.explorers.getExplorersByType(ExplorerConstants.explorerType.FIGHTER);
			let possibleToLoseExplorers = fightExplorers.length > 1 ? playerExplorers : playerExplorers.filter(explorer => ExplorerConstants.getExplorerTypeForAbilityType(explorer.abilityType) != ExplorerConstants.explorerType.FIGHTER);
			
			if (possibleToLoseExplorers.length < 1)
				return lostExplorers;
				
			let loseOne = Math.random() < loseProbability;
			
			if (loseOne) {
				var index = Math.floor(possibleToLoseExplorers.length * Math.random());
				lostExplorers.push(possibleToLoseExplorers[index]);
			}
			
			return lostExplorers;
		},
		
		getLostPerks: function (loseAugmentationProbability) {
			let result = [];
			
			if (Math.random() > loseAugmentationProbability) {
				return result;
			}
			
			let perksComponent = this.playerStatsNodes.head.perks;
			let perkIDs = [ PerkConstants.perkIds.healthBonus3, PerkConstants.perkIds.healthBonus2, PerkConstants.perkIds.healthBonus1 ];
			
			for (let i = 0; i < perkIDs.length; i++) {
				let perk = perksComponent.getPerk(perkIDs[i]);
				if (!perk) continue;
				
				result.push(perk);
				return result;
			}
			
			return result;
		},

		getResultInjuries: function (injuryProbability, action, enemyVO) {
			let perksComponent = this.playerStatsNodes.head.perks;
			let result = [];

			let currentEffect = perksComponent.getTotalEffect(PerkConstants.perkTypes.injury);
			let injuries = perksComponent.getPerksByType(PerkConstants.perkTypes.injury);

			// limit possible injuries
			if (currentEffect < 0.35 || injuries.length >= 5)
				return result;

			if (injuryProbability * currentEffect > Math.random()) {
				let sectorFeatures = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
				let allowedTypes = this.getAllowedInjuryTypes(action, enemyVO, sectorFeatures);
				
				let injury = PerkConstants.getRandomInjury(allowedTypes);
				result.push(injury.clone());
			}
			
			return result;
		},
		
		getAllowedInjuryTypes: function (action, enemyVO, sectorFeatures) {
			let result = [];
			
			if (!enemyVO || !enemyVO.causedInjuryTypes || enemyVO.causedInjuryTypes.length == 0) {
				result.push(PerkConstants.injuryType.BLUNT);
				result.push(PerkConstants.injuryType.SHARP);
				
				if (Math.random() < 0.5) {
					result.push(PerkConstants.injuryType.FIRE);
				}
				
				if (sectorFeatures.hazards.poison > 0 || sectorFeatures.hazards.radiation > 0 || sectorFeatures.sectorType == SectorConstants.SECTOR_TYPE_INDUSTRIAL) {
					result.push(PerkConstants.injuryType.CHEMICAL);
				}
			} else {
				result = enemyVO.causedInjuryTypes;
			}
			
			return result;
		},

		getGainedCurses: function (curseProbability) {
			let perksComponent = this.playerStatsNodes.head.perks;
			let result = [];

			if (curseProbability <= 0) return result;

			if (perksComponent.hasPerk(PerkConstants.perkIds.cursed)) return result;
			
			if (curseProbability > Math.random()) {
				result.push(PerkConstants.getPerk(PerkConstants.perkIds.cursed));
			}

			return result;
		},

		getGainedPerks: function (perkProbabilities) {
			let perksComponent = this.playerStatsNodes.head.perks;
			let result = [];

			for (let key in perkProbabilities) {
				let perkID = key;
				let perkProbability = perkProbabilities[perkID];

				if (perkProbability <= 0) return result;

				if (perksComponent.hasPerk(perkID)) return result;
				
				if (perkProbability > Math.random()) {
					result.push(PerkConstants.getPerk(perkID));

					// only one perk per result
					return result;
				}
			}

			return result;
		},

		getResultBlueprint: function (minBlueprintProbability, localeVO) {
			if (!localeVO.hasBlueprints) return null;
			
			let playerPos = this.playerLocationNodes.head.position;
			let campOrdinal = GameGlobals.gameState.getCampOrdinal(playerPos.level);
			let levelIndex = GameGlobals.gameState.getLevelIndex(playerPos.level);
			let maxLevelIndex = GameGlobals.gameState.getMaxLevelIndex(playerPos.level);

			let blueprintType = localeVO.isEarly ? UpgradeConstants.BLUEPRINT_BRACKET_EARLY : UpgradeConstants.BLUEPRINT_BRACKET_LATE;
			let levelBlueprints = UpgradeConstants.getBlueprintsByCampOrdinal(campOrdinal, blueprintType, levelIndex, maxLevelIndex);

			// find blueprints available to discover

			let upgradesComponent = this.tribeUpgradesNodes.head.upgrades;
			let blueprintsToFind = [];
			let numBlueprintPiecesToFind = 0;
			for (let i = 0; i < levelBlueprints.length; i++) {
				let blueprintID = levelBlueprints[i];
				if (!upgradesComponent.hasUpgrade(blueprintID) && !upgradesComponent.hasAvailableBlueprint(blueprintID)) {
					let blueprintVO = upgradesComponent.getBlueprint(blueprintID);
					let remainingPieces = blueprintVO ? blueprintVO.maxPieces - blueprintVO.currentPieces : UpgradeConstants.getMaxPiecesForBlueprint(blueprintID);
					if (remainingPieces > 0) {
						blueprintsToFind.push(blueprintID);
						numBlueprintPiecesToFind += remainingPieces;
					}
				}
			}
			
			// add missed blueprints (should be none but fallback in case of bugs)

			let missedBlueprints = this.getMissedBlueprints();
			for (let i = 0; i < missedBlueprints.length; i++) {
				let blueprintID = missedBlueprints[i];
				blueprintsToFind.push(blueprintID);
				numBlueprintPiecesToFind += UpgradeConstants.getMaxPiecesForBlueprint(blueprintID);
			}

			if (blueprintsToFind.length == 0) return 0;
			
			// calculate find probability (minimum)

			let bracket = localeVO.getBracket();
			let unscoutedLocales = GameGlobals.levelHelper.getLevelLocales(playerPos.level, false, bracket, localeVO, true);
			let numUnscoutedLocales = unscoutedLocales.length + 1;
			let scoutedLocales = GameGlobals.levelHelper.getLevelLocales(playerPos.level, true, bracket, localeVO, true);
			let numScoutedLocales = scoutedLocales.length + 1 - numUnscoutedLocales;

			let findBlueprintProbability = MathUtils.clamp(numBlueprintPiecesToFind / numUnscoutedLocales, minBlueprintProbability, 1);

			// roll and check if we found something

			let isFirstEver = playerPos.level == 13 && numScoutedLocales == 0;
			if (!isFirstEver && Math.random() > findBlueprintProbability) {
				return null;
			}

			// select blueprint 

			let sectorUpgradeType = this.getDefaultUpgradeTypeForSector();
			let localeUpgradeType = this.getDefaultUpgradeTypeForLocale(localeVO);

			let getBlueprintScore = function (blueprintID) {
				let score = 0;
				let blueprintVO = upgradesComponent.getBlueprint(blueprintID);
				let upgradeType = UpgradeConstants.getUpgradeType(blueprintID);
				
				if (blueprintVO) score += blueprintVO.currentPieces;
				if (upgradeType == sectorUpgradeType) score += 2;
				if (upgradeType == localeUpgradeType) score += 4;

				return score;
			}

			blueprintsToFind = blueprintsToFind.sort((a, b) => getBlueprintScore(b) - getBlueprintScore(a));

			return blueprintsToFind[0];
		},

		getDefaultUpgradeTypeForSector: function () {
			let sectorFeatures = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);

			switch (sectorFeatures.sectorType) {
				case SectorConstants.SECTOR_TYPE_RESIDENTIAL:
					return UpgradeConstants.UPGRADE_TYPE_RUMOURS;
				case SectorConstants.SECTOR_TYPE_INDUSTRIAL:
					return UpgradeConstants.UPGRADE_TYPE_EVIDENCE;
				case SectorConstants.SECTOR_TYPE_MAINTENANCE:
					return UpgradeConstants.UPGRADE_TYPE_EVIDENCE;
				case SectorConstants.SECTOR_TYPE_PUBLIC:
					return UpgradeConstants.UPGRADE_TYPE_HOPE;
				case SectorConstants.SECTOR_TYPE_COMMERCIAL:
					return UpgradeConstants.UPGRADE_TYPE_HOPE;
				case SectorConstants.SECTOR_TYPE_SLUM:
					return UpgradeConstants.UPGRADE_TYPE_RUMOURS;
			}

			return null;
		},

		getDefaultUpgradeTypeForLocale: function (localeVO) {
			switch (localeVO.type) {
				case localeTypes.bunker: return UpgradeConstants.UPGRADE_TYPE_INSIGHT;
				case localeTypes.clinic: return UpgradeConstants.UPGRADE_TYPE_EVIDENCE;
				case localeTypes.factory: return UpgradeConstants.UPGRADE_TYPE_EVIDENCE;
				case localeTypes.farm: return UpgradeConstants.UPGRADE_TYPE_HOPE;
				case localeTypes.sewer: return UpgradeConstants.UPGRADE_TYPE_RUMOURS;
				case localeTypes.camp: return UpgradeConstants.UPGRADE_TYPE_RUMOURS;
				case localeTypes.caravan: return UpgradeConstants.UPGRADE_TYPE_RUMOURS;
				case localeTypes.hermit: return UpgradeConstants.UPGRADE_TYPE_RUMOURS;
				case localeTypes.tradingpartner: return UpgradeConstants.UPGRADE_TYPE_RUMOURS;
				case localeTypes.grocery: return UpgradeConstants.UPGRADE_TYPE_HOPE;
				case localeTypes.hut: return UpgradeConstants.UPGRADE_TYPE_RUMOURS;
				case localeTypes.lab: return UpgradeConstants.UPGRADE_TYPE_EVIDENCE;
				case localeTypes.restaurant: return UpgradeConstants.UPGRADE_TYPE_HOPE;
				case localeTypes.house: return UpgradeConstants.UPGRADE_TYPE_RUMOURS;
				case localeTypes.market: return UpgradeConstants.UPGRADE_TYPE_RUMOURS;
				case localeTypes.store: return UpgradeConstants.UPGRADE_TYPE_HOPE;
			}

			return null;
		},
		
		getFallbackExplorers: function (probability) {
			let result = [];
			
			let playerPos = this.playerLocationNodes.head.position;
			let campOrdinal = GameGlobals.gameState.getCampOrdinal(playerPos.level);
			if (campOrdinal < ExplorerConstants.FIRST_EXPLORER_CAMP_ORDINAL) return result;
			
			let upgradeID = GameGlobals.upgradeEffectsHelper.getUpgradeToUnlockBuilding(improvementNames.inn);
			if (GameGlobals.tribeHelper.hasUpgrade(upgradeID)) return result;
			
			let fightExplorers = this.playerStatsNodes.head.explorers.getExplorersByType(ExplorerConstants.explorerType.FIGHTER);
			if (fightExplorers.length > 0) return result;
				
			let nearestCampNode = this.nearestCampNodes.head;
			if (nearestCampNode == null) return result;
			if (nearestCampNode.camp.pendingRecruits.length > 0) return result;
			
			let level = GameGlobals.gameState.getLevelForCamp(ExplorerConstants.FIRST_EXPLORER_CAMP_ORDINAL);
			let unscoutedLocales = GameGlobals.levelHelper.getLevelLocales(level, false, LocaleConstants.LOCALE_BRACKET_EARLY, null, false).length;
			if (unscoutedLocales > 0) return result;
			
			if (Math.random() < probability) {
				let explorerTemplate = ExplorerConstants.predefinedExplorers[ExplorerConstants.FIRST_EXPLORER_CAMP_ORDINAL];
				let explorer = GameGlobals.explorerHelper.getNewPredefinedExplorer(explorerTemplate.id);
				result.push(explorer);
			}
			
			return result;
		},
		
		getMissedBlueprints: function () {
			let missedBlueprints = [];
			let playerPos = this.playerLocationNodes.head.position;
			let upgradesComponent = this.tribeUpgradesNodes.head.upgrades;
			let levelOrdinal = GameGlobals.gameState.getLevelOrdinal(playerPos.level);
			for (let i = 1; i < levelOrdinal; i++) {
				let level = GameGlobals.gameState.getLevelForOrdinal(i);
				let allLocales = GameGlobals.levelHelper.getLevelLocales(level, true, null, true).length;
				let unscoutedLocales = GameGlobals.levelHelper.getLevelLocales(level, false, null, true).length;
				if (allLocales > 0 && unscoutedLocales === 0) {
					let c = GameGlobals.gameState.getCampOrdinal(level);
					let levelIndex = GameGlobals.gameState.getLevelIndex(level);
					let maxLevelIndex = GameGlobals.gameState.getMaxLevelIndex(playerPos.level);
					let levelBlueprints = UpgradeConstants.getBlueprintsByCampOrdinal(c, null, levelIndex, maxLevelIndex);
					for (let j = 0; j < levelBlueprints.length; j++) {
						var blueprintID = levelBlueprints[j];
						if (upgradesComponent.hasUpgrade(blueprintID)) continue;
						if (upgradesComponent.hasAvailableBlueprint(blueprintID)) continue;
						if (upgradesComponent.hasAllPieces(blueprintID)) continue;
						missedBlueprints.push(blueprintID);
					}
				}
			}
			
			return missedBlueprints;
		},

		getBaseResourceFindProbability: function (prevalence) {
			switch (prevalence) {
				// rare no matter what
				case WorldConstants.resourcePrevalence.RARE: return 0.1;
				// just below scavenge efficiency so with 100% you can still have misses
				case WorldConstants.resourcePrevalence.DEFAULT: return 0.85;
				// equals scavenge efficiency
				case WorldConstants.resourcePrevalence.COMMON: return 1;
				// not quite 100% chance with 50% scavenge efficiency
				case WorldConstants.resourcePrevalence.ABUNDANT: return 1.9;
				// 100% chance with 50% scavenge efficiency
				case WorldConstants.resourcePrevalence.HEAP: return 2;
			}
			log.w("unknown resource prevalence: " + prevalence);
			return 0;
		},
		
		getBaseResourceFindAmount: function (name, prevalence) {
			switch (prevalence) {
				case WorldConstants.resourcePrevalence.RARE:
					return 1;
				case WorldConstants.resourcePrevalence.DEFAULT:
					return 2;
				case WorldConstants.resourcePrevalence.COMMON:
					return 3;
				case WorldConstants.resourcePrevalence.ABUNDANT:
					return 5;
				case WorldConstants.resourcePrevalence.HEAP:
					return 6;
			}
			log.w("unknown resource prevalence: " + prevalence);
			return 0;
		},
		
		getFinalResourceFindAmount: function (name, baseAmount, efficiency, randomVal) {
			let resMin = 1;
			let resMax = 10;
			let minRandomAmoutFactor = 1/3*2;
			let maxRandomAmountFactor  = 1/3*4;
			
			let randomAmountFactor  = MathUtils.map(randomVal, 0, 1, minRandomAmoutFactor, maxRandomAmountFactor);
			let resultAmount = baseAmount * efficiency * randomAmountFactor;
			resultAmount = Math.round(resultAmount);
			resultAmount = MathUtils.clamp(resultAmount, resMin, resMax);
			return resultAmount;
		},

		getAvailableResourcesForEnemy: function (enemyVO) {
			let result = new ResourcesVO(storageTypes.DEFINITION);
			for (let i = 0; i < enemyVO.droppedResources.length; i++) {
				result.setResource(enemyVO.droppedResources[i], WorldConstants.resourcePrevalence.COMMON, "definition");
			}
			return result;
		},
		
		getDefaultRewardCampNode: function () {
			let nearestCampNode = this.nearestCampNodes.head;
			if (nearestCampNode) return nearestCampNode;
			let lastVisitedCampNode = this.lastVisitedCampNodes.head;
			if (lastVisitedCampNode) return lastVisitedCampNode;
			return null;
		},

		willGainedExplorerJoinParty: function (explorer) {
			let explorersComponent = this.playerStatsNodes.head.explorers;
			let explorerType = ExplorerConstants.getExplorerTypeForAbilityType(explorer.abilityType);
			let existingInParty = explorersComponent.getExplorerInPartyByType(explorerType);
			if (existingInParty) return false;
			let existingRecruited = explorersComponent.getAll();
			let maxExplorers = GameGlobals.campHelper.getCurrentMaxExplorersRecruited();
			if (existingRecruited.length >= maxExplorers) return false;
			return true;
		},

	});

	return PlayerActionResultsHelper;
});
