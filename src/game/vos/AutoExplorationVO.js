define(['ash', 'game/components/common/PositionComponent'], function (Ash, PositionComponent) {
	
	var AutoExplorationVO = Ash.Class.extend({
		
		// settings
		limitToCurrentLevel: false,
		
		// current goal
		exploreGoal: null,
		exploreSector: null,
		explorePath: null,
		exploreResource: null,
		isExploreGoalComplete: false,
		
		constructor: function () {
			this.limitToCurrentLevel = false;
			this.exploreGoal = null;
			this.exploreSector = null;
			this.explorePath = null;
			this.exploreResource = null;
			this.isExploreGoalComplete = false;
		},

		isExploreObjectiveSet: function () {
			return this.exploreGoal;
		},

		setExploreObjective: function (goal, sector, path, resource) {
			this.exploreGoal = goal;
			this.exploreSector = sector;
			this.explorePath = path;
			this.exploreResource = resource;
			this.isExploreGoalComplete = false;
		},
		
		getExploreObjectiveDescription: function () {
			return this.exploreGoal + " "
				+ (this.exploreSector ? this.exploreSector.get(PositionComponent).getPosition() : "-") + " "
				+ (this.explorePath ? this.explorePath.length : "[-]") + " "
				+ this.exploreResource;
		},
		
	});

	return AutoExplorationVO;
});
