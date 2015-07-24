// Defines the position of an entity
define(
['ash'], 
function (Ash) {
    var PositionComponent = Ash.Class.extend({
        constructor: function (level, sector, inCamp) {
            this.level = level;
            this.sector = sector;
            this.inCamp = inCamp ? true : false;
        },
        
        toString: function() {
            return this.level + "-" + this.sector;
        },
        
        clone: function() {
            return new PositionComponent(this.level, this.sector, this.inCamp);
        }, 
    });

    return PositionComponent;
});
