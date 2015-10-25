// A system that updates a global resources based on the camps' resources. Rules:
//  - player not in camp: player carries all resources
//  - player/worker in camp with no trading post: camp has resources
//  - player/worker in camp with trading post: moved to tribe resources
define([
    'ash',
    'game/nodes/sector/SectorResourcesNode',
    'game/nodes/player/PlayerResourcesNode',
    'game/nodes/tribe/TribeResourcesNode',
    'game/components/common/ResourcesComponent',
    'game/components/tribe/UpgradesComponent',
    'game/components/common/CampComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/vos/ResourcesVO'
], function (Ash,
	SectorResourcesNode, PlayerResourcesNode, TribeResourcesNode,
	ResourcesComponent, UpgradesComponent, CampComponent, SectorImprovementsComponent,
	ResourcesVO) {
    var GlobalResourcesSystem = Ash.System.extend({
	    
		playerNodes: null,
		sectorNodes: null,
		tribeNodes: null,
		
		gameState: null,
		upgradeEffectsHelper: null,
		
		// TODO use camp nodes instead of sector nodes for loops
		
		constructor: function (gameState, upgradeEffectsHelper) {
			this.gameState = gameState;
			this.upgradeEffectsHelper = upgradeEffectsHelper;
		},

		addToEngine: function (engine) {
			this.playerNodes = engine.getNodeList(PlayerResourcesNode);
			this.sectorNodes = engine.getNodeList(SectorResourcesNode);
			this.tribeNodes = engine.getNodeList(TribeResourcesNode);
		},

		removeFromEngine: function (engine) {
			this.playerNodes = null;
			this.sectorNodes = null;
			this.tribeNodes = null;
		},

		update: function (time) {
			this.updateCampsResources();
			this.updateTribeResources();
			this.updatePlayerResources();
			this.updateGameState();
		},
		
		updateCampsResources: function () {
			var storageUpgradeLevel = this.getStorageUpgradeLevel();
			var storagePerImprovement = 100;
			if (storageUpgradeLevel > 1) storagePerImprovement = 500;
			if (storageUpgradeLevel > 2) storagePerImprovement = 1200;
			
			var campImprovements;
			var hasTradePost;
			for (var node = this.sectorNodes.head; node; node = node.next) {
				if (node.entity.has(CampComponent)) {
					campImprovements = node.entity.get(SectorImprovementsComponent);
					hasTradePost = campImprovements.getCount(improvementNames.tradepost) > 0;
					node.resources.storageCapacity = campImprovements.getCount(improvementNames.storage) * storagePerImprovement;
					node.resources.limitToStorage(!hasTradePost);
				}
			}
		},
		
		updateTribeResources: function () {
			var globalResourcesComponent = this.tribeNodes.head.resources;
			var globalResources = globalResourcesComponent.resources;
			var globalResourceAccumulationComponent = this.tribeNodes.head.resourceAccumulation;
			
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
			}
			
			var campImprovements;
			var hasTradePost;
			for (var node = this.sectorNodes.head; node; node = node.next) {
				if (node.entity.has(CampComponent)) {
					campImprovements = node.entity.get(SectorImprovementsComponent);
					hasTradePost = campImprovements.getCount(improvementNames.tradepost) > 0;
					if (hasTradePost) {
						for (var key in resourceNames) {
							var name = resourceNames[key];
							updateSectorResource(node, name);
							updateSectorResAcc(node, name);
						}
						globalResourcesComponent.storageCapacity += node.resources.storageCapacity;
					}
				}
			}
			
			globalResourcesComponent.limitToStorage(true);
		},
		
		updatePlayerResources: function () {
			this.playerNodes.head.resources.limitToStorage(true);
		},
		
		updateGameState: function () {
			var playerResources = this.playerNodes.head.resources.resources;
			var globalResourcesComponent = this.tribeNodes.head.resources;
			var globalResources = globalResourcesComponent.resources;
			
			var gameState = this.gameState;
			var sectorNodes = this.sectorNodes;
			var checkUnlockedResource = function (name) {
				if (gameState.unlockedFeatures.resources[name]) return true;
				if (playerResources[name] > 0) return true;
				for (var node = sectorNodes.head; node; node = node.next) {
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
			var upgradeLevel = 1;
			var upgradeComponent = this.tribeNodes.head.entity.get(UpgradesComponent);
			var storageUpgrades = this.upgradeEffectsHelper.getUpgradeIdsForImprovement(improvementNames.storage);
			var storageUpgrade;
			for (var i in storageUpgrades) {
				storageUpgrade = storageUpgrades[i];
				if (upgradeComponent.hasBought(storageUpgrade)) upgradeLevel++;
			}
			return upgradeLevel;
		},
        
    });

    return GlobalResourcesSystem;
});
