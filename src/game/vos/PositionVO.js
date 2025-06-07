// Defines a coordinate position within the City (level, x, y)
define(['ash'], function (Ash) {

	var PositionVO = Ash.Class.extend({
	
		level: 0,
		sectorX: 0,
		sectorY: 0,
		inCamp: false,
	
		constructor: function (level, sectorX, sectorY, inCamp) {
			this.level = level;
			this.sectorX = sectorX;
			this.sectorY = sectorY;
			this.inCamp = inCamp || false;
		},
		
		normalize: function () {
			this.level = Math.round(this.level);
			this.sectorX = Math.round(this.sectorX);
			this.sectorY = Math.round(this.sectorY);
		},
		
		getInGameFormat: function (includeLevel, short) {
			let sectorXS = this.sectorX < 0 ? -this.sectorX + "W" : this.sectorX + "E";
			let sectorYS = this.sectorY < 0 ? -this.sectorY + "N" : this.sectorY + "S";
			let levelS = short ? "L" + this.level : "level " + this.level;
			return sectorXS + " " + sectorYS + (includeLevel ? " " + levelS : "");
		},

		sectorId: function () {
			return this.sectorX + "." + this.sectorY;
		},
		
		getPosition: function () {
			return this;
		},

		getPositionInCamp: function () {
			return new PositionVO(this.level, this.sectorX, this.sectorY, true);
		},

		getPositionOutside: function () {
			return new PositionVO(this.level, this.sectorX, this.sectorY, false);
		},
		
		toInt: function () {
			return this.level * 1000000 + this.sectorY * 1000 + this.sectorX;
		},
		
		equals: function (positionVO) {
			return this.level === positionVO.level && this.sectorX === positionVO.sectorX && this.sectorY === positionVO.sectorY;
		},
		
		toString: function () {
			return this.level + "." + this.sectorX + "." + this.sectorY + (this.inCamp ? " (in camp)" : "");
		},

		getCustomSaveObject: function () {
			return this.level + "." + this.sectorX + "." + this.sectorY + "." + (this.inCamp ? 1 : 0);
		},

		customLoadFromSave: function (componentValues) {
			if (typeof componentValues === "string") {
				let parts = componentValues.split(".");
				this.level = parseInt(parts[0]);
				this.sectorX = parseInt(parts[1]);
				this.sectorY = parseInt(parts[2]);
				this.inCamp = parts[3] == 1 || false;
			} else if (typeof componentValues === "object") {
				this.level = parseInt(componentValues.level);
				this.sectorX = parseInt(componentValues.sectorX);
				this.sectorY = parseInt(componentValues.sectorY);
				this.inCamp = componentValues.inCamp || false;
			}
		},
		
		clone: function () {
			return new PositionVO(this.level, this.sectorX, this.sectorY, this.inCamp);
		},
	});

	return PositionVO;
});
