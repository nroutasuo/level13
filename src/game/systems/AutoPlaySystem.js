// A system to autoplay the game - mostly useful for quickly cheating to a semi-realistic later state of the game
define(['ash',
	'game/constants/ItemConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/PlayerStatConstants',
	'game/constants/WorldCreatorConstants',
	'game/constants/BagConstants',
	'game/nodes/player/AutoPlayNode',
	'game/nodes/player/PlayerStatsNode',
    'game/nodes/player/ItemsNode',
    'game/nodes/FightNode',
	'game/components/common/PositionComponent',
	'game/components/common/CampComponent',
	'game/components/common/ResourcesComponent',
	'game/components/player/PlayerActionComponent',
	'game/components/player/PlayerActionResultComponent',
	'game/components/player/ItemsComponent',
	'game/components/player/BagComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/sector/SectorLocalesComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/type/LevelComponent',
    'game/constants/CampConstants',
    'game/constants/UpgradeConstants',
    'game/constants/EnemyConstants',
    'game/constants/FightConstants',
    'game/vos/ResourcesVO',
    'game/vos/PositionVO'
], function (Ash,
    ItemConstants, PlayerActionConstants, PlayerStatConstants, WorldCreatorConstants, BagConstants,
	AutoPlayNode, PlayerStatsNode, ItemsNode, FightNode,
    PositionComponent, CampComponent, ResourcesComponent, PlayerActionComponent, PlayerActionResultComponent, ItemsComponent, BagComponent, 
    SectorStatusComponent, SectorLocalesComponent, SectorImprovementsComponent,
	LevelComponent,
    CampConstants, UpgradeConstants, EnemyConstants, FightConstants, ResourcesVO, PositionVO) {
    
	var AutoPlaySystem = Ash.System.extend({
		
		playerActionFunctions: null,
		cheatFunctions: null,
		levelHelper: null,
        sectorHelper: null,
        upgradesHelper: null,
		
		autoPlayNodes: null,
		playerStatsNodes: null,
		itemsNodes: null,
        fightNodes: null,
        
        latestCampLevel: 0,
	    
		constructor: function (playerActionFunctions, cheatFunctions, levelHelper, sectorHelper, upgradesHelper) {
			this.playerActionFunctions = playerActionFunctions;
            this.cheatFunctions = cheatFunctions;
			this.levelHelper = levelHelper;
            this.sectorHelper = sectorHelper;
            this.upgradesHelper = upgradesHelper;
        },

        addToEngine: function (engine) {
			this.autoPlayNodes = engine.getNodeList(AutoPlayNode);
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			this.itemsNodes = engine.getNodeList(ItemsNode);
            this.fightNodes = engine.getNodeList(FightNode);
            
            this.autoPlayNodes.nodeAdded.add(this.onAutoPlayNodeAdded, this);
            this.autoPlayNodes.nodeRemoved.add(this.onAutoPlayNodeRemoved, this);
        },

        removeFromEngine: function (engine) {
            this.autoPlayNodes.nodeAdded.remove(this.onAutoPlayNodeAdded, this);
            this.autoPlayNodes.nodeRemoved.remove(this.onAutoPlayNodeRemoved, this);
            
			this.autoPlayNodes = null;
			this.playerStatsNodes = null;
			this.itemsNodes = null;
            this.fightNodes = null;
		},
        
        onAutoPlayNodeAdded: function (node) {
            var inCamp = this.playerStatsNodes.head.entity.get(PositionComponent).inCamp;
            node.autoPlay.isExploring = !inCamp;
            node.autoPlay.isManagingCamps = inCamp;
			this.latestCampLevel = this.playerActionFunctions.nearestCampNodes.head ? this.playerActionFunctions.nearestCampNodes.head.entity.get(PositionComponent).level : -100;
            if (node.autoPlay.express) this.cheatFunctions.cheat("speed 25");
        },
        
        onAutoPlayNodeRemoved: function (node) {
            if (node.autoPlay.express) this.cheatFunctions.cheat("speed 1");
        },

        update: function (time) {
			if (!this.autoPlayNodes.head)
                return;
            
            var isExpress = this.autoPlayNodes.head.autoPlay.express;
            var fightNode = this.fightNodes.head;

            var didSomething = false;

            // TODO make more realistic movement & expeditions

            if (this.autoPlayNodes.head.autoPlay.isExploring) {
                var maxStamina = this.playerStatsNodes.head.stamina.health * PlayerStatConstants.HEALTH_TO_STAMINA_FACTOR;
                var minStamina = this.playerActionFunctions.nearestCampNodes.head ? Math.min(100, maxStamina / 2) : 10;
                var hasStamina = minStamina < this.playerStatsNodes.head.stamina.stamina;
                
                didSomething = didSomething || this.buildCamp(isExpress);
                didSomething = didSomething || this.buildOutImprovements(isExpress);
                didSomething = didSomething || this.scout(isExpress);
                didSomething = didSomething || this.useOutImprovements(isExpress);
                if (hasStamina) {
                    didSomething = didSomething || this.craftItems(isExpress);
                    didSomething = didSomething || this.scavenge(isExpress);
                    didSomething = didSomething || this.idleOut(isExpress);
                    didSomething = didSomething || this.move(isExpress);
                }
            }

            if (this.autoPlayNodes.head.autoPlay.isManagingCamps && !fightNode) {
                didSomething = didSomething || this.useInImprovements(isExpress);
                didSomething = didSomething || this.manageWorkers(isExpress);
                didSomething = didSomething || this.buildPassages(isExpress);
                didSomething = didSomething || this.buildInImprovements(isExpress);
                didSomething = didSomething || this.unlockUpgrades(isExpress);
                didSomething = didSomething || this.craftItems(isExpress);
                didSomething = didSomething || this.idleIn(isExpress);
                didSomething = didSomething || this.switchCamps(isExpress);
            }

            this.resetTurn(isExpress, fightNode !== null);
            if (!didSomething) {
                didSomething = this.switchMode();
            }
            
            if (!didSomething)
                this.printStep("idle");
		},
		
		resetTurn: function (isExpress, isFight) {
            if (this.playerStatsNodes.head.entity.has(PlayerActionResultComponent)) {
                this.handleInventory();
                $("#info-ok").click();
            }
            if (!isFight) this.playerActionFunctions.uiFunctions.popupManager.closeAllPopups();
            if (isExpress) {
                this.playerActionFunctions.cheatFunctions("stamina");
            }
		},
        
        switchMode: function () {
            if (!this.playerActionFunctions.gameState.unlockedFeatures.camp)
                return false;
            
            var busyComponent = this.playerStatsNodes.head.entity.get(PlayerActionComponent);
            if (busyComponent && busyComponent.isBusy())
                return false;
            
            this.printStep("switch mode");
            
            var wasExploring = this.autoPlayNodes.head.autoPlay.isExploring;
            if (wasExploring && this.latestCampLevel > -100) {
                // this.printStep("enter camp " + this.latestCampLevel);
                this.playerActionFunctions.moveToCamp(this.latestCampLevel);
                this.playerActionFunctions.uiFunctions.showTab(this.playerActionFunctions.uiFunctions.elementIDs.tabs.in);
            } else {
                // this.printStep("leave camp");
                if (this.playerActionFunctions.nearestCampNodes.head) {
                    var currentStorage = this.playerActionFunctions.resourcesHelper.getCurrentStorage();
                    var selectedResVO = new ResourcesVO();
                    selectedResVO.setResource(resourceNames.food, Math.min(10, currentStorage.resources.getResource(resourceNames.food)));
                    selectedResVO.setResource(resourceNames.water, Math.min(10, currentStorage.resources.getResource(resourceNames.water)));
                    this.playerActionFunctions.moveResFromCampToBag(selectedResVO);
                    this.playerActionFunctions.leaveCamp();
                }
                this.playerActionFunctions.uiFunctions.showTab(this.playerActionFunctions.uiFunctions.elementIDs.tabs.out);
            }
            
            this.autoPlayNodes.head.autoPlay.isExploring = !this.autoPlayNodes.head.autoPlay.isExploring;
            this.autoPlayNodes.head.autoPlay.isManagingCamps = !this.autoPlayNodes.head.autoPlay.isExploring;
            
            return true;
        },

		move: function (isExpress) {
            var playerPosition = this.playerActionFunctions.playerPositionNodes.head.position;
			var l = playerPosition.level;
			var levelHelper = this.levelHelper;
            var playerActionFunctions = this.playerActionFunctions;
            
            var itemsComponent = this.itemsNodes.head.items;
            var fightStrength = FightConstants.getPlayerStrength(this.playerStatsNodes.head.stamina, itemsComponent);
            var groundLevelOrdinal = this.playerActionFunctions.gameState.getGroundLevelOrdinal();
            var totalLevels = this.playerActionFunctions.gameState.getTotalLevels();
			
			var nearestCampableSector = null;
			var nearestUnscoutedLocaleSector = null;
			var nearestUnscoutedSector = null;
            var nearestUnclearedSector = null;
			var nearestCampSector = null;
            
            var latestCampLevel = -100;
			
			// TODO make realistic expeditions instead of jumping directly to sectors of interest
			
			var checkSector = function (testL, testSX, testSY) {
				var sector = levelHelper.getSectorByPosition(testL, testSX, testSY);
                var levelOrdinal = playerActionFunctions.gameState.getLevelOrdinal(testL);
                var levelSafe = true;//fightStrength >= EnemyConstants.getRequiredStrength(levelOrdinal, groundLevelOrdinal, totalLevels);
                var latestCampLevelOrdinal = playerActionFunctions.gameState.getLevelOrdinal(latestCampLevel);
				if (sector) {
					var sectorCamp = sector.has(CampComponent);
					if (!nearestCampSector && sectorCamp) nearestCampSector = sector;
                    
                    if (sectorCamp && latestCampLevelOrdinal < levelOrdinal) latestCampLevel = testL;
                    
                    if (levelSafe) {
                        var sectorUncleared = levelHelper.getSectorUnclearedWorkshopCount(sector) > 0;
                        var sectorUnscouted = !sector.get(SectorStatusComponent).scouted;
                        var sectorUnscoutedLocales = levelHelper.getSectorLocalesForPlayer(sector).length > 0;
                        var sectorCampable = sector.get(SectorStatusComponent).canBuildCamp && !sectorCamp;
                        
                        // TODO add check for vision protection for sunlit levels
                        var canScoutSector = itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.light) > 0;
					
                        if (!nearestCampableSector && sectorCampable) nearestCampableSector = sector;
                        if (!nearestUnscoutedLocaleSector && sectorUnscoutedLocales) nearestUnscoutedLocaleSector = sector;
                        if (!nearestUnscoutedSector && sectorUnscouted && canScoutSector) nearestUnscoutedSector = sector;
                        if (!nearestUnclearedSector && sectorUncleared) nearestUnclearedSector = sector;
                    }
				}
			}
			
			var checkLevel = function (testL) {
                if (levelHelper.isLevelUnlocked(testL)) {
					var levelComponent = levelHelper.getLevelEntityForPosition(testL).get(LevelComponent);
					var levelVO = levelComponent.levelVO;
					// spiralling search:
					var checkPos = playerPosition.clone();
					var spiralRadius = 0
					var spiralEdgeLength;
					while ((checkPos.sectorX >= levelVO.minX && checkPos.sectorX <= levelVO.maxX) || (checkPos.sectorY >= levelVO.minY && checkPos.sectorY <= levelVO.maxY)) {
						spiralEdgeLength = spiralRadius * 2 + 1;
						checkPos = new PositionVO(playerPosition.level, playerPosition.sectorX - spiralRadius, playerPosition.sectorY - spiralRadius);
						for (var spiralEdge = 0; spiralEdge < 4; spiralEdge++) {
							for (var spiralEdgeI = 0; spiralEdgeI < spiralEdgeLength; spiralEdgeI++) {
								if (spiralEdgeI > 0) {
									if (spiralEdge === 0) checkPos.sectorX++;
									if (spiralEdge === 1) checkPos.sectorY++;
									if (spiralEdge === 2) checkPos.sectorX--;
									if (spiralEdge === 3) checkPos.sectorY--;
								}
								checkSector(testL, checkPos.sectorX, checkPos.sectorY);
							}
						}
						spiralRadius++;
					}
                }
			}
			
			for (var ld = 0; ld < WorldCreatorConstants.LEVEL_NUMBER_MAX; ld++) {
				checkLevel(l + ld);
				if (ld > 0) checkLevel(l - ld);
			}
            
            if (latestCampLevel > -100) {
				this.latestCampLevel = latestCampLevel;
				console.log("set latest camp level: " + latestCampLevel);
			}
			
			var isBagFull = this.isBagFull();
            var hasStamina = this.playerStatsNodes.head.stamina.stamina > 50;
            
			if (nearestCampableSector) {
				return this.moveToSector(nearestCampableSector, "campable sector");
			} else if (nearestUnscoutedSector && Math.random() > 0.25) {
				return this.moveToSector(nearestUnscoutedSector, "unscouted sector");
			} else if (nearestUnscoutedLocaleSector && Math.random() > 0.25) {
				return this.moveToSector(nearestUnscoutedLocaleSector, "unscouted locale");
            } else if (nearestUnclearedSector && Math.random() > 0.1) {
				return this.moveToSector(nearestUnclearedSector, "uncleared sector");
			} else if (nearestCampSector) {
				return this.moveToSector(nearestCampSector, "nearest camp sector");
			} else {
				return false;
			}
		},
			
        moveToSector: function (sectorEntity, reason) {
            var playerPosition = this.playerActionFunctions.playerPositionNodes.head.position;
			var sectorPosition = sectorEntity.get(PositionComponent);
			if (playerPosition.level !== sectorPosition.level || playerPosition.sectorId() !== sectorPosition.sectorId()) {
                this.printStep("move to " + sectorPosition + " (" + reason + ")");
                playerPosition.setTo(sectorPosition);
                return true;
            }
			
            return false;
		},
		
		buildCamp: function (isExpress) {
			if (this.playerActionFunctions.playerActionsHelper.checkAvailability("build_out_camp", false)) {
                this.printStep("build camp");
				this.playerActionFunctions.buildCamp();
                return true;
			}
            return false;
		},
        
        buildOutImprovements: function (isExpress) {
			var improvementsComponent = this.playerActionFunctions.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
            
            // traps & buckets
            if (this.playerActionFunctions.playerActionsHelper.checkAvailability("build_out_collector_water")) {
                if (improvementsComponent.getCount(improvementNames.collector_water) < 1) {
                    this.printStep("build bucket");
                    this.playerActionFunctions.buildBucket();
                    return true;
                }
            }

            if (this.playerActionFunctions.playerActionsHelper.checkAvailability("build_out_collector_food")) {
                if (improvementsComponent.getCount(improvementNames.collector_food) < 1) {
                    this.printStep("build trap");
                    this.playerActionFunctions.buildTrap();
                    return true;
                }
            }
            
            return false;
        },
        
        useOutImprovements: function (isExpress) {
            var bagFull = this.isBagFull();
            if (!bagFull && this.playerActionFunctions.playerActionsHelper.checkAvailability("use_out_collector_food")) {
                this.printStep("collect food");
                this.playerActionFunctions.collectFood();
                return true;
            }
            if (!bagFull && this.playerActionFunctions.playerActionsHelper.checkAvailability("use_out_collector_water")) {
                this.printStep("collect water");
                this.playerActionFunctions.collectWater();
                return true;
            }
            if (!bagFull && this.playerActionFunctions.playerActionsHelper.checkAvailability("use_spring")) {
                this.printStep("stop by a spring");
                this.playerActionFunctions.useSpring();
                return true;
            }
            return false;
        },
		
		scout: function (isExpress) {
            var sector = this.playerActionFunctions.playerLocationNodes.head.entity;
            var itemsComponent = this.itemsNodes.head.items;
			var fightStrength = FightConstants.getPlayerStrength(this.playerStatsNodes.head.stamina, itemsComponent);
            var positionComponent = sector.get(PositionComponent);
            var levelOrdinal = this.playerActionFunctions.gameState.getLevelOrdinal(positionComponent.level);
            var totalLevels = this.playerActionFunctions.gameState.getTotalLevels();
            var groundLevelOrdinal = this.playerActionFunctions.gameState.getGroundLevelOrdinal();
			
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
                    var action = "scout_locale_" + locale.getCategory() + "_" + i;
                    if (this.playerActionFunctions.playerActionsHelper.checkAvailability(action)) {
                        this.playerActionFunctions.scoutLocale(i);
                        this.printStep("scout locale " + locale.type);
                        return true;
                    }
                }
            }
            
            return false;
		},
        
		scavenge: function (isExpress) {
            if (this.playerActionFunctions.playerActionsHelper.checkAvailability("scavenge")) {
                var bagFull = this.isBagFull();
                if (!bagFull) {
                    this.printStep("scavenge");
    				this.playerActionFunctions.startAction("scavenge");
                    return true;
                }
            }
            return false;
		},
        
        idleOut: function (isExpress) {
            if (this.playerActionFunctions.nearestCampNodes.head && this.playerStatsNodes.head.stamina.stamina < 10)
                return false;
            
            if (this.isBagFull())
                return false;
            
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
            
            if (this.latestCampLevel > -100) {
                this.playerActionFunctions.moveToCamp(this.latestCampLevel);
			}
            
            return false;
        },
        
        useInImprovements: function (isExpress) { 
            var campComponent = this.playerActionFunctions.playerLocationNodes.head.entity.get(CampComponent);
            if (!campComponent)
                return false;
            
            if (this.playerActionFunctions.playerActionsHelper.checkAvailability("use_in_home")) {
                var maxStamina = this.playerStatsNodes.head.stamina.health * PlayerStatConstants.HEALTH_TO_STAMINA_FACTOR;
                if (this.playerStatsNodes.head.stamina.stamina < maxStamina / 3 * 2) {
                    this.playerActionFunctions.useHome();
                    this.printStep("rested");
                    return true;
                }
            }
            
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

            if (this.playerActionFunctions.playerActionsHelper.checkAvailability("use_in_inn") && Math.random() < 0.05) {
                var newFollower = this.playerActionFunctions.useInn(true);
                if (newFollower) {
                    this.printStep("used inn");
                    return true;
                }
            }
        },
        
        manageWorkers: function (isExpress) {
            var campComponent = this.playerActionFunctions.playerLocationNodes.head.entity.get(CampComponent);
            if (!campComponent)
                return false;
            
            var improvementsComponent = this.playerActionFunctions.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
            var playerPosition = this.playerActionFunctions.playerPositionNodes.head.position;
            var currentStorage = this.playerActionFunctions.resourcesHelper.getCurrentStorage();

            // cheat population
            var maxPopulation = improvementsComponent.getCount(improvementNames.house) * CampConstants.POPULATION_PER_HOUSE;
            maxPopulation += improvementsComponent.getCount(improvementNames.house2) * CampConstants.POPULATION_PER_HOUSE2;
            if (isExpress && campComponent.population < maxPopulation) this.playerActionFunctions.cheatFunctions("pop");

            // assign workers
            if (campComponent.getFreePopulation() > 0 || this.refreshWorkers) {
                var currentFood = currentStorage.resources.getResource(resourceNames.food);
                var currentWater = currentStorage.resources.getResource(resourceNames.water);
                var currentRope = currentStorage.resources.getResource(resourceNames.rope);
                var currentTools = currentStorage.resources.getResource(resourceNames.tools);
                var maxStorage = currentStorage.storageCapacity;

                var canRope = this.hasUpgrade(this.upgradesHelper.getUpgradeIdForWorker("rope-maker"));
                var upgradesComponent = this.playerActionFunctions.tribeUpgradesNodes.head.upgrades;

                var maxApothecaries = improvementsComponent.getCount(improvementNames.apothecary) * CampConstants.getApothecariesPerShop(this.upgradesHelper.getBuildingUpgradeLevel(improvementNames.apothecary, upgradesComponent));
                var maxConcrete = improvementsComponent.getCount(improvementNames.cementmill) * CampConstants.getWorkersPerMill(this.upgradesHelper.getBuildingUpgradeLevel(improvementNames.cementmill, upgradesComponent));
                var maxSmiths = improvementsComponent.getCount(improvementNames.smithy) * CampConstants.getSmithsPerSmithy(this.upgradesHelper.getBuildingUpgradeLevel(improvementNames.smithy, upgradesComponent));
                var maxSoldiers = improvementsComponent.getCount(improvementNames.barracks) * CampConstants.getSoldiersPerBarracks(this.upgradesHelper.getBuildingUpgradeLevel(improvementNames.barracks, upgradesComponent));
                var maxChemists = this.levelHelper.getLevelClearedWorkshopCount(playerPosition.level, resourceNames.fuel) * CampConstants.CHEMISTS_PER_WORKSHOP;

                var pop = campComponent.population;

                var trappers = Math.floor(pop / (currentFood > maxStorage * 0.5 ? 3 : 2));
                var waters = Math.max(1, Math.floor(pop / (currentWater > maxStorage * 0.5 ? 5 : 4)));
                var specialistPop = Math.floor(pop - trappers - waters);

                var ropers = canRope && currentRope < maxStorage ? Math.min(specialistPop, (currentRope < 30 ? 2 : 1)) : 0;
                var chemists = Math.min(1, specialistPop - ropers, maxChemists);
                var smiths = Math.min((currentTools > maxSmiths * 0.9 ? 0 : 1), specialistPop - ropers - chemists, maxSmiths);
                var apothecaries = Math.min(1, specialistPop - ropers - chemists - smiths, maxApothecaries);
                var concrete = Math.min(1, specialistPop - ropers - chemists - smiths - apothecaries, maxConcrete);
                var soldiers = Math.min(1, specialistPop - ropers - chemists - smiths - apothecaries - concrete, maxSoldiers);
                var scavengers = Math.floor(pop - trappers - waters - ropers - chemists - apothecaries - smiths - concrete - soldiers);

                this.playerActionFunctions.assignWorkers(scavengers, trappers, waters, ropers, chemists, apothecaries, smiths, concrete, soldiers);
                this.printStep("assigned workers (" + scavengers + ", " + trappers + ", " + waters + ", " + ropers + ", " + chemists + ", " + apothecaries + ", " + smiths + ", " + concrete + ", " + soldiers + ")");
                this.refreshWorkers = false;
                return true;
            }
            return false;
        },
        
        buildPassages: function (isExpress) {
            var projects = this.levelHelper.getAvailableProjectsForCamp(this.playerActionFunctions.playerLocationNodes.head.entity, this.playerActionFunctions);
            for (var i = 0; i < projects.length; i++) {
                var project = projects[i];
                var action = project.action;
                var sectorEntity = this.levelHelper.getSectorByPosition(project.level, project.position.sectorX, project.position.sectorY);
                var available = this.playerActionFunctions.playerActionsHelper.checkAvailability(action, false, sectorEntity);
                if (available) {
                    var sectorId = project.level + "." + project.sector;
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
            
            if (this.playerActionFunctions.playerActionsHelper.checkAvailability("build_in_house2")) {
                this.printStep("build house2");
                this.playerActionFunctions.buildHouse2();
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
            
            if (this.playerActionFunctions.playerActionsHelper.checkAvailability("build_in_smithy")) {
                this.printStep("build smithy");
                this.playerActionFunctions.buildSmithy();
                this.refreshWorkers = true;
                return true;
            }
            
            if (this.playerActionFunctions.playerActionsHelper.checkAvailability("build_in_inn")) {
                this.printStep("build inn");
                this.playerActionFunctions.buildInn();
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
				if (!this.playerActionFunctions.tribeUpgradesNodes.head.upgrades.hasUpgrade(id)) {
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
                        if (this.itemsNodes.head.items.getCountById(itemDefinition.id, true) < 1) {
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
        
        handleInventory: function () {
            var inCamp = this.playerStatsNodes.head.entity.get(PositionComponent).inCamp;
            var bagComponent = this.playerStatsNodes.head.entity.get(BagComponent);
            var resultVO = this.playerStatsNodes.head.entity.get(PlayerActionResultComponent).pendingResultVO;
            var playerAllItems = this.playerStatsNodes.head.entity.get(ItemsComponent).getAll(inCamp);
            var playerResources = this.playerStatsNodes.head.entity.get(ResourcesComponent);
            
            // pick everything
            resultVO.selectedItems = resultVO.gainedItems;
            resultVO.selectedResources = resultVO.gainedResources;
            BagConstants.updateCapacity(bagComponent, resultVO, playerResources, playerAllItems);
            
            // drop stuff if needed
            // TODO prioritize item types to discard
            var prioritizedResources = [ 
                { name: resourceNames.metal, value: 10 }, 
                { name: resourceNames.concrete, value: 0 },
                { name: resourceNames.tools, value: 0 },
                { name: resourceNames.medicine, value: 0 },
                { name: resourceNames.rope, value: 0 },
                { name: resourceNames.herbs, value: 0 },
                { name: resourceNames.fuel, value: 0 },
                { name: resourceNames.food, value: 5 },
                { name: resourceNames.water, value: 8 }, 
                { name: resourceNames.metal, value: 0 },
                { name: resourceNames.food, value: 0 },
                { name: resourceNames.water, value: 0 }, 
            ];
            while (bagComponent.selectedCapacity > bagComponent.totalCapacity) {
                var discarded = false;
                for (var i = 0; i < prioritizedResources.length; i++) {
                    var resourceCheck = prioritizedResources[i];
                    var name = resourceCheck.name;
                    var totalValue = resultVO.selectedResources.getResource(name) + playerResources.resources.getResource(name);
                    if (resultVO.selectedResources.getResource(name) > 0 && totalValue > resourceCheck.value) {
                        resultVO.selectedResources.addResource(name, -1);
                        console.log("leave 1 " + name);
                        discarded = true;
                        break;
                    }
                    if (playerResources.resources.getResource(name) > 0 && totalValue > resourceCheck.value) {
                        resultVO.discardedResources .addResource(name, 1);
                        console.log("discard 1 " + name);
                        discarded = true;
                        break;
                    }
                }
                if (!discarded && resultVO.selectedItems.length > 0) {
                    console.log("leave 1 item");
                    resultVO.selectedItems.splice(0, 1);
                    discarded = true;
                }
                BagConstants.updateCapacity(bagComponent, resultVO, playerResources, playerAllItems);
                if (!discarded)
                    break;
            }
        },
        
        printStep: function (message) {
            var playerPosition = this.playerActionFunctions.playerPositionNodes.head.position;
            var status = "idle";
            if (this.autoPlayNodes.head.autoPlay.isExploring) status = "exploring";
            if (this.autoPlayNodes.head.autoPlay.isManagingCamps) status = "managing";
            var isExpress = this.autoPlayNodes.head.autoPlay.express;
            console.log("autoplay (" + isExpress + ") (" + status + ") " + playerPosition.level + "-" + playerPosition.sectorId() + ": " + message);
        },
        
        hasUpgrade: function (upgradeId) {
            return this.playerActionFunctions.tribeUpgradesNodes.head.upgrades.hasUpgrade(upgradeId);
        },
		
		isBagFull: function () {
            var bagComponent = this.playerStatsNodes.head.entity.get(BagComponent);
            return bagComponent.totalCapacity - bagComponent.usedCapacity < 2;
		}
        
    });

    return AutoPlaySystem;
});
