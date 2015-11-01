// A system to autoplay the game - mostly useful for quickly cheating to a semi-realistic later state of the game
define(['ash',
	'game/constants/ItemConstants',
	'game/constants/PlayerActionConstants',
	'game/nodes/player/AutoPlayNode',
	'game/nodes/player/PlayerStatsNode',
    'game/nodes/player/ItemsNode',
	'game/components/common/PositionComponent',
	'game/components/common/CampComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/SectorLocalesComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
    'game/constants/CampConstants',
    'game/constants/UpgradeConstants',
    'game/constants/EnemyConstants',
    'game/constants/FightConstants',
    'game/vos/ResourcesVO'
], function (Ash,
    ItemConstants, PlayerActionConstants, AutoPlayNode, PlayerStatsNode, ItemsNode,
    PositionComponent, CampComponent, SectorStatusComponent, SectorFeaturesComponent, SectorLocalesComponent, SectorImprovementsComponent,
    CampConstants, UpgradeConstants, EnemyConstants, FightConstants, ResourcesVO) {
    
	var AutoPlaySystem = Ash.System.extend({
		
		playerActionFunctions: null,
		levelHelper: null,
        sectorHelper: null,
        upgradesHelper: null,
		
		autoPlayNodes: null,
		playerStatsNodes: null,
		itemsNodes: null,
        
        latestCampLevel: 0,
	    
		constructor: function (playerActionFunctions, levelHelper, sectorHelper, upgradesHelper) {
			this.playerActionFunctions = playerActionFunctions;
			this.levelHelper = levelHelper;
            this.sectorHelper = sectorHelper;
            this.upgradesHelper = upgradesHelper;
        },

        addToEngine: function (engine) {
			this.autoPlayNodes = engine.getNodeList(AutoPlayNode);
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			this.itemsNodes = engine.getNodeList(ItemsNode);
            
            this.autoPlayNodes.nodeAdded.add(this.onAutoPlayNodeAdded, this);
            this.autoPlayNodes.nodeRemoved.add(this.onAutoPlayNodeRemoved, this);
        },

        removeFromEngine: function (engine) {
            this.autoPlayNodes.nodeAdded.remove(this.onAutoPlayNodeAdded, this);
            this.autoPlayNodes.nodeRemoved.remove(this.onAutoPlayNodeRemoved, this);
            
			this.autoPlayNodes = null;
			this.playerStatsNodes = null;
			this.itemsNodes = null;
		},
        
        onAutoPlayNodeAdded: function (node) {
            node.autoPlay.isExploring = false;
            node.autoPlay.isManagingCamps = true;
            if (node.autoPlay.express) this.playerActionFunctions.cheat("speed 25");
        },
        
        onAutoPlayNodeRemoved: function (node) {
            node.autoPlay.isExploring = false;
            node.autoPlay.isManagingCamps = false;
            if (node.autoPlay.express) this.playerActionFunctions.cheat("speed 1");
        },

        update: function (time) {
			if (this.autoPlayNodes.head) {
				var isExpress = this.autoPlayNodes.head.autoPlay.express;
				
				this.resetTurn(isExpress);

                var didSomething = false;
                
                if (this.autoPlayNodes.head.autoPlay.isExploring) {
                    didSomething = didSomething || this.move(isExpress);
                    didSomething = didSomething || this.buildCamp(isExpress);
                    didSomething = didSomething || this.buildOutImprovements(isExpress);
                    didSomething = didSomething || this.scout(isExpress);
                    didSomething = didSomething || this.scavenge(isExpress);
                    didSomething = didSomething || this.idleOut(isExpress);
                }
                
                if (this.autoPlayNodes.head.autoPlay.isManagingCamps) {
                    didSomething = didSomething || this.manageCamp(isExpress);
                    didSomething = didSomething || this.buildPassages(isExpress);
                    didSomething = didSomething || this.buildInImprovements(isExpress);
                    didSomething = didSomething || this.unlockUpgrades(isExpress);
                    didSomething = didSomething || this.craftItems(isExpress);
                    didSomething = didSomething || this.idleIn(isExpress);
                    didSomething = didSomething || this.switchCamps(isExpress);
                }
                
                if (!didSomething) {
                    this.switchMode();
                }
			}
		},
		
		resetTurn: function (isExpress) {
            this.playerActionFunctions.uiFunctions.popupManager.closeAllPopups();
            if (isExpress) {
                this.playerActionFunctions.cheat("stamina");
            }
		},
        
        switchMode: function () {
            var wasExploring = this.autoPlayNodes.head.autoPlay.isExploring;
            if (wasExploring && this.playerActionFunctions.nearestCampNodes.head) {
                this.printStep("enter camp " + this.latestCampLevel);
                this.playerActionFunctions.moveToCamp(this.latestCampLevel);
                this.playerActionFunctions.uiFunctions.showTab(this.playerActionFunctions.uiFunctions.elementIDs.tabs.in);
            } else {
                var currentStorage = this.playerActionFunctions.resourcesHelper.getCurrentStorage();
                var selectedResVO = new ResourcesVO();
                selectedResVO.setResource(resourceNames.food, Math.min(2, currentStorage.resources.getResource(resourceNames.food)));
                selectedResVO.setResource(resourceNames.water, Math.min(2, currentStorage.resources.getResource(resourceNames.water)));
                this.playerActionFunctions.moveResFromCampToBag(selectedResVO);
                this.playerActionFunctions.leaveCamp();
                this.playerActionFunctions.uiFunctions.showTab(this.playerActionFunctions.uiFunctions.elementIDs.tabs.out);
            }
            
            this.autoPlayNodes.head.autoPlay.isExploring = !this.autoPlayNodes.head.autoPlay.isExploring;
            this.autoPlayNodes.head.autoPlay.isManagingCamps = !this.autoPlayNodes.head.autoPlay.isExploring;
        },

		move: function (isExpress) {
            var playerPosition = this.playerActionFunctions.playerPositionNodes.head.position;
			var l = playerPosition.level;
			var s = playerPosition.sector;
			var levelHelper = this.levelHelper;
            var playerActionFunctions = this.playerActionFunctions;
            
            var itemsComponent = this.itemsNodes.head.items;
            var fightStrength = FightConstants.getPlayerStrength(this.playerStatsNodes.head.stamina, itemsComponent);
            var groundLevelOrdinal = this.playerActionFunctions.gameState.getGroundLevelOrdinal();
            var totalLevels = this.playerActionFunctions.gameState.getTotalLevels();
			
			var nearestCampableSector = null;
			var nearestUnscoutedLocaleSector = null;
			var nearestUnscoutedSector = null;
			var nearestCampSector = null;
            
            var latestCampLevel = 0;
			
			var checkSector = function (testL, testS) {
				var sector = levelHelper.getSectorByPosition(testL, testS);
                var levelOrdinal = playerActionFunctions.gameState.getLevelOrdinal(testL);
                var levelSafe = fightStrength >= EnemyConstants.getRequiredStrength(levelOrdinal, groundLevelOrdinal, totalLevels);
                var latestCampLevelOrdinal = latestCampLevel ? playerActionFunctions.gameState.getLevelOrdinal(latestCampLevel) : 0;
				if (sector) {
					var sectorCamp = sector.has(CampComponent);
					if (!nearestCampSector && sectorCamp) nearestCampSector = sector;
                    
                    if (sectorCamp && latestCampLevelOrdinal < levelOrdinal) latestCampLevel = testL;
                    
                    if (levelSafe) {
                        var sectorUnscouted = !sector.get(SectorStatusComponent).scouted;
                        var sectorUnscoutedLocales = levelHelper.getSectorLocalesForPlayer(sector).length > 0;
                        var sectorCampable = sector.get(SectorStatusComponent).canBuildCamp && !sectorCamp;
					
                        if (!nearestCampableSector && sectorCampable) nearestCampableSector = sector;
                        if (!nearestUnscoutedLocaleSector && sectorUnscoutedLocales) nearestUnscoutedLocaleSector = sector;
                        if (!nearestUnscoutedSector && sectorUnscouted) nearestUnscoutedSector = sector;
                    }
				}
			}
			
			var checkLevel = function (testL) {
                if (levelHelper.isLevelUnlocked(testL)) {
                    for (var sd = 0; sd < 20; sd++) {
                        checkSector(testL, s + sd);
                        checkSector(testL, s - sd);
                    }
                }
			}
			
			for (var ld = 0; ld < 30; ld++) {
				checkLevel(l + ld);
				checkLevel(l - ld);
			}
            
            this.latestCampLevel = latestCampLevel;
			
			// if possible, move to a campable sector
			if (nearestCampableSector) {
				l = nearestCampableSector.get(PositionComponent).level;
				s = nearestCampableSector.get(PositionComponent).sector;
			} else if (nearestUnscoutedSector) {
				l = nearestUnscoutedSector.get(PositionComponent).level;
				s = nearestUnscoutedSector.get(PositionComponent).sector;
			} else if (nearestUnscoutedLocaleSector) {
				l = nearestUnscoutedLocaleSector.get(PositionComponent).level;
				s = nearestUnscoutedLocaleSector.get(PositionComponent).sector;
			} else {
				l = nearestCampSector.get(PositionComponent).level;
				s = nearestCampSector.get(PositionComponent).sector;
			}
			
            if (playerPosition.level !== l || playerPosition.sector !== s) {
                this.printStep("move to " + l + "-" + s);
                playerPosition.level = l;
                playerPosition.sector = s;
                return true;
            } else {
                return false;
            }
		},
		
		buildCamp: function (isExpress) {
            var currentStorage = this.playerActionFunctions.resourcesHelper.getCurrentStorage();
            var hasFood = currentStorage.resources.getResource(resourceNames.water) > 20;
            var hasWater = currentStorage.resources.getResource(resourceNames.food) > 20;
			if (hasFood && hasWater && this.playerActionFunctions.playerActionsHelper.checkAvailability("build_out_camp", false)) {
                this.printStep("build camp");
				this.playerActionFunctions.buildCamp();
                return true;
			}
            return false;
		},
        
        buildOutImprovements: function (isExpress) {
            var featuresComponent = this.playerActionFunctions.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			var improvementsComponent = this.playerActionFunctions.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
            var currentStorage = this.playerActionFunctions.resourcesHelper.getCurrentStorage();
            
            // traps & buckets
            var hasMetal = currentStorage.resources.getResource(resourceNames.metal) > 20;
            var hasVision = this.playerStatsNodes.head.vision.value >= PlayerActionConstants.requirements.build_out_collector_water.vision;
            if (hasMetal && hasVision) {
                var discoveredResources = this.sectorHelper.getLocationDiscoveredResources();
                var hasFoundFood = featuresComponent.resources.food > 0 && discoveredResources.indexOf("food") >= 0;
                var hasFoundWater = featuresComponent.resources.water > 0 && discoveredResources.indexOf("water") >= 0;
                if (hasFoundWater && improvementsComponent.getCount(improvementNames.collector_water) < 1) {
                    this.playerActionFunctions.buildBucket();
                    return true;
                }
                
                if (hasFoundFood && improvementsComponent.getCount(improvementNames.collector_food) < 1) {
                    this.playerActionFunctions.buildTrap();
                    return true;
                }
            }
            
            return false;
        },
		
		scout: function (isExpress) {
            if (this.playerActionFunctions.playerActionsHelper.checkAvailability("scout")) {
                this.printStep("scout");
				this.playerActionFunctions.scout();
                return true;
            }
            
			var sectorLocalesComponent = this.playerActionFunctions.playerLocationNodes.head.entity.get(SectorLocalesComponent);
			var sectorStatusComponent = this.playerActionFunctions.playerLocationNodes.head.entity.get(SectorStatusComponent);
			for (var i = 0; i < sectorLocalesComponent.locales.length; i++) {
				var locale = sectorLocalesComponent.locales[i];
                if (!sectorStatusComponent.isLocaleScouted(i)) {
                    var action = "scout_locale_" + i;
                    if (this.playerActionFunctions.playerActionsHelper.checkAvailability(action)) {
                        this.playerActionFunctions.scoutLocale(i);
                        this.printStep("scout locale " + locale.type);
                        return;
                    }
                }
            }
            
            return false;
		},
		
		scavenge: function (isExpress) {
            if (this.playerActionFunctions.playerActionsHelper.checkAvailability("scavenge")) {
                var currentStorage = this.playerActionFunctions.resourcesHelper.getCurrentStorage();
                var bagFull =
                    currentStorage.resources.getResource(resourceNames.water) >= currentStorage.storageCapacity * 0.8 &&
                    currentStorage.resources.getResource(resourceNames.food) >= currentStorage.storageCapacity * 0.8 &&
                    currentStorage.resources.getResource(resourceNames.metal) >= currentStorage.storageCapacity * 0.95;
                if (!bagFull) {
                    this.printStep("scavenge");
    				this.playerActionFunctions.scavenge();
                    return true;
                }
            }
            return false;
		},
        
        idleOut: function (isExpress) {
            var hasVision = this.playerStatsNodes.head.vision.value >= this.playerStatsNodes.head.vision.maximum;
            if (!hasVision) {
                if (isExpress) this.playerStatsNodes.head.vision.value = this.playerStatsNodes.head.vision.maximum;
                else this.printStep("waiting for vision");
                return true;
            }
            return false;
        },
        
        switchCamps: function (isExpress) {
            var playerPosition = this.playerActionFunctions.playerPositionNodes.head.position;
            var currentLevelOrdinal = this.playerActionFunctions.gameState.getLevelOrdinal(playerPosition.level);
            
            var campPosition;
            var campOrdinal;
            var campOrdinalDiff = 100;
            var nextCampOrdinalDiff = 100;
            var nextCamp = null;
            for (var node = this.playerActionFunctions.campNodes.head; node; node = node.next) {
                campPosition = node.position;
                campOrdinal = this.playerActionFunctions.gameState.getLevelOrdinal(campPosition.level);
                if (campOrdinal < currentLevelOrdinal) {
                    campOrdinalDiff = currentLevelOrdinal - campOrdinal;
                    if (campOrdinalDiff < nextCampOrdinalDiff) {
                        nextCamp = node;
                        nextCampOrdinalDiff = campOrdinalDiff;
                    }
                }
            }
            
            if (nextCamp) {
                this.playerActionFunctions.moveToCamp(nextCamp.position.level);
                return true;
            }
            
            this.playerActionFunctions.moveToCamp(this.latestCampLevel);
            
            return false;
        },
        
        manageCamp: function (isExpress) {
            var campComponent = this.playerActionFunctions.playerLocationNodes.head.entity.get(CampComponent);
            if (campComponent) {
                var improvementsComponent = this.playerActionFunctions.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
                var currentStorage = this.playerActionFunctions.resourcesHelper.getCurrentStorage();
                
                // cheat population
                var maxPopulation = improvementsComponent.getCount(improvementNames.house) * CampConstants.POPULATION_PER_HOUSE;
                maxPopulation += improvementsComponent.getCount(improvementNames.house2) * CampConstants.POPULATION_PER_HOUSE2;
                if (isExpress && campComponent.population < maxPopulation) this.playerActionFunctions.cheat("pop");
                
                // assign workers
                if (campComponent.getFreePopulation() > 0 || this.refreshWorkers) {
                    var currentRope = currentStorage.resources.getResource(resourceNames.rope);
                    var maxStorage = currentStorage.storageCapacity;
                    
                    var canRope = this.hasUpgrade(this.upgradesHelper.getUpgradeIdForWorker("weaver"));
                    var pop = campComponent.population;
                    
                    var trappers = Math.floor(pop / 2);
                    var waters = Math.floor(pop / 4);
                    var specialistPop = Math.floor(pop - trappers - waters);
                    
                    var ropers = canRope && currentRope < maxStorage ? Math.min(specialistPop, (currentRope < 30 ? 2 : 1)) : 0;
                    var chemists = 0;
                    var apothecaries = 0;
                    var smiths = 0;
                    var concrete = 0;
                    var soldiers = 0;
                    var scavengers = Math.floor(pop - trappers - waters - ropers - chemists - apothecaries - smiths - concrete - soldiers);
                    
                    this.playerActionFunctions.assignWorkers(scavengers, trappers, waters, ropers, chemists, apothecaries, smiths, concrete, soldiers);
                    this.printStep("assigned workers");
                    this.refreshWorkers = false;
                    return true;
                }
                
                // use improvements
                if (this.playerActionFunctions.playerActionsHelper.checkAvailability("use_in_campfire")) {
                    this.playerActionFunctions.useCampfire();
                    this.printStep("used campfire");
                    return true;
                }
                
                if (this.playerActionFunctions.playerActionsHelper.checkAvailability("use_in_hospital")) {
                    this.playerActionFunctions.useHospital();
                    this.printStep("used hospital");
                    return true;
                }
            }
            return false;
        },
        
        buildPassages: function (isExpress) {
            var projects = this.levelHelper.getAvailableProjectsForCamp(this.playerActionFunctions.playerLocationNodes.head.entity, this.playerActionFunctions);
            for (var i = 0; i < projects.length; i++) {
                var project = projects[i];
                var action = project.action;
                var sectorEntity = this.levelHelper.getSectorByPosition(project.level, project.sector);
                var available = this.playerActionFunctions.playerActionsHelper.checkAvailability(action, false, sectorEntity);
                if (available) {
                    var sectorId = project.level + "-" + project.sector;
                    var baseId = this.playerActionFunctions.playerActionsHelper.getBaseActionID(action);
                    var func = this.playerActionFunctions.uiFunctions.actionToFunctionMap[baseId];
                    func.call(this.playerActionFunctions, sectorId);
                    this.printStep("build project: " + project.name);
                    return true;
                }
            }
            return false;
        },
        
        buildInImprovements: function (isExpress) {
			var improvementsComponent = this.playerActionFunctions.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
            
            if (this.playerActionFunctions.playerActionsHelper.checkAvailability("build_in_tradingPost")) {
                this.printStep("build trading post");
                this.playerActionFunctions.buildTradingPost();
                return true;
            }

            if (this.playerActionFunctions.playerActionsHelper.checkAvailability("build_in_hospital")) {
                this.printStep("build hospital");
                this.playerActionFunctions.buildHospital();
                return true;
            }
            
            if (this.playerActionFunctions.playerActionsHelper.checkAvailability("build_in_house")) {
                this.printStep("build house");
                this.playerActionFunctions.buildHouse();
                return true;
            }
            
            if (this.playerActionFunctions.playerActionsHelper.checkAvailability("build_in_storage")) {
                this.printStep("build storage");
                this.playerActionFunctions.buildStorage();
                return true;
            }
            
            if (this.playerActionFunctions.playerActionsHelper.checkAvailability("build_in_darkfarm")) {
                this.printStep("build darkfarm");
                this.playerActionFunctions.buildDarkFarm();
                return true;
            }
            
            if (this.playerActionFunctions.playerActionsHelper.checkAvailability("build_in_campfire")) {
                this.printStep("build campfire");
                this.playerActionFunctions.buildCampfire();
                return true;
            }
            
            if (this.playerActionFunctions.playerActionsHelper.checkAvailability("build_in_lights")) {
                this.printStep("build lights");
                this.playerActionFunctions.buildLights();
                return true;
            }
            
            if (this.playerActionFunctions.playerActionsHelper.checkAvailability("build_in_library")) {
                this.printStep("build library");
                this.playerActionFunctions.buildLibrary();
                return true;
            }
            
            if (this.playerActionFunctions.playerActionsHelper.checkAvailability("build_in_market")) {
                this.printStep("build market");
                this.playerActionFunctions.buildMarket();
                return true;
            }
            
            return false;
        },
        
        unlockUpgrades: function (isExpress) {
            var unlocked = false;
            var upgradeDefinition;
            var hasBlueprintUnlocked;
            var hasBlueprintNew;
            var isAvailable;
			for (var id in UpgradeConstants.upgradeDefinitions) {
				upgradeDefinition = UpgradeConstants.upgradeDefinitions[id];
				if (!this.playerActionFunctions.tribeUpgradesNodes.head.upgrades.hasBought(id)) {
					hasBlueprintUnlocked = this.playerActionFunctions.tribeUpgradesNodes.head.upgrades.hasAvailableBlueprint(id);
					hasBlueprintNew = this.playerActionFunctions.tribeUpgradesNodes.head.upgrades.hasNewBlueprint(id);
					isAvailable = this.playerActionFunctions.playerActionsHelper.checkAvailability(id);
                    if (hasBlueprintNew) {
                        this.playerActionFunctions.unlockUpgrade(upgradeDefinition.id);
                        this.printStep("unlocked upgrade with blueprint " + upgradeDefinition.name);
                        unlocked = true;
                    } else if (isAvailable) {
                        this.playerActionFunctions.buyUpgrade(upgradeDefinition.id);
                        this.printStep("bought upgrade " + upgradeDefinition.name);
                        this.refreshWorkers = true;
                        unlocked = true;
                    }
                }
            }
            return unlocked;
        },
		
		craftItems: function (isExpress) {
            var itemList;
			var itemDefinition;
			for (var type in ItemConstants.itemDefinitions) {
				itemList = ItemConstants.itemDefinitions[type];
				for (var i in itemList) {
					itemDefinition = itemList[i];
					if (itemDefinition.craftable) {
                        if (this.itemsNodes.head.items.getCountById(itemDefinition.id) < 1) {
                            if (this.playerActionFunctions.playerActionsHelper.checkAvailability("craft_" + itemDefinition.id)) {
                                this.printStep("craft " + itemDefinition.name);
                                this.playerActionFunctions.craftItem(itemDefinition.id);
                                return true;
                            }
                        }
                    }
                }
            }
            return false;
		},
        
        idleIn: function (isExpress) {
            return Math.random() > 0.8;
        },
        
        printStep: function (message) {
            var playerPosition = this.playerActionFunctions.playerPositionNodes.head.position;
            var status = "idle";
            if (this.autoPlayNodes.head.autoPlay.isExploring) status = "exploring";
            if (this.autoPlayNodes.head.autoPlay.isManagingCamps) status = "managing";
            var isExpress = this.autoPlayNodes.head.autoPlay.express;
            console.log("autoplay (" + isExpress + ") (" + status + ") " + playerPosition.level + "-" + playerPosition.sector + ": " + message);
        },
        
        hasUpgrade: function (upgradeId) {
            return this.playerActionFunctions.tribeUpgradesNodes.head.upgrades.hasBought(upgradeId);
        },
        
    });

    return AutoPlaySystem;
});
