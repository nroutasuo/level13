// Convenience component for collecting information about passages from a level, based on sectors
define(['ash'], function (Ash) {
	let LevelStatusComponent = Ash.Class.extend({
		
		isVisited: false,
		isLevelTypeRevealed: false,
		
		constructor: function () {
			this.isVisited = false;
			this.isLevelTypeRevealed = false;
		},

		getSaveKey: function () {
			return "LS";
		},

		getCustomSaveObject: function () {
			let result = {};
			if (this.isVisited) result.isVisited = true;
			if (this.isLevelTypeRevealed) result.isLevelTypeRevealed = true;
			return result;
		},

		customLoadFromSave: function (componentValues) {
			this.isVisited = componentValues.isVisited || false;
			this.isLevelTypeRevealed = componentValues.isLevelTypeRevealed || false;
		}
	});

	return LevelStatusComponent;
});
