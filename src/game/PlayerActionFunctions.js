// Functions to respond to player actions parsed by the UIFunctions
define(['ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/CampConstants',
	'game/constants/DialogueConstants',
	'game/constants/ExplorationConstants',
	'game/constants/ExplorerConstants',
	'game/constants/LogConstants',
	'game/constants/ImprovementConstants',
	'game/constants/PositionConstants',
	'game/constants/MovementConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/PlayerStatConstants',
	'game/constants/ItemConstants',
	'game/constants/PerkConstants',
	'game/constants/FightConstants',
	'game/constants/StoryConstants',
	'game/constants/TradeConstants',
	'game/constants/TribeConstants',
	'game/constants/UIConstants',
	'game/constants/UpgradeConstants',
	'game/constants/TextConstants',
	'game/vos/CharacterVO',
	'game/vos/PositionVO',
	'game/vos/LocaleVO',
	'game/vos/ResultVO',
	'game/nodes/PlayerPositionNode',
	'game/nodes/FightNode',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/player/PlayerResourcesNode',
	'game/nodes/PlayerLocationNode',
	'game/nodes/NearestCampNode',
	'game/nodes/sector/CampNode',
	'game/nodes/tribe/TribeUpgradesNode',
	'game/components/common/PositionComponent',
	'game/components/common/ResourcesComponent',
	'game/components/player/BagComponent',
	'game/components/player/DialogueComponent',
	'game/components/player/ExcursionComponent',
	'game/components/player/ItemsComponent',
	'game/components/player/HopeComponent',
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
	'game/components/sector/SectorControlComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/SectorLocalesComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/sector/PassagesComponent',
	'game/components/sector/OutgoingCaravansComponent',
	'game/components/sector/events/CampEventTimersComponent',
	'game/components/sector/events/RefugeesComponent',
	'game/components/sector/events/VisitorComponent',
	'game/components/sector/events/TraderComponent',
	'game/components/level/LevelStatusComponent',
	'game/helpers/SequenceHelper',
	'game/systems/ui/UIOutHeaderSystem',
	'game/systems/ui/UIOutTabBarSystem',
	'game/systems/ui/UIOutLevelSystem',
	'game/systems/FaintingSystem',
	'game/systems/PlayerPositionSystem',
	'text/Text',
	'utils/MathUtils',
	'utils/StringUtils'
], function (Ash, GameGlobals, GlobalSignals,
	GameConstants, CampConstants, DialogueConstants, ExplorationConstants, ExplorerConstants, LogConstants, ImprovementConstants, PositionConstants, MovementConstants, PlayerActionConstants, PlayerStatConstants, ItemConstants, PerkConstants, FightConstants, StoryConstants, TradeConstants, TribeConstants, UIConstants, UpgradeConstants, TextConstants,
	CharacterVO, PositionVO, LocaleVO, ResultVO,
	PlayerPositionNode, FightNode, PlayerStatsNode, PlayerResourcesNode, PlayerLocationNode,
	NearestCampNode, CampNode, TribeUpgradesNode,
	PositionComponent, ResourcesComponent,
	BagComponent, DialogueComponent, ExcursionComponent, ItemsComponent, HopeComponent, PlayerActionComponent, PlayerActionResultComponent,
	CampComponent, CurrencyComponent, LevelComponent, BeaconComponent, SectorImprovementsComponent, SectorCollectorsComponent, WorkshopComponent,
	ReputationComponent, SectorControlComponent, SectorFeaturesComponent, SectorLocalesComponent, SectorStatusComponent,
	PassagesComponent, OutgoingCaravansComponent, CampEventTimersComponent, RefugeesComponent, VisitorComponent, TraderComponent, LevelStatusComponent,
	SequenceHelper,
	UIOutHeaderSystem, UIOutTabBarSystem, UIOutLevelSystem, FaintingSystem, PlayerPositionSystem,
	Text, MathUtils, StringUtils
) {
	var PlayerActionFunctions = Ash.System.extend({

		playerPositionNodes: null,
		playerLocationNodes: null,
		nearestCampNodes: null,
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
			this.campNodes = engine.getNodeList(CampNode);
			this.fightNodes = engine.getNodeList(FightNode);
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			this.playerResourcesNodes = engine.getNodeList(PlayerResourcesNode);
			this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);

			this.sequenceHelper = new SequenceHelper();
		},

		addLogMessage: function (msgID, msg, actionPosition, visibility) {
			let playerPosition = this.playerPositionNodes.head.position;
			
			actionPosition = actionPosition || playerPosition;
			visibility = visibility || LogConstants.MSG_VISIBILITY_DEFAULT;

			let options = {
				position: actionPosition,
				visibility: visibility || LogConstants.MSG_VISIBILITY_DEFAULT
			};

			GameGlobals.playerHelper.addLogMessage(msgID, msg, options);
		},

		startAction: function (action, param) {
			if (GameGlobals.gameState.uiStatus.isTransitioning) return;
			
			if (this.currentAction && !this.isSubAction(action)) {
				log.w("There is an incompleted action: " + this.currentAction + " (tried to start: " + action + ")");
				return;
			}
			
			var otherSector = this.getActionSector(action, param);
			if (!GameGlobals.playerActionsHelper.checkAvailability(action, true, otherSector)) {
				log.w("Tried to start action but it's not available: " + action);
				return false;
			}
			
			if (action == "launch") {
				GameGlobals.gameState.isLaunchStarted = true;
			}
			
			GlobalSignals.actionStartingSignal.dispatch(action, param);
			var deductedCosts = GameGlobals.playerActionsHelper.deductCosts(action);

			var baseId = GameGlobals.playerActionsHelper.getBaseActionID(action);
			var duration = PlayerActionConstants.getDuration(action, baseId);
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
			let duration = PlayerActionConstants.getDuration(action, baseId);
			if (duration > 0) {
				let playerPos = this.playerPositionNodes.head.position;
				let isBusy = PlayerActionConstants.isBusyAction(baseId);
				let sector = this.getActionSectorOrCurrent(param);
				let sectorPos = sector.get(PositionComponent);
				
				let endTimeStamp = this.playerStatsNodes.head.entity.get(PlayerActionComponent).addAction(action, duration, sectorPos.level, param, deductedCosts, isBusy);

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
						GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_START_SEND_CAMP, "ui.log.send_caravan_start_message");
						GlobalSignals.caravanSentSignal.dispatch();
						GameGlobals.gameState.increaseGameStatSimple("numCaravansSent");
						break;
						
					case "use_in_home":
					case "use_in_hospital":
						this.handlePerksOnStartRest();
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
				case "use_in_campfire_2": this.startCampfire(param); break;
				case "use_in_market": this.useMarket(param); break;
				case "use_in_hospital": this.useHospital(param); break;
				case "use_in_hospital_2": this.useHospital2(param); break;
				case "use_in_library": this.useLibrary(param); break;
				case "use_in_temple": this.useTemple(param); break;
				case "use_in_shrine": this.useShrine(param); break;
				case "improve_in": this.improveBuilding(param); break;
				case "repair_in": this.repairBuilding(param); break;
				case "dismantle": this.dismantleBuilding(param); break;
				// Item actions
				case "craft": this.craftItem(param); break;
				case "equip": this.equipItem(param); break;
				case "unequip": this.unequipItem(param); break;
				case "discard": this.discardItem(param); break;
				case "use_item": this.useItem(param, deductedCosts); break;
				case "use_item_fight": this.useItemFight(param); break;
				case "use_explorer_fight": this.useExplorerFight(param); break;
				case "repair_item": this.repairItem(param); break;
				// Dialogue actions
				case "start_dialogue": this.startDialogue(param); break;
				case "end_dialogue": this.endDialogue(param); break;
				case "select_dialogue_option": this.selectDialogueOption(param); break;
				// Other actions
				case "enter_camp": this.enterCamp(false); break;
				case "scavenge": this.scavenge(param); break;
				case "scavenge_heap": this.scavengeHeap(param); break;
				case "investigate": this.investigate(param); break;
				case "examine": this.examine(param); break;
				case "scout": this.scout(param); break;
				case "scout_locale_i": this.scoutLocale(param); break;
				case "scout_locale_u": this.scoutLocale(param); break;
				case "bridge_gap": this.bridgeGap(param); break;
				case "clear_debris": this.clearDebris(param); break;
				case "clear_explosives": this.clearExplosives(param); break;
				case "clear_gate": this.clearTollGate(param); break;
				case "clear_waste_r": this.clearWaste(action, param); break;
				case "clear_waste_t": this.clearWaste(action, param); break;
				case "clear_workshop": this.clearWorkshop(param); break;
				case "use_spring": this.useSpring(param); break;
				case "fight_gang": this.fightGang(param); break;
				case "send_caravan": this.sendCaravan(param); break;
				case "trade_with_caravan": this.tradeWithCaravan(); break;
				case "recruit_explorer": this.recruitExplorer(param); break;
				case "start_explorer_dialogue": this.startExplorerDialogue(param); break;
				case "start_in_npc_dialogue": this.startInNPCDialogue(param); break;
				case "start_out_npc_dialogue": this.startOutNPCDialogue(param); break;
				case "start_visitor_dialogue": this.startVisitorDialogue(param); break;
				case "start_refugee_dialogue": this.startRefugeeDialogue(param); break;
				case "dismiss_recruit": this.dismissRecruit(param); break;
				case "dismiss_explorer": this.dismissExplorer(param); break;
				case "heal_explorer": this.healExplorer(param); break;
				case "accept_refugees": this.acceptRefugees(param); break;
				case "dismiss_refugees": this.dismissRefugees(param); break;
				case "select_explorer": this.selectExplorer(param); break;
				case "deselect_explorer": this.deselectExplorer(param); break;
				case "nap": this.nap(param); break;
				case "get_up": this.getUp(param); break;
				case "wait": this.wait(param); break;
				case "despair": this.despair(param); break;
				case "unlock_upgrade": this.unlockUpgrade(param); break;
				case "create_blueprint": this.createBlueprint(param); break;
				case "claim_milestone": this.claimMilestone(param); break;
				case "launch": this.launch(param); break;
				// Mapped directly in UIFunctions or elsewheere
				case "leave_camp": break;
				case "fight": break;
				case "auto_equip": break;
				case "accept_inventory": break;
				case "take_all": break;
				// Movement
				case "move_level_up": this.moveTo(PositionConstants.DIRECTION_UP, action); break;
				case "move_level_down": this.moveTo(PositionConstants.DIRECTION_DOWN, action); break;
				case "move_camp_level": this.moveTo(PositionConstants.DIRECTION_CAMP, action); break;
				case "move_sector_north": this.moveTo(PositionConstants.DIRECTION_NORTH, action); break;
				case "move_sector_grit_north": this.moveTo(PositionConstants.DIRECTION_NORTH, action); break;
				case "move_sector_east": this.moveTo(PositionConstants.DIRECTION_EAST, action); break;
				case "move_sector_grit_east": this.moveTo(PositionConstants.DIRECTION_EAST, action); break;
				case "move_sector_south": this.moveTo(PositionConstants.DIRECTION_SOUTH, action); break;
				case "move_sector_grit_south": this.moveTo(PositionConstants.DIRECTION_SOUTH, action); break;
				case "move_sector_west": this.moveTo(PositionConstants.DIRECTION_WEST, action); break;
				case "move_sector_grit_west": this.moveTo(PositionConstants.DIRECTION_WEST, action); break;
				case "move_sector_ne": this.moveTo(PositionConstants.DIRECTION_NE, action); break;
				case "move_sector_grit_ne": this.moveTo(PositionConstants.DIRECTION_NE, action); break;
				case "move_sector_se": this.moveTo(PositionConstants.DIRECTION_SE, action); break;
				case "move_sector_grit_se": this.moveTo(PositionConstants.DIRECTION_SE, action); break;
				case "move_sector_sw": this.moveTo(PositionConstants.DIRECTION_SW, action); break;
				case "move_sector_grit_sw": this.moveTo(PositionConstants.DIRECTION_SW, action); break;
				case "move_sector_nw": this.moveTo(PositionConstants.DIRECTION_NW, action); break;
				case "move_sector_grit_nw": this.moveTo(PositionConstants.DIRECTION_NW, action); break;
				case "move_camp_global": this.moveToCamp(param); break;
				default:
					log.w("No function mapped for action " + action + " in PlayerActionFunctions.performAction");
					break;
			}
		},
		
		completeAction: function (action) {
			if (action) {
				let baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(action);

				if (this.currentAction == action)
					this.currentAction = null;

				if (action.indexOf("use_in_") >= 0) {
					let improvementID = GameGlobals.playerActionsHelper.getImprovementIDForAction(action);
					let duration = PlayerActionConstants.getDuration(action);
					GameGlobals.gameState.increaseGameStatKeyed("timeUsingCampBuildingPerId", improvementID, duration);
				}

				GameGlobals.gameState.lastAction = baseActionID;
			}

			GameGlobals.gameState.lastActionTimestamp = new Date().getTime();
			
			GameGlobals.uiFunctions.completeAction(action);
			GlobalSignals.actionCompletedSignal.dispatch(action);
		},

		startDialogue: function (id, explorerVO, characterVO, textParams) {
			let dialogueVO = DialogueConstants.getDialogue(id);
			
			if (!dialogueVO) {
				log.w("not able to start dialogue - no such dialogue found: " + id);
				return;
			}

			if (!GameGlobals.dialogueHelper.isDialogueValid(dialogueVO, explorerVO)) {
				log.w("not able to start dialogue - not valid: " + id);
				return;
			}

			if (explorerVO) {
				if (!explorerVO.numDialogues) explorerVO.numDialogues = 0;
				explorerVO.numDialogues++;
				GameGlobals.gameState.increaseGameStatHighScore("mostDialoguesWithExplorer", explorerVO, explorerVO.numDialogues);
			}

			if (characterVO) {
				if (!GameGlobals.playerHelper.isInCamp()) {
					GameGlobals.gameState.increaseGameStatList("uniqueOutNPCsMet", characterVO.instanceID);
				}
			}

			GameGlobals.gameFlowLogger.log("start dialogue: " + id);

			this.playerStatsNodes.head.entity.add(new DialogueComponent(dialogueVO, explorerVO, characterVO, textParams));
		},

		endDialogue: function () {
			let dialogueComponent = this.playerStatsNodes.head.entity.get(DialogueComponent);
			if (!dialogueComponent) return;
			
			dialogueComponent.isEnded = true;

			this.completeAction();
		},

		selectDialogueOption: function (selectionID) {
			let dialogueComponent = this.playerStatsNodes.head.entity.get(DialogueComponent);
			if (!dialogueComponent) return;
			
			dialogueComponent.pendingSelectionID = selectionID;
		},
		
		getPositionVO: function (sectorPos) {
			if (!sectorPos) return null;
			if (!sectorPos.split) return null;
			var l = parseInt(sectorPos.split(".")[0]);
			var sX = parseInt(sectorPos.split(".")[1]);
			var sY = parseInt(sectorPos.split(".")[2]);
			return new PositionVO(l, sX, sY);
		},

		getActionSector: function (action, param) {
			if (!param) return null;
			var position = this.getPositionVO(param);
			if (!position) return null;
			return GameGlobals.levelHelper.getSectorByPosition(position.level, position.sectorX, position.sectorY);
		},
		
		getActionSectorOrCurrent: function (sectorPos) {
			let current = this.playerLocationNodes.head.entity;
			let position = this.getPositionVO(sectorPos);
			return this.getActionSector("", sectorPos) || current;
		},

		moveTo: function (direction, action) {
			let playerPos = this.playerPositionNodes.head.position;
			let newPos = playerPos.clone();
			
			switch (direction) {
				case PositionConstants.DIRECTION_WEST:
					newPos.sectorX--;
					this.recordSteps(1);
					break;
				case PositionConstants.DIRECTION_NORTH:
					newPos.sectorY--;
					this.recordSteps(1);
					break;
				case PositionConstants.DIRECTION_SOUTH:
					newPos.sectorY++;
					this.recordSteps(1);
					break;
				case PositionConstants.DIRECTION_EAST:
					newPos.sectorX++;
					this.recordSteps(1);
					break;
				case PositionConstants.DIRECTION_NE:
					newPos.sectorX++;
					newPos.sectorY--;
					this.recordSteps(1);
					break;
				case PositionConstants.DIRECTION_SE:
					newPos.sectorX++;
					newPos.sectorY++;
					this.recordSteps(1);
					break;
				case PositionConstants.DIRECTION_SW:
					newPos.sectorX--;
					newPos.sectorY++;
					this.recordSteps(1);
					break;
				case PositionConstants.DIRECTION_NW:
					newPos.sectorX--;
					newPos.sectorY--;
					this.recordSteps(1);
					break;
				case PositionConstants.DIRECTION_UP:
					newPos.level++;
					break;
				case PositionConstants.DIRECTION_DOWN:
					newPos.level--;
					break;
				case PositionConstants.DIRECTION_CAMP:
					newPos.inCamp = true;
					if (this.nearestCampNodes.head) {
						let campSector = this.nearestCampNodes.head.entity;
						let campPosition = campSector.get(PositionComponent);
						let path = GameGlobals.playerActionsHelper.getPathToNearestCamp();
						newPos = campPosition.clone();
						newPos.inCamp = true;
						this.recordExcursionSurvived();
						this.recordSteps(path.length);
					}
					break;
				default:
					log.w("unknown direction: " + direction);
					break;
			}
			
			GameGlobals.playerHelper.moveTo(newPos.level, newPos.sectorX, newPos.sectorY, newPos.inCamp, action);
		},

		moveToCamp: function (param) {
			let campOrdinal = parseInt(param);
			let campSector = null;
			for (var node = this.campNodes.head; node; node = node.next) {
				let nodePosition = node.position;
				let foundCampOrdinal = GameGlobals.gameState.getCampOrdinal(nodePosition.level);
				if (foundCampOrdinal == campOrdinal) {
					campSector = node.entity;
					break;
				}
			}
			
			if (!campSector) {
				log.w("No camp found for campOrdinal " + campOrdinal);
				return;
			}

			let campPosition = campSector.get(PositionComponent);
			
			GameGlobals.playerHelper.moveTo(campPosition.level, campPosition.sectorX, campPosition.sectorY, true, "move_camp_global", false);
		},

		updateCarriedItems: function (selectedItems) {
			let itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
			let allItems = itemsComponent.getAll(true);
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

		enterCamp: function (isFainted) {
			let playerPos = this.playerPositionNodes.head.position;
			GameGlobals.playerHelper.moveTo(playerPos.level, playerPos.sectorX, playerPos.sectorY, true, "enter_camp", false);
			if (!isFainted) {
				this.recordExcursionSurvived();
			}
		},

		enterOutTab: function () {
			var playerPos = this.playerPositionNodes.head.position;
			if (playerPos.inCamp && !GameGlobals.resourcesHelper.hasCampStorage()) this.leaveCamp();
		},

		leaveCamp: function () {
			let playerPos = this.playerPositionNodes.head.position;
			GameGlobals.playerHelper.moveTo(playerPos.level, playerPos.sectorX, playerPos.sectorY, false, "leave_camp", false);
		},

		scavenge: function () {
			let sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			let efficiency = GameGlobals.playerActionResultsHelper.getCurrentScavengeEfficiency();
			let isFirst = !GameGlobals.gameState.unlockedFeatures.scavenge;
			
			GameGlobals.playerActionFunctions.unlockFeature("scavenge");

			let sector = this.playerLocationNodes.head.entity;
			let sectorFeatures = sector.get(SectorFeaturesComponent);
			let sectorResources = sectorFeatures.resourcesScavengable;
			let sectorItems = sectorFeatures.itemsScavengeable.length;
			
			let logMsg = this.getScavengeMessageBase(sector);

			var logMsgSuccess = logMsg;
			var logMsgFlee = logMsg + "Fled empty-handed.";
			var logMsgDefeat = logMsg + "Got into a fight and was defeated.";

			let successCallback = function () {
				GameGlobals.gameState.stats.numTimesScavenged++;
				let scavengedPercentBefore = sectorStatus.getScavengedPercent();
				sectorStatus.scavenged = true;
				sectorStatus.weightedNumScavenges += Math.min(1, efficiency);
				let scavengedPercentAfter = sectorStatus.getScavengedPercent();
				let warningThresholdHighScavengedPercent = 75;
				let warningThresholdNoScavengeResources = ExplorationConstants.THRESHOLD_SCAVENGED_PERCENT_REVEAL_NO_RESOURCES;
				if (sectorResources.getTotal() <= 0 && sectorItems.length <= 0 && scavengedPercentAfter >= warningThresholdNoScavengeResources) {
					GameGlobals.playerHelper.addLogMessage(LogConstants.getUniqueID(), logMsg + " There doesn't seem to be anything to scavenge here.");
				} else if (scavengedPercentBefore < warningThresholdHighScavengedPercent && scavengedPercentAfter >= warningThresholdHighScavengedPercent) {
					GameGlobals.playerHelper.addLogMessage(LogConstants.getUniqueID(), logMsg + " There isn't much left to scavenge here.");
				}
			};
			
			let messages = {
				id: LogConstants.MSG_ID_SCAVENGE,
				msgSuccess: logMsgSuccess,
				msgFlee: logMsgFlee,
				msgDefeat: logMsgDefeat,
				addToLog: isFirst,
			};

			let showResultPopup = !GameConstants.uiModeMinimialExplorationPopups;
			
			this.handleOutActionResults("scavenge", messages, showResultPopup, false, successCallback);
		},

		scavengeHeap: function () {
			let sector = this.playerLocationNodes.head.entity;
			let sectorStatus = sector.get(SectorStatusComponent);
			let sectorFeatures = sector.get(SectorFeaturesComponent);
			let efficiency = GameGlobals.playerActionResultsHelper.getCurrentScavengeEfficiency();
			
			let weightedProgress = Math.min(1, efficiency);
			let scavengedPercentBefore = sectorStatus.getHeapScavengedPercent();
			let scavengedPercentAfter = sectorStatus.getHeapScavengedPercent(weightedProgress);

			let resourceNameDisplayName = TextConstants.getResourceDisplayName(sectorFeatures.heapResource);
			let heapDisplayName = TextConstants.getHeapDisplayName(sectorFeatures.heapResource, sectorFeatures);
			
			let logMsg = this.getScavengeMessageBase(sector);

			var logMsgSuccess = logMsg;
			var logMsgFlee = logMsg + "Fled empty-handed.";
			var logMsgDefeat = logMsg + "Got into a fight and was defeated.";
			
			logMsgSuccess += " " + Text.capitalize(resourceNameDisplayName) + " remaining: " + Math.round(100 - scavengedPercentAfter) + "%";

			let successCallback = function () {
				GameGlobals.gameState.stats.numTimesScavenged++;
				sectorStatus.weightedNumHeapScavenges += weightedProgress;

				let warningThresholdHighScavengedPercent = 100;
				if (scavengedPercentBefore < warningThresholdHighScavengedPercent && scavengedPercentAfter >= warningThresholdHighScavengedPercent) {
					GameGlobals.playerHelper.addLogMessage(LogConstants.getUniqueID(), heapDisplayName + " picked clean");
				}
			};
			
			let messages = {
				id: LogConstants.MSG_ID_SCAVENGE_HEAP,
				msgSuccess: logMsgSuccess,
				msgFlee: logMsgFlee,
				msgDefeat: logMsgDefeat,
				addToLog: false,
			};

			let showResultPopup = !GameConstants.uiModeMinimialExplorationPopups;
			
			this.handleOutActionResults("scavenge_heap", messages, showResultPopup, false, successCallback);
		},

		getScavengeMessageBase: function (sector) {
			let sectorFeatures = sector.get(SectorFeaturesComponent);
			let sunlit = sectorFeatures.sunlit;
			let playerMaxVision = this.playerStatsNodes.head.vision.maximum;

			let logMsg = "";
			if (playerMaxVision <= PlayerStatConstants.VISION_BASE) {
				if (sunlit) logMsg = "Rummaged blindly for loot. ";
				else logMsg = "Rummaged in the dark. ";
			} else {
				logMsg = "Went scavenging. ";
			}
			return logMsg;
		},

		investigate: function () {
			let sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			let efficiency = GameGlobals.playerActionResultsHelper.getCurrentScavengeEfficiency();
			
			let isFirst = false;
			if (!GameGlobals.gameState.usedFeatures.investigate) {
				GameGlobals.playerActionFunctions.useFeature("investigate");
				isFirst = true;
			}
			
			let investigatedPercentBefore = sectorStatus.getInvestigatedPercent();
			
			if (investigatedPercentBefore >= 100) return;
			
			let weightedInvestigateAdded = Math.min(1, efficiency);
			let investigatePercentAfter = sectorStatus.getInvestigatedPercent(weightedInvestigateAdded);
			let isCompletion = investigatePercentAfter >= 100;

			let logMsg = "Investigated the sector. ";

			let logMsgSuccess = logMsg;
			let logMsgFlee = logMsg + "Fled empty-handed.";
			let logMsgDefeat = logMsg + "Got into a fight and was defeated.";
			let sys = this;
			
			if (isCompletion) {
				logMsgSuccess += " Investigation completed. ";
			} else {
				logMsgSuccess += " Investigation progress: " + Math.round(investigatePercentAfter) + "%";
			}
			
			let successCallback = function () {
				sectorStatus.investigated = true;
				sectorStatus.weightedNumInvestigates += weightedInvestigateAdded;
				let investigatedPercentAfter = sectorStatus.getInvestigatedPercent();
			};
			
			let messages = {
				id: LogConstants.MSG_ID_INVESTIGATE,
				msgSuccess: logMsgSuccess,
				msgFlee: logMsgFlee,
				msgDefeat: logMsgDefeat,
				addToLog: isFirst,
			};
			
			this.handleOutActionResults("investigate", messages, true, false, successCallback);
		},

		examine: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			let featuresComponent = sector.get(SectorFeaturesComponent);
			let spotID = featuresComponent.examineSpots[0];
			let spotDef = StoryConstants.getSectorExampineSpot(spotID);

			if (!spotDef) return;
			
			let successCallback = function () {
				let level = GameGlobals.levelHelper.getLevelEntityForSector(sector);
				let levelStatus = level.get(LevelStatusComponent);
				levelStatus.examinedSpots.push(spotID);
				if (spotDef.logMessageKey) GameGlobals.playerHelper.addLogMessage(LogConstants.getUniqueID(), spotDef.logMessageKey);
				GlobalSignals.examineSpotExaminedSignal.dispatch(spotDef.storyTag);
			};

			let messages = {
				id: LogConstants.getUniqueID(),
				msgSuccess: Text.t(spotDef.descriptionKey),
				addToLog: false,
			};

			this.handleOutActionResults("examine", messages, true, false, successCallback);
		},

		scout: function () {
			let sector = this.playerLocationNodes.head.entity;
			let sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			let featuresComponent = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			let improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			
			if (sectorStatus.scouted) {
				log.w("Sector already scouted.");
				return;
			}
			
			let isFirst = false;
			
			GameGlobals.playerActionFunctions.unlockFeature("evidence");

			if (!GameGlobals.gameState.unlockedFeatures.scout) {
				GameGlobals.playerActionFunctions.unlockFeature("scout");
				isFirst = true;
			}
			
			let level = sector.get(PositionComponent).level;

			let popupMsg = "Scouted the area.";
			let logMsg = "";
			let found = false;
			let showResultPopup = !GameConstants.uiModeMinimialExplorationPopups;
			let sunlit = featuresComponent.sunlit;
			
			if (featuresComponent.hasSpring) {
				found = true;
				showResultPopup = true;
				popupMsg += "<br/>Found " + Text.addArticle(TextConstants.getSpringName(featuresComponent)) + ".";
			}
			
			if (featuresComponent.hasTradeConnectorSpot && !GameGlobals.levelHelper.getFirstScoutedSectorWithFeatureOnLevel(level, "hasTradeConnectorSpot")) {
				found = true;
				showResultPopup = true;
				popupMsg += "<br/>Found a good place for a bigger building project.";
				logMsg += "Found a good place for a bigger building project.";
			}
			
			let workshopComponent = sector.get(WorkshopComponent);
			if (workshopComponent && workshopComponent.isClearable) {
				found = true;
				showResultPopup = true;
				popupMsg += "<br/>Found " + Text.addArticle(TextConstants.getWorkshopName(workshopComponent.resource));
				logMsg += "Found " + Text.addArticle(TextConstants.getWorkshopName(workshopComponent.resource));
			}

			if (featuresComponent.examineSpots.length > 0) {
				found = true;
				showResultPopup = true;
				popupMsg += "<br/>Found some interesting objects.";
			}
			
			if (featuresComponent.campable) {
				if (!this.nearestCampNodes.head || this.nearestCampNodes.head.position.level != this.playerLocationNodes.head.position.level) {
					found = true;
					showResultPopup = true;
					if (GameGlobals.gameState.numCamps == 0) {
						popupMsg += "<br/>This seems like a safe spot to build a shelter.";
					} else {
						popupMsg += "<br/>This seems like a good place for a camp.";
					}
				}
			}

			if (improvements.getTotalCount() == 0 || true) {
				let passagesComponent = this.playerLocationNodes.head.entity.get(PassagesComponent);
				if (passagesComponent.passageUp && !GameGlobals.levelHelper.isPassageUpBuilt(level)) {
					found = true;
					showResultPopup = true;
					popupMsg += "<br/>" + TextConstants.getPassageFoundMessage(passagesComponent.passageUp, PositionConstants.DIRECTION_UP, sunlit) + " ";
					logMsg += level == 13 ? "Found a hole in the ceiling leading to the level above, but it's far too high to reach." : "Found a passage to the level above.";
				}

				if (passagesComponent.passageDown && !GameGlobals.levelHelper.isPassageDownBuilt(level)) {
					found = true;
					showResultPopup = true;
					popupMsg += "<br/>" + TextConstants.getPassageFoundMessage(passagesComponent.passageDown, PositionConstants.DIRECTION_DOWN, sunlit) + " ";
					logMsg += "Found a passage to the level below.";
					GameGlobals.gameState.setStoryFlag(StoryConstants.ESCAPE_PASSAGE_DOWN_FOUND, true);
				}
			}

			let sectorLocalesComponent = sector.get(SectorLocalesComponent);
			if (sectorLocalesComponent.locales.length > 0) {
				found = true;
				showResultPopup = true;
				let locale = sectorLocalesComponent.locales[0];
				if (sectorLocalesComponent.locales.length > 1) {
					popupMsg += "<br/>There are some interesting buildings here.";
				} else if (locale.type == localeTypes.greenhouse) {
					popupMsg += "<br/>There is an abandoned " + UIConstants.highlight(TextConstants.getLocaleName(locale, featuresComponent, true).toLowerCase()) + " here.";
					logMsg += "Found a greenhouse.";
				} else {
					popupMsg += "<br/>There is a " + UIConstants.highlight(TextConstants.getLocaleName(locale, featuresComponent, true).toLowerCase()) + " here that seems worth scouting.";
				}
			}
			
			if (featuresComponent.waymarks.length > 0) {
				let sectorFeatures = GameGlobals.sectorHelper.getTextFeatures(sector);
				for (let i = 0; i < featuresComponent.waymarks.length; i++) {
					showResultPopup = true;
					popupMsg += "<br/>" + TextConstants.getWaymarkText(featuresComponent.waymarks[i], sectorFeatures);
				}
			}

			if (featuresComponent.heapResource) {
				showResultPopup = true;
				let heapDisplayName = TextConstants.getHeapDisplayName(featuresComponent.heapResource, featuresComponent);
				popupMsg += "<br/>There is " + Text.addArticle(heapDisplayName) + " which can be scavenged for " + featuresComponent.heapResource + ".";
			}
			
			if (GameGlobals.sectorHelper.canBeInvestigated(sector, true)) {
				showResultPopup = true;
				popupMsg += "<br/>Something happened here just before the Fall. This sector can be <span class='hl-functionality'>investigated</span>.";
				logMsg += "Found a sector that can be investigated.";
			}
			
			let successCallback = function () {
				GameGlobals.gameState.stats.numTimesScouted++;
				sectorStatus.scouted = true;
				
				if (logMsg) {
					GameGlobals.playerHelper.addLogMessage(LogConstants.getUniqueID(), logMsg);
				}
				
				GlobalSignals.sectorScoutedSignal.dispatch(sector);
				GameGlobals.playerActionFunctions.completeAction("scout");
				GameGlobals.playerActionFunctions.engine.getSystem(UIOutLevelSystem).rebuildVis();
				GameGlobals.playerActionFunctions.save();
			};
			
			let messages = {
				id: found ? LogConstants.MSG_ID_SCOUT_FOUND_SOMETHING : LogConstants.MSG_ID_SCOUT,
				msgSuccess: popupMsg,
				msgFlee: popupMsg,
				msgDefeat: popupMsg,
				addToLog: isFirst,
			};
			
			this.handleOutActionResults("scout", messages, showResultPopup, found, successCallback);
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

			let localeType = localeVO.type;

			let localeName = TextConstants.getLocaleName(localeVO, sectorFeaturesComponent);
			let localeNameShort = localeName.split(" ")[localeName.split(" ").length - 1];;

			let customRewardTexts = [];
			
			let luxuryResource = localeVO.luxuryResource;
			if (luxuryResource) {
				customRewardTexts.push("Found a source of <span class='hl-functionality'>" + TribeConstants.getLuxuryDisplayName(luxuryResource) + "</span>. There is a building project available in camp to use it.");
			}
			
			let tradingPartner = null;
			if (localeType === localeTypes.tradingpartner) {
				let playerPos = this.playerPositionNodes.head.position;
				let level = playerPos.level;
				let campOrdinal = GameGlobals.gameState.getCampOrdinal(level);
				if (GameGlobals.gameState.foundTradingPartners.indexOf(campOrdinal) < 0) {
					let partner = TradeConstants.getTradePartner(campOrdinal);
					if (partner) {
						let partnerName = partner.name;
						customRewardTexts.push("Found a new <span class='hl-functionality'>trading partner</span>. They call this place " + partnerName + ".");
						tradingPartner = campOrdinal;
					}
				}
			}

			let playerActionFunctions = this;
			let successCallback = function (cb) {
				sectorStatus.localesScouted[i] = true;
				
				if (tradingPartner) {
					GameGlobals.gameState.foundTradingPartners.push(tradingPartner);
					GameGlobals.playerActionFunctions.unlockFeature("trade");
				}
				
				if (luxuryResource) {
					if (GameGlobals.gameState.foundLuxuryResources.indexOf(luxuryResource) < 0) {
						GameGlobals.gameState.foundLuxuryResources.push(luxuryResource);
					}
				}

				cb();
				
				playerActionFunctions.save();

				GlobalSignals.localeScoutedSignal.dispatch(localeVO.type);
			};
			
			if (localeType == localeTypes.grove) {
				let groveSuccessCallback = function (cb) {
					GameGlobals.playerHelper.addPerk(PerkConstants.perkIds.blessed);
					playerActionFunctions.playerStatsNodes.head.stamina.stamina += PlayerStatConstants.STAMINA_GAINED_FROM_GROVE;
					playerActionFunctions.playerStatsNodes.head.entity.get(HopeComponent).hasDeity = true;
					cb();
				};
				this.startSequence([
					{ type: "dialogue", dialogueID: "locale_story_grove" },
					{ type: "custom", f: groveSuccessCallback },
					{ type: "custom", f: successCallback },
					{ type: "log", textKey: "story.stories.greenhouse_grove_scouted_message" }
				], localeName);
				return;
			}

			if (localeVO.type == localeTypes.greenhouse) {
				if (!GameGlobals.tribeHelper.hasDeity()) {
					this.startSequence([
						{ type: "dialogue", dialogueID: "locale_story_greenhouse" },
						{ type: "custom", f: successCallback },
						{ type: "log", textKey: "story.stories.greenhouse_greenhouse_found_message" }
					], localeName);
					return;
				}
			}

			if (localeVO.type == localeTypes.depot) {
				this.startSequence([
					{ type: "dialogue", dialogueID: "locale_story_depot" },
					{ type: "storyFlag", flagID: StoryConstants.flags.FALL_SEEN_STOREHOUSE, value: true },
					{ type: "custom", f: successCallback },
					{ type: "log", textKey: "Scouted a depot." }
				], localeName);
				return;
			}

			if (localeVO.type == localeTypes.spacefactory) {
				this.startSequence([
					{ type: "dialogue", dialogueID: "locale_story_spacefactory" },
					{ type: "storyFlag", flagID: StoryConstants.flags.FALL_SEEN_SPACEFACTORY, value: true },
					{ type: "custom", f: successCallback },
					{ type: "log", textKey: "Scouted a manufacturing plant." }
				]);
				return;
			}

			if (localeVO.type == localeTypes.seedDepot) {
				this.startSequence([
					{ type: "dialogue", dialogueID: "locale_story_seeddepot" },
					{ type: "custom", f: successCallback },
					{ type: "log", textKey: "Scouted an old seed depot, but the seeds were dead." }
				], localeName);
				return;
			}

			if (localeVO.type == localeTypes.shelter) {
				let shelterSuccessCallback = function (cb) {
					let itemsComponent = playerActionFunctions.playerPositionNodes.head.entity.get(ItemsComponent);
					let item = itemsComponent.getItem("artefact_rescue_1", null, true, true);
					if (item) itemsComponent.discardItem(item, false, false);
					cb();
				};

				this.startSequence([
					{ type: "dialogue", dialogueID: "locale_story_shelter" },
					{ type: "storyFlag", flagID: StoryConstants.flags.RESCUE_EXPLORER_FOUND, value: true },
					{ type: "custom", f: successCallback },
					{ type: "custom", f: shelterSuccessCallback },
					{ type: "log", textKey: "Scouted the apartment." }
				], localeName);
				return;
			}

			if (localeVO.type == localeTypes.compound) {
				this.startSequence([
					{ type: "dialogue", dialogueID: "locale_story_compound" },
					{ type: "storyFlag", flagID: StoryConstants.flags.GANG_COMPOUND_FOUND, value: true },
					{ type: "custom", f: successCallback },
					{ type: "log", textKey: "Scouted a compound." }
				], localeName);
				return;
			}

			if (localeVO.type == localeTypes.expedition) {
				this.startSequence([
					{ type: "dialogue", dialogueID: "locale_story_expedition_camp" },
					{ type: "storyFlag", flagID: StoryConstants.flags.EXPEDITION_FATE_KNOWN, value: true },
					{ type: "custom", f: successCallback },
					{ type: "log", textKey: "Scouted the campsite." }
				], localeName);
				return;
			}

			if (localeVO.type == localeTypes.isolationCenter) {
				this.startSequence([
					{ type: "dialogue", dialogueID: "locale_story_isolation_center" },
					{ type: "custom", f: successCallback },
					{ type: "log", textKey: "Scouted the facility." }
				], localeName);
				return;
			}

			if (localeVO.type == localeTypes.clinic) {
				this.startSequence([
					{ type: "dialogue", dialogueID: "locale_generic_clinic" },
					{ type: "custom", f: successCallback },
				], localeName);
				return;
			}

			let hasCustomReward = customRewardTexts.length > 0;

			let introDialogueID = this.getLocaleIntroDialogueID(localeVO);
			let obstacleDialogueID = this.getScoutLocaleObstacleDialogueID(localeVO);
			let fightChance = GameGlobals.fightHelper.getRandomEncounterProbability(action);
			let rewardVO = GameGlobals.playerActionResultsHelper.getResultVOByAction(action, hasCustomReward);

			let rewardTextKey = this.getLocaleRewardTextKey(localeVO);
			let outroLogKey = "Scouted " +  Text.addArticle(localeName);

			let sequenceSteps = [];

			let explorers = this.playerStatsNodes.head.explorers.getParty();
			let explorerName = explorers.length > 0 ? MathUtils.randomElement(explorers).name : "";

			sequenceSteps.push({ id: "intro", type: "dialogue", dialogueID: introDialogueID, textParams: { name: localeNameShort } });
			if (obstacleDialogueID) 
				sequenceSteps.push({ id: "obstacle", type: "dialogue", dialogueID: obstacleDialogueID, textParams: { explorerName: explorerName }, localeName: localeNameShort });
			if (fightChance > 0) 
				sequenceSteps.push({ id: "fight", type: "fight", chance: fightChance, numEnemies: 1, action: action, branches: { "WIN": "outro", "LOSE": "END", "FLEE": "END" } });
			sequenceSteps.push({ id: "outro", type: "result", result: rewardVO, textKey: rewardTextKey, customRewardTexts: customRewardTexts });
			sequenceSteps.push({ id: "result", type: "custom", f: successCallback });
			sequenceSteps.push({ id: "log", type: "log", textKey: outroLogKey });

			this.startSequence(sequenceSteps, localeName);
		},

		getLocaleIntroDialogueID: function (localeVO) {
			let localeType = localeVO.type;
			let randomIndex = MathUtils.randomIntBetween(1, 3);
			return "locale_generic_" + localeType + "_intro_0" + randomIndex;
		},

		getLocaleRewardTextKey: function (localeVO) {
			let possibleKeys = [];

			possibleKeys.push("ui.exploration.action_rewards_generic_message_01");
			possibleKeys.push("ui.exploration.action_rewards_message_locale_generic_01");
			possibleKeys.push("ui.exploration.action_rewards_message_locale_generic_02");
			possibleKeys.push("ui.exploration.action_rewards_message_locale_generic_03");
			possibleKeys.push("ui.exploration.action_rewards_message_locale_generic_04");

			switch (localeVO.type) {
				case localeTypes.bunker:
				case localeTypes.office:
				case localeTypes.store:
				case localeTypes.grocery:
				case localeTypes.restaurant:
				case localeTypes.lab:
					possibleKeys.push("ui.exploration.action_rewards_message_locale_storeroom_01");
					break;
				 case localeTypes.camp:
					possibleKeys = [ "ui.exploration.action_rewards_message_locale_inhabited_01" ];
			}

			return MathUtils.randomElement(possibleKeys);
		},

		getScoutLocaleObstacleDialogueID: function (localeVO) {
			let obstacleChance = 0.5;

			let localeCategory = localeVO.getCategory();

			if (localeCategory == "u") obstacleChance = 0.25;

			if (Math.random() > obstacleChance) {
				return null;
			}

			let allObstacles = [
				{ dialogueID: "locale_generic_obstacle_dialect", category: "i" },
				{ dialogueID: "locale_generic_obstacle_guards", category: "i" },
				{ dialogueID: "locale_generic_obstacle_inhabitants", category: "i" },
				{ dialogueID: "locale_generic_obstacle_claustrophobia", category: "u", allowedTypes: [ localeTypes.factory, localeTypes.maintenance, localeTypes.hospital, localeTypes.bunker ] },
				{ dialogueID: "locale_generic_obstacle_darkness", category: "u", allowedTypes: [ localeTypes.warehouse, localeTypes.library ] },
				{ dialogueID: "locale_generic_obstacle_draft", category: "u", allowedTypes: [ localeTypes.house, localeTypes.warehouse] },
				{ dialogueID: "locale_generic_obstacle_explorer_curious", category: "u", requiresExplorers: true },
				{ dialogueID: "locale_generic_obstacle_explorer_lost", category: "u", requiresExplorers: true },
				{ dialogueID: "locale_generic_obstacle_explorer_nervous", category: "u", requiresExplorers: true },
				{ dialogueID: "locale_generic_obstacle_flooded", category: "u", disallowedTypes: [ localeTypes.junkyard, localeTypes.farm ] },
				{ dialogueID: "locale_generic_obstacle_glass", category: "u" },
				{ dialogueID: "locale_generic_obstacle_identical", category: "u", allowedTypes: [ localeTypes.office, localeTypes.hospital ] },
				{ dialogueID: "locale_generic_obstacle_ladder", category: "u", allowedTypes: [ localeTypes.farm, localeTypes.warehouse ] },
				{ dialogueID: "locale_generic_obstacle_lost", category: "u", allowedTypes: [ localeTypes.office, localeTypes.market, localeTypes.hospital ] },
				{ dialogueID: "locale_generic_obstacle_pillar", category: "u", disallowedTypes: [ localeTypes.lab, localeTypes.office, localeTypes.maintenance ] },
				{ dialogueID: "locale_generic_obstacle_remains", category: "u", disallowedTypes: [ localeTypes.warehouse, localeTypes.maintenance ] },
				{ dialogueID: "locale_generic_obstacle_rot", category: "u", allowedTypes: [ localeTypes.restaurant ] },
				{ dialogueID: "locale_generic_obstacle_rubble", category: "u" },
				{ dialogueID: "locale_generic_obstacle_shelves", category: "u", disallowedTypes: [ localeTypes.junkyard ] },
				{ dialogueID: "locale_generic_obstacle_spoiled", category: "u", allowedTypes: [ localeTypes.restaurant, localeTypes.grocery, localeTypes.warehouse, localeTypes.hospital ] },
				{ dialogueID: "locale_generic_obstacle_stair", category: "u" },
				{ dialogueID: "locale_generic_obstacle_tight", category: "u", allowedTypes: [ localeTypes.maintenance ] },
				{ dialogueID: "locale_generic_obstacle_wall", category: "u", allowedTypes: [ localeTypes.farm, localeTypes.factory ] },
				{ dialogueID: "locale_generic_obstacle_watcher", category: "u", allowedTypes: [ localeTypes.bunker, localeTypes.library ] },
			];

			let localeType = localeVO.type;
			let numExplorers = this.playerStatsNodes.head.explorers.getParty().length;
			
			let possibleObstacles = [];

			for (let i = 0; i < allObstacles.length; i++) {
				let obstacle = allObstacles[i];
				if (obstacle.category && obstacle.category != localeCategory) continue;
				if (obstacle.allowedTypes && obstacle.allowedTypes.indexOf(localeType) < 0) continue;
				if (obstacle.disallowedTypes && obstacle.disallowedTypes.indexOf(localeType) >= 0) continue;
				if (obstacle.requiresExplorers && numExplorers < 1) continue;
				possibleObstacles.push(obstacle.dialogueID);
			}

			return MathUtils.randomElement(possibleObstacles);
		},

		useSpring: function () {
			let sector = this.playerLocationNodes.head.entity;
			let sectorFeatures = sector.get(SectorFeaturesComponent);
			let springName = TextConstants.getSpringName(sectorFeatures);

			let logMsgFailBase = "Approached the " + springName + ", but got attacked. ";
			
			let messages = {
				popupTitle: springName,
				id: LogConstants.MSG_ID_USE_SPRING,
				msgSuccess: "Refilled water at the " + springName + ".",
				msgFlee: logMsgFailBase + "Fled empty-handed.",
				msgDefeat: logMsgFailBase + "Lost the fight.",
				addToLog: false,
			};

			this.handleOutActionResults("use_spring", messages, true, false);
		},

		clearWorkshop: function () {
			let playerPosition = this.playerPositionNodes.head.position;
			let workshopComponent = this.playerLocationNodes.head.entity.get(WorkshopComponent);
			let resourceName = workshopComponent.resource;
			
			let currentLevel = playerPosition.level;
			let campOrdinal = GameGlobals.gameState.getCampOrdinal(currentLevel);
			let campLevel = GameGlobals.gameState.getLevelForCamp(campOrdinal);
			
			let action = "clear_workshop";
			let workshopName = TextConstants.getWorkshopName(workshopComponent.resource);

			let baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(action);
			let localeId = FightConstants.getEnemyLocaleId(baseActionID, action);
			let sectorControlComponent = this.playerLocationNodes.head.entity.get(SectorControlComponent);
			let numEnemies = sectorControlComponent.getCurrentEnemies(localeId);

			let playerActionFunctions = this;
			let successCallback = function (cb) {
				GameGlobals.playerActionFunctions.unlockFeature("resource_" + resourceName);
				playerActionFunctions.engine.getSystem(UIOutLevelSystem).rebuildVis();
				cb();
				GlobalSignals.workshopClearedSignal.dispatch();
			};

			let introDialogueID = "locale_workshop_" + resourceName + "_intro";
			let outroDialogueID = "locale_workshop_" + resourceName + "_outro";
			let successLogMsgKey = "ui.actions.clear_workshop_" + resourceName + "_completed_message";
			
			this.startSequence([
				{ id: "intro", type: "dialogue", dialogueID: introDialogueID },
				{ id: "fight", type: "fight", numEnemies: numEnemies, action: action, branches: { "WIN": "outro", "LOSE": "END", "FLEE": "END" } },
				{ id: "outro", type: "dialogue", dialogueID: outroDialogueID, textParams: { campLevel: campLevel } },
				{ id: "log", type: "log", textKey: successLogMsgKey, textParams: { campLevel: campLevel} },
				{ id: "results", type: "custom", f: successCallback },
			], workshopName);
		},

		clearWaste: function (action, direction) {
			let sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			let positionComponent = this.playerLocationNodes.head.entity.get(PositionComponent);
			let passagesComponent = this.playerLocationNodes.head.entity.get(PassagesComponent);
			let blocker = passagesComponent.getBlocker(direction);
			
			if (!blocker) {
				log.w("can't clear waste - no blocker here");
				return;
			}

			let sys = this;
			let successCallback = function () {
				var sectorPos = positionComponent.level + "." + positionComponent.sectorId() + "." + direction;
				sys.clearBlocker(action, blocker.type, sectorPos);
			};
			
			let logMsgFailBase = "Tried to clear the waste. ";
			
			let messages = {
				id: LogConstants.MSG_ID_CLEAR_WASTE,
				msgSuccess: "Cleared the waste. The area is now safe to pass through.",
				msgFlee: logMsgFailBase + "Fled before completing the operation.",
				msgDefeat: logMsgFailBase + "Lost the fight.",
				addToLog: true,
			};

			this.handleOutActionResults(action, messages, true, false, successCallback);
		},

		bridgeGap: function (sectorPos) {
			let position = this.getPositionVO(sectorPos);
			this.clearBlocker("bridge_gap", MovementConstants.BLOCKER_TYPE_GAP, sectorPos);
			GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_BRIDGED_GAP, "Built a bridge.", { position: position, visibility: LogConstants.MGS_VISIBILITY_LEVEL });
		},
		
		clearDebris: function (sectorPos) {
			let position = this.getPositionVO(sectorPos);
			let playerPos = this.playerPositionNodes.head.position;
			this.clearBlocker("clear_debris", MovementConstants.BLOCKER_TYPE_DEBRIS, sectorPos);
			let msg = "Debris cleared at " + position.getInGameFormat(position.level !== playerPos.level);
			GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_CLEAR_DEBRIS, msg, { position: position, visibility: LogConstants.MGS_VISIBILITY_LEVEL });
		},

		clearExplosives: function (sectorPos) {
			let position = this.getPositionVO(sectorPos);
			let playerPos = this.playerPositionNodes.head.position;
			this.clearBlocker("clear_explosives", MovementConstants.BLOCKER_TYPE_EXPLOSIVES, sectorPos);
			let msg = "Explosives cleared at " + position.getInGameFormat(position.level !== playerPos.level);
			GameGlobals.playerHelper.addLogMessage(LogConstants.getUniqueID(), msg, { position: position, visibility: LogConstants.MGS_VISIBILITY_LEVEL });
		},

		clearTollGate: function (direction) {
			let positionComponent = this.playerLocationNodes.head.entity.get(PositionComponent);
			let passagesComponent = this.playerLocationNodes.head.entity.get(PassagesComponent);
			let blocker = passagesComponent.getBlocker(direction);
			
			if (!blocker) {
				log.w("can't clear toll gate - no blocker here");
				return;
			}

			var sectorPos = positionComponent.level + "." + positionComponent.sectorId() + "." + direction;
			this.clearBlocker("clear_gate", MovementConstants.BLOCKER_TYPE_TOLL_GATE, sectorPos);
			GameGlobals.playerHelper.addLogMessage(LogConstants.getUniqueID(), "Paid for passage.");
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
			let sys = this;
			let excursionComponent = sys.playerStatsNodes.head.entity.get(ExcursionComponent);
			let hasSleepingBag = sys.playerStatsNodes.head.items.getCountById("exploration_2") > 0;

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
							GameGlobals.uiFunctions.onPlayerPositionChanged(); // reset cooldowns
							if (excursionComponent) excursionComponent.numNaps++;
							GameGlobals.gameState.increaseGameStatSimple("numTimesRestedOutside");
							sys.playerStatsNodes.head.vision.value = Math.min(sys.playerStatsNodes.head.vision.value, PlayerStatConstants.VISION_BASE);
							let logMsgFail = "Tried to rest but got attacked.";
							let messages = {
								id: LogConstants.MSG_ID_NAP,
								msgSuccess: hasSleepingBag ? 
									"Found a bench and rolled up in the sleeping bag, trying to get some rest." :
									"Found a bench to sleep on. Barely feel rested.",
								msgFlee: logMsgFail,
								msgDefeat: logMsgFail,
								addToLog: true,
							};
							sys.handleOutActionResults("nap", messages, false, false,
								function () {
									let staminaGained = PlayerStatConstants.getStaminaGainedFromNap(hasSleepingBag);
									sys.playerStatsNodes.head.stamina.stamina += staminaGained;
								},
							);
						}, 300);
					});
				}
			);
		},

		getUp: function () {
			this.playerStatsNodes.head.vision.isAwake = true;
			this.completeAction("get_up");
			GlobalSignals.visionChangedSignal.dispatch();
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
							GameGlobals.uiFunctions.onPlayerPositionChanged(); // reset cooldowns
							let msgFail = "Settled down to pass some time but got attacked.";
							let messages = {
								id: LogConstants.MSG_ID_WAIT,
								msgSuccess:  "Waited some time.",
								msgFlee: msgFail,
								msgDefeat: msgFail,
								addToLog: false,
							};
							sys.handleOutActionResults("wait", messages, false, false);
						}, 720);
					});
				}
			);
		},

		handleOutActionResults: function (action, messages, showResultPopup, hasCustomReward, successCallback, failCallback) {
			this.currentAction = action;

			setTimeout(function () {
				GameGlobals.playerActionFunctions.handleOutActionResultsInternal(action, messages, showResultPopup, hasCustomReward, successCallback, failCallback);
			}, 1);
		},

		handleOutActionResultsInternal: function (action, messages, showResultPopup, hasCustomReward, successCallback, failCallback) {
			let logMsgId = messages.id || LogConstants.getUniqueID();
			
			let playerActionFunctions = this;
			GameGlobals.fightHelper.handleRandomEncounter(action, function () {
				// if no fight or fight won
				let rewards = GameGlobals.playerActionResultsHelper.getResultVOByAction(action, hasCustomReward);
				playerActionFunctions.handleActionRewards(action, rewards, messages, successCallback, showResultPopup);
				playerActionFunctions.completeAction(action);
			}, function () {
				// if fled (either before fight or mid-fight)
				let fleeRewards = GameGlobals.playerActionResultsHelper.getResultVOByAction("flee");
				let fleeMessages = { addToLog: false, msgSuccess: messages.msgFlee };
				playerActionFunctions.handleActionRewards("flee", fleeRewards, fleeMessages, successCallback, showResultPopup);
				if (messages.addToLog && messages.msgFlee) GameGlobals.playerHelper.addLogMessage(logMsgId, messages.msgFlee);
				if (failCallback) failCallback();
				playerActionFunctions.completeAction(action);
			}, function () {
				// if fight lost
				if (messages.addToLog && messages.msgDefeat) GameGlobals.playerHelper.addLogMessage(logMsgId, messages.msgDefeat);
				if (failCallback) failCallback();
				playerActionFunctions.completeAction(action);
			});
		},

		handleActionRewards: function (action, rewards, messages, callback, showResultPopup) {
			let baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(action);

			let popupTitle = messages.popupTitle || TextConstants.getActionName(baseActionID);
			let popupMsg = messages.msgSuccess;

			let logMsg = messages.msgSuccess;
					
			if (messages.addToLog && logMsg) {
				let logMsgId = messages.id || LogConstants.getUniqueID();
				GameGlobals.playerHelper.addLogMessage(logMsgId, logMsg);
			}

			this.handleRewards(rewards, callback, showResultPopup, popupTitle, popupMsg);
		},

		handleRewards: function (rewards, callback, showResultPopup, popupTitle, popupMsg) {			
			let player = this.playerStatsNodes.head.entity;

			player.add(new PlayerActionResultComponent(rewards));
			
			let messages1 = GameGlobals.playerActionResultsHelper.getResultMessagesBeforeSelection(rewards);
			
			let discoveredGoods = GameGlobals.playerActionResultsHelper.saveDiscoveredGoods(rewards);
			if (discoveredGoods.items && discoveredGoods.items.length > 0) {
				let discoveredGoodsText = "Found a source of " + TextConstants.getListText(discoveredGoods.items.map(item => ItemConstants.getItemDisplayName(item).toLowerCase()));
				messages1.push({ id: LogConstants.getUniqueID(), text: discoveredGoodsText, addToPopup: true, addToLog: true });
			}

			showResultPopup = showResultPopup || !GameGlobals.playerHelper.canTakeAllRewards(rewards);
			showResultPopup = showResultPopup || GameGlobals.playerHelper.hasRewardsThatRequireResultPopup(rewards);
			showResultPopup = showResultPopup && !GameGlobals.gameState.uiStatus.isHidden;
			
			for (let i = 0; i < messages1.length; i++) {
				if (messages1[i].addToPopup) {
					popupMsg += " " + TextConstants.sentencify(messages1[i].text);
				}
			}
			
			let playerActionFunctions = this;
			let resultPopupCallback = function (isTakeAll) {
				let collected = GameGlobals.playerActionResultsHelper.collectRewards(isTakeAll, rewards);
				
				if (collected) {
					playerActionFunctions.logResultMessages(messages1);
				}
				
				player.remove(PlayerActionResultComponent);
				if (callback) callback();
				if (collected) {
					let messages2 = GameGlobals.playerActionResultsHelper.getResultMessagesAfterSelection(rewards);
					playerActionFunctions.logResultMessages(messages2);
					playerActionFunctions.forceTabUpdate();
				}
				GlobalSignals.inventoryChangedSignal.dispatch();
				GlobalSignals.actionRewardsCollectedSignal.dispatch();
			};
			
			GameGlobals.playerActionResultsHelper.preCollectRewards(rewards);
			
			if (showResultPopup) {
				GameGlobals.uiFunctions.showResultPopup(popupTitle, popupMsg, rewards, resultPopupCallback);
			} else {
				GameGlobals.uiFunctions.showResultFlyout(rewards);
				resultPopupCallback(true);
			}
		},
		
		startInventoryManagement: function () {
			let player = this.playerStatsNodes.head.entity;
			let resultVO = new ResultVO("manage_inventory");
			
			player.add(new PlayerActionResultComponent(resultVO));
			
			let cb = function (isTakeAll) {
				player.remove(PlayerActionResultComponent);
				GameGlobals.playerActionResultsHelper.collectRewards(isTakeAll, resultVO);
				GlobalSignals.inventoryChangedSignal.dispatch();
			};
			
			let options = {
				forceShowInventoryManagement: true,
			};
			
			GameGlobals.uiFunctions.showResultPopup("Manage inventory", "", resultVO, cb, options);
		},
		
		logResultMessages: function (messages) {
			for (let i = 0; i < messages.length; i++) {
				let message = messages[i];
				if (message.addToLog) {
					this.addLogMessage(message.id, message.text || message.textVO, null, message.visibility);
				}
			}
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
			let resultMessageVO = GameGlobals.playerActionResultsHelper.getRewardsTextVO(result);
			let logMessage = "A trade caravan returned from " + tradePartner.name + ". " + Text.compose(resultMessageVO);
			let pendingPosition = campSector.get(PositionComponent).clone();
			pendingPosition.inCamp = true;

			for (let key in resourceNames) {
				let name = resourceNames[key];
				let soldAmount = caravan.sellGood === name ? caravan.sellAmount : 0;
				let boughtAmount = result.selectedResources.getResource(name);

				GameGlobals.gameState.increaseGameStatKeyed("amountResourcesSoldPerName", name, soldAmount);
				GameGlobals.gameState.increaseGameStatKeyed("amountResourcesBoughtPerName", name, boughtAmount);
			}

			if (result.selectedItems) {
				for (let i = 0; i < result.selectedItems.length; i++) {
					let itemID = result.selectedItems[i].id;
					GameGlobals.gameState.increaseGameStatKeyed("numItemsBoughtPerId", itemID);
				}
			}

			campOutgoingCaravansComponent.outgoingCaravans.splice(caravanI, 1);

			GameGlobals.playerActionResultsHelper.collectRewards(true, result, { campSector: campSector });
			GameGlobals.resourcesHelper.moveCurrencyFromBagToCamp(campSector);
			this.completeAction("send_caravan");
			
			this.addLogMessage(LogConstants.MSG_ID_FINISH_SEND_CAMP, logMessage, pendingPosition);
			GlobalSignals.inventoryChangedSignal.dispatch();
			GlobalSignals.caravanReturnedSignal.dispatch();
		},

		tradeWithCaravan: function () {
			GameGlobals.uiFunctions.popupManager.closePopup("incoming-caravan-popup");

			let traderComponent = this.playerLocationNodes.head.entity.get(TraderComponent);
			let caravan = traderComponent.caravan;

			// items
			let itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
			let item;
			let value;

			for (let i in caravan.traderSelectedItems) {
				item = caravan.traderSelectedItems[i];
				value = TradeConstants.getItemValue(item, true, false);
				let j = caravan.sellItems.indexOf(item);
				if (j >= 0) {
					caravan.sellItems.splice(j, 1);
				} else {
					log.w("could not find bought item in caravan");
				}
				GameGlobals.playerHelper.addItem(item, item.level);
				GameGlobals.gameState.increaseGameStatKeyed("numItemsBoughtPerId", item.id);
				GameGlobals.gameState.increaseGameStatHighScore("highestPriceItemBought", item.id, value);
			}

			for (let i in caravan.campSelectedItems) {
				item = caravan.campSelectedItems[i];
				value = TradeConstants.getItemValue(item, false, true);
				caravan.sellItems.push(item);
				itemsComponent.removeItem(itemsComponent.getItem(item.id, item.itemID, true, false), false);
				GameGlobals.gameState.increaseGameStatKeyed("numItemsSoldPerId", item.id);
				GameGlobals.gameState.increaseGameStatHighScore("highestPriceItemSold", item.id, value);
			}

			// resources
			let campStorage = GameGlobals.resourcesHelper.getCurrentStorage();
			for (var key in resourceNames) {
				var name = resourceNames[key];
				var traderSelectedAmount = caravan.traderSelectedResources.getResource(name);
				if (traderSelectedAmount > 0) {
					caravan.sellResources.addResource(name, -traderSelectedAmount);
					campStorage.resources.addResource(name, traderSelectedAmount);
					GameGlobals.gameState.increaseGameStatKeyed("amountResourcesBoughtPerName", name, traderSelectedAmount);
				}
				var campSelectedAmount = caravan.campSelectedResources.getResource(name);
				if (campSelectedAmount > 0) {
					caravan.sellResources.addResource(name, campSelectedAmount);
					campStorage.resources.addResource(name, -campSelectedAmount);
					GameGlobals.gameState.increaseGameStatKeyed("amountResourcesSoldPerName", name, campSelectedAmount);
				}
			}

			// currency
			let currencyComponent = GameGlobals.resourcesHelper.getCurrentCurrency();
			if (caravan.traderSelectedCurrency > 0) {
				caravan.currency -= caravan.traderSelectedCurrency;
				currencyComponent.currency += caravan.traderSelectedCurrency;
				GameGlobals.playerActionFunctions.unlockFeature("currency");
			}

			if (caravan.campSelectedCurrency) {
				caravan.currency += caravan.campSelectedCurrency;
				currencyComponent.currency -= caravan.campSelectedCurrency;
			}

			caravan.clearSelection();
			caravan.tradesMade++;
			GameGlobals.gameState.increaseGameStatSimple("numTradesMade");
			
			GlobalSignals.inventoryChangedSignal.dispatch();
			GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_TRADE_WITH_CARAVAN, "Traded with a caravan.");
		},
		
		recruitExplorer: function (explorerId) {
			let recruitComponent = GameGlobals.campHelper.findRecruitComponentWithExplorerId(explorerId);
			
			if (!recruitComponent) {
				log.w("no recruit found: " + explorerId);
				return;
			}
			
			this.playerStatsNodes.head.explorers.addExplorer(recruitComponent.explorer);
			recruitComponent.isRecruited = true;
			
			GameGlobals.playerActionFunctions.unlockFeature("explorers");
			GameGlobals.gameState.increaseGameStatSimple("numExplorersRecruited");
			GlobalSignals.explorersChangedSignal.dispatch();
			
			GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_RECRUIT, "Recruited a new explorer.", { visibility: LogConstants.MSG_VISIBILITY_CAMP });
		},

		startExplorerDialogue: function (explorerID) {
			// start dialogue with an explorer that has been recruited by ID

			let explorersComponent = this.playerStatsNodes.head.explorers;
			let explorerVO = explorersComponent.getExplorerByID(explorerID);
			let setting = "interact";

			if (!explorerVO) {
				let recruitComponent = GameGlobals.campHelper.findRecruitComponentWithExplorerId(explorerID);
				explorerVO = recruitComponent.explorer;
				setting = "event";
			}

			GameGlobals.dialogueHelper.updateExplorerDialogueSource(explorerVO);
			let dialogueID = GameGlobals.dialogueHelper.getExplorerDialogueKey(explorerVO, setting);

			this.startDialogue(dialogueID, explorerVO);
		},

		startVisitorDialogue: function () {
			let campSector = this.nearestCampNodes.head.entity;
			if (!campSector) return;
			let visitorComponent = campSector.get(VisitorComponent);

			let characterVO = visitorComponent.characterVO;
			if (!characterVO) return;

			let setting = DialogueConstants.dialogueSettings.event;
			let dialogueID = GameGlobals.dialogueHelper.getNextCharacterDialogueID(characterVO, setting, 30);

			let now = new Date().getTime();
			characterVO.lastShownDialogue = dialogueID;
			characterVO.lastShownDialogueTimestamp = now;

			visitorComponent.hasInteracted = true;

			this.startDialogue(dialogueID, null, characterVO);
		},

		startRefugeeDialogue: function () {
			let campSector = this.nearestCampNodes.head.entity;
			if (!campSector) return;
			let refugeesComponent = campSector.get(RefugeesComponent);

			let characterVO = refugeesComponent.characterVO;
			if (!characterVO) return;

			let setting = DialogueConstants.dialogueSettings.event;
			let dialogueID = GameGlobals.dialogueHelper.getRandomValidCharacterDialogueID(characterVO, setting);

			let textParams = { num: refugeesComponent.num };

			this.startDialogue(dialogueID, null, characterVO, textParams);
		},

		startInNPCDialogue: function (characterID) {
			// start dialogue with a camp NPC found in current location by index

			let campSector = this.nearestCampNodes.head.entity;
			if (!campSector) return;
			let campComponent = campSector.get(CampComponent);

			let characterVO = campComponent.displayedCharacters.find(v => v.instanceID == characterID);
			if (!characterVO) return;

			let setting = DialogueConstants.dialogueSettings.interact;
			let dialogueID = GameGlobals.dialogueHelper.getRandomValidCharacterDialogueID(characterVO, setting);

			this.startDialogue(dialogueID, null, characterVO);
		},

		startOutNPCDialogue: function (characterID) {
			// start dialogue with an outside NPC found in current location by ID

			let sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			let characterVO = null;

			for (let i = 0; i < sectorStatus.currentCharacters.length; i++) {
				let sectorCharacterVO = sectorStatus.currentCharacters[i];
				if (sectorCharacterVO.instanceID == characterID) {
					characterVO = sectorCharacterVO;
					break;
				}
			}

			if (!characterVO) {
				log.w("did not find character for starting dialogue");
				return;
			}

			let setting = DialogueConstants.dialogueSettings.meet;
			let dialogueID = GameGlobals.dialogueHelper.getNextCharacterDialogueID(characterVO, setting);

			let now = new Date().getTime();
			characterVO.lastShownDialogue = dialogueID;
			characterVO.lastShownDialogueTimestamp = now;

			this.startDialogue(dialogueID, null, characterVO);
		},
		
		dismissRecruit: function (explorerId) {
			log.i("dismiss recruit: " + explorerId);
			let recruitComponent = GameGlobals.campHelper.findRecruitComponentWithExplorerId(explorerId);
			
			if (!recruitComponent) {
				log.w("no recruit found: " + explorerId);
				return;
			}

			let explorer = recruitComponent.explorer;

			if (!GameGlobals.explorerHelper.isDismissable(explorer)) {
				log.w("not allowed to dismiss explorer " + explorer.id);
				return;
			}
			
			recruitComponent.isDismissed = true;
		},
		
		dismissExplorer: function (explorerID) {
			let explorersComponent = this.playerStatsNodes.head.explorers;
			let explorer = explorersComponent.getExplorerByID(explorerID);
			
			if (!explorer) {
				log.w("no such explorer: " + explorerID);
				return;
			}

			if (!GameGlobals.explorerHelper.isDismissable(explorer)) {
				log.w("can't dismiss explorer " + explorerID);
				return;
			}
			
			GameGlobals.uiFunctions.showConfirmation(
				"Are you sure you want to dismiss " + explorer.name + "?",
				function () {
					explorersComponent.removeExplorer(explorer);
					GameGlobals.gameState.increaseGameStatSimple("numExplorersDismissed");
					if (explorer.animalType != null) {
						GameGlobals.playerHelper.addLogMessage(LogConstants.getUniqueID(), explorer.name + " leaves.");
					} else {
						GameGlobals.playerHelper.addLogMessage(LogConstants.getUniqueID(), explorer.name + " leaves.");
					}
					GlobalSignals.explorersChangedSignal.dispatch();
				}
			);
		},

		healExplorer: function (explorerID) {
			let explorersComponent = this.playerStatsNodes.head.explorers;
			let explorerVO = explorersComponent.getExplorerByID(explorerID);
			
			if (!explorerVO) {
				log.w("no such explorer: " + explorerID);
				return;
			}
			
			explorerVO.injuredTimer = -1;
			
			GlobalSignals.explorersChangedSignal.dispatch();
		},

		acceptRefugees: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			let eventComponent = sector.get(RefugeesComponent);
			
			if (!eventComponent) return;
			if (eventComponent.isAccepted) return;

			let campComponent = sector.get(CampComponent);
			let numRefugees =  eventComponent.num || 1;

			GameGlobals.gameState.increaseGameStatSimple("numRefugeesAccepted", numRefugees);

			campComponent.addPopulation(numRefugees);
			campComponent.populationDecreaseCooldown = CampConstants.POPULATION_DECREASE_COOLDOWN_REFUGEES;

			eventComponent.isAccepted = true;
		},
		
		dismissRefugees: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			let eventComponent = sector.get(RefugeesComponent);
			
			if (!eventComponent) return;
			eventComponent.isDismissed = true;
		},
		
		selectExplorer: function (explorerID) {
			let explorersComponent = this.playerStatsNodes.head.explorers;
			let explorer = explorersComponent.getExplorerByID(explorerID);
			
			if (explorer.inParty) {
				log.w("explorer already in party");
				return;
			}
			
			if (!explorer) {
				log.w("no such explorer: " + explorerID);
				return;
			}
			
			let explorerType = ExplorerConstants.getExplorerTypeForAbilityType(explorer.abilityType);
			let previous = explorersComponent.getExplorerInPartyByType(explorerType);
			if (previous) {
				explorersComponent.setExplorerInParty(previous, false);
			}
			
			explorersComponent.setExplorerInParty(explorer, true);
			
			GlobalSignals.explorersChangedSignal.dispatch();
		},
		
		deselectExplorer: function (explorerID) {
			let explorersComponent = this.playerStatsNodes.head.explorers;
			let explorer = explorersComponent.getExplorerByID(explorerID);
			
			if (!explorer) {
				log.w("no such explorer: " + explorerID);
				return;
			}
			
			if (!explorer.inParty) {
				log.w("can't deselect explorer that is not in party");
				return;
			}
			
			explorersComponent.setExplorerInParty(explorer, false);
			GlobalSignals.explorersChangedSignal.dispatch();
		},

		fightGang: function (direction) {
			let action = "fight_gang_" + direction;
			let messages = { addToLog: false };

			let successCallback = function () {
				GameGlobals.playerActionFunctions.engine.getSystem(UIOutLevelSystem).rebuildVis();
			}
			
			this.handleOutActionResults(action, messages, false, false, successCallback);
		},

		despair: function () {
			let playerPos = this.playerPositionNodes.head.position;
			this.engine.getSystem(FaintingSystem).despair();
			GameGlobals.gameState.increaseGameStatKeyed("numTimesDespairedPerLevel", playerPos.level);
			GameGlobals.gameState.stats.numTimesDespaired++;
			this.completeAction("despair");
		},

		buildCamp: function () {
			var sector = this.playerLocationNodes.head.entity;
			var level = GameGlobals.levelHelper.getLevelEntityForSector(sector);
			var position = sector.get(PositionComponent).getPosition();
			var campOrdinal = GameGlobals.gameState.getCampOrdinal(position.level);
			if (GameGlobals.gameFlowLogger.isEnabled) log.i("Build camp " + position + " ordinal " + campOrdinal);
			var campComponent = new CampComponent(position.toString());
			campComponent.foundedTimeStamp = new Date().getTime();
			campComponent.foundedTimeStampGameTime = GameGlobals.gameState.gameTime;
			sector.add(campComponent);
			sector.add(new CampEventTimersComponent());
			sector.add(new OutgoingCaravansComponent());
			sector.add(new ReputationComponent());
			sector.add(new CurrencyComponent());

			level.add(campComponent);

			var improvementsComponent = sector.get(SectorImprovementsComponent);
			improvementsComponent.add(improvementNames.home);

			GameGlobals.playerActionFunctions.unlockFeature("camp");
			
			gtag('event', 'build_camp', { event_category: 'progression', event_label: campOrdinal });
			gtag('event', 'build_camp_time', { event_category: 'game_time', event_label: campOrdinal, value: GameGlobals.gameState.playTime });
			gtag('set', { 'max_camp': GameGlobals.gameState.numCamps });

			GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_BUILT_CAMP, "ui.log.built_camp_message", { visibility: LogConstants.MGS_VISIBILITY_LEVEL });
			if (position.level == 15) {
				GameGlobals.playerHelper.addLogMessage(LogConstants.getUniqueID(), "It will be difficult to trade resources with camps from below Level 14 from here.");
			}

			GameGlobals.gameState.numCamps++;
			GameGlobals.metaState.maxCampOrdinalReached = Math.max(GameGlobals.metaState.maxCampOrdinalReached, campOrdinal);
			
			GlobalSignals.improvementBuiltSignal.dispatch();
			GlobalSignals.campBuiltSignal.dispatch();
			this.save(GameConstants.SAVE_SLOT_DEFAULT);
			this.save(GameConstants.SAVE_SLOT_BACKUP);
		},

		buildPassageUpStairs: function (sectorPos) {
			this.buildPassage(sectorPos, true, MovementConstants.PASSAGE_TYPE_STAIRWELL, "build_out_passage_up_stairs", "build_out_passage_down_stairs");
		},

		buildPassageDownStairs: function (sectorPos) {
			this.buildPassage(sectorPos, false, MovementConstants.PASSAGE_TYPE_STAIRWELL, "build_out_passage_down_stairs", "build_out_passage_up_stairs");
			GameGlobals.gameState.setStoryFlag(StoryConstants.ESCAPE_PASSAGE_DOWN_BUILT, true);
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
				var msg = TextConstants.getPassageRepairedMessage(passageType, direction, sectorPosVO, GameGlobals.gameState.numCamps);
				this.buildImprovement(action, GameGlobals.playerActionsHelper.getImprovementNameForAction(action), sector);
				this.buildImprovement(neighbourAction, GameGlobals.playerActionsHelper.getImprovementNameForAction(neighbourAction), neighbour, true);
				GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_BUILT_PASSAGE, msg, { position: position, visibility: LogConstants.MSG_VISIBILITY_GLOBAL });
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
			let level = position.level;
			let campOrdinal = GameGlobals.gameState.getCampOrdinal(level);
			let campLevel = GameGlobals.gameState.getLevelForCamp(campOrdinal);
			
			// TODO use camp name in message if defined

			let msg = "Greenhouse is ready. Workers in camp on level " + campLevel + " can now use it.";
			
			this.buildImprovement(action, improvementNames.greenhouse, sector);
			GameGlobals.playerActionFunctions.unlockFeature("herbs");
			GameGlobals.playerHelper.addLogMessage(LogConstants.getUniqueID(), msg, { position: position, visibility: LogConstants.MSG_VISIBILITY_CAMP });
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
			let msg = "Resource outpost is ready. " + Text.capitalize(resourceName) + " is now available in all camps.";

			this.buildImprovement(action, improvementNames.luxuryOutpost, sector);
			GameGlobals.playerHelper.addLogMessage(LogConstants.getUniqueID(), msg, { position: position, visibility: LogConstants.MSG_VISIBILITY_CAMP });
		},
		
		buildTradeConnector: function (sectorPos) {
			var action = "build_out_tradepost_connector";
			var position = this.getPositionVO(sectorPos);
			var sector = this.getActionSector(action, sectorPos);
			this.buildImprovement(action, improvementNames.tradepost_connector, sector);
			GameGlobals.playerHelper.addLogMessage(LogConstants.getUniqueID(), "Great Elevator is ready.", { position: position, visibility: LogConstants.MSG_VISIBILITY_CAMP });
		},
		
		buildSundome: function (sectorPos) {
			let action = "build_out_sundome";
			let position = this.getPositionVO(sectorPos).getPositionInCamp();
			var sector = this.getActionSector(action, sectorPos);
			this.buildImprovement(action, improvementNames.sundome, sector);
			GameGlobals.playerHelper.addLogMessage(LogConstants.getUniqueID(), "Sundome is completed.", { position: position, visibility: LogConstants.MSG_VISIBILITY_CAMP });
		},
		
		improveOutImprovement: function (param) {
			let improvementID = param;
			let actionName = "improve_out_" + improvementID;
			let improvementName = improvementNames[improvementID];
			this.improveImprovement(actionName, improvementName);
		},

		buildTrap: function () {
			if (!this.playerLocationNodes.head.entity.has(SectorCollectorsComponent))
				this.playerLocationNodes.head.entity.add(new SectorCollectorsComponent());

			this.buildImprovement("build_out_collector_food", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_out_collector_food"));
			
			GlobalSignals.improvementBuiltSignal.dispatch();
		},

		buildBucket: function () {
			if (!this.playerLocationNodes.head.entity.has(SectorCollectorsComponent))
				this.playerLocationNodes.head.entity.add(new SectorCollectorsComponent());

			this.buildImprovement("build_out_collector_water", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_out_collector_water"));

			GlobalSignals.improvementBuiltSignal.dispatch();
		},
		
		buildBeacon: function () {
			let sector = this.playerLocationNodes.head.entity;
			sector.add(new BeaconComponent());
			this.buildImprovement("build_out_beacon", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_out_beacon"));
		},

		buildHouse: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			this.buildImprovement("build_in_house", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_house"), sector);
			GameGlobals.playerActionFunctions.unlockFeature("npcs");
		},

		buildHouse2: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			this.buildImprovement("build_in_house2", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_house2"), sector);
		},

		buildGenerator: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			this.buildImprovement("build_in_generator", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_generator"), sector);
		},

		buildLights: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			this.buildImprovement("build_in_lights", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_lights"), sector);
			var msg = "Installed lights in the camp.";
			GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_BUILT_LIGHTS, msg, { position: sector.get(PositionComponent).getPositionInCamp() });
		},

		buildStorage: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			this.buildImprovement("build_in_storage", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_storage"), sector);
		},

		buildFortification: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			this.buildImprovement("build_in_fortification", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_fortification"), sector);
			GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_BUILT_FORTIFICATION, "Fortified the camp.", { position: sector.get(PositionComponent).getPositionInCamp() });
		},

		buildAqueduct: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			this.buildImprovement("build_in_aqueduct", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_aqueduct"), sector);
		},

		buildStable: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			this.buildImprovement("build_in_stable", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_stable"), sector);
		},

		buildBarracks: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			this.buildImprovement("build_in_barracks", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_barracks"), sector);
		},

		buildSmithy: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			this.buildImprovement("build_in_smithy", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_smithy"), sector);
		},

		buildApothecary: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			this.buildImprovement("build_in_apothecary", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_apothecary"), sector);
		},

		buildCementMill: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			this.buildImprovement("build_in_cementmill", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_cementmill"), sector);
		},

		buildRobotFactory: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			this.buildImprovement("build_in_robotFactory", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_robotFactory"), sector);
		},

		buildRadioTower: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			this.buildImprovement("build_in_radiotower", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_radiotower"), sector);
		},

		buildCampfire: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			this.buildImprovement("build_in_campfire", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_campfire"), sector);
		},

		buildDarkFarm: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			this.buildImprovement("build_in_darkfarm", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_darkfarm"), sector);
		},

		buildHospital: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			this.buildImprovement("build_in_hospital", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_hospital"), sector);
		},

		buildLibrary: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			this.buildImprovement("build_in_library", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_library"), sector);
		},

		buildMarket: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			this.buildImprovement("build_in_market", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_market"), sector);
			GameGlobals.playerActionFunctions.unlockFeature("trade");
		},

		buildTradingPost: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			let improvementName = GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_tradepost");
			this.buildImprovement("build_in_tradepost", improvementName, sector);
		},

		buildInn: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			this.buildImprovement("build_in_inn", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_inn"), sector);
			GameGlobals.playerActionFunctions.unlockFeature("explorers");
		},

		buildSquare: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			this.buildImprovement("build_in_square", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_square"), sector);
		},

		buildGarden: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			this.buildImprovement("build_in_garden", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_garden"), sector);
		},
		
		buildShrine: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			this.buildImprovement("build_in_shrine", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_shrine"), sector);
		},
		
		buildTemple: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			this.buildImprovement("build_in_temple", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_temple"), sector);
		},
		
		buildResearchCenter: function (sectorPos) {
			let sector = this.getActionSectorOrCurrent(sectorPos);
			this.buildImprovement("build_in_researchcenter", GameGlobals.playerActionsHelper.getImprovementNameForAction("build_in_researchcenter"), sector);
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

			if (sector) {
				this.buildImprovement(action, GameGlobals.playerActionsHelper.getImprovementNameForAction(action), sector);
				if (GameGlobals.storyHelper.isReadyForLaunch(true)) {
					let msgOptions = { position: sectorPosVO.getPositionInCamp() };
					GameGlobals.playerHelper.addLogMessage(LogConstants.getUniqueID(), "The colony ship is ready to launch.", msgOptions);
				}
			} else {
				log.w("Couldn't find sectors for building space ship.");
				log.i(sector);
				log.i(sectorPos);
			}
		},
		
		improveBuilding: function (param) {
			// TODO define sector so that the action can have a duration
			let actionName = "improve_in_" + param;
			let improvementID = param;
			let improvementName = GameGlobals.playerActionsHelper.getImprovementNameForAction(actionName);
			
			this.improveImprovement(actionName, improvementName);
		},
		
		improveImprovement: function (actionName, improvementName, otherSector) {
			let sector = otherSector ? otherSector : this.playerLocationNodes.head.entity;
			let improvementsComponent = sector.get(SectorImprovementsComponent);
			let improvementID = ImprovementConstants.getImprovementID(improvementName);
			improvementsComponent.improve(improvementName);
			let level = improvementsComponent.getLevel(improvementName);
			GlobalSignals.improvementBuiltSignal.dispatch();
			GameGlobals.gameState.increaseGameStatKeyed("numBuildingImprovementsPerId", improvementID);
			this.save();
			
			let msg = ImprovementConstants.getImprovedLogMessageTextVO(improvementID, level);
			let messagePosition = sector.get(PositionComponent);
			let isProject = ImprovementConstants.isProject(improvementName);
			messagePosition.inCamp = getImprovementType(improvementName) === improvementTypes.camp || isProject;
			GameGlobals.playerHelper.addLogMessage("MSG_ID_IMPROVE_" + improvementName, msg, { position: messagePosition });
		},
		
		repairBuilding: function (param) {
			// TODO define action sector so that the action can have a duration
			let improvementID = param;
			let improvementName = improvementNames[improvementID];
			let sector = this.playerLocationNodes.head.entity;
			let improvementsComponent = sector.get(SectorImprovementsComponent);
			
			let vo = improvementsComponent.getVO(improvementName);
			vo.numDamaged--;
			
			let displayName = ImprovementConstants.getImprovementDisplayName(improvementID, vo.level);
			
			GlobalSignals.improvementBuiltSignal.dispatch();
			this.save();

			let msg = {
				textKey: "ui.log.repaired_building_message",
				textParams: { name: displayName },
			};
			GameGlobals.playerHelper.addLogMessage("MSG_ID_REPAIR_" + improvementName, msg, { position: sector.get(PositionComponent).getPositionInCamp() });
		},

		dismantleBuilding: function (param) {
			// TODO define action sector so that the action can have a duration
			let sector = this.playerLocationNodes.head.entity;
			let improvementsComponent = sector.get(SectorImprovementsComponent);
			let improvementID = GameGlobals.playerActionsHelper.getImprovementIDForAction("dismantle_" + param);
			let improvementName = improvementNames[improvementID];
			let level = improvementsComponent.getLevel(improvementName);
			let displayName = ImprovementConstants.getImprovementDisplayName(improvementID, level);
			let def = ImprovementConstants.improvements[improvementID];
			
			if (!def.canBeDismantled) return;
			
			let buildAction = "build_in_" + improvementID;
			let lastActionOrdinal = GameGlobals.playerActionsHelper.getActionOrdinalLast(buildAction);
			let buildingCostsFirst = GameGlobals.playerActionsHelper.getCosts(buildAction, 1, null, 1);
			let buildingCostsLast = GameGlobals.playerActionsHelper.getCosts(buildAction, 1, null, lastActionOrdinal);
			
			let msg = "Are you sure you want to dismantle this building? Only some of its building materials can be salvaged";
			let sys = this;
			
			GameGlobals.uiFunctions.showConfirmation(msg, function () {
				improvementsComponent.remove(improvementName);
				
				let campStorage = GameGlobals.resourcesHelper.getCurrentStorage();
				for (let key in buildingCostsFirst) {
					let resource = key.split("_")[1]
					let valueFirst = Math.max(buildingCostsFirst[key], 0);
					let valueLast = Math.max(buildingCostsLast[key], 0);
					let value = Math.round((valueFirst + valueLast) / 2 / 2);
					if (value > 0) {
						campStorage.resources.addResource(resource, value);
					}
				}
				
				GameGlobals.gameState.increaseGameStatKeyed("numBuildingsDismantledPerId", improvementID);
				GlobalSignals.improvementBuiltSignal.dispatch();
				sys.save();
				
				let msg = "Dismantled " + Text.addArticle(displayName);
				GameGlobals.playerHelper.addLogMessage("MSG_ID_DISMANTLE_" + improvementName, msg, { position: sector.get(PositionComponent).getPositionInCamp() });
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
			
			this.handlePerksOnFinishRest();
			
			this.completeAction("use_in_home");
			this.forceStatsBarUpdate();
		},

		handlePerksOnStartRest: function () {
			let perksComponent = this.playerStatsNodes.head.perks;

			// remove stamina bonus and queue hangover
			let hasStaminaPerk = perksComponent.hasPerk(PerkConstants.perkIds.staminaBonus);
			if (hasStaminaPerk) {
				perksComponent.removePerkById(PerkConstants.perkIds.staminaBonus);
				this.playerStatsNodes.head.stamina.isPendingPenalty = true;
			}

			// clear other perks removed by resting
			let perkIDs = [ PerkConstants.perkIds.cursed, PerkConstants.perkIds.stressed, PerkConstants.perkIds.accomplished, PerkConstants.perkIds.blessedShort ];
			for (let i = 0; i < perkIDs.length; i++) {
				let perkID = perkIDs[i];
				if (perksComponent.hasPerk(perkID)) perksComponent.removePerkById(perkID);
			}
		},

		handlePerksOnFinishRest: function () {
			// add stamina potion hangover
			if (this.playerStatsNodes.head.stamina.isPendingPenalty) {
				GameGlobals.playerHelper.addPerk(PerkConstants.perkIds.staminaBonusPenalty, PerkConstants.TIMER_DISABLED, 300);
				this.playerStatsNodes.head.stamina.isPendingPenalty = false;
			}
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
					let msg = "ui.actions.use_campfire_message";
					GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_USE_CAMPFIRE_SUCC, msg);
				} else {
					let msg = "ui.actions.use_campfire_failed_message";
					GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_USE_CAMPFIRE_FAIL, msg);
					campComponent.rumourpoolchecked = true;
				}
			} else {
				log.w("No camp sector found.");
			}
			this.completeAction("use_in_campfire");
			GameGlobals.playerActionFunctions.unlockFeature("rumours");
			
			GlobalSignals.tribeStatsChangedSignal.dispatch();
		},
		
		startCampfire: function () {
			var campSector = this.nearestCampNodes.head.entity;
			var campComponent = campSector.get(CampComponent);

			campComponent.campFireStarted = true;

			let msg = Text.t("ui.camp.campfire_started_message")
			GameGlobals.playerHelper.addLogMessage(LogConstants.getUniqueID(), msg);

			this.completeAction("use_in_campfire_2");
		},
		
		useMarket: function () {
			var campSector = this.nearestCampNodes.head.entity;
			var improvementsComponent = campSector.get(SectorImprovementsComponent);
			// TODO move this check to startAction
			if (campSector) {
				var marketLevel = improvementsComponent.getLevel(improvementNames.market);
				this.playerStatsNodes.head.rumours.value += GameGlobals.campBalancingHelper.getRumoursPerVisitMarket(marketLevel);
				GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_USE_MARKET, "ui.actions.use_in_market_completed_message");
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

			this.handlePerksOnFinishRest();

			this.completeAction("use_in_hospital");
			GameGlobals.playerActionFunctions.unlockFeature("fight");
		},

		useHospital2: function () {
			var perksComponent = this.playerStatsNodes.head.perks;
			if (perksComponent.hasPerk(PerkConstants.perkIds.healthBonus2)) {
				perksComponent.removePerkById(PerkConstants.perkIds.healthBonus2);
				perksComponent.addPerk(PerkConstants.getPerk(PerkConstants.perkIds.healthBonus3));
			} else {
				perksComponent.addPerk(PerkConstants.getPerk(PerkConstants.perkIds.healthBonus2));
			}
			GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_USE_HOSPITAL2, "Augmentation complete.");
			this.completeAction("use_in_hospital_2");
		},
		
		useLibrary: function () {
			let campSector = this.nearestCampNodes.head.entity;
			let campComponent = campSector.get(CampComponent);
			let improvementsComponent = campSector.get(SectorImprovementsComponent);
			if (!campSector) {
				log.w("No camp sector found.");
				return;
			}
			
			let libraryLevel = improvementsComponent.getLevel(improvementNames.library);
			this.playerStatsNodes.head.evidence.value += GameGlobals.campBalancingHelper.getEvidencePerUseLibrary(libraryLevel);
			GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_USE_LIBRARY, "ui.log.use_library_message");

			this.completeAction("use_in_library");
		},

		useTemple: function () {
			this.playerStatsNodes.head.entity.get(HopeComponent).hope += CampConstants.HOPE_PER_DONATION;
			this.completeAction("use_in_temple");
			GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_USE_TEMPLE, "ui.log.use_temple_message");
			GlobalSignals.inventoryChangedSignal.dispatch();
			this.forceStatsBarUpdate();
		},

		useShrine: function () {
			let hopeComponent = this.playerStatsNodes.head.entity.get(HopeComponent);
			if (!hopeComponent) return;
			let campSector = this.nearestCampNodes.head.entity;
			let improvementsComponent = campSector.get(SectorImprovementsComponent);
			
			if (campSector) {
				let shrineLevel = improvementsComponent.getLevel(improvementNames.shrine);
				let successChance = GameGlobals.campBalancingHelper.getMeditationSuccessRate(shrineLevel);
				log.i("meditation success chance: " + successChance)
				if (Math.random() < successChance) {
					hopeComponent.hope += 1;
					GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_USE_SHRINE, "ui.log.use_shrine_success_message");
				} else {
					GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_USE_SHRINE, "ui.log.use_shrine_fail_message");
				}
			}
			
			this.completeAction("use_in_shrine");
			this.forceStatsBarUpdate();
		},

		craftItem: function (itemId) {
			let actionName = "craft_" + itemId;
			let item = GameGlobals.playerActionsHelper.getItemForCraftAction(actionName);
			let level = ItemConstants.getRandomItemLevel(ItemConstants.itemSource.crafting, item);
			GameGlobals.playerHelper.addItem(item, level);

			if (item.type === ItemConstants.itemTypes.weapon)
				GameGlobals.playerActionFunctions.unlockFeature("fight");

			if (item.type == ItemConstants.itemTypes.light) {
				GameGlobals.playerActionFunctions.unlockFeature("vision");
			}

			GameGlobals.gameState.increaseGameStatSimple("numItemsCrafted");
			GameGlobals.gameState.increaseGameStatList("uniqueItemsCrafted", itemId);

			GlobalSignals.inventoryChangedSignal.dispatch();
			this.save();
		},

		equipItem: function (itemInstanceId) {
			var playerPos = this.playerPositionNodes.head.position;
			var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
			var item = itemsComponent.getItem(null, itemInstanceId, playerPos.inCamp, false, item => item.equippable);
			GameGlobals.gameState.increaseGameStatList("uniqueItemsEquipped", item.id);
			itemsComponent.equip(item);
			this.completeAction("equip");
			GlobalSignals.equipmentChangedSignal.dispatch();
		},

		unequipItem: function (itemID) {
			var playerPos = this.playerPositionNodes.head.position;
			var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
			var item = itemsComponent.getItem(itemID, null, playerPos.inCamp, true);
			itemsComponent.unequip(item);
			this.completeAction("unequip");
			GlobalSignals.equipmentChangedSignal.dispatch();
		},

		discardItem: function (itemID) {
			var playerPos = this.playerPositionNodes.head.position;
			var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
			var item = itemsComponent.getItem(itemID, null, playerPos.inCamp, false) || itemsComponent.getItem(itemID, null, playerPos.inCamp, true);
			GameGlobals.uiFunctions.showConfirmation(
				"Are you sure you want to discard this item?",
				function () {
					itemsComponent.discardItem(item, playerPos.inCamp, false);
					GlobalSignals.equipmentChangedSignal.dispatch();
				}
			);
		},
		
		repairItem: function (itemInstanceId) {
			let itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
			let itemVO = itemsComponent.getItem(null, itemInstanceId, true, true, item => item.repairable);
			if (!itemVO) return;
			GameGlobals.gameState.increaseGameStatSimple("numItemsRepaired");
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
			let sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			
			let item = deductedCosts.items[0];
			if (!item) {
				log.w("trying to use item but none found in deductedCosts");
			}
			let itemName = ItemConstants.getItemDisplayName(item);

			var foundPosition = item.foundPosition || playerPos;
			var foundPositionCampOrdinal = GameGlobals.gameState.getCampOrdinal(foundPosition.level);
			let resultVO = new ResultVO("use_item");
			
			let itemConfig = ItemConstants.getItemDefinitionByID(itemId);
			let baseItemId = ItemConstants.getBaseItemID(itemId);
			let itemShortName = ItemConstants.getItemDisplayName(item, true);
			let currentStorage = GameGlobals.resourcesHelper.getCurrentStorage();
			
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
					GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_USE_FIRST_AID_KIT, "Used a first aid kit.");
					this.forceStatsBarUpdate();
					break;
				
				case "stamina_potion":
					GameGlobals.playerHelper.addPerk(PerkConstants.perkIds.staminaBonus);
					this.engine.updateComplete.addOnce(function () {
						GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_USE_STAMINA_POTION, "Feeling stronger and more awake.");
						sys.playerStatsNodes.head.stamina.stamina += PlayerStatConstants.STAMINA_GAINED_FROM_POTION_1;
						sys.engine.updateComplete.addOnce(function () {
							sys.forceStatsBarUpdate();
						});
					});
					break;

				case "glowstick":
					sectorStatus.glowStickSeconds = 120;
					break;
					
				case "cache_metal":
					let baseValue = itemConfig.configData.metalValue || 10;
					let variation = Math.min(baseValue / 4, 5);
					let value = baseValue + MathUtils.randomIntBetween(-variation, variation);
					let logMsg = { textKey: "ui.actions.use_cache_metal_message", textParams: { name: Text.addArticle(itemShortName), value: value } };
					currentStorage.resources.addResource(resourceNames.metal, value);
					GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_USE_METAL_CACHE, logMsg);
					break;
					
				case "cache_food":
				case "cache_water":
					let suppliesCacheRewards = GameGlobals.playerActionResultsHelper.getUseItemRewards(itemId);
					let suppliesResultMsg = GameGlobals.playerActionResultsHelper.getRewardsMessageText(suppliesCacheRewards);
					GameGlobals.playerActionResultsHelper.collectRewards(true, suppliesCacheRewards);
					GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_USE_SUPPLIES_CACHE, "Used " + Text.addArticle(itemName) + ". " + suppliesResultMsg);
					break;

				case "cache_robots":
					let robotsCacheRewards = GameGlobals.playerActionResultsHelper.getUseItemRewards(itemId);
					GameGlobals.playerActionResultsHelper.collectRewards(true, robotsCacheRewards);
					GameGlobals.playerHelper.addLogMessage(LogConstants.getUniqueID(), "Repaired the Robot and took it to the Factory.");
					break;
					
				case "cache_evidence":
					let evidence = itemConfig.configData.evidenceValue || Math.pow(itemConfig.level, 2);
					message = TextConstants.getReadBookMessage(
						item, 
						itemConfig.configData.bookType || ItemConstants.bookTypes.science, 
						foundPositionCampOrdinal,
						GameGlobals.gameState.storyFlags
					);
					resultVO.gainedEvidence = evidence;
					GameGlobals.uiFunctions.showInfoPopup(
						itemName,
						message,
						"Continue",
						resultVO
					);
					this.playerStatsNodes.head.evidence.value += evidence;
					GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_USE_BOOK, "Read a book. Gained " + evidence + " evidence.");
					break;
				
				case "cache_rumours":
					let rumours = itemConfig.configData.rumoursValue || Math.pow(itemConfig.level, 2);
					message = TextConstants.getReadNewspaperMessage(item);
					resultVO.gainedRumours = rumours;
					GameGlobals.uiFunctions.showInfoPopup(
						itemName,
						message,
						"Continue",
						resultVO
					);
					this.playerStatsNodes.head.rumours.value += rumours;
					GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_USE_NEWSPAPER, "Read a newspaper. Gained " + rumours + " rumours.");
					break;
				
				case "cache_hope":
					let hope = itemConfig.configData.hopeValue || Math.pow(itemConfig.level, 2);
					message = TextConstants.getDonateSeedsMessage(item);
					resultVO.gainedHope = hope;
					GameGlobals.uiFunctions.showInfoPopup(
						itemName,
						message,
						"Continue",
						resultVO
					);
					this.playerStatsNodes.head.entity.get(HopeComponent).hope += hope;
					GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_USE_SEED, "Donated seeds. Gained " + hope + " favour.");
					break;
				
				case "cache_insight":
					let insight = ItemConstants.getInsightForCache(itemConfig);
					message = TextConstants.getReadResearchPaperMessage(item);
					resultVO.gainedInsight = insight;
					GameGlobals.uiFunctions.showInfoPopup(
						itemName,
						message,
						"Continue",
						resultVO
					);
					this.playerStatsNodes.head.insight.value += insight;
					GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_USE_RESEARCHPAPER, "Read a research paper. Gained " + insight + " insight.");
					break;
				
				case "document":
					resultVO.gainedEvidence = ExplorationConstants.getScoutLocaleEvidenceReward(null, 10);
					if (itemConfig.configData.noteDialogue) {
						this.startSequence([
							{ type: "dialogue", dialogueID: itemConfig.configData.noteDialogue },
						], ItemConstants.getItemDisplayNameKey(itemConfig));
					} else {
						let message = Text.t(itemConfig.configData.noteText);
						GameGlobals.uiFunctions.showInfoPopup(
							itemName,
							message,
							"Continue",
							resultVO
						);
					}
					this.playerStatsNodes.head.evidence.value += resultVO.gainedEvidence;
					if (itemConfig.configData.storyFlag) {
						this.setStoryFlag(itemConfig.configData.storyFlag, true);
					}
					break;
				
				case "robot": 
					let explorerVO = ExplorerConstants.getNewRandomExplorer(ExplorerConstants.explorerSource.CRAFT, foundPositionCampOrdinal, foundPosition.level);
					explorerVO.meetCampOrdinal = GameGlobals.gameState.numCamps;
					
					this.playerStatsNodes.head.explorers.addExplorer(explorerVO);
					
					GameGlobals.gameState.increaseGameStatSimple("numExplorersRecruited");
					GlobalSignals.explorersChangedSignal.dispatch();
					
					GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_RECRUIT, "Robot repaired. It has joined the explorers.");
					break;

				case "consumable_graffiti":
					GameGlobals.uiFunctions.showInput("Graffiti", "Choose message to leave to this sector.", "", false,
						function (input) {
							sectorStatus.graffiti = input;
							GameGlobals.playerHelper.addLogMessage(LogConstants.getUniqueID(), "Left a message in the City.");
							GlobalSignals.actionCompletedSignal.dispatch();
						});
					GameGlobals.gameState.increaseGameStatSimple("numGraffitiMade");
					break;
					
				case "consumable_map":
					let sectorsToReveal = GameGlobals.playerActionResultsHelper.getSectorsRevealedByMap(foundPosition);
					let revealedSomething = false;
					for (let i = 0; i < sectorsToReveal.length; i++) {
						let statusComponent = sectorsToReveal[i].get(SectorStatusComponent);
						if (statusComponent.scouted) continue;
						if (statusComponent.revealedByMap) continue;
						if (statusComponent.pendingRevealByMap) continue;
						statusComponent.pendingRevealByMap = true;
						revealedSomething = true;
					}
					
					if (revealedSomething) {
						GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_USE_MAP_PIECE, "Recorded any useful information from the map.");
					} else {
						GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_USE_MAP_PIECE, "Checked the map, but there was nothing interesting there.");
					}
					
					GlobalSignals.mapPieceUsedSignal.dispatch();
					
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
						var stunTime = 4;
						log.i("stun enemy for " + Math.round(stunTime * 100)/100 + "s")
						fightComponent.itemEffects.enemyStunnedSeconds = stunTime;
					}
					break;
				case "consumable_weapon_mechanical":
					if (fightComponent.enemy.isMechanical()) {
						var stunTime = 4;
						log.i("stun enemy for " + Math.round(stunTime * 100)/100 + "s")
						fightComponent.itemEffects.enemyStunnedSeconds = stunTime;
					}
					break;
				case "flee_1":
					fightComponent.itemEffects.fled = true;
					fightComponent.itemEffects.fledSource = itemId;
					break;
				default:
					log.w("Item not mapped for useItemFight: " + itemId);
					break;
			}
			fightComponent.addItemUsed(itemId);
			log.i("used item added");
		},

		useExplorerFight: function (action) {
			let fightComponent = this.fightNodes.head.fight;
			if (!fightComponent) {
				log.w("can't use explorer in fight, no fight in progress");
				return;
			}

			let explorersComponent = this.playerStatsNodes.head.explorers;

			switch (action) {
				case "flee":
					let explorer = explorersComponent.getExplorerInPartyByType(ExplorerConstants.explorerType.FIGHTER);
					fightComponent.itemEffects.fled = true;
					fightComponent.itemEffects.fledSource = explorer.id;
					break;
			}
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
			if (!automatic && !GameGlobals.playerActionsHelper.checkAvailability(upgradeID, true)) return;
			
			GameGlobals.playerActionsHelper.deductCosts(upgradeID);
			let name = Text.t(UpgradeConstants.getDisplayNameTextKey(upgradeID));
			let textFragment = { textKey: "ui.log.upgrade_researched_message", textParams: { name: name } };
			GameGlobals.playerHelper.addLogMessage(LogConstants.getUniqueID(), textFragment, { visibility: LogConstants.MSG_VISIBILITY_CAMP });
			this.tribeUpgradesNodes.head.upgrades.addUpgrade(upgradeID);
			GlobalSignals.upgradeUnlockedSignal.dispatch(upgradeID);
			this.save();
			gtag('event', 'upgrade_bought', { event_category: 'progression', event_label: upgradeID });

			let unlockedResearchIDs = GameGlobals.upgradeEffectsHelper.getUnlockedResearchIDs(upgradeID);
			
			let title = "Researched complete ";
			let upgradeName = Text.t(UpgradeConstants.getDisplayNameTextKey(upgradeID));
			let message = "<p>You've researched <span class='hl-functionality'>" + upgradeName + "</span>.</p>";
			message += "<p class='p-meta'>" + GameGlobals.upgradeEffectsHelper.getEffectDescription(upgradeID, true) + "</p>";
			
			if (unlockedResearchIDs.length > 0) {
				let unlockedResearchNames = unlockedResearchIDs
					.filter(upgradeID => GameGlobals.playerActionsHelper.isVisible(upgradeID))
					.map(upgradeID => Text.t(UpgradeConstants.getDisplayNameTextKey(upgradeID)));
				if (unlockedResearchNames.length > 0) {
					message += "<p class='p-meta'>new research:<br/>" + unlockedResearchNames.join("<br/>") + "</p>";
				}
			}

			let hints = GameGlobals.upgradeEffectsHelper.getEffectHints(upgradeID);
			if (hints && hints.length > 0) message += "<p class='p-meta'>" + hints + "</p>";
			
			GameGlobals.uiFunctions.showInfoPopup(title, message, "Continue", null, null, true, false);
			
			let unlockedGeneralActions = GameGlobals.upgradeEffectsHelper.getUnlockedGeneralActions(upgradeID);
			this.unlockFeatures(unlockedGeneralActions);
		},

		claimMilestone: function (index) {
			index = parseInt(index);
			let currentIndex = GameGlobals.gameState.numUnlockedMilestones;
			let nextIndex = currentIndex + 1;
			if (index != nextIndex) {
				log.w("trying to claim wrong milestone index (" + index + "), currently claimed: " + currentIndex);
				return;
			}
			
			let oldMilestone = TribeConstants.getMilestone(currentIndex);
			let newMilestone = TribeConstants.getMilestone(nextIndex);
			this.unlockFeatures(newMilestone.unlockedFeatures);
			
			GameGlobals.gameState.numUnlockedMilestones = index;
			
			let hasDeity = GameGlobals.tribeHelper.hasDeity();
			let hasInsight = this.playerStatsNodes.head.insight.value > 0;
			let baseMsg = "Milestone claimed. We now call this a " + newMilestone.name + ".";
			let popupMsg = "<p>" + baseMsg + "</p>";
			popupMsg += "<p>" + UIConstants.getMilestoneUnlocksDescriptionHTML(newMilestone, oldMilestone, true, true, hasDeity, hasInsight) + "<p>";
			GameGlobals.uiFunctions.showInfoPopup("Milestone", popupMsg, "Continue", null, null, false, false);

			GameGlobals.playerHelper.addLogMessage(LogConstants.getUniqueID(), baseMsg, { visibility: LogConstants.MSG_VISIBILITY_CAMP });
			
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
					var toCollect = Math.floor(Math.min(improvementAmount, maxToCollect - totalCollected));
					currentStorage.resources.addResource(name, toCollect);
					resourcesVO.addResource(name, -toCollect);
					totalCollected += toCollect;
					GameGlobals.gameState.increaseGameStatKeyed("amountResourcesCollectedFromCollectorsPerName", name, toCollect);
				}
			}

			if (totalCollected < 1 && maxToCollect >= 1) {
				GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_USE_COLLECTOR_FAIL, "Nothing to collect yet.");
			}

			this.completeAction(actionName);
			GlobalSignals.inventoryChangedSignal.dispatch();
			GlobalSignals.collectorCollectedSignal.dispatch();
		},

		buildImprovement: function (actionName, improvementName, otherSector) {
			let sector = otherSector ? otherSector : this.playerLocationNodes.head.entity;
			let improvementsComponent = sector.get(SectorImprovementsComponent);
			if (!improvementsComponent) {
				log.w("trying to build an improvement but there is no SectorImprovementsComponent " + actionName, this);
				return;
			}
			let improvementID = ImprovementConstants.getImprovementID(improvementName);
			let currentAmount = improvementsComponent.getCount(improvementName);

			if (currentAmount > CampConstants.MAX_IMPROVEMENTS_PER_TYPE) {
				log.w("trying to build too many improvements of type " + improvementName, this);
				return;
			}

			improvementsComponent.add(improvementName);
			GameGlobals.gameState.increaseGameStatKeyed("numBuildingsBuiltPerId", improvementID);

			let level = improvementsComponent.getLevel(improvementName);
			let isProject = ImprovementConstants.isProject(improvementName);
			let isPassage = improvementsComponent.getVO(improvementName).isPassage();
			
			if (!isPassage) {
				// passages have a dedicated message
				let msg = ImprovementConstants.getBuiltLogMessageTextVO(improvementID, level);
				let messagePosition = sector.get(PositionComponent).getPosition();
				messagePosition.inCamp = getImprovementType(improvementName) === improvementTypes.camp || isProject;			

				GameGlobals.playerHelper.addLogMessage("MSG_BUILD_" + improvementName, msg, { position: messagePosition });
			}

			GlobalSignals.improvementBuiltSignal.dispatch();
			
			this.completeAction(actionName);
			
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
			GameGlobals.playerHelper.addLogMessage(LogConstants.getUniqueID(), "The colony ship launches.", { visibility: LogConstants.MSG_VISIBILITY_GLOBAL });
			
			GameGlobals.gameState.isLaunched = true;
			GameGlobals.metaState.hasCompletedGame = true;
			GlobalSignals.launchedSignal.dispatch();
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
				GlobalSignals.campRenamedSignal.dispatch();
				this.save();
			}
		},

		// TODO util function - move somewhere else
		passTime: function (seconds, callback) {
			this.engine.updateComplete.addOnce(function () {
				GameGlobals.gameState.passTime(seconds);
				GameGlobals.uiFunctions.onPlayerPositionChanged(); // reset cooldowns for buttons
				GlobalSignals.playerMoveCompletedSignal.dispatch(); // update resources etc
				this.engine.updateComplete.addOnce(function () {
					if (callback) callback();
				}, this);
			}, this);
		},

		startSequence: function (steps, popupTitleKey) {
			this.sequenceHelper.startSequence(steps, popupTitleKey);
		},
		
		// TODO find better fix for overlapping actions
		isSubAction: function (action) {
			var baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(action);
			switch (baseActionID) {
				case "fight": return true;
				case "use_item_fight": return true;
				case "use_explorer_fight": return true;
				default: return false;
			}
		},
		
		unlockFeatures: function (featureIDs) {
			if (!featureIDs) return;
			for (let i = 0; i < featureIDs.length; i++) {
				this.unlockFeature(featureIDs[i]);
			}
		},
		
		unlockFeature: function (featureID) {
			let featureSaveKey = featureID;
						
			if (GameGlobals.gameState.unlockedFeatures[featureSaveKey]) return;
			
			log.i("unlocked feature: " + featureID);
			gtag('event', 'unlock_feature', { event_category: 'progression', event_label: featureID });
			
			GameGlobals.gameState.unlockedFeatures[featureSaveKey] = true;
			GlobalSignals.featureUnlockedSignal.dispatch(featureID);
		},
		
		lockFeature: function (featureID) {
			let featureSaveKey = featureID;
						
			if (!GameGlobals.gameState.unlockedFeatures[featureSaveKey]) return;
			
			log.i("locked feature: " + featureID);
			
			GameGlobals.gameState.unlockedFeatures[featureSaveKey] = false;
		},

		useFeature: function (featureID) {
			let featureSaveKey = featureID;
						
			if (GameGlobals.gameState.usedFeatures[featureSaveKey]) return;
			
			log.i("used feature: " + featureID);
			gtag('event', 'use_feature', { event_category: 'progression', event_label: featureID });
			
			GameGlobals.gameState.usedFeatures[featureSaveKey] = true;
			GlobalSignals.featureUsedSignal.dispatch(featureID);
		},

		setStoryFlag: function (flagID, value) {
			GameGlobals.gameState.setStoryFlag(flagID, value);
			GlobalSignals.storyFlagChangedSignal.dispatch(flagID);
		},

		recordSteps: function (steps) {
			let playerPos = this.playerPositionNodes.head.position;
			if (!playerPos) return;
			GameGlobals.gameState.increaseGameStatSimple("numStepsTaken", steps);
			GameGlobals.gameState.increaseGameStatKeyed("numStepsPerLevel", playerPos.level, steps);

			let explorers = this.playerStatsNodes.head.explorers.getParty();
			for (let i = 0; i < explorers.length; i++) {
				let explorerVO = explorers[i];
				if (!explorerVO.numSteps) explorerVO.numSteps = 0;
				explorerVO.numSteps++;
				GameGlobals.gameState.increaseGameStatHighScore("mostStepsWithExplorer", explorerVO, explorerVO.numSteps);
			}
		},

		recordExcursionSurvived: function () {
			let playerPos = this.playerPositionNodes.head.position;

			let excursionComponent = this.playerPositionNodes.head.entity.get(ExcursionComponent);
			if (excursionComponent && excursionComponent.numSteps >= ExplorationConstants.MIN_EXCURSION_LENGTH) {
				GameGlobals.gameState.increaseGameStatSimple("numExcursionsSurvived");
				GameGlobals.gameState.increaseGameStatHighScore("longestSurvivedExcrusion", playerPos.level, excursionComponent.numSteps);
				GameGlobals.gameState.increaseGameStatHighScore("lowestStaminaReturnedToCampWith", playerPos.level, Math.round(this.playerStatsNodes.head.stamina.stamina));

				let explorers = this.playerStatsNodes.head.explorers.getParty();
				for (let i = 0; i < explorers.length; i++) {
					let explorerVO = explorers[i];
					if (!explorerVO.numExcursions) explorerVO.numExcursions = 0;
					explorerVO.numExcursions++;
				}
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

		save: function (slotID) {
			slotID = slotID || GameConstants.SAVE_SLOT_DEFAULT;
			GlobalSignals.saveGameSignal.dispatch(slotID, false);
		},

	});

	return PlayerActionFunctions;
});
