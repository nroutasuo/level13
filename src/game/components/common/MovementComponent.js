// Added on an entity (player) that is moving to a new position and holds the movement target

define(['ash', 'game/vos/PositionVO'], function (Ash, PositionVO) {
	
	let MovementComponent = Ash.Class.extend({

		constructor: function (level, sectorX, sectorY, inCamp, action, isInstant) {
			this.level = level;
			this.sectorX = sectorX;
			this.sectorY = sectorY;
			this.inCamp = inCamp ? true : false;
			this.isInstant = isInstant;
			this.action = action;
		},

		getPosition: function () {
			return new PositionVO(this.level, this.sectorX, this.sectorY, this.inCamp);
		},
	});

	return MovementComponent;
});
