define(['ash'], function (Ash) {

	var EvidenceComponent = Ash.Class.extend({

		constructor: function () {
			this.value = 0;
			this.maxValue = 0;
			this.isAccumulating = false;
			this.accumulation = 0;
			this.accumulationPerCamp = {};
			this.accSources = [];
			this.evidence = [];
		},

		addChange: function (source, amount, level) {
			if (amount == 0) return;

			for (let i = 0; i < this.accSources.length; i++) {
				var change = this.accSources[i];
				if (change.source == source) {
					change.amount += amount;
					return;
				}
			}

			this.accSources.push({ source: source, amount: amount });
		},

		getSaveKey: function () {
			return "Evidence";
		},
	});

	return EvidenceComponent;
});
