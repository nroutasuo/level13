// marks a camp entity has currently having the 'refugees' event
define(['ash'], function (Ash) {

	let RefugeesComponent = Ash.Class.extend({

		num: 0,
		isAccepted: false,
		isDismissed: false,

		constructor: function (num) {
			this.num = num;
			this.isAccepted = false;
			this.isDismissed = false;
		},

		getSaveKey: function () {
			return "Refugees";
		},

	});

	return RefugeesComponent;
});
