// A convenience component to store which directions the player can move to from this sector
// Updated by the SectorStatusSystem
define(['ash', 'game/constants/PositionConstants'], function (Ash, PositionConstants) {
	var MovementOptionsComponent = Ash.Class.extend({
		
		canMoveTo: {},          // direction -> boolean
		cantMoveToReason: {},   // direction -> string
		
		constructor: function () {
			this.canMoveTo = {};
			this.cantMoveToReason = {};
			
			this.canMoveTo[PositionConstants.UP] = false;
			this.canMoveTo[PositionConstants.DOWN] = false;
			
			for (var i in PositionConstants.getLevelDirections()) {
				var direction = PositionConstants.getLevelDirections()[i];
				this.canMoveTo[direction] = true;
			}
		},
		
		canMoveToDirection: function (direction) {
			return this.canMoveTo[direction];
		},
		
		canMove: function() {
			for (var i in PositionConstants.getLevelDirections()) {
				var direction = PositionConstants.getLevelDirections()[i];
				if (this.canMoveToDirection(direction)) return true;
			}
			return false;
		}
	});

	return MovementOptionsComponent;
});
