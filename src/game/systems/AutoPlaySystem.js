// A system that updates various GameState.unlockedFeatures based on improvements etc
define(['ash',
	'game/constants/ItemConstants',
	'game/nodes/player/AutoPlayNode',
	'game/nodes/player/PlayerStatsNode',
    'game/nodes/player/ItemsNode',
	'game/components/common/PositionComponent',
	'game/components/common/CampComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/improvements/SectorImprovementsComponent'
], function (Ash,
    ItemConstants, AutoPlayNode, PlayerStatsNode, ItemsNode,
    PositionComponent, CampComponent, SectorStatusComponent, SectorFeaturesComponent, SectorImprovementsComponent) {
    
	var AutoPlaySystem = Ash.System.extend({
		
		playerActionFunctions: null,
		levelHelper: null,
        sectorHelper: null,
		
		autoPlayNodes: null,
		playerStatsNodes: null,
		itemsNodes: null,
	    
		constructor: function (playerActionFunctions, levelHelper, sectorHelper) {
			this.playerActionFunctions = playerActionFunctions;
			this.levelHelper = levelHelper;
            this.sectorHelper = sectorHelper;
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
        },
        
        onAutoPlayNodeRemoved: function (node) {
            node.autoPlay.isExploring = false;
            node.autoPlay.isManagingCamps = false;
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
                    didSomething = didSomething || this.craftItems(isExpress);
                    didSomething = didSomething || this.scout(isExpress);
                    didSomething = didSomething || this.scavenge(isExpress);
                    didSomething = didSomething || this.idleOut(isExpress);
                }
                
                if (this.autoPlayNodes.head.autoPlay.isManagingCamps) {
                    didSomething = didSomething || this.manageCamp(isExpress);
                    didSomething = didSomething || this.buildInImprovements(isExpress);
                    didSomething = didSomething || this.idleIn(isExpress);
                }
                
                if (!didSomething) {
                    this.switchMode();
                }
			}
		},
		
		resetTurn: function (isExpress) {
            if (isExpress) {
                this.playerActionFunctions.cheat("stamina");
            }
		},
        
        switchMode: function () {
            var wasExploring = this.autoPlayNodes.head.autoPlay.isExploring;
            if (wasExploring) {
                this.playerActionFunctions.moveTo(this.playerActionFunctions.directions.camp);
            } else {
                this.playerActionFunctions.leaveCamp();
            }
            
            this.autoPlayNodes.head.autoPlay.isExploring = !this.autoPlayNodes.head.autoPlay.isExploring;
            this.autoPlayNodes.head.autoPlay.isManagingCamps = !this.autoPlayNodes.head.autoPlay.isExploring;
            this.printStep("switched mode");
        },

		move: function (isExpress) {
            var playerPosition = this.playerActionFunctions.playerPositionNodes.head.position;
			var l = playerPosition.level;
			var s = playerPosition.sector;
			var levelHelper = this.levelHelper;
			
			var nearestCampableSector = null;
			var nearestUnscoutedLocaleSector = null;
			var nearestUnscoutedSector = null;
			var nearestCampSector = null;
			
			var checkSector = function (testL, testS) {
				var sector = levelHelper.getSectorByPosition(testL, testS);
				if (sector) {
					var sectorCamp = sector.has(CampComponent);
					var sectorUnscouted = !sector.get(SectorStatusComponent).scouted;
					var sectorUnscoutedLocales = sector.get(SectorStatusComponent).getNumLocalesScouted() > 0;
					var sectorCampable = sector.get(SectorStatusComponent).canBuildCamp;
					
					if (!nearestCampableSector && sectorCampable) nearestCampableSector = sector;
					if (!nearestUnscoutedLocaleSector && sectorUnscoutedLocales) nearestUnscoutedLocaleSector = sector;
					if (!nearestUnscoutedSector && sectorUnscouted) nearestUnscoutedSector = sector;
					if (!nearestCampSector && sectorCamp) nearestCampSector = sector;
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
				if (nearestCampableSector || nearestUnscoutedLocaleSector || nearestUnscoutedSector) break;
			}
			
			// if possible, move to a campable sector
			if (nearestCampableSector) {
				l = nearestCampableSector.get(PositionComponent).level;
				s = nearestCampableSector.get(PositionComponent).sector;
			} else if (nearestUnscoutedLocaleSector) {
				l = nearestUnscoutedLocaleSector.get(PositionComponent).level;
				s = nearestUnscoutedLocaleSector.get(PositionComponent).sector;
			} else if (nearestUnscoutedSector) {
				l = nearestUnscoutedSector.get(PositionComponent).level;
				s = nearestUnscoutedSector.get(PositionComponent).sector;
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
			if (this.playerActionFunctions.playerActionsHelper.checkAvailability("build_out_camp", false)) {
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
            if (hasMetal) {
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
            return false;
		},
		
		craftItems: function (isExpress) {
			var lanternId = ItemConstants.itemDefinitions.light[0].id;
			if (this.itemsNodes.head.items.getCountById(lanternId) < 1) {
                if (this.playerActionFunctions.playerActionsHelper.checkAvailability("craft_" + lanternId)) {
                    this.printStep("craft lantern");
                    this.playerActionFunctions.craftItem(lanternId);
                    return true;
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
                this.printStep("waiting for vision");
                if (isExpress) this.playerStatsNodes.head.vision.value = this.playerStatsNodes.head.vision.maximum;
                return true;
            }
            return false;
        },
        
        manageCamp: function (isExpress) {
            var campComponent = this.playerActionFunctions.playerLocationNodes.head.entity.get(CampComponent);
            if (campComponent) {
                // assign workers
                if (campComponent.freePopulation > 0) {
                    var pop = campComponent.population;
                    var trappers = Math.floor(pop / 2);
                    var waters = Math.floor(pop / 4);
                    var specialistPop = pop - trappers - waters;
                    var ropers = specialistPop > 1 ? 1 : 0;
                    var chemists = 0;
                    var apothecaries = 0;
                    var smiths = 0;
                    var concrete = 0;
                    var soldiers = 0;
                    var scavengers = pop - trappers - waters - ropers - chemists - apothecaries - smiths - concrete - soldiers;
                    this.playerActionFunctions.assignWorkers(scavengers, trappers, waters, ropers, chemists, apothecaries, smiths, concrete, soldiers);
                    this.printStep("assigned workers");
                    return true;
                }
                
                // use improvements
                if (this.playerActionFunctions.playerActionsHelper.checkAvailability("use_in_campfire")) {
                    this.playerActionFunctions.useCampfire();
                    this.printStep("used campfire");
                    return true;
                }
            }
            return false;
        },
        
        buildInImprovements: function (isExpress) {
			var improvementsComponent = this.playerActionFunctions.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
            
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
            
            if (this.playerActionFunctions.playerActionsHelper.checkAvailability("build_in_campfire")) {
                if (improvementsComponent.getCount(improvementNames.campfire) < 1) {
                    this.printStep("build campfire");
                    this.playerActionFunctions.buildCampfire();
                    return true;
                }
            }
            
            return false;
        },
        
        idleIn: function (isExpress) {
            return false;
        },
        
        printStep: function (message) {
            var playerPosition = this.playerActionFunctions.playerPositionNodes.head.position;
            var status = "idle";
            if (this.autoPlayNodes.head.autoPlay.isExploring) status = "exploring";
            if (this.autoPlayNodes.head.autoPlay.isManagingCamps) status = "managing";
            var isExpress = this.autoPlayNodes.head.autoPlay.express;
            console.log("autoplay (" + isExpress + ") (" + status + ") " + playerPosition.level + "-" + playerPosition.sector + ": " + message);
        },
        
    });

    return AutoPlaySystem;
});
