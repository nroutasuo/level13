define(['ash'], function (Ash) {

    var PositionConstants = {
    
        DIRECTION_NONE: -1,
        DIRECTION_NORTH: 0,
        DIRECTION_EAST: 1,
        DIRECTION_SOUTH: 2,
        DIRECTION_WEST: 3,
        DIRECTION_UP: 4,
        DIRECTION_DOWN: 5,
        
        getPositionOnPath: function (pathStartingPos, pathDirection, pathStep) {
            var resultPos = pathStartingPos.clone();
            if (pathDirection === this.DIRECTION_NORTH) resultPos.sectorY -= pathStep;
            if (pathDirection === this.DIRECTION_EAST) resultPos.sectorX += pathStep;
            if (pathDirection === this.DIRECTION_SOUTH) resultPos.sectorY += pathStep;
            if (pathDirection === this.DIRECTION_WEST) resultPos.sectorX -= pathStep;
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
        
        getDistanceTo: function (sectorPosFrom, sectorPosTo) {
            var xs = sectorPosFrom.sectorX - sectorPosTo.sectorX;
            xs = xs * xs;
            var ys = sectorPosFrom.sectorY - sectorPosTo.sectorY;
            ys = ys * ys;           
            return Math.sqrt(xs + ys);
        }
    
    };
    
    return PositionConstants;
    
});
