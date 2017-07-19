define(['ash'], function (Ash) {
    
    var IncomingCaravanVO = Ash.Class.extend({
        
        name: "",
        sellItems: [],
        sellResources: null,
        buyItemTypes:[],
        buyResources: [],
        usesCurrency: false,
	
        constructor: function (name, sellItems, sellResources, buyItemTypes, buyResources, usesCurrency) {
            this.name = name;
            this.sellItems = sellItems;
            this.sellResources = sellResources;
            this.buyItemTypes = buyItemTypes;
            this.buyResources = buyResources;
            this.usesCurrency = usesCurrency;
		},
    });

    return IncomingCaravanVO;
});
