// A convenience component to store which directions the player can move to from this sector
// Default is north, south, west and east (if there is a corresponding sector), but not up or down unless there is a passge
define(['ash', 'game/constants/PositionConstants', 'game/vos/PassageVO', 'game/vos/MovementBlockerVO'],
function (Ash, PositionConstants, PassageVO, MovementBlockerVO) {
    
    var PassagesComponent = Ash.Class.extend({

        constructor: function (passageUp, passageDown, blockerNorth, blockerSouth, blockerWest, blockerEast) {
            this.passageUp = passageUp ? new PassageVO(passageUp) : null;
            this.passageDown = passageDown ? new PassageVO(passageDown) : null;
            this.blockerNorth = blockerNorth ? new MovementBlockerVO(blockerNorth) : null;
            this.blockerSouth = blockerSouth ? new MovementBlockerVO(blockerSouth) : null;
            this.blockerWest = blockerWest ? new MovementBlockerVO(blockerWest) : null;
            this.blockerEast = blockerEast ? new MovementBlockerVO(blockerEast) : null;
        },
        
        getBlocker: function (direction) {
            switch (direction) {
            case PositionConstants.DIRECTION_NORTH:
                return this.blockerNorth;
            case PositionConstants.DIRECTION_SOUTH:
                return this.blockerSouth;
            case PositionConstants.DIRECTION_WEST:
                return this.blockerWest;
            case PositionConstants.DIRECTION_EAST:
                return this.blockerEast;
            default:
                return null;
            }
        },
        
        isBridgeable: function (direction) {
            if (direction === null) {
                return this.isBridgeable(PositionConstants.DIRECTION_NORTH) || this.isBridgeable(PositionConstants.DIRECTION_SOUTH) || this.isBridgeable(PositionConstants.DIRECTION_WEST) || this.isBridgeable(PositionConstants.DIRECTION_EAST);
            }
            var blocker = this.getBlocker(direction);
            return blocker && blocker.bridgeable;
        },
        
        isDefeatable: function (direction) {
            if (direction === null) {
                return this.isDefeatable(PositionConstants.DIRECTION_NORTH) || this.isDefeatable(PositionConstants.DIRECTION_SOUTH) || this.isDefeatable(PositionConstants.DIRECTION_WEST) || this.isDefeatable(PositionConstants.DIRECTION_EAST);
            }
            var blocker = this.getBlocker(direction);
            return blocker && blocker.defeatable;
        },
    });

    return PassagesComponent;
});
