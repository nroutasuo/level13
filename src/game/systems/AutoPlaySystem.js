// A system to autoplay the game - mostly useful for quickly cheating to a semi-realistic later state of the game, or for skipping repetitive exploration steps
define(['ash',
	'game/GameGlobals',
	'game/constants/AutoPlayConstants',
	'game/constants/ItemConstants',
	'game/constants/PerkConstants',
	'game/constants/PlayerStatConstants',
	'game/constants/BagConstants',
	'game/nodes/player/AutoPlayNode',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/player/ItemsNode',
	'game/nodes/FightNode',
	'game/nodes/sector/CampNode',
	'game/components/common/PositionComponent',
	'game/components/common/CampComponent',
	'game/components/player/PlayerActionComponent',
	'game/components/player/PlayerActionResultComponent',
	'game/components/player/ItemsComponent',
	'game/components/player/PerksComponent',
	'game/components/player/BagComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/SectorLocalesComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/systems/CheatSystem',
	'game/constants/CampConstants',
	'game/constants/UpgradeConstants',
	'game/vos/ResourcesVO'
], function (Ash, GameGlobals,
	AutoPlayConstants, ItemConstants, PerkConstants, PlayerStatConstants, BagConstants,
	AutoPlayNode, PlayerStatsNode, ItemsNode, FightNode, CampNode,
	PositionComponent, CampComponent, PlayerActionComponent, PlayerActionResultComponent, ItemsComponent, PerksComponent, BagComponent,
	SectorStatusComponent, SectorFeaturesComponent, SectorLocalesComponent, SectorImprovementsComponent,
	CheatSystem, CampConstants, UpgradeConstants, ResourcesVO) {

	var AutoPlaySystem = Ash.System.extend({

		speed: 5,
		stepInterval: 250,
		isExpress: false,

		autoPlayNodes: null,
		playerStatsNodes: null,
		itemsNodes: null,
		fightNodes: null,
		campNodes: null,

		lastStepTimeStamp: 0,
		idleCounter: 0,
		lastSwitchCounter: 0,

		constructor: function () { },

		addToEngine: function (engine) {
			this.engine = engine;
			this.autoPlayNodes = engine.getNodeList(AutoPlayNode);
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			this.itemsNodes = engine.getNodeList(ItemsNode);
			this.fightNodes = engine.getNodeList(FightNode);
			this.campNodes = engine.getNodeList(CampNode);

			this.autoPlayNodes.nodeAdded.add(this.onAutoPlayNodeAdded, this);
			this.autoPlayNodes.nodeRemoved.add(this.onAutoPlayNodeRemoved, this);

			this.lastStepTimeStamp = new Date().getTime();
		},

		removeFromEngine: function (engine) {
			this.engine = null;
			this.autoPlayNodes.nodeAdded.remove(this.onAutoPlayNodeAdded, this);
			this.autoPlayNodes.nodeRemoved.remove(this.onAutoPlayNodeRemoved, this);

			this.autoPlayNodes = null;
			this.playerStatsNodes = null;
			this.itemsNodes = null;
			this.fightNodes = null;
			this.campNodes = null;
		},

		onAutoPlayNodeAdded: function (node) {
			this.cheatSystem = this.engine.getSystem(CheatSystem);

			this.lastStepTimeStamp = new Date().getTime();
			var inCamp = this.playerStatsNodes.head.entity.get(PositionComponent).inCamp;
			node.autoPlay.isExploring = !inCamp;
			node.autoPlay.isManagingCamps = inCamp;
			this.cheatSystem.applyCheatInput("speed " + this.speed);
			GameGlobals.gameState.isAutoPlaying = true;
		},

		onAutoPlayNodeRemoved: function (node) {
			GameGlobals.gameState.isAutoPlaying = false;
			this.cheatSystem.applyCheatInput("speed 1");
		},

		update: function () {
			if (!this.autoPlayNodes.head)
				return;

			var timeStamp = new Date().getTime();
			if (timeStamp - this.lastStepTimeStamp < this.stepInterval) {
				return;
			}
			
			var autoPlayComponent = this.autoPlayNodes.head.autoPlay;
			var fightNode = this.fightNodes.head;
			var didSomething = false;

			if (autoPlayComponent.isExploring) {
				autoPlayComponent.isPendingExploring = false;
				didSomething = didSomething || this.updateExploring();
			}

			if (autoPlayComponent.isManagingCamps && !fightNode) {
				didSomething = didSomething || this.updateCamping();
			}

			this.resetTurn(fightNode !== null);

			this.lastSwitchCounter++;
			if ((!didSomething && this.lastSwitchCounter > 10) || autoPlayComponent.isPendingExploring) {
				didSomething = this.switchMode();
				this.lastSwitchCounter = 0;
			}

			if (!didSomething) {
				this.idleCounter++;
				this.logStep("idle");
			} else {
				this.idleCounter = 0;
			}

			if (this.idleCounter > 5) {
				this.logStep("skip 1 minute");
				this.cheatSystem.applyCheatInput("time 1");
			}

			this.lastStepTimeStamp = timeStamp;
		},

		updateExploring: function () {
			var didSomething = false;

			this.checkExploreObjective();

			var maxStamina = this.playerStatsNodes.head.stamina.health * PlayerStatConstants.HEALTH_TO_STAMINA_FACTOR;
			var minStamina = GameGlobals.playerActionFunctions.nearestCampNodes.head ? Math.min(100, maxStamina / 2) : 0;
			var hasStamina = minStamina < this.playerStatsNodes.head.stamina.stamina;

			didSomething = didSomething || this.buildCamp();
			didSomething = didSomething || this.buildOutImprovements();
			didSomething = didSomething || this.useOutImprovements();

			if (hasStamina) {
				didSomething = didSomething || this.craftItems();
				didSomething = didSomething || this.scout();
				didSomething = didSomething || this.scavenge();
				didSomething = didSomething || this.idleOut();
				didSomething = didSomething || this.move();
			}
			return didSomething;
		},

		updateCamping: function () {
			var didSomething = false;
			var autoPlayComponent = this.autoPlayNodes.head.autoPlay;
			if (autoPlayComponent.isPendingExploring)
				return didSomething;
			didSomething = didSomething || this.useInImprovements();
			didSomething = didSomething || this.manageWorkers();
			didSomething = didSomething || this.buildPassages();
			didSomething = didSomething || this.buildInImprovements();
			didSomething = didSomething || this.unlockUpgrades();
			didSomething = didSomething || this.craftItems();
			didSomething = didSomething || this.idleIn();
			didSomething = didSomething || this.switchCamps();
			return didSomething;
		},

		resetTurn: function (isFight) {
			if (this.playerStatsNodes.head.entity.has(PlayerActionResultComponent)) {
				this.handleInventory();
				this.equipBest();
				$("#info-ok").click();
			}
			if (!isFight) GameGlobals.uiFunctions.popupManager.closeAllPopups();
			if (this.isExpress) {
				this.cheatSystem.applyCheatInput("stamina");
			}
		},

		switchMode: function () {
			if (!GameGlobals.gameState.unlockedFeatures.camp)
				return false;

			var autoPlayComponent = this.autoPlayNodes.head.autoPlay;
			var busyComponent = this.playerStatsNodes.head.entity.get(PlayerActionComponent);
			if (busyComponent && busyComponent.isBusy())
				return false;

			var currentStorage = GameGlobals.resourcesHelper.getCurrentStorage();
			var currentFood = currentStorage.resources.getResource(resourceNames.food);
			var currentWater = currentStorage.resources.getResource(resourceNames.water);
			var perksComponent = this.playerStatsNodes.head.entity.get(PerksComponent);
			var injuries = perksComponent.getPerksByType(PerkConstants.perkTypes.injury);
			var itemsComponent = this.itemsNodes.head.items;
			var hasHospital = GameGlobals.autoPlayHelper.getTotalImprovementsCount(improvementNames.hospital) > 0;
			if (injuries.length > 2 && hasHospital && currentFood > 5 && currentWater > 5 && !autoPlayComponent.isExploring)
				return false;

			this.logStep("switch mode");

			var wasExploring = autoPlayComponent.isExploring;
			var nearestCampLevel = GameGlobals.playerActionFunctions.nearestCampNodes.head ? GameGlobals.playerActionFunctions.nearestCampNodes.head.entity.get(PositionComponent).level : -100;
			if (wasExploring && nearestCampLevel > -100) {
				// this.logStep("enter camp " + nearestCampLevel);
				let nearestCampOrdinal = GameGlobals.gameState.getCampOrdinal(nearestCampLevel);
				autoPlayComponent.setExploreObjective(null, null, null);
				GameGlobals.playerActionFunctions.moveToCamp(nearestCampOrdinal);
				GameGlobals.uiFunctions.showTab(GameGlobals.uiFunctions.elementIDs.tabs.in);
			} else {
				// this.logStep("leave camp");
				if (GameGlobals.playerActionFunctions.nearestCampNodes.head) {
					var selectedResVO = new ResourcesVO();
					selectedResVO.setResource(resourceNames.food, Math.min(10, currentStorage.resources.getResource(resourceNames.food) / 2));
					selectedResVO.setResource(resourceNames.water, Math.min(10, currentStorage.resources.getResource(resourceNames.water) / 2));
					GameGlobals.playerActionFunctions.moveResFromCampToBag(selectedResVO);

					var selectedItems = {};
					var itemID = ItemConstants.itemDefinitions.exploration[0].id;
					if (itemsComponent.getCountById(itemID, true) > 0) {
						selectedItems[itemID] = 1;
					}
					GameGlobals.playerActionFunctions.updateCarriedItems(selectedItems);
					GameGlobals.playerActionFunctions.leaveCamp();
				}
				GameGlobals.uiFunctions.showTab(GameGlobals.uiFunctions.elementIDs.tabs.out);
			}

			autoPlayComponent.isExploring = !autoPlayComponent.isExploring;
			autoPlayComponent.isManagingCamps = !autoPlayComponent.isExploring;

			this.lastSwitchCounter = 0;

			return true;
		},

		checkExploreObjective: function() {
			// if no objective, set one
			var autoPlayComponent = this.autoPlayNodes.head.autoPlay;
			if (!autoPlayComponent.isExploreObjectiveSet()) {
				this.setExploreObjective();
				return;
			}

			// if completed, reset / return
			if (autoPlayComponent.explorationVO.isExploreGoalComplete) {
				switch (autoPlayComponent.explorationVO.exploreGoal) {
					case AutoPlayConstants.GOALTYPES.SCOUT_SECTORS:
						this.setExploreObjective();
						return;
					case AutoPlayConstants.GOALTYPES.SCAVENGE_RESOURCES:
					case AutoPlayConstants.GOALTYPES.SCOUT_LOCALE:
					case AutoPlayConstants.GOALTYPES.CLEAR_WORKSHOP:
						return;
				}
			}
		},

		setExploreObjective: function () {
			var autoPlayComponent = this.autoPlayNodes.head.autoPlay;

			// 1. set requirements
			if (this.playerStatsNodes.head.vision.value < this.playerStatsNodes.head.vision.maximum) {
				this.playerStatsNodes.head.vision.value = this.playerStatsNodes.head.vision.maximum;
			}
			
			GameGlobals.autoPlayHelper.setExploreObjective(autoPlayComponent.explorationVO);

			this.logStep("set explore objective: " + autoPlayComponent.explorationVO.getExploreObjectiveDescription());
		},

		move: function () {
			var autoPlayComponent = this.autoPlayNodes.head.autoPlay;
			let directions = GameGlobals.autoPlayHelper.getMoveSector(autoPlayComponent.explorationVO);
			
			if (!directions || directions.sector)
				return false;

			var playerPosition = GameGlobals.playerActionFunctions.playerPositionNodes.head.position;
			var sectorPosition = directions.sector.get(PositionComponent);
			if (playerPosition.level !== sectorPosition.level || playerPosition.sectorId() !== sectorPosition.sectorId()) {
				this.logStep("move to " + sectorPosition + " (" + directions.type + ")");
				playerPosition.setTo(sectorPosition);
				return true;
			}

			return false;
		},

		buildCamp: function () {
			if (GameGlobals.playerActionsHelper.checkAvailability("build_out_camp", false)) {
				this.logStep("build camp");
				GameGlobals.playerActionFunctions.buildCamp();
				return true;
			}
			return false;
		},

		buildOutImprovements: function () {
			// TODO build beacons
			if (!GameGlobals.playerActionFunctions.playerLocationNodes.head) return;
			var improvementsComponent = GameGlobals.playerActionFunctions.playerLocationNodes.head.entity.get(SectorImprovementsComponent);

			// traps & buckets
			if (GameGlobals.playerActionsHelper.checkAvailability("build_out_collector_water")) {
				if (improvementsComponent.getCount(improvementNames.collector_water) < 1) {
					this.logStep("build bucket");
					GameGlobals.playerActionFunctions.buildBucket();
					return true;
				}
			}

			if (GameGlobals.playerActionsHelper.checkAvailability("build_out_collector_food")) {
				if (improvementsComponent.getCount(improvementNames.collector_food) < 1) {
					this.logStep("build trap");
					GameGlobals.playerActionFunctions.buildTrap();
					return true;
				}
			}

			return false;
		},

		useOutImprovements: function () {
			var bagFull = GameGlobals.autoPlayHelper.isBagFull();
			if (!bagFull && GameGlobals.playerActionsHelper.checkAvailability("use_out_collector_food")) {
				this.logStep("collect food");
				GameGlobals.playerActionFunctions.collectFood();
				return true;
			}
			if (!bagFull && GameGlobals.playerActionsHelper.checkAvailability("use_out_collector_water")) {
				this.logStep("collect water");
				GameGlobals.playerActionFunctions.collectWater();
				return true;
			}
			if (!bagFull && GameGlobals.playerActionsHelper.checkAvailability("use_spring")) {
				this.logStep("stop by a spring");
				GameGlobals.playerActionFunctions.useSpring();
				return true;
			}
			return false;
		},

		scout: function () {
			var autoPlayComponent = this.autoPlayNodes.head.autoPlay;
			if (GameGlobals.playerActionsHelper.checkAvailability("scout")) {
				this.logStep("scout");
				GameGlobals.playerActionFunctions.scout();
				if (autoPlayComponent.explorationVO.exploreGoal === AutoPlayConstants.GOALTYPES.SCOUT_SECTORS) {
					autoPlayComponent.explorationVO.isExploreGoalComplete = true;
					this.logStep("complete scout goal");
				}
				return true;
			}

			var sectorLocalesComponent = GameGlobals.playerActionFunctions.playerLocationNodes.head.entity.get(SectorLocalesComponent);
			var sectorStatusComponent = GameGlobals.playerActionFunctions.playerLocationNodes.head.entity.get(SectorStatusComponent);
			for (let i = 0; i < sectorLocalesComponent.locales.length; i++) {
				var locale = sectorLocalesComponent.locales[i];
				if (!sectorStatusComponent.isLocaleScouted(i)) {
					var action = "scout_locale_" + locale.getCategory() + "_" + i;
					if (GameGlobals.playerActionsHelper.checkAvailability(action, true)) {
						GameGlobals.playerActionFunctions.scoutLocale(i);
						this.logStep("scout locale " + locale.type);
						if (autoPlayComponent.explorationVO.exploreGoal === AutoPlayConstants.GOALTYPES.SCOUT_LOCALE) {
							autoPlayComponent.explorationVO.isExploreGoalComplete = true;
							this.logStep("complete scout goal");
						}
						return true;
					}
				}
			}

			return false;
		},

		scavenge: function () {
			var autoPlayComponent = this.autoPlayNodes.head.autoPlay;
			if (autoPlayComponent.explorationVO.exploreGoal === AutoPlayConstants.GOALTYPES.SCOUT_LOCALE)
				return;
			if (!GameGlobals.autoPlayHelper.canScavenge())
				return false;
				
			if (Math.random() < 0.5) {
				this.logStep("scavenge");
				GameGlobals.playerActionFunctions.startAction("scavenge");
				return true;
			}
			
			return false;
		},

		idleOut: function () {
			if (GameGlobals.playerActionFunctions.nearestCampNodes.head && this.playerStatsNodes.head.stamina.stamina < 10)
				return false;

			return false;
		},

		switchCamps: function () {
			var playerPosition = GameGlobals.playerActionFunctions.playerPositionNodes.head.position;
			var currentLevelOrdinal = GameGlobals.gameState.getLevelOrdinal(playerPosition.level);

			var campPosition;
			var campOrdinal;
			var campOrdinalDiff = 100;
			var nextCampOrdinalDiff = 100;
			var nextCamp = null;
			for (var node = GameGlobals.playerActionFunctions.campNodes.head; node; node = node.next) {
				campPosition = node.position;
				campOrdinal = GameGlobals.gameState.getLevelOrdinal(campPosition.level);
				if (campOrdinal < currentLevelOrdinal) {
					campOrdinalDiff = currentLevelOrdinal - campOrdinal;
					if (campOrdinalDiff < nextCampOrdinalDiff) {
						nextCamp = node;
						nextCampOrdinalDiff = campOrdinalDiff;
					}
				}
			}

			if (nextCamp) {
				let campLevel = nextCamp.position.level;
				GameGlobals.playerActionFunctions.moveToCamp(GameGlobals.gameState.getCampOrdinal(campLevel));
				return true;
			}

			return false;
		},

		useInImprovements: function () {
			var campComponent = GameGlobals.playerActionFunctions.playerLocationNodes.head.entity.get(CampComponent);
			if (!campComponent)
				return false;

			if (GameGlobals.playerActionsHelper.checkAvailability("use_in_home")) {
				var maxStamina = this.playerStatsNodes.head.stamina.health * PlayerStatConstants.HEALTH_TO_STAMINA_FACTOR;
				if (this.playerStatsNodes.head.stamina.stamina < maxStamina / 3 * 2) {
					GameGlobals.playerActionFunctions.useHome();
					this.logStep("rested");
					return true;
				}
			}

			if (GameGlobals.playerActionsHelper.checkAvailability("use_in_campfire")) {
				GameGlobals.playerActionFunctions.useCampfire();
				this.logStep("used campfire");
				return true;
			}

			if (GameGlobals.playerActionsHelper.checkAvailability("use_in_hospital")) {
				GameGlobals.playerActionFunctions.useHospital();
				this.logStep("used hospital");
				return true;
			}

			if (GameGlobals.playerActionsHelper.checkAvailability("use_in_hospital_2")) {
				GameGlobals.playerActionFunctions.useHospital();
				this.logStep("used hospital 2");
				return true;
			}
		},

		manageWorkers: function () {
			var campComponent = GameGlobals.playerActionFunctions.playerLocationNodes.head.entity.get(CampComponent);
			if (!campComponent)
				return false;

			var sector = GameGlobals.playerActionFunctions.playerLocationNodes.head.entity;
			var improvementsComponent = GameGlobals.playerActionFunctions.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			var playerPosition = GameGlobals.playerActionFunctions.playerPositionNodes.head.position;
			var currentStorage = GameGlobals.resourcesHelper.getCurrentStorage();
			var campOrdinal = GameGlobals.gameState.getCampOrdinal(playerPosition.level);

			// cheat population
			var maxPopulation = CampConstants.getHousingCap(improvementsComponent);
			if (this.isExpress && campComponent.population < maxPopulation)
				this.cheatSystem.applyCheatInput("pop");

			// assign workers
			if (campComponent.getFreePopulation() > 0 || this.refreshWorkers) {
				var assignment = GameGlobals.campHelper.getDefaultWorkerAssignment(sector);
				GameGlobals.playerActionFunctions.assignWorkers(null, assignment);
				this.logStep("assigned workers");
				this.refreshWorkers = false;
				return true;
			}
			return false;
		},

		buildPassages: function () {
			var projects = GameGlobals.levelHelper.getAvailableProjectsForCamp(GameGlobals.playerActionFunctions.playerLocationNodes.head.entity);
			for (let i = 0; i < projects.length; i++) {
				var project = projects[i];
				var action = project.action;
				var sectorEntity = GameGlobals.levelHelper.getSectorByPosition(project.level, project.position.sectorX, project.position.sectorY);
				var available = GameGlobals.playerActionsHelper.checkAvailability(action, false, sectorEntity);
				if (available) {
					var sector = project.level + "." + project.sector + "." + project.direction;
					GameGlobals.playerActionFunctions.startAction(action, sector);
					this.logStep("build project: " + project.name);
					return true;
				}
			}
			return false;
		},

		buildInImprovements: function () {
			var campComponent = GameGlobals.playerActionFunctions.playerLocationNodes.head.entity.get(CampComponent);
			if (!campComponent)
				return;

			var improvementsComponent = GameGlobals.playerActionFunctions.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			var maxPopulation = CampConstants.getHousingCap(improvementsComponent);

			if (GameGlobals.playerActionsHelper.checkAvailability("build_in_tradepost")) {
				this.logStep("build trading post");
				GameGlobals.playerActionFunctions.buildTradingPost();
				return true;
			}

			if (GameGlobals.playerActionsHelper.checkAvailability("build_in_hospital")) {
				this.logStep("build hospital");
				GameGlobals.playerActionFunctions.buildHospital();
				return true;
			}

			if (campComponent.population >= maxPopulation - 1) {
				if (GameGlobals.playerActionsHelper.checkAvailability("build_in_house2")) {
					this.logStep("build house2");
					GameGlobals.playerActionFunctions.buildHouse2();
					return true;
				}

				if (GameGlobals.playerActionsHelper.checkAvailability("build_in_house")) {
					this.logStep("build house");
					GameGlobals.playerActionFunctions.buildHouse();
					return true;
				}
			}

			if (GameGlobals.playerActionsHelper.checkAvailability("build_in_storage")) {
				this.logStep("build storage");
				GameGlobals.playerActionFunctions.buildStorage();
				return true;
			}

			if (GameGlobals.playerActionsHelper.checkAvailability("build_in_darkfarm")) {
				this.logStep("build darkfarm");
				GameGlobals.playerActionFunctions.buildDarkFarm();
				return true;
			}

			if (GameGlobals.playerActionsHelper.checkAvailability("build_in_campfire")) {
				this.logStep("build campfire");
				GameGlobals.playerActionFunctions.buildCampfire();
				return true;
			}

			if (GameGlobals.playerActionsHelper.checkAvailability("build_in_lights")) {
				this.logStep("build lights");
				GameGlobals.playerActionFunctions.buildLights();
				return true;
			}

			if (GameGlobals.playerActionsHelper.checkAvailability("build_in_library")) {
				this.logStep("build library");
				GameGlobals.playerActionFunctions.buildLibrary();
				return true;
			}

			if (GameGlobals.playerActionsHelper.checkAvailability("build_in_market")) {
				this.logStep("build market");
				GameGlobals.playerActionFunctions.buildMarket();
				return true;
			}

			if (GameGlobals.playerActionsHelper.checkAvailability("build_in_smithy")) {
				this.logStep("build smithy");
				GameGlobals.playerActionFunctions.buildSmithy();
				this.refreshWorkers = true;
				return true;
			}

			if (GameGlobals.playerActionsHelper.checkAvailability("build_in_inn")) {
				this.logStep("build inn");
				GameGlobals.playerActionFunctions.buildInn();
				return true;
			}

			if (GameGlobals.playerActionsHelper.checkAvailability("build_in_square")) {
				this.logStep("build square");
				GameGlobals.playerActionFunctions.buildSquare();
				return true;
			}

			if (GameGlobals.playerActionsHelper.checkAvailability("build_in_temple")) {
				this.logStep("build temple");
				GameGlobals.playerActionFunctions.buildTemple();
				return true;
			}

			if (GameGlobals.playerActionsHelper.checkAvailability("build_in_shrine")) {
				this.logStep("build shrine");
				GameGlobals.playerActionFunctions.buildShrine();
				return true;
			}

			if (GameGlobals.playerActionsHelper.checkAvailability("build_in_garden")) {
				this.logStep("build garden");
				GameGlobals.playerActionFunctions.buildGarden();
				return true;
			}

			return false;
		},

		unlockUpgrades: function () {
			var unlocked = false;
			var upgradesComponent = GameGlobals.playerActionFunctions.tribeUpgradesNodes.head.upgrades;

			var unfinishedBlueprints = upgradesComponent.getUnfinishedBlueprints();
			if (unfinishedBlueprints.length > 0) {
				var id = unfinishedBlueprints[0].upgradeID;
				GameGlobals.playerActionFunctions.createBlueprint(id);
				this.logStep("created blueprint " + id);
				unlocked = true;
			}

			var upgradeDefinition;
			var hasBlueprintUnlocked;
			var hasBlueprintNew;
			var isAvailable;
			for (var id in UpgradeConstants.upgradeDefinitions) {
				upgradeDefinition = UpgradeConstants.upgradeDefinitions[id];
				if (!upgradesComponent.hasUpgrade(id)) {
					hasBlueprintUnlocked = upgradesComponent.hasAvailableBlueprint(id);
					hasBlueprintNew = upgradesComponent.hasNewBlueprint(id);
					isAvailable = GameGlobals.playerActionsHelper.checkAvailability(id);
					if (hasBlueprintNew) {
						GameGlobals.playerActionFunctions.unlockUpgrade(upgradeDefinition.id);
						this.logStep("unlocked upgrade with blueprint " + upgradeDefinition.name);
						unlocked = true;
					} else if (isAvailable) {
						GameGlobals.playerActionFunctions.buyUpgrade(upgradeDefinition.id);
						this.logStep("bought upgrade " + upgradeDefinition.name);
						this.refreshWorkers = true;
						unlocked = true;
					}
				}
			}
			return unlocked;
		},

		craftItems: function () {
			var itemList;
			var itemDefinition;
			for (var type in ItemConstants.itemDefinitions) {
				itemList = ItemConstants.itemDefinitions[type];
				for (let i in itemList) {
					itemDefinition = itemList[i];
					if (itemDefinition.craftable) {
						if (this.itemsNodes.head.items.getCountById(itemDefinition.id, true) < 1) {
							if (GameGlobals.playerActionsHelper.checkAvailability("craft_" + itemDefinition.id)) {
								this.logStep("craft " + itemDefinition.name);
								GameGlobals.playerActionFunctions.craftItem(itemDefinition.id);
								this.equipBest();
								return true;
							}
						}
					}
				}
			}
			return false;
		},

		idleIn: function () {
			return Math.random() > 0.8;
		},

		equipBest: function () {
			var cheatSystem = this.cheatSystem;
			cheatSystem.applyCheat(() => { cheatSystem.equipBest(); });
		},

		handleInventory: function () {
			var bagComponent = this.playerStatsNodes.head.entity.get(BagComponent);
			var resultVO = this.playerStatsNodes.head.entity.get(PlayerActionResultComponent).pendingResultVO;

			var autoPlayComponent = this.autoPlayNodes.head.autoPlay;
			var goalres = autoPlayComponent.explorationVO.exploreResource ? autoPlayComponent.explorationVO.exploreResource : resourceNames.metal;
			var goalamount = bagComponent.totalCapacity / 2;

			GameGlobals.autoPlayHelper.selectAllFromPendingResult();
			GameGlobals.autoPlayHelper.deselectFromPendingResult();

			if (autoPlayComponent.explorationVO.exploreGoal === AutoPlayConstants.GOALTYPES.SCAVENGE_RESOURCES) {
				var totalAmount = resultVO.selectedResources.getResource(goalres) + playerResources.resources.getResource(goalres);
				autoPlayComponent.explorationVO.isExploreGoalComplete = totalAmount >= goalamount;
				if (autoPlayComponent.explorationVO.isExploreGoalComplete)
					this.logStep("complete resource goal (" + goalres + " " + goalamount + ")");
			}
			
			GameGlobals.playerActionFunctions.completeAction(GameGlobals.playerActionFunctions.currentAction);
		},

		logStep: function (message) {
			var playerPosition = GameGlobals.playerActionFunctions.playerPositionNodes.head.position;
			var status = "idle";
			if (this.autoPlayNodes.head.autoPlay.isExploring) status = "exploring";
			if (this.autoPlayNodes.head.autoPlay.isManagingCamps) status = "managing";
			log.i("autoplay (" + this.isExpress + ") (" + status + ") " + playerPosition.level + "-" + playerPosition.sectorId() + ": " + message);
		},

		hasUpgrade: function (upgradeID) {
			return GameGlobals.playerActionFunctions.tribeUpgradesNodes.head.upgrades.hasUpgrade(upgradeID);
		},

	});

	return AutoPlaySystem;
});
