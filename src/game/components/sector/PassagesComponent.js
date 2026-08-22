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
		
		hasBlocker: function (type) {
			return this.getBlockerType(PositionConstants.DIRECTION_NORTH) === type ||
				this.getBlockerType(PositionConstants.DIRECTION_SOUTH) === type ||
				this.getBlockerType(PositionConstants.DIRECTION_WEST) === type ||
				this.getBlockerType(PositionConstants.DIRECTION_EAST) === type ||
				this.getBlockerType(PositionConstants.DIRECTION_NE) === type ||
				this.getBlockerType(PositionConstants.DIRECTION_SE) === type ||
				this.getBlockerType(PositionConstants.DIRECTION_SW) === type ||
				this.getBlockerType(PositionConstants.DIRECTION_NW) === type;
		},

		getPassageUpType: function () {
			return this.passageUp ? this.passageUp.type : null;
		},

		getPassageDownType: function () {
			return this.passageDown ? this.passageDown.type : null;
		},
		
		getBlocker: function (direction) {
			return typeof this.blockers[direction] === 'undefined' ? null : this.blockers[direction];
		},
		
		getBlockerType: function (direction) {
			let blocker = this.getBlocker(direction);
			return blocker ? blocker.type : null;
		},
		
		isBridgeable: function (direction) {
			if (direction === null) return this.hasMatchingBlocker(this.isBridgeable);
			let blocker = this.getBlocker(direction);
			return blocker !== null && blocker.bridgeable;
		},
		
		isDefeatable: function (direction) {
			if (direction === null) return this.hasMatchingBlocker(this.isDefeatable);
			var blocker = this.getBlocker(direction);
			return blocker !== null && blocker.defeatable;
		},
		
		isClearable: function (direction) {
			if (direction === null) return this.hasMatchingBlocker(this.isClearable);
			let blocker = this.getBlocker(direction);
			if (blocker == null) return false;
			if (blocker.type == MovementConstants.BLOCKER_TYPE_WASTE_TOXIC) return true;
			if (blocker.type == MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE) return true;
			if (blocker.type == MovementConstants.BLOCKER_TYPE_DEBRIS) return true;
			if (blocker.type == MovementConstants.BLOCKER_TYPE_EXPLOSIVES) return true;
			if (blocker.type == MovementConstants.BLOCKER_TYPE_GAP) return true;
			if (blocker.type == MovementConstants.BLOCKER_TYPE_TOLL_GATE) return true;
			return false;
		},

		hasMatchingBlocker: function (check) {
			for (let i in PositionConstants.getLevelDirections()) {
				let direction = PositionConstants.getLevelDirections()[i];
				if (check(direction)) return true;
			}
			return false;
		},

	});

	return PassagesComponent;
});
