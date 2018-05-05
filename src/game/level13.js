define([
    'ash',
	'game/constants/GameConstants',
    'game/GameState',
    'game/systems/GameManager',
    'game/systems/SaveSystem',
    'game/systems/AutoPlaySystem',
    'game/systems/ui/UIOutHeaderSystem',
    'game/systems/ui/UIOutElementsSystem',
    'game/systems/ui/UIOutLevelSystem',
    'game/systems/ui/UIOutCampSystem',
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
    'game/systems/CheatSystem',
    'game/systems/VisionSystem',
    'game/systems/StaminaSystem',
    'game/systems/PlayerPositionSystem',
    'game/systems/PlayerActionSystem',
    'game/systems/SectorStatusSystem',
    'game/systems/LevelPassagesSystem',
    'game/systems/CollectorSystem',
    'game/systems/FightSystem',
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
    'game/constants/SystemPriorities',
    'game/PlayerActionFunctions',
    'game/OccurrenceFunctions',
    'game/UIFunctions',
    'game/helpers/PlayerActionsHelper',
    'game/helpers/PlayerActionResultsHelper',
    'game/helpers/ui/ChangeLogHelper',
    'game/helpers/ItemsHelper',
    'game/helpers/EnemyHelper',
    'game/helpers/EndingHelper',
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
	GameConstants,
    GameState,
    GameManager,
    SaveSystem,
    AutoPlaySystem,
    UIOutHeaderSystem,
    UIOutElementsSystem,
    UIOutLevelSystem,
    UIOutCampSystem,
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
    CheatSystem,
    VisionSystem,
    StaminaSystem,
    PlayerPositionSystem,
    PlayerActionSystem,
    SectorStatusSystem,
    LevelPassagesSystem,
    CollectorSystem,
    FightSystem,
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
    SystemPriorities,
    PlayerActionFunctions,
    OccurrenceFunctions,
    UIFunctions,
    PlayerActionsHelper,
    PlayerActionResultsHelper,
    ChangeLogHelper,
    ItemsHelper,
    EnemyHelper,
    EndingHelper,
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
	
        gameState: null,
	
		uiFunctions: null,
		occurrenceFunctions: null,
		playerActionFunctions: null,
        cheatSystem: null,
		
		gameManager: null,
		saveSystem: null,
	
        tickProvider: null,

        constructor: function (plugins) {
            this.engine = new Ash.Engine();
			this.gameState = new GameState();
	    
			this.initializeHelpers();
            this.initializePlugins(plugins);

            var game = this;
			this.tickProvider = new TickProvider(null, function (ex) {
                game.handleException(ex);
            });
			
			// Basic building blocks & special systems
			this.saveSystem = new SaveSystem(this.gameState, this.changeLogHelper);
			this.playerActionFunctions = new PlayerActionFunctions(
				this.gameState,
				this.resourcesHelper,
				this.levelHelper,
				this.playerActionsHelper,
				this.fightHelper,
				this.playerActionResultsHelper);
            this.cheatSystem = new CheatSystem(this.gameState, this.playerActionFunctions, this.resourcesHelper, this.uiMapHelper, this.levelHelper);
			this.uiFunctions = new UIFunctions(this.playerActionFunctions, this.gameState, this.saveSystem, this.cheatSystem, this.changeLogHelper);
			this.occurrenceFunctions = new OccurrenceFunctions(this.gameState, this.uiFunctions, this.resourcesHelper, this.upgradeEffectsHelper);
			
			this.playerActionFunctions.occurrenceFunctions = this.occurrenceFunctions;
			this.playerActionFunctions.uiFunctions = this.uiFunctions;
			this.fightHelper.uiFunctions = this.uiFunctions;
            this.playerActionsHelper.levelHelper = this.levelHelper;
            
            this.enemyHelper.createEnemies();
			
			this.addSystems();
        },
        
        initializeHelpers: function () {
            // TODO make singletons / have some nice dependency injection
            this.itemsHelper = new ItemsHelper(this.gameState);
            this.enemyHelper = new EnemyHelper(this.itemsHelper);
			this.resourcesHelper = new ResourcesHelper(this.engine);
			this.playerActionsHelper = new PlayerActionsHelper(this.engine, this.gameState, this.resourcesHelper);
			this.upgradeEffectsHelper = new UpgradeEffectsHelper(this.playerActionsHelper);
			this.movementHelper = new MovementHelper(this.engine);
			this.levelHelper = new LevelHelper(this.engine, this.gameState, this.playerActionsHelper, this.movementHelper);
			this.sectorHelper = new SectorHelper(this.engine);
			this.campHelper = new CampHelper(this.engine, this.upgradeEffectsHelper);
			this.playerActionResultsHelper = new PlayerActionResultsHelper(this.engine, this.gameState, this.playerActionsHelper, this.resourcesHelper, this.levelHelper, this.itemsHelper);
            this.fightHelper = new FightHelper(this.engine, this.playerActionsHelper, this.playerActionResultsHelper);
			this.saveHelper = new SaveHelper();
            this.uiMapHelper = new UIMapHelper(this.engine, this.levelHelper, this.sectorHelper, this.movementHelper);
            this.uiTechTreeHelper = new UITechTreeHelper(this.engine, this.playerActionsHelper);
            this.buttonHelper = new ButtonHelper(this.levelHelper);
            this.changeLogHelper = new ChangeLogHelper();
            this.endingHelper = new EndingHelper(this.engine, this.gameState, this.playerActionsHelper, this.levelHelper);
        },
        
        initializePlugins: function (plugins) {
            if (!plugins) return;
            var game = this;
            require(plugins, function (plugin) {
                game.engine.addSystem(new plugin(), SystemPriorities.update);
            });
        },
	
		addSystems: function () {
			this.gameManager = new GameManager(this.tickProvider, this.gameState, this.uiFunctions, this.playerActionFunctions, this.saveHelper, this.enemyHelper, this.itemsHelper, this.levelHelper);
			this.engine.addSystem(this.gameManager, SystemPriorities.preUpdate);
            
            this.engine.addSystem(this.cheatSystem, SystemPriorities.update);
			
			if (GameConstants.isDebugOutputEnabled) console.log("START " + GameConstants.STARTTimeNow() + "\t initializing systems");
			
			this.engine.addSystem(this.playerActionFunctions, SystemPriorities.preUpdate);
			this.engine.addSystem(this.occurrenceFunctions, SystemPriorities.preUpdate);
			this.engine.addSystem(this.saveSystem, SystemPriorities.preUpdate);
			
			this.engine.addSystem(new GlobalResourcesResetSystem(), SystemPriorities.update);
			this.engine.addSystem(new VisionSystem(this.gameState), SystemPriorities.update);
			this.engine.addSystem(new StaminaSystem(this.gameState, this.playerActionsHelper), SystemPriorities.update);
			this.engine.addSystem(new BagSystem(this.gameState), SystemPriorities.update);
			this.engine.addSystem(new HazardSystem(), SystemPriorities.update);
			this.engine.addSystem(new CollectorSystem(this.gameState), SystemPriorities.update);
			this.engine.addSystem(new FightSystem(this.gameState, this.resourcesHelper, this.levelHelper, this.playerActionResultsHelper, this.playerActionsHelper, this.occurrenceFunctions), SystemPriorities.update);
			this.engine.addSystem(new PopulationSystem(this.gameState, this.levelHelper, this.campHelper), SystemPriorities.update);
			this.engine.addSystem(new WorkerSystem(this.gameState, this.resourcesHelper, this.campHelper), SystemPriorities.update);
			this.engine.addSystem(new FaintingSystem(this.uiFunctions, this.playerActionFunctions, this.playerActionResultsHelper), SystemPriorities.update);
			this.engine.addSystem(new ReputationSystem(this.gameState, this.resourcesHelper, this.upgradeEffectsHelper), SystemPriorities.update);
			this.engine.addSystem(new RumourSystem(this.gameState, this.upgradeEffectsHelper), SystemPriorities.update);
			this.engine.addSystem(new EvidenceSystem(this.gameState, this.upgradeEffectsHelper), SystemPriorities.update);
			this.engine.addSystem(new PlayerPositionSystem(this.gameState, this.levelHelper, this.uiFunctions, this.occurrenceFunctions), SystemPriorities.preupdate);
			this.engine.addSystem(new PlayerActionSystem(this.gameState, this.playerActionFunctions), SystemPriorities.update);
			this.engine.addSystem(new SectorStatusSystem(this.movementHelper, this.levelHelper), SystemPriorities.update);
			this.engine.addSystem(new LevelPassagesSystem(this.levelHelper), SystemPriorities.update);
			this.engine.addSystem(new UnlockedFeaturesSystem(this.gameState), SystemPriorities.update);
			this.engine.addSystem(new GlobalResourcesSystem(this.gameState, this.upgradeEffectsHelper), SystemPriorities.update);
			this.engine.addSystem(new CampEventsSystem(this.occurrenceFunctions, this.upgradeEffectsHelper, this.gameState, this.saveSystem), SystemPriorities.update);
            this.engine.addSystem(new EndingSystem(this.gameState, this.gameManager, this.uiFunctions), SystemPriorities.update);
			this.engine.addSystem(new AutoPlaySystem(this.playerActionFunctions, this.cheatSystem, this.levelHelper, this.sectorHelper, this.upgradeEffectsHelper), SystemPriorities.postUpdate);
			
			this.engine.addSystem(new UIOutHeaderSystem(this.uiFunctions, this.gameState, this.resourcesHelper, this.upgradeEffectsHelper), SystemPriorities.render);
			this.engine.addSystem(new UIOutElementsSystem(this.uiFunctions, this.gameState, this.playerActionFunctions, this.resourcesHelper, this.fightHelper, this.buttonHelper), SystemPriorities.render);
			this.engine.addSystem(new UIOutLevelSystem(this.uiFunctions, this.gameState, this.levelHelper, this.movementHelper, this.resourcesHelper, this.sectorHelper, this.uiMapHelper), SystemPriorities.render);
			this.engine.addSystem(new UIOutCampSystem(this.uiFunctions, this.gameState, this.levelHelper, this.upgradeEffectsHelper, this.campHelper), SystemPriorities.render);
			this.engine.addSystem(new UIOutProjectsSystem(this.uiFunctions, this.gameState, this.levelHelper, this.endingHelper), SystemPriorities.render);
			this.engine.addSystem(new UIOutEmbarkSystem(this.uiFunctions, this.gameState, this.resourcesHelper), SystemPriorities.render);
			this.engine.addSystem(new UIOutBagSystem(this.uiFunctions, this.playerActionsHelper, this.gameState), SystemPriorities.render);
			this.engine.addSystem(new UIOutFollowersSystem(this.uiFunctions, this.gameState), SystemPriorities.render);
			this.engine.addSystem(new UIOutMapSystem(this.uiFunctions, this.gameState, this.uiMapHelper, this.levelHelper), SystemPriorities.render);
			this.engine.addSystem(new UIOutTradeSystem(this.uiFunctions, this.gameState, this.resourcesHelper), SystemPriorities.render);
			this.engine.addSystem(new UIOutUpgradesSystem(this.uiFunctions, this.playerActionFunctions, this.upgradeEffectsHelper, this.uiTechTreeHelper), SystemPriorities.render);
			this.engine.addSystem(new UIOutBlueprintsSystem(this.uiFunctions, this.playerActionFunctions, this.upgradeEffectsHelper), SystemPriorities.render);
			this.engine.addSystem(new UIOutTribeSystem(this.uiFunctions, this.resourcesHelper, this.levelHelper), SystemPriorities.render);
			this.engine.addSystem(new UIOutFightSystem(this.uiFunctions, this.playerActionResultsHelper, this.playerActionsHelper), SystemPriorities.render);
			this.engine.addSystem(new UIOutLogSystem(), SystemPriorities.render);
			this.engine.addSystem(new UIOutManageSaveSystem(this.uiFunctions, this.gameState, this.saveSystem, this.saveHelper, this.changeLogHelper), SystemPriorities.render);
			this.engine.addSystem(new UIOutPopupInventorySystem(this.uiFunctions), SystemPriorities.render);
			this.engine.addSystem(new UIOutPopupTradeSystem(this.uiFunctions, this.resourcesHelper), SystemPriorities.render);
			this.engine.addSystem(new UIOutPopupInnSystem(this.uiFunctions, this.gameState), SystemPriorities.render);
		},
	
		start: function () {
			this.tickProvider.add(this.engine.update, this.engine);
			this.tickProvider.start();
            this.gameManager.startGame();
		},
        
        handleException: function (ex) {
            this.gameManager.pauseGame();
            var exshortdesc = (ex.name ? ex.name : "Unknown") + ": " + (ex.message ? ex.message.replace(/\'/g, "%27") : "No message");
            var stack = (ex.stack ? ex.stack.replace(/\n/g, "%0A").replace(/\'/g, "%27") : "Not available");
            
            // track to ga
            gtag('event', 'exception', {
              'description': exshortdesc
            });
            // show popup
            var bugTitle = "[JS Error] " + exshortdesc;
            var bugBody = 
               "Details:%0A[Fill in any details here that you think will help tracking down this bug, such as what you did in the game just before it happened.]" +
               "%0A%0AStacktrace:%0A" + stack;
            var url = "https://github.com/nroutasuo/level13/issues/new?title=" + bugTitle + "&body=" + bugBody + "&labels=exception";
            this.uiFunctions.showInfoPopup(
                "Error", 
                "You've found a bug! Please reload the page to continue playing.<br\><br\>" + 
                "You can also help the developer by <a href='" +
                url +
                "' target='_blank'>reporting</a> the problem on Github.", 
                "ok", 
                null
            );
            throw ex;
        },
		
		cheat: function (input) {
            if (!GameConstants.isCheatsEnabled) return; 
			this.cheatSystem.applyCheat(input);
		}
	
    });

    return Level13;
});
