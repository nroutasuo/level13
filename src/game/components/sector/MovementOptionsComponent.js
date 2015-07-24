// A convenience component to store which directions the player can move to from this sector
// Updated by the SectorMovementOptionsSystem
define(['ash'], function (Ash) {
    var MovementOptionsComponent = Ash.Class.extend({
        
        cantMoveUpReason: "",
        cantMoveDownReason: "",
        
        constructor: function () {
            this.canMoveUp = false;
            this.canMoveDown = false;
            this.canMoveLeft = true;
            this.canMoveRight = true;
        }
    });

    return MovementOptionsComponent;
});
