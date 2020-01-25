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
        
        // simple weighted random: first item twice as likely to be selected as the second and so on
        getWeightedRandom: function (min, max) {
            var bag = [];
            for (var i = min; i < max; i++) {
                for (var j = 0; j < (max - i); j++) {
                    bag.push(i);
                }
            }
            return bag[Math.floor(Math.random() * bag.length)];
        },
    };

    return MathUtils;
});
