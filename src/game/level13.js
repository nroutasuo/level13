define([
	'ash',
	'text/Text',
	'core/ExceptionHandler',
	'core/ConsoleLogger',
	'game/GameGlobals',
	'game/GameGlobalsInitializer',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/SystemPriorities',
	'game/systems/GameManager',
	'game/systems/SaveSystem',
	'game/systems/ui/UIOutAudioSystem',
	'game/systems/ui/UIOutHeaderSystem',
	'game/systems/ui/UIOutElementsSystem',
	'game/systems/ui/UIOutLevelSystem',
	'game/systems/ui/UIOutCampSystem',
	'game/systems/ui/UIOutCampVisSystem',
	'game/systems/ui/UIOutDialogueSystem',
	'game/systems/ui/UIOutProjectsSystem',
	'game/systems/ui/UIOutEmbarkSystem',
	'game/systems/ui/UIOutBagSystem',
	'game/systems/ui/UIOutExplorersSystem',
	'game/systems/ui/UIOutMapSystem',
	'game/systems/ui/UIOutTradeSystem',
	'game/systems/ui/UIOutUpgradesSystem',
	'game/systems/ui/UIOutTribeSystem',
	'game/systems/ui/UIOutMilestonesSystem',
	'game/systems/ui/UIOutMetaPopupsSystem',
	'game/systems/ui/UIOutFightSystem',
	'game/systems/ui/UIOutLogSystem',
	'game/systems/ui/UIOutManageSaveSystem',
	'game/systems/ui/UIOutPopupTradeSystem',
	'game/systems/ui/UIOutPopupInventorySystem',
	'game/systems/ui/UIOutTabBarSystem',
	'game/systems/ui/UIOutTextSystem',
	'game/systems/CheatSystem',
	'game/systems/DialogueSystem',
	'game/systems/SpecialUpdateSystem',
	'game/systems/VisionSystem',
	'game/systems/StaminaSystem',
	'game/systems/PlayerPositionSystem',
	'game/systems/PlayerActionSystem',
	'game/systems/PlayerMovementSystem',
	'game/systems/SectorStatusSystem',
	'game/systems/StorySystem',
	'game/systems/TutorialSystem',
	'game/systems/LevelStatusSystem',
	'game/systems/CharacterSystem',
	'game/systems/CollectorSystem',
	'game/systems/FightSystem',
	'game/systems/PopulationSystem',
	'game/systems/PerkSystem',
	'game/systems/WorkerSystem',
	'game/systems/FaintingSystem',
	'game/systems/ReputationSystem',
	'game/systems/RumourSystem',
	'game/systems/EvidenceSystem',
	'game/systems/EndingSystem',
	'game/systems/ExcursionSystem',
	'game/systems/ExplorerSystem',
	'game/systems/HopeSystem',
	'game/systems/GlobalResourcesSystem',
	'game/systems/GlobalResourcesResetSystem',
	'game/systems/InsightSystem',
	'game/systems/BagSystem',
	'game/systems/UnlockedFeaturesSystem',
	'game/systems/occurrences/CampEventsSystem',
	'game/systems/occurrences/PlayerEventsSystem',
	'game/UIFunctions',
	'utils/StringUtils',
	'brejep/tickprovider',
], function (
	Ash,
	Text,
	ExceptionHandler,
	ConsoleLogger,
	GameGlobals,
	GameGlobalsInitializer,
	GlobalSignals,
	GameConstants,
	SystemPriorities,
	GameManager,
	SaveSystem,
	UIOutAudioSystem,
	UIOutHeaderSystem,
	UIOutElementsSystem,
	UIOutLevelSystem,
	UIOutCampSystem,
	UIOutCampVisSystem,
	UIOutDialogueSystem,
	UIOutProjectsSystem,
	UIOutEmbarkSystem,
	UIOutBagSystem,
	UIOutExplorersSystem,
	UIOutMapSystem,
	UIOutTradeSystem,
	UIOutUpgradesSystem,
	UIOutTribeSystem,
	UIOutMilestonesSystem,
	UIOutMetaPopupsSystem,
	UIOutFightSystem,
	UIOutLogSystem,
	UIOutManageSaveSystem,
	UIOutPopupTradeSystem,
	UIOutPopupInventorySystem,
	UIOutTabBarSystem,
	UIOutTextSystem,
	CheatSystem,
	DialogueSystem,
	SpecialUpdateSystem,
	VisionSystem,
	StaminaSystem,
	PlayerPositionSystem,
	PlayerActionSystem,
	PlayerMovementSystem,
	SectorStatusSystem,
	StorySystem,
	TutorialSystem,
	LevelStatusSystem,
	CharacterSystem,
	CollectorSystem,
	FightSystem,
	PopulationSystem,
	PerkSystem,
	WorkerSystem,
	FaintingSystem,
	ReputationSystem,
	RumourSystem,
	EvidenceSystem,
	EndingSystem,
	ExcursionSystem,
	ExplorerSystem,
	HopeSystem,
	GlobalResourcesSystem,
	GlobalResourcesResetSystem,
	InsightSystem,
	BagSystem,
	UnlockedFeaturesSystem,
	CampEventsSystem,
	PlayerEventsSystem,
	UIFunctions,
	StringUtils,
	TickProvider
) {
	var Level13 = Ash.Class.extend({

		engine: null,
		gameManager: null,
		tickProvider: null,

		constructor: function (plugins) {
			let game = this;
			
			this.engine = new Ash.Engine();
			this.tickProvider = new TickProvider(null, function (ex) { game.handleException(ex) });
			this.gameManager = new GameManager(this.tickProvider, this.engine);

			GameGlobalsInitializer.init(this.engine);

			this.setup(plugins);
		},

		setup: function (plugins) {
			this.initMobileOverlay();

			this.setupEngine()
				.then(() => this.loadMetaState())
				.then(() => this.loadTexts())
				.then(() => this.waitForMobileOverlay())
				.then(() => this.setupPage())
				.then(() => this.loadVersion())
				.then(() => this.setupGame())
				.then(() => this.initializePlugins(plugins))
				.then(() => this.runDataChecks())
				.catch(ex => {
					ExceptionHandler.handleException(ex);
				});
		},

		loadMetaState: function () {
			return this.gameManager.loadMetaState();
		},

		waitForMobileOverlay: function () {
			return new Promise((resolve, reject) => {
				if (GameConstants.isMobileOverlayShown) {
					log.w("START mobile overlay shown, game setup delayed");

					let wait = function () {
						setTimeout(() => {
							if (GameConstants.isMobileOverlayShown) {
								wait();
							} else {
								resolve();
							}
						}, 500);
					};

					wait();
				} else {
					resolve();
				}
			});
		},

		setupEngine: function () {
			let game = this;
			
			return new Promise((resolve, reject) => {
				log.i("START " + GameConstants.STARTTimeNow() + "\t setting up engine");
				
				ExceptionHandler.exceptionCallback = function (ex) { game.handleException(ex) };
				GlobalSignals.exceptionCallback = function (ex) { game.handleException(ex) };
				
				this.addLogicSystems();
				resolve();
			});
		},

		setupPage: function () {
			return new Promise((resolve, reject) => {
				log.i("START " + GameConstants.STARTTimeNow() + "\t setting up page");
				this.addUISystems();
				GameGlobals.uiFunctions.init();
				GameGlobals.uiFunctions.hideGame();
				GlobalSignals.pageSetUpSignal.dispatch();
				resolve();
			});
		},

		loadTexts: function () {
			log.i("START " + GameConstants.STARTTimeNow() + "\t loading texts");
			return GameGlobals.textLoader.loadTexts();
		},

		loadVersion: function () {
			return new Promise((resolve, reject) => {
				log.i("START " + GameConstants.STARTTimeNow() + "\t loading versions");
				GlobalSignals.changelogLoadedSignal.addOnce(function () {
					ExceptionHandler.wrapCall(this, function () {
						resolve();
					});
				});

				GameGlobals.changeLogHelper.loadVersion();
			});
		},

		setupGame: function () {
			return new Promise((resolve, reject) => {
				let game = this;
				
				GlobalSignals.gameStateReadySignal.addOnce(function () {
					game.start();
					resolve();
				});

				this.gameManager.setupGame();
			});
		},

		initMobileOverlay: function () {
			$("#mobile-overlay").toggle(GameConstants.isMobileOverlayShown);

			if (GameConstants.isMobileOverlayShown) {
				GameGlobals.uiFunctions.setGameOverlay(false, false);
			}

			$("#btn-dismiss-mobile-overlay").click(() => {
				GameConstants.isMobileOverlayShown = false;
				GameGlobals.uiFunctions.setGameOverlay(true, false);
				$("#mobile-overlay").toggle(false);
			});
		},

		initializePlugins: function (plugins) {
			return new Promise((resolve, reject) => {
				if (!plugins) resolve();
				let game = this;
				for (let i = 0; i < plugins.length; i++) {
					log.i("Add plugin " + (i+1) + "/" + plugins.length + ": " + plugins[i]);
					require([plugins[i]], function (plugin) {
						game.engine.addSystem(new plugin(), SystemPriorities.update);
					});
				}
				resolve();
			});
		},

		runDataChecks: function () {
			// GameGlobals.dialogueHelper.checkDialogueData();
		},

		addLogicSystems: function () {
			log.i("START " + GameConstants.STARTTimeNow() + "\t initializing logic systems");

			this.engine.addSystem(new SaveSystem(), SystemPriorities.preUpdate);
			this.engine.addSystem(new LevelStatusSystem(), SystemPriorities.preUpdate);
			this.engine.addSystem(new PlayerPositionSystem(), SystemPriorities.preUpdate);

			this.engine.addSystem(new GlobalResourcesResetSystem(), SystemPriorities.update);
			this.engine.addSystem(new VisionSystem(), SystemPriorities.update);
			this.engine.addSystem(new StaminaSystem(), SystemPriorities.update);
			this.engine.addSystem(new BagSystem(), SystemPriorities.update);
			this.engine.addSystem(new CharacterSystem(), SystemPriorities.update);
			this.engine.addSystem(new CollectorSystem(), SystemPriorities.update);
			this.engine.addSystem(new DialogueSystem(), SystemPriorities.update);
			this.engine.addSystem(new FightSystem(true), SystemPriorities.update);
			this.engine.addSystem(new PopulationSystem(), SystemPriorities.update);
			this.engine.addSystem(new PerkSystem(), SystemPriorities.update);
			this.engine.addSystem(new WorkerSystem(), SystemPriorities.update);
			this.engine.addSystem(new FaintingSystem(), SystemPriorities.update);
			this.engine.addSystem(new ReputationSystem(), SystemPriorities.update);
			this.engine.addSystem(new RumourSystem(), SystemPriorities.update);
			this.engine.addSystem(new EvidenceSystem(), SystemPriorities.update);
			this.engine.addSystem(new HopeSystem(), SystemPriorities.update);
			this.engine.addSystem(new InsightSystem(), SystemPriorities.update);
			this.engine.addSystem(new PlayerActionSystem(), SystemPriorities.update);
			this.engine.addSystem(new PlayerMovementSystem(), SystemPriorities.update);
			this.engine.addSystem(new SectorStatusSystem(), SystemPriorities.update);
			this.engine.addSystem(new UnlockedFeaturesSystem(), SystemPriorities.update);
			this.engine.addSystem(new GlobalResourcesSystem(), SystemPriorities.update);
			this.engine.addSystem(new CampEventsSystem(), SystemPriorities.update);
			this.engine.addSystem(new PlayerEventsSystem(), SystemPriorities.update);
			this.engine.addSystem(new ExcursionSystem(), SystemPriorities.update);
			this.engine.addSystem(new ExplorerSystem(), SystemPriorities.update);
			this.engine.addSystem(new StorySystem(), SystemPriorities.update);
			this.engine.addSystem(new TutorialSystem(), SystemPriorities.update);
			this.engine.addSystem(new EndingSystem(), SystemPriorities.update);

			this.engine.addSystem(new SpecialUpdateSystem(), SystemPriorities.postUpdate);

			if (GameConstants.isCheatsEnabled) {
				this.engine.addSystem(new CheatSystem(), SystemPriorities.update);
			}
		},

		addUISystems: function () {
			log.i("START " + GameConstants.STARTTimeNow() + "\t initializing ui systems");

			this.engine.addSystem(new UIOutAudioSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutTextSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutHeaderSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutElementsSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutLevelSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutCampSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutCampVisSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutDialogueSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutProjectsSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutEmbarkSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutBagSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutExplorersSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutMapSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutTradeSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutUpgradesSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutTribeSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutMilestonesSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutMetaPopupsSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutFightSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutLogSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutManageSaveSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutPopupInventorySystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutPopupTradeSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutTabBarSystem(), SystemPriorities.render);
		},

		start: function () {
			log.i("START " + GameConstants.STARTTimeNow() + "\t start tick");
			this.gameManager.startGame();
		},

		handleException: function (ex) {
			if (this.numExceptionsInRow > 0) return;

			let desc = StringUtils.getExceptionDescription(ex);
			let stackTrace = desc.stack.substring(0, 1000) + "...";

			GameGlobals.gameState.numExceptions++;
			GameGlobals.gameState.numExceptionsInRow++;
			
			this.gameManager.pauseGame();
			GameGlobals.uiFunctions.hideGame(false);
			
			// show popup
			let pos = GameGlobals.playerActionFunctions.playerPositionNodes.head ? GameGlobals.playerActionFunctions.playerPositionNodes.head.position : "(unknown)";
			let bugTitle = StringUtils.encodeURI("[JS Error] " + desc.title);
			let bugBody = StringUtils.encodeURI(
			   "Details:\n[Fill in any details here that you think will help tracking down this bug]" +
			   "\n\nSeed: " + GameGlobals.gameState.worldSeed + "\nPosition: " + pos + "\nStacktrace:\n" + stackTrace);
			let url = "https://github.com/nroutasuo/level13/issues/new?title=" + bugTitle + "&body=" + bugBody + "&labels=exception";
			
			GameGlobals.uiFunctions.popupManager.closeAllPopups();
			GameGlobals.uiFunctions.showQuestionPopup(
				"Error",
				"You've found a bug! Please reload the page to continue playing. " +
				"If reloading doesn't help, you can clear your data and restart the game, but you will lose all your progress.<br\><br\>" +
				"You can also help the developer by <a href='" +
				url +
				"' target='_blank'>reporting</a> the problem on Github.",
				"reload",
				"clear data",
				() => { location.reload(); },
				() => { GameGlobals.uiFunctions.onRestartButton(); },
				true
			);

			this.numExceptionsInRow = 0;
			
			throw ex;
		},

		cheat: function (input) {
			if (!GameConstants.isCheatsEnabled) return;
			this.engine.getSystem(CheatSystem).applyCheatInput(input);
		}

	});

	return Level13;
});
