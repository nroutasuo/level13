// Helper methods related to rewards from player actions such as scavenging and scouting
define([
	'ash',
	'text/Text',
	'utils/MathUtils',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/ExplorationConstants',
	'game/constants/FightConstants',
	'game/constants/FollowerConstants',
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
	'game/nodes/NearestCampNode',
	'game/components/common/ResourcesComponent',
	'game/components/common/CurrencyComponent',
	'game/components/common/LogMessagesComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/sector/SectorLocalesComponent',
	'game/components/player/ItemsComponent',
	'game/components/player/BagComponent',
	'game/components/player/DeityComponent',
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
	ExplorationConstants,
	FightConstants,
	FollowerConstants,
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
	NearestCampNode,
	ResourcesComponent,
	CurrencyComponent,
	LogMessagesComponent,
	SectorFeaturesComponent,
	SectorStatusComponent,
	SectorLocalesComponent,
	ItemsComponent,
	BagComponent,
	DeityComponent,
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

		// probabilities of getting item of that type (relative, will be scaled to add up to 1)
		itemResultTypes: {
			scavenge: { bag: 0.1, light: 0.05, shoes: 0.15, weapon: 0.1, clothing: 0.4, exploration: 0.2, artefact: 0.01 },
			fight: { bag: 0, light: 0, shoes: 0.1, weapon: 0.5, clothing: 0.5, exploration: 0.25, artefact: 0.02 },
			meet: { bag: 0.05, light: 0, shoes: 0.1, weapon: 0.5, clothing: 0.5, exploration: 0.5, artefact: 0 }
		},

		constructor: function (engine) {
			this.engine = engine;

			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			this.playerResourcesNodes = engine.getNodeList(PlayerResourcesNode);
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
			this.nearestCampNodes = engine.getNodeList(NearestCampNode);
			this.campNodes = engine.getNodeList(CampNode);
		},

		getResultVOByAction: function (action, hasCustomReward) {
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
				case "clear_waste_r":
				case "clear_waste_t":
				case "wait":
					resultVO = new ResultVO(baseActionID);
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
			resultVO.hasCustomReward = hasCustomReward;

			return resultVO;
		},

		getScavengeRewards: function () {
			var rewards = new ResultVO("scavenge");

			var sectorFeatures = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			var sectorResources = sectorFeatures.resourcesScavengable;
			var sectorIngredients = sectorFeatures.itemsScavengeable;
			var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			var playerPos = this.playerLocationNodes.head.position;
			var levelOrdinal = GameGlobals.gameState.getLevelOrdinal(playerPos.level);
			var campOrdinal = GameGlobals.gameState.getCampOrdinal(playerPos.level);
			var step = GameGlobals.levelHelper.getCampStep(playerPos);
			var levelComponent = GameGlobals.levelHelper.getLevelEntityForPosition(playerPos.level).get(LevelComponent);
			var isHardLevel = levelComponent.isHard;
			var efficiency = this.getCurrentScavengeEfficiency();

			rewards.gainedResources = this.getRewardResources(1, 1, efficiency, sectorResources);
			rewards.gainedItems = this.getRewardItems(0.02, 0.25, this.itemResultTypes.scavenge, sectorIngredients, efficiency, itemsComponent, campOrdinal, step, isHardLevel);
			rewards.gainedCurrency = this.getRewardCurrency(efficiency);
			
			this.addStashes(rewards, sectorFeatures.stashes, sectorStatus.stashesFound);
			rewards.gainedBlueprintPiece = this.getFallbackBlueprint(0.05 + efficiency * 0.15);
			
			this.addFollowerBonuses(rewards, sectorResources, sectorIngredients, this.itemResultTypes.scavenge);

			return rewards;
		},

		getScoutRewards: function () {
			var rewards = new ResultVO("scout");
			rewards.gainedEvidence = 1;
			return rewards;
		},

		getScoutLocaleRewards: function (localeVO) {
			var rewards = new ResultVO("scout");
			var localeCategory = localeVO.getCategory();
			var playerPos = this.playerLocationNodes.head.position;
			var levelOrdinal = GameGlobals.gameState.getLevelOrdinal(playerPos.level);
			var campOrdinal = GameGlobals.gameState.getCampOrdinal(playerPos.level);

			var availableResources = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent).resourcesScavengable.clone();
			availableResources.addAll(localeVO.getResourceBonus(GameGlobals.gameState.unlockedFeatures.resources, campOrdinal));
			availableResources.limitAll(0, 10);
			var efficiency = this.getCurrentScavengeEfficiency();
			var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			var step = GameGlobals.levelHelper.getCampStep(playerPos);
			var levelComponent = GameGlobals.levelHelper.getLevelEntityForPosition(playerPos.level).get(LevelComponent);
			var isHardLevel = levelComponent.isHard;
			var localeDifficulty = (localeVO.requirements.vision[0] + localeVO.costs.stamina / 10) / 100;

			// blueprints
			rewards.gainedBlueprintPiece = this.getResultBlueprint(localeVO);
			
			// tribe stats
			if (localeVO.type == localeTypes.grove) {
				rewards.gainedFavour = 2;
			} else if (localeVO.type == localeTypes.tradingpartner) {
			} else {
				rewards.gainedEvidence = ExplorationConstants.getScoutLocaleReward(localeVO.type, campOrdinal);
			}
			
			let followerID = localeVO.followerID;
			if (followerID) {
				rewards.gainedFollowers = [ FollowerConstants.getNewPredefinedFollower(followerID) ];
			} else {
				if (localeVO.type !== localeTypes.tradingpartner && localeVO.type != localeTypes.grove) {
					// population and followers
					if (localeCategory !== "u") {
						rewards.gainedFollowers = this.getRewardFollowers(0.075);
						if (rewards.gainedFollowers.length == 0 && this.nearestCampNodes.head && campOrdinal > 1) {
							rewards.gainedPopulation = Math.random() < 0.1 ? 1 : 0;
						}
					}
					
					// items and resources
					if (localeCategory === "u") {
						rewards.gainedResources = this.getRewardResources(1, 5 * localeDifficulty, efficiency, availableResources);
						rewards.gainedItems = this.getRewardItems(0.5, 0, this.itemResultTypes.scavenge, null, 1, itemsComponent, campOrdinal, step, isHardLevel);
					} else {
						rewards.gainedItems = this.getRewardItems(0.25, 0, this.itemResultTypes.meet, null, 1, itemsComponent, campOrdinal, step, isHardLevel);
					}
				}
			}

			return rewards;
		},

		getUseSpringRewards: function () {
			var rewards = new ResultVO("use_spring");
			var bagComponent = this.playerResourcesNodes.head.entity.get(BagComponent);
			var water = Math.floor(Math.min(bagComponent.totalCapacity - bagComponent.usedCapacity, 30));
			rewards.gainedResources = new ResourcesVO();
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
			var rewards = new ResultVO("fight");
			if (won) {
				// TODO make fight rewards dependent on enemy difficulty (amount)
				var availableResources = this.getAvailableResourcesForEnemy(enemyVO);
				var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
				var playerPos = this.playerLocationNodes.head.position;
				var levelOrdinal = GameGlobals.gameState.getLevelOrdinal(playerPos.level);
				var campOrdinal = GameGlobals.gameState.getCampOrdinal(playerPos.level);
				var step = GameGlobals.levelHelper.getCampStep(playerPos);
				var levelComponent = GameGlobals.levelHelper.getLevelEntityForPosition(playerPos.level).get(LevelComponent);
				var isHardLevel = levelComponent.isHard;
				
				rewards.gainedResources = this.getRewardResources(0.5, 2, this.getCurrentScavengeEfficiency(), availableResources);
				rewards.gainedItems = this.getRewardItems(0, 1, this.itemResultTypes.fight, enemyVO.droppedIngredients, 1, itemsComponent, campOrdinal, step, isHardLevel);
				rewards.gainedReputation = 1;
			} else {
				rewards = this.getFadeOutResults(0.5, 1, 1);
			}
			return rewards;
		},

		getFadeOutResults: function (loseInventoryProbability, injuryProbability, loseFollowerProbability) {
			var resultVO = new ResultVO("despair");
			if (Math.random() < loseInventoryProbability) {
				resultVO.lostResources = this.playerResourcesNodes.head.resources.resources.clone();
				resultVO.lostCurrency = this.playerResourcesNodes.head.entity.get(CurrencyComponent).currency;
				resultVO.lostItems = this.getLostItems("despair", false);
			}
			resultVO.lostFollowers = this.getLostFollowers(loseFollowerProbability);
			resultVO.gainedInjuries = this.getResultInjuries(injuryProbability);

			return resultVO;
		},

		collectRewards: function (isTakeAll, rewards, campSector) {
			if (rewards == null || rewards.isEmpty()) {
				return;
			}
			
			if (rewards.action == "scavenge") {
				var excursionComponent = this.playerResourcesNodes.head.entity.get(ExcursionComponent);
				if (excursionComponent) {
					if (this.isSomethingUsefulResult(rewards)) {
						excursionComponent.numConsecutiveScavengeUseless = 0;
					} else {
						excursionComponent.numConsecutiveScavengeUseless++;
					}
				}
			}
			
			var nearestCampNode = this.nearestCampNodes.head;
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
				for (let i = 0; i < rewards.gainedItems.length; i++) {
					let item = rewards.gainedItems[i];
					if (item.type == ItemConstants.itemTypes.ingredient) {
						sectorStatus.addDiscoveredItem(item.id);
					}
				}
			}

			var currencyComponent = this.playerStatsNodes.head.entity.get(CurrencyComponent);
			currencyComponent.currency += rewards.gainedCurrency;
			currencyComponent.currency -= rewards.lostCurrency;
			if (rewards.gainedCurrency > 0)
				GameGlobals.gameState.unlockedFeatures.currency = true;

			var itemsComponent = this.playerStatsNodes.head.items;
			if (rewards.selectedItems) {
				for (let i = 0; i < rewards.selectedItems.length; i++) {
					GameGlobals.playerHelper.addItem(rewards.selectedItems[i], playerPos);
				}
			}
			
			var followersComponent = this.playerStatsNodes.head.followers;
			if (rewards.gainedFollowers) {
				for (let i = 0; i < rewards.gainedFollowers.length; i++) {
					let follower = rewards.gainedFollowers[i];
					if (this.willGainedFollowerJoinParty(follower)) {
						followersComponent.addFollower(follower);
						followersComponent.setFollowerInParty(follower, true);
						GlobalSignals.followersChangedSignal.dispatch();
					} else if (nearestCampNode) {
						nearestCampNode.camp.pendingRecruits.push(follower);
					}
				}
				GameGlobals.gameState.unlockedFeatures.followers = true;
			}

			if (rewards.gainedBlueprintPiece) {
				this.tribeUpgradesNodes.head.upgrades.addNewBlueprintPiece(rewards.gainedBlueprintPiece);
				GameGlobals.gameState.unlockedFeatures.blueprints = true;
			}

			if (rewards.lostItems) {
				for (let i = 0; i < rewards.lostItems.length; i++) {
					itemsComponent.discardItem(rewards.lostItems[i], false);
				}
			}

			if (rewards.lostFollowers) {
				for (let i = 0; i < rewards.lostFollowers.length; i++) {
					followersComponent.removeFollower(rewards.lostFollowers[i]);
				}
			}

			if (rewards.discardedItems) {
				for (let i = 0; i < rewards.discardedItems.length; i++) {
					itemsComponent.discardItem(rewards.discardedItems[i], false);
				}
			}

			if (rewards.gainedInjuries) {
				var perksComponent = this.playerStatsNodes.head.perks;
				for (let i = 0; i < rewards.gainedInjuries.length; i++) {
					perksComponent.addPerk(PerkConstants.getPerk(rewards.gainedInjuries[i].id));
				}
			}

			if (rewards.gainedPopulation > 0) {
				var campNode = this.campNodes.head;
				if (nearestCampNode) {
					nearestCampNode.camp.pendingPopulation += 1;
				} else {
					log.w("No nearest camp found.");
					if (campNode) {
						campNode.camp.pendingPopulation += 1;
					}
				}
			}

			// TODO assign reputation to nearest camp

			if (rewards.gainedEvidence) this.playerStatsNodes.head.evidence.value += rewards.gainedEvidence;
			if (rewards.gainedRumours) this.playerStatsNodes.head.rumours.value += rewards.gainedRumours;
			if (rewards.gainedFavour) this.playerStatsNodes.head.entity.get(DeityComponent).favour += rewards.gainedFavour;
			// if (rewards.gainedReputation) this.playerStatsNodes.head.reputation.value += rewards.gainedReputation;

			GlobalSignals.inventoryChangedSignal.dispatch();
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
				for (let i = 0; i < rewards.selectedItems.length; i++) {
					var item = rewards.selectedItems[i];
					if (typeof loggedItems[item.id] === 'undefined') {
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
				for (let i = 0; i < rewards.gainedFollowers.length; i++) {
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

			if (rewards.gainedFavour) {
				msg += ", ";
				foundSomething = true;
				msg += "$" + replacements.length + ", ";
				replacements.push("#" + replacements.length + " favour");
				values.push(rewards.gainedFavour);
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
			var itemsComponent = this.playerStatsNodes.head.items;
			var followersComponent = this.playerStatsNodes.head.followers;
			var hasBag = itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.bag) > 0;
			var bagComponent = this.playerResourcesNodes.head.entity.get(BagComponent);
			var isInitialSelectionValid = bagComponent.usedCapacity <= bagComponent.totalCapacity;

			var div = "<div id='reward-div'>";
			
			if (resultVO.gainedResourcesFromFollowers.getTotal() > 0 || resultVO.gainedItemsFromFollowers.length > 0) {
				// assuming only followers of certain type find items
				let follower = followersComponent.getFollowerInPartyByType(FollowerConstants.followerType.SCAVENGER);
				let displayName = follower ? "<span class='hl-functionality'>" + follower.name + "</span>" : "Followers";
				
				let displayFinds = "";
				let totalResources = resultVO.gainedResourcesFromFollowers.getTotal();
				let totalItems = resultVO.gainedItemsFromFollowers.length;
				if (totalResources > 0 && totalItems == 0) {
					if (resultVO.gainedResourcesFromFollowers.isOnlySupplies()) {
						displayFinds = "some supplies";
					} else if (resultVO.gainedResourcesFromFollowers.isOneResource()) {
						displayFinds = "some " + resultVO.gainedResourcesFromFollowers.getNames()[0];
					} else {
						displayFinds = "some resources";
					}
				} else if (totalItems == 1 && totalResources == 0) {
					displayFinds = Text.addArticle(resultVO.gainedItemsFromFollowers[0].name);
				} else if (totalItems > 1 && totalResources == 0) {
					let uniqueNames = [];
					let uniqueTypes = [];
					for (let i = 0; i < resultVO.gainedItemsFromFollowers.length; i++) {
						let item = resultVO.gainedItemsFromFollowers[i];
						if (uniqueNames.indexOf(item.name) < 0) uniqueNames.push(item.name);
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
			
			if (resultVO.gainedFollowers && resultVO.gainedFollowers.length > 0) {
				for (let i = 0; i < resultVO.gainedFollowers.length; i++) {
					let follower = resultVO.gainedFollowers[i];
					let followerType = FollowerConstants.getFollowerTypeForAbilityType(follower.abilityType);
					let willJoin = this.willGainedFollowerJoinParty(follower);
					div += "<div>"
					div += "Met a <span class='hl-functionality'>" + FollowerConstants.getFollowerTypeDisplayName(followerType) + "</span> called " + follower.name + ". ";
					if (willJoin) {
						div += "They joined the party.";
					} else if (this.nearestCampNodes.head) {
						div += "They will meet you at " + this.nearestCampNodes.head.camp.getName() + " on level " + this.nearestCampNodes.head.position.level;
					}
					div += "</div>";
				}
			}

			var gainedhtml = "";
			gainedhtml += "<ul class='resultlist resultlist-positive'>";
			if (resultVO.gainedEvidence) {
				gainedhtml += "<li>" + resultVO.gainedEvidence + " evidence</li>";
			}
			if (resultVO.gainedRumours) {
				gainedhtml += "<li>" + resultVO.gainedRumours + " rumours</li>";
			}
			if (resultVO.gainedFavour) {
				gainedhtml += "<li>" + resultVO.gainedFavour + " favour</li>";
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
				var lostMsg = resultVO.lostItems.length > 1 ? "Lost some items." : resultVO.lostItems.length > 0 ? "Lost an item." : ""
				var losthtml = "<div id='resultlist-loststuff' class='infobox'>";
				var losthtml = "<span class='warning'>" + lostMsg + "</span>";
				losthtml += "<div id='resultlist-loststuff-lost' class='infobox inventorybox inventorybox-negative'>";
				losthtml += "<ul></ul>";
				losthtml += "</div>"
				losthtml += "</div>";
				div += losthtml;
			}

			if (resultVO.gainedResources.getTotal() > 0 || resultVO.gainedItems.length > 0 || !isInitialSelectionValid) {
				var baghtml = "<div id='resultlist-inventorymanagement' class='unselectable'>";

				baghtml += "<div id='resultlist-inventorymanagement-found' class='infobox inventorybox'>";
				baghtml += "<ul></ul>";
				baghtml += "<p class='msg-empty p-meta'>" + (isFight ? "Nothing left of the opponent." : "Nothing left here.") + "</p>";
				baghtml += "</div>"

				baghtml += "<div id='resultlist-inventorymanagement-kept' class='infobox inventorybox'>";
				baghtml += "<ul></ul>";
				baghtml += "<p class='msg-empty p-meta'>Your " + (hasBag ? "bag is" : "pockets are") + " empty.</p>";
				baghtml += "</div>"

				baghtml += "<div id='inventory-popup-bar' class='progress-wrap progress centered' style='margin-top: 10px'><div class='progress-bar progress'/><span class='progress-label progress'>?/?</span></div>";
				baghtml += "</div>"
				div += baghtml;
			}

			hasGainedStuff = hasGainedStuff || resultVO.gainedResources.getTotal() > 0 || resultVO.gainedItems.length > 0 || resultVO.gainedFollowers.length > 0;
			var hasLostStuff = resultVO.lostResources.getTotal() > 0 || resultVO.lostItems.length > 0 || resultVO.lostFollowers.length > 0 || resultVO.gainedInjuries.length > 0 || resultVO.lostCurrency > 0;
			
			if (!hasGainedStuff && !hasLostStuff) {
				if (isFight) div += "<p class='p-meta'>Nothing left behind.</p>"
				else if (resultVO.action === "despair") div += "";
				else if (resultVO.action === "clear_workshop") div += "";
				else if (resultVO.hasCustomReward) div += "";
				else div += "<p class='p-meta'>Didn't find anything useful.</p>";
			}
			
			if (resultVO.lostFollowers && resultVO.lostFollowers.length > 0) {
				for (let i = 0; i < resultVO.lostFollowers.length; i++) {
					div += "<p class='warning'><span class='hl-functionality'>" + resultVO.lostFollowers[i].name + "</span> left.</p>";
				}
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
					for (let i = 0; i < rewards.selectedItems.length; i++) {
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
					logComponent.addMessage(LogConstants.MSG_ID_LOST_FOLLOWER, "Lost " + rewards.lostFollowers.length + " followers.");
				}

				if (rewards.gainedInjuries.length > 0) {
					logComponent.addMessage(LogConstants.MSG_ID_GOT_INJURED, LogConstants.getInjuredMessage(rewards));
				}
			}
		},

		getCurrentScavengeEfficiency: function () {
			let factors = this.getCurrentScavengeEfficiencyFactors();
			let result = 1;
			for (let key in factors) {
				result = result * (factors[key] || 1);
			}
			return result;
		},
		
		getCurrentScavengeEfficiencyFactors: function () {
			let result = {};
			
			let playerVision = this.playerStatsNodes.head.vision.value || 0;
			result["vision"] = MathUtils.map(playerVision, 0, 150, 0, 1.5);

			let sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			let scavengedPercent = sectorStatus.getScavengedPercent();
			let notScavengedPercent = MathUtils.map(scavengedPercent, 0, 100, 1, 0);
			result["sector status"] = MathUtils.clamp(notScavengedPercent, 0.05, 1);
				
			return result;
		},

		// probabilityFactor (action-specific): base chance to get any resources at all (0-1)
		// amountFactor (action-specific): relative amount of resources found if found any, where regular scavenge is 1
		// efficiency: 0-1 current scavenge efficiency of the player, affects chance to find something and amount found
		// available resources: name -> relative amount depending on sector, affects both chance and amount (WorldConstants.resourcePrevalence)
		getRewardResources: function (probabilityFactor, amountFactor, efficiency, availableResources) {
			probabilityFactor = probabilityFactor || 0;
			amountFactor = amountFactor || 1;
			efficiency = efficiency || 1;
			
			var results = new ResourcesVO();
			
			if (probabilityFactor == 0) return results;
			if (Math.random() > probabilityFactor) return results;
			if (!availableResources || !availableResources.getTotal || availableResources.getTotal() <= 0) return results;

			var minRandomAmoutFactor = 1/3*2;
			var maxRandomAmountFactor  = 1/3*4;

			// select resources
			for (var key in resourceNames) {
				var name = resourceNames[key];
				var availableAmount = availableResources.getResource(name);
				if (availableAmount <= 0)
					continue;
					
				var baseProbability = this.getBaseResourceFindProbability(availableAmount);
				var finalProbability = MathUtils.clamp(baseProbability * efficiency, 0, 1);
				if (Math.random() > finalProbability)
					continue;
				
				var resMin = 1;
				var resMax = 10;
				var baseAmount = this.getBaseResourceFindAmount(name, availableAmount);
				var randomAmountFactor  = MathUtils.map(Math.random(), 0, 1, minRandomAmoutFactor, maxRandomAmountFactor);
				var resultAmount = baseAmount * efficiency * randomAmountFactor;
				resultAmount = Math.round(resultAmount);
				resultAmount = MathUtils.clamp(resultAmount, resMin, resMax);
				results.setResource(name, resultAmount);
			}
			
			// consolation prize: if found nothing (useful) at this point, add 1 metal every few tries
			if (!this.isSomethingUsefulResources(results) && !GameGlobals.gameState.isAutoPlaying) {
				var excursionComponent = this.playerResourcesNodes.head.entity.get(ExcursionComponent);
				var metalAmount = availableResources.getResource(resourceNames.metal);
				if (metalAmount > WorldConstants.resourcePrevalence.RARE && excursionComponent && excursionComponent.numConsecutiveScavengeUseless > 0) {
					results.setResource(resourceNames.metal, 1);
				}
			}

			return results;
		},

		getRewardCurrency: function (efficiency) {
			var campCount = GameGlobals.gameState.numCamps;
			
			if (campCount < 2)
				return 0;
				
			if (efficiency < 0.25)
				return 0;
			
			var findProbability = 0;
			var sectorFeatures = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			switch (sectorFeatures.sectorType) {
				case SectorConstants.SECTOR_TYPE_RESIDENTIAL:
				case SectorConstants.SECTOR_TYPE_PUBLIC:
					findProbability = 0.0025;
					break;
				case SectorConstants.SECTOR_TYPE_COMMERCIAL:
					findProbability = 0.075;
					break;
			}

			if (Math.random() > findProbability * efficiency)
				return 0;

			return Math.ceil(Math.random() * 3);
		},

		// itemProbability: base probability of finding one item (0-1)
		// ingredientProbability: base probability of finding some ingredients (0-1)
		// itemTypeLimits: list of item types and their probabilities ([ type: relative_probability ])
		// availableIngredients: optional list of ingredients that can drop (if null, any can drop, but if empty, none found)
		// efficiency: current scavenge efficiency of the player, affects chance to find something (0-1)
		// currentItems: ItemsComponent
		getRewardItems: function (itemProbability, ingredientProbability, itemTypeLimits, availableIngredients, efficiency, currentItems, campOrdinal, step, isHardLevel) {
			let result = [];
			let hasBag = currentItems.getCurrentBonus(ItemConstants.itemBonusTypes.bag) > 0;
			let hasCamp = GameGlobals.gameState.unlockedFeatures.camp;
			let hasDecentEfficiency = efficiency > 0.25;

			// Regular items
			if (itemProbability > 0) {
				let itemProbabilityWithEfficiency = itemProbability * efficiency;
				
				// - Neccessity items (map, bag) that the player should find quickly if missing
				var necessityItem = this.getNecessityItem(itemProbability, itemTypeLimits, efficiency, currentItems, campOrdinal);
				if (necessityItem) result.push(necessityItem);

				// - Normal items
				if (hasBag && !necessityItem && hasDecentEfficiency && Math.random() < itemProbabilityWithEfficiency) {
					var item = this.getRewardItem(itemTypeLimits, efficiency, campOrdinal, step);
					if (item) result.push(item);
				}
			}
			
			// Ingredients
			if (ingredientProbability > 0) {
				var ingredientProbabilityWithEfficiency = ingredientProbability * efficiency;
				var max = Math.floor(Math.random() * 3);
				var amount = Math.floor(Math.random() * efficiency * max) + 1;
				var addedIngredient = false;
				
				// . Necessity ingredient (stuff blocking the player from progressing)
				// TODO replace with something that's not random & is better communicated in-game
				if (hasCamp && hasDecentEfficiency) {
					var necessityIngredient = this.getNecessityIngredient();
					if (necessityIngredient != null) {
						for (let i = 0; i <= amount; i++) {
							result.push(necessityIngredient.clone());
						}
						addedIngredient = true;
					}
				}

				// - Normal ingredients
				if (hasBag && hasCamp && hasDecentEfficiency && !addedIngredient && Math.random() < ingredientProbabilityWithEfficiency) {
					var ingredient = GameGlobals.itemsHelper.getUsableIngredient(availableIngredients);
					for (let i = 0; i <= amount; i++) {
						result.push(ingredient.clone());
					}
				}
			}
			
			return result;
		},

		getRewardFollowers: function (probability) {
			var followers = [];
			
			var playerPos = this.playerLocationNodes.head.position;
			let campOrdinal = GameGlobals.gameState.getCampOrdinal(playerPos.level);
			if (campOrdinal <= FollowerConstants.FIRST_FOLLOWER_CAMP_ORDINAL)
				return followers;
			
			if (Math.random() < probability) {
				var follower = FollowerConstants.getNewRandomFollower(FollowerConstants.followerSource.SCOUT, GameGlobals.gameState.numCamps, playerPos.level);
				followers.push(follower);
			}
			
			return followers;
		},

		getRewardItem: function (itemTypeLimits, efficiency, campOrdinal, step) {
			// normalize item type probabilities
			var sum = 0;
			var typeProbabilities = {};
			for (var type in itemTypeLimits) {
				typeProbabilities[type] = 0;
				if (this.isRewardItemTypeLocked(type))
					continue;
				typeProbabilities[type] = itemTypeLimits[type];
				sum += itemTypeLimits[type];
			}
			for (var type in itemTypeLimits) {
				typeProbabilities[type] = typeProbabilities[type] / sum;
			}

			// list possible items
			var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			var validItems = [];
			var itemScores = {};
			var itemList;
			var itemDefinition;
			var maxCampOrdinalBonus = step == WorldConstants.CAMP_STEP_END ? 1 : 0;
			var maxCampOrdinal = campOrdinal + Math.floor(Math.random(maxCampOrdinalBonus + 1));
			var minCampOrdinal = Math.max(0, campOrdinal - 3);
			var campOrdinalMaxRarity = Math.min(campOrdinal, 5) * 2;
			var maxRarity = 1 + (campOrdinalMaxRarity - 1) * efficiency * Math.random();
			var maxCampOrdinalDiff = maxCampOrdinal - minCampOrdinal;
			for (var type in ItemConstants.itemDefinitions) {
				var typekey = type.split("_")[0];
				var typeProb = typeProbabilities[typekey]
				if (!typeProb || typeProb < 0) continue;
				var isObsoletable = ItemConstants.isObsoletable(type);
				itemList = ItemConstants.itemDefinitions[type];
				for (let i in itemList) {
					itemDefinition = itemList[i];
					var isObsolete = GameGlobals.itemsHelper.isObsolete(itemDefinition, itemsComponent, false);
					if (itemDefinition.scavengeRarity <= 0) continue;
					if (itemDefinition.scavengeRarity > maxRarity) continue;
					if (itemDefinition.requiredCampOrdinal > maxCampOrdinal) continue;
					if (itemDefinition.requiredCampOrdinal > 0 && isObsoletable && itemDefinition.requiredCampOrdinal < minCampOrdinal) {
						if (isObsolete || itemDefinition.craftable) {
							continue;
						}
					}
					validItems.push(itemDefinition);
					
					var score = 1;
					if (isObsolete)
						score = score / 2;
					score *= typeProb;
					var campOrdinalFactor = 1;
					if (itemDefinition.requiredCampOrdinal > 0 && isObsoletable)
						campOrdinalFactor = 1 - Math.abs(campOrdinal - itemDefinition.requiredCampOrdinal) / maxCampOrdinalDiff;
					score *= campOrdinalFactor;
					if (itemDefinition.craftable)
						score = score / 3;
					if (itemDefinition.craftable && isObsoletable)
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
				log.i("valid items: " + validItems.length + " (max rarity: " + maxRarity + "/" + campOrdinalMaxRarity + ", camp ordinal: " + campOrdinal + " (" + minCampOrdinal + "-" + maxCampOrdinal + "))")
				// log.i(validItems);
			}
			
			// pick one random valid item, higher score more likely but all possible
			var index = MathUtils.getWeightedRandom(0, validItems.length);
			var item = validItems[index];
			if (!GameGlobals.gameState.uiStatus.isHidden)
				log.i("- selected index " + index + "/" + validItems.length + ": "+ item.id);
			return item.clone();
		},

		getNecessityItem: function (itemProbability, itemTypeLimits, efficiency, currentItems, campOrdinal) {
			var adjustedProbability = MathUtils.clamp(itemProbability * 5, 0.15, 0.35);

			// first bag
			if (itemTypeLimits.bag > 0) {
				if (currentItems.getCurrentBonus(ItemConstants.itemBonusTypes.bag) <= 0) {
					var res = this.playerResourcesNodes.head.resources;
					if (res.resources.getTotal() > 2) {
						var rand = Math.random();
						var threshold = GameGlobals.gameState.numCamps > 1 ? 0.25 : 0.75;
						if (rand < threshold) {
							return ItemConstants.getBag(1).clone();
						}
					}
				}
			}

			// map
			if (itemTypeLimits.exploration > 00 && !GameGlobals.gameState.isAutoPlaying) {
				var visitedSectors = GameGlobals.gameState.numVisitedSectors;
				var numSectorsRequiredForMap = 5;
				if (visitedSectors > numSectorsRequiredForMap && currentItems.getCountById(ItemConstants.itemDefinitions.uniqueEquipment[0].id, true) <= 0) {
					if (Math.random() < adjustedProbability) {
						return ItemConstants.itemDefinitions.uniqueEquipment[0].clone();
					}
				}
			}

			// non-craftable level clothing
			if (itemTypeLimits.clothing > 0 && !GameGlobals.gameState.isAutoPlaying) {
				if (Math.random() < adjustedProbability) {
					var clothing = GameGlobals.itemsHelper.getScavengeNecessityClothing(campOrdinal, 1);
					for (let i = 0; i < clothing.length; i++) {
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
		
		getNecessityIngredient: function (ingredientProbability, currentItems, campOrdinal, step, isHardLevel) {
			if (!GameGlobals.gameState.isAutoPlaying) return null;
			
			var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			var playerStamina = this.playerStatsNodes.head.stamina;
			let niCampOrdinal = campOrdinal;
			let niStep = step + 1;
			let niIsHardlevel = isHardLevel;
			if (step > WorldConstants.CAMP_STEP_END) {
				niCampOrdinal += 1;
				niStep = WorldConstants.CAMP_STEP_START;
				niIsHardlevel = false;
			}
			var neededIngredient = GameGlobals.itemsHelper.getNeededIngredient(niCampOrdinal, step, niIsHardlevel, itemsComponent, true);
			if (neededIngredient) {
				var neededIngredientProp = MathUtils.clamp(ingredientProbability * 10, 0.15, 0.35);
				var numAvailableGangs = GameGlobals.levelHelper.getNumAvailableGangs(campOrdinal, playerStamina, itemsComponent);
				if (!GameGlobals.gameState.uiStatus.isHidden)
					log.i("neededIngredient: " + (neededIngredient ? neededIngredient.id : "null") + ", prob: " + neededIngredientProp + ", gangs: " + numAvailableGangs);
				if (numAvailableGangs <= 1 && Math.random() < neededIngredientProp) {
					return neededIngredient;
				}
			}
			return null;
		},

		addStashes: function (rewardsVO, stashes, stashesFound) {
			if (!stashes || stashes.length <= stashesFound) return;
			var stashVO = stashes[stashesFound];
			if (!GameGlobals.gameState.uiStatus.isHidden)
				log.i("found stash: " + stashVO.stashType + " " + stashVO.itemID + " " + (stashesFound+1) + "/" + stashes.length);
			rewardsVO.foundStashVO = stashVO;
			switch (stashVO.stashType) {
				case ItemConstants.STASH_TYPE_ITEM:
					var item = ItemConstants.getItemByID(stashVO.itemID);
					if (item) {
						for (let i = 0; i < stashVO.amount; i++) {
							rewardsVO.gainedItems.push(item.clone());
						}
					}
					break;
				case ItemConstants.STASH_TYPE_SILVER:
					rewardsVO.gainedCurrency += stashVO.amount;
					break;
			}
		},
		
		addFollowerBonuses: function (rewards, sectorResources, sectorIngredients, itemTypeLimits) {
			var efficiency = this.getCurrentScavengeEfficiency();
			var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			
			var playerPos = this.playerLocationNodes.head.position;
			var campOrdinal = GameGlobals.gameState.getCampOrdinal(playerPos.level);
			var step = GameGlobals.levelHelper.getCampStep(playerPos);
			var levelComponent = GameGlobals.levelHelper.getLevelEntityForPosition(playerPos.level).get(LevelComponent);
			var isHardLevel = levelComponent.isHard;
			
			// follower bonuses (1.0 - 2.0)
			let generalBonus = GameGlobals.playerHelper.getCurrentBonus(ItemConstants.itemBonusTypes.scavenge_general);
			let suppliesBonus = GameGlobals.playerHelper.getCurrentBonus(ItemConstants.itemBonusTypes.scavenge_supplies);
			let ingredientsBonus = GameGlobals.playerHelper.getCurrentBonus(ItemConstants.itemBonusTypes.scavenge_ingredients);
			
			let bonusResourceProb = generalBonus - 1;
			let bonusResources = this.getRewardResources(bonusResourceProb, 1, efficiency, sectorResources);
			rewards.gainedResourcesFromFollowers = bonusResources;
			rewards.gainedResources.addAll(bonusResources);
			
			if (bonusResources.getTotal() > 0) {
				generalBonus = 0;
			}
			
			let bonusSuppliesProb = suppliesBonus - 1;
			let sectorSupplies = new ResourcesVO();
			sectorSupplies.setResource(resourceNames.food, sectorResources.getResource(resourceNames.food));
			sectorSupplies.setResource(resourceNames.water, sectorResources.getResource(resourceNames.water));
			let bonusSupplies = this.getRewardResources(bonusSuppliesProb, 1, efficiency, sectorSupplies);
			rewards.gainedResourcesFromFollowers.addAll(bonusSupplies);
			rewards.gainedResources.addAll(bonusSupplies);
			
			let bonusItemProb = generalBonus - 1;
			let bonusIngredientProb = generalBonus - 1 + ingredientsBonus - 1;
			let bonusItems = this.getRewardItems(bonusItemProb, bonusIngredientProb, itemTypeLimits, sectorIngredients, efficiency, itemsComponent, campOrdinal, step, isHardLevel);
			rewards.gainedItemsFromFollowers = bonusItems;
			for (let i = 0; i < bonusItems.length; i++) {
				rewards.gainedItems.push(bonusItems[i]);
			}
		},
		
		isSomethingUsefulResult: function (result) {
			return this.isSomethingUsefulResources(result.gainedResources)
				|| result.gainedItems.length > 0
				|| result.gainedCurrency > 0
				|| result.gainedFollowers.length > 0
				|| result.gainedBlueprintPiece
				|| result.gainedEvidence > 0
				|| result.gainedRumours > 0
				|| result.gainedFavour > 0
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
							return GameGlobals.gameState.unlockedFeatures.camp && this.playerResourcesNodes.head.resources.resources.getResource(name) < 10;
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

		getLostItems: function (action, loseSingleItem) {
			var lostItems = [];
			var playerItems = this.playerResourcesNodes.head.entity.get(ItemsComponent).getAll(false);

			if (playerItems.length <= 0)
				return lostItems;
				
			if (!GameGlobals.gameState.unlockedFeatures.camp)
				return false;

			// make list with duplicates based on probabilities
			// ignore ingredients here, they're handled below
			var itemList = [];
			var numValidItems = 0;
			var probabilitySum = 0;
			for (let i = 0; i < playerItems.length; i++) {
				var item = playerItems[i];
				if (item.type == ItemConstants.itemTypes.ingredient) continue;
				var loseProbability = this.getItemLoseProbability(action, item);
				if (loseProbability <= 0) continue;
				var count = Math.round(loseProbability * 10);
				for (let j = 0; j < count; j++) {
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

				for (let i = 0; i < numItems; i++) {
					var itemi = Math.floor(Math.random() * itemList.length);
					var selectedItem = itemList[itemi];
					lostItems.push(selectedItem);
					var optionsToRemove = [];
					for (let j = 0; j < itemList.length; j++) {
						if (itemList[j] == selectedItem) {
							optionsToRemove.push(j);
						}
					}
					itemList.splice(optionsToRemove[0], optionsToRemove.length);
				}
			}
			
			// ingredients: lose all or nothing
			if (!loseSingleItem) {
				for (let i = 0; i < playerItems.length; i++) {
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
		
		getLostFollowers: function (loseProbability) {
			var lostFollowers = [];
			
			if (loseProbability <= 0)
				return lostFollowers;
			
			var playerFollowers = this.playerStatsNodes.head.followers.getParty();
			if (playerFollowers.length < 1)
				return lostFollowers;
				
			var loseOne = Math.random() < loseProbability;
			
			if (loseOne) {
				var index = Math.floor(playerFollowers.length * Math.random());
				lostFollowers.push(playerFollowers[index]);
			}
			
			return lostFollowers;
		},

		getResultInjuries: function (injuryProbability) {
			var perksComponent = this.playerStatsNodes.head.perks;
			let result = [];

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
			if (!localeVO.hasBlueprints()) return null;
			
			var playerPos = this.playerLocationNodes.head.position;
			var campOrdinal = GameGlobals.gameState.getCampOrdinal(playerPos.level);
			let levelIndex = GameGlobals.gameState.getLevelIndex(playerPos.level);
			let maxLevelIndex = GameGlobals.gameState.getMaxLevelIndex(playerPos.level);
			var blueprintType = localeVO.isEarly ? UpgradeConstants.BLUEPRINT_BRACKET_EARLY : UpgradeConstants.BLUEPRINT_BRACKET_LATE;
			var levelBlueprints = UpgradeConstants.getBlueprintsByCampOrdinal(campOrdinal, blueprintType, levelIndex, maxLevelIndex);

			var upgradesComponent = this.tribeUpgradesNodes.head.upgrades;
			var blueprintsToFind = [];
			var blueprintPiecesToFind = 0;
			for (let i = 0; i < levelBlueprints.length; i++) {
				var blueprintId = levelBlueprints[i];
				if (!upgradesComponent.hasUpgrade(blueprintId) && !upgradesComponent.hasAvailableBlueprint(blueprintId)) {
					var blueprintVO = upgradesComponent.getBlueprint(blueprintId);
					var remainingPieces = blueprintVO ? blueprintVO.maxPieces - blueprintVO.currentPieces : UpgradeConstants.getMaxPiecesForBlueprint(blueprintId);
					if (remainingPieces > 0) {
						blueprintsToFind.push(blueprintId);
						blueprintPiecesToFind += remainingPieces;
					}
				}
			}
			
			var bracket = localeVO.getBracket();
			var unscoutedLocales = GameGlobals.levelHelper.getLevelLocales(playerPos.level, false, bracket, localeVO, true);
			var numUnscoutedLocales = unscoutedLocales.length + 1;
			var scoutedLocales = GameGlobals.levelHelper.getLevelLocales(playerPos.level, true, bracket, localeVO, true);
			var numScoutedLocales = scoutedLocales.length + 1 - numUnscoutedLocales;
			var findBlueprintProbability = blueprintPiecesToFind / numUnscoutedLocales;
			
			if (!GameGlobals.gameState.uiStatus.isHidden) {
				log.i("get result blueprint: " + blueprintType + " | pieces to find: " + blueprintPiecesToFind + " / unscouted locales: " + numUnscoutedLocales + " -> prob: " + Math.round(findBlueprintProbability*100)/100 + ", scouted locales: " + numScoutedLocales);
				log.i(levelBlueprints);
				log.i(blueprintsToFind);
			}

			var isFirstEver = playerPos.level == 13 && numScoutedLocales == 0;
			if (isFirstEver || Math.random() < findBlueprintProbability) {
				let i = Math.floor(Math.random() * blueprintsToFind.length);
				return blueprintsToFind[i];
			}

			return null;
		},
		
		getFallbackBlueprint: function (probability) {
			if (GameGlobals.gameState.isAutoPlaying) return;
			var missedBlueprints = [];
			var playerPos = this.playerLocationNodes.head.position;
			var upgradesComponent = this.tribeUpgradesNodes.head.upgrades;
			var campOrdinal = GameGlobals.gameState.getCampOrdinal(playerPos.level);
			var levelOrdinal = GameGlobals.gameState.getLevelOrdinal(playerPos.level);
			for (let i = 1; i < levelOrdinal; i++) {
				var level = GameGlobals.gameState.getLevelForOrdinal(i);
				var allLocales = GameGlobals.levelHelper.getLevelLocales(level, true, null, true).length;
				var unscoutedLocales = GameGlobals.levelHelper.getLevelLocales(level, false, null, true).length;
				if (allLocales > 0 && unscoutedLocales === 0) {
					var c = GameGlobals.gameState.getCampOrdinal(level);
					var levelIndex = GameGlobals.gameState.getLevelIndex(level);
					let maxLevelIndex = GameGlobals.gameState.getMaxLevelIndex(playerPos.level);
					var levelBlueprints = UpgradeConstants.getBlueprintsByCampOrdinal(c, null, levelIndex, maxLevelIndex);
					for (let j = 0; j < levelBlueprints.length; j++) {
						var blueprintId = levelBlueprints[j];
						if (upgradesComponent.hasUpgrade(blueprintId)) continue;
						if (upgradesComponent.hasAvailableBlueprint(blueprintId)) continue;
						if (upgradesComponent.hasAllPieces(blueprintId)) continue;
						missedBlueprints.push(blueprintId);
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
			}
			log.w("unknown resource prevalence: " + prevalence);
			return 0;
		},
		
		getBaseResourceFindAmount: function (name, prevalence) {
			switch (prevalence) {
				case WorldConstants.resourcePrevalence.RARE:
					return 1;
				case WorldConstants.resourcePrevalence.DEFAULT:
					return 3;
				case WorldConstants.resourcePrevalence.COMMON:
					return 4;
				case WorldConstants.resourcePrevalence.ABUNDANT:
					return 6;
			}
			log.w("unknown resource prevalence: " + prevalence);
			return 0;
		},

		getAvailableResourcesForEnemy: function (enemyVO) {
			let result = new ResourcesVO();
			for (let i = 0; i < enemyVO.droppedResources.length; i++) {
				result.setResource(enemyVO.droppedResources[i], 10);
			}
			return result;
		},

		willGainedFollowerJoinParty: function (follower) {
			var followersComponent = this.playerStatsNodes.head.followers;
			let followerType = FollowerConstants.getFollowerTypeForAbilityType(follower.abilityType);
			let existingInParty = followersComponent.getFollowerInPartyByType(followerType);
			if (existingInParty) return false;
			let existingRecruited = followersComponent.getAll();
			let maxFollowers = GameGlobals.campHelper.getCurrentMaxFollowersRecruited();
			if (existingRecruited.length >= maxFollowers) return false;
			return true;
		},

	});

	return PlayerActionResultsHelper;
});
