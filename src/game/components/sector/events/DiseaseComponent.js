// marks a camp entity has currently having the 'disease' event
define(['ash'], function (Ash) {

	let DiseaseComponent = Ash.Class.extend({
		
		diseaseType: null,
		numUpdatesTotal: 0,
		numUpdatesCompleted: 0,
		nextUpdateTimer: null,
		lastUpdateType: null,
		
		constructor: function (diseaseType, numUpdates) {
			this.diseaseType = diseaseType;
			this.numUpdatesTotal = numUpdates;
			this.numUpdatesCompleted = 0;
			this.nextUpdateTimer = null;
			this.lastUpdateType = null;
		},

		getSaveKey: function () {
			return "Disease";
		},

	});

	return DiseaseComponent;
});
