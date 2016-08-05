define(['ash'], function (Ash) {

    var EnvironmentalHazardsVO = Ash.Class.extend({
        
        radiation: 0,
        poison: 0,
        cold: 0,
        
        constructor: function () {
            this.radiation = 0;
            this.poison = 0;
            this.cold = 0;
        },
        
        hasHazards: function () {
            return this.radiation > 0 || this.poison > 0 || this.cold > 0;
        }
        
    });

    return EnvironmentalHazardsVO;
});
