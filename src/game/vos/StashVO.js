// Defines a path constraint used by the WorldBuilder
define(['ash'], function (Ash) {

	var StashVO = Ash.Class.extend({
	
		stashType: null,
		amount: 0,
		itemID: null,
	
		constructor: function (stashType, amount, itemID) {
			this.stashType = stashType;
			this.amount = amount;
			this.itemID = itemID;
		},
	});

	return StashVO;
});
