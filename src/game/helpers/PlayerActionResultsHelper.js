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
    'game/components/common/LogMessagesComponent',
    'game/components/sector/SectorFeaturesComponent',
    'game/components/sector/SectorStatusComponent',
    'game/components/sector/SectorLocalesComponent',
    'game/components/player/ItemsComponent',
    'game/components/player/PerksComponent',
    'game/components/player/BagComponent',
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
    LogMessagesComponent,
    SectorFeaturesComponent,
    SectorStatusComponent,
    SectorLocalesComponent,
    ItemsComponent,
    PerksComponent,
    BagComponent,
    ResultVO,
    ResourcesVO
) {
    var PlayerActionResultsHelper = Ash.Class.extend({

        gameState: null,
        playerActionsHelper: null,
        resourcesHelper: null,
        levelHelper: null,
        itemsHelper: null,

        playerStatsNodes: null,
        playerResourcesNodes: null,
        playerLocationNodes: null,
        tribeUpgradesNodes: null,

        // probabilities of getting item of that type, Math.random() < prob, else artefact
        itemResultTypes: {
            scavenge: { bag: 0.1, light: 0.20, shoes: 0.35, weapon: 0.55, clothing: 0.85, exploration: 0.998 },
            fight: { bag: 0, light: 0, shoes: 0.2, weapon: 0.4, clothing: 0.55, exploration: 0.6 },
            meet: { bag: 0.1, light: 0.2, shoes: 0.3, weapon: 0.5, clothing: 0.7, exploration: 0.8 }
        },

        constructor: function (engine, gameState, playerActionsHelper, resourcesHelper, levelHelper, itemsHelper) {
            this.engine = engine;
            this.gameState = gameState;
            this.playerActionsHelper = playerActionsHelper;
            this.resourcesHelper = resourcesHelper;
            this.levelHelper = levelHelper;
            this.itemsHelper = itemsHelper;
            this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
            this.playerResourcesNodes = engine.getNodeList(PlayerResourcesNode);
            this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
            this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
            this.nearestCampNodes = engine.getNodeList(NearestCampNode);
        },
        
        getResultVOByAction: function (action) {
            var baseActionID = this.playerActionsHelper.getBaseActionID(action);
            var resultVO;
            switch (baseActionID) {
                case "scavenge":
                    resultVO = this.getScavengeRewards();                    
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
                case "use_spring":
                    resultVO = this.getUseSpringRewards();
                    break;
                case "clear_workshop":
                    resultVO = this.getClearWorkshopRewards();
                    break;
                default:
                    if (GameConstants.isDebugOutputEnabled) console.log("WARN: Unknown action: " + baseActionID + ". Can't create result vo.");
                    return null;
            }
            
            var playerVision = this.playerStatsNodes.head.vision.value;
            var loseInventoryProbability = PlayerActionConstants.getLoseInventoryProbability(action, playerVision);
            if (loseInventoryProbability > Math.random()) {
                resultVO.lostItems = this.getLostItems(action);
            }
            resultVO.gainedInjuries = this.getResultInjuries(PlayerActionConstants.getInjuryProbability(action, playerVision));
            
            return resultVO;
        },

        getScavengeRewards: function () {
            var rewards = new ResultVO("scavenge");

            var sectorResources = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent).resourcesScavengable;
            var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
            var playerPos = this.playerLocationNodes.head.position;
            var levelOrdinal = this.gameState.getLevelOrdinal(playerPos.level);
            var efficiency = this.getScavengeEfficiency();

            rewards.gainedResources = this.getRewardResources(1, efficiency, sectorResources);
            rewards.gainedItems = this.getRewardItems(0.007, 0.05, this.itemResultTypes.scavenge, itemsComponent, levelOrdinal);

            // should never be needed, but as a fallback
            var unscoutedLocales = this.levelHelper.getLevelLocales(playerPos.level, false, false).length;
            var levelBlueprintPieces = this.getPendingBlueprintPiecesCount();
            if (unscoutedLocales === 0 && levelBlueprintPieces > 0 && Math.random() < 0.07) {
                rewards.gainedBlueprintPiece = this.getResultBlueprint(null);
            }

            return rewards;
        },

        getScoutRewards: function () {
            var rewards = new ResultVO("scout");

            var playerVision = this.playerStatsNodes.head.vision.value;
            var efficiency = this.getScavengeEfficiency();
            var sectorResources = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent).resourcesScavengable;
           
            rewards.gainedEvidence = 1;
            if (rewards.gainedInjuries.length === 0) {
                rewards.gainedResources = this.getRewardResources(0.5, efficiency * 2, sectorResources);
            }

            return rewards;
        },

        getScoutLocaleRewards: function (localeVO) {
            var rewards = new ResultVO("scout");
            var localeCategory = localeVO.getCategory();
            
            var playerVision = this.playerStatsNodes.head.vision.value;

            var availableResources = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent).resourcesScavengable.clone();
            availableResources.addAll(localeVO.getResourceBonus(this.gameState.unlockedFeatures.resources));
            var efficiency = this.getScavengeEfficiency();
            var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
            var playerPos = this.playerLocationNodes.head.position;
            var levelOrdinal = this.gameState.getLevelOrdinal(playerPos.level);
            var localeDifficulty = localeVO.requirements.vision[0] + localeVO.costs.stamina;

            rewards.gainedBlueprintPiece = this.getResultBlueprint(localeVO);
            if (localeCategory === "u") {
                rewards.gainedEvidence = 1;
                rewards.gainedPopulation = Math.random() < 0.05 ? 1 : 0;
            } else {
                rewards.gainedPopulation = Math.random() < 0.2 ? 1 : 0;
                rewards.gainedFollowers = this.getRewardFollowers(0.1);
                rewards.gainedRumours = Math.random() < 0.3 ? Math.ceil(Math.random() * levelOrdinal * levelOrdinal) : 0;
            }

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
			var rewards = new ResultVO("use_spring");
            var bagComponent = this.playerResourcesNodes.head.entity.get(BagComponent);
			rewards.gainedResources = new ResourcesVO();
			rewards.gainedResources.water = bagComponent.totalCapacity -  bagComponent.usedCapacity;
			return rewards;
		},
        
        getClearWorkshopRewards: function () {
            var rewards = new ResultVO("clear_workshop");
            return rewards;
        },
		
		getFightRewards: function (won) {
			var rewards = new ResultVO("fight");
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
            var resultVO = new ResultVO("despair");
            if (loseInventoryProbability > Math.random()) {
                resultVO.lostResources = this.playerResourcesNodes.head.resources.resources.clone();
                resultVO.lostItems = this.getLostItems("despair");
            }

            resultVO.gainedInjuries = this.getResultInjuries(injuryProbability);

            return resultVO;
        },

		collectRewards: function (isTakeAll, rewards) {
			var currentStorage = this.resourcesHelper.getCurrentStorage();
			var playerPos = this.playerLocationNodes.head.position;
            
            if (isTakeAll) {
                rewards.selectedItems = rewards.gainedItems;
                rewards.selectedResources = rewards.gainedResources;
                rewards.discardedItems = [];
                rewards.discardedResources = null;
            }
			
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
            var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
            var hasBag = itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.bag) > 0;
            
			var div = "<div>";
			
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
				losthtml += "<div id='resultlist-loststuff-lost' class='infobox inventorybox inventorybox-negative'>";
                losthtml += "<ul></ul>";
				losthtml += "</div>"
				losthtml += "</div>";
                div += losthtml;
			}
			
			if (resultVO.gainedResources.getTotal() > 0 || resultVO.gainedItems.length > 0) {
				var baghtml = "<div id='resultlist-inventorymanagement'>";
				
				baghtml += "<div id='resultlist-inventorymanagement-found' class='infobox inventorybox'>";
				baghtml += "<ul></ul>";
				baghtml += "<p class='msg-empty'>" + (isFight ? "Nothing left of the enemy." : "Nothing left here.") + "<p>";
				baghtml += "</div>"
				
				baghtml += "<div id='resultlist-inventorymanagement-kept' class='infobox inventorybox'>";
				baghtml += "<ul></ul>";
                baghtml += "<p class='msg-empty'>Your " + (hasBag ? "bag is" : "pockets are") + " empty.<p>";
				baghtml += "</div>"
				
                baghtml += "<div id='inventory-popup-bar' class='progress-wrap progress' style='margin-top: 10px'><div class='progress-bar progress'/><span class='progress-label progress'>?/?</span></div>";
				baghtml += "</div>"
				div += baghtml;
                
			}
			
			hasGainedStuff = hasGainedStuff || resultVO.gainedResources.getTotal() > 0 || resultVO.gainedItems.length > 0;
			var hasLostStuff = resultVO.lostResources.getTotal() > 0 || resultVO.lostItems.length > 0 || resultVO.gainedInjuries.length > 0;
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
		
		logResults: function (rewards) {
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
            
            if (rewards.lostItems && rewards.lostItems.length > 0) {
                var messageTemplate = LogConstants.getLostItemMessage(rewards);
                logComponent.addMessage(LogConstants.MSG_ID_LOST_ITEM, messageTemplate.msg, messageTemplate.replacements, messageTemplate.values);
            }
            
            if (rewards.gainedInjuries.length > 0) {
                logComponent.addMessage(LogConstants.MSG_ID_GOT_INJURED, LogConstants.getInjuredMessage(rewards));
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
            
            // if result only consists of metal, for convenience limit to free space -> can always use "take all"
            if (results.getTotal() === results.getResource(resourceNames.metal)) {
                var bagComponent = this.playerResourcesNodes.head.entity.get(BagComponent);
                var freeSpace = Math.floor(bagComponent.totalCapacity - bagComponent.usedCapacity);
                if (freeSpace > 0) {
                    results.setResource(resourceNames.metal, Math.floor(Math.min(results.getResource(resourceNames.metal), freeSpace)));
                }
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
				}  else if (itemTypeRand < itemTypeLimits.light) {
					pendingItem = ItemConstants.getLight(levelOrdinal);
				} else if (itemTypeRand < itemTypeLimits.shoes) {
					item = ItemConstants.getShoes(levelOrdinal);
				} else if (itemTypeRand < itemTypeLimits.weapon) {
					item = ItemConstants.getDefaultWeapon(levelOrdinal, totalLevels);
                } else if (itemTypeRand < itemTypeLimits.clothing) {
                    item = this.itemsHelper.getScavengeRewardClothing(levelOrdinal, totalLevels);
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
			var hasBag = currentItems.getCurrentBonus(ItemConstants.itemBonusTypes.bag) > 0;
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
            var numSectorsRequiredForMap = 4;
			if (currentItems.getCurrentBonus(ItemConstants.itemBonusTypes.bag) <= 0) {
				return ItemConstants.getBag(levelOrdinal);
			}
			if (visitedSectors > numSectorsRequiredForMap && currentItems.getCountById(ItemConstants.itemDefinitions.uniqueEquipment[0].id, true) <= 0) {
				return ItemConstants.itemDefinitions.uniqueEquipment[0].clone();
			}
			return null;
		},

        getLostItems: function(action) {
            var lostItems = [];
            var playerItems = this.playerResourcesNodes.head.entity.get(ItemsComponent).getAll(false);

            // TODO choose more random item to lose when losing just one item
            var isSingle = action === "despair" ? false : true;
            var loseFollowerProbability = action === "despair" ? 1 : 0;
            
            var itemLoseProbability;
            for (var i = 0; i < playerItems.length; i++) {
                itemLoseProbability = 1;
                switch (playerItems[i].type) {
                    case ItemConstants.itemTypes.bag:
                    case ItemConstants.itemTypes.uniqueEquipment:
                        itemLoseProbability = 0;
                        break;
                    case ItemConstants.itemTypes.follower:
                        itemLoseProbability = loseFollowerProbability;
                        break;
                    case ItemConstants.itemTypes.clothing_over:
                    case ItemConstants.itemTypes.clothing_upper:
                    case ItemConstants.itemTypes.clothing_lower:
                    case ItemConstants.itemTypes.clothing_head:
                    case ItemConstants.itemTypes.clothing_hands:
                    case ItemConstants.itemTypes.shoes:
                    case ItemConstants.itemTypes.light:
                        itemLoseProbability = 0.55;
                        break;
                    default:
                        itemLoseProbability = 0.95;
                        break;
                }
                if (itemLoseProbability > Math.random()) lostItems.push(playerItems[i]);
                if (lostItems.length > 0 && isSingle) break;
            }
            return lostItems;
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
			
			var unscoutedLocales = this.levelHelper.getLevelLocales(playerPos.level, false, false, localeVO).length + 1;
			
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