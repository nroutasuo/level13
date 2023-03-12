// A system that updates various GameState.unlockedFeatures based on improvements etc
define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/ItemConstants',
	'game/constants/UpgradeConstants',
	'game/nodes/player/ItemsNode',
	'game/nodes/sector/CampNode',
	'game/nodes/tribe/TribeUpgradesNode',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/vos/ResourcesVO'
], function (Ash, GameGlobals, GlobalSignals, ItemConstants, UpgradeConstants, ItemsNode, CampNode, TribeUpgradesNode, SectorImprovementsComponent, ResourcesVO) {
	var UnlockedFeaturesSystem = Ash.System.extend({
		
		gameState: null,
		campNodes: null,
		tribeUpgradesNodes: null,
		itemNodes: null,
	
		constructor: function () {
		},

		addToEngine: function (engine) {
			this.engine = engine;
			this.campNodes = engine.getNodeList(CampNode);
			this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
			this.itemNodes = engine.getNodeList(ItemsNode);
			
			GlobalSignals.add(this, GlobalSignals.gameStartedSignal, this.onGameStarted);
		},

		removeFromEngine: function (engine) {
			this.campNodes = null;
			this.engine = null;
			
			GlobalSignals.removeAll(this);
		},

		update: function (time) {
			this.updateUnlockedFeaturesDynamic();
		},
		
		updateUnlockedFeaturesDynamic: function () {
			let numCamps = 0;
			
			// Global improvements
			for (let node = this.campNodes.head; node; node = node.next) {
				let improvementsComponent = node.entity.get(SectorImprovementsComponent);
				if (improvementsComponent.getCount(improvementNames.campfire) > 0) {
					GameGlobals.playerActionFunctions.unlockFeature("upgrades");
				}
				if (improvementsComponent.getCount(improvementNames.home) < 1) {
					improvementsComponent.add(improvementNames.home);
				}
				numCamps++;
			}
			
			if (GameGlobals.gameState.numCamps !== numCamps) {
				GameGlobals.gameState.numCamps = numCamps;
				gtag('set', { 'max_camp': GameGlobals.gameState.numCamps });
			}
			
			if (!GameGlobals.gameState.unlockedFeatures.projects) {
				// TODO check with upgrade effects (has unlocked any upgrade that unlocks projects)
				if (this.tribeUpgradesNodes.head.upgrades.hasUpgrade("unlock_building_passage_staircase")) {
					GameGlobals.playerActionFunctions.unlockFeature("projects");
				}
			}
		},
		
		updateUnlockedFeaturesSanityChecks: function () {
			let upgradeID = GameGlobals.upgradeEffectsHelper.getUpgradeIdForAction("investigate");
			if (upgradeID) {
				if (!GameGlobals.tribeHelper.hasUpgrade(upgradeID)) {
					GameGlobals.playerActionFunctions.lockFeature("investigate")
				}
			}
		},
		
		onGameStarted: function () {
			this.updateUnlockedFeaturesSanityChecks();
		}
		
	});

	return UnlockedFeaturesSystem;
});
