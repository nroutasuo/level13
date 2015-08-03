define([
    'ash',
    'game/components/GameState',
    'game/systems/GameManager',
    'game/systems/SaveSystem',
    'game/systems/ui/UIOutHeaderSystem',
    'game/systems/ui/UIOutElementsSystem',
    'game/systems/ui/UIOutLevelSystem',
    'game/systems/ui/UIOutCampSystem',
    'game/systems/ui/UIOutBagSystem',
    'game/systems/ui/UIOutUpgradesSystem',
    'game/systems/ui/UIOutTribeSystem',
    'game/systems/ui/UIOutFightSystem',
    'game/systems/ui/UIOutLogSystem',
    'game/systems/VisionSystem',
    'game/systems/StaminaSystem',
    'game/systems/PlayerPositionSystem',
    'game/systems/SectorMovementOptionsSystem',
    'game/systems/LevelPassagesSystem',
    'game/systems/SectorEnemiesSystem',
    'game/systems/CollectorSystem',
    'game/systems/FightSystem',
    'game/systems/PopulationSystem',
    'game/systems/WorkerSystem',
    'game/systems/FaintingSystem',
    'game/systems/ReputationSystem',
    'game/systems/RumourSystem',
    'game/systems/EvidenceSystem',
    'game/systems/GlobalResourcesSystem',
    'game/systems/BagSystem',
    'game/systems/UnlockedFeaturesSystem',
    'game/systems/occurrences/CampEventsSystem',
    'game/systems/systempriorities',
    'game/EntityCreator',
    'game/PlayerActionFunctions',
    'game/OccurrenceFunctions',
    'game/UIFunctions',
    'game/helpers/PlayerActionsHelper',
    'game/helpers/PlayerActionResultsHelper',
    'game/helpers/ResourcesHelper',
    'game/helpers/MovementHelper',
    'game/helpers/LevelHelper',
    'game/helpers/SaveHelper',
    'brejep/tickprovider',
], function (
    Ash,
    GameState,
    GameManager,
    SaveSystem,
    UIOutHeaderSystem,
    UIOutElementsSystem,
    UIOutLevelSystem,
    UIOutCampSystem,
    UIOutBagSystem,
    UIOutUpgradesSystem,
    UIOutTribeSystem,
    UIOutFightSystem,
    UIOutLogSystem,
    VisionSystem,
    StaminaSystem,
    PlayerPositionSystem,
    SectorMovementOptionsSystem,
    LevelPassagesSystem,
    SectorEnemiesSystem,
    CollectorSystem,
    FightSystem,
    PopulationSystem,
    WorkerSystem,
    FaintingSystem,
    ReputationSystem,
    RumourSystem,
    EvidenceSystem,
    GlobalResourcesSystem,
    BagSystem,
    UnlockedFeaturesSystem,
    CampEventsSystem,
    SystemPriorities,
    EntityCreator,
    PlayerActionFunctions,
    OccurrenceFunctions,
    UIFunctions,
    PlayerActionsHelper,
    PlayerActionResultsHelper,
    ResourcesHelper,
    MovementHelper,
    LevelHelper,
    SaveHelper,
    TickProvider
) {
    var Level13 = Ash.Class.extend({
	
        engine: null,
	
        gameState: null,
	
		uiFunctions: null,
		occurrenceFunctions: null,
		playerActions: null,
		
		gameManager: null,
		saveSystem: null,
	
        tickProvider: null,

        constructor: function () {
            this.engine = new Ash.Engine();
			this.gameState = new GameState();
	    
			// Singleton helper modules to be passed to systems that need them
			this.resourcesHelper = new ResourcesHelper(this.engine);
			this.playerActionsHelper = new PlayerActionsHelper(this.engine, this.gameState, this.resourcesHelper);
			this.playerActionResultsHelper = new PlayerActionResultsHelper(this.engine, this.gameState, this.resourcesHelper);
			this.movementHelper = new MovementHelper(this.engine);
			this.levelHelper = new LevelHelper(this.engine, this.playerActionsHelper);
			this.saveHelper = new SaveHelper();
			
			// Global signals
			this.playerMovedSignal = new Ash.Signals.Signal();
			this.improvementBuiltSignal = new Ash.Signals.Signal();
			
			// Basic building blocks & special systems
			this.tickProvider = new TickProvider(null);
			this.saveSystem = new SaveSystem(this.gameState);
			this.playerActions = new PlayerActionFunctions(this.gameState, this.resourcesHelper, this.levelHelper, this.playerActionsHelper, this.playerActionResultsHelper, this.playerMovedSignal, this.improvementBuiltSignal);
			this.uiFunctions = new UIFunctions(this.playerActions, this.gameState, this.saveSystem);
			this.occurrenceFunctions = new OccurrenceFunctions(this.uiFunctions);
			
			this.playerActions.occurrenceFunctions = this.occurrenceFunctions;
			this.playerActions.uiFunctions = this.uiFunctions;
			
			// Systems
			this.addSystems(new EntityCreator(this.engine));
        },
	
		addSystems: function (creator) {
			this.gameManager = new GameManager(this.tickProvider, this.gameState, creator, this.uiFunctions, this.playerActions, this.saveHelper);
			this.engine.addSystem(this.gameManager, SystemPriorities.preUpdate);
			
			this.engine.addSystem(this.playerActions, SystemPriorities.preUpdate);
			this.engine.addSystem(this.occurrenceFunctions, SystemPriorities.preUpdate);
			this.engine.addSystem(this.saveSystem, SystemPriorities.preUpdate);
			
			this.engine.addSystem(new UIOutHeaderSystem(this.gameState, this.uiFunctions, this.resourcesHelper), SystemPriorities.render);
			this.engine.addSystem(new UIOutElementsSystem(this.gameState, this.playerActions, this.uiFunctions, this.resourcesHelper, this.levelHelper), SystemPriorities.render);
			this.engine.addSystem(new UIOutLevelSystem(this.uiFunctions, this.gameState, this.movementHelper, this.resourcesHelper, this.playerMovedSignal), SystemPriorities.render);
			this.engine.addSystem(new UIOutCampSystem(this.uiFunctions, this.gameState, this.levelHelper), SystemPriorities.render);
			this.engine.addSystem(new UIOutBagSystem(this.uiFunctions, this.gameState), SystemPriorities.render);
			this.engine.addSystem(new UIOutUpgradesSystem(this.uiFunctions, this.playerActions), SystemPriorities.render);
			this.engine.addSystem(new UIOutTribeSystem(this.uiFunctions, this.resourcesHelper), SystemPriorities.render);
			this.engine.addSystem(new UIOutFightSystem(this.uiFunctions), SystemPriorities.render);
			this.engine.addSystem(new UIOutLogSystem(this.playerMovedSignal), SystemPriorities.update);
			
			this.engine.addSystem(new CampEventsSystem(this.occurrenceFunctions, this.gameState, this.saveSystem), SystemPriorities.update);
			
			this.engine.addSystem(new VisionSystem(), SystemPriorities.update);
			this.engine.addSystem(new StaminaSystem(), SystemPriorities.update);
			this.engine.addSystem(new GlobalResourcesSystem(this.gameState), SystemPriorities.update);
			this.engine.addSystem(new BagSystem(this.gameState), SystemPriorities.update);
			this.engine.addSystem(new CollectorSystem(), SystemPriorities.update);
			this.engine.addSystem(new FightSystem(this.gameState, this.resourcesHelper, this.playerActionResultsHelper, this.occurrenceFunctions), SystemPriorities.update);
			this.engine.addSystem(new PopulationSystem(), SystemPriorities.update);
			this.engine.addSystem(new WorkerSystem(this.resourcesHelper), SystemPriorities.update);
			this.engine.addSystem(new FaintingSystem(this.uiFunctions, this.playerActions, this.playerActionResultsHelper), SystemPriorities.update);
			this.engine.addSystem(new ReputationSystem(), SystemPriorities.update);
			this.engine.addSystem(new RumourSystem(this.gameState), SystemPriorities.update);
			this.engine.addSystem(new EvidenceSystem(this.gameState), SystemPriorities.update);
			this.engine.addSystem(new PlayerPositionSystem(this.gameState, this.uiFunctions, this.occurrenceFunctions, this.playerMovedSignal), SystemPriorities.preupdate);
			this.engine.addSystem(new SectorMovementOptionsSystem(this.movementHelper), SystemPriorities.update);
			this.engine.addSystem(new LevelPassagesSystem(this.levelHelper, this.improvementBuiltSignal), SystemPriorities.update);
			this.engine.addSystem(new SectorEnemiesSystem(), SystemPriorities.update);
			this.engine.addSystem(new UnlockedFeaturesSystem(this.gameState), SystemPriorities.update);
		},
	
		start: function () {
			this.tickProvider.add(this.engine.update, this.engine);
			this.tickProvider.start();
            this.gameManager.startGame();
		},
		
		cheat: function (input) {
			this.playerActions.cheat(input);
		}
	
    });

    return Level13;
});
