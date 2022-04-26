define(['ash'], function (Ash) {
	
	var TabCountsVO = Ash.Class.extend({
		
		
		constructor: function () {
			this.current = {
				visible: {
				},
				available: {
				}
			};
			this.lastShown = {
				visible: {
				},
				available: {
				}
			};
		},
		
		updateCounts: function (visibleCounts, availableCounts, isActive) {
			for (let k in visibleCounts) {
				this.current.visible[k] = visibleCounts[k];
				if (isActive || isNaN(this.lastShown.visible[k])) {
					this.lastShown.visible[k] = visibleCounts[k];
				}
			}
			for (let k in availableCounts) {
				this.current.available[k] = availableCounts[k];
				if (isActive || isNaN(this.lastShown.available[k])) {
					this.lastShown.available[k] = availableCounts[k];
				}
			}
		},
		
	});

	return TabCountsVO;
});
