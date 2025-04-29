define(['ash', 'game/vos/ResourcesVO', 'game/constants/ItemConstants'], function (Ash, ResourcesVO, ItemConstants) {

	let IncomingCaravanVO = Ash.Class.extend({

		name: "",
		sellItems: [],
		sellResources: null,
		buyItemTypes: [],
		buyResources: [],
		usesCurrency: false,
		currency: 0,

		tradesMade: 0,

		 // selected from trader (stuff player wants to buy)
		traderSelectedItems: [],
		traderSelectedResources: null,
		traderSelectedCurrency: 0,
		
		// selected from camp (stuff player wants to sell)
		campSelectedItems: [],
		campSelectedResources: null,
		campSelectedCurrency: 0,

		traderOfferValue: 0,
		campOfferValue: 0,

		constructor: function (name, sellItems, sellResources, buyItemTypes, buyResources, usesCurrency, currency) {
			this.name = name;
			this.sellItems = sellItems ? sellItems : [];
			this.sellResources = sellResources ? sellResources : new ResourcesVO();
			this.buyItemTypes = buyItemTypes ? buyItemTypes : [];
			this.buyResources = buyResources ? buyResources : [];
			this.usesCurrency = usesCurrency ? usesCurrency : false;
			this.currency = currency ? currency : 0;

			this.tradesMade = 0;

			this.clearSelection();
		},

		clearSelection: function () {
			this.traderSelectedItems = [];
			this.traderSelectedResources = new ResourcesVO();
			this.traderSelectedCurrency = 0;
			this.campSelectedItems = [];
			this.campSelectedResources = new ResourcesVO();
			this.campSelectedCurrency = 0;
		},
		
		getSellItemCount: function (itemID) {
			let result = 0;
			for (let i = 0; i < this.sellItems.length; i++) {
				if (this.sellItems[i].id == itemID) result++;
			}
			return result;
		},

		getCampSelectedItemCount: function (itemID) {
			let result = 0;
			for (let i = 0; i < this.campSelectedItems.length; i++) {
				if (this.campSelectedItems[i].id == itemID) result++;
			}
			return result;
		},

		customLoadFromSave: function (componentValues) {
			this.name = componentValues.name;
			this.sellItems = [];
			for (let i in componentValues.sellItems) {
				let savedItem =  componentValues.sellItems[i];
				if (!savedItem || !savedItem.id) continue;
				let itemID = ItemConstants.getItemIDFromSaved(savedItem.id);
				let definition = ItemConstants.getItemDefinitionByID(itemID);
				if (!definition) continue;
				let item = definition.clone(savedItem);
				this.sellItems.push(item);
			}
			this.sellResources = new ResourcesVO();
			this.sellResources.customLoadFromSave(componentValues.sellResources);
			this.buyItemTypes = componentValues.buyItemTypes ? componentValues.buyItemTypes : [];
			this.buyResources = componentValues.buyResources ? componentValues.buyResources : [];

			this.usesCurrency = componentValues.usesCurrency || false;
			this.currency = componentValues.currency || 0;

			this.tradesMade = componentValues.tradesMade || 0;
		},
	});

	return IncomingCaravanVO;
});
