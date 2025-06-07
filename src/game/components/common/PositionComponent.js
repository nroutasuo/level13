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
			return new PositionVO(this.level, this.sectorX, this.sectorY, this.inCamp);
		},

		getPositionInCamp: function () {
			return new PositionVO(this.level, this.sectorX, this.sectorY, true);
		},

		getPositionOutside: function () {
			return new PositionVO(this.level, this.sectorX, this.sectorY, false);
		},

		equals: function (position, ignoreCamp) {
			if (!position) return false;
			if (this.level !== position.level) return false;
			if (this.sectorX !== position.sectorX) return false;
			if (this.sectorY !== position.sectorY) return false;
			if (!ignoreCamp) {
				if (typeof this.inCamp !== "undefined" && typeof position.inCamp !== 'undefined') {
					if (this.inCamp !== position.inCamp) return false;
				}
			}
			return true;
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
