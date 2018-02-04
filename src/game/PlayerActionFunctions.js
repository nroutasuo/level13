// Functions to respond to player actions parsed by the UIFunctions
define(['ash',
    'game/GlobalSignals',
	'game/constants/LogConstants',
	'game/constants/PositionConstants',
	'game/constants/MovementConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/PlayerStatConstants',
	'game/constants/ItemConstants',
	'game/constants/PerkConstants',
	'game/constants/FightConstants',
	'game/constants/TradeConstants',
	'game/constants/UpgradeConstants',
	'game/constants/TextConstants',
	'game/vos/PositionVO',
	'game/vos/LocaleVO',
	'game/nodes/PlayerPositionNode',
	'game/nodes/FightNode',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/player/PlayerResourcesNode',
	'game/nodes/PlayerLocationNode',
	'game/nodes/NearestCampNode',
    'game/nodes/LastVisitedCampNode',
	'game/nodes/sector/CampNode',
	'game/nodes/tribe/TribeUpgradesNode',
	'game/components/common/PositionComponent',
	'game/components/common/ResourcesComponent',
	'game/components/player/BagComponent',
	'game/components/player/ItemsComponent',
	'game/components/player/PerksComponent',
	'game/components/player/DeityComponent',
	'game/components/player/PlayerActionComponent',
	'game/components/player/PlayerActionResultComponent',
    'game/components/common/CampComponent',
    'game/components/common/CurrencyComponent',
	'game/components/type/LevelComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/sector/improvements/WorkshopComponent',
	'game/components/sector/ReputationComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/SectorLocalesComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/sector/LastVisitedCampComponent',
	'game/components/sector/PassagesComponent',
	'game/components/sector/OutgoingCaravansComponent',
	'game/components/sector/events/CampEventTimersComponent',
	'game/components/sector/events/TraderComponent',
	'game/components/common/LogMessagesComponent',
	'game/systems/ui/UIOutHeaderSystem',
	'game/systems/ui/UIOutElementsSystem',
	'game/systems/ui/UIOutLevelSystem',
	'game/systems/FaintingSystem',
	'game/systems/PlayerPositionSystem',
	'game/systems/SaveSystem',
], function (Ash, GlobalSignals,
	LogConstants, PositionConstants, MovementConstants, PlayerActionConstants, PlayerStatConstants, ItemConstants, PerkConstants, FightConstants, TradeConstants, UpgradeConstants, TextConstants,
	PositionVO, LocaleVO,
    PlayerPositionNode, FightNode, PlayerStatsNode, PlayerResourcesNode, PlayerLocationNode,
	NearestCampNode, LastVisitedCampNode, CampNode, TribeUpgradesNode,
	PositionComponent, ResourcesComponent,
	BagComponent, ItemsComponent, PerksComponent, DeityComponent, PlayerActionComponent, PlayerActionResultComponent,
	CampComponent, CurrencyComponent, LevelComponent, SectorImprovementsComponent, WorkshopComponent,
	ReputationComponent, SectorFeaturesComponent, SectorLocalesComponent, SectorStatusComponent, LastVisitedCampComponent,
	PassagesComponent, OutgoingCaravansComponent, CampEventTimersComponent, TraderComponent,
	LogMessagesComponent,
	UIOutHeaderSystem, UIOutElementsSystem, UIOutLevelSystem, FaintingSystem, PlayerPositionSystem, SaveSystem
) {
    
    var PlayerActionFunctions = Ash.System.extend({
        
		playerPositionNodes: null,
		playerLocationNodes: null,
		nearestCampNodes: null,
		lastVisitedCamps: null,
        campNodes: null,
        fightNodes: null,
        playerStatsNodes: null,
        playerResourcesNodes: null,
        tribeUpgradesNodes: null,
        
        engine: null,
        gameState: null,
        occurrenceFunctions: null,
		
		playerActionsHelper: null,
		playerActionResultsHelper: null,
        fightHelper: null,
        resourcesHelper: null,
		levelHelper: null,
        
        constructor: function (gameState, resourcesHelper, levelHelper, playerActionsHelper, fightHelper, playerActionResultsHelper) {
            this.gameState = gameState;
            this.resourcesHelper = resourcesHelper;
			this.levelHelper = levelHelper;
			this.playerActionsHelper = playerActionsHelper;
            this.fightHelper = fightHelper;
			this.playerActionResultsHelper = playerActionResultsHelper;
        },

        addToEngine: function (engine) {
            this.engine = engine;
			this.playerPositionNodes = engine.getNodeList(PlayerPositionNode);
            this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
            this.nearestCampNodes = engine.getNodeList(NearestCampNode);
            this.lastVisitedCamps = engine.getNodeList(LastVisitedCampNode);
            this.campNodes = engine.getNodeList(CampNode);
            this.fightNodes = engine.getNodeList(FightNode);
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
        
        startAction: function (action, param) {
            console.log("start action: " + action + " | " + param);
            var otherSector = this.getActionSector(action, param);
            if (!this.playerActionsHelper.checkAvailability(action, true, otherSector))
                return false;
            
            this.playerActionsHelper.deductCosts(action);
            this.forceResourceBarUpdate();
            
            var baseId = this.playerActionsHelper.getBaseActionID(action);
            var duration = PlayerActionConstants.getDuration(baseId);
            if (duration > 0) {
                this.startBusy(action, param);
            } else {
                this.performAction(action, param);
            }
            
            return true;
        },
        
        startBusy: function (action, param) {
            var baseId = this.playerActionsHelper.getBaseActionID(action);
            var duration = PlayerActionConstants.getDuration(baseId);
            if (duration > 0) {
                var isBusy = PlayerActionConstants.isBusyAction(baseId);
                this.playerStatsNodes.head.entity.get(PlayerActionComponent).addAction(action, duration, param, isBusy);
                
                switch (baseId) {
                    case "send_caravan":
                        this.addLogMessage(LogConstants.MSG_ID_START_SEND_CAMP, "A trade caravan heads out.");
                        break;
                }
            }
        },
        
        performAction: function (action, param) {
            var baseId = this.playerActionsHelper.getBaseActionID(action);
            switch (baseId) {
                // Out improvements
                case "build_out_collector_water": this.buildBucket(param); break;
                case "build_out_collector_food": this.buildTrap(param); break;
                case "use_out_collector_water": this.collectWater(param); break;
                case "use_out_collector_food": this.collectFood(param); break;
                case "build_out_camp": this.buildCamp(param); break;
                case "build_out_bridge": this.buildBridge(param); break;
                case "build_out_passage_down_stairs": this.buildPassageDownStairs(param); break;
                case "build_out_passage_down_elevator": this.buildPassageDownElevator(param); break;
                case "build_out_passage_down_hole": this.buildPassageDownHole(param); break;
                case "build_out_passage_up_stairs": this.buildPassageUpStairs(param); break;
                case "build_out_passage_up_elevator": this.buildPassageUpElevator(param); break;
                case "build_out_passage_up_hole": this.buildPassageUpHole(param); break;
                case "build_out_spaceship1": this.buildSpaceShip1(param); break;
                case "build_out_spaceship2": this.buildSpaceShip2(param); break;
                case "build_out_spaceship3": this.buildSpaceShip3(param); break;
                // In improvements
                case "build_in_campfire": this.buildCampfire(param); break;
                case "build_in_house": this.buildHouse(param); break;
                case "build_in_house2": this.buildHouse2(param); break;
                case "build_in_storage": this.buildStorage(param); break;
                case "build_in_generator": this.buildGenerator(param); break;
                case "build_in_darkfarm": this.buildDarkFarm(param); break;
                case "build_in_hospital": this.buildHospital(param); break;
                case "build_in_ceiling": this.buildCeiling(param); break;
                case "build_in_inn": this.buildInn(param); break;
                case "build_in_tradingPost": this.buildTradingPost(param); break;
                case "build_in_library": this.buildLibrary(param); break;
                case "build_in_market": this.buildMarket(param); break;
                case "build_in_fortification": this.buildFortification(param); break;
                case "build_in_aqueduct": this.buildAqueduct(param); break;
                case "build_in_barracks": this.buildBarracks(param); break;
                case "build_in_apothecary": this.buildApothecary(param); break;
                case "build_in_smithy": this.buildSmithy(param); break;
                case "build_in_cementmill": this.buildCementMill(param); break;
                case "build_in_radio": this.buildRadioTower(param); break;
                case "build_in_lights": this.buildLights(param); break;
                case "use_in_home": this.useHome(param); break;
                case "use_in_campfire": this.useCampfire(param); break;
                case "use_in_hospital": this.useHospital(param); break;
                case "use_in_hospital2": this.useHospital2(param); break;
                case "use_in_inn": this.useInn(param); break;
                // Crafting
                case "craft": this.craftItem(param); break;
                case "use_item": this.useItem(param); break;
                case "use_item_fight": this.useItemFight(param); break;
                // Non-improvement actions
                case "enter_camp": this.enterCamp(param); break;
                case "scavenge": this.scavenge(param); break;
                case "scout": this.scout(param); break;
                case "scout_locale_i": this.scoutLocale(param); break;
                case "scout_locale_u": this.scoutLocale(param); break;
                case "clear_workshop": this.clearWorkshop(param); break;
                case "use_spring": this.useSpring(param); break;
                case "fight_gang": this.fightGang(param); break;
                case "send_caravan": this.sendCaravan(param); break;
                case "trade_with_caravan": this.tradeWithCaravan(); break;
                case "despair": this.despair(param); break;
                case "unlock_upgrade": this.unlockUpgrade(param); break;
                case "create_blueprint": this.createBlueprint(param); break;
                case "launch": this.launch(param); break;
                // Mapped directly in UIFunctions
                case "leave_camp": break;
                case "move_level_up": this.moveTo(PositionConstants.DIRECTION_UP); break;
                case "move_level_down": this.moveTo(PositionConstants.DIRECTION_DOWN); break;
                case "move_camp_level": this.moveTo(PositionConstants.DIRECTION_CAMP); break;
                case "move_sector_north": this.moveTo(PositionConstants.DIRECTION_NORTH); break;
                case "move_sector_east": this.moveTo(PositionConstants.DIRECTION_EAST); break;
                case "move_sector_south": this.moveTo(PositionConstants.DIRECTION_SOUTH); break;
                case "move_sector_west": this.moveTo(PositionConstants.DIRECTION_WEST); break;
                case "move_sector_ne": this.moveTo(PositionConstants.DIRECTION_NE); break;
                case "move_sector_se": this.moveTo(PositionConstants.DIRECTION_SE); break;
                case "move_sector_sw": this.moveTo(PositionConstants.DIRECTION_SW); break;
                case "move_sector_nw": this.moveTo(PositionConstants.DIRECTION_NW); break;
                case "move_camp_global": this.moveToCamp(param); break;
                default:
                    console.log("WARN: No function mapped for action " + action + " in PlayerActionFunctions.performAction");
                    break;
            }
        },
        
        getActionSector: function (action, param) {
            var baseActionID = this.playerActionsHelper.getBaseActionID(action);
            switch (baseActionID) {
                case "build_out_bridge":
                case "build_out_passage_down_stairs": 
                case "build_out_passage_down_elevator":
                case "build_out_passage_down_hole": 
                case "build_out_passage_up_stairs":
                case "build_out_passage_up_elevator":
                case "build_out_passage_up_hole":
                case "build_out_spaceship1":
                case "build_out_spaceship2":
                case "build_out_spaceship3":
                    var l = parseInt(param.split(".")[0]);
                    var sX = parseInt(param.split(".")[1]);
                    var sY = parseInt(param.split(".")[2]);
                    return this.levelHelper.getSectorByPosition(l, sX, sY);
                default:
                    return null;
            }
        },
        
        moveTo: function (direction) {
            var playerPos = this.playerPositionNodes.head.position;
            switch (direction) {
                case PositionConstants.DIRECTION_WEST:
                    playerPos.sectorX--;
                    break;
                case PositionConstants.DIRECTION_NORTH:
                    playerPos.sectorY--;
                    break;
                case PositionConstants.DIRECTION_SOUTH:
                    playerPos.sectorY++;
                    break;
                case PositionConstants.DIRECTION_EAST:
                    playerPos.sectorX++;
                    break;
                case PositionConstants.DIRECTION_NE:
                    playerPos.sectorX++;
                    playerPos.sectorY--;
                    break;
                case PositionConstants.DIRECTION_SE:
                    playerPos.sectorX++;
                    playerPos.sectorY++;
                    break;
                case PositionConstants.DIRECTION_SW:
                    playerPos.sectorX--;
                    playerPos.sectorY++;
                    break;
                case PositionConstants.DIRECTION_NW:
                    playerPos.sectorX--;
                    playerPos.sectorY--;
                    break;
                case PositionConstants.DIRECTION_UP:
                    playerPos.level++;
                    break;
                case PositionConstants.DIRECTION_DOWN:
                    playerPos.level--;
                    break;
                case PositionConstants.DIRECTION_CAMP:
                    if (this.nearestCampNodes.head) {
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
            var playerLevelCamp = this.nearestCampNodes.head !== null ? this.nearestCampNodes.head.entity : null;
            if (playerLevelCamp) {
                var playerResources = this.playerResourcesNodes.head.resources.resources;
                var campResourcesSource = this.resourcesHelper.getCurrentStorage().resources;
                this.moveResourcesFromVOToVO(resourcesVO, campResourcesSource, playerResources);
            }
        },
        
        moveResFromBagToCamp: function () {
            var playerLevelCamp = this.nearestCampNodes.head !== null ? this.nearestCampNodes.head.entity : null;
            var playerResources = this.playerResourcesNodes.head.resources.resources;
            var campResourcesSource = playerLevelCamp.get(ResourcesComponent).resources;
            this.moveResourcesFromVOToVO( playerResources, playerResources, campResourcesSource);
        },
        
        moveCurrencyFromBagToCamp: function () {
            var playerLevelCamp = this.nearestCampNodes.head !== null ? this.nearestCampNodes.head.entity : null;
            var playerCurrency = this.playerResourcesNodes.head.entity.get(CurrencyComponent);
            var campCurrency = playerLevelCamp.get(CurrencyComponent);
            campCurrency.currency += playerCurrency.currency;
            playerCurrency.currency = 0;
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
        
        updateCarriedItems: function (selectedItems) {
            var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
            var allItems = itemsComponent.getAll(true);
            for (var i = 0; i < allItems.length; i++) {
                var item = allItems[i];
                if (item.equipped) {
                    item.carried = true;
                } else if (item.type === ItemConstants.itemTypes.uniqueEquipment) {
                    item.carried = true;
                } else if (item.type === ItemConstants.itemTypes.follower) {
                    // skip
                } else {
                    var countCarried = selectedItems[item.id];
                    if (countCarried > 0) {
                        item.carried = true;
                        selectedItems[item.id]--;
                    } else {
                        item.carried = false;
                    }
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
                    this.moveCurrencyFromBagToCamp();
                    
					if (this.lastVisitedCamps.head) this.lastVisitedCamps.head.entity.remove(LastVisitedCampComponent);
                    campNode.entity.add(new LastVisitedCampComponent());
                    
                    if (log) this.addLogMessage(LogConstants.MSG_ID_ENTER_CAMP, "Entered camp.");
                    this.uiFunctions.showTab(this.uiFunctions.elementIDs.tabs.in);
                    GlobalSignals.playerMovedSignal.dispatch(playerPos);
                    this.forceResourceBarUpdate();
                    this.forceTabUpdate();
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
                var sunlit = campNode.entity.get(SectorFeaturesComponent).sunlit;
                playerPos.inCamp = false;
                var msg = "Left camp. " + (sunlit ? "Sunlight is sharp and merciless." : " Darkess of the city envelops you.");
                this.addLogMessage(LogConstants.MSG_ID_LEAVE_CAMP, msg);
                GlobalSignals.playerMovedSignal.dispatch(playerPos);
                this.forceResourceBarUpdate();
                this.forceTabUpdate();
                this.save();
            } else {
                console.log("WARN: No valid camp found. (player pos: " + playerPos + ")");
            }
        },
        
        scavenge: function () {
            this.gameState.unlockedFeatures.scavenge = true;

            var logMsg = "";
            var playerMaxVision = this.playerStatsNodes.head.vision.maximum;				
            var sector = this.playerLocationNodes.head.entity;
            var sunlit = sector.get(SectorFeaturesComponent).sunlit;
            if (playerMaxVision <= PlayerStatConstants.VISION_BASE) {
                if (sunlit) logMsg = "Rummaged blindly for loot. ";
                else logMsg = "Rummaged in the dark. ";
            } else {
                logMsg = "Went scavenging. ";
            }

            var logMsgSuccess = logMsg;
            var logMsgFlee = logMsg + "Fled empty-handed.";
            var logMsgDefeat = logMsg + "Got into a fight and was defeated.";
            this.handleOutActionResults("scavenge", LogConstants.MSG_ID_SCAVENGE, logMsgSuccess, logMsgFlee, logMsgDefeat);
        },
        
        scout: function () {
            var sector = this.playerLocationNodes.head.entity;
            var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
            var featuresComponent = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
            if (!sectorStatus.scouted) {
                sectorStatus.scouted = true;
                
                if (!this.gameState.unlockedFeatures.evidence) {
                    this.gameState.unlockedFeatures.evidence = true;
                    GlobalSignals.featureUnlockedSignal.dispatch();
                }
                
                if (!this.gameState.unlockedFeatures.scout) {
                    this.gameState.unlockedFeatures.scout = true;
                    GlobalSignals.featureUnlockedSignal.dispatch();
                }

                var logMsg = "Scouted the area.";
                var found = false;
                if (featuresComponent.hasSpring) {
                    found = true;
                    logMsg += "<br/>Found " + TextConstants.addArticle(TextConstants.getSpringName(featuresComponent)) + ".";
                }
                var workshopComponent = sector.get(WorkshopComponent);
                if (workshopComponent) {
                    found = true;
                    logMsg += "<br/>Found " + TextConstants.addArticle(TextConstants.getWorkshopName(workshopComponent.resource));
                }

                var passagesComponent = this.playerLocationNodes.head.entity.get(PassagesComponent);
                if (passagesComponent.passageUp) {
                    found = true;
                    logMsg += "<br/>There used to be " + TextConstants.addArticle(passagesComponent.passageUp.name.toLowerCase()) + " here.";
                }

                if (passagesComponent.passageDown) {
                    found = true;
                    logMsg += "<br/>There used to be " + TextConstants.addArticle(passagesComponent.passageDown.name.toLowerCase()) + " here.";
                }

                var sectorLocalesComponent = sector.get(SectorLocalesComponent);
                if (sectorLocalesComponent.locales.length > 0) {
                    found = true;
                    var locale = sectorLocalesComponent.locales[0];
                    if (sectorLocalesComponent.locales.length > 1)
                        logMsg += "<br/>There are some interesting buildings here.";
                    else
                        logMsg += "<br/>There is a " + TextConstants.getLocaleName(locale, featuresComponent.stateOfRepair, true).toLowerCase() + " here that seems worth investigating.";
                }

                var playerActionFunctions = this;
                var successCallback = function () {
                    GlobalSignals.sectorScoutedSignal.dispatch();
                    playerActionFunctions.occurrenceFunctions.onScoutSector(sector);
                    playerActionFunctions.engine.getSystem(UIOutLevelSystem).rebuildVis();
                    playerActionFunctions.save();
                };

                var logMsgId = found ? LogConstants.MSG_ID_SCOUT_FOUND_SOMETHING : LogConstants.MSG_ID_SCOUT;
                this.handleOutActionResults("scout", logMsgId, logMsg, logMsg, logMsg, successCallback);
            } else {
                console.log("WARN: Sector already scouted.");
            }
        },
        
        scoutLocale: function (i) {
            var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
            var sectorLocalesComponent = this.playerLocationNodes.head.entity.get(SectorLocalesComponent);
            var sectorFeaturesComponent = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
            var localeVO = sectorLocalesComponent.locales[i];
            var action = "scout_locale_" + localeVO.getCategory() + "_" + i;
                
            // TODO add more interesting log messages - especially for trade partners
            var localeName = TextConstants.getLocaleName(localeVO, sectorFeaturesComponent.stateOfRepair);
            localeName = localeName.split(" ")[localeName.split(" ").length - 1];
            var baseMsg = "Scouted the " + localeName +  ". ";
            var logMsgSuccess = baseMsg;
            if (localeVO.type === localeTypes.tradingpartner) {
                var playerPos = this.playerPositionNodes.head.position;
                var level = playerPos.level;
                var campOrdinal = this.gameState.getCampOrdinal(level);
                console.log(campOrdinal);
                var partnerName = TradeConstants.getTradePartner(campOrdinal).name;
                logMsgSuccess += "<br/>Found a new <span class='text-highlight-functionality'>trading partner</span>. They call this place " + partnerName + ".";
            }
            var logMsgFlee = baseMsg + " Got surprised and fled.";
            var logMsgDefeat = baseMsg + " Got surprised and beaten.";

            var playerActionFunctions = this;
            var successCallback = function () {
                sectorStatus.localesScouted[i] = true;
                if (localeVO.type === localeTypes.tradingpartner) {
                    var playerPos = playerActionFunctions.playerPositionNodes.head.position;
                    var level = playerPos.level;
                    var campOrdinal = playerActionFunctions.gameState.getCampOrdinal(level);
                    playerActionFunctions.gameState.foundTradingPartners.push(campOrdinal);
                }
                playerActionFunctions.engine.getSystem(UIOutLevelSystem).rebuildVis();
                playerActionFunctions.save();
            };

            this.handleOutActionResults(action, LogConstants.MSG_ID_SCOUT_LOCALE, logMsgSuccess, logMsgFlee, logMsgDefeat, successCallback);
        },
        
        useSpring: function () {
            var sector = this.playerLocationNodes.head.entity;
            var sectorFeatures = sector.get(SectorFeaturesComponent);
            var springName = TextConstants.getSpringName(sectorFeatures);

            var logMsgSuccess = "Refilled water at the " + springName + ".";
            var logMsgFailBase = "Approached the " + springName + ", but got attacked. ";
            var logMsgFlee = logMsgFailBase + "Fled empty-handed.";
            var logMsgDefeat = logMsgFailBase + "Lost the fight.";

            this.handleOutActionResults("use_spring", LogConstants.MSG_ID_USE_SPRING, logMsgSuccess, logMsgFlee, logMsgDefeat);
        },
		
		clearWorkshop: function () {
			var action = "clear_workshop";
            var logMsgSuccess = "Workshop cleared. Workers can now use it.";
            var logMsgFlee = "";
            var logMsgDefeat = "";

            var playerActionFunctions = this;
            var successCallback = function () {
                playerActionFunctions.engine.getSystem(UIOutLevelSystem).rebuildVis();
            };

            this.handleOutActionResults(action, LogConstants.MSG_ID_WORKSHOP_CLEARED, logMsgSuccess, logMsgFlee, logMsgDefeat, successCallback);
		},
        
        handleOutActionResults: function (action, logMsgId, logMsgSuccess, logMsgFlee, logMsgDefeat, successCallback) {
            var playerActionFunctions = this;
            var baseActionID = this.playerActionsHelper.getBaseActionID(action);
            if (!logMsgSuccess) logMsgSuccess = action;
            if (!logMsgFlee) logMsgFlee = logMsgSuccess;
            if (!logMsgDefeat) logMsgDefeat = logMsgSuccess;
            this.fightHelper.handleRandomEncounter(action, function () {
                var rewards = playerActionFunctions.playerActionResultsHelper.getResultVOByAction(action);
                playerActionFunctions.playerStatsNodes.head.entity.add(new PlayerActionResultComponent(rewards));
                var resultPopupCallback = function (isTakeAll) {
                    playerActionFunctions.playerActionResultsHelper.collectRewards(isTakeAll, rewards);
                    playerActionFunctions.uiFunctions.completeAction(action);
                    playerActionFunctions.addLogMessage(logMsgId, logMsgSuccess);
                    playerActionFunctions.playerActionResultsHelper.logResults(rewards);
                    playerActionFunctions.forceResourceBarUpdate();
                    playerActionFunctions.forceTabUpdate();
                    GlobalSignals.inventoryChangedSignal.dispatch();
                    if (successCallback) successCallback();
                };
                playerActionFunctions.uiFunctions.showResultPopup(TextConstants.getActionName(baseActionID), logMsgSuccess, rewards, resultPopupCallback);
            }, function () {
                playerActionFunctions.uiFunctions.completeAction(action);
                playerActionFunctions.addLogMessage(logMsgId, logMsgFlee);
            }, function () {
                playerActionFunctions.uiFunctions.completeAction(action);
                playerActionFunctions.addLogMessage(logMsgId, logMsgDefeat);
            });
        },
        
        sendCaravan: function (campOrdinal) {
            var campSector;
            var campOutgoingCaravansComponent;
            var caravan;
            for (var node = this.campNodes.head; node; node = node.next) {
                campOutgoingCaravansComponent = node.entity.get(OutgoingCaravansComponent);
                for (var caravanOrdinal in campOutgoingCaravansComponent.outgoingCaravans) {
                    if (caravanOrdinal == campOrdinal) {
                        campSector = node.entity;
                        caravan = campOutgoingCaravansComponent.outgoingCaravans[caravanOrdinal];
                        break;
                    }
                }
                
                if (campSector && caravan)
                    break;
            }
            
            if (!campSector || !caravan) {
                console.log("WARN: No matching returning caravan found.");
                return;
            }
            
            var tradePartner = TradeConstants.getTradePartner(parseInt(campOrdinal));
            var result = TradeConstants.makeResultVO(caravan);
            var logMsg = this.playerActionResultsHelper.getRewardsMessage(result, "A trade caravan returns from " + tradePartner.name + ". ");
            var pendingPosition = campSector.get(PositionComponent).clone();
            pendingPosition.inCamp = true;
            
            this.playerActionResultsHelper.collectRewards(true, result, campSector);
            this.uiFunctions.completeAction("send_caravan");
            this.addLogMessage(LogConstants.MSG_ID_FINISH_SEND_CAMP, logMsg.msg, logMsg.replacements, logMsg.values, pendingPosition);
            
            this.forceResourceBarUpdate();
        },
        
        tradeWithCaravan: function () {
            this.uiFunctions.popupManager.closePopup("incoming-caravan-popup");
            
            var traderComponent = this.playerLocationNodes.head.entity.get(TraderComponent);
            var caravan = traderComponent.caravan;
            
            // items
            var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
            for (var itemID in caravan.traderSelectedItems) {
                var amount = caravan.traderSelectedItems[itemID];
                for (var i = 0; i < amount; i++) {
                    for (var j = 0; j < caravan.sellItems.length; j++) {
                        if (caravan.sellItems[j].id == itemID) {
                            caravan.sellItems.splice(j, 1);
                            break;
                        }
                    }
                    itemsComponent.addItem(ItemConstants.getItemByID(itemID).clone());
                }
            }
            
            for (var itemID in caravan.campSelectedItems) {
                var amount = caravan.campSelectedItems[itemID];
                for (var i = 0; i < amount; i++) {
                    caravan.sellItems.push(ItemConstants.getItemByID(itemID));
                    itemsComponent.discardItem(itemsComponent.getItem(itemID));
                }
            }
            
            // resources
            var campStorage = this.resourcesHelper.getCurrentStorage();
            for (var key in resourceNames) {
                var name = resourceNames[key];
                var traderSelectedAmount = caravan.traderSelectedResources.getResource(name);
                if (traderSelectedAmount > 0) {
                    caravan.sellResources.addResource(name, -traderSelectedAmount);
                    campStorage.resources.addResource(name, traderSelectedAmount);
                }
                var campSelectedAmount = caravan.campSelectedResources.getResource(name);
                if (campSelectedAmount > 0) {
                    caravan.sellResources.addResource(name, campSelectedAmount);
                    campStorage.resources.addResource(name, -campSelectedAmount);
                }
            }
            
            // currency
			var currencyComponent = this.resourcesHelper.getCurrentCurrency();
            if (caravan.traderSelectedCurrency > 0) {
                caravan.currency -= caravan.traderSelectedCurrency;
                currencyComponent.currency += caravan.traderSelectedCurrency;
            }
            
            if (caravan.campSelectedCurrency) {
                caravan.currency += caravan.campSelectedCurrency;
                currencyComponent.currency -= caravan.campSelectedCurrency;
            }
            
            caravan.clearSelection();
            caravan.tradesMade++;
        },
        
        fightGang: function (direction) {
            var action = "fight_gang_" + direction;
            var playerActionFunctions = this;
            this.fightHelper.handleRandomEncounter(action, function () {
                playerActionFunctions.addLogMessage(LogConstants.MSG_ID_GANG_DEFEATED, "The road is clear.");
                playerActionFunctions.uiFunctions.completeAction(action);
                playerActionFunctions.engine.getSystem(UIOutLevelSystem).rebuildVis();
            }, function () {
                // fled
                playerActionFunctions.uiFunctions.completeAction(action);
            }, function () {
                // lost
                playerActionFunctions.uiFunctions.completeAction(action);
            });
        },
        
        flee: function () {
            if (this.playerActionsHelper.checkAvailability("flee", true)) {
                this.playerActionsHelper.deductCosts("flee");
                this.uiFunctions.completeAction("flee");
            }
        },
        
        despair: function () {
            this.engine.getSystem(FaintingSystem).checkFainting();
            this.uiFunctions.completeAction("despair");
        },
        
        buildCamp: function () {                
            var sector = this.playerLocationNodes.head.entity;
            var campComponent = new CampComponent();
            campComponent.foundedTimeStamp = this.gameState.gamePlayedSeconds;
            sector.add(campComponent);
            sector.add(new CampEventTimersComponent());
            sector.add(new OutgoingCaravansComponent());
            sector.add(new ReputationComponent());
            sector.add(new CurrencyComponent());

            var level = this.levelHelper.getLevelEntityForSector(sector);
            level.add(campComponent);

            var improvementsComponent = sector.get(SectorImprovementsComponent);
            improvementsComponent.add(improvementNames.home);

            this.gameState.unlockedFeatures.camp = true;

            this.addLogMessage(LogConstants.MSG_ID_BUILT_CAMP, "Built a camp.");
            if (level.get(LevelComponent).levelVO.populationGrowthFactor < 1) {
                this.addLogMessage(LogConstants.MSG_ID_BUILT_CAMP_LEVEL_POPULATION, "There are very few signs of human life on this level.");                    
            }
            this.forceResourceBarUpdate();
            this.save();
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
            var levelOrdinal = this.gameState.getLevelOrdinal(l);
            action = action + "_" + levelOrdinal;
			var sector = this.getActionSector(action, sectorPos);
            neighbourAction = neighbourAction + "_" + levelOrdinal;
            
            var sectorPosVO = new PositionVO(l, sX, sY);
            var playerPos = this.playerPositionNodes.head.position;
			var neighbour = this.levelHelper.getSectorByPosition(up ? l + 1 : l - 1, sX, sY);
			
			if (sector && neighbour) {
				var msg = "Passage " + (up ? " up" : " down") + " ready at " + sectorPosVO.getInGameFormat(playerPos.level === l);
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
            this.buildImprovement("build_in_house", this.playerActionsHelper.getImprovementNameForAction("build_in_house"), null);
            var msg = "Built a hut.";
            var totalHouses = 0;
            for (var node = this.engine.getNodeList(CampNode).head; node; node = node.next) {
                var improvementsComponent = node.entity.get(SectorImprovementsComponent);
                totalHouses += improvementsComponent.getCount(improvementNames.house);
            }
            if (totalHouses < 5) msg += " People will come if they hear about the camp.";
            this.addLogMessage(LogConstants.MSG_ID_BUILT_HOUSE, msg);
        },
        
        buildHouse2: function () {
            this.buildImprovement("build_in_house2", this.playerActionsHelper.getImprovementNameForAction("build_in_house2"));
            var msg = "Built a tower block.";
            this.addLogMessage(LogConstants.MSG_ID_BUILT_HOUSE, msg);
        },
        
        buildGenerator: function () {
            this.buildImprovement("build_in_generator", this.playerActionsHelper.getImprovementNameForAction("build_in_generator"));
            var msg = "Set up a generator.";
            this.addLogMessage(LogConstants.MSG_ID_BUILT_GENERATOR, msg);           
        },
        
        buildLights: function () {
            this.buildImprovement("build_in_lights", this.playerActionsHelper.getImprovementNameForAction("build_in_lights"));
            var msg = "Installed lights to the camp.";
            this.addLogMessage(LogConstants.MSG_ID_BUILT_LIGHTS, msg);
        },
        
        buildCeiling: function () {
            this.buildImprovement("build_in_ceiling", this.playerActionsHelper.getImprovementNameForAction("build_in_ceiling"));
            var msg = "Build a big tent to protect the camp from the sun.";
            this.addLogMessage(LogConstants.MSG_ID_BUILT_CEILING, msg);
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
            var improvementName = this.playerActionsHelper.getImprovementNameForAction("build_in_campfire");
            var improvementsComponent = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
            var count = improvementsComponent.getCount(improvementName);
            
            this.buildImprovement("build_in_campfire", improvementName);
            if (count === 0)
                this.addLogMessage(LogConstants.MSG_ID_BUILT_CAMPFIRE, "Built a campfire. Here, ideas are shared and discussed.");
            else 
                this.addLogMessage(LogConstants.MSG_ID_BUILT_CAMPFIRE, "Improved campfire. It will attract more rumours.");
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
            var sector = this.getActionSector("build_out_bridge", sectorPos);
            var direction = parseInt(sectorPos.split(".")[3]);
            var positionComponent = sector.get(PositionComponent);
            var passagesComponent = sector.get(PassagesComponent);
            var blocker = passagesComponent.getBlocker(direction);

            // TODO move this check to startAction
            if (!blocker || blocker.type !== MovementConstants.BLOCKER_TYPE_GAP) {
                console.log("WARN: Can't build bridge because there is no gap: " + sectorPos);
                return;
            }

            // Find neighbour
            var neighbourPos = PositionConstants.getPositionOnPath(positionComponent.getPosition(), direction, 1);
            var neighbour = this.levelHelper.getSectorByPosition(neighbourPos.level, neighbourPos.sectorX, neighbourPos.sectorY);
            var neighbourPassagesComponent = neighbour.get(PassagesComponent);
            var neighbourBlocker = neighbourPassagesComponent.getBlocker(PositionConstants.getOppositeDirection(direction));

            // TODO move this check to startAction
            if (!neighbourBlocker || neighbourBlocker.type !== MovementConstants.BLOCKER_TYPE_GAP) {
                console.log("WARN: Trying to build bridge but neighbour doesn't have a gap.");
                return;
            }

            this.buildImprovement("build_out_bridge", this.playerActionsHelper.getImprovementNameForAction("build_out_bridge"), sector);
            this.buildImprovement("build_out_bridge", this.playerActionsHelper.getImprovementNameForAction("build_out_bridge"), neighbour, true);
        },
        
        buildSpaceShip1: function(sectorPos) {
            this.buildSpaceShip(sectorPos, "build_out_spaceship1");
        },
        
        buildSpaceShip2: function(sectorPos) {
            this.buildSpaceShip(sectorPos, "build_out_spaceship2");
        },
        
        buildSpaceShip3: function(sectorPos) {
            this.buildSpaceShip(sectorPos, "build_out_spaceship3");
        },
        
        buildSpaceShip: function(sectorPos, action) {
			var l = parseInt(sectorPos.split(".")[0]);
			var sX = parseInt(sectorPos.split(".")[1]);
			var sY = parseInt(sectorPos.split(".")[2]);
			var sector = this.getActionSector(action, sectorPos);
            
            var sectorPosVO = new PositionVO(l, sX, sY);
            var playerPos = this.playerPositionNodes.head.position;
			
			if (sector) {
				var msg = "Colony construction project ready at " + sectorPosVO.getInGameFormat(playerPos.level === l);
				this.buildImprovement(action, this.playerActionsHelper.getImprovementNameForAction(action), sector);
				this.addLogMessage(LogConstants.MSG_ID_BUILT_SPACESHIP, msg);
			} else {
				console.log("WARN: Couldn't find sectors for building space ship.");
				console.log(sector);
				console.log(sectorPos);
			}
            
        },
        
        collectFood: function () {
            this.collectCollector("use_out_collector_food", "collector_food");
        },
        
        collectWater: function () {
            this.collectCollector("use_out_collector_water", "collector_water");
        },
        
        useHome: function() {
            this.playerStatsNodes.head.stamina.stamina = this.playerStatsNodes.head.stamina.health * PlayerStatConstants.HEALTH_TO_STAMINA_FACTOR;
            this.uiFunctions.completeAction("use_in_home");
            this.forceStatsBarUpdate();
        },
        
        useCampfire: function () {
            var campSector = this.nearestCampNodes.head.entity;
            var campComponent = campSector.get(CampComponent);
            // TODO move this check to startAction
            if (campSector) {
                if (campComponent.rumourpool >= 1) {
                    campComponent.rumourpool--;
                    this.playerStatsNodes.head.rumours.value++;
                    this.addLogMessage(LogConstants.MSG_ID_USE_CAMPFIRE_SUCC, "Sat at the campfire to exchange stories about the corridors.");
                } else {
                    this.addLogMessage(LogConstants.MSG_ID_USE_CAMPFIRE_FAIL, "Sat at the campfire to exchange stories, but there was nothing new.");
                    campComponent.rumourpoolchecked = true;
                }
            } else {
                console.log("WARN: No camp sector found.");
            }
            this.uiFunctions.completeAction("use_in_campfire");
            this.forceResourceBarUpdate();
        },
        
        useHospital: function() {                
            var perksComponent = this.playerPositionNodes.head.entity.get(PerksComponent);
            perksComponent.removeItemsByType(PerkConstants.perkTypes.injury);

            this.playerStatsNodes.head.stamina.stamina = 1000;
            this.addLogMessage(LogConstants.MSG_ID_USE_HOSPITAL, "Healed all injuries.");
                
            this.uiFunctions.completeAction("use_in_hospital");
            this.forceResourceBarUpdate();
            this.gameState.unlockedFeatures.fight = true;
        },
        
        useHospital2: function () {                
            var perksComponent = this.playerPositionNodes.head.entity.get(PerksComponent);
            perksComponent.addPerk(PerkConstants.getPerk(PerkConstants.perkIds.healthAugment));
            this.addLogMessage(LogConstants.MSG_ID_USE_HOSPITAL2, "Improved health.");
            this.forceResourceBarUpdate();
        },
        
        useInn: function (auto) {
            var sector = this.playerLocationNodes.head.entity;
            var positionComponent = sector.get(PositionComponent);
            var campCount = this.gameState.numCamps;
            var maxAvailableFollowers = Math.max(0, Math.min(4, Math.floor(sector.get(CampComponent).population / 10))) + 1;
            var numAvailableFollowers = Math.floor(Math.random() * maxAvailableFollowers) + 1;
            var availableFollowers = [];
            for (var i = 0; i < numAvailableFollowers; i++) {
                availableFollowers.push(ItemConstants.getFollower(positionComponent.level, campCount));
            }
            var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
            var currentFollowers = itemsComponent.getAllByType(ItemConstants.itemTypes.follower);
            if (auto) {
                if (currentFollowers.length === 0 && availableFollowers.length > 0) {
                    this.addFollower(availableFollowers[0]);
                    return true;                        
                } else {
                    for (var a1 = 0; a1 < availableFollowers.length; a1++) {
                        var follower = availableFollowers[a1];
                        for (var a2 = 0; a2 < currentFollowers.length; a2++) {
                            var oldFollower = currentFollowers[a2];
                            if (oldFollower.getBonusTotalBonus() < follower.getTotalBonus()) {
                                itemsComponent.discardItem(oldFollower);
                                this.addFollower(follower);
                                return true;
                            }
                        }
                    }
                }
            } else {
                this.uiFunctions.showInnPopup(availableFollowers);
            }
            this.uiFunctions.completeAction("use_in_inn");
                        
            return false;
        },
        
        addFollower: function (follower) {
            var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
            itemsComponent.addItem(follower, false);
            this.addLogMessage(LogConstants.MSG_ID_ADD_FOLLOWER, "A wanderer agrees to travel together for awhile.");
            this.forceResourceBarUpdate();
            this.forceStatsBarUpdate();
            this.save();
        },
        
        craftItem: function (itemId) {
			var actionName = "craft_" + itemId;
            var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
            var item = this.playerActionsHelper.getItemForCraftAction(actionName);
            itemsComponent.addItem(item.clone(), !this.playerPositionNodes.head.position.inCamp);

            if (item.type === ItemConstants.itemTypes.weapon)
                this.gameState.unlockedFeatures.fight = true;

            this.gameState.unlockedFeatures.vision = true;

            this.addLogMessage(LogConstants.MSG_ID_CRAFT_ITEM, LogConstants.getCraftItemMessage(item));
            this.forceResourceBarUpdate();
            GlobalSignals.inventoryChangedSignal.dispatch();
            this.save();
        },
        
        useItem: function (itemId) {
            var actionName = "use_item_" + itemId;
            var reqs = this.playerActionsHelper.getReqs(actionName);

            switch (itemId) {
                case "first_aid_kit_1":
                case "first_aid_kit_2":
                    var perksComponent = this.playerPositionNodes.head.entity.get(PerksComponent);
                    var injuries = perksComponent.getItemsByType(PerkConstants.perkTypes.injury);
                    var minValue = reqs.perks.Injury[0];
                    var injuryToHeal = null;
                    for (var i = 0; i < injuries.length; i++) {
                        if (injuries[i].effect > minValue) {
                            injuryToHeal = injuries[i];
                            break;
                        }
                    }
                    if (injuryToHeal !== null) {
                        perksComponent.removeItemsById(injuryToHeal.id);
                    } else {
                        console.log("WARN: No injury found that can be healed!");
                    }
                    this.forceStatsBarUpdate();
                    break;

                case "glowstick_1":
                    var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
                    sectorStatus.glowStickSeconds = 120;
                    break;

                default:
                    console.log("WARN: Item not mapped for useItem: " + itemId);
                    break;
            }
        },
        
        useItemFight: function (itemId) {
            switch (itemId) {
                case "glowstick_1":
                    var fightComponent = this.fightNodes.head.fight;
                    if (fightComponent) {
                        fightComponent.itemEffects.enemyStunnedSeconds = FightConstants.FIGHT_LENGTH_SECONDS / 4;
                    }
                    break;
                default:
                    console.log("WARN: Item not mapped for useItemFight: " + itemId);
                    break;
            }
            
        },
        
        createBlueprint: function (upgradeId) {
            this.tribeUpgradesNodes.head.upgrades.createBlueprint(upgradeId);
        },
        
        unlockUpgrade: function (upgradeId) {
            this.tribeUpgradesNodes.head.upgrades.useBlueprint(upgradeId);
        },
        
        buyUpgrade: function (upgradeId, automatic) {
            if (automatic || this.playerActionsHelper.checkAvailability(upgradeId, true)) {
				var upgradeDefinition = UpgradeConstants.upgradeDefinitions[upgradeId];
                this.playerActionsHelper.deductCosts(upgradeId);
                this.addLogMessage(LogConstants.MSG_ID_BOUGHT_UPGRADE, "Researched " + upgradeDefinition.name);
                this.tribeUpgradesNodes.head.upgrades.addUpgrade(upgradeId);
                GlobalSignals.upgradeUnlockedSignal.dispatch(upgradeId);
                this.save();
            }
        },
        
        collectCollector: function (actionName, improvementName) {                
            var currentStorage = this.resourcesHelper.getCurrentStorage();
            var bagComponent = this.playerPositionNodes.head.entity.get(BagComponent);

            var sector = this.playerLocationNodes.head.entity;
            var improvementsComponent = sector.get(SectorImprovementsComponent);
            var improvementVO = improvementsComponent.getVO(improvementNames[improvementName]);
            var resourcesVO = improvementVO.storedResources;

            var maxToCollect = bagComponent.totalCapacity - bagComponent.usedCapacity;
            var totalCollected = 0;
            for (var key in resourceNames) {
                var name = resourceNames[key];
                var amount = resourcesVO.getResource(name);
                if (amount >= 1) {
                    var toCollect = Math.min(amount, maxToCollect - totalCollected);
                    currentStorage.resources.addResource(name, toCollect);
                    resourcesVO.addResource(name, -toCollect);
                    totalCollected += toCollect;
                }
            }

            if (totalCollected === 0) {
                this.addLogMessage(LogConstants.MSG_ID_USE_COLLECTOR_FAIL, "Nothing to collect yet.");
            }

            this.forceResourceBarUpdate();
        },
        
        buildImprovement: function(actionName, improvementName, otherSector) {
            var sector = otherSector || this.playerLocationNodes.head.entity;                
            var improvementsComponent = sector.get(SectorImprovementsComponent);
            improvementsComponent.add(improvementName);

            GlobalSignals.improvementBuiltSignal.dispatch();
            this.forceResourceBarUpdate();                
            this.save();
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
        
        launch: function () {
            this.gameState.isFinished = true;
            GlobalSignals.launcedSignal.dispatch();
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
        
    });

    return PlayerActionFunctions;
});