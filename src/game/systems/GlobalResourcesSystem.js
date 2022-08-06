// A system that updates a global resources based on the camps' resources. Rules:
// - player not in camp: player carries all resources
// - player/worker in camp with no trading post: camp has resources
// - player/worker in camp with trading post: moved to tribe resources
define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/nodes/sector/CampResourcesNode',
	'game/nodes/player/PlayerResourcesNode',
	'game/nodes/tribe/TribeResourcesNode',
	'game/components/common/CurrencyComponent',
	'game/components/tribe/UpgradesComponent',
	'game/constants/CampConstants'
], function (Ash, GameGlobals, GlobalSignals,
	CampResourcesNode, PlayerResourcesNode, TribeResourcesNode,
	CurrencyComponent, UpgradesComponent,
	CampConstants) {
	var GlobalResourcesSystem = Ash.System.extend({
		
		playerNodes: null,
		campNodes: null,
		tribeNodes: null,
		
		constructor: function () {
		},

		addToEngine: function (engine) {
			this.playerNodes = engine.getNodeList(PlayerResourcesNode);
			this.campNodes = engine.getNodeList(CampResourcesNode);
			this.tribeNodes = engine.getNodeList(TribeResourcesNode);

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
			
			for (var node = this.campNodes.head; node; node = node.next) {
				let campImprovements = node.improvements;
				let storageCount = campImprovements.getCount(improvementNames.storage);
				let storageLevel = campImprovements.getLevel(improvementNames.storage);
				let hasTradePost = campImprovements.getCount(improvementNames.tradepost) > 0;
				node.resources.storageCapacity = CampConstants.getStorageCapacity(storageCount, storageLevel);
				node.resources.limitToStorage(!hasTradePost);
				
				this.updateCampSpecialStorage(node);
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
					for (let i = 0; i < sources.length; i++) {
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
						if (!CampConstants.isLocalResource(name)) {
							updateSectorResource(node, name);
							updateSectorResAcc(node, name);
						}
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
			
			var gameState = GameGlobals.gameState;
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
			
			GameGlobals.gameState.unlockedFeatures.resources.food = checkUnlockedResource("food");
			GameGlobals.gameState.unlockedFeatures.resources.water = checkUnlockedResource("water");
			GameGlobals.gameState.unlockedFeatures.resources.metal = checkUnlockedResource("metal");
			GameGlobals.gameState.unlockedFeatures.resources.rope = checkUnlockedResource("rope");
			GameGlobals.gameState.unlockedFeatures.resources.herbs = checkUnlockedResource("herbs");
			GameGlobals.gameState.unlockedFeatures.resources.fuel = checkUnlockedResource("fuel");
			GameGlobals.gameState.unlockedFeatures.resources.rubber = checkUnlockedResource("rubber");
			GameGlobals.gameState.unlockedFeatures.resources.medicine = checkUnlockedResource("medicine");
			GameGlobals.gameState.unlockedFeatures.resources.concrete = checkUnlockedResource("concrete");
			GameGlobals.gameState.unlockedFeatures.resources.robots = checkUnlockedResource("robots");
			GameGlobals.gameState.unlockedFeatures.resources.tools = checkUnlockedResource("tools");
		},
		
		updateCampSpecialStorage: function (node) {
			let factoryCount = node.improvements.getCount(improvementNames.robotFactory);
			let factoryLevel = node.improvements.getLevel(improvementNames.robotFactory);
			let maxRobots = CampConstants.getRobotStorageCapacity(factoryCount, factoryLevel);
			node.resources.resources.limit(resourceNames.robots, 0, maxRobots);
		},
		
		onInventoryChanged: function () {
			this.updateUnlockedResources();
		},
		
		getStorageUpgradeLevel: function () {
			return GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.storage, this.tribeNodes.head.entity.get(UpgradesComponent));
		},
		
	});

	return GlobalResourcesSystem;
});
