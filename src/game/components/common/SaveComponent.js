// Marks the given entity to be saved with the game state
define(['ash'], function (Ash) {
	var SaveComponent = Ash.Class.extend({
		constructor: function (entityKey, components) {
			this.entityKey = entityKey;
			this.components = components;
		}
	});

	return SaveComponent;
});
