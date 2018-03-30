define([
    'ash',
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
    'game/constants/WorldCreatorConstants',
    'game/nodes/PlayerPositionNode',
    'game/nodes/PlayerLocationNode',
    'game/nodes/sector/CampNode',
    'game/components/player/VisionComponent',
    'game/components/player/StaminaComponent',
    'game/components/player/ItemsComponent',
    'game/components/sector/PassagesComponent',
    'game/components/sector/SectorControlComponent',
    'game/components/sector/SectorFeaturesComponent',
    'game/components/sector/SectorLocalesComponent',
    'game/components/sector/MovementOptionsComponent',
    'game/components/common/PositionComponent',
    'game/components/common/LogMessagesComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/components/sector/improvements/WorkshopComponent',
    'game/components/sector/SectorStatusComponent',
    'game/components/sector/EnemiesComponent'
], function (
    Ash, GlobalSignals, PlayerActionConstants, PlayerStatConstants, TextConstants, LogConstants, UIConstants, PositionConstants, LocaleConstants, LevelConstants, MovementConstants, WorldCreatorConstants,
    PlayerPositionNode, PlayerLocationNode, CampNode,
    VisionComponent, StaminaComponent, ItemsComponent, PassagesComponent, SectorControlComponent, SectorFeaturesComponent, SectorLocalesComponent,
    MovementOptionsComponent, PositionComponent, LogMessagesComponent,
    SectorImprovementsComponent, WorkshopComponent, SectorStatusComponent, EnemiesComponent
) {
    var UIOutLevelSystem = Ash.System.extend({
	
		uiFunctions : null,
		gameState : null,
		movementHelper: null,
		resourcesHelper: null,
		sectorHelper: null,
		
		engine: null,
		
		playerPosNodes: null,
		playerLocationNodes: null,
        
        pendingUpdateDescription: true,
        pendingUpdateMap: true,
	
		constructor: function (uiFunctions, gameState, movementHelper, resourceHelper, sectorHelper, uiMapHelper) {
			this.uiFunctions = uiFunctions;
			this.gameState = gameState;
			this.movementHelper = movementHelper;
			this.resourcesHelper = resourceHelper;
			this.sectorHelper = sectorHelper;
            this.uiMapHelper = uiMapHelper;
            
            this.uiFunctions.toggle("#switch-out .bubble", false);
            
            this.elements = {};
            this.elements.sectorHeader = $("#header-sector");
            this.elements.description = $("#out-desc");
            this.elements.btnClearWorkshop = $("#out-action-clear-workshop");            
            this.elements.outImprovementsTR = $("#out-improvements tr");
            this.elements.outProjectsTR = $("#out-projects tr");
            
			return this;
		},
	
		addToEngine: function (engine) {
			this.playerPosNodes = engine.getNodeList(PlayerPositionNode);
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			
			this.initListeners();
			
			this.engine  = engine;
		},

		removeFromEngine: function (engine) {
			this.playerPosNodes = null;
			this.playerLocationNodes = null;
			this.engine = null;
		},
	
		initListeners: function () {
			var uiMapHelper = this.uiMapHelper;
			var sys = this;
			GlobalSignals.playerMovedSignal.add(function () {
				sys.rebuildVis(uiMapHelper);
				sys.updateLocales();
                sys.updateOutImprovementsVisibility();
				sys.updateMovementRelatedActions();
                sys.pendingUpdateDescription = true;
			});
            GlobalSignals.improvementBuiltSignal.add(function () {
                sys.pendingUpdateDescription = true;
            });
            GlobalSignals.inventoryChangedSignal.add(function () {
                sys.pendingUpdateDescription = true;
                sys.updateOutImprovementsVisibility();
            });
            GlobalSignals.featureUnlockedSignal.add(function () {
                sys.updateUnlockedFeatures();
            });
			this.rebuildVis(uiMapHelper);
            this.updateUnlockedFeatures();
		},
		
		update: function (time) {            
            if (this.uiFunctions.gameState.uiStatus.currentTab !== this.uiFunctions.elementIDs.tabs.out)
                return;
			
			var posComponent = this.playerPosNodes.head.position;
            
            if (!this.playerLocationNodes.head) {
                console.log("WARN: No player location");
                return;
            }
			
			if (!posComponent.inCamp) {
				this.updateLevelPage();
                if (this.pendingUpdateMap) 
                    this.rebuildVis();
			}
		},
        
        updateUnlockedFeatures: function () {
            this.uiFunctions.toggle("#minimap", this.gameState.unlockedFeatures.scout);
            this.uiFunctions.toggle("#out-container-compass", this.gameState.unlockedFeatures.scout);
            this.uiFunctions.toggle("#out-container-compass-actions", this.gameState.unlockedFeatures.scout);
        },
		
		updateLevelPage: function () {
			var featuresComponent = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			var sectorStatusComponent = this.playerLocationNodes.head.entity.get(SectorStatusComponent);            
			var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			
			var vision = this.playerPosNodes.head.entity.get(VisionComponent).value;
			var hasVision = vision > PlayerStatConstants.VISION_BASE;
			var hasCamp = false;
			var hasCampHere = false;
            var isScouted = sectorStatusComponent.scouted;
            
			for (var node = this.engine.getNodeList(CampNode).head; node; node = node.next) {
				var campPosition = node.entity.get(PositionComponent);
				if (campPosition.level === this.playerPosNodes.head.position.level) {
					hasCamp = true;
					if (campPosition.sectorId() === this.playerPosNodes.head.position.sectorId()) hasCampHere = true;
					break;
				}
			}
			
			// Header
			var header = "";
			var name = featuresComponent.getSectorTypeName(hasVision || featuresComponent.sunlit);
			header = name;
            this.elements.sectorHeader.text(header);
			
			// Description
            if (this.pendingUpdateDescription || isScouted !== this.wasScouted) {
                this.elements.description.html(this.getDescription(
                    this.playerLocationNodes.head.entity,
                    hasCampHere,
                    hasCamp,
                    hasVision,
                    isScouted
                ));
                this.pendingUpdateDescription = false;
                this.wasScouted = isScouted;
            }
			
			this.updateOutImprovementsList(improvements);
			this.updateOutImprovementsStatus(hasCamp, improvements);
			
			var hasAvailableImprovements = this.elements.outImprovementsTR.filter(":visible").length > 0;
			var hasAvailableProjects = this.elements.outProjectsTR.filter(":visible").length > 0;
			this.uiFunctions.toggle("#header-out-improvements", hasAvailableImprovements);
			this.uiFunctions.toggle("#header-out-projects", hasAvailableProjects);
			
			this.updateLevelPageActions(isScouted, hasCamp, hasCampHere);
		},
        
        updateLevelPageActions: function (isScouted, hasCamp, hasCampHere) {
            var logComponent = this.playerPosNodes.head.entity.get(LogMessagesComponent);
            
            var posComponent = this.playerLocationNodes.head.position;
            var sectorLocalesComponent = this.playerLocationNodes.head.entity.get(SectorLocalesComponent);
            var sectorControlComponent = this.playerLocationNodes.head.entity.get(SectorControlComponent);
            var featuresComponent = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
            var movementOptionsComponent = this.playerLocationNodes.head.entity.get(MovementOptionsComponent);
            var workshopComponent = this.playerLocationNodes.head.entity.get(WorkshopComponent);
            var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
            var passagesComponent = this.playerLocationNodes.head.entity.get(PassagesComponent);
            
            var passageUpBuilt = improvements.getCount(improvementNames.passageUpStairs) +
                improvements.getCount(improvementNames.passageUpElevator) +
                improvements.getCount(improvementNames.passageUpHole) > 0;
            var passageDownBuilt = improvements.getCount(improvementNames.passageDownStairs) +
                improvements.getCount(improvementNames.passageDownElevator) +
                improvements.getCount(improvementNames.passageDownHole) > 0;
            this.uiFunctions.toggle("#out-action-move-up", (isScouted && passagesComponent.passageUp != null) || passageUpBuilt);
            this.uiFunctions.toggle("#out-action-move-down", (isScouted && passagesComponent.passageDown != null) || passageDownBuilt);
            this.uiFunctions.toggle("#out-action-move-camp", hasCamp && !hasCampHere);

            var discoveredResources = this.sectorHelper.getLocationDiscoveredResources();
            var isValidDespairHunger = discoveredResources.indexOf(resourceNames.food) < 0 && this.gameState.unlockedFeatures.resources.food && this.resourcesHelper.getCurrentStorage().resources.food < 0.5;
            var isValidDespairThirst = discoveredResources.indexOf(resourceNames.water) < 0 && this.gameState.unlockedFeatures.resources.water && this.resourcesHelper.getCurrentStorage().resources.water < 0.5;
            var isValidDespairStamina = this.playerPosNodes.head.entity.get(StaminaComponent).stamina < PlayerActionConstants.costs.move_sector_east.stamina;
            var isValidDespairMove = !movementOptionsComponent.canMove(); // conceivably happens in hazard sectors if you lose equipment
            var isFirstPosition = posComponent.level === 13 && posComponent.sectorX === WorldCreatorConstants.FIRST_CAMP_X && posComponent.sectorY === WorldCreatorConstants.FIRST_CAMP_Y;
            var showDespair = !hasCampHere && !isFirstPosition && (isValidDespairHunger || isValidDespairThirst || isValidDespairStamina) || isValidDespairMove;
            this.uiFunctions.toggle("#out-action-enter", hasCampHere);
            this.uiFunctions.toggle("#out-action-scout", this.gameState.unlockedFeatures.vision);
            this.uiFunctions.toggle("#out-action-use-spring", isScouted && featuresComponent.hasSpring);
            this.uiFunctions.toggle("#out-action-investigate", this.gameState.unlockedFeatures.investigate);
            this.uiFunctions.toggle("#out-action-fight-gang", this.gameState.unlockedFeatures.fight);
            this.uiFunctions.toggle("#out-action-despair", showDespair);

            // TODO do this somewhere other than UI system - maybe a global detection if despair is available
            if (showDespair && !this.isDespairVisible) {
                logComponent.addMessage(LogConstants.MSG_ID_DESPAIR_AVAILABLE, LogConstants.getDespairMessage(isValidDespairHunger, isValidDespairThirst, isValidDespairStamina, isValidDespairMove));
            }
            this.isDespairVisible = showDespair;

            this.uiFunctions.toggle("#out-action-clear-workshop", isScouted && workshopComponent != null && !sectorControlComponent.hasControlOfLocale(LocaleConstants.LOCALE_ID_WORKSHOP));
            if (workshopComponent) {
                var workshopName = TextConstants.getWorkshopName(workshopComponent.resource);
                this.elemenets.btnClearWorkshop.text("scout " + workshopName);
            }

            this.uiFunctions.slideToggleIf("#out-locales", null, isScouted && sectorLocalesComponent.locales.length > 0, 200, 0);
            this.uiFunctions.slideToggleIf("#table-out-actions-movement-related", null, isScouted, 200, 0);

            // hide movement until the player makes a light
            this.uiFunctions.toggle("#table-out-actions-movement", this.gameState.numCamps > 0);
            this.uiFunctions.toggle("#container-tab-two-out-actions h3", this.gameState.numCamps > 0);
            this.uiFunctions.toggle("#out-improvements", this.gameState.unlockedFeatures.vision);
            this.uiFunctions.toggle("#out-improvements table", this.gameState.unlockedFeatures.vision);
            
        },
		
		getDescription: function (entity, hasCampHere, hasCampOnLevel, hasVision, isScouted) {
			var passagesComponent = this.playerLocationNodes.head.entity.get(PassagesComponent);
			var workshopComponent = this.playerLocationNodes.head.entity.get(WorkshopComponent);
			var featuresComponent = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			var statusComponent = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			var hasEnemies = this.playerLocationNodes.head.entity.get(SectorControlComponent).maxSectorEnemies > 0;
			
			var description = "<p>";
			description += this.getTextureDescription(hasVision, featuresComponent, statusComponent);
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
		getTextureDescription: function (hasVision, featuresComponent, statusComponent) {
			var desc = TextConstants.getSectorDescription(
				hasVision,
				featuresComponent.sunlit,
				featuresComponent.sectorType,
				featuresComponent.buildingDensity,
				featuresComponent.stateOfRepair) + " ";
			
			if (featuresComponent.sunlit) {
				if (hasVision) desc += "The area is swathed in relentless <span class='text-highlight-functionality'>daylight</span>. ";
				else desc += "The area is swathed in blinding <span class='text-highlight-functionality'>sunlight</span>. ";
			} else {
                if (statusComponent.glowStickSeconds > -5) {
                    if (statusComponent.glowStickSeconds < 5)
                        desc += "The glowstick fades out.";
                    else
                        desc += "A glowstick casts a sickly <span class='text-highlight-functionality'>light</span>.";
                } else {
                    if (hasVision) desc += "";
                    else desc += "There is no <span class='text-highlight-functionality'>light</span>.";
                }
            }
			
			return desc;
		},
		
		// Existing improvements. Workshops. Potential improvements (camp).
		getFunctionalDescription: function (hasVision, isScouted, featuresComponent, workshopComponent, hasCampHere, hasCampOnLevel) {
			var sectorControlComponent = this.playerLocationNodes.head.entity.get(SectorControlComponent);
            
			var description = "";
            
            if (isScouted && featuresComponent.hasSpring) {
                description += "There is a <span class='text-highlight-functionality'>" + TextConstants.getSpringName(featuresComponent) + "</span> here. ";
            }
            
			if (hasCampHere) description += "There is a <span class='text-highlight-functionality'>camp</span> here. ";
			
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
					description += "This would be a good place for a <span class='text-highlight-functionality'>camp</span>. ";
			}
			
			return description;
		},
        
        getResourcesDescription: function (isScouted, featuresComponent) {
            var description = "";
			if (featuresComponent.resourcesScavengable.getTotal() > 0) {
				var discoveredResources = this.sectorHelper.getLocationDiscoveredResources();
				if (discoveredResources.length > 0) {
					description += "Resources found here: " + featuresComponent.getScaResourcesString(discoveredResources) + ". ";
				}
			}
            if (isScouted) {
                if (description.length > 0) description += "<br />";
				description += "Resources naturally occurring here: " + featuresComponent.getColResourcesString() + ". ";
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
                    if (this.movementHelper.isBlocked(entity, direction)) {
                        description += "Passage to the " + directionName + " is blocked by a " + blocker.name + ". ";
                    } else {
                        description += "A " + blocker.name.toLowerCase() + " on the " + directionName + " has been " + TextConstants.getUnblockedVerb(blocker.type) + ". ";
                    }
                }
			}
			return description;
		},
		
		getDangerDescription: function (isScouted, featuresComponent, passagesComponent, hasCampOnLevel) {
			var enemyDesc = "";
			
			var sectorControlComponent = this.playerLocationNodes.head.entity.get(SectorControlComponent);
			var enemiesComponent = this.playerLocationNodes.head.entity.get(EnemiesComponent);
			var hasEnemies = enemiesComponent.hasEnemies() && sectorControlComponent.maxSectorEnemies > 0;
			
			if (!isScouted) {
				enemyDesc += "You have not scouted this sector yet. ";
			}
			
			if (hasEnemies) {
				var defeatableBlockerN = passagesComponent.isDefeatable(PositionConstants.DIRECTION_NORTH);
				var defeatableBlockerS = passagesComponent.isDefeatable(PositionConstants.DIRECTION_SOUTH);
				var defeatableBlockerW = passagesComponent.isDefeatable(PositionConstants.DIRECTION_WEST);
				var defeatableBlockerE = passagesComponent.isDefeatable(PositionConstants.DIRECTION_EAST);
				if (isScouted) {
					enemyDesc = TextConstants.getEnemyText(enemiesComponent.possibleEnemies, sectorControlComponent, defeatableBlockerN, defeatableBlockerS, defeatableBlockerW, defeatableBlockerE);
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
                            if (inhabited && featuresComponent.stateOfRepair > 6) notCampableDesc = "Many entrances have big yellow warning signs on them, with the text 'KEEP OUT' and a radiation sign. ";
                            else if (inhabited && featuresComponent.buildingDensity > 5) notCampableDesc = "Walls are covered in graffiti warning about radiation. ";
                            else notCampableDesc = "There is an eerie air as if the place has been abandoned in a hurry.";
                            break;
                
                        case LevelConstants.UNCAMPABLE_LEVEL_TYPE_POLLUTION:
                            if (inhabited && featuresComponent.stateOfRepair > 6) notCampableDesc = "Many entrances have big red warning signs on them with a skull sign and the text 'KEEP OUT'. ";
                            else if (inhabited && featuresComponent.buildingDensity > 5) notCampableDesc = "Walls are covered in graffiti warning about some kind of pollution.";
                            else notCampableDesc = "A noxious smell hangs in the air.";
                            break;
                        
                        case LevelConstants.UNCAMPABLE_LEVEL_TYPE_SUPERSTITION:
                            if (inhabited) notCampableDesc = "There aren't any signs of recent human habitation. ";
                            else notCampableDesc = "An unnerving silence blankets the streets. ";
                            break;
                    }
                }
            }
            
            var hasHazards = featuresComponent.hazards.hasHazards();
            var hazardDesc = "";
            if (hasHazards) {
                if (featuresComponent.hazards.radiation > 0) {
                    hazardDesc += "This place is <span class='text-highlight-functionality'>radioactive</span> (" + featuresComponent.hazards.radiation + "). ";
                }
                if (featuresComponent.hazards.poison > 0) {
                    hazardDesc += "This place is dangerously <span class='text-highlight-functionality'>polluted</span> (" + featuresComponent.hazards.poison + "). ";
                }
                if (featuresComponent.hazards.cold > 0) {
                    hazardDesc += "It's very <span class='text-highlight-functionality'>cold</span> here (" + featuresComponent.hazards.cold + "). ";
                }
            }
			
			return enemyDesc + (hasHazards ? hazardDesc : notCampableDesc);
		},
		
        updateOutImprovementsList: function (improvements) {
            var playerActionsHelper = this.uiFunctions.playerActions.playerActionsHelper;
            var uiFunctions = this.uiFunctions;
            $.each(this.elements.outImprovementsTR, function () {
                var actionName = $(this).attr("btn-action");
                
                if (!actionName) {
                    actionName = $(this).find("button.action-build").attr("action");
                    $(this).attr("btn-action", actionName);
                }
                
                if (actionName) {
                    var improvementName = playerActionsHelper.getImprovementNameForAction(actionName);
                    if (improvementName) {
                        var actionEnabled = playerActionsHelper.checkRequirements(actionName, false).value >= 1;
                        var existingImprovements = improvements.getCount(improvementName);
                        var costSource = PlayerActionConstants.getCostSource(actionName);
                        var isProject = costSource === PlayerActionConstants.COST_SOURCE_CAMP;
                        $(this).find(".list-amount").text(existingImprovements);
                        uiFunctions.toggle($(this).find(".action-use"), existingImprovements > 0);
                        if (isProject) {
                            $(this).find(".list-description").text(actionEnabled ? "Available in camp" : "");
                        }
                        uiFunctions.toggle(this, actionEnabled || existingImprovements > 0);
                    }
                }
            });
        },
        
        updateOutImprovementsVisibility: function () {
			var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			var featuresComponent = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			var sectorStatusComponent = this.playerLocationNodes.head.entity.get(SectorStatusComponent);      
            
            var isScouted = sectorStatusComponent.scouted;
            
			var collectorFood = improvements.getVO(improvementNames.collector_food);
			var collectorWater = improvements.getVO(improvementNames.collector_water);
			var hasFood = isScouted && featuresComponent.resourcesCollectable.food > 0;
			var hasWater = isScouted && featuresComponent.resourcesCollectable.water > 0;
			this.uiFunctions.toggle("#out-improvements-collector-food", collectorFood.count > 0 || hasFood);
			this.uiFunctions.toggle("#out-improvements-collector-water", (collectorWater.count > 0 || hasWater) && !featuresComponent.hasSpring);
			this.uiFunctions.toggle("#out-improvements-camp", sectorStatusComponent.canBuildCamp);
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
			var sectorLocalesComponent = currentSector.get(SectorLocalesComponent);
			var sectorFeaturesComponent = currentSector.get(SectorFeaturesComponent);
			var sectorStatusComponent = currentSector.get(SectorStatusComponent);
			$("#table-out-actions-locales").empty();
			for (var i = 0; i < sectorLocalesComponent.locales.length; i++) {
				var locale = sectorLocalesComponent.locales[i];
				var button = "<button class='action' action='scout_locale_" + locale.getCategory() + "_" + i + "'>" + TextConstants.getLocaleName(locale, sectorFeaturesComponent.stateOfRepair) + "</button>";
				var info = "<span class='p-meta'>" + (sectorStatusComponent.isLocaleScouted(i) ? "Already scouted" : "") + "</span>";
				$("#table-out-actions-locales").append("<tr><td>" + button + "</td><td>" + info + "</td></tr>");
			}
            this.uiFunctions.registerActionButtonListeners("#table-out-actions-locales");
            this.uiFunctions.generateButtonOverlays("#table-out-actions-locales");
            this.uiFunctions.generateCallouts("#table-out-actions-locales");
		},
		
		updateMovementRelatedActions: function () {
            if (!this.playerLocationNodes.head) return;
            
			var currentSector = this.playerLocationNodes.head.entity;
			var movementOptionsComponent = currentSector.get(MovementOptionsComponent);
			$("#table-out-actions-movement-related").empty();
			
			function addBlockerActionButton(blocker, direction) {
                if (blocker.type !== MovementConstants.BLOCKER_TYPE_GAP) {
                    if (!movementOptionsComponent.canMoveToDirection(direction)) {
                        var action = blocker.actionBaseID + "_" + direction;
                        var description = blocker.actionDescription;
                        var button = "<button class='action' action='" + action + "'>" + description + "</button>";
                        $("#table-out-actions-movement-related").append("<tr><td>" + button + "</td></tr>");
                    }
                }
			}
			
			for (var i in PositionConstants.getLevelDirections()) {
				var direction = PositionConstants.getLevelDirections()[i];
				var directionBlocker = this.movementHelper.getBlocker(currentSector, direction);
				if (directionBlocker) addBlockerActionButton(directionBlocker, direction);
			}
			
            this.uiFunctions.registerActionButtonListeners("#table-out-actions-movement-related");
            this.uiFunctions.generateButtonOverlays("#table-out-actions-movement-related");
            this.uiFunctions.generateCallouts("#table-out-actions-movement-related");
		},
		
		rebuildVis: function (uiMapHelper) {
            if (!this.playerLocationNodes.head) return;
            if (!uiMapHelper) uiMapHelper = this.uiMapHelper;
            this.pendingUpdateMap = false;
            uiMapHelper.rebuildMap("minimap", "minimap-fallback", this.playerLocationNodes.head.position.getPosition(), UIConstants.MAP_MINIMAP_SIZE, true);
		},
    });

    return UIOutLevelSystem;
});
