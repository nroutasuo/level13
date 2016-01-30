// Helper methods related to rewards from player actions such as scavenging and scouting
define([
    'ash',
	'game/constants/PlayerActionConstants',
	'game/constants/TextConstants',
	'game/constants/ItemConstants',
	'game/constants/PerkConstants',
	'game/constants/UpgradeConstants',
	'game/constants/UIConstants',
    'game/nodes/player/PlayerStatsNode',
    'game/nodes/PlayerLocationNode',
    'game/nodes/player/PlayerResourcesNode',
    'game/nodes/tribe/TribeUpgradesNode',
    'game/nodes/NearestCampNode',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/player/ItemsComponent',
	'game/components/player/PerksComponent',
	'game/vos/ResultVO',
	'game/vos/ResourcesVO'
], function (
	Ash,
	PlayerActionConstants,
	TextConstants,
	ItemConstants,
	PerkConstants,
	UpgradeConstants,
	UIConstants,
	PlayerStatsNode,
	PlayerLocationNode,
	PlayerResourcesNode,
	TribeUpgradesNode,
	NearestCampNode,
	SectorFeaturesComponent,
	SectorStatusComponent,
	ItemsComponent,
	PerksComponent,
	ResultVO,
	ResourcesVO
) {
    var PlayerActionResultsHelper = Ash.Class.extend({

		gameState: null,
		resourcesHelper: null,
		levelHelper: null,

		playerStatsNodes: null,
		playerResourcesNodes: null,
		playerLocationNodes: null,
		tribeUpgradesNodes: null,
		
		itemResultTypes: {
			scavenge: { bag: 0.1, shades: 0.15, light: 0.25, movement: 0.35, shoes: 0.52, weapon: 0.75, clothing: 0.95, exploration: 0.99 },
			fight: { bag: 0, shades: 0, light: 0, movement: 0.1, shoes: 0.25, weapon: 0.4, clothing: 0.55, exploration: 0.6 },
			meet: { bag: 0.1, shades: 0.2, light: 0.2, movement: 0.3, shoes: 0.4, weapon: 0.6, clothing: 0.8, exploration: 0.9 }
		},

		constructor: function (engine, gameState, resourcesHelper, levelHelper) {
			this.engine = engine;
			this.gameState = gameState;
			this.resourcesHelper = resourcesHelper;
			this.levelHelper = levelHelper;
            this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
            this.playerResourcesNodes = engine.getNodeList(PlayerResourcesNode);
            this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
			this.nearestCampNodes = engine.getNodeList(NearestCampNode);
		},

        getScavengeRewards: function () {
			var rewards = new ResultVO();

			var sectorResources = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent).resources;
			var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			var playerPos = this.playerLocationNodes.head.position;
			var levelOrdinal = this.gameState.getLevelOrdinal(playerPos.level);
			var efficiency = this.getScavengeEfficiency();

			rewards.gainedResources = this.getRewardResources(1, efficiency, sectorResources);
			rewards.gainedItems = this.getRewardItems(0.007, 0.05, this.itemResultTypes.scavenge, itemsComponent, levelOrdinal);

			return rewards;
		},

		getScoutRewards: function () {
			var rewards = new ResultVO();

			var efficiency = this.getScavengeEfficiency();
            var sectorResources = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent).resources;

			rewards.gainedEvidence = 1;
			rewards.gainedInjuries = this.getResultInjuries(PlayerActionConstants.injuryProbabilities.scout);
			if (rewards.gainedInjuries.length === 0) {
				rewards.gainedResources = this.getRewardResources(0.5, efficiency * 2, sectorResources);
			}

			return rewards;
		},

		getScoutLocaleRewards: function (localeVO) {
			var rewards = new ResultVO();
			var localeCategory = localeVO.getCategory();

            var availableResources = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent).resources.clone();
			availableResources.addAll(localeVO.getResourceBonus(this.gameState.unlockedFeatures.resources));
			var efficiency = this.getScavengeEfficiency();
			var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			var playerPos = this.playerLocationNodes.head.position;
			var levelOrdinal = this.gameState.getLevelOrdinal(playerPos.level);
			var localeDifficulty = localeVO.requirements.vision + localeVO.costs.stamina;

			rewards.gainedBlueprint = this.getResultBlueprint(localeVO);
			if (localeCategory === "u") {
				rewards.gainedEvidence = 1;
				rewards.gainedPopulation = Math.random() < 0.05 ? 1 : 0;
			} else {
				rewards.gainedPopulation = Math.random() < 0.2 ? 1 : 0;
				rewards.gainedFollowers = this.getRewardFollowers(0.1);
				rewards.gainedRumours = Math.random() < 0.3 ? Math.ceil(Math.random() * levelOrdinal * levelOrdinal) : 0;
			}
				
			rewards.gainedInjuries = this.getResultInjuries(PlayerActionConstants.injuryProbabilities.scavenge);
			if (rewards.gainedInjuries.length === 0) {
				if (localeCategory === "u") {
					rewards.gainedResources = this.getRewardResources(1, efficiency * localeDifficulty / 25, availableResources);
					rewards.gainedItems = this.getRewardItems(0.2, 0, this.itemResultTypes.scavenge, itemsComponent, levelOrdinal);
				} else {
					rewards.gainedItems = this.getRewardItems(0.2, 0, this.itemResultTypes.meet, itemsComponent, levelOrdinal);
				}
			}

			return rewards;
		},
		
		getFightRewards: function (won) {
			var rewards = new ResultVO();
            if (won) {
				// TODO make fight rewards dependent on enemy difficulty (amount) and type
				var availableResources = new ResourcesVO();
				var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
				var playerPos = this.playerLocationNodes.head.position;
				var levelOrdinal = this.gameState.getLevelOrdinal(playerPos.level);
				availableResources.setResource(resourceNames.food, 10);
				availableResources.setResource(resourceNames.metal, 3);
				rewards.gainedResources = this.getRewardResources(0.3, 1, availableResources);
                rewards.gainedItems = this.getRewardItems(0.2, 0.2, this.itemResultTypes.fight, itemsComponent, levelOrdinal);
				rewards.gainedReputation = 1;
            } else {
				// TODO lost followers
				rewards = this.getFadeOutResults(1, 0.75);
			}
			return rewards;
		},

        getFadeOutResults: function (loseInventoryProbability, injuryProbability) {
            var resultVO = new ResultVO();
            if (loseInventoryProbability > Math.random()) {
                resultVO.lostResources = this.playerResourcesNodes.head.resources.resources.clone();
                var playerItems = this.playerResourcesNodes.head.entity.get(ItemsComponent).getAll();
                for (var i = 0; i < playerItems.length; i++) {
					switch (playerItems[i].type) {
						case ItemConstants.itemTypes.bag:
						case ItemConstants.itemTypes.uniqueEquipment:
							break;
						
						default:
							resultVO.lostItems.push(playerItems[i].clone());
							break;
					}
                }
            }

            resultVO.gainedInjuries = this.getResultInjuries(injuryProbability);

            return resultVO;
        },

		collectRewards: function (rewards) {
			var currentStorage = this.resourcesHelper.getCurrentStorage();
			currentStorage.addResources(rewards.gainedResources);
			currentStorage.substractResources(rewards.lostResources);

			var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			var sectorResources = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent).resources;
			for (var key in resourceNames) {
				var name = resourceNames[key];
				var amount = rewards.gainedResources.getResource(name);
				var inSector = sectorResources.getResource(name) > 0;
				if (amount > 0 && inSector) {
					sectorStatus.addDiscoveredResource(name);
				}
			}

			var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			if (rewards.gainedItems) {
				for (var i = 0; i < rewards.gainedItems.length; i++) {
					itemsComponent.addItem(rewards.gainedItems[i]);
				}
			}
			
			if (rewards.gainedFollowers) {
				for (var i = 0; i < rewards.gainedFollowers.length; i++) {
					itemsComponent.addItem(rewards.gainedFollowers[i]);
				}
			}

			if (rewards.lostItems) {
				for (var i = 0; i < rewards.lostItems.length; i++) {
					itemsComponent.discardItem(rewards.lostItems[i]);
				}
			}
			
			if (rewards.gainedBlueprint) {
				this.tribeUpgradesNodes.head.upgrades.addNewBlueprint(rewards.gainedBlueprint);
			}

			if (rewards.gainedInjuries) {
				var perksComponent = this.playerStatsNodes.head.entity.get(PerksComponent);
				for (var i = 0; i < rewards.gainedInjuries.length; i++) {
					perksComponent.addPerk(rewards.gainedInjuries[i].clone());
				}
			}
			
			if (rewards.gainedPopulation > 0) {
				var nearestCampNode = this.nearestCampNodes.head;
				if (nearestCampNode) {
					console.log(nearestCampNode.position);
					nearestCampNode.camp.population += 1;
				} else {
					console.log("WARN: No nearest camp found.");
				}
			}

			if (rewards.gainedEvidence) this.playerStatsNodes.head.evidence.value += rewards.gainedEvidence;
			if (rewards.gainedReputation) this.playerStatsNodes.head.reputation.value += rewards.gainedReputation;
			if (rewards.gainedRumours) this.playerStatsNodes.head.rumours.value += rewards.gainedRumours;
		},

		getRewardsMessage: function (rewards, baseMsg) {
			var msg = baseMsg;
			var replacements = [];
			var values = [];
			var foundSomething = rewards.gainedResources.getTotal() > 0;

			var resourceTemplate = TextConstants.getLogResourceText(rewards.gainedResources);
			msg += "Found " + resourceTemplate.msg;
			replacements = replacements.concat(resourceTemplate.replacements);
			values = values.concat(resourceTemplate.values);

			if (rewards.gainedItems && rewards.gainedItems.length > 0) {
				msg += ", ";
				foundSomething = true;
				
				var loggedItems = {};
				for (var i = 0; i < rewards.gainedItems.length; i++) {
					var item = rewards.gainedItems[i];
					if (typeof loggedItems[item.id]  === 'undefined') {
						msg += "$" + replacements.length + ", ";
						replacements.push("#" + replacements.length + " " + item.name.toLowerCase());
						values.push(1);
						loggedItems[item.id] = replacements.length - 1;
					} else {
						values[loggedItems[item.id]]++;
					}
				}
			}
			
			if (rewards.gainedFollowers && rewards.gainedFollowers.length > 0) {
				msg += ", ";
				foundSomething = true;
				for (var i = 0; i < rewards.gainedFollowers.length; i++) {
					var follower = rewards.gainedFollowers[i];
					msg += "$" + replacements.length + ", ";
					replacements.push("#" + replacements.length + " " + follower.name.toLowerCase());
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

			if (rewards.gainedRumours) {
				msg += ", ";
				foundSomething = true;
				msg += "$" + replacements.length + ", ";
				replacements.push("#" + replacements.length + " rumours");
				values.push(rewards.gainedRumours);
			}

			if (rewards.gainedBlueprint) {
				msg += ", ";
				foundSomething = true;
				msg += "$" + replacements.length + ", ";
				replacements.push("#" + replacements.length + " blueprint");
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
				msg = msg.slice(0, -2);
				msg += ".";
			} else {
				msg = "Didn't find anything.";
			}
			
			// TODO more (varied?) messages for getting injured
			
			if (rewards.gainedInjuries.length > 0) {
				msg += " Got injured.";
			}

			return { msg: msg, replacements: replacements, values: values };
		},
		
		getRewardDiv: function (resultVO) {
			var div = "<div class='infobox infobox-temporary'>";
			
            var gainedhtml = "<span class='listheader'>Gained:</span>";
            gainedhtml += "<ul class='resultlist'>";			
            if (resultVO.gainedResources) {
                gainedhtml += UIConstants.getResourceList(resultVO.gainedResources);
			}
			if (resultVO.gainedItems) {
				gainedhtml += UIConstants.getItemList(resultVO.gainedItems);
			}
			if (resultVO.gainedFollowers) {
				gainedhtml += UIConstants.getItemList(resultVO.gainedFollowers);
			}
			if (resultVO.gainedEvidence) {
				gainedhtml += "<li>" + resultVO.gainedEvidence + " evidence</li>";
			}
			if (resultVO.gainedRumours) {
				gainedhtml += "<li>" + resultVO.gainedRumours + " rumours</li>";
			}
			if (resultVO.gainedPopulation) {
				gainedhtml += "<li>" + resultVO.gainedPopulation + " population</li>";
			}
			if (resultVO.gainedBlueprint) {
				gainedhtml += "<li>a blueprint</li>";
			}
			gainedhtml += "</ul>";
			var hasGainedStuff = gainedhtml.indexOf("<li") > 0;
			if (hasGainedStuff) div += gainedhtml;
			
			var losthtml = "<span class='listheader'>Lost:</span>";
			losthtml += "<ul class='resultlist'>";
			if (resultVO.lostResources) {
				losthtml += UIConstants.getResourceList(resultVO.lostResources);
			}
			if (resultVO.lostItems) {
				losthtml += UIConstants.getItemList(resultVO.lostItems);
			}
			losthtml += "</ul>";
			if (resultVO.gainedInjuries.length > 0) {
				losthtml += "<p class='warning'>You got injured.</p>";
			}
			var hasLostStuff = losthtml.indexOf("<li") > 0 || losthtml.indexOf("<p") > 0;
			if (hasLostStuff) div += losthtml;
			
			if (!hasGainedStuff && !hasLostStuff) div += "<p>Didn't find anything useful.</p>";
                
			div += "</div>";
			return div;
		},

		getScavengeEfficiency: function () {
			var playerVision = this.playerStatsNodes.head.vision.value;
			var playerHealth = this.playerStatsNodes.head.stamina.health;
            return (playerHealth / 100) * (playerVision / 100);
        },

		getRewardResources: function (probabilityFactor, amountFactor, availableResources) {
			var results = new ResourcesVO();
			for (var key in resourceNames) {
				var name = resourceNames[key];
				var resAmount = availableResources.getResource(name);
				var probability = 0.2;
				var resAmountFactor = 1;
				if (name === "metal") {
					probability = 0.98;
					resAmountFactor = 2;
				} else if (name === "water" || name === "food") {
					probability = 0.3;
					resAmountFactor = 3;
				}
				probability = probability * probabilityFactor;
				var resultAmount = Math.random() < probability ?
					Math.ceil(amountFactor * resAmountFactor * resAmount * Math.random()) :
					0;

				results.setResource(name, resultAmount);
			}

			return results;
		},
		
		// probability of getting something: 0-1 for one item / some ingredients
		getRewardItems: function (itemProbability, ingredientProbability, itemTypeLimits, currentItems, levelOrdinal) {
			var items = [];
			var totalLevels = this.gameState.getTotalLevels();

			// Neccessity items that the player should find quickly if missing
			var necessityItem = this.getNecessityItem(currentItems, levelOrdinal);
			if (necessityItem && Math.random() < itemProbability * 33) {
				items.push(necessityItem);
			}

			// Normal items
			if (Math.random() < itemProbability) {
				var item;
				var i;
				var pendingItem;
				var itemTypeRand = Math.random();
				if (itemTypeRand < itemTypeLimits.bag) {
					pendingItem = ItemConstants.getBag(levelOrdinal);
				} else if (itemTypeRand < itemTypeLimits.shades) {
					pendingItem = ItemConstants.getShades(levelOrdinal);
				} else if (itemTypeRand < itemTypeLimits.light) {
					pendingItem = ItemConstants.getLight(levelOrdinal);
				} else if (itemTypeRand < itemTypeLimits.movement) {
					item = ItemConstants.getMovement(levelOrdinal);
				} else if (itemTypeRand < itemTypeLimits.shoes) {
					item = ItemConstants.getShoes(levelOrdinal);
				} else if (itemTypeRand < itemTypeLimits.weapon) {
					item = ItemConstants.getDefaultWeapon(levelOrdinal, totalLevels);
				} else if (itemTypeRand < itemTypeLimits.clothing) {
					item = ItemConstants.getDefaultClothing(levelOrdinal, totalLevels);
				} else if (itemTypeRand < itemTypeLimits.exploration) {
					i = Math.floor(Math.random() * ItemConstants.itemDefinitions.exploration.length);
					item = ItemConstants.itemDefinitions.exploration[i].clone();
				} else {
					i = Math.floor(Math.random() * ItemConstants.itemDefinitions.artefact.length);
					item = ItemConstants.itemDefinitions.artefact[i].clone();
				}
				if (!item && pendingItem)
					if (currentItems.getCount(pendingItem) <= 0) item = pendingItem;
				if (item) items.push(item);
			}
			
			// TODO get parts / ingredients depending on the sector
			// Parts / ingredients
			var hasBag = currentItems.getCurrentBonus(ItemConstants.itemTypes.bag) > 0;
			if (hasBag && Math.random() < ingredientProbability) {
				var amount = parseInt(Math.random() * ingredientProbability * 5) + 1;
				var ingredient = ItemConstants.getIngredient();
				for (var i = 0; i <= amount; i++) {
					items.push(ingredient.clone());
				}
			}
			
			return items;
		},
		
		getRewardFollowers: function (probability) {
			var followers = [];
			if (Math.random() < probability) {
				var playerPos = this.playerLocationNodes.head.position;
				var campCount = this.gameState.numCamps;
				var follower = ItemConstants.getFollower(playerPos.level, campCount);
				followers.push(follower);
			}
			return followers;
		},

		getNecessityItem: function (currentItems, levelOrdinal) {
			if (currentItems.getCurrentBonus(ItemConstants.itemTypes.bag) <= 0) {
				return ItemConstants.getBag(levelOrdinal);
			}
			if (currentItems.getCountById(ItemConstants.itemDefinitions.uniqueEquipment[0].id) <= 0) {
				return ItemConstants.itemDefinitions.uniqueEquipment[0].clone();
			}
			return null;
		},

		getResultInjuries: function (injuryProbability) {
			var injuries = [];
			if (injuryProbability > Math.random()) {
				var injuryi = parseInt(Math.random() * PerkConstants.perkDefinitions.injury.length);
				var injury = PerkConstants.perkDefinitions.injury[injuryi];
                injuries.push(injury.clone());
            }
			return injuries;
		},
		
		getResultBlueprint: function (localeVO) {
			var playerPos = this.playerLocationNodes.head.position;
			var campOrdinal = this.gameState.getCampOrdinal(playerPos.level);
			var levelBlueprints = UpgradeConstants.bluePrintsByCampOrdinal[campOrdinal];
			var blueprintsToFind = [];
			for (var i = 0; i < levelBlueprints.length; i++) {
				if (!this.tribeUpgradesNodes.head.upgrades.hasBlueprint(levelBlueprints[i]))
					blueprintsToFind.push(levelBlueprints[i]);
			}
			
			var unscoutedLocales = this.levelHelper.getLevelLocales(playerPos.level, false, localeVO).length + 1;
			
			var levelBlueprintProbability = blueprintsToFind.length / unscoutedLocales;
			console.log(blueprintsToFind.length + " / " + unscoutedLocales + " -> " + levelBlueprintProbability);
			if (Math.random() < levelBlueprintProbability) {
				return blueprintsToFind[Math.floor(Math.random() * blueprintsToFind.length)];
			} else {
				// TODO a change to get unfound upgrades from previous levels
			}
			
			return null;
		},

    });

    return PlayerActionResultsHelper;
});