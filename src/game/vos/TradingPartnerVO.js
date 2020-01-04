define(['ash'], function (Ash) {
    
    var TradingPartnerVO = Ash.Class.extend({
	
        campOrdinal: -1,
        name: "",
		buysResources: [],
        sellsResources: [],
        usesCurrency: false,
		sellItemTypes: [],
		buyItemTypes: [],
	
        constructor: function (campOrdinal, name, buysResources, sellsResources, usesCurrency, buyItemTypes, sellItemTypes) {
			this.campOrdinal = campOrdinal;
			this.name = name;
			this.buysResources = buysResources;
			this.sellsResources = sellsResources;
			this.usesCurrency = usesCurrency;
            this.buyItemTypes = buyItemTypes || [];
            this.sellItemTypes = sellItemTypes || [];
        }
        
    });

    return TradingPartnerVO;
});
