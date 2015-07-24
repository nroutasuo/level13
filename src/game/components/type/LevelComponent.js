// Defines the given entity as a Level
define(['ash'], function (Ash) {
    var LevelComponent = Ash.Class.extend({
        constructor: function (pos) {
            this.position = pos;
        }
    });

    return LevelComponent;
});
