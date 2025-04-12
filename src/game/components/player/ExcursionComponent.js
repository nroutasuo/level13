define(['ash'], function (Ash) {

	let ExcursionComponent = Ash.Class.extend({
		
		numSteps: 0,
		numGritSteps: 0,
		numNaps: 0,

		numConsecutiveScavengeUseless: 0,
		numConsecutiveScavengeUselessSameLocation: 0,
		numConsecutiveScoutItemsFound: 0,

		constructor: function () {
			this.numSteps = 0;
			this.numGritSteps = 0;
			this.numNaps = 0;

			this.numConsecutiveScavengeUseless = 0;
			this.numConsecutiveScavengeUselessSameLocation = 0;
			this.numConsecutiveScoutItemsFound = 0;
		},

		getSaveKey: function () {
			return "Excursion";
		},
	});

	return ExcursionComponent;
});
