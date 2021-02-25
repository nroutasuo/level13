define(['ash'], function (Ash) {
	var BagComponent = Ash.Class.extend({
		
		constructor: function (capacity) {
			this.totalCapacity = capacity;
			this.selectedCapacity = 0;
			this.selectableCapacity = 0;
			this.usedCapacity = 0;
		}
	});

	return BagComponent;
});
