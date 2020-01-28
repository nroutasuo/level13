define(['ash', 'game/constants/PositionConstants', 'game/constants/WorldCreatorConstants', 'game/vos/PositionVO'], function (Ash, PositionConstants, WorldCreatorConstants, PositionVO) {

    // TODO separate LevelVO used in WorldConstructor and LevelVO in LevelComponent / used during play - same for SectorVO

    var LevelVO = Ash.Class.extend({
	
		level: -1,
		levelOrdinal: -1,
        campOrdinal: -1,
        
		isCampable: false,
        notCampableReason: null,
        populationGrowthFactor: 0, // 1 = normal, 0.25 = outpost, 0 = not campable
        
        bagSize: 0,
		centralAreaSize: 0,
        numLocales: 0,
		
		sectors: [],
		centralSectors: [],
        centralRectSectors: [],
        campSectors: [],
        passageSectors: [],
        passageUpSectors: null,
        passageDownSector: null,
        localeSectors: [],
        possibleSpringSectors: [],
		sectorsByPos: {},
        
        gangs: [],
        
		minX: 0,
		maxX: 0,
		minY: 0,
		maxY: 0,
	
        constructor: function (level, levelOrdinal, campOrdinal, isCampable, notCampableReason, populationGrowthFactor) {
			this.level = level;
			this.levelOrdinal = levelOrdinal;
            this.campOrdinal  = campOrdinal;
			this.isCampable = isCampable;
            this.notCampableReason = notCampableReason;
            this.populationGrowthFactor = populationGrowthFactor;
            this.numLocales = 0;
			
			this.sectors = [];
			this.centralSectors = [];
            this.campSectors = [];
            this.passageSectors = [];
            this.passageUpSectors = null;
            this.passageDownSectors = null;
            this.localeSectors = [];
            this.possibleSpringSectors = [];
			this.sectorsByPos = [];
            this.gangs = [];
			this.minX = 0;
			this.maxX = 0;
			this.minY = 0;
			this.maxY = 0;
        },
		
		addSector: function (sectorVO) {
			if (sectorVO === null) {
				log.w("tried to add null sector to a level");
                return false;
			}
            
            if (sectorVO.position.level !== this.level) {
				log.w("tried to add sector (" + sectorVO.position + ") to wrong level (" + this.level + ")");
                return false;
            }
			
			if (this.hasSector(sectorVO.position.sectorX, sectorVO.position.sectorY)) {
				log.w("Level " + this.level + " already contains sector " + sectorVO.position);
                return false;
			}
			
			this.sectors.push(sectorVO);
			
			if (this.isCentral(sectorVO.position.sectorX, sectorVO.position.sectorY)) this.centralSectors.push(sectorVO);
            if (sectorVO.requiredResources && sectorVO.requiredResources.getResource("water") > 0) {
                if (!WorldCreatorConstants.isStartPosition(sectorVO.position)) {
                    this.possibleSpringSectors.push(sectorVO);
                }
            }
			
			if (!this.sectorsByPos[sectorVO.position.sectorX]) this.sectorsByPos[sectorVO.position.sectorX] = {};
			this.sectorsByPos[sectorVO.position.sectorX][sectorVO.position.sectorY] = sectorVO;
            
			this.minX = Math.min(this.minX, sectorVO.position.sectorX);
			this.maxX = Math.max(this.maxX, sectorVO.position.sectorX);
			this.minY = Math.min(this.minY, sectorVO.position.sectorY);
			this.maxY = Math.max(this.maxY, sectorVO.position.sectorY);
            
            return true;
		},
        
        addGang: function (gangVO) {
            this.gangs.push(gangVO);
        },
        
        addCampSector: function (sectorVO) {
            this.campSectors.push(sectorVO);
        },
        
        addPassageUpSector: function (sectorVO) {
            this.passageSectors.push(sectorVO);
            this.passageUpSector = sectorVO;
        },
        
        addPassageDownSector: function (sectorVO) {
            this.passageSectors.push(sectorVO);
            this.passageDownSector = sectorVO;
        },
		
		hasSector: function (sectorX, sectorY) {
			var colList = this.sectorsByPos[sectorX];
			if (colList) {
				var sector = this.sectorsByPos[sectorX][sectorY];
				if (sector) return true;
			}
			return false;
		},
		
		getNeighbours: function (sectorX, sectorY, neighbourWrapFunc) {
            if (!neighbourWrapFunc) {
                neighbourWrapFunc = function (n) { return n; };
            }
			var neighbours = {};
			var startingPos = new PositionVO(this.level, sectorX, sectorY);
			for (var i in PositionConstants.getLevelDirections()) {
				var direction = PositionConstants.getLevelDirections()[i];
				var neighbourPos = PositionConstants.getNeighbourPosition(startingPos, direction);
				if (this.hasSector(neighbourPos.sectorX, neighbourPos.sectorY)) {
					neighbours[direction] = neighbourWrapFunc(this.getSector(neighbourPos.sectorX, neighbourPos.sectorY));
				}
			}
			return neighbours;
		},
        
        getNextNeighbours: function (sectorVO, direction) {
            var result = [];
            var neighbours = this.getNeighbours(sectorVO.position.sectorX, sectorVO.position.sectorY);
            var nextDirections = [ PositionConstants.getNextCounterClockWise(direction, true), PositionConstants.getNextClockWise(direction, true)];
            for (var j = 0; j < nextDirections.length; j++) {
                var bonusNeighbour = neighbours[nextDirections[j]];
                if (bonusNeighbour) {
                    result.push(bonusNeighbour);
                }
            }
            return result;
        },
        
        findPassageUp: function () {
            var all = this.getPassagesUp();
            if (all.length > 0) return all[0];
            return null;
        },
        
        findPassageDown: function () {
            var all = this.getPassagesDown();
            if (all.length > 0) return all[0];
            return null;
        },
        
        getPassagesUp: function () {
            var result = [];
            for (var i = 0; i < this.sectors.length; i++) {
                if (this.sectors[i].passageUp > 0) result.push(this.sectors[i]);
            }
            return result;
        },
        
        getPassagesDown: function () {
            var result = [];
            for (var i = 0; i < this.sectors.length; i++) {
                if (this.sectors[i].passageDown > 0) result.push(this.sectors[i]);
            }
            return result;
        },
		
		getSector: function (sectorX, sectorY) {
			return this.hasSector(sectorX, sectorY) ? this.sectorsByPos[sectorX][sectorY] : null;
		},
        
        getZonePoint: function (sectorX, sectorY) {
            if (!this.zonePoints) return null;
            for (var i = 0; i < this.zonePoints.length; i++) {
                var point = this.zonePoints[i];
                if (point.position.sectorX == sectorX && point.position.sectorY == sectorY) {
                    return point.zone;
                }
            }
            return null;
        },
        
        containsPosition: function (position) {
            if (position.y < this.minY) return false;
            if (position.y > this.maxY) return false;
            if (position.x < this.minX) return false;
            if (position.x > this.maxX) return false;
            return true;
        },
        
        isEdgeSector: function (sectorX, sectorY, padding) {
            return this.getEdgeDirection(sectorX, sectorY, padding) >= 0;
        },
        
        getEdgeDirection: function (sectorX, sectorY, padding) {
            if (!this.minY || !this.maxY || !this.minX || !this.maxX) return -1;
            if (!padding) padding = 0;
            if (sectorY <= this.minY + padding) return PositionConstants.DIRECTION_NORTH;
            if (sectorY >= this.maxY - padding) return PositionConstants.DIRECTION_SOUTH;
            if (sectorX <= this.minX + padding) return PositionConstants.DIRECTION_WEST;
            if (sectorX >= this.maxX - padding) return PositionConstants.DIRECTION_EAST;
            return -1;
        },
		
		isCentral: function (sectorX, sectorY) {
			return PositionConstants.isPositionInArea(new PositionVO(this.level, sectorX, sectorY), this.centralAreaSize);
		},
		
    });

    return LevelVO;
});
