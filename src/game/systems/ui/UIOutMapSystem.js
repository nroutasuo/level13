define([
    'ash',
    'game/constants/UIConstants'
], function (Ash, UIConstants) {
    var UIOutBagSystem = Ash.System.extend({

		uiFunctions: null,
		gameState: null,
		tabChangedSignal: null,

		constructor: function (uiFunctions, tabChangedSignal, gameState, uiMapHelper) {
            this.uiFunctions = uiFunctions;
			this.gameState = gameState;
            this.uiMapHelper = uiMapHelper;
			this.tabChangedSignal = tabChangedSignal;

			var system = this;

			this.onTabChanged = function (tabID) {
				if (tabID === uiFunctions.elementIDs.tabs.map) system.updateMap();
			};

			return this;
		},

		addToEngine: function (engine) {
			this.tabChangedSignal.add(this.onTabChanged);
		},

		removeFromEngine: function (engine) {
			this.tabChangedSignal.remove(this.onTabChanged);
		},

		update: function (time) {
			if (this.gameState.uiStatus.currentTab !== this.uiFunctions.elementIDs.tabs.map) return;
			$("#tab-header h2").text("Map");
		},

		updateMap: function () {
            this.uiMapHelper.rebuildMap("mainmap", "mainmap-fallback", -1, false);
        }
    
	});

    return UIOutBagSystem;
});
