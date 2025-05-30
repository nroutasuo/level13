// Generates a world given a random seed. The seed should be a positive int.
// A world (WorldVO) consists of LevelVOs which in turn consist of SectorVOs.
define([
	'ash',
	'utils/MathUtils',
	'game/constants/WorldConstants',
	'worldcreator/WorldCreatorHelper',
	'worldcreator/WorldCreatorRandom',
	'worldcreator/WorldCreatorDebug',
	'worldcreator/WorldCreatorLogger',
	'worldcreator/EnemyCreator',
	'worldcreator/WorldVO',
	'worldcreator/LevelVO',
	'worldcreator/SectorVO',
	'worldcreator/WorldGenerator',
	'worldcreator/LevelGenerator',
	'worldcreator/StructureGenerator',
	'worldcreator/SectorGenerator',
], function (
	Ash, MathUtils, WorldConstants,
	WorldCreatorHelper, WorldCreatorRandom, WorldCreatorDebug, WorldCreatorLogger, EnemyCreator,
	WorldVO, LevelVO, SectorVO, WorldGenerator, LevelGenerator, StructureGenerator, SectorGenerator,
) {
	var context = "WorldCreator";

	var WorldCreator = {

		world: null,

		prepareWorld: function (seed, itemsHelper) {
			return new Promise(function(resolve, reject) {
			
				let tasks = [
					() => {
						WorldCreatorLogger.i("Step 1/4: World template", this.context);
						WorldGenerator.prepareWorld(seed, this.world);
						WorldCreatorDebug.printWorldTemplate(this.world);
					},
					() => {
						WorldCreatorLogger.i("Step 2/4: Level templates", this.context);
						LevelGenerator.prepareLevels(seed, this.world);
						WorldCreatorDebug.printLevelTemplates(this.world);
					},
					() => {
						WorldCreatorLogger.i("Step 3/4: Level structure", this.context);
						StructureGenerator.prepareStructure(seed, this.world);
						WorldCreatorDebug.printLevelStructure(this.world);
					},
					() => {
						WorldCreatorLogger.i("Step 4/4: Sector templates", this.context);
						SectorGenerator.prepareSectors(seed, this.world, itemsHelper, enemyCreator);
						//WorldCreatorDebug.printSectorTemplates(this.world);
					},
					() => {
						WorldCreatorLogger.i("Done");
					}
				];
				
				let enemyCreator = new EnemyCreator();
				enemyCreator.createEnemies();
				
				WorldCreatorLogger.start(seed);

				let topLevel = WorldCreatorHelper.getHighestLevel(seed);
				let bottomLevel = WorldCreatorHelper.getBottomLevel(seed);
				this.world = new WorldVO(seed, topLevel, bottomLevel);
					
				this.executeTasksInSteps(tasks, () => {
					WorldCreatorLogger.end();
					resolve(this.world);
				}, (ex) => {
					WorldCreatorLogger.end();
					reject(ex);
				});
				
			}.bind(this));
		},
		
		// TODO put this (executeTasksInSteps + executeTaskInSteps) to some utils
		
		executeTasksInSteps: function (tasks, cb, errorcb) {
			this.executeTaskInSteps(tasks, 0, cb, errorcb);
		},
		
		executeTaskInSteps: function (tasks, i, cb, errorcb) {
			if (tasks.length == 0 || i >= tasks.length) {
				cb();
				return;
			}
			
			setTimeout(() => {
				try {
					tasks[i]();
					this.executeTaskInSteps(tasks, i + 1, cb, errorcb);
				} catch (ex) {
					errorcb(ex);
				}
			}, 1);
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
