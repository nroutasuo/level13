define([
    'ash',
    'game/GameGlobals',
    'game/GlobalSignals',
    'game/constants/PlayerActionConstants',
    'game/constants/PlayerStatConstants',
    'game/constants/TextConstants',
    'game/constants/LogConstants',
    'game/constants/UIConstants',
    'game/constants/PositionConstants',
    'game/constants/LocaleConstants',
    'game/constants/LevelConstants',
    'game/constants/MovementConstants',
	'game/constants/TradeConstants',
    'game/constants/WorldCreatorConstants',
    'game/nodes/PlayerPositionNode',
    'game/nodes/PlayerLocationNode',
    'game/nodes/NearestCampNode',
    'game/components/player/VisionComponent',
    'game/components/player/StaminaComponent',
    'game/components/player/ItemsComponent',
    'game/components/sector/PassagesComponent',
    'game/components/sector/SectorControlComponent',
    'game/components/sector/SectorFeaturesComponent',
    'game/components/sector/SectorLocalesComponent',
    'game/components/sector/MovementOptionsComponent',
    'game/components/player/ExcursionComponent',
    'game/components/common/PositionComponent',
    'game/components/common/LogMessagesComponent',
    'game/components/common/CampComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/components/sector/improvements/WorkshopComponent',
    'game/components/sector/SectorStatusComponent',
    'game/components/sector/EnemiesComponent'
], function (
    Ash, GameGlobals, GlobalSignals, PlayerActionConstants, PlayerStatConstants, TextConstants, LogConstants, UIConstants, PositionConstants, LocaleConstants, LevelConstants, MovementConstants, TradeConstants, WorldCreatorConstants,
    PlayerPositionNode, PlayerLocationNode, NearestCampNode,
    VisionComponent, StaminaComponent, ItemsComponent, PassagesComponent, SectorControlComponent, SectorFeaturesComponent, SectorLocalesComponent,
    MovementOptionsComponent, ExcursionComponent, PositionComponent, LogMessagesComponent, CampComponent,
    SectorImprovementsComponent, WorkshopComponent, SectorStatusComponent, EnemiesComponent
) {
    var UIOutLevelSystem = Ash.System.extend({

		engine: null,

		playerPosNodes: null,
		playerLocationNodes: null,
        nearestCampNodes: null,

        pendingUpdateMap: true,

		constructor: function () {
            GameGlobals.uiFunctions.toggle("#switch-out .bubble", false);

            this.elements = {};
            this.elements.sectorHeader = $("#header-sector");
            this.elements.description = $("#out-desc");
            this.elements.btnClearWorkshop = $("#out-action-clear-workshop");
            this.elements.btnNap = $("#out-action-nap");
            this.elements.outImprovementsTR = $("#out-improvements tr");

			return this;
		},

		addToEngine: function (engine) {
			this.playerPosNodes = engine.getNodeList(PlayerPositionNode);
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
            this.nearestCampNodes = engine.getNodeList(NearestCampNode);

			this.initListeners();

			this.engine = engine;
		},

		removeFromEngine: function (engine) {
			this.playerPosNodes = null;
			this.playerLocationNodes = null;
			this.engine = null;
		},

		initListeners: function () {
			var sys = this;
			GlobalSignals.playerMovedSignal.add(function () {
                if (GameGlobals.gameState.uiStatus.isHidden) return;
                sys.updateAll();
			});
            GlobalSignals.improvementBuiltSignal.add(function () {
                sys.updateAll();
            });
            GlobalSignals.inventoryChangedSignal.add(function () {
                sys.updateSectorDescription();
                sys.updateOutImprovementsVisibility();
            });
            GlobalSignals.featureUnlockedSignal.add(function () {
                sys.updateUnlockedFeatures();
            });
            GlobalSignals.fightEndedSignal.add(function () {
                sys.updateSectorDescription();
				sys.updateMovementRelatedActions();
            });
            GlobalSignals.sectorScoutedSignal.add(function () {
                sys.updateAll();
            });
            GlobalSignals.visionChangedSignal.add(function () {
                sys.updateAll();
            });
            GlobalSignals.gameShownSignal.add(function () {
                sys.updateAll();
            });
			this.rebuildVis();
            this.updateUnlockedFeatures();
		},

		update: function (time) {
            if (GameGlobals.gameState.isPaused) return;
            if (GameGlobals.gameState.uiStatus.currentTab !== GameGlobals.uiFunctions.elementIDs.tabs.out) return;

			var posComponent = this.playerPosNodes.head.position;

            if (!this.playerLocationNodes.head) {
                log.w("No player location");
                return;
            }

			if (!posComponent.inCamp) {
				this.updateLevelPage();
                if (this.pendingUpdateMap)
                    this.rebuildVis();
			}
		},

		updateAll: function () {
		    if (GameGlobals.gameState.uiStatus.isHidden) return;
            if (!this.playerLocationNodes.head) return;

			this.rebuildVis();
			this.updateLocales();
            this.updateOutImprovementsVisibility();
			this.updateMovementRelatedActions();
            this.updateStaticSectorElements();
            this.updateSectorDescription();
            this.updateLevelPageActions();
            this.updateUnlockedFeatures();
			this.updateOutImprovementsList();
        },

        updateUnlockedFeatures: function () {
            GameGlobals.uiFunctions.toggle("#minimap", GameGlobals.gameState.unlockedFeatures.scout);
            GameGlobals.uiFunctions.toggle("#out-container-compass", GameGlobals.gameState.unlockedFeatures.scout);
            GameGlobals.uiFunctions.toggle("#out-container-compass-actions", GameGlobals.gameState.unlockedFeatures.scout);
        },

		updateLevelPage: function () {
		    if (GameGlobals.gameState.uiStatus.isHidden) return;
			var sectorStatusComponent = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);

			var hasCamp = GameGlobals.levelHelper.getLevelEntityForSector(this.playerLocationNodes.head.entity).has(CampComponent);
			var hasCampHere = this.playerLocationNodes.head.entity.has(CampComponent);
            var isScouted = sectorStatusComponent.scouted;

			this.updateOutImprovementsStatus(hasCamp, improvements);
            this.updateNap(isScouted, hasCampHere);
            this.updateDespair(hasCampHere);
		},

        updateLevelPageActions: function (isScouted, hasCamp, hasCampHere) {
		    if (GameGlobals.gameState.uiStatus.isHidden) return;
            
            var sectorStatusComponent = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			var hasCamp = GameGlobals.levelHelper.getLevelEntityForSector(this.playerLocationNodes.head.entity).has(CampComponent);
			var hasCampHere = this.playerLocationNodes.head.entity.has(CampComponent);
            var isScouted = sectorStatusComponent.scouted;
            
            var sectorLocalesComponent = this.playerLocationNodes.head.entity.get(SectorLocalesComponent);
            var sectorControlComponent = this.playerLocationNodes.head.entity.get(SectorControlComponent);
            var featuresComponent = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
            var workshopComponent = this.playerLocationNodes.head.entity.get(WorkshopComponent);
            var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
            var passagesComponent = this.playerLocationNodes.head.entity.get(PassagesComponent);

            var passageUpBuilt = improvements.getCount(improvementNames.passageUpStairs) +
                improvements.getCount(improvementNames.passageUpElevator) +
                improvements.getCount(improvementNames.passageUpHole) > 0;
            var passageDownBuilt = improvements.getCount(improvementNames.passageDownStairs) +
                improvements.getCount(improvementNames.passageDownElevator) +
                improvements.getCount(improvementNames.passageDownHole) > 0;
            GameGlobals.uiFunctions.toggle("#out-action-move-up", (isScouted && passagesComponent.passageUp != null) || passageUpBuilt);
            GameGlobals.uiFunctions.toggle("#out-action-move-down", (isScouted && passagesComponent.passageDown != null) || passageDownBuilt);
            GameGlobals.uiFunctions.toggle("#out-action-move-camp", hasCamp && !hasCampHere);
            GameGlobals.uiFunctions.toggle("#out-action-move-camp-details", hasCamp && !hasCampHere);

            GameGlobals.uiFunctions.toggle("#out-action-enter", hasCampHere);
            GameGlobals.uiFunctions.toggle("#out-action-scout", GameGlobals.gameState.unlockedFeatures.vision);
            GameGlobals.uiFunctions.toggle("#out-action-use-spring", isScouted && featuresComponent.hasSpring);
            GameGlobals.uiFunctions.toggle("#out-action-investigate", GameGlobals.gameState.unlockedFeatures.investigate);
            GameGlobals.uiFunctions.toggle("#out-action-fight-gang", GameGlobals.gameState.unlockedFeatures.fight);

            var showWorkshop = isScouted && workshopComponent != null && !sectorControlComponent.hasControlOfLocale(LocaleConstants.LOCALE_ID_WORKSHOP)
            GameGlobals.uiFunctions.toggle("#out-action-clear-workshop", showWorkshop);
            if (workshopComponent) {
                var workshopName = TextConstants.getWorkshopName(workshopComponent.resource);
                this.elements.btnClearWorkshop.find(".btn-label").text("scout " + workshopName);
            }

            GameGlobals.uiFunctions.slideToggleIf("#out-locales", null, isScouted && sectorLocalesComponent.locales.length > 0, 200, 0);
            GameGlobals.uiFunctions.slideToggleIf("#container-out-actions-movement-related", null, isScouted, 200, 0);

            // hide movement until the player makes a light
            GameGlobals.uiFunctions.toggle("#table-out-actions-movement", GameGlobals.gameState.numCamps > 0);
            GameGlobals.uiFunctions.toggle("#container-tab-two-out-actions h3", GameGlobals.gameState.numCamps > 0);
            GameGlobals.uiFunctions.toggle("#out-improvements", GameGlobals.gameState.unlockedFeatures.vision);
            GameGlobals.uiFunctions.toggle("#out-improvements table", GameGlobals.gameState.unlockedFeatures.vision);
        },

        updateNap: function (isScouted, hasCampHere) {
            // TODO move some of the requirements to PlayerActionConstants
            
            if (hasCampHere) {
                GameGlobals.uiFunctions.toggle(this.elements.btnNap, false);
                return;
            }
            
            var featuresComponent = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
            var excursionComponent = this.playerPosNodes.head.entity.get(ExcursionComponent);
            var improvementsComponent = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
            var staminaComponent = this.playerPosNodes.head.entity.get(StaminaComponent);
            
            var hasFirstCamp = GameGlobals.gameState.numCamps > 0;
			var hasCollectibleFood = isScouted && featuresComponent.resourcesCollectable.food > 0;
			var hasCollectibleWater = isScouted && (featuresComponent.resourcesCollectable.water > 0 || featuresComponent.hasSpring);
            var waterAvailable = GameGlobals.resourcesHelper.getCurrentStorage().resources.water > 1 || hasCollectibleWater;
            var foodAvailable = GameGlobals.resourcesHelper.getCurrentStorage().resources.food > 1 || hasCollectibleFood;
            var suppliesAvailable = waterAvailable && foodAvailable;
            var blockedBySupplies = hasFirstCamp && !suppliesAvailable;
            
            if (blockedBySupplies) {
                GameGlobals.uiFunctions.toggle(this.elements.btnNap, false);
                return;
            }

            var lowStamina = false;
            var costToCamp = GameGlobals.playerActionsHelper.getCosts("move_camp_level");
            if (GameGlobals.playerActionsHelper.isRequirementsMet("move_camp_level")) {
                var staminaToCamp = costToCamp.stamina || 10;
                var staminaCostToMove = staminaToCamp;
                var missingStamina = staminaCostToMove - staminaComponent.stamina;
                lowStamina = missingStamina > 0 && missingStamina <= PlayerStatConstants.STAMINA_GAINED_FROM_NAP;
            }

            var collectorFood = improvementsComponent.getVO(improvementNames.collector_food);
            var collectorWater = improvementsComponent.getVO(improvementNames.collector_water);
            var storedFood = collectorFood.storedResources.getResource(resourceNames.food);
            var storedWater = collectorWater.storedResources.getResource(resourceNames.water);
            var lowFood = GameGlobals.resourcesHelper.getCurrentStorage().resources.food + storedFood < Math.min(costToCamp.resource_food, 5);
            var lowWater = GameGlobals.resourcesHelper.getCurrentStorage().resources.water + storedWater < Math.min(costToCamp.resource_water, 5);

            var blockedByTutorial = !hasFirstCamp && staminaComponent.stamina > 15;
            var showNap = (lowStamina || (lowWater && hasCollectibleWater) || (lowFood && hasCollectibleFood)) && !blockedBySupplies && !blockedByTutorial;
            GameGlobals.uiFunctions.toggle(this.elements.btnNap, showNap);
        },

        updateDespair: function (hasCampHere) {
            var logComponent = this.playerPosNodes.head.entity.get(LogMessagesComponent);
            var posComponent = this.playerLocationNodes.head.position;
            var movementOptionsComponent = this.playerLocationNodes.head.entity.get(MovementOptionsComponent);
            var discoveredResources = GameGlobals.sectorHelper.getLocationDiscoveredResources();
            var isValidDespairHunger = discoveredResources.indexOf(resourceNames.food) < 0 && GameGlobals.gameState.unlockedFeatures.resources.food && GameGlobals.resourcesHelper.getCurrentStorage().resources.food < 1;
            var isValidDespairThirst = discoveredResources.indexOf(resourceNames.water) < 0 && GameGlobals.gameState.unlockedFeatures.resources.water && GameGlobals.resourcesHelper.getCurrentStorage().resources.water < 1;
            var isValidDespairStamina = this.playerPosNodes.head.entity.get(StaminaComponent).stamina < PlayerActionConstants.costs.move_sector_east.stamina;
            var isValidDespairMove = !movementOptionsComponent.canMove(); // conceivably happens in hazard sectors if you lose equipment
            var isFirstPosition = posComponent.level === 13 && posComponent.sectorX === WorldCreatorConstants.FIRST_CAMP_X && posComponent.sectorY === WorldCreatorConstants.FIRST_CAMP_Y;
            var showDespair = !hasCampHere && !isFirstPosition && (isValidDespairHunger || isValidDespairThirst || isValidDespairStamina) || isValidDespairMove;

            if (this.isDespairShown !== showDespair) {
                if (showDespair) {
                    this.showDespairTimeoutID = window.setTimeout(function () {
                        logComponent.addMessage(LogConstants.MSG_ID_DESPAIR_AVAILABLE, LogConstants.getDespairMessage(isValidDespairHunger, isValidDespairThirst, isValidDespairStamina, isValidDespairMove));
                        GameGlobals.uiFunctions.toggle("#out-action-despair", true);
                    }, 1250);
                    // TODO do this somewhere other than UI system - maybe a global detection if despair is available
                } else {
                    if (this.showDespairTimeoutID) window.clearTimeout(this.showDespairTimeoutID);
                    GameGlobals.uiFunctions.toggle("#out-action-despair", false);
                }
                this.isDespairShown = showDespair;
            }
        },

		getDescription: function (entity, hasCampHere, hasCampOnLevel, hasVision, isScouted) {
            var position = entity.get(PositionComponent).getPosition();
			var passagesComponent = this.playerLocationNodes.head.entity.get(PassagesComponent);
			var workshopComponent = this.playerLocationNodes.head.entity.get(WorkshopComponent);
			var featuresComponent = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			var statusComponent = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
            var enemiesComponent = this.playerLocationNodes.head.entity.get(EnemiesComponent);
			var localesComponent = entity.get(SectorLocalesComponent);
			var hasEnemies = enemiesComponent.hasEnemies;

			var description = "<p>";
			description += this.getTextureDescription(hasVision, position, featuresComponent, statusComponent, localesComponent);
			description += this.getFunctionalDescription(hasVision, isScouted, featuresComponent, workshopComponent, hasCampHere, hasCampOnLevel);
			description += "</p><p>";
			description += this.getStatusDescription(hasVision, isScouted, hasEnemies, featuresComponent, passagesComponent, hasCampHere, hasCampOnLevel);
			description += this.getMovementDescription(isScouted, passagesComponent, entity);
			description += "</p><p>";
			description += this.getResourcesDescription(isScouted, featuresComponent);
			description += "</p>";
			return description;
		},

		// Sector type, density, repair. Sunlight.
		getTextureDescription: function (hasVision, position, featuresComponent, statusComponent, localesComponent) {
			var desc = TextConstants.getSectorDescription(
				hasVision,
				featuresComponent.sunlit,
				featuresComponent.sectorType,
				featuresComponent.buildingDensity,
				featuresComponent.stateOfRepair) + " ";

			if (featuresComponent.sunlit) {
				if (hasVision) desc += "The area is swathed in relentless <span class='hl-functionality'>daylight</span>. ";
				else desc += "The area is swathed in blinding <span class='hl-functionality'>sunlight</span>. ";
			} else {
                if (statusComponent.glowStickSeconds > -5) {
                    if (statusComponent.glowStickSeconds < 5)
                        desc += "The glowstick fades out.";
                    else
                        desc += "A glowstick casts a sickly <span class='hl-functionality'>light</span>.";
                } else {
                    if (hasVision) desc += "";
                    else desc += "There is no <span class='hl-functionality'>light</span>. ";
                }
            }
            
            for (var i = 0; i < localesComponent.locales.length; i++) {
                var locale = localesComponent.locales[i];
                if (statusComponent.isLocaleScouted(i)) {
                    if (locale.type == localeTypes.tradingpartner) {
                        var campOrdinal = GameGlobals.gameState.getCampOrdinal(position.level);
                        var partner = TradeConstants.getTradePartner(campOrdinal);
                        desc += "<span class='hl-functionality'>" + partner.name + "</span> is located here. ";
                    }
                }
            }

			return desc;
		},

		// Existing improvements. Workshops. Potential improvements (camp).
		getFunctionalDescription: function (hasVision, isScouted, featuresComponent, workshopComponent, hasCampHere, hasCampOnLevel) {
			var sectorControlComponent = this.playerLocationNodes.head.entity.get(SectorControlComponent);

			var description = "";

            if (isScouted && featuresComponent.hasSpring) {
                description += "There is a <span class='hl-functionality'>" + TextConstants.getSpringName(featuresComponent) + "</span> here. ";
            }

            if (isScouted) {
                var canBucket = featuresComponent.resourcesCollectable.water > 0;
                var canTrap = featuresComponent.resourcesCollectable.food > 0;
                if (canBucket && canTrap) {
                    description += "Both <span class='hl-functionality'>water</span> and <span class='hl-functionality'>food</span> can be collected here. ";
                } else if (canBucket) {
                    if (featuresComponent.sunlit) {
                        description += "It looks like <span class='hl-functionality'>rainwater</span> could be collected here. ";
                    } else {
                        description += "There is a bit of <span class='hl-functionality'>water</span> leaking here that could be collected. ";
                    }
                } else if (canTrap) {
                    description += "It might be worthwhile to install <span class='hl-functionality'>traps</span> here. ";
                }
            }

			if (hasCampHere) description += "There is a <span class='hl-functionality'>camp</span> here. ";

			if (isScouted && workshopComponent) {
				var workshopName = TextConstants.getWorkshopName(workshopComponent.resource);
                var workshopControl = sectorControlComponent.hasControlOfLocale(LocaleConstants.LOCALE_ID_WORKSHOP);
                var workshopStatus = workshopControl ? "cleared for use" : "not cleared";
				description += "There is " + TextConstants.addArticle(workshopName) + " here (" + workshopStatus + "). ";
			}

			return description;
		},

		// Found resources, enemies
		getStatusDescription: function (hasVision, isScouted, hasEnemies, featuresComponent, passagesComponent, hasCampHere, hasCampOnLevel) {
			var description = "";

			if (hasVision) {
				description += this.getDangerDescription(isScouted, featuresComponent, passagesComponent, hasCampHere);
			}

			if (isScouted && hasVision && !hasCampHere && !hasCampOnLevel) {
				if (featuresComponent.canHaveCamp() && !hasEnemies && !passagesComponent.passageUp && !passagesComponent.passageDown)
					description += "This would be a good place for a <span class='hl-functionality'>camp</span>. ";
			}

			return description;
		},

        getResourcesDescription: function (isScouted, featuresComponent) {
            if (!featuresComponent) return;
            var description = "";
			if (featuresComponent.resourcesScavengable.getTotal() > 0) {
				var discoveredResources = GameGlobals.sectorHelper.getLocationDiscoveredResources();
				if (discoveredResources.length > 0) {
					description += "Resources found by scavenging: " + featuresComponent.getScaResourcesString(discoveredResources);
				}
			}
			return description;
        },

		getMovementDescription: function (isScouted, passagesComponent, entity) {
			var description = "";
			var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);

			// Passages up / down
			var passageUpBuilt = improvements.getCount(improvementNames.passageUpStairs) +
				improvements.getCount(improvementNames.passageUpElevator) +
				improvements.getCount(improvementNames.passageUpHole) > 0;
			var passageDownBuilt = improvements.getCount(improvementNames.passageDownStairs) +
				improvements.getCount(improvementNames.passageDownElevator) +
				improvements.getCount(improvementNames.passageDownHole) > 0;

            if (isScouted) {
                if (passagesComponent.passageUp)
                    description += TextConstants.getPassageDescription(passagesComponent.passageUp, PositionConstants.DIRECTION_UP, passageUpBuilt);
                if (passagesComponent.passageDown)
                    description += TextConstants.getPassageDescription(passagesComponent.passageDown, PositionConstants.DIRECTION_DOWN, passageDownBuilt);
            }

			// Blockers n/s/w/e
			for (var i in PositionConstants.getLevelDirections()) {
				var direction = PositionConstants.getLevelDirections()[i];
                var directionName = PositionConstants.getDirectionName(direction);
				var blocker = passagesComponent.getBlocker(direction);

				if (blocker) {
                	var enemiesComponent = this.playerLocationNodes.head.entity.get(EnemiesComponent);
                    var blockerName = TextConstants.getMovementBlockerName(blocker, enemiesComponent).toLowerCase();
                    if (GameGlobals.movementHelper.isBlocked(entity, direction)) {
                        if (blocker.type == MovementConstants.BLOCKER_TYPE_DEBRIS) {
                            description += "Passage to the " + directionName + " is blocked by " + blockerName + ". ";
                        } else {
                            description += "Passage to the " + directionName + " is blocked by a " + blockerName + ". ";
                        }
                    } else {
                        var position = entity.get(PositionComponent).getPosition();
                        var gang = GameGlobals.levelHelper.getGang(position, direction);
                        if (blocker.type == MovementConstants.BLOCKER_TYPE_DEBRIS) {
                            description += "Debris to the " + directionName + " has been cleared away. ";
                        } else if (blocker.type == MovementConstants.BLOCKER_TYPE_GANG) {
                            if (gang) {
                                description += "A " + blockerName + " on the " + directionName + " has been " + TextConstants.getUnblockedVerb(blocker.type) + ". ";
                            } else {
                                log.w("gang blocker but no gang component at " + position, this);
                            }
                        } else {
                            description += "A " + blockerName + " on the " + directionName + " has been " + TextConstants.getUnblockedVerb(blocker.type) + ". ";
                        }
                    }
                }
			}

			return description;
		},

		getDangerDescription: function (isScouted, featuresComponent, passagesComponent, hasCampOnLevel) {
			var enemyDesc = "";

			var sectorControlComponent = this.playerLocationNodes.head.entity.get(SectorControlComponent);
			var enemiesComponent = this.playerLocationNodes.head.entity.get(EnemiesComponent);
			var hasEnemies = enemiesComponent.hasEnemies;

			if (!isScouted) {
				enemyDesc += "You have not scouted this sector yet. ";
			}

			if (hasEnemies) {
				if (isScouted) {
					enemyDesc = "This area is " + TextConstants.getEnemyText(enemiesComponent.possibleEnemies, sectorControlComponent) + ". ";
				}
			} else if (isScouted) {
				enemyDesc += "There doesn't seem to be anything hostile around. ";
			}

            var notCampableDesc = "";
            if (isScouted) {
                if (!featuresComponent.campable) {
                    var inhabited = featuresComponent.level > 10;
                    switch (featuresComponent.notCampableReason) {
                        case LevelConstants.UNCAMPABLE_LEVEL_TYPE_RADIATION:
                            if (inhabited && featuresComponent.stateOfRepair > 6)
                                notCampableDesc = "Many entrances have big yellow warning signs on them, with the text 'KEEP OUT' and a <span class='hl-functionality'>radiation</span> sign. ";
                            else if (inhabited && featuresComponent.buildingDensity > 5)
                                notCampableDesc = "Walls are covered in graffiti warning about <span class='hl-functionality'>radiation</span>. ";
                            else
                                notCampableDesc = "There is an eerie air as if the place has been <span class='hl-functionality'>abandoned</span> in a hurry.";
                            break;

                        case LevelConstants.UNCAMPABLE_LEVEL_TYPE_POLLUTION:
                            if (inhabited && featuresComponent.stateOfRepair > 6)
                                notCampableDesc = "Many entrances have big red warning signs on them with a <span class='hl-functionality'>skull sign</span> and the text 'KEEP OUT'. ";
                            else if (inhabited && featuresComponent.buildingDensity > 5)
                                notCampableDesc = "Walls are covered in graffiti warning about some kind of <span class='hl-functionality'>pollution</span>.";
                            else
                                notCampableDesc = "A <span class='hl-functionality'>noxious smell</span> hangs in the air.";
                            break;

                        case LevelConstants.UNCAMPABLE_LEVEL_TYPE_SUPERSTITION:
                            if (inhabited)
                                notCampableDesc = "There aren't any signs of recent human <span class='hl-functionality'>habitation</span>. ";
                            else
                                notCampableDesc = "An unnerving <span class='hl-functionality'>silence</span> blankets the streets. ";
                            break;

                        case LevelConstants.UNCAMPABLE_LEVEL_TYPE_ORDINAL_LIMIT:
                            notCampableDesc = "There are no more humans living this far down in the City.";
                    }
                }
            }

            var hasHazards = featuresComponent.hazards.hasHazards();
            var hazardDesc = "";
            if (hasHazards) {
                if (featuresComponent.hazards.radiation > 0) {
                    hazardDesc += "This place is <span class='hl-functionality'>radioactive</span> (" + featuresComponent.hazards.radiation + "). ";
                }
                if (featuresComponent.hazards.poison > 0) {
                    hazardDesc += "This place is dangerously <span class='hl-functionality'>polluted</span> (" + featuresComponent.hazards.poison + "). ";
                }
                if (featuresComponent.hazards.cold > 0) {
                    hazardDesc += "It's very <span class='hl-functionality'>cold</span> here (" + featuresComponent.hazards.cold + "). ";
                }
            }

			return enemyDesc + (hasHazards ? hazardDesc : notCampableDesc);
		},

        updateOutImprovementsList: function (improvements) {
            if (!this.playerLocationNodes.head) return;
			var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
            var uiFunctions = GameGlobals.uiFunctions;
            var numVisible = 0;
            $.each(this.elements.outImprovementsTR, function () {
                var actionName = $(this).attr("btn-action");

                if (!actionName) {
                    actionName = $(this).find("button.action-build").attr("action");
                    $(this).attr("btn-action", actionName);
                }

                if (actionName) {
                    var improvementName = GameGlobals.playerActionsHelper.getImprovementNameForAction(actionName);
                    if (improvementName) {
                        var actionEnabled = GameGlobals.playerActionsHelper.checkRequirements(actionName, false).value >= 1;
                        var existingImprovements = improvements.getCount(improvementName);
                        $(this).find(".list-amount").text(existingImprovements);
                        GameGlobals.uiFunctions.toggle($(this).find(".action-use"), existingImprovements > 0);

                        var isVisible = actionEnabled || existingImprovements > 0;
                        GameGlobals.uiFunctions.toggle($(this), isVisible);
                        if (isVisible) numVisible++;
                    }
                }
            });
			GameGlobals.uiFunctions.toggle("#header-out-improvements", numVisible > 0);
        },

        updateOutImprovementsVisibility: function () {
            if (!this.playerLocationNodes.head) return;
			var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			var featuresComponent = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			var sectorStatusComponent = this.playerLocationNodes.head.entity.get(SectorStatusComponent);

            var isScouted = sectorStatusComponent.scouted;

			var collectorFood = improvements.getVO(improvementNames.collector_food);
			var collectorWater = improvements.getVO(improvementNames.collector_water);
			var hasFood = isScouted && featuresComponent.resourcesCollectable.food > 0;
			var hasWater = isScouted && featuresComponent.resourcesCollectable.water > 0;
			GameGlobals.uiFunctions.toggle("#out-improvements-collector-food", collectorFood.count > 0 || hasFood);
			GameGlobals.uiFunctions.toggle("#out-improvements-collector-water", collectorWater.count > 0 || hasWater);
			GameGlobals.uiFunctions.toggle("#out-improvements-camp", sectorStatusComponent.canBuildCamp);
        },

        updateOutImprovementsStatus: function(hasCamp, improvements) {
			var collectorFood = improvements.getVO(improvementNames.collector_food);
			var collectorWater = improvements.getVO(improvementNames.collector_water);
			var collectorFoodCapacity = collectorFood.storageCapacity.food * collectorFood.count;
			var collectorWaterCapacity = collectorWater.storageCapacity.water * collectorWater.count;
			$("#out-improvements-camp .list-amount").text(hasCamp ? "1" : "0");
			$("#out-improvements-collector-food .list-storage").text(
				collectorFoodCapacity > 0 ? (Math.floor(collectorFood.storedResources.food * 10) / 10) + " / " + collectorFoodCapacity : "");
			$("#out-improvements-collector-water .list-storage").text(
				collectorWaterCapacity > 0 ? (Math.floor(collectorWater.storedResources.water * 10) / 10) + " / " + collectorWaterCapacity : "");
        },

		updateLocales: function () {
            if (!this.playerLocationNodes.head) return;

			var currentSector = this.playerLocationNodes.head.entity;
            var position = currentSector.get(PositionComponent);
			var sectorLocalesComponent = currentSector.get(SectorLocalesComponent);
			var sectorFeaturesComponent = currentSector.get(SectorFeaturesComponent);
			var sectorStatusComponent = currentSector.get(SectorStatusComponent);
			$("#table-out-actions-locales").empty();
			for (var i = 0; i < sectorLocalesComponent.locales.length; i++) {
				var locale = sectorLocalesComponent.locales[i];
				var button = "<button class='action multiline' action='scout_locale_" + locale.getCategory() + "_" + i + "'>" + TextConstants.getLocaleName(locale, sectorFeaturesComponent.stateOfRepair) + "</button>";
				var info = "<span class='p-meta'>";
                if (sectorStatusComponent.isLocaleScouted(i)) {
                    if (locale.type == localeTypes.tradingpartner) {
                        var campOrdinal = GameGlobals.gameState.getCampOrdinal(position.level);
                        var partner = TradeConstants.getTradePartner(campOrdinal);
                        info += "Already scouted (" + partner.name + ")";
                    } else {
                        info += "Already scouted";
                    }
                }
                info += "</span>";
				$("#table-out-actions-locales").append("<tr><td>" + button + "</td><td>" + info + "</td></tr>");
			}
            GameGlobals.uiFunctions.registerActionButtonListeners("#table-out-actions-locales");
            GameGlobals.uiFunctions.generateButtonOverlays("#table-out-actions-locales");
            GameGlobals.uiFunctions.generateCallouts("#table-out-actions-locales");
            GlobalSignals.elementCreatedSignal.dispatch();
		},

		updateMovementRelatedActions: function () {
            if (!this.playerLocationNodes.head) return;

			var currentSector = this.playerLocationNodes.head.entity;
			var movementOptionsComponent = currentSector.get(MovementOptionsComponent);
            var enemiesComponent = currentSector.get(EnemiesComponent);
			$("#container-out-actions-movement-related").empty();

			function addBlockerActionButton(blocker, direction) {
                if (blocker.type !== MovementConstants.BLOCKER_TYPE_GAP) {
                    if (!movementOptionsComponent.canMoveToDirection(direction)) {
                        var action = blocker.actionBaseID + "_" + direction;
                        var description = TextConstants.getMovementBlockerAction(blocker, enemiesComponent) + " (" +  PositionConstants.getDirectionName(direction, true) + ")";
                        var button = "<button class='action' action='" + action + "'>" + description + "</button>";
                        $("#container-out-actions-movement-related").append(button);
                    }
                }
			}

			for (var i in PositionConstants.getLevelDirections()) {
				var direction = PositionConstants.getLevelDirections()[i];
				var directionBlocker = GameGlobals.movementHelper.getBlocker(currentSector, direction);
				if (directionBlocker && directionBlocker.type != MovementConstants.BLOCKER_TYPE_DEBRIS) {
                    addBlockerActionButton(directionBlocker, direction);
                }
			}

            GameGlobals.uiFunctions.registerActionButtonListeners("#container-out-actions-movement-related");
            GameGlobals.uiFunctions.generateButtonOverlays("#container-out-actions-movement-related");
            GameGlobals.uiFunctions.generateCallouts("#container-out-actions-movement-related");
            GlobalSignals.elementCreatedSignal.dispatch();
		},

        updateSectorDescription: function () {
            if (GameGlobals.gameState.uiStatus.isHidden) return;
			var featuresComponent = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			var sectorStatusComponent = this.playerLocationNodes.head.entity.get(SectorStatusComponent);

			var vision = this.playerPosNodes.head.entity.get(VisionComponent).value;
			var hasVision = vision > PlayerStatConstants.VISION_BASE;
			var hasCamp = GameGlobals.levelHelper.getLevelEntityForSector(this.playerLocationNodes.head.entity).has(CampComponent);
			var hasCampHere = this.playerLocationNodes.head.entity.has(CampComponent);
            var isScouted = sectorStatusComponent.scouted;

			// Header
			var header = "";
			var name = featuresComponent.getSectorTypeName(hasVision || featuresComponent.sunlit, hasCampHere);
			header = name;
            this.elements.sectorHeader.text(header);

			// Description
            this.elements.description.html(this.getDescription(
                this.playerLocationNodes.head.entity,
                hasCampHere,
                hasCamp,
                hasVision,
                isScouted
            ));
        },

        updateStaticSectorElements: function () {
            if (this.nearestCampNodes.head) {
                var campSector = this.nearestCampNodes.head.entity;
                var path = GameGlobals.levelHelper.findPathTo(this.playerLocationNodes.head.entity, campSector, { skipBlockers: true, skipUnvisited: true });
                var len = path ? path.length : "?";
                $("#out-action-move-camp-details").text("(" + len + " blocks)");
            }
        },

		rebuildVis: function () {
            if (GameGlobals.gameState.uiStatus.isHidden) return;
            if (!this.playerLocationNodes.head) return;
            this.pendingUpdateMap = false;
            GameGlobals.uiMapHelper.rebuildMap("minimap", null, this.playerLocationNodes.head.position.getPosition(), UIConstants.MAP_MINIMAP_SIZE, true);
		},
    });

    return UIOutLevelSystem;
});
