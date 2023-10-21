define([
	'ash',
	'utils/ValueCache',
	'game/GameGlobals',
	'game/constants/FollowerConstants',
	'game/constants/ItemConstants',
	'game/constants/LogConstants',
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
	FollowerConstants,
	ItemConstants,
	LogConstants,
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

			let addStat = function (category, stat, isVisible) {
				stat.displayName = stat.name;
				stat.isVisible = !(isVisible === false);
				category.push(stat);
			};

			// General
			let generalStats = [];
			addStat(generalStats, this.getGameStatSimple("playTime"));
			addStat(generalStats, this.getGameStatKeyedSum("timeOutsidePerLevel"));
			addStat(generalStats, this.getGameStatDerived("numTechResearched", () => GameGlobals.tribeHelper.getAllUnlockedUpgrades().length));
			addStat(generalStats, this.getGameStatSimple("numBlueprintPiecesFound"));
			result.push({ displayName: "General", stats: generalStats, isVisible: true });

			// Exploration
			let explorationStats = [];
			addStat(explorationStats, this.getGameStatSimple("numStepsTaken"));
			addStat(explorationStats, this.getGameStatSimple("numTimesScavenged"));
			addStat(explorationStats, this.getGameStatSimple("numTimesScouted"));
			addStat(explorationStats, this.getGameStatSimple("numVisitedSectors"));
			addStat(explorationStats, this.getGameStatHighScore("numStepsPerLevel"));
			addStat(explorationStats, this.getGameStatSimple("numExcursionsStarted"), GameGlobals.gameState.isFeatureUnlocked("camp"));
			addStat(explorationStats, this.getGameStatSimple("numExcursionsSurvived"), GameGlobals.gameState.isFeatureUnlocked("camp"));
			addStat(explorationStats, this.getStatPercentage("numExcursionsSurvived", "numExcursionsStarted"), GameGlobals.gameState.isFeatureUnlocked("camp"));
			addStat(explorationStats, this.getGameStatHighScore("mostDistantSectorFromCenterVisited"));
			result.push({ displayName: "Exploration", stats: explorationStats, isVisible: true });

			// Survival
			let survivalStats = [];
			addStat(survivalStats, this.getGameStatKeyedSum("numTimesDespairedPerLevel"));
			addStat(survivalStats, this.getGameStatHighScore("numTimesDespairedPerLevel"));
			result.push({ displayName: "Survival", stats: survivalStats, isVisible: true });

			// Camp
			let campStats = [];
			addStat(campStats, this.getGameStatKeyedSum("numBuildingsBuiltPerId"));
			result.push({ displayName: "Camp", stats: campStats, isVisible: GameGlobals.gameState.isFeatureUnlocked("camp") });

			// Trade
			let tradeStats = [];
			addStat(tradeStats, this.getGameStatSimple("numTradesMade"));
			result.push({ displayName: "Trade", stats: tradeStats, isVisible: GameGlobals.gameState.isFeatureUnlocked("trade") });

			// Fights
			let fightStats = [];
			addStat(fightStats, this.getGameStatSimple("numFightsStarted"));
			addStat(fightStats, this.getGameStatSimple("numFightsWon"));
			addStat(fightStats, this.getGameStatSimple("numFightsFled"));
			addStat(fightStats, this.getStatPercentage("numFightsWon", "numFightsStarted"));
			addStat(fightStats, this.getGameStatHighScore("numTimesKilledByEnemy"));
			addStat(fightStats, this.getGameStatHighScore("numTimesKilledEnemy"));
			result.push({ displayName: "Fights", stats: fightStats, isVisible: GameGlobals.gameState.isFeatureUnlocked("fight") });

			// Items
			let itemStats = [];
			addStat(itemStats, this.getGameStatSimple("numItemsCrafted"));
			addStat(itemStats, this.getGameStatList("uniqueItemsCrafted"));
			addStat(itemStats, this.getGameStatKeyedSum("numItemsUsedPerId"));
			result.push({ displayName: "Items", stats: itemStats, isVisible: true });

			// Followers
			let followerStats = [];
			addStat(fightStats, this.getGameStatSimple("numFollowersRecruited"));
			result.push({ displayName: "Followers", stats: followerStats, isVisible: GameGlobals.gameState.isFeatureUnlocked("followers") });

			return result;
		},

		getGameStatSimple: function (name) {
			return { name: name, value: GameGlobals.gameState.getGameStatSimple(name) };
		},

		getGameStatDerived: function (name, getter) {
			return { name: name, value: getter() };
		},

		getStatPercentage: function (name1, name2) {
			let value = GameGlobals.gameState.getGameStatSimple(name1) / GameGlobals.gameState.getGameStatSimple(name2);
			return { name: name1 + "/" + name2, value: value, isPercentage: true };
		},

		getGameStatKeyedSum: function (name) {
			let value = GameGlobals.gameState.getGameStatKeyedSum(name);
			return { name: name, value: value };
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
