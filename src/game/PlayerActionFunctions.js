// Functions to respond to player actions parsed by the UIFunctions
define(['ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/CampConstants',
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
	'game/components/player/ExcursionComponent',
	'game/components/player/ItemsComponent',
	'game/components/player/DeityComponent',
	'game/components/player/PlayerActionComponent',
	'game/components/player/PlayerActionResultComponent',
	'game/components/common/CampComponent',
	'game/components/common/CurrencyComponent',
	'game/components/type/LevelComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/sector/improvements/SectorCollectorsComponent',
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
	'game/systems/ui/UIOutTabBarSystem',
	'game/systems/ui/UIOutLevelSystem',
	'game/systems/FaintingSystem',
	'game/systems/PlayerPositionSystem',
	'text/Text',
	'utils/StringUtils'
], function (Ash, GameGlobals, GlobalSignals,
	GameConstants, CampConstants, LogConstants, PositionConstants, MovementConstants, PlayerActionConstants, PlayerStatConstants, ItemConstants, PerkConstants, FightConstants, TradeConstants, UpgradeConstants, TextConstants,
	PositionVO, LocaleVO,
	PlayerPositionNode, FightNode, PlayerStatsNode, PlayerResourcesNode, PlayerLocationNode,
	NearestCampNode, LastVisitedCampNode, CampNode, TribeUpgradesNode,
	PositionComponent, ResourcesComponent,
	BagComponent, ExcursionComponent, ItemsComponent, DeityComponent, PlayerActionComponent, PlayerActionResultComponent,
	CampComponent, CurrencyComponent, LevelComponent, SectorImprovementsComponent, SectorCollectorsComponent, WorkshopComponent,
	ReputationComponent, SectorFeaturesComponent, SectorLocalesComponent, SectorStatusComponent, LastVisitedCampComponent,
	PassagesComponent, OutgoingCaravansComponent, CampEventTimersComponent, TraderComponent,
	LogMessagesComponent,
	UIOutHeaderSystem, UIOutTabBarSystem, UIOutLevelSystem, FaintingSystem, PlayerPositionSystem,
    Text, StringUtils
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

		constructor: function (engine) {
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

		addLogMessage: function (msgID, msg, replacements, values, pendingPosition) {
			var playerPosition = this.playerPositionNodes.head.position;
			var logComponent = this.playerPositionNodes.head.entity.get(LogMessagesComponent);
			if (pendingPosition && !pendingPosition.equals(playerPosition)) {
				logComponent.addMessage(msgID, msg, replacements, values, pendingPosition.level, pendingPosition.sectorId(), pendingPosition.inCamp);
			} else {
				logComponent.addMessage(msgID, msg, replacements, values);
			}
		},

		startAction: function (action, param) {
            // log.i("start action: " + action + " | " + param);
            
            if (this.currentAction && !this.isSubAction(action)) {
                log.w("There is an incompleted action: " + this.currentAction + " (tried to start: " + action + ")");
                return;
            }
            
			var otherSector = this.getActionSector(action, param);
			if (!GameGlobals.playerActionsHelper.checkAvailability(action, true, otherSector)) {
				return false;
			}
            
            GlobalSignals.actionStartingSignal.dispatch(action, param);
			GameGlobals.playerActionsHelper.deductCosts(action);
			this.forceResourceBarUpdate();

			var baseId = GameGlobals.playerActionsHelper.getBaseActionID(action);
			var duration = PlayerActionConstants.getDuration(baseId);
			if (duration > 0) {
				this.startBusy(action, param);
			} else {
				this.performAction(action, param);
			}
            GlobalSignals.actionStartedSignal.dispatch(action, param);
			return true;
		},

		startBusy: function (action, param) {
			var baseId = GameGlobals.playerActionsHelper.getBaseActionID(action);
			var duration = PlayerActionConstants.getDuration(baseId);
			if (duration > 0) {
				var isBusy = PlayerActionConstants.isBusyAction(baseId);
				var endTimeStamp = this.playerStatsNodes.head.entity.get(PlayerActionComponent).addAction(action, duration, param, isBusy);

				switch (baseId) {
					case "send_caravan":
                        var tradePartnerOrdinal = parseInt(param);
						var caravansComponent = this.playerLocationNodes.head.entity.get(OutgoingCaravansComponent);
						if (!caravansComponent.pendingCaravan) {
							log.w("Can't start caravan. No valid pending caravan found.");
							return;
						}
                        
                        caravansComponent.pendingCaravan.returnTimeStamp = endTimeStamp;
                        caravansComponent.pendingCaravan.returnDuration = duration;
						caravansComponent.outgoingCaravans.push(caravansComponent.pendingCaravan);
						caravansComponent.pendingCaravan = null;
						this.addLogMessage(LogConstants.MSG_ID_START_SEND_CAMP, "A trade caravan heads out.");
                        GlobalSignals.caravanSentSignal.dispatch();
						break;
                        
                    case "use_in_home":
            			var perksComponent = this.playerStatsNodes.head.perks;
            			var hasStaminaPerk = perksComponent.hasPerk(PerkConstants.perkIds.staminaBonus);
                        if (hasStaminaPerk) {
                            perksComponent.removePerkById(PerkConstants.perkIds.staminaBonus);
                            this.playerStatsNodes.head.stamina.isPendingPenalty = true;
                        }
                        break;
				}
			}
		},

		performAction: function (action, param) {
			var baseId = GameGlobals.playerActionsHelper.getBaseActionID(action);
			switch (baseId) {
				// Out improvements
                case "build_out_collector_water": this.buildBucket(param); break;
                case "build_out_collector_food": this.buildTrap(param); break;
                case "build_out_beacon": this.buildBeacon(param); break;
                case "use_out_collector_water": this.collectWater(param); break;
                case "use_out_collector_water_one": this.collectWater(param, 1); break;
                case "use_out_collector_food": this.collectFood(param); break;
                case "use_out_collector_food_one": this.collectFood(param, 1); break;
                case "build_out_camp": this.buildCamp(param); break;
                case "build_out_passage_down_stairs": this.buildPassageDownStairs(param); break;
                case "build_out_passage_down_elevator": this.buildPassageDownElevator(param); break;
                case "build_out_passage_down_hole": this.buildPassageDownHole(param); break;
                case "build_out_passage_up_stairs": this.buildPassageUpStairs(param); break;
                case "build_out_passage_up_elevator": this.buildPassageUpElevator(param); break;
                case "build_out_passage_up_hole": this.buildPassageUpHole(param); break;
                case "build_out_greenhouse": this.buildGreenhouse(param); break;
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
                case "build_in_tradepost": this.buildTradingPost(param); break;
                case "build_in_library": this.buildLibrary(param); break;
                case "build_in_market": this.buildMarket(param); break;
                case "build_in_fortification": this.buildFortification(param); break;
                case "build_in_fortification2": this.buildFortification2(param); break;
                case "build_in_aqueduct": this.buildAqueduct(param); break;
                case "build_in_stable": this.buildStable(param); break;
                case "build_in_barracks": this.buildBarracks(param); break;
                case "build_in_apothecary": this.buildApothecary(param); break;
                case "build_in_smithy": this.buildSmithy(param); break;
                case "build_in_cementmill": this.buildCementMill(param); break;
                case "build_in_radiotower": this.buildRadioTower(param); break;
                case "build_in_lights": this.buildLights(param); break;
                case "build_in_square": this.buildSquare(param); break;
                case "build_in_garden": this.buildGarden(param); break;
                case "build_in_shrine": this.buildShrine(param); break;
                case "build_in_temple": this.buildTemple(param); break;
                case "improve_in_campfire": this.improveCampfire(param); break;
                case "improve_in_library": this.improveLibrary(param); break;
                case "improve_in_square": this.improveSquare(param); break;
                case "improve_in_generator": this.improveGenerator(param); break;
                case "improve_in_market": this.improveMarket(param); break;
                case "improve_in_apothecary": this.improveApothecary(param); break;
                case "improve_in_smithy": this.improveSmithy(param); break;
                case "improve_in_cementmill": this.improveCementMill(param); break;
                case "improve_in_temple": this.improveTemple(param); break;
                case "use_in_home": this.useHome(param); break;
                case "use_in_campfire": this.useCampfire(param); break;
                case "use_in_market": this.useMarket(param); break;
                case "use_in_hospital": this.useHospital(param); break;
                case "use_in_hospital2": this.useHospital2(param); break;
                case "use_in_inn": this.useInn(param); break;
                case "use_in_temple": this.useTemple(param); break;
                case "use_in_shrine": this.useShrine(param); break;
				// Item actions
                case "craft": this.craftItem(param); break;
                case "equip": this.equipItem(param); break;
                case "unequip": this.unequipItem(param); break;
                case "discard": this.discardItem(param); break;
                case "use_item": this.useItem(param); break;
                case "use_item_fight": this.useItemFight(param); break;
				// Non-improvement actions
                case "enter_camp": this.enterCamp(param); break;
                case "scavenge": this.scavenge(param); break;
                case "scout": this.scout(param); break;
                case "scout_locale_i": this.scoutLocale(param); break;
                case "scout_locale_u": this.scoutLocale(param); break;
                case "clear_workshop": this.clearWorkshop(param); break;
                case "clear_waste_t": this.clearWaste(action, param); break;
                case "clear_waste_r": this.clearWaste(action, param); break;
                case "bridge_gap": this.bridgeGap(param); break;
                case "clear_debris": this.clearDebris(param); break;
                case "use_spring": this.useSpring(param); break;
                case "fight_gang": this.fightGang(param); break;
                case "send_caravan": this.sendCaravan(param); break;
                case "trade_with_caravan": this.tradeWithCaravan(); break;
                case "nap": this.nap(param); break;
                case "despair": this.despair(param); break;
                case "unlock_upgrade": this.unlockUpgrade(param); break;
                case "create_blueprint": this.createBlueprint(param); break;
                case "launch": this.launch(param); break;
				// Mapped directly in UIFunctions
                case "leave_camp": break;
				// Movement
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
					log.w("No function mapped for action " + action + " in PlayerActionFunctions.performAction");
					break;
			}
		},
        
        completeAction: function (action) {
            if (this.currentAction == action)
                this.currentAction = null;
            GameGlobals.uiFunctions.completeAction(action);
            GlobalSignals.actionCompletedSignal.dispatch();
        },
        
        getPositionVO: function (sectorPos) {
			var l = parseInt(sectorPos.split(".")[0]);
			var sX = parseInt(sectorPos.split(".")[1]);
			var sY = parseInt(sectorPos.split(".")[2]);
			return new PositionVO(l, sX, sY);
        },

		getActionSector: function (action, param) {
            if (!param) return null;
            var position = this.getPositionVO(param);
			return GameGlobals.levelHelper.getSectorByPosition(position.level, position.sectorX, position.sectorY);
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
					log.w("unknown direction: " + direction);
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
				GlobalSignals.playerMovedSignal.dispatch(playerPos);
			} else {
				log.w("No camp found for level " + level);
			}
		},

		moveResFromCampToBag: function (resourcesVO) {
			var playerLevelCamp = this.nearestCampNodes.head !== null ? this.nearestCampNodes.head.entity : null;
			if (playerLevelCamp) {
				var playerResources = this.playerResourcesNodes.head.resources.resources;
				var campResourcesSource = GameGlobals.resourcesHelper.getCurrentStorage().resources;
				this.moveResourcesFromVOToVO(resourcesVO, campResourcesSource, playerResources);
			}
		},

		moveResFromBagToCamp: function () {
			var playerLevelCamp = this.nearestCampNodes.head !== null ? this.nearestCampNodes.head.entity : null;
			var playerResources = this.playerResourcesNodes.head.resources.resources;
			var campResourcesSource = playerLevelCamp.get(ResourcesComponent).resources;
			this.moveResourcesFromVOToVO(playerResources, playerResources, campResourcesSource);
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

		enterCamp: function (logMessage) {
			var playerPos = this.playerPositionNodes.head.position;
			var campNode = this.nearestCampNodes.head;
			if (campNode && campNode.position.level === playerPos.level && campNode.position.sectorId() === playerPos.sectorId()) {
				if (!playerPos.inCamp) {
					playerPos.inCamp = true;
					if (GameGlobals.resourcesHelper.hasCampStorage()) {
						this.moveResFromBagToCamp();
					}
					this.moveCurrencyFromBagToCamp();
                    
                    this.playerPositionNodes.head.entity.remove(ExcursionComponent);

					if (logMessage) this.addLogMessage(LogConstants.MSG_ID_ENTER_CAMP, "Entered camp.");
					GameGlobals.uiFunctions.showTab(GameGlobals.uiFunctions.elementIDs.tabs.in);
				}
                GlobalSignals.playerMovedSignal.dispatch(playerPos);
                GlobalSignals.playerEnteredCampSignal.dispatch();
                this.forceResourceBarUpdate();
                this.forceTabUpdate();
                this.save();
                this.updateLastVisitedCamp(campNode.entity);
			} else {
				playerPos.inCamp = false;
				log.w("No valid camp found.");
			}
		},

		enterOutTab: function () {
			var playerPos = this.playerPositionNodes.head.position;
			if (playerPos.inCamp && !GameGlobals.resourcesHelper.hasCampStorage()) this.leaveCamp();
		},

		leaveCamp: function () {
			var playerPos = this.playerPositionNodes.head.position;
			var campNode = this.nearestCampNodes.head;
			if (campNode && campNode.position.level === playerPos.level && campNode.position.sectorId() === playerPos.sectorId()) {
				var sunlit = campNode.entity.get(SectorFeaturesComponent).sunlit;
				playerPos.inCamp = false;
                this.playerPositionNodes.head.entity.add(new ExcursionComponent());
				var msg = "Left camp. " + (sunlit ? "Sunlight is sharp and merciless." : "The darkness of the city envelops you.");
				this.addLogMessage(LogConstants.MSG_ID_LEAVE_CAMP, msg);
                GameGlobals.uiFunctions.showTab(GameGlobals.uiFunctions.elementIDs.tabs.out);
				GlobalSignals.playerMovedSignal.dispatch(playerPos);
				this.forceResourceBarUpdate();
				this.forceTabUpdate();
				this.save();
			} else {
				log.w("No valid camp found. (player pos: " + playerPos + ")");
			}
		},

		scavenge: function () {
			var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
            var efficiency = GameGlobals.playerActionResultsHelper.getScavengeEfficiency();
			GameGlobals.gameState.unlockedFeatures.scavenge = true;

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
			var successCallback = function () {
				sectorStatus.scavenged = true;
                sectorStatus.weightedNumScavenges += efficiency;
			};
			this.handleOutActionResults("scavenge", LogConstants.MSG_ID_SCAVENGE, logMsgSuccess, logMsgFlee, logMsgDefeat, true, null, successCallback);
		},

		scout: function () {
			var sector = this.playerLocationNodes.head.entity;
			var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			var featuresComponent = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			if (!sectorStatus.scouted) {
				if (!GameGlobals.gameState.unlockedFeatures.evidence) {
					GameGlobals.gameState.unlockedFeatures.evidence = true;
					GlobalSignals.featureUnlockedSignal.dispatch();
				}

				if (!GameGlobals.gameState.unlockedFeatures.scout) {
					GameGlobals.gameState.unlockedFeatures.scout = true;
					GlobalSignals.featureUnlockedSignal.dispatch();
				}

				var logMsg = "Scouted the area.";
				var found = false;
				var sunlit = featuresComponent.sunlit;
				if (featuresComponent.hasSpring) {
					found = true;
					logMsg += "<br/>Found " + Text.addArticle(TextConstants.getSpringName(featuresComponent)) + ".";
				}
                
				var workshopComponent = sector.get(WorkshopComponent);
				if (workshopComponent && workshopComponent.isClearable) {
					found = true;
					logMsg += "<br/>Found " + Text.addArticle(TextConstants.getWorkshopName(workshopComponent.resource));
				}
                
                if (featuresComponent.campable) {
                    if (!this.nearestCampNodes.head || this.nearestCampNodes.head.position.level != this.playerLocationNodes.head.position.level) {
                        found = true;
                        logMsg += "<br/>This seems like a good place for a camp.";
                    }
                }

				var passagesComponent = this.playerLocationNodes.head.entity.get(PassagesComponent);
				if (passagesComponent.passageUp) {
					found = true;
					logMsg += "<br/>" + TextConstants.getPassageFoundMessage(passagesComponent.passageUp, PositionConstants.DIRECTION_UP, sunlit) + " ";
				}

				if (passagesComponent.passageDown) {
					found = true;
					logMsg += "<br/>" + TextConstants.getPassageFoundMessage(passagesComponent.passageDown, PositionConstants.DIRECTION_DOWN, sunlit) + " ";
				}

				var sectorLocalesComponent = sector.get(SectorLocalesComponent);
				if (sectorLocalesComponent.locales.length > 0) {
					found = true;
					var locale = sectorLocalesComponent.locales[0];
					if (sectorLocalesComponent.locales.length > 1)
						logMsg += "<br/>There are some interesting buildings here.";
					else
						logMsg += "<br/>There is a " + TextConstants.getLocaleName(locale, featuresComponent, true).toLowerCase() + " here that seems worth investigating.";
				}

				var playerActionFunctions = this;
				var successCallback = function () {
					sectorStatus.scouted = true;
					GlobalSignals.sectorScoutedSignal.dispatch();
        			playerActionFunctions.completeAction("scout");
					playerActionFunctions.engine.getSystem(UIOutLevelSystem).rebuildVis();
					playerActionFunctions.save();
				};

				var logMsgId = found ? LogConstants.MSG_ID_SCOUT_FOUND_SOMETHING : LogConstants.MSG_ID_SCOUT;
				this.handleOutActionResults("scout", logMsgId, logMsg, logMsg, logMsg, true, found, successCallback);
			} else {
				log.w("Sector already scouted.");
			}
		},

		scoutLocale: function (i) {
            if (!this.playerLocationNodes.head) return;
			var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			var sectorLocalesComponent = this.playerLocationNodes.head.entity.get(SectorLocalesComponent);
			var sectorFeaturesComponent = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			var localeVO = sectorLocalesComponent.locales[i];
            if (!localeVO) {
                log.w("no such locale " + i + "/" + sectorLocalesComponent.locales.length);
                return;
            }
			var action = "scout_locale_" + localeVO.getCategory() + "_" + i;

			// TODO add more interesting log messages - especially for trade partners
			var localeName = TextConstants.getLocaleName(localeVO, sectorFeaturesComponent);
			localeName = localeName.split(" ")[localeName.split(" ").length - 1];
			var baseMsg = "Scouted the " + localeName + ". ";
			var logMsgSuccess = baseMsg;
			var logMsgFlee = baseMsg + " Got surprised and fled.";
			var logMsgDefeat = baseMsg + " Got surprised and beaten.";
            
            var tradingPartner = null;
			if (localeVO.type === localeTypes.tradingpartner) {
				var playerPos = this.playerPositionNodes.head.position;
				var level = playerPos.level;
				var campOrdinal = GameGlobals.gameState.getCampOrdinal(level);
                if (GameGlobals.gameState.foundTradingPartners.indexOf(campOrdinal) < 0) {
	                var partnerName = TradeConstants.getTradePartner(campOrdinal).name;
		            logMsgSuccess += "<br/>Found a new <span class='hl-functionality'>trading partner</span>. They call this place " + partnerName + ".";
                    tradingPartner = campOrdinal;
                } else {
                   log.w("can't add trade partner - already found: camp ordinal " + campOrdinal);
                }
			}
            if (localeVO.type == localeTypes.grove) {
                GameGlobals.gameState.unlockedFeatures.favour = true;
                GlobalSignals.featureUnlockedSignal.dispatch();
                if (!this.playerStatsNodes.head.entity.has(DeityComponent)) {
                    this.playerStatsNodes.head.entity.add(new DeityComponent())
                }
                logMsgSuccess += "The trees seem alive. They whisper, but the words are unintelligible. You have found a source of <span class='hl-functionality'>ancient power</span>.";
            }

			var playerActionFunctions = this;
			var successCallback = function () {
				sectorStatus.localesScouted[i] = true;
				if (tradingPartner) {
                    GameGlobals.gameState.foundTradingPartners.push(tradingPartner);
                    if (!GameGlobals.gameState.unlockedFeatures.trade) {
                        GameGlobals.gameState.unlockedFeatures.trade = true;
                        GlobalSignals.featureUnlockedSignal.dispatch();
                    }
				}
				playerActionFunctions.engine.getSystem(UIOutLevelSystem).rebuildVis();
				playerActionFunctions.save();
			};

			this.handleOutActionResults(action, LogConstants.MSG_ID_SCOUT_LOCALE, logMsgSuccess, logMsgFlee, logMsgDefeat, true, tradingPartner != null, successCallback);
		},

		useSpring: function () {
			var sector = this.playerLocationNodes.head.entity;
			var sectorFeatures = sector.get(SectorFeaturesComponent);
			var springName = TextConstants.getSpringName(sectorFeatures);

			var logMsgSuccess = "Refilled water at the " + springName + ".";
			var logMsgFailBase = "Approached the " + springName + ", but got attacked. ";
			var logMsgFlee = logMsgFailBase + "Fled empty-handed.";
			var logMsgDefeat = logMsgFailBase + "Lost the fight.";

			this.handleOutActionResults("use_spring", LogConstants.MSG_ID_USE_SPRING, logMsgSuccess, logMsgFlee, logMsgDefeat, true, false);
		},

		clearWorkshop: function () {
            var workshopComponent = this.playerLocationNodes.head.entity.get(WorkshopComponent);
            var name = TextConstants.getWorkshopName(workshopComponent.resource);
			var action = "clear_workshop";
			var logMsgSuccess = "Workshop cleared. Workers can now use it.";
			var logMsgFlee = "Fled the " + name + ".";
			var logMsgDefeat = "Got driven out of the " + name + ".";

			var playerActionFunctions = this;
			var successCallback = function () {
                GameGlobals.gameState.unlockedFeatures.resources[workshopComponent.resource] = true;
				playerActionFunctions.engine.getSystem(UIOutLevelSystem).rebuildVis();
			};

			this.handleOutActionResults(action, LogConstants.MSG_ID_WORKSHOP_CLEARED, logMsgSuccess, logMsgFlee, logMsgDefeat, true, true, successCallback);
		},

		clearWaste: function (action, direction) {
			log.i("clear waste " + direction);
			var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			var positionComponent = this.playerLocationNodes.head.entity.get(PositionComponent);
            var passagesComponent = this.playerLocationNodes.head.entity.get(PassagesComponent);
            var blocker = passagesComponent.getBlocker(direction);

			var logMsgSuccess = "Cleared the waste. The area is now safe to pass through.";
			var logMsgFailBase = "Attempted to clear the waste but got attacked. ";
			var logMsgFlee = logMsgFailBase + "Feld before completing the operation.";
			var logMsgDefeat = logMsgFailBase + "Lost the fight.";

            var sys = this;
			var successCallback = function () {
                var sectorPos = positionComponent.level + "." + positionComponent.sectorId() + "." + direction;
                sys.clearBlocker(action, blocker.type, sectorPos);
			};

			this.handleOutActionResults(action, LogConstants.MSG_ID_CLEAR_WASTE, logMsgSuccess, logMsgFlee, logMsgDefeat, true, false, successCallback);
		},

		bridgeGap: function (sectorPos) {
            this.clearBlocker("bridge_gap", MovementConstants.BLOCKER_TYPE_GAP, sectorPos)
			this.addLogMessage(LogConstants.MSG_ID_BRIDGED_GAP, "Built a bridge.");
		},
        
        clearDebris: function (sectorPos) {
            this.clearBlocker("clear_debris", MovementConstants.BLOCKER_TYPE_DEBRIS, sectorPos)
			this.addLogMessage(LogConstants.MSG_ID_CLEAR_DEBRIS, "Sent out a team to clear debris.");
        },
        
        clearBlocker: function (action, blockerType, sectorPos) {
            // parse sector pos
            var direction = parseInt(sectorPos.split(".")[3]);
			var sector = this.getActionSector(action, sectorPos);
			var positionComponent = sector.get(PositionComponent);
            
			// find neighbour
            var oppositeDirection = PositionConstants.getOppositeDirection(direction);
			var neighbourPos = PositionConstants.getPositionOnPath(positionComponent.getPosition(), direction, 1);
			var neighbour = GameGlobals.levelHelper.getSectorByPosition(neighbourPos.level, neighbourPos.sectorX, neighbourPos.sectorY);
            
            // set status
            var sectorStatus = sector.get(SectorStatusComponent);
            sectorStatus.setBlockerCleared(direction, blockerType);
            var neighbourStatus = neighbour.get(SectorStatusComponent);
            neighbourStatus.setBlockerCleared(oppositeDirection, blockerType);
        
            // complete
            this.completeAction(action);
            GlobalSignals.movementBlockerClearedSignal.dispatch();
        },

		nap: function () {
            var sys = this;
            var excursionComponent = sys.playerStatsNodes.head.entity.get(ExcursionComponent);
            GameGlobals.uiFunctions.setGameElementsVisibility(false);
            GameGlobals.uiFunctions.showInfoPopup(
                "Rest",
                "Found a bench to sleep on and tried to regain some energy.",
                "Continue",
                null,
                () => {
        			GameGlobals.uiFunctions.hideGame(false);
        			this.passTime(60, function () {
        				setTimeout(function () {
                            GameGlobals.uiFunctions.showGame();
            				GameGlobals.uiFunctions.onPlayerMoved(); // reset cooldowns
                            if (excursionComponent) excursionComponent.numNaps++;
        					sys.playerStatsNodes.head.vision.value = Math.min(sys.playerStatsNodes.head.vision.value, PlayerStatConstants.VISION_BASE);
        					var logMsgSuccess = "Found a park bench to sleep on. Barely feel rested.";
        					var logMsgFlee = "Tried to rest but got attacked.";
        					var logMsgDefeat = logMsgFlee;
        					sys.handleOutActionResults("nap", LogConstants.MSG_ID_NAP, logMsgSuccess, logMsgFlee, logMsgDefeat, false, false,
        						function () {
        							sys.playerStatsNodes.head.stamina.stamina += PlayerStatConstants.STAMINA_GAINED_FROM_NAP;
        						},
        					);
        				}, 300);
        			});
                }
            );
		},

		handleOutActionResults: function (action, logMsgId, logMsgSuccess, logMsgFlee, logMsgDefeat, showResultPopup, hasCustomReward, successCallback, failCallback) {
            this.currentAction = action;
			var playerActionFunctions = this;
			var baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(action);
            showResultPopup = showResultPopup && !GameGlobals.gameState.uiStatus.isHidden;
			GameGlobals.fightHelper.handleRandomEncounter(action, function () {
				var rewards = GameGlobals.playerActionResultsHelper.getResultVOByAction(action, hasCustomReward);
				var player = playerActionFunctions.playerStatsNodes.head.entity;
                var sector = playerActionFunctions.playerLocationNodes.head.entity;
                var sectorStatus = sector.get(SectorStatusComponent);
				player.add(new PlayerActionResultComponent(rewards));
                var popupMsg = logMsgSuccess;
                if (rewards && rewards.foundStashVO) {
                    sectorStatus.stashesFound++;
                    popupMsg += TextConstants.getFoundStashMessage(rewards.foundStashVO);
                }
				var resultPopupCallback = function (isTakeAll) {
					GameGlobals.playerActionResultsHelper.collectRewards(isTakeAll, rewards);
					if (logMsgSuccess) playerActionFunctions.addLogMessage(logMsgId, logMsgSuccess);
					GameGlobals.playerActionResultsHelper.logResults(rewards);
					playerActionFunctions.forceResourceBarUpdate();
					playerActionFunctions.forceTabUpdate();
					player.remove(PlayerActionResultComponent);
					if (successCallback) successCallback();
					GlobalSignals.inventoryChangedSignal.dispatch();
                    GlobalSignals.sectorScavengedSignal.dispatch();
					playerActionFunctions.completeAction(action);
				};
				if (showResultPopup) {
					GameGlobals.uiFunctions.showResultPopup(TextConstants.getActionName(baseActionID), popupMsg, rewards, resultPopupCallback);
				} else {
					resultPopupCallback();
				}
			}, function () {
				playerActionFunctions.completeAction(action);
				if (logMsgFlee) playerActionFunctions.addLogMessage(logMsgId, logMsgFlee);
				if (failCallback) failCallback();
			}, function () {
				playerActionFunctions.completeAction(action);
				if (logMsgDefeat) playerActionFunctions.addLogMessage(logMsgId, logMsgDefeat);
				if (failCallback) failCallback();
			});
		},

		sendCaravan: function (tradePartnerOrdinal) {
            var campOutgoingCaravansComponent;
			var campSector;
			var caravan;
            var caravanI;
            
            // TODO fix this so that if several camps send a caravan to the same destination they don't get mixed
            // make a proper system for outgoing caravans instead of relying on action duration & action params
            for (var node = this.campNodes.head; node; node = node.next) {
                campOutgoingCaravansComponent = node.entity.get(OutgoingCaravansComponent);
                for (var i in campOutgoingCaravansComponent.outgoingCaravans) {
                    var caravanVO = campOutgoingCaravansComponent.outgoingCaravans[i];
                    if (caravanVO.tradePartnerOrdinal == tradePartnerOrdinal) {
                        campSector = node.entity;
                        caravan = caravanVO;
                        caravanI = i;
                        break;
                    }
                }
                if (campSector && caravan) {
                    break;
                }
            }

			if (!campSector || !caravan) {
				log.w("No matching returning caravan found.");
				return;
			}

            var tradePartnerOrdinal = caravan.tradePartnerOrdinal;
			var tradePartner = TradeConstants.getTradePartner(parseInt(tradePartnerOrdinal));

			if (!tradePartner) {
				log.w("No matching trade partner found.");
                log.i(caravan);
				return;
			}
            
			var result = TradeConstants.makeResultVO(caravan);
			var logMsg = GameGlobals.playerActionResultsHelper.getRewardsMessage(result, "A trade caravan returns from " + tradePartner.name + ". ");
			var pendingPosition = campSector.get(PositionComponent).clone();
			pendingPosition.inCamp = true;

			campOutgoingCaravansComponent.outgoingCaravans.splice(caravanI, 1);

			GameGlobals.playerActionResultsHelper.collectRewards(true, result, campSector);
			this.completeAction("send_caravan");

			this.addLogMessage(LogConstants.MSG_ID_FINISH_SEND_CAMP, logMsg.msg, logMsg.replacements, logMsg.values, pendingPosition);
			this.forceResourceBarUpdate();
		},

		tradeWithCaravan: function () {
			GameGlobals.uiFunctions.popupManager.closePopup("incoming-caravan-popup");

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
					itemsComponent.discardItem(itemsComponent.getItem(itemID, null, true, false), false);
				}
			}

			// resources
			var campStorage = GameGlobals.resourcesHelper.getCurrentStorage();
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
			var currencyComponent = GameGlobals.resourcesHelper.getCurrentCurrency();
			if (caravan.traderSelectedCurrency > 0) {
				caravan.currency -= caravan.traderSelectedCurrency;
				currencyComponent.currency += caravan.traderSelectedCurrency;
                GameGlobals.gameState.unlockedFeatures.currency = true;
			}

			if (caravan.campSelectedCurrency) {
				caravan.currency += caravan.campSelectedCurrency;
				currencyComponent.currency -= caravan.campSelectedCurrency;
			}

			caravan.clearSelection();
			caravan.tradesMade++;
            
            GlobalSignals.inventoryChangedSignal.dispatch();
			this.addLogMessage(LogConstants.MSG_ID_TRADE_WITH_CARAVAN, "Traded with a caravan.");
		},

		fightGang: function (direction) {
			var action = "fight_gang_" + direction;
            this.currentAction = action;
			var playerActionFunctions = this;
			GameGlobals.fightHelper.handleRandomEncounter(action, function () {
				playerActionFunctions.addLogMessage(LogConstants.MSG_ID_GANG_DEFEATED, "The street is clear.");
				playerActionFunctions.completeAction(action);
				playerActionFunctions.engine.getSystem(UIOutLevelSystem).rebuildVis();
			}, function () {
				// fled
				playerActionFunctions.completeAction(action);
			}, function () {
				// lost
				playerActionFunctions.completeAction(action);
			});
		},

		flee: function () {
			if (GameGlobals.playerActionsHelper.checkAvailability("flee", true)) {
				GameGlobals.playerActionsHelper.deductCosts("flee");
				this.completeAction("flee");
			}
		},

		despair: function () {
			this.engine.getSystem(FaintingSystem).checkFainting();
			this.completeAction("despair");
		},

		buildCamp: function () {
			var sector = this.playerLocationNodes.head.entity;
			var level = GameGlobals.levelHelper.getLevelEntityForSector(sector);
			var position = sector.get(PositionComponent).getPosition();
            var campOrdinal = GameGlobals.gameState.getCampOrdinal(level);
            log.i("Build camp " + position);
			var campComponent = new CampComponent(position.toString());
			campComponent.foundedTimeStamp = GameGlobals.gameState.gameTime;
			sector.add(campComponent);
			sector.add(new CampEventTimersComponent());
			sector.add(new OutgoingCaravansComponent());
			sector.add(new ReputationComponent());
			sector.add(new CurrencyComponent());

			level.add(campComponent);

			var improvementsComponent = sector.get(SectorImprovementsComponent);
			improvementsComponent.add(improvementNames.home);

			GameGlobals.gameState.unlockedFeatures.camp = true;
			gtag('event', 'build_camp', { event_category: 'progression', event_label: campOrdinal })
			gtag('event', 'build_camp_time', { event_category: 'game_time', event_label: campOrdinal, value: GameGlobals.gameState.playTime })

			this.addLogMessage(LogConstants.MSG_ID_BUILT_CAMP, "Built a camp.");
			if (level.get(LevelComponent).populationFactor < 1) {
				this.addLogMessage(LogConstants.MSG_ID_BUILT_CAMP_LEVEL_POPULATION, "There are few signs of human life on this level.");
			}
			GlobalSignals.improvementBuiltSignal.dispatch();
			GlobalSignals.campBuiltSignal.dispatch();
			this.forceResourceBarUpdate();
			this.save();
		},

		buildPassageUpStairs: function (sectorPos) {
			this.buildPassage(sectorPos, true, MovementConstants.PASSAGE_TYPE_STAIRWELL, "build_out_passage_up_stairs", "build_out_passage_down_stairs");
		},

		buildPassageDownStairs: function (sectorPos) {
			this.buildPassage(sectorPos, false, MovementConstants.PASSAGE_TYPE_STAIRWELL, "build_out_passage_down_stairs", "build_out_passage_up_stairs");
		},

		buildPassageUpElevator: function (sectorPos) {
			this.buildPassage(sectorPos, true, MovementConstants.PASSAGE_TYPE_ELEVATOR, "build_out_passage_up_elevator", "build_out_passage_down_elevator");
		},

		buildPassageDownElevator: function (sectorPos) {
			this.buildPassage(sectorPos, false, MovementConstants.PASSAGE_TYPE_ELEVATOR, "build_out_passage_down_elevator", "build_out_passage_up_elevator");
		},

		buildPassageUpHole: function (sectorPos) {
			this.buildPassage(sectorPos, true, MovementConstants.PASSAGE_TYPE_HOLE, "build_out_passage_up_hole", "build_out_passage_down_hole");
		},

		buildPassageDownHole: function (sectorPos) {
			this.buildPassage(sectorPos, false, MovementConstants.PASSAGE_TYPE_HOLE, "build_out_passage_down_hole", "build_out_passage_up_hole");
		},

		buildPassage: function (sectorPos, up, passageType, action, neighbourAction) {
			var position = this.getPositionVO(sectorPos);
			var levelOrdinal = GameGlobals.gameState.getLevelOrdinal(position.level);
			action = action + "_" + levelOrdinal;
			var sector = this.getActionSector(action, sectorPos);
			neighbourAction = neighbourAction + "_" + levelOrdinal;

			var sectorPosVO = StringUtils.getPosition(sectorPos);
			var neighbour = GameGlobals.levelHelper.getSectorByPosition(up ? position.level + 1 : position.level - 1, position.sectorX, position.sectorY);

			if (sector && neighbour) {
				var direction = up ? PositionConstants.DIRECTION_UP : PositionConstants.DIRECTION_DOWN;
				var msg = TextConstants.getPassageRepairedMessage(passageType, direction, sectorPosVO);
				this.buildImprovement(action, GameGlobals.playerActionsHelper.getImprovementNameForAction(action), sector);
				this.buildImprovement(neighbourAction, GameGlobals.playerActionsHelper.getImprovementNameForAction(neighbourAction), neighbour, true);
				this.addLogMessage(LogConstants.MSG_ID_BUILT_PASSAGE, msg);
			} else {
				log.w("Couldn't find sectors for building passage.");
				log.i(sector);
				log.i(neighbour);
				log.i(sectorPos);
			}
		},
        
        buildGreenhouse: function (sectorPos) {
            var action = "build_out_greenhouse";
			var position = this.getPositionVO(sectorPos);
			var sector = this.getActionSector(action, sectorPos);
            this.buildImprovement(action, improvementNames.greenhouse, sector);
        },

		buildTrap: function () {
			this.buildImprovement("build_out_collector_food", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_out_collector_food"));
			this.addLogMessage(LogConstants.MSG_ID_BUILT_TRAP, "Built a trap. It will catch food.");
			if (!this.playerLocationNodes.head.entity.has(SectorCollectorsComponent))
				this.playerLocationNodes.head.entity.add(new SectorCollectorsComponent());
            GlobalSignals.improvementBuiltSignal.dispatch();
		},

		buildBucket: function () {
			this.buildImprovement("build_out_collector_water", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_out_collector_water"));
			this.addLogMessage(LogConstants.MSG_ID_BUILT_BUCKET, "Made a bucket. It will collect water.");
			if (!this.playerLocationNodes.head.entity.has(SectorCollectorsComponent))
				this.playerLocationNodes.head.entity.add(new SectorCollectorsComponent());
            GlobalSignals.improvementBuiltSignal.dispatch();
		},
        
        buildBeacon: function () {
			this.buildImprovement("build_out_beacon", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_out_beacon"));
			this.addLogMessage(LogConstants.MSG_ID_BUILT_BEACON, "Beacon is ready.");
            GlobalSignals.improvementBuiltSignal.dispatch();
        },

		buildHouse: function (otherSector) {
			this.buildImprovement("build_in_house", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_house"), otherSector);
			var msg = "Built a hut.";
			var totalHouses = 0;
			for (var node = this.engine.getNodeList(CampNode).head; node; node = node.next) {
				var improvementsComponent = node.entity.get(SectorImprovementsComponent);
				totalHouses += improvementsComponent.getCount(improvementNames.house);
			}
			if (totalHouses < 5) msg += " People will come if they hear about the camp.";
			this.addLogMessage(LogConstants.MSG_ID_BUILT_HOUSE, msg);
		},

		buildHouse2: function (otherSector) {
			this.buildImprovement("build_in_house2", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_house2"), otherSector);
			var msg = "Built a tower block.";
			this.addLogMessage(LogConstants.MSG_ID_BUILT_HOUSE, msg);
		},

		buildGenerator: function () {
			this.buildImprovement("build_in_generator", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_generator"));
			var msg = "Set up a generator.";
			this.addLogMessage(LogConstants.MSG_ID_BUILT_GENERATOR, msg);
		},

		buildLights: function () {
			this.buildImprovement("build_in_lights", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_lights"));
			var msg = "Installed lights to the camp.";
			this.addLogMessage(LogConstants.MSG_ID_BUILT_LIGHTS, msg);
		},

		buildCeiling: function () {
			this.buildImprovement("build_in_ceiling", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_ceiling"));
			var msg = "Build a big tent to protect the camp from the sun.";
			this.addLogMessage(LogConstants.MSG_ID_BUILT_CEILING, msg);
		},

		buildStorage: function (sector) {
			this.buildImprovement("build_in_storage", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_storage"), sector);
			this.addLogMessage(LogConstants.MSG_ID_BUILT_STORAGE, "Built a storage.");
            if (!GameGlobals.gameState.unlockedFeatures.trade) {
                GameGlobals.gameState.unlockedFeatures.trade = true;
                GlobalSignals.featureUnlockedSignal.dispatch();
            }
		},

		buildFortification: function () {
			this.buildImprovement("build_in_fortification", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_fortification"));
			this.addLogMessage(LogConstants.MSG_ID_BUILT_FORTIFICATION, "Fortified the camp.");
		},

		buildFortification2: function () {
			this.buildImprovement("build_in_fortification2", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_fortification2"));
			this.addLogMessage(LogConstants.MSG_ID_BUILT_FORTIFICATION, "Fortified the camp.");
		},

		buildAqueduct: function () {
			this.buildImprovement("build_in_aqueduct", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_aqueduct"));
			this.addLogMessage(LogConstants.MSG_ID_BUILT_AQUEDUCT, "Built an aqueduct.");
		},

		buildStable: function () {
			this.buildImprovement("build_in_stable", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_stable"));
			this.addLogMessage(LogConstants.MSG_ID_BUILT_STABLE, "Built a caravan stable.");
		},

		buildBarracks: function () {
			this.buildImprovement("build_in_barracks", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_barracks"));
			this.addLogMessage(LogConstants.MSG_ID_BUILT_BARRACKS, "Built a barracks.");
		},

		buildSmithy: function () {
			this.buildImprovement("build_in_smithy", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_smithy"));
			this.addLogMessage(LogConstants.MSG_ID_BUILT_SMITHY, "Built a smithy.");
		},

		buildApothecary: function () {
			this.buildImprovement("build_in_apothecary", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_apothecary"));
			this.addLogMessage(LogConstants.MSG_ID_BUILT_APOTHECARY, "Built an apothecary.");
		},

		buildCementMill: function () {
			this.buildImprovement("build_in_cementmill", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_cementmill"));
			this.addLogMessage(LogConstants.MSG_ID_BUILT_CEMENT_MILL, "Built a cement mill for making concrete.");
		},

		buildRadioTower: function () {
			this.buildImprovement("build_in_radiotower", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_radio"));
			this.addLogMessage(LogConstants.MSG_ID_BUILT_RADIO, "Built a radio tower.");
		},

		buildCampfire: function () {
			var improvementName = GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_campfire");
			var improvementsComponent = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			var count = improvementsComponent.getCount(improvementName);

			this.buildImprovement("build_in_campfire", improvementName);
			if (count === 0)
				this.addLogMessage(LogConstants.MSG_ID_BUILT_CAMPFIRE, "Built a campfire. Here, ideas are shared and discussed.");
			else
				this.addLogMessage(LogConstants.MSG_ID_BUILT_CAMPFIRE, "Improved campfire. It will attract more rumours.");
		},

		buildDarkFarm: function () {
			this.buildImprovement("build_in_darkfarm", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_darkfarm"));
			this.addLogMessage(LogConstants.MSG_ID_BUILT_DARKFARM, "Built a snail farm.");
		},

		buildHospital: function () {
			this.buildImprovement("build_in_hospital", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_hospital"));
			this.addLogMessage(LogConstants.MSG_ID_BUILT_HOSPITAL, "Built a clinic.");
		},

		buildLibrary: function () {
			this.buildImprovement("build_in_library", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_library"));
			this.addLogMessage(LogConstants.MSG_ID_BUILT_LIBRARY, "Built a library.");
		},

		buildMarket: function () {
			this.buildImprovement("build_in_market", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_market"));
			this.addLogMessage(LogConstants.MSG_ID_BUILT_MARKET, "Built a market.");
            if (!GameGlobals.gameState.unlockedFeatures.trade) {
                GameGlobals.gameState.unlockedFeatures.trade = true;
                GlobalSignals.featureUnlockedSignal.dispatch();
            }
		},

		buildTradingPost: function () {
            var improvementName = GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_tradepost");
            var isFirst = GameGlobals.campHelper.getTotalNumImprovementsBuilt(improvementName) == 0;
			this.buildImprovement("build_in_tradepost", improvementName);
            if (isFirst) {
	             this.addLogMessage(LogConstants.MSG_ID_BUILT_TRADING_POST, "Built a trading post. Build another one to connect the camps.");
            } else {
	             this.addLogMessage(LogConstants.MSG_ID_BUILT_TRADING_POST, "Built a trading post.");
            }
		},

		buildInn: function () {
			this.buildImprovement("build_in_inn", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_inn"));
			this.addLogMessage(LogConstants.MSG_ID_BUILT_INN, "Built an inn. Maybe it will attract adventurers.");
		},

		buildSquare: function () {
			this.buildImprovement("build_in_square", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_square"));
			this.addLogMessage(LogConstants.MSG_ID_BUILT_SQUARE, "Built a square. The camp feels more like a town withing the City already.");
		},

		buildGarden: function () {
			this.buildImprovement("build_in_garden", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_garden"));
			this.addLogMessage(LogConstants.MSG_ID_BUILT_GARDEN, "Built a garden.");
		},
        
        buildShrine: function () {
			this.buildImprovement("build_in_shrine", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_shrine"));
			this.addLogMessage(LogConstants.MSG_ID_BUILT_SHRINE, "Built a shrine.");
        },
        
        buildTemple: function () {
			this.buildImprovement("build_in_temple", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_temple"));
			this.addLogMessage(LogConstants.MSG_ID_BUILT_TEMPLE, "Built a temple.");
        },

		buildSpaceShip1: function (sectorPos) {
			this.buildSpaceShip(sectorPos, "build_out_spaceship1");
		},

		buildSpaceShip2: function (sectorPos) {
			this.buildSpaceShip(sectorPos, "build_out_spaceship2");
		},

		buildSpaceShip3: function (sectorPos) {
			this.buildSpaceShip(sectorPos, "build_out_spaceship3");
		},

		buildSpaceShip: function (sectorPos, action) {
			var sectorPosVO = this.getPositionVO(sectorPos);
			var sector = this.getActionSector(action, sectorPos);
			var playerPos = this.playerPositionNodes.head.position;

			if (sector) {
				var msg = "Colony construction project ready at " + sectorPosVO.getInGameFormat(playerPos.level === l);
				this.buildImprovement(action, GameGlobals.playerActionsHelper.getImprovementNameForAction(action), sector);
				this.addLogMessage(LogConstants.MSG_ID_BUILT_SPACESHIP, msg);
			} else {
				log.w("Couldn't find sectors for building space ship.");
				log.i(sector);
				log.i(sectorPos);
			}
		},
        
        improveCampfire: function () {
            this.improveImprovement("improve_in_campfire");
            this.addLogMessage(LogConstants.MSG_ID_IMPROVED_CAMPFIRE, "Made the campfire a bit cozier.");
        },
        
        improveLibrary: function () {
            this.improveImprovement("improve_in_library");
            this.addLogMessage(LogConstants.MSG_ID_IMPROVED_LIBRARY, "Upgraded the library.");
        },
        
        improveTemple: function () {
            this.improveImprovement("improve_in_temple");
            this.addLogMessage(LogConstants.MSG_ID_IMPROVED_TEMPLE, "Upgraded the temple.");
        },
        
        improveSquare: function () {
            this.improveImprovement("improve_in_square");
            this.addLogMessage(LogConstants.MSG_ID_IMPROVED_SQUARE, "Upgraded the square.");
        },
        
        improveGenerator: function () {
            this.improveImprovement("improve_in_generator");
            this.addLogMessage(LogConstants.MSG_ID_IMPROVED_GENERATOR, "Fixed up the generator.");
        },
        
        improveMarket: function () {
            this.improveImprovement("improve_in_market");
            this.addLogMessage(LogConstants.MSG_ID_IMPROVED_MARKET, "Upgraded the market");
        },
        
        improveApothecary: function () {
            this.improveImprovement("improve_in_apothecary");
            this.addLogMessage(LogConstants.MSG_ID_IMPROVED_APOTHECARY, "Improved the apothecaries.");
        },
        
        improveSmithy: function () {
            this.improveImprovement("improve_in_smithy");
            this.addLogMessage(LogConstants.MSG_ID_IMPROVED_SMIHTY, "Improved the smithy.");
        },
        
        improveCementMill: function () {
            this.improveImprovement("improve_in_cementmill");
            this.addLogMessage(LogConstants.MSG_ID_IMPROVED_CEMENTMILL, "Improved the cement mills.");
        },

		collectFood: function (param, amount) {
			this.collectCollector("use_out_collector_food", "collector_food", amount);
		},

		collectWater: function (param, amount) {
			this.collectCollector("use_out_collector_water", "collector_water", amount);
		},

		useHome: function () {
			this.playerStatsNodes.head.stamina.stamina = this.playerStatsNodes.head.stamina.health * PlayerStatConstants.HEALTH_TO_STAMINA_FACTOR;
            
            if (this.playerStatsNodes.head.stamina.isPendingPenalty) {
                var perksComponent = this.playerStatsNodes.head.perks;
    			perksComponent.addPerk(PerkConstants.getPerk(PerkConstants.perkIds.staminaBonusPenalty, 300));
                this.playerStatsNodes.head.stamina.isPendingPenalty = false;
            }
            
			this.completeAction("use_in_home");
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
				log.w("No camp sector found.");
			}
			this.completeAction("use_in_campfire");
			this.forceResourceBarUpdate();
            
            GlobalSignals.tribeStatsChangedSignal.dispatch();
		},
        
        useMarket: function () {
			var campSector = this.nearestCampNodes.head.entity;
			var campComponent = campSector.get(CampComponent);
			var improvementsComponent = campSector.get(SectorImprovementsComponent);
			// TODO move this check to startAction
			if (campSector) {
                var marketLevel = improvementsComponent.getLevel(improvementNames.market);
                var marketUpgradeLevel = GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.market, this.tribeUpgradesNodes.head.upgrades);
				this.playerStatsNodes.head.rumours.value += CampConstants.getRumoursPerVisitMarket(marketLevel, marketUpgradeLevel);
				this.addLogMessage(LogConstants.MSG_ID_USE_MARKET, "Visited the market and listened to the latest gossip.");
			} else {
				log.w("No camp sector found.");
			}
			this.completeAction("use_in_market");
			this.forceResourceBarUpdate();
        },

		useHospital: function () {
			var perksComponent = this.playerStatsNodes.head.perks;
			perksComponent.removePerksByType(PerkConstants.perkTypes.injury);

			this.playerStatsNodes.head.stamina.stamina = 1000;
			this.addLogMessage(LogConstants.MSG_ID_USE_HOSPITAL, "Healed all injuries.");

			this.completeAction("use_in_hospital");
			this.forceResourceBarUpdate();
			GameGlobals.gameState.unlockedFeatures.fight = true;
		},

		useHospital2: function () {
			var perksComponent = this.playerStatsNodes.head.perks;
			perksComponent.addPerk(PerkConstants.getPerk(PerkConstants.perkIds.healthAugment));
			this.addLogMessage(LogConstants.MSG_ID_USE_HOSPITAL2, "Improved health.");
			this.forceResourceBarUpdate();
		},

		useInn: function (auto) {
            this.currentAction = "use_in_inn";
			var sector = this.playerLocationNodes.head.entity;
			var positionComponent = sector.get(PositionComponent);
			var campCount = GameGlobals.gameState.numCamps;
			var maxAvailableFollowers = Math.max(0, Math.min(4, Math.floor(sector.get(CampComponent).population / 10))) + 1;
			var numAvailableFollowers = Math.floor(Math.random() * maxAvailableFollowers) + 1;
			var availableFollowers = [];
			for (var i = 0; i < numAvailableFollowers; i++) {
				availableFollowers.push(ItemConstants.getFollower(positionComponent.level, campCount));
			}
			if (auto) {
    			var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
    			var currentFollowers = itemsComponent.getAllByType(ItemConstants.itemTypes.follower, true);
				if (currentFollowers.length === 0 && availableFollowers.length > 0) {
					this.addFollower(availableFollowers[0]);
					return true;
				} else {
					for (var a1 = 0; a1 < availableFollowers.length; a1++) {
						var follower = availableFollowers[a1];
						for (var a2 = 0; a2 < currentFollowers.length; a2++) {
							var oldFollower = currentFollowers[a2];
							if (oldFollower.getBonusTotalBonus() < follower.getTotalBonus()) {
								itemsComponent.discardItem(oldFollower, false);
								this.addFollower(follower);
								return true;
							}
						}
					}
				}
			} else {
                // TODO save somewhere better
                GameGlobals.gameState.uiStatus.availableFollowers = availableFollowers;
				GameGlobals.uiFunctions.showInnPopup(availableFollowers);
			}
			this.completeAction("use_in_inn");

			return false;
		},

		useTemple: function () {
            this.playerStatsNodes.head.entity.get(DeityComponent).favour += 5;
			this.completeAction("use_in_temple");
			this.addLogMessage(LogConstants.MSG_ID_USE_TEMPLE, "Donated to the temple.");
			this.forceStatsBarUpdate();
		},

		useShrine: function () {
            let shrineLevel = GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.shrine, this.tribeUpgradesNodes.head.upgrades);
            let successChance = 0.4 + shrineLevel * 0.1;
            log.i("success chance: " + successChance)
            if (Math.random() < successChance) {
                this.playerStatsNodes.head.entity.get(DeityComponent).favour += 1;
    			this.addLogMessage(LogConstants.MSG_ID_USE_SHRINE, "Spent some time listening to the spirits.");
            } else {
    			this.addLogMessage(LogConstants.MSG_ID_USE_SHRINE, "Tried to meditate, but found no peace.");
            }
			this.completeAction("use_in_shrine");
			this.forceStatsBarUpdate();
		},

		addFollower: function (follower) {
            log.i("add follower " + follower.name, this);
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
			var item = GameGlobals.playerActionsHelper.getItemForCraftAction(actionName);
			itemsComponent.addItem(item.clone(), !this.playerPositionNodes.head.position.inCamp);

			if (item.type === ItemConstants.itemTypes.weapon)
				if (!GameGlobals.gameState.unlockedFeatures.fight) {
					GameGlobals.gameState.unlockedFeatures.fight = true;
					GlobalSignals.featureUnlockedSignal.dispatch();
				}

			if (item.type == ItemConstants.itemTypes.light) {
				if (!GameGlobals.gameState.unlockedFeatures.vision) {
					GameGlobals.gameState.unlockedFeatures.vision = true;
					GlobalSignals.featureUnlockedSignal.dispatch();
				}
			}

			this.addLogMessage(LogConstants.MSG_ID_CRAFT_ITEM, LogConstants.getCraftItemMessage(item));
			this.forceResourceBarUpdate();
			GlobalSignals.inventoryChangedSignal.dispatch();
			this.save();
		},

		equipItem: function (itemID) {
			var playerPos = this.playerPositionNodes.head.position;
			var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
			var item = itemsComponent.getItem(itemID, null, playerPos.inCamp, false);
			itemsComponent.equip(item);
			GlobalSignals.equipmentChangedSignal.dispatch();
		},

		unequipItem: function (itemID) {
			var playerPos = this.playerPositionNodes.head.position;
			var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
			var item = itemsComponent.getItem(itemID, null, playerPos.inCamp, true);
			itemsComponent.unequip(item);
			GlobalSignals.equipmentChangedSignal.dispatch();
		},

		discardItem: function (itemID) {
			var playerPos = this.playerPositionNodes.head.position;
			var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
			var item = itemsComponent.getItem(itemID, null, playerPos.inCamp, false) || itemsComponent.getItem(itemID, null, playerPos.inCamp, true);
			GameGlobals.uiFunctions.showConfirmation(
				"Are you sure you want to discard this item?",
				function () {
					itemsComponent.discardItem(item, false);
					GlobalSignals.equipmentChangedSignal.dispatch();
				}
			);
		},

		useItem: function (itemId) {
			var actionName = "use_item_" + itemId;
            var sys = this;
			var reqs = GameGlobals.playerActionsHelper.getReqs(actionName);
            var perksComponent = this.playerStatsNodes.head.perks;
            
			switch (itemId) {
				case "first_aid_kit_1":
				case "first_aid_kit_2":
					var injuries = perksComponent.getPerksByType(PerkConstants.perkTypes.injury);
					var minValue = reqs.perks.Injury[0];
					var injuryToHeal = null;
					for (var i = 0; i < injuries.length; i++) {
						if (injuries[i].effect > minValue) {
							injuryToHeal = injuries[i];
							break;
						}
					}
					if (injuryToHeal !== null) {
						perksComponent.removePerkById(injuryToHeal.id);
					} else {
						log.w("No injury found that can be healed!");
					}
        			this.addLogMessage(LogConstants.MSG_ID_USE_FIRST_AID_KIT, "Used a first aid kit.");
					this.forceStatsBarUpdate();
					break;
                
                case "stamina_potion_1":
                    perksComponent.addPerk(PerkConstants.getPerk(PerkConstants.perkIds.staminaBonus));
    				this.engine.updateComplete.addOnce(function () {
            			sys.addLogMessage(LogConstants.MSG_ID_USE_STAMINA_POTION, "Feeling stronger and more awake.");
                        sys.playerStatsNodes.head.stamina.stamina += PlayerStatConstants.STAMINA_GAINED_FROM_POTION_1;
        				sys.engine.updateComplete.addOnce(function () {
        					sys.forceStatsBarUpdate();
                        });
                    });
                    break;

				case "glowstick_1":
					var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
					sectorStatus.glowStickSeconds = 120;
					break;
                    
                case "cache_metal_1":
                case "cache_metal_2":
                    var value = 10 + Math.round(Math.random(10));
                    var item = ItemConstants.getItemByID(itemId);
                    var itemNameParts = item.name.split(" ");
                    var itemName = itemNameParts[itemNameParts.length - 1];
        			var currentStorage = GameGlobals.resourcesHelper.getCurrentStorage();
					currentStorage.resources.addResource(resourceNames.metal, value);
        			this.addLogMessage(LogConstants.MSG_ID_USE_METAL_CACHE, "Took apart the " + itemName + ". Gained " + value + " metal.");
                    break;

				default:
					log.w("Item not mapped for useItem: " + itemId);
					break;
			}
            
            GlobalSignals.inventoryChangedSignal.dispatch();
		},

		useItemFight: function (itemId) {
            log.i("use item fight: " + itemId);
            var fightComponent = this.fightNodes.head.fight;
            if (!fightComponent) {
                log.w("can't use item in fight, no fight in progress");
                return;
            }
			switch (itemId) {
				case "glowstick_1":
                    var stunTime = 2;
                    log.i("stun enemy for " + Math.round(stunTime * 100)/100 + "s")
					fightComponent.itemEffects.enemyStunnedSeconds = stunTime;
					break;
                case "consumable_weapon_1":
                    var damage = 20;
                    log.i("add " + damage + " extra damage to enemy");
                    fightComponent.itemEffects.damage = damage;
                    break;
                case "flee_1":
                    fightComponent.itemEffects.fled = true;
                    break;
				default:
					log.w("Item not mapped for useItemFight: " + itemId);
					break;
			}
            fightComponent.addItemUsed(itemId);
            log.i("used item added");
		},

		createBlueprint: function (upgradeId) {
			this.tribeUpgradesNodes.head.upgrades.createBlueprint(upgradeId);
            GlobalSignals.blueprintsChangedSignal.dispatch();
		},

		unlockUpgrade: function (upgradeId) {
			this.tribeUpgradesNodes.head.upgrades.useBlueprint(upgradeId);
            GlobalSignals.blueprintsChangedSignal.dispatch();
		},

		buyUpgrade: function (upgradeId, automatic) {
			if (automatic || GameGlobals.playerActionsHelper.checkAvailability(upgradeId, true)) {
				var upgradeDefinition = UpgradeConstants.upgradeDefinitions[upgradeId];
				GameGlobals.playerActionsHelper.deductCosts(upgradeId);
				this.addLogMessage(LogConstants.MSG_ID_BOUGHT_UPGRADE, "Researched " + upgradeDefinition.name);
				this.tribeUpgradesNodes.head.upgrades.addUpgrade(upgradeId);
				GlobalSignals.upgradeUnlockedSignal.dispatch(upgradeId);
				this.save();
                gtag('event', 'upgrade_bought', { event_category: 'progression', event_label: upgradeId });
			}
		},

		collectCollector: function (actionName, improvementName, amount) {
			var currentStorage = GameGlobals.resourcesHelper.getCurrentStorage();
			var bagComponent = this.playerPositionNodes.head.entity.get(BagComponent);

			var sector = this.playerLocationNodes.head.entity;
			var improvementsComponent = sector.get(SectorImprovementsComponent);
			var improvementVO = improvementsComponent.getVO(improvementNames[improvementName]);
			var resourcesVO = improvementVO.storedResources;

			var maxToCollect = Math.max(0, bagComponent.totalCapacity - bagComponent.usedCapacity);
            if (amount) {
                maxToCollect = Math.min(maxToCollect, amount);
            }
			var totalCollected = 0;
			for (var key in resourceNames) {
				var name = resourceNames[key];
				var improvementAmount = Math.floor(resourcesVO.getResource(name))
				if (improvementAmount >= 1) {
					var toCollect = Math.min(improvementAmount, maxToCollect - totalCollected);
					currentStorage.resources.addResource(name, toCollect);
					resourcesVO.addResource(name, -toCollect);
					totalCollected += toCollect;
				}
			}

			if (totalCollected < 1 && maxToCollect >= 1) {
				this.addLogMessage(LogConstants.MSG_ID_USE_COLLECTOR_FAIL, "Nothing to collect yet.");
			}

			GlobalSignals.inventoryChangedSignal.dispatch();
			GlobalSignals.collectorCollectedSignal.dispatch();
			this.forceResourceBarUpdate();
		},

		buildImprovement: function (actionName, improvementName, otherSector) {
			var sector = otherSector ? otherSector : this.playerLocationNodes.head.entity;
			var improvementsComponent = sector.get(SectorImprovementsComponent);
			improvementsComponent.add(improvementName);
			GlobalSignals.improvementBuiltSignal.dispatch();
			this.forceResourceBarUpdate();
			this.save();
		},
        
        improveImprovement: function (actionName) {
            var improvementName = GameGlobals.playerActionsHelper.getImprovementNameForAction(actionName);
			var sector = this.playerLocationNodes.head.entity;
			var improvementsComponent = sector.get(SectorImprovementsComponent);
			improvementsComponent.improve(improvementName);
			GlobalSignals.improvementBuiltSignal.dispatch();
			this.forceResourceBarUpdate();
			this.save();
        },

		assignWorkers: function (sector, assignment) {
			sector = sector || this.playerLocationNodes.head.entity;
			var camp = sector ? sector.get(CampComponent) : null;

			if (camp) {
                camp.assignedWorkers = {};
                for (var key in CampConstants.workerTypes) {
                    var val = assignment[key] || 0;
                    camp.assignedWorkers[key] = Math.max(0, Math.floor(val));
                }
				GlobalSignals.workersAssignedSignal.dispatch(sector);
			} else {
				log.w("No camp found for worker assignment.");
			}
		},

		launch: function () {
			GameGlobals.gameState.isFinished = true;
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
            var newName = newName.substring(0, 20);
			var campSector = this.nearestCampNodes.head.entity;
			if (campSector) {
				campSector.get(CampComponent).campName = newName;
				GlobalSignals.campRenamedSignal.dispatch();
				this.save();
			}
		},

		// TODO util function - move somewhere else
		passTime: function (seconds, callback) {
			this.engine.updateComplete.addOnce(function () {
				GameGlobals.gameState.passTime(seconds);
				GameGlobals.uiFunctions.onPlayerMoved(); // reset cooldowns for buttons
				this.engine.updateComplete.addOnce(function () {
					if (callback) callback();
				}, this);
			}, this);
		},
        
        // TODO find better fix for overlapping actions
        isSubAction: function (action) {
			var baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(action);
            switch (baseActionID) {
                case "fight": return true;
                case "use_item_fight": return true;
                default: return false;
            }
        },
        
        updateLastVisitedCamp: function (entity) {
			if (this.lastVisitedCamps.head) this.lastVisitedCamps.head.entity.remove(LastVisitedCampComponent);
			entity.add(new LastVisitedCampComponent());
            log.i("updateLastVisitedCamp: " + entity.get(PositionComponent))
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
			var system = this.engine.getSystem(UIOutTabBarSystem);
			system.updateTabVisibility();
		},

		save: function () {
			GlobalSignals.saveGameSignal.dispatch();
		},

	});

	return PlayerActionFunctions;
});
