define(['ash'], function (Ash) {
    
    var IncomingCaravanVO = Ash.Class.extend({
        
        name: "",
        sellItems: [],
        sellResources: null,
        buyItemTypes:[],
        buyResources: [],
        usesCurrency: false,
        currency: 0,
	
        constructor: function (name, sellItems, sellResources, buyItemTypes, buyResources, usesCurrency, currency) {
            this.name = name;
            this.sellItems = sellItems;
            this.sellResources = sellResources;
            this.buyItemTypes = buyItemTypes;
            this.buyResources = buyResources;
            this.usesCurrency = usesCurrency;
            this.currency = currency;
		},
    });

    return IncomingCaravanVO;
});
