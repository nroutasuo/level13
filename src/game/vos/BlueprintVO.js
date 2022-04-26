define(['ash'], function (Ash) {
	
	var BlueprintVO = Ash.Class.extend({
	
		upgradeID: "",
		maxPieces: 0,
		currentPieces: 0,
		completed: false,
	
		constructor: function (upgradeID, maxPieces) {
			this.upgradeID = upgradeID;
			this.maxPieces = maxPieces;
			this.currentPieces = 0;
			this.completed = false;
		},
		
		getRemainingPieces: function () {
			return this.maxPieces - this.currentPieces;
		},
		
	});

	return BlueprintVO;
});
