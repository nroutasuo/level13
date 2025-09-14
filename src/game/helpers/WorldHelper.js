// wrapper around world generation for a running game
// parses necessary information from a save, loads/generates the world, keeps track of world state and generates more levels as needed
define([
	'ash',
	'utils/ObjectUtils',
	'game/GameGlobals',
	'game/constants/GameConstants',
	'worldcreator/WorldCreator',
	'worldcreator/WorldCreatorHelper',
	'worldcreator/WorldCreatorRandom',
	'worldcreator/WorldValidator',
	'worldcreator/WorldTemplateVO',
], function (
	Ash,
	ObjectUtils, 
	GameGlobals,
	GameConstants,
	WorldCreator,
	WorldCreatorHelper,
	WorldCreatorRandom,
	WorldValidator,
	WorldTemplateVO,
) {
	
	let WorldHelper = Ash.Class.extend({

		worldVO: null,
		isBusy: false,

		constructor: function () {},

		prepareWorld: function (save) {
			return new Promise((resolve, reject) => {
				log.i("START " + GameConstants.STARTTimeNow() + "\t preparing world");

				let saveData = this.parseSave(save);
				let worldSeed = saveData.hasSave ? saveData.worldSeed : WorldCreatorRandom.getNewSeed();
				let levels = saveData.levels || [ 13 ];
				
				this.createWorldVO(worldSeed, saveData.hasSave)
				.then(worldVO => this.fillWorldVO(worldVO, levels))
				.then(worldVO => {
					log.i("START " + GameConstants.STARTTimeNow() + "\t world created (seed: " + worldVO.seed + ")");
					let worldTemplateVO = new WorldTemplateVO(worldVO);
					GameGlobals.gameState.worldSeed = worldVO.seed;
					GameGlobals.worldState.worldTemplateVO = worldTemplateVO;
					this.worldVO = worldVO;
					resolve(worldVO);
				})
				.catch(error => {
					this.showWorldGenerationFailedWarning();
					reject(error);
				});
			});
		},

		parseSave: function (save) {
			let hasSave = save != null;
				
			let worldSeed = 0;
			let savedWorldTemplateVO = null;
			let levels = null;

			if (hasSave) {
				let loadedGameState = save.gameState;
				worldSeed = parseInt(loadedGameState.worldSeed);

				if (save.worldState) {
					savedWorldTemplateVO = save.worldState.worldTemplateVO;
					levels = save.worldState.revealedLevels || [ save.entitiesObject.player.Position.level ];
				} else {
					levels = [];
				}

				if (save.gameState.numCamps) {
					let lastCampLevelOrdinal = WorldCreatorHelper.getLevelOrdinalForCampOrdinal(worldSeed, save.gameState.numCamps);
					for (let levelOrdinal = 1; levelOrdinal <= lastCampLevelOrdinal; levelOrdinal++) {
						let level = WorldCreatorHelper.getLevelForOrdinal(worldSeed, levelOrdinal);
						if (levels.indexOf(level) < 0) {
							levels.push(level);
						}
					}
				}
			}

			let result = {};
			result.hasSave = hasSave;
			result.worldSeed = worldSeed;
			result.savedWorldTemplateVO = savedWorldTemplateVO;
			result.levels = levels;

			return result;
		},
		
		createWorldVO: function (seed, hasSave, tryNumber) {
			return new Promise(function(resolve, reject) {
				let maxTries = GameConstants.isDebugVersion ? 1 : 10;
				tryNumber = tryNumber || 1;
				
				setTimeout(() => {
					this.tryGenerateWorldVO(seed, tryNumber, maxTries).then(result => {
						if (!result.validationResult.isValid) {
							this.logFailedWorldSeed(seed, result.validationResult.reason);
						}
						
						if (result.validationResult.isValid) {
							resolve(result.worldVO);
							return;
						}
						
						if (hasSave && result.worldVO != null) {
							log.i("using broken world because old save exists");
							resolve(result.worldVO);
							return;
						}
						
						if (tryNumber >= maxTries) {
							log.e("ran out of tries to generate world");
							reject(new Error("ran out of tries to generate world"));
							return;
						}
						
						log.i("trying another seed");
						resolve(this.createWorldVO(seed, hasSave, tryNumber + 1));
					});
				}, 1);
			}.bind(this));
		},
		
		tryGenerateWorldVO: function (seed, tryNumber, maxTries) {
			return new Promise(function(resolve, reject) {
				log.i("START " + GameConstants.STARTTimeNow() + "\t generating world, try " + tryNumber + "/" + maxTries);
				let s = seed + (tryNumber - 1) * 111;
				
				WorldCreator.createWorld(s, GameGlobals.itemsHelper).then(worldVO => {
					log.i("START " + GameConstants.STARTTimeNow() + "\t validating world");
					let validationResult = WorldValidator.validateWorld(worldVO);
					resolve({ worldVO: worldVO, validationResult: validationResult });
				}).catch(ex => {
					if (GameConstants.isDebugVersion) {
						throw ex;
					}
					let exceptionDescription = "exception: " + StringUtils.getExceptionDescription(ex).title;
					resolve({ worldVO: null, validationResult: exceptionDescription });
				});
			}.bind(this));
		},

		fillWorldVO: function (worldVO, levels) {
			return new Promise(function(resolve, reject) {
				log.i("START " + GameConstants.STARTTimeNow() + "\t generating levels: " + levels.join(","));
				WorldCreator.generateLevels(worldVO.seed, worldVO, levels, GameGlobals.itemsHelper).then(worldVO => {
					log.i("START " + GameConstants.STARTTimeNow() + "\t levels generated");
					resolve(worldVO);
				});
			});
		},

		generateLevel: function (level, cb) {
			return this.generateLevels([ level ], cb);
		},

		generateLevels: function (levels) {
			return new Promise((resolve, reject) => {
				if (!this.isWorldGenerated()) {
					this.logWorldNotGenerated("generateLevels");
					reject();
				};
				if (this.isBusy) {
					log.e("already busy")
					reject();
				}

				this.isBusy = true;

				WorldCreator.generateLevels(this.worldVO.seed, this.worldVO, levels, GameGlobals.itemsHelper)
				.then(worldVO => {
					this.isBusy = false;
					resolve(worldVO);
				})
				.catch(error => {
					this.isBusy = false;
					this.showWorldGenerationFailedWarning();
					reject(error);
				});
			});
		},

		getGeneratedLevels: function () {
			let result = [];

			if (!this.worldVO) return result;

			for (let l = this.worldVO.topLevel; l >= this.worldVO.bottomLevel; l--) {
				if (this.isLevelGenerated(l)) result.push(l);
			}

			return result;
		},

		isWorldGenerated: function () {
			return this.worldVO != null;
		},

		isLevelGenerated: function (level) {
			return this.worldVO && this.worldVO.levels[level] && this.worldVO.levels[level].sectors && this.worldVO.levels[level].sectors.length > 0;
		},

		// helpers used when creating entities

		getSectorFeatures: function (worldVO, level, sectorX, sectorY) {
			var sectorVO = worldVO.getLevel(level).getSector(sectorX, sectorY);
			var sectorFeatures = {};
			sectorFeatures.criticalPaths = sectorVO.criticalPathTypes || [];
			sectorFeatures.zone = sectorVO.zone;
			sectorFeatures.buildingDensity = sectorVO.buildingDensity;
			sectorFeatures.wear = sectorVO.wear;
			sectorFeatures.damage = sectorVO.damage;
			sectorFeatures.sunlit = sectorVO.sunlit > 0;
			sectorFeatures.ground = level == worldVO.bottomLevel;
			sectorFeatures.surface = level == worldVO.topLevel;
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

		getLocales: function (worldVO, level, sectorX, sectorY) {
			return worldVO.getLevel(level).getSector(sectorX, sectorY).locales;
		},

		getCriticalPaths: function (worldVO, level, sectorX, sectorY) {
			return worldVO.getLevel(level).getSector(sectorX, sectorY).criticalPathTypes;
		},

		getSectorEnemies: function (worldVO, level, sectorX, sectorY) {
			return worldVO.getLevel(level).getSector(sectorX, sectorY).possibleEnemies;
		},

		getHasSectorRegularEnemies: function (worldVO, level, sectorX, sectorY) {
			return worldVO.getLevel(level).getSector(sectorX, sectorY).hasRegularEnemies;
		},

		getSectorLocaleEnemyCount: function (worldVO, level, sectorX, sectorY) {
			return worldVO.getLevel(level).getSector(sectorX, sectorY).numLocaleEnemies;
		},

		// internal helpers
		
		logFailedWorldSeed: function (seed, reason) {
			log.e("geneating world failed! seed: " + seed + ", reason: " + reason);
		},

		logWorldNotGenerated: function (context) {
			log.e(context + ": world skeleton is not generated");
		},
		
		showWorldGenerationFailedWarning: function () {
			GameGlobals.uiFunctions.setGameOverlay(false, false);
			GameGlobals.uiFunctions.showInfoPopup(
				"Warning",
				"World generation failed.",
				"Continue"
			);
		},
		
	});

	return WorldHelper;
});
