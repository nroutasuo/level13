// Defines the given entity as a Sector (a piece of a Level)
define(['ash'], function (Ash) {
    var SectorComponent = Ash.Class.extend({
        
        criticalPaths: [],
        
        constructor: function (criticalPaths) {
            this.criticalPaths = criticalPaths;
        },
        
        isOnCriticalPath: function (type) {
            return this.criticalPaths.indexOf(type) >= 0;
        },
    });

    return SectorComponent;
});
