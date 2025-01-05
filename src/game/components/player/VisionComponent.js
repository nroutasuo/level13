define(['ash'], function (Ash) {

	let VisionComponent = Ash.Class.extend({

		constructor: function (initialValue) {
			this.isAwake = false;
			this.value = initialValue;
			this.maximum = 0;
			this.accumulation = 0;
			this.accSources = [];
		},

		getSaveKey: function () {
			return "Vision";
		},
	});

	return VisionComponent;
});
