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
				log.i("preparing world (" + GameConstants.getTimeSinceStart() + ")", "start");

				let saveData = this.parseSave(save);
				let worldSeed = saveData.hasSave ? saveData.worldSeed : WorldCreatorRandom.getNewSeed();
				let levels = saveData.levels || [ 13 ];
				
				this.generateWorld(worldSeed, saveData.worldTemplateVO, saveData.hasSave)
				.then(worldVO => {
					this.worldVO = worldVO;
					GameGlobals.gameState.worldSeed = worldVO.seed;
				})
				.then(() => this.generateLevels(levels, saveData.worldTemplateVO))
				.then(() => this.saveWorld(saveData.worldTemplateVO))
				.then(() => {
					log.i("world created (seed: " + this.worldVO.seed + ") (" + GameConstants.getTimeSinceStart() + ")", "start");
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

				if (save.worldState && save.worldState.revealedLevels) 
					log.i("save.worldState.revealedLevels: " + save.worldState.revealedLevels.join(","))
				else
					log.w("no revealedLevels found!")

				if (save.worldState) {
					savedWorldTemplateVO = new WorldTemplateVO();
					savedWorldTemplateVO.customLoadFromSave(save.worldState.worldTemplateVO);
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
			result.worldTemplateVO = this.getValidWorldTemplate(savedWorldTemplateVO);
			result.levels = levels;

			return result;
		},

		getValidWorldTemplate: function (worldTemplateVO) {
			if (!worldTemplateVO) return null;

			let validationResult = WorldValidator.validateLoadedWorldTemplateVO(worldTemplateVO);
			if (validationResult.isValid) {
				return worldTemplateVO;
			} else {
				log.e("loaded world template was invalid, generating from scratch");
				WorldValidator.logSummary(validationResult);
				return null;
			}
		},
		
		generateWorld: function (seed, worldTemplateVO, hasSave, tryNumber) {
			return new Promise(function(resolve, reject) {
				let maxTries = GameConstants.isDebugVersion ? 1 : 10;
				tryNumber = tryNumber || 1;
				
				setTimeout(() => {
					this.tryGenerateWorld(seed, worldTemplateVO, tryNumber, maxTries).then(result => {
						if (result.validationResult.isValid) {
							resolve(result.worldVO);
							return;
						}
						
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
		
		tryGenerateWorld: function (seed, worldTemplateVO, tryNumber, maxTries) {
			return new Promise(function(resolve, reject) {
				log.i("generating world, try " + tryNumber + "/" + maxTries, "world");
				let s = seed + (tryNumber - 1) * 111;

				let progressionConfig = GameGlobals.worldHelper.getWorldProgressionConfig();

				WorldCreator.createWorld(s, worldTemplateVO, progressionConfig).then(worldVO => {
					log.i("validating world (" + GameConstants.getTimeSinceStart() + ")", "start");
					let validationResult = WorldValidator.validateWorld(worldVO, worldTemplateVO);
					WorldValidator.logSummary(validationResult);
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

		generateLevels: function (levels, worldTemplateVO) {

			let progessionConfig = this.getWorldProgressionConfig();

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

				WorldCreator.generateLevels(this.worldVO.seed, this.worldVO, worldTemplateVO, levels, GameGlobals.itemsHelper, progessionConfig)
				.then(worldVO => {
					this.validateLevels(levels, worldTemplateVO);
					resolve(worldVO);
				})
				.then(() => this.saveWorld(worldTemplateVO))
				.then(() => this.logChanges(worldTemplateVO, levels))
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

		validateLevels: function (levels, worldTemplateVO) {
			for (let i = 0; i < levels.length; i++) {
				let l = levels[i];
				let levelVO = this.worldVO.levels[l];
				let validationResult = WorldValidator.validateLevel(this.worldVO, worldTemplateVO, levelVO);
				WorldValidator.logSummary(validationResult);
			}
		},

		saveWorld: function (sourceWorldTemplateVO) {
			let worldTemplateVO = new WorldTemplateVO(this.worldVO);
			let validationResult = WorldValidator.validateResultWorldTemplateVO(this.worldVO, worldTemplateVO, sourceWorldTemplateVO);
			WorldValidator.logSummary(validationResult);
			GameGlobals.worldState.worldSeed = this.worldVO.seed;
			GameGlobals.worldState.worldTemplateVO = worldTemplateVO;
		},

		logChanges: function (worldTemplateVO, levels) {
			// detect and log changes in the world if there was an existing template, to be later shown to the player

			// TODO format better and return as result to be shown to the player somehow

			if (!worldTemplateVO) return;
			for (let i = 0; i < levels.length; i++) {
				let level = levels[i];
				let levelVO = this.worldVO.levels[level];
				let levelTemplateVO = worldTemplateVO.levels[level];
				this.logLevelChanges(levelVO, levelTemplateVO);
			}
		},

		logLevelChanges: function (levelVO, levelTemplateVO) {
			if (!levelTemplateVO) return;

			for (let s = 0; s < levelVO.sectors.length; s++) {
				let sectorVO = levelVO.sectors[s];
				let sectorTemplateVO = levelTemplateVO.sectors[s];
				this.logSectorChanges(sectorVO, sectorTemplateVO);
			}
		},

		logSectorChanges: function (sectorVO, sectorTemplateVO) {
			// TODO add more checks

			let sectorLocales = sectorVO.locales.concat();
			let sectorTemplateLocales = sectorTemplateVO.locales.concat();

			let notFoundLocales = sectorTemplateLocales.concat();
			let extraLocales = [];
			for (let i = 0; i < sectorLocales.length; i++) {
				let localeVO = sectorLocales[i];
				let matchingVOs = notFoundLocales.filter(sectorTemplateLocaleVO => ObjectUtils.diff(localeVO, sectorTemplateLocaleVO).total == 0);
				let matchingVO = matchingVOs.length > 0 ? matchingVOs[0] : null;

				if (matchingVO) {
					let matchingVOIndex = notFoundLocales.indexOf(matchingVO);
					notFoundLocales.splice(matchingVOIndex, 1);
				} else {
					extraLocales.push(localeVO);
				}
			}

			if (extraLocales.length > 0) log.i("world changes: added " + extraLocales.length + " locales at sector " + sectorVO.position);
			if (notFoundLocales.length > 0) log.i("world changes: removed " + notFoundLocales.length + " locales at sector " + sectorVO.position);
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
			sectorFeatures.isOnCriticalPath = sectorVO.isOnCriticalPath();
			sectorFeatures.levelFeatures = sectorVO.features || [];
			sectorFeatures.zone = sectorVO.zone;
			sectorFeatures.activity = sectorVO.activity;
			sectorFeatures.buildingDensity = sectorVO.buildingDensity;
			sectorFeatures.wealth = sectorVO.wealth;
			sectorFeatures.wear = sectorVO.wear;
			sectorFeatures.damage = sectorVO.damage;
			sectorFeatures.districtIndex = sectorVO.districtIndex;
			sectorFeatures.sunlit = sectorVO.sunlit > 0;
			sectorFeatures.ground = level == worldVO.bottomLevel;
			sectorFeatures.surface = level == worldVO.topLevel;
			sectorFeatures.hazards = sectorVO.hazards;
			sectorFeatures.sectorType = sectorVO.sectorType;
			sectorFeatures.sectorStyle = sectorVO.sectorStyle;
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
			sectorFeatures.stashes = sectorVO.stashes || null;
			sectorFeatures.waymarks = sectorVO.waymarks || [];
			sectorFeatures.heapResource = sectorVO.heapResource || null;
			sectorFeatures.examineSpots = sectorVO.examineSpots || [];
			sectorFeatures.graffiti = sectorVO.graffiti || null;
			return sectorFeatures;
		},

		getWorldProgressionConfig: function () {
			return GameGlobals.upgradeEffectsHelper.getProgressionConfig();
		},

		getLocales: function (worldVO, level, sectorX, sectorY) {
			return worldVO.getLevel(level).getSector(sectorX, sectorY).locales;
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
