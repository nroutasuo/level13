define(['ash'], function (Ash) {

	let VisionComponent = Ash.Class.extend({

		constructor: function (initialValue) {
			this.isAwake = false;
			this.value = initialValue;
			this.maximum = 0;
			this.maxSources = [];
			this.accumulation = 0;
			this.accSources = [];
			this.comfortableLightLevel = 0; // usually 0-1, can be negative if not awake or just awoke
		},

		getSaveKey: function () {
			return "Vision";
		},
	});

	return VisionComponent;
});
