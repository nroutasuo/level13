define([
	'ash',
	'core/ExceptionHandler',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/EntityCreator',
	'worldcreator/WorldCreator',
	'worldcreator/WorldValidator',
	'worldcreator/WorldCreatorRandom',
	'game/nodes/sector/SectorNode',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/level/LevelNode',
	'game/nodes/GangNode',
	'game/components/common/PositionComponent',
	'game/components/type/GangComponent',
	'game/systems/ui/UIOutLevelSystem',
	'game/systems/SaveSystem',
	'utils/StringUtils',
], function (Ash, ExceptionHandler, GameGlobals, GlobalSignals, GameConstants, EntityCreator, WorldCreator, WorldValidator, WorldCreatorRandom, SectorNode, PlayerStatsNode, LevelNode, GangNode, PositionComponent, GangComponent, UIOutLevelSystem, SaveSystem, StringUtils) {

	var GameManager = Ash.Class.extend({

		tickProvider: null,
		engine: null,
		creator: null,
		player: null,
		tribe: null,
		
		maxGameTickDiff: 43200,
		maxGameTickTime: 30,

		constructor: function (tickProvider, engine) {
			this.tickProvider = tickProvider;
			this.engine = engine;
			this.creator = new EntityCreator(this.engine);
			GlobalSignals.add(this, GlobalSignals.restartGameSignal, this.onRestart);
			GlobalSignals.add(this, GlobalSignals.gameEndedSignal, this.onGameEnd);
		},
		
		update: function (time) {
			// limit input time (actual time between ticks that is taken into account)
			var origTime = time;
			time = Math.min(time, this.maxGameTickDiff);
			if (origTime > time) {
				log.w("cut overly long tick to max game tick diff " + this.maxGameTickDiff, "tick");
			}
			
			// add extra update time
			// if game is paused don't consume extra update time since some systems aren't updating
			// TODO separate "game time" and "ui time" update?
			var extraUpdateTime = 0;
			if (!GameGlobals.gameState.isPaused) {
			 	extraUpdateTime = GameGlobals.gameState.extraUpdateTime || 0;
				GameGlobals.gameState.extraUpdateTime = 0;
			}
			GameGlobals.gameState.frameExtraUpdateTime = extraUpdateTime;
			var gameTime = time + extraUpdateTime;
			
			// add pending time (time left over from previous ticks)
			var pendingUpdateTime = GameGlobals.gameState.pendingUpdateTime;
			var totalTime = gameTime + pendingUpdateTime;
			
			// limit tick length
			var tickTime = Math.min(totalTime, this.maxGameTickTime);
			var playTime = Math.min(tickTime, time);
			var newPendingUpdateTime = totalTime - tickTime;
			GameGlobals.gameState.pendingUpdateTime = newPendingUpdateTime;
			
			if (tickTime < totalTime) {
				// partial tick
				if (!this.partialTickModeStarted) {
					var remainingTicks = Math.ceil(totalTime / this.maxGameTickTime);
					var showThinking = remainingTicks >= 20;
					if (!this.partialTickModeStarted && GameGlobals.gameFlowLogger.isEnabled) log.i("partial tick, estimated remaining: " + remainingTicks + ", showThinking: " + showThinking, "tick");
					if (showThinking) {
						this.gameHidden = true;
						GameGlobals.uiFunctions.hideGame(false, true);
					} else {
						this.gameBlocked = true;
						GameGlobals.uiFunctions.blockGame();
					}
					this.partialTickModeStarted = true;
				} else {
					if (GameGlobals.gameFlowLogger.isEnabled) log.i("partial tick " + tickTime, "tick");
				}
			} else {
				// normal tick
				if (this.partialTickModeStarted) {
					if (GameGlobals.gameFlowLogger.isEnabled) log.i("normal", "tick");
					if (this.gameHidden) {
						GameGlobals.uiFunctions.showGame();
						this.gameHidden = false;
					}
					if (this.gameBlocked) {
						GameGlobals.uiFunctions.unblockGame();
						this.gameBlocked = false;
					}
					this.partialTickModeStarted = false;
				}
			}
			
			this.engine.update(tickTime);
			
			GameGlobals.gameState.gameTime += tickTime;
			GameGlobals.gameState.playTime += playTime;
		},

		// Called on page load
		setupGame: function (worldVO) {
			log.i("START " + GameConstants.STARTTimeNow() + "\t loading and setting up game");
			GameConstants.gameSpeedCamp = 1;
			GameConstants.gameSpeedExploration = 1;
			this.createStaticEntities();
			
			var save;
			var worldVO;
			this.loadGameState()
				.then(s => {
					save = s;
					log.i("START " + GameConstants.STARTTimeNow() + "\t game state loaded");
					return s;
				})
				.then(s => this.loadWorld(save))
				.then(w => {
					worldVO = w;
					log.i("START " + GameConstants.STARTTimeNow() + "\t world loaded");
					return w;
				 })
				.then(w => this.createDynamicEntities(worldVO))
				.then(() => this.loadEntityState(save))
				.then(() => {
					if (save) {
						this.syncLoadedGameState();
					} else {
						 this.setupNewGame();
					}
		
					log.i("START " + GameConstants.STARTTimeNow() + "\t game state ready");
					GlobalSignals.gameStateReadySignal.dispatch();
					setTimeout(function () {
						WorldCreator.discardWorld();
					}, 1);
				})
				.catch(ex => {
					ExceptionHandler.handleException(ex);
				});
		},

		// Called after all other systems are ready
		startGame: function () {
			log.i("START " + GameConstants.STARTTimeNow() + "\t starting game");

			this.tickProvider.start();
			this.tickProvider.add(this.update, this);

			// for restart:
			this.engine.getSystem(UIOutLevelSystem).pendingUpdateDescription = true;
			this.engine.getSystem(UIOutLevelSystem).pendingUpdateMap = true;

			GameGlobals.uiFunctions.startGame();

			var sys = this;
			setTimeout(function () {
				GlobalSignals.gameStartedSignal.dispatch();
				GameGlobals.uiFunctions.showGame();
			}, 250);
		},

		restartGame: function () {
			log.i("Restarting game..");
			gtag('event', 'game_restart', { event_category: 'game_data' });
			GameGlobals.uiFunctions.hideGame(true);
			var sys = this;
			setTimeout(function () {
				sys.engine.removeAllEntities();
				GameGlobals.levelHelper.reset();
				GameGlobals.gameState.reset();
				GlobalSignals.gameResetSignal.dispatch();
				sys.setupGame();
				GlobalSignals.gameStateReadySignal.addOnce(function () {
					sys.startGame();
				});
			}, 250);
		},

		pauseGame: function () {
			this.tickProvider.stop();
		},

		createStaticEntities: function () {
			this.player = this.creator.createPlayer(GameGlobals.saveHelper.saveKeys.player);
			this.tribe = this.creator.createTribe(GameGlobals.saveHelper.saveKeys.tribe);
		},

		// Called if there is no save to load
		setupNewGame: function () {
			gtag('event', 'game_start_new', { event_category: 'game_data' });
			GameGlobals.gameState.gameStartTimeStamp = new Date().getTime();
			this.creator.initPlayer(this.player);
		},

		loadGameState: function () {
			return new Promise((resolve, reject) => {
				var save = this.getSaveObject();
				var hasSave = save != null;
	
				if (hasSave) {
					var loadedGameState = save.gameState;
					for (key in loadedGameState) {
						GameGlobals.gameState[key] = loadedGameState[key];
					}
				}
				GameGlobals.gameState.pendingUpdateTime = 0;
				GameGlobals.gameState.savePlayedVersion(GameGlobals.changeLogHelper.getCurrentVersionNumber());
				GameGlobals.gameState.isPaused = false;
				gtag('set', { 'max_level': GameGlobals.gameState.level });
				gtag('set', { 'max_camp': GameGlobals.gameState.numCamps });
				resolve(save);
			});
		},
		
		loadWorld: function (save) {
			return new Promise((resolve, reject) => {
				log.i("START " + GameConstants.STARTTimeNow() + "\t loading world");
				var hasSave = save != null;
				var worldSeed;
				if (hasSave) {
					var loadedGameState = save.gameState;
					worldSeed = parseInt(loadedGameState.worldSeed);
				} else {
					worldSeed = WorldCreatorRandom.getNewSeed();
				}
					
				this.getWorldVO(worldSeed, hasSave)
					.then(worldVO => {
						log.i("START " + GameConstants.STARTTimeNow() + "\t world created (seed: " + worldVO.seed + ")");
						GameGlobals.gameState.worldSeed = worldVO.seed;
						gtag('set', { 'world_seed': worldVO.seed });
						resolve(worldVO);
					})
					.catch(error => {
						this.showWorldGenerationFailedWarning();
						reject(error);
					});
			});
		},
		
		createDynamicEntities: function (worldVO) {
			return new Promise((resolve, reject) => {
				var seed = worldVO.seed;
				var levelVO;
				var sectorVO;
				for (let i = worldVO.bottomLevel; i <= worldVO.topLevel; i++) {
					levelVO = worldVO.getLevel(i);
					this.creator.createLevel(GameGlobals.saveHelper.saveKeys.level + i, i, levelVO);
					for (var y = levelVO.minY; y <= levelVO.maxY; y++) {
						for (var x = levelVO.minX; x <= levelVO.maxX; x++) {
							sectorVO = levelVO.getSector(x, y);
							if (!sectorVO) continue;
							var up = WorldCreator.getPassageUp(i, x, y);
							var down = WorldCreator.getPassageDown(i, x, y);
							var passageOptions = { passageUpType: up, passageDownType: down };
							var blockers = sectorVO.movementBlockers;
							this.creator.createSector(
								GameGlobals.saveHelper.saveKeys.sector + i + "." + x + "." + y,
								i,
								x,
								y,
								passageOptions,
								blockers,
								WorldCreator.getSectorFeatures(i, x, y),
								WorldCreator.getLocales(i, x, y),
								WorldCreator.getCriticalPaths(i, x, y),
								WorldCreator.getSectorEnemies(i, x, y),
								WorldCreator.getHasSectorRegularEnemies(i, x, y),
								WorldCreator.getSectorLocaleEnemyCount(i, x, y)
							);
						}
					}
					
					for (let j = 0; j < levelVO.gangs.length; j++) {
						var gang = levelVO.gangs[j];
						var x = gang.pos.sectorX;
						var y = gang.pos.sectorY;
						this.creator.createGang(
							GameGlobals.saveHelper.saveKeys.gang + levelVO.level + "_" + x + "_" + y,
							i,
							x,
							y,
							gang
						);
					}
				}
				resolve();
			});
		},
		
		loadEntityState: function (save) {
			return new Promise((resolve, reject) => {
				var hasSave = save != null;
				if (!hasSave) {
					log.i("No save found.");
					resolve();
				} else {
					var entitiesObject = save.entitiesObject;
					var failedComponents = 0;
					var saveWarningShown = false;

					failedComponents += GameGlobals.saveHelper.loadEntity(entitiesObject, GameGlobals.saveHelper.saveKeys.player, this.player);
					failedComponents += GameGlobals.saveHelper.loadEntity(entitiesObject, GameGlobals.saveHelper.saveKeys.tribe, this.tribe);

					if (!saveWarningShown && failedComponents > 0) {
						saveWarningShown = true;
						this.showSaveWarning(save.version);
					}

					var sectorNodes = this.engine.getNodeList(SectorNode);
					var positionComponent;
					var saveKey;
					for (var sectorNode = sectorNodes.head; sectorNode; sectorNode = sectorNode.next) {
						positionComponent = sectorNode.entity.get(PositionComponent);
						saveKey = GameGlobals.saveHelper.saveKeys.sector + positionComponent.level + "." + positionComponent.sectorX + "." + positionComponent.sectorY;
						failedComponents += GameGlobals.saveHelper.loadEntity(entitiesObject, saveKey, sectorNode.entity);

						if (!saveWarningShown && failedComponents > 0) {
							saveWarningShown = true;
							this.showSaveWarning(save.version);
						}
					}

					var levelNodes = this.engine.getNodeList(LevelNode);
					for (var levelNode = levelNodes.head; levelNode; levelNode = levelNode.next) {
						positionComponent = levelNode.entity.get(PositionComponent);
						saveKey = GameGlobals.saveHelper.saveKeys.level + positionComponent.level;
						failedComponents += GameGlobals.saveHelper.loadEntity(entitiesObject, saveKey, levelNode.entity);

						if (!saveWarningShown && failedComponents > 0) {
							saveWarningShown = true;
							this.showSaveWarning(save.version);
						}
					}
					
					var gangNodes = this.engine.getNodeList(GangNode);
					for (var gangNode = gangNodes.head; gangNode; gangNode = gangNode.next) {
						positionComponent = gangNode.entity.get(PositionComponent);
						saveKey = GameGlobals.saveHelper.saveKeys.gang + positionComponent.level + "_" + positionComponent.sectorX + "_" + positionComponent.sectorY;
						failedComponents += GameGlobals.saveHelper.loadEntity(entitiesObject, saveKey, gangNode.entity);
						if (!saveWarningShown && failedComponents > 0) {
							saveWarningShown = true;
							this.showSaveWarning(save.version);
						}
					}

					log.i("Loaded from " + save.timeStamp + ", save version: " + save.version);

					if (failedComponents > 0) {
						log.w(failedComponents + " components failed to load.");
					}
					
					log.i("START " + GameConstants.STARTTimeNow() + "\t entity state loaded");
					
					if (!saveWarningShown && GameGlobals.changeLogHelper.isOldVersion(save.version)) {
						this.showVersionWarning(save.version, () => { resolve(); });
					} else {
						resolve();
					}
				}
			})
		},
		
		getWorldVO: function (seed, hasSave) {
			return new Promise(function(resolve, reject) {
				var maxTries = GameConstants.isDebugVersion ? 1 : 25;
				var s = seed;
				for (let i = 0; i < maxTries; i++) {
					log.i("START " + GameConstants.STARTTimeNow() + "\t generating world, try " + (i + 1) + "/" + maxTries);
					var worldVO;
					var validationResult;
					try {
						worldVO = WorldCreator.prepareWorld(s, GameGlobals.itemsHelper);
						log.i("START " + GameConstants.STARTTimeNow() + "\t validating world");
						validationResult = WorldValidator.validateWorld(worldVO);
						if (validationResult.isValid) {
							resolve(worldVO);
							return;
						} else {
							this.logFailedWorldSeed(seed, validationResult.reason);
						}
					} catch (ex) {
						validationResult = { isValid: false, reason: "exception: " + StringUtils.getExceptionDescription(ex).title };
						this.logFailedWorldSeed(seed, validationResult.reason);
						if (GameConstants.isDebugVersion) {
							throw ex;
						}
					}
					
					// failed attempt (validation or exception)
					if (hasSave && worldVO != null) {
						log.i("using broken world because old save exists");
						resolve(worldVO);
						return;
					} else {
						if (i + 1 < maxTries) {
							log.i("trying another seed");
						}
						s = s + 111;
					}
				}
				log.e("ran out of tries to generate world");
				reject(new Error("ran out of tries to generate world"));
			}.bind(this));
		},

		getSaveObject: function () {
			var saveSystem = this.engine.getSystem(SaveSystem);
			try {
				var compressed = localStorage.save;
				var json = saveSystem.getSaveJSONfromCompressed(compressed);
				var object = GameGlobals.saveHelper.parseSaveJSON(json);
				return object;
			} catch (exception) {
				// TODO show no save found to user?
				log.i("Error loading save: " + exception);
			}
			return null;
		},

		// Clean up a loaded game state, mostly used to ensure backwards compatibility
		syncLoadedGameState: function () {
			gtag('event', 'game_load_save', { event_category: 'game_data' });
			GameGlobals.gameState.syncData();
			this.creator.syncPlayer(this.engine.getNodeList(PlayerStatsNode).head.entity);
			var sectorNodes = this.engine.getNodeList(SectorNode);
			for (var node = sectorNodes.head; node; node = node.next) {
				this.creator.syncSector(node.entity);
			}
		},

		showWorldGenerationFailedWarning: function () {
			GameGlobals.uiFunctions.setGameOverlay(false, false);
			GameGlobals.uiFunctions.showInfoPopup(
				"Warning",
				"World generation failed.",
				"Continue"
			);
		},

		showSaveWarning: function (saveVersion) {
			var currentVersion = GameGlobals.changeLogHelper.getCurrentVersionNumber();
			GameGlobals.uiFunctions.showQuestionPopup(
				"Warning",
				"Part of the save could not be loaded. Most likely your save is old and incompatible with the current version. Restart the game or continue at your own risk.<br><br/>Save version: " + saveVersion + "<br/>Current version: " + currentVersion,
				"Restart",
				"Continue",
				function () {
					GameGlobals.uiFunctions.restart();
				},
				function () {},
				true
			);
		},
		
		showVersionWarning: function (saveVersion, continueCallback) {
			var currentVersion = GameGlobals.changeLogHelper.getCurrentVersionNumber();
			var changelogLink = "<a href='changelog.html' target='changelog'>changelog</a>";
			var message = "";
			message += "Your save version is incompatible than the current version. Most likely the game has been updated since you last played. See the " + changelogLink + " for details."
			message += "<br><br/>";
			message += "Save version: " + saveVersion + "<br/>Current version: " + currentVersion;
			message += "<br><br/>";
			message += " Restart the game or continue at your own risk.";
			GameGlobals.uiFunctions.showQuestionPopup(
				"Update",
				message,
				"Restart",
				"Continue",
				function () {
					GameGlobals.uiFunctions.restart();
				},
				function () {
					continueCallback();
				},
				true
			);
		},

		logFailedWorldSeed: function (seed, reason) {
			log.e("geneating world failed! seed: " + seed + ", reason: " + reason);
			var gadesc = "generating world with seed " + seed + " failed | " + reason;
			log.i("logging exception to gtag");
			gtag('event', 'exception', {
				'description': gadesc,
				'fatal': false,
			});
		},

		onRestart: function (resetSave) {
			console.clear();
			this.restartGame();
		},
		
		onGameEnd: function () {
			this.pauseGame();
		},
	});

	return GameManager;
});
