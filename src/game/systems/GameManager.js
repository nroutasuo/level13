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
    'game/nodes/level/LevelNode',
    'game/components/common/PositionComponent',
    'game/systems/ui/UIOutLevelSystem',
    'game/systems/SaveSystem',
], function (Ash, GameGlobals, GlobalSignals, GameConstants, EntityCreator, WorldCreator, WorldCreatorHelper, WorldCreatorRandom, SectorNode, LevelNode, PositionComponent, UIOutLevelSystem, SaveSystem) {

    var GameManager = Ash.System.extend({

        tickProvider: null,
        creator: null,

		engine: null,

		player: null,
		tribe: null,

		constructor: function (tickProvider) {
			this.tickProvider = tickProvider;
		},

		addToEngine: function (engine) {
			this.engine = engine;
			this.creator = new EntityCreator(this.engine);

            GlobalSignals.add(this, GlobalSignals.restartGameSignal, this.onRestart);
		},

		removeFromEngine: function (engine) {
			this.player = null;
			this.engine = null;

            GlobalSignals.removeAll(this);
		},

		// Called on page load
		setupGame: function () {
            if (GameConstants.logInfo) console.log("START " + GameConstants.STARTTimeNow() + "\t loading and setting up game");
			this.initializeEntities();
			var loaded = this.loadGameState();
            GameConstants.gameSpeedCamp = 1;
            GameConstants.gameSpeedExploration = 1;
            gtag('set', { 'max_level': GameGlobals.gameState.level });
            gtag('set', { 'max_camp': GameGlobals.gameState.numCamps });
			if (loaded) this.syncLoadedGameState();
			if (!loaded) this.setupNewGame();

            if (GameConstants.logInfo) console.log("START " + GameConstants.STARTTimeNow() + "\t world ready");
            GlobalSignals.worldReadySignal.dispatch();
		},

		// Called after all other systems are ready
		startGame: function () {
            if (GameConstants.logInfo) console.log("START " + GameConstants.STARTTimeNow() + "\t starting game");

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
            console.log("Restarting game..");
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

		createLevelEntities: function (seed) {
            var levelVO;
            var sectorVO;
			for (var i = WorldCreatorHelper.getBottomLevel(seed); i <= WorldCreatorHelper.getHighestLevel(seed); i++) {
                levelVO = WorldCreator.world.getLevel(i);
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
            if (GameConstants.logInfo) console.log("START " + GameConstants.STARTTimeNow() + "\t creating world (seed: " + worldSeed + ")");

            WorldCreator.prepareWorld(worldSeed, GameGlobals.itemsHelper);
            GameGlobals.gameState.worldSeed = worldSeed;
            gtag('set', { 'world_seed': worldSeed });

            // Create other entities and fill components
            if (GameConstants.logInfo) console.log("START " + GameConstants.STARTTimeNow() + "\t loading entities");
            this.createLevelEntities(worldSeed);
            WorldCreator.discardWorld();
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

                console.log("Loaded from " + save.timeStamp);

                if (failedComponents > 0) {
                    console.log(failedComponents + " components failed to load.");
                }

                return true;
            }
            else
            {
                console.log("No save found.");
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
                console.log("Error loading save: " + exception);
            }
            return null;
        },

		// Clean up a loaded game state, mostly used to ensure backwards compatibility
		syncLoadedGameState: function () {
            gtag('event', 'game_load_save', { event_category: 'game_data' });
			var sectorNodes = this.creator.engine.getNodeList(SectorNode);
			for (var node = sectorNodes.head; node; node = node.next) {
				this.creator.syncSector(node.entity);
			}
		},

        showSaveWarning: function (saveVersion) {
            var currentVersion = GameGlobals.changeLogHelper.getCurrentVersionNumber();
            GameGlobals.uiFunctions.showQuestionPopup(
                "Warning",
                "Part of the save could not be loaded. Most likely your save is old and incompatible with the current version. Restart the game or continue at your own risk.<br><br/>Save version: " + saveVersion + "<br/>Current version: " + currentVersion + ") ",
                "Restart",
                "Continue",
                function () {
                    GameGlobals.uiFunctions.restart();
                },
                function () {}
            );
        },

        onRestart: function () {
            this.restartGame();
        }
    });

    return GameManager;
});
