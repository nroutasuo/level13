// Defines the currency stored by an entity (player / (sector(camp) / tribe)
define(['ash'], function (Ash) {

	var CurrencyComponent = Ash.Class.extend({

		currency: 0,

		constructor: function (currency) {
			this.currency = currency ? currency : 0;
		},

		getSaveKey: function () {
			return "Currency";
		},

	});

	return CurrencyComponent;
});
