define([
    'ash',
    'game/GameGlobals',
    'game/GlobalSignals',
    'game/constants/GameConstants',
    'game/nodes/PlayerPositionNode',
    'game/components/common/VisitedComponent'
], function (Ash, GameGlobals, GlobalSignals, GameConstants, PlayerPositionNode, VisitedComponent) {
    
    var UIOutMapSystem = Ash.System.extend({
        
        playerPositionNodes: null,
        
        constructor: function () {},

		addToEngine: function (engine) {
            GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.onTabChanged);
            GlobalSignals.add(this, GlobalSignals.gameStartedSignal, this.onGameStarted);
            $("#select-header-level").bind("change", $.proxy(this.onLevelSelectorChanged, this));
            GameGlobals.uiMapHelper.enableScrollingForMap("mainmap");
            this.playerPosNodes = engine.getNodeList(PlayerPositionNode);
		},

		removeFromEngine: function (engine) {
            GlobalSignals.removeAll(this);
            $("#select-header-level").unbind("change", $.proxy(this.onLevelSelectorChanged, this));
            GameGlobals.uiMapHelper.disableScrollingForMap("mainmap");
            this.playerPosNodes = null;
		},

		update: function (time) {
            GameGlobals.uiFunctions.toggle("#switch-map .bubble", !GameGlobals.gameState.uiStatus.mapVisited);
			if (GameGlobals.gameState.uiStatus.currentTab !== GameGlobals.uiFunctions.elementIDs.tabs.map) return;
            GameGlobals.gameState.uiStatus.mapVisited = true;
		},
        
        initLevelSelector: function () {
            $("#select-header-level").empty();
            var html = "";
            var surfaceLevel = GameGlobals.gameState.getSurfaceLevel();
            var groundLevel = GameGlobals.gameState.getGroundLevel();
            for (var i = surfaceLevel; i >= groundLevel; i--) {
                html += "<option value='" + i + "' id='map-level-selector-level-" + i + "'>Level " + i + "</option>"
            }
            $("#select-header-level").append(html);
        },
        
        updateLevelSelector: function () {
            var surfaceLevel = GameGlobals.gameState.getSurfaceLevel();
            var groundLevel = GameGlobals.gameState.getGroundLevel();
            var countVisible = 0;
            for (var i = surfaceLevel; i >= groundLevel; i--) {
                var isVisible = GameGlobals.uiMapHelper.isMapRevealed || GameGlobals.levelHelper.getLevelEntityForPosition(i).has(VisitedComponent);
                GameGlobals.uiFunctions.toggle($("#map-level-selector-level-" + i), isVisible);
                if (isVisible) countVisible++;
            }
            GameGlobals.uiFunctions.toggle($("#select-header-level"), countVisible > 1);
        },
        
        selectLevel: function (level) {
            $("#select-header-level").val(level);
            this.selectedLevel = level;
            this.updateMap();
        },

		updateMap: function () {
            var mapPosition = this.playerPosNodes.head.position.getPosition();
            if (this.selectedLevel) {
                mapPosition.level = this.selectedLevel;
                mapPosition.sectorX = 0;
                mapPosition.sectorY = 0;
            }
            GameGlobals.uiMapHelper.rebuildMap("mainmap", "mainmap-fallback", mapPosition, -1, false);
        },

		centerMap: function () {
            var mapPosition = this.playerPosNodes.head.position.getPosition();
            if (this.selectedLevel) {
                mapPosition.level = this.selectedLevel;
                mapPosition.sectorX = 0;
                mapPosition.sectorY = 0;
            }
            GameGlobals.uiMapHelper.centerMapToPlayer("mainmap", mapPosition, false);
        },
        
        updateMapCompletionHint: function () {
            var mapStatus = GameGlobals.levelHelper.getLevelStats(this.playerPosNodes.head.position.level);
            if (GameConstants.isDebugOutputEnabled) console.log(mapStatus);
            var mapStatusText = "There are still many unvisited streets on this level.";
            if (mapStatus.percentClearedSectors >= 1)
                mapStatusText = "This level has been thoroughly mapped. All locations have been checked.";
            else if (mapStatus.percentScoutedSectors >= 1)
                mapStatusText = "This level has been thoroughly mapped. There are a few unexplored locations left.";
            else if (mapStatus.percentRevealedSectors >= 1)
                mapStatusText = "There are still unscouted streets on this level.";
            else if (mapStatus.percentRevealedSectors >= 0.5)
                mapStatusText = "There are still some unvisited streets on this level.";
            
            $("#map-completion-hint").text(mapStatusText);
        },
        
        onGameStarted: function () {
            this.initLevelSelector();
            this.updateLevelSelector();
        },

		onTabChanged: function (tabID) {
            if (tabID === GameGlobals.uiFunctions.elementIDs.tabs.map) {
                $("#tab-header h2").text("Map");
                this.updateLevelSelector();
                this.selectLevel(this.playerPosNodes.head.position.level);
                this.updateMap();
                this.centerMap();
                this.updateMapCompletionHint();
            }
        },
        
        onLevelSelectorChanged: function () {
            var level = parseInt($("#select-header-level").val());
            if (this.selectedLevel === level) return;
            this.selectLevel(level);
        },
    
	});

    return UIOutMapSystem;
});
