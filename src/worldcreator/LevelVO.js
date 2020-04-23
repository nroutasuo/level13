define(['ash', 'game/constants/PositionConstants', 'game/vos/PositionVO'],
function (Ash, PositionConstants, PositionVO) {

    var LevelVO = Ash.Class.extend({
	
        constructor: function (level, levelOrdinal, campOrdinal, isCampable, isHard, notCampableReason, populationFactor, numSectors) {
			this.level = level;
			this.levelOrdinal = levelOrdinal;
            this.campOrdinal  = campOrdinal;
			this.isCampable = isCampable;
            this.isHard = isHard;
            this.notCampableReason = notCampableReason;
            this.populationFactor = populationFactor;
            this.numSectors = numSectors;
            this.maxSectors = numSectors + 10;
            this.numSectorsByStage = {};
            
            this.campPositions = [];
            this.passageUpPosition = null;
            this.passageDownPosition = null;
            this.stageCenterPositions = {};
            this.zones = [];
            
			this.sectors = [];
            this.sectorsByStage = {};
			this.sectorsByPos = [];
			this.minX = 0;
			this.maxX = 0;
			this.minY = 0;
			this.maxY = 0;
            this.invalidPositions = [];
            
            this.pendingConnectionPointsByStage = {};
            
            /*
            this.numLocales = 0;
            this.campSectors = [];
            this.passageSectors = [];
            this.passageUpSectors = null;
            this.passageDownSectors = null;
            this.localeSectors = [];
            this.possibleSpringSectors = [];
            this.gangs = [];
            */
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
            if (!this.sectorsByStage[sectorVO.stage]) this.sectorsByStage[sectorVO.stage] = [];
            this.sectorsByStage[sectorVO.stage].push(sectorVO);
			
			if (!this.sectorsByPos[sectorVO.position.sectorX]) this.sectorsByPos[sectorVO.position.sectorX] = {};
			this.sectorsByPos[sectorVO.position.sectorX][sectorVO.position.sectorY] = sectorVO;
            
			this.minX = Math.min(this.minX, sectorVO.position.sectorX);
			this.maxX = Math.max(this.maxX, sectorVO.position.sectorX);
			this.minY = Math.min(this.minY, sectorVO.position.sectorY);
			this.maxY = Math.max(this.maxY, sectorVO.position.sectorY);
            
            return true;
		},
		
		hasSector: function (sectorX, sectorY, stage) {
			var colList = this.sectorsByPos[sectorX];
			if (colList) {
				var sector = this.sectorsByPos[sectorX][sectorY];
				if (sector) {
                    if (!stage || sector.stage == stage) {
                        return true;
                    }
                }
			}
			return false;
		},
		
		getSector: function (sectorX, sectorY) {
			return this.hasSector(sectorX, sectorY) ? this.sectorsByPos[sectorX][sectorY] : null;
		},
        
        getSectorsByStage: function (stage) {
            return this.sectorsByStage[stage] ? this.sectorsByStage[stage] : [];
        },
        
        getNumSectorsByStage: function (stage) {
            return this.sectorsByStage[stage] ? this.sectorsByStage[stage].length : 0;
        },
		
		getNeighbours: function (sectorX, sectorY, neighbourWrapFunc, stage) {
            if (!neighbourWrapFunc) {
                neighbourWrapFunc = function (n) { return n; };
            }
			var neighbours = {};
			var startingPos = new PositionVO(this.level, sectorX, sectorY);
			for (var i in PositionConstants.getLevelDirections()) {
				var direction = PositionConstants.getLevelDirections()[i];
				var neighbourPos = PositionConstants.getNeighbourPosition(startingPos, direction);
				if (this.hasSector(neighbourPos.sectorX, neighbourPos.sectorY, stage)) {
					neighbours[direction] = neighbourWrapFunc(this.getSector(neighbourPos.sectorX, neighbourPos.sectorY));
				}
			}
			return neighbours;
		},
        
        getNeighbourCount: function (sectorX, sectorY) {
			var result = 0;
			var startingPos = new PositionVO(this.level, sectorX, sectorY);
			for (var i in PositionConstants.getLevelDirections()) {
				var direction = PositionConstants.getLevelDirections()[i];
				var neighbourPos = PositionConstants.getNeighbourPosition(startingPos, direction);
				if (this.hasSector(neighbourPos.sectorX, neighbourPos.sectorY)) {
					result++;
				}
			}
			return result;
        },
        
        addPendingConnectionPoint: function (point) {
            var sector = this.getSector(point.position.sectorX, point.position.sectorY);
            if (!sector) return;
            sector.isConnectionPoint = true;
            var stage = sector.stage;
            if (!this.pendingConnectionPointsByStage[stage]) this.pendingConnectionPointsByStage[stage] = [];
            this.pendingConnectionPointsByStage[stage].push(point);
        },
        
        getPendingConnectionPoints: function (stage) {
            if (!stage) {
                var result = [];
                for (var key in this.pendingConnectionPointsByStage) {
                    result = result.concat(this.getPendingConnectionPoints(key));
                }
                return result;
            }
            if (!this.pendingConnectionPointsByStage[stage]) return [];
            return this.pendingConnectionPointsByStage[stage];
        },
        
        removePendingConnectionPoint: function (point) {
            for (var key in this.pendingConnectionPointsByStage) {
                var points = this.pendingConnectionPointsByStage[key];
                for (var i = 0; i < points.length; i++) {
                    var p = points[i];
                    if (p.position.sectorX == point.position.sectorX && p.position.sectorY == point.position.sectorY) {
                        points.splice(i, 1);
                        return;
                    }
                }
            }
        },
        
        isCampPosition: function (pos) {
            for (var i = 0; i < this.campPositions.length; i++) {
                if (this.campPositions[i].equals(pos)) {
                    return true;
                }
            }
            return false;
        },
        
        isPassageUpPosition: function (pos) {
            return this.passageUpPosition && this.passageUpPosition.equals(pos);
        },
        
        isPassageDownPosition: function (pos) {
            return this.passageDownPosition && this.passageDownPosition.equals(pos);
        },
        
        isInvalidPosition: function (pos) {
            for (var i = 0; i < this.invalidPositions.length; i++) {
                if (pos.sectorX == this.invalidPositions[i].sectorX && pos.sectorY == this.invalidPositions[i].sectorY) {
                    return true;
                }
            }
            return false;
        }
        
        /*
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
        */
		
    });

    return LevelVO;
});
