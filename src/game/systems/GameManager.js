define([
	'ash',
	'core/ExceptionHandler',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/EntityCreator',
	'game/nodes/sector/SectorNode',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/level/LevelNode',
	'game/nodes/GangNode',
	'game/components/common/PositionComponent',
	'game/systems/ui/UIOutLevelSystem',
	'game/systems/SaveSystem',
], function (
	Ash,
	ExceptionHandler,
	GameGlobals,
	GlobalSignals,
	GameConstants,
	EntityCreator,
	SectorNode, 
	PlayerStatsNode, 
	LevelNode, 
	GangNode, 
	PositionComponent, 
	UIOutLevelSystem, 
	SaveSystem, 
) {
	
	let GameManager = Ash.Class.extend({
		
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
			GlobalSignals.add(this, GlobalSignals.gameStateReadySignal, this.updateTrackingTags);
			GlobalSignals.add(this, GlobalSignals.campBuiltSignal, this.updateTrackingTags);
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
			
			if (tickTime > 0) {
				this.engine.update(tickTime);
			}
			
			GameGlobals.gameState.gameTime += tickTime;
			GameGlobals.gameState.playTime += playTime;
			
			let playerPosition = GameGlobals.playerHelper.getPosition();
			if (playerPosition && !playerPosition.inCamp) {
				GameGlobals.gameState.increaseGameStatKeyed("timeOutsidePerLevel", playerPosition.level, playTime);
			}
		},
		
		// Called on page load or on restart
		setupGame: function () {
			log.i("START " + GameConstants.STARTTimeNow() + "\t loading and setting up game");
			GameGlobals.gameState.uiStatus.isInitialized = false;
			GameConstants.gameSpeedCamp = 1;
			GameConstants.gameSpeedExploration = 1;

			// create entities that are there regardless of world structure (player, tribe)
			this.createUniversalEntities();
			
			let save;
			let worldVO;
			
			this.loadGameState()
			.then(s => {
				save = s;
				log.i("START " + GameConstants.STARTTimeNow() + "\t game state loaded " + (save == null ? "(empty)" : "") + "");
				GlobalSignals.gameStateLoadedSignal.dispatch(s != null);
				return s;
			})
			// load or generate world and necessary levels from seed 
			.then(s => this.prepareWorld(save))
			.then(w => {
				worldVO = w;
				log.i("START " + GameConstants.STARTTimeNow() + "\t world loaded");
				return w;
			})
			// create entities that depend on world structure (levels, sectors, gangs)
			.then(w => this.createWorldEntities(worldVO, GameGlobals.worldHelper.getGeneratedLevels()))
			// set entity state from save
			.then(() => this.loadEntityState(save))
			.then(() => {
				if (save) {
					this.syncLoadedGameState();
				} else {
					this.setupNewGame();
				}
				
				log.i("START " + GameConstants.STARTTimeNow() + "\t game state ready");
				GlobalSignals.gameStateReadySignal.dispatch();
			})
			.catch(ex => {
				ExceptionHandler.handleException(ex);
			});
		},
		
		// Called after all other systems are ready (have ahad time to react to gameStateReadySignal)
		startGame: function () {
			log.i("START " + GameConstants.STARTTimeNow() + "\t starting game");
			
			log.i("start tick")
			this.tickProvider.start();
			this.tickProvider.add(this.update, this);
			
			// for restart:
			this.engine.getSystem(UIOutLevelSystem).pendingUpdateDescription = true;
			this.engine.getSystem(UIOutLevelSystem).pendingUpdateMap = true;
			
			GameGlobals.uiFunctions.startGame();
			
			let sys = this;
			setTimeout(function () {
				GlobalSignals.gameStartedSignal.dispatch();
				setTimeout(function () {
					GameGlobals.gameState.uiStatus.isInitialized = true;
					GameGlobals.uiFunctions.showGame();
					setTimeout(function () {
						// updates to game state that should be done at start but can wait until the player is unblocked
						GlobalSignals.gameStateRefreshSignal.dispatch();
					}, 1);
				}, 1);
			}, 250);
		},
		
		restartGame: function () {
			log.i("Restarting game..");
			this.pauseGame();
			GameGlobals.uiFunctions.hideGame(true);
			var sys = this;
			setTimeout(function () {
				GameGlobals.metaState.hasCompletedGame = GameGlobals.metaState.hasCompletedGame || GameGlobals.gameState.isLaunchStarted;
				GameGlobals.metaState.maxCampOrdinalReached = Math.max(GameGlobals.metaState.maxCampOrdinalReached, GameGlobals.gameState.numCamps);
				sys.engine.removeAllEntities();
				GameGlobals.levelHelper.reset();
				GameGlobals.gameState.reset();
				log.i("game state reset");
				GlobalSignals.gameResetSignal.dispatch();
				sys.setupGame();
				GlobalSignals.gameStateReadySignal.addOnce(function () {
					sys.startGame();
				});
			}, 250);
		},
		
		pauseGame: function () {
			log.i("pause tick")
			this.tickProvider.stop();
		},
		
		createUniversalEntities: function () {
			this.player = this.creator.createPlayer(GameGlobals.saveHelper.saveKeys.player);
			this.tribe = this.creator.createTribe(GameGlobals.saveHelper.saveKeys.tribe);
		},
		
		// Called if there is no save to load
		setupNewGame: function () {
			GameGlobals.gameState.gameStartTimeStamp = new Date().getTime();
			this.creator.initPlayer(this.player, GameGlobals.metaState);
		},
		
		loadMetaState: function () {
			return new Promise((resolve, reject) => {
				let data = this.getMetaStateObject();
				let hasData = data != null;
				
				log.i("START " + GameConstants.STARTTimeNow() + "\t meta state loaded (hasData: " + hasData + ")");
				
				if (hasData) {
					let loadedMetaState = data;
					for (let key in loadedMetaState) {
						GameGlobals.metaState[key] = loadedMetaState[key];
					}
				}
				resolve();
			});
		},
		
		loadGameState: function () {
			return new Promise((resolve, reject) => {
				var save = this.getSaveObject();
				var hasSave = save != null;
				
				if (hasSave) {
					var loadedGameState = save.gameState;
					for (let key in loadedGameState) {
						GameGlobals.gameState[key] = loadedGameState[key];
					}
				}
				GameGlobals.gameState.pendingUpdateTime = 0;
				GameGlobals.gameState.savePlayedVersion(GameGlobals.changeLogHelper.getCurrentVersionNumber());
				GameGlobals.gameState.isPaused = false;
				resolve(save);
			});
		},
		
		prepareWorld: function (save) {
			return GameGlobals.worldHelper.prepareWorld(save);
		},
		
		createWorldEntities: function (worldVO, levels) {
			log.i("create world entities: " + levels.join(","), this);

			return new Promise((resolve, reject) => {
				let seed = worldVO.seed;
				for (let i = worldVO.bottomLevel; i <= worldVO.topLevel; i++) {
					if (levels.indexOf(i) < 0) continue;
					let levelVO = worldVO.getLevel(i);
					log.i("create level entities: " + i, this);
					this.creator.createLevel(GameGlobals.saveHelper.saveKeys.level + i, i, levelVO);
					for (let y = levelVO.minY; y <= levelVO.maxY; y++) {
						for (let x = levelVO.minX; x <= levelVO.maxX; x++) {
							let sectorVO = levelVO.getSector(x, y);
							if (!sectorVO) continue;
							let up = worldVO.getPassageUp(i, x, y);
							let down = worldVO.getPassageDown(i, x, y);
							let passageOptions = { passageUpType: up, passageDownType: down };
							let blockers = sectorVO.movementBlockers;
							this.creator.createSector(
								GameGlobals.saveHelper.saveKeys.sector + i + "." + x + "." + y,
								i,
								x,
								y,
								passageOptions,
								blockers,
								GameGlobals.worldHelper.getSectorFeatures(worldVO, i, x, y),
								GameGlobals.worldHelper.getLocales(worldVO, i, x, y),
								GameGlobals.worldHelper.getCriticalPaths(worldVO, i, x, y),
								GameGlobals.worldHelper.getSectorEnemies(worldVO, i, x, y),
								GameGlobals.worldHelper.getHasSectorRegularEnemies(worldVO, i, x, y),
								GameGlobals.worldHelper.getSectorLocaleEnemyCount(worldVO, i, x, y)
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
					let positionComponent;
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

		generateLevel: function (level, cb) {
			GameGlobals.worldHelper.generateLevel(level)
			.then((worldVO) => this.createWorldEntities(worldVO, [ level ]))
			.then(() => { 
				GlobalSignals.levelGeneratedSignal.dispatch(level);
			 })
			.then(() => cb());
		},
		
		getSaveObject: function () {
			let saveSystem = this.engine.getSystem(SaveSystem);
			try {
				let compressed = saveSystem.getDataFromSlot(GameConstants.SAVE_SLOT_DEFAULT);
				saveSystem.saveDataToSlot(GameConstants.SAVE_SLOT_LOADED, compressed);
				let json = saveSystem.getSaveJSONfromCompressed(compressed);
				let object = GameGlobals.saveHelper.parseSaveJSON(json);
				return object;
			} catch (exception) {
				// TODO show no save found to user?
				log.i("Error loading save: " + exception);
			}
			return null;
		},

		getMetaStateObject: function () {
			let saveSystem = this.engine.getSystem(SaveSystem);
			try {
				let compressed = saveSystem.getMetaStateData();
				let json = saveSystem.getSaveJSONfromCompressed(compressed);
				let object = GameGlobals.saveHelper.parseMetaStateJSON(json);
				return object;
			} catch (exception) {
				// TODO show no save found to user?
				log.i("Error loading save: " + exception);
			}
			return null;
		},
		
		// Clean up a loaded game state, mostly used to ensure backwards compatibility
		syncLoadedGameState: function () {
			GameGlobals.gameState.syncData();
			this.creator.syncPlayer(this.engine.getNodeList(PlayerStatsNode).head.entity);
			var sectorNodes = this.engine.getNodeList(SectorNode);
			for (var node = sectorNodes.head; node; node = node.next) {
				this.creator.syncSector(node.entity);
			}
		},
		
		showSaveWarning: function (saveVersion) {
			var currentVersion = GameGlobals.changeLogHelper.getCurrentVersionNumber();
			GameGlobals.uiFunctions.showQuestionPopup(
				"Warning",
				"Part of the save could not be loaded. Most likely your save is old and incompatible with the current version. Restart the game or continue at your own risk.<br><br/>Save version: " + saveVersion + "<br/>Current version: " + currentVersion,
				"Restart",
				"Continue",
				function () {
					GameGlobals.uiFunctions.showGame();
					GameGlobals.uiFunctions.restart();
				},
				function () {
					GameGlobals.uiFunctions.showGame();
				},
				true
			);
		},
		
		showVersionWarning: function (saveVersion, continueCallback) {
			GameGlobals.uiFunctions.hideGame();
			var currentVersion = GameGlobals.changeLogHelper.getCurrentVersionNumber();
			var changelogLink = "<a href='changelog.html' target='changelog'>changelog</a>";
			var message = "";
			message += "Your save version is incompatible than the current version. Most likely the game has been updated since you last played. See the " + changelogLink + " for details."
			message += "<br><br/>";
			message += "Save version: " + saveVersion + "<br/>Current version: " + currentVersion;
			message += "<br><br/>";
			message += " It is recommended to restart the game. Continue at your own risk.";
			GameGlobals.uiFunctions.showQuestionPopup(
				"Update",
				message,
				"Restart",
				"Continue",
				function () {
					GameGlobals.uiFunctions.showGame();
					GameGlobals.uiFunctions.restart();
				},
				function () {
					GameGlobals.uiFunctions.showGame();
					continueCallback();
				},
				true
			);
		},
		
		updateTrackingTags: function () {
			try {
				Sentry.setTag("numCamps", GameGlobals.gameState.numCamps);
				Sentry.setTag("worldSeed", GameGlobals.gameState.worldSeed);
			} catch (e) {}
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
