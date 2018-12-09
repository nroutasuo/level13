// Marks the containing sector (camp) entity as having the trader event currently and contains information related to that event
define(['ash', 'game/vos/IncomingCaravanVO'], function (Ash, IncomingCaravanVO) {

	var TraderComponent = Ash.Class.extend({

		caravan: null,
		isDismissed: false,

		constructor: function (caravan) {
			this.caravan = caravan ? caravan : new IncomingCaravanVO();
			this.isDismissed = false;
		},

		getSaveKey: function () {
			return "Trader";
		},

	});

	return TraderComponent;
});
