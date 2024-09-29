// describes a past raid on a camp
define(['ash', 'game/vos/ResourcesVO'], function (Ash, ResourcesVO) {
	
	var RaidVO = Ash.Class.extend({
	
		timestamp: null, // end time
		resourcesLost: null,
		defendersLost: null,
		damagedBuilding: null,

		// raid
		wasVictory: false,
	
		constructor: function (raidComponent) {
			this.wasVictory = raidComponent ? raidComponent.victory : false;
			this.resourcesLost = raidComponent ? raidComponent.resourcesLost : new ResourcesVO(storageTypes.RESULT);
			this.defendersLost = raidComponent ? raidComponent.defendersLost : 0;
			this.damagedBuilding = raidComponent ? raidComponent.damagedBuilding : null;
			this.timestamp = raidComponent ? new Date().getTime() : -1;
		},
		
		isValid: function() {
			return this.timestamp != null && this.timestamp > 0;
		}
		
	});

	return RaidVO;
});
