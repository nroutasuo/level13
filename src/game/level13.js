define([
    'ash',
    'core/ExceptionHandler',
    'core/ConsoleLogger',
    'game/GameGlobals',
    'game/GameFlowLogger',
    'game/GlobalSignals',
	'game/constants/GameConstants',
    'game/constants/SystemPriorities',
    'game/GameState',
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
    'game/systems/ui/UIOutBlueprintsSystem',
    'game/systems/ui/UIOutFightSystem',
    'game/systems/ui/UIOutLogSystem',
    'game/systems/ui/UIOutManageSaveSystem',
    'game/systems/ui/UIOutPopupInnSystem',
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
    'game/systems/WorkerSystem',
    'game/systems/FaintingSystem',
    'game/systems/ReputationSystem',
    'game/systems/RumourSystem',
    'game/systems/EvidenceSystem',
    'game/systems/EndingSystem',
    'game/systems/GlobalResourcesSystem',
    'game/systems/GlobalResourcesResetSystem',
    'game/systems/BagSystem',
    'game/systems/HazardSystem',
    'game/systems/UnlockedFeaturesSystem',
    'game/systems/occurrences/CampEventsSystem',
    'game/PlayerActionFunctions',
    'game/UIFunctions',
    'game/helpers/PlayerActionsHelper',
    'game/helpers/PlayerActionResultsHelper',
    'game/helpers/ui/ChangeLogHelper',
    'game/helpers/ItemsHelper',
    'game/helpers/EndingHelper',
    'game/helpers/CampVisHelper',
    'game/helpers/ResourcesHelper',
    'game/helpers/MovementHelper',
    'game/helpers/FightHelper',
    'game/helpers/LevelHelper',
    'game/helpers/SectorHelper',
    'game/helpers/CampHelper',
    'game/helpers/ButtonHelper',
    'game/helpers/SaveHelper',
    'game/helpers/UpgradeEffectsHelper',
    'game/helpers/ui/UIMapHelper',
    'game/helpers/ui/UITechTreeHelper',
    'brejep/tickprovider',
], function (
    Ash,
    ExceptionHandler,
    ConsoleLogger,
    GameGlobals,
    GameFlowLogger,
    GlobalSignals,
	GameConstants,
    SystemPriorities,
    GameState,
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
    UIOutBlueprintsSystem,
    UIOutFightSystem,
    UIOutLogSystem,
    UIOutManageSaveSystem,
    UIOutPopupInnSystem,
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
    WorkerSystem,
    FaintingSystem,
    ReputationSystem,
    RumourSystem,
    EvidenceSystem,
    EndingSystem,
    GlobalResourcesSystem,
    GlobalResourcesResetSystem,
    BagSystem,
    HazardSystem,
    UnlockedFeaturesSystem,
    CampEventsSystem,
    PlayerActionFunctions,
    UIFunctions,
    PlayerActionsHelper,
    PlayerActionResultsHelper,
    ChangeLogHelper,
    ItemsHelper,
    EndingHelper,
    CampVisHelper,
    ResourcesHelper,
    MovementHelper,
    FightHelper,
    LevelHelper,
    SectorHelper,
    CampHelper,
    ButtonHelper,
    SaveHelper,
    UpgradeEffectsHelper,
    UIMapHelper,
    UITechTreeHelper,
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

            this.initializeGameGlobals();
			this.addSystems();
            this.initializePlugins(plugins);

            GameGlobals.uiFunctions.init();
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

        initializeGameGlobals: function () {
			GameGlobals.gameState = new GameState();
            GameGlobals.playerActionsHelper = new PlayerActionsHelper(this.engine);
			GameGlobals.playerActionFunctions = new PlayerActionFunctions(this.engine);

            GameGlobals.resourcesHelper = new ResourcesHelper(this.engine);
            GameGlobals.levelHelper = new LevelHelper(this.engine);
			GameGlobals.movementHelper = new MovementHelper(this.engine);
			GameGlobals.sectorHelper = new SectorHelper(this.engine);
            GameGlobals.fightHelper = new FightHelper(this.engine);
			GameGlobals.campHelper = new CampHelper(this.engine);
            GameGlobals.endingHelper = new EndingHelper(this.engine);
            GameGlobals.campVisHelper = new CampVisHelper();
			GameGlobals.playerActionResultsHelper = new PlayerActionResultsHelper(this.engine);

            GameGlobals.itemsHelper = new ItemsHelper(this.engine);
			GameGlobals.upgradeEffectsHelper = new UpgradeEffectsHelper();
			GameGlobals.saveHelper = new SaveHelper();
            GameGlobals.changeLogHelper = new ChangeLogHelper();
            GameGlobals.gameFlowLogger = new GameFlowLogger();

            GameGlobals.uiMapHelper = new UIMapHelper(this.engine);
            GameGlobals.uiTechTreeHelper = new UITechTreeHelper(this.engine);
            GameGlobals.buttonHelper = new ButtonHelper();

			GameGlobals.uiFunctions = new UIFunctions();
        },

        initializePlugins: function (plugins) {
            if (!plugins) return;
            var game = this;
            for (var i = 0; i < plugins.length; i++) {
                log.i("Add plugin " + (i+1) + "/" + plugins.length + ": " + plugins[i]);
                require([plugins[i]], function (plugin) {
                    game.engine.addSystem(new plugin(), SystemPriorities.update);
                });
            }
        },

		addSystems: function () {
			log.i("START " + GameConstants.STARTTimeNow() + "\t initializing systems");

			this.engine.addSystem(new SaveSystem(), SystemPriorities.preUpdate);
			this.engine.addSystem(new PlayerPositionSystem(), SystemPriorities.preupdate);

			this.engine.addSystem(new GlobalResourcesResetSystem(), SystemPriorities.update);
			this.engine.addSystem(new VisionSystem(), SystemPriorities.update);
			this.engine.addSystem(new StaminaSystem(), SystemPriorities.update);
			this.engine.addSystem(new BagSystem(), SystemPriorities.update);
			this.engine.addSystem(new HazardSystem(), SystemPriorities.update);
			this.engine.addSystem(new CollectorSystem(), SystemPriorities.update);
			this.engine.addSystem(new FightSystem(), SystemPriorities.update);
			this.engine.addSystem(new FollowerSystem(), SystemPriorities.update);
			this.engine.addSystem(new PopulationSystem(), SystemPriorities.update);
			this.engine.addSystem(new WorkerSystem(), SystemPriorities.update);
			this.engine.addSystem(new FaintingSystem(), SystemPriorities.update);
			this.engine.addSystem(new ReputationSystem(), SystemPriorities.update);
			this.engine.addSystem(new RumourSystem(), SystemPriorities.update);
			this.engine.addSystem(new EvidenceSystem(), SystemPriorities.update);
			this.engine.addSystem(new PlayerActionSystem(), SystemPriorities.update);
			this.engine.addSystem(new SectorStatusSystem(), SystemPriorities.update);
			this.engine.addSystem(new LevelPassagesSystem(), SystemPriorities.update);
			this.engine.addSystem(new UnlockedFeaturesSystem(), SystemPriorities.update);
			this.engine.addSystem(new GlobalResourcesSystem(), SystemPriorities.update);
			this.engine.addSystem(new CampEventsSystem(), SystemPriorities.update);
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
			this.engine.addSystem(new UIOutBlueprintsSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutTribeSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutFightSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutLogSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutManageSaveSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutPopupInventorySystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutPopupTradeSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutPopupInnSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutTabBarSystem(), SystemPriorities.render);

            if (GameConstants.isCheatsEnabled) {
                this.engine.addSystem(new CheatSystem(), SystemPriorities.update);
            }
		},

		start: function () {
			this.tickProvider.add(this.gameManager.update, this.gameManager);
			this.tickProvider.start();
            this.gameManager.startGame();
		},

        handleException: function (ex) {
            var exshortdesc = (ex.name ? ex.name : "Unknown") + ": " + (ex.message ? ex.message : "No message");
            var stack = (ex.stack ? ex.stack : "Not available");
            var stackParts = stack.split("\n");
            
            var cleanString = function (s) {
                var result = s.replace(/\n/g, "%0A").replace(/\'/g, "%27");
                return encodeURI(result);
            }

            // track to ga
            var gastack = stackParts[0];
            if (stackParts.length > 0) gastack += " " + stackParts[1];
            gastack = gastack.replace(/\s+/g, ' ');
            gastack = gastack.replace(/\(.*:[\/\\]+.*[\/\\]/g, '(');
            var gadesc = exshortdesc + " | " + gastack;
            gtag('event', 'exception', {
                'description': gadesc,
                'fatal': true,
            });
            
            // show popup
            var bugTitle = "[JS Error] " + cleanString(exshortdesc);
            var bugBody =
               "Details:%0A[Fill in any details here that you think will help tracking down this bug, such as what you did in the game just before it happened.]" +
               "%0A%0AStacktrace:%0A" + cleanString(stack);
            var url = "https://github.com/nroutasuo/level13/issues/new?title=" + bugTitle + "&body=" + bugBody + "&labels=exception";
            GameGlobals.uiFunctions.showInfoPopup(
                "Error",
                "You've found a bug! Please reload the page to continue playing.<br\><br\>" +
                "You can also help the developer by <a href='" +
                url +
                "' target='_blank'>reporting</a> the problem on Github.",
                "ok",
                null
            );
            
            this.gameManager.pauseGame();
            GameGlobals.uiFunctions.hideGame(false);
            throw ex;
        },

		cheat: function (input) {
            if (!GameConstants.isCheatsEnabled) return;
			this.engine.getSystem(CheatSystem).applyCheat(input);
		}

    });

    return Level13;
});
