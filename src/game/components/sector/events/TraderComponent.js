// Marks the containing sector (camp) entity as having the trader event currently and contains information related to that event
define(['ash', 'game/vos/IncomingCaravanVO'], function (Ash, IncomingCaravanVO) {

	let TraderComponent = Ash.Class.extend({

		caravan: null,
		isDismissed: false,

		constructor: function (caravan) {
			this.caravan = caravan ? caravan : new IncomingCaravanVO();
			this.isDismissed = false;
		},

		getSaveKey: function () {
			return "Trader";
		},

		customLoadFromSave: function (componentValues) {
			this.caravan = new IncomingCaravanVO();
			this.caravan.customLoadFromSave(componentValues.caravan);
			this.isDismissed = componentValues.isDismissed;
		}

	});

	return TraderComponent;
});
