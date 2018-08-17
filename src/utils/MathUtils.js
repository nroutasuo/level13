define(function () {
    var MathUtils = {
        
        clamp: function(num, min, max) {
            return num < min ? min : num > max ? max : num;
        },
        
        dist: function (x1, y1, x2, y2) {
            var a = x1 - x2;
            var b = y1 - y2;
            return Math.sqrt(a*a + b*b);
        },
    };

    return MathUtils;
});
