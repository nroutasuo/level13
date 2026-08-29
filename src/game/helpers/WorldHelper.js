// wrapper around world generation for a running game
// parses necessary information from a save, loads/generates the world, keeps track of world state and generates more levels as needed, and reports changes to world from save
define([
	'ash',
	'utils/ObjectUtils',
	'game/GameGlobals',
	'game/constants/GameConstants',
	'game/constants/WorldConstants',
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
	WorldConstants,
	WorldCreator,
	WorldCreatorHelper,
	WorldCreatorRandom,
	WorldValidator,
	WorldTemplateVO,
) {
	
	let WorldHelper = Ash.Class.extend({

		worldVO: null,
		worldChangesVO: null, // changes from last call to prepareWorld (compared to save)
		isBusy: false,

		CHANGE_TYPE_LOCALE_ADDED: "locale_added",
		CHANGE_TYPE_LOCALE_REMOVED: "locale_removed",
		CHANGE_TYPE_MOVEMENT_BLOCKER_CHANGED: "movement_blocker_changed",
		CHANGE_TYPE_ITEMS_SCAVENGEABLE_CHANGED: "items_scavengeable_changed",
		CHANGE_TYPE_GENERIC: "generic",

		constructor: function () {},

		prepareWorld: function (save) {
			return new Promise((resolve, reject) => {
				log.i("preparing world (" + GameConstants.getTimeSinceStart() + ")", "start");

				let saveData = this.parseSave(save);
				let worldSeed = GameGlobals.saveHelper.getWorldSeedFromSave(save) || WorldCreatorRandom.getNewSeed();
				let levels = saveData.levels || [ 13 ];
				let worldTemplateVO = saveData.worldTemplateVO;
				
				this.generateWorld(worldSeed, worldTemplateVO, saveData.hasSave)
				.then(worldVO => {
					this.worldVO = worldVO;
					GameGlobals.worldState.worldSeed = worldVO.seed;
				})
				.then(() => this.generateLevels(levels, worldTemplateVO))
				.then(() => this.saveWorld(worldTemplateVO))
				.then(() => this.detectWorldChanges(this.worldVO, worldTemplateVO, levels))
				.then((worldChangesVO) => {
					this.worldChangesVO = worldChangesVO;
					this.logChanges(worldChangesVO);
				})
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
				worldSeed = parseInt(GameGlobals.saveHelper.getWorldSeedFromSave(save));

				if (save.worldState && save.worldState.revealedLevels) {
					log.i("save.worldState.revealedLevels: " + save.worldState.revealedLevels.join(","), this);
				} else {
					log.w("no revealedLevels found!", this);
				}

				if (save.worldState) {
					levels = save.worldState.revealedLevels || [];
					savedWorldTemplateVO = new WorldTemplateVO();
					savedWorldTemplateVO.customLoadFromSave(save.worldState.worldTemplateVO);
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

		generateLevel: function (level) {
			return this.generateLevels([ level ]);
		},

		generateLevels: function (levels, worldTemplateVO) {
			let progessionConfig = this.getWorldProgressionConfig();

			return new Promise((resolve, reject) => {
				if (!this.isWorldGenerated()) {
					this.logWorldNotGenerated("generateLevels");
					reject();
				};

				if (this.isBusy) {
					log.e("WorldHelper already busy", "world")
					reject();
				}

				this.isBusy = true;

				WorldCreator.generateLevels(this.worldVO.seed, this.worldVO, worldTemplateVO, levels, GameGlobals.itemsHelper, progessionConfig)
				.then(() => this.validateLevels(levels, worldTemplateVO))
				.then(() => this.saveWorld(worldTemplateVO))
				.then(() => {
					this.isBusy = false;
					resolve(this.worldVO);
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

		detectWorldChanges: function (worldVO, worldTemplateVO, levels) {
			// detect changes made to an existing world (worldTemplateVO) by world gen, likely due to a new version, to be highlighted to the user

			let result = { changes: [] };

			if (!worldTemplateVO) return result;

			result.worldGeneratorVersion = WorldConstants.version;
			result.worldVersion = worldVO.version;
			result.worldTemplateVersion = worldTemplateVO.version;

			let resultWorldTemplateVO = new WorldTemplateVO(worldVO);

			let diff = ObjectUtils.diff(worldTemplateVO, resultWorldTemplateVO, { ignoredKeys: [ "levels", "requiredPositions" ] });
			for (let key in diff.byKey) {
				result.changes.push({ level: null, type: this.CHANGE_TYPE_GENERIC, detail: "world property " + key + " changed" });
			}

			for (let l = worldVO.topLevel; l >= worldVO.bottomLevel; l--) {
				if (!this.isLevelGeneratedInWorld(worldVO, l)) continue;
				let levelVO = worldVO.levels[l];
				let levelTemplateVO = worldTemplateVO.levels[l];
				let resultLevelTemplateVO = resultWorldTemplateVO.levels[l];
				let levelChanges = this.getLevelChanges(levelVO, levelTemplateVO, resultLevelTemplateVO);
				if (levelChanges.length > 0) result.changes = result.changes.concat(levelChanges);
			}

			return result;
		},

		getLevelChanges: function (levelVO, levelTemplateVO, resultLevelTemplateVO) {
			let result = [];

			if (!levelTemplateVO) return result;

			let level = levelVO.level;

			// - generic
			let diff = ObjectUtils.diff(levelTemplateVO, resultLevelTemplateVO, { ignoredKeys: [ "sectors" ] });
			for (let key in diff.byKey) {
				result.push({ level: level, type: this.CHANGE_TYPE_GENERIC, detail: "level property " + key + " changed" });
			}

			// - sectors
			for (let s = 0; s < levelVO.sectors.length; s++) {
				let sectorVO = levelVO.sectors[s];
				let sectorTemplateVO = levelTemplateVO.sectors[s];
				let resultSectorTemplateVO = resultLevelTemplateVO.sectors[s];

				let sectorChanges = this.checkSectorChanges(sectorVO, sectorTemplateVO, resultSectorTemplateVO);
				if (sectorChanges.length > 0) result = result.concat(sectorChanges);
			}

			return result;
		},

		checkSectorChanges: function (sectorVO, sectorTemplateVO, resultSectorTemplateVO) {
			let result = [];

			let level = sectorVO.position.level;

			let namedKeys = [
				{ key: "movementBlockers", type: this.CHANGE_TYPE_MOVEMENT_BLOCKER_CHANGED },
				{ key: "itemsScavengeable", type: this.CHANGE_TYPE_ITEMS_SCAVENGEABLE_CHANGED },
			];

			// - generic 
			let ignoredKeys = [ "locales" ];
			for (let i in namedKeys) ignoredKeys.push(namedKeys[i].key);
			let diff = ObjectUtils.diff(sectorTemplateVO, resultSectorTemplateVO, { ignoredKeys: ignoredKeys });
			for (let key in diff.byKey) {
				result.push({ level: level, type: this.CHANGE_TYPE_GENERIC, detail: "sector property " + key + " changed at" + sectorVO.position });
			}

			// - added or removed locales
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

			for (let i = 0 ; i < extraLocales.length; i++) {
				result.push({ level: level, type: this.CHANGE_TYPE_LOCALE_ADDED, detail: "added locale " + extraLocales[i].type + " at " + sectorVO.position, seen: false });
			}

			for (let i = 0 ; i < notFoundLocales.length; i++) {
				result.push({ level: level, type: this.CHANGE_TYPE_LOCALE_REMOVED, detail: "removed locale " + notFoundLocales[i].type + " at " + sectorVO.position, seen: false });
			}

			// - named keys (check using simple object diff but with its own text in change dialog)
			for (let i in namedKeys) {
				let def = namedKeys[i];
				let key = def.key;
				let diff = ObjectUtils.diff(sectorTemplateVO[key], resultSectorTemplateVO[key]);
				if (diff.total > 0) {
					result.push({ level: level, type: def.type, detail: "changed " + key + " at " + sectorVO.position });
				}
			}

			return result;
		},

		logChanges: function (worldChangesVO) {
			for (let i = 0; i < worldChangesVO.changes.length; i++) {
				let change = worldChangesVO.changes[i];
				log.w("world change: level " + change.level + " " + change.type + " " + change.detail, "world");
			}
		},

		getUnseenChangesLevels: function () {
			if (!this.worldChangesVO) return 0;
			let result = [];

			for (let i = 0; i < this.worldChangesVO.changes.length; i++) {
				let change = this.worldChangesVO.changes[i];
				if (change.seen !== false) continue;
				let level = change.level;
				if (result.indexOf(level) < 0) result.push(level);
			}

			return result;
		},

		setChangesSeen: function (level) {
			if (!this.worldChangesVO) return;
			let result = [];

			for (let i = 0; i < this.worldChangesVO.changes.length; i++) {
				let change = this.worldChangesVO.changes[i];
				if (change.level !== level) continue;
				change.seen = true;
			}

			return result;
		},

		getGeneratedLevels: function () {
			let result = [];

			if (!this.worldVO) return result;

			for (let l = this.worldVO.topLevel; l >= this.worldVO.bottomLevel; l--) {
				if (this.isLevelGenerated(l)) result.push(l);
			}

			return result;
		},

		isWorldGenerated: function (worldVO) {
			return this.worldVO != null;
		},

		isLevelGenerated: function (level) {
			return this.isLevelGeneratedInWorld(this.worldVO, level);
		},

		isLevelGeneratedInWorld: function (worldVO, level) {
			return worldVO && worldVO.levels[level] && worldVO.levels[level].sectors && worldVO.levels[level].sectors.length > 0;
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
			sectorFeatures.sunlit = sectorVO.sunlit;
			sectorFeatures.sunlitReason = sectorVO.sunlitReason;
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
