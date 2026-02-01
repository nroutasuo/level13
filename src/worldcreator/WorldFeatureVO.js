define(['ash', 'worldcreator/WorldCreatorConstants', 'game/vos/PositionVO', 'game/vos/AreaVO'], function (Ash, WorldCreatorConstants, PositionVO, AreaVO) {

	let WorldFeatureVO = Ash.Class.extend({
		
		type: null,
		areas: [],
		
		constructor: function (type, areas) {
			this.type = type;
			this.areas = areas;
		},
		
		containsPosition: function (positionVO) {
			for (let i = 0; i < this.areas.length; i++) {
				if (this.areas[i].containsPosition(positionVO)) return true;
			}
			return false;
		},

		bordersPosition: function (positionVO) {
			for (let i = 0; i < this.areas.length; i++) {
				if (this.areas[i].bordersPosition(positionVO)) return true;
			}
			return false;
		},
		
		spansLevel: function (l) {
			for (let i = 0; i < this.areas.length; i++) {
				if (this.areas[i].level == l) return true;
			}
			return false;
		},

		getPositions: function (level) {
			let result = [];
			for (let i = 0; i < this.areas.length; i++) {
				let areaVO = this.areas[i];
				if (areaVO.level !== level) continue;
				let positions = areaVO.getPositions();
				result = result.concat(positions);
			}
			return result; 
		},
		
		getDistanceTo: function (pos) {
			let min = -1;
			for (let i = 0; i < this.areas.length; i++) {
				let distance = this.areas[i].getDistanceTo(pos);
				if (distance < 0) continue;
				if (min < 0 || distance < min) {
					min = distance;
				}
			}
			return min;
		},
		
		getMinX: function () {
			return this.posX;
		},
		
		getMaxX: function () {
			return this.posX + (this.sizeX - 1);
		},
		
		getMinY: function () {
			return this.posY;
		},
		
		getMaxY: function () {
			return this.posY + (this.sizeY - 1);
		},

		getCustomSaveObject: function () {
			let copy = {};
			copy.type = this.type;
			copy.areas = [];
			for (let i = 0; i < this.areas.length; i++) {
				copy.areas[i] = this.areas[i].getCustomSaveObject();
			}
			return copy;
		},

		customLoadFromSave: function (componentValues) {
			this.type = componentValues.type;
			this.areas = [];
			for (let i = 0; i < componentValues.areas.length; i++) {
				this.areas[i] = new AreaVO();
				this.areas[i].customLoadFromSave(componentValues.areas[i]);
			}
		},
		
	});

	return WorldFeatureVO;
});
