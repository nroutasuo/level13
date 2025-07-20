// Helper methods related to player actions (costs, requirements, descriptions) - common definitions for all actions
define([
	'ash',
	'text/Text',
	'utils/ValueCache',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/CampConstants',
	'game/constants/GameConstants',
	'game/constants/LocaleConstants',
	'game/constants/PositionConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/PlayerStatConstants',
	'game/constants/ExplorerConstants',
	'game/constants/ImprovementConstants',
	'game/constants/ItemConstants',
	'game/constants/BagConstants',
	'game/constants/MovementConstants',
	'game/constants/UpgradeConstants',
	'game/constants/PerkConstants',
	'game/constants/TextConstants',
	'game/constants/TradeConstants',
	'game/constants/UIConstants',
	'game/constants/WorldConstants',
	'game/nodes/player/PlayerActionResultNode',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/player/PlayerResourcesNode',
	'game/nodes/PlayerLocationNode',
	'game/nodes/tribe/TribeUpgradesNode',
	'game/nodes/NearestCampNode',
	'game/components/type/LevelComponent',
	'game/components/common/PositionComponent',
	'game/components/common/ResourcesComponent',
	'game/components/player/PlayerActionComponent',
	'game/components/player/BagComponent',
	'game/components/player/ExcursionComponent',
	'game/components/player/ItemsComponent',
	'game/components/player/HopeComponent',
	'game/components/sector/FightComponent',
	'game/components/sector/OutgoingCaravansComponent',
	'game/components/sector/PassagesComponent',
	'game/components/sector/EnemiesComponent',
	'game/components/sector/MovementOptionsComponent',
	'game/components/sector/SectorControlComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/sector/SectorLocalesComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/sector/events/DiseaseComponent',
	'game/components/sector/events/TraderComponent',
	'game/components/sector/events/RaidComponent',
	'game/components/level/LevelStatusComponent',
	'game/components/common/CampComponent',
	'game/vos/ResourcesVO',
	'game/vos/ImprovementVO'
], function (
	Ash, Text, ValueCache, GameGlobals, GlobalSignals, 
	CampConstants, GameConstants, LocaleConstants, PositionConstants, PlayerActionConstants, PlayerStatConstants, ExplorerConstants,
	ImprovementConstants, ItemConstants, BagConstants, MovementConstants, UpgradeConstants, PerkConstants, TextConstants,
	TradeConstants, UIConstants, WorldConstants, PlayerActionResultNode, PlayerStatsNode, PlayerResourcesNode,
	PlayerLocationNode, TribeUpgradesNode, NearestCampNode, LevelComponent, PositionComponent, ResourcesComponent,
	PlayerActionComponent, BagComponent, ExcursionComponent, ItemsComponent, HopeComponent, FightComponent,
	OutgoingCaravansComponent, PassagesComponent, EnemiesComponent, MovementOptionsComponent, SectorControlComponent, SectorFeaturesComponent,
	SectorStatusComponent, SectorLocalesComponent, SectorImprovementsComponent, DiseaseComponent, TraderComponent, RaidComponent, LevelStatusComponent,
	CampComponent, ResourcesVO, ImprovementVO
) {
	var PlayerActionsHelper = Ash.Class.extend({

		playerStatsNodes: null,
		playerResourcesNodes: null,
		playerLocationNodes: null,
		tribeUpgradesNodes: null,
		nearestCampNodes: null,

		cache: { reqs: {}, baseActionID: {} },

		constructor: function (engine) {
			this.engine = engine;

			if (engine) {
				this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
				this.playerResourcesNodes = engine.getNodeList(PlayerResourcesNode);
				this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
				this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
				this.nearestCampNodes = engine.getNodeList(NearestCampNode);
				this.playerActionResultNodes = engine.getNodeList(PlayerActionResultNode);

				var sys = this;
				this.engine.updateComplete.add(function () {
					sys.cache.reqs = {};
				});
				GlobalSignals.add(this, GlobalSignals.actionStartedSignal, this.clearReqsCache);
				GlobalSignals.add(this, GlobalSignals.playerPositionChangedSignal, this.clearReqsCache);
				GlobalSignals.add(this, GlobalSignals.sectorScoutedSignal, this.clearReqsCache);
				GlobalSignals.add(this, GlobalSignals.transitionCompletedSignal, this.clearReqsCache);
			} else {
				this.playerLocationNodes = {};
			}
		},
		
		clearReqsCache: function () {
			this.cache.reqs = {};
		},

		deductCosts: function (action) {
			let costs = this.getCosts(action);
			let result = {};
			
			if (!costs) return result;

			let currentStorage = GameGlobals.resourcesHelper.getCurrentStorage();
			let itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			let inCamp = this.playerStatsNodes.head.entity.get(PositionComponent).inCamp;

			let costNameParts;
			let costAmount;
			for (let costName in costs) {
				costNameParts = costName.split("_");
				costAmount = costs[costName] || 0;
				if (costName === "stamina") {
					this.playerStatsNodes.head.stamina.stamina -= costAmount;
					result.stamina = costAmount;
				} else if (costName === "rumours") {
					this.playerStatsNodes.head.rumours.value -= costAmount;
					result.rumours = costAmount;
				} else if (costName === "hope") {
					var hopeComponent = this.playerStatsNodes.head.entity.get(HopeComponent);
					if (hopeComponent) {
						hopeComponent.hope -= costAmount;
						result.hope = costAmount;
					} else {
						log.w("Trying to deduct hope cost but there's no hope component!");
					}
				} else if (costName === "evidence") {
					this.playerStatsNodes.head.evidence.value -= costAmount;
					result.evidence = costAmount;
				} else if (costName === "insight") {
					this.playerStatsNodes.head.insight.value -= costAmount;
					result.insight = costAmount;
				} else if (costName === "silver") {
					var currencyComponent = GameGlobals.resourcesHelper.getCurrentCurrency();
					currencyComponent.currency -= costAmount;
					result.currency = costAmount;
				} else if (costNameParts[0] === "resource") {
					currentStorage.resources.addResource(costNameParts[1], -costAmount, "deduct-cost-" + action);
					result.resources = result.resources || {};
					result.resources[costNameParts[1]] = costAmount;
				} else if (costNameParts[0] === "item") {
					let itemID = costName.replace(costNameParts[0] + "_", "");
					let baseItemID = ItemConstants.getBaseItemID(itemID);
					result.items = result.items || [];
					for (let i = 0; i < costAmount; i++) {
						var item = itemsComponent.getItem(itemID, null, inCamp, false) || itemsComponent.getItem(itemID, null, inCamp, true);
						itemsComponent.removeItem(item, false);
						result.items.push(item);
					}
					GameGlobals.gameState.increaseGameStatKeyed("numItemsUsedPerId", itemID, costAmount);
				} else if (costName == "blueprint") {
				} else {
					log.w("unknown cost: " + costName + ", action: " + action);
				}
			}
			
			GlobalSignals.inventoryChangedSignal.dispatch();
			
			return result;
		},

		// Check costs, requirements and cooldown - everything that is needed for the player action
		checkAvailability: function (action, logUnavailable, otherSector, skipCooldown) {
			if (this.playerStatsNodes.head == null) return false;
			
			let isLocationAction = PlayerActionConstants.isLocationAction(action);
			let playerPos = this.playerStatsNodes.head.entity.get(PositionComponent);
			let locationKey = GameGlobals.gameState.getActionLocationKey(isLocationAction, playerPos);
			
			if (!skipCooldown) {
				let cooldownTotal = PlayerActionConstants.getCooldown(action);
				let cooldownLeft = GameGlobals.gameState.getActionCooldown(action, locationKey, cooldownTotal);
				if (cooldownLeft) {
					if (logUnavailable) log.w("Action blocked by cooldown [" + action + "] " + cooldownLeft + " / " + cooldownTotal);
					return false;
				}
			}

			let reqsResult = this.checkRequirements(action, logUnavailable, otherSector);
			if (reqsResult.value < 1) {
				if (logUnavailable) log.i("blocked by requirements: " + this.getDisabledReasonStringWithDebugInfo(reqsResult.reason));
				return false;
			}
			
			let costsResult = this.checkCosts(action, logUnavailable, otherSector);
			if (costsResult < 1) {
				if (logUnavailable) log.i("blocked by costs");
				return false;
			}

			return true;
		},

		isAvailable: function (action) {
			return this.checkAvailability(action);
		},
		
		// Should the action be shown to the user
		// Based on requirements - some reqs always hide the action, some never do, and some depend on options (visibleReasons)
		isVisible: function (action, sector, visibleReasons) {
			let reqsCheck = GameGlobals.playerActionsHelper.checkRequirements(action, false, sector);
			
			if (reqsCheck.value >= 1) return true;
			
			// reasons that never block visibility
			if (reqsCheck.reason.baseReason == PlayerActionConstants.DISABLED_REASON_BUSY) return true;
			if (reqsCheck.reason.baseReason == PlayerActionConstants.DISABLED_REASON_LAUNCHED) return true;
			if (reqsCheck.reason.baseReason == PlayerActionConstants.DISABLED_REASON_IN_PROGRESS) return true;
			if (reqsCheck.reason.baseReason == PlayerActionConstants.DISABLED_REASON_PROJECT_IN_PROGRESS) return true;
			
			// options
			if (visibleReasons && visibleReasons.indexOf(reqsCheck.reason.baseReason) >= 0) return true;
			
			// reasons that usually allow visibility
			if (reqsCheck.reason.baseReason == PlayerActionConstants.DISABLED_REASON_MAX_IMPROVEMENT_LEVEL) return true;
			if (reqsCheck.reason.baseReason == PlayerActionConstants.DISABLED_REASON_MAX_IMPROVEMENTS) return true;
			if (reqsCheck.reason.baseReason == PlayerActionConstants.DISABLED_REASON_SECTOR_FEATURES) return true;
			if (reqsCheck.reason.baseReason == PlayerActionConstants.DISABLED_REASON_EXPOSED) return true;
			if (reqsCheck.reason.baseReason == PlayerActionConstants.DISABLED_REASON_VISION) return true;
			
			// reasons that usually block visibility
			if (reqsCheck.reason.baseReason == PlayerActionConstants.DISABLED_REASON_SCOUTED) return false;
			if (reqsCheck.reason.baseReason == PlayerActionConstants.DISABLED_REASON_SUNLIT) return false;
			if (reqsCheck.reason.baseReason == PlayerActionConstants.DISABLED_REASON_UPGRADE) return false;
			if (reqsCheck.reason.baseReason == PlayerActionConstants.DISABLED_REASON_INVALID_SECTOR) return false;
			
			// default to false
			return false;
		},
		
		isProjectInProgress: function () {
			if (this.playerResourcesNodes.head == null) return false;
			let playerActionComponent = this.playerResourcesNodes.head.entity.get(PlayerActionComponent);
			let actions = playerActionComponent.getAllActions();
			for (let i = 0; i < actions.length; i++) {
				if (PlayerActionConstants.isProjectAction(actions[0].action)) {
					return true;
				}
			}
			return false;
		},
		
		isInProgress: function (action, sector) {
			if (this.playerResourcesNodes.head == null) return false;
			let playerPos = this.playerStatsNodes.head.entity.get(PositionComponent);
			let sectorPos = sector ? sector.get(PositionComponent) : playerPos;
			
			let playerActionComponent = this.playerResourcesNodes.head.entity.get(PlayerActionComponent);
			let actions = playerActionComponent.getAllActions();
			for (let i = 0; i < actions.length; i++) {
				if (actions[i].action != action) continue;
				if ((actions[i].level || actions[i].level !== 0) && actions[i].level != sectorPos.level) continue;
				return true;
			}
			return false;
		},
		
		isRequirementsMet: function (action, sector, checksToSkip) {
			return GameGlobals.playerActionsHelper.checkRequirements(action, false, sector, checksToSkip).value >= 1;
		},


		// Check requirements (not costs) of an action
		// returns an object containing:
		// value: fraction the player has of requirements or 0 depending on req type (if 0, action is not available)
		// reason: text fragment to describe the non-passed requirement (for button explanations)
		checkRequirements: function (action, doLog, otherSector, checksToSkip) {
			if (!action) return { value: 0, reason: this.getDisabledReasonVO(PlayerActionConstants.DISABLED_REASON_INVALID_PARAMS, null, null, "no action") };
			let sector = otherSector;
			if (!sector) sector = this.playerLocationNodes.head ? this.playerLocationNodes.head.entity : null;
			if (!sector) return { value: 0, reason: this.getDisabledReasonVO(PlayerActionConstants.DISABLED_REASON_INVALID_PARAMS, null, null, "no sector") };
			
			if (this.isInProgress(action, sector)) return { value: 0, reason: this.getDisabledReasonVO(PlayerActionConstants.DISABLED_REASON_IN_PROGRESS) };

			let sectorID = sector.get(PositionComponent).positionId();
			let reqsID = action + "-" + sectorID + "-" + (checksToSkip ? checksToSkip.join(",") : "");

			if (!this.cache.reqs[reqsID]) {
				let result = this.checkActionRequirementsInternal.apply(this, [action, sector, checksToSkip]);
				if (result.reason && result.value < 1 && doLog) log.w("action disabled: " + this.getDisabledReasonStringWithDebugInfo(result.reason));
				this.cache.reqs[reqsID] = result;
			}

			return this.cache.reqs[reqsID];
		},
		
		checkActionRequirementsInternal: function (action, sector, checksToSkip) {
			let requirements = this.getReqs(action, sector);
			let costs = this.getCosts(action);

			let shouldSkipCheck = function (reason) {
				if (!checksToSkip) return false;
				return checksToSkip.indexOf(reason) >= 0;
			};

			let baseActionID = this.getBaseActionID(action);
			let actionIDParam = this.getActionIDParam(action);
			let ordinal = this.getActionOrdinal(action, sector);

			let isPlayerAwake = this.playerStatsNodes.head.vision.isAwake;
			let isActionAllowedWhileNotAwake = PlayerActionConstants.isActionAllowedWhileNotAwake(action);

			if (!isPlayerAwake && !isActionAllowedWhileNotAwake) {
				return { value: 0, reason: this.getDisabledReasonVO(PlayerActionConstants.DISABLED_REASON_NOT_AWAKE) };
			}
			
			let inCamp = GameGlobals.playerHelper.isInCamp();
			
			let movementOptionsComponent = sector.get(MovementOptionsComponent);
			if (action === "move_level_up" && !movementOptionsComponent.canMoveTo[PositionConstants.DIRECTION_UP])
				return { value: 0, reason: this.getDisabledReasonVO("ui.actions.disabled_reason_movement_blocked", movementOptionsComponent.cantMoveToReason[PositionConstants.DIRECTION_UP]) };
			if (action === "move_level_down" && !movementOptionsComponent.canMoveTo[PositionConstants.DIRECTION_DOWN])
				return { value: 0, reason: this.getDisabledReasonVO("ui.actions.disabled_reason_movement_blocked", movementOptionsComponent.cantMoveToReason[PositionConstants.DIRECTION_DOWN]) };
	
			if (this.isImproveBuildingAction(baseActionID)) {
				let improvementName = this.getImprovementNameForAction(action);
				let improvementID = this.getImprovementIDForAction(action);
				let techLevel = GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementName, this.tribeUpgradesNodes.head.upgrades);
				let maxLevel = ImprovementConstants.getMaxLevel(improvementID, techLevel);
				if (ordinal >= maxLevel) {
					return { value: 0, reason: this.getDisabledReasonVO(PlayerActionConstants.DISABLED_REASON_MAX_IMPROVEMENT_LEVEL) };
				}
			}
			
			if (PlayerActionConstants.isProjectAction(baseActionID) && this.isProjectInProgress() && !shouldSkipCheck(PlayerActionConstants.DISABLED_REASON_PROJECT_IN_PROGRESS)) {
				return { value: 0, reason: this.getDisabledReasonVO(PlayerActionConstants.DISABLED_REASON_PROJECT_IN_PROGRESS, null, null, PlayerActionConstants.DISABLED_REASON_IN_PROGRESS) };
			}
				
			let statusComponent = sector.get(SectorStatusComponent);
			if (action == "build_out_camp" && !statusComponent.canBuildCamp) {
				return { value: 0, reason: this.getDisabledReasonVO("ui.actions.disabled_reason_not_campable_sector") };
			}

			if (baseActionID == "dismiss_explorer") {
				let explorerVO = this.playerStatsNodes.head.explorers.getExplorerByID(actionIDParam);
				if (explorerVO && !GameGlobals.explorerHelper.isDismissable(explorerVO)) {
					reason = GameGlobals.explorerHelper.getIsNotDismissableReason(explorerVO);
					return { value: 0, reason: this.getDisabledReasonVO(reason) };
				}
			}

			if (baseActionID == "heal_explorer") {
				let explorerVO = this.playerStatsNodes.head.explorers.getExplorerByID(actionIDParam);
				if (explorerVO && explorerVO.injuredTimer <= 0) {
					return { value: 0, reason: this.getDisabledReasonVO() };
				}
			}

			if (baseActionID == "select_explorer") {
				let explorerVO = this.playerStatsNodes.head.explorers.getExplorerByID(actionIDParam);
				if (explorerVO && !GameGlobals.explorerHelper.isSelectable(explorerVO)) {
					reason = GameGlobals.explorerHelper.getIsNotSelectableReason(explorerVO);
					return { value: 0, reason: this.getDisabledReasonVO(reason) };
				}
			}

			if (costs) {
				if (costs.stamina > 0) {
					if (!requirements) requirements = {};
					requirements.health = Math.ceil(costs.stamina / PlayerStatConstants.HEALTH_TO_STAMINA_FACTOR);
				}
				if (costs.hope && !GameGlobals.gameState.unlockedFeatures.hope) {
					return { value: 0, reason: this.getDisabledReasonVO("ui.actions.disabled_reason_requires_hope") };
				}
				if ((costs.resource_fuel > 0 && !GameGlobals.gameState.unlockedFeatures["resource_fuel"]) ||
					(costs.resource_rubber > 0 && !GameGlobals.gameState.unlockedFeatures["resource_rubber"]) ||
					(costs.resource_herbs > 0 && !GameGlobals.gameState.unlockedFeatures["resource_herbs"]) ||
					(costs.resource_tools > 0 && !GameGlobals.gameState.unlockedFeatures["resource_tools"]) ||
					(costs.resource_concrete > 0 && !GameGlobals.gameState.unlockedFeatures["resource_concrete"])) {
					reason = PlayerActionConstants.DISABLED_REASON_LOCKED_RESOURCES;
					lowestFraction = 0;
				}
			}
			
			let result = this.checkGeneralRequirementaInternal(requirements, action, sector, checksToSkip);
			
			if (result.value > 0) {
				let featuresComponent = sector.get(SectorFeaturesComponent);
				let itemsComponent = this.playerStatsNodes.head.items;
				let isAffectedByHazard = GameGlobals.sectorHelper.isAffectedByHazard(featuresComponent, statusComponent, itemsComponent)
				if (isAffectedByHazard && !this.isActionIndependentOfHazards(action)) {
					let reason = GameGlobals.sectorHelper.getHazardDisabledReason(featuresComponent, statusComponent, itemsComponent);
					return { value: 0, reason: this.getDisabledReasonVO(reason) };
				}
				
				let item = this.getItemForCraftAction(action);
				if (item && baseActionID == "craft") {
					if (!inCamp) {
						let bagComponent = this.playerResourcesNodes.head.entity.get(BagComponent);
						let spaceNow = bagComponent.totalCapacity - bagComponent.usedCapacity;
						let spaceRequired = BagConstants.getItemCapacity(item);
						let spaceFreed = BagConstants.getResourcesCapacity(this.getCostResourcesVO(action));
						if (spaceNow - spaceRequired + spaceFreed < 0) {
							return { value: 0, reason: this.getDisabledReasonVO(PlayerActionConstants.DISABLED_REASON_BAG_FULL) };
						}
					}
				}
			}
			
			return result;
		},
		
		checkGeneralRequirementaInternal: function (requirements, action, sector, checksToSkip) {
			let hasRequirements = requirements && Object.keys(requirements).length > 0;

			var shouldSkipCheck = function (reason) {
				if (!checksToSkip) return false;
				return checksToSkip.indexOf(reason) >= 0;
			};

			let lowestFraction = 1;
			let reason = "";
			let reasonParams = {};
			let baseReason = null;
			let reasonDebugInfo = null;

			if (hasRequirements) {
				sector = GameGlobals.sectorHelper.getCurrentActionSector(sector);
				
				let playerVision = this.playerStatsNodes.head.vision.value;
				let playerMaxVision = this.playerStatsNodes.head.vision.maximum;
				let playerPerks = this.playerStatsNodes.head.perks;
				let playerStamina = this.playerStatsNodes.head.stamina.stamina;
				let hopeComponent = this.playerResourcesNodes.head.entity.get(HopeComponent);
				
				var positionComponent = sector.get(PositionComponent);
				var improvementComponent = sector.get(SectorImprovementsComponent);
				var movementOptionsComponent = sector.get(MovementOptionsComponent);
				var passagesComponent = sector.get(PassagesComponent);
				var campComponent = sector.get(CampComponent);
				var featuresComponent = sector.get(SectorFeaturesComponent);
				var statusComponent = sector.get(SectorStatusComponent);
				var bagComponent = this.playerResourcesNodes.head.entity.get(BagComponent);
	
				let inCamp = this.playerStatsNodes.head.entity.get(PositionComponent).inCamp;
				let level = sector.get(PositionComponent).level;
	
				var currentPopulation = campComponent ? Math.floor(campComponent.population) : 0;
				
				if (requirements.actionsAvailable) {
					let requiredActions = requirements.actionsAvailable;
					for (let i = 0; i < requiredActions.length; i++) {
						if (!this.checkAvailability(requiredActions[i], false, sector, true)) {
							return { value: 0, reason: this.getDisabledReasonVO("ui.actions.disabled_reason_action_unavailable", requiredActions[i]) };
						}
					}
				}
				
				if (requirements.actionsVisible) {
					let requiredActions = requirements.actionsVisible;
					for (let key in requiredActions) {
						let action = key;
						let requiredValue = requiredActions[key];
						let currentValue = this.isVisible(action, sector);
						let result = this.checkRequirementsBoolean(requiredValue, currentValue);
						if (result) return result;
					}
				}
				
				if (requirements.featureUnlocked) {
					for (let featureID in requirements.featureUnlocked) {
						let requiredValue = requirements.featureUnlocked[featureID];
						let currentValue = GameGlobals.gameState.isFeatureUnlocked(featureID);
						if (requiredValue != currentValue) {
							reasonDebugInfo = (requiredValue ? ("Locked feature: " + featureID) : "Feature already unlocked");
							return { value: 0, reason: this.getDisabledReasonVO(null, null, null, reasonDebugInfo) };
						}
					}
				}

				if (requirements.storyFlags) {
					for (let flagID in requirements.storyFlags) {
						let requiredValue = requirements.storyFlags[flagID];
						let currentValue = GameGlobals.gameState.getStoryFlag(flagID);
						let result = this.checkRequirementsBoolean(requiredValue, currentValue);
						if (result) return result;
					}
				}
				
				if (requirements.maxVision) {
					let result = this.checkRequirementsRange(
						requirements.maxVision, playerMaxVision, 
						"{min} vision needed", 
						"{max} vision max", 
						null, 
						null, 
						PlayerActionConstants.DISABLED_REASON_VISION
					);
					if (result) {
						return result;
					}
				}

				if (requirements.stamina) {
					let result = this.checkRequirementsRange(requirements.stamina, playerStamina, "{min} stamina needed", "{max} stamina max");
					if (result) {
						return result;
					}
				}

				if (typeof requirements.maxStamina !== "undefined") {
					var currentValue = playerStamina === this.playerStatsNodes.head.stamina.health * PlayerStatConstants.HEALTH_TO_STAMINA_FACTOR;
					var requiredValue = requirements.maxStamina;
					if (currentValue !== requiredValue) {
						if (currentValue) {
							reason = "ui.actions.disabled_reason_rested";
						} else {
							reason = "ui.actions.disabled_reason_generic";
							reasonDebugInfo = "Must be fully rested.";
						}
						return { value: 0, reason: this.getDisabledReasonVO(reason, null, null, reasonDebugInfo)};
					}
				}

				if (requirements.health) {
					var playerHealth = this.playerStatsNodes.head.stamina.health;
					if (playerHealth < requirements.health) {
						reason = "ui.actions.disabled_reason_low_health";
						reasonParams = requirements.health;
						lowestFraction = Math.min(lowestFraction, playerHealth / requirements.health);
					}
				}

				if (typeof requirements.sunlit !== "undefined") {
					var currentValue = featuresComponent.sunlit;
					var requiredValue = requirements.sunlit;
					let result = this.checkRequirementsBoolean(requiredValue, currentValue, "Not available in sunlit sectors", "Sunlight required");
					if (result) return result;
				}

				if (typeof requirements.deity !== "undefined") {
					let requiredValue = requirements.deity;
					let currentValue = GameGlobals.tribeHelper.hasDeity();
					let result = this.checkRequirementsBoolean(requiredValue, currentValue, "No deity allowed", "Deity required");
					if (result) return result;
				}

				if (requirements.population && !shouldSkipCheck(PlayerActionConstants.DISABLED_REASON_POPULATION)) {
					let result = this.checkRequirementsRange(requirements.population, currentPopulation, "{min} population required", "Maximum {max} population", "inhabitants required", "no inhabitants allowed");
					if (result) return result;
				}

				if (typeof requirements.rumourpoolchecked != "undefined") {
					if (campComponent) {
						let requiredValue = requirements.rumourpoolchecked;
						let currentValue = campComponent.rumourpoolchecked;
						let result = this.checkRequirementsBoolean(requiredValue, currentValue, "ui.actions.disabled_reason_no_new_rumours", "There are new rumours");
						if (result) return result;
					}
				}

				if (requirements.freeHousing) {
					let currentFreeHousing = GameGlobals.campHelper.getCampFreeHousing(sector);
					let result = this.checkRequirementsRange(
						requirements.freeHousing, 
						currentFreeHousing, 
						"ui.actions.disabled_reason_housing_in_use", 
						"Maximum {max} free housing");
					if (result) return result;
				}

				if (requirements.freeStorageBuildings) {
					let freeStorage = GameGlobals.campHelper.getMinimumFreeStorage(sector);
					let storagePerBuilding = GameGlobals.campHelper.getStorageCapacityPerBuilding(sector);
					let currentFreeStorageBuildings = Math.floor(freeStorage / storagePerBuilding);
					let result = this.checkRequirementsRange(requirements.freeStorageBuildings, currentFreeStorageBuildings, "{min} free storage required", "Maximum {max} free storage");
					if (result) return result;
				}

				if (requirements.numCamps) {
					var currentCamps = GameGlobals.gameState.numCamps;
					if (requirements.numCamps > currentCamps) {
						lowestFraction = currentCamps / requirements.numCamps;
						reason = null;
						reasonParams = requirements.numCamps;
						reasonDebugInfo = requirements.numCamps + " camps required.";
					}
				}

				if (requirements.maxNumCamps) {
					var currentCamps = GameGlobals.gameState.numCamps;
					if (requirements.numCamps < currentCamps) {
						return { value: 0, reason: this.getDisabledReasonVO(null, null, null, "less than " + requirements.numCamps + " camps required.") };
					}
				}

				if (typeof requirements.inCamp !== "undefined") {
					if (typeof requirements.inCamp == "number") {
						let requiredValue = requirements.inCamp;
						let positionCampOrdinal = GameGlobals.gameState.getCampOrdinal(positionComponent.level);
						let currentValue = inCamp ? positionCampOrdinal : false;
						if (requiredValue != currentValue) return { value: 0, reason: this.getDisabledReasonVO(null, null, null, "Must be in camp " + requiredValue) };
					} else {
						var required = requirements.inCamp;
						var current = inCamp;
						if (required !== current) {
							if (required) {
								return { value: 0, reason: this.getDisabledReasonVO(PlayerActionConstants.DISABLED_REASON_NOT_IN_CAMP) };
							} else {
								return { value: 0, reason: this.getDisabledReasonVO(null, null, null, "Must be outside.") };
							}
						}
					}
				}

				if (typeof requirements.distanceToCamp !== "undefined") {
					let range = requirements.distanceToCamp;
					let current = this.getDistanceToNearestCamp(sector);
					let result = this.checkRequirementsRange(range, current, "too close to camp", "too far from camp");
					if (result) return result;
				}

				if (requirements.improvements) {
					for (var improvementID in requirements.improvements) {
						var amount = this.getCurrentImprovementCount(improvementComponent, campComponent, improvementID);
						var requiredImprovementDisplayName = this.getImprovementDisplayName(improvementID);
						
						var range = requirements.improvements[improvementID];
						var actionImprovementName = this.getImprovementNameForAction(action, true);
						if (!actionImprovementName) actionImprovementName = "Improvement";
						var displayName = actionImprovementName === requiredImprovementDisplayName ? "" : requiredImprovementDisplayName;
						
						let result = this.checkRequirementsRange(
							range,
							amount,
							this.getDisabledReasonVO("ui.actions.disabled_reason_min_camp_improvements", { name: displayName }, PlayerActionConstants.DISABLED_REASON_MIN_IMPROVEMENTS),
							this.getDisabledReasonVO("ui.actions.disabled_reason_max_camp_improvements", { name: displayName }, PlayerActionConstants.DISABLED_REASON_MAX_IMPROVEMENTS),
							this.getDisabledReasonVO("ui.actions.disabled_reason_min_1_camp_improvement", { name: displayName }, PlayerActionConstants.DISABLED_REASON_MIN_IMPROVEMENTS),
							this.getDisabledReasonVO("ui.actions.disabled_reason_max_1_camp_improvement", { name: displayName }, PlayerActionConstants.DISABLED_REASON_MAX_IMPROVEMENTS),
						);
						
						if (result) return result;
					}
				}
				
				if (requirements.improvementMajorLevel) {
					for (var improvementID in requirements.improvementMajorLevel) {
						var amount = this.getCurrentImprovementMajorLevel(improvementComponent, campComponent, improvementID);
						var requiredImprovementDisplayName = this.getImprovementDisplayName(improvementID);
						
						var range = requirements.improvementMajorLevel[improvementID];
						
						let result = this.checkRequirementsRange(range, amount,
							"building level too low",
							"building level too high"
						);
						if (result) return result;
					}
				}
				
				if (requirements.improvementsOnLevel) {
					for (var improvementID in requirements.improvementsOnLevel) {
						var amount = this.getCurrentImprovementCountOnLevel(positionComponent.level, improvementID);
						var requiredImprovementDisplayName = this.getImprovementDisplayName(improvementID);
						var displayName = actionImprovementName === requiredImprovementDisplayName ? "" : requiredImprovementDisplayName;
						var range = requirements.improvementsOnLevel[improvementID];
						let result = this.checkRequirementsRange(range, amount,
							this.getDisabledReasonVO("ui.actions.disabled_reason_min_level_improvements", { name: displayName }, PlayerActionConstants.DISABLED_REASON_MIN_IMPROVEMENTS),
							this.getDisabledReasonVO("ui.actions.disabled_reason_max_level_improvements", { name: displayName }, PlayerActionConstants.DISABLED_REASON_MAX_IMPROVEMENTS),
							this.getDisabledReasonVO("ui.actions.disabled_reason_min_1_level_improvement", { name: displayName }, PlayerActionConstants.DISABLED_REASON_MIN_IMPROVEMENTS),
							this.getDisabledReasonVO("ui.actions.disabled_reason_max_1_level_improvement", { name: displayName }, PlayerActionConstants.DISABLED_REASON_MAX_IMPROVEMENTS),
						);

						if (result) return result;
					}
				}
				
				if (requirements.improvementsDamaged) {
					for (var improvementID in requirements.improvementsDamaged) {
						let improvementName = improvementNames[improvementID];
						let amount = improvementComponent.getNumDamaged(improvementName);
						let range = requirements.improvements[improvementID];
						
						let result = this.checkRequirementsRange(
							range,
							amount,
							"no damaged buildings to repair",
							"too many damaged buildings"
						);

						if (result) return result;
						
					}
				}
				
				if (requirements.workers) {
					let workerRequirements = requirements.workers;
					
					for (let workerType in workerRequirements) {
						let range = workerRequirements[workerType];
						let amount = GameGlobals.campHelper.getTotalWorkers(workerType);
						let result = this.checkRequirementsRange(range, amount, workerType + " required", "no " + workerType + " required");
						if (result) return result;
					}
				}

				if (requirements.perkEffects) {
					let perkRequirements = requirements.perkEffects;
					for(let perkType in perkRequirements) {
						let requirementDef = perkRequirements[perkType];
						let min = requirementDef[0];
						let max = requirementDef[1];
						let isOneValue = requirementDef[2];
						if (max < 0) max = 9999999;
						
						let totalEffect = playerPerks.getTotalEffect(perkType);
						let validPerk = playerPerks.getPerkWithEffect(perkType, min, max);
						
						if ((!isOneValue && (min > totalEffect || max <= totalEffect)) || (isOneValue && validPerk == null)) {
							if (min > totalEffect) 
								return { value: 0, reason: this.getDisabledReasonVO(null, null, null, "Can't do this while: " + perkType) };
							if (max <= totalEffect)
								return { value: 0, reason: this.getDisabledReasonVO("ui.actions.disabled_reason_status_required", perkType) };
						}
					}
				}
				
				if (requirements.perks) {
					let perkRequirements = requirements.perks;
					for (let perkID in perkRequirements) {
						let requiredValue = perkRequirements[perkID];
						let actualValue = playerPerks.hasPerk(perkID);
						if (requiredValue != actualValue) {
							var perk = PerkConstants.getPerk(perkID);
							if (requiredValue) {
								return { value: 0, reason: this.getDisabledReasonVO(null, null, null, "Status required: " + perk.name) };
							} else {
								return { value: 0, reason: this.getDisabledReasonVO(null, null, null, "Blocked by status: " + perk.name) };
							}
						}
					}
				}

				if (requirements.upgrades) {
					let upgradeRequirements = requirements.upgrades;
					for (let upgradeID in upgradeRequirements) {
						let requiredValue = upgradeRequirements[upgradeID];
						let currentValue = this.tribeUpgradesNodes.head.upgrades.hasUpgrade(upgradeID);
						let name = Text.t(UpgradeConstants.getDisplayNameTextKey(upgradeID));
						let trueReason = this.getDisabledReasonVO(null, null, PlayerActionConstants.DISABLED_REASON_UPGRADE, "Upgrade already researched (" + name + ")");
						let falseReason = this.getDisabledReasonVO("ui.actions.disabled_reason_upgrade_missing", name, PlayerActionConstants.DISABLED_REASON_UPGRADE);
						let result = this.checkRequirementsBoolean(requiredValue, currentValue, trueReason, falseReason);
						if (result) return result;
					}
				}

				if (requirements.missedUpgrade) {
					let type = requirements.missedUpgrade; // evidende, rumours, hope
					if (!GameGlobals.tribeHelper.hasMissedUpgrade(type)) {
						return { value: 0, reason: this.getDisabledReasonVO() };
					}
				}
				
				if (requirements.unlockedWorkers) {
					for (let workerID in requirements.unlockedWorkers) {
						let requiredValue = requirements.unlockedWorkers[workerID];
						let actualValue = GameGlobals.campHelper.hasUnlockedWorker(workerID);
						if (requiredValue != actualValue) {
							if (requiredValue) {
								return { value: 0, reason: this.getDisabledReasonVO(null, null, null, "Worker required: " + workerID) };
							} else {
								return { value: 0, reason: this.getDisabledReasonVO(null, null, null, "Worker already unlocked: " + workerID) };
							}
						}
					}
				}

				if (requirements.blueprint) {
					let blueprintName = action;
					let hasBlueprint = this.tribeUpgradesNodes.head.upgrades.hasAvailableBlueprint(blueprintName);
					if (!hasBlueprint) {
						return { value: 0, reason: this.getDisabledReasonVO("ui.actions.disabled_reason_blueprint_missing") };
					}
				}

				if (typeof requirements.blueprintpieces !== "undefined") {
					let upgradeID = requirements.blueprintpieces;
					let blueprintVO = this.tribeUpgradesNodes.head.upgrades.getBlueprint(upgradeID);
					if (!blueprintVO || blueprintVO.completed) {
						reason = "No such blueprint in progress.";
						return { value: 0, reason: this.getDisabledReasonVO(null, null, null, reason) };
					}
					let requiredPieces = GameConstants.cheatModeBlueprints ? 1 : blueprintVO.maxPieces;
					if (requiredPieces - blueprintVO.currentPieces > 0) {
						return { value: 0, reason: this.getDisabledReasonVO("ui.actions.disabled_reason_missing_blueprint_pieces") };
					}
				}
				
				if (typeof requirements.path_to_camp !== "undefined") {
					let path = this.getPathToNearestCamp(sector);
					let currentValue = path !== null;
					let requiredValue = requirements.path_to_camp;
					let result = this.checkRequirementsBoolean(requiredValue, currentValue, "Path to camp exists", "No path to camp.");
					if (result) return result;
				}
				
				if (requirements.explorers) {
					if (typeof requirements.explorers.maxRecruited !== "undefined") {
						var explorersComponent = this.playerStatsNodes.head.explorers;
						var numCurrentExplorers = explorersComponent.getAll().length;
						var numMaxExplorers = GameGlobals.campHelper.getCurrentMaxExplorersRecruited();
						var currentValue = numCurrentExplorers >= numMaxExplorers;
						var requiredValue = requirements.explorers.maxRecruited;
						let result = this.checkRequirementsBoolean(requiredValue, currentValue, "Maximum explorers recruited", "Maximum explorers not recruited");
						if (result) return result;
					}

					if (requirements.explorers.recruited) {
						for (let explorerID in requirements.explorers.recruited) {
							let requiredValue = requirements.explorers.recruited[explorerID];
							let currentValue = GameGlobals.playerHelper.getExplorerByID(explorerID) != null;
							let result = this.checkRequirementsBoolean(requiredValue, currentValue);
							if (result) return result;
						}
					}
				}

				if (typeof requirements.bag !== "undefined") {
					if (requirements.bag.validSelection) {
						let validStart = bagComponent.selectionStartCapacity === undefined || bagComponent.selectionStartCapacity <= bagComponent.totalCapacity;
						let validNow = bagComponent.selectedCapacity <= bagComponent.totalCapacity;
						if (validStart && !validNow) {
							return { value: 0, reason: this.getDisabledReasonVO("ui.actions.disabled_reason_selection_over_bag_capacity") };
						}
						
						let resultNode = this.playerActionResultNodes.head;
						if (resultNode) {
							let resultVO = resultNode.result.pendingResultVO;
							if (resultVO) {
								let unselectedItems = resultVO.getUnselectedAndDiscardedItems();
								for (let i = 0; i < unselectedItems.length; i++) {
									let unselectedItem = unselectedItems[i];
									if (!ItemConstants.isUnselectable(unselectedItem)) {
										return { value: 0, reason: this.getDisabledReasonVO("ui.actions.disabled_reason_cant_leave_item", ItemConstants.getItemDisplayName(unselectedItem)) };
									}
								}
							}
						}
					}
					if (requirements.bag.validSelectionAll) {
						if (bagComponent.selectableCapacity > bagComponent.totalCapacity) {
							return {value: 0, reason: this.getDisabledReasonVO("ui.actions.disabled_reason_selection_over_bag_capacity") };
						}
					}
					if (typeof requirements.bag.space !== "undefined") {
						let range = requirements.bag.space;
						let currentVal = bagComponent.totalCapacity - bagComponent.usedCapacity;
						let result = this.checkRequirementsRange(range, currentVal, "ui.actions.disabled_reason_bag_full", "Bag has enough space");
						if (result) return result;
					}
				}
				
				if (requirements.playerInventory) {
					for (let key in requirements.playerInventory) {
						let range = requirements.playerInventory[key];
						let currentVal = this.getCostAmountOwned(sector, key);
						let result = this.checkRequirementsRange(range, currentVal, "Not enough " + key, "Too  much " + key);
						if (result) return result;
					}
				}

				if (requirements.playerInventoryComplete) {
					for (let key in requirements.playerInventoryComplete) {
						let range = requirements.playerInventoryComplete[key];
						let currentVal = this.getCostAmountOwned(sector, key, true);
						let result = this.checkRequirementsRange(range, currentVal, "Not enough " + key, "Too  much " + key);
						if (result) return result;
					}
				}
				
				if (requirements.campInventory) {
					for (let key in requirements.campInventory) {
						let range = requirements.campInventory[key];
						let currentVal = this.getCostAmountOwned(sector, key);
						let result = this.checkRequirementsRange(range, currentVal, "Not enough " + key, "Too  much " + key);
						if (result) return result;
					}
				}
					
				if (typeof requirements.campInventoryFull != "undefined") {
					let requiredValue = requirements.campInventoryFull;
					let currentValue = GameGlobals.campHelper.isCampInventoryFull(sector);
					if (requiredValue !== currentValue) {
						if (currentValue) {
							return { value: 0, reason: this.getDisabledReasonVO(null, null, null, "Camp inventory is full.") };
						} else {
							return { value: 0, reason: this.getDisabledReasonVO(null, null, null, "Camp inventory is not full.") };
						}
					}
				}

				if (requirements.player) {
					if (typeof requirements.affectedByHazard !== "undefined") {
						let requiredValue = requirements.player.affectedByHazard;
						
						let featuresComponent = sector.get(SectorFeaturesComponent);
						let statusComponent = sector.get(SectorStatusComponent);
						let itemsComponent = this.playerStatsNodes.head.items;
						let currentValue = GameGlobals.sectorHelper.isAffectedByHazard(featuresComponent, statusComponent, itemsComponent)
						
						if (requiredValue != currentValue) {
							if (requiredValue) {
								return { value: 0, reason: this.getDisabledReasonVO(null, null, null, "Requires active hazard") };
							} else {
								return { value: 0, reason: this.getDisabledReasonVO(null, null, null, "Requires no active hazard") };
							}
						}
					}
					
					if (requirements.player.position) {
						if (typeof requirements.player.position.level !== "undefined") {
							let requiredValue = requirements.player.position.level;
							let currentValue = positionComponent.level;
							let result = this.checkRequirementsRange(requiredValue, currentValue, "Wrong level");
							if (result) return result;
						}
					}

					if (requirements.player.canHaveItemUpgrade) {
						let upgradeFilter = requirements.player.canHaveItemUpgrade;
						let itemVO = GameGlobals.playerHelper.selectItemForItemUpgrade(upgradeFilter);
						if (!itemVO) {
							return { value: 0, reason: this.getDisabledReasonVO(null, null, null, "No valid item found") };
						}
					}
				}

				if (requirements.outgoingcaravan) {
					let caravansComponent = sector.get(OutgoingCaravansComponent);

					if (typeof requirements.outgoingcaravan.available !== "undefined") {
						var requiredValue = requirements.outgoingcaravan.available ? 1 : 0;
						var totalCaravans = improvementComponent.getCount(improvementNames.stable);
						var busyCaravans = caravansComponent.outgoingCaravans.length;
						var currentValue = totalCaravans - busyCaravans;
						if (requiredValue > currentValue) {
							return {value: 0, reason: this.getDisabledReasonVO("ui.actions.disabled_reason_no_available_caravans") };
						}
					}
					if (typeof requirements.outgoingcaravan.validSelection !== "undefined") {
						var requiredValue = requirements.outgoingcaravan.validSelection;
						var currentValue = $("button[action='" + action + "']").attr("data-isselectionvalid") == "true";
						if (requiredValue != currentValue) {
							if (requiredValue)
								return {value: 0, reason: this.getDisabledReasonVO("ui.actions.disabled_reason_invalid_trade_selection") };
							else
								return {value: 0, reason: this.getDisabledReasonVO(null, null, null, "Valid selection.") };
						}
					}
					if (requirements.outgoingcaravan.active) {
						let range = requirements.outgoingcaravan.active;
						let currentVal = caravansComponent ? caravansComponent.outgoingCaravans.length : 0;
						let result = this.checkRequirementsRange(range, currentVal, "There are no active caravans", "There is an active caravan.");
						if (result) return result;
					}
				}

				if (requirements.incomingcaravan) {
					if (typeof requirements.incomingcaravan.validSelection !== "undefined") {
						let requiredValue = requirements.incomingcaravan.validSelection;
						let traderComponent = sector.get(TraderComponent);
						if (traderComponent) {
							let caravan = traderComponent.caravan;
							let currentValue = caravan.traderOfferValue > 0 && caravan.traderOfferValue <= caravan.campOfferValue;
							if (requiredValue != currentValue) {
								if (requiredValue) {
									return {value: 0, reason: this.getDisabledReasonVO("ui.actions.disabled_reason_invalid_trade_selection")};
								} else {
									return {value: 0, reason: this.getDisabledReasonVO(null, null, null, "valid selection")};
								}
							}
							
							for (let i in caravan.campSelectedItems) {
								let item = caravan.campSelectedItems[i];
								if (item.type == ItemConstants.itemTypes.ingredient) continue;
								let amount = caravan.getCampSelectedItemCount(item.id) + caravan.getSellItemCount(item.id);
								if (amount > TradeConstants.MAX_ITEMS_TO_TRADE_PER_CARAVAN) {
									let itemName = ItemConstants.getItemDisplayName(item);
									return { value: 0, reason: this.getDisabledReasonVO("ui.actions.disabled_reason_selling_too_many_same_item", TextConstants.pluralify(itemName)) };
								}
							}
						} else {
							return {value: 0, reason: this.getDisabledReasonVO(null, null, null, "No caravan.") };
						}
					}
				}

				if (requirements.camp) {
					let campSector = this.nearestCampNodes.head ? this.nearestCampNodes.head.entity : sector;
					
					if (action && action.indexOf("build_out") >= 0) {
						let campOrdinal = GameGlobals.gameState.getCampOrdinal(positionComponent.level);
						let campLevel = GameGlobals.gameState.getLevelForCamp(campOrdinal);
						campSector = GameGlobals.levelHelper.getCampSectorOnLevel(campLevel);
					}

					if (!campSector) {
						return { value: 0, reason: this.getDisabledReasonVO(null, null, null, "No camp") };
					}

					if (requirements.camp.isReachableByTribeTraders) {
						let isCampReachableByTribeTraders = GameGlobals.levelHelper.isCampReachableByTribeTraders(campSector);
						if (!isCampReachableByTribeTraders) {
							return { value: 0, reason: this.getDisabledReasonVO(PlayerActionConstants.DISABLED_REASON_NOT_REACHABLE_BY_TRADERS) };
						}
					}

					if (typeof requirements.camp.raid !== "undefined") {
						let currentValue = campSector.has(RaidComponent);
						let requiredValue = requirements.camp.raid;
						if (requiredValue != currentValue) {
							if (requiredValue) {
								return { value: 0, reason: this.getDisabledReasonVO(null, null, null, "No raid currently") };
							} else {
								return { value: 0, reason: this.getDisabledReasonVO(PlayerActionConstants.DISABLEd_REASON_RAID) };
							}
						}
					}

					if (typeof requirements.camp.disease !== "undefined") {
						let currentValue = campSector.has(DiseaseComponent);
						let requiredValue = requirements.camp.disease;
						if (requiredValue != currentValue) {
							return { value: 0, reason: this.getDisabledReasonVO(null, null, null, requiredValue ? "No disease currently" : "There is a disease ongoing") };
						}
					}

					if (typeof requirements.camp.availableLuxuryResources !== "undefined") {
						let available = GameGlobals.campHelper.getAvailableLuxuryResources(campSector);
						let result = this.checkRequirementsDictionary(requirements.camp.availableLuxuryResources, (v) => available.indexOf(v) >= 0);
						if (result) return result;
					}

					if (requirements.camp.robotStorageAvailable) {
						let currentRobotStorage = GameGlobals.campHelper.getRobotStorageCapacity(campSector);
						let resources = campSector.get(ResourcesComponent);
						let currentRobots = resources.resources.robots || 0;
						if (currentRobotStorage - currentRobots <= 0) {
							return { value: 0, reason: this.getDisabledReasonVO("ui.actions.disabled_reason_no_space_for_robots") };
						}
					}

					if (typeof requirements.camp.campfireStarted !== "undefined") {
						let requiredValue = requirements.camp.campfireStarted;
						let currentValue = campComponent && campComponent.campFireStarted;
						let result = this.checkRequirementsBoolean(requiredValue, currentValue);
						if (result) return result;
					}

					if (typeof requirements.camp.overcrowded !== "undefined") {
						let requiredValue = requirements.camp.overcrowded;
						let housingCap = CampConstants.getHousingCap(improvementComponent);
						let currentValue = currentPopulation > housingCap;
						let result = this.checkRequirementsBoolean(requiredValue, currentValue);
						if (result) return result;
					}

					if (requirements.camp.isExpansionBlockedByStorage) {
						let canBuildSomething = false;
						for (let key in improvementNames) {
							let improvementName = improvementNames[key];
							let type = getImprovementType(improvementName);
							if (type !== improvementTypes.camp) continue;
							// even if you can't build a hospital now, you're guaranteed to be able to before blocked
							let count = this.getCurrentImprovementCount(improvementComponent, campComponent, key);
							if (count == 0 && improvementName == improvementNames.hospital) {
								canBuildSomething = true;
								break;
							}
							let buildActionName = PlayerActionConstants.getActionNameForImprovement(improvementName);
							let canBuild = 
								GameGlobals.playerActionsHelper.isRequirementsMet(buildActionName) &&
								GameGlobals.playerActionsHelper.checkCostsVersusStorage(buildActionName, sector) >= 1;
							if (canBuild) {
								canBuildSomething = true;
								break;
							}
						}
						if (canBuildSomething) {
							return { value: 0, reason: this.getDisabledReasonVO(null, null, null, "Possible to build something") };
						}
					}
				}

				if (requirements.sector) {
					if (typeof requirements.sector.ground != "undefined") {
						let requiredValue = requirements.sector.ground;
						let currentValue = positionComponent.level == GameGlobals.gameState.getGroundLevel();
						let result = this.checkRequirementsBoolean(requiredValue, currentValue);
						if (result) return result;
					}

					if (typeof requirements.sector.surface != "undefined") {
						let requiredValue = requirements.sector.surface;
						let currentValue = positionComponent.level == GameGlobals.gameState.getSurfaceLevel();
						let result = this.checkRequirementsBoolean(requiredValue, currentValue, "Must not be on Surface", "Must be on the Surface");
						if (result) return result;
					}

					if (requirements.sector.collectable_water) {
						let hasWater = featuresComponent.resourcesCollectable.water > 0;
						if (!hasWater) {
							return { value: 0, reason: this.getDisabledReasonVO(null, null, PlayerActionConstants.DISABLED_REASON_INVALID_SECTOR, "No collectable water.") };
						}
					}

					if (requirements.sector.collectable_food) {
						let hasFood = featuresComponent.resourcesCollectable.food > 0;
						if (!hasFood) {
							return { value: 0, reason: this.getDisabledReasonVO(null, null, PlayerActionConstants.DISABLED_REASON_INVALID_SECTOR, "No collectable food.") };
						}
					}
					
					if (typeof requirements.sector.hasCamp !== "undefined") {
						var value = sector.has(CampComponent);
						var requiredValue = requirements.sector.hasCamp;
						if (value !== requiredValue) {
							reason = requiredValue ? "No camp here." : "There is a camp here";
							return { value: 0, reason: this.getDisabledReasonVO(reason) };
						}
					}

					if (requirements.sector.canHaveCamp) {
						if (!featuresComponent.canHaveCamp()) {
							return { value: 0, reason: this.getDisabledReasonVO(PlayerActionConstants.DISABLED_REASON_INVALID_SECTOR, null, null, "Location not suitable for camp") };
						}
					}

					if (typeof requirements.sector.enemies != "undefined") {
						var enemiesComponent = sector.get(EnemiesComponent);
						if (enemiesComponent.hasEnemies != requirements.sector.enemies) {
							if (requirements.sector.enemies)
								return { value: 0, reason: this.getDisabledReasonVO(null, null, null, "Sector enemies required") };
							else
								return { value: 0, reason: this.getDisabledReasonVO(null, null, null, "Too dangerous here") };
						}
					}

					if (typeof requirements.sector.scouted != "undefined") {
						if (statusComponent.scouted != requirements.sector.scouted) {
							if (statusComponent.scouted) {
								return { value: 0, reason: this.getDisabledReasonVO("ui.actions.disabled_reason_already_scouted", null, PlayerActionConstants.DISABLED_REASON_SCOUTED, "Area already scouted") };
							} else {
								return { value: 0, reason: this.getDisabledReasonVO("ui.actions.disabled_reason_not_scouted", null, PlayerActionConstants.DISABLED_REASON_SCOUTED) };
							}
						}
					}

					if (typeof requirements.sector.scavengedPercent != "undefined") {
						let range = requirements.sector.scavengedPercent;
						let currentVal = statusComponent.getScavengedPercent() / 100;
						let result = this.checkRequirementsRange(range, currentVal, "", "This area has been scavenged clean.");
						if (result) return result;
					}

					if (typeof requirements.sector.heapScavengedPercent != "undefined") {
						let range = requirements.sector.heapScavengedPercent;
						let currentVal = statusComponent.getHeapScavengedPercent() / 100;
						let result = this.checkRequirementsRange(range, currentVal, "", "Nothing left of the heap.");
						if (result) return result;
					}

					if (typeof requirements.sector.investigatable != "undefined") {
						var requiredValue = requirements.sector.investigatable;
						var currentValue = featuresComponent.isInvestigatable || statusComponent.isFallbackInvestigateSector;
						if (currentValue !== requiredValue) {
							reason = requiredValue ? "There is nothing to investigate." : "This sector can be investigated";
							return { value: 0, reason: this.getDisabledReasonVO(reason) };
						}
					}

					if (typeof requirements.sector.examinable != "undefined") {
						var requiredValue = requirements.sector.examinable;
						var currentValue = GameGlobals.sectorHelper.getNumUnexaminedSpots(sector) > 0;
						if (currentValue !== requiredValue) {
							reason = requiredValue ? "There is nothing to examine." : "This sector can be examined";
							return { value: 0, reason: this.getDisabledReasonVO(reason) };
						}
					}

					if (typeof requirements.sector.investigatedPercent != "undefined") {
						var range = requirements.sector.investigatedPercent;
						var currentVal = statusComponent.getInvestigatedPercent() / 100;
						let result = this.checkRequirementsRange(range, currentVal, "", "This sector has been fully investigated.");
						if (result) return result;
					}

					if (typeof requirements.sector.spring != "undefined") {
						if (featuresComponent.hasSpring != requirements.sector.spring) {
							if (featuresComponent.hasSpring)    reason = "There is a spring.";
							else                                reason = "There is no spring.";
							return { value: 0, reason: this.getDisabledReasonVO(reason) };
						}
					}

					if (typeof requirements.sector.scoutedLocales !== "undefined") {
						for(var localei in requirements.sector.scoutedLocales) {
							var requiredStatus = requirements.sector.scoutedLocales[localei];
							var currentStatus = statusComponent.isLocaleScouted(localei);
							if (requiredStatus !== currentStatus) {
								if (requiredStatus) reason = "Locale must be scouted.";
								if (!requiredStatus) reason = "Locale already scouted.";
								return { value: 0, reason: this.getDisabledReasonVO(reason) };
							}
						}
					}

					if (typeof requirements.sector.controlledLocales !== "undefined") {
						let sectorControlComponent = sector.get(SectorControlComponent);
						for(let localei in requirements.sector.controlledLocales) {
							let requiredStatus = requirements.sector.controlledLocales[localei];
							let currentStatus = sectorControlComponent.hasControlOfLocale(localei);
							if (requiredStatus !== currentStatus) {
								if (requiredStatus) reason = "Must be scouted first.";
								if (!requiredStatus) reason = "ui.actions.disabled_reason_locale_already_scouted";
								return { value: 0, reason: this.getDisabledReasonVO(reason) };
							}
						}
					}

					for (let i in PositionConstants.getLevelDirections()) {
						var direction = PositionConstants.getLevelDirections()[i];
						var directionName = PositionConstants.getDirectionName(direction, true);

						var blockerKey = "blocker" + directionName.toUpperCase();
						if (typeof requirements.sector[blockerKey] !== 'undefined') {
							var requiredValue = requirements.sector[blockerKey];
							var currentValue = !movementOptionsComponent.canMoveTo[direction];

							if (requiredValue !== currentValue) {
								if (currentValue) {
									return { value: 0, reason: this.getDisabledReasonVO("ui.actions.disabled_reason_movement_blocked", movementOptionsComponent.cantMoveToReason[direction]) };
								} else {
									return { value: 0, reason: this.getDisabledReasonVO(null, null, null, "Nothing blocking movement to " + directionName) };
								}
							}
						}
						
						var clearedKey = "isWasteCleared_" + direction;
						if (typeof requirements.sector[clearedKey] !== 'undefined') {
							var requiredValue = requirements.sector[clearedKey];
							var currentValue =
								statusComponent.isBlockerCleared(direction, MovementConstants.BLOCKER_TYPE_WASTE_TOXIC) ||
								statusComponent.isBlockerCleared(direction, MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE);

							if (requiredValue !== currentValue) {
								if (currentValue) {
									return { value: 0, reason: this.getDisabledReasonVO("Waste cleared.") };
								} else {
									return { value: 0, reason: this.getDisabledReasonVO("Waste not cleared " + directionName + ".") };
								}
							}
						}
					}
					
					if (requirements.sector.blockers) {
						for (let blockerType in requirements.sector.blockers) {
							let requiredValue = requirements.sector.blockers[blockerType];
							let currentValue = passagesComponent.hasBlocker(parseInt(blockerType));

							if (requiredValue !== currentValue) {
								let blockerName = blockerType;
								if (currentValue) {
									return { value: 0, reason: this.getDisabledReasonVO(null, null, null, "Can't have blocker of type " + blockerName) };
								} else {
									return { value: 0, reason: this.getDisabledReasonVO(null, null, null, blockerName + " required") };
								}
							}
						}
					}

					if (typeof requirements.sector.passageUp != 'undefined') {
						if (!passagesComponent.passageUp) {
							return { value: 0, reason: this.getDisabledReasonVO("ui.actions.disabled_reason_movement_blocked", null, null, "no passage up") };
						} else {
							var requiredType = parseInt(requirements.sector.passageUp);
							if (requiredType > 0) {
								var existingType = passagesComponent.passageUp.type;
								if (existingType !== requiredType) {
									return { value: 0, reason: this.getDisabledReasonVO("ui.actions.disabled_reason_movement_blocked", null, null, "wrong passage type") };
								}
							}
						}
					}

					if (typeof requirements.sector.passageUpAvailable != 'undefined') {
						let currentValue = GameGlobals.levelHelper.isPassageUpAvailable(level);
						let requiredValue = requirements.sector.passageUpAvailable;
						let result = this.checkRequirementsBoolean(requiredValue, currentValue, "Passage up clear", "Passage up not clear");
						if (result) return result;
					}

					if (typeof requirements.sector.passageDown != 'undefined') {
						if (!passagesComponent.passageDown) {
							return { value: 0, reason: this.getDisabledReasonVO("ui.actions.disabled_reason_movement_blocked", null, null, "no passage down") };
						} else {
							var requiredType = parseInt(requirements.sector.passageDown);
							if (requiredType > 0) {
								var existingType = passagesComponent.passageDown.type;
								if (existingType != requiredType) {
									return { value: 0, reason: this.getDisabledReasonVO("ui.actions.disabled_reason_movement_blocked", null, null, "wrong passage type") };
								}
							}
						}
					}

					if (typeof requirements.sector.passageDownAvailable != 'undefined') {
						let currentValue = GameGlobals.levelHelper.isPassageDownAvailable(level);
						let requiredValue = requirements.sector.passageDownAvailable;
						let result = this.checkRequirementsBoolean(requiredValue, currentValue, "Passage down clear", "Passage down not clear");
						if (result) return result;
					}

					if (typeof requirements.sector.collected_food != "undefined") {
						var collector = improvementComponent.getVO(improvementNames.collector_food);
						var requiredStorage = requirements.sector.collected_food;
						var currentStorage = collector.storedResources.getResource(resourceNames.food);
						if (currentStorage < requiredStorage) {
							if (lowestFraction > currentStorage / requiredStorage) {
								lowestFraction = currentStorage / requiredStorage;
								reason = "ui.actions.disabled_reason_collector_empty";
							}
						}
					}

					if (typeof requirements.sector.collected_water != "undefined") {
						var collector = improvementComponent.getVO(improvementNames.collector_water);
						var requiredStorage = requirements.sector.collected_water;
						var currentStorage = collector.storedResources.getResource(resourceNames.water);
						if (currentStorage < requiredStorage) {
							if (lowestFraction > currentStorage / requiredStorage) {
								lowestFraction = currentStorage / requiredStorage;
								reason = "ui.actions.disabled_reason_collector_empty";
							}
						}
					}
					
					if (typeof requirements.sector.acessible_to_workers != "undefined") {
						var campOrdinal = GameGlobals.gameState.getCampOrdinal(positionComponent.level);
						var campCount = GameGlobals.gameState.numCamps;
						var requiredValue = requirements.sector.acessible_to_workers;
						var currentValue = campCount >= campOrdinal;
						if (currentValue != requiredValue) {
							if (currentValue) return { value: 0, reason: this.getDisabledReasonVO(null, null, null, "accessible to workers") };
							else return { value: 0, reason: this.getDisabledReasonVO("ui.actions.disabled_reason_not_accessible_to_workers") };
						}
					}
					
					if (requirements.sector.hazards) {
						for (var hazard in requirements.sector.hazards) {
							var range = requirements.sector.hazards[hazard];
							var currentVal = featuresComponent.hazards[hazard] || 0;
							let result = this.checkRequirementsRange(
								range,
								currentVal,
								"Min {min} " + hazard,
								"Max {max} " + hazard,
								"Requires " + hazard,
								"Too much " + hazard + " here",
							);
							if (result) {
								return result;
							}
						}
					}
					
					if (requirements.sector.buildingDensity) {
						let result = this.checkRequirementsRange(requirements.sector.buildingDensity, featuresComponent.buildingDensity, "Sector too sparsely built", "Sector too densely built");
						if (result) {
							return result;
						}
					}
					
					if (requirements.sector.scavengeableItems) {
						if (requirements.sector.scavengeableItems.count) {
							let requiredValue = requirements.sector.scavengeableItems.count;
							let currentValue = featuresComponent.itemsScavengeable.length;
							let result = this.checkRequirementsRange(requiredValue, currentValue, "Requires crafting ingredients scavenging spot", "Sector is a crafting ingredients scavenging spot");
							if (result) {
								return result;
							}
						}

						let discoveredItems = GameGlobals.sectorHelper.getLocationDiscoveredItems(sector);

						for (let itemID in requirements.sector.scavengeableItems) {
							if (itemID == "count") continue;
							let requiredValue = requirements.sector.scavengeableItems[itemID];
							let currentValue = discoveredItems.indexOf(itemID) >= 0;
							let result = this.checkRequirementsBoolean(requiredValue, currentValue);
							if (result) return result;
						}
					}
				}

				if (requirements.level) {
					let levelEntity = GameGlobals.levelHelper.getLevelEntityForPosition(level);
					let levelComponent = levelEntity.get(LevelComponent);

					if (typeof requirements.level.hasCamp !== "undefined") {
						let value = levelEntity.has(CampComponent);
						let requiredValue = requirements.level.hasCamp;
						if (value !== requiredValue) {
							reason = requiredValue ? "No camp on this level." : "There is already a camp on this level";
							return { value: 0, reason: this.getDisabledReasonVO(reason) };
						}
					}

					if (requirements.level.population) {
						var range = requirements.level.population;
						var value = levelComponent.habitability;
						let result = this.checkRequirementsRange(range, value,
							"Not enough people on this level",
							"Too many people on this level",
						);
						if (result) return result;
					}

					if (typeof requirements.level.nextPassageFound !== "undefined") {
						let requiredValue = requirements.level.nextPassageFound;
						let currentValue = GameGlobals.levelHelper.isNextPassageFound(level);
						let result = this.checkRequirementsBoolean(requiredValue, currentValue, "An explorer wants to talk to you.", "Requires pending dialogue.");
						if (result) return result;
					}
				}

				if (requirements.levelUnlocked) {
					let level = requirements.levelUnlocked;
					if (!GameGlobals.levelHelper.isLevelUnlocked(level)) {
						return { value: 0, reason: this.getDisabledReasonVO(null, null, null, "level unlocked") };
					}
				}
				
				if (requirements.milestone && !shouldSkipCheck(PlayerActionConstants.DISABLED_REASON_POPULATION)) {
					let currentMilestone = GameGlobals.gameState.numUnlockedMilestones;
					let requiredMilestone = requirements.milestone;
					if (currentMilestone < requiredMilestone) {
						return { value: 0, reason: this.getDisabledReasonVO(PlayerActionConstants.DISABLED_REASON_MILESTONE, requiredMilestone) };
					}
				}
				
				if (requirements.tribe) {
					if (requirements.tribe.improvements) {
						for (var improvementID in requirements.tribe.improvements) {
							var amount = this.getCurrentImprovementCountTotal(improvementID);
							var range = requirements.tribe.improvements[improvementID];
							
							var requiredImprovementDisplayName = this.getImprovementDisplayName(improvementID);
							
							let result = this.checkRequirementsRange(
								range,
								amount,
								this.getDisabledReasonVO("ui.actions.disabled_reason_min_tribe_improvements", { name: requiredImprovementDisplayName }, PlayerActionConstants.DISABLED_REASON_MIN_IMPROVEMENTS),
								this.getDisabledReasonVO("ui.actions.disabled_reason_max_tribe_improvements", { name: requiredImprovementDisplayName }, PlayerActionConstants.DISABLED_REASON_MAX_IMPROVEMENTS),
								this.getDisabledReasonVO("ui.actions.disabled_reason_min_1_tribe_improvement", { name: requiredImprovementDisplayName }, PlayerActionConstants.DISABLED_REASON_MIN_IMPROVEMENTS),
								this.getDisabledReasonVO("ui.actions.disabled_reason_max_1_tribe_improvement", { name: requiredImprovementDisplayName }, PlayerActionConstants.DISABLED_REASON_MAX_IMPROVEMENTS),
							);
							
							if (result) return result;
						}
					}
					
					if (requirements.tribe.projects) {
						for (var improvementID in requirements.tribe.projects) {
							var amount = this.getCurrentImprovementCountTotal(improvementID);
							var requiredAmount = requirements.tribe.projects[improvementID];
							
							if (amount < requiredAmount) {
								var requiredImprovementDisplayName = this.getImprovementDisplayName(improvementID);
								var displayName = requiredImprovementDisplayName;
								return { value: amount / requiredAmount, reason: this.getDisabledReasonVO(null, null, null, requiredAmount + "x " + displayName + " required") };
							}
						}
					}
					
					if (requirements.tribe.population) {
						let currentPopulation = GameGlobals.tribeHelper.getTotalPopulation();
						let requiredPopulation = requirements.tribe.population;
						if (currentPopulation < requiredPopulation) {
							return { value: currentPopulation / requiredPopulation, reason: this.getDisabledReasonVO("ui.actions.disabled_reason_tribe_population_too_low", requiredPopulation) };
						}
					}
					
					if (typeof requirements.tribe.hopeFull != "undefined") {
						let requiredValue = requirements.tribe.hopeFull;
						let currentValue = hopeComponent.hope >= hopeComponent.maxHope;
						if (requiredValue !== currentValue) {
							if (currentValue) {
								return { value: 0, reason: this.getDisabledReasonVO("ui.actions.disabled_reason_hope_full") };
							} else {
								return { value: 0, reason: this.getDisabledReasonVO("Requires maximum hope") };
							}
						}
					}
					
					if (typeof requirements.tribe.evidenceFull != "undefined") {
						let requiredValue = requirements.tribe.evidenceFull;
						let currentValue = this.playerStatsNodes.head.evidence.value >= this.playerStatsNodes.head.evidence.maxValue;
						if (requiredValue !== currentValue) {
							if (currentValue) {
								return { value: 0, reason: this.getDisabledReasonVO("Maximum evidence") };
							} else {
								return { value: 0, reason: this.getDisabledReasonVO("Requires maximum evidence") };
							}
						}
					}
					
					if (typeof requirements.tribe.rumoursFull != "undefined") {
						let requiredValue = requirements.tribe.rumoursFull;
						let currentValue = this.playerStatsNodes.head.rumours.value >= this.playerStatsNodes.head.rumours.maxValue;
						if (requiredValue !== currentValue) {
							if (currentValue) {
								return { value: 0, reason: this.getDisabledReasonVO("Maximum rumours") };
							} else {
								return { value: 0, reason: this.getDisabledReasonVO("Requires maximum rumours") };
							}
						}
					}
				}
				
				if (requirements.excursion) {
					let excursionComponent = this.playerStatsNodes.head.entity.get(ExcursionComponent);

					if (requirements.excursion.numNaps) {
						var currentValue = excursionComponent != null ? excursionComponent.numNaps : 0;
						var min = requirements.excursion.numNaps[0];
						var max = requirements.excursion.numNaps[1];
						if (currentValue < min) {
							reason = "Min " + min + " naps needed.";
							lowestFraction = Math.min(lowestFraction, currentValue / min);
						} else if (max > 0 && currentValue >= max) {
							if (GameGlobals.gameState.unlockedFeatures.camp) {
								reason = "Already rested outside recently.";
								lowestFraction = 0;
							}
						}
					}

					if (requirements.excursion.numGritSteps) {
						let currentValue = excursionComponent != null ? excursionComponent.numGritSteps : 0;
						let result = this.checkRequirementsRange(requirements.excursion.numGritSteps, currentValue, "{min} grit steps needed", "Need supplies");
						if (result) return result;
					}
				}
				
				if (requirements.uses_in_fight) {
					var fightComponent = sector.get(FightComponent);
					var usesReqs = requirements.uses_in_fight;
					var actionItemID = GameGlobals.playerActionsHelper.getActionIDParam(action);
					for (var itemID in usesReqs) {
						var def = usesReqs[itemID];
						var min = def[0];
						var max = def[1];
						var current = fightComponent ? fightComponent.itemsUsed[itemID] || 0 : 0;
						var item = ItemConstants.getItemDefinitionByID(itemID);
						if (!item) continue;
						let itemName = ItemConstants.getItemDisplayName(item);
						if (min > current) {
							return { value: 0, reason: this.getDisabledReasonVO(null, null, null, "Must use " + itemName + " first") };
						} else if (max <= current) {
							if (itemID == actionItemID && max == 1) {
								return { value: 0, reason: this.getDisabledReasonVO(null, null, null, "Already used") };
							} else {
								return { value: 0, reason: this.getDisabledReasonVO(null, null, null, "Already used " + itemName) };
							}
						}
					}
				}
				
				if (requirements.camp) {
					if (typeof requirements.camp.exposed !== "undefined") {
						let currentValue = featuresComponent.sunlit && improvementComponent.getCount(improvementNames.sundome) <= 0;
						let requiredValue = requirements.camp.exposed;
						let trueReason = this.getDisabledReasonVO("ui.actions.disabled_reason_camp_exposed", null, PlayerActionConstants.DISABLED_REASON_EXPOSED);
						let falseReason = this.getDisabledReasonVO(null, null, PlayerActionConstants.DISABLED_REASON_EXPOSED, "Camp not exposed to direct sunlight");
						let result = this.checkRequirementsBoolean(requiredValue, currentValue, trueReason, falseReason);
						if (result) return result;
					}
				}
				
				if (requirements.vision) {
					let result = this.checkRequirementsRange(
						requirements.vision, 
						playerVision, 
						"{min} vision needed", 
						"{max} vision max", 
						null, 
						null, 
						PlayerActionConstants.DISABLED_REASON_VISION
					);
					if (result) return result;
				}

				if (typeof requirements.hasForcedDialogue !== "undefined") {
					let currentValue = GameGlobals.playerHelper.hasForcedDialogue();
					let requiredValue = requirements.hasForcedDialogue;
					let result = this.checkRequirementsBoolean(requiredValue, currentValue, "An explorer wants to talk to you.", "Requires pending dialogue.");
					if (result) return result;
				}

				if (requirements.party) {
					if (typeof requirements.party.hasInjuredExplorer !== "undefined") {
						let requiredValue = requirements.party.hasInjuredExplorer;
						let currentValue = false;
						let party = this.playerStatsNodes.head.explorers.getParty();
						for (let i = 0; i < party.length; i++) {
							let explorerVO = party[i];
							if (explorerVO.injuredTimer >= 0) currentValue = true;
						}
						let result = this.checkRequirementsBoolean(requiredValue, currentValue, "an explorer is injured.", "required an injured explorer");
						if (result) return result;
					}

					if (typeof requirements.party.isMissingForcedExplorer !== "undefined") {
						let forcedExplorerID = GameGlobals.explorerHelper.getForcedExplorerID();
						let forcedExplorerVO = GameGlobals.playerHelper.getExplorerByID(forcedExplorerID);
						if (forcedExplorerVO && forcedExplorerVO.injuredTimer <= 0) {
							let explorerName = forcedExplorerVO ? forcedExplorerVO.name : "";
							let requiredValue = requirements.party.isMissingForcedExplorer;
							let currentValue = forcedExplorerID != null && forcedExplorerVO != null && !forcedExplorerVO.inParty; 
							let result = this.checkRequirementsBoolean(requiredValue, currentValue, explorerName + " wants to go with you.", "");
							if (result) return result;
						}
					}
				}

				if (requirements.busyAction) {
					for (let action in requirements.busyAction) {
						let requiredValue = requirements.busyAction[action];
						let currentValue = GameGlobals.playerHelper.isBusy() && GameGlobals.playerHelper.getBusyAction() == action;
						if (requiredValue != currentValue) {
							let busyDescription = PlayerActionConstants.getActionBusyDescription(action);
							if (requiredValue) reason = "Not " + busyDescription;
							else reason = "ui.actions.disabled_reason_busy";
							return { value: 0, reason: this.getDisabledReasonVO(reason, busyDescription, PlayerActionConstants.DISABLED_REASON_UPGRADE) };
						}
					}
				}

				if (typeof requirements.busy !== "undefined" && !shouldSkipCheck(PlayerActionConstants.DISABLED_REASON_BUSY)) {
					var currentValue = GameGlobals.playerHelper.isBusy();
					var requiredValue = requirements.busy;
					if (currentValue !== requiredValue) {
						var timeLeft = Math.ceil(GameGlobals.playerHelper.getBusyTimeLeft());
						if (currentValue) reason = "Busy " + GameGlobals.playerHelper.getBusyDescription() + " (" + timeLeft + "s)";
						else reason = "Need to be busy.";
						return { value: 0, reason: this.getDisabledReasonVO(reason, null, PlayerActionConstants.DISABLED_REASON_BUSY) };
					}
				}
			}
			
			if (GameGlobals.gameState.isLaunchStarted) return { value: 0, reason: this.getDisabledReasonVO(PlayerActionConstants.DISABLED_REASON_LAUNCHED) };
			
			return { value: lowestFraction, reason: this.getDisabledReasonVO(reason, reasonParams, baseReason, reasonDebugInfo) };
		},

		checkRequirementsDictionary: function (requirements, fnGetValue) {
			for (let requirementKey in requirements) {
				let requiredValue = requirements[requirementKey];
				let currentValue = fnGetValue(requirementKey);
				if (requiredValue != currentValue) {
					return { value: 0, reason: this.getDisabledReasonVO(null, null, null, requirementKey + " is not " + requiredValue) };
				}
			}

			return null;
		},
		
		// minreason: reason if rejected because value is too small
		// maxreason: reason if rejected ebcause the value is too big
		// minreason1: reason if rejected because the value is too small and required min is 1 (need at least 1)
		// maxreason1: reason if rejected because the value is too big and the required max is 1 (should not have any)
		// baseReason: generic reason with no values that can be used for checks
		checkRequirementsRange: function (range, value, minreason, maxreason, minreason1, maxreason1, baseReason) {
			if (typeof range === "number") range = [ range, range + 1 ];
			let min = range[0];
			let max = range[1];
			if (max < 0) max = 9999999;
			
			if (value < min) {
				if (min == 1 && minreason1) {
					return { value: 0, reason: this.updateReason(minreason1, null, baseReason) };
				} else {
					return { value: (value === 0 ? 0 : value / min), reason: this.updateReason(minreason, { min: min }, baseReason) };
				}
			}
			if (value >= max) {
				if (max == 1 && maxreason1) {
					return { value: 0, reason: this.updateReason(maxreason1, null, baseReason) };
				} else {
					return { value: 0, reason: this.updateReason(maxreason, { max: max }, baseReason) };
				}
			}
			return null;
		},
		
		// rejectTrueReason: reason if rejected because currentValue is true (and requiredValue false)
		// rejectFalseReason: reason if rejected because currentValue is false (and requiredValue true)
		checkRequirementsBoolean: function (requiredValue, currentValue, rejectTrueReason, rejectFalseReason) {
			if (requiredValue != currentValue) {
				let reason = this.updateReason(requiredValue ? rejectFalseReason : rejectTrueReason);
				return { value: 0, reason: reason };
			}
			return null;
		},

		// clean up disabled reason when it could be a proper vo or an old style string (fallback)
		// add params to existing reason if valid
		updateReason: function (reason, textParams, baseReason) {
			if (!reason || typeof reason === "string") reason = this.getDisabledReasonVO(reason, null, baseReason);

			if (textParams) {
				if (!reason.textParams) reason.textParams = {};
				for (let key in textParams) {
					reason.textParams[key] = textParams[key];
				}
			}
			
			return reason;
		},

		checkTriggerParams: function (conditions, triggerParam) {
			if (conditions.action) {
				let lastAction = GameGlobals.gameState.lastAction;
				if (conditions.action != lastAction) {
					return false;
				}
			}

			if (conditions.dialogue) {
				if (conditions.dialogue != triggerParam) return false;
			}

			if (conditions.eventType) {
				if (conditions.eventType != triggerParam) return false;
			}

			if (conditions.localeType) {
				if (conditions.localeType != triggerParam) return false;
			}

			return true;
		},

		getDisabledReasonVO: function (textKey, textParams, baseReason, debugInfo) {
			if (!textKey) textKey = "ui.actions.disabled_reason_generic";
			if (!baseReason) baseReason = textKey;
			return { baseReason: baseReason, textKey: textKey, textParams: textParams, debugInfo: debugInfo };
		},

		getDisabledReasonStringWithDebugInfo: function (reason) {
			// backwards compatibility / fallback for old cases that still don't use a proper VO for reason
			if (typeof reason === "string") return reason;

			let result = reason.textKey;
			if (reason.debugInfo) result += " | " + reason.debugInfo;
			return result;
		},

		// Check the costs of an action; returns lowest fraction of the cost player can cover; >1 means the action is available
		checkCosts: function (action, doLog, otherSector) {
			var costs = this.getCosts(action);

			if (costs) {
				let lowestFraction = 1;
				for (let key in costs) {
					let currentFraction = this.checkCost(action, key, otherSector);
					if (currentFraction < lowestFraction) {
						if(doLog) log.w("Not enough " + key + " to perform action [" + action + "]");
						lowestFraction = currentFraction;
					}
				}
				return lowestFraction;
			}

			return 1;
		},

		// Check if player can afford a cost; returns fraction of the cost the player can cover; >1 means ok
		checkCost: function (action, name, otherSector) {
			let sector = otherSector || (this.playerLocationNodes.head && this.playerLocationNodes.head.entity);
			if (!sector) return 0;

			let costs = this.getCosts(action);

			let costAmount = costs[name];
			let costAmountOwned = this.getCostAmountOwned(sector, name);
			
			return costAmountOwned / costAmount;
		},
		
		getCostAmountOwned: function (sector, name, anyInventory) {
			let itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			let inCamp = this.playerStatsNodes.head.entity.get(PositionComponent).inCamp;
			let playerResources = GameGlobals.resourcesHelper.getCurrentStorage();
			let campStorage = GameGlobals.resourcesHelper.getCampStorage(sector);
			let globalStorage = GameGlobals.resourcesHelper.getGlobalStorage();
			
			let costNameParts = name.split("_");
			
			if (costNameParts[0] === "resource") {
				let resourceName = costNameParts[1];
				if (resourceName == resourceNames.robots) {
					return campStorage.resources.getResource(resourceName);
				} else if (anyInventory) {
					return playerResources.resources.getResource(resourceName) || globalStorage.getResource(resourceName);
				} else {
					return playerResources.resources.getResource(resourceName);
				}
			} else if (costNameParts[0] === "item") {
				let itemId = name.replace(costNameParts[0] + "_", "");
				return itemsComponent.getCountById(itemId, inCamp | anyInventory);
			} else {
				switch (name) {
					case "stamina":
						return this.playerStatsNodes.head.stamina.stamina;

					case "rumours":
						return this.playerStatsNodes.head.rumours.value;

					case "hope":
						var hope = this.playerStatsNodes.head.hope.hope;
						return hope;

					case "evidence":
						return this.playerStatsNodes.head.evidence.value;

					case "insight":
						return this.playerStatsNodes.head.insight.value;

					case "blueprint":
						return 1;
					
					case "silver":
						var currencyComponent = GameGlobals.resourcesHelper.getCurrentCurrency();
						return currencyComponent.currency;

					default:
						log.w("Unknown cost: " + name);
						return 0;
				}
			}
		},

		getCostAmountProduction: function (sector, costName) {
			let costNameParts = costName.split("_");
			
			if (costNameParts[0] === "resource") {
				let resourceName = costNameParts[1];
				let resourceAccumulation = GameGlobals.resourcesHelper.getCurrentStorageAccumulation(false).resourceChange;
				return resourceAccumulation.getResource(resourceName);
			} else {
				switch (costName) {
					case "rumours":
						return this.playerStatsNodes.head.rumours.accumulation;

					case "hope":
						return this.playerStatsNodes.head.hope.accumulation;

					case "evidence":
						return this.playerStatsNodes.head.evidence.accumulation;

					default:
						return 0;
				}
			}
		},
		
		checkCostsVersusStorage: function (action, otherSector) {
			let costs = this.getCosts(action);

			if (costs) {
				let lowestFraction = 1;
				for (let key in costs) {
					let currentFraction = this.checkCostVersusStorage(action, key, otherSector);
					if (currentFraction < lowestFraction) {
						lowestFraction = currentFraction;
					}
				}
				return lowestFraction;
			}

			return 1;
		},
		
		checkCostVersusStorage: function (action, name, otherSector) {
			let sector = otherSector || (this.playerLocationNodes.head && this.playerLocationNodes.head.entity);
			if (!sector) return 0;
			
			let playerResources = GameGlobals.resourcesHelper.getCurrentStorage();

			let costs = this.getCosts(action);

			let costNameParts = name.split("_");
			let costAmount = costs[name] || 0;
			
			if (costAmount <= 0) return 1;

			if (costNameParts[0] === "resource") {
				return playerResources.storageCapacity / costAmount;
			} else if (costNameParts[0] === "item") {
				return 1;
			} else {
				switch (name) {
					case "stamina":
						return this.playerStatsNodes.head.stamina.maxStamina / costs.stamina;

					case "rumours":
						return this.playerStatsNodes.head.rumours.maxValue / costs.rumours;
						
					case "evidence":
						return this.playerStatsNodes.head.evidence.maxValue / costs.evidence;
						
					case "insight":
						return this.playerStatsNodes.head.insight.maxValue / costs.insight;
						
					case "hope":
						let hopeComponent = this.playerStatsNodes.head.entity.get(HopeComponent);
						let hasDeity = hopeComponent != null;
						return hasDeity ? (hopeComponent.maxHope / costs.hope) : 0;

					case "blueprint":
						return 1;
					
					case "silver":
						return 1;

					default:
						log.w("Unknown cost: " + name);
						return 1;
				}
			}
			
		},
		
		getCostResourcesVO: function (action) {
			var costs = this.getCosts(action);
			var resourcesVO = new ResourcesVO();
			if (costs) {
				for (var key in costs) {
					var costNameParts = key.split("_");
					var costAmount = costs[key];
					if (costNameParts[0] === "resource") {
						resourcesVO.addResource(costNameParts[1], costAmount, "get-cost");
					}
				}
			}
			return resourcesVO;
		},

		// Return the current ordinal of an action (depending on action, level ordinal / camp ordinal / num of existing buildings)
		getActionOrdinal: function (action, otherSector, modifier) {
			if (!action) return 1;
			if (!otherSector && (!this.playerLocationNodes || !this.playerLocationNodes.head)) {
				return 1;
			}

			var sector = otherSector || this.playerLocationNodes.head.entity;
			var baseActionID = this.getBaseActionID(action);
			modifier = modifier || 0;

			var levelComponent = sector ? GameGlobals.levelHelper.getLevelEntityForSector(sector).get(LevelComponent) : null;
			var isOutpost = levelComponent ? levelComponent.habitability < 1 : false;

			if (action.indexOf("build_in") >= 0) {
				var improvementName = this.getImprovementNameForAction(action);
				var improvementsComponent = sector.get(SectorImprovementsComponent);
				let result = improvementsComponent.getCount(improvementName) + 1;
				if (action === "build_in_house" && result === 1) result = isOutpost ? 0.85 : 0.5;
				return result + modifier;
			}
			
			if (action.indexOf("improve_in") >= 0 || action.indexOf("improve_out") >= 0) {
				var improvementName = this.getImprovementNameForAction(action);
				var improvementsComponent = sector.get(SectorImprovementsComponent);
				let result = improvementsComponent.getLevel(improvementName);
				return result + modifier;
			}

			switch (baseActionID) {
				case "use_in_hospital_2":
					let perksComponent = this.playerStatsNodes.head.perks;
					let ordinal = 1;
					if (perksComponent.hasPerk(PerkConstants.perkIds.healthBonus2))
						ordinal = 2;
					return ordinal + modifier;
				
				case "build_out_luxury_outpost":
					return GameGlobals.campHelper.getAvailableLuxuryResources().length + 1 + modifier;

				case "build_out_passage_down_stairs":
				case "build_out_passage_down_elevator":
				case "build_out_passage_down_hole":
				case "build_out_passage_up_stairs":
				case "build_out_passage_up_elevator":
				case "build_out_passage_up_hole":
					let levelOrdinal = action.substring(action.lastIndexOf("_") + 1);
					let campOrdinal = GameGlobals.gameState.getCampOrdinalForLevelOrdinal(levelOrdinal);
					// exception_ passage up from level 13
					if (baseActionID.indexOf("_up_") >= 0) {
						 if (campOrdinal <= WorldConstants.CAMP_ORDINAL_GROUND) {
							campOrdinal = WorldConstants.CAMP_ORDINAL_GROUND;
						}
					}
					return campOrdinal + modifier;
			}

			return 1;
		},

		getActionOrdinalLast: function (action, otherSector) {
			return this.getActionOrdinal(action, otherSector, -1);
		},

		// Returns the cost factor of a given action, usually 1, but may depend on the current status (items, explorers, perks, improvement level etc) for some actions
		getCostFactor: function (action, cost, otherSector) {
			if (!this.playerLocationNodes || !this.playerLocationNodes.head) return 1;

			var sector = otherSector || this.playerLocationNodes.head.entity;
			let improvements = sector.get(SectorImprovementsComponent);
			var playerStatsNode = this.playerStatsNodes.head;

			let baseActionID = this.getBaseActionID(action);

			var getShoeBonus = function () {
				var itemsComponent = playerStatsNode.items;
				var shoeBonus = itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.movement);
				if (shoeBonus === 0) shoeBonus = 1;
				return shoeBonus;
			}

			var getPerkBonus = function () {
				var perksComponent = playerStatsNode.perks;
				var perkBonus = perksComponent.getTotalEffect(PerkConstants.perkTypes.movement);
				if (perkBonus === 0) perkBonus = 1;
				return perkBonus;
			}
			
			var getBeaconBonus = function () {
				let perksComponent = playerStatsNode.perks;
				return GameGlobals.sectorHelper.getBeaconMovementBonus(sector, perksComponent);
			}
			
			var getHazardMalus = function () {
				return GameGlobals.sectorHelper.getHazardsMovementMalus(sector);
			};
			
			var getExplorerBonus = function (itemBonusType) {
				let explorersComponent = playerStatsNode.explorers;
				return explorersComponent.getCurrentBonus(itemBonusType);
			}
			
			var getImprovementLevelBonus = function (improvementName, levelFactor) {
				let level = improvements.getMajorLevel(improvementName);
				return 1 - (level - 1) * levelFactor;
			};

			let factor = 1;

			if (baseActionID.startsWith("move_sector_")) {
				if (cost == "stamina") {
					factor *= getShoeBonus();
					factor *= getExplorerBonus(ItemConstants.itemBonusTypes.movement);
					factor *= getPerkBonus();
					factor *= getBeaconBonus();
					factor *= getHazardMalus();
				}
			}

			switch (baseActionID) {
				case "move_level_down":
				case "move_level_up":
					if (cost == "stamina") {
						factor *= getShoeBonus();
						factor *= getExplorerBonus(ItemConstants.itemBonusTypes.movement);
						factor *= getPerkBonus();
					}
					break;
				
				case "move_camp_global":
					if (cost == "stamina") {
						factor *= getImprovementLevelBonus(improvementNames.tradepost, 0.333);
					}
					break;
				
				case "scavenge":
				case "scavenge_heap":
					if (cost == "stamina") {
						factor *= getExplorerBonus(ItemConstants.itemBonusTypes.scavenge_cost);
					}
					break;
				
				case "scout":
					if (cost == "stamina") {
						factor *= getExplorerBonus(ItemConstants.itemBonusTypes.scout_cost);
					}
					break;
				
				case "use_in_hospital":
					factor *= getImprovementLevelBonus(improvementNames.hospital, 0.1);
					break;
			}

			return factor;
		},
		
		getImproveBuildingActionReqs: function (improvementID) {
			let result = {};
			let improvementName = improvementNames[improvementID];
			let improvementType = getImprovementType(improvementName);
			result.improvements = {};
			if (improvementType == improvementTypes.camp) {
				result.improvements.camp = [ 1, -1 ];
			}
			result.improvements[improvementID] = [ 1, - 1];
			
			// if 1 improvement per tech level, improvement is locked until first tech that unlocks improvements
			let improvementsPerTechLevel = ImprovementConstants.improvements[improvementID].improvementLevelsPerTechLevel || 0;
			if (improvementsPerTechLevel == 1) {
				let techs = GameGlobals.upgradeEffectsHelper.getUpgradeIdsForImprovement(improvementName);
				result.upgrades = {};
				result.upgrades[techs[0]] = true;
			}
			
			return result;
		},
		
		getRepairBuildingActionReqs: function (improvementID) {
			let result = {};
			let improvementName = improvementNames[improvementID];
			result.improvements = {};
			result.improvements.camp = [ 1, -1 ];
			result.improvements[improvementID] = [ 1, - 1];
			result.improvementsDamaged = {};
			result.improvementsDamaged[improvementID] = [ 1, - 1];
			
			return result;
		},

		getReqs: function (action, sector) {
			var sector = sector || (this.playerLocationNodes && this.playerLocationNodes.head ? this.playerLocationNodes.head.entity : null);
			let baseActionID = this.getBaseActionID(action);
			let actionIDParam = this.getActionIDParam(action);
			let requirements = {};
			
			if (this.isImproveBuildingAction(baseActionID)) {
				requirements = PlayerActionConstants.requirements[baseActionID] || {};
				let improvementID = this.getImprovementIDForAction(action);
				let dynamicReqs = this.getImproveBuildingActionReqs(improvementID);
				Object.assign(requirements, dynamicReqs);
				return requirements;
			}
			
			if (this.isRepairBuildingAction(baseActionID)) {
				requirements = PlayerActionConstants.requirements[baseActionID] || {};
				let improvementID = this.getImprovementIDForAction(action);
				let dynamicReqs = this.getRepairBuildingActionReqs(improvementID);
				Object.assign(requirements, dynamicReqs);
				return requirements;
			}
			
			switch (baseActionID) {
				case "scout_locale_i":
				case "scout_locale_u":
					let localeVO;
					let localei = parseInt(action.split("_")[3]);
					if (sector) {
						let sectorLocalesComponent = sector.get(SectorLocalesComponent);
						localeVO = sectorLocalesComponent.locales[localei];
					}
					requirements = localeVO == null ? {} : localeVO.requirements;
					requirements.sector = {};
					requirements.sector.scouted = true;
					if (localeVO) {
						let localeType = localeVO.type;
						if (!LocaleConstants.canBeScoutedAgain(localeType)) {
							requirements.sector.scoutedLocales = {};
							requirements.sector.scoutedLocales[localei] = false;
						}
					}
					return requirements;
				
				case "clear_workshop":
					requirements.sector = {};
					requirements.sector.scouted = true;
					requirements.sector.controlledLocales = {};
					requirements.sector.controlledLocales[LocaleConstants.LOCALE_ID_WORKSHOP] = false;
					return requirements;
					
				case "fight_gang":
					requirements = $.extend({}, PlayerActionConstants.requirements[baseActionID]);
					var direction = parseInt(action.split("_")[2]);
					requirements.sector = $.extend({}, PlayerActionConstants.requirements[baseActionID].sector);
					var directionName = PositionConstants.getDirectionName(direction);
					var blockerKey = "blocker" + directionName.toUpperCase();
					requirements.sector[blockerKey] = true;
					return requirements;
					
				case "clear_waste_t":
				case "clear_waste_r":
					requirements = $.extend({}, PlayerActionConstants.requirements[baseActionID]);
					var direction = parseInt(action.split("_")[2]);
					requirements.sector = $.extend({}, PlayerActionConstants.requirements[baseActionID].sector);
					requirements.sector["isWasteCleared_" + direction] = false;
					return requirements;
					
				case "create_blueprint":
					requirements = $.extend({}, PlayerActionConstants.requirements[baseActionID]);
					let upgradeID = action.replace(baseActionID + "_", "");
					let type = UpgradeConstants.getUpgradeType(upgradeID);
					requirements.blueprintpieces = upgradeID;
					if (type == UpgradeConstants.UPGRADE_TYPE_HOPE) {
						if (upgradeID != "unlock_building_greenhouse") {
							requirements.workers = {};
							requirements.workers.cleric = [1, -1];
						}
					}
					return requirements;
					
				case "use_in_hospital_2":
					let ordinal = this.getActionOrdinal(action);
					let perkID = ordinal == 1 ? PerkConstants.perkIds.healthBonus2 : PerkConstants.perkIds.healthBonus3;
					let minLevel = ordinal + 1;
					let maxHealth = PerkConstants.getPerk(perkID).effect;
					requirements = $.extend({}, PlayerActionConstants.requirements[baseActionID]);
					requirements.improvementMajorLevel = {};
					requirements.improvementMajorLevel["hospital"] = [ minLevel, -1 ];
					requirements.perkEffects = {};
					requirements.perkEffects["Health"] = [ -1, maxHealth ];
					return requirements;

				case "dismantle":
					let improvementID = this.getImprovementIDForAction(action);
					this.addReqs(requirements, PlayerActionConstants.requirements[action]);	
					requirements.busyAction = {};
					requirements.busyAction["use_in_" + improvementID] = false;
					return requirements;
				
				case "use_item":
					let baseItemID = ItemConstants.getBaseItemID(actionIDParam);
					let actionID = baseActionID + "_" + baseItemID;
					// some items define reqs per item (bag_1, first_aid_kit_1) some by base item (stamina_potion)
					return PlayerActionConstants.requirements[actionID] || PlayerActionConstants.requirements[action];

				case "repair_item":
					let itemVO = this.playerStatsNodes.head.items.getItem(null, actionIDParam, true, true);
					this.addReqs(requirements, PlayerActionConstants.requirements[baseActionID]);	
					this.addReqs(requirements, this.getReqs("craft_" + itemVO.id));	
					return requirements;
					
				case "select_dialogue_option":
					let optionID = this.getActionIDParam(action);
					let currentPageVO = GameGlobals.dialogueHelper.getCurrentPageVO();
					if (currentPageVO) {
						let optionVO = currentPageVO.optionsByID[optionID];
						if (optionVO && optionVO.conditions) return optionVO.conditions;
					}
					break;
					
				case "build_out_passage_up_stairs":
				case "build_out_passage_up_elevator":
				case "build_out_passage_up_hole":
				case "build_out_passage_down_stairs":
				case "build_out_passage_down_elevator":
				case "build_out_passage_down_hole":
				case "move_camp_global":
				case "send_caravan":
				case "bridge_gap":
				case "recruit_explorer":
				case "dismiss_explorer":
				case "select_explorer":
				case "deselect_explorer":
				case "repair_item":
				default:
					return PlayerActionConstants.getRequirements(action, baseActionID);
			}
		},
		
		addReqs: function (result, reqs) {
			if (!reqs) return;

			result = result || {};

			for (let key in reqs) {
				if (key == "upgrades") {
					if (!result.upgrades) result.upgrades = {};
					for (let upgradeID in reqs.upgrades) {
						result.upgrades[upgradeID] = reqs.upgrades[upgradeID];
					}
				} else {
					result[key] = reqs[key];
				}
			}
		},
		
		getSpecialReqs: function (action) {
			let reqs = this.getReqs(action);
			let result = {};
			if (!reqs) {
				return result;
			}
			if (reqs.improvementsOnLevel) {
				result.improvementsOnLevel = reqs.improvementsOnLevel;
			}
			return result;
		},
		
		getCost: function (constantCost, linearCost, expCost, expBase, ordinal, statusFactor) {
			if (ordinal <= 0) ordinal = 1;
			var constantPart = constantCost;
			var linearPart = linearCost * ordinal;
			var expPart = expCost * Math.pow(expBase, ordinal-1);
			return (constantPart + linearPart + expPart) * statusFactor;
		},

		// NOTE: this should always return all possible costs as keys (even if value currently is 0)
		// NOTE: if you change this mess, keep GDD up to date
		// multiplier: simple multiplier applied to ALL of the costs
		getCosts: function (action, multiplier, otherSector, actionOrdinal, ignoreModifiers) {
			if (!action) return null;
			if (!multiplier) multiplier = 1;

			var sector = otherSector ? otherSector : (this.playerLocationNodes.head ? this.playerLocationNodes.head.entity : null);
			var levelComponent = sector ? GameGlobals.levelHelper.getLevelEntityForSector(sector).get(LevelComponent) : null;

			var ordinal = actionOrdinal || this.getActionOrdinal(action, sector);
			var isOutpost = levelComponent ? levelComponent.habitability < 1 : false;
			
			return this.getCostsByOrdinal(action, multiplier, ordinal, isOutpost, sector, ignoreModifiers);
		},

		getCostsWithoutBonuses: function (action) {
			return this.getCosts(action, 1, null, null, true);
		},
		
		getCostsByOrdinal: function (action, multiplier, ordinal, isOutpost, sector, ignoreModifiers) {
			let result = {};

			let baseActionID = this.getBaseActionID(action);
			let costs = PlayerActionConstants.costs[action];
			if (!costs) {
				costs = PlayerActionConstants.costs[baseActionID];
			}

			if (costs) {
				result = this.getCostsFromData(action, multiplier, ordinal, isOutpost, sector, costs);
			}
			
			this.addDynamicCosts(action, multiplier, ordinal, isOutpost, sector, result);

			if (!ignoreModifiers) {
				this.addCostModifiers(action, multiplier, ordinal, isOutpost, sector, result);
			}

			// round all costs, big ones to 5 and the rest to int
			var skipRounding = this.isExactCostAction(baseActionID);
			for(var key in result) {
				if (!skipRounding && result[key] > 1000) {
					result[key] = Math.round(result[key] / 5) * 5;
				} else {
					result[key] = Math.round(result[key]);
				}
			}

			return result;
		},
		
		getCostsFromData: function (action, multiplier, ordinal, isOutpost, sector, costs) {
			let result = {};
			
			var isCampBuildAction = action.indexOf("build_in_") >= 0;
			var defaultOutpostExpBaseFactor = 1.1;
			var defaultOutpostExpCostFactor = 1.1;
			
			isOutpost = isOutpost && isCampBuildAction;
			
			var defaultConstantCost = 0;
			var defaultLinearCost = 0;
			var defaultExpCost = 0;
			var defaultExpBase = costs.cost_factor_expBase || 1;
			if (isOutpost) {
				defaultExpBase = costs.cost_factor_expBaseOutpost || defaultExpBase * defaultOutpostExpBaseFactor;
			}
			var defaultRequiredOrdinal = 0;

			for (var key in costs) {
				if (key.indexOf("cost_factor") >= 0) continue;

				var value = costs[key];

				var constantCost = defaultConstantCost;
				var linearCost = defaultLinearCost;
				var expCost = defaultExpCost;
				var expBase = defaultExpBase;
				var requiredOrdinal = defaultRequiredOrdinal;

				if (typeof value === "number") {
					expCost = value;
					if (isOutpost && expBase == 1) {
						expCost *= defaultOutpostExpCostFactor;
					}
				} else if (typeof value === "object") {
					if (value.constantCost) constantCost = value.constantCost;
					if (value.linearCost) linearCost = value.linearCost;
					if (value.expCost) expCost = value.expCost;
					if (value.expBase) {
						expBase = value.expBase;
						if (isOutpost) expBase = value.expBase * defaultOutpostExpBaseFactor;
					}
					if (isOutpost && value.expBaseOutpost) {
						expBase = value.expBaseOutpost;
					}
					if (value.requiredOrdinal) requiredOrdinal = value.requiredOrdinal;
				}

				if (ordinal < requiredOrdinal) {
					result[key] = 0;
				} else {
					var statusFactor = this.getCostFactor(action, key, sector);
					result[key] = this.getCost(constantCost, linearCost, expCost, expBase, ordinal, statusFactor) * multiplier;
				}
			}
			return result;
		},
		
		addDynamicCosts: function (action, multiplier, ordinal, isOutpost, sector, result) {
			// costs that are dynamic but should be now shown as buffs/modifiers in UI

			if (action.startsWith("move_sector_grit_")) {
				let defaultMovementCost = this.getCosts("move_sector_west");
				let playerFood = this.playerResourcesNodes.head ? this.playerResourcesNodes.head.resources.getResource("food") : 1;
				if (playerFood >= 1) {
					result.resource_food = 1;
				}
				let playerWater = this.playerResourcesNodes.head ? this.playerResourcesNodes.head.resources.getResource("water") : 1;
				if (playerWater >= 1) {
					result.resource_water = 1;
				}

				let excursionComponent = this.playerStatsNodes.head ? this.playerStatsNodes.head.entity.get(ExcursionComponent) : null;
				if (excursionComponent) {
					let numGritSteps = excursionComponent.numGritSteps || 0;
					result.stamina = defaultMovementCost.stamina * 5 * (1 + numGritSteps);
				}
			}

			let baseActionID = this.getBaseActionID(action);
			switch (baseActionID) {
				case "move_camp_level":
					let defaultMovementCost = this.getCosts("move_sector_west");
					let path = this.getPathToNearestCamp(sector);
					if (path && path.length > 0) {
						for (let i = 0; i < path.length; i++) {
							let costs = this.getCosts("move_sector_west", 1, path[i]);
							this.addCosts(result, costs);
						}
					} else {
						this.addCosts(result, defaultMovementCost);
					}
					break;

				case "move_camp_global":
					var statusFactor = this.getCostFactor(action, "stamina");
					result.stamina = PlayerActionConstants.costs.move_level_down.stamina * statusFactor;
					break;

				case "scout_locale_i":
				case "scout_locale_u":
					var localei = parseInt(action.split("_")[3]);
					var sectorLocalesComponent = sector.get(SectorLocalesComponent);
					var localeVO = sectorLocalesComponent.locales[localei];
					if (localeVO) this.addCosts(result, localeVO.costs);
					break;
				
				case "recruit_explorer":
					let explorerID = parseInt(action.replace(baseActionID + "_", ""));
					let recruitComponent = GameGlobals.campHelper.findRecruitComponentWithExplorerId(explorerID);
					if (recruitComponent != null) {
						this.addCosts(result, ExplorerConstants.getRecruitCost(recruitComponent.explorer, recruitComponent.isFoundAsReward));
					}
					break;

				case "use_item":
				case "use_item_fight":
					let itemName = action.replace(baseActionID + "_", "item_");
					result[itemName] = 1;
					break;

				case "heal_explorer":
					let healItemName = this.getAvailableHealItem().id;
					result["item_" + healItemName] = 1;
					break;
				
				case "repair_item":
					let itemID = this.getActionIDParam(action);
					let item = this.playerStatsNodes.head.items.getItem(null, itemID, true, true);
					Object.assign(result, this.getCraftItemCosts(item));
					break;

				case "unlock_upgrade":
					result.blueprint = 1;
					break;
				
				case "select_dialogue_option":
					let optionID = this.getActionIDParam(action);
					let currentPageVO = GameGlobals.dialogueHelper.getCurrentPageVO();
					if (currentPageVO) {
						let optionVO = currentPageVO.optionsByID[optionID];
						if (optionVO) {
							Object.assign(result, optionVO.costs);
						}
					}
					break;

				case "send_caravan":
					var caravansComponent = sector.get(OutgoingCaravansComponent);
					result["resource_food"] = 50;
					result["resource_water"] = 0;
					result["resource_metal"] = 0;
					result["resource_rope"] = 0;
					result["resource_fuel"] = 0;
					result["resource_rubber"] = 0;
					result["resource_herbs"] = 0;
					result["resource_medicine"] = 0;
					result["resource_tools"] = 0;
					result["resource_concrete"] = 0;
					if (caravansComponent && caravansComponent.pendingCaravan) {
						var key = "resource_" + caravansComponent.pendingCaravan.sellGood;
						if (!result[key]) result[key] = 0;
						result[key] += caravansComponent.pendingCaravan.sellAmount;
					}
					break;
				
				case "repair_in":
					let improvementID = this.getImprovementIDForAction(action);
					let buildAction = "build_in_" + improvementID;
					let buildActionOrdinal = this.getActionOrdinal(buildAction, sector) - 1;
					let buildingCosts = this.getCosts(buildAction, 1, sector, buildActionOrdinal);
					for (let key in buildingCosts) {
						result[key] = Math.ceil(buildingCosts[key] / 3);
					}
					break;
			}
		},

		addCostModifiers: function (action, multiplier, ordinal, isOutpost, sector, result) {
			// dynamic costs that should be shown as buffs/modifiers in UI (along with cost without them)

			switch (action) {
				case "build_out_collector_food":
				case "build_out_collector_water":
				case "improve_out_collector_food":
				case "improve_out_collector_water":
					if (this.getPartyAbilityLevel(ExplorerConstants.abilityType.COST_COLLECTORS) > 0) {
						let baseCost = result.resource_metal;
						result.resource_metal = baseCost * 0.5
					}
					break;
			}

			let baseActionID = this.getBaseActionID(action);
			switch (baseActionID) {
				case "flee":
					if (this.getPartyAbilityLevel(ExplorerConstants.abilityType.FLEE) > 0) {
						result.stamina = 0;
					}
					break;
			}

			if (GameConstants.cheatModeSupplies) {
				if (action.startsWith("move_sector_")) {
					if (this.getCostAmountOwned(sector, "resource_food") <= 1) result.resource_food = 0;
					if (this.getCostAmountOwned(sector, "resource_water") <= 1) result.resource_water = 0;
				}

				if (action.startsWith("scout_")) {
					if (this.getCostAmountOwned(sector, "item_exploration_1") <= 1) result.item_exploration_1 = 0;
				}
			}

			if (this.getPartyAbilityLevel(ExplorerConstants.abilityType.COST_LOCKPICK) > 0) {
				if (result.item_exploration_1) result.item_exploration_1 = 0;
			}
		},

		getAvailableHealItem: function () {
			let itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			let inCamp = GameGlobals.playerHelper.isInCamp();
			let items = itemsComponent.getAllByType(ItemConstants.itemTypes.exploration, inCamp);

			for (let i = 0; i < items.length; i++) {
				let itemVO = items[i];
				if (itemVO.id.indexOf("first_aid_kit") >= 0) return itemVO;
			}

			return ItemConstants.getItemDefinitionByID("first_aid_kit_1");
		},

		getPartyAbilityLevel: function (abilityType) {
			if (!GameGlobals || !GameGlobals.playerHelper) return 0;
			return GameGlobals.playerHelper.getPartyAbilityLevel(abilityType);
		},
		
		getCraftItemCosts: function (itemVO) {
			let result = {};
			if (!itemVO) return result;
			
			let costsResources = ItemConstants.getResourcesToCraft(itemVO.id);
			let costsIngredients = ItemConstants.getIngredientsToCraft(itemVO.id);
			
			costsResources.sort(cost => cost.amount);
			costsIngredients.sort(cost => cost.amount);
			
			let addCost = function (prefix, cost) {
				if (Object.keys(result).length >= 2) return;
				result[prefix + cost.id] = Math.ceil(cost.amount / 2);
			};
				
			if (costsResources.length > 0 || costsIngredients.length > 0) {
				if (costsResources.length > 0) addCost("resource_", costsResources[0]);
				if (costsIngredients.length > 0) addCost("item_", costsIngredients[0]);
				if (costsIngredients.length > 1) addCost("item_", costsIngredients[1]);
				if (costsResources.length > 1) addCost("resource_", costsResources[1]);
			} else {
				log.w("no crafting costs defined for repairable item: " + itemVO.id);
				result["resource_metal"] = 5;
			}
			
			return result;
		},
		
		addCosts: function (result, costs) {
			for (var key in costs) {
				if (key.indexOf("cost_factor") >= 0) continue;
				if (!result[key]) {
					result[key] = 0;
				}
				
				var value = costs[key];
				result[key] += value;
			}
		},

		getTotalCosts: function (actions) {
			let result = {};
			
			for (let i in actions) {
				this.addCosts(result, this.getCosts(actions[i]));
			}
			
			return result;
		},

		isOnlyAccumulatingCosts: function (costs, ignorePlayerState) {
			if (!costs) return false;
			if (Object.keys(costs).length == 0) return false;

			for (let key in costs) {
				if (!this.isAccumulatingCost(key, ignorePlayerState)) return false;
			}

			return true;
		},

		isAccumulatingCost: function (costName, ignorePlayerState) {
			if (costName === "rumours") return true;
			if (costName === "hope") return ignorePlayerState || GameGlobals.gameState.unlockedFeatures.hope;
			if (costName === "evidence") return true;
			let costNameParts = costName.split("_");
			if (costNameParts[0] === "resource") return ignorePlayerState || GameGlobals.gameState.unlockedFeatures.camp;
			return false;
		},

		getCostCountdownSeconds: function (costName, amount, otherSector) {
			let sector = otherSector || (this.playerLocationNodes.head && this.playerLocationNodes.head.entity);
			let costAmountOwned = this.getCostAmountOwned(sector, costName);
			if (costAmountOwned >= amount) return 0;
			if (!this.isAccumulatingCost(costName, false)) return -1;
			
			let costAmountProduction = this.getCostAmountProduction(sector, costName);
			if (costAmountProduction <= 0) return -1;

			return (amount - costAmountOwned) / costAmountProduction;
		},

		getDescription: function (action) {
			if (!action) return "";
			
			let baseAction = this.getBaseActionID(action);
			let sector = this.playerLocationNodes.head ? this.playerLocationNodes.head.entity : null;
			
			if (baseAction.indexOf("build_in_") == 0) {
				let buildingKey = baseAction.replace("build_in_", "");
				let improvementLevel = this.getImprovementLevel(buildingKey, sector);
				return ImprovementConstants.getImprovementDescription(buildingKey, improvementLevel);
			} else if (Text.hasKey("game.actions." + action + "_description")) {
				return Text.t("game.actions." + action + "_description");
			} else if (Text.hasKey("game.actions." + baseAction + "_description")) {
				return Text.t("game.actions." + baseAction + "_description");
			} else if (baseAction.indexOf("build_out") == 0) {
				// optional description, especially projects have their description on the page
				return "";
			} else if (UpgradeConstants.hasUpgrade[action]) {
				// upgrade action descriptions are displayed in the list outside of the button
				return "";
			} else if (action.indexOf("unequip_") >= 0) {
				// no need for description
				return "";
			} else if (action.indexOf("discard_") >= 0) {
				// no need for description
				return "";
			} else if (action.indexOf("repair_") >= 0) {
				// no need for description
				return "";
			} else if (action.indexOf("equip_") >= 0) {
				// no need for description
				return "";
			} else if (action.indexOf("move_sector_") >= 0) {
				// no need for description
				return "";
			} else {
				switch(baseAction) {
					case "craft":
						var item = this.getItemForCraftAction(action);
						if (!item) return "";
						var itemDescription = ItemConstants.getItemDescription(item);
						return itemDescription + (item.getBaseTotalBonus() === 0 ? "" : "<hr/>" + UIConstants.getItemBonusDescription(item, true));
					case "use_item":
					case "use_item_fight":
						var item = this.getItemForCraftAction(action);
						if (!item) return "";
						var itemDescription = ItemConstants.getItemDescription(item);
						return itemDescription;
					case "improve_in":
						return this.getImproveActionDescription(action);
					case "dismantle": return "Dismantle building";
				}
			}
			
			if (GameConstants.isDebugVersion) log.w("no description defined for action: " + action)
			return "";
		},

		getEffectDescription: function (action) {
			if (!action) return null;

			let entries = [];
			let sector = GameGlobals.sectorHelper.getCurrentActionSector();
			let baseAction = this.getBaseActionID(action);

			let improvementsComponent = sector.get(SectorImprovementsComponent);
			let statusComponent = sector.get(SectorStatusComponent);
			let campComponent = sector.get(CampComponent);
			let currentPopulation = campComponent ? Math.floor(campComponent.population) : 0;
			let accSpeedPopulation = GameGlobals.campHelper.getPopulationRumourGenerationPerSecond(currentPopulation);

			if (baseAction.indexOf("build_in_") == 0) {
				let improvementName = this.getImprovementNameForAction(action, true);
				let reputation = ImprovementConstants.getDefaultReputationBonus(improvementName);
				if (reputation > 0) entries.push("Reputation: +" + reputation);
			}

			if (baseAction.indexOf("use_item") == 0) {
				let itemID = this.getActionIDParam(action);
				let useItemRewards = GameGlobals.playerActionResultsHelper.getUseItemRewards(itemID);
				if (!useItemRewards.isEmpty()) {
					let useItemRewardsMsg = GameGlobals.playerActionResultsHelper.getRewardsMessageText(useItemRewards, GameGlobals.playerActionResultsHelper.RESULT_MSG_FORMAT_PREVIW);
					if (useItemRewardsMsg && useItemRewardsMsg.length > 0) {
						entries.push(useItemRewardsMsg);
					}
				}
			}

			if (action == "build_in_campfire") {
				var campfireCount = improvementsComponent.getCount(improvementNames.campfire);
				var campfireLevel = improvementsComponent.getLevel(improvementNames.campfire);

				let current = CampConstants.getCampfireRumourGenerationPerSecond(campfireCount, campfireLevel, accSpeedPopulation);
				let next = CampConstants.getCampfireRumourGenerationPerSecond(campfireCount + 1, campfireLevel, accSpeedPopulation);
				entries.push("Rumours: +" + UIConstants.getAccumulationText(next - current));
			}

			if (action == "improve_in_campfire") {
				var campfireCount = improvementsComponent.getCount(improvementNames.campfire);
				var campfireLevel = improvementsComponent.getLevel(improvementNames.campfire);

				let current = CampConstants.getCampfireRumourGenerationPerSecond(campfireCount, campfireLevel, accSpeedPopulation);
				let next = CampConstants.getCampfireRumourGenerationPerSecond(campfireCount, campfireLevel + 1, accSpeedPopulation);
				entries.push("Rumours: +" + UIConstants.getAccumulationText(next - current));
			}

			if (action == "scavenge_heap") {
				let heapScavengedPercent = Math.round(statusComponent.getHeapScavengedPercent());
				entries.push("Remaining: " + (100 - heapScavengedPercent + "%"));
			}

			return entries.length > 0 ? entries.map(e => "<span class='action-effect-description-entry'>" + e + "</span>") : null;
		},
		
		getImproveActionDescription: function (action) {
			let ordinal = this.getActionOrdinal(action);
			let currentLevel = ordinal;
			
			let improvementName = this.getImprovementNameForAction(action);
			let id = ImprovementConstants.getImprovementID(improvementName);
			let majorLevelCurrent = ImprovementConstants.getMajorLevel(id, currentLevel);
			let majorLevelNext = ImprovementConstants.getMajorLevel(id, currentLevel + 1);
			var isNextLevelMajor = majorLevelNext > majorLevelCurrent;
			
			switch (action) {
				case "improve_in_campfire":
				case "improve_in_market":
					return isNextLevelMajor ? "Increase rumour generation and rumours per visit" : "Increase rumour generation";
				case "improve_in_shrine":
					return isNextLevelMajor ? "Increase reputation bonus and meditation success chance" : "Increase reputation bonus";
				case "improve_in_inn":
					return isNextLevelMajor ? "Increase rumour generation and attract more visitors" : "Increase rumour generation";
			}
			
			return "Improve " + improvementName;
		},

		getActionDisplayNameLong: function (action) {
			let textKey = this.getActionDisplayNameKey(action) + "_long";
			let textParams = {};

			let improvementName = GameGlobals.playerActionsHelper.getImprovementNameForAction(action, true);
				
			if (improvementName) {
				textParams.improvementName = improvementName;
			}

			return { textKey: textKey, textParams: textParams };
		},

		getActionDisplayNameKey: function (action) {
			let baseActionID = PlayerActionConstants.getBaseActionID(action);

			let actionKey = action;

			if (action.indexOf("build_in") >= 0) 
				actionKey = "build_in";
			else if (action.indexOf("build_out") >= 0) 
				actionKey = "build_out";
			else 
				actionKey = baseActionID;

			return "game.actions." + actionKey + "_name";
		},
		
		getImprovementLevel: function (improvementID, sector) {
			if (!sector) return 1;
			let improvementName = improvementNames[improvementID];
			let improvementsComponent = sector.get(SectorImprovementsComponent);
			return improvementsComponent.getLevel(improvementName);
		},

		getBaseActionID: function (action) {
			if (!action) return action;
			if (this.cache.baseActionID[action]) {
				return this.cache.baseActionID[action];
			}
			let result = PlayerActionConstants.getBaseActionID(action);
			this.cache.baseActionID[action] = result;
			return result;
		},

		getActionIDParam: function (action) {
			return PlayerActionConstants.getActionIDParam(action);
		},
		
		getActionDefaultParam: function () {
			let playerPos = this.playerStatsNodes.head.entity.get(PositionComponent);
			return playerPos.level + "." + playerPos.sectorX + "." + playerPos.sectorY;
		},

		getActionNameForImprovement: function (improvementName, disableWarnings) {
			return PlayerActionConstants.getActionNameForImprovement(improvementName, disableWarnings);
		},

		getImprovementNameForAction: function (action, disableWarnings) {
			return PlayerActionConstants.getImprovementNameForAction(action, disableWarnings);
		},
		
		getImprovementIDForAction: function (actionName) {
			return PlayerActionConstants.getImprovementIDForAction(actionName);
		},
		
		getItemForCraftAction: function (actionName) {
			var baseActionName = this.getBaseActionID(actionName);
			switch (baseActionName) {
				case "craft":
					return ItemConstants.getItemDefinitionByID(this.getActionIDParam(actionName));
				case "use_item":
				case "use_item_fight":
					return ItemConstants.getItemDefinitionByID(this.getActionIDParam(actionName));

				default: return null;
			}
		},

		getEncounterFactor: function (action) {
			var baseActionID = this.getBaseActionID(action);
			switch (baseActionID) {
				case "scout_locale_i":
				case "scout_locale_u":
					// depending on locale
					var sectorLocalesComponent = this.playerLocationNodes.head.entity.get(SectorLocalesComponent);
					let i = GameGlobals.playerActionsHelper.getActionIDParam(action);
					var localeVO = sectorLocalesComponent.locales[i];
					if (!localeVO) return 1;
					switch (localeVO.type) {
						case localeTypes.tradingPartner:
						case localeTypes.grove:
						case localeTypes.greenhouse:
						case localeTypes.depot:
						case localeTypes.spacefactory:
						case localeTypes.shelter:
						case localeTypes.seedDepot:
						case localeTypes.compound:
							return 0;
					}
					return 1;
				default:
					return 1;
			}
		},

		getMinimumCampAndStep: function (action) {
			let result = { campOrdinal: 0, step: 0 };
			
			var addRequirement = function (campOrdinal, step, source) {
				if (campOrdinal > result.campOrdinal || (campOrdinal == result.campOrdinal && step > result.step)) {
					result = { campOrdinal: campOrdinal, step: step };
				}
			};
			
			// upgrades
			var reqs = this.getReqs(action);
			if (reqs && reqs.upgrades) {
				var requiredTech = Object.keys(reqs.upgrades);
				for (let k = 0; k < requiredTech.length; k++) {
					var campOrdinal = GameGlobals.upgradeEffectsHelper.getMinimumCampOrdinalForUpgrade(requiredTech[k], true);
					var step = GameGlobals.upgradeEffectsHelper.getMinimumCampStepForUpgrade(requiredTech[k]);
					addRequirement(campOrdinal, step, requiredTech[k]);
				}
			}
			
			// resources
			var costs = this.getCostsByOrdinal(action, 1, 1, false);
			if (costs) {
				if (costs && costs.resource_fuel && costs.resource_fuel > 0) {
					addRequirement(WorldConstants.CAMP_ORDINAL_FUEL, WorldConstants.CAMP_STEP_POI_2, "fuel");
				}
				if (costs && costs.resource_rubber && costs.resource_rubber > 0) {
					addRequirement(WorldConstants.CAMP_ORDINAL_GROUND, WorldConstants.CAMP_STEP_POI_2, "rubber");
				}
				if (costs && costs.resource_herbs && costs.resource_herbs > 0) {
					addRequirement(WorldConstants.CAMP_ORDINAL_GROUND, WorldConstants.CAMP_STEP_POI_2, "herbs");
				}
			}
			
			// improvements
			if (reqs && reqs.improvements) {
				for (var improvementID in reqs.improvements) {
					var range = reqs.improvements[improvementID];
					var min = range[0];
					if (min < 1) continue;
					var buildAction = "build_in_" + improvementID;
					var buildCampStep = this.getMinimumCampAndStep(buildAction);
					addRequirement(buildCampStep.campOrdinal, buildCampStep.step, "required building");
				}
			}
			
			// deity
			if (reqs && reqs.deity) {
				addRequirement(WorldConstants.CAMP_ORDINAL_GROUND, WorldConstants.CAMP_STEP_POI_2, "deity");
			}
			
			// exceptions
			switch (action) {
				case "build_out_sundome":
				case "build_out_spaceship1":
				case "build_out_spaceship2":
				case "build_out_spaceship3":
					addRequirement(WorldConstants.CAMPS_TOTAL - 1, WorldConstants.CAMP_STEP_END, "surface");
					break;
			}
			
			return result;
		},

		getExpectedCampAndStep: function (action) {
			let minimum = this.getMinimumCampAndStep(action);
			let result = minimum;
			
			var addRequirement = function (campOrdinal, step, source) {
				if (campOrdinal > result.campOrdinal || (campOrdinal == result.campOrdinal && step > result.step)) {
					result = { campOrdinal: campOrdinal, step: step };
				}
			};
			
			// upgrades
			// using expected camp ordinal even if some upgrades that are not gated by blueprints etc can be unlocked earlier
			let reqs = this.getReqs(action);
			if (reqs && reqs.upgrades) {
				let requiredTech = Object.keys(reqs.upgrades);
				for (let k = 0; k < requiredTech.length; k++) {
					let expected = GameGlobals.upgradeEffectsHelper.getExpectedCampAndStepForUpgrade(requiredTech[k]);
					addRequirement(expected.campOrdinal, expected.step, requiredTech[k]);
				}
			}

			return result;
		},
		
		isActionIndependentOfHazards: function (action) {
			var improvement = this.getImprovementNameForAction(action, true);
			if (improvement) {
				if (getImprovementType(improvement) == improvementTypes.level) {
					return true;
				}
			}

			if (action.startsWith("move_sector_") || action.startsWith("move_level_")) {
				// handled by the SectorStatusSystem / MovementOptionsComponent
				return true;
			}

			var baseActionID = this.getBaseActionID(action);
			switch (baseActionID) {
				case "craft": return true;
				case "equip": return true;
				case "unequip": return true;
				case "auto_equip": return true;
				case "move_camp_level": return true;
				case "despair": return true;
				case "accept_inventory": return true;

				case "build_out_greenhouse": return true;
				case "build_out_tradepost_connector": return true;
				case "clear_debris": return true;
				case "clear_explosives": return true;
				case "bridge_gap": return true;

				default: return false;
			}
		},
		
		isExactCostAction: function (baseActionID) {
			switch (baseActionID) {
				case "send_caravan": return true;
			}
			return false;
		},
		
		isImproveBuildingAction: function (baseActionID) {
			return PlayerActionConstants.isImproveBuildingAction(baseActionID);
		},
		
		isBuildImprovementAction: function (baseActionID) {
			return PlayerActionConstants.isBuildImprovementAction(baseActionID);
		},
		
		isRepairBuildingAction: function (baseActionID) {
			return PlayerActionConstants.isRepairBuildingAction(baseActionID);
		},
		
		isUnlockUpgradeAction: function (action) {
			if (UpgradeConstants.upgradeDefinitions[action]) return true;
			return false;
		},
		
		getImprovementDisplayName: function (improvementID) {
			switch (improvementID) {
				case "passageUp":
				case "passageDown":
					return "game.improvements.passage_general_name_default";
				default:
					// TODO determine improvement level to use
					return Text.t(ImprovementConstants.getImprovementDisplayNameKey(improvementID));
			}
		},
		
		getCurrentImprovementCount: function (improvementComponent, campComponent, improvementID) {
			switch (improvementID) {
				case "camp":
					return campComponent ? 1 : 0;
				case "passageUp":
					return improvementComponent.getCount(improvementNames.passageUpStairs)
						+ improvementComponent.getCount(improvementNames.passageUpElevator)
						+ improvementComponent.getCount(improvementNames.passageUpHole);
				case "passageDown":
					return improvementComponent.getCount(improvementNames.passageDownStairs)
						+ improvementComponent.getCount(improvementNames.passageDownElevator)
						+ improvementComponent.getCount(improvementNames.passageDownHole);
				default:
					return improvementComponent.getCount(improvementNames[improvementID]);
			}
		},
		
		getCurrentImprovementMajorLevel : function (improvementComponent, campComponent, improvementID) {
			return improvementComponent.getMajorLevel(improvementNames[improvementID]);
		},
		
		getCurrentImprovementCountOnLevel: function (level, improvementID) {
			let entity = GameGlobals.levelHelper.getLevelEntityForPosition(level);
			if (!entity) return;
			let levelStatus = entity.get(LevelStatusComponent);

			return levelStatus.improvementCounts[improvementID] || 0;
		},
		
		getCurrentImprovementCountTotal: function (improvementID) {
			let improvementName = improvementNames[improvementID];
			let improvementType = getImprovementType(improvementName);
			if (improvementType == improvementTypes.camp) {
				return GameGlobals.campHelper.getTotalNumImprovementsBuilt(improvementName);
			} else {
				let result = 0;
				let minLevel =  GameGlobals.gameState.getGroundLevel();
				let maxLevel = GameGlobals.gameState.getSurfaceLevel();
				for (let i = minLevel; i <= maxLevel; i++) {
					result += this.getCurrentImprovementCountOnLevel(i, improvementID);
				}
				return result;
			}
		},

		getDistanceToNearestCamp: function (sector) {
			let path = this.getPathToNearestCamp(sector);
			return path ? path.length : -1;
		},
		
		getPathToNearestCamp: function (sector) {
			if (!this.nearestCampNodes.head) return null;
			let campSector = this.nearestCampNodes.head.entity;
			if (!campSector) return null;

			sector = sector || (this.playerLocationNodes && this.playerLocationNodes.head ? this.playerLocationNodes.head.entity : null);

			if (!sector) return null;
			
			let sectorPosition = sector.get(PositionComponent);
			let sectorLevel = sectorPosition.level;
			let campLevel = campSector.get(PositionComponent).level;
			if (Math.abs(campLevel - sectorLevel) > 2) return null;
			
			return ValueCache.getValue("PathToNearestCamp", 5, sectorPosition.positionId(), () =>
				GameGlobals.levelHelper.findPathTo(sector, campSector, { skipBlockers: true, skipUnrevealed: true, omitWarnings: true })
			);
		},

		getActionCampSector: function () {
			if (this.playerLocationNodes.head && this.playerLocationNodes.head.entity.has(CampComponent)) {
				return this.playerLocationNodes.head.entity;
			}
			if (this.nearestCampNodes.head) {
				return this.nearestCampNodes.head.entity;
			}
			return GameGlobals.levelHelper.getCampSectorOnLevel(13);
		},

		getCooldownForCurrentLocation: function (action) {
			var isLocationAction = PlayerActionConstants.isLocationAction(action);
			var playerPos = this.playerStatsNodes.head.entity.get(PositionComponent);
			var locationKey = GameGlobals.gameState.getActionLocationKey(isLocationAction, playerPos);
			var cooldownTotal = PlayerActionConstants.getCooldown(action);
			return GameGlobals.gameState.getActionCooldown(action, locationKey, cooldownTotal);
		},

		getInjuryProbability: function (action) {
			let playerVision = this.playerStatsNodes.head.vision.value;
			let perksComponent = this.playerStatsNodes.head.perks;
			let playerLuck = perksComponent.getTotalEffect(PerkConstants.perkTypes.luck);

			let injuryProbability = PlayerActionConstants.getInjuryProbability(action, playerVision, playerLuck);

			if (action == "flee" && GameGlobals.playerHelper.getPartyAbilityLevel(ExplorerConstants.abilityType.FLEE) > 0) return 0;

			return injuryProbability;
		},

		getLoseInventoryProbability: function (action) {
			let playerVision = this.playerStatsNodes.head.vision.value;
			let perksComponent = this.playerStatsNodes.head.perks;
			let playerLuck = perksComponent.getTotalEffect(PerkConstants.perkTypes.luck);

			let loseInventoryProbability = PlayerActionConstants.getLoseInventoryProbability(action, playerVision, playerLuck);

			if (action == "flee" && GameGlobals.playerHelper.getPartyAbilityLevel(ExplorerConstants.abilityType.FLEE) > 0) return 0;

			return loseInventoryProbability;
		}

	});

	return PlayerActionsHelper;
});
