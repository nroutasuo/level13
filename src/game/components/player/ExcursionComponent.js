define(['ash'], function (Ash) {

    var ExcursionComponent = Ash.Class.extend({
        
        numNaps: 0,

        constructor: function () {
            this.numNaps = 0;
        },

        getSaveKey: function () {
            return "Excursion";
        },
    });

    return ExcursionComponent;
});
