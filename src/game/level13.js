define([
    'ash',
    'game/components/GameState',
    'game/systems/GameManager',
    'game/systems/SaveSystem',
    'game/systems/AutoPlaySystem',
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
    'game/systems/GlobalResourcesSystem',
    'game/systems/GlobalResourcesResetSystem',
    'game/systems/BagSystem',
    'game/systems/UnlockedFeaturesSystem',
    'game/systems/occurrences/CampEventsSystem',
    'game/constants/SystemPriorities',
    'game/EntityCreator',
    'game/PlayerActionFunctions',
    'game/OccurrenceFunctions',
    'game/UIFunctions',
    'game/helpers/PlayerActionsHelper',
    'game/helpers/PlayerActionResultsHelper',
    'game/helpers/ResourcesHelper',
    'game/helpers/MovementHelper',
    'game/helpers/LevelHelper',
    'game/helpers/SectorHelper',
    'game/helpers/SaveHelper',
    'game/helpers/UpgradeEffectsHelper',
    'brejep/tickprovider',
], function (
    Ash,
    GameState,
    GameManager,
    SaveSystem,
    AutoPlaySystem,
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
    GlobalResourcesSystem,
    GlobalResourcesResetSystem,
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
    SectorHelper,
    SaveHelper,
    UpgradeEffectsHelper,
    TickProvider
) {
    var Level13 = Ash.Class.extend({
	
        engine: null,
	
        gameState: null,
	
		uiFunctions: null,
		occurrenceFunctions: null,
		playerActionFunctions: null,
		
		gameManager: null,
		saveSystem: null,
	
        tickProvider: null,

        constructor: function () {
            this.engine = new Ash.Engine();
			this.gameState = new GameState();
	    
			// Singleton helper modules to be passed to systems that need them
			this.resourcesHelper = new ResourcesHelper(this.engine);
			this.playerActionsHelper = new PlayerActionsHelper(this.engine, this.gameState, this.resourcesHelper);
			this.levelHelper = new LevelHelper(this.engine, this.gameState, this.playerActionsHelper);
			this.sectorHelper = new SectorHelper(this.engine);
			this.playerActionResultsHelper = new PlayerActionResultsHelper(this.engine, this.gameState, this.resourcesHelper, this.levelHelper);
			this.movementHelper = new MovementHelper(this.engine);
			this.saveHelper = new SaveHelper();
			this.upgradeEffectsHelper = new UpgradeEffectsHelper(this.playerActionsHelper);
			
			// Global signals
			this.playerMovedSignal = new Ash.Signals.Signal();
			this.improvementBuiltSignal = new Ash.Signals.Signal();
			this.tabChangedSignal = new Ash.Signals.Signal();
			
			// Basic building blocks & special systems
			this.tickProvider = new TickProvider(null);
			this.saveSystem = new SaveSystem(this.gameState);
			this.playerActionFunctions = new PlayerActionFunctions(
				this.gameState,
				this.resourcesHelper,
				this.levelHelper,
				this.playerActionsHelper,
				this.playerActionResultsHelper,
				this.playerMovedSignal,
				this.tabChangedSignal,
				this.improvementBuiltSignal);
			this.uiFunctions = new UIFunctions(this.playerActionFunctions, this.gameState, this.saveSystem);
			this.occurrenceFunctions = new OccurrenceFunctions(this.uiFunctions, this.resourcesHelper);
			
			this.playerActionFunctions.occurrenceFunctions = this.occurrenceFunctions;
			this.playerActionFunctions.uiFunctions = this.uiFunctions;
			
			// Systems
			this.addSystems(new EntityCreator(this.engine));
        },
	
		addSystems: function (creator) {
			this.gameManager = new GameManager(this.tickProvider, this.gameState, creator, this.uiFunctions, this.playerActionFunctions, this.saveHelper);
			this.engine.addSystem(this.gameManager, SystemPriorities.preUpdate);
			this.engine.addSystem(this.playerActionFunctions, SystemPriorities.preUpdate);
			this.engine.addSystem(this.occurrenceFunctions, SystemPriorities.preUpdate);
			this.engine.addSystem(this.saveSystem, SystemPriorities.preUpdate);
			
			this.engine.addSystem(new GlobalResourcesResetSystem(), SystemPriorities.update);
			this.engine.addSystem(new VisionSystem(), SystemPriorities.update);
			this.engine.addSystem(new StaminaSystem(), SystemPriorities.update);
			this.engine.addSystem(new BagSystem(this.gameState), SystemPriorities.update);
			this.engine.addSystem(new CollectorSystem(), SystemPriorities.update);
			this.engine.addSystem(new FightSystem(this.gameState, this.resourcesHelper, this.playerActionResultsHelper, this.occurrenceFunctions), SystemPriorities.update);
			this.engine.addSystem(new PopulationSystem(), SystemPriorities.update);
			this.engine.addSystem(new WorkerSystem(this.resourcesHelper, this.upgradeEffectsHelper), SystemPriorities.update);
			this.engine.addSystem(new FaintingSystem(this.uiFunctions, this.playerActionFunctions, this.playerActionResultsHelper), SystemPriorities.update);
			this.engine.addSystem(new ReputationSystem(), SystemPriorities.update);
			this.engine.addSystem(new RumourSystem(this.gameState, this.upgradeEffectsHelper), SystemPriorities.update);
			this.engine.addSystem(new EvidenceSystem(this.gameState, this.upgradeEffectsHelper), SystemPriorities.update);
			this.engine.addSystem(new PlayerPositionSystem(this.gameState, this.uiFunctions, this.occurrenceFunctions, this.playerMovedSignal), SystemPriorities.preupdate);
			this.engine.addSystem(new SectorStatusSystem(this.movementHelper, this.levelHelper), SystemPriorities.update);
			this.engine.addSystem(new LevelPassagesSystem(this.levelHelper, this.improvementBuiltSignal), SystemPriorities.update);
			this.engine.addSystem(new UnlockedFeaturesSystem(this.gameState), SystemPriorities.update);
			this.engine.addSystem(new GlobalResourcesSystem(this.gameState, this.upgradeEffectsHelper), SystemPriorities.update);
			this.engine.addSystem(new CampEventsSystem(this.occurrenceFunctions, this.upgradeEffectsHelper, this.gameState, this.saveSystem), SystemPriorities.update);
			
			this.engine.addSystem(new AutoPlaySystem(this.playerActionFunctions, this.levelHelper, this.sectorHelper, this.upgradeEffectsHelper), SystemPriorities.postUpdate);
			
			this.engine.addSystem(new UIOutHeaderSystem(this.uiFunctions, this.gameState, this.resourcesHelper), SystemPriorities.render);
			this.engine.addSystem(new UIOutElementsSystem(this.uiFunctions, this.gameState, this.playerActionFunctions, this.resourcesHelper, this.levelHelper), SystemPriorities.render);
			this.engine.addSystem(new UIOutLevelSystem(this.uiFunctions, this.tabChangedSignal, this.gameState, this.movementHelper, this.resourcesHelper, this.sectorHelper, this.playerMovedSignal), SystemPriorities.render);
			this.engine.addSystem(new UIOutCampSystem(this.uiFunctions, this.tabChangedSignal, this.gameState, this.levelHelper, this.upgradeEffectsHelper), SystemPriorities.render);
			this.engine.addSystem(new UIOutBagSystem(this.uiFunctions, this.tabChangedSignal, this.playerActionsHelper, this.gameState), SystemPriorities.render);
			this.engine.addSystem(new UIOutUpgradesSystem(this.uiFunctions, this.tabChangedSignal, this.playerActionFunctions, this.upgradeEffectsHelper), SystemPriorities.render);
			this.engine.addSystem(new UIOutTribeSystem(this.uiFunctions, this.tabChangedSignal, this.resourcesHelper), SystemPriorities.render);
			this.engine.addSystem(new UIOutFightSystem(this.uiFunctions), SystemPriorities.render);
			this.engine.addSystem(new UIOutLogSystem(this.playerMovedSignal), SystemPriorities.render);
		},
	
		start: function () {
			this.tickProvider.add(this.engine.update, this.engine);
			this.tickProvider.start();
            this.gameManager.startGame();
		},
		
		cheat: function (input) {
			this.playerActionFunctions.cheat(input);
		}
	
    });

    return Level13;
});
