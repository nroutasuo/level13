// A system to autoplay the game - mostly useful for quickly cheating to a semi-realistic later state of the game
define(['ash',
    'game/GameGlobals',
	'game/constants/AutoPlayConstants',
	'game/constants/ItemConstants',
	'game/constants/PerkConstants',
	'game/constants/PlayerStatConstants',
	'game/constants/BagConstants',
	'game/nodes/player/AutoPlayNode',
	'game/nodes/player/PlayerStatsNode',
    'game/nodes/player/ItemsNode',
    'game/nodes/FightNode',
    'game/nodes/sector/CampNode',
	'game/components/common/PositionComponent',
	'game/components/common/CampComponent',
	'game/components/common/ResourcesComponent',
	'game/components/player/PlayerActionComponent',
	'game/components/player/PlayerActionResultComponent',
	'game/components/player/ItemsComponent',
	'game/components/player/PerksComponent',
	'game/components/player/BagComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/SectorLocalesComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
    'game/systems/CheatSystem',
    'game/constants/CampConstants',
    'game/constants/UpgradeConstants',
    'game/vos/ResourcesVO'
], function (Ash, GameGlobals,
    AutoPlayConstants, ItemConstants, PerkConstants, PlayerStatConstants, BagConstants,
	AutoPlayNode, PlayerStatsNode, ItemsNode, FightNode, CampNode,
    PositionComponent, CampComponent, ResourcesComponent, PlayerActionComponent, PlayerActionResultComponent, ItemsComponent, PerksComponent, BagComponent,
    SectorStatusComponent, SectorFeaturesComponent, SectorLocalesComponent, SectorImprovementsComponent,
    CheatSystem, CampConstants, UpgradeConstants, ResourcesVO) {

	var AutoPlaySystem = Ash.System.extend({

        speed: 5,
        stepInterval: 250,
        isExpress: false,

		autoPlayNodes: null,
		playerStatsNodes: null,
		itemsNodes: null,
        fightNodes: null,
        campNodes: null,

        lastStepTimeStamp: 0,
        idleCounter: 0,
        lastSwitchCounter: 0,

		constructor: function () { },

        addToEngine: function (engine) {
            this.engine = engine;
			this.autoPlayNodes = engine.getNodeList(AutoPlayNode);
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			this.itemsNodes = engine.getNodeList(ItemsNode);
            this.fightNodes = engine.getNodeList(FightNode);
            this.campNodes = engine.getNodeList(CampNode);

            this.autoPlayNodes.nodeAdded.add(this.onAutoPlayNodeAdded, this);
            this.autoPlayNodes.nodeRemoved.add(this.onAutoPlayNodeRemoved, this);

            this.lastStepTimeStamp = new Date().getTime();
        },

        removeFromEngine: function (engine) {
            this.engine = null;
            this.autoPlayNodes.nodeAdded.remove(this.onAutoPlayNodeAdded, this);
            this.autoPlayNodes.nodeRemoved.remove(this.onAutoPlayNodeRemoved, this);

			this.autoPlayNodes = null;
			this.playerStatsNodes = null;
			this.itemsNodes = null;
            this.fightNodes = null;
            this.campNodes = null;
		},

        onAutoPlayNodeAdded: function (node) {
            this.cheatSystem = this.engine.getSystem(CheatSystem);

            this.lastStepTimeStamp = new Date().getTime();
            var inCamp = this.playerStatsNodes.head.entity.get(PositionComponent).inCamp;
            node.autoPlay.isExploring = !inCamp;
            node.autoPlay.isManagingCamps = inCamp;
            this.cheatSystem.applyCheat("speed " + this.speed);
            GameGlobals.gameState.isAutoPlaying = true;
        },

        onAutoPlayNodeRemoved: function (node) {
            GameGlobals.gameState.isAutoPlaying = false;
            this.cheatSystem.applyCheat("speed 1");
        },

        update: function () {
			if (!this.autoPlayNodes.head)
                return;

			var timeStamp = new Date().getTime();
			if (timeStamp - this.lastStepTimeStamp < this.stepInterval) {
                return;
            }

            var autoPlayComponent = this.autoPlayNodes.head.autoPlay;
            var fightNode = this.fightNodes.head;
            var didSomething = false;

            if (autoPlayComponent.isExploring) {
                autoPlayComponent.isPendingExploring = false;
                didSomething = didSomething || this.updateExploring();
            }

            if (autoPlayComponent.isManagingCamps && !fightNode) {
                didSomething = didSomething || this.updateCamping();
            }

            this.resetTurn(fightNode !== null);

            this.lastSwitchCounter++;
            if ((!didSomething && this.lastSwitchCounter > 10) || autoPlayComponent.isPendingExploring) {
                didSomething = this.switchMode();
                this.lastSwitchCounter = 0;
            }

            if (!didSomething) {
                this.idleCounter++;
                this.printStep("idle");
            } else {
                this.idleCounter = 0;
            }

            if (this.idleCounter > 5) {
                this.printStep("skip 1 minute");
                this.cheatSystem.applyCheat("time 1");
            }

            this.lastStepTimeStamp = timeStamp;
		},

        updateExploring: function () {
            var didSomething = false;

            this.checkExploreObjective();

            var maxStamina = this.playerStatsNodes.head.stamina.health * PlayerStatConstants.HEALTH_TO_STAMINA_FACTOR;
            var minStamina = GameGlobals.playerActionFunctions.nearestCampNodes.head ? Math.min(100, maxStamina / 2) : 0;
            var hasStamina = minStamina < this.playerStatsNodes.head.stamina.stamina;

            didSomething = didSomething || this.buildCamp();
            didSomething = didSomething || this.buildOutImprovements();
            didSomething = didSomething || this.useOutImprovements();

            if (hasStamina) {
                didSomething = didSomething || this.craftItems();
                didSomething = didSomething || this.scout();
                didSomething = didSomething || this.scavenge();
                didSomething = didSomething || this.idleOut();
                didSomething = didSomething || this.move();
            }
            return didSomething;
        },

        updateCamping: function () {
            var didSomething = false;
            var autoPlayComponent = this.autoPlayNodes.head.autoPlay;
            if (autoPlayComponent.isPendingExploring)
                return didSomething;
            didSomething = didSomething || this.useInImprovements();
            didSomething = didSomething || this.manageWorkers();
            didSomething = didSomething || this.buildPassages();
            didSomething = didSomething || this.buildInImprovements();
            didSomething = didSomething || this.unlockUpgrades();
            didSomething = didSomething || this.craftItems();
            didSomething = didSomething || this.idleIn();
            didSomething = didSomething || this.switchCamps();
            return didSomething;
        },

		resetTurn: function (isFight) {
            if (this.playerStatsNodes.head.entity.has(PlayerActionResultComponent)) {
                this.handleInventory();
                this.equipBest();
                $("#info-ok").click();
            }
            if (!isFight) GameGlobals.uiFunctions.popupManager.closeAllPopups();
            if (this.isExpress) {
                this.cheatSystem.applyCheat("stamina");
            }
		},

        switchMode: function () {
            if (!GameGlobals.gameState.unlockedFeatures.camp)
                return false;

            var autoPlayComponent = this.autoPlayNodes.head.autoPlay;
            var busyComponent = this.playerStatsNodes.head.entity.get(PlayerActionComponent);
            if (busyComponent && busyComponent.isBusy())
                return false;

            var currentStorage = GameGlobals.resourcesHelper.getCurrentStorage();
            var currentFood = currentStorage.resources.getResource(resourceNames.food);
            var currentWater = currentStorage.resources.getResource(resourceNames.water);
            var perksComponent = this.playerStatsNodes.head.entity.get(PerksComponent);
            var injuries = perksComponent.getPerksByType(PerkConstants.perkTypes.injury);
            var itemsComponent = this.itemsNodes.head.items;
            var hasHospital = this.getTotalImprovementsCount(improvementNames.hospital) > 0;
            if (injuries.length > 2 && hasHospital && currentFood > 5 && currentWater > 5 && !autoPlayComponent.isExploring)
                return false;

            this.printStep("switch mode");

            var wasExploring = autoPlayComponent.isExploring;
            var nearestCampLevel = GameGlobals.playerActionFunctions.nearestCampNodes.head ? GameGlobals.playerActionFunctions.nearestCampNodes.head.entity.get(PositionComponent).level : -100;
            if (wasExploring && nearestCampLevel > -100) {
                // this.printStep("enter camp " + nearestCampLevel);
                autoPlayComponent.setExploreObjective(null, null, null);
                GameGlobals.playerActionFunctions.moveToCamp(nearestCampLevel);
                GameGlobals.uiFunctions.showTab(GameGlobals.uiFunctions.elementIDs.tabs.in);
            } else {
                // this.printStep("leave camp");
                if (GameGlobals.playerActionFunctions.nearestCampNodes.head) {
                    var selectedResVO = new ResourcesVO();
                    selectedResVO.setResource(resourceNames.food, Math.min(10, currentStorage.resources.getResource(resourceNames.food) / 2));
                    selectedResVO.setResource(resourceNames.water, Math.min(10, currentStorage.resources.getResource(resourceNames.water) / 2));
                    GameGlobals.playerActionFunctions.moveResFromCampToBag(selectedResVO);

                    var selectedItems = {};
                    var itemID = ItemConstants.itemDefinitions.exploration[0].id;
                    if (itemsComponent.getCountById(itemID, true) > 0) {
                        selectedItems[itemID] = 1;
                    }
                    GameGlobals.playerActionFunctions.updateCarriedItems(selectedItems);
                    GameGlobals.playerActionFunctions.leaveCamp();
                }
                GameGlobals.uiFunctions.showTab(GameGlobals.uiFunctions.elementIDs.tabs.out);
            }

            autoPlayComponent.isExploring = !autoPlayComponent.isExploring;
            autoPlayComponent.isManagingCamps = !autoPlayComponent.isExploring;

            this.lastSwitchCounter = 0;

            return true;
        },

        checkExploreObjective: function() {
            // if no objective, set one
            var autoPlayComponent = this.autoPlayNodes.head.autoPlay;
            if (!autoPlayComponent.isExploreObjectiveSet()) {
                this.setExploreObjective();
                return;
            }

            // if completed, reset / return
            if (autoPlayComponent.isExploreGoalComplete) {
                switch (autoPlayComponent.exploreGoal) {
                    case AutoPlayConstants.GOALTYPES.SCOUT_SECTORS:
                        this.setExploreObjective();
                        return;
                    case AutoPlayConstants.GOALTYPES.SCAVENGE_RESOURCES:
                    case AutoPlayConstants.GOALTYPES.SCOUT_LOCALE:
                    case AutoPlayConstants.GOALTYPES.CLEAR_WORKSHOP:
                        return;
                }
            }
        },

        setExploreObjective: function () {
            var autoPlayComponent = this.autoPlayNodes.head.autoPlay;
            var playerPosition = GameGlobals.playerActionFunctions.playerPositionNodes.head.position;
            var itemsComponent = this.itemsNodes.head.items;
            var perksComponent = this.playerStatsNodes.head.entity.get(PerksComponent);
            var campResources = GameGlobals.playerActionFunctions.nearestCampNodes.head ? GameGlobals.resourcesHelper.getCurrentCampStorage(GameGlobals.playerActionFunctions.nearestCampNodes.head.entity) : null;

            var injuries = perksComponent.getPerksByType(PerkConstants.perkTypes.injury);
            var hasHospital = this.getTotalImprovementsCount(improvementNames.hospital) > 0;
            var prioritizeHeal = injuries.length > 0 && hasHospital;
            var prioritizeScouting = campResources ? campResources.isStocked(GameGlobals.gameState) : false;
            var hasLockPick = itemsComponent.getCountById("exploration_1", true);

            // 1. set requirements
            if (this.playerStatsNodes.head.vision.value < this.playerStatsNodes.head.vision.maximum) {
                this.playerStatsNodes.head.vision.value = this.playerStatsNodes.head.vision.maximum;
            }

            // 2. check sectors
            var numAccessibleSectors = 0;
            var numUnscoutedSectors = 0;
            var nearestUnscoutedSector = null;
            var nearestUnscoutedLocaleSector = null;
            var nearestUnclearedWorkshopSector = null;

			var checkSector = function (sector) {
                var isScouted = sector.get(SectorStatusComponent).scouted;
                var hasUnscoutedLocales = GameGlobals.levelHelper.getSectorLocalesForPlayer(sector).length > 0;
                var hasUnclearedWorkshops = GameGlobals.levelHelper.getSectorUnclearedWorkshopCount(sector) > 0;

                if (!nearestUnscoutedSector && !isScouted) {
                    if (GameGlobals.playerActionsHelper.checkAvailability("scout", false, sector)) {
                        nearestUnscoutedSector = sector;
                    }
                }
                if (!nearestUnscoutedLocaleSector && hasUnscoutedLocales) nearestUnscoutedLocaleSector = sector;
                if (!nearestUnclearedWorkshopSector && hasUnclearedWorkshops) nearestUnclearedWorkshopSector = sector;

                numAccessibleSectors++;
                if (!isScouted)
                    numUnscoutedSectors++;

                return false;
			};

            if (!autoPlayComponent.forcedExpeditionType) {
                GameGlobals.levelHelper.forEverySectorFromLocation(playerPosition, checkSector, autoPlayComponent.isExpedition);
            }

            // 3. set goal

            var goal = null
            var sector = null;
            var path = null;
            var resource = null;

            var ratioUnscoutedSectors = numUnscoutedSectors / numAccessibleSectors;
            var startSector = GameGlobals.playerActionFunctions.playerPositionNodes.head.entity;
            var hasCamp = GameGlobals.playerActionFunctions.nearestCampNodes.head;
            
            var prioritizeScavenge = autoPlayComponent.forcedExpeditionType == AutoPlayConstants.GOALTYPES.SCAVENGE_RESOURCES;

            if (hasCamp && !prioritizeHeal && !prioritizeScavenge && nearestUnclearedWorkshopSector) {
                goal = AutoPlayConstants.GOALTYPES.CLEAR_WORKSHOP;
                sector = nearestUnclearedWorkshopSector;
                path = GameGlobals.levelHelper.findPathTo(startSector, sector);
            }
            else if (hasCamp && !prioritizeHeal && !prioritizeScavenge && hasLockPick && nearestUnscoutedLocaleSector) {
                goal = AutoPlayConstants.GOALTYPES.SCOUT_LOCALE;
                sector = nearestUnscoutedLocaleSector;
                path = GameGlobals.levelHelper.findPathTo(startSector, sector);
            }
            else if (hasCamp && !prioritizeHeal && !prioritizeScavenge && nearestUnscoutedSector && numUnscoutedSectors > 0 && Math.random() < (prioritizeScouting ? 0.75 : 0.5)) {
                goal = AutoPlayConstants.GOALTYPES.SCOUT_SECTORS;
                sector = nearestUnscoutedSector;
                path = GameGlobals.levelHelper.findPathTo(startSector, sector);
            } else {
                var nearestSectorsByRes = this.getNearestSectorsByRes();
                goal = AutoPlayConstants.GOALTYPES.SCAVENGE_RESOURCES;
                resource = this.getExploreResource(nearestSectorsByRes);
                sector = nearestSectorsByRes[resource];
                path = GameGlobals.levelHelper.findPathTo(startSector, sector);
            }

            this.printStep("set explore objective: " + goal + " " + sector.get(PositionComponent).getPosition() + " " + (path ? path.length : "[-]") + " " + resource);
            autoPlayComponent.setExploreObjective(goal, sector, path, resource);
        },

        getExploreResource: function (nearestSectorsByRes) {
            if (!GameGlobals.gameState.unlockedFeatures.camp || !GameGlobals.playerActionFunctions.nearestCampNodes.head.entity)
                return resourceNames.metal;

            var campStorage = GameGlobals.resourcesHelper.getCurrentCampStorage(GameGlobals.playerActionFunctions.nearestCampNodes.head.entity);
            var campResources = campStorage.resources;
            var campPopulation = GameGlobals.playerActionFunctions.nearestCampNodes.head.camp.population;

            var healCosts = GameGlobals.playerActionsHelper.getCosts("use_in_hospital");
            var isWaterLow = campResources.getResource(resourceNames.water) < Math.max(10 + campPopulation * 2.5, healCosts.resource_water);
            if (isWaterLow)
                if (nearestSectorsByRes[resourceNames.water])
                    return resourceNames.water;

            var isFoodLow = campResources.getResource(resourceNames.food) < Math.max(10 + campPopulation * 2.5, healCosts.resource_food);
            if (isFoodLow)
                if (nearestSectorsByRes[resourceNames.food])
                    return resourceNames.food;

            var action = this.getNextImprovementAction() || this.getNextProjectAction();
            if (action) {
                var missingResource = action.costFactorRes;
                if (missingResource && nearestSectorsByRes[missingResource])
                    return missingResource;
            }

            var leastAmount = -1;
            var leastRes = null;
            for (var key in resourceNames) {
                var name = resourceNames[key];
                if (!GameGlobals.gameState.unlockedFeatures.resources[name])
                    continue;
                if (!nearestSectorsByRes[name])
                    continue;
                var campAmount = campResources.getResource(name);
                if (campAmount < leastAmount || leastAmount < 0) {
                    leastAmount = campAmount;
                    leastRes = name;
                }
            }

            return leastRes || resourceNames.metal;
        },

        getNextImprovementAction: function () {
            var campStorage = GameGlobals.resourcesHelper.getCurrentCampStorage(GameGlobals.playerActionFunctions.nearestCampNodes.head.entity).resources;

            // get all available improvements in camp
            var improvements = [];
            for (var key in improvementNames) {
                var improvementName = improvementNames[key];
                var actionName = GameGlobals.playerActionsHelper.getActionNameForImprovement(improvementName);
                if (!actionName)
                    continue;

                var requirementCheck =  GameGlobals.playerActionsHelper.checkRequirements(actionName, false, null);
                var actionEnabled = requirementCheck.value >= 1;
                if (!actionEnabled)
                    continue;

                var actionAvailable = GameGlobals.playerActionsHelper.checkAvailability(actionName, false, null);
                if (actionAvailable)
                    continue;

                var costs = GameGlobals.playerActionsHelper.getCosts(actionName);

                var costFactor = 1;
                var costFactorRes = null;
                for (var costName in costs) {
                    var costNameParts = costName.split("_");
                    var costAmount = costs[costName];
                    if (costNameParts[0] !== "resource")
                        continue;
                    var resourceName = costNameParts[1];
                    var factor = campStorage.getResource(resourceName) / costAmount;
                    if (factor < costFactor) {
                        costFactor = factor;
                        costFactorRes = resourceName;
                    }

                }
                if (costFactor < 1) {
                    improvements.push({improvementName: improvementName, actionName: actionName, costFactor: costFactor, costFactorRes: costFactorRes});
                }
            }

            if (improvements.length === 0)
                return null;

            // sort by a) hasn't built any yet b) resource cost
            var campImprovements = GameGlobals.playerActionFunctions.nearestCampNodes.head.entity.get(SectorImprovementsComponent);
            improvements = improvements.sort(function(a,b) {
                var counta = campImprovements.getCount(a.improvementName);
                var countb = campImprovements.getCount(b.improvementName);
                if (counta === 0 && countb !== 0)
                    return -1;
                if (countb === 0 && counta !== 0)
                    return 1;
                return a.costFactor - b.costFactor;

            });

            return improvements[0];
        },

        getNextProjectAction: function () {
            // TODO implement
            return null;
        },

        getNearestSectorsByRes: function () {
            var result = {};
			var checkSector = function (sector) {
                if (Object.keys(result).length === resourceNames.length) {
                    log.i("[getNearestSectorsByRes] all found.");
                    return true;
                }
                var featuresComponent = sector.get(SectorFeaturesComponent);
				for (var key in resourceNames) {
					var name = resourceNames[key];
                    if (result[name])
                        continue;
                    if (featuresComponent.resourcesScavengable.getResource(name) > 0 || featuresComponent.resourcesCollectable.getResource(name) > 0) {
                        result[name] = sector;
                    }
                }
                return false;
			};
            var playerPosition = GameGlobals.playerActionFunctions.playerPositionNodes.head.position;
            var autoPlayComponent = this.autoPlayNodes.head.autoPlay;
            GameGlobals.levelHelper.forEverySectorFromLocation(playerPosition, checkSector, autoPlayComponent.isExpedition);
            return result;
        },

		move: function () {
            if (!GameGlobals.gameState.unlockedFeatures.camp)
                return false;

            var autoPlayComponent = this.autoPlayNodes.head.autoPlay;
            var playerSector = GameGlobals.playerActionFunctions.playerPositionNodes.head.entity;
            var playerPosition = GameGlobals.playerActionFunctions.playerPositionNodes.head.position;
            var targetSector = autoPlayComponent.exploreSector;
            var targetPosition = targetSector ? targetSector.get(PositionComponent) : null;

            /*
            var isTimeToRetreat = false;
            if (isTimeToRetreat) {
                // retreat towards food/water
                return true;
            }
            */

            if (playerPosition.equals(targetPosition)) {
                return false;
            }

            if (autoPlayComponent.isExploreGoalComplete) {
                return false;
            }

            if (targetSector) {
                // move towards target
                var nextSector = autoPlayComponent.explorePath.shift();
                return this.moveToSector(nextSector, "path");
            } else {
                // move to random sector
                var neighbours = GameGlobals.levelHelper.getSectorNeighboursList(playerSector);
                var i = Math.floor(Math.random() * neighbours.length);
                var randomNeighbour = neighbours[i];
                return this.moveToSector(randomNeighbour, "random");
            }

            return false;
		},

        moveToSector: function (sectorEntity, reason) {
            if (!sectorEntity)
                return false;

            var playerPosition = GameGlobals.playerActionFunctions.playerPositionNodes.head.position;
			var sectorPosition = sectorEntity.get(PositionComponent);
			if (playerPosition.level !== sectorPosition.level || playerPosition.sectorId() !== sectorPosition.sectorId()) {
                this.printStep("move to " + sectorPosition + " (" + reason + ")");
                playerPosition.setTo(sectorPosition);
                return true;
            }

            return false;
		},

		buildCamp: function () {
			if (GameGlobals.playerActionsHelper.checkAvailability("build_out_camp", false)) {
                this.printStep("build camp");
				GameGlobals.playerActionFunctions.buildCamp();
                return true;
			}
            return false;
		},

        buildOutImprovements: function () {
            if (!GameGlobals.playerActionFunctions.playerLocationNodes.head) return;
			var improvementsComponent = GameGlobals.playerActionFunctions.playerLocationNodes.head.entity.get(SectorImprovementsComponent);

            // traps & buckets
            if (GameGlobals.playerActionsHelper.checkAvailability("build_out_collector_water")) {
                if (improvementsComponent.getCount(improvementNames.collector_water) < 1) {
                    this.printStep("build bucket");
                    GameGlobals.playerActionFunctions.buildBucket();
                    return true;
                }
            }

            if (GameGlobals.playerActionsHelper.checkAvailability("build_out_collector_food")) {
                if (improvementsComponent.getCount(improvementNames.collector_food) < 1) {
                    this.printStep("build trap");
                    GameGlobals.playerActionFunctions.buildTrap();
                    return true;
                }
            }

            return false;
        },

        useOutImprovements: function () {
            var bagFull = this.isBagFull();
            if (!bagFull && GameGlobals.playerActionsHelper.checkAvailability("use_out_collector_food")) {
                this.printStep("collect food");
                GameGlobals.playerActionFunctions.collectFood();
                return true;
            }
            if (!bagFull && GameGlobals.playerActionsHelper.checkAvailability("use_out_collector_water")) {
                this.printStep("collect water");
                GameGlobals.playerActionFunctions.collectWater();
                return true;
            }
            if (!bagFull && GameGlobals.playerActionsHelper.checkAvailability("use_spring")) {
                this.printStep("stop by a spring");
                GameGlobals.playerActionFunctions.useSpring();
                return true;
            }
            return false;
        },

		scout: function () {
            var autoPlayComponent = this.autoPlayNodes.head.autoPlay;
            if (GameGlobals.playerActionsHelper.checkAvailability("scout")) {
                this.printStep("scout");
				GameGlobals.playerActionFunctions.scout();
                if (autoPlayComponent.exploreGoal === AutoPlayConstants.GOALTYPES.SCOUT_SECTORS) {
                    autoPlayComponent.isExploreGoalComplete = true;
                    this.printStep("complete scout goal");
                }
                return true;
            }

			var sectorLocalesComponent = GameGlobals.playerActionFunctions.playerLocationNodes.head.entity.get(SectorLocalesComponent);
			var sectorStatusComponent = GameGlobals.playerActionFunctions.playerLocationNodes.head.entity.get(SectorStatusComponent);
			for (var i = 0; i < sectorLocalesComponent.locales.length; i++) {
				var locale = sectorLocalesComponent.locales[i];
                if (!sectorStatusComponent.isLocaleScouted(i)) {
                    var action = "scout_locale_" + locale.getCategory() + "_" + i;
                    if (GameGlobals.playerActionsHelper.checkAvailability(action, true)) {
                        GameGlobals.playerActionFunctions.scoutLocale(i);
                        this.printStep("scout locale " + locale.type);
                        if (autoPlayComponent.exploreGoal === AutoPlayConstants.GOALTYPES.SCOUT_LOCALE) {
                            autoPlayComponent.isExploreGoalComplete = true;
                            this.printStep("complete scout goal");
                        }
                        return true;
                    }
                }
            }

            return false;
		},

		scavenge: function () {
            var autoPlayComponent = this.autoPlayNodes.head.autoPlay;
            if (autoPlayComponent.exploreGoal === AutoPlayConstants.GOALTYPES.SCOUT_LOCALE)
                return;
            if (GameGlobals.playerActionsHelper.checkAvailability("scavenge")) {
                var bagComponent = this.playerStatsNodes.head.entity.get(BagComponent);
                var bagFull = this.isBagFull() && bagComponent.totalCapacity > ItemConstants.PLAYER_DEFAULT_STORAGE;
                if (!bagFull || Math.random() < 0.5) {
                    this.printStep("scavenge");
    				GameGlobals.playerActionFunctions.startAction("scavenge");
                    return true;
                }
            }
            return false;
		},

        idleOut: function () {
            if (GameGlobals.playerActionFunctions.nearestCampNodes.head && this.playerStatsNodes.head.stamina.stamina < 10)
                return false;

            return false;
        },

        switchCamps: function () {
            var playerPosition = GameGlobals.playerActionFunctions.playerPositionNodes.head.position;
            var currentLevelOrdinal = GameGlobals.gameState.getLevelOrdinal(playerPosition.level);

            var campPosition;
            var campOrdinal;
            var campOrdinalDiff = 100;
            var nextCampOrdinalDiff = 100;
            var nextCamp = null;
            for (var node = GameGlobals.playerActionFunctions.campNodes.head; node; node = node.next) {
                campPosition = node.position;
                campOrdinal = GameGlobals.gameState.getLevelOrdinal(campPosition.level);
                if (campOrdinal < currentLevelOrdinal) {
                    campOrdinalDiff = currentLevelOrdinal - campOrdinal;
                    if (campOrdinalDiff < nextCampOrdinalDiff) {
                        nextCamp = node;
                        nextCampOrdinalDiff = campOrdinalDiff;
                    }
                }
            }

            if (nextCamp) {
                GameGlobals.playerActionFunctions.moveToCamp(nextCamp.position.level);
                return true;
            }

            return false;
        },

        useInImprovements: function () {
            var campComponent = GameGlobals.playerActionFunctions.playerLocationNodes.head.entity.get(CampComponent);
            if (!campComponent)
                return false;

            if (GameGlobals.playerActionsHelper.checkAvailability("use_in_home")) {
                var maxStamina = this.playerStatsNodes.head.stamina.health * PlayerStatConstants.HEALTH_TO_STAMINA_FACTOR;
                if (this.playerStatsNodes.head.stamina.stamina < maxStamina / 3 * 2) {
                    GameGlobals.playerActionFunctions.useHome();
                    this.printStep("rested");
                    return true;
                }
            }

            if (GameGlobals.playerActionsHelper.checkAvailability("use_in_campfire")) {
                GameGlobals.playerActionFunctions.useCampfire();
                this.printStep("used campfire");
                return true;
            }

            if (GameGlobals.playerActionsHelper.checkAvailability("use_in_hospital")) {
                GameGlobals.playerActionFunctions.useHospital();
                this.printStep("used hospital");
                return true;
            }

            if (GameGlobals.playerActionsHelper.checkAvailability("use_in_inn") && Math.random() < 0.05) {
                var newFollower = GameGlobals.playerActionFunctions.useInn(true);
                if (newFollower) {
                    this.printStep("used inn");
                    return true;
                }
            }
        },

        manageWorkers: function () {
            var campComponent = GameGlobals.playerActionFunctions.playerLocationNodes.head.entity.get(CampComponent);
            if (!campComponent)
                return false;

            var improvementsComponent = GameGlobals.playerActionFunctions.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
            var playerPosition = GameGlobals.playerActionFunctions.playerPositionNodes.head.position;
            var currentStorage = GameGlobals.resourcesHelper.getCurrentStorage();

            // cheat population
            var maxPopulation = CampConstants.getHousingCap(improvementsComponent);
            if (this.isExpress && campComponent.population < maxPopulation)
                this.cheatSystem.applyCheat("pop");

            // assign workers
            if (campComponent.getFreePopulation() > 0 || this.refreshWorkers) {
                var currentFood = currentStorage.resources.getResource(resourceNames.food);
                var currentWater = currentStorage.resources.getResource(resourceNames.water);
                var currentRope = currentStorage.resources.getResource(resourceNames.rope);
                var currentTools = currentStorage.resources.getResource(resourceNames.tools);
                var maxStorage = currentStorage.storageCapacity;

                var currentFoodRatio = currentFood / maxStorage;
                var currentWaterRatio = currentWater / maxStorage;

                var canRope = this.hasUpgrade(GameGlobals.upgradeEffectsHelper.getUpgradeIdForWorker("weaver"));
                var upgradesComponent = GameGlobals.playerActionFunctions.tribeUpgradesNodes.head.upgrades;

                var maxApothecaries = improvementsComponent.getCount(improvementNames.apothecary) * CampConstants.getApothecariesPerShop(GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.apothecary, upgradesComponent));
                var maxConcrete = improvementsComponent.getCount(improvementNames.cementmill) * CampConstants.getWorkersPerMill(GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.cementmill, upgradesComponent));
                var maxSmiths = improvementsComponent.getCount(improvementNames.smithy) * CampConstants.getSmithsPerSmithy(GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.smithy, upgradesComponent));
                var maxSoldiers = improvementsComponent.getCount(improvementNames.barracks) * CampConstants.getSoldiersPerBarracks(GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.barracks, upgradesComponent));
                var maxScientists = improvementsComponent.getCount(improvementNames.library) * CampConstants.getScientistsPerLibrary(GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.library, upgradesComponent));
                var maxChemists = GameGlobals.levelHelper.getLevelClearedWorkshopCount(playerPosition.level, resourceNames.fuel) * CampConstants.CHEMISTS_PER_WORKSHOP;

                var pop = campComponent.population;

                var waters = Math.max(1, Math.floor(pop / (currentWaterRatio > 0.5 ? 5 : 2.25)));
                var trappers = Math.floor(pop / (currentFoodRatio > 0.5 ? 3 : 2));
                var specialistPop = Math.floor(pop - trappers - waters);

                var ropers = canRope && currentRope < maxStorage / 2 ? 1 : 0;
                var chemists = Math.min(1, specialistPop - ropers, maxChemists);
                var smiths = Math.min((currentTools > maxSmiths * 0.9 ? 0 : 1), specialistPop - ropers - chemists, maxSmiths);
                var apothecaries = Math.min(1, specialistPop - ropers - chemists - smiths, maxApothecaries);
                var concrete = Math.min(1, specialistPop - ropers - chemists - smiths - apothecaries, maxConcrete);
                var soldiers = Math.min(1, specialistPop - ropers - chemists - smiths - apothecaries - concrete, maxSoldiers);
                var scientists = Math.min(1, specialistPop - ropers - chemists - smiths - apothecaries - concrete - soldiers, maxScientists);
                var scavengers = Math.floor(pop - trappers - waters - ropers - chemists - apothecaries - smiths - concrete - soldiers - scientists);

                GameGlobals.playerActionFunctions.assignWorkers(scavengers, trappers, waters, ropers, chemists, apothecaries, smiths, concrete, soldiers, scientists);
                this.printStep("assigned workers (" + scavengers + ", " + trappers + ", " + waters + ", " + ropers + ", " + chemists + ", " + apothecaries + ", " + smiths + ", " + concrete + ", " + soldiers + ")");
                this.refreshWorkers = false;
                return true;
            }
            return false;
        },

        buildPassages: function () {
            var projects = GameGlobals.levelHelper.getAvailableProjectsForCamp(GameGlobals.playerActionFunctions.playerLocationNodes.head.entity);
            for (var i = 0; i < projects.length; i++) {
                var project = projects[i];
                var action = project.action;
                var sectorEntity = GameGlobals.levelHelper.getSectorByPosition(project.level, project.position.sectorX, project.position.sectorY);
                var available = GameGlobals.playerActionsHelper.checkAvailability(action, false, sectorEntity);
                if (available) {
                    var sector = project.level + "." + project.sector + "." + project.direction;
                    GameGlobals.playerActionFunctions.startAction(action, sector);
                    this.printStep("build project: " + project.name);
                    return true;
                }
            }
            return false;
        },

        buildInImprovements: function () {
            var campComponent = GameGlobals.playerActionFunctions.playerLocationNodes.head.entity.get(CampComponent);
            if (!campComponent)
                return;

			var improvementsComponent = GameGlobals.playerActionFunctions.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
            var maxPopulation = CampConstants.getHousingCap(improvementsComponent);

            if (GameGlobals.playerActionsHelper.checkAvailability("build_in_tradepost")) {
                this.printStep("build trading post");
                GameGlobals.playerActionFunctions.buildTradingPost();
                return true;
            }

            if (GameGlobals.playerActionsHelper.checkAvailability("build_in_hospital")) {
                this.printStep("build hospital");
                GameGlobals.playerActionFunctions.buildHospital();
                return true;
            }

            if (campComponent.population >= maxPopulation - 1) {
                if (GameGlobals.playerActionsHelper.checkAvailability("build_in_house2")) {
                    this.printStep("build house2");
                    GameGlobals.playerActionFunctions.buildHouse2();
                    return true;
                }

                if (GameGlobals.playerActionsHelper.checkAvailability("build_in_house")) {
                    this.printStep("build house");
                    GameGlobals.playerActionFunctions.buildHouse();
                    return true;
                }
            }

            if (GameGlobals.playerActionsHelper.checkAvailability("build_in_storage")) {
                this.printStep("build storage");
                GameGlobals.playerActionFunctions.buildStorage();
                return true;
            }

            if (GameGlobals.playerActionsHelper.checkAvailability("build_in_darkfarm")) {
                this.printStep("build darkfarm");
                GameGlobals.playerActionFunctions.buildDarkFarm();
                return true;
            }

            if (GameGlobals.playerActionsHelper.checkAvailability("build_in_campfire")) {
                this.printStep("build campfire");
                GameGlobals.playerActionFunctions.buildCampfire();
                return true;
            }

            if (GameGlobals.playerActionsHelper.checkAvailability("build_in_lights")) {
                this.printStep("build lights");
                GameGlobals.playerActionFunctions.buildLights();
                return true;
            }

            if (GameGlobals.playerActionsHelper.checkAvailability("build_in_library")) {
                this.printStep("build library");
                GameGlobals.playerActionFunctions.buildLibrary();
                return true;
            }

            if (GameGlobals.playerActionsHelper.checkAvailability("build_in_market")) {
                this.printStep("build market");
                GameGlobals.playerActionFunctions.buildMarket();
                return true;
            }

            if (GameGlobals.playerActionsHelper.checkAvailability("build_in_smithy")) {
                this.printStep("build smithy");
                GameGlobals.playerActionFunctions.buildSmithy();
                this.refreshWorkers = true;
                return true;
            }

            if (GameGlobals.playerActionsHelper.checkAvailability("build_in_inn")) {
                this.printStep("build inn");
                GameGlobals.playerActionFunctions.buildInn();
                return true;
            }

            if (GameGlobals.playerActionsHelper.checkAvailability("build_in_square")) {
                this.printStep("build square");
                GameGlobals.playerActionFunctions.buildSquare();
                return true;
            }

            if (GameGlobals.playerActionsHelper.checkAvailability("build_in_garden")) {
                this.printStep("build garden");
                GameGlobals.playerActionFunctions.buildGarden();
                return true;
            }

            return false;
        },

        unlockUpgrades: function () {
            var unlocked = false;
            var upgradesComponent = GameGlobals.playerActionFunctions.tribeUpgradesNodes.head.upgrades;

            var unfinishedBlueprints = upgradesComponent.getUnfinishedBlueprints();
            if (unfinishedBlueprints.length > 0) {
                var id = unfinishedBlueprints[0].upgradeId;
                GameGlobals.playerActionFunctions.createBlueprint(id);
                this.printStep("created blueprint " + id);
                unlocked = true;
            }

            var upgradeDefinition;
            var hasBlueprintUnlocked;
            var hasBlueprintNew;
            var isAvailable;
			for (var id in UpgradeConstants.upgradeDefinitions) {
				upgradeDefinition = UpgradeConstants.upgradeDefinitions[id];
				if (!upgradesComponent.hasUpgrade(id)) {
					hasBlueprintUnlocked = upgradesComponent.hasAvailableBlueprint(id);
					hasBlueprintNew = upgradesComponent.hasNewBlueprint(id);
					isAvailable = GameGlobals.playerActionsHelper.checkAvailability(id);
                    if (hasBlueprintNew) {
                        GameGlobals.playerActionFunctions.unlockUpgrade(upgradeDefinition.id);
                        this.printStep("unlocked upgrade with blueprint " + upgradeDefinition.name);
                        unlocked = true;
                    } else if (isAvailable) {
                        GameGlobals.playerActionFunctions.buyUpgrade(upgradeDefinition.id);
                        this.printStep("bought upgrade " + upgradeDefinition.name);
                        this.refreshWorkers = true;
                        unlocked = true;
                    }
                }
            }
            return unlocked;
        },

		craftItems: function () {
            var itemList;
			var itemDefinition;
			for (var type in ItemConstants.itemDefinitions) {
				itemList = ItemConstants.itemDefinitions[type];
				for (var i in itemList) {
					itemDefinition = itemList[i];
					if (itemDefinition.craftable) {
                        if (this.itemsNodes.head.items.getCountById(itemDefinition.id, true) < 1) {
                            if (GameGlobals.playerActionsHelper.checkAvailability("craft_" + itemDefinition.id)) {
                                this.printStep("craft " + itemDefinition.name);
                                GameGlobals.playerActionFunctions.craftItem(itemDefinition.id);
                                this.equipBest();
                                return true;
                            }
                        }
                    }
                }
            }
            return false;
		},

        idleIn: function () {
            return Math.random() > 0.8;
        },

        equipBest: function () {
            this.cheatSystem.equipBest();
        },

        handleInventory: function () {
            var inCamp = this.playerStatsNodes.head.entity.get(PositionComponent).inCamp;
            var bagComponent = this.playerStatsNodes.head.entity.get(BagComponent);
            var resultVO = this.playerStatsNodes.head.entity.get(PlayerActionResultComponent).pendingResultVO;
            var playerAllItems = this.playerStatsNodes.head.entity.get(ItemsComponent).getAll(inCamp);
            var playerResources = this.playerStatsNodes.head.entity.get(ResourcesComponent);

            var autoPlayComponent = this.autoPlayNodes.head.autoPlay;
            var goalres = autoPlayComponent.exploreResource ? autoPlayComponent.exploreResource : resourceNames.metal;
            var goalamount = bagComponent.totalCapacity / 2;

            // pick everything
            resultVO.selectedItems = resultVO.gainedItems;
            resultVO.selectedResources = resultVO.gainedResources;
            BagConstants.updateCapacity(bagComponent, resultVO, playerResources, playerAllItems);

            // drop stuff if needed
            // TODO prioritize item types to discard

            var prioritizedResources = [
                { name: resourceNames.metal, min: 8 },
                { name: resourceNames.concrete, min: 0 },
                { name: resourceNames.tools, min: 0 },
                { name: resourceNames.medicine, min: 0 },
                { name: resourceNames.rope, min: 0 },
                { name: resourceNames.herbs, min: 0 },
                { name: resourceNames.fuel, min: 0 },
                { name: resourceNames.food, min: 5 },
                { name: resourceNames.water, min: 8 },
                { name: resourceNames.metal, min: 0 },
                { name: resourceNames.food, min: 0 },
                { name: resourceNames.water, min: 0 },
            ];

            while (bagComponent.selectedCapacity > bagComponent.totalCapacity) {
                var discarded = false;
                for (var i = 0; i < prioritizedResources.length; i++) {
                    var resourceCheck = prioritizedResources[i];
                    var name = resourceCheck.name;
                    var totalAmount = resultVO.selectedResources.getResource(name) + playerResources.resources.getResource(name);
                    var min = resourceCheck.min + (goalres == name ? goalamount : 0);

                    // leave from selected resources
                    if (resultVO.selectedResources.getResource(name) > 0 && totalAmount > min) {
                        resultVO.selectedResources.addResource(name, -1);
                        // this.printStep("leave 1 " + name);
                        discarded = true;
                        break;
                    }

                    // discard from already carried resources
                    if (playerResources.resources.getResource(name) > 0 && totalAmount > min) {
                        resultVO.discardedResources.addResource(name, 1);
                        // this.printStep("discard 1 " + name);
                        discarded = true;
                        break;
                    }
                }

                if (!discarded && resultVO.selectedItems.length > 0) {
                    // this.printStep("leave 1 item");
                    resultVO.selectedItems.splice(0, 1);
                    discarded = true;
                }

                BagConstants.updateCapacity(bagComponent, resultVO, playerResources, playerAllItems);
                if (!discarded)
                    break;
            }

            if (autoPlayComponent.exploreGoal === AutoPlayConstants.GOALTYPES.SCAVENGE_RESOURCES) {
                var totalAmount = resultVO.selectedResources.getResource(goalres) + playerResources.resources.getResource(goalres);
                autoPlayComponent.isExploreGoalComplete = totalAmount >= goalamount;
                if (autoPlayComponent.isExploreGoalComplete)
                    this.printStep("complete resource goal (" + goalres + " " + goalamount + ")");
            }
            
            GameGlobals.playerActionFunctions.completeAction(GameGlobals.playerActionFunctions.currentAction);
        },

        printStep: function (message) {
            var playerPosition = GameGlobals.playerActionFunctions.playerPositionNodes.head.position;
            var status = "idle";
            if (this.autoPlayNodes.head.autoPlay.isExploring) status = "exploring";
            if (this.autoPlayNodes.head.autoPlay.isManagingCamps) status = "managing";
            log.i("autoplay (" + this.isExpress + ") (" + status + ") " + playerPosition.level + "-" + playerPosition.sectorId() + ": " + message);
        },

        hasUpgrade: function (upgradeId) {
            return GameGlobals.playerActionFunctions.tribeUpgradesNodes.head.upgrades.hasUpgrade(upgradeId);
        },

		isBagFull: function () {
            var bagComponent = this.playerStatsNodes.head.entity.get(BagComponent);
            return bagComponent.totalCapacity - bagComponent.usedCapacity < 2;
		},

        getTotalImprovementsCount: function (name) {
            var result = 0;
            for (var node = this.campNodes.head; node; node = node.next) {
                var improvements = node.entity.get(SectorImprovementsComponent);
                result += improvements.getCount(name);
            }
            return result;
        }

    });

    return AutoPlaySystem;
});
