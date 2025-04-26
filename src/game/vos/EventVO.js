// describes a past raid or other event on a camp
define(['ash', 'game/vos/ResourcesVO'], function (Ash, ResourcesVO) {
	
	let EventVO = Ash.Class.extend({
	
		eventType: null, // campOccurrenceType
		eventSubType: null, // depends on type
		timestamp: null, // end time

		// optional
		resourcesLost: null, // ResourcesVO
		defendersLost: 0, 
		workersDisabled: 0,
		damagedBuilding: null, // improvementType

		// raid
		wasVictory: false,
	
		constructor: function (eventType, eventSubType) {
			this.eventType = eventType;
			this.eventSubType = eventSubType;
			this.timestamp = eventType ? new Date().getTime() : -1;
			this.resourcesLost = new ResourcesVO();
		},
		
		isValid: function() {
			return this.timestamp != null && this.timestamp > 0;
		}
		
	});

	return EventVO;
});
