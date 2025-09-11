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
	'worldcreator/LevelVO',
	'worldcreator/SectorVO',
	'worldcreator/WorldSkeletonGenerator',
	'worldcreator/LevelFeaturesGenerator',
	'worldcreator/LevelStructureGenerator',
	'worldcreator/SectorFeaturesGenerator',
	'worldcreator/SectorContentGenerator',
], function (
	Ash, FlowUtils, WorldConstants,
	WorldCreatorHelper, WorldCreatorDebug, WorldCreatorLogger, EnemyCreator,
	WorldVO, LevelVO, SectorVO, 
	WorldSkeletonGenerator, LevelFeaturesGenerator, LevelStructureGenerator, SectorFeaturesGenerator, SectorContentGenerator
) {
	let WorldCreator = {
		
		context: "WorldCreator",

		world: null,

		createWorld: function (seed, itemsHelper) {
			return new Promise(function(resolve, reject) {
				
				let enemyCreator = new EnemyCreator();
				enemyCreator.createEnemies();

				let tasks = [];

				tasks.push(() => WorldCreator.generateWorldSkeleton(seed));
				tasks.push(() => WorldCreator.generateLevelFeatures(seed));
				tasks.push(() => WorldCreator.generateLevelStructure(seed));
				tasks.push(() => WorldCreator.generateSectorFeatures(seed, itemsHelper));
				tasks.push(() => WorldCreator.generateSectorContent(seed, enemyCreator));
				
				WorldCreatorLogger.start(seed);
					
				FlowUtils.executeTasksInSteps(tasks, () => {
					WorldCreatorLogger.end();
					resolve(this.world);
				}, (ex) => {
					WorldCreatorLogger.end();
					reject(ex);
				});
				
			}.bind(this));
		},

		generateWorldSkeleton: function (seed) {
			WorldCreatorLogger.i("Step 1: World skeleton", this.context);

			let topLevel = WorldCreatorHelper.getHighestLevel(seed);
			let bottomLevel = WorldCreatorHelper.getBottomLevel(seed);

			this.world = new WorldVO(seed, topLevel, bottomLevel);

			WorldSkeletonGenerator.generate(seed, this.world);

			WorldCreatorDebug.printWorldTemplate(this.world);
		},

		generateLevelFeatures: function (seed) {
			WorldCreatorLogger.i("Step 2: Level features", this.context);

			LevelFeaturesGenerator.generate(seed, this.world);

			WorldCreatorDebug.printLevelTemplates(this.world);
		},

		generateLevelStructure: function (seed) {
			WorldCreatorLogger.i("Step 3: Level structure", this.context);

			LevelStructureGenerator.generate(seed, this.world);

			WorldCreatorDebug.printLevelStructure(this.world);
		},

		generateSectorFeatures: function (seed, itemsHelper) {
			WorldCreatorLogger.i("Step 4: Sector features", this.context);

			SectorFeaturesGenerator.generate(seed, this.world, itemsHelper);

			//WorldCreatorDebug.printSectorTemplates(this.world);
		},

		generateSectorContent: function (seed, enemyCreator) {
			WorldCreatorLogger.i("Step 4: Sector content", this.context);

			SectorContentGenerator.generate(seed, this.world, enemyCreator);
		},

		discardWorld: function () {
			WorldCreatorLogger.i("Discard world", this.context)
			this.world.clear();
			this.world = null;
		},

		getPassageUp: function (level, sectorX, sectorY) {
			var sectorVO = this.world.getLevel(level).getSector(sectorX, sectorY);
			if (sectorVO.passageUpType) return sectorVO.passageUpType;
			return null;
		},

		getPassageDown: function (level, sectorX, sectorY) {
			var sectorVO = this.world.getLevel(level).getSector(sectorX, sectorY);
			if (sectorVO.passageDownType) return sectorVO.passageDownType;
			return null;
		},

		getSectorFeatures: function (level, sectorX, sectorY) {
			var sectorVO = this.world.getLevel(level).getSector(sectorX, sectorY);
			var sectorFeatures = {};
			sectorFeatures.criticalPaths = sectorVO.criticalPathTypes || [];
			sectorFeatures.zone = sectorVO.zone;
			sectorFeatures.buildingDensity = sectorVO.buildingDensity;
			sectorFeatures.wear = sectorVO.wear;
			sectorFeatures.damage = sectorVO.damage;
			sectorFeatures.sunlit = sectorVO.sunlit > 0;
			sectorFeatures.ground = level == this.world.bottomLevel;
			sectorFeatures.surface = level == this.world.topLevel;
			sectorFeatures.hazards = sectorVO.hazards;
			sectorFeatures.sectorType = sectorVO.sectorType;
			sectorFeatures.hasSpring = sectorVO.hasSpring;
			sectorFeatures.hasTradeConnectorSpot = sectorVO.hasTradeConnectorSpot;
			sectorFeatures.resourcesScavengable = sectorVO.resourcesScavengable;
			sectorFeatures.resourcesCollectable = sectorVO.resourcesCollectable;
			sectorFeatures.itemsScavengeable = sectorVO.itemsScavengeable;
			sectorFeatures.workshopResource = sectorVO.workshopResource;
			sectorFeatures.hasWorkshop = sectorVO.hasWorkshop;
			sectorFeatures.hasClearableWorkshop = sectorVO.hasClearableWorkshop;
			sectorFeatures.hasBuildableWorkshop = sectorVO.hasBuildableWorkshop;
			sectorFeatures.isCamp = sectorVO.isCamp;
			sectorFeatures.isInvestigatable = sectorVO.isInvestigatable;
			sectorFeatures.notCampableReason = sectorVO.notCampableReason;
			sectorFeatures.stashes = sectorVO.stashes || null;
			sectorFeatures.waymarks = sectorVO.waymarks || [];
			sectorFeatures.heapResource = sectorVO.heapResource || null;
			sectorFeatures.examineSpots = sectorVO.examineSpots || [];
			sectorFeatures.graffiti = sectorVO.graffiti || null;
			return sectorFeatures;
		},

		getLocales: function (level, sectorX, sectorY) {
			return this.world.getLevel(level).getSector(sectorX, sectorY).locales;
		},

		getCriticalPaths: function (level, sectorX, sectorY) {
			return this.world.getLevel(level).getSector(sectorX, sectorY).criticalPathTypes;
		},

		getSectorEnemies: function (level, sectorX, sectorY) {
			return this.world.getLevel(level).getSector(sectorX, sectorY).possibleEnemies;
		},

		getHasSectorRegularEnemies: function (level, sectorX, sectorY) {
			return this.world.getLevel(level).getSector(sectorX, sectorY).hasRegularEnemies;
		},

		getSectorLocaleEnemyCount: function (level, sectorX, sectorY) {
			return this.world.getLevel(level).getSector(sectorX, sectorY).numLocaleEnemies;
		},

	};

	return WorldCreator;
});
