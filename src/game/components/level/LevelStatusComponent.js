// Convenience component for collecting information about passages from a level, based on sectors
define(['ash'], function (Ash) {
	let LevelStatusComponent = Ash.Class.extend({
		
		isVisited: false,
		isLevelTypeRevealed: false,
		firstScoutedSectorByFeature: {},
		
		constructor: function () {
			this.isVisited = false;
			this.isLevelTypeRevealed = false;
			this.firstScoutedSectorByFeature = {};
		},

		getSaveKey: function () {
			return "LS";
		},

		getCustomSaveObject: function () {
			let result = {};
			if (this.isVisited) result.isVisited = true;
			if (this.isLevelTypeRevealed) result.isLevelTypeRevealed = true;
			if (Object.keys(this.firstScoutedSectorByFeature).length > 0) result.firstScoutedSectorByFeature = this.firstScoutedSectorByFeature;
			return result;
		},

		customLoadFromSave: function (componentValues) {
			this.isVisited = componentValues.isVisited || false;
			this.isLevelTypeRevealed = componentValues.isLevelTypeRevealed || false;
			this.firstScoutedSectorByFeature = componentValues.firstScoutedSectorByFeature || {};
		}
	});

	return LevelStatusComponent;
});
