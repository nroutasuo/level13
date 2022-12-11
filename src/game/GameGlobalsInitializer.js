define([
	'game/GameGlobals',
	'game/GameState',
	'game/GameFlowLogger',
	'game/PlayerActionFunctions',
	'game/UIFunctions',
	'game/helpers/AutoPlayHelper',
	'game/helpers/CampHelper',
	'game/helpers/CampBalancingHelper',
	'game/helpers/CampVisHelper',
	'game/helpers/EndingHelper',
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
	'game/helpers/TribeBalancingHelper',
	'game/helpers/TribeHelper',
	'game/helpers/UpgradeEffectsHelper',
	'game/helpers/ButtonHelper',
	'game/helpers/ui/ChangeLogHelper',
	'game/helpers/ui/UIMapHelper',
	'game/helpers/ui/UITechTreeHelper',
], function (
	GameGlobals,
	GameState,
	GameFlowLogger,
	PlayerActionFunctions,
	UIFunctions,
	AutoPlayHelper,
	CampHelper,
	CampBalancingHelper,
	CampVisHelper,
	EndingHelper,
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
			GameGlobals.gameState = new GameState();
			GameGlobals.playerActionsHelper = new PlayerActionsHelper(engine);
			if (engine) {
				GameGlobals.playerActionFunctions = new PlayerActionFunctions(engine);
			}
			
			GameGlobals.upgradeEffectsHelper = new UpgradeEffectsHelper();
			GameGlobals.milestoneEffectsHelper = new MilestoneEffectsHelper();
			GameGlobals.itemsHelper = new ItemsHelper();
			GameGlobals.campHelper = new CampHelper(engine);
			GameGlobals.campBalancingHelper = new CampBalancingHelper();
			GameGlobals.tribeBalancingHelper = new TribeBalancingHelper();
			
			if (engine) {
				GameGlobals.resourcesHelper = new ResourcesHelper(engine);
				GameGlobals.levelHelper = new LevelHelper(engine);
				GameGlobals.movementHelper = new MovementHelper(engine);
				GameGlobals.sectorHelper = new SectorHelper(engine);
				GameGlobals.fightHelper = new FightHelper(engine);
				GameGlobals.endingHelper = new EndingHelper(engine);
				GameGlobals.playerHelper = new PlayerHelper(engine);
				GameGlobals.tribeHelper = new TribeHelper(engine);
				GameGlobals.playerActionResultsHelper = new PlayerActionResultsHelper(engine);
				GameGlobals.autoPlayHelper = new AutoPlayHelper();
				GameGlobals.saveHelper = new SaveHelper();
				GameGlobals.changeLogHelper = new ChangeLogHelper();
				GameGlobals.gameFlowLogger = new GameFlowLogger();
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
