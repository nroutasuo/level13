define([
	'ash',
	'utils/ValueCache',
	'game/GameGlobals',
	'game/constants/GameConstants',
	'game/constants/FollowerConstants',
	'game/constants/ImprovementConstants',
	'game/constants/ItemConstants',
	'game/constants/LogConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/PlayerStatConstants',
	'game/nodes/NearestCampNode',
	'game/nodes/PlayerPositionNode',
	'game/nodes/PlayerLocationNode',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/player/PlayerResourcesNode',
	'game/components/player/DeityComponent',
	'game/components/player/ExcursionComponent',
	'game/components/player/PlayerActionComponent',
	'game/components/common/LogMessagesComponent',
	'game/components/common/MovementComponent',
], function (
	Ash,
	ValueCache,
	GameGlobals,
	GameConstants,
	FollowerConstants,
	ImprovementConstants,
	ItemConstants,
	LogConstants,
	PlayerActionConstants,
	PlayerStatConstants,
	NearestCampNode,
	PlayerPositionNode,
	PlayerLocationNode,
	PlayerStatsNode,
	PlayerResourcesNode,
	DeityComponent,
	ExcursionComponent,
	PlayerActionComponent,
	LogMessagesComponent,
	MovementComponent,
) {
	
	let PlayerHelper = Ash.Class.extend({
		
		playerPosNodes: null,
		playerStatsNodes: null,
		playerResourcesNodes: null,
		nearestCampNodes: null,
		playerLocationNodes: null,

		constructor: function (engine) {
			this.playerPosNodes = engine.getNodeList(PlayerPositionNode);
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			this.playerResourcesNodes = engine.getNodeList(PlayerResourcesNode);
			this.nearestCampNodes = engine.getNodeList(NearestCampNode);
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
		},
		
		isInCamp: function () {
			if (!this.playerPosNodes.head) return false;
			return this.playerPosNodes.head.position.inCamp;
		},

		getPosition: function () {
			if (!this.playerPosNodes.head) return null;
			return this.playerPosNodes.head.position;
		},
		
		isBusy: function () {
			let player = this.playerStatsNodes.head.entity;
			if (player.has(MovementComponent)) return true;
			let playerActionComponent = this.playerResourcesNodes.head.entity.get(PlayerActionComponent);
			return playerActionComponent.isBusy();
		},
		
		getBusyTimeLeft: function () {
			let player = this.playerStatsNodes.head.entity;
			if (player.has(MovementComponent)) return 1;
			let playerActionComponent = this.playerResourcesNodes.head.entity.get(PlayerActionComponent);
			return playerActionComponent.getBusyTimeLeft();
		},
		
		getBusyDescription: function () {
			let player = this.playerStatsNodes.head.entity;
			if (player.has(MovementComponent)) return "moving";
			let playerActionComponent = this.playerResourcesNodes.head.entity.get(PlayerActionComponent);
			return playerActionComponent.getBusyDescription()
		},
		
		moveTo: function (level, sectorX, sectorY, inCamp) {
			let player = this.playerStatsNodes.head.entity;
			if (!player) return;
			if (player.has(MovementComponent)) {
				log.w("trying to move but already moving");
				return;
			}
			player.add(new MovementComponent(level, sectorX, sectorY, inCamp));
		},

		addLogMessage: function (id, msg) {
			if (!msg || msg.length == 0) return;
			let playerPosition = this.playerPosNodes.head.position;
			let logComponent = this.playerPosNodes.head.entity.get(LogMessagesComponent);
			logComponent.addMessage(id || LogConstants.getUniqueID(), msg, null, null, playerPosition, LogConstants.MSG_VISIBILITY_DEFAULT, true);
		},

		addLogMessageWithParams: function (id, msg, replacements, values) {
			if (!msg || msg.length == 0) return;
			let playerPosition = this.playerPosNodes.head.position;
			let logComponent = this.playerPosNodes.head.entity.get(LogMessagesComponent);
			logComponent.addMessage(id || LogConstants.getUniqueID(), msg, replacements, values, playerPosition, LogConstants.MSG_VISIBILITY_DEFAULT, true);
		},
		
		addLogMessageWithPosition: function (id, msg, position) {
			if (!msg || msg.length == 0) return;
			let playerPosition = this.playerPosNodes.head.position;
			let logComponent = this.playerPosNodes.head.entity.get(LogMessagesComponent);
			let isVisibleImmediately = !position || position.equals(playerPosition)
			logComponent.addMessage(id || LogConstants.getUniqueID(), msg, null, null, position, LogConstants.MSG_VISIBILITY_DEFAULT, isVisibleImmediately);
		},
		
		isReadyForExploration: function () {
			if (this.getCurrentStamina() <= this.getCurrentStaminaWarningLimit()) {
				return false;
			}
			
			return true;
		},
		
		hasRestedThisExcursion: function () {
			if (this.isInCamp()) return false;
			
			let excursionComponent = this.playerStatsNodes.head.entity.get(ExcursionComponent);
			return excursionComponent != null ? excursionComponent.numNaps > 0 : false;
		},
		
		getCurrentStamina: function () {
			return this.playerStatsNodes.head.stamina.stamina;
		},
		
		getCurrentStaminaWarningLimit: function () {
			return ValueCache.getValue("StaminaWarningLimit", 5, this.playerPosNodes.head.position.positionId(), () => PlayerStatConstants.getStaminaWarningLimit(this.playerStatsNodes.head.stamina));
		},
		
		getPathToCamp: function () {
			if (!this.nearestCampNodes.head) return null;
			let campSector = this.nearestCampNodes.head.entity;
			let path = GameGlobals.levelHelper.findPathTo(this.playerLocationNodes.head.entity, campSector, { skipBlockers: true, skipUnvisited: true });
			return path;
		},
		
		getPathToPassage: function () {
			if (!this.playerLocationNodes.head) return null;
			let currentLevel = this.playerLocationNodes.head.position.level;
			
			let passageUp = GameGlobals.levelHelper.findPassageUp(currentLevel, false);
			let passageDown = GameGlobals.levelHelper.findPassageDown(currentLevel, false);
			
			let result = null;
			
			if (passageUp) {
				let pathUp = GameGlobals.levelHelper.findPathTo(this.playerLocationNodes.head.entity, passageUp, { skipBlockers: true, skipUnvisited: true });
				if (pathUp) {
					if (result == null || result.length > pathUp.length) {
						result = pathUp;
					}
				}
			}
			
			if (passageDown) {
				let pathDown = GameGlobals.levelHelper.findPathTo(this.playerLocationNodes.head.entity, passageDown, { skipBlockers: true, skipUnvisited: true });
				if (pathDown) {
					if (result == null || result.length > pathDown.length) {
						result = pathDown;
					}
				}
			}
			
			return result;
		},
		
		hasItem: function (id) {
			let itemsComponent = this.playerStatsNodes.head.items;
			return itemsComponent.getCountById(id, true) > 0;
		},
		
		hasItemBaseID: function (itemBaseID) {
			let itemsComponent = this.playerStatsNodes.head.items;
			return itemsComponent.getCountByBaseId(itemBaseID, true) > 0;
		},
		
		getCurrentBonus: function (itemBonusType) {
			var isMultiplier = ItemConstants.isMultiplier(itemBonusType);
			var result = isMultiplier ? 1 : 0;
			
			if (isMultiplier) {
				result *= this.playerStatsNodes.head.items.getCurrentBonus(itemBonusType);
				result *= this.playerStatsNodes.head.followers.getCurrentBonus(itemBonusType);
			} else {
				result += this.playerStatsNodes.head.items.getCurrentBonus(itemBonusType);
				result += this.playerStatsNodes.head.followers.getCurrentBonus(itemBonusType);
			}
			
			return result;
		},
		
		getCurrentBonusDesc: function (itemBonusType) {
			let result = "";
			
			let items = this.playerStatsNodes.head.items.getEquipped();
			for (let i = 0; i < items.length; i++) {
				let item = items[i];
				let itemBonus = item.getCurrentBonus(itemBonusType);
				if (itemBonus > 0) {
					if (result.length > 0) result += "<br/>";
					result += item.name + ": " + itemBonus;
				}
			}
			
			let followers = this.playerStatsNodes.head.followers.getParty();
			for (let i = 0; i < followers.length; i++) {
				let follower = followers[i];
				let followerBonus = FollowerConstants.getFollowerItemBonus(follower, itemBonusType);
				if (followerBonus > 0) {
					if (result.length > 0) result += "<br/>";
					result += follower.name + ": " + Math.round(followerBonus*10)/10;
				}
			}
			
			switch (itemBonusType) {
				case ItemConstants.itemBonusTypes.movement:
					let playerPosition = this.playerPosNodes.head.position.getPosition();
					let sector = GameGlobals.levelHelper.getSectorByPosition(playerPosition.level, playerPosition.sectorX, playerPosition.sectorY)
					let beaconBonus = GameGlobals.sectorHelper.getBeaconMovementBonus(sector, this.playerStatsNodes.head.perks);
					if (beaconBonus !== 1) {
						if (result.length > 0) result += "<br/>";
						result += "Beacon: " + beaconBonus;
					}
					let debrisMalus = GameGlobals.sectorHelper.getDebrisMovementMalus(sector);
					if (debrisMalus !== 1) {
						if (result.length > 0) result += "<br/>";
						result += "Debirs: " + debrisMalus;
					}
					break;
			}
			
			return result;
		},
		
		addItem: function (itemDef, sourcePosition) {
			if (!itemDef) {
				log.w("trying to add item with no item def");
				return;
			}
			
			var itemsComponent = this.playerStatsNodes.head.items;
			var playerPosition = this.playerPosNodes.head.position.getPosition();
			sourcePosition = sourcePosition || playerPosition.clone();
			
			var item = itemDef.clone();
			
			itemsComponent.addItem(item, !playerPosition.inCamp && sourcePosition.equals(playerPosition));
			item.foundPosition = sourcePosition.clone();
		},
		
		getBestAvailableFollower: function (followerType) {
			let followersComponent = this.playerStatsNodes.head.followers;
			let followers = followersComponent.getFollowersByType(followerType, false);
			let result = null;
			let resultLevel = 0;
			for (let i = 0; i < followers.length; i++) {
				let follower = followers[i];
				if (follower.abilityLevel > resultLevel) {
					result = follower;
					resultLevel = follower.abilityLevel;
				}
			}
			return result;
		},
		
		isAffectedByHazardAt: function (sector) {
			return GameGlobals.sectorHelper.isSectorAffectedByHazard(sector, this.playerStatsNodes.head.items);
		},
		
		getMaxFavour: function () {
			let deityComponent = this.playerStatsNodes.head.entity.get(DeityComponent);
			let hasDeity = deityComponent != null;
			return hasDeity ? deityComponent.maxFavour : 0;
		},

		getVisibleGameStats: function () {
			let result = [];

			let addStat = function (category, displayName, stat, isVisible, unit) {
				unit = unit || GameConstants.gameStatUnits.count;
				stat.displayName = displayName || stat.name;
				stat.unit = unit;
				stat.isVisible = !(isVisible === false);
				category.push(stat);
			};

			// General
			let generalStats = [];
			addStat(generalStats, "Time played", this.getGameStatSimple("playTime"), true, GameConstants.gameStatUnits.seconds);
			addStat(generalStats, "Time outside", this.getGameStatKeyedSum("timeOutsidePerLevel"), true, GameConstants.gameStatUnits.seconds);
			addStat(generalStats, "Upgrades researched", this.getGameStatDerived("numTechResearched", () => GameGlobals.tribeHelper.getAllUnlockedUpgrades().length));
			addStat(generalStats, "Blueprint pieces found", this.getGameStatSimple("numBlueprintPiecesFound"));
			result.push({ displayName: "General", stats: generalStats, isVisible: true });

			// Exploration
			let levelStats = GameGlobals.levelHelper.getLevelStatsGlobal();
			let explorationStats = [];
			addStat(explorationStats, "Steps taken", this.getGameStatSimple("numStepsTaken"));
			addStat(explorationStats, "Sectors visited", this.getGameStatSimple("numVisitedSectors"));
			addStat(explorationStats, "Sectors scouted", this.getGameStatSimple("numTimesScouted"));
			addStat(explorationStats, "Sectors scavenged bare", this.getGameStatDerived("numFullyScavengedSectors", () => levelStats.countFullyScavengedSectors));
			addStat(explorationStats, "Times scavenged", this.getGameStatSimple("numTimesScavenged"));
			addStat(explorationStats, "Most steps on level", this.getGameStatHighScore("numStepsPerLevel"));
			addStat(explorationStats, "Expeditions started", this.getGameStatSimple("numExcursionsStarted"), GameGlobals.gameState.isFeatureUnlocked("camp"));
			addStat(explorationStats, "Expeditions survived", this.getGameStatSimple("numExcursionsSurvived"), GameGlobals.gameState.isFeatureUnlocked("camp"));
			addStat(explorationStats, "% of expeditions survived", this.getStatPercentage("numExcursionsSurvived", "numExcursionsStarted"), GameGlobals.gameState.isFeatureUnlocked("camp"));
			addStat(explorationStats, "% of sectors visited scavenged at least once", this.getStatPercentageDerived("ratioVisitedSectorsScavengedOnce", () => levelStats.countScavengedSectors, "numVisitedSectors"));
			addStat(explorationStats, "% of sectors visited scavenged bare", this.getStatPercentageDerived("ratioVisitedSectorsScavengedFully", () => levelStats.countFullyScavengedSectors, "numVisitedSectors"));
			addStat(explorationStats, "Longest expedition", this.getGameStatHighScore("longestExcrusion"));
			addStat(explorationStats, "Highest coordinates visited", this.getGameStatHighScore("mostDistantSectorFromCenterVisited"));
			addStat(explorationStats, "Furthest away from camp visited", this.getGameStatHighScore("mostDistantSectorFromCampVisited"));
			addStat(explorationStats, "Lowest stamina returned to camp with", this.getGameStatHighScore("lowestStaminaReturnedToCampWith"));
			addStat(explorationStats, "Injuries received", this.getGameStatSimple("numInjuriesReceived"));
			addStat(explorationStats, "Times rested outside", this.getGameStatSimple("numTimesRestedOutside"));
			addStat(explorationStats, "Times despaired", this.getGameStatKeyedSum("numTimesDespairedPerLevel"));
			addStat(explorationStats, "Most despairs on level", this.getGameStatHighScore("numTimesDespairedPerLevel"));
			addStat(explorationStats, "Times blinded by sunlight", this.getGameStatSimple("numTimesBlindedBySunlight"), GameGlobals.gameState.isFeatureUnlocked("sunlight"));
			addStat(explorationStats, "Graffiti made", this.getGameStatSimple("numGraffitiMade"));
			result.push({ displayName: "Exploration", stats: explorationStats, isVisible: true });

			// Camp
			let campStats = [];
			addStat(campStats, "Buildings built", this.getGameStatKeyedSum("numBuildingsBuiltPerId"));
			addStat(campStats, "Buildings dismantled", this.getGameStatKeyedSum("numBuildingsDismantledPerId"));
			addStat(campStats, "Building improvements made", this.getGameStatKeyedSum("numBuildingImprovementsPerId"));
			for (let improvementID in improvementNames) {
				let improvementName = improvementNames[improvementID];
				let useAction = "use_in_" + improvementID;
				let hasUseAction = PlayerActionConstants.hasAction(useAction);
				if (hasUseAction) {
					let actionName = ImprovementConstants.getDef(improvementID).useActionName
					let isImprovementVisible = GameGlobals.campHelper.getTotalNumImprovementsBuilt(improvementName) > 0;
					addStat(campStats, "Total time: " + actionName, this.getGameStatKeyed("timeUsingCampBuildingPerId", improvementID), isImprovementVisible, GameConstants.gameStatUnits.seconds);
				}
			}
			addStat(campStats, "Most resources lost in a raid", this.getGameStatHighScore("mostResourcesLostInRaid"));

			let playerStats = [ "rumours", "evidence", "favour", "insight"];
			let playerStatsAllSources = [ "amountPlayerStatsFoundPerId", "amountPlayerStatsProducedInCampsPerId" ];
			for (let i = 0; i < playerStats.length; i++) {
				let stat = playerStats[i];
				let isStatVisible = GameGlobals.gameState.isFeatureUnlocked(stat);
				addStat(campStats, stat + ": Produced in camp", this.getGameStatKeyed("amountPlayerStatsProducedInCampsPerId", stat), isStatVisible);
				addStat(campStats, stat + ": found exploring", this.getGameStatKeyed("amountPlayerStatsFoundPerId", stat), isStatVisible);
				addStat(campStats, stat + ": % produced in camp", this.getStatPercentageFromKeyedSum("amountPlayerStatsProducedInCampsPerId", playerStatsAllSources, stat), isStatVisible);
				addStat(campStats, stat + ": % found exploring", this.getStatPercentageFromKeyedSum("amountPlayerStatsFoundPerId", playerStatsAllSources, stat), isStatVisible);
			}
			result.push({ displayName: "Camp", stats: campStats, isVisible: GameGlobals.gameState.isFeatureUnlocked("camp") });

			// Resources
			let resStats = [];
			let resStatsAllSources = [ "amountResourcesProducedInCampsPerName", "amountResourcesFoundPerName" ];
			addStat(resStats, "Resources produced in camp", this.getGameStatKeyedSum("amountResourcesProducedInCampsPerName"));
			addStat(resStats, "Resources found", this.getGameStatKeyedSum("amountResourcesFoundPerName"));
			addStat(resStats, "% of resources produced in camp", this.getStatPercentageFromKeyedSum("amountResourcesProducedInCampsPerName", resStatsAllSources));
			addStat(resStats, "% of resources found", this.getStatPercentageFromKeyedSum("amountResourcesFoundPerName", resStatsAllSources));

			for (let key in resourceNames) {
				let name = resourceNames[key];
				let isVisible = GameGlobals.gameState.isFeatureUnlocked("resource_" + name);
				addStat(resStats, name + ": produced in camp", this.getGameStatKeyed("amountResourcesProducedInCampsPerName", name), isVisible);
				addStat(resStats, name + ": produced found", this.getGameStatKeyed("amountResourcesProducedInCampsPerName", name), isVisible);
				addStat(resStats, name + ": % produced in camp", this.getStatPercentageFromKeyedSum("amountResourcesProducedInCampsPerName", resStatsAllSources, name), isVisible);
				addStat(resStats, name + ": % found", this.getStatPercentageFromKeyedSum("amountResourcesFoundPerName", resStatsAllSources, name), isVisible);
			}
			
			addStat(resStats, "Resources overflown due to storage", this.getGameStatKeyedSum("amountResourcesOverflownPerName"));
			addStat(resStats, "% of produced resources overflown", this.getStatPercentageFromKeyedSum("amountResourcesOverflownPerName", "amountResourcesProducedInCampsPerName"));
			addStat(resStats, "Food collected from traps", this.getGameStatKeyed("amountResourcesCollectedFromCollectorsPerName", resourceNames.food));
			addStat(resStats, "Water collected from buckets", this.getGameStatKeyed("amountResourcesCollectedFromCollectorsPerName", resourceNames.water));
			result.push({ displayName: "Resources", stats: resStats, isVisible: true });

			// Trade
			let tradeStats = [];
			addStat(tradeStats, "Traders received", this.getGameStatKeyed("numCampEventsByType", "trader"), GameGlobals.gameState.isFeatureUnlocked("trade"));
			addStat(tradeStats, "Trades made", this.getGameStatSimple("numTradesMade"));
			addStat(tradeStats, "Trade partners found", this.getGameStatList("foundTradingPartners"));
			addStat(tradeStats, "Caravans sent", this.getGameStatList("numCaravansSent"));
			addStat(tradeStats, "Silver found", this.getGameStatSimple("amountFoundCurrency"));
			addStat(tradeStats, "Items sold", this.getGameStatKeyedSum("numItemsSoldPerId"));
			addStat(tradeStats, "Items bought", this.getGameStatKeyedSum("numItemsBoughtPerId"));
			addStat(tradeStats, "Most items sold", this.getGameStatHighScore("numItemsSoldPerId"));
			addStat(tradeStats, "Most items bought", this.getGameStatHighScore("numItemsBoughtPerId"));
			addStat(tradeStats, "Resources sold", this.getGameStatKeyedSum("amountResourcesSoldPerName"));
			addStat(tradeStats, "Most resource sold", this.getGameStatHighScore("amountResourcesSoldPerName"));
			addStat(tradeStats, "Most resource bought", this.getGameStatKeyedSum("amountResourcesBoughtPerName"));
			addStat(tradeStats, "Item bought for highest price", this.getGameStatHighScore("highestPriceItemBought"));
			addStat(tradeStats, "Item sold for highest price", this.getGameStatHighScore("highestPriceItemSold"));
			result.push({ displayName: "Trade", stats: tradeStats, isVisible: GameGlobals.gameState.isFeatureUnlocked("trade") });

			// Fights
			let fightStats = [];
			addStat(fightStats, "Fights started", this.getGameStatSimple("numFightsStarted"));
			addStat(fightStats, "Fights won", this.getGameStatSimple("numFightsWon"));
			addStat(fightStats, "Fights fled", this.getGameStatSimple("numFightsFled"));
			addStat(fightStats, "% of fights won", this.getStatPercentage("numFightsWon", "numFightsStarted"));
			addStat(fightStats, "Enemy most defeated of", this.getGameStatHighScore("numTimesKilledEnemy"));
			addStat(fightStats, "Enemy most defeated by", this.getGameStatHighScore("numTimesKilledByEnemy"));
			addStat(fightStats, "Unique enemy types defeated", this.getGameStatList("uniqueEnemiesDefeated"));
			result.push({ displayName: "Fights", stats: fightStats, isVisible: GameGlobals.gameState.isFeatureUnlocked("fight") });

			// Items
			let itemStats = [];
			addStat(itemStats, "Items found", this.getGameStatKeyedSum("numItemsFoundPerId"));
			addStat(itemStats, "Unique items found", this.getGameStatList("uniqueItemsFound"));
			addStat(itemStats, "Items crafted", this.getGameStatSimple("numItemsCrafted"));
			addStat(itemStats, "Unique items crafted", this.getGameStatList("uniqueItemsCrafted"));
			addStat(itemStats, "Items broken", this.getGameStatSimple("numItemsBroken"));
			addStat(itemStats, "Items used", this.getGameStatKeyedSum("numItemsUsedPerId"));
			addStat(itemStats, "Ingredients found", this.getGameStatKeyedSum("numItemsFoundPerId", (id) => ItemConstants.getItemType(id) == ItemConstants.itemTypes.ingredient));
			addStat(itemStats, "Ingredients used", this.getGameStatKeyedSum("numItemsUsedPerId", (id) => ItemConstants.getItemType(id) == ItemConstants.itemTypes.ingredient));
			addStat(itemStats, "Lock picks used", this.getGameStatKeyedSum("numItemsUsedPerId", (id) => id == "exploration_1"));
			result.push({ displayName: "Items", stats: itemStats, isVisible: true });

			// Followers
			let followerStats = [];
			addStat(followerStats, "Followers recruited", this.getGameStatSimple("numFollowersRecruited"));
			addStat(followerStats, "Followers lost", this.getGameStatSimple("numFollowersLost"));
			addStat(followerStats, "Followers dismissed", this.getGameStatSimple("numFollowersDismissed"));
			addStat(followerStats, "Follower with most steps", this.getGameStatHighScore("mostStepsWithFollower"));
			addStat(followerStats, "Follower with most fights", this.getGameStatHighScore("mostFightsWithFollower"));
			result.push({ displayName: "Followers", stats: followerStats, isVisible: GameGlobals.gameState.isFeatureUnlocked("followers") });

			return result;
		},

		getGameStatSimple: function (name) {
			return { name: name, value: GameGlobals.gameState.getGameStatSimple(name) };
		},

		getGameStatDerived: function (name, getter) {
			return { name: name, value: getter() };
		},

		getStatPercentageValue: function (numerator, denominator) {
			if (!denominator) return null;
			return numerator / denominator;
		},

		getStatPercentage: function (name1, name2) {
			let value = this.getStatPercentageValue(GameGlobals.gameState.getGameStatSimple(name1), GameGlobals.gameState.getGameStatSimple(name2));
			return { name: name1 + "/" + name2, value: value, isPercentage: true };
		},

		getStatPercentageFromKeyedSum: function (name1, name2, key) {
			let numerator = GameGlobals.gameState.getGameStatKeyed(name1, key);
			let denominator = 0;

			if (Array.isArray(name2)) {
				for (let i in name2) {
					denominator += GameGlobals.gameState.getGameStatKeyed(name2[i], key);
				}
			} else {
				denominator = GameGlobals.gameState.getGameStatKeyed(name2, key);
			}

			let value = this.getStatPercentageValue(numerator, denominator);
			return { name: name1 + "/" + name2, value: value, isPercentage: true };
		},

		getStatPercentageDerived: function (name, stat1, stat2) {
			let getStat = function (stat) {
				if (typeof stat === "string") return GameGlobals.gameState.getGameStatSimple(stat);
				else return stat();
			}
			let value = this.getStatPercentageValue(getStat(stat1), getStat(stat2));
			return { name: name, value: value, isPercentage: true };
		},

		getGameStatKeyed: function (name, key) {
			let value = GameGlobals.gameState.getGameStatKeyed(name, key);
			return { name: name + "." + key, value: value };
		},

		getGameStatKeyedSum: function (name, filter) {
			let value = GameGlobals.gameState.getGameStatKeyedSum(name, filter);
			return { name: name + (filter ? "-filtered" : ""), value: value };
		},

		getGameStatList: function (name) {
			return { name: name, value: GameGlobals.gameState.getGameStatList(name) };
		},

		getGameStatHighScore: function (name) {
			let entry = GameGlobals.gameState.getGameStatHighScore(name);
			if (entry) {
				return { name: name, value: entry.value, entry: entry.entry };
			} else {
				return { name: name, value: null, entry: null };
			}
		},
		
	});

	return PlayerHelper;
});
