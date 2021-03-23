define(['ash', 'game/vos/AutoExplorationVO'], function (Ash, AutoExplorationVO) {

	var AutoPlayComponent = Ash.Class.extend({

		// autoplay goal
		isExpedition: false,

		// general status
		isPendingExploring: false,
		isExploring: false,
		isManagingCamps: false,

		// explore objective
		explorationVO: null,
		
		constructor: function () {
			this.explorationVO = new AutoExplorationVO();
		},

		isExploreObjectiveSet: function () {
			return this.explorationVO.isExploreObjectiveSet();
		},

		setExploreObjective: function (goal, sector, path, resource) {
			this.explorationVO.setExploreObjective(goal, sector, path, resource);
		}

	});

	return AutoPlayComponent;
});
