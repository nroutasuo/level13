// Helper methods related to player actions (costs, requirements, descriptions) - common definitions for all actions
define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/PositionConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/PlayerStatConstants',
	'game/constants/FollowerConstants',
	'game/constants/ImprovementConstants',
	'game/constants/ItemConstants',
	'game/constants/BagConstants',
	'game/constants/MovementConstants',
	'game/constants/UpgradeConstants',
	'game/constants/PerkConstants',
	'game/constants/UIConstants',
	'game/constants/WorldConstants',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/player/PlayerResourcesNode',
	'game/nodes/PlayerLocationNode',
	'game/nodes/tribe/TribeUpgradesNode',
	'game/nodes/sector/CampNode',
	'game/nodes/NearestCampNode',
	'game/components/type/LevelComponent',
	'game/components/common/CurrencyComponent',
	'game/components/common/PositionComponent',
	'game/components/player/PlayerActionComponent',
	'game/components/player/BagComponent',
	'game/components/player/ExcursionComponent',
	'game/components/player/ItemsComponent',
	'game/components/player/DeityComponent',
	'game/components/sector/FightComponent',
	'game/components/sector/OutgoingCaravansComponent',
	'game/components/sector/PassagesComponent',
	'game/components/sector/EnemiesComponent',
	'game/components/sector/MovementOptionsComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/sector/SectorLocalesComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/sector/events/TraderComponent',
	'game/components/sector/events/RaidComponent',
	'game/components/common/CampComponent',
	'game/vos/ResourcesVO',
	'game/vos/ImprovementVO'
], function (
	Ash, GameGlobals, GlobalSignals, PositionConstants, PlayerActionConstants, PlayerStatConstants, FollowerConstants, ImprovementConstants, ItemConstants, BagConstants, MovementConstants, UpgradeConstants, PerkConstants, UIConstants, WorldConstants,
	PlayerStatsNode, PlayerResourcesNode, PlayerLocationNode, TribeUpgradesNode, CampNode, NearestCampNode,
	LevelComponent, CurrencyComponent, PositionComponent, PlayerActionComponent, BagComponent, ExcursionComponent, ItemsComponent, DeityComponent,
	FightComponent, OutgoingCaravansComponent, PassagesComponent, EnemiesComponent, MovementOptionsComponent,
	SectorFeaturesComponent, SectorStatusComponent, SectorLocalesComponent, SectorImprovementsComponent, TraderComponent, RaidComponent,
	CampComponent,
	ResourcesVO, ImprovementVO
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

				var sys = this;
				this.engine.updateComplete.add(function () {
					sys.cache.reqs = {};
				});
				GlobalSignals.add(this, GlobalSignals.actionStartedSignal, function () {
					sys.cache.reqs = {};
				});
			}
		},

		deductCosts: function (action) {
			var costs = this.getCosts(action);
			var result = {};
			
			if (!costs) return result;

			var currentStorage = GameGlobals.resourcesHelper.getCurrentStorage();
			var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			var inCamp = this.playerStatsNodes.head.entity.get(PositionComponent).inCamp;

			var costNameParts;
			var costAmount;
			for (var costName in costs) {
				costNameParts = costName.split("_");
				costAmount = costs[costName] || 0;
				if (costName === "stamina") {
					this.playerStatsNodes.head.stamina.stamina -= costAmount;
					result.stamina = costAmount;
				} else if (costName === "rumours") {
					this.playerStatsNodes.head.rumours.value -= costAmount;
					result.rumours = costAmount;
				} else if (costName === "favour") {
					var deityComponent = this.playerStatsNodes.head.entity.get(DeityComponent);
					if (deityComponent) {
						deityComponent.favour -= costAmount;
						result.favour = costAmount;
					} else {
						log.w("Trying to deduct favour cost but there's no deity component!");
					}
				} else if (costName === "evidence") {
					this.playerStatsNodes.head.evidence.value -= costAmount;
					result.evidence = costAmount;
				} else if (costName === "silver") {
					var currencyComponent = GameGlobals.resourcesHelper.getCurrentCurrency();
					currencyComponent.currency -= costAmount;
					result.currency = costAmount;
				} else if (costNameParts[0] === "resource") {
					currentStorage.resources.addResource(costNameParts[1], -costAmount);
					result.resources = result.resources || {};
					result.resources[costNameParts[1]] = costAmount;
				} else if (costNameParts[0] === "item") {
					var itemId = costName.replace(costNameParts[0] + "_", "");
					result.items = result.items || [];
					for (let i = 0; i < costAmount; i++) {
						var item = itemsComponent.getItem(itemId, null, inCamp, false) || itemsComponent.getItem(itemId, null, inCamp, true);
						itemsComponent.discardItem(item, false);
						result.items.push(item);
					}
				} else if (costName == "blueprint") {
				} else {
					log.w("unknown cost: " + costName + ", action: " + action);
				}
			}
			
			return result;
		},

		// Check costs, requirements and cooldown - everything that is needed for the player action
		checkAvailability: function (action, logUnavailable, otherSector) {
			var isLocationAction = PlayerActionConstants.isLocationAction(action);
			var playerPos = this.playerStatsNodes.head.entity.get(PositionComponent);
			var locationKey = GameGlobals.gameState.getActionLocationKey(isLocationAction, playerPos);
			var cooldownTotal = PlayerActionConstants.getCooldown(action);
			var cooldownLeft = GameGlobals.gameState.getActionCooldown(action, locationKey, cooldownTotal) / 1000;
			if (cooldownLeft) {
				if (logUnavailable) log.w("Action blocked by cooldown [" + action + "] " + cooldownLeft);
				return false;
			}

			var reqsResult = this.checkRequirements(action, logUnavailable, otherSector);
			if (reqsResult.value < 1) {
				if (logUnavailable) log.i("blocked by requirements: " + reqsResult.reason);
				return false;
			}
			var costsResult = this.checkCosts(action, logUnavailable, otherSector);
			if (costsResult < 1) {
				if (logUnavailable) log.i("blocked by costs");
				return false;
			}

			return true;
		},
		
		isRequirementsMet: function (action, sector) {
			return GameGlobals.playerActionsHelper.checkRequirements(action, false, sector).value >= 1;
		},

		// Check requirements (not costs) of an action
		// returns an object containing:
		// value: fraction the player has of requirements or 0 depending on req type (if 0, action is not available)
		// reason: string to describe the non-passed requirement (for button explanations)
		checkRequirements: function (action, doLog, otherSector, checksToSkip) {
			if (!action) return { value: 0, reason: "No action" };
			var sector = otherSector;
			if (!sector) sector = this.playerLocationNodes.head ? this.playerLocationNodes.head.entity : null;
			if (!sector) return { value: 0, reason: "No selected sector" };

			var sectorID = sector.get(PositionComponent).positionId();
			var reqsID = action + "-" + sectorID;
			var ordinal = this.getActionOrdinal(action, sector);
			
			var shouldSkipCheck = function (reason) {
				if (!checksToSkip) return false;
				return checksToSkip.indexOf(reason) >= 0;
			};

			var checkRequirementsInternal = function (action, sector) {
				var playerVision = this.playerStatsNodes.head.vision.value;
				var playerPerks = this.playerStatsNodes.head.perks;
				var playerStamina = this.playerStatsNodes.head.stamina.stamina;
				var deityComponent = this.playerResourcesNodes.head.entity.get(DeityComponent);
				
				var requirements = this.getReqs(action, sector);
				var costs = this.getCosts(action);
				var positionComponent = sector.get(PositionComponent);
				var improvementComponent = sector.get(SectorImprovementsComponent);
				var movementOptionsComponent = sector.get(MovementOptionsComponent);
				var passagesComponent = sector.get(PassagesComponent);
				var campComponent = sector.get(CampComponent);
				var featuresComponent = sector.get(SectorFeaturesComponent);
				var statusComponent = sector.get(SectorStatusComponent);
				var playerActionComponent = this.playerResourcesNodes.head.entity.get(PlayerActionComponent);
				var bagComponent = this.playerResourcesNodes.head.entity.get(BagComponent);
				var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
				var inCamp = this.playerStatsNodes.head.entity.get(PositionComponent).inCamp;

				var baseActionID = this.getBaseActionID(action);
				var actionIDParam = this.getActionIDParam(action);

				var lowestFraction = 1;
				var reason = "";

				if (action === "move_level_up" && !movementOptionsComponent.canMoveTo[PositionConstants.DIRECTION_UP])
					return { value: 0, reason: "Blocked. " + movementOptionsComponent.cantMoveToReason[PositionConstants.DIRECTION_UP] };
				if (action === "move_level_down" && !movementOptionsComponent.canMoveTo[PositionConstants.DIRECTION_DOWN])
					return { value: 0, reason: "Blocked. " + movementOptionsComponent.cantMoveToReason[PositionConstants.DIRECTION_DOWN] };

				if (this.isImproveBuildingAction(baseActionID)) {
					let improvementName = this.getImprovementNameForAction(action);
					let improvementID = this.getImprovementIDForAction(action);
					let techLevel = GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementName, this.tribeUpgradesNodes.head.upgrades);
					let maxLevel = ImprovementConstants.getMaxLevel(improvementID, techLevel);
					if (ordinal >= maxLevel) {
						return { value: 0, reason: PlayerActionConstants.UNAVAILABLE_REASON_MAX_IMPROVEMENT_LEVEL };
					}
				}

				if (costs) {
					if (costs.stamina > 0) {
						if (!requirements) requirements = {};
						requirements.health = Math.ceil(costs.stamina / PlayerStatConstants.HEALTH_TO_STAMINA_FACTOR);
					}
					if (costs.favour && !GameGlobals.gameState.unlockedFeatures.favour) {
						reason = "Locked stats.";
						return { value: 0, reason: reason };
					}
					if ((costs.resource_fuel > 0 && !GameGlobals.gameState.unlockedFeatures.resources.fuel) ||
						(costs.resource_rubber > 0 && !GameGlobals.gameState.unlockedFeatures.resources.rubber) ||
						(costs.resource_herbs > 0 && !GameGlobals.gameState.unlockedFeatures.resources.herbs) ||
						(costs.resource_tools > 0 && !GameGlobals.gameState.unlockedFeatures.resources.tools) ||
						(costs.resource_concrete > 0 && !GameGlobals.gameState.unlockedFeatures.resources.concrete)) {
						reason = PlayerActionConstants.UNAVAILABLE_REASON_LOCKED_RESOURCES;
						lowestFraction = 0;
					}
				}

				var isAffectedByHazard = GameGlobals.sectorHelper.isAffectedByHazard(featuresComponent, statusComponent, itemsComponent)
				if (isAffectedByHazard && !this.isActionIndependentOfHazards(action)) {
					return { value: 0, reason: GameGlobals.sectorHelper.getHazardDisabledReason(featuresComponent, statusComponent, itemsComponent) };
				}

				if (requirements) {
					if (requirements.vision) {
						let result = this.checkRequirementsRange(requirements.vision, playerVision, "{min} vision needed", "{max} vision max");
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
							if (currentValue) reason = "Already fully rested.";
							else reason = "Must be fully rested.";
							return {value: 0, reason: reason};
						}
					}

					if (requirements.health) {
						var playerHealth = this.playerStatsNodes.head.stamina.health;
						if (playerHealth < requirements.health) {
							reason = requirements.health + " health required.";
							lowestFraction = Math.min(lowestFraction, playerHealth / requirements.health);
						}
					}

					if (typeof requirements.sunlit !== "undefined") {
						var currentValue = featuresComponent.sunlit;
						var requiredValue = requirements.sunlit;
						if (currentValue !== requiredValue) {
							if (currentValue) reason = "Sunlight not allowed.";
							else reason = "Sunlight required.";
							return { value: 0, reason: reason };
						}
					}

					if (requirements.deity) {
						if (!deityComponent) {
							return { value: 0, reason: "Deity required." };
						}
					}

					if (requirements.population && !shouldSkipCheck(PlayerActionConstants.UNAVAILABLE_REASON_POPULATION)) {
						var currentPopulation = campComponent ? Math.floor(campComponent.population) : 0;
						let result = this.checkRequirementsRange(requirements.population, currentPopulation, "{min} population required", "Maximum {max} population", "workers required", "no workers allowed");
						if (result) {
							return result;
						}
					}

					if (typeof requirements.rumourpoolchecked != "undefined") {
						if (campComponent) {
							var campValue = campComponent.rumourpoolchecked;
							if (requirements.rumourpoolchecked != campValue) {
								if (!requirements.rumourpoolchecked) reason = "No new rumours at the moment.";
								if (requirements.rumourpoolchecked) reason = "There are new rumours.";
								return { value: 0, reason: reason };
							}
						}
					}

					if (requirements.numCamps) {
						var currentCamps = GameGlobals.gameState.numCamps;
						if (requirements.numCamps > currentCamps) {
							reason = requirements.numCamps + " camps required.";
							return { value: currentCamps / requirements.numCamps, reason: reason };
						}
					}

					if (typeof requirements.inCamp !== "undefined") {
						var required = requirements.inCamp;
						var current = inCamp;
						if (required !== current) {
							if (required) {
								return { value: 0, reason: PlayerActionConstants.UNAVAILABLE_REASON_NOT_IN_CAMP };
							} else {
								return { value: 0, reason: "Must be outside to do this." };
							}
						}
					}

					if (requirements.improvements) {
						var improvementRequirements = requirements.improvements;
						for (var improvementID in improvementRequirements) {
							var amount = this.getCurrentImprovementCount(improvementComponent, campComponent, improvementID);
							var requiredImprovementDisplayName = this.getImprovementDisplayName(improvementID);
							
							var range = improvementRequirements[improvementID];
							var actionImprovementName = this.getImprovementNameForAction(action, true);
							if (!actionImprovementName) actionImprovementName = "Improvement";
							var displayName = actionImprovementName === requiredImprovementDisplayName ? "" : requiredImprovementDisplayName;
							
							let result = this.checkRequirementsRange(range, amount,
								"{min}x " + displayName + " required",
								"max " + displayName + " built",
								displayName + " required",
								displayName + " already built"
							);
							if (result) {
								result.reason.trim();
								return result;
							}
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
							if (result) {
								result.reason.trim();
								return result;
							}
						}
					}
					
					if (requirements.improvementsOnLevel) {
						var improvementRequirements = requirements.improvementsOnLevel;
						for (var improvementID in improvementRequirements) {
							var amount = this.getCurrentImprovementCountOnLevel(positionComponent.level, improvementID);
							var requiredImprovementDisplayName = this.getImprovementDisplayName(improvementID);
							var displayName = actionImprovementName === requiredImprovementDisplayName ? "" : requiredImprovementDisplayName;
							var range = improvementRequirements[improvementID];
							let result = this.checkRequirementsRange(range, amount,
								"{min}x " + displayName + " on level required",
								"max {max} " + displayName + " on level",
								displayName + " required on level",
								displayName + " already built on level"
							);
							if (result) {
								return result;
							}
						}
					}
					
					if (requirements.workers) {
						var workerRequirements = requirements.workers;
						
						for (let workerType in workerRequirements) {
							var range = workerRequirements[workerType];
							var amount = campComponent.assignedWorkers[workerType] || 0;
							let result = this.checkRequirementsRange(range, amount, workerType + " required", "no " + workerType + " required");
							if (result) {
								return result;
							}
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
								if (min > totalEffect) reason = "Can't do this while: " + perkType;
								if (max <= totalEffect) reason = "Status required: " + perkType;
								return { value: 0, reason: reason };
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
									return { value: 0, reason: "Status required: " + perk.name };
								} else {
									return { value: 0, reason: "Blocked by status: " + perk.name };
								}
							}
						}
					}

					if (requirements.upgrades) {
						var upgradeRequirements = requirements.upgrades;
						for (var upgradeID in upgradeRequirements) {
							var requirementBoolean = upgradeRequirements[upgradeID];
							var hasBoolean = this.tribeUpgradesNodes.head.upgrades.hasUpgrade(upgradeID);
							if (requirementBoolean != hasBoolean) {
								var def = UpgradeConstants.upgradeDefinitions[upgradeID];
								var name = def ? def.name : upgradeID;
								if (requirementBoolean) reason = "Upgrade required: " + name;
								else reason = "Upgrade already researched (" + name + ")";
								return { value: 0, reason: reason };
							}
						}
					}
					
					if (requirements.unlockedWorkers) {
						for (let workerID in requirements.unlockedWorkers) {
							let requiredValue = requirements.unlockedWorkers[workerID];
							let actualValue = GameGlobals.campHelper.hasUnlockedWorker(workerID);
							if (requiredValue != actualValue) {
								if (requiredValue) {
									return { value: 0, reason: "Worker required: " + workerID };
								} else {
									return { value: 0, reason: "Worker already unlocked: " + workerID };
								}
							}
						}
					}

					if (requirements.blueprint) {
						var blueprintName = action;
						var hasBlueprint = this.tribeUpgradesNodes.head.upgrades.hasAvailableBlueprint(blueprintName);
						if (!hasBlueprint) {
							reason = "Blueprint required.";
							return { value: 0, reason: reason };
						}
					}

					if (typeof requirements.blueprintpieces !== "undefined") {
						var upgradeID = requirements.blueprintpieces;
						var blueprintVO = this.tribeUpgradesNodes.head.upgrades.getBlueprint(upgradeID);
						if (!blueprintVO || blueprintVO.completed) {
							reason = "No such blueprint in progress.";
							return { value: 0, reason: reason };
						}
						if (blueprintVO.maxPieces - blueprintVO.currentPieces > 0) {
							reason = "Missing pieces.";
							return { value: 0, reason: reason };
						}
					}

					if (typeof requirements.busy !== "undefined") {
						var currentValue = playerActionComponent.isBusy();
						var requiredValue = requirements.busy;
						if (currentValue !== requiredValue) {
							var timeLeft = Math.ceil(playerActionComponent.getBusyTimeLeft());
							if (currentValue) reason = PlayerActionConstants.UNAVAILABLE_REASON_BUSY + " " + playerActionComponent.getBusyDescription() + " (" + timeLeft + "s)";
							else reason = "Need to be busy to do this.";
							return { value: 0, reason: reason };
						}
					}
					
					if (typeof requirements.path_to_camp !== "undefined") {
						var path = this.getPathToNearestCamp(sector);
						var currentValue = path !== null;
						var requiredValue = requirements.path_to_camp;
						if (currentValue !== requiredValue) {
							if (currentValue) reason = "Path to camp exists";
							else reason = "No path to camp.";
							return { value: 0, reason: reason };
						}
					}
					
					if (requirements.followers) {
						if (typeof requirements.followers.maxRecruited !== "undefined") {
							var followersComponent = this.playerStatsNodes.head.followers;
							var numCurrentFollowers = followersComponent.getAll().length;
							var numMaxFollowers = GameGlobals.campHelper.getCurrentMaxFollowersRecruited();
							var currentValue = numCurrentFollowers >= numMaxFollowers;
							var requiredValue = requirements.followers.maxRecruited;
							let result = this.checkRequirementsBoolean(requiredValue, currentValue, "Maximum followers recruited", "Maximum followers not recruited");
							if (result) return result;
						}
					}

					if (typeof requirements.bag !== "undefined") {
						if (requirements.bag.validSelection) {
							let validStart = bagComponent.selectionStartCapacity === undefined || bagComponent.selectionStartCapacity <= bagComponent.totalCapacity;
							let validNow = bagComponent.selectedCapacity <= bagComponent.totalCapacity;
							if (validStart && !validNow) {
								return { value: 0, reason: "Can't carry that much stuff." };
							}
						}
						if (requirements.bag.validSelectionAll) {
							if (bagComponent.selectableCapacity > bagComponent.totalCapacity) {
								return {value: 0, reason: "Can't carry that much stuff."};
							}
						}
						if (typeof requirements.bag.full !== "undefined") {
							var requiredValue = requirements.bag.full;
							var currentValue = bagComponent.usedCapacity >= bagComponent.totalCapacity;
							if (requiredValue !== currentValue) {
								if (requiredValue)
									return {value: 0, reason: "Bag must be full."};
								else
									return {value: 0, reason: "Bag is full."};
							}
						}
					}

					if (requirements.outgoingcaravan) {
						if (typeof requirements.outgoingcaravan.available !== "undefined") {
							var caravansComponent = sector.get(OutgoingCaravansComponent);
							var requiredValue = requirements.outgoingcaravan.available ? 1 : 0;
							var totalCaravans = improvementComponent.getCount(improvementNames.stable);
							var busyCaravans = caravansComponent.outgoingCaravans.length;
							var currentValue = totalCaravans - busyCaravans;
							if (requiredValue > currentValue) {
								return {value: 0, reason: "No available caravans."};
							}
						}
						if (typeof requirements.outgoingcaravan.validSelection !== "undefined") {
							var requiredValue = requirements.outgoingcaravan.validSelection;
							var currentValue = $("button[action='" + action + "']").attr("data-isselectionvalid") == "true";
							if (requiredValue != currentValue) {
								if (requiredValue)
									return {value: 0, reason: "Invalid selection."};
								else
									return {value: 0, reason: "Valid selection."};
							}
						}
					}

					if (requirements.incomingcaravan) {
						if (typeof requirements.incomingcaravan.validSelection !== "undefined") {
							var requiredValue = requirements.incomingcaravan.validSelection;
							var traderComponent = sector.get(TraderComponent);
							if (traderComponent) {
								var caravan = traderComponent.caravan;
								var currentValue = caravan.traderOfferValue > 0 && caravan.traderOfferValue <= caravan.campOfferValue;
								if (requiredValue != currentValue) {
									if (requiredValue)
										return {value: 0, reason: "Invalid selection."};
									else
										return {value: 0, reason: "Valid selection."};
								}
							} else {
								return {value: 0, reason: "No caravan."};
							}
						}
					}

					if (requirements.camp) {
						if (requirements.camp.isReachableByTribeTraders) {
							let isCampReachableByTribeTraders = GameGlobals.levelHelper.isCampReachableByTribeTraders(sector);
							if (!isCampReachableByTribeTraders) {
								return { value: 0, reason: PlayerActionConstants.DISABLED_REASON_NOT_REACHABLE_BY_TRADERS };
							}
						}
						if (typeof requirements.camp.raid !== "undefined") {
							let currentValue = this.playerLocationNodes.head.entity.has(RaidComponent);
							let requiredValue = requirements.camp.raid;
							if (requiredValue != currentValue) {
								return { value: 0, reason: (requiredValue ? "No raid currently" : "There is a raid" ) };
							}
						}
					}

					if (requirements.sector) {
						if (requirements.sector.collectable_water) {
							var hasWater = featuresComponent.resourcesCollectable.water > 0;
							if (!hasWater) {
								return { value: 0, reason: "No collectable water." };
							}
						}
						if (requirements.sector.collectable_food) {
							var hasFood = featuresComponent.resourcesCollectable.food > 0;
							if (!hasFood) {
								return { value: 0, reason: "No collectable food." };
							}
						}
						
						if (typeof requirements.sector.hasCamp !== "undefined") {
							var value = sector.has(CampComponent);
							var requiredValue = requirements.sector.hasCamp;
							if (value !== requiredValue) {
								var reason = requiredValue ? "No camp here." : "There is a camp here";
								return { value: 0, reason: reason };
							}
						}

						if (requirements.sector.canHaveCamp) {
							if (!featuresComponent.canHaveCamp()) {
								return { value: 0, reason: "Location not suitable for camp" };
							}
						}
						if (typeof requirements.sector.enemies != "undefined") {
							var enemiesComponent = sector.get(EnemiesComponent);
							if (enemiesComponent.hasEnemies != requirements.sector.enemies) {
								if (requirements.sector.enemies)
									return { value: 0, reason: "Sector enemies required" };
								else
									return { value: 0, reason: "Too dangerous here" };
							}
						}
						if (typeof requirements.sector.scouted != "undefined") {
							if (statusComponent.scouted != requirements.sector.scouted) {
								if (statusComponent.scouted)    reason = "Area already scouted.";
								else                            reason = "Area not scouted yet.";
								return { value: 0, reason: reason };
							}
						}
						if (typeof requirements.sector.scavengedPercent != "undefined") {
							var range = requirements.sector.scavengedPercent;
							var currentVal = statusComponent.getScavengedPercent() / 100;
							let result = this.checkRequirementsRange(range, currentVal, "", "This area has beens scavenged clean.");
							if (result) {
								return result;
							}
						}
						if (typeof requirements.sector.spring != "undefined") {
							if (featuresComponent.hasSpring != requirements.sector.spring) {
								if (featuresComponent.hasSpring)    reason = "There is a spring.";
								else                                reason = "There is no spring.";
								return { value: 0, reason: reason };
							}
						}
						if (typeof requirements.sector.scoutedLocales !== "undefined") {
							for(var localei in requirements.sector.scoutedLocales) {
								var requiredStatus = requirements.sector.scoutedLocales[localei];
								var currentStatus = statusComponent.isLocaleScouted(localei);
								if (requiredStatus !== currentStatus) {
									if (requiredStatus) reason = "Locale must be scouted.";
									if (!requiredStatus) reason = "Locale already scouted.";
									return { value: 0, reason: reason };
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
										return { value: 0, reason: "Blocked. " + movementOptionsComponent.cantMoveToReason[direction] };
									} else {
										return { value: 0, reason: "Nothing blocking movement to " + directionName + "." };
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
										return { value: 0, reason: "Waste cleared. " };
									} else {
										return { value: 0, reason: "Waste not cleared " + directionName + "." };
									}
								}
							}
						}

						if (typeof requirements.sector.passageUp != 'undefined') {
							if (!passagesComponent.passageUp) {
								reason = "No passage up.";
								return { value: 0, reason: "Blocked. " + reason };
							} else {
								var requiredType = parseInt(requirements.sector.passageUp);
								if (requiredType > 0) {
									var existingType = passagesComponent.passageUp.type;
									if (existingType !== requiredType) {
										reason = "Wrong passage type.";
										return { value: 0, reason: "Blocked. " + reason };
									}
								}
							}
						}
						if (typeof requirements.sector.passageDown != 'undefined') {
							if (!passagesComponent.passageDown) {
								reason = "No passage down.";
								return { value: 0, reason: "Blocked. " + reason };
							} else {
								var requiredType = parseInt(requirements.sector.passageDown);
								if (requiredType > 0) {
									var existingType = passagesComponent.passageDown.type;
									if (existingType != requiredType) {
										reason = "Wrong passage type.";
										return { value: 0, reason: "Blocked. " + reason };
									}
								}
							}
						}

						if (typeof requirements.sector.collected_food != "undefined") {
							var collector = improvementComponent.getVO(improvementNames.collector_food);
							var requiredStorage = requirements.sector.collected_food;
							var currentStorage = collector.storedResources.getResource(resourceNames.food);
							if (currentStorage < requiredStorage) {
								if (lowestFraction > currentStorage / requiredStorage) {
									lowestFraction = currentStorage / requiredStorage;
									reason = "Nothing to collect";
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
									reason = "Nothing to collect";
								}
							}
						}
						
						if (typeof requirements.sector.acessible_to_workers != "undefined") {
							var campOrdinal = GameGlobals.gameState.getCampOrdinal(positionComponent.level);
							var campCount = GameGlobals.gameState.numCamps;
							var requiredValue = requirements.sector.acessible_to_workers;
							var currentValue = campCount >= campOrdinal;
							if (currentValue != requiredValue) {
								var reason = requiredValue ? "Not accessible to workers" : "Accessible to workers";
								return { value: 0, reason: reason };
							}
						}
						
						if (requirements.sector.hazards) {
							for (var hazard in requirements.sector.hazards) {
								var range = requirements.sector.hazards[hazard];
								var currentVal = featuresComponent.hazards[hazard] || 0;
								let result = this.checkRequirementsRange(range, currentVal, "Min {min} " + hazard, "Max {max} " + hazard);
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
					}

					if (requirements.level) {
						var level = sector.get(PositionComponent).level;
						var levelComponent = GameGlobals.levelHelper.getLevelEntityForPosition(level).get(LevelComponent);

						if (requirements.level.population) {
							var range = requirements.level.population;
							var value = levelComponent.populationFactor;
							let result = this.checkRequirementsRange(range, value,
								PlayerActionConstants.DISABLED_REASON_NOT_ENOUGH_LEVEL_POP,
								"Too many people on this level",
							);
							if (result) {
								return result;
							}
						}
					}
					
					if (requirements.excursion) {
						if (requirements.excursion.numNaps) {
							var excursionComponent = this.playerStatsNodes.head.entity.get(ExcursionComponent);
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
							var itemName = ItemConstants.getItemByID(itemID).name;
							if (min > current) {
								return { value: 0, reason: "Must use " + itemName + " first" };
							} else if (max <= current) {
								if (itemID == actionItemID && max == 1) {
									return { value: 0, reason: "Already used" };
								} else {
									return { value: 0, reason: "Already used " + itemName };
								}
							}
						}
					}
				}

				var item = this.getItemForCraftAction(action);
				if (item && baseActionID == "craft") {
					if (!inCamp) {
						var spaceNow = bagComponent.totalCapacity - bagComponent.usedCapacity;
						var spaceRequired = BagConstants.getItemCapacity(item);
						var spaceFreed = BagConstants.getResourcesCapacity(this.getCostResourcesVO(action));
						if (spaceNow - spaceRequired + spaceFreed < 0) {
							return { value: 0, reason: PlayerActionConstants.UNAVAILABLE_REASON_BAG_FULL };
						}
					}
				}
				
				return { value: lowestFraction, reason: reason };
			};

			if (!this.cache.reqs[reqsID]) {
				let result = checkRequirementsInternal.apply(this, [action, sector]);
				if (result.reason && doLog) log.w("" + result.reason);
				this.cache.reqs[reqsID] = result;
			}

			return this.cache.reqs[reqsID];
		},
		
		checkRequirementsRange: function (range, value, minreason, maxreason, minreason1, maxreason1) {
			minreason = minreason || "";
			maxreason = maxreason || "";
			var min = range[0];
			var max = range[1];
			if (max < 0) max = 9999999;
			if (value < min) {
				if (min == 1 && minreason1) {
					return { value: 0, reason: minreason1 };
				} else {
					return { value: value / min, reason: minreason.replace("{min}", min) };
				}
			}
			if (value >= max) {
				if (max == 1 && maxreason1) {
					return { value: 0, reason: maxreason1 };
				} else {
					return { value: 0, reason: maxreason.replace("{max}", max) };
				}
			}
			return null;
		},
		
		checkRequirementsBoolean: function (requiredValue, currentValue, rejectTrueReason, rejectFalseReason) {
			if (requiredValue != currentValue) {
				var reason = requiredValue ? rejectFalseReason : rejectTrueReason;
				return { value: 0, reason: reason };
			}
			return null;
		},

		// Check the costs of an action; returns lowest fraction of the cost player can cover; >1 means the action is available
		checkCosts: function(action, doLog, otherSector) {
			var costs = this.getCosts(action);

			if (costs) {
				var currentFraction = 1;
				var lowestFraction = currentFraction;
				for (var key in costs) {
					currentFraction = this.checkCost(action, key, otherSector);
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
			var playerStamina = this.playerStatsNodes.head.stamina.stamina;
			var playerResources = GameGlobals.resourcesHelper.getCurrentStorage();
			var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			var inCamp = this.playerStatsNodes.head.entity.get(PositionComponent).inCamp;

			var sector = otherSector || (this.playerLocationNodes.head && this.playerLocationNodes.head.entity);
			if (!sector) return false;

			var costs = this.getCosts(action);

			var costNameParts = name.split("_");
			var costAmount = costs[name];

			if (costNameParts[0] === "resource") {
				return (playerResources.resources.getResource(costNameParts[1]) / costAmount);
			} else if (costNameParts[0] === "item") {
				var itemId = name.replace(costNameParts[0] + "_", "");
				return itemsComponent.getCountById(itemId, inCamp) / costAmount;
			} else {
				switch (name) {
					case "stamina":
						return (playerStamina / costs.stamina);

					case "rumours":
						return (this.playerStatsNodes.head.rumours.value / costs.rumours);

					case "favour":
						var favour = this.playerStatsNodes.head.entity.has(DeityComponent) ? this.playerStatsNodes.head.entity.get(DeityComponent).favour : 0;
						return (favour / costs.favour);

					case "evidence":
						return (this.playerStatsNodes.head.evidence.value / costs.evidence);

					case "blueprint":
						return 1;
					
					case "silver":
						var currencyComponent = GameGlobals.resourcesHelper.getCurrentCurrency();
						return currencyComponent.currency / costs.silver;

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
						resourcesVO.addResource(costNameParts[1], costAmount);
					}
				}
			}
			return resourcesVO;
		},

		// Return the current ordinal of an action (depending on action, level ordinal / camp ordinal / num of existing buildings)
		getActionOrdinal: function (action, otherSector) {
			if (!action) return 1;
			if (!otherSector && (!this.playerLocationNodes || !this.playerLocationNodes.head)) {
				return 1;
			}

			var sector = otherSector || this.playerLocationNodes.head.entity;
			var baseActionID = this.getBaseActionID(action);

			var levelComponent = sector ? GameGlobals.levelHelper.getLevelEntityForSector(sector).get(LevelComponent) : null;
			var isOutpost = levelComponent ? levelComponent.populationFactor < 1 : false;

			if (action.indexOf("build_in") >= 0) {
				var improvementName = this.getImprovementNameForAction(action);
				var improvementsComponent = sector.get(SectorImprovementsComponent);
				let result = improvementsComponent.getCount(improvementName) + 1;
				if (action === "build_in_house" && result === 1) result = isOutpost ? 0.85 : 0.5;
				return result;
			}
			
			if (action.indexOf("improve_in") >= 0 || action.indexOf("improve_out") >= 0) {
				var improvementName = this.getImprovementNameForAction(action);
				var improvementsComponent = sector.get(SectorImprovementsComponent);
				let result = improvementsComponent.getLevel(improvementName);
				return result;
			}

			switch (baseActionID) {
				case "use_in_hospital_2":
					let perksComponent = this.playerStatsNodes.head.perks;
					let ordinal = 1;
					if (perksComponent.hasPerk(PerkConstants.perkIds.healthBonus2))
						ordinal = 2;
					return ordinal;

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
					return campOrdinal;

				default: return 1;
			}
		},

		// Returns the cost factor of a given action, usually 1, but may depend on the current status (items, followers, perks, improvement level etc) for some actions
		getCostFactor: function (action, cost, otherSector) {
			if (!this.playerLocationNodes || !this.playerLocationNodes.head) return 1;

			var sector = otherSector || this.playerLocationNodes.head.entity;
			var passageComponent = sector.get(PassagesComponent);
			let improvements = sector.get(SectorImprovementsComponent);
			var playerStatsNode = this.playerStatsNodes.head;
			var playerEntity = this.playerStatsNodes.head.entity;

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
				return GameGlobals.sectorHelper.getDebrisMovementMalus(sector);
			};
			
			var getFollowerBonus = function (itemBonusType) {
				let followersComponent = playerStatsNode.followers;
				return followersComponent.getCurrentBonus(itemBonusType);
			}
			
			var getImprovementLevelBonus = function (improvementName) {
				let level = improvements.getMajorLevel(improvementName);
				return 1 - (level - 1) * 0.1;
			};

			var factor = 1;
			switch (action) {
				case "move_sector_north":
				case "move_sector_east":
				case "move_sector_west":
				case "move_sector_south":
				case "move_sector_ne":
				case "move_sector_se":
				case "move_sector_sw":
				case "move_sector_nw":
					if (cost == "stamina") {
						factor *= getShoeBonus();
						factor *= getFollowerBonus(ItemConstants.itemBonusTypes.movement);
						factor *= getPerkBonus();
						factor *= getBeaconBonus();
						factor *= getHazardMalus();
					}
					break;
				case "move_level_down":
				case "move_level_up":
				case "move_camp_global":
					if (cost == "stamina") {
						factor *= getShoeBonus();
						factor *= getFollowerBonus(ItemConstants.itemBonusTypes.movement);
						factor *= getPerkBonus();
					}
					break;
				
				case "scavenge":
					if (cost == "stamina") {
						factor *= getFollowerBonus(ItemConstants.itemBonusTypes.scavenge_cost);
					}
					break;
				
				case "scout":
					if (cost == "stamina") {
						factor *= getFollowerBonus(ItemConstants.itemBonusTypes.scout_cost);
					}
					break;
				
				case "use_in_hospital":
					factor *= getImprovementLevelBonus(improvementNames.hospital);
					break;
			}

			return factor;
		},
		
		getImproveBuildingActionReqs: function (improvementID) {
			let result = {};
			let improvementName = improvementNames[improvementID];
			result.improvements = {};
			result.improvements.camp = [ 1, -1 ];
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

		getReqs: function (action, sector) {
			var sector = sector || (this.playerLocationNodes && this.playerLocationNodes.head ? this.playerLocationNodes.head.entity : null);
			var baseActionID = this.getBaseActionID(action);
			var requirements = {};
			
			if (this.isImproveBuildingAction(baseActionID)) {
				requirements = PlayerActionConstants.requirements[baseActionID] || {};
				let improvementID = this.getImprovementIDForAction(action);
				let dynamicReqs = this.getImproveBuildingActionReqs(improvementID);
				Object.assign(requirements, dynamicReqs);
			}
			
			switch (baseActionID) {
				case "scout_locale_i":
				case "scout_locale_u":
					var localeVO;
					if (sector) {
						var localei = parseInt(action.split("_")[3]);
						var sectorLocalesComponent = sector.get(SectorLocalesComponent);
						localeVO = sectorLocalesComponent.locales[localei];
					}
					requirements = localeVO == null ? {} : localeVO.requirements;
					requirements.sector = {};
					requirements.sector.scouted = true;
					requirements.sector.scoutedLocales = {};
					requirements.sector.scoutedLocales[localei] = false;
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
					if (type == UpgradeConstants.UPGRADE_TYPE_FAVOUR) {
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
					
				case "build_out_passage_up_stairs":
				case "build_out_passage_up_elevator":
				case "build_out_passage_up_hole":
				case "build_out_passage_down_stairs":
				case "build_out_passage_down_elevator":
				case "build_out_passage_down_hole":
				case "move_camp_global":
				case "send_caravan":
				case "clear_debris_e":
				case "clear_debris_l":
				case "bridge_gap":
				case "recruit_follower":
				case "dismiss_follower":
				case "select_follower":
				case "deselect_follower":
					return PlayerActionConstants.requirements[baseActionID];
				default:
					return PlayerActionConstants.requirements[action];
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
			var constantPart = constantCost;
			var linearPart = linearCost * ordinal;
			var expPart = expCost * Math.pow(expBase, ordinal-1);
			return (constantPart + linearPart + expPart) * statusFactor;
		},

		// NOTE: this should always return all possible costs as keys (even if value currently is 0)
		// NOTE: if you change this mess, keep GDD up to date
		// multiplier: simple multiplier applied to ALL of the costs
		getCosts: function (action, multiplier, otherSector) {
			if (!action) return null;
			if (!multiplier) multiplier = 1;

			var sector = otherSector ? otherSector : (this.playerLocationNodes.head ? this.playerLocationNodes.head.entity : null);
			var levelComponent = sector ? GameGlobals.levelHelper.getLevelEntityForSector(sector).get(LevelComponent) : null;

			var ordinal = this.getActionOrdinal(action, sector);
			var isOutpost = levelComponent ? levelComponent.populationFactor < 1 : false;
			
			return this.getCostsByOrdinal(action, multiplier, ordinal, isOutpost, sector);
		},
		
		getCostsByOrdinal: function (action, multiplier, ordinal, isOutpost, sector) {
			let result = {};

			var baseActionID = this.getBaseActionID(action);
			var costs = PlayerActionConstants.costs[action];
			if (!costs) {
				costs = PlayerActionConstants.costs[baseActionID];
			}

			if (costs) {
				result = this.getCostsFromData(action, multiplier, ordinal, isOutpost, sector, costs);
			}
			
			this.addDynamicCosts(action, multiplier, ordinal, isOutpost, sector, result);

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
			var baseActionID = this.getBaseActionID(action);
			switch (baseActionID) {
				case "move_camp_level":
					var path = this.getPathToNearestCamp(sector);
					if (path && path.length > 0) {
						for (let i = 0; i < path.length; i++) {
							let costs = this.getCosts("move_sector_west", 1, path[i]);
							this.addCosts(result, costs);
						}
					} else {
						let costs = this.getCosts("move_sector_west");
						this.addCosts(result, costs);
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
				
				case "recruit_follower":
					let followerID = parseInt(action.replace(baseActionID + "_", ""));
					let recruitComponent = GameGlobals.campHelper.findRecruitComponentWithFollowerId(followerID);
					if (recruitComponent != null) {
						this.addCosts(result, FollowerConstants.getRecruitCost(recruitComponent.follower, recruitComponent.isFoundAsReward));
					}
					break;

				case "use_item":
				case "use_item_fight":
					var itemName = action.replace(baseActionID + "_", "item_");
					result[itemName] = 1;
					break;

				case "unlock_upgrade":
					result.blueprint = 1;
					break;

				case "send_caravan":
					var caravansComponent = sector.get(OutgoingCaravansComponent);
					result["resource_food"] = 50;
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
			}
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

		getDescription: function (action) {
			if (!action) return "";
			
			let baseAction = this.getBaseActionID(action);
			let improvementName = this.getImprovementNameForAction(action, true);
			
			if (baseAction.indexOf("build_in_") == 0) {
				var buildingKey = baseAction.replace("build_in_", "");
				var baseDesc = "";
				if (ImprovementConstants.improvements[buildingKey]) {
					baseDesc = ImprovementConstants.improvements[buildingKey].description || "";
				}
				var reputationDesc = "";
				var reputation = getImprovementReputationBonus(improvementName);
				if (reputation > 0) reputationDesc = "Reputation: " + reputation;
				return baseDesc + (baseDesc && reputationDesc ? "<hr>" : "") + reputationDesc;
			} else if (PlayerActionConstants.descriptions[action]) {
				return PlayerActionConstants.descriptions[action];
			} else if (PlayerActionConstants.descriptions[baseAction]) {
				return PlayerActionConstants.descriptions[baseAction];
			} else if (UpgradeConstants.upgradeDescriptions[action]) {
				// upgrade action descriptions are in the list outside of the button
				return "";
			} else if (action.indexOf("move_sector_") >= 0) {
				// no need for description
				return "";
			} else {
				switch(baseAction) {
					case "craft":
						var item = this.getItemForCraftAction(action);
						return item.description + (item.getTotalBonus() === 0 ? "" : "<hr/>" + UIConstants.getItemBonusDescription(item, true, true));
					case "use_item":
					case "use_item_fight":
						var item = this.getItemForCraftAction(action);
						return item.description;
					case "improve_in":
						return this.getImproveActionDescription(action);
				}
			}
			
			log.w("no description defined for action: " + action)
			return "";
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
					return isNextLevelMajor ? "Increase rumour generation and maximum followers" : "Increase rumour generation";
			}
			
			return "Improve " + improvementName;
		},

		getBaseActionID: function (action) {
			if (!action) return action;
			var getBaseActionIdInternal = function (a) {
				if (a.indexOf("build_in_") >= 0) return a;
				if (a.indexOf("improve_in_") >= 0) return "improve_in";
				if (a.indexOf("improve_out") >= 0) return "improve_out";
				if (a.indexOf("scout_locale_i") >= 0) return "scout_locale_i";
				if (a.indexOf("scout_locale_u") >= 0) return "scout_locale_u";
				if (a.indexOf("craft_") >= 0) return "craft";
				if (a.indexOf("discard_") >= 0) return "discard";
				if (a.indexOf("unequip_") >= 0) return "unequip";
				if (a.indexOf("equip_") >= 0) return "equip";
				if (a.indexOf("use_item_fight") >= 0) return "use_item_fight";
				if (a.indexOf("use_item") >= 0) return "use_item";
				if (a.indexOf("unlock_upgrade_") >= 0) return "unlock_upgrade";
				if (a.indexOf("create_blueprint_") >= 0) return "create_blueprint";
				if (a.indexOf("clear_waste_t") == 0) return "clear_waste_t";
				if (a.indexOf("clear_waste_r") == 0) return "clear_waste_r";
				if (a.indexOf("clear_debris_") == 0) return "clear_debris";
				if (a.indexOf("fight_gang_") >= 0) return "fight_gang";
				if (a.indexOf("send_caravan_") >= 0) return "send_caravan";
				if (a.indexOf("recruit_follower_") >= 0) return "recruit_follower";
				if (a.indexOf("dismiss_follower") >= 0) return "dismiss_follower";
				if (a.indexOf("deselect_follower") >= 0) return "deselect_follower";
				if (a.indexOf("select_follower") >= 0) return "select_follower";
				if (a.indexOf("dismiss_recruit_") >= 0) return "dismiss_recruit";
				if (a.indexOf("move_camp_global_") >= 0) return "move_camp_global";
				if (a.indexOf("build_out_passage") >= 0) {
					var parts = a.split("_");
					if (isNaN(parts[parts.length-1]))
						return a;
					return a.substring(0, a.lastIndexOf("_"));
				}
				return a;
			};
			if (this.cache.baseActionID[action])
				return this.cache.baseActionID[action];
			let result = getBaseActionIdInternal(action);
			this.cache.baseActionID[action] = result;
			return result;
		},

		getActionIDParam: function (action) {
			var remainder = action.replace(this.getBaseActionID(action) + "_", "");
			if (remainder && remainder !== action) return remainder;
			return "";
		},

		getActionNameForImprovement: function (improvementName, disableWarnings) {
			switch (improvementName) {
				case improvementNames.collector_food: return "build_out_collector_food";
				case improvementNames.collector_water: return "build_out_collector_water";
				case improvementNames.beacon: return "build_out_beacon";
				case improvementNames.home: return "build_in_home";
				case improvementNames.house: return "build_in_house";
				case improvementNames.storage: return "build_in_storage";
				case improvementNames.hospital: return "build_in_hospital";
				case improvementNames.tradepost: return "build_in_tradepost";
				case improvementNames.inn: return "build_in_inn";
				case improvementNames.spaceship1: return "build_out_spaceship1";
				case improvementNames.spaceship2: return "build_out_spaceship2";
				case improvementNames.spaceship3: return "build_out_spaceship3";
				case improvementNames.campfire: return "build_in_campfire";
				case improvementNames.darkfarm: return "build_in_darkfarm";
				case improvementNames.garden: return "build_in_garden";
				case improvementNames.square: return "build_in_square";
				case improvementNames.house2: return "build_in_house2";
				case improvementNames.generator: return "build_in_generator";
				case improvementNames.lights: return "build_in_lights";
				case improvementNames.ceiling: return "build_in_ceiling";
				case improvementNames.apothecary: return "build_in_apothecary";
				case improvementNames.smithy: return "build_in_smithy";
				case improvementNames.cementmill: return "build_in_cementmill";
				case improvementNames.library: return "build_in_library";
				case improvementNames.shrine: return "build_in_shrine";
				case improvementNames.temple: return "build_in_temple";
				case improvementNames.barracks: return "build_in_barracks";
				case improvementNames.fortification: return "build_in_fortification";
				case improvementNames.aqueduct: return "build_in_aqueduct";
				case improvementNames.stable: return "build_in_stable";
				case improvementNames.market: return "build_in_market";
				case improvementNames.radiotower: return "build_in_radiotower";
				case improvementNames.researchcenter: return "build_in_researchcenter";
				case improvementNames.passageUpStairs: return "build_out_passage_up_stairs";
				case improvementNames.passageUpElevator: return "build_out_passage_up_elevator";
				case improvementNames.passageUpHole: return "build_out_passage_up_hole";
				case improvementNames.passageDownStairs: return "build_out_passage_down_stairs";
				case improvementNames.passageDownElevator: return "build_out_passage_down_elevator";
				case improvementNames.passageDownHole: return "build_out_passage_down_hole";
				case improvementNames.greenhouse: return "build_out_greenhouse";
				case improvementNames.tradepost_connector: return "build_out_tradepost_connector";
				case improvementNames.camp: return "";
				default:
					if (!disableWarnings) {
						log.w("No improvement action name found for improvement " + improvementName);
					}
					return "";
			}
		},

		getImprovementNameForAction: function (action, disableWarnings) {
			var baseId = this.getBaseActionID(action);
			
			if (this.isImproveBuildingAction(baseId)) {
				let improvementID = this.getImprovementIDForAction(action);
				return improvementNames[improvementID];
			}
			
        	switch (baseId) {
				case "build_out_collector_food": return improvementNames.collector_food;
                case "build_out_collector_water": return improvementNames.collector_water;
                case "build_out_beacon": return improvementNames.beacon;
                case "build_in_home": return improvementNames.home;
                case "build_in_house": return improvementNames.house;
                case "build_in_storage": return improvementNames.storage;
                case "build_in_hospital": return improvementNames.hospital;
                case "build_in_tradepost": return improvementNames.tradepost;
                case "build_in_inn": return improvementNames.inn;
                case "build_out_spaceship1": return improvementNames.spaceship1;
                case "build_out_spaceship2": return improvementNames.spaceship2;
                case "build_out_spaceship3": return improvementNames.spaceship3;
                case "build_in_campfire": return improvementNames.campfire;
                case "build_in_darkfarm": return improvementNames.darkfarm;
                case "build_in_garden": return improvementNames.garden;
                case "build_in_square": return improvementNames.square;
                case "build_in_house2": return improvementNames.house2;
                case "build_in_generator": return improvementNames.generator;
                case "build_in_lights": return improvementNames.lights;
                case "build_in_ceiling": return improvementNames.ceiling;
                case "build_in_apothecary": return improvementNames.apothecary;
                case "build_in_smithy": return improvementNames.smithy;
                case "build_in_cementmill": return improvementNames.cementmill;
                case "build_in_library": return improvementNames.library;
                case "build_in_shrine": return improvementNames.shrine;
                case "build_in_temple": return improvementNames.temple;
                case "build_in_barracks": return improvementNames.barracks;
                case "build_in_fortification": return improvementNames.fortification;
                case "build_in_aqueduct": return improvementNames.aqueduct;
                case "build_in_stable": return improvementNames.stable;
                case "build_in_market": return improvementNames.market;
                case "improve_in_market": return improvementNames.market;
                case "build_in_radiotower": return improvementNames.radiotower;
                case "build_in_researchcenter": return improvementNames.researchcenter;
                case "build_out_passage_up_stairs": return improvementNames.passageUpStairs;
                case "build_out_passage_up_elevator": return improvementNames.passageUpElevator;
                case "build_out_passage_up_hole": return improvementNames.passageUpHole;
                case "build_out_passage_down_stairs": return improvementNames.passageDownStairs;
                case "build_out_passage_down_elevator": return improvementNames.passageDownElevator;
                case "build_out_passage_down_hole": return improvementNames.passageDownHole;
                case "send_caravan": return improvementNames.tradepost;
                case "build_out_camp": return "";
			}
			for (var key in improvementNames) {
				var improvementName = improvementNames[key];
				var improvementActionName = this.getActionNameForImprovement(improvementName, disableWarnings);
				if (improvementActionName == baseId) {
					return improvementName;
				}
			}
			if (!disableWarnings) {
				log.w("No improvement name found for action " + action);
			}
			return "";
		},
		
		getImprovementIDForAction: function (actionName) {
			var baseId = this.getBaseActionID(actionName);
			if (this.isImproveBuildingAction(baseId)) {
				return actionName.replace("improve_in_", "").replace("improve_out_", "");
			}
			let improvementName = this.getImprovementNameForAction(actionName);
			return ImprovementConstants.getImprovementID(improvementName);
		},
		
		getItemForCraftAction: function (actionName) {
			var baseActionName = this.getBaseActionID(actionName);
			switch (baseActionName) {
				case "craft":
					return ItemConstants.getItemByID(this.getActionIDParam(actionName));
				case "use_item":
				case "use_item_fight":
					return ItemConstants.getItemByID(this.getActionIDParam(actionName));

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
					var campOrdinal = UpgradeConstants.getMinimumCampOrdinalForUpgrade(requiredTech[k], true);
					var step = UpgradeConstants.getMinimumCampStepForUpgrade(requiredTech[k]);
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
			
			return result;
		},
		
		isActionIndependentOfHazards: function (action) {
			var improvement = this.getImprovementNameForAction(action, true);
			if (improvement) {
				if (getImprovementType(improvement) == improvementTypes.level) {
					return true;
				}
			}

			var baseActionID = this.getBaseActionID(action);
			switch (baseActionID) {
				case "craft": return true;
				case "equip": return true;
				case "unequip": return true;
				case "move_camp_level": return true;
				case "despair": return true;
				case "accept_inventory": return true;

				case "build_out_greenhouse": return true;
				case "build_out_tradepost_connector": return true;
				case "clear_debris": return true;
				case "bridge_gap": return true;

				case "move_sector_north":
				case "move_sector_south":
				case "move_sector_east":
				case "move_sector_west":
				case "move_sector_ne":
				case "move_sector_se":
				case "move_sector_sw":
				case "move_sector_nw":
				case "move_level_up":
				case "move_level_down":
					// handled by the SectorStatusSystem / MovementOptionsComponent
					return true;

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
			return baseActionID == "improve_in" || baseActionID == "improve_out";
		},
		
		getImprovementDisplayName: function (improvementID) {
			switch (improvementID) {
				case "passageUp":
				case "passageDown":
					return "passage";
				case "camp":
					return "camp";
				default:
					// TODO determine improvement level to use
					return ImprovementConstants.getImprovementDisplayName(improvementID);
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
			// TODO cache result for performance?
			let result = 0;
			let sectors = GameGlobals.levelHelper.getSectorsByLevel(level);
			for (let i = 0; i < sectors.length; i++) {
				let sector = sectors[i];
				let improvements = sector.get(SectorImprovementsComponent);
				let campComponent = sector.get(CampComponent);
				result += this.getCurrentImprovementCount(improvements, campComponent, improvementID);
			}
			return result;
		},
		
		getPathToNearestCamp: function (sector) {
			if (!this.nearestCampNodes.head) return null;
			var campSector = this.nearestCampNodes.head.entity;
			if (!campSector || !sector) return null;
			var sectorLevel = sector.get(PositionComponent).level;
			var campLevel = campSector.get(PositionComponent).level;
			if (Math.abs(campLevel - sectorLevel) > 2) return null;
			return GameGlobals.levelHelper.findPathTo(sector, campSector, { skipBlockers: true, skipUnvisited: true, omitWarnings: true });
		},

		getCooldownForCurrentLocation: function (action) {
			var isLocationAction = PlayerActionConstants.isLocationAction(action);
			var playerPos = this.playerStatsNodes.head.entity.get(PositionComponent);
			var locationKey = GameGlobals.gameState.getActionLocationKey(isLocationAction, playerPos);
			var cooldownTotal = PlayerActionConstants.getCooldown(action);
			return GameGlobals.gameState.getActionCooldown(action, locationKey, cooldownTotal);
		}

	});

	return PlayerActionsHelper;
});
