define([
	'ash',
	'core/ExceptionHandler',
	'core/ConsoleLogger',
	'game/GameGlobals',
	'game/GameGlobalsInitializer',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/SystemPriorities',
	'game/systems/GameManager',
	'game/systems/SaveSystem',
	'game/systems/AutoPlaySystem',
	'game/systems/ui/UIOutHeaderSystem',
	'game/systems/ui/UIOutElementsSystem',
	'game/systems/ui/UIOutLevelSystem',
	'game/systems/ui/UIOutCampSystem',
	'game/systems/ui/UIOutCampVisSystem',
	'game/systems/ui/UIOutProjectsSystem',
	'game/systems/ui/UIOutEmbarkSystem',
	'game/systems/ui/UIOutBagSystem',
	'game/systems/ui/UIOutFollowersSystem',
	'game/systems/ui/UIOutMapSystem',
	'game/systems/ui/UIOutTradeSystem',
	'game/systems/ui/UIOutUpgradesSystem',
	'game/systems/ui/UIOutTribeSystem',
	'game/systems/ui/UIOutMilestonesSystem',
	'game/systems/ui/UIOutFightSystem',
	'game/systems/ui/UIOutLogSystem',
	'game/systems/ui/UIOutManageSaveSystem',
	'game/systems/ui/UIOutPopupTradeSystem',
	'game/systems/ui/UIOutPopupInventorySystem',
	'game/systems/ui/UIOutTabBarSystem',
	'game/systems/CheatSystem',
	'game/systems/SlowUpdateSystem',
	'game/systems/VisionSystem',
	'game/systems/StaminaSystem',
	'game/systems/PlayerPositionSystem',
	'game/systems/PlayerActionSystem',
	'game/systems/SectorStatusSystem',
	'game/systems/LevelPassagesSystem',
	'game/systems/CollectorSystem',
	'game/systems/FightSystem',
	'game/systems/FollowerSystem',
	'game/systems/PopulationSystem',
	'game/systems/PerkSystem',
	'game/systems/WorkerSystem',
	'game/systems/FaintingSystem',
	'game/systems/ReputationSystem',
	'game/systems/RumourSystem',
	'game/systems/EvidenceSystem',
	'game/systems/EndingSystem',
	'game/systems/ExcursionSystem',
	'game/systems/FavourSystem',
	'game/systems/GlobalResourcesSystem',
	'game/systems/GlobalResourcesResetSystem',
	'game/systems/BagSystem',
	'game/systems/UnlockedFeaturesSystem',
	'game/systems/occurrences/CampEventsSystem',
	'game/UIFunctions',
	'utils/StringUtils',
	'brejep/tickprovider',
], function (
	Ash,
	ExceptionHandler,
	ConsoleLogger,
	GameGlobals,
	GameGlobalsInitializer,
	GlobalSignals,
	GameConstants,
	SystemPriorities,
	GameManager,
	SaveSystem,
	AutoPlaySystem,
	UIOutHeaderSystem,
	UIOutElementsSystem,
	UIOutLevelSystem,
	UIOutCampSystem,
	UIOutCampVisSystem,
	UIOutProjectsSystem,
	UIOutEmbarkSystem,
	UIOutBagSystem,
	UIOutFollowersSystem,
	UIOutMapSystem,
	UIOutTradeSystem,
	UIOutUpgradesSystem,
	UIOutTribeSystem,
	UIOutMilestonesSystem,
	UIOutFightSystem,
	UIOutLogSystem,
	UIOutManageSaveSystem,
	UIOutPopupTradeSystem,
	UIOutPopupInventorySystem,
	UIOutTabBarSystem,
	CheatSystem,
	SlowUpdateSystem,
	VisionSystem,
	StaminaSystem,
	PlayerPositionSystem,
	PlayerActionSystem,
	SectorStatusSystem,
	LevelPassagesSystem,
	CollectorSystem,
	FightSystem,
	FollowerSystem,
	PopulationSystem,
	PerkSystem,
	WorkerSystem,
	FaintingSystem,
	ReputationSystem,
	RumourSystem,
	EvidenceSystem,
	EndingSystem,
	ExcursionSystem,
	FavourSystem,
	GlobalResourcesSystem,
	GlobalResourcesResetSystem,
	BagSystem,
	UnlockedFeaturesSystem,
	CampEventsSystem,
	UIFunctions,
	StringUtils,
	TickProvider
) {
	var Level13 = Ash.Class.extend({

		engine: null,
		gameManager: null,
		tickProvider: null,

		constructor: function (plugins) {
			var game = this;
			this.engine = new Ash.Engine();
			this.tickProvider = new TickProvider(null, function (ex) { game.handleException(ex) });
			this.gameManager = new GameManager(this.tickProvider, this.engine);

			GameGlobalsInitializer.init(this.engine);
			this.addSystems();
			this.initializePlugins(plugins);

			GameGlobals.uiFunctions.init();
			GameGlobals.uiFunctions.hideGame();
			GlobalSignals.pageSetUpSignal.dispatch();
			
			ExceptionHandler.exceptionCallback = function (ex) { game.handleException(ex) };
			GlobalSignals.exceptionCallback = function (ex) { game.handleException(ex) };
			GlobalSignals.gameStateReadySignal.addOnce(function () {
				game.start();
			});
			
			GlobalSignals.changelogLoadedSignal.addOnce(function () {
				ExceptionHandler.wrapCall(this, function () {
					game.gameManager.setupGame();
				});
			});
		},

		initializePlugins: function (plugins) {
			if (!plugins) return;
			var game = this;
			for (let i = 0; i < plugins.length; i++) {
				log.i("Add plugin " + (i+1) + "/" + plugins.length + ": " + plugins[i]);
				require([plugins[i]], function (plugin) {
					game.engine.addSystem(new plugin(), SystemPriorities.update);
				});
			}
		},

		addSystems: function () {
			log.i("START " + GameConstants.STARTTimeNow() + "\t initializing systems");

			this.engine.addSystem(new SaveSystem(), SystemPriorities.preUpdate);
			this.engine.addSystem(new LevelPassagesSystem(), SystemPriorities.preupdate);
			this.engine.addSystem(new PlayerPositionSystem(), SystemPriorities.preupdate);

			this.engine.addSystem(new GlobalResourcesResetSystem(), SystemPriorities.update);
			this.engine.addSystem(new VisionSystem(), SystemPriorities.update);
			this.engine.addSystem(new StaminaSystem(), SystemPriorities.update);
			this.engine.addSystem(new BagSystem(), SystemPriorities.update);
			this.engine.addSystem(new CollectorSystem(), SystemPriorities.update);
			this.engine.addSystem(new FightSystem(true), SystemPriorities.update);
			this.engine.addSystem(new FollowerSystem(), SystemPriorities.update);
			this.engine.addSystem(new PopulationSystem(), SystemPriorities.update);
			this.engine.addSystem(new PerkSystem(), SystemPriorities.update);
			this.engine.addSystem(new WorkerSystem(), SystemPriorities.update);
			this.engine.addSystem(new FaintingSystem(), SystemPriorities.update);
			this.engine.addSystem(new ReputationSystem(), SystemPriorities.update);
			this.engine.addSystem(new RumourSystem(), SystemPriorities.update);
			this.engine.addSystem(new EvidenceSystem(), SystemPriorities.update);
			this.engine.addSystem(new FavourSystem(), SystemPriorities.update);
			this.engine.addSystem(new PlayerActionSystem(), SystemPriorities.update);
			this.engine.addSystem(new SectorStatusSystem(), SystemPriorities.update);
			this.engine.addSystem(new UnlockedFeaturesSystem(), SystemPriorities.update);
			this.engine.addSystem(new GlobalResourcesSystem(), SystemPriorities.update);
			this.engine.addSystem(new CampEventsSystem(), SystemPriorities.update);
			this.engine.addSystem(new ExcursionSystem(), SystemPriorities.update);
			this.engine.addSystem(new EndingSystem(), SystemPriorities.update);

			this.engine.addSystem(new AutoPlaySystem(), SystemPriorities.postUpdate);
			this.engine.addSystem(new SlowUpdateSystem(), SystemPriorities.postUpdate);

			this.engine.addSystem(new UIOutHeaderSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutElementsSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutLevelSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutCampSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutCampVisSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutProjectsSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutEmbarkSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutBagSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutFollowersSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutMapSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutTradeSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutUpgradesSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutTribeSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutMilestonesSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutFightSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutLogSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutManageSaveSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutPopupInventorySystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutPopupTradeSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutTabBarSystem(), SystemPriorities.render);

			if (GameConstants.isCheatsEnabled) {
				this.engine.addSystem(new CheatSystem(), SystemPriorities.update);
			}
		},

		start: function () {
			log.i("START " + GameConstants.STARTTimeNow() + "\t start tick");
			this.gameManager.startGame();
		},

		handleException: function (ex) {
			let sys = this;
			let desc = StringUtils.getExceptionDescription(ex);
			let gadesc = desc.title + " | " + desc.shortstack;
			log.i("logging exception to gtag");
			gtag('event', 'exception', {
				'description': gadesc,
				'fatal': true,
			});
			
			this.gameManager.pauseGame();
			GameGlobals.uiFunctions.hideGame(false);
			
			// show popup
			let pos = GameGlobals.playerActionFunctions.playerPositionNodes.head ? GameGlobals.playerActionFunctions.playerPositionNodes.head.position : "(unknown)";
			let bugTitle = StringUtils.encodeURI("[JS Error] " + desc.title);
			let bugBody = StringUtils.encodeURI(
			   "Details:\n[Fill in any details here that you think will help tracking down this bug, such as what you did in the game just before it happened.]" +
			   "\n\nSeed: " + GameGlobals.gameState.worldSeed + "\nPosition: " + pos + "\nStacktrace:\n" + desc.stack);
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
			
			GameGlobals.gameState.numExceptions++;
			
			throw ex;
		},

		cheat: function (input) {
			if (!GameConstants.isCheatsEnabled) return;
			this.engine.getSystem(CheatSystem).applyCheatInput(input);
		}

	});

	return Level13;
});
