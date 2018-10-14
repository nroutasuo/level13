// Defines a path constraint used by the WorldBuilder
define(['ash'], function (Ash) {

    var StashVO = Ash.Class.extend({
        
        STASH_TYPE_ITEM: "item",
        STASH_TYPE_SILVER: "silver",
	
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
