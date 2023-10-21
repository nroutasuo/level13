define(['ash'], function (Ash) {

	let ExcursionComponent = Ash.Class.extend({
		
		numSteps: 0,
		numNaps: 0,
		numConsecutiveScavengeUseless: 0,
		numConsecutiveScavengeUselessSameLocation: 0,

		constructor: function () {
			this.numSteps = 0;
			this.numNaps = 0;
			this.numConsecutiveScavengeUseless = 0;
			this.numConsecutiveScavengeUselessSameLocation = 0;
		},

		getSaveKey: function () {
			return "Excursion";
		},
	});

	return ExcursionComponent;
});
