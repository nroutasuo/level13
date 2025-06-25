define([
	'ash',
	'utils/MathUtils',
	'utils/ValueCache',
	'game/GameGlobals',
	'game/constants/BagConstants',
	'game/constants/DialogueConstants',
	'game/constants/GameConstants',
	'game/constants/ExplorerConstants',
	'game/constants/PositionConstants',
	'game/constants/ItemConstants',
	'game/constants/LogConstants',
	'game/constants/MovementConstants',
	'game/constants/PerkConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/PlayerStatConstants',
	'game/nodes/NearestCampNode',
	'game/nodes/PlayerPositionNode',
	'game/nodes/PlayerLocationNode',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/player/PlayerResourcesNode',
	'game/components/common/CampComponent',
	'game/components/player/HopeComponent',
	'game/components/player/ExcursionComponent',
	'game/components/player/PlayerActionComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/MovementOptionsComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/common/LogMessagesComponent',
	'game/components/common/MovementComponent',
], function (
	Ash,
	MathUtils,
	ValueCache,
	GameGlobals,
	BagConstants,
	DialogueConstants,
	GameConstants,
	ExplorerConstants,
	PositionConstants,
	ItemConstants,
	LogConstants,
	MovementConstants,
	PerkConstants,
	PlayerActionConstants,
	PlayerStatConstants,
	NearestCampNode,
	PlayerPositionNode,
	PlayerLocationNode,
	PlayerStatsNode,
	PlayerResourcesNode,
	CampComponent,
	HopeComponent,
	ExcursionComponent,
	PlayerActionComponent,
	SectorFeaturesComponent,
	MovementOptionsComponent,
	SectorStatusComponent,
	LogMessagesComponent,
	MovementComponent,
) {
	
	let PlayerHelper = Ash.Class.extend({
		
		playerPosNodes: null,
		playerStatsNodes: null,
		playerResourcesNodes: null,
		nearestCampNodes: null,
		playerLocationNodes: null,

		lastLogMessageByID: {},

		constructor: function (engine) {
			this.playerPosNodes = engine.getNodeList(PlayerPositionNode);
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			this.playerResourcesNodes = engine.getNodeList(PlayerResourcesNode);
			this.nearestCampNodes = engine.getNodeList(NearestCampNode);
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
		},
		
		getPlayerEntity: function () {
			return this.playerStatsNodes.head.entity;
		},
		
		isInCamp: function () {
			if (!this.playerPosNodes.head) return false;
			return this.playerPosNodes.head.position.inCamp;
		},

		getPosition: function () {
			if (!this.playerPosNodes.head) return null;
			return this.playerPosNodes.head.position;
		},

		getLocation: function () {
			if (!this.playerLocationNodes.head) return null;
			return this.playerLocationNodes.head.entity;
		},
		
		isBusy: function () {
			let player = this.playerStatsNodes.head.entity;
			if (player.has(MovementComponent)) return true;
			let playerActionComponent = this.playerResourcesNodes.head.entity.get(PlayerActionComponent);
			return playerActionComponent.isBusy();
		},

		isAwake: function () {
			return this.playerStatsNodes.head.vision.isAwake;
		},

		hasForcedDialogue: function () {
			let explorers = this.getExplorers();
			for (let i = 0; i < explorers.length; i++) {
				let explorerVO = explorers[i];
				let status = GameGlobals.dialogueHelper.getExplorerDialogueStatus(explorerVO);
				if (status == DialogueConstants.STATUS_FORCED) {
					return true;
				}
			}
			return false;
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

		getBusyAction: function () {
			let playerActionComponent = this.playerResourcesNodes.head.entity.get(PlayerActionComponent);
			return playerActionComponent.getBusyAction();
		},

		getActiveDespairType: function () {
			if (!GameGlobals.gameState.isFeatureUnlocked("camp")) return null;
			if (!GameGlobals.gameState.isFeatureUnlocked("move")) return null;
			if (!GameGlobals.gameState.isFeatureUnlocked("sectors")) return null;
			if (GameGlobals.playerHelper.isInCamp()) return null;
			if (!GameGlobals.playerHelper.isAwake()) return null;
			if (this.playerLocationNodes.head.entity.has(CampComponent)) return null;

			 // can happen in hazard sectors if you lose equipment
			let movementOptionsComponent = this.playerLocationNodes.head.entity.get(MovementOptionsComponent);
			let isValidDespairMove = !movementOptionsComponent.canMove();
			if (isValidDespairMove) return MovementConstants.DESPAIR_TYPE_MOVEMENT;

			// should have higher prio than food / water
			let moveStaminaCost = this.getCurrentMoveCost().stamina;
			let isValidDespairStamina = this.playerStatsNodes.head.stamina.stamina < moveStaminaCost;
			if (isValidDespairStamina) return MovementConstants.DESPAIR_TYPE_STAMINA;

			let isValidDespairThirst = GameGlobals.gameState.unlockedFeatures["resource_water"] && !this.hasAccessToResource(resourceNames.water, false, false);
			if (isValidDespairThirst) return MovementConstants.DESPAIR_TYPE_THIRST;

			let isValidDespairHunger = GameGlobals.gameState.unlockedFeatures["resource_food"] && !this.hasAccessToResource(resourceNames.food, false, false);
			if (isValidDespairHunger) return MovementConstants.DESPAIR_TYPE_HUNGRER;

			return null;
		},
		
		hasAccessToResource: function (resourceName, includeScavenge, includeUnbuiltCollectible) {
			if (this.getResouceInInventory(resourceName) >= 1) {
				return true;
			}
			
			var statusComponent = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			var featuresComponent = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			var itemsComponent = this.playerStatsNodes.head.items;
			var isAffectedByHazard = GameGlobals.sectorHelper.isAffectedByHazard(featuresComponent, statusComponent, itemsComponent);
			
			if (!isAffectedByHazard) {
				if (includeScavenge && this.hasScavengeableResource(resourceName)) {
					return true;
				}
				if (this.hasCollectibleResource(resourceName, includeUnbuiltCollectible)) {
					return true;
				}
			}
			
			return false;
		},
		
		getResouceInInventory: function (resourceName) {
			return GameGlobals.resourcesHelper.getCurrentStorage().resources.getResource(resourceName) || 0;
		},
		
		hasScavengeableResource: function (resourceName) {
			return GameGlobals.sectorHelper.hasScavengeableResource(resourceName);
		},
		
		hasCollectibleResource: function (resourceName, includeUnbuilt) {
			return GameGlobals.sectorHelper.hasCollectibleResource(resourceName, includeUnbuilt);
		},
		
		moveTo: function (level, sectorX, sectorY, inCamp, action, isInstant) {
			let player = this.playerStatsNodes.head.entity;
			if (!player) return;
			if (player.has(MovementComponent)) {
				log.w("trying to move but already moving");
				return;
			}
			player.add(new MovementComponent(level, sectorX, sectorY, inCamp, action, isInstant));
		},

		canMove: function () {
			let hasCampHere = this.playerLocationNodes.head.entity.has(CampComponent);
			if (hasCampHere) return true;

			let moveActions = [
				"move_camp_level",
				"move_level_down",
				"move_level_up",
				"move_sector_east",
				"move_sector_grit_east",
				"move_sector_ne",
				"move_sector_grit_ne",
				"move_sector_north",
				"move_sector_grit_north",
				"move_sector_nw",
				"move_sector_grit_nw",
				"move_sector_se",
				"move_sector_grit_se",
				"move_sector_south",
				"move_sector_grit_south",
				"move_sector_sw",
				"move_sector_grit_sw",
				"move_sector_west",
				"move_sector_grit_west",
			];
			for (let i = 0; i < moveActions.length; i++) {
				let action = moveActions[i];
				if (GameGlobals.playerActionsHelper.isAvailable(action)) return true;
			}

			return false;
		},
		
		addLogMessageWithPosition: function (id, msg, position) {
			this.addLogMessage(id, msg, { position: position });
		},

		// msg can be string, TextFragmentVO, or TextVO
		addLogMessage: function (id, msg, options) {
			if (!msg) {
				log.i("No message text defined for log message");
				return;
			}

			let messageTextVO = msg;

			if (typeof msg === "string") {
				messageTextVO = { textFragments: [ { textKey: msg } ] };
			}

			if (msg.textKey) {
				messageTextVO = { textFragments: [ msg ] };
			}

			if (!messageTextVO.textFragments) {
				debugger
				log.i("addLogMessage: unknown format");
				console.log(msg);
				return;
			}

			for (let i = 0; i < messageTextVO.textFragments.length; i++) {
				let fragment = messageTextVO.textFragments[i];
				if (fragment) {
					fragment.textKey = LogConstants.cleanupMessage(fragment.textKey);
				} else {
					debugger
					log.w("invalid messageTextVO in addLogMessage");
				}
			}

			id = id || LogConstants.getUniqueID();
			options = options || {};

			let cooldown = LogConstants.getCooldown(id);
			if (cooldown) {
				let now = new Date().getTime();
				let lastMessageTimestamp = this.lastLogMessageByID[id] || 0;

				if (now - lastMessageTimestamp < cooldown) {
					log.i("Skipping log message due to cooldown: " + id);
					return;
				}

				this.lastLogMessageByID[id] = now;
			}

			let position = options.position || this.playerPosNodes.head.position.getPosition();
			let visibility = options.visibility || LogConstants.MSG_VISIBILITY_DEFAULT;

			let logComponent = this.playerPosNodes.head.entity.get(LogMessagesComponent);
			logComponent.addMessage(id, messageTextVO, position, visibility);
		},

		isLogMessageVisible: function (messageVO) {
			let playerPosition = this.playerPosNodes.head.position;
			if (!playerPosition) return false;

			if (!messageVO.position) return true;

			if (playerPosition.inCamp) {
				let campSector = GameGlobals.levelHelper.getCampSectorOnLevel(playerPosition.level);
				let campFoundedTimestamp = campSector.get(CampComponent).foundedTimeStamp;
				let campFoundedDate = new Date(campFoundedTimestamp);
				if (campFoundedDate && messageVO.timestamp && messageVO.timestamp < campFoundedTimestamp - 1000) return false;
			}

			if (messageVO.visibility == LogConstants.MSG_VISIBILITY_GLOBAL) {
				return true;
			}

			if (messageVO.visibility == LogConstants.MSG_VISIBILITY_CAMP) {
				return playerPosition.inCamp;
			}

			if (messageVO.visibility == LogConstants.MGS_VISIBILITY_LEVEL) {
				return messageVO.position.level == playerPosition.level;
			}

			// default priority: depending on message position, either in specific camp or anywhere outside
			if (messageVO.position.inCamp) {
				return messageVO.position.inCamp == playerPosition.inCamp && messageVO.position.level == playerPosition.level;
			} else {
				return messageVO.position.inCamp == playerPosition.inCamp
			}
		},

		getLastVisibileLogMessageTimestamp: function () {
			let logComponent = this.playerPosNodes.head.entity.get(LogMessagesComponent);
			let messages = [];
			messages = messages.concat(logComponent.messages);

			for (let i = messages.length - 1; i >= 0; i--) {
				let messageVO = messages[i];
				if (this.isLogMessageVisible(messageVO)) {
					return messageVO.timestamp;
				}
			}

			return 0;
		},
		
		isReadyForExploration: function () {
			if (this.getCurrentStamina() <= this.getCurrentStaminaWarningLimit()) {
				return false;
			}
			
			return true;
		},

		canTakeAllRewards: function (resultVO) {
			if (!resultVO || resultVO.isVisuallyEmpty()) return true;

			let bagComponent = this.playerResourcesNodes.head.bag;
			let inCamp = this.isInCamp();
			let resources = this.playerResourcesNodes.head.resources;
			let items =  this.playerStatsNodes.head.items.getAll(inCamp);
			let selectableCapacity = BagConstants.getSelectableCapacity(resultVO, resources, items);
			if (selectableCapacity > bagComponent.totalCapacity) return false;

			return true;
		},

		hasRewardsThatRequireResultPopup: function (resultVO) {
			if (!resultVO) return false;
			// in these cases the result popup is shown, even if by default not shown by test mode etc
			// it can be skipped for resources and player stats
			if (resultVO.gainedItems.length > 0) return true;
			if (resultVO.lostItems.length > 0) return true;
			if (resultVO.brokenItems.length > 0) return true;
			if (resultVO.gainedExplorers.length > 0) return true;
			if (resultVO.lostExplorers.length > 0) return true;
			if (resultVO.gainedExplorerInjuries.length > 0) return true;
			if (resultVO.lostExplorerInjuries.length > 0) return true;
			if (resultVO.lostPerks.length > 0) return true;
			if (resultVO.gainedPerks.length > 0) return true;
			if (resultVO.gainedItemUpgrades.length > 0) return true;
			if (resultVO.gainedBlueprintPiece != null) return true;
			return false;
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

		getCurrentMoveCost: function () {
			return GameGlobals.playerActionsHelper.getCosts("move_sector_west");
		},
		
		getPathToCamp: function () {
			if (!this.nearestCampNodes.head) return null;
			let campSector = this.nearestCampNodes.head.entity;
			let path = GameGlobals.levelHelper.findPathTo(this.playerLocationNodes.head.entity, campSector, { skipBlockers: true, skipUnvisited: true });
			return path;
		},

		getDistanceToCamp: function () {
			if (!this.nearestCampNodes.head) return 999;
			let playerPosition = this.playerPosNodes.head.position.getPosition();
			let campPosition = this.nearestCampNodes.head.position;
			return PositionConstants.getDistanceTo(campPosition, playerPosition);
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
				result *= this.playerStatsNodes.head.explorers.getCurrentBonus(itemBonusType);
			} else {
				result += this.playerStatsNodes.head.items.getCurrentBonus(itemBonusType);
				result += this.playerStatsNodes.head.explorers.getCurrentBonus(itemBonusType);
			}
			
			return result;
		},
		
		getCurrentBonusDesc: function (itemBonusType) {
			let result = "";
			
			let items = this.playerStatsNodes.head.items.getEquipped();
			for (let i = 0; i < items.length; i++) {
				let item = items[i];
				let itemBonus = ItemConstants.getCurrentBonus(item, itemBonusType);
				let itemName = ItemConstants.getItemDisplayName(item);
				if (itemBonus > 0) {
					if (result.length > 0) result += "<br/>";
					result += itemName + ": " + itemBonus;
				}
			}
			
			let explorers = this.playerStatsNodes.head.explorers.getParty();
			for (let i = 0; i < explorers.length; i++) {
				let explorer = explorers[i];
				let explorerBonus = ExplorerConstants.getExplorerItemBonus(explorer, explorers, itemBonusType);
				if (explorerBonus > 0) {
					if (result.length > 0) result += "<br/>";
					result += explorer.name + ": " + Math.round(explorerBonus*10)/10;
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
						result += "Debris: " + debrisMalus;
					}
					let floodedMalus = GameGlobals.sectorHelper.getFloodedMovementMalus(sector);
					if (floodedMalus !== 1) {
						if (result.length > 0) result += "<br/>";
						result += "Flooded: " + floodedMalus;
					}
					break;
			}
			
			return result;
		},

		getPartyAbilityLevel: function (explorerAbilityType) {
			if (!this.playerStatsNodes.head) return 0;
			
			let explorers = this.playerStatsNodes.head.explorers.getParty();
			for (let i = 0; i < explorers.length; i++) {
				let explorer = explorers[i];
				let ability = explorer.abilityType;
				if (ability == explorerAbilityType) return explorer.abilityLevel;
			}
			return 0;
		},
		
		addItem: function (itemDef, level, sourcePosition) {
			if (!itemDef) {
				log.w("trying to add item with no item def");
				return;
			}
			
			let itemsComponent = this.playerStatsNodes.head.items;
			let playerPosition = this.playerPosNodes.head.position.getPosition();
			sourcePosition = sourcePosition || playerPosition.clone();
			
			level = level || ItemConstants.getDefaultItemLevel(itemDef.type);
			let item = ItemConstants.getNewItemInstanceByDefinition(itemDef, level);
			
			let isCarried = !playerPosition.inCamp && sourcePosition.equals(playerPosition);
			itemsComponent.addItem(item, isCarried);
			item.foundPosition = sourcePosition.clone();
		},

		addPerk: function (perkID, startTimer, endTimer) {
			let perksComponent = this.playerStatsNodes.head.perks;
			if (!perksComponent) return;
			if (perksComponent.hasPerk(perkID)) return;

			if (this.isPerkBlocked(perkID)) {
				log.i("addPerk " + perkID + " blocked by existing perk");
				return;
			}

			let perkVO = PerkConstants.getPerk(perkID, startTimer, endTimer);

			if (!perkVO) {
				return;
			}

			perksComponent.addPerk(perkVO);
		},

		isPerkBlocked: function (perkID) {
			let perksComponent = this.playerStatsNodes.head.perks;
			let blockingPerks = PerkConstants.getBlockingPerks(perkID);
			for (let i = 0; i < blockingPerks.length; i++) {
				if (perksComponent.hasPerk(blockingPerks[i])) {
					return true;
				}
			}

			return false;
		},

		selectItemForItemUpgrade: function (itemFilter) {
			let validItems = [];

			let filter = itemFilter.replaceAll("_", ""); // so "weapon_" also matches "weapon4";
			
			let itemsComponent = this.playerStatsNodes.head.items;
			let playerItems = itemsComponent.getAll(false);

			for (let i = 0; i < playerItems.length; i++) {
				let itemVO = playerItems[i];
				if (!itemVO.id.startsWith(filter)) continue;
				if (!ItemConstants.canBeUpgraded(itemVO)) continue;
				validItems.push(itemVO);
			}

			if (validItems.length == 0) {
				return null;
			}

			return MathUtils.randomElement(validItems);
		},

		upgradeItem: function (itemID) {
			let itemsComponent = this.playerStatsNodes.head.items;
			let itemVO = itemsComponent.getItem(itemID, null, false, true, itemVO => ItemConstants.canBeUpgraded(itemVO));

			if (!itemVO) {
				itemVO = itemsComponent.getItem(itemID, null, true, true, itemVO => ItemConstants.canBeUpgraded(itemVO));
			}

			if (!itemVO) {
				log.w("could not find item to upgrade: " + itemID);
				return;
			}
			
			let currentQuality = ItemConstants.getItemQuality(itemVO);

			switch (currentQuality) {
				case ItemConstants.itemQuality.low:
					itemVO.level = ItemConstants.DEFAULT_EQUIPMENT_ITEM_LEVEL;
					break;
				case ItemConstants.itemQuality.medium:
					itemVO.level = 85;
					break;
			}
		},
		
		getBestAvailableExplorer: function (explorerType, exlucingAbilityType) {
			let explorersComponent = this.playerStatsNodes.head.explorers;
			let explorers = explorersComponent.getExplorersByType(explorerType, false);
			let result = null;
			let resultLevel = 0;
			for (let i = 0; i < explorers.length; i++) {
				let explorer = explorers[i];
				if (exlucingAbilityType && explorer.abilityType == exlucingAbilityType) continue;
				if (explorer.abilityLevel > resultLevel) {
					result = explorer;
					resultLevel = explorer.abilityLevel;
				}
			}
			return result;
		},

		getExplorerToHeal: function () {
			let explorersComponent = this.playerStatsNodes.head.explorers;
			return this.getExplorerToHealFromList(explorersComponent.getParty()) || this.getExplorerToHealFromList(explorersComponent.getAll());
		},

		getExplorerToHealFromList: function (explorers) {
			for (let i = 0; i < explorers.length; i++) {
				let explorerVO = explorers[i];
				if (explorerVO.injuredTimer > 0) return explorerVO;
			}

			return null;
		},

		hasAdequateFighter: function () {
			let campOrdinal = GameGlobals.campHelper.getCurrentCampOrdinal();
			let campStep = GameGlobals.campHelper.getCurrentCampStep();
			
			let getExplorerFightTotal = function (explorer) {
				if (!explorer) return 0;
				return ExplorerConstants.getExplorerItemBonus(explorer, [], ItemConstants.itemBonusTypes.fight_att)
					+ ExplorerConstants.getExplorerItemBonus(explorer, [], ItemConstants.itemBonusTypes.fight_def);
			}
			
			let currentBestFighter = GameGlobals.playerHelper.getBestAvailableExplorer(ExplorerConstants.explorerType.FIGHTER, ExplorerConstants.abilityType.FLEE);
			let typicalFighter = ExplorerConstants.getTypicalFighter(campOrdinal, campStep);
			let currentBestTotal = getExplorerFightTotal(currentBestFighter);
			let typicalTotal = getExplorerFightTotal(typicalFighter);
			
			return currentBestTotal > 0.5 * typicalTotal;
		},
		
		isAffectedByHazardAt: function (sector) {
			return GameGlobals.sectorHelper.isSectorAffectedByHazard(sector, this.playerStatsNodes.head.items);
		},
		
		getMaxHope: function () {
			let hopeComponent = this.playerStatsNodes.head.entity.get(HopeComponent);
			let hasDeity = hopeComponent != null;
			return hasDeity ? hopeComponent.maxHope : 0;
		},

		getExplorers: function () {
			return this.playerStatsNodes.head.explorers.getAll();
		},

		getParty: function () {
			return this.playerStatsNodes.head.explorers.getParty();
		},

		getExplorerByID: function (explorerID) {
			let explorers = this.getExplorers();
			for (let i = 0; i < explorers.length; i++) {
				let explorerVO = explorers[i];
				if (explorerVO.id == explorerID) return explorerVO;
			}
			return null;
		},

		getExplorerStats: function () {
			let result = {}

			let playerExplorers = this.getExplorers();
			let playerFighters = this.playerStatsNodes.head.explorers.getExplorersByType(ExplorerConstants.explorerType.FIGHTER);
			let playerScouts = this.playerStatsNodes.head.explorers.getExplorersByType(ExplorerConstants.explorerType.SCOUT);
			let playerScavengers = this.playerStatsNodes.head.explorers.getExplorersByType(ExplorerConstants.explorerType.SCAVENGER);

			result.numTotalExplorers = playerExplorers.length;
			result.numExplorersByType = {};
			result.numExplorersByType[ExplorerConstants.explorerType.FIGHTER] = playerFighters.length;
			result.numExplorersByType[ExplorerConstants.explorerType.SCOUT] = playerScouts.length;
			result.numExplorersByType[ExplorerConstants.explorerType.SCAVENGER] = playerScavengers.length;

			result.numExplorersByAbilityType = {};
			for (let i = 0; i < playerExplorers.length; i++) {
				let abilityType = playerExplorers[i].abilityType;
				if (!result.numExplorersByAbilityType[abilityType]) result.numExplorersByAbilityType[abilityType] = 0;
				result.numExplorersByAbilityType[abilityType] += 1;
			}

			result.minExplorersByType = Math.min(playerFighters.length, playerScouts.length, playerScavengers.length);

			result.hasAllTypes = playerFighters.length > 0 && playerScouts.length > 0 && playerScavengers.length > 0;

			return result;
		},

		getVisibleGameStats: function () {
			let result = [];
			let currentCateogry = null;
			let currentSubCategory = null;

			let visibleIfValueGreaterThanZero = "visibleIfValueGreaterThanZero";

			let startCategory = function (displayName, isVisible) {
				if (currentCateogry) endCategory();
				currentCateogry = { displayName: displayName, isVisible, isVisible, stats: [] };
				result.push(currentCateogry);
			};

			let endCategory = function () {
				currentCateogry = null;
			};

			let startSubCategory = function (displayName, isVisible) {
				if (currentSubCategory) endSubCategory();
				isVisible = !(isVisible === false);
				currentSubCategory = { displayName: displayName, isVisible: isVisible, isSubCategory: true };
				currentCateogry.stats.push(currentSubCategory);
			};

			let endSubCategory = function () {
				currentSubCategory = null;
			};

			let addStat = function (displayName, stat, isVisible, unit, entryUnit) {
				stat.displayName = displayName || stat.name;
				unit = unit || GameConstants.gameStatUnits.general;
				entryUnit = entryUnit || GameConstants.gameStatUnits.general;

				stat.unit = unit;
				stat.entryUnit = entryUnit;
				stat.isVisible = !(isVisible === false);
				if (isVisible === visibleIfValueGreaterThanZero) stat.isVisible = stat.value > 0;
				if (currentSubCategory && !currentSubCategory.isVisible) stat.isVisible = false;
				if (currentSubCategory) stat.isInSubCategory = true;

				currentCateogry.stats.push(stat);
			};

			// General
			startCategory("General", true);
			addStat("Time played", this.getGameStatSimple("playTime"), true, GameConstants.gameStatUnits.seconds);
			addStat("Time outside", this.getGameStatKeyedSum("timeOutsidePerLevel"), true, GameConstants.gameStatUnits.seconds);
			addStat("Blueprint pieces found", this.getGameStatSimple("numBlueprintPiecesFound"), GameGlobals.gameState.isFeatureUnlocked("blueprints"));
			endCategory();

			// Exploration
			startCategory("Exploration", true);
			addStat("Steps taken", this.getGameStatSimple("numStepsTaken"));
			addStat("Sectors visited", this.getGameStatSimple("numVisitedSectors"));
			addStat("Sectors scouted", this.getGameStatSimple("numTimesScouted"));
			addStat("Times scavenged", this.getGameStatSimple("numTimesScavenged"));
			addStat("Most steps on level", this.getGameStatHighScore("numStepsPerLevel"), GameGlobals.gameState.isFeatureUnlocked("levels"), GameConstants.gameStatUnits.steps, GameConstants.gameStatUnits.level);
			addStat("Expeditions started", this.getGameStatSimple("numExcursionsStarted"), GameGlobals.gameState.isFeatureUnlocked("camp"));
			addStat("Expeditions survived", this.getStatPercentage("numExcursionsSurvived", "numExcursionsStarted"), GameGlobals.gameState.isFeatureUnlocked("camp"));
			addStat("Longest survived", this.getGameStatHighScore("longestSurvivedExcrusion"), GameGlobals.gameState.isFeatureUnlocked("camp"), GameConstants.gameStatUnits.steps, GameConstants.gameStatUnits.level);
			endSubCategory();
			// addStat("Highest coordinates visited", this.getGameStatHighScore("mostDistantSectorFromCenterVisited"), GameGlobals.playerHelper.hasItem("equipment_map"));
			// addStat("Furthest away from camp", this.getGameStatHighScore("mostDistantSectorFromCampVisited"), GameGlobals.gameState.isFeatureUnlocked("camp"), GameConstants.gameStatUnits.steps);
			// addStat("Lowest stamina when returning to camp", this.getGameStatHighScore("lowestStaminaReturnedToCampWith"), GameGlobals.gameState.isFeatureUnlocked("camp"));
			addStat("Injuries received", this.getGameStatSimple("numInjuriesReceived"));
			addStat("Explorer injuries received", this.getGameStatSimple("numExplorerInjuriesReceived"), GameGlobals.gameState.isFeatureUnlocked("explorers"));
			addStat("Times rested outside", this.getGameStatSimple("numTimesRestedOutside"));
			addStat("Times despaired", this.getGameStatKeyedSum("numTimesDespairedPerLevel"));
			addStat("Most despairs on level", this.getGameStatHighScore("numTimesDespairedPerLevel"), GameGlobals.gameState.isFeatureUnlocked("levels"));
			addStat("People met outside", this.getGameStatList("uniqueOutNPCsMet"), visibleIfValueGreaterThanZero);
			addStat("Graffiti made", this.getGameStatSimple("numGraffitiMade"), visibleIfValueGreaterThanZero);
			endCategory();

			// Camp
			startCategory("Camp", GameGlobals.gameState.isFeatureUnlocked("camp"));
			addStat("Buildings built", this.getGameStatKeyedSum("numBuildingsBuiltPerId", id => getImprovementType(improvementNames[id]) == improvementTypes.camp));
			addStat("Buildings dismantled", this.getGameStatKeyedSum("numBuildingsDismantledPerId"));
			addStat("Building improvements", this.getGameStatKeyedSum("numBuildingImprovementsPerId"));
			/*
			for (let improvementID in improvementNames) {
				let improvementName = improvementNames[improvementID];
				let useAction = "use_in_" + improvementID;
				let hasUseAction = PlayerActionConstants.hasAction(useAction);
				if (hasUseAction) {
					let actionName = ImprovementConstants.getDef(improvementID).useActionName
					let isImprovementVisible = GameGlobals.campHelper.getTotalNumImprovementsBuilt(improvementName) > 0;
					addStat("Total time: " + actionName, this.getGameStatKeyed("timeUsingCampBuildingPerId", improvementID), isImprovementVisible, GameConstants.gameStatUnits.seconds);
				}
			}
			*/
			addStat("Raids sustained", this.getGameStatKeyed("numCampEventsByType", "raid"));
			addStat("Raids lost", this.getGameStatSimple("numRaidsLost"));
			addStat("Most resources lost in a raid", this.getGameStatHighScore("mostResourcesLostInRaid"));
			addStat("Disease outbreaks", this.getGameStatKeyed("numCampEventsByType", "disease"));
			addStat("Natural disasters", this.getGameStatKeyed("numCampEventsByType", "disaster"));
			addStat("Refugees accepted", this.getGameStatSimple("numRefugeesAccepted"), visibleIfValueGreaterThanZero);

			let playerStats = [ "rumours", "evidence", "hope", "insight"];
			let playerStatsAllSources = [ "amountPlayerStatsFoundPerId", "amountPlayerStatsProducedInCampsPerId" ];
			for (let i = 0; i < playerStats.length; i++) {
				let stat = playerStats[i];
				let isStatVisible = GameGlobals.gameState.isFeatureUnlocked(stat);
				addStat(stat + ": Produced in camp", this.getGameStatKeyed("amountPlayerStatsProducedInCampsPerId", stat), isStatVisible && GameGlobals.gameState.isFeatureUnlocked("camp"));
				addStat(stat + ": Found exploring", this.getGameStatKeyed("amountPlayerStatsFoundPerId", stat), isStatVisible);
				// addStat("% produced in camp", this.getStatPercentageFromKeyedSum("amountPlayerStatsProducedInCampsPerId", playerStatsAllSources, stat), isStatVisible && GameGlobals.gameState.isFeatureUnlocked("camp"));
				// addStat("% found exploring", this.getStatPercentageFromKeyedSum("amountPlayerStatsFoundPerId", playerStatsAllSources, stat), isStatVisible && GameGlobals.gameState.isFeatureUnlocked("camp"));
			}
			endCategory();

			// Resources
			startCategory("Resources", true);
			let resStatsAllSources = [ "amountResourcesProducedInCampsPerName", "amountResourcesFoundPerName" ];
			//addStat("Resources produced in camp", this.getGameStatKeyedSum("amountResourcesProducedInCampsPerName"), GameGlobals.gameState.isFeatureUnlocked("camp"));
			//addStat("Resources found", this.getGameStatKeyedSum("amountResourcesFoundPerName"));

			for (let key in resourceNames) {
				let name = resourceNames[key];
				let isVisible = GameGlobals.gameState.isFeatureUnlocked("resource_" + name);
				let isCampVisible = GameGlobals.gameState.isFeatureUnlocked("camp");
				addStat(name + ": Produced in camp", this.getGameStatKeyed("amountResourcesProducedInCampsPerName", name), isVisible && isCampVisible);
				addStat(name + ": Found", this.getGameStatKeyed("amountResourcesFoundPerName", name), isVisible);
				//addStat("% produced in camp", this.getStatPercentageFromKeyedSum("amountResourcesProducedInCampsPerName", resStatsAllSources, name), GameGlobals.gameState.isFeatureUnlocked("camp"));
				//addStat("% found", this.getStatPercentageFromKeyedSum("amountResourcesFoundPerName", resStatsAllSources, name), GameGlobals.gameState.isFeatureUnlocked("camp"));
			}
			
			addStat("Resources overflown due to storage", this.getGameStatKeyedSum("amountResourcesOverflownPerName"), GameGlobals.gameState.isFeatureUnlocked("camp"));
			addStat("% of produced resources overflown", this.getStatPercentageFromKeyedSum("amountResourcesOverflownPerName", "amountResourcesProducedInCampsPerName"), GameGlobals.gameState.isFeatureUnlocked("camp"));
			addStat("Food collected from traps", this.getGameStatKeyed("amountResourcesCollectedFromCollectorsPerName", resourceNames.food));
			addStat("Water collected from buckets", this.getGameStatKeyed("amountResourcesCollectedFromCollectorsPerName", resourceNames.water));
			endCategory();

			// Trade
			startCategory("Trade", GameGlobals.gameState.isFeatureUnlocked("trade"));
			addStat("Traders received", this.getGameStatKeyed("numCampEventsByType", "trader"), GameGlobals.gameState.isFeatureUnlocked("trade"));
			addStat("Trades made", this.getGameStatSimple("numTradesMade"));
			addStat("Trade partners found", this.getGameStatList("foundTradingPartners"));
			addStat("Caravans sent", this.getGameStatSimple("numCaravansSent"));
			addStat("Silver found", this.getGameStatSimple("amountFoundCurrency"), GameGlobals.gameState.isFeatureUnlocked("currency"));
			addStat("Items sold", this.getGameStatKeyedSum("numItemsSoldPerId"));
			addStat("Items bought", this.getGameStatKeyedSum("numItemsBoughtPerId"));
			addStat("Most items sold", this.getGameStatHighScore("numItemsSoldPerId"));
			addStat("Most items bought", this.getGameStatHighScore("numItemsBoughtPerId"));
			addStat("Resources sold", this.getGameStatKeyedSum("amountResourcesSoldPerName"));
			addStat("Most resource sold", this.getGameStatHighScore("amountResourcesSoldPerName"));
			addStat("Most resource bought", this.getGameStatHighScore("amountResourcesBoughtPerName"));
			addStat("Item bought for highest price", this.getGameStatHighScore("highestPriceItemBought"));
			addStat("Item sold for highest price", this.getGameStatHighScore("highestPriceItemSold"));
			endCategory();

			// Fights
			startCategory("Fight", GameGlobals.gameState.isFeatureUnlocked("fight"));
			addStat("Fights started", this.getGameStatSimple("numFightsStarted"));
			addStat("Fights won", this.getGameStatSimple("numFightsWon"));
			// addStat("Fights fled", this.getGameStatSimple("numFightsFled")); 
			// addStat("% of fights won", this.getStatPercentage("numFightsWon", "numFightsStarted"));
			addStat("Enemy: Most defeated", this.getGameStatHighScore("numTimesKilledEnemy"));
			addStat("Enemy: Most defated by", this.getGameStatHighScore("numTimesKilledByEnemy"));
			//addStat("Unique enemy types defeated", this.getGameStatList("uniqueEnemiesDefeated"));
			endCategory();

			// Items
			startCategory("Items", true);
			addStat("Items found", this.getGameStatKeyedSum("numItemsFoundPerId"));
			addStat("Unique items found", this.getGameStatList("uniqueItemsFound"));
			addStat("Items crafted", this.getGameStatSimple("numItemsCrafted"));
			addStat("Unique items crafted", this.getGameStatList("uniqueItemsCrafted"));
			addStat("Unique items equipped", this.getGameStatList("uniqueItemsEquipped"));
			addStat("Items lost", this.getGameStatSimple("numItemsLost"));
			addStat("Items broken", this.getGameStatSimple("numItemsBroken"));
			addStat("Items repaired", this.getGameStatSimple("numItemsRepaired"));
			addStat("Lock picks used", this.getGameStatKeyedSum("numItemsUsedPerId", (id) => id == "exploration_1"));
			//addStat("Ingredients found", this.getGameStatKeyedSum("numItemsFoundPerId", (id) => ItemConstants.getItemType(id) == ItemConstants.itemTypes.ingredient));
			//addStat("Ingredients used", this.getGameStatKeyedSum("numItemsUsedPerId", (id) => ItemConstants.getItemType(id) == ItemConstants.itemTypes.ingredient));
			endCategory();

			// Explorers
			startCategory("Explorers", GameGlobals.gameState.isFeatureUnlocked("explorers"));
			addStat("Explorers recruited", this.getGameStatSimple("numExplorersRecruited"));
			addStat("Explorers lost", this.getGameStatSimple("numExplorersLost"));
			addStat("Explorers dismissed", this.getGameStatSimple("numExplorersDismissed"));
			addStat("Most steps together", this.getGameStatHighScore("mostStepsWithExplorer"));
			addStat("Most fights together", this.getGameStatHighScore("mostFightsWithExplorer"));
			addStat("Most chats", this.getGameStatHighScore("mostDialoguesWithExplorer"));
			endCategory();

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
