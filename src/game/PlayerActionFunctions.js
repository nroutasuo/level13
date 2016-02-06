// Functions to respond to player actions parsed by the UIFunctions
define(['ash',
	'game/constants/GameConstants',
	'game/constants/LogConstants',
	'game/constants/PositionConstants',
	'game/constants/MovementConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/PlayerStatConstants',
	'game/constants/ItemConstants',
	'game/constants/PerkConstants',
	'game/constants/FightConstants',
	'game/constants/EnemyConstants',
	'game/constants/UpgradeConstants',
	'game/constants/UIConstants',
	'game/constants/TextConstants',
	'game/nodes/PlayerPositionNode',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/player/PlayerResourcesNode',
	'game/nodes/PlayerLocationNode',
	'game/nodes/NearestCampNode',
    'game/nodes/LastVisitedCampNode',
	'game/nodes/sector/CampNode',
	'game/nodes/tribe/TribeUpgradesNode',
	'game/components/common/PositionComponent',
	'game/components/common/ResourcesComponent',
	'game/components/player/ItemsComponent',
	'game/components/player/PerksComponent',
	'game/components/player/DeityComponent',
	'game/components/player/AutoPlayComponent',
	'game/components/common/PlayerActionComponent',
    'game/components/common/CampComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/sector/EnemiesComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/SectorLocalesComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/sector/LastVisitedCampComponent',
	'game/components/sector/PassagesComponent',
	'game/components/sector/events/CampEventTimersComponent',
	'game/components/common/LogMessagesComponent',
	'game/systems/ui/UIOutHeaderSystem',
	'game/systems/ui/UIOutElementsSystem',
	'game/systems/ui/UIOutLevelSystem',
	'game/systems/FaintingSystem',
	'game/systems/PlayerPositionSystem',
	'game/systems/SaveSystem',
	'game/worldcreator/WorldCreator',
	'game/worldcreator/WorldCreatorDebug'
], function (Ash,
	GameConstants, LogConstants, PositionConstants, MovementConstants, PlayerActionConstants, PlayerStatConstants, ItemConstants, PerkConstants, FightConstants, EnemyConstants, UpgradeConstants, UIConstants, TextConstants,
	PlayerPositionNode, PlayerStatsNode, PlayerResourcesNode, PlayerLocationNode,
	NearestCampNode, LastVisitedCampNode, CampNode, TribeUpgradesNode,
	PositionComponent, ResourcesComponent,
	ItemsComponent, PerksComponent, DeityComponent, AutoPlayComponent, PlayerActionComponent,
	CampComponent, SectorImprovementsComponent, EnemiesComponent,
	SectorFeaturesComponent, SectorLocalesComponent, SectorStatusComponent, LastVisitedCampComponent,
	PassagesComponent, CampEventTimersComponent,
	LogMessagesComponent,
	UIOutHeaderSystem, UIOutElementsSystem, UIOutLevelSystem, FaintingSystem, PlayerPositionSystem, SaveSystem, WorldCreator, WorldCreatorDebug
) {
    
    var PlayerActionFunctions = Ash.System.extend({
        
		playerPositionNodes: null,
		playerLocationNodes: null,
		nearestCampNodes: null,
		lastVisitedCamps: null,
        campNodes: null,
        playerStatsNodes: null,
        playerResourcesNodes: null,
        tribeUpgradesNodes: null,
        
        engine: null,
        gameState: null,
        occurrenceFunctions: null,
        playerMovedSignal: null,
        improvementBuiltSignal: null,
		
		playerActionsHelper: null,
		playerActionResultsHelper: null,
        fightHelper: null,
        resourcesHelper: null,
		levelHelper: null,
        
        constructor: function (gameState, resourcesHelper, levelHelper, playerActionsHelper, fightHelper, playerActionResultsHelper, playerMovedSignal, tabChangedSignal, improvementBuiltSignal) {
            this.gameState = gameState;
            this.resourcesHelper = resourcesHelper;
			this.levelHelper = levelHelper;
			this.playerActionsHelper = playerActionsHelper;
            this.fightHelper = fightHelper;
			this.playerActionResultsHelper = playerActionResultsHelper;
            this.playerMovedSignal = playerMovedSignal;
            this.tabChangedSignal = tabChangedSignal;
            this.improvementBuiltSignal = improvementBuiltSignal;
        },

        addToEngine: function (engine) {
            this.engine = engine;
			this.playerPositionNodes = engine.getNodeList(PlayerPositionNode);
            this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
            this.nearestCampNodes = engine.getNodeList(NearestCampNode);
            this.lastVisitedCamps = engine.getNodeList(LastVisitedCampNode);
            this.campNodes = engine.getNodeList(CampNode);
            this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
            this.playerResourcesNodes = engine.getNodeList(PlayerResourcesNode);
            this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
        },

        removeFromEngine: function (engine) {
            this.playerPositionNodes = null;
            this.playerLocationNodes = null;
            this.nearestCampNodes = null;
            this.lastVisitedCamps = null;
            this.campNodes = null;
            this.playerStatsNodes = null;
            this.playerResourcesNodes = null;
            this.tribeUpgradesNodes = null;
            this.engine = null;
        },
        
        addLogMessage: function (msgID, msg, replacements, values, pendingPosition) {
            var logComponent = this.playerPositionNodes.head.entity.get(LogMessagesComponent);
            if (pendingPosition) {
                logComponent.addMessage(msgID, msg, replacements, values, pendingPosition.level, pendingPosition.sectorId(), pendingPosition.inCamp);
            } else {
                logComponent.addMessage(msgID, msg, replacements, values);
            }
        },
        
        moveTo: function (direction) {
            var playerPos = this.playerPositionNodes.head.position;
            switch (direction) {
            case PositionConstants.DIRECTION_WEST:
                this.playerActionsHelper.deductCosts("move_sector_west");
                playerPos.sectorX--;
                break;
            case PositionConstants.DIRECTION_NORTH:
                this.playerActionsHelper.deductCosts("move_sector_north");
                playerPos.sectorY--;
                break;
            case PositionConstants.DIRECTION_SOUTH:
                this.playerActionsHelper.deductCosts("move_sector_south");
                playerPos.sectorY++;
                break;
            case PositionConstants.DIRECTION_EAST:
                this.playerActionsHelper.deductCosts("move_sector_east");
                playerPos.sectorX++;
                break;
            case PositionConstants.DIRECTION_NE:
                this.playerActionsHelper.deductCosts("move_sector_ne");
                playerPos.sectorX++;
                playerPos.sectorY--;
                break;
            case PositionConstants.DIRECTION_SE:
                this.playerActionsHelper.deductCosts("move_sector_se");
                playerPos.sectorX++;
                playerPos.sectorY++;
                break;
            case PositionConstants.DIRECTION_SW:
                this.playerActionsHelper.deductCosts("move_sector_sw");
                playerPos.sectorX--;
                playerPos.sectorY++;
                break;
            case PositionConstants.DIRECTION_NW:
                this.playerActionsHelper.deductCosts("move_sector_nw");
                playerPos.sectorX--;
                playerPos.sectorY--;
                break;
            case PositionConstants.DIRECTION_UP:
                this.playerActionsHelper.deductCosts("move_level_up");
                playerPos.level++;
                break;
            case PositionConstants.DIRECTION_DOWN:
                this.playerActionsHelper.deductCosts("move_level_down");
                playerPos.level--;
                break;
            case PositionConstants.DIRECTION_CAMP:
                if (this.nearestCampNodes.head) {
                    this.playerActionsHelper.deductCosts("move_camp_level");
                    var campSector = this.nearestCampNodes.head.entity;
                    var campPosition = campSector.get(PositionComponent);
                    playerPos.level = campPosition.level;
                    playerPos.sectorX = campPosition.sectorX;
                    playerPos.sectorY = campPosition.sectorY;
                    this.enterCamp(true);
                }
                break;
            
            default:
                console.log("WARN: unknown direction: " + direction);
                break;
            }
            
            this.forceResourceBarUpdate();
        },
        
        moveToCamp: function (level) {
            var campSector = null;
            var campPosition = null;
            for (var node = this.campNodes.head; node; node = node.next) {
                campPosition = node.position;
                if (campPosition.level === parseInt(level)) {
                    campSector = node.entity;
                    break;
                }
            }
            
            var playerPos = this.playerPositionNodes.head.position;
            if (campSector) {
                this.playerActionsHelper.deductCosts("move_camp_global");
                campPosition = campSector.get(PositionComponent);
                playerPos.level = campPosition.level;
                playerPos.sectorX = campPosition.sectorX;
                playerPos.sectorY = campPosition.sectorY;
                this.engine.getSystem(PlayerPositionSystem).update();
                this.enterCamp(true);
            } else {
                console.log("WARN: No camp found for level " + level);
            }
        },
        
        moveResFromCampToBag: function (resourcesVO) {
            var playerLevelCamp = this.nearestCampNodes.head != null ? this.nearestCampNodes.head.entity : null;
            if (playerLevelCamp) {
                var playerResources = this.playerResourcesNodes.head.resources.resources;
                var campResourcesSource = this.resourcesHelper.getCurrentStorage().resources;
                this.moveResourcesFromVOToVO(resourcesVO, campResourcesSource, playerResources);
            }
        },
        
        moveResFromBagToCamp: function () {
            var playerLevelCamp = this.nearestCampNodes.head != null ? this.nearestCampNodes.head.entity : null;
            var playerResources = this.playerResourcesNodes.head.resources.resources;
            var campResourcesSource = playerLevelCamp.get(ResourcesComponent).resources;
            this.moveResourcesFromVOToVO( playerResources, playerResources, campResourcesSource);
        },
        
        moveResourcesFromVOToVO: function (amountsVO, fromResVO, toResVO) {
            for (var key in resourceNames) {
				var name = resourceNames[key];
				var amount = Math.min(amountsVO.getResource(name), fromResVO.getResource(name));
				if (amount > 0) {
					toResVO.addResource(name, amount);
					fromResVO.addResource(name, -amount);
				}
            }
        },
        
        enterCamp: function (log) {
            var playerPos = this.playerPositionNodes.head.position;
            var campNode = this.nearestCampNodes.head;
            if (campNode && campNode.position.level === playerPos.level && campNode.position.sectorId() === playerPos.sectorId()) {
                if (!playerPos.inCamp) {
                    playerPos.inCamp = true;
                    if (this.resourcesHelper.hasCampStorage()) {
                        this.moveResFromBagToCamp();
                    }
                    
					if (this.lastVisitedCamps.head) this.lastVisitedCamps.head.entity.remove(LastVisitedCampComponent);
                    campNode.entity.add(new LastVisitedCampComponent());
                    
                    if (log) this.addLogMessage(LogConstants.MSG_ID_ENTER_CAMP, "Entered camp.");
                    this.uiFunctions.showTab(this.uiFunctions.elementIDs.tabs.in);
                    this.playerMovedSignal.dispatch(playerPos);
                    this.forceResourceBarUpdate();
                    this.save();
                }
            } else {
				playerPos.inCamp = false;
                console.log("WARN: No valid camp found.");
            }
        },
        
        enterOutTab: function () {
            var playerPos = this.playerPositionNodes.head.position;
            if (playerPos.inCamp && !this.resourcesHelper.hasCampStorage()) this.leaveCamp();
        },
        
        leaveCamp: function () {
            var playerPos = this.playerPositionNodes.head.position;
            var campNode = this.nearestCampNodes.head;
            if (campNode && campNode.position.level === playerPos.level && campNode.position.sectorId() === playerPos.sectorId()) {
                var oldPlayerPos = playerPos.clone();
                var sunlit = campNode.entity.get(SectorFeaturesComponent).sunlit;
                playerPos.inCamp = false;
                var msg = "Left camp. " + (sunlit ? "Sunlight is sharp and merciless." : " Darkess of the city envelops you.");
                this.addLogMessage(LogConstants.MSG_ID_LEAVE_CAMP, msg);
                this.playerMovedSignal.dispatch(playerPos);
                this.forceResourceBarUpdate();
                this.save();
            } else {
                console.log("WARN: No valid camp found. (player pos: " + playerPos + ")");
            }
        },
        
        startBusy: function (action) {
            var duration = PlayerActionConstants.getDuration(action);
            if (duration > 0) {
                this.playerStatsNodes.head.entity.get(PlayerActionComponent).addAction(action, duration);
            }
        },
        
        scavenge: function () {
            if (this.playerActionsHelper.checkAvailability("scavenge", true)) {
                this.playerActionsHelper.deductCosts("scavenge");
                this.gameState.unlockedFeatures.scavenge = true;
				
				var playerActionFunctions = this;
					
                var playerMaxVision = playerActionFunctions.playerStatsNodes.head.vision.maximum;
                var logMsg = "";
                var detailedMessage = "";
                if (playerMaxVision <= PlayerStatConstants.VISION_BASE) logMsg = "Rummaged in the dark. ";
                else logMsg = "Went scavenging. ";
                detailedMessage = logMsg;
                    
                this.fightHelper.handleRandomEncounter("scavenge", function () {
					var rewards = playerActionFunctions.playerActionResultsHelper.getScavengeRewards();
					playerActionFunctions.playerActionResultsHelper.collectRewards(rewards);
                    playerActionFunctions.uiFunctions.completeAction("scavenge");
					playerActionFunctions.addLogMessage(LogConstants.MSG_ID_SCAVENGE, logMsg);
                    playerActionFunctions.uiFunctions.showInfoPopup("Scavenge", detailedMessage, "Continue", rewards);
					playerActionFunctions.forceResourceBarUpdate();
					playerActionFunctions.forceTabUpdate();
				}, function () {
                    playerActionFunctions.uiFunctions.completeAction("scavenge");
                    playerActionFunctions.addLogMessage(LogConstants.MSG_ID_SCAVENGE, logMsg + "Fled empty-handed.");
                }, function () {
                    playerActionFunctions.uiFunctions.completeAction("scavenge");
                    playerActionFunctions.addLogMessage(LogConstants.MSG_ID_SCAVENGE, logMsg + "Got into a fight and was defeated.");
                });
            }
        },
        
        scout: function () {
            if (this.playerActionsHelper.checkAvailability("scout", true)) {
                var sector = this.playerLocationNodes.head.entity;
				
                var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
                var fightStrength = FightConstants.getPlayerStrength(this.playerStatsNodes.head.stamina, itemsComponent);
                var positionComponent = sector.get(PositionComponent);
                var levelOrdinal = this.gameState.getLevelOrdinal(positionComponent.level);
                var totalLevels = this.gameState.getTotalLevels();
                var groundLevelOrdinal = this.gameState.getGroundLevelOrdinal();
                if (fightStrength < EnemyConstants.getRequiredStrength(levelOrdinal, groundLevelOrdinal, totalLevels)) {
                    this.occurrenceFunctions.onScoutSectorWeakling(sector);
                    return;
                }
                
                var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
                if (!sectorStatus.scouted) {
                    this.playerActionsHelper.deductCosts("scout");
                    sectorStatus.scouted = true;
                    this.gameState.unlockedFeatures.evidence = true;
					
                    // TODO add details to message base depending on the location
					var rewards = this.playerActionResultsHelper.getScoutRewards();
                    var msgBase = "Scouted the area.";
					this.playerActionResultsHelper.collectRewards(rewards);
                    
                    // TODO signal to force out map update
					this.addLogMessage(LogConstants.MSG_ID_SCOUT, msgBase);
                    this.uiFunctions.showInfoPopup("Scout", msgBase, "Continue", rewards);
                    this.forceResourceBarUpdate();
                    this.occurrenceFunctions.onScoutSector(sector);
                    this.save();
                }
                
                this.engine.getSystem(UIOutLevelSystem).rebuildVis();
            }
        },
        
        scoutLocale: function (i) {
            var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
            var sectorLocalesComponent = this.playerLocationNodes.head.entity.get(SectorLocalesComponent);
            var sectorFeaturesComponent = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
            var localeVO = sectorLocalesComponent.locales[i];
            var action = "scout_locale_" + localeVO.getCategory() + "_" + i;
            if (this.playerActionsHelper.checkAvailability(action, true)) {
                this.playerActionsHelper.deductCosts(action);
				var playerActionFunctions = this;
                
                // TODO add more interesting log messages
                var localeName = TextConstants.getLocaleName(localeVO, sectorFeaturesComponent.stateOfRepair);
                localeName = localeName.split(" ")[localeName.split(" ").length - 1];
                var baseMsg = "Scouted the " + localeName +  ". ";
                
                this.fightHelper.handleRandomEncounter(action, function () {
                    sectorStatus.localesScouted[i] = true;
                    var rewards = playerActionFunctions.playerActionResultsHelper.getScoutLocaleRewards(localeVO);
                    playerActionFunctions.playerActionResultsHelper.collectRewards(rewards);
                    playerActionFunctions.addLogMessage(LogConstants.MSG_ID_SCOUT_LOCALE, baseMsg);
                    playerActionFunctions.forceResourceBarUpdate();
                    playerActionFunctions.uiFunctions.showInfoPopup("Scout", baseMsg, "Continue", rewards);
                    playerActionFunctions.uiFunctions.completeAction(action);
                    playerActionFunctions.engine.getSystem(UIOutLevelSystem).rebuildVis();
                    playerActionFunctions.save();
                }, function () {
                    playerActionFunctions.addLogMessage(LogConstants.MSG_ID_SCOUT_LOCALE, baseMsg + " Got surprised and fled.");
                    playerActionFunctions.uiFunctions.completeAction(action);
                    playerActionFunctions.save();
                }, function () {
                    playerActionFunctions.addLogMessage(LogConstants.MSG_ID_SCOUT_LOCALE, baseMsg + " Got surprised and beaten.");
                    playerActionFunctions.uiFunctions.completeAction(action);
                    playerActionFunctions.save();
                });
            }
        },
		
		clearWorkshop: function () {
			var action = "clear_workshop";
            if (this.playerActionsHelper.checkAvailability(action, true)) {
                this.playerActionsHelper.deductCosts(action);
				var playerActionFunctions = this;
				this.fightHelper.handleRandomEncounter(action, function () {
					playerActionFunctions.addLogMessage(LogConstants.MSG_ID_WORKSHOP_CLEARED, "Workshop cleared. Workers can now use it.");
                    playerActionFunctions.uiFunctions.completeAction(action);
                    playerActionFunctions.engine.getSystem(UIOutLevelSystem).rebuildVis();
				}, function () {
					// fled
                    playerActionFunctions.uiFunctions.completeAction(action);
				}, function () {
					// lost
                    playerActionFunctions.uiFunctions.completeAction(action);
				});
			}
		},
        
        fightGang: function (direction) {
            var action = "fight_gang_" + direction;
            if (this.playerActionsHelper.checkAvailability(action, true)) {
                this.playerActionsHelper.deductCosts(action);
				var playerActionFunctions = this;
				this.fightHelper.handleRandomEncounter(action, function () {
					playerActionFunctions.addLogMessage(LogConstants.MSG_ID_GANG_DEFEATED, "The road is clear.");
                    playerActionFunctions.uiFunctions.completeAction(action);
				}, function () {
					// fled
                    playerActionFunctions.uiFunctions.completeAction(action);
				}, function () {
					// lost
                    playerActionFunctions.uiFunctions.completeAction(action);
				});
			}
        },
        
        despair: function () {
            if (this.playerActionsHelper.checkAvailability("despair", true)) {
                this.playerActionsHelper.deductCosts("despair");
                this.engine.getSystem(FaintingSystem).checkFainting();
                this.uiFunctions.completeAction("despair");
            }
        },
        
        buildCamp: function () {
            if (this.playerActionsHelper.checkAvailability("build_out_camp", true)) {
                this.playerActionsHelper.deductCosts("build_out_camp");
                
                var sector = this.playerLocationNodes.head.entity;
                var campComponent = new CampComponent();
                sector.add(campComponent);
                sector.add(new CampEventTimersComponent());
				
				var level = this.levelHelper.getLevelEntityForSector(sector);
				level.add(campComponent);
				
                this.buildStorage(true, sector);
                
                this.addLogMessage(LogConstants.MSG_ID_BUILT_CAMP, "Built a camp.");
                this.forceResourceBarUpdate();
                this.save();
            }
        },
		
		buildPassageUpStairs: function (sectorPos) {
            this.buildPassage(sectorPos, true, "build_out_passage_up_stairs", "build_out_passage_down_stairs");
        },
        
        buildPassageDownStairs: function (sectorPos) {
            this.buildPassage(sectorPos, false, "build_out_passage_down_stairs", "build_out_passage_up_stairs");
        },
		
		buildPassageUpElevator: function (sectorPos) {
            this.buildPassage(sectorPos, true, "build_out_passage_up_elevator", "build_out_passage_down_elevator");
        },
        
        buildPassageDownElevator: function (sectorPos) {
            this.buildPassage(sectorPos, false, "build_out_passage_down_elevator", "build_out_passage_up_elevator");
        },
		
		buildPassageUpHole: function (sectorPos) {
            this.buildPassage(sectorPos, true, "build_out_passage_up_hole", "build_out_passage_down_hole");
        },
        
        buildPassageDownHole: function (sectorPos) {
            this.buildPassage(sectorPos, false, "build_out_passage_down_hole", "build_out_passage_up_hole");
        },
        
        buildPassage: function (sectorPos, up, action, neighbourAction) {
			var l = parseInt(sectorPos.split(".")[0]);
			var sX = parseInt(sectorPos.split(".")[1]);
			var sY = parseInt(sectorPos.split(".")[2]);
            var playerPos = this.playerPositionNodes.head.position;
			var sector = this.levelHelper.getSectorByPosition(l, sX, sY);
			var neighbour = this.levelHelper.getSectorByPosition(up ? l + 1 : l - 1, sX, sY);
			
			if (sector && neighbour) {
				var msg = "Passage " + (up ? " up" : " down") + " ready in sector " + sX + "." + sY + (playerPos.level === l ? "" : ", level " + l);
				this.buildImprovement(action, this.playerActionsHelper.getImprovementNameForAction(action), sector);
				this.buildImprovement(neighbourAction, this.playerActionsHelper.getImprovementNameForAction(neighbourAction), neighbour, true);
				this.addLogMessage(LogConstants.MSG_ID_BUILT_PASSAGE, msg);
			} else {
				console.log("WARN: Couldn't find sectors for building passage.");
				console.log(sector);
				console.log(neighbour);
				console.log(sectorPos);
			}
		},
        
        buildTrap: function () {
            this.buildImprovement("build_out_collector_food", this.playerActionsHelper.getImprovementNameForAction("build_out_collector_food"));
            this.addLogMessage(LogConstants.MSG_ID_BUILT_TRAP, "Built a trap. It will catch food.");
        },
        
        buildBucket: function () {
            this.buildImprovement("build_out_collector_water", this.playerActionsHelper.getImprovementNameForAction("build_out_collector_water"));
            this.addLogMessage(LogConstants.MSG_ID_BUILT_BUCKET, "Made a bucket. It will collect water.");
        },
        
        buildHouse: function () {
            if (this.playerActionsHelper.checkAvailability("build_in_house")) {
                this.buildImprovement("build_in_house", this.playerActionsHelper.getImprovementNameForAction("build_in_house"), null);
                var msg = "Built a hut.";
                var totalHouses = 0;
                for (var node = this.engine.getNodeList(CampNode).head; node; node = node.next) {
                    var improvementsComponent = node.entity.get(SectorImprovementsComponent);
                    totalHouses += improvementsComponent.getCount(improvementNames.house);
                }
                if (totalHouses < 5) msg += " People will come if they hear about the camp.";
                this.addLogMessage(LogConstants.MSG_ID_BUILT_HOUSE, msg);
            }
        },
        
        buildHouse2: function () {
            this.buildImprovement("build_in_house2", this.playerActionsHelper.getImprovementNameForAction("build_in_house2"));
            if (this.playerActionsHelper.checkAvailability("build_in_house2")) {
                var msg = "Built a tower block.";
                this.addLogMessage(LogConstants.MSG_ID_BUILT_HOUSE, msg);
            }
        },
        
        buildLights: function () {
            this.buildImprovement("build_in_lights", this.playerActionsHelper.getImprovementNameForAction("build_in_lights"));
            if (this.playerActionsHelper.checkAvailability("build_in_lights")) {
                var msg = "Installed lights to the camp.";
                this.addLogMessage(LogConstants.MSG_ID_BUILT_LIGHTS, msg);
            }
        },
        
        buildCeiling: function () {
            this.buildImprovement("build_in_ceiling", this.playerActionsHelper.getImprovementNameForAction("build_in_ceiling"));
            if (this.playerActionsHelper.checkAvailability("build_in_ceiling")) {
                var msg = "Build a big tent to protect the camp from the sun.";
                this.addLogMessage(LogConstants.MSG_ID_BUILT_CEILING, msg);
            }
        },
        
        buildStorage: function (automatic, sector) {
            this.buildImprovement("build_in_storage", this.playerActionsHelper.getImprovementNameForAction("build_in_storage"), null, automatic);
            if (!automatic) {
                this.addLogMessage(LogConstants.MSG_ID_BUILT_STORAGE, "Built a storage.");
            }
        },
        
        buildFortification: function () {
            this.buildImprovement("build_in_fortification", this.playerActionsHelper.getImprovementNameForAction("build_in_fortification"));
            this.addLogMessage(LogConstants.MSG_ID_BUILT_FORTIFICATION, "Fortified the camp.");
        },
		
		buildAqueduct: function () {
			this.buildImprovement("build_in_aqueduct", this.playerActionsHelper.getImprovementNameForAction("build_in_aqueduct"));
			this.addLogMessage(LogConstants.MSG_ID_BUILT_AQUEDUCT, "Built an aqueduct.");
		},
        
        buildBarracks: function () {
            this.buildImprovement("build_in_barracks", this.playerActionsHelper.getImprovementNameForAction("build_in_barracks"));
            this.addLogMessage(LogConstants.MSG_ID_BUILT_BARRACKS, "Built a barracks.");
        },
        
        buildSmithy: function () {
            this.buildImprovement("build_in_smithy", this.playerActionsHelper.getImprovementNameForAction("build_in_smithy"));
            this.addLogMessage(LogConstants.MSG_ID_BUILT_SMITHY, "Built a smithy.");
        },
        
        buildApothecary: function () {
            this.buildImprovement("build_in_apothecary", this.playerActionsHelper.getImprovementNameForAction("build_in_apothecary"));
            this.addLogMessage(LogConstants.MSG_ID_BUILT_APOTHECARY, "Built an apothecary.");
        },
        
        buildCementMill: function () {
            this.buildImprovement("build_in_cementmill", this.playerActionsHelper.getImprovementNameForAction("build_in_cementmill"));
            this.addLogMessage(LogConstants.MSG_ID_BUILT_CEMENT_MILL, "Built a cement mill for making concrete.");
        },
        
        buildRadioTower: function () {
            this.buildImprovement("build_in_radio", this.playerActionsHelper.getImprovementNameForAction("build_in_radio"));
            this.addLogMessage(LogConstants.MSG_ID_BUILT_RADIO, "Built a radio tower.");
        },
        
        buildCampfire: function () {
            this.buildImprovement("build_in_campfire", this.playerActionsHelper.getImprovementNameForAction("build_in_campfire"));
            this.addLogMessage(LogConstants.MSG_ID_BUILT_CAMPFIRE, "Built a campfire. Here, ideas are shared and discussed.");
        },
        
        buildDarkFarm: function () {
            this.buildImprovement("build_in_darkfarm", this.playerActionsHelper.getImprovementNameForAction("build_in_darkfarm"));
            this.addLogMessage(LogConstants.MSG_ID_BUILT_DARKFARM, "Built a snail farm.");
        },
        
        buildHospital: function () {
            this.buildImprovement("build_in_hospital", this.playerActionsHelper.getImprovementNameForAction("build_in_hospital"));
            this.addLogMessage(LogConstants.MSG_ID_BUILT_HOSPITAL, "Built a hospital.");
        },
        
        buildLibrary: function () {
            this.buildImprovement("build_in_library", this.playerActionsHelper.getImprovementNameForAction("build_in_library"));
            this.addLogMessage(LogConstants.MSG_ID_BUILT_LIBRARY, "Built a library.");
        },
        
        buildMarket: function () {
            this.buildImprovement("build_in_market", this.playerActionsHelper.getImprovementNameForAction("build_in_market"));
            this.addLogMessage(LogConstants.MSG_ID_BUILT_MARKET, "Built a market.");
        },
        
        buildTradingPost: function () {
            this.buildImprovement("build_in_tradingPost", this.playerActionsHelper.getImprovementNameForAction("build_in_tradingPost"));
            this.addLogMessage(LogConstants.MSG_ID_BUILT_TRADING_POST, "Build a trading post.");
        },
        
        buildInn: function () {
            this.buildImprovement("build_in_inn", this.playerActionsHelper.getImprovementNameForAction("build_in_inn"));
            this.addLogMessage(LogConstants.MSG_ID_BUILT_INN, "Build an inn. Maybe it will attract adventurers.");
        },
        
        buildBridge: function (sectorPos) {
			var l = parseInt(sectorPos.split(".")[0]);
			var sX = parseInt(sectorPos.split(".")[1]);
			var sY = parseInt(sectorPos.split(".")[2]);
			var direction = parseInt(sectorPos.split(".")[3]);
			var sector = this.levelHelper.getSectorByPosition(l, sX, sY);
            if (this.playerActionsHelper.checkAvailability("build_out_bridge", true, sector)) {
                var positionComponent = sector.get(PositionComponent);
                var passagesComponent = sector.get(PassagesComponent);
				var blocker = passagesComponent.getBlocker(direction);
				
				if (!blocker || blocker.type !== MovementConstants.BLOCKER_TYPE_GAP) {
					console.log("WARN: Can't build bridge because there is no gap: " + sectorPos);
                    return;
				}
                
                // Find neighbour
				var neighbourPos = PositionConstants.getPositionOnPath(positionComponent.getPosition(), direction, 1);
                var neighbour = this.levelHelper.getSectorByPosition(neighbourPos.level, neighbourPos.sectorX, neighbourPos.sectorY);
                var neighbourPassagesComponent = neighbour.get(PassagesComponent);
				var neighbourBlocker = neighbourPassagesComponent.getBlocker(PositionConstants.getOppositeDirection(direction));
                
				if (!neighbourBlocker || neighbourBlocker.type !== MovementConstants.BLOCKER_TYPE_GAP) {
                    console.log("WARN: Trying to build bridge but neighbour have gap.");
                    return;
                }
                
                this.buildImprovement("build_out_bridge", this.playerActionsHelper.getImprovementNameForAction("build_out_bridge"), sector);
                this.buildImprovement("build_out_bridge", this.playerActionsHelper.getImprovementNameForAction("build_out_bridge"), neighbour, true);
            }
        },
        
        collectFood: function () {
            this.collectCollector("use_out_collector_food", "collector_food");
        },
        
        collectWater: function () {
            this.collectCollector("use_out_collector_water", "collector_water");
        },
        
        useCampfire: function () {
            var campSector = this.nearestCampNodes.head.entity;
            var campComponent = campSector.get(CampComponent);
            if (this.playerActionsHelper.checkAvailability("use_in_campfire", true) && campSector) {
                this.playerActionsHelper.deductCosts("use_in_campfire");
                if (campComponent.rumourpool >= 1) {
                    campComponent.rumourpool--;
                    this.playerStatsNodes.head.rumours.value++;
                    this.addLogMessage(LogConstants.MSG_ID_USE_CAMPFIRE_SUCC, "Sat at the campfire to exchange stories about the corridors.");
                } else {
                    this.addLogMessage(LogConstants.MSG_ID_USE_CAMPFIRE_FAIL, "Sat at the campfire to exchange stories, but there was nothing new.");
                    campComponent.rumourpoolchecked = true;
                }
            }
            this.uiFunctions.completeAction("use_in_campfire");
            this.forceResourceBarUpdate();
        },
        
        useHospital: function(automatic) {
            if(automatic || this.playerActionsHelper.checkAvailability("use_in_hospital", true)) {
                this.playerActionsHelper.deductCosts("use_in_hospital");
                
                var perksComponent = this.playerPositionNodes.head.entity.get(PerksComponent);
                perksComponent.removeItemsByType(PerkConstants.perkTypes.injury);
                this.addLogMessage(LogConstants.MSG_ID_USE_HOSPITAL, "Healed all injuries.");
            }
            this.forceResourceBarUpdate();
            this.gameState.unlockedFeatures.fight = true;
        },
        
        useHospital2: function () {
            if(this.playerActionsHelper.checkAvailability("use_in_hospital2", true)) {
                this.playerActionsHelper.deductCosts("use_in_hospital2");
                
                var perksComponent = this.playerPositionNodes.head.entity.get(PerksComponent);
                perksComponent.addPerk(PerkConstants.getPerk(PerkConstants.perkIds.healthAugment));
                this.addLogMessage(LogConstants.MSG_ID_USE_HOSPITAL2, "Improved health.");
            }
            this.forceResourceBarUpdate();
        },
        
        useInn: function (auto) {
            if (this.playerActionsHelper.checkAvailability("use_in_inn", true)) {
                // TODO add varied results depending on follower
                var sector = this.playerLocationNodes.head.entity;
                var positionComponent = sector.get(PositionComponent);
                var campCount = this.gameState.numCamps;
                var follower = ItemConstants.getFollower(positionComponent.level, campCount);
                var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
                var currentFollowers = itemsComponent.getCountByType(ItemConstants.itemTypes.follower);
                if (currentFollowers < FightConstants.getMaxFollowers(this.gameState.numCamps)) {
                    this.playerActionsHelper.deductCosts("use_in_inn");
                    this.addFollower(follower);
                    return true;
                } else {
                    var oldFollower = itemsComponent.getWeakestByType(ItemConstants.itemTypes.follower);
                    if (auto) {
                        if (oldFollower.bonus < follower.bonus) {
                            itemsComponent.discardItem(oldFollower);
                            this.addFollower(follower);
                            return true;
                        }
                    } else {
                        var oldFollowerLi = UIConstants.getItemLI(oldFollower);
                        var newFollowerLi = UIConstants.getItemLI(follower);
                        var playerActions = this;
                        this.uiFunctions.showConfirmation(
                            "<p>Do you want to invite this new follower to join your party? Someone else will have to leave to make room.</p>" +
                            "Joining:<br/>" +
                            "<ul class='resultlist' id='inn-follower-list-join'>" + newFollowerLi + "</ul><br/>" +
                            "Leaving:<br/>" +
                            "<ul class='resultlist' id='inn-follower-list-leave'>" + oldFollowerLi + "</ul><br/>",
                            function () {
                                playerActions.playerActionsHelper.deductCosts("use_in_inn");
                                itemsComponent.discardItem(oldFollower);
                                playerActions.addFollower(follower);
                        });
                        this.uiFunctions.generateCallouts("#inn-follower-list-join");
                        this.uiFunctions.generateCallouts("#inn-follower-list-leave");
                    }
                }
                this.uiFunctions.completeAction("use_in_inn");
            }
            
            return false;
        },
        
        addFollower: function(follower) {
            var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
            itemsComponent.addItem(follower);
            this.addLogMessage(LogConstants.MSG_ID_ADD_FOLLOWER, "A wanderer agrees to travel together for awhile.");
            this.forceResourceBarUpdate();
            this.forceStatsBarUpdate();
            this.save();
        },
        
        craftItem: function (itemId) {
			var actionName = "craft_" + itemId;
            if (this.playerActionsHelper.checkAvailability(actionName, true)) {
                this.playerActionsHelper.deductCosts(actionName);
                
                var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
                var item = this.playerActionsHelper.getItemForCraftAction(actionName);
                itemsComponent.addItem(item.clone());
                
				this.gameState.unlockedFeatures.vision = true;
                           
                this.addLogMessage(LogConstants.MSG_ID_CRAFT_ITEM, "Crafted " + item.name);
                this.forceResourceBarUpdate();
                this.save();
            }
        },
        
        unlockUpgrade: function(upgradeId) {
            this.tribeUpgradesNodes.head.upgrades.useBlueprint(upgradeId);
        },
        
        buyUpgrade: function(upgradeId, automatic) {
            if (automatic || this.playerActionsHelper.checkAvailability(upgradeId, true)) {
                this.playerActionsHelper.deductCosts(upgradeId);
                this.tribeUpgradesNodes.head.upgrades.addUpgrade(upgradeId);
                this.save();
            }
        },
        
        collectCollector: function(actionName, improvementName) {
            if(this.playerActionsHelper.checkAvailability(actionName, true)) {
                this.playerActionsHelper.deductCosts(actionName);
                var currentStorage = this.resourcesHelper.getCurrentStorage();
                
                var sector = this.playerLocationNodes.head.entity;
                var improvementsComponent = sector.get(SectorImprovementsComponent);
                var improvementVO = improvementsComponent.getVO(improvementNames[improvementName]);
                var resourcesVO = improvementVO.storedResources;
                
                var totalCollected = 0;                
                for(var key in resourceNames) {
                    var name = resourceNames[key];
                    var amount = resourcesVO.getResource(name);
                    if (amount >= 1) {
                        currentStorage.resources.addResource(name, amount);
                        totalCollected += amount;
                    }
                }
                
                if (totalCollected > 0) {
                    resourcesVO.reset(); 
                }
                else
                {
                    this.addLogMessage(LogConstants.MSG_ID_USE_COLLECTOR_FAIL, "Nothing to collect yet.");
                }
                
                this.forceResourceBarUpdate();
            }
        },
        
        buildImprovement: function(actionName, improvementName, otherSector, isFree) {
            var sector = otherSector || this.playerLocationNodes.head.entity;
            if (isFree || this.playerActionsHelper.checkAvailability(actionName, true, sector)) {
                if (typeof isFree == "undefined" || !isFree) this.playerActionsHelper.deductCosts(actionName);
                
                var improvementsComponent = sector.get(SectorImprovementsComponent);
                improvementsComponent.add(improvementName);
                
                this.improvementBuiltSignal.dispatch();
                this.forceResourceBarUpdate();                
                this.save();
            }
        },
        
        assignWorkers: function(scavengers, trappers, waters, ropers, chemists, apothecaries, smiths, concrete, soldiers) {
            var camp = null;
			for (var node = this.engine.getNodeList(CampNode).head; node; node = node.next) {
                if (node.entity.get(PositionComponent).level == this.playerPositionNodes.head.position.level) {
                    camp = node.camp;
                }
            }
            
            if (camp) {
                camp.assignedWorkers.scavenger = Math.max(0, Math.floor(scavengers));
                camp.assignedWorkers.trapper = Math.max(0, Math.floor(trappers));
                camp.assignedWorkers.water = Math.max(0, Math.floor(waters));
                camp.assignedWorkers.ropemaker = Math.max(0, Math.floor(ropers));
                camp.assignedWorkers.chemist = Math.max(0, Math.floor(chemists));
                camp.assignedWorkers.apothecary = Math.max(0, Math.floor(apothecaries));
                camp.assignedWorkers.toolsmith = Math.max(0, Math.floor(smiths));
                camp.assignedWorkers.concrete = Math.max(0, Math.floor(concrete));
                camp.assignedWorkers.soldier = Math.max(0, Math.floor(soldiers));
            }
            else {
                console.log("WARN: No camp found for worker assignment.");
            }
        },
        
        getNearestCampName: function () {
            var campSector = this.nearestCampNodes.head.entity;
            if (campSector) {
                return campSector.get(CampComponent).campName;
            } else {
                return "";
            }
        },
        
        setNearestCampName: function (newName) {
            var campSector = this.nearestCampNodes.head.entity;
            if (campSector) {
                campSector.get(CampComponent).campName = newName;
                this.save();
            }
        },
        		
        forceResourceBarUpdate: function () {
            var system = this.engine.getSystem(UIOutHeaderSystem);
            system.lastUpdateTimeStamp = 0;   
        },
        
        forceStatsBarUpdate: function () {
            var system = this.engine.getSystem(UIOutHeaderSystem);
            system.updateItems(true);
            system.updatePerks(true);
            system.updatePlayerStats(true);
            system.updateDeity(true);
        },
        
        forceTabUpdate: function () {
            var system = this.engine.getSystem(UIOutElementsSystem);
            system.updateTabVisibility();
        },
        
        save: function () {
            var saveSystem = this.engine.getSystem(SaveSystem);
            saveSystem.save();
        },
        
        cheat: function (input) {
			var currentSector = this.playerLocationNodes.head ? this.playerLocationNodes.head.entity : null;
            var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
            var perksComponent = this.playerStatsNodes.head.entity.get(PerksComponent);
            var campCount = this.gameState.numCamps;
			
            var inputParts = input.split(" ");
            var name = inputParts[0];
            switch(name) {
				case "speed":
					GameConstants.gameSpeed = parseFloat(inputParts[1]);
					break;
				
				case "res":
                    var amount = 0;
                    if (inputParts.length > 1) {
                        amount = parseInt(inputParts[1]);
                    } else {
                        amount = this.resourcesHelper.getCurrentStorageCap();
                    }
                    var playerResources = this.resourcesHelper.getCurrentStorage().resources;
                    for(var key in resourceNames) {
                        var name = resourceNames[key];
                        if(this.gameState.unlockedFeatures.resources[name])
                            playerResources.setResource(name, amount);
                    }
                    this.forceResourceBarUpdate();
					break;
                
                case "stat":                    
                    this.playerStatsNodes.head.stamina.stamina = this.playerStatsNodes.head.stamina.health;
                    this.playerStatsNodes.head.vision.value = 75;
                    this.playerStatsNodes.head.rumours.value = Math.max(this.playerStatsNodes.head.rumours.value, 0);
                    this.playerStatsNodes.head.rumours.value++;
                    this.playerStatsNodes.head.rumours.value *= 2;
                    this.playerStatsNodes.head.evidence.value++;
                    this.playerStatsNodes.head.evidence.value *= 2;
                    break;
                
                case "deity":
                    var name = inputParts[1];
                    this.playerStatsNodes.head.entity.add(new DeityComponent(name));
                    break;
                
                case "favour":
                    if (this.playerStatsNodes.head.entity.get(DeityComponent)) {
                        this.gameState.unlockedFeatures.favour = true;
                        this.playerStatsNodes.head.entity.get(DeityComponent).favour++;
                        this.playerStatsNodes.head.entity.get(DeityComponent).favour *= 2;
                    } else {
                        console.log("WARN: No deity.");
                    }
                
                case "vision":                    
                    this.playerStatsNodes.head.vision.value = parseInt(inputParts[1]);
                    break;
                
                case "stamina":                    
                    this.playerStatsNodes.head.stamina.stamina = this.playerStatsNodes.head.stamina.health;
                    break;
                
				case "pop":
                    var camp = currentSector.get(CampComponent);
                    if (camp) {
                        if (inputParts.length > 1) {
                            var pop = parseInt(inputParts[1]);
                            camp.setPopulation(pop);
                        } else {
                            camp.addPopulation(1);
                        }
                    } else {
                        console.log("WARN: Camp not found.");
                    }
					break;
                
                case "pos":
                    var playerPos = this.playerPositionNodes.head.position;
                    if (inputParts.length === 1) {
                        console.log(playerPos);
                    } else {
                        playerPos.level = parseInt(inputParts[1]);
                        playerPos.sectorX = parseInt(inputParts[2]);
                        playerPos.sectorY = parseInt(inputParts[3]);
                    }
                    break;
                
                case "camp":
					var numCamps = parseInt(inputParts[1]);
					if(!numCamps || numCamps < 1) numCamps = 1;
			
					this.cheat("item " + ItemConstants.itemDefinitions.bag[0].id);
			
					var autoplayStep = function () {
						if (this.gameState.numCamps >= numCamps) {
							this.engine.updateComplete.remove(autoplayStep, this);
							this.cheat("autoplay off");
						}
					}
					this.cheat("autoplay true");
					this.engine.updateComplete.add(autoplayStep, this);					
                    break;
				
				case "autoplay":
					var param = inputParts[1];
					if (param === "off")
						this.playerStatsNodes.head.entity.remove(AutoPlayComponent);
					else if (param === "true") {
						if (!this.playerStatsNodes.head.entity.has(AutoPlayComponent)) this.playerStatsNodes.head.entity.add(new AutoPlayComponent(true));
					} else {
						if (!this.playerStatsNodes.head.entity.has(AutoPlayComponent)) this.playerStatsNodes.head.entity.add(new AutoPlayComponent(false));
					}
					break;
                
                case "heal":
                    this.useHospital(true);
                    break;
                
                case "injury":
                    var defaultInjury = PerkConstants.perkDefinitions.injury[0];
                    perksComponent.addPerk(defaultInjury.clone());
                    break;
                
                case "building":
                    var name = inputParts[1];
                    var amount = parseInt(inputParts[2]);
                    var sector = this.playerLocationNodes.head.entity;                
                    var improvementsComponent = sector.get(SectorImprovementsComponent);
                    improvementsComponent.add(name, amount);                    
                    break;
                
                case "blueprint":
                    var name = inputParts[1];
                    this.tribeUpgradesNodes.head.upgrades.addNewBlueprint(name);
                    break;
                
                case "tech":
                    var name = inputParts[1];
                    if (name !== "all")
                        this.buyUpgrade(name, true);
                    else
                        for (var id in UpgradeConstants.upgradeDefinitions) {
                            this.buyUpgrade(id, true);
                        }
                    break;
                
                case "item":
                    var itemID = inputParts[1];
                    var item = ItemConstants.getItemByID(itemID);
                    if (item) {
                        itemsComponent.addItem(item);                       
                    } else {
                        console.log("WARN: No such item: " + itemID);
                    }
                    break;
                
                case "follower":
                var follower = ItemConstants.getFollower(this.playerPositionNodes.head.position.level, campCount);
                    this.addFollower(follower);
                    break;
                
                case "perk":
                    var perkID = inputParts[1];
                    var perk = PerkConstants.getPerk(perkID);
                    if (perk) {
                        perksComponent.addPerk(perk);                       
                    } else {
                        console.log("WARN: No such perk: " + perkID);
                    }
                    break;
                
                case "resetcooldowns":
                    this.gameState.actionCooldownEndTimestamps = {};
                    break;
                
                case "printLevel":
                    var l = this.playerPositionNodes.head.position.level;
                    WorldCreatorDebug.printLevel(WorldCreator.world, WorldCreator.world.getLevel(l));
                    break;
            }
        }
    });

    return PlayerActionFunctions;
});