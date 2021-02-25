define(['ash'], function (Ash) {
	
	var OutgoingCaravanVO = Ash.Class.extend({
	
		constructor: function (campOrdinal, tradePartnerOrdinal, capacity) {
			this.campOrdinal = campOrdinal;
			this.tradePartnerOrdinal = tradePartnerOrdinal;
			this.sellGood = null;
			this.sellAmount = 0;
			this.buyGood = null;
			this.returnTimeStamp = null;
			this.returnDuration = 0;
			this.capacity = capacity || 100;
		},
	});

	return OutgoingCaravanVO;
});
