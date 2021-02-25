// Defines the position of an entity
define(['ash', 'game/vos/PositionVO'], function (Ash, PositionVO) {
	var PositionComponent = Ash.Class.extend({

		constructor: function (level, sectorX, sectorY, inCamp) {
			this.level = level;
			this.sectorX = sectorX;
			this.sectorY = sectorY;
			this.inCamp = inCamp ? true : false;
		},

		sectorId: function () {
			return this.sectorX + "." + this.sectorY;
		},

		positionId: function () {
			return this.level + "." + this.sectorX + "." + this.sectorY;
		},

		getPosition: function () {
			return new PositionVO(this.level, this.sectorX, this.sectorY);
		},

		setTo: function (position) {
			this.level = position.level;
			this.sectorX = position.sectorX;
			this.sectorY = position.sectorY;
			this.inCamp = position.inCamp;
		},

		equals: function (position) {
			if (!position) return false;
			return this.level === position.level && this.sectorX === position.sectorX && this.sectorY === position.sectorY && this.inCamp === position.inCamp;
		},

		toString: function () {
			return this.level + "." + this.sectorX + "." + this.sectorY + " (inCamp: " + this.inCamp + ")";
		},

		clone: function () {
			return new PositionComponent(this.level, this.sectorX, this.sectorY, this.inCamp);
		},

		getSaveKey: function () {
			return "Position";
		},
	});

	return PositionComponent;
});
