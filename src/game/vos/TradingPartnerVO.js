define(['ash'], function (Ash) {
    
    var TradingPartnerVO = Ash.Class.extend({
	
        campOrdinal: -1,
        name: "",
		buysResources: [],
        sellsResources: [],
        usesCurrency: false,
	
        constructor: function (campOrdinal, name, buysResources, sellsResources, usesCurrency) {
			this.campOrdinal = campOrdinal;
			this.name = name;
			this.buysResources = buysResources;
			this.sellsResources = sellsResources;
			this.usesCurrency = usesCurrency;
        }
        
    });

    return TradingPartnerVO;
});
