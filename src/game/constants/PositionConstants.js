define(['ash', 'game/vos/PositionVO'], function (Ash, PositionVO) {

	var PositionConstants = {
	
		DIRECTION_NONE: -1,
		DIRECTION_CAMP: 0,
		
		DIRECTION_NORTH: 1,
		DIRECTION_EAST: 2,
		DIRECTION_SOUTH: 3,
		DIRECTION_WEST: 4,
		
		DIRECTION_NE: 5,
		DIRECTION_SE: 6,
		DIRECTION_SW: 7,
		DIRECTION_NW: 8,
		
		DIRECTION_UP: 9,
		DIRECTION_DOWN: 10,
		
		getNeighbourPosition: function (sectorPos, direction) {
			return this.getPositionOnPath(sectorPos, direction, 1);
		},
		
		getPositionOnPath: function (pathStartPos, pathDirection, pathStep, round) {
			var resultPos = pathStartPos.clone();
			
			if (pathDirection === this.DIRECTION_NORTH || pathDirection === this.DIRECTION_NE || pathDirection === this.DIRECTION_NW)
				resultPos.sectorY -= pathStep;
			if (pathDirection === this.DIRECTION_EAST || pathDirection === this.DIRECTION_NE || pathDirection === this.DIRECTION_SE)
				resultPos.sectorX += pathStep;
			if (pathDirection === this.DIRECTION_SOUTH || pathDirection === this.DIRECTION_SE || pathDirection === this.DIRECTION_SW)
				resultPos.sectorY += pathStep;
			if (pathDirection === this.DIRECTION_WEST || pathDirection === this.DIRECTION_SW || pathDirection === this.DIRECTION_NW)
				resultPos.sectorX -= pathStep;
			
			if (pathDirection === this.DIRECTION_UP) resultPos.level += pathStep;
			if (pathDirection === this.DIRECTION_DOWN) resultPos.level -= pathStep;
			
			if (round) resultPos.normalize();
			
			return resultPos;
		},
		
		isOnPath: function (pos, pathStartPos, pathDirection, len) {
			for (let i = 0; i < len; i++) {
				var posOnPath = this.getPositionOnPath(pathStartPos, pathDirection, i);
				if (pos.equals(posOnPath)) {
					return true;
				}
			}
			return false;
		},
		
		isBetween: function (pos1, pos2, testPos) {
			var minx = Math.min(pos1.sectorX, pos2.sectorX);
			var maxx = Math.max(pos1.sectorX, pos2.sectorX);
			var miny = Math.min(pos1.sectorY, pos2.sectorY);
			var maxy = Math.max(pos1.sectorY, pos2.sectorY);
			return testPos.sectorX >= minx && testPos.sectorX <= maxx && testPos.sectorY >= miny && testPos.sectorY <= maxy;
		},
		
		isPositionInArea: function (sectorPos, areaSize) {
			return Math.abs(sectorPos.sectorX) <= areaSize && Math.abs(sectorPos.sectorY) <= areaSize;
		},
		
		getAllPositionsInArea: function (pos, areaSize) {
			pos = pos || new PositionVO(0, 0, 0);
			let result = [];
			result.push(new PositionVO(pos.level, pos.sectorX, pos.sectorY));
			for (var x = 1; x <= areaSize; x++) {
				for (var y = 1; y <= areaSize; y++) {
					result.push(new PositionVO(pos.level, pos.sectorX + x, pos.sectorY + y));
					result.push(new PositionVO(pos.level, pos.sectorX + x, pos.sectorY - y));
					result.push(new PositionVO(pos.level, pos.sectorX - x, pos.sectorY + y));
					result.push(new PositionVO(pos.level, pos.sectorX - x, pos.sectorY - y));
				}
			}
			return result;
		},
		
		getYDirectionFrom: function (sectorPosFrom, sectorPosTo) {
			if (sectorPosFrom.sectorY < sectorPosTo.sectorY) return this.DIRECTION_SOUTH;
			if (sectorPosFrom.sectorY > sectorPosTo.sectorY) return this.DIRECTION_NORTH;
			return this.DIRECTION_NONE;
		},
		
		getXDirectionFrom: function (sectorPosFrom, sectorPosTo) {
			if (sectorPosFrom.sectorX < sectorPosTo.sectorX) return this.DIRECTION_EAST;
			if (sectorPosFrom.sectorX > sectorPosTo.sectorX) return this.DIRECTION_WEST;
			return this.DIRECTION_NONE;
		},
		
		getDirectionFrom: function (sectorPosFrom, sectorPosTo) {
			let dx = sectorPosFrom.sectorX - sectorPosTo.sectorX;
			let dy = sectorPosFrom.sectorY - sectorPosTo.sectorY;
			let dl = sectorPosFrom.level - sectorPosTo.level;
			
			if (dy === 0 && dx < 0) return this.DIRECTION_EAST;
			if (dy === 0 && dx > 0) return this.DIRECTION_WEST;
			if (dx === 0 && dy < 0) return this.DIRECTION_SOUTH;
			if (dx === 0 && dy > 0) return this.DIRECTION_NORTH;
			if (dx > 0 && dy > 0) return this.DIRECTION_NW;
			if (dx < 0 && dy > 0) return this.DIRECTION_NE;
			if (dx > 0 && dy < 0) return this.DIRECTION_SW;
			if (dx < 0 && dy < 0) return this.DIRECTION_SE;
			
			if (dl > 0) return this.DIRECTION_UP;
			if (dl < 0) return this.DIRECTION_DOWN;
			
			return this.DIRECTION_NONE;
		},
		
		getDirectionsFrom: function (sectorPosFrom, sectorPosTo, includeDiagonals) {
			let result = [];
			var dx = sectorPosFrom.sectorX - sectorPosTo.sectorX;
			var dy = sectorPosFrom.sectorY - sectorPosTo.sectorY;

			if (dx < 0) result.push(this.DIRECTION_EAST);
			if (dx > 0) result.push(this.DIRECTION_WEST);
			if (dy < 0) result.push(this.DIRECTION_SOUTH);
			if (dy > 0) result.push(this.DIRECTION_NORTH);
			if (includeDiagonals) {
				if (dx > 0 && dy > 0) result.push(this.DIRECTION_NW);
				if (dx < 0 && dy > 0) result.push(this.DIRECTION_NE);
				if (dx > 0 && dy < 0) result.push(this.DIRECTION_SW);
				if (dx < 0 && dy < 0) result.push(this.DIRECTION_SE);
			}
			return result;
		},
		
		getDistanceTo: function (sectorPosFrom, sectorPosTo) {
			var xs = sectorPosFrom.sectorX - sectorPosTo.sectorX;
			xs = xs * xs;
			var ys = sectorPosFrom.sectorY - sectorPosTo.sectorY;
			ys = ys * ys;
			return Math.sqrt(xs + ys);
		},
		
		getMagnitude: function (pos) {
			var xs = pos.sectorX;
			xs = xs * xs;
			var ys = pos.sectorY;
			ys = ys * ys;
			return Math.sqrt(xs + ys);
		},
		
		getBlockDistanceTo: function (sectorPosFrom, sectorPosTo) {
			return Math.abs(sectorPosFrom.sectorX - sectorPosTo.sectorX) + (Math.abs(sectorPosFrom.sectorY - sectorPosTo.sectorY));
		},
		
		getDistanceInDirection: function (sectorPosFrom, sectorPosTo, direction) {
			var dx = Math.abs(sectorPosFrom.sectorX - sectorPosTo.sectorX);
			var dy = Math.abs(sectorPosFrom.sectorY - sectorPosTo.sectorY);
			var dl = Math.abs(sectorPosFrom.level - sectorPosTo.level);
			switch (direction) {
				case this.DIRECTION_WEST:
				case this.DIRECTION_EAST:
					return dx;
				case this.DIRECTION_NORTH:
				case this.DIRECTION_SOUTH:
					return dy;
				case this.DIRECTION_NE:
				case this.DIRECTION_SE:
				case this.DIRECTION_SW:
				case this.DIRECTION_NW:
					return Math.min(dx, dy);
				case this.DIRECTION_UP:
				case this.DIRECTION_DOWN:
					return dl;
			}
			return 0;
		},
		
		getMiddlePoint: function (positions, rounded) {
			let result = new PositionVO(0, 0, 0);
			if (positions && positions.length > 0) {
				for (let i = 0; i < positions.length; i++) {
					if (positions[i]) {
						result.level += positions[i].level;
						result.sectorX += positions[i].sectorX;
						result.sectorY += positions[i].sectorY;
					}
				}
				result.level /= positions.length;
				result.sectorX /= positions.length;
				result.sectorY /= positions.length;
			}
			if (rounded) {
				result.level = Math.round(result.level);
				result.sectorX = Math.round(result.sectorX);
				result.sectorY = Math.round(result.sectorY);
			}
			return result;
		},
		
		getOppositeDirection: function (direction) {
			switch (direction) {
				case this.DIRECTION_WEST: return this.DIRECTION_EAST;
				case this.DIRECTION_NORTH: return this.DIRECTION_SOUTH;
				case this.DIRECTION_SOUTH: return this.DIRECTION_NORTH;
				case this.DIRECTION_EAST: return this.DIRECTION_WEST;
				case this.DIRECTION_NE: return this.DIRECTION_SW;
				case this.DIRECTION_SE: return this.DIRECTION_NW;
				case this.DIRECTION_SW: return this.DIRECTION_NE;
				case this.DIRECTION_NW: return this.DIRECTION_SE;
				case this.DIRECTION_UP: return this.DIRECTION_DOWN;
				case this.DIRECTION_DOWN: return this.DIRECTION_UP;
				case this.DIRECTION_CAMP: return this.DIRECTION_CAMP;
			}
		},
		
		getNextClockWise: function (direction, includeDiagonalSteps) {
			switch (direction) {
				case this.DIRECTION_WEST:
					return includeDiagonalSteps ? this.DIRECTION_NW : this.DIRECTION_NORTH;
				case this.DIRECTION_NORTH:
					return includeDiagonalSteps ? this.DIRECTION_NE : this.DIRECTION_EAST;
				case this.DIRECTION_SOUTH:
					return includeDiagonalSteps ? this.DIRECTION_SW : this.DIRECTION_WEST;
				case this.DIRECTION_EAST:
					return includeDiagonalSteps ? this.DIRECTION_SE : this.DIRECTION_SOUTH;
				case this.DIRECTION_NE:
					return includeDiagonalSteps ? this.DIRECTION_EAST : this.DIRECTION_SE;
				case this.DIRECTION_SE:
					return includeDiagonalSteps ? this.DIRECTION_SOUTH : this.DIRECTION_SW;
				case this.DIRECTION_SW:
					return includeDiagonalSteps ? this.DIRECTION_WEST : this.DIRECTION_NW;
				case this.DIRECTION_NW:
					return includeDiagonalSteps ? this.DIRECTION_NORTH : this.DIRECTION_NE;
				default:
					return this.DIRECTION_NONE;
			}
		},

		getNextCounterClockWise: function (direction, includeDiagonalSteps) {
			switch (direction) {
				case this.DIRECTION_WEST:
					return includeDiagonalSteps ? this.DIRECTION_SW : this.DIRECTION_SOUTH;
				case this.DIRECTION_NORTH:
					return includeDiagonalSteps ? this.DIRECTION_NW : this.DIRECTION_WEST;
				case this.DIRECTION_SOUTH:
					return includeDiagonalSteps ? this.DIRECTION_SE : this.DIRECTION_EAST;
				case this.DIRECTION_EAST:
					return includeDiagonalSteps ? this.DIRECTION_NE : this.DIRECTION_NORTH;
				case this.DIRECTION_NE:
					return includeDiagonalSteps ? this.DIRECTION_NORTH : this.DIRECTION_NW;
				case this.DIRECTION_SE:
					return includeDiagonalSteps ? this.DIRECTION_EAST : this.DIRECTION_NE;
				case this.DIRECTION_SW:
					return includeDiagonalSteps ? this.DIRECTION_SOUTH : this.DIRECTION_SE;
				case this.DIRECTION_NW:
					return includeDiagonalSteps ? this.DIRECTION_WEST : this.DIRECTION_SW;
				default:
					return this.DIRECTION_NONE;
			}
		},
		
		isDiagonal: function (direction) {
			direction = parseInt(direction);
			switch (direction) {
				case this.DIRECTION_WEST:
				case this.DIRECTION_NORTH:
				case this.DIRECTION_SOUTH:
				case this.DIRECTION_EAST:
					return false;
				default:
					return true;
			}
		},
		
		isPerpendicular: function (direction1, direction2) {
			return
				this.getNextClockWise(this.getNextClockWise(direction1, true), true) == direction2 ||
				this.getNextClockWise(this.getNextCounterClockWise(direction1, true), true) == direction2;
		},
		
		isNeighbouringDirection: function (direction1, direction2, includeDiagonals) {
			return this.getNextClockWise(direction1, includeDiagonals) == direction2 || this.getNextCounterClockWise(direction1, includeDiagonals) == direction2;
		},
		
		getDirectionName: function (direction, short) {
			switch (direction) {
				case this.DIRECTION_WEST: return short ? "W" : "west";
				case this.DIRECTION_NORTH: return short ? "N" : "north";
				case this.DIRECTION_SOUTH: return short ? "S" : "south";
				case this.DIRECTION_EAST: return short ? "E" : "east";
				case this.DIRECTION_NE: return short ? "NE" : "north-east";
				case this.DIRECTION_SE: return short ? "SE" : "south-east";
				case this.DIRECTION_SW: return short ? "SW" : "south-west";
				case this.DIRECTION_NW: return short ? "NW" : "north-west";
				case this.DIRECTION_UP: return short ? "U" : "up";
				case this.DIRECTION_DOWN: return short ? "D" : "down";
				case this.DIRECTION_CAMP: return short ? "C" : "camp";
				case this.DIRECTION_NONE: return "none";
			}
			return "unknown";
		},
		
		getLevelDirections: function (excludeDiagonals) {
			if (!excludeDiagonals)
				return [this.DIRECTION_NORTH, this.DIRECTION_EAST, this.DIRECTION_SOUTH, this.DIRECTION_WEST,
					this.DIRECTION_NE, this.DIRECTION_SE, this.DIRECTION_SW, this.DIRECTION_NW];
			else
				return [this.DIRECTION_NORTH, this.DIRECTION_EAST, this.DIRECTION_SOUTH, this.DIRECTION_WEST];
		},
		
		getMovementDirections: function () {
			return [
				this.DIRECTION_NORTH, this.DIRECTION_EAST, this.DIRECTION_SOUTH, this.DIRECTION_WEST,
				this.DIRECTION_NE, this.DIRECTION_SE, this.DIRECTION_SW, this.DIRECTION_NW,
				this.DIRECTION_UP, this.DIRECTION_DOWN
			];
		},
		
		isLevelDirection: function (direction) {
			return this.getLevelDirections().indexOf(direction) >= 0;
		},
		
		subtract: function (pos1, pos2) {
			return new PositionVO(pos1.level - pos2.level, pos1.sectorX - pos2.sectorX, pos1.sectorY - pos2.sectorY);
		},
		
		add: function (pos1, pos2) {
			return new PositionVO(pos1.level + pos2.level, pos1.sectorX + pos2.sectorX, pos1.sectorY + pos2.sectorY);
		},
		
		multiply: function (pos, scalar, round) {
			let result = new PositionVO(pos.level, pos.sectorX * scalar, pos.sectorY * scalar);
			if (round) result.normalize();
			return result;
		},
		
		getUnitPosition: function (pos) {
			let mag = this.getMagnitude(pos);
			return new PositionVO(pos.level, pos.sectorX / mag, pos.sectorY / mag);
		},
		
		isHorizontalDirection: function (direction) {
			switch(direction) {
				case this.DIRECTION_EAST:
				case this.DIRECTION_WEST:
				case this.DIRECTION_NW:
				case this.DIRECTION_SE:
					return true;
				default:
					return false;
			}
		}
	
	};
	
	return PositionConstants;
	
});
