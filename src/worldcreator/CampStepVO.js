define(['ash'], function (Ash) {

    var CampStepVO = Ash.Class.extend({
        
        constructor: function (campOrdinal, step, levels) {
            this.campOrdinal = campOrdinal;
            this.step = step;
            this.levels = levels;
        },
        
        spansLevel: function (level) {
            return this.levels.indexOf(level) >= 0;
        }
        
    });
    
    return CampStepVO;
});
