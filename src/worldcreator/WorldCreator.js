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
	'worldcreator/LevelSkeletonGenerator',
	'worldcreator/LevelStructureGenerator',
	'worldcreator/LevelFeaturesGenerator',
	'worldcreator/SectorFeaturesGenerator',
	'worldcreator/SectorContentGenerator',
], function (
	Ash, FlowUtils, WorldConstants,
	WorldCreatorHelper, WorldCreatorDebug, WorldCreatorLogger, EnemyCreator,
	WorldVO,
	WorldSkeletonGenerator, LevelSkeletonGenerator, LevelStructureGenerator, LevelFeaturesGenerator, SectorFeaturesGenerator, SectorContentGenerator
) {
	let WorldCreator = {
		
		context: "WorldCreator",

		createWorld: function (seed, worldTemplateVO) {
			return new Promise(function(resolve, reject) {
				worldTemplateVO = worldTemplateVO || { levels: [] };

				let version = WorldConstants.version;

				if (worldTemplateVO.seed) seed = worldTemplateVO.seed;
				if( worldTemplateVO.version) version = worldTemplateVO.version;

				let worldVO = new WorldVO(seed, version);

				let tasks = [];
				tasks.push(() => WorldCreator.generateWorldSkeleton(seed, worldVO, worldTemplateVO));
				tasks.push(() => WorldCreator.generateLevelSkeletons(seed, worldVO, worldTemplateVO));
				tasks.push(() => WorldCreator.resetInternalData(seed, worldVO));
				
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

		generateLevels: function (seed, worldVO, worldTemplateVO, levels, itemsHelper) {
			return new Promise(function(resolve, reject) {
				worldTemplateVO = worldTemplateVO || { levels: [] };
				
				let enemyCreator = new EnemyCreator();
				enemyCreator.createEnemies();

				// generation order shouldn't matter but make it predictable anyway
				levels = levels.sort((a, b) => WorldCreatorHelper.getLevelOrdinal(seed, a) - WorldCreatorHelper.getLevelOrdinal(seed, b));

				let tasks = [];
				tasks.push(() => WorldCreator.generateLevelStructure(seed, worldVO, worldTemplateVO, levels));
				tasks.push(() => WorldCreator.generateLevelFeatures(seed, worldVO, worldTemplateVO, levels));
				tasks.push(() => WorldCreator.generateSectorFeatures(seed, worldVO, worldTemplateVO, levels, itemsHelper));
				tasks.push(() => WorldCreator.generateSectorContent(seed, worldVO, worldTemplateVO, levels, enemyCreator));
				tasks.push(() => WorldCreator.resetInternalData(seed, worldVO));
				
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

		generateWorldSkeleton: function (seed, worldVO, worldTemplateVO) {
			WorldCreatorLogger.i("Step 1: World skeleton", this.context);

			WorldSkeletonGenerator.generate(seed, worldVO, worldTemplateVO);

			WorldCreatorDebug.printWorldTemplate(worldVO);
		},

		generateLevelSkeletons: function (seed, worldVO, worldTemplateVO) {
			WorldCreatorLogger.i("Step 2: Level skeletons", this.context);

			LevelSkeletonGenerator.generate(seed, worldVO, worldTemplateVO);

			WorldCreatorDebug.printLevelTemplates(worldVO);
		},

		generateLevelStructure: function (seed, worldVO, worldTemplateVO, levels) {
			WorldCreatorLogger.i("Step 3: Level structure", this.context);

			LevelStructureGenerator.generate(seed, worldVO, worldTemplateVO, levels);

			WorldCreatorDebug.printLevelStructure(worldVO);
		},

		generateLevelFeatures: function (seed, worldVO, worldTemplateVO, levels) {
			WorldCreatorLogger.i("Step 4: Level features", this.context);

			LevelFeaturesGenerator.generate(seed, worldVO, worldTemplateVO, levels);
		},

		generateSectorFeatures: function (seed, worldVO, worldTemplateVO, levels, itemsHelper) {
			WorldCreatorLogger.i("Step 5: Sector features", this.context);

			SectorFeaturesGenerator.generate(seed, worldVO, worldTemplateVO, levels, itemsHelper);

			//WorldCreatorDebug.printSectorTemplates(worldVO);
		},

		generateSectorContent: function (seed, worldVO, worldTemplateVO, levels, enemyCreator) {
			WorldCreatorLogger.i("Step 6: Sector content", this.context);

			SectorContentGenerator.generate(seed, worldVO, worldTemplateVO, levels, enemyCreator);
		},

		resetInternalData: function (seed, worldVO) {
			worldVO.resetInternalData();
		},

	};

	return WorldCreator;
});
