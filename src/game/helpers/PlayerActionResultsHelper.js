// Helper methods related to rewards from player actions such as scavenging and scouting
define([
    'ash',
    'utils/MathUtils',
    'game/GameGlobals',
    'game/constants/GameConstants',
    'game/constants/LocaleConstants',
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
    'game/components/common/CurrencyComponent',
    'game/components/common/LogMessagesComponent',
    'game/components/sector/SectorFeaturesComponent',
    'game/components/sector/SectorStatusComponent',
    'game/components/sector/SectorLocalesComponent',
    'game/components/player/ItemsComponent',
    'game/components/player/PerksComponent',
    'game/components/player/BagComponent',
    'game/vos/ResultVO',
    'game/vos/ResourcesVO',
	'game/vos/StashVO',
], function (
    Ash,
    MathUtils,
    GameGlobals,
    GameConstants,
    LocaleConstants,
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
    CurrencyComponent,
    LogMessagesComponent,
    SectorFeaturesComponent,
    SectorStatusComponent,
    SectorLocalesComponent,
    ItemsComponent,
    PerksComponent,
    BagComponent,
    ResultVO,
    ResourcesVO,
    StashVO
) {
    var PlayerActionResultsHelper = Ash.Class.extend({

        playerStatsNodes: null,
        playerResourcesNodes: null,
        playerLocationNodes: null,
        tribeUpgradesNodes: null,

        // probabilities of getting item of that type (relative, will be scaled to add up to 1)
        itemResultTypes: {
            scavenge: { bag: 0.1, light: 0.2, shoes: 0.15, weapon: 0.05, clothing: 0.3, exploration: 0.2, artefact: 0.01 },
            fight: { bag: 0, light: 0, shoes: 0.1, weapon: 0.5, clothing: 0.5, exploration: 0.25, artefact: 0.02 },
            meet: { bag: 0.1, light: 0.1, shoes: 0.1, weapon: 0.5, clothing: 0.5, exploration: 0.5, artefact: 0 }
        },

        constructor: function (engine) {
            this.engine = engine;

            this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
            this.playerResourcesNodes = engine.getNodeList(PlayerResourcesNode);
            this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
            this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
            this.nearestCampNodes = engine.getNodeList(NearestCampNode);
        },

        getResultVOByAction: function (action) {
            var baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(action);

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
                case "nap":
                    resultVO = this.getNapRewards();
                    break;
                default:
                    log.w("Unknown action: " + baseActionID + ". Can't create result vo.");
                    return null;
            }

            var playerVision = this.playerStatsNodes.head.vision.value;
            var loseInventoryProbability = PlayerActionConstants.getLoseInventoryProbability(action, playerVision);
            if (loseInventoryProbability > Math.random()) {
                resultVO.lostItems = this.getLostItems(action, true);
            }
            resultVO.gainedInjuries = this.getResultInjuries(PlayerActionConstants.getInjuryProbability(action, playerVision));

            return resultVO;
        },

        getScavengeRewards: function () {
            var rewards = new ResultVO("scavenge");

            var sectorFeatures = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
            var sectorResources = sectorFeatures.resourcesScavengable;
            var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
            var playerPos = this.playerLocationNodes.head.position;
            var levelOrdinal = GameGlobals.gameState.getLevelOrdinal(playerPos.level);
            var campOrdinal = GameGlobals.gameState.getCampOrdinal(playerPos.level);
            var step = GameGlobals.levelHelper.getCampStep(playerPos);
            var efficiency = this.getScavengeEfficiency();

            rewards.gainedResources = this.getRewardResources(0.95 + efficiency * 0.05, 1, efficiency, sectorResources);
            rewards.gainedItems = this.getRewardItems(0.01 + efficiency * 0.03, efficiency * 0.06, this.itemResultTypes.scavenge, efficiency, itemsComponent, campOrdinal, step);
            rewards.gainedCurrency = this.getRewardCurrency(efficiency);

            this.addStash(rewards, sectorFeatures.stash);
            rewards.gainedBlueprintPiece = this.getFallbackBlueprint(0.05 + efficiency * 0.15);

            return rewards;
        },

        getScoutRewards: function () {
            var rewards = new ResultVO("scout");

            var efficiency = this.getScavengeEfficiency();
            var sectorResources = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent).resourcesScavengable;

            rewards.gainedEvidence = 1;
            if (rewards.gainedInjuries.length === 0) {
                rewards.gainedResources = this.getRewardResources(0.5, 3, efficiency, sectorResources);
            }

            return rewards;
        },

        getScoutLocaleRewards: function (localeVO) {
            var rewards = new ResultVO("scout");
            var localeCategory = localeVO.getCategory();

            var availableResources = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent).resourcesScavengable.clone();
            availableResources.addAll(localeVO.getResourceBonus(GameGlobals.gameState.unlockedFeatures.resources));
            availableResources.limitAll(0, 10);
            var efficiency = this.getScavengeEfficiency();
            var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
            var playerPos = this.playerLocationNodes.head.position;
            var levelOrdinal = GameGlobals.gameState.getLevelOrdinal(playerPos.level);
            var campOrdinal = GameGlobals.gameState.getCampOrdinal(playerPos.level);
            var step = GameGlobals.levelHelper.getCampStep(playerPos);
            var localeDifficulty = (localeVO.requirements.vision[0] + localeVO.costs.stamina / 10) / 100;

            if (localeVO.type !== localeTypes.tradingpartner) {
                rewards.gainedBlueprintPiece = this.getResultBlueprint(localeVO);
            }

            if (localeCategory === "u") {
                rewards.gainedEvidence = campOrdinal;
                rewards.gainedPopulation = Math.random() < 0.05 ? 1 : 0;
            } else {
                rewards.gainedPopulation = Math.random() < 0.2 ? 1 : 0;
                rewards.gainedFollowers = this.getRewardFollowers(0.1);
            }

            if (rewards.gainedInjuries.length === 0 && localeVO.type !== localeTypes.tradingpartner) {
                if (localeCategory === "u") {
                    rewards.gainedResources = this.getRewardResources(1, 5 * localeDifficulty, efficiency, availableResources);
                    rewards.gainedItems = this.getRewardItems(0.25, 0, this.itemResultTypes.scavenge, 1, itemsComponent, campOrdinal, step);
                } else {
                    rewards.gainedItems = this.getRewardItems(0.25, this.itemResultTypes.meet, 1, itemsComponent, campOrdinal, step);
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

        getNapRewards: function () {
            var rewards = new ResultVO("nap");
            return rewards;
        },

		getFightRewards: function (won) {
			var rewards = new ResultVO("fight");
            if (won) {
				// TODO make fight rewards dependent on enemy difficulty (amount) and type (no metal drops from rats)
				var availableResources = new ResourcesVO();
				var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
				var playerPos = this.playerLocationNodes.head.position;
				var levelOrdinal = GameGlobals.gameState.getLevelOrdinal(playerPos.level);
                var campOrdinal = GameGlobals.gameState.getCampOrdinal(playerPos.level);
                var step = GameGlobals.levelHelper.getCampStep(playerPos);
				availableResources.setResource(resourceNames.food, 10);
				availableResources.setResource(resourceNames.metal, 3);
				rewards.gainedResources = this.getRewardResources(0.25, 2, this.getScavengeEfficiency(), availableResources);
                rewards.gainedItems = this.getRewardItems(0.05, 0.5, this.itemResultTypes.fight, 1, itemsComponent, campOrdinal, step);
				rewards.gainedReputation = 1;
            } else {
				// TODO lost followers?
				rewards = this.getFadeOutResults(0.5, 1, 1);
			}
			return rewards;
		},

        getFadeOutResults: function (loseInventoryProbability, injuryProbability, loseFollowerProbability) {
            var resultVO = new ResultVO("despair");
            if (loseInventoryProbability > Math.random()) {
                resultVO.lostResources = this.playerResourcesNodes.head.resources.resources.clone();
                resultVO.lostCurrency = this.playerResourcesNodes.head.entity.get(CurrencyComponent).currency;
                resultVO.lostItems = this.getLostItems("despair", false);
            }
            resultVO.lostFollowers = this.getLostFollowers(loseFollowerProbability, loseFollowerProbability);
            resultVO.gainedInjuries = this.getResultInjuries(injuryProbability);

            return resultVO;
        },

		collectRewards: function (isTakeAll, rewards, campSector) {
            if (rewards == null)
                return;
                
			var currentStorage = campSector ? GameGlobals.resourcesHelper.getCurrentCampStorage(campSector) : GameGlobals.resourcesHelper.getCurrentStorage();
			var playerPos = this.playerLocationNodes.head.position;

            if (isTakeAll) {
                rewards.selectedItems = rewards.gainedItems;
                rewards.selectedResources = rewards.gainedResources;
                rewards.discardedItems = [];
                rewards.discardedResources = new ResourcesVO();
            }

			currentStorage.addResources(rewards.selectedResources);
			currentStorage.substractResources(rewards.discardedResources);
			currentStorage.substractResources(rewards.lostResources);

            if (!campSector) {
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
            }

            var currencyComponent = this.playerStatsNodes.head.entity.get(CurrencyComponent);
            currencyComponent.currency += rewards.gainedCurrency;
            currencyComponent.currency -= rewards.lostCurrency;
            if (rewards.gainedCurrency > 0)
                GameGlobals.gameState.unlockedFeatures.currency = true;

			var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			if (rewards.selectedItems) {
				for (var i = 0; i < rewards.selectedItems.length; i++) {
					itemsComponent.addItem(rewards.selectedItems[i], !playerPos.inCamp && !campSector);
				}
			}

			if (rewards.gainedFollowers) {
				for (var i = 0; i < rewards.gainedFollowers.length; i++) {
					itemsComponent.addItem(rewards.gainedFollowers[i], false);
				}
			}

			if (rewards.gainedBlueprintPiece) {
				this.tribeUpgradesNodes.head.upgrades.addNewBlueprintPiece(rewards.gainedBlueprintPiece);
				GameGlobals.gameState.unlockedFeatures.blueprints = true;
			}

			if (rewards.lostItems) {
				for (var i = 0; i < rewards.lostItems.length; i++) {
					itemsComponent.discardItem(rewards.lostItems[i], false);
				}
			}

			if (rewards.lostFollowers) {
				for (var i = 0; i < rewards.lostFollowers.length; i++) {
					itemsComponent.discardItem(rewards.lostFollowers[i], false);
				}
			}

			if (rewards.discardedItems) {
				for (var i = 0; i < rewards.discardedItems.length; i++) {
					itemsComponent.discardItem(rewards.discardedItems[i], false);
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
					nearestCampNode.camp.population += 1;
				} else {
					log.w("No nearest camp found.");
				}
			}

            // TODO assign reputation to nearest camp

			if (rewards.gainedEvidence) this.playerStatsNodes.head.evidence.value += rewards.gainedEvidence;
			// if (rewards.gainedReputation) this.playerStatsNodes.head.reputation.value += rewards.gainedReputation;
			if (rewards.gainedRumours) this.playerStatsNodes.head.rumours.value += rewards.gainedRumours;
		},

		getRewardsMessage: function (rewards, baseMsg) {
			var msg = baseMsg;
			var replacements = [];
			var values = [];
			var foundSomething = rewards.gainedResources.getTotal() > 0;

			var resourceTemplate = TextConstants.getLogResourceText(rewards.gainedResources);
			msg += "Gained " + resourceTemplate.msg;
			replacements = replacements.concat(resourceTemplate.replacements);
			values = values.concat(resourceTemplate.values);

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
            var bagComponent = this.playerResourcesNodes.head.entity.get(BagComponent);
            var isInitialSelectionValid = bagComponent.usedCapacity <= bagComponent.totalCapacity;

			var div = "<div>";

            var gainedhtml = "";
            gainedhtml += "<ul class='resultlist resultlist-positive'>";
			if (resultVO.gainedFollowers && resultVO.gainedFollowers.length > 0) {
				gainedhtml += "<li>" + resultVO.gainedFollowers.length + " follower" + (resultVO.gainedFollowers.length > 1 ? "s" : "");
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
				gainedhtml += UIConstants.getBlueprintPieceLI(resultVO.gainedBlueprintPiece);
			}
            if (resultVO.gainedCurrency) {
                gainedhtml += "<li>" + resultVO.gainedCurrency + " silver</li>";
            }

			gainedhtml += "</ul>";
			var hasGainedStuff = gainedhtml.indexOf("<li") > 0;
			if (hasGainedStuff) div += gainedhtml;

			if (resultVO.lostResources.getTotal() > 0 || resultVO.lostItems.length > 0 || resultVO.lostCurrency > 0) {
				var losthtml = "<div id='resultlist-loststuff' class='infobox'>";
				losthtml += "<div id='resultlist-loststuff-lost' class='infobox inventorybox inventorybox-negative'>";
                losthtml += "<ul></ul>";
				losthtml += "</div>"
				losthtml += "</div>";
                div += losthtml;
			}

			if (resultVO.gainedResources.getTotal() > 0 || resultVO.gainedItems.length > 0 || !isInitialSelectionValid) {
				var baghtml = "<div id='resultlist-inventorymanagement'>";

				baghtml += "<div id='resultlist-inventorymanagement-found' class='infobox inventorybox'>";
				baghtml += "<ul></ul>";
				baghtml += "<p class='msg-empty p-meta'>" + (isFight ? "Nothing left of the opponent." : "Nothing left here.") + "</p>";
				baghtml += "</div>"

				baghtml += "<div id='resultlist-inventorymanagement-kept' class='infobox inventorybox'>";
				baghtml += "<ul></ul>";
                baghtml += "<p class='msg-empty p-meta'>Your " + (hasBag ? "bag is" : "pockets are") + " empty.</p>";
				baghtml += "</div>"

                baghtml += "<div id='inventory-popup-bar' class='progress-wrap progress' style='margin-top: 10px'><div class='progress-bar progress'/><span class='progress-label progress'>?/?</span></div>";
				baghtml += "</div>"
				div += baghtml;

			}

			hasGainedStuff = hasGainedStuff || resultVO.gainedResources.getTotal() > 0 || resultVO.gainedItems.length > 0;
			var hasLostStuff = resultVO.lostResources.getTotal() > 0 || resultVO.lostItems.length > 0 || resultVO.lostFollowers.length > 0 || resultVO.gainedInjuries.length > 0 || resultVO.lostCurrency > 0;
			if (!hasGainedStuff && !hasLostStuff) {
				if (isFight) div += "<p class='p-meta'>Nothing left behind.</p>"
                else if (resultVO.action === "despair") div += "";
				else div += "<p class='p-meta'>Didn't find anything useful.</p>";
			}
            
			if (resultVO.lostFollowers && resultVO.lostFollowers.length > 0) {
				div += "<p class='warning'>" + resultVO.lostFollowers.length + " followers left.</p>";
			}

			if (resultVO.gainedInjuries.length > 0) {
				div += "<p class='warning'>You got injured.</p>";
			}

			if (resultVO.lostCurrency > 0) {
				div += "<p class='warning'>You lost " + resultVO.lostCurrency + " silver.</p>";
			}

			div += "</div>";
			return div;
		},

		logResults: function (rewards) {
            var logComponent = this.playerStatsNodes.head.entity.get(LogMessagesComponent);
			var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);

            if (rewards) {
                if (rewards.gainedBlueprintPiece) {
                    if (!this.tribeUpgradesNodes.head.upgrades.hasUpgrade(rewards.gainedBlueprintPiece)) {
                        var blueprintVO = this.tribeUpgradesNodes.head.upgrades.getBlueprint(rewards.gainedBlueprintPiece);
                        if (blueprintVO.currentPieces === 1) {
                            logComponent.addMessage(LogConstants.MSG_ID_FOUND_BLUEPRINT_FIRST, "Found a piece of forgotten technology.");
                        }
                    }
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
                
                if (rewards.lostFollowers && rewards.lostFollowers.length > 0) {
                    logComponent.addMessage(LogConstants.MSG_ID_LOST_FOLLOWER, "Lost " + rewards.lostFollowers.length + "  followers.");
                }

                if (rewards.gainedInjuries.length > 0) {
                    logComponent.addMessage(LogConstants.MSG_ID_GOT_INJURED, LogConstants.getInjuredMessage(rewards));
                }
            }
		},

        // typically between 0-1 (can be boosted past 1)
		getScavengeEfficiency: function () {
			var playerVision = this.playerStatsNodes.head.vision.value;
			var playerHealth = this.playerStatsNodes.head.stamina.health;
            return (playerHealth / 100) * (playerVision / 100);
        },

        // probabilityFactor (action-specific): change to get any resources at all (0-1)
        // amountFactor (action-specific): relative amount of resources found if found any, where regular scavenge is 1
        // efficiency: 0-1 current scavenge efficiency of the player, affects chance to find something
        // available resources: name -> relative amount where regular scavenge is 0-10 depending on sector, affects both chance and amount
        // NOTE: Even if probabilityFactor and efficiency are 1 you can still get no results if availableResources are very scarce
		getRewardResources: function (probabilityFactor, amountFactor, efficiency, availableResources) {
			var results = new ResourcesVO();
            if (Math.random() > probabilityFactor)
                return results;

            if (!availableResources || !availableResources.getTotal || availableResources.getTotal() <= 0)
                return results;

			for (var key in resourceNames) {
				var name = resourceNames[key];
				var resQuantity = availableResources.getResource(name);
                if (resQuantity <= 0)
                    continue;
				var probability = resQuantity / 2.5;
                if (efficiency * probability < Math.random())
                    continue;
				var resMin = 1;
				var resAmountFactor = 1;
                switch (name) {
                    case resourceNames.metal:
                        resAmountFactor = 2;
                        break;
                    case resourceNames.food:
        				resAmountFactor = 2;
            			resMin = 3;
                        break;
                }
				var resultAmount = resQuantity * amountFactor * resAmountFactor * efficiency * Math.random();
                if (resultAmount === 0)
                    continue;
                resultAmount = Math.floor(resultAmount);
                resultAmount = MathUtils.clamp(resultAmount, resMin, 10);
				results.setResource(name, resultAmount);
			}

            // consolation prize: if found nothing at this point & sector contains plenty of metal, add 1 metal
            if (results.getTotal() === 0) {
                if (availableResources.getResource(resourceNames.metal) >= 5) {
                    results.setResource(resourceNames.metal, 1);
                }
            }

            // if result only consists of one resource, for convenience limit to free space -> can always use "take all"
            var names = results.getNames();
            if (names.length === 1) {
                var bagComponent = this.playerResourcesNodes.head.entity.get(BagComponent);
                var freeSpace = Math.floor(bagComponent.totalCapacity - bagComponent.usedCapacity);
                if (freeSpace > 0) {
                    results.setResource(names[0], Math.floor(Math.min(results.getResource(names[0]), freeSpace)));
                }
            }

			return results;
		},

        getRewardCurrency: function (efficiency) {
            if (efficiency < 0.5)
                return 0;

            if (Math.random() > 0.001)
                return 0;

            return Math.ceil(Math.random() * 3);
        },

		// itemProbability: 0-1 probability of finding one item
        // ingredientProbability: 0-1 probability of finding some ingredients
        // itemTypeLimits: list of item types and their probabilities ([ type: relative_probability ])
        // efficiency: 0-1 current scavenge efficiency of the player, affects chance to find something
        // currentItems: ItemsComponent
        // level ordinal: current location level ordinal
		getRewardItems: function (itemProbability, ingredientProbability, itemTypeLimits, efficiency, currentItems, campOrdinal, step) {
			var result = [];

			// Neccessity items (map, bag) that the player should find quickly if missing
			var necessityItem = this.getNecessityItem(itemProbability, itemTypeLimits, efficiency, currentItems, campOrdinal);
			if (necessityItem) {
				result.push(necessityItem);
			}

			// Normal items
            if (!necessityItem && Math.random() < itemProbability) {
                var item = this.getRewardItem(itemTypeLimits, efficiency, campOrdinal, step);
                if (item) result.push(item);
            }

			// Ingredients
			var hasBag = currentItems.getCurrentBonus(ItemConstants.itemBonusTypes.bag) > 0;
			if (hasBag && Math.random() < ingredientProbability) {
				var amount = Math.floor(Math.random() * efficiency * 5) + 1;
				var ingredient = GameGlobals.itemsHelper.getUsableIngredient();
				for (var i = 0; i <= amount; i++) {
					result.push(ingredient.clone());
				}
			}
            
			return result;
		},

		getRewardFollowers: function (probability) {
			var followers = [];
			if (Math.random() < probability) {
				var playerPos = this.playerLocationNodes.head.position;
				var campCount = GameGlobals.gameState.numCamps;
				var follower = ItemConstants.getFollower(playerPos.level, campCount);
				followers.push(follower);
			}
			return followers;
		},

        getRewardItem: function (itemTypeLimits, efficiency, campOrdinal, step) {
            // add limits to choose type
            var sum = 0;
            var limitsMin = {};
            var limitsMax = {};
            for (var type in itemTypeLimits) {
                if (this.isRewardItemTypeLocked(type)) continue;
                limitsMin[type] = sum;
                limitsMax[type] = sum + itemTypeLimits[type];
                sum += itemTypeLimits[type];
            }

            // select item type
            var itemTypeRand = Math.random() * sum;
            var itemType;
            for (var type in itemTypeLimits) {
                if (itemTypeRand >= limitsMin[type] && itemTypeRand < limitsMax[type]) {
                    itemType = type;
                    break;
                }
            }

            if (!itemType) {
                log.w("Could not determine reward item type.");
                log.i(itemTypeLimits);
            }

            // list possible items
            var items = [];
			var totalLevels = GameGlobals.gameState.getTotalLevels();
            switch (itemType) {
                case "bag":
                    items = ItemConstants.itemDefinitions.bag.slice(0);
                    break;
                case "light":
                    items = ItemConstants.itemDefinitions.light.slice(0);
                    break;
                case "shoes":
                    items = ItemConstants.itemDefinitions.shoes.slice(0);
                    break;
                case "weapon":
                    items = ItemConstants.itemDefinitions.weapon.slice(0);
                    break;
                case "clothing":
                    items = GameGlobals.itemsHelper.getScavengeRewardClothing(campOrdinal, step);
                    break;
                case "exploration":
                    items = ItemConstants.itemDefinitions.exploration.slice(0);
                    break;
                case "artefact":
                    items = ItemConstants.itemDefinitions.artefact.slice(0);
                    break;

                default:
                    log.w("No reward items defined for type: [" + itemType + "]");
                    break;
            }

            var validItems = [];
            var rarityThreshold = 1 + 9 * efficiency * Math.random();
            for (var i = 0; i < items.length; i++) {
                if (items[i].scavengeRarity <= 0)
                    continue;
                if (items[i].scavengeRarity > rarityThreshold)
                    continue;
                if (items[i].requiredCampOrdinal > campOrdinal)
                    continue;
                validItems.push(items[i]);
            }

            if (validItems.length === 0) {
                log.w("No valid reward items found for type: [" + itemType + "]");
                return null;
            }

            return validItems[Math.floor(Math.random() * validItems.length)].clone();
        },

		getNecessityItem: function (itemProbability, itemTypeLimits, efficiency, currentItems, campOrdinal) {
            var adjustedProbability = MathUtils.clamp(itemProbability * 5, 0.15, 0.35);

			// first bag
            if (itemTypeLimits.bag > 0) {
                if (currentItems.getCurrentBonus(ItemConstants.itemBonusTypes.bag) <= 0) {
                    var res = this.playerResourcesNodes.head.resources;
                    if (res.resources.getTotal() > 2) {
                        if (Math.random() < 0.5) {
                            return ItemConstants.getBag(1).clone();
                        }
                    }
                }
            }

            // map
            if (itemTypeLimits.exploration > 0) {
                var visitedSectors = GameGlobals.gameState.numVisitedSectors;
                var numSectorsRequiredForMap = 5;
                if (visitedSectors > numSectorsRequiredForMap && currentItems.getCountById(ItemConstants.itemDefinitions.uniqueEquipment[0].id, true) <= 0) {
                    if (Math.random() < adjustedProbability) {
                        return ItemConstants.itemDefinitions.uniqueEquipment[0].clone();
                    }
                }
            }

            // non-craftable level clothing
            if (itemTypeLimits.clothing > 0) {
                if (Math.random() < adjustedProbability * efficiency) {
                    var clothing = GameGlobals.itemsHelper.getScavengeNecessityClothing(campOrdinal, 1);
                    for (var i = 0; i < clothing.length; i++) {
                        if (currentItems.getCountById(clothing[i].id, true) <= 0) {
                            if (Math.random() < 0.25) {
                                return clothing[i];
                            }
                        }
                    }
                }
            }

			return null;
		},

        addStash: function (rewardsVO, stashVO) {
            if (!stashVO) return;
            var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
            if (sectorStatus.scavenged) return;
            log.i("found stash");
            switch (stashVO.stashType) {
                case StashVO.STASH_TYPE_ITEM:
                    for (var i = 0; i < stashVO.amount; i++) {
                        rewardsVO.gainedItems.push(ItemConstants.getItemByID(stashVO.itemID).clone());
                    }
                    break;
                case StashVO.STASH_TYPE_SILVER:
                    rewardsVO.gainedCurrency += stashVO.amount;
                    break;
            }
        },

        isRewardItemTypeLocked: function (itemType) {
            if (itemType === ItemConstants.itemBonusTypes.light) {
                return !GameGlobals.gameState.unlockedFeatures.vision;
            }
            return false;
        },

        getLostItems: function (action, loseSingleItem) {
            var lostItems = [];
            var playerItems = this.playerResourcesNodes.head.entity.get(ItemsComponent).getAll(false);

            if (playerItems.length <= 0)
                return lostItems;

            // make list with duplicates based on probabilities
            // ignore ingredients here, they're handled below
            var itemList = [];
            var numValidItems = 0;
            var probabilitySum = 0;
            for (var i = 0; i < playerItems.length; i++) {
                var item = playerItems[i];
                if (item.type == ItemConstants.itemTypes.ingredient) continue;
                var loseProbability = this.getItemLoseProbability(action, item);
                if (loseProbability <= 0) continue;
                var count = Math.round(loseProbability * 10);
                for (var j = 0; j < count; j++) {
                    itemList.push(item);
                }
                probabilitySum += loseProbability;
                numValidItems++;
            }
            
            // pick n items from the list
            if (numValidItems > 0) {
                var probabilityAvg = probabilitySum / numValidItems;
                var numMaxLost = probabilityAvg * 5;
                var numItems = loseSingleItem ? 1 : Math.ceil(Math.random() * numMaxLost);
                numItems = Math.min(numValidItems, numItems);

                for (var i = 0; i < numItems; i++) {
                    var itemi = Math.floor(Math.random() * itemList.length);
                    var selectedItem = itemList[itemi];
                    lostItems.push(selectedItem);
                    var optionsToRemove = [];
                    for (var j = 0; j < itemList.length; j++) {
                        if (itemList[j] == selectedItem) {
                            optionsToRemove.push(j);
                        }
                    }
                    itemList.splice(optionsToRemove[0], optionsToRemove.length);
                }
            }
            
            // ingredients: lose all or nothing
            if (!loseSingleItem) {
                for (var i = 0; i < playerItems.length; i++) {
                    var item = playerItems[i];
                    if (item.type !== ItemConstants.itemTypes.ingredient) continue;
                    lostItems.push(item);
                }
            }
            
            return lostItems;
        },

        getItemLoseProbability: function (action, item) {
            var campCount = GameGlobals.gameState.numCamps;
            var itemLoseProbability = 1;
            switch (item.type) {
                case ItemConstants.itemTypes.bag:
                case ItemConstants.itemTypes.uniqueEquipment:
                    itemLoseProbability = 0;
                    break;
                case ItemConstants.itemTypes.follower:
                    itemLoseProbability = action === "despair" ? 1 : 0;
                    break;
                case ItemConstants.itemTypes.clothing_over:
                case ItemConstants.itemTypes.clothing_upper:
                case ItemConstants.itemTypes.clothing_lower:
                case ItemConstants.itemTypes.clothing_head:
                case ItemConstants.itemTypes.clothing_hands:
                case ItemConstants.itemTypes.shoes:
                    itemLoseProbability = 0.55;
                    break;
                case ItemConstants.itemTypes.light:
                    itemLoseProbability = campCount > 0 ? 0.55 : 0;
                    break;
                case ItemConstants.itemTypes.follower:
                case ItemConstants.itemTypes.ingredient:
                    itemLoseProbability = 0;
                    break;
                default:
                    itemLoseProbability = 0.95;
                    break;
            }
            if (item.equipped)
                itemLoseProbability = itemLoseProbability / 2;
            return itemLoseProbability;
        },
        
        getLostFollowers: function (loseAllProbability, loseOneProbability) {
            var lostFollowers = [];
            if (loseAllProbability <= 0 && loseOneProbability <= 0)
                return lostFollowers;
                
            var playerFollowers = this.playerResourcesNodes.head.entity.get(ItemsComponent).getAllByType(ItemConstants.itemTypes.follower);
            if (playerFollowers.length < 1)
                return lostFollowers;
                
            var loseAll = Math.random() < loseAllProbability;
            var loseOne = Math.random() < loseOneProbability;
            
            if (loseAll) {
                lostFollowers = playerFollowers.concat();
            } else if (loseOne) {
                var index = Math.floor(playerFollowers.length * Math.random());
                lostFollowers =playerFollowers[index];
            }
            
            return lostFollowers;
        },

		getResultInjuries: function (injuryProbability) {
            var perksComponent = this.playerStatsNodes.head.entity.get(PerksComponent);
			var result = [];

            var currentEffect = perksComponent.getTotalEffect(PerkConstants.perkTypes.injury);
            var injuries = perksComponent.getPerksByType(PerkConstants.perkTypes.injury);

            // limit possible injuries
            if (currentEffect < 0.35 || injuries.length >= 5)
                return result;

			if (injuryProbability * currentEffect > Math.random()) {
				var injuryi = parseInt(Math.random() * PerkConstants.perkDefinitions.injury.length);
				var injury = PerkConstants.perkDefinitions.injury[injuryi];
                result.push(injury.clone());
            }
			return result;
		},

		getResultBlueprint: function (localeVO) {
			var playerPos = this.playerLocationNodes.head.position;
			var campOrdinal = GameGlobals.gameState.getCampOrdinal(playerPos.level);
            var blueprintType = localeVO.isEarly ? UpgradeConstants.BLUEPRINT_TYPE_EARLY : UpgradeConstants.BLUEPRINT_TYPE_LATE;
			var levelBlueprints = UpgradeConstants.getblueprintsByCampOrdinal(campOrdinal, blueprintType);

			var upgradesComponent = this.tribeUpgradesNodes.head.upgrades;
			var blueprintsToFind = [];
			var blueprintPiecesToFind = 0;
			for (var i = 0; i < levelBlueprints.length; i++) {
				var blueprintId = levelBlueprints[i];
				if (!upgradesComponent.hasUpgrade(blueprintId) && !upgradesComponent.hasAvailableBlueprint(blueprintId)) {
					blueprintsToFind.push(blueprintId);
					var blueprintVO = upgradesComponent.getBlueprint(blueprintId);
					blueprintPiecesToFind += blueprintVO ? blueprintVO.maxPieces - blueprintVO.currentPieces : UpgradeConstants.getMaxPiecesForBlueprint(blueprintId);
				}
			}
            
            var bracket = localeVO.getBracket();
			var unscoutedLocales = GameGlobals.levelHelper.getLevelLocales(playerPos.level, false, bracket, localeVO).length + 1;
			var levelBlueprintProbability = blueprintPiecesToFind / unscoutedLocales;
            
            log.i("get result blueprint: " + blueprintType + " | pieces to find: " + blueprintPiecesToFind + " / unscouted locales: " + unscoutedLocales);
            log.i(levelBlueprints);

			if (Math.random() < levelBlueprintProbability) {
				return blueprintsToFind[Math.floor(Math.random() * blueprintsToFind.length)];
			}

			return null;
		},
        
        getFallbackBlueprint: function (probability) {
            var missedBlueprints = [];
			var playerPos = this.playerLocationNodes.head.position;
			var upgradesComponent = this.tribeUpgradesNodes.head.upgrades;
			var campOrdinal = GameGlobals.gameState.getCampOrdinal(playerPos.level);
            for (var i = 1; i <= campOrdinal; i++) {
                // NOTE: this assumes campable levels don't have blueprints
                var levelOrdinal = GameGlobals.gameState.getLevelOrdinalForCampOrdinal(i);
                var level = GameGlobals.gameState.getLevelForOrdinal(levelOrdinal);
                var unscoutedLocales = GameGlobals.levelHelper.getLevelLocales(level, false, null).length;
                if (unscoutedLocales === 0) {
                    var levelBlueprints = UpgradeConstants.getblueprintsByCampOrdinal(i);
                    var blueprintsToFind = [];
        			for (var j = 0; j < levelBlueprints.length; j++) {
		                var blueprintId = levelBlueprints[j];
		                if (!upgradesComponent.hasUpgrade(blueprintId) && !upgradesComponent.hasAvailableBlueprint(blueprintId)) {
		                   missedBlueprints.push(blueprintId);
		               }
                   }
                }
            }
            
            if (missedBlueprints.length > 0) {
                log.w("Found missed blueprints: " + missedBlueprints.join(","));
                if (Math.random() < probability) {
                    return missedBlueprints[0];
                }
            }
            return null;
        },

    });

    return PlayerActionResultsHelper;
});
