define(['ash'], function (Ash) {
	
	var BlueprintVO = Ash.Class.extend({
	
		upgradeId: "",
		maxPieces: 0,
		currentPieces: 0,
		completed: false,
	
		constructor: function (upgradeId, maxPieces) {
			this.upgradeId = upgradeId;
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
