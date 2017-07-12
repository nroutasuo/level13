// Level projects are improvements that affect the whole level but are built in the camp
define(['ash'], function (Ash) {
    
    var OutgoingCaravanVO = Ash.Class.extend({
	
        constructor: function (campOrdinal) {
            this.campOrdinal = campOrdinal;
            this.sellGood = null;
            this.sellAmount = 0;
            this.buyGood = null;
		},
    });

    return OutgoingCaravanVO;
});
