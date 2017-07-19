// Marks the containing sector (camp) entity as having the trader event currently and contains information related to that event
define(['ash'], function (Ash) {
    
    var TraderComponent = Ash.Class.extend({
        
        caravan: null,
        
        constructor: function (caravan) {
            this.caravan = caravan;
        },
    });

    return TraderComponent;
});
