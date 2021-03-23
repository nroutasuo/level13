// Defines the given entity (sector) as the last one the player visited
define(['ash'], function (Ash) {
	var LastVisitedCampComponent = Ash.Class.extend({
		
		constructor: function () {
			this.isLastVisitedCamp = true;
		},

		getSaveKey: function () {
			return "LastVisitedCampComponent";
		},
	});

	return LastVisitedCampComponent;
});
