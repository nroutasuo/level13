// A convenience component to store which directions the player can move to from this sector
// Default is north, south, west and east (if there is a corresponding sector), but not up or down unless there is a passge
define(['ash',
	'game/constants/MovementConstants',
	'game/constants/PositionConstants',
	'game/vos/PassageVO',
	'game/vos/MovementBlockerVO'],
function (Ash, MovementConstants, PositionConstants, PassageVO, MovementBlockerVO) {
	
	var PassagesComponent = Ash.Class.extend({

		constructor: function (passageUp, passageDown, blockers) {
			this.passageUp = passageUp ? new PassageVO(passageUp) : null;
			this.passageDown = passageDown ? new PassageVO(passageDown) : null;
			
			this.blockers = {};
			for (var b in blockers) {
				this.blockers[b] = new MovementBlockerVO(blockers[b]);
			}
		},
		
		hasLevelPassage: function () {
			return this.passageUp || this.passageDown;
		},
		
		getBlocker: function (direction) {
			return typeof this.blockers[direction] === 'undefined' ? null : this.blockers[direction];
		},
		
		isBridgeable: function (direction) {
			if (direction === null) {
				return this.isBridgeable(PositionConstants.DIRECTION_NORTH) ||
					this.isBridgeable(PositionConstants.DIRECTION_SOUTH) ||
					this.isBridgeable(PositionConstants.DIRECTION_WEST) ||
					this.isBridgeable(PositionConstants.DIRECTION_EAST) ||
					this.isBridgeable(PositionConstants.DIRECTION_NE) ||
					this.isBridgeable(PositionConstants.DIRECTION_SE) ||
					this.isBridgeable(PositionConstants.DIRECTION_SW) ||
					this.isBridgeable(PositionConstants.DIRECTION_NW);
			}
			var blocker = this.getBlocker(direction);
			return blocker !== null && blocker.bridgeable;
		},
		
		isDefeatable: function (direction) {
			if (direction === null) {
				return this.isDefeatable(PositionConstants.DIRECTION_NORTH) ||
					this.isDefeatable(PositionConstants.DIRECTION_SOUTH) ||
					this.isDefeatable(PositionConstants.DIRECTION_WEST) ||
					this.isDefeatable(PositionConstants.DIRECTION_EAST) ||
					this.isDefeatable(PositionConstants.DIRECTION_NE) ||
					this.isDefeatable(PositionConstants.DIRECTION_SE) ||
					this.isDefeatable(PositionConstants.DIRECTION_SW) ||
					this.isDefeatable(PositionConstants.DIRECTION_NW);
			}
			var blocker = this.getBlocker(direction);
			return blocker !== null && blocker.defeatable;
		},
		
		isClearable: function (direction) {
			if (direction === null) {
				return this.isClearable(PositionConstants.DIRECTION_NORTH) ||
					this.isClearable(PositionConstants.DIRECTION_SOUTH) ||
					this.isClearable(PositionConstants.DIRECTION_WEST) ||
					this.isClearable(PositionConstants.DIRECTION_EAST) ||
					this.isClearable(PositionConstants.DIRECTION_NE) ||
					this.isClearable(PositionConstants.DIRECTION_SE) ||
					this.isClearable(PositionConstants.DIRECTION_SW) ||
					this.isClearable(PositionConstants.DIRECTION_NW);
			}
			var blocker = this.getBlocker(direction);
			if (blocker == null) return false;
			if (blocker.type == MovementConstants.BLOCKER_TYPE_WASTE_TOXIC) return true;
			if (blocker.type == MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE) return true;
			if (blocker.type == MovementConstants.BLOCKER_TYPE_DEBRIS) return true;
			if (blocker.type == MovementConstants.BLOCKER_TYPE_GAP) return true;
			return false;
		},
	});

	return PassagesComponent;
});
