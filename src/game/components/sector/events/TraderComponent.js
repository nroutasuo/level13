// Marks the containing sector (camp) entity as having the trader event currently and contains information related to that event
define(['ash'], function (Ash) {
    
    var TraderComponent = Ash.Class.extend({
        
        caravan: null,
        isDismissed: false,
        
        constructor: function (caravan) {
            this.caravan = caravan;
            this.isDismissed = false;
        },
    });

    return TraderComponent;
});
