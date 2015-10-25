define(['ash'], function (Ash) {

    var AutoPlayComponent = Ash.Class.extend({
        
        express: false,
        
        isExploring: false,
        isManagingCamps: false,
        
        constructor: function (express) {
            this.express = express;
        }
        
    });

    return AutoPlayComponent;
});
