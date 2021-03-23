define(['ash'], function (Ash) {

	var OutgoingCaravansComponent = Ash.Class.extend({

		pendingCaravan: null,
		outgoingCaravans: [],

		constructor: function () {
			this.pendingCaravan = null;
			this.outgoingCaravans = [];
		},

		getCustomSaveObject: function () {
			var copy = {};
			copy.outgoingCaravans = this.outgoingCaravans;
			return copy;
		},

		getSaveKey: function () {
			return "OutgoingCaravans";
		},
	});

	return OutgoingCaravansComponent;
});
