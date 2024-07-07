define(['ash'], function (Ash) {
	
	let HopeComponent = Ash.Class.extend({
		
		constructor: function (name) {
			this.deityName = name;
			this.hope = 0;
			this.maxHope = 0;
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

		customLoadFromSave: function(componentValues) {
			this.deityName = componentValues.deityName || componentValues.name;
			this.hope = componentValues.hope || componentValues.favour;
			this.maxHope = componentValues.maxHope || componentValues.maxFavour;
		},

		getSaveKey: function () {
			return "Hope";
		},

		getOldSaveKey: function () {
			return "Deity";
		}
	});

	return HopeComponent;
});
