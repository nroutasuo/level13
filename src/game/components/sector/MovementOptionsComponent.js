// A convenience component to store which directions the player can move to from this sector
// Updated by the SectorStatusSystem
define(['ash', 'game/constants/PositionConstants'], function (Ash, PositionConstants) {
    var MovementOptionsComponent = Ash.Class.extend({
        
        cantMoveUpReason: "",
        cantMoveDownReason: "",
        
        constructor: function () {
            this.canMoveUp = false;
            this.canMoveDown = false;
            this.canMoveNorth = true;
            this.canMoveSouth = true;
            this.canMoveEast = true;
            this.canMoveWest = true;
        },
        
        canMoveToDirection: function (direction) {
            switch (direction) {
                case PositionConstants.DIRECTION_WEST: return this.canMoveWest;
                case PositionConstants.DIRECTION_NORTH: return this.canMoveNorth;
                case PositionConstants.DIRECTION_SOUTH: return this.canMoveSouth;
                case PositionConstants.DIRECTION_EAST: return this.canMoveEast;
                case PositionConstants.DIRECTION_UP: return this.canMoveUp;
                case PositionConstants.DIRECTION_DOWN: return this.canMoveDown;
                default: return true;
            }
        },
    });

    return MovementOptionsComponent;
});
