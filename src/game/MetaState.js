// persistent data that is saved across playthroughs (but only on same browser)

define(['ash'], function (Ash) {

	let MetaState = Ash.Class.extend({

		constructor: function () {
			this.reset();
		},

		reset: function () {
			this.maxCampOrdinalReached = 0;
			this.hasCompletedGame = false;
			this.settings = {};
		},
	});

	return MetaState;
});