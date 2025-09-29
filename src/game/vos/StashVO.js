// Defines a path constraint used by the WorldBuilder
define(['ash'], function (Ash) {

	let StashVO = Ash.Class.extend({
	
		stashType: null,
		amount: 0,
		itemID: null,
		localeType: null, // optional
	
		constructor: function (stashType, amount, itemID, localeType) {
			this.stashType = stashType;
			this.amount = amount;
			this.itemID = itemID;
			this.localeType = localeType || null;
		},

		getStashID: function () {
			let result = "stash";
			result += "-" + this.stashType;
			if (this.itemID) result += "-" + this.itemID;
			if (this.localeType) result += "-" + this.localeType;
			return result;
		}
	});

	return StashVO;
});
