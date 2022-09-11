define(['ash'], function (Ash) {

	var ExcursionComponent = Ash.Class.extend({
		
		numNaps: 0,
		numConsecutiveScavengeUseless: 0,
		numConsecutiveScavengeUselessSameLocation: 0,

		constructor: function () {
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
