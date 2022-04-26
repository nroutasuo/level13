define(['ash', 'utils/VOCache', 'worldcreator/WorldCreatorConstants', 'worldcreator/WorldCreatorLogger', 'game/constants/PositionConstants', 'game/vos/PositionVO'],
function (Ash, VOCache, WorldCreatorConstants, WorldCreatorLogger, PositionConstants, PositionVO) {

	var LevelVO = Ash.Class.extend({
	
		constructor: function (level, levelOrdinal, campOrdinal, isCampable, isHard, notCampableReason, populationFactor, raidDangerFactor, numSectors) {
			this.level = level;
			this.levelOrdinal = levelOrdinal;
			this.campOrdinal = campOrdinal;
			this.isCampable = isCampable;
			this.isHard = isHard;
			this.notCampableReason = notCampableReason;
			this.populationFactor = populationFactor;
			this.raidDangerFactor = raidDangerFactor;
			this.numSectors = numSectors;
			this.maxSectors = numSectors + WorldCreatorConstants.getMaxSectorOverflow(levelOrdinal);
			this.numSectorsByStage = {};
			
			this.campPosition = null;
			this.additionalCampPositions = [];
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
			
			this.localeSectors = [];
			this.numLocales = 0;
			this.gangs = [];
			
			this.neighboursCacheContext = "LevelVO-" + this.level;
			VOCache.create(this.neighboursCacheContext, 500);
		},
		
		clear: function () {
			VOCache.delete(this.neighboursCacheContext);
		},
		
		resetPaths: function () {
			VOCache.clear(this.neighboursCacheContext);
		},
		
		addSector: function (sectorVO) {
			if (sectorVO === null) {
				WorldCreatorLogger.w("tried to add null sector to a level");
				return false;
			}
			
			if (sectorVO.position.level !== this.level) {
				WorldCreatorLogger.w("tried to add sector (" + sectorVO.position + ") to wrong level (" + this.level + ")");
				return false;
			}
			
			if (this.hasSector(sectorVO.position.sectorX, sectorVO.position.sectorY)) {
				WorldCreatorLogger.w("Level " + this.level + " already contains sector " + sectorVO.position);
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
		
		hasSector: function (sectorX, sectorY, stage, excludeStage) {
			var colList = this.sectorsByPos[sectorX];
			if (colList) {
				var sector = this.sectorsByPos[sectorX][sectorY];
				if (sector) {
					if ((!stage || sector.stage == stage) && (!excludeStage || sector.stage != excludeStage)) {
						return true;
					}
				}
			}
			return false;
		},
		
		hasSectorByPos: function (pos) {
			return this.hasSector(pos.sectorX, pos.sectorY)
		},
		
		getSector: function (sectorX, sectorY) {
			var colList = this.sectorsByPos[sectorX];
			if (!colList) return null;
			return this.sectorsByPos[sectorX][sectorY];
		},
		
		getSectorByPos: function (pos) {
			if (!pos) return null;
			return this.getSector(pos.sectorX, pos.sectorY);
		},
		
		getSectorsByStage: function (stage) {
			return this.sectorsByStage[stage] ? this.sectorsByStage[stage] : [];
		},
		
		getNumSectorsByStage: function (stage) {
			return this.sectorsByStage[stage] ? this.sectorsByStage[stage].length : 0;
		},
		
		getNeighbours: function (sectorX, sectorY, stage) {
			var cacheKey = VOCache.getDefaultKey(sectorX, sectorY, stage);
			var cached = VOCache.getVO(this.neighboursCacheContext, cacheKey);
			if (cached) {
				return Object.assign({}, cached);
			}
			
			var neighbours = {};
			var startingPos = new PositionVO(this.level, sectorX, sectorY);
			var levelDirections = PositionConstants.getLevelDirections();
			for (let i in levelDirections) {
				var direction = levelDirections[i];
				var neighbourPos = PositionConstants.getNeighbourPosition(startingPos, direction);
				var neighbour = this.getSector(neighbourPos.sectorX, neighbourPos.sectorY);
				if (neighbour && (!stage || neighbour.stage == stage)) {
					neighbours[direction] = neighbour;
				}
			}
			VOCache.addVO(this.neighboursCacheContext, cacheKey, Object.assign({}, neighbours));
			return neighbours;
		},
		
		getNeighbourList: function (sectorX, sectorY, stage) {
			var neighbours = [];
			var startingPos = new PositionVO(this.level, sectorX, sectorY);
			for (let i in PositionConstants.getLevelDirections()) {
				var direction = PositionConstants.getLevelDirections()[i];
				var neighbourPos = PositionConstants.getNeighbourPosition(startingPos, direction);
				if (this.hasSector(neighbourPos.sectorX, neighbourPos.sectorY, stage)) {
					neighbours.push(this.getSector(neighbourPos.sectorX, neighbourPos.sectorY));
				}
			}
			return neighbours;
		},
		
		getNeighbourCount: function (sectorX, sectorY, stage, excludeStage, excludeDiagonals) {
			let result = 0;
			var startingPos = new PositionVO(this.level, sectorX, sectorY);
			for (let i in PositionConstants.getLevelDirections()) {
				var direction = PositionConstants.getLevelDirections(excludeDiagonals)[i];
				var neighbourPos = PositionConstants.getNeighbourPosition(startingPos, direction);
				if (this.hasSector(neighbourPos.sectorX, neighbourPos.sectorY, stage, excludeStage)) {
					result++;
				}
			}
			return result;
		},
		
		getNeighbourCountWeighted: function (sectorX, sectorY, stage, excludeStage) {
			let numNeighboursWithoutDiagonals = this.getNeighbourCount(sectorX, sectorY, stage, excludeStage, false);
			let numNeighboursWithDiagonals = this.getNeighbourCount(sectorX, sectorY, stage, excludeStage, true);
			return numNeighboursWithoutDiagonals + numNeighboursWithDiagonals * 0.5;
		},
		
		getNextNeighbours: function (sectorVO, direction) {
			let result = [];
			var neighbours = this.getNeighbours(sectorVO.position.sectorX, sectorVO.position.sectorY);
			var nextDirections = [ PositionConstants.getNextCounterClockWise(direction, true), PositionConstants.getNextClockWise(direction, true)];
			for (let j = 0; j < nextDirections.length; j++) {
				var bonusNeighbour = neighbours[nextDirections[j]];
				if (bonusNeighbour) {
					result.push(bonusNeighbour);
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
				let result = [];
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
				for (let i = 0; i < points.length; i++) {
					var p = points[i];
					if (p.position.sectorX == point.position.sectorX && p.position.sectorY == point.position.sectorY) {
						points.splice(i, 1);
						return;
					}
				}
			}
		},
		
		getAllCampPositions: function () {
			let result = [];
			if (this.campPosition) result.push(this.campPosition);
			if (this.additionalCampPositions && this.additionalCampPositions.length > 0) result = result.concat(this.additionalCampPositions);
			return result;
		},
		
		isCampPosition: function (pos) {
			if (!this.campPosition) return false;
			return this.campPosition.equals(pos);
		},
		
		isPassageUpPosition: function (pos) {
			return this.passageUpPosition && this.passageUpPosition.equals(pos);
		},
		
		isPassageDownPosition: function (pos) {
			return this.passageDownPosition && this.passageDownPosition.equals(pos);
		},
		
		getEntrancePassagePosition: function () {
			if (this.levelOrdinal == 1) return null;
			var isGoingDown = this.level <= 13;
			if (isGoingDown) {
				return this.passageUpPosition;
			} else {
				return this.passageDownPosition;
			}
		},
		
		isInvalidPosition: function (pos) {
			for (let i = 0; i < this.invalidPositions.length; i++) {
				if (pos.sectorX == this.invalidPositions[i].sectorX && pos.sectorY == this.invalidPositions[i].sectorY) {
					return true;
				}
			}
			return false;
		},
		
		containsPosition: function (position) {
			if (position.y < this.minY) return false;
			if (position.y > this.maxY) return false;
			if (position.x < this.minX) return false;
			if (position.x > this.maxX) return false;
			return true;
		},
		
		addGang: function (gangVO) {
			this.gangs.push(gangVO);
		},
		
		
	});

	return LevelVO;
});
