// Functions to respond to player actions parsed by the UIFunctions
define(['ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/CampConstants',
	'game/constants/FollowerConstants',
	'game/constants/LogConstants',
	'game/constants/ImprovementConstants',
	'game/constants/PositionConstants',
	'game/constants/MovementConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/PlayerStatConstants',
	'game/constants/ItemConstants',
	'game/constants/PerkConstants',
	'game/constants/FightConstants',
	'game/constants/TradeConstants',
	'game/constants/TribeConstants',
	'game/constants/UIConstants',
	'game/constants/UpgradeConstants',
	'game/constants/TextConstants',
	'game/vos/PositionVO',
	'game/vos/LocaleVO',
	'game/vos/ResultVO',
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
	'game/components/sector/improvements/BeaconComponent',
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
	GameConstants, CampConstants, FollowerConstants, LogConstants, ImprovementConstants, PositionConstants, MovementConstants, PlayerActionConstants, PlayerStatConstants, ItemConstants, PerkConstants, FightConstants, TradeConstants, TribeConstants, UIConstants, UpgradeConstants, TextConstants,
	PositionVO, LocaleVO, ResultVO,
	PlayerPositionNode, FightNode, PlayerStatsNode, PlayerResourcesNode, PlayerLocationNode,
	NearestCampNode, LastVisitedCampNode, CampNode, TribeUpgradesNode,
	PositionComponent, ResourcesComponent,
	BagComponent, ExcursionComponent, ItemsComponent, DeityComponent, PlayerActionComponent, PlayerActionResultComponent,
	CampComponent, CurrencyComponent, LevelComponent, BeaconComponent, SectorImprovementsComponent, SectorCollectorsComponent, WorkshopComponent,
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
			
			if (action == "launch") {
				GameGlobals.gameState.isLaunchStarted = true;
			}
			
			GlobalSignals.actionStartingSignal.dispatch(action, param);
			var deductedCosts = GameGlobals.playerActionsHelper.deductCosts(action);

			var baseId = GameGlobals.playerActionsHelper.getBaseActionID(action);
			var duration = PlayerActionConstants.getDuration(baseId);
			if (duration > 0) {
				this.startBusy(action, param, deductedCosts);
			} else {
				this.performAction(action, param, deductedCosts);
			}
			GlobalSignals.actionStartedSignal.dispatch(action, param);
			return true;
		},

		startBusy: function (action, param, deductedCosts) {
			let baseId = GameGlobals.playerActionsHelper.getBaseActionID(action);
			let duration = PlayerActionConstants.getDuration(baseId);
			if (duration > 0) {
				var isBusy = PlayerActionConstants.isBusyAction(baseId);
				var endTimeStamp = this.playerStatsNodes.head.entity.get(PlayerActionComponent).addAction(action, duration, param, deductedCosts, isBusy);

				switch (baseId) {
					case "send_caravan":
						var tradePartnerOrdinal = parseInt(param);
						var caravansComponent = this.playerLocationNodes.head.entity.get(OutgoingCaravansComponent);
						if (!caravansComponent.pendingCaravan) {
							log.w("Can't start caravan. No valid pending caravan found.");
							return;
						}
						
						// TODO fix the time so it responds to time cheat
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

		performAction: function (action, param, deductedCosts) {
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
				case "build_out_luxury_outpost": this.buildLuxuryResourceOutpost(param); break;
				case "build_out_tradepost_connector": this.buildTradeConnector(param); break;
				case "build_out_sundome": this.buildSundome(param); break;
				case "build_out_spaceship1": this.buildSpaceShip1(param); break;
				case "build_out_spaceship2": this.buildSpaceShip2(param); break;
				case "build_out_spaceship3": this.buildSpaceShip3(param); break;
				case "improve_out": this.improveOutImprovement(param); break;
				// In improvements
				case "build_in_campfire": this.buildCampfire(param); break;
				case "build_in_house": this.buildHouse(param); break;
				case "build_in_house2": this.buildHouse2(param); break;
				case "build_in_storage": this.buildStorage(param); break;
				case "build_in_generator": this.buildGenerator(param); break;
				case "build_in_darkfarm": this.buildDarkFarm(param); break;
				case "build_in_hospital": this.buildHospital(param); break;
				case "build_in_inn": this.buildInn(param); break;
				case "build_in_tradepost": this.buildTradingPost(param); break;
				case "build_in_library": this.buildLibrary(param); break;
				case "build_in_market": this.buildMarket(param); break;
				case "build_in_fortification": this.buildFortification(param); break;
				case "build_in_aqueduct": this.buildAqueduct(param); break;
				case "build_in_stable": this.buildStable(param); break;
				case "build_in_barracks": this.buildBarracks(param); break;
				case "build_in_apothecary": this.buildApothecary(param); break;
				case "build_in_smithy": this.buildSmithy(param); break;
				case "build_in_cementmill": this.buildCementMill(param); break;
				case "build_in_robotFactory": this.buildRobotFactory(param); break;
				case "build_in_radiotower": this.buildRadioTower(param); break;
				case "build_in_lights": this.buildLights(param); break;
				case "build_in_square": this.buildSquare(param); break;
				case "build_in_garden": this.buildGarden(param); break;
				case "build_in_shrine": this.buildShrine(param); break;
				case "build_in_temple": this.buildTemple(param); break;
				case "build_in_researchcenter": this.buildResearchCenter(param); break;
				case "use_in_home": this.useHome(param); break;
				case "use_in_campfire": this.useCampfire(param); break;
				case "use_in_market": this.useMarket(param); break;
				case "use_in_hospital": this.useHospital(param); break;
				case "use_in_hospital_2": this.useHospital2(param); break;
				case "use_in_temple": this.useTemple(param); break;
				case "use_in_shrine": this.useShrine(param); break;
				case "improve_in": this.improveBuilding(param); break;
				case "repair_in": this.repairBuilding(param); break;
				case "dismantle_in": this.dismantleBuilding(param); break;
				// Item actions
				case "craft": this.craftItem(param); break;
				case "equip": this.equipItem(param); break;
				case "unequip": this.unequipItem(param); break;
				case "discard": this.discardItem(param); break;
				case "use_item": this.useItem(param, deductedCosts); break;
				case "use_item_fight": this.useItemFight(param); break;
				case "repair_item": this.repairItem(param); break;
				// Other actions
				case "enter_camp": this.enterCamp(param); break;
				case "scavenge": this.scavenge(param); break;
				case "investigate": this.investigate(param); break;
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
				case "recruit_follower": this.recruitFollower(param); break;
				case "dismiss_recruit": this.dismissRecruit(param); break;
				case "dismiss_follower": this.dismissFollower(param); break;
				case "select_follower": this.selectFollower(param); break;
				case "deselect_follower": this.deselectFollower(param); break;
				case "nap": this.nap(param); break;
				case "wait": this.wait(param); break;
				case "despair": this.despair(param); break;
				case "unlock_upgrade": this.unlockUpgrade(param); break;
				case "create_blueprint": this.createBlueprint(param); break;
				case "claim_milestone": this.claimMilestone(param); break;
				case "launch": this.launch(param); break;
				// Mapped directly in UIFunctions
				case "leave_camp": break;
				case "fight": break;
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
		},

		moveToCamp: function (param) {
			let campOrdinal = parseInt(param);
			let campSector = null;
			for (var node = this.campNodes.head; node; node = node.next) {
				let campPosition = node.position;
				let foundCampOrdinal = GameGlobals.gameState.getCampOrdinal(campPosition.level);
				if (foundCampOrdinal == campOrdinal) {
					campSector = node.entity;
					break;
				}
			}
			
			if (!campSector) {
				log.w("No camp found for campOrdinal " + campOrdinal);
				return;
			}

			var playerPos = this.playerPositionNodes.head.position;
			campPosition = campSector.get(PositionComponent);
			playerPos.level = campPosition.level;
			playerPos.sectorX = campPosition.sectorX;
			playerPos.sectorY = campPosition.sectorY;
			this.engine.getSystem(PlayerPositionSystem).update();
			this.enterCamp(true);
			GlobalSignals.playerMovedSignal.dispatch(playerPos);
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

		moveCurrencyFromBagToCamp: function (campSector) {
			var playerLevelCamp = this.nearestCampNodes.head !== null ? this.nearestCampNodes.head.entity : null;
			campSector = campSector || this.nearestCampNodes.head.entity;
			var playerCurrency = this.playerResourcesNodes.head.entity.get(CurrencyComponent);
			var campCurrency = campSector.get(CurrencyComponent);
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
			for (let i = 0; i < allItems.length; i++) {
				var item = allItems[i];
				if (item.equipped) {
					item.carried = true;
				} else if (item.type === ItemConstants.itemTypes.uniqueEquipment) {
					item.carried = true;
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
			
			itemsComponent.uniqueItems = null;
			itemsComponent.uniqueItemsCarried = null;
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
				GlobalSignals.playerLeftCampSignal.dispatch();
				GlobalSignals.playerMovedSignal.dispatch(playerPos);
				this.forceTabUpdate();
				this.save();
			} else {
				log.w("No valid camp found. (player pos: " + playerPos + ")");
			}
		},

		scavenge: function () {
			var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			var efficiency = GameGlobals.playerActionResultsHelper.getCurrentScavengeEfficiency();
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
			let sys = this;
			var successCallback = function () {
				let scavengedPercentBefore = sectorStatus.getScavengedPercent();
				sectorStatus.scavenged = true;
				sectorStatus.weightedNumScavenges += Math.min(1, efficiency);
				let scavengedPercentAfter = sectorStatus.getScavengedPercent();
				let warningThreshold = 75;
				if (scavengedPercentBefore < warningThreshold && scavengedPercentAfter >= warningThreshold) {
					sys.addLogMessage(LogConstants.getUniqueID(), "There isn't much left to scavenge here.");
				}
			};
			this.handleOutActionResults("scavenge", LogConstants.MSG_ID_SCAVENGE, logMsgSuccess, logMsgFlee, logMsgDefeat, true, false, successCallback);
		},

		investigate: function () {
			var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			var efficiency = GameGlobals.playerActionResultsHelper.getCurrentScavengeEfficiency();
			
			GameGlobals.gameState.unlockedFeatures.investigate = true;

			var logMsg = "Investigated the area. ";

			var logMsgSuccess = logMsg;
			var logMsgFlee = logMsg + "Fled empty-handed.";
			var logMsgDefeat = logMsg + "Got into a fight and was defeated.";
			let sys = this;
			var successCallback = function () {
				let investigatedPercentBefore = sectorStatus.getInvestigatedPercent();
				sectorStatus.investigated = true;
				sectorStatus.weightedNumInvestigates += Math.min(1, efficiency);
				let investigatedPercentAfter = sectorStatus.getInvestigatedPercent();
				let warningThreshold = 90;
				if (investigatedPercentBefore < warningThreshold && investigatedPercentAfter >= warningThreshold) {
					sys.addLogMessage(LogConstants.getUniqueID(), "There isn't much left to see here.");
				}
			};
			this.handleOutActionResults("investigate", LogConstants.MSG_ID_INVESTIGATE, logMsgSuccess, logMsgFlee, logMsgDefeat, true, false, successCallback);
		},

		scout: function () {
			var sector = this.playerLocationNodes.head.entity;
			var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			var featuresComponent = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			
			if (sectorStatus.scouted) {
				log.w("Sector already scouted.");
				return;
			}
			
			if (!GameGlobals.gameState.unlockedFeatures.evidence) {
				GameGlobals.gameState.unlockedFeatures.evidence = true;
				GlobalSignals.featureUnlockedSignal.dispatch();
			}

			if (!GameGlobals.gameState.unlockedFeatures.scout) {
				GameGlobals.gameState.unlockedFeatures.scout = true;
				GlobalSignals.featureUnlockedSignal.dispatch();
			}
			
			var level = sector.get(PositionComponent).level;

			var logMsg = "Scouted the area.";
			var found = false;
			var sunlit = featuresComponent.sunlit;
			if (featuresComponent.hasSpring) {
				found = true;
				logMsg += "<br/>Found " + Text.addArticle(TextConstants.getSpringName(featuresComponent)) + ".";
			}
			
			if (featuresComponent.hasTradeConnectorSpot && !GameGlobals.levelHelper.getFirstScoutedSectorWithFeatureOnLevel(level, "hasTradeConnectorSpot")) {
				found = true;
				logMsg += "<br/>Found a good place for a bigger building project.";
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

			let passagesComponent = this.playerLocationNodes.head.entity.get(PassagesComponent);
			if (passagesComponent.passageUp) {
				let passageUpBuilt = improvements.getCount(improvementNames.passageUpStairs) +
					improvements.getCount(improvementNames.passageUpElevator) +
					improvements.getCount(improvementNames.passageUpHole) > 0;
				found = true;
				logMsg += "<br/>" + TextConstants.getPassageFoundMessage(passagesComponent.passageUp, PositionConstants.DIRECTION_UP, sunlit, passageUpBuilt) + " ";
			}

			if (passagesComponent.passageDown) {
				let passageDownBuilt = improvements.getCount(improvementNames.passageDownStairs) +
					improvements.getCount(improvementNames.passageDownElevator) +
					improvements.getCount(improvementNames.passageDownHole) > 0;
				found = true;
				logMsg += "<br/>" + TextConstants.getPassageFoundMessage(passagesComponent.passageDown, PositionConstants.DIRECTION_DOWN, sunlit, passageDownBuilt) + " ";
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
			
			if (featuresComponent.waymarks.length > 0) {
				let sectorFeatures = GameGlobals.sectorHelper.getTextFeatures(sector);
				for (let i = 0; i < featuresComponent.waymarks.length; i++) {
					logMsg += "<br/>" + TextConstants.getWaymarkText(featuresComponent.waymarks[i], sectorFeatures);
				}
			}

			var playerActionFunctions = this;
			var successCallback = function () {
				sectorStatus.scouted = true;
				sectorStatus.scoutedTimestamp = new Date().getTime() / 1000;
				GlobalSignals.sectorScoutedSignal.dispatch();
				playerActionFunctions.completeAction("scout");
				playerActionFunctions.engine.getSystem(UIOutLevelSystem).rebuildVis();
				playerActionFunctions.save();
			};
			

			var logMsgId = found ? LogConstants.MSG_ID_SCOUT_FOUND_SOMETHING : LogConstants.MSG_ID_SCOUT;
			this.handleOutActionResults("scout", logMsgId, logMsg, logMsg, logMsg, true, found, successCallback);
		},

		scoutLocale: function (i) {
			if (!this.playerLocationNodes.head) return;
			
			let sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			let sectorLocalesComponent = this.playerLocationNodes.head.entity.get(SectorLocalesComponent);
			let sectorFeaturesComponent = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			let localeVO = sectorLocalesComponent.locales[i];
			if (!localeVO) {
				log.w("no such locale " + i + "/" + sectorLocalesComponent.locales.length);
				return;
			}
			
			let action = "scout_locale_" + localeVO.getCategory() + "_" + i;

			// TODO add more interesting log messages - especially for trade partners
			let localeName = TextConstants.getLocaleName(localeVO, sectorFeaturesComponent);
			localeName = localeName.split(" ")[localeName.split(" ").length - 1];
			let baseMsg = "Scouted the " + localeName + ". ";
			let logMsgSuccess = baseMsg;
			let logMsgFlee = baseMsg + " Got surprised and fled.";
			let logMsgDefeat = baseMsg + " Got surprised and beaten.";
			
			let tradingPartner = null;
			if (localeVO.type === localeTypes.tradingpartner) {
				let playerPos = this.playerPositionNodes.head.position;
				let level = playerPos.level;
				let campOrdinal = GameGlobals.gameState.getCampOrdinal(level);
				if (GameGlobals.gameState.foundTradingPartners.indexOf(campOrdinal) < 0) {
					var partner = TradeConstants.getTradePartner(campOrdinal);
					if (partner) {
						var partnerName = partner.name;
						logMsgSuccess += "<br/>Found a new <span class='hl-functionality'>trading partner</span>. They call this place " + partnerName + ".";
						tradingPartner = campOrdinal;
					}
				}
			}
			
			if (localeVO.type == localeTypes.grove) {
				GameGlobals.gameState.unlockedFeatures.favour = true;
				GlobalSignals.featureUnlockedSignal.dispatch();
				if (!this.playerStatsNodes.head.entity.has(DeityComponent)) {
					this.playerStatsNodes.head.entity.add(new DeityComponent())
				}
				
				let perksComponent = this.playerStatsNodes.head.perks;
				if (!perksComponent.hasPerk(PerkConstants.perkIds.blessed)) {
					perksComponent.addPerk(PerkConstants.getPerk(PerkConstants.perkIds.blessed));
				}
				this.playerStatsNodes.head.stamina.stamina += PlayerStatConstants.STAMINA_GAINED_FROM_GROVE;
				logMsgSuccess += "The trees seem alive. They whisper, but the words are unintelligible. You have found a source of <span class='hl-functionality'>ancient power</span>.";
			}
			
			let luxuryResource = localeVO.luxuryResource;
			if (luxuryResource) {
				logMsgSuccess += "<br/>Found a source of <span class='hl-functionality'>" + TribeConstants.getLuxuryDisplayName(luxuryResource) + "</span>. ";
				logMsgSuccess += "There will be a now project available in camp.";
			}

			let playerActionFunctions = this;
			let successCallback = function () {
				sectorStatus.localesScouted[i] = true;
				
				if (tradingPartner) {
					GameGlobals.gameState.foundTradingPartners.push(tradingPartner);
					if (!GameGlobals.gameState.unlockedFeatures.trade) {
						GameGlobals.gameState.unlockedFeatures.trade = true;
						GlobalSignals.featureUnlockedSignal.dispatch();
					}
				}
				
				if (luxuryResource) {
					if (GameGlobals.gameState.foundLuxuryResources.indexOf(luxuryResource) < 0) {
						GameGlobals.gameState.foundLuxuryResources.push(luxuryResource);
					}
				}
				
				playerActionFunctions.engine.getSystem(UIOutLevelSystem).rebuildVis();
				playerActionFunctions.save();
			};

			let hasCustomReward = tradingPartner != null || luxuryResource != null;
			this.handleOutActionResults(action, LogConstants.MSG_ID_SCOUT_LOCALE, logMsgSuccess, logMsgFlee, logMsgDefeat, true, hasCustomReward, successCallback);
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
			let playerPosition = this.playerPositionNodes.head.position;
			let workshopComponent = this.playerLocationNodes.head.entity.get(WorkshopComponent);
			
			let currentLevel = playerPosition.level;
			let campOrdinal = GameGlobals.gameState.getCampOrdinal(currentLevel);
			let campLevel = GameGlobals.gameState.getLevelForCamp(campOrdinal);
			
			let name = TextConstants.getWorkshopName(workshopComponent.resource);
			let action = "clear_workshop";
			let logMsgSuccess = "Workshop cleared. Workers can now use it.";
			let logMsgFlee = "Fled the " + name + ".";
			let logMsgDefeat = "Got driven out of the " + name + ".";

			if (campLevel != currentLevel) {
				logMsgSuccess = "Workshop cleared. Workers on level " + campLevel + " can now use it.";
			}

			let playerActionFunctions = this;
			let successCallback = function () {
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
			
			if (!blocker) {
				log.w("can't clear waste - no blocker here");
				return;
			}

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
			this.clearBlocker("bridge_gap", MovementConstants.BLOCKER_TYPE_GAP, sectorPos);
			this.addLogMessage(LogConstants.MSG_ID_BRIDGED_GAP, "Built a bridge.");
		},
		
		clearDebris: function (sectorPos) {
			let position = this.getPositionVO(sectorPos);
			this.clearBlocker("clear_debris", MovementConstants.BLOCKER_TYPE_DEBRIS, sectorPos);
			this.addLogMessage(LogConstants.MSG_ID_CLEAR_DEBRIS, "Debris cleared at " + position.getInGameFormat(false));
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
							var logMsgSuccess = "Found a bench to sleep on. Barely feel rested.";
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
		
		wait: function () {
			var sys = this;
			GameGlobals.uiFunctions.setGameElementsVisibility(false);
			GameGlobals.uiFunctions.showInfoPopup(
				"Wait",
				"Passed some time just waiting.",
				"Continue",
				null,
				() => {
					GameGlobals.uiFunctions.hideGame(false);
					this.passTime(60, function () {
						setTimeout(function () {
							GameGlobals.uiFunctions.showGame();
							GameGlobals.uiFunctions.onPlayerMoved(); // reset cooldowns
							var logMsgSuccess = "Waited some time.";
							var logMsgFlee = "Settled down to pass some time but got attacked.";
							var logMsgDefeat = logMsgFlee;
							sys.handleOutActionResults("wait", LogConstants.MSG_ID_WAIT, logMsgSuccess, logMsgFlee, logMsgDefeat, false, false,
								function () {},
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
				if (!GameGlobals.gameState.isAutoPlaying) player.add(new PlayerActionResultComponent(rewards));
				
				if (rewards && rewards.foundStashVO) {
					sectorStatus.stashesFound++;
					logMsgSuccess += TextConstants.getFoundStashMessage(rewards.foundStashVO);
				}
				
				var discoveredGoods = GameGlobals.playerActionResultsHelper.saveDiscoveredGoods(rewards);
				if (discoveredGoods.items && discoveredGoods.items.length > 0) {
					logMsgSuccess += " Found a source of " + TextConstants.getListText(discoveredGoods.items.map(item => ItemConstants.getItemDisplayName(item).toLowerCase())) + ".";
				}
				
				let popupMsg = logMsgSuccess;
				
				var resultPopupCallback = function (isTakeAll) {
					GameGlobals.playerActionResultsHelper.collectRewards(isTakeAll, rewards);
					if (!GameGlobals.gameState.isAutoPlaying && logMsgSuccess) playerActionFunctions.addLogMessage(logMsgId, logMsgSuccess);
					GameGlobals.playerActionResultsHelper.logResults(rewards);
					playerActionFunctions.forceTabUpdate();
					player.remove(PlayerActionResultComponent);
					if (successCallback) successCallback();
					GlobalSignals.inventoryChangedSignal.dispatch();
					GlobalSignals.sectorScavengedSignal.dispatch();
					playerActionFunctions.completeAction(action);
				};
				
				GameGlobals.playerActionResultsHelper.preCollectRewards(rewards);
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
				for (let i in campOutgoingCaravansComponent.outgoingCaravans) {
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
			
			let result = TradeConstants.makeResultVO(caravan);
			var logMsg = GameGlobals.playerActionResultsHelper.getRewardsMessage(result, "A trade caravan returns from " + tradePartner.name + ". ");
			var pendingPosition = campSector.get(PositionComponent).clone();
			pendingPosition.inCamp = true;

			campOutgoingCaravansComponent.outgoingCaravans.splice(caravanI, 1);

			GameGlobals.playerActionResultsHelper.collectRewards(true, result, campSector);
			this.moveCurrencyFromBagToCamp(campSector);
			this.completeAction("send_caravan");

			this.addLogMessage(LogConstants.MSG_ID_FINISH_SEND_CAMP, logMsg.msg, logMsg.replacements, logMsg.values, pendingPosition);
			GlobalSignals.inventoryChangedSignal.dispatch();
		},

		tradeWithCaravan: function () {
			GameGlobals.uiFunctions.popupManager.closePopup("incoming-caravan-popup");

			var traderComponent = this.playerLocationNodes.head.entity.get(TraderComponent);
			var caravan = traderComponent.caravan;

			// items
			var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
			for (var itemID in caravan.traderSelectedItems) {
				var amount = caravan.traderSelectedItems[itemID];
				for (let i = 0; i < amount; i++) {
					for (let j = 0; j < caravan.sellItems.length; j++) {
						if (caravan.sellItems[j].id == itemID) {
							caravan.sellItems.splice(j, 1);
							break;
						}
					}
					GameGlobals.playerHelper.addItem(ItemConstants.getItemByID(itemID));
				}
			}

			for (var itemID in caravan.campSelectedItems) {
				var amount = caravan.campSelectedItems[itemID];
				for (let i = 0; i < amount; i++) {
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
		
		recruitFollower: function (followerId) {
			let recruitComponent = GameGlobals.campHelper.findRecruitComponentWithFollowerId(followerId);
			
			if (!recruitComponent) {
				log.w("no recruit found: " + followerId);
				return;
			}
			
			this.playerStatsNodes.head.followers.addFollower(recruitComponent.follower);
			recruitComponent.isRecruited = true;
			
			GameGlobals.gameState.unlockedFeatures.followers = true;
			GlobalSignals.followersChangedSignal.dispatch();
			
			this.addLogMessage(LogConstants.MSG_ID_RECRUIT, "Recruited a new follower.");
		},
		
		dismissRecruit: function (followerId) {
			log.i("dismiss recruit: " + followerId);
			let recruitComponent = GameGlobals.campHelper.findRecruitComponentWithFollowerId(followerId);
			
			if (!recruitComponent) {
				log.w("no recruit found: " + followerId);
				return;
			}
			
			recruitComponent.isDismissed = true;
		},
		
		dismissFollower: function (followerID) {
			let followersComponent = this.playerStatsNodes.head.followers;
			let follower = followersComponent.getFollowerByID(followerID);
			
			if (!follower) {
				log.w("no such follower: " + followerID);
				return;
			}
			
			let sys = this;
			GameGlobals.uiFunctions.showConfirmation(
				"Are you sure you want to dismiss " + follower.name + "?",
				function () {
					followersComponent.removeFollower(follower);
					sys.addLogMessage(LogConstants.getUniqueID(), follower.name + " leaves.");
					GlobalSignals.followersChangedSignal.dispatch();
				}
			);
		},
		
		selectFollower: function (followerID) {
			let followersComponent = this.playerStatsNodes.head.followers;
			let follower = followersComponent.getFollowerByID(followerID);
			
			if (follower.inParty) {
				log.w("follower already in party");
				return;
			}
			
			if (!follower) {
				log.w("no such follower: " + followerID);
				return;
			}
			
			let followerType = FollowerConstants.getFollowerTypeForAbilityType(follower.abilityType);
			let previous = followersComponent.getFollowerInPartyByType(followerType);
			if (previous) {
				followersComponent.setFollowerInParty(previous, false);
			}
			
			followersComponent.setFollowerInParty(follower, true);
			
			GlobalSignals.followersChangedSignal.dispatch();
		},
		
		deselectFollower: function (followerID) {
			let followersComponent = this.playerStatsNodes.head.followers;
			let follower = followersComponent.getFollowerByID(followerID);
			
			if (!follower) {
				log.w("no such follower: " + followerID);
				return;
			}
			
			if (!follower.inParty) {
				log.w("can't deselect follower that is not in party");
				return;
			}
			
			followersComponent.setFollowerInParty(follower, false);
			GlobalSignals.followersChangedSignal.dispatch();
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
			this.engine.getSystem(FaintingSystem).despair();
			this.completeAction("despair");
		},

		buildCamp: function () {
			var sector = this.playerLocationNodes.head.entity;
			var level = GameGlobals.levelHelper.getLevelEntityForSector(sector);
			var position = sector.get(PositionComponent).getPosition();
			var campOrdinal = GameGlobals.gameState.getCampOrdinal(position.level);
			if (GameGlobals.gameFlowLogger.isEnabled) log.i("Build camp " + position + " ordinal " + campOrdinal);
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
			gtag('event', 'build_camp', { event_category: 'progression', event_label: campOrdinal });
			gtag('event', 'build_camp_time', { event_category: 'game_time', event_label: campOrdinal, value: GameGlobals.gameState.playTime });

			this.addLogMessage(LogConstants.MSG_ID_BUILT_CAMP, "Built a camp.");
			if (level.get(LevelComponent).populationFactor < 1) {
				this.addLogMessage(LogConstants.MSG_ID_BUILT_CAMP_LEVEL_POPULATION, "There are few signs of human life on this level.");
			}
			if (position.level == 15) {
				this.addLogMessage(LogConstants.getUniqueID(), "It will be difficult to trade resources with camps from below Level 14 from here.");
			}
			
			GlobalSignals.improvementBuiltSignal.dispatch();
			GlobalSignals.campBuiltSignal.dispatch();
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
			let action = "build_out_greenhouse";
			let position = this.getPositionVO(sectorPos);
			let sector = this.getActionSector(action, sectorPos);
			this.buildImprovement(action, improvementNames.greenhouse, sector);
			GameGlobals.gameState.unlockedFeatures.resources.herbs = true;
			this.addLogMessage(LogConstants.getUniqueID(), "Greenhouse is ready.");
		},
		
		buildLuxuryResourceOutpost: function (sectorPos) {
			let action = "build_out_luxury_outpost";
			let position = this.getPositionVO(sectorPos);
			let sector = this.getActionSector(action, sectorPos);
			let resource = GameGlobals.levelHelper.getLuxuryResourceOnLevel(position.level);
			if (!resource) {
				log.w("trying to build a luxury resource outpost but there is no resource");
				return;
			}
			let resourceName = TribeConstants.getLuxuryDisplayName(resource);
			this.buildImprovement(action, improvementNames.luxuryOutpost, sector);
			this.addLogMessage(LogConstants.getUniqueID(), "Resource outpost is ready. " + Text.capitalize(resourceName) + " is now available in all camps.");
		},
		
		buildTradeConnector: function (sectorPos) {
			var action = "build_out_tradepost_connector";
			var position = this.getPositionVO(sectorPos);
			var sector = this.getActionSector(action, sectorPos);
			this.buildImprovement(action, improvementNames.tradepost_connector, sector);
			this.addLogMessage(LogConstants.getUniqueID(), "Great Elevator is ready.");
		},
		
		buildSundome: function (sectorPos) {
			var action = "build_out_sundome";
			var position = this.getPositionVO(sectorPos);
			var sector = this.getActionSector(action, sectorPos);
			this.buildImprovement(action, improvementNames.sundome, sector);
			this.addLogMessage(LogConstants.getUniqueID(), "Sundome is completed.");
		},
		
		improveOutImprovement: function (param) {
			let improvementID = param;
			let actionName = "improve_out_" + improvementID;
			let improvementName = improvementNames[improvementID];
			this.improveImprovement(actionName, improvementName);
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
		},
		
		buildBeacon: function () {
			this.buildImprovement("build_out_beacon", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_out_beacon"));
			
			let sector = this.playerLocationNodes.head.entity;
			sector.add(new BeaconComponent());
			
			this.addLogMessage(LogConstants.MSG_ID_BUILT_BEACON, "Beacon is ready.");
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

		buildStorage: function (sector) {
			this.buildImprovement("build_in_storage", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_storage"), sector);
			this.addLogMessage(LogConstants.MSG_ID_BUILT_STORAGE, "Built a storage.");
		},

		buildFortification: function () {
			this.buildImprovement("build_in_fortification", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_fortification"));
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

		buildRobotFactory: function () {
			this.buildImprovement("build_in_robotFactory", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_robotFactory"));
			this.addLogMessage(LogConstants.getUniqueID(), "Built a factory for robots.");
		},

		buildRadioTower: function () {
			this.buildImprovement("build_in_radiotower", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_radiotower"));
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
			GameGlobals.gameState.unlockedFeatures.followers = true;
			this.addLogMessage(LogConstants.MSG_ID_BUILT_INN, "Built an inn. Maybe it will attract visitors.");
		},

		buildSquare: function () {
			this.buildImprovement("build_in_square", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_square"));
			this.addLogMessage(LogConstants.MSG_ID_BUILT_SQUARE, "Built a square. The camp feels more like a town within the City already.");
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
		
		buildResearchCenter: function () {
			this.buildImprovement("build_in_researchcenter", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_researchcenter"));
			this.addLogMessage(LogConstants.getUniqueID(), "Built a research center.");
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
				var msg = "Colony construction project ready at " + sectorPosVO.getInGameFormat(playerPos.level === sectorPosVO.level);
				this.buildImprovement(action, GameGlobals.playerActionsHelper.getImprovementNameForAction(action), sector);
				this.addLogMessage(LogConstants.MSG_ID_BUILT_SPACESHIP, msg);
				if (GameGlobals.endingHelper.isReadyForLaunch()) {
					this.addLogMessage(LogConstants.getUniqueID(), "The colony ship is ready to launch.");
				}
			} else {
				log.w("Couldn't find sectors for building space ship.");
				log.i(sector);
				log.i(sectorPos);
			}
		},
		
		improveBuilding: function (param) {
			let actionName = "improve_in_" + param;
			let improvementID = param;
			var improvementName = GameGlobals.playerActionsHelper.getImprovementNameForAction(actionName);
			
			this.improveImprovement(actionName, improvementName);
		},
		
		improveImprovement: function (actionName, improvementName) {
			var sector = this.playerLocationNodes.head.entity;
			var improvementsComponent = sector.get(SectorImprovementsComponent);
			let improvementID = ImprovementConstants.getImprovementID(improvementName);
			improvementsComponent.improve(improvementName);
			let level = improvementsComponent.getLevel(improvementName);
			GlobalSignals.improvementBuiltSignal.dispatch();
			this.save();
			
			this.addLogMessage("MSG_ID_IMPROVE_" + improvementName, ImprovementConstants.getImprovedLogMessage(improvementID, level));
		},
		
		repairBuilding: function (param) {
			let improvementID = param;
			let improvementName = improvementNames[improvementID];
			let sector = this.playerLocationNodes.head.entity;
			let improvementsComponent = sector.get(SectorImprovementsComponent);
			
			let vo = improvementsComponent.getVO(improvementName);
			vo.numDamaged--;
			
			let displayName = ImprovementConstants.getImprovementDisplayName(improvementID, vo.level);
			
			GlobalSignals.improvementBuiltSignal.dispatch();
			this.save();
			this.addLogMessage("MSG_ID_REPAIR_" + improvementName, "Repaired " + Text.addArticle(displayName));
		},

		dismantleBuilding: function (param) {
			let sector = this.playerLocationNodes.head.entity;
			let improvementsComponent = sector.get(SectorImprovementsComponent);
			let improvementID = param;
			let improvementName = improvementNames[improvementID];
			let level = improvementsComponent.getLevel(improvementName);
			let displayName = ImprovementConstants.getImprovementDisplayName(improvementID, level);
			let def = ImprovementConstants.improvements[improvementID];
			
			if (!def.canBeDismantled) return;
			
			let buildAction = "build_in_" + improvementID;
			let buildingCosts = GameGlobals.playerActionsHelper.getCosts(buildAction);
			
			let msg = "Are you sure you want to dismantle this building? Only some of its building materials can be salvaged";
			let sys = this;
			
			GameGlobals.uiFunctions.showConfirmation(msg, function () {
				improvementsComponent.remove(improvementName);
				
				let campStorage = GameGlobals.resourcesHelper.getCurrentStorage();
				for (let key in buildingCosts) {
					let resource = key.split("_")[1]
					campStorage.resources.addResource(resource, buildingCosts[key]);
				}
				
				GlobalSignals.improvementBuiltSignal.dispatch();
				sys.save();
				
				sys.addLogMessage("MSG_ID_DISMANTLE_" + improvementName, "Dismantled " + Text.addArticle(displayName));
			});
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
				perksComponent.addPerk(PerkConstants.getPerk(PerkConstants.perkIds.staminaBonusPenalty, PerkConstants.TIMER_DISABLED, 300));
				this.playerStatsNodes.head.stamina.isPendingPenalty = false;
			}
			
			this.completeAction("use_in_home");
			this.forceStatsBarUpdate();
		},

		useCampfire: function () {
			var campSector = this.nearestCampNodes.head.entity;
			var campComponent = campSector.get(CampComponent);
			var improvementsComponent = campSector.get(SectorImprovementsComponent);
			// TODO move this check to startAction
			if (campSector) {
				if (campComponent.rumourpool >= 1) {
					campComponent.rumourpool--;
					var campfireLevel = improvementsComponent.getLevel(improvementNames.campfire);
					this.playerStatsNodes.head.rumours.value += GameGlobals.campBalancingHelper.getRumoursPerVisitCampfire(campfireLevel);
					this.addLogMessage(LogConstants.MSG_ID_USE_CAMPFIRE_SUCC, "Sat at the campfire to exchange stories about the corridors.");
				} else {
					this.addLogMessage(LogConstants.MSG_ID_USE_CAMPFIRE_FAIL, "Sat at the campfire to exchange stories, but there was nothing new.");
					campComponent.rumourpoolchecked = true;
				}
			} else {
				log.w("No camp sector found.");
			}
			this.completeAction("use_in_campfire");
			
			GlobalSignals.tribeStatsChangedSignal.dispatch();
		},
		
		useMarket: function () {
			var campSector = this.nearestCampNodes.head.entity;
			var campComponent = campSector.get(CampComponent);
			var improvementsComponent = campSector.get(SectorImprovementsComponent);
			// TODO move this check to startAction
			if (campSector) {
				var marketLevel = improvementsComponent.getLevel(improvementNames.market);
				this.playerStatsNodes.head.rumours.value += GameGlobals.campBalancingHelper.getRumoursPerVisitMarket(marketLevel);
				this.addLogMessage(LogConstants.MSG_ID_USE_MARKET, "Visited the market and listened to the latest gossip.");
			} else {
				log.w("No camp sector found.");
			}
			this.completeAction("use_in_market");
		},

		useHospital: function () {
			var perksComponent = this.playerStatsNodes.head.perks;
			perksComponent.removePerksByType(PerkConstants.perkTypes.injury);

			let maxStamina = PlayerStatConstants.getMaxStamina(perksComponent);
			this.playerStatsNodes.head.stamina.stamina = maxStamina;
			this.addLogMessage(LogConstants.MSG_ID_USE_HOSPITAL, "Healed all injuries.");

			this.completeAction("use_in_hospital");
			GameGlobals.gameState.unlockedFeatures.fight = true;
		},

		useHospital2: function () {
			var perksComponent = this.playerStatsNodes.head.perks;
			if (perksComponent.hasPerk(PerkConstants.perkIds.healthBonus2)) {
				perksComponent.removePerkById(PerkConstants.perkIds.healthBonus2);
				perksComponent.addPerk(PerkConstants.getPerk(PerkConstants.perkIds.healthBonus3));
			} else {
				perksComponent.addPerk(PerkConstants.getPerk(PerkConstants.perkIds.healthBonus2));
			}
			this.addLogMessage(LogConstants.MSG_ID_USE_HOSPITAL2, "Improved health.");
			this.completeAction("use_in_hospital_2");
		},

		useTemple: function () {
			this.playerStatsNodes.head.entity.get(DeityComponent).favour += CampConstants.FAVOUR_PER_DONATION;
			this.completeAction("use_in_temple");
			this.addLogMessage(LogConstants.MSG_ID_USE_TEMPLE, "Donated to the temple.");
			GlobalSignals.inventoryChangedSignal.dispatch();
			this.forceStatsBarUpdate();
		},

		useShrine: function () {
			let deityComponent = this.playerStatsNodes.head.entity.get(DeityComponent);
			if (!deityComponent) return;
			let campSector = this.nearestCampNodes.head.entity;
			let improvementsComponent = campSector.get(SectorImprovementsComponent);
			
			if (campSector) {
				let shrineLevel = improvementsComponent.getLevel(improvementNames.shrine);
				let successChance = GameGlobals.campBalancingHelper.getMeditationSuccessRate(shrineLevel);
				log.i("meditation success chance: " + successChance)
				if (Math.random() < successChance) {
					deityComponent.favour += 1;
					this.addLogMessage(LogConstants.MSG_ID_USE_SHRINE, "Spent some time listening to the spirits.");
				} else {
					this.addLogMessage(LogConstants.MSG_ID_USE_SHRINE, "Tried to meditate, but found no peace.");
				}
			}
			
			this.completeAction("use_in_shrine");
			this.forceStatsBarUpdate();
		},

		craftItem: function (itemId) {
			var actionName = "craft_" + itemId;
			var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
			var item = GameGlobals.playerActionsHelper.getItemForCraftAction(actionName);
			GameGlobals.playerHelper.addItem(item);

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
			GlobalSignals.inventoryChangedSignal.dispatch();
			this.save();
		},

		equipItem: function (itemInstanceId) {
			var playerPos = this.playerPositionNodes.head.position;
			var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
			var item = itemsComponent.getItem(null, itemInstanceId, playerPos.inCamp, false);
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
		
		repairItem: function (itemInstanceId) {
			let itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
			let itemVO = itemsComponent.getItem(null, itemInstanceId, true, true);
			if (!itemVO) return;
			itemVO.broken = false;
			GlobalSignals.equipmentChangedSignal.dispatch();
			GlobalSignals.inventoryChangedSignal.dispatch();
		},

		useItem: function (itemId, deductedCosts) {
			var actionName = "use_item_" + itemId;
			var sys = this;
			
			var reqs = GameGlobals.playerActionsHelper.getReqs(actionName);
			var playerPos =  this.playerPositionNodes.head.position;
			var perksComponent = this.playerStatsNodes.head.perks;
			
			var item = deductedCosts.items[0];
			if (!item) {
				log.w("trying to use item but none found in deductedCosts");
			}
			var foundPosition = item.foundPosition || playerPos;
			var foundPositionCampOrdinal = GameGlobals.gameState.getCampOrdinal(foundPosition.level);
			
			let itemConfig = ItemConstants.getItemConfigByID(itemId);
			let baseItemId = ItemConstants.getBaseItemId(itemId);
			
			switch (baseItemId) {
				case "first_aid_kit":
					var injuries = perksComponent.getPerksByType(PerkConstants.perkTypes.injury);
					var minValue = reqs.perkEffects.Injury[0];
					var injuryToHeal = null;
					for (let i = 0; i < injuries.length; i++) {
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
				
				case "stamina_potion":
					perksComponent.addPerk(PerkConstants.getPerk(PerkConstants.perkIds.staminaBonus));
					this.engine.updateComplete.addOnce(function () {
						sys.addLogMessage(LogConstants.MSG_ID_USE_STAMINA_POTION, "Feeling stronger and more awake.");
						sys.playerStatsNodes.head.stamina.stamina += PlayerStatConstants.STAMINA_GAINED_FROM_POTION_1;
						sys.engine.updateComplete.addOnce(function () {
							sys.forceStatsBarUpdate();
						});
					});
					break;

				case "glowstick":
					var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
					sectorStatus.glowStickSeconds = 120;
					break;
					
				case "cache_metal":
					let baseValue = itemConfig.configData.metalValue || 10;
					let value = baseValue + Math.round(Math.random() * 10);
					let itemNameParts = item.name.split(" ");
					let itemName = itemNameParts[itemNameParts.length - 1];
					let currentStorage = GameGlobals.resourcesHelper.getCurrentStorage();
					currentStorage.resources.addResource(resourceNames.metal, value);
					this.addLogMessage(LogConstants.MSG_ID_USE_METAL_CACHE, "Took apart the " + itemName + ". Gained " + value + " metal.");
					break;
					
				case "cache_evidence":
					let evidence = itemConfig.configData.evidenceValue || Math.pow(itemConfig.level, 2);
					let message = TextConstants.getReadBookMessage(item, itemConfig.configData.bookType || ItemConstants.bookTypes.science, foundPositionCampOrdinal);
					let resultVO = new ResultVO("use_item");
					resultVO.gainedEvidence = evidence;
					GameGlobals.uiFunctions.showInfoPopup(
						item.name,
						message,
						"Continue",
						resultVO
					);
					this.playerStatsNodes.head.evidence.value += evidence;
					this.addLogMessage(LogConstants.MSG_ID_USE_BOOK, "Read a book. Gained " + evidence + " evidence.");
					break;
				
				case "consumable_graffiti":
					var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
					GameGlobals.uiFunctions.showInput("Graffiti", "Choose message to leave to this sector.", "", false,
						function (input) {
							sectorStatus.graffiti = input;
							sys.addLogMessage(LogConstants.getUniqueID(), "Left a message on a wall.");
						});
					break;
					
				case "consumable_map":
					// TODO score and prefer unvisited sectors
					var radius = 3;
					var centerSectors = GameGlobals.levelHelper.getSectorsAround(foundPosition, 2);
					var centerSector = centerSectors[Math.floor(Math.random() * centerSectors.length)];
					var centerPosition = centerSector.get(PositionComponent);
					var sectorsToReveal = GameGlobals.levelHelper.getSectorsAround(centerPosition, radius);
					
					var revealedSomething = false;
					for (var i = 0; i < sectorsToReveal.length; i++) {
						var statusComponent = sectorsToReveal[i].get(SectorStatusComponent);
						if (statusComponent.scouted) continue;
						statusComponent.revealedByMap = true;
						revealedSomething = true;
					}
					
					log.i("reveal map around " + centerPosition + " radius " + radius);
					
					if (revealedSomething) {
						this.addLogMessage(LogConstants.MSG_ID_USE_MAP_PIECE, "Recorded any useful information from the map.");
					} else {
						this.addLogMessage(LogConstants.MSG_ID_USE_MAP_PIECE, "Checked the map, but there was nothing interesting there.");
					}
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
			var enemy = fightComponent.enemy;
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
				case "consumable_weapon_bio":
					if (!fightComponent.enemy.isMechanical()) {
						var stunTime = 3;
						log.i("stun enemy for " + Math.round(stunTime * 100)/100 + "s")
						fightComponent.itemEffects.enemyStunnedSeconds = stunTime;
					}
					break;
				case "consumable_weapon_mechanical":
					if (fightComponent.enemy.isMechanical()) {
						var stunTime = 3;
						log.i("stun enemy for " + Math.round(stunTime * 100)/100 + "s")
						fightComponent.itemEffects.enemyStunnedSeconds = stunTime;
					}
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

		createBlueprint: function (upgradeID) {
			this.tribeUpgradesNodes.head.upgrades.createBlueprint(upgradeID);
			GlobalSignals.blueprintsChangedSignal.dispatch();
		},

		unlockUpgrade: function (upgradeID) {
			this.tribeUpgradesNodes.head.upgrades.useBlueprint(upgradeID);
			GlobalSignals.blueprintsChangedSignal.dispatch();
		},

		buyUpgrade: function (upgradeID, automatic) {
			if (automatic || GameGlobals.playerActionsHelper.checkAvailability(upgradeID, true)) {
				var upgradeDefinition = UpgradeConstants.upgradeDefinitions[upgradeID];
				GameGlobals.playerActionsHelper.deductCosts(upgradeID);
				this.addLogMessage(LogConstants.MSG_ID_BOUGHT_UPGRADE, "Researched " + upgradeDefinition.name);
				this.tribeUpgradesNodes.head.upgrades.addUpgrade(upgradeID);
				GlobalSignals.upgradeUnlockedSignal.dispatch(upgradeID);
				this.save();
				gtag('event', 'upgrade_bought', { event_category: 'progression', event_label: upgradeID });
			}
		},

		claimMilestone: function (index) {
			index = parseInt(index);
			let currentIndex = GameGlobals.gameState.numUnlockedMilestones;
			let nextIndex = currentIndex + 1;
			if (index != nextIndex) {
				log.w("trying to claim wrong milestone index (" + index + "), currently claimed: " + currentIndex);
				return;
			}
			
			let milestone = TribeConstants.getMilestone(nextIndex);
			this.unlockFeatures(milestone.unlockedFeatures);
			
			GameGlobals.gameState.numUnlockedMilestones = index;
			GlobalSignals.milestoneUnlockedSignal.dispatch();
		},

		collectCollector: function (actionName, improvementName, amount) {
			var currentStorage = GameGlobals.resourcesHelper.getCurrentStorage();
			var bagComponent = this.playerPositionNodes.head.entity.get(BagComponent);

			var sector = this.playerLocationNodes.head.entity;
			var improvementsComponent = sector.get(SectorImprovementsComponent);
			var improvementVO = improvementsComponent.getVO(improvementNames[improvementName]);
			if (improvementVO == null) return;
			
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
		},

		buildImprovement: function (actionName, improvementName, otherSector) {
			var sector = otherSector ? otherSector : this.playerLocationNodes.head.entity;
			var improvementsComponent = sector.get(SectorImprovementsComponent);
			improvementsComponent.add(improvementName);
			GlobalSignals.improvementBuiltSignal.dispatch();
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
			this.addLogMessage(LogConstants.getUniqueID(), "The colony ship launches.");
			
			GameGlobals.gameState.isLaunched = true;
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
		
		unlockFeatures: function (featureIDs) {
			if (!featureIDs) return;
			for (let i = 0; i < featureIDs.length; i++) {
				this.unlockFeature(featureIDs[i]);
			}
		},
		
		unlockFeature: function (featureID) {
			switch (featureID) {
				case UIConstants.UNLOCKABLE_FEATURE_MAP_MODES:
					return;
				case UIConstants.UNLOCKABLE_FEATURE_WORKER_AUTO_ASSIGNMENT:
					GameGlobals.gameState.unlockedFeatures.workerAutoAssignment = true;
					return;
			}
		},
		
		forceStatsBarUpdate: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			var system = this.engine.getSystem(UIOutHeaderSystem);
			system.updateItems(true);
			system.updatePerks(true);
			system.updatePlayerStats(true);
			system.updateDeity(true);
		},

		forceTabUpdate: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			var system = this.engine.getSystem(UIOutTabBarSystem);
			system.updateTabVisibility();
		},

		save: function () {
			GlobalSignals.saveGameSignal.dispatch();
		},

	});

	return PlayerActionFunctions;
});
