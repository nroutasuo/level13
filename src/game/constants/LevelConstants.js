define(['ash', 'game/constants/PositionConstants'
], function (Ash, PositionConstants ) {

	let LevelConstants = {
		
		UNCAMPABLE_LEVEL_TYPE_RADIATION: "UNCAMPABLE_LEVEL_TYPE_RADIATION",
		UNCAMPABLE_LEVEL_TYPE_POLLUTION: "UNCAMPABLE_LEVEL_TYPE_POLLUTION",
		UNCAMPABLE_LEVEL_TYPE_FLOODED: "UNCAMPABLE_LEVEL_TYPE_FLOODED",
		UNCAMPABLE_LEVEL_TYPE_SUPERSTITION: "UNCAMPABLE_LEVEL_TYPE_SUPERSTITION",

		getDistrictIndexByPosition: function (districts, pos, stage, ignoreDistrict) {
			let result = -1;
			let resultDistance = 9999;

			for (let i = 0; i < districts.length; i++) {
				if (i == ignoreDistrict) continue;
				let districtVO = districts[i];
				if (stage && districtVO.stage != stage) continue;
				let position = districtVO.adjustedPosition || districtVO.position;
				let dist = PositionConstants.getDistanceTo(pos, position);
				let adjustedDist = dist;

				if (adjustedDist > resultDistance) continue;

				result = i;
				resultDistance = adjustedDist;
			}

			return result;
		},

		isPositionSurroundedBySectors: function (sectors, sectorX, sectorY) {
			let roundedX = Math.floor(sectorX);
			let roundedY = Math.floor(sectorY);
			if (sectors.filter(s => s.position.sectorX == roundedX && s.position.sectorY <= sectorY).length == 0) return false;
			if (sectors.filter(s => s.position.sectorX == roundedX && s.position.sectorY >= sectorY).length == 0) return false;
			if (sectors.filter(s => s.position.sectorX <= sectorX && s.position.sectorY == roundedY).length == 0) return false;
			if (sectors.filter(s => s.position.sectorX >= sectorX && s.position.sectorY == roundedY).length == 0) return false;
			return true;
		}
		
	};
	return LevelConstants;
});
