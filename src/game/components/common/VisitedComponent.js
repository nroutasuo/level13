// Marks the given entity (sector / level) as having been visited by the player
// DEPRECATED - kept only for save backwards compatibility for saves from version 0.5.2 and older. Remove at some point. Data now in SectorStatusComponent.

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
