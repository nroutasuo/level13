define([
    'ash',
    'game/GameGlobals',
    'game/GlobalSignals',
    'game/constants/GameConstants',
    'game/nodes/PlayerPositionNode',
    'game/components/common/PositionComponent',
    'game/components/common/VisitedComponent',
    'game/systems/CheatSystem'
], function (Ash, GameGlobals, GlobalSignals, GameConstants, PlayerPositionNode, PositionComponent, VisitedComponent, CheatSystem) {

    var UIOutMapSystem = Ash.System.extend({

        playerPositionNodes: null,

        constructor: function () {
            var sys = this;
            $("#btn-cheat-teleport").click(function () {
                sys.teleport();
            });
            this.updateHeight();
        },

		addToEngine: function (engine) {
            this.engine = engine;
            $("#select-header-level").bind("change", $.proxy(this.onLevelSelectorChanged, this));
            GameGlobals.uiMapHelper.enableScrollingForMap("mainmap");
            this.playerPosNodes = engine.getNodeList(PlayerPositionNode);
            GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.onTabChanged);
            GlobalSignals.add(this, GlobalSignals.gameStartedSignal, this.onGameStarted);
            GlobalSignals.add(this, GlobalSignals.windowResizedSignal, this.onResize);
            GlobalSignals.add(this, GlobalSignals.clearBubblesSignal, this.clearBubble);
		},

		removeFromEngine: function (engine) {
            this.engine = null;
            GlobalSignals.removeAll(this);
            $("#select-header-level").unbind("change", $.proxy(this.onLevelSelectorChanged, this));
            GameGlobals.uiMapHelper.disableScrollingForMap("mainmap");
            this.playerPosNodes = null;
		},

		update: function (time) {
            if (GameGlobals.gameState.uiStatus.isHidden) return;
            GameGlobals.uiFunctions.toggle("#switch-map .bubble", !GameGlobals.gameState.uiStatus.mapVisited);
			if (GameGlobals.gameState.uiStatus.currentTab !== GameGlobals.uiFunctions.elementIDs.tabs.map) return;
            GameGlobals.gameState.uiStatus.mapVisited = true;
		},
        
        updateHeight: function () {
            var maxHeight = Math.max(208, $(window).height() - 380);
            $("#mainmap-container").css("maxHeight", maxHeight + "px");
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
            this.selectedSector = null;
            this.updateMap();
            this.updateSector();
        },

        selectSector: function (level, x, y) {
            this.selectedSector = GameGlobals.levelHelper.getSectorByPosition(level, x, y);
            this.updateSector();
        },

		updateMap: function () {
            var mapPosition = this.playerPosNodes.head.position.getPosition();
            if (this.selectedLevel) {
                mapPosition.level = this.selectedLevel;
                mapPosition.sectorX = 0;
                mapPosition.sectorY = 0;
            }
            var sys = this;
            GameGlobals.uiMapHelper.rebuildMap("mainmap", "mainmap-overlay", mapPosition, -1, false, function (level, x, y) {
                sys.onSectorSelected(level, x, y)
            });
        },

        updateSector: function () {
            var hasSector = this.selectedSector !== null;
            GameGlobals.uiFunctions.toggle($("#mainmap-sector-details-content-empty"), !hasSector);
            GameGlobals.uiFunctions.toggle($("#mainmap-sector-details-content"), hasSector);
            GameGlobals.uiFunctions.toggle($("#mainmap-sector-details-content-debug"), hasSector && GameConstants.isCheatsEnabled);

            if (hasSector) {
                var position = this.selectedSector.get(PositionComponent).getPosition();
                $("#mainmap-sector-details-pos").text(position.getInGameFormat(true));
            }
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

        teleport: function () {
            if (!GameConstants.isCheatsEnabled) return;
            if (!this.selectedSector) return;
            var targetPosition = this.selectedSector.get(PositionComponent).getPosition();
			this.engine.getSystem(CheatSystem).setPlayerPosition(targetPosition.level, targetPosition.sectorX, targetPosition.sectorY, false);
        },

        onSectorSelected: function (level, x, y) {
            this.selectSector(level, x, y);
        },

        onGameStarted: function () {
            this.initLevelSelector();
            this.updateLevelSelector();
        },
        
        onResize: function () {
            this.updateHeight();
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

        clearBubble: function () {
            GameGlobals.gameState.uiStatus.mapVisited = true;
        }

	});

    return UIOutMapSystem;
});
