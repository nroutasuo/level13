// A system that updates various GameState.unlockedFeatures based on improvements etc
define([
    'ash',
    'game/GameGlobals',
    'game/GlobalSignals',
    'game/constants/ItemConstants',
    'game/constants/UpgradeConstants',
    'game/nodes/sector/CampNode',
	'game/nodes/tribe/TribeUpgradesNode',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/components/player/ItemsComponent',
    'game/vos/ResourcesVO'
], function (Ash, GameGlobals, GlobalSignals, ItemConstants, UpgradeConstants, CampNode, TribeUpgradesNode, SectorImprovementsComponent, ItemsComponent, ResourcesVO) {
    var UnlockedFeaturesSystem = Ash.System.extend({
	    
		gameState: null,
		campNodes: null,
        tribeUpgradesNodes: null,
	
        constructor: function () {
        },

        addToEngine: function (engine) {
            this.engine = engine;
			this.campNodes = engine.getNodeList(CampNode);
            this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
        },

        removeFromEngine: function (engine) {
			this.campNodes = null;
            this.engine = null;
        },

        update: function (time) {
			var numCamps = 0;
			var numTradePostCamps = 0;
            
            GameGlobals.gameState.gamePlayedSeconds += time;
			
			// Global improvements
			for (var node = this.campNodes.head; node; node = node.next) {
				var improvementsComponent = node.entity.get(SectorImprovementsComponent);
				if (improvementsComponent.getCount(improvementNames.tradepost) > 0) {
                    if (!GameGlobals.gameState.unlockedFeatures.trade)
                        GlobalSignals.featureUnlockedSignal.dispatch();
					GameGlobals.gameState.unlockedFeatures.trade = true;
					numTradePostCamps++;
				}
				if (improvementsComponent.getCount(improvementNames.inn) > 0) {
                    if (!GameGlobals.gameState.unlockedFeatures.followers)
                        GlobalSignals.featureUnlockedSignal.dispatch();
					GameGlobals.gameState.unlockedFeatures.followers = true;
				}
				if (improvementsComponent.getCount(improvementNames.campfire) > 0) {
                    if (!GameGlobals.gameState.unlockedFeatures.upgrades)
                        GlobalSignals.featureUnlockedSignal.dispatch();
					GameGlobals.gameState.unlockedFeatures.upgrades = true;
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
			GameGlobals.gameState.numTradePostCamps = numTradePostCamps;
            
            if (!GameGlobals.gameState.unlockedFeatures.projects) {
                GameGlobals.gameState.unlockedFeatures.projects = this.tribeUpgradesNodes.head.upgrades.hasUpgrade(UpgradeConstants.upgradeIds.unlock_building_passage_staircase);
                if (GameGlobals.gameState.unlockedFeatures.projects)
                    GlobalSignals.featureUnlockedSignal.dispatch();
            }
		}
        
    });

    return UnlockedFeaturesSystem;
});
