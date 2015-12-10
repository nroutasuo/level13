define([
    'ash',
    'game/worldcreator/WorldCreator',
    'game/worldcreator/WorldCreatorHelper',
    'game/worldcreator/WorldCreatorRandom',
    'game/helpers/SaveHelper',
    'game/nodes/sector/SectorNode',
    'game/nodes/LevelNode',
    'game/components/common/PositionComponent'
], function (Ash, WorldCreator, WorldCreatorHelper, WorldCreatorRandom, SaveHelper, SectorNode, LevelNode, PositionComponent) {

    var GameManager = Ash.System.extend({
	
        tickProvider: null,
        gameState: null,
        creator: null,
		saveHelper: null,
		
		uiFunctions: null,
		playerActions: null,
		
		engine: null,
		
		player: null,
		tribe: null,
	
		constructor: function (tickProvider, gameState, creator, uiFunctions, playerActions, saveHelper) {
			this.tickProvider = tickProvider;
			this.gameState = gameState;
			this.creator = creator;
			this.uiFunctions = uiFunctions;
			this.playerActions = playerActions;
			this.saveHelper = saveHelper;
		},
	
		addToEngine: function (engine) {
			this.engine = engine;
			this.setupGame();
		},
	
		removeFromEngine: function (engine) {
			this.player = null;
			this.engine = null;
		},
		
		// Called on add to engine
		setupGame: function () {
			this.initializeEntities();
			var loaded = this.loadGameState();
			if (loaded) this.syncLoadedGameState();
			if (!loaded) this.setupNewGame();
		},
		
		// Called after all other systems are ready
		startGame: function () {
			var startTab = this.uiFunctions.elementIDs.tabs.out;
			var playerPos = this.playerActions.playerPositionNodes.head.position;
			if (playerPos.inCamp) startTab = this.uiFunctions.elementIDs.tabs.in;
			this.uiFunctions.showTab(startTab);
		},
		
		restartGame: function () {
			this.engine.removeAllEntities();
			this.gameState.reset();
			this.setupGame();
			this.startGame();
		},
		
		initializeEntities: function () {
			this.player = this.creator.createPlayer(this.saveHelper.saveKeys.player);
			this.tribe = this.creator.createTribe(this.saveHelper.saveKeys.tribe);
		},
		
		// Called if there is no save to load
		setupNewGame: function () {
			this.creator.initPlayer(this.player);
		},
		
		createLevelEntities: function (seed) {
            var levelVO;
            var sectorVO;
			for (var i = WorldCreatorHelper.getBottomLevel(seed); i <= WorldCreatorHelper.getHighestLevel(seed); i++) {
                levelVO = WorldCreator.world.getLevel(i);
				this.creator.createLevel(this.saveHelper.saveKeys.level + i, i);
				for (var y = levelVO.minY; y <= levelVO.maxY; y++) {
					for (var x = levelVO.minX; x <= levelVO.maxX; x++) {
                        sectorVO = levelVO.getSector(x, y);
                        if (!sectorVO) continue;
                        var up = WorldCreator.getPassageUp(i, x, y);
                        var down = WorldCreator.getPassageDown(i, x, y);
                        var blockerLeft = WorldCreator.getBlockerLeft(i, x, y);
                        var blockerRight = WorldCreator.getBlockerRight(i, x, y);
                        var passageOptions = { passageUp: up, passageDown: down, blockerLeft: blockerLeft, blockerRight: blockerRight};
                        this.creator.createSector(
                            this.saveHelper.saveKeys.sector + i + "." + x + "." + y,
                            i,
                            x,
                            y,
                            passageOptions,
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
			var hasSave = localStorage.timeStamp && localStorage.entitiesObject && localStorage.gameState;
			
			// Load game state
			if (hasSave) {
				var loadedGameState = JSON.parse(localStorage.gameState);
				for (key in loadedGameState) {
					this.gameState[key] = loadedGameState[key];
				}
			}
			
			// Create world
			var worldSeed;
			if (hasSave) worldSeed = parseInt(loadedGameState.worldSeed);
			else worldSeed = WorldCreatorRandom.getNewSeed();
			
			WorldCreator.prepareWorld(worldSeed);
			this.createLevelEntities(worldSeed);
			this.gameState.worldSeed = worldSeed;
			
			// Create other entities and fill components
			if (hasSave) {
				var entitiesObject = JSON.parse(localStorage.entitiesObject);
				var failedComponents = 0;
				
				var sectorNodes = this.creator.engine.getNodeList(SectorNode);
				var positionComponent;
				var saveKey;
				for (var sectorNode = sectorNodes.head; sectorNode; sectorNode = sectorNode.next) {
					positionComponent = sectorNode.entity.get(PositionComponent);
					saveKey = this.saveHelper.saveKeys.sector + positionComponent.level + "." + positionComponent.sectorX + "." + positionComponent.sectorY;
					failedComponents += this.saveHelper.loadEntity(entitiesObject, saveKey, sectorNode.entity);
				}
				
				var levelNodes = this.creator.engine.getNodeList(LevelNode);
				for (var levelNode = levelNodes.head; levelNode; levelNode = levelNode.next) {
					positionComponent = levelNode.entity.get(PositionComponent);
					saveKey = this.saveHelper.saveKeys.level + positionComponent.level;
					failedComponents += this.saveHelper.loadEntity(entitiesObject, saveKey, levelNode.entity);
				}
				
				failedComponents += this.saveHelper.loadEntity(entitiesObject, this.saveHelper.saveKeys.player, this.player);
				failedComponents += this.saveHelper.loadEntity(entitiesObject, this.saveHelper.saveKeys.tribe, this.tribe);
				
				console.log("Loaded from " + localStorage.timeStamp);
				
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
		
		// Clean up a loaded game state, mostly used to ensure backwards compatibility
		syncLoadedGameState: function () {
			var sectorNodes = this.creator.engine.getNodeList(SectorNode);
			for (var node = sectorNodes.head; node; node = node.next) {
				this.creator.syncSector(node.entity);
			}
		}
    });

    return GameManager;
});
