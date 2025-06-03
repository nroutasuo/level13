define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/ItemConstants',
	'game/components/common/CampComponent',
	'game/components/common/PositionComponent',
	'game/components/player/ItemsComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/nodes/sector/CampNode',
	'game/nodes/NearestCampNode',
	'game/nodes/PlayerLocationNode',
	'game/nodes/player/PlayerStatsNode',
], function (Ash,
	GameGlobals,
	GlobalSignals,
	ItemConstants,
	CampComponent,
	PositionComponent,
	ItemsComponent,
	SectorImprovementsComponent,
	CampNode,
	NearestCampNode,
	PlayerLocationNode,
	PlayerStatsNode,
) {
	var UIOutTabBarSystem = Ash.System.extend({
		
		campNodes: null,
		nearestCampNodes: null,
		playerStatsNodes: null,
		currentLocationNodes: null,
		
		constructor: function () {},
		
		addToEngine: function (engine) {
			this.engine = engine;
			this.campNodes = engine.getNodeList(CampNode);
			this.campNodes.nodeAdded.add(this.onCampNodeAdded, this);
			this.campNodes.nodeRemoved.add(this.onCampNodeRemoved, this);
			this.nearestCampNodes = engine.getNodeList(NearestCampNode);
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			this.currentLocationNodes = engine.getNodeList(PlayerLocationNode);
			
			GlobalSignals.add(this, GlobalSignals.gameShownSignal, this.updateTabVisibility);
			GlobalSignals.add(this, GlobalSignals.calloutsGeneratedSignal, this.updateTabVisibility);
			GlobalSignals.add(this, GlobalSignals.improvementBuiltSignal, this.updateTabVisibility);
			GlobalSignals.add(this, GlobalSignals.featureUnlockedSignal, this.updateTabVisibility);
			GlobalSignals.add(this, GlobalSignals.inventoryChangedSignal, this.updateTabVisibility);
			GlobalSignals.add(this, GlobalSignals.upgradeUnlockedSignal, this.updateTabVisibility);
			GlobalSignals.add(this, GlobalSignals.playerPositionChangedSignal, this.updateTabVisibility);
			GlobalSignals.add(this, GlobalSignals.popupClosedSignal, this.updateTabVisibility);
			GlobalSignals.add(this, GlobalSignals.playerEnteredCampSignal, this.updateTabVisibility);
			GlobalSignals.add(this, GlobalSignals.playerLeftCampSignal, this.updateTabVisibility);
			GlobalSignals.add(this, GlobalSignals.populationChangedSignal, this.updateTabNames);
			
			this.updateTabVisibility();
		},

		removeFromEngine: function (engine) {
			GlobalSignals.removeAll(this);
			this.engine = null;
			this.campNodes = null;
			this.nearestCampNodes = null;
			this.playerStatsNodes = null;
			this.currentLocationNodes = null;
		},
		
		onCampNodeAdded: function (node) {
			this.updateTabVisibility();
			this.updateTabNames();
		},

		onCampNodeRemoved: function (node) {
			this.updateTabVisibility();
			this.updateTabNames();
		},
		
		updateTabVisibility: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			if (!this.playerStatsNodes.head) return;
			
			let levelCamp = this.nearestCampNodes.head;
			let currentCamp = levelCamp ? levelCamp.entity : null;
			let isInCamp = this.playerStatsNodes.head && this.playerStatsNodes.head.entity.get(PositionComponent).inCamp;
			let hasMap = GameGlobals.playerHelper.hasItem("equipment_map") || GameGlobals.uiMapHelper.isMapRevealed;
			let hasProjects = GameGlobals.gameState.unlockedFeatures.projects;
			let hasTradingPost = currentCamp && currentCamp.get(SectorImprovementsComponent).getCount(improvementNames.tradepost) > 0;
			let hasHomes = currentCamp && currentCamp.get(SectorImprovementsComponent).getCount(improvementNames.house) > 0;

			GameGlobals.uiFunctions.toggle("#switch-tabs #switch-in", isInCamp);
			GameGlobals.uiFunctions.toggle("#switch-tabs #switch-upgrades", isInCamp && GameGlobals.gameState.unlockedFeatures.upgrades);
			GameGlobals.uiFunctions.toggle("#switch-tabs #switch-world", isInCamp && GameGlobals.gameState.numCamps > 1);
			GameGlobals.uiFunctions.toggle("#switch-tabs #switch-milestones", isInCamp && GameGlobals.gameState.unlockedFeatures.milestones);
			GameGlobals.uiFunctions.toggle("#switch-tabs #switch-bag", GameGlobals.gameState.unlockedFeatures.bag);
			GameGlobals.uiFunctions.toggle("#switch-tabs #switch-explorers", GameGlobals.gameState.unlockedFeatures.explorers);
			GameGlobals.uiFunctions.toggle("#switch-tabs #switch-out", !isInCamp);
			GameGlobals.uiFunctions.toggle("#switch-tabs #switch-map", hasMap);
			GameGlobals.uiFunctions.toggle("#switch-tabs #switch-trade", isInCamp && GameGlobals.gameState.unlockedFeatures.trade);
			GameGlobals.uiFunctions.toggle("#switch-tabs #switch-projects", isInCamp && hasProjects);
			GameGlobals.uiFunctions.toggle("#switch-tabs #switch-embark", isInCamp);
		},
		
		updateTabNames: function () {
			if (!GameGlobals.gameState.uiStatus.isHidden) return;
			var posHasCamp = this.currentLocationNodes.head && this.currentLocationNodes.head.entity.has(CampComponent);
			var levelCamp = this.nearestCampNodes.head;
			var currentCamp = levelCamp ? levelCamp.entity : null;
			if (currentCamp) {
				var campComponent = currentCamp.get(CampComponent);
				$("#switch-tabs #switch-in .name").text(campComponent.getType());
			}
		},
	});

	return UIOutTabBarSystem;
});
