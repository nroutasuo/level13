// Defines the given entity as a gang (movement blocker with enemies)
define(['ash'], function (Ash) {
    var GangComponent = Ash.Class.extend({
        
        gangVO: null,
        
        constructor: function (gangVO) {
            this.gangVO = gangVO;
        }
    });

    return GangComponent;
});
