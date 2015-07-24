// Marks the given entity (sector / level) as having been visited by the player.
define(['ash'], function (Ash) {
    var VisitedComponent = Ash.Class.extend({
        
        visited: false,
        
        constructor: function () {
            this.visited = true;
        }
    });

    return VisitedComponent;
});
