define(['ash'], function (Ash) {
	
	let HopeComponent = Ash.Class.extend({
		
		constructor: function () {
			this.hasDeity = false;
			this.deityName = null;
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
			this.hasDeity = componentValues.hasDeity || false;
			this.deityName = componentValues.deityName || componentValues.name || null;
			this.hope = componentValues.hope || componentValues.favour || 0;
			this.maxHope = componentValues.maxHope || componentValues.maxFavour || 0;
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
