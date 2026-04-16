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

		areEqual: function (pos1, pos2) {
			if (!pos1) return false;
			if (!pos2) return false;
			return pos1.level === pos2.level && pos1.sectorX === pos2.sectorX && pos1.sectorY === pos2.sectorY;
		},
		
		getNeighbourPosition: function (sectorPos, direction) {
			return this.getPositionOnPath(sectorPos, direction, 1);
		},
		
		getPositionOnPath: function (pathStartPos, direction, pathStep, round) {
			if (pathStep == 0) return pathStartPos;

			let resultPos = { level: pathStartPos.level, sectorX: pathStartPos.sectorX, sectorY: pathStartPos.sectorY }

			switch (direction) {
				case this.DIRECTION_WEST: 
					resultPos.sectorX -= pathStep;
					break;
				case this.DIRECTION_EAST: 
					resultPos.sectorX += pathStep;
					break;
				case this.DIRECTION_NORTH: 
					resultPos.sectorY -= pathStep;
					break;
				case this.DIRECTION_SOUTH: 
					resultPos.sectorY += pathStep;
					break;
				case this.DIRECTION_NE: 
					resultPos.sectorX += pathStep;
					resultPos.sectorY -= pathStep;
					break;
				case this.DIRECTION_SE: 
					resultPos.sectorX += pathStep;
					resultPos.sectorY += pathStep;
					break;
				case this.DIRECTION_SW: 
					resultPos.sectorX -= pathStep;
					resultPos.sectorY += pathStep;
					break;
				case this.DIRECTION_NW: 
					resultPos.sectorX -= pathStep;
					resultPos.sectorY -= pathStep;
					break;
				case this.DIRECTION_UP: 
					resultPos.level += pathStep;
					break;
				case this.DIRECTION_DOWN: 
					resultPos.level -= pathStep;
					break;
			}
			
			if (round) {
				resultPos.level = Math.round(resultPos.level);
				resultPos.sectorX = Math.round(resultPos.sectorX);
				resultPos.sectorY = Math.round(resultPos.sectorY);
			}
			
			return resultPos;
		},
		
		isOnPath: function (pos, pathStartPos, pathDirection, len) {
			if (this.getPositionAlignment(pos, pathStartPos) <= 0) return false;
			
			for (let i = 0; i < len; i++) {
				let posOnPath = this.getPositionOnPath(pathStartPos, pathDirection, i);
				if (PositionConstants.areEqual(pos, posOnPath)) {
					return true;
				}
			}
			return false;
		},

		isOnExtendedPath: function (pos, pathStartPos, pathDirection, len, maxDistance) {
			let alignment = PositionConstants.getPositionAlignment(pos, pathStartPos);
			if (alignment <= 0) return false;

			let direction = PositionConstants.getDirectionFrom(pathStartPos, pos);

			let isInPathDirection = direction === pathDirection;
			let isInOppositeDirection = direction === PositionConstants.getOppositeDirection(pathDirection);
			if (!isInPathDirection && !isInOppositeDirection) return false;

			let distance = PositionConstants.getDistanceTo(pathStartPos, pos);
			let maxDistanceFromPathStartPos = isInPathDirection ? len + maxDistance : maxDistance;

			return distance <= maxDistanceFromPathStartPos;
		},

		getIndexOnPath: function (pos, pathStartPos, pathDirection, len, maxDistance) {
			let searchOffset = maxDistance || 30;
			for (let i = -searchOffset; i < len + searchOffset; i++) {
				let posOnPath = this.getPositionOnPath(pathStartPos, pathDirection, i);
				if (posOnPath.equals(pos)) {
					return i;
				}
			}
			return undefined;
		},

		getPositionOnGrid: function (pos, gridSize) {
			return new PositionVO(pos.level, Math.round(pos.sectorX / gridSize) * gridSize, Math.round(pos.sectorY / gridSize) * gridSize);
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

		getPositionAlignment: function (pos1, pos2) {
			let diffX = Math.abs(pos1.sectorX - pos2.sectorX);
			let diffY = Math.abs(pos1.sectorY - pos2.sectorY);

			if (diffX === 0 && diffY === 0) return 1;

			let isPathableStraight = (diffX === 0 && diffY > 1) || (diffY === 0 && diffX > 1);
			if (isPathableStraight) return 1;

			let isPathableDiagonal = diffX === diffY && diffY > 2;
			if (isPathableDiagonal) return 0.5;

			return 0;
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
			if (!sectorPosFrom || !sectorPosTo) {
				return this.DIRECTION_NONE;
			}
			
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
			
			if (dl < 0) return this.DIRECTION_UP;
			if (dl > 0) return this.DIRECTION_DOWN;
			
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

		getAngleBetweenDirections: function (d1, d2) {
			if (d1 == d2) return 0;
			if (this.getOppositeDirection(d1) == d2) return 180;
			if (this.getNextClockWise(d1) == d2) return 90;
			if (this.getNextCounterClockWise(d1) == d2) return 90;
			if (this.getNextClockWise(d1, true) == d2) return 45;
			if (this.getNextCounterClockWise(d1, true) == d2) return 45;
			return 270;
		},

		getAngleBetweenPositions: function (p1, p2) {
			let dy = p2.sectorY - p1.sectorY;
			let dx = p2.sectorX - p1.sectorX;
			let angleRad = Math.atan2(dy, dx);
			let angleDeg = angleRad * 180 / Math.PI;
			return (angleDeg + 360) % 360;
		},

		getPositionsBetweenPositions: function (p1, p2) {
			let level = p1.level;

			let x1 = p1.sectorX;
			let y1 = p1.sectorY;
			let x2 = p2.sectorX;
			let y2 = p2.sectorY;

  			let result = [];

			let dx = Math.abs(x2 - x1);
			let dy = Math.abs(y2 - y1);

			let sx = x1 < x2 ? 1 : -1;
			let sy = y1 < y2 ? 1 : -1;

			let err = dx - dy;

			let x = x1;
			let y = y1;

  			while (true) {
				if (x === x2 && y === y2) break;	
				if (!(x === x1 && y === y1)) result.push(new PositionVO(level, x, y));

				let e2 = 2 * err;

				if (e2 > -dy) {
					err -= dy;
					x += sx;
				}

				if (e2 < dx) {
					err += dx;
					y += sy;
				}
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
		
		getMinDistanceTo: function (sectorPosFrom, sectorPosTos) {
			let min = 9999;
			for (let i = 0; i < sectorPosTos.length; i++) min = Math.min(min, this.getDistanceTo(sectorPosFrom, sectorPosTos[i]));
			return min;
		},

		getMaxDistanceBetween: function (positions) {
			if (positions.length <= 1) return 0;
			let max = -1;
			for (let i = 0; i < positions.length; i++) {
				for (let j = i + 1; j < positions.length; j++) {
					let p1 = positions[i];
					let p2 = positions[j];
					let d = this.getDistanceTo(p1, p2);
					if (max < 0 || d > max) max = d;
				}
			}
			return max;
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

		getOffsetByDirection: function (direction) {
			switch (direction) {
				case this.DIRECTION_WEST: return { l: 0, x: -1, y: 0 };
				case this.DIRECTION_EAST: return { l: 0, x: 1, y: 0 };
				case this.DIRECTION_NORTH: return { l: 0, x: 0, y: -1 };
				case this.DIRECTION_SOUTH: return { l: 0, x: 0, y: 1 };
				case this.DIRECTION_NE: return { l: 0, x: 1, y: -1 };
				case this.DIRECTION_SE: return { l: 0, x: 1, y: 1 };
				case this.DIRECTION_SW: return { l: 0, x: -1, y: 1 };
				case this.DIRECTION_NW: return { l: 0, x: -1, y: -1 };
				case this.DIRECTION_UP: return { l: 1, x: 0, y: 0 };
				case this.DIRECTION_DOWN: return { l: -1, x: 0, y: 0 };
			}

			return { l: 0, x: 0, y: 0 };
		},
		
		getMiddlePoint: function (positions, rounded) {
			let result = new PositionVO(0, 0, 0);
			let num = 0;
			if (positions && positions.length > 0) {
				for (let i = 0; i < positions.length; i++) {
					if (positions[i]) {
						result.level += positions[i].level;
						result.sectorX += positions[i].sectorX;
						result.sectorY += positions[i].sectorY;
						num++;
					}
				}
				result.level /= num;
				result.sectorX /= num;
				result.sectorY /= num;
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
			return this.getNextClockWise(this.getNextClockWise(direction1, true), true) == direction2 || this.getNextClockWise(this.getNextCounterClockWise(direction1, true), true) == direction2;
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
		
		getDirectionTextKey: function (direction, short) {
			let key = null;

			switch (direction) {
				case this.DIRECTION_WEST: key = "west"; break;
				case this.DIRECTION_NORTH: key = "north"; break;
				case this.DIRECTION_SOUTH: key = "south"; break;
				case this.DIRECTION_EAST: key = "east"; break;
				case this.DIRECTION_NE: key = "ne"; break;
				case this.DIRECTION_SE: key = "se"; break;
				case this.DIRECTION_SW: key = "sw"; break;
				case this.DIRECTION_NW: key = "nw"; break;
			}

			if (!key) return null;

			let result = "ui.map.direction_" + key + "_name";
			if (short) result += "_short";
			return result;
		},
		
		getLevelDirections: function (excludeDiagonals) {
			if (!excludeDiagonals)
				return [this.DIRECTION_NORTH, this.DIRECTION_NE, this.DIRECTION_EAST, this.DIRECTION_SE, this.DIRECTION_SOUTH, this.DIRECTION_SW, this.DIRECTION_WEST, this.DIRECTION_NW ];
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
		},

		isPositiveDirection: function (direction) {
			switch (direction) {
				case this.DIRECTION_SOUTH:
				case this.DIRECTION_EAST:
				case this.DIRECTION_SE:
				case this.DIRECTION_SW:
					return true;
			}

			return false;
		},

		isWorldPillarPosition: function (pos) {
			return pos.sectorX == 0 && pos.sectorY == 0;
		}
	
	};
	
	return PositionConstants;
	
});
