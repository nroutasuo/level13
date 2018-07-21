define([
    'ash',
	'game/GlobalSignals',
	'game/constants/GameConstants',
    'game/EntityCreator',
    'game/worldcreator/WorldCreator',
    'game/worldcreator/WorldCreatorHelper',
    'game/worldcreator/WorldCreatorRandom',
    'game/nodes/sector/SectorNode',
    'game/nodes/level/LevelNode',
    'game/components/common/PositionComponent',
    'game/systems/ui/UIOutLevelSystem'
], function (Ash, GlobalSignals, GameConstants, EntityCreator, WorldCreator, WorldCreatorHelper, WorldCreatorRandom, SectorNode, LevelNode, PositionComponent, UIOutLevelSystem) {

    var GameManager = Ash.System.extend({
	
        tickProvider: null,
        gameState: null,
        creator: null,
		saveHelper: null,
        enemyHelper: null,
        itemsHelper: null,
		
		uiFunctions: null,
		playerActions: null,
		
		engine: null,
		
		player: null,
		tribe: null,
	
		constructor: function (tickProvider, gameState, uiFunctions, playerActions, saveHelper, enemyHelper, itemsHelper, levelHelper) {
			this.tickProvider = tickProvider;
			this.gameState = gameState;
			this.uiFunctions = uiFunctions;
			this.playerActions = playerActions;
			this.saveHelper = saveHelper;
            this.enemyHelper = enemyHelper;
            this.itemsHelper = itemsHelper;
            this.levelHelper = levelHelper;
		},
	
		addToEngine: function (engine) {
			this.engine = engine;
			this.creator = new EntityCreator(this.engine);
			this.setupGame();
		},
	
		removeFromEngine: function (engine) {
			this.player = null;
			this.engine = null;
		},
		
		// Called on add to engine
		setupGame: function () {
            if (GameConstants.isDebugOutputEnabled) console.log("START " + GameConstants.STARTTimeNow() + "\t loading and setting up game");
			this.initializeEntities();			
			var loaded = this.loadGameState();
            GameConstants.gameSpeedCamp = 1;
            GameConstants.gameSpeedExploration = 1;
            gtag('set', { 'max_level': this.gameState.level });
            gtag('set', { 'max_camp': this.gameState.numCamps });
			if (loaded) this.syncLoadedGameState();
			if (!loaded) this.setupNewGame();
		},
		
		// Called after all other systems are ready
		startGame: function () {
            if (GameConstants.isDebugOutputEnabled) console.log("START " + GameConstants.STARTTimeNow() + "\t starting game");
			var startTab = this.uiFunctions.elementIDs.tabs.out;
			var playerPos = this.playerActions.playerPositionNodes.head.position;
			if (playerPos.inCamp) startTab = this.uiFunctions.elementIDs.tabs.in;
            
            // for restart:
            this.engine.getSystem(UIOutLevelSystem).pendingUpdateDescription = true;
            this.engine.getSystem(UIOutLevelSystem).pendingUpdateMap = true;
            
			this.uiFunctions.showTab(startTab);
            var sys = this;
            setTimeout(function () {
                sys.uiFunctions.showGame();
                GlobalSignals.gameStartedSignal.dispatch();
            }, 250);
		},
		
		restartGame: function () {
            gtag('event', 'game_restart');
			this.uiFunctions.hideGame(true);
            var sys = this;
            setTimeout(function () {
                sys.engine.removeAllEntities();
                sys.levelHelper.reset();
                sys.gameState.reset();
                sys.setupGame();
                sys.startGame();
            }, 250);
		},
        
        pauseGame: function () {            
			this.uiFunctions.hideGame(false);
            this.tickProvider.stop();
        },
		
		initializeEntities: function () {
			this.player = this.creator.createPlayer(this.saveHelper.saveKeys.player);
			this.tribe = this.creator.createTribe(this.saveHelper.saveKeys.tribe);
		},
		
		// Called if there is no save to load
		setupNewGame: function () {
            gtag('event', 'game_start_new');
            this.gameState.gameStartTimeStamp = new Date().getTime();
			this.creator.initPlayer(this.player);
		},
		
		createLevelEntities: function (seed) {
            var levelVO;
            var sectorVO;
			for (var i = WorldCreatorHelper.getBottomLevel(seed); i <= WorldCreatorHelper.getHighestLevel(seed); i++) {
                levelVO = WorldCreator.world.getLevel(i);
				this.creator.createLevel(this.saveHelper.saveKeys.level + i, i, levelVO);
				for (var y = levelVO.minY; y <= levelVO.maxY; y++) {
					for (var x = levelVO.minX; x <= levelVO.maxX; x++) {
                        sectorVO = levelVO.getSector(x, y);
                        if (!sectorVO) continue;
                        var up = WorldCreator.getPassageUp(i, x, y);
                        var down = WorldCreator.getPassageDown(i, x, y);
                        var passageOptions = { passageUp: up, passageDown: down };
						var blockers = sectorVO.movementBlockers;
                        this.creator.createSector(
                            this.saveHelper.saveKeys.sector + i + "." + x + "." + y,
                            i,
                            x,
                            y,
                            passageOptions,
							blockers,
                            WorldCreator.getSectorFeatures(i, x, y),
                            WorldCreator.getLocales(i, x, y),
                            WorldCreator.getSectorEnemies(i, x, y),
                            WorldCreator.getSectorEnemyCount(i, x, y),
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
                    this.gameState[key] = loadedGameState[key];
                }
            }
            this.gameState.isPaused = false;

            // Create world
            if (GameConstants.isDebugOutputEnabled) console.log("START " + GameConstants.STARTTimeNow() + "\t creating world");
            var worldSeed;
            if (hasSave) worldSeed = parseInt(loadedGameState.worldSeed);
            else worldSeed = WorldCreatorRandom.getNewSeed();

            WorldCreator.prepareWorld(worldSeed, this.enemyHelper, this.itemsHelper);
            this.gameState.worldSeed = worldSeed;
            gtag('set', { 'world_seed': worldSeed });
            
            if (GameConstants.isDebugOutputEnabled) console.log("Prepared world (seed: " + worldSeed + ")");

            // Create other entities and fill components
            if (GameConstants.isDebugOutputEnabled) console.log("START " + GameConstants.STARTTimeNow() + "\t loading entities");
            this.createLevelEntities(worldSeed);
            WorldCreator.discardWorld();
            if (hasSave) {
                var entitiesObject = save.entitiesObject;
                var failedComponents = 0;
                var saveWarningShown = false;

                failedComponents += this.saveHelper.loadEntity(entitiesObject, this.saveHelper.saveKeys.player, this.player);
                failedComponents += this.saveHelper.loadEntity(entitiesObject, this.saveHelper.saveKeys.tribe, this.tribe);
                
                if (!saveWarningShown && failedComponents > 0) {
                    saveWarningShown = true;
                    this.showSaveWarning();
                }

                var sectorNodes = this.creator.engine.getNodeList(SectorNode);
                var positionComponent;
                var saveKey;
                for (var sectorNode = sectorNodes.head; sectorNode; sectorNode = sectorNode.next) {
                    positionComponent = sectorNode.entity.get(PositionComponent);
                    saveKey = this.saveHelper.saveKeys.sector + positionComponent.level + "." + positionComponent.sectorX + "." + positionComponent.sectorY;
                    failedComponents += this.saveHelper.loadEntity(entitiesObject, saveKey, sectorNode.entity);
                
                    if (!saveWarningShown && failedComponents > 0) {
                        saveWarningShown = true;
                        this.showSaveWarning();
                    }
                }

                var levelNodes = this.creator.engine.getNodeList(LevelNode);
                for (var levelNode = levelNodes.head; levelNode; levelNode = levelNode.next) {
                    positionComponent = levelNode.entity.get(PositionComponent);
                    saveKey = this.saveHelper.saveKeys.level + positionComponent.level;
                    failedComponents += this.saveHelper.loadEntity(entitiesObject, saveKey, levelNode.entity);
                
                    if (!saveWarningShown && failedComponents > 0) {
                        saveWarningShown = true;
                        this.showSaveWarning();
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
            try {
                var json = localStorage.save;
                var object = this.saveHelper.parseSaveJSON(json);
                return object;
            } catch (exception) {
                // TODO show no save found to user?
                console.log("Error loading save: " + exception);
            }
            return null;
        },
		
		// Clean up a loaded game state, mostly used to ensure backwards compatibility
		syncLoadedGameState: function () {
			var sectorNodes = this.creator.engine.getNodeList(SectorNode);
			for (var node = sectorNodes.head; node; node = node.next) {
				this.creator.syncSector(node.entity);
			}
		},
        
        showSaveWarning: function () {
            var uiFunctions = this.uiFunctions;
            this.uiFunctions.showQuestionPopup(
                "Warning", 
                "Part of the save could not be loaded. Most likely your save is old and incompatible with the current version. Restart the game or continue at your own risk.",
                "Restart",   
                "Continue",
                function () {
                    uiFunctions.restart();
                },
                function () {}
            );
        }
    });

    return GameManager;
});
