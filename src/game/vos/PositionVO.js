// Defines a coordinate position within the City (level, x, y)
define(['ash'], function (Ash) {

	var PositionVO = Ash.Class.extend({
	
		level: 0,
		sectorX: 0,
		sectorY: 0,
	
		constructor: function (level, sectorX, sectorY) {
			this.level = level;
			this.sectorX = sectorX;
			this.sectorY = sectorY;
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
		
		toInt: function () {
			return this.level * 1000000 + this.sectorY * 1000 + this.sectorX;
		},
		
		equals: function (positionVO) {
			return this.level === positionVO.level && this.sectorX === positionVO.sectorX && this.sectorY === positionVO.sectorY;
		},
		
		toString: function () {
			return this.level + "." + this.sectorX + "." + this.sectorY;
		},
		
		clone: function () {
			return new PositionVO(this.level, this.sectorX, this.sectorY);
		},
	});

	return PositionVO;
});
