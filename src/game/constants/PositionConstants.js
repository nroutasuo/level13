define(['ash'], function (Ash) {

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
        
        getDistanceTo: function (sectorPosFrom, sectorPosTo) {
            var xs = sectorPosFrom.sectorX - sectorPosTo.sectorX;
            xs = xs * xs;
            var ys = sectorPosFrom.sectorY - sectorPosTo.sectorY;
            ys = ys * ys;
            return Math.sqrt(xs + ys);
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
        
        getDirectionName: function (direction) {
            switch (direction) {
                case this.DIRECTION_WEST: return "west";
                case this.DIRECTION_NORTH: return "north";
                case this.DIRECTION_SOUTH: return "south";
                case this.DIRECTION_EAST: return "east";
                case this.DIRECTION_NE: return "NE";
                case this.DIRECTION_SE: return "SE";
                case this.DIRECTION_SW: return "SW";
                case this.DIRECTION_NW: return "NW";
                case this.DIRECTION_UP: return "up";
                case this.DIRECTION_DOWN: "down";
                case this.DIRECTION_CAMP: "camp";
                case this.DIRECTION_NONE: "none";
            }
            return "unknown";
        },
        
        getLevelDirections: function () {
            return [this.DIRECTION_NORTH, this.DIRECTION_EAST, this.DIRECTION_SOUTH, this.DIRECTION_WEST,
                    this.DIRECTION_NE, this.DIRECTION_SE, this.DIRECTION_SW, this.DIRECTION_NW];
        },
        
        isLevelDirection: function (direction) {
            return this.getLevelDirections().indexOf(direction) >= 0;
        },
    
    };
    
    return PositionConstants;
    
});
