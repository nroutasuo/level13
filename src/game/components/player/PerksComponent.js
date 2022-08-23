define(['ash', 'game/GlobalSignals', 'game/vos/PerkVO', 'game/constants/PerkConstants'],

function (Ash, GlobalSignals, PerkVO, PerkConstants) {
	var PerksComponent = Ash.Class.extend({

		perks: {},

		constructor: function () {
			this.perks = {};
			this.initTypes();
		},

		initTypes: function() {
			this.perks[PerkConstants.perkTypes.injury] = [];
			this.perks[PerkConstants.perkTypes.movement] = [];
			this.perks[PerkConstants.perkTypes.health] = [];
		},

		addPerk: function (perk) {
			perk.addTimestamp = new Date().getTime();
			if (typeof this.perks[perk.type] == 'undefined') {
				this.perks[perk.type] = [];
			}

			this.perks[perk.type].push(perk);
			GlobalSignals.perksChangedSignal.dispatch();
		},

		hasPerk: function (perkId) {
			for (var key in this.perks) {
				for( let i = 0; i < this.perks[key].length; i++) {
					if (this.perks[key][i].id == perkId) return true;
				}
			}
			return false;
		},

		getPerk: function (perkID) {
			for (var key in this.perks) {
				for (let i = 0; i < this.perks[key].length; i++) {
					if (this.perks[key][i].id == perkID)
						return this.perks[key][i];
				}
			}
			return null;
		},

		getAll: function () {
			var all = [];
			for (var key in this.perks) {
				for( let i = 0; i < this.perks[key].length; i++) {
					all.push(this.perks[key][i]);
				}
			}
			return all;
		},

		getTotalEffect: function (type) {
			var effect = 0;
			var multiply = PerkConstants.isPercentageEffect(type);
			if (multiply) effect = 1;
			for (var key in this.perks) {
				if (key === type) {
					for( let i = 0; i < this.perks[key].length; i++) {
						var perkEffect = PerkConstants.getCurrentEffect(this.perks[key][i]);
						if (multiply) effect *= perkEffect;
						else effect += perkEffect;
					}
				}
			}
			return effect;
		},

		getPerkWithEffect: function (type, min, max) {
			var effect = 0;
			for (var key in this.perks) {
				if (key === type) {
					for (let i = 0; i < this.perks[key].length; i++) {
						var effect = PerkConstants.getCurrentEffect(this.perks[key][i]);
						if (effect >= min && effect <= max) return this.perks[key][i];
					}
				}
			}
			return null;
		},

		getPerksByType: function (type) {
			return this.perks[type] ? this.perks[type] : [];
		},

		removePerksByType: function (type) {
			if (typeof this.perks[type] !== 'undefined') {
				this.perks[type] = [];
			}
			GlobalSignals.perksChangedSignal.dispatch();
		},

		removePerkById: function (perkId) {
			for (var key in this.perks) {
				for( let i = 0; i < this.perks[key].length; i++) {
					if (this.perks[key][i].id === perkId) {
						this.perks[key].splice(i, 1);
						GlobalSignals.perksChangedSignal.dispatch();
						return;
					}
				}
			}
		},

		contains: function(name) {
			for (var key in this.perks) {
				for( let i = 0; i < this.perks[key].length; i++) {
					if(this.perks[key][i].name == name) return true;
				}
			}
			return false;
		},

		getSaveKey: function () {
			return "Perks";
		},

		customLoadFromSave: function(componentValues) {
			for(var key in componentValues.perks) {
				for (let i in componentValues.perks[key]) {
					var perkID = componentValues.perks[key][i].id;
					var perk = PerkConstants.getPerk(perkID);
					if (!perk) continue;
					perk = perk.clone();
					perk.startTimer = componentValues.perks[key][i].startTimer;
					perk.startTimerDuration = componentValues.perks[key][i].startTimerDuration;
					perk.removeTimer = componentValues.perks[key][i].removeTimer || 0;
					perk.removeTimerDuration = componentValues.perks[key][i].removeTimerDuration;
					if (perk) {
						this.addPerk(perk);
					}
				}
			}
		}
	});

	return PerksComponent;
});
