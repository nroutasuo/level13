// A system that updates a global resources based on the camps' resources. Rules:
//  - player not in camp: player carries all resources
//  - player/worker in camp with no trading post: camp has resources
//  - player/worker in camp with trading post: moved to tribe resources
define([
    'ash',
    'game/GlobalSignals',
    'game/nodes/sector/CampResourcesNode',
    'game/nodes/player/PlayerResourcesNode',
    'game/nodes/tribe/TribeResourcesNode',
    'game/components/common/CurrencyComponent',
    'game/components/tribe/UpgradesComponent',
    'game/constants/CampConstants'
], function (Ash, GlobalSignals,
	CampResourcesNode, PlayerResourcesNode, TribeResourcesNode,
	CurrencyComponent, UpgradesComponent,
	CampConstants) {
    var GlobalResourcesSystem = Ash.System.extend({
	    
		playerNodes: null,
		campNodes: null,
		tribeNodes: null,
		
		gameState: null,
		upgradeEffectsHelper: null,
		
		constructor: function (gameState, upgradeEffectsHelper) {
			this.gameState = gameState;
			this.upgradeEffectsHelper = upgradeEffectsHelper;
		},

		addToEngine: function (engine) {
			this.playerNodes = engine.getNodeList(PlayerResourcesNode);
			this.campNodes = engine.getNodeList(CampResourcesNode);
			this.tribeNodes = engine.getNodeList(TribeResourcesNode);

            var sys = this;
            this.onInventoryChanged = function () {
                sys.updateUnlockedResources();
            };
            GlobalSignals.add(this, GlobalSignals.inventoryChangedSignal, this.onInventoryChanged);
		},

		removeFromEngine: function (engine) {
			this.playerNodes = null;
			this.campNodes = null;
			this.tribeNodes = null;
            GlobalSignals.removeAll(this);
		},

		update: function (time) {
			this.updateCampsResources();
			this.updateTribeResources();
			this.updatePlayerResources();
		},
		
		updateCampsResources: function () {
			var storageUpgradeLevel = this.getStorageUpgradeLevel();
			var storagePerImprovement = 100;
			if (storageUpgradeLevel > 1) storagePerImprovement = 500;
			if (storageUpgradeLevel > 2) storagePerImprovement = 1200;
			
			var campImprovements;
			var hasTradePost;
			for (var node = this.campNodes.head; node; node = node.next) {
                campImprovements = node.improvements;
                hasTradePost = campImprovements.getCount(improvementNames.tradepost) > 0;
                node.resources.storageCapacity = CampConstants.BASE_STORAGE + campImprovements.getCount(improvementNames.storage) * storagePerImprovement;
                node.resources.limitToStorage(!hasTradePost);
			}
		},
		
		updateTribeResources: function () {
			var globalResourcesComponent = this.tribeNodes.head.resources;
			var globalResources = globalResourcesComponent.resources;
			var globalResourceAccumulationComponent = this.tribeNodes.head.resourceAccumulation;
            var globalCurrency = this.tribeNodes.head.entity.get(CurrencyComponent);
			
			var updateSectorResource = function (node, name) {
				var amount = node.resources.resources.getResource(name);
				globalResources.addResource(name, amount);
				node.resources.resources.addResource(name, -amount);
			};
			
			var updateSectorResAcc = function (node, name) {
				var sources = node.resourceAccumulation.getSources(name);
				if (sources) {
					for (var i = 0; i < sources.length; i++) {
						var source = sources[i];
						globalResourceAccumulationComponent.addChange(name, source.amount, source.source);
					}
				}
			};
            
            var updateSectorCurrency = function (node) {
                var currency = node.currency;
				var amount = currency.currency;
				globalCurrency.currency += amount;
				currency.currency = 0;
            };
			
			var campImprovements;
			var hasTradePost;
            var numCamps = 0;
            var numCampsInTradeNetwork = 0;
			for (var node = this.campNodes.head; node; node = node.next) {
                campImprovements = node.improvements;
                hasTradePost = campImprovements.getCount(improvementNames.tradepost) > 0;
                if (hasTradePost) {
                    for (var key in resourceNames) {
                        var name = resourceNames[key];
                        updateSectorResource(node, name);
                        updateSectorResAcc(node, name);
                    }
                    updateSectorCurrency(node);
                    globalResourcesComponent.storageCapacity += node.resources.storageCapacity;
                    numCampsInTradeNetwork++;
                }
                
                numCamps++;
			}
            
            this.tribeNodes.head.tribe.numCamps = numCamps;
            this.tribeNodes.head.tribe.numCampsInTradeNetwork = numCampsInTradeNetwork;
			
			globalResourcesComponent.limitToStorage(true);
		},
		
		updatePlayerResources: function () {
			this.playerNodes.head.resources.limitToStorage(true);
		},
		
		updateUnlockedResources: function () {
			var playerResources = this.playerNodes.head.resources.resources;
			var globalResourcesComponent = this.tribeNodes.head.resources;
			var globalResources = globalResourcesComponent.resources;
			
			var gameState = this.gameState;
			var campNodes = this.campNodes;
			var checkUnlockedResource = function (name) {
				if (gameState.unlockedFeatures.resources[name]) return true;
				if (playerResources[name] > 0) return true;
				for (var node = campNodes.head; node; node = node.next) {
					if (node.resources.resources[name] > 0) return true;
				}
				if (globalResources[name] > 0) return true;
				return false;
			};
			
			this.gameState.unlockedFeatures.resources.food = checkUnlockedResource("food");
			this.gameState.unlockedFeatures.resources.water = checkUnlockedResource("water");
			this.gameState.unlockedFeatures.resources.metal = checkUnlockedResource("metal");
			this.gameState.unlockedFeatures.resources.rope = checkUnlockedResource("rope");
			this.gameState.unlockedFeatures.resources.herbs = checkUnlockedResource("herbs");
			this.gameState.unlockedFeatures.resources.fuel = checkUnlockedResource("fuel");
			this.gameState.unlockedFeatures.resources.medicine = checkUnlockedResource("medicine");
			this.gameState.unlockedFeatures.resources.concrete = checkUnlockedResource("concrete");
			this.gameState.unlockedFeatures.resources.tools = checkUnlockedResource("tools");
		},
		
		getStorageUpgradeLevel: function () {
            return this.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.storage, this.tribeNodes.head.entity.get(UpgradesComponent));
		},
        
    });

    return GlobalResourcesSystem;
});
