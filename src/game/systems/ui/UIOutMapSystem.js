define([
    'ash',
    'game/constants/GameConstants',
    'game/nodes/PlayerPositionNode'
], function (Ash, GameConstants, PlayerPositionNode) {
    var UIOutMapSystem = Ash.System.extend({

		uiFunctions: null,
		gameState: null,
		tabChangedSignal: null,
        
        playerPositionNodes: null,

		constructor: function (uiFunctions, tabChangedSignal, gameState, uiMapHelper, levelHelper) {
            this.uiFunctions = uiFunctions;
			this.gameState = gameState;
            this.uiMapHelper = uiMapHelper;
            this.levelHelper = levelHelper;
			this.tabChangedSignal = tabChangedSignal;

			var system = this;

			this.onTabChanged = function (tabID) {
				if (tabID === uiFunctions.elementIDs.tabs.map) {
                    system.updateMap();
                    system.centerMap();
                    system.updateMapCompletionHint();
                }
			};

			return this;
		},

		addToEngine: function (engine) {
			this.tabChangedSignal.add(this.onTabChanged);
            this.uiMapHelper.enableScrollingForMap("mainmap");
            this.playerPosNodes = engine.getNodeList(PlayerPositionNode);
		},

		removeFromEngine: function (engine) {
			this.tabChangedSignal.remove(this.onTabChanged);
            this.uiMapHelper.disableScrollingForMap("mainmap");
            this.playerPosNodes = null;
		},

		update: function (time) {
            $("#switch-map .bubble").toggle(!this.gameState.uiStatus.mapVisited);
			if (this.gameState.uiStatus.currentTab !== this.uiFunctions.elementIDs.tabs.map) return;
            this.gameState.uiStatus.mapVisited = true;
			$("#tab-header h2").text("Map");
		},

		updateMap: function () {
            var mapPosition = this.playerPosNodes.head.position.getPosition();
            this.uiMapHelper.rebuildMap("mainmap", "mainmap-fallback", mapPosition, -1, false);
        },

		centerMap: function () {
            var mapPosition = this.playerPosNodes.head.position.getPosition();
            this.uiMapHelper.centerMapToPlayer("mainmap", mapPosition);
        },
        
        updateMapCompletionHint: function () {
            var mapStatus = this.levelHelper.getLevelStats(this.playerPosNodes.head.position.level);
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
    
	});

    return UIOutMapSystem;
});
