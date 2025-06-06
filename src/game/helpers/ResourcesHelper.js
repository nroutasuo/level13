// Singleton with helper methods for resource storage etc
define([
	'ash',
	'game/nodes/player/PlayerResourcesNode',
	'game/nodes/NearestCampNode',
	'game/nodes/tribe/TribeResourcesNode',
	'game/components/common/PositionComponent',
	'game/components/common/ResourcesComponent',
	'game/components/common/CurrencyComponent',
	'game/components/common/ResourceAccumulationComponent',
	'game/components/sector/improvements/SectorImprovementsComponent'
], function (Ash,
	PlayerResourcesNode, NearestCampNode, TribeResourcesNode,
	PositionComponent, ResourcesComponent, CurrencyComponent, ResourceAccumulationComponent, SectorImprovementsComponent) {

	var ResourceHelper = Ash.Class.extend({

		playerResourcesNodes: null,
		nearestCampNodes: null,
		globalResourcesNodes: null,

		constructor: function (engine) {
			this.nearestCampNodes = engine.getNodeList(NearestCampNode);
			this.playerResourcesNodes = engine.getNodeList(PlayerResourcesNode);
			this.globalResourcesNodes = engine.getNodeList(TribeResourcesNode);
		},

		getCurrentStorage: function (excludePlayer) {
			if (!this.playerResourcesNodes.head) return null;

			var playerResources = this.getPlayerStorage();
			var campResources = this.nearestCampNodes.head != null ? this.nearestCampNodes.head.entity.get(ResourcesComponent) : null;
			var globalResources = this.getGlobalStorage();

			var currentResources = excludePlayer ? null : playerResources;

			var playerPosition = this.playerResourcesNodes.head.entity.get(PositionComponent);
			if (playerPosition.inCamp && this.hasCampStorage()) {
				currentResources = campResources;
				if (this.hasAccessToTradeNetwork()) {
					currentResources = globalResources;
				}
			}

			return currentResources;
		},

		getCurrentCampStorage: function (campEntity) {
			var campResources = campEntity.get(ResourcesComponent);
			var globalResources = this.getGlobalStorage();

			var currentResources = campResources;
			if (this.hasAccessToTradeNetwork(campEntity)) {
				currentResources = globalResources;
			}

			return currentResources;
		},

		getCurrentCurrency: function () {
			var playerCurrencys = this.getPlayerCurrency();
			var campCurrencys = this.nearestCampNodes.head != null ? this.nearestCampNodes.head.entity.get(CurrencyComponent) : null;
			var globalCurrencys = this.globalResourcesNodes.head.currency;

			var currentCurrencys = playerCurrencys;

			var playerPosition = this.playerResourcesNodes.head.entity.get(PositionComponent);
			if (playerPosition.inCamp && this.hasCampStorage()) {
				currentCurrencys = campCurrencys;
				if (this.hasAccessToTradeNetwork()) {
					currentCurrencys = globalCurrencys;
				}
			}

			return currentCurrencys;
		},

		getCurrentCampCurrency: function (campEntity) {
			if (this.hasAccessToTradeNetwork(campEntity)) {
				return this.globalResourcesNodes.head.currency;
			}

			return campEntity.get(CurrencyComponent);
		},

		getCurrentStorageCap: function () {
			var playerPosition = this.playerResourcesNodes.head.entity.get(PositionComponent);
			var showStorage = this.playerResourcesNodes.head.entity.get(ResourcesComponent).storageCapacity;

			if (playerPosition.inCamp && this.hasCampStorage()) {
				showStorage = this.nearestCampNodes.head.entity.get(ResourcesComponent).storageCapacity;
				if (this.hasAccessToTradeNetwork()) {
					showStorage = this.getGlobalStorage().storageCapacity;
				}
			}

			return showStorage;
		},

		getCampStorageCap: function (sector) {
			if (this.hasAccessToTradeNetwork(sector)) {
				return this.getGlobalStorage().storageCapacity;
			}
			return sector.get(ResourcesComponent).storageCapacity;
		},

		getCurrentStorageNameKey: function (short) {
			let playerPosition = this.playerResourcesNodes.head.entity.get(PositionComponent);

			if (short) {
				if (playerPosition.inCamp) {
					return "ui.camp.storage_name_short";
				} else {
					return "ui.inventory.storage_name_short";
				}
			}

			let showStorage = this.playerResourcesNodes.head.entity.get(ResourcesComponent).storageCapacity;
			let storageName = "ui.inventory.storage_name_long";

			if (showStorage < 10) {
				storageName = "ui.inventory.storage_name_no_bag";
			}

			if (playerPosition.inCamp && this.hasCampStorage()) {
				storageName = "ui.camp.storage_name_long_camp";
				if (this.hasAccessToTradeNetwork()) {
					storageName = "ui.camp.storage_name_long_connected";
				}
			}

			return storageName;
		},

		getCurrentStorageAccumulation: function (forWrite) {
			var playerPosition = this.playerResourcesNodes.head.entity.get(PositionComponent);

			var playerResourceAcc = this.playerResourcesNodes.head.entity.get(ResourceAccumulationComponent);
			var campResourceAcc = this.nearestCampNodes.head != null ? this.nearestCampNodes.head.entity.get(ResourceAccumulationComponent) : null;
			var globalResourceAcc = this.globalResourcesNodes.head.resourceAccumulation;

			var showResourceAcc = playerResourceAcc;
			if (playerPosition.inCamp && this.hasCampStorage()) {
				showResourceAcc = campResourceAcc;
				if (!forWrite && this.hasAccessToTradeNetwork()) {
					showResourceAcc = globalResourceAcc;
				}
			}

			return showResourceAcc;
		},

		hasAccessToTradeNetwork: function (campEntity) {
			if (!campEntity && !this.nearestCampNodes.head) return false;
			var entity = campEntity || this.nearestCampNodes.head.entity;
			var improvements = entity.get(SectorImprovementsComponent);
			if (improvements.getCount(improvementNames.tradepost) > 0) {
				return true;
			}
			return false;
		},

		getNumCampsInTradeNetwork: function (sectorEntity) {
			if (!this.hasAccessToTradeNetwork(sectorEntity))
				return 1;
			return this.globalResourcesNodes.head.tribe.numCampsInTradeNetwork;
		},

		hasCampStorage: function () {
			if (this.nearestCampNodes.head) {
				return this.nearestCampNodes.head.entity.get(ResourcesComponent).storageCapacity > 0;
			}
			return false;
		},

		getPlayerStorage: function () {
			return this.playerResourcesNodes.head ? this.playerResourcesNodes.head.resources : null;
		},

		getPlayerCurrency: function () {
			return this.playerResourcesNodes.head ? this.playerResourcesNodes.head.currency : null;
		},
		
		getCampStorage: function (campEntity) {
			return campEntity.get(ResourcesComponent);
		},
		
		getCampStorageAccumulation: function (campEntity) {
			return campEntity.get(ResourceAccumulationComponent);
		},

		getGlobalStorage: function () {
			return this.globalResourcesNodes.head ? this.globalResourcesNodes.head.resources : null;
		},
		
		moveResFromBagToCamp: function () {
			let playerLevelCamp = this.nearestCampNodes.head !== null ? this.nearestCampNodes.head.entity : null;
			let playerResources = this.playerResourcesNodes.head.resources.resources;
			let campResourcesSource = playerLevelCamp.get(ResourcesComponent).resources;
			this.moveResourcesFromVOToVO(playerResources, playerResources, campResourcesSource);
		},

		moveCurrencyFromBagToCamp: function (campSector) {
			let playerLevelCamp = this.nearestCampNodes.head !== null ? this.nearestCampNodes.head.entity : null;
			campSector = campSector || this.nearestCampNodes.head.entity;
			let playerCurrency = this.playerResourcesNodes.head.entity.get(CurrencyComponent);
			let campCurrency = campSector.get(CurrencyComponent);
			campCurrency.currency += playerCurrency.currency;
			playerCurrency.currency = 0;
		},

		moveResFromCampToBag: function (resourcesVO) {
			var playerLevelCamp = this.nearestCampNodes.head !== null ? this.nearestCampNodes.head.entity : null;
			if (playerLevelCamp) {
				var playerResources = this.playerResourcesNodes.head.resources.resources;
				var campResourcesSource = this.getCurrentStorage().resources;
				this.moveResourcesFromVOToVO(resourcesVO, campResourcesSource, playerResources);
			}
		},

		moveCurrencyFromCampToBag: function (value) {
			let playerCurrency = this.playerResourcesNodes.head.entity.get(CurrencyComponent);
			let playerLevelCamp = this.nearestCampNodes.head !== null ? this.nearestCampNodes.head.entity : null;
			if (playerLevelCamp) {
				let campCurrency = playerLevelCamp.get(CurrencyComponent);
				campCurrency.currency -= value;
				playerCurrency.currency += value;
			}
		},

		moveResourcesFromVOToVO: function (amountsVO, fromResVO, toResVO) {
			for (var key in resourceNames) {
				var name = resourceNames[key];
				var amount = Math.min(amountsVO.getResource(name), fromResVO.getResource(name));
				if (amount > 0) {
					toResVO.addResource(name, amount);
					fromResVO.addResource(name, -amount);
				}
			}
		},

	});

	return ResourceHelper;
});
