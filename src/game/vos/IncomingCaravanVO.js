define(['ash', 'game/vos/ResourcesVO'], function (Ash, ResourcesVO) {
    
    var IncomingCaravanVO = Ash.Class.extend({
        
        name: "",
        sellItems: [],
        sellResources: null,
        buyItemTypes:[],
        buyResources: [],
        usesCurrency: false,
        currency: 0,
        
        tradesMade: 0,
        
        traderSelectedItems: {}, // id -> amount
        traderSelectedResources: null,
        traderSelectedCurrency: 0,
        campSelectedItems: {}, // id -> amount
        campSelectedResources: null,
        campSelectedCurrency: 0,
        
        traderOfferValue: 0,
        campOfferValue: 0,
	
        constructor: function (name, sellItems, sellResources, buyItemTypes, buyResources, usesCurrency, currency) {
            this.name = name;
            this.sellItems = sellItems;
            this.sellResources = sellResources;
            this.buyItemTypes = buyItemTypes;
            this.buyResources = buyResources;
            this.usesCurrency = usesCurrency;
            this.currency = currency;
            
            this.tradesMade = 0;
            
            this.clearSelection();
		},
        
        clearSelection: function () {
            this.traderSelectedItems = {};
            this.traderSelectedResources = new ResourcesVO();
            this.traderSelectedCurrency = 0;
            this.campSelectedItems = {};
            this.campSelectedResources = new ResourcesVO();
            this.campSelectedCurrency = 0;
        }
    });

    return IncomingCaravanVO;
});
