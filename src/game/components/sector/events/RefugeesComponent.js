// marks a camp entity has currently having the 'refugees' event
define(['ash'], function (Ash) {

	let RefugeesComponent = Ash.Class.extend({

		num: 0,
		dialogueSource: null, // id (string)
		isAccepted: false,
		isDismissed: false,

		constructor: function (num, dialogueSourceID) {
			this.num = num;
			this.dialogueSource = dialogueSourceID;
			this.isAccepted = false;
			this.isDismissed = false;
		},

		getSaveKey: function () {
			return "Refugees";
		},

	});

	return RefugeesComponent;
});
