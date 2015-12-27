// Defines the given entity as a Level
define(['ash'], function (Ash) {
    var LevelComponent = Ash.Class.extend({
        
        position: 13,
        levelVO: null,
        
        constructor: function (pos, levelVO) {
            this.position = pos;
            this.levelVO = levelVO;
        }
    });

    return LevelComponent;
});
