// A convenience component to store which directions the player can move to from this sector
// Default is left and right (if there is a corresponding sector), but not up unless there is a passge
define(['ash', 'game/vos/PassageVO', 'game/vos/MovementBlockerVO'], function (Ash, PassageVO, MovementBlockerVO) {
    
    var PassagesComponent = Ash.Class.extend({
        constructor: function (passageUp, passageDown, blockerLeft, blockerRight) {
            this.passageUp = passageUp ? new PassageVO(passageUp) : null;
            this.passageDown = passageDown ? new PassageVO(passageDown) : null;
            this.blockerLeft = blockerLeft ? new MovementBlockerVO(blockerLeft) : null;
            this.blockerRight = blockerRight ? new MovementBlockerVO(blockerRight) : null;
        },
        
        isLeftBridgeable: function () {
            return this.blockerLeft != null && this.blockerLeft.bridgeable;
        },
        
        isRightBridgeable: function () {
            return this.blockerRight != null && this.blockerRight.bridgeable;
        },
        
        isLeftDefeatable: function () {
            return this.blockerLeft != null && this.blockerLeft.defeatable;
        },
        
        isRightDefeatable: function () {
            return this.blockerRight != null && this.blockerRight.defeatable;
        },
    });

    return PassagesComponent;
});
