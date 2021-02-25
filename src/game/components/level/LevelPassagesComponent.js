// Convenience component for collecting information about passages from a level, based on sectors
define(['ash'], function (Ash) {
	var LevelPassagesComponent = Ash.Class.extend({
		
		constructor: function () {
			this.passagesUp = {};
			this.passagesUpBuilt = {};
			this.passagesDown = {};
			this.passagesDownBuilt = {};
		},
		
	});

	return LevelPassagesComponent;
});
