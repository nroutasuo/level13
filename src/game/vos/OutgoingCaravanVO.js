define(['ash'], function (Ash) {
	
	let OutgoingCaravanVO = Ash.Class.extend({
	
		constructor: function (campOrdinal, tradePartnerOrdinal, capacity) {
			this.campOrdinal = campOrdinal; // camp the caravan left from
			this.tradePartnerOrdinal = tradePartnerOrdinal;
			this.sellGood = null;
			this.sellAmount = 0;
			this.buyGood = null;
			this.returnDuration = 0;
			this.capacity = capacity || 100;
		},
	});

	return OutgoingCaravanVO;
});
