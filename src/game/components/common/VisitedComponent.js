// Marks the given entity (sector / level) as having been visited by the player.
define(['ash'], function (Ash) {
	var VisitedComponent = Ash.Class.extend({

		visited: false,

		constructor: function () {
			this.visited = true;
		},

		getSaveKey: function () {
			return "ScVs";
		},

		getCustomSaveObject: function () {
			return {};
		},

		customLoadFromSave: function (componentValues) {
			this.visited = true;
		}
	});

	return VisitedComponent;
});
