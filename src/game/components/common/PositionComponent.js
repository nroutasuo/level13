// Defines the position of an entity
define(
['ash'], 
function (Ash) {
    var PositionComponent = Ash.Class.extend({
        constructor: function (level, sectorX, sectorY, inCamp) {
            this.level = level;
            this.sectorX = sectorX;
            this.sectorY = sectorY;
            this.inCamp = inCamp ? true : false;
        },
        
        sectorId: function () {
            return this.sectorX + "-" + this.sectorY;
        },
        
        toString: function () {
            return this.level + "-" + this.sectorX + "-" + this.sectorY;
        },
        
        clone: function () {
            return new PositionComponent(this.level, this.sectorX, this.sectorY, this.inCamp);
        },
    });

    return PositionComponent;
});
