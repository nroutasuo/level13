define(function () {
    var MathUtils = {
        
        clamp: function(num, min, max) {
            return num < min ? min : num > max ? max : num;
        }
    };

    return MathUtils;
});
