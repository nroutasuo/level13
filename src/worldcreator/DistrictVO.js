define(['ash'], function (Ash) {

	var DistrictVO = Ash.Class.extend({
		
		level: 0,
		posX: 0,
		posY: 0,
		sizeX: 0,
		sizeY: 0,
		type: null,
		
		constructor: function (level, posX, posY, sizeX, sizeY, type) {
			this.level = level;
			this.posX = posX;
			this.posY = posY;
			this.sizeX = sizeX;
			this.sizeY = sizeY;
			this.type = type;
		},
		
		containsPosition: function (position) {
			return this.level == position.level && position.sectorX >= this.getMinX() && position.sectorX <= this.getMaxX() && position.sectorY >= this.getMinY() && position.sectorY <= this.getMaxY();
		},
		
		getMinX: function () {
			if (this.sizeX <= 1) return this.posX;
			return this.posX - Math.floor((this.sizeX-1)/2);
		},
		
		getMaxX: function () {
			if (this.sizeX <= 1) return this.posX;
			return this.posX + Math.ceil((this.sizeX-1)/2);
		},
		
		getMinY: function () {
			if (this.sizeY <= 1) return this.posY;
			return this.posY - Math.floor((this.sizeY-1)/2);
		},
		
		getMaxY: function () {
			if (this.posY <= 1) return this.posY;
			return this.posY + Math.ceil((this.sizeY-1)/2);
		},
		
	});

	return DistrictVO;
});
