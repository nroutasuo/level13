// Convenience component for collecting information about passages from a level, based on sectors
define(['ash'], function (Ash) {
	let LevelStatusComponent = Ash.Class.extend({
		
		isLevelTypeRevealed: false,
		
		constructor: function () {
			this.isLevelTypeRevealed = false;
		},

		getSaveKey: function () {
			return "LS";
		},
		
	});

	return LevelStatusComponent;
});
