// Added on an entity (player) that is moving to a new position and holds the movement target

define(['ash', 'game/vos/PositionVO'], function (Ash, PositionVO) {
	
	let MovementComponent = Ash.Class.extend({

		constructor: function (level, sectorX, sectorY, inCamp) {
			this.level = level;
			this.sectorX = sectorX;
			this.sectorY = sectorY;
			this.inCamp = inCamp ? true : false;
		},

		getPosition: function () {
			return new PositionVO(this.level, this.sectorX, this.sectorY, this.inCamp);
		},
	});

	return MovementComponent;
});
