define(['ash'], function (Ash) {
	
	var DeityComponent = Ash.Class.extend({
		
		constructor: function (name) {
			this.name = name;
			this.favour = 0;
			this.maxFavour = 0;
			this.accumulation = 0;
			this.accSources = [];
			this.accumulationPerCamp = {};
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
			return "Deity";
		},
	});

	return DeityComponent;
});
