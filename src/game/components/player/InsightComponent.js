define(['ash'], function (Ash) {

	let InsightComponent = Ash.Class.extend({

		constructor: function () {
			this.value = 0;
			this.maxValue = 0;
			this.isAccumulating = false;
			this.accumulation = 0;
		},

		getSaveKey: function () {
			return "Insight";
		},
	});

	return InsightComponent;
});
