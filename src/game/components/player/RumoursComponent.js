define(['ash'], function (Ash) {

	var RumoursComponent = Ash.Class.extend({

		constructor: function () {
			this.value = 0;
			this.cap = 100;
			this.isAccumulating = false;
			this.accumulation = 0;
			this.accumulationPerCamp = {};
			this.accSources = [];
			this.rumours = [];
		},

		addChange: function(source, amount) {
			if (amount == 0) return;

			for (var i = 0; i < this.accSources.length; i++) {
				var change = this.accSources[i];
				if (change.source == source) {
					change.amount += amount;
					return;
				}
			}

			this.accSources.push({ source: source, amount: amount });
		},

		getSaveKey: function () {
			return "Rumours";
		}
	});

	return RumoursComponent;
});
