// Marks the given entity (sector / level) as having been seen by the player or otherwise revealed for the map.
define(['ash'], function (Ash) {
	var RevealedComponent = Ash.Class.extend({

		revealed: false,

		constructor: function () {
			this.revealed = true;
		},

		getSaveKey: function () {
			return "ScRv";
		},

		getCustomSaveObject: function () {
			return {};
		},

		customLoadFromSave: function (componentValues) {
			this.revealed = true;
		}

	});

	return RevealedComponent;
});
