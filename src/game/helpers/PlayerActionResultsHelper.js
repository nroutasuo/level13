// Helper methods related to rewards from player actions such as scavenging and scouting
define([
    'ash',
    'game/constants/GameConstants',
    'game/constants/PlayerActionConstants',
    'game/constants/LogConstants',
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
    'game/components/common/ResourcesComponent',
    'game/components/common/LogMessagesComponent',
    'game/components/sector/SectorFeaturesComponent',
    'game/components/sector/SectorStatusComponent',
    'game/components/player/BagComponent',
    'game/components/player/ItemsComponent',
    'game/components/player/PerksComponent',
    'game/vos/ResultVO',
    'game/vos/ResourcesVO'
], function (
    Ash,
    GameConstants,
    PlayerActionConstants,
    LogConstants,
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
    ResourcesComponent,
    LogMessagesComponent,
    SectorFeaturesComponent,
    SectorStatusComponent,
    BagComponent,
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

        // probabilities of getting item of that type, Math.random() < prob, else artefact
        itemResultTypes: {
            scavenge: { bag: 0.15, shades: 0.2, light: 0.35, shoes: 0.50, weapon: 0.70, clothing: 0.90, exploration: 0.99 },
            fight: { bag: 0, shades: 0, light: 0, shoes: 0.2, weapon: 0.4, clothing: 0.55, exploration: 0.6 },
            meet: { bag: 0.1, shades: 0.2, light: 0.2, shoes: 0.3, weapon: 0.5, clothing: 0.7, exploration: 0.8 }
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

            var sectorResources = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent).resourcesScavengable;
            var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
            var playerPos = this.playerLocationNodes.head.position;
            var levelOrdinal = this.gameState.getLevelOrdinal(playerPos.level);
            var efficiency = this.getScavengeEfficiency();

            rewards.gainedResources = this.getRewardResources(1, efficiency, sectorResources);
            rewards.gainedItems = this.getRewardItems(0.007, 0.05, this.itemResultTypes.scavenge, itemsComponent, levelOrdinal);

            /*
            rewards.gainedItems = this.getRewardItems(0.7, 0.1, this.itemResultTypes.scavenge, itemsComponent, levelOrdinal);
            rewards.gainedFollowers = this.getRewardFollowers(0.2);
            rewards.gainedBlueprintPiece = this.getResultBlueprint(null);
            rewards.gainedEvidence = Math.floor(Math.random(2));
            rewards.gainedReputation = Math.floor(Math.random(2));
            rewards.gainedRumours = Math.floor(Math.random(2));
            rewards.gainedPopulation = Math.floor(Math.random(2));
            rewards.gainedInjuries = this.getResultInjuries(0.1);
            rewards.lostResources = new ResourcesVO();
            rewards.lostResources.metal = Math.random() > 0.8 ? 2 : 0;
            var playerItems = this.playerResourcesNodes.head.entity.get(ItemsComponent).getAll(false);
            var itemLoseProbability;
            for (var i = 0; i < playerItems.length; i++) {
                    itemLoseProbability = 0;
                    switch (playerItems[i].type) {
                            case ItemConstants.itemTypes.clothing:
                            case ItemConstants.itemTypes.shoes:
                            case ItemConstants.itemTypes.light:
                            case ItemConstants.itemTypes.shades:
                                    itemLoseProbability = 0.1;
                                    break;
                    }
                    if (itemLoseProbability > Math.random()) {
                            rewards.lostItems.push(playerItems[i].clone());
                    }
            }
            */

            // should never be needed, but as a fallback
            var unscoutedLocales = this.levelHelper.getLevelLocales(playerPos.level, false).length;
            var levelBlueprintPieces = this.getPendingBlueprintPiecesCount();
            if (unscoutedLocales === 0 && levelBlueprintPieces > 0 && Math.random() < 0.1) {
                    rewards.gainedBlueprintPiece = this.getResultBlueprint(null);
            }

            return rewards;
        },

        getScoutRewards: function () {
            var rewards = new ResultVO();

            var efficiency = this.getScavengeEfficiency();
            var sectorResources = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent).resourcesScavengable;

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

            var availableResources = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent).resourcesScavengable.clone();
            availableResources.addAll(localeVO.getResourceBonus(this.gameState.unlockedFeatures.resources));
            var efficiency = this.getScavengeEfficiency();
            var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
            var playerPos = this.playerLocationNodes.head.position;
            var levelOrdinal = this.gameState.getLevelOrdinal(playerPos.level);
            var localeDifficulty = localeVO.requirements.vision + localeVO.costs.stamina;

            rewards.gainedBlueprintPiece = this.getResultBlueprint(localeVO);
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
		
		getUseSpringRewards: function () {
			var rewards = new ResultVO();
			var playerBag = this.playerResourcesNodes.head.entity.get(ResourcesComponent).storageCapacity;
			var playerWater = this.playerResourcesNodes.head.entity.get(ResourcesComponent).resources.water;
			rewards.gainedResources = new ResourcesVO();
			rewards.gainedResources.water = playerBag - playerWater;
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
				rewards = this.getFadeOutResults(0.75, 1);
			}
			return rewards;
		},

        getFadeOutResults: function (loseInventoryProbability, injuryProbability) {
            var resultVO = new ResultVO();
            if (loseInventoryProbability > Math.random()) {
                resultVO.lostResources = this.playerResourcesNodes.head.resources.resources.clone();
                var playerItems = this.playerResourcesNodes.head.entity.get(ItemsComponent).getAll(false);
                var itemLoseProbability;
                for (var i = 0; i < playerItems.length; i++) {
					itemLoseProbability = 1;
					switch (playerItems[i].type) {
						case ItemConstants.itemTypes.bag:
						case ItemConstants.itemTypes.uniqueEquipment:
							itemLoseProbability = 0;
							break;
						
						case ItemConstants.itemTypes.follower:
                                                    itemLoseProbability = injuryProbability;
                                                    break;
						
						case ItemConstants.itemTypes.clothing:
						case ItemConstants.itemTypes.shoes:
						case ItemConstants.itemTypes.light:
						case ItemConstants.itemTypes.shades:
							itemLoseProbability = 0.55;
							break;
						
						default:
							itemLoseProbability = 0.95;
							break;
					}
					if (itemLoseProbability > Math.random()) resultVO.lostItems.push(playerItems[i].clone());
                }
            }

            resultVO.gainedInjuries = this.getResultInjuries(injuryProbability);

            return resultVO;
        },

		collectRewards: function (rewards) {
			var currentStorage = this.resourcesHelper.getCurrentStorage();
			var playerPos = this.playerLocationNodes.head.position;
			
			currentStorage.addResources(rewards.selectedResources);
			currentStorage.substractResources(rewards.discardedResources);
			currentStorage.substractResources(rewards.lostResources);

			var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			var sectorResources = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent).resourcesScavengable;
			for (var key in resourceNames) {
				var name = resourceNames[key];
				var amount = rewards.gainedResources.getResource(name);
				var inSector = sectorResources.getResource(name) > 0;
				if (amount > 0 && inSector) {
					sectorStatus.addDiscoveredResource(name);
				}
			}

			var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			if (rewards.selectedItems) {
				for (var i = 0; i < rewards.selectedItems.length; i++) {
					itemsComponent.addItem(rewards.selectedItems[i], !playerPos.inCamp);
				}
			}
			
			if (rewards.gainedFollowers) {
				for (var i = 0; i < rewards.gainedFollowers.length; i++) {
					itemsComponent.addItem(rewards.gainedFollowers[i], false);
				}
			}
			
			if (rewards.gainedBlueprintPiece) {
				this.tribeUpgradesNodes.head.upgrades.addNewBlueprintPiece(rewards.gainedBlueprintPiece);
				this.gameState.unlockedFeatures.blueprints = true;
			}

			if (rewards.lostItems) {
				for (var i = 0; i < rewards.lostItems.length; i++) {
					itemsComponent.discardItem(rewards.lostItems[i]);
				}
			}

			if (rewards.discardedItems) {
				for (var i = 0; i < rewards.discardedItems.length; i++) {
					itemsComponent.discardItem(rewards.discardedItems[i]);
				}
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

			if (rewards.selectedItems && rewards.selectedItems.length > 0) {
				msg += ", ";
				foundSomething = true;
				
				var loggedItems = {};
				for (var i = 0; i < rewards.selectedItems.length; i++) {
					var item = rewards.selectedItems[i];
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
		
		getRewardDiv: function (resultVO, isFight) {
			var div = "<div class='infobox infobox-temporary'>";
			
            var gainedhtml = "";
            gainedhtml += "<ul class='resultlist resultlist-positive'>";
			if (resultVO.gainedFollowers && resultVO.gainedFollowers.length > 0) {
				gainedhtml += "<li>" + resultVO.gainedFollowers.length + " follower" + (resultVO.gainedFollowers.length > 1 ? "s" : "");
				// gainedhtml += UIConstants.getItemList(resultVO.gainedFollowers);
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
			if (resultVO.gainedBlueprintPiece) {
				var blueprintVO = this.tribeUpgradesNodes.head.upgrades.getBlueprint(resultVO.gainedBlueprintPiece);
				if (blueprintVO) gainedhtml += UIConstants.getBlueprintPieceLI(blueprintVO);
			}
			gainedhtml += "</ul>";
			var hasGainedStuff = gainedhtml.indexOf("<li") > 0;
			if (hasGainedStuff) div += gainedhtml;
			
			if (resultVO.lostResources.getTotal() > 0 || resultVO.lostItems.length > 0) {
				var losthtml = "<div id='resultlist-loststuff' class='infobox'>";
				losthtml += "<div id='resultlist-loststuff-lost' class='infobox inventorybox'>";
				if (resultVO.lostResources) {
					losthtml += UIConstants.getResourceList(resultVO.lostResources);
				}
				if (resultVO.lostItems) {
					losthtml += UIConstants.getItemList(resultVO.lostItems);
				}
				losthtml += "</div>"
				losthtml += "</div>";
                div += losthtml;
			}
			
			if (resultVO.gainedResources || resultVO.gainedItems) {
				var baghtml = "<div id='resultlist-inventorymanagement' class='infobox'>";
				
				baghtml += "<div id='resultlist-inventorymanagement-found' class='infobox inventorybox'>";
				baghtml += "<ul></ul>";
				baghtml += "</div>"
				
				baghtml += "<div id='resultlist-inventorymanagement-kept' class='infobox inventorybox'>";
				baghtml += "<ul></ul>";
				baghtml += "</div>"
				
				baghtml += "</div>"
				div += baghtml;
			}
			
			hasGainedStuff = hasGainedStuff || resultVO.gainedResources.getTotal() > 0 || resultVO.gainedItems.length > 0;
			var hasLostStuff = resultVO.lostResources.getTotal() > 0 || resultVO.lostItems.length > 0;
			if (!hasGainedStuff && !hasLostStuff) {
				if (isFight) div += "<p>Nothing left behind.</p>"
				else div += "<p>Didn't find anything useful.</p>";
			}
			
			if (resultVO.gainedInjuries.length > 0) {
				div += "<p class='warning'>You got injured.</p>";
			}
                
			div += "</div>";
			return div;
		},
		
		logSpecialFinds: function (rewards) {
            var logComponent = this.playerStatsNodes.head.entity.get(LogMessagesComponent);
			var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			
			if (rewards.gainedBlueprintPiece) {
				var blueprintVO = this.tribeUpgradesNodes.head.upgrades.getBlueprint(rewards.gainedBlueprintPiece);
				if (blueprintVO.currentPieces === 1)
					logComponent.addMessage(LogConstants.MSG_ID_FOUND_BLUEPRINT_FIRST, "Found a piece of forgotten technology.");
			}
			
			if (rewards.selectedItems) {
				for (var i = 0; i < rewards.selectedItems.length; i++) {
					var item = rewards.selectedItems[i];
					if (itemsComponent.getCountById(item.id, true) === 1) {
						if (item.equippable && !item.equipped) continue;
						logComponent.addMessage(LogConstants.MSG_ID_FOUND_ITEM_FIRST, "Found a " + item.name + ".");
					}
				}
			}
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
				var resRoundTo = 1;
				var probability = 0.2;
				var resAmountFactor = 1;
				if (name === "metal") {
					probability = 0.98;
					resAmountFactor = 2;
				} else if (name === "water") {
					probability = 1;
					resAmountFactor = 3;
				} else if (name === "food") {
					probability = this.gameState.unlockedFeatures.resources[name] === true ? 0.3 : 0.75;
					resAmountFactor = 3;
					resRoundTo = 2;
				}
				probability = probability * probabilityFactor;
				var resultAmount = Math.random() < probability ?
					Math.ceil(amountFactor * resAmountFactor * resAmount * Math.random()) :
					0;
				
				if (resultAmount > 0 && resRoundTo > 1) {
					resultAmount = Math.ceil(resultAmount / resRoundTo) * resRoundTo;
				}

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
			if (necessityItem && Math.random() < itemProbability * 40) {
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
					if (currentItems.getCount(pendingItem, true) <= 0) item = pendingItem;
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
			var visitedSectors = this.gameState.numVisitedSectors;
			if (currentItems.getCurrentBonus(ItemConstants.itemTypes.bag) <= 0) {
				return ItemConstants.getBag(levelOrdinal);
			}
			if (visitedSectors > 4 && currentItems.getCountById(ItemConstants.itemDefinitions.uniqueEquipment[0].id, true) <= 0) {
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
			var upgradesComponent = this.tribeUpgradesNodes.head.upgrades;
			var levelBlueprints = UpgradeConstants.bluePrintsByCampOrdinal[campOrdinal];
			
			var blueprintsToFind = [];
			var blueprintPiecesToFind = this.getPendingBlueprintPiecesCount();
			for (var i = 0; i < levelBlueprints.length; i++) {
				var blueprintId = levelBlueprints[i];
				if (!upgradesComponent.hasUpgrade(blueprintId) && !upgradesComponent.hasAvailableBlueprint(blueprintId)) {
					blueprintsToFind.push(blueprintId);
				}
			}
			
			var unscoutedLocales = this.levelHelper.getLevelLocales(playerPos.level, false, localeVO).length + 1;
			
			var levelBlueprintProbability = blueprintPiecesToFind / unscoutedLocales;
			if (GameConstants.isDebugOutputEnabled)
				console.log(blueprintPiecesToFind + " / " + unscoutedLocales + " -> " + levelBlueprintProbability);
				
			if (Math.random() < levelBlueprintProbability) {
				return blueprintsToFind[Math.floor(Math.random() * blueprintsToFind.length)];
			} else {
				// TODO a change to get unfound upgrades from previous levels
			}
			
			return null;
		},
		
		getPendingBlueprintPiecesCount: function () {
			var playerPos = this.playerLocationNodes.head.position;
			var campOrdinal = this.gameState.getCampOrdinal(playerPos.level);
			var upgradesComponent = this.tribeUpgradesNodes.head.upgrades;
			var levelBlueprints = UpgradeConstants.bluePrintsByCampOrdinal[campOrdinal];
			
			var blueprintPiecesToFind = 0;
			
			for (var i = 0; i < levelBlueprints.length; i++) {
				var blueprintId = levelBlueprints[i];
				if (!upgradesComponent.hasUpgrade(blueprintId) && !upgradesComponent.hasAvailableBlueprint(blueprintId)) {
					var blueprintVO = upgradesComponent.getBlueprint(blueprintId);
					blueprintPiecesToFind += blueprintVO ? blueprintVO.maxPieces - blueprintVO.currentPieces : UpgradeConstants.getMaxPiecesForBlueprint(blueprintId);
				}
			}
			return blueprintPiecesToFind;
		},

    });

    return PlayerActionResultsHelper;
});