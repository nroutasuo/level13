// marks a camp entity has currently having the 'disaster' event
define(['ash'], function (Ash) {

	let DisasterComponent = Ash.Class.extend({

		id: "Disaster",
		
		constructor: function (disasterType) {
			this.disasterType = disasterType;
		},

		getSaveKey: function () {
			return this.id;
		},

	});

	return DisasterComponent;
});
