// Defines a rectangular area in the world
define(['ash', 'game/vos/PositionVO'], function (Ash, PositionVO) {

	let AreaVO = Ash.Class.extend({
	
		level: 0,
		minX: 0,
		maxX: 0,
		minY: 0,
		maxY: 0,
	
		constructor: function (level, minX, maxX, minY, maxY) {
			this.level = level;
			this.minX = minX;
			this.maxX = maxX;
			this.minY = minY;
			this.maxY = maxY;
		},
		
		containsCoordinates: function (level, sectorX, sectorY) {
			if (this.level != level) return false;
			if (this.minX > sectorX) return false;
			if (this.maxX < sectorX) return false;
			if (this.minY > sectorY) return false;
			if (this.maxY < sectorY) return false;
			return true;
		},

		containsPosition: function (positioVO) {
			return this.containsCoordinates(positioVO.level, positioVO.sectorX, positioVO.sectorY);
		},

		bordersPosition: function (positioVO) {
			return this.getDistanceTo(positioVO) == 1;
		},
		
		getDistanceTo: function (pos) {
			if (pos.level != this.level) return - 1;
			if (this.containsPosition(pos)) return 0;

			let clampedX = Math.max(this.minX, Math.min(pos.sectorX, this.maxX));
			let clampedY = Math.max(this.minY, Math.min(pos.sectorY, this.maxY));

			let dx = pos.sectorX - clampedX;
			let dy = pos.sectorY - clampedY;

			return Math.sqrt(dx*dx + dy*dy);
		},

		getPositions: function () {
			let result = [];
			for (let x = this.minX; x <= this.maxX; x++) {
				for (let y = this.minY; y <= this.maxY; y++) {
					result.push(new PositionVO(this.level, x, y));
				}
			}
			return result;
		},

		getWidth: function () {
			return this.maxX - this.minX + 1;
		},

		getHeight: function () {
			return this.maxY - this.minY + 1;
		},

		getEdgePositions: function () {
			let result = [];
			for (let x = this.minX - 1; x <= this.maxX + 1; x++) {
				for (let y = this.minY - 1; y <= this.maxY + 1; y++) {
					if (this.containsCoordinates(x, y)) continue;
					if (x < this.minX && y < this.minY) continue;
					if (x < this.minX && y > this.maxY) continue;
					if (x > this.maxX && y < this.minY) continue;
					if (x > this.maxX && y > this.maxY) continue;
					result.push(new PositionVO(this.level, x, y));
				}
			}
			return result;
		},
		
		equals: function (areaVO) {
			if (!areaVO) return false;
			return this.level === areaVO.level && this.minX === areaVO.minX && this.maxX === areaVO.maxX && this.minY === areaVO.minY && this.maxY === areaVO.maxY;
		},

		getCustomSaveObject: function () {
			return this;
		},

		customLoadFromSave: function (componentValues) {
			this.level = componentValues.level;
			this.minX = componentValues.minX;
			this.maxX = componentValues.maxX;
			this.minY = componentValues.minY;
			this.maxY = componentValues.maxY;
		},
	});

	return AreaVO;
});
