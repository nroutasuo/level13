define([
	'text/TextLoader',
	'game/GameGlobals',
	'game/GameState',
	'game/GameFlowLogger',
	'game/MetaState',
	'game/PlayerActionFunctions',
	'game/UIFunctions',
	'game/helpers/CampHelper',
	'game/helpers/CampBalancingHelper',
	'game/helpers/CampVisHelper',
	'game/helpers/DialogueHelper',
	'game/helpers/ExplorerHelper',
	'game/helpers/FightHelper',
	'game/helpers/ItemsHelper',
	'game/helpers/LevelHelper',
	'game/helpers/MilestoneEffectsHelper',
	'game/helpers/MovementHelper',
	'game/helpers/PlayerHelper',
	'game/helpers/PlayerActionsHelper',
	'game/helpers/PlayerActionResultsHelper',
	'game/helpers/ResourcesHelper',
	'game/helpers/SaveHelper',
	'game/helpers/SectorHelper',
	'game/helpers/StoryHelper',
	'game/helpers/TribeBalancingHelper',
	'game/helpers/TribeHelper',
	'game/helpers/UpgradeEffectsHelper',
	'game/helpers/ButtonHelper',
	'game/helpers/ui/ChangeLogHelper',
	'game/helpers/ui/UIMapHelper',
	'game/helpers/ui/UITechTreeHelper',
], function (
	TextLoader,
	GameGlobals,
	GameState,
	GameFlowLogger,
	MetaState,
	PlayerActionFunctions,
	UIFunctions,
	CampHelper,
	CampBalancingHelper,
	CampVisHelper,
	DialogueHelper,
	ExplorerHelper,
	FightHelper,
	ItemsHelper,
	LevelHelper,
	MilestoneEffectsHelper,
	MovementHelper,
	PlayerHelper,
	PlayerActionsHelper,
	PlayerActionResultsHelper,
	ResourcesHelper,
	SaveHelper,
	SectorHelper,
	StoryHelper,
	TribeBalancingHelper,
	TribeHelper,
	UpgradeEffectsHelper,
	ButtonHelper,
	ChangeLogHelper,
	UIMapHelper,
	UITechTreeHelper,
) {
	var GameGlobalsInitializer = {
		
		init: function (engine) {
			GameGlobals.engine = engine;
			GameGlobals.gameState = new GameState();
			GameGlobals.metaState = new MetaState();
			GameGlobals.playerActionsHelper = new PlayerActionsHelper(engine);

			if (engine) {
				GameGlobals.playerActionFunctions = new PlayerActionFunctions(engine);
			}
			
			GameGlobals.upgradeEffectsHelper = new UpgradeEffectsHelper();
			GameGlobals.milestoneEffectsHelper = new MilestoneEffectsHelper();
			GameGlobals.itemsHelper = new ItemsHelper();
			GameGlobals.campHelper = new CampHelper(engine);
			GameGlobals.campBalancingHelper = new CampBalancingHelper();
			GameGlobals.dialogueHelper = new DialogueHelper(engine);
			GameGlobals.tribeBalancingHelper = new TribeBalancingHelper();
			GameGlobals.textLoader = new TextLoader();
			
			if (engine) {
				GameGlobals.changeLogHelper = new ChangeLogHelper();
				GameGlobals.explorerHelper = new ExplorerHelper(engine);
				GameGlobals.fightHelper = new FightHelper(engine);
				GameGlobals.gameFlowLogger = new GameFlowLogger();
				GameGlobals.levelHelper = new LevelHelper(engine);
				GameGlobals.movementHelper = new MovementHelper(engine);
				GameGlobals.playerActionResultsHelper = new PlayerActionResultsHelper(engine);
				GameGlobals.playerHelper = new PlayerHelper(engine);
				GameGlobals.resourcesHelper = new ResourcesHelper(engine);
				GameGlobals.saveHelper = new SaveHelper();
				GameGlobals.sectorHelper = new SectorHelper(engine);
				GameGlobals.storyHelper = new StoryHelper(engine);
				GameGlobals.tribeHelper = new TribeHelper(engine);
			}

			if (engine) {
				GameGlobals.uiMapHelper = new UIMapHelper(engine);
				GameGlobals.uiTechTreeHelper = new UITechTreeHelper(engine);
				GameGlobals.buttonHelper = new ButtonHelper();
				GameGlobals.uiFunctions = new UIFunctions();
				GameGlobals.campVisHelper = new CampVisHelper();
			}
		}
		
	};
	
	return GameGlobalsInitializer;
});
