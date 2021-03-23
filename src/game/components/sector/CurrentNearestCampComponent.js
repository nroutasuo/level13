// Defines the given entity (sector) as the one one the player's current level that contains a camp
define(['ash'], function (Ash) {
	var CurrentNearestCampComponent = Ash.Class.extend({
		constructor: function () {
		}
	});

	return CurrentNearestCampComponent;
});
