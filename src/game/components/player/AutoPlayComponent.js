define(['ash'], function (Ash) {

    var AutoPlayComponent = Ash.Class.extend({

        // autoplay goal
        isExpedition: false,
        forcedExpeditionType: null,

        // general status
        isPendingExploring: false,
        isExploring: false,
        isManagingCamps: false,

        // explore objective
        exploreGoal: null,
        exploreSector: null,
        explorePath: null,
        exploreResource: null,
        isExploreGoalComplete: false,

        constructor: function () {
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
        }

    });

    return AutoPlayComponent;
});
