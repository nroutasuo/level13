// persistent data that is related to the current world

define(['ash'], function (Ash) {

	let WorldState = Ash.Class.extend({

		constructor: function () {
			this.reset();
		},

		reset: function () {
			this.worldTemplateVO = null;
			this.revealedLevels = [ 13 ];
		},

		addRevealedLevel: function (level) {
			if (this.revealedLevels.indexOf(level) >= 0) return;
			this.revealedLevels.push(level);
		}
	});

	return WorldState;
});