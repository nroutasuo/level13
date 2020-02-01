define([
    'ash',
    'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
    'game/EntityCreator',
    'game/worldcreator/WorldCreator',
    'game/worldcreator/WorldCreatorHelper',
    'game/worldcreator/WorldCreatorRandom',
    'game/nodes/sector/SectorNode',
    'game/nodes/player/PlayerStatsNode',
    'game/nodes/level/LevelNode',
    'game/nodes/GangNode',
    'game/components/common/PositionComponent',
    'game/components/type/GangComponent',
    'game/systems/ui/UIOutLevelSystem',
    'game/systems/SaveSystem',
], function (Ash, GameGlobals, GlobalSignals, GameConstants, EntityCreator, WorldCreator, WorldCreatorHelper, WorldCreatorRandom, SectorNode, PlayerStatsNode, LevelNode, GangNode, PositionComponent, GangComponent, UIOutLevelSystem, SaveSystem) {

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
		},
        
        update: function (time) {
            // limit input time (actual time between ticks that is taken into account)
            var origTime = time;
            time = Math.min(time, this.maxGameTickDiff);
            if (origTime > time) {
                log.w("cut overly long tick to max game tick diff " + this.maxGameTickDiff, "tick");
            }
            
            // add extra update time
            var extraUpdateTime = GameGlobals.gameState.extraUpdateTime || 0;
            GameGlobals.gameState.extraUpdateTime = 0;
            GameGlobals.gameState.frameExtraUpdateTime = extraUpdateTime;
            var gameTime = time + extraUpdateTime;
            
            // add pending time (time left over from previous ticks)
            var pendingUpdateTime = GameGlobals.gameState.pendingUpdateTime;
            var totalTime = gameTime + pendingUpdateTime;
            
            // limit tick length
            var tickTime = Math.min(totalTime, this.maxGameTickTime);
            var newPendingUpdateTime = totalTime - tickTime;
            GameGlobals.gameState.pendingUpdateTime = newPendingUpdateTime;
            
            if (tickTime < totalTime) {
                // partial tick
                if (!this.partialTickModeStarted) {
                    var remainingTicks = Math.ceil(totalTime / this.maxGameTickTime);
                    var showThinking = remainingTicks >= 20;
                    if (!this.partialTickModeStarted) log.i("partial tick, estimated remaining: " + remainingTicks + ", showThinking: " + showThinking, "tick");
                    if (showThinking) {
                        this.gameHidden = true;
                        GameGlobals.uiFunctions.hideGame(false, true);
                    } else {
                        this.gameBlocked = true;
                        GameGlobals.uiFunctions.setUIStatus(false, true);
                    }
                    this.partialTickModeStarted = true;
                } else {
                    log.i("partial tick " + tickTime, "tick");
                }
            } else {
                // normal tick
                if (this.partialTickModeStarted) {
                    log.i("normal", "tick");
                    if (this.gameHidden) {
                        GameGlobals.uiFunctions.showGame();
                        this.gameHidden = false;
                    }
                    if (this.gameBlocked) {
                        GameGlobals.uiFunctions.setUIStatus(false, false);
                        this.gameBlocked = false;
                    }
                    this.partialTickModeStarted = false;
                }
            }
                
            this.engine.update(tickTime);
        },

		// Called on page load
		setupGame: function () {
            log.i("START " + GameConstants.STARTTimeNow() + "\t loading and setting up game");
			this.initializeEntities();
			var loaded = this.loadGameState();
            GameConstants.gameSpeedCamp = 1;
            GameConstants.gameSpeedExploration = 1;
            gtag('set', { 'max_level': GameGlobals.gameState.level });
            gtag('set', { 'max_camp': GameGlobals.gameState.numCamps });
			if (loaded) this.syncLoadedGameState();
			if (!loaded) this.setupNewGame();

            log.i("START " + GameConstants.STARTTimeNow() + "\t world ready");
            GlobalSignals.gameStateReadySignal.dispatch();
            setTimeout(function () {
                WorldCreator.discardWorld();
            }, 1);
		},

		// Called after all other systems are ready
		startGame: function () {
            log.i("START " + GameConstants.STARTTimeNow() + "\t starting game");

            // for restart:
            this.engine.getSystem(UIOutLevelSystem).pendingUpdateDescription = true;
            this.engine.getSystem(UIOutLevelSystem).pendingUpdateMap = true;

            GameGlobals.uiFunctions.startGame();

            var sys = this;
            setTimeout(function () {
                GameGlobals.uiFunctions.showGame();
                GlobalSignals.gameStartedSignal.dispatch();
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
                sys.startGame();
            }, 250);
		},

        pauseGame: function () {
			GameGlobals.uiFunctions.hideGame(false);
            this.tickProvider.stop();
        },

		initializeEntities: function () {
			this.player = this.creator.createPlayer(GameGlobals.saveHelper.saveKeys.player);
			this.tribe = this.creator.createTribe(GameGlobals.saveHelper.saveKeys.tribe);
		},

		// Called if there is no save to load
		setupNewGame: function () {
            gtag('event', 'game_start_new', { event_category: 'game_data' });
            GameGlobals.gameState.gameStartTimeStamp = new Date().getTime();
			this.creator.initPlayer(this.player);
		},

		createLevelEntities: function (worldVO) {
            var seed = worldVO.seed;
            var levelVO;
            var sectorVO;
			for (var i = WorldCreatorHelper.getBottomLevel(seed); i <= WorldCreatorHelper.getHighestLevel(seed); i++) {
                levelVO = worldVO.getLevel(i);
				this.creator.createLevel(GameGlobals.saveHelper.saveKeys.level + i, i, levelVO);
				for (var y = levelVO.minY; y <= levelVO.maxY; y++) {
					for (var x = levelVO.minX; x <= levelVO.maxX; x++) {
                        sectorVO = levelVO.getSector(x, y);
                        if (!sectorVO) continue;
                        var up = WorldCreator.getPassageUp(i, x, y);
                        var down = WorldCreator.getPassageDown(i, x, y);
                        var passageOptions = { passageUp: up, passageDown: down };
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
                
                for (var j = 0; j < levelVO.gangs.length; j++) {
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
		},

		// Loads a game if a save can be found, otherwise initializes world seed & levels
		// Returns a boolean indicating whether a save was found
		loadGameState: function () {
            var save = this.getSaveObject();
            var hasSave = save != null;

            // Load game state
            if (hasSave) {
                var loadedGameState = save.gameState;
                for (key in loadedGameState) {
                    GameGlobals.gameState[key] = loadedGameState[key];
                }
            }
            GameGlobals.gameState.isPaused = false;

            // Create world
            var worldSeed;
            if (hasSave) worldSeed = parseInt(loadedGameState.worldSeed);
            else worldSeed = WorldCreatorRandom.getNewSeed();
            log.i("START " + GameConstants.STARTTimeNow() + "\t creating world (seed: " + worldSeed + ")");
            var worldVO = WorldCreator.prepareWorld(worldSeed, GameGlobals.itemsHelper);
            GameGlobals.gameState.worldSeed = worldVO.seed;
            gtag('set', { 'world_seed': worldSeed });
            GlobalSignals.worldReadySignal.dispatch(worldVO);

            // Create other entities and fill components
            log.i("START " + GameConstants.STARTTimeNow() + "\t loading entities");
            this.createLevelEntities(worldVO);
            
            if (hasSave) {
                var entitiesObject = save.entitiesObject;
                var failedComponents = 0;
                var saveWarningShown = false;

                failedComponents += GameGlobals.saveHelper.loadEntity(entitiesObject, GameGlobals.saveHelper.saveKeys.player, this.player);
                failedComponents += GameGlobals.saveHelper.loadEntity(entitiesObject, GameGlobals.saveHelper.saveKeys.tribe, this.tribe);

                if (!saveWarningShown && failedComponents > 0) {
                    saveWarningShown = true;
                    this.showSaveWarning(save.version);
                }

                var sectorNodes = this.creator.engine.getNodeList(SectorNode);
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

                var levelNodes = this.creator.engine.getNodeList(LevelNode);
                for (var levelNode = levelNodes.head; levelNode; levelNode = levelNode.next) {
                    positionComponent = levelNode.entity.get(PositionComponent);
                    saveKey = GameGlobals.saveHelper.saveKeys.level + positionComponent.level;
                    failedComponents += GameGlobals.saveHelper.loadEntity(entitiesObject, saveKey, levelNode.entity);

                    if (!saveWarningShown && failedComponents > 0) {
                        saveWarningShown = true;
                        this.showSaveWarning(save.version);
                    }
                }
                
                var gangNodes = this.creator.engine.getNodeList(GangNode);
                for (var gangNode = gangNodes.head; gangNode; gangNode = gangNode.next) {
                    positionComponent = gangNode.entity.get(PositionComponent);
                    saveKey = GameGlobals.saveHelper.saveKeys.gang + positionComponent.level + "_" + positionComponent.sectorX + "_" + positionComponent.sectorY;
                    failedComponents += GameGlobals.saveHelper.loadEntity(entitiesObject, saveKey, gangNode.entity);
                    //  gang-7_-0.5_1
                    if (positionComponent.level == 7 && positionComponent.sectorX == -0.5 && positionComponent.sectorY == 1) {
                        log.i("loadGameState " + saveKey);
            			var savedComponents = entitiesObject[saveKey];
                        log.i(savedComponents);
                        log.i(gangNode.entity.get(GangComponent));
                    }
                    if (!saveWarningShown && failedComponents > 0) {
                        saveWarningShown = true;
                        this.showSaveWarning(save.version);
                    }
                }

                log.i("Loaded from " + save.timeStamp + ", save version: " + save.version);

                if (failedComponents > 0) {
                    log.w(failedComponents + " components failed to load.");
                }
                
                if (!saveWarningShown && GameGlobals.changeLogHelper.isOldVersion(save.version)) {
                    this.showVersionWarning(save.version);
                }

                return true;
            }
            else
            {
                log.i("No save found.");
                return false;
            }
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
            this.creator.syncPlayer(this.creator.engine.getNodeList(PlayerStatsNode).head.entity);
			var sectorNodes = this.creator.engine.getNodeList(SectorNode);
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
                    GameGlobals.uiFunctions.restart();
                },
                function () {}
            );
        },
        
        showVersionWarning: function (saveVersion) {
            var currentVersion = GameGlobals.changeLogHelper.getCurrentVersionNumber();
            GameGlobals.uiFunctions.showQuestionPopup(
                "Update",
                "Your save version is older than the current version. Most likely the game has been updated since you last played. Restart the game or continue at your own risk.<br><br/>Save version: " + saveVersion + "<br/>Current version: " + currentVersion,
                "Restart",
                "Continue",
                function () {
                    GameGlobals.uiFunctions.restart();
                },
                function () {}
            );
        },

        onRestart: function (resetSave) {
            console.clear();
            this.restartGame();
        }
    });

    return GameManager;
});
