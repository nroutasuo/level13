// Convenience component for collecting information about passages from a level, based on sectors
define(['ash'], function (Ash) {
	var LevelPassagesComponent = Ash.Class.extend({
		
		constructor: function () {
			// sectorID -> PassageVO
			this.passagesUp = {};
			this.passagesDown = {};

			// sectorID -> bool
			this.passagesUpBuilt = {};
			this.passagesDownBuilt = {};
		},
		
	});

	return LevelPassagesComponent;
});
