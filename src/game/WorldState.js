// persistent data that is related to the current world

define(['ash', 'worldcreator/WorldCreatorHelper'], function (Ash, WorldCreatorHelper) {

	let WorldState = Ash.Class.extend({

		constructor: function () {
			this.reset();
		},

		reset: function () {
			this.worldSeed = 0;
			this.worldTemplateVO = null;
			this.revealedLevels = [ 13 ];
		},

		addRevealedLevel: function (level) {
			if (this.revealedLevels.indexOf(level) >= 0) return;
			this.revealedLevels.push(level);
		},

		getLevelOrdinal: function (level) {
			return WorldCreatorHelper.getLevelOrdinal(this.worldSeed, level);
		},

		getLevelForOrdinal: function (levelOrdinal) {
			return WorldCreatorHelper.getLevelForOrdinal(this.worldSeed, levelOrdinal);
		},

		getCampOrdinal: function (level) {
			return WorldCreatorHelper.getCampOrdinal(this.worldSeed, level);
		},
		
		getCampOrdinalForLevelOrdinal: function (levelOrdinal) {
			let level = this.getLevelForOrdinal(levelOrdinal);
			return this.getCampOrdinal(level);
		},
		
		getLevelsForCamp: function (campOrdinal) {
			return WorldCreatorHelper.getLevelsForCamp(this.worldSeed, campOrdinal);
		},

		isCampable: function (level) {
			return WorldCreatorHelper.isCampableLevel(this.worldSeed, level);
		},
		
		getLevelForCamp: function (campOrdinal) {
			let levelOrdinal = this.getLevelOrdinalForCampOrdinal(campOrdinal);
			return this.getLevelForOrdinal(levelOrdinal);
		},

		getLevelOrdinalForCampOrdinal: function (campOrdinal) {
			return WorldCreatorHelper.getLevelOrdinalForCampOrdinal(this.worldSeed, campOrdinal);
		},
		
		getLevelIndex: function (level) {
			var campOrdinal = this.getCampOrdinal(level);
			return WorldCreatorHelper.getLevelIndexForCamp(this.worldSeed, campOrdinal, level);
		},
		
		getMaxLevelIndex: function (level) {
			var campOrdinal = this.getCampOrdinal(level);
			return WorldCreatorHelper.getMaxLevelIndexForCamp(this.worldSeed, campOrdinal, level);
		},

		getTotalLevels: function () {
			return WorldCreatorHelper.getHighestLevel(this.worldSeed) - WorldCreatorHelper.getBottomLevel(this.worldSeed) + 1;
		},

		getGroundLevel: function () {
			return WorldCreatorHelper.getBottomLevel(this.worldSeed);
		},

		getGroundLevelOrdinal: function () {
			return WorldCreatorHelper.getLevelOrdinal(this.worldSeed, WorldCreatorHelper.getBottomLevel(this.worldSeed));
		},

		getSurfaceLevel: function () {
			return WorldCreatorHelper.getHighestLevel(this.worldSeed);
		},

		getSurfaceLevelOrdinal: function () {
			return WorldCreatorHelper.getLevelOrdinal(this.worldSeed, WorldCreatorHelper.getHighestLevel(this.worldSeed));
		},
	});

	return WorldState;
});