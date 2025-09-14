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
				
				this.generateWorld(worldSeed, saveData.hasSave)
				.then(worldVO => {
					this.worldVO = worldVO;
					GameGlobals.gameState.worldSeed = worldVO.seed;
				})
				.then(() => this.generateLevels(levels))
				.then(() => {
					log.i("START " + GameConstants.STARTTimeNow() + "\t world created (seed: " + this.worldVO.seed + ")");
					let worldTemplateVO = new WorldTemplateVO(this.worldVO);
					GameGlobals.worldState.worldTemplateVO = worldTemplateVO;
					resolve(this.worldVO);
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

				if (save.worldState.revealedLevels) 
					log.i("save.worldState.revealedLevels: " + save.worldState.revealedLevels.join(","))
				else
					log.w("no revealedLevels found!")

				if (save.worldState) {
					savedWorldTemplateVO = save.worldState.worldTemplateVO;
					levels = save.worldState.revealedLevels || [];
				} else {
					levels = [];
				}

				if (levels.indexOf(13) < 0) levels.push(13);

				let playerPositionLevel = save.entitiesObject.player.Position.level;
				if (levels.indexOf(playerPositionLevel) < 0) levels.push(playerPositionLevel);

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
		
		generateWorld: function (seed, hasSave, tryNumber) {
			return new Promise(function(resolve, reject) {
				let maxTries = GameConstants.isDebugVersion ? 1 : 10;
				tryNumber = tryNumber || 1;
				
				setTimeout(() => {
					this.tryGenerateWorld(seed, tryNumber, maxTries).then(result => {						
						if (result.validationResult.isValid) {
							resolve(result.worldVO);
							return;
						}

						log.e("generateWorld: world is not valid! seed: " + result.worldVO.seed + ", reason: " + result.validationResult.reason);
						
						if (hasSave && result.worldVO != null) {
							log.i("generateWorld: using broken world because old save exists", this);
							resolve(result.worldVO);
							return;
						}
						
						if (tryNumber >= maxTries) {
							log.e("generateWorld: ran out of tries to generate world", this);
							reject(new Error("ran out of tries to generate world"));
							return;
						}
						
						log.i("generateWorld: trying another seed", this);
						resolve(this.generateWorld(seed, hasSave, tryNumber + 1));
					});
				}, 1);
			}.bind(this));
		},
		
		tryGenerateWorld: function (seed, tryNumber, maxTries) {
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
					this.validateLevels(levels);
					resolve(worldVO);
				})
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

		validateLevels: function (levels) {
			for (let i = 0; i < levels.length; i++) {
				let l = levels[i];
				let levelVO = this.worldVO.levels[l];
				let validationResult = WorldValidator.validateLevel(this.worldVO, levelVO);
				if (validationResult.isValid) continue;

				// log errors
				log.e("validateLevels: level " + l +  " is not valid! seed: " + this.worldVO.seed + ", reason: " + validationResult.reason);
			}
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
