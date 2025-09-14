// Generates a world given a random seed. The seed should be a positive int.
// A world (WorldVO) consists of LevelVOs which in turn consist of SectorVOs.
define([
	'ash',
	'utils/FlowUtils',
	'game/constants/WorldConstants',
	'worldcreator/WorldCreatorHelper',
	'worldcreator/WorldCreatorDebug',
	'worldcreator/WorldCreatorLogger',
	'worldcreator/EnemyCreator',
	'worldcreator/WorldVO',
	'worldcreator/WorldSkeletonGenerator',
	'worldcreator/LevelFeaturesGenerator',
	'worldcreator/LevelStructureGenerator',
	'worldcreator/SectorFeaturesGenerator',
	'worldcreator/SectorContentGenerator',
], function (
	Ash, FlowUtils, WorldConstants,
	WorldCreatorHelper, WorldCreatorDebug, WorldCreatorLogger, EnemyCreator,
	WorldVO,
	WorldSkeletonGenerator, LevelFeaturesGenerator, LevelStructureGenerator, SectorFeaturesGenerator, SectorContentGenerator
) {
	let WorldCreator = {
		
		context: "WorldCreator",

		createWorld: function (seed) {
			return new Promise(function(resolve, reject) {
				let tasks = [];

				let topLevel = WorldCreatorHelper.getHighestLevel(seed);
				let bottomLevel = WorldCreatorHelper.getBottomLevel(seed);

				let worldVO = new WorldVO(seed, topLevel, bottomLevel);

				tasks.push(() => WorldCreator.generateWorldSkeleton(seed, worldVO));
				tasks.push(() => WorldCreator.generateLevelFeatures(seed, worldVO));
				
				WorldCreatorLogger.start(seed);
					
				FlowUtils.executeTasksInSteps(tasks, () => {
					WorldCreatorLogger.end();
					resolve(worldVO);
				}, (ex) => {
					WorldCreatorLogger.end();
					reject(ex);
				});
				
			}.bind(this));
		},

		generateLevels: function (seed, worldVO, levels, itemsHelper) {
			return new Promise(function(resolve, reject) {
				
				let enemyCreator = new EnemyCreator();
				enemyCreator.createEnemies();

				// generation order shouldn't matter but make it predictable anyway
				levels = levels.sort((a, b) => WorldCreatorHelper.getLevelOrdinal(seed, a) - WorldCreatorHelper.getLevelOrdinal(seed, b));

				let tasks = [];

				tasks.push(() => WorldCreator.generateLevelStructure(seed, worldVO, levels));
				tasks.push(() => WorldCreator.generateSectorFeatures(seed, worldVO, levels, itemsHelper));
				tasks.push(() => WorldCreator.generateSectorContent(seed, worldVO, levels, enemyCreator));
				
				WorldCreatorLogger.start(seed);
					
				FlowUtils.executeTasksInSteps(tasks, () => {
					WorldCreatorLogger.end();
					resolve(worldVO);
				}, (ex) => {
					WorldCreatorLogger.end();
					reject(ex);
				});
				
			}.bind(this));
		},

		generateWorldSkeleton: function (seed, worldVO) {
			WorldCreatorLogger.i("Step 1: World skeleton", this.context);

			WorldSkeletonGenerator.generate(seed, worldVO);

			WorldCreatorDebug.printWorldTemplate(worldVO);
		},

		generateLevelFeatures: function (seed, worldVO) {
			WorldCreatorLogger.i("Step 2: Level features", this.context);

			LevelFeaturesGenerator.generate(seed, worldVO);

			WorldCreatorDebug.printLevelTemplates(worldVO);
		},

		generateLevelStructure: function (seed, worldVO, levels) {
			WorldCreatorLogger.i("Step 3: Level structure", this.context);

			LevelStructureGenerator.generate(seed, worldVO, levels);

			WorldCreatorDebug.printLevelStructure(worldVO);
		},

		generateSectorFeatures: function (seed, worldVO, levels, itemsHelper) {
			WorldCreatorLogger.i("Step 4: Sector features", this.context);

			SectorFeaturesGenerator.generate(seed, worldVO, levels, itemsHelper);

			//WorldCreatorDebug.printSectorTemplates(worldVO);
		},

		generateSectorContent: function (seed, worldVO, levels, enemyCreator) {
			WorldCreatorLogger.i("Step 4: Sector content", this.context);

			SectorContentGenerator.generate(seed, worldVO, levels, enemyCreator);
		},

	};

	return WorldCreator;
});
