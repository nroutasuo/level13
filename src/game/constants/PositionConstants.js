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
        
        getPositionOnPath: function (pathStartingPos, pathDirection, pathStep) {
            var resultPos = pathStartingPos.clone();
            
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
            
            return resultPos;
        },
        
        isPositionInArea: function (sectorPos, areaSize) {
            return Math.abs(sectorPos.sectorX) <= areaSize && Math.abs(sectorPos.sectorY) <= areaSize;
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
            var dx = sectorPosFrom.sectorX - sectorPosTo.sectorX;
            var dy = sectorPosFrom.sectorY - sectorPosTo.sectorY;
            
            if (dy === 0 && dx < 0) return this.DIRECTION_EAST;
            if (dy === 0 && dx > 0) return this.DIRECTION_WEST;
            if (dx === 0 && dy < 0) return this.DIRECTION_SOUTH;
            if (dx === 0 && dy > 0) return this.DIRECTION_NORTH;
            if (dx > 0 && dy > 0) return this.DIRECTION_NW;
            if (dx < 0 && dy > 0) return this.DIRECTION_NE;
            if (dx > 0 && dy < 0) return this.DIRECTION_SW;
            if (dx < 0 && dy < 0) return this.DIRECTION_SE;
            return this.DIRECTION_NONE;
        },
        
        getDirectionsFrom: function (sectorPosFrom, sectorPosTo, includeDiagonals) {
            var result = [];
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
        
        getMiddlePoint: function (positions) {
            var result = new PositionVO(0, 0, 0);
            if (positions && positions.length > 0) {
                for (var i = 0; i < positions.length; i++) {
                    result.level += positions[i].level;
                    result.sectorX += positions[i].sectorX;
                    result.sectorY += positions[i].sectorY;
                }
                result.level /= positions.length;
                result.sectorX /= positions.length;
                result.sectorY /= positions.length;
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
        
        isNeighbouringDirection: function (direction1, direction2) {
            return this.getNextClockWise(direction1, false) == direction2 || this.getNextClockWise(direction1, true) == direction2 ||
                this.getNextClockWise(direction2, false) == direction1 || this.getNextClockWise(direction2, true) == direction1;
        },
        
        getDirectionName: function (direction, short) {
            switch (direction) {
                case this.DIRECTION_WEST: return short ? "W" : "west";
                case this.DIRECTION_NORTH: return short ? "N" : "north";
                case this.DIRECTION_SOUTH: return short ? "S" : "south";
                case this.DIRECTION_EAST: return short ? "E" : "east";
                case this.DIRECTION_NE: return "NE";
                case this.DIRECTION_SE: return "SE";
                case this.DIRECTION_SW: return "SW";
                case this.DIRECTION_NW: return "NW";
                case this.DIRECTION_UP: return short ? "U" : "up";
                case this.DIRECTION_DOWN: short ? "D" : "down";
                case this.DIRECTION_CAMP: short ? "C" : "camp";
                case this.DIRECTION_NONE: "none";
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
        
        isLevelDirection: function (direction) {
            return this.getLevelDirections().indexOf(direction) >= 0;
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
