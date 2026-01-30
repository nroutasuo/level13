define(['ash', 'utils/VOCache', 'worldcreator/WorldCreatorConstants', 'worldcreator/WorldCreatorLogger', 'game/constants/PositionConstants', 'game/vos/PositionVO'],
function (Ash, VOCache, WorldCreatorConstants, WorldCreatorLogger, PositionConstants, PositionVO) {

	let LevelVO = Ash.Class.extend({
	
		constructor: function (level) {
			this.level = level;
			this.version = null;
			this.levelOrdinal = 1;
			this.campOrdinal = 1;

			this.additionalCampPositions = [];
			this.campPosition = null; // PositionVO
			this.features = []; // list of WorldFeatureVO
			this.gangs = []; // list of GangVO
			this.habitability = 1;
			this.isCampable = false;
			this.isHard = false;
			this.mapCenterPosition  = null; // PositionVO, based on shift during player journey
			this.levelCenterPosition = null; // PositionVO, based on camp and passage positions
			this.levelStyle = null; // SectorConstants.STYLE_
			this.luxuryResources = []; // list of string
			this.maxSectors = 1;
			this.maxX = 0;
			this.maxY = 0;
			this.minX = 0;
			this.minY = 0;
			this.notCampableReason = null;
			this.numInvestigateSectors = 0;
			this.numSectors = 0;
			this.numSectorsByStage = {}; // e/l -> int
			this.passageDownPosition = null;
			this.passageDownType = null;
			this.passagePositions = [];
			this.passageUpPosition = null;
			this.passageUpType = null;
			this.predefinedExplorers = []; // list of id
			this.raidDangerFactor = 1;
			this.stageCenterPositions = {}; // e/l -> list of PositionVO
			this.workshopPositions = [];
			this.workshopResource = null;

			this.sectors = [];
			
			// caches for data used during generation
			this.neighboursDictCacheContext = "LevelVO-nd-" + this.level;
			this.neighboursListCacheContext = "LevelVO-nl-" + this.level;
			VOCache.create(this.neighboursDictCacheContext, 300);
			VOCache.create(this.neighboursListCacheContext, 300);
			this.sectorNeighourCountCache = {};
			
			this.resetCaches();
		},

		// called when sector added, movement blocker added, or stage set
		resetPaths: function () {
			VOCache.clear(this.neighboursDictCacheContext);
			VOCache.clear(this.neighboursListCacheContext);
			this.sectorNeighourCountCache = {};
		},

		// called at the end of a world creation call (before world returned)
		resetInternalData: function () {
			this.localeSectors = [];
			this.paths = [];
			delete this.currentShapeID;
			delete this.lastConnectionPointUpdateSectorCount;
			
			for (let i = 0; i < this.sectors.length; i++) {
				let sectorVO = this.sectors[i];
				sectorVO.resetInternalData();
			}
		},
		
		// called after world creator caller is done with the world vo (entities created, debug vis ready)
		resetCaches: function () {
			VOCache.clear(this.neighboursDictCacheContext);
			VOCache.clear(this.neighboursListCacheContext);
			this.sectorNeighourCountCache = {};

			this.invalidPositions = [];
			this.localeSectors = [];
			this.pendingConnectionPoints = [];
			this.allConnectionPoints = [];
			this.sectorsByPos = [];
			this.sectorsByStage = [];

			for (let i = 0; i < this.sectors.length; i++) {
				let sectorVO = this.sectors[i];
				sectorVO.resetCaches();
			}
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
			
			// featurePositions are temp date used during structure gen and not available if structure gen not active (if recreating level from template)
			if (this.featurePositions) {
				for (let f = 0; f < this.featurePositions.length; f++) {
					let featurePosition = this.featurePositions[f];
					let matchingPosition = featurePosition.positions.find(position => sectorVO.position.equals(position));
					if (matchingPosition) featurePosition.numPositionsAdded++;
				}
			}
			
			if (this.sectors.length == 1) {
				this.minX = sectorVO.position.sectorX;
				this.maxX = sectorVO.position.sectorX;
				this.minY = sectorVO.position.sectorY;
				this.maxY = sectorVO.position.sectorY;
			} else {
				this.minX = Math.min(this.minX, sectorVO.position.sectorX);
				this.maxX = Math.max(this.maxX, sectorVO.position.sectorX);
				this.minY = Math.min(this.minY, sectorVO.position.sectorY);
				this.maxY = Math.max(this.maxY, sectorVO.position.sectorY);
			}
			
			return true;
		},
		
		hasSector: function (sectorX, sectorY, stage, excludeStage) {
			if (sectorX < this.minX || sectorX > this.maxX || sectorY < this.minY || sectorY > this.maxY) return false;

			let sector = this.sectorsByPos[sectorX]?.[sectorY];
			if (!sector) return false;

			let s = sector.stage;

			if (stage && s !== stage) return false;
			if (excludeStage && s === excludeStage) return false;

			return true;
		},
		
		getSector: function (sectorX, sectorY) {
			if (this.sectorsByPos) {
				return this.sectorsByPos[sectorX]?.[sectorY];
			} else {
				for (let i = 0; i < this.sectors.length; i++) {
					let sectorVO = this.sectors[i];
					if (sectorVO.position.sectorX === sectorX && sectorVO.position.sectorY == sectorY) return sectorVO;
				}
				return null;
			}
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
			let cacheKey = VOCache.getDefaultKey(sectorX, sectorY, stage);
			let cached = VOCache.getVO(this.neighboursDictCacheContext, cacheKey);
			if (cached) cached;
			
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
			VOCache.addVO(this.neighboursDictCacheContext, cacheKey, neighbours);
			return neighbours;
		},
		
		getNeighbourList: function (sectorX, sectorY, stage) {
			let cacheKey = VOCache.getDefaultKey(sectorX, sectorY, stage);
			let cached = VOCache.getVO(this.neighboursListCacheContext, cacheKey);
			if (cached) {
				return cached;
			}

			var neighbours = [];
			var startingPos = new PositionVO(this.level, sectorX, sectorY);
			for (let i in PositionConstants.getLevelDirections()) {
				var direction = PositionConstants.getLevelDirections()[i];
				var neighbourPos = PositionConstants.getNeighbourPosition(startingPos, direction);
				if (this.hasSector(neighbourPos.sectorX, neighbourPos.sectorY, stage)) {
					neighbours.push(this.getSector(neighbourPos.sectorX, neighbourPos.sectorY));
				}
			}

			VOCache.addVO(this.neighboursListCacheContext, cacheKey, neighbours);
			return neighbours;
		},
		
		getNeighbourCount: function (sectorX, sectorY, stage, excludeStage, excludeDiagonals) {
			let cacheKey = VOCache.getDefaultKey(sectorX, sectorY, stage, excludeStage, excludeDiagonals);
			let cachedValue = this.sectorNeighourCountCache[cacheKey];
			if (cachedValue || cachedValue === 0) return cachedValue;

			let result = 0;
			var startingPos = new PositionVO(this.level, sectorX, sectorY);
			for (let i in PositionConstants.getLevelDirections()) {
				var direction = PositionConstants.getLevelDirections(excludeDiagonals)[i];
				var neighbourPos = PositionConstants.getNeighbourPosition(startingPos, direction);
				if (this.hasSector(neighbourPos.sectorX, neighbourPos.sectorY, stage, excludeStage)) {
					result++;
				}
			}

			this.sectorNeighourCountCache[cacheKey] = result;

			return result;
		},
		
		getNeighbourDirections: function (sectorX, sectorY, stage, excludeStage, excludeDiagonals) {
			let result = [];
			let startingPos = new PositionVO(this.level, sectorX, sectorY);
			for (let i in PositionConstants.getLevelDirections()) {
				let direction = PositionConstants.getLevelDirections(excludeDiagonals)[i];
				let neighbourPos = PositionConstants.getNeighbourPosition(startingPos, direction);
				if (this.hasSector(neighbourPos.sectorX, neighbourPos.sectorY, stage, excludeStage)) {
					result.push(direction);
				}
			}
			return result;
		},
		
		getNeighbourCountWeighted: function (sectorX, sectorY, stage, excludeStage) {
			let numNeighboursWithoutDiagonals = this.getNeighbourCount(sectorX, sectorY, stage, excludeStage, false);
			let numNeighboursWithDiagonals = this.getNeighbourCount(sectorX, sectorY, stage, excludeStage, true);
			return numNeighboursWithoutDiagonals + numNeighboursWithDiagonals * 0.5;
		},

		getUnblockedNeighbourCount: function (sectorX, sectorY, stage) {
			let result = 0;
			let neighbours = this.getNeighbours(sectorX, sectorY, stage);

			let sectorVO = this.getSector(sectorX, sectorY);

			for (let direction in neighbours) {
				if (!sectorVO || !sectorVO.movementBlockers[direction]) result++;
			}

			return result;
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

		getExcursionStartPosition: function () {
			if (this.isCampable) {
				return this.campPosition;
			}
			if (this.level < 13) {
				return this.passageUpPosition;
			}
			return this.passageDownPosition;
		},
		
		addPendingConnectionPoint: function (point) {
			let sector = this.getSector(point.position.sectorX, point.position.sectorY);
			if (!sector) return;
			sector.isConnectionPoint = true;
			this.pendingConnectionPoints.push(point);
			this.allConnectionPoints.push(point);
		},
		
		removePendingConnectionPoint: function (point) {
			var points = this.pendingConnectionPoints;
			for (let i = 0; i < points.length; i++) {
				var p = points[i];
				if (p.position.sectorX == point.position.sectorX && p.position.sectorY == point.position.sectorY) {
					points.splice(i, 1);
					return;
				}
			}
		},

		hasConnectionPointAt: function (sectorX, sectorY) {
			return this.allConnectionPoints.filter(p => p.position.sectorX == sectorX && p.position.sectorY == sectorY).length > 0;
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
			return this.passageUpPosition ? this.passageUpPosition.equals(pos) : false;
		},

		getPassageUpType: function (pos) {
			return this.isPassageUpPosition(pos) ? this.passageUpType : null;
		},
		
		isPassageDownPosition: function (pos) {
			return this.passageDownPosition && this.passageDownPosition.equals(pos) ? true : false;
		},

		getPassageDownType: function (pos) {
			return this.isPassageDownPosition(pos) ? this.passageDownType : null;
		},
		
		getEntrancePassagePosition: function () {
			if (this.levelOrdinal == 1) return null;
			let isGoingDown = this.level <= 13;
			if (isGoingDown) {
				return this.passageUpPosition;
			} else {
				return this.passageDownPosition;
			}
		},

		getExitPassagePosition: function () {
			let isGoingDown = this.level <= 13;
			if (isGoingDown) {
				return this.passageDownPosition;
			} else {
				return this.passageUpPosition;
			}
		},

		getFeaturesByPosition: function (pos) {
			let result = [];

			for (let i = 0; i < this.features.length; i++) {
				if (this.features[i].containsPosition(pos)) {
					result.push(this.features[i]);
				}
			}

			return result;
		},

		getDerivedFeaturesByPosition: function (pos) {
			let result = [];

			for (let i = 0; i < this.features.length; i++) {
				let derivedFeature = WorldCreatorConstants.getBorderFeature(this.features[i].type);
				if (!derivedFeature) continue;
				if (this.features[i].bordersPosition(pos)) {
					result.push(derivedFeature);
				}
			}

			return result;
		},

		getDistanceToFeature: function (pos, featureType) {
			let result = 999;

			for (let i = 0; i < this.features.length; i++) {
				if (this.features[i].type != featureType) continue;
				result = Math.min(result, this.features[i].getDistanceTo(pos));
			}

			return result;
		},
		
		isInvalidPosition: function (pos) {
			for (let i = 0; i < this.invalidPositions.length; i++) {
				if (pos.sectorX == this.invalidPositions[i].sectorX && pos.sectorY == this.invalidPositions[i].sectorY) {
					return true;
				}
			}
			return false;
		},

		getAreaDensity: function (sectorX, sectorY, d, pendingPositions) {
			let filled = 0;
			let total = 0;
			for (let x = sectorX - d; x <= sectorX + d; x++) {
				for (let y = sectorY - d; y <= sectorY + d; y++) {
					total++;

					if (this.hasSector(x, y)) {
						filled++;
						continue;
					}

					if (pendingPositions) {
						for (let i = 0; i < pendingPositions.length; i++) {
							let pendingPosition = pendingPositions[i];
							if (pendingPosition.sectorX == x && pendingPosition.sectorY == y) {
								filled++;
								continue;
							}
						}
					}
				}
			}

			return filled / total;
		},

		isCrossing: function (sectorX, sectorY) {
			let neighbourCount = this.getNeighbourCount(sectorX, sectorY);
			if (neighbourCount > 3) return true;
			if (neighbourCount < 3) return false;

			let neighbourDirections = this.getNeighbourDirections(sectorX, sectorY);
			
			if (PositionConstants.getAngleBetween(neighbourDirections[0], neighbourDirections[1]) < 90) return false;
			if (PositionConstants.getAngleBetween(neighbourDirections[0], neighbourDirections[2]) < 90) return false;
			if (PositionConstants.getAngleBetween(neighbourDirections[1], neighbourDirections[2]) < 90) return false;

			return true;
		},
		
		containsPosition: function (position) {
			if (position.y < this.minY) return false;
			if (position.y > this.maxY) return false;
			if (position.x < this.minX) return false;
			if (position.x > this.maxX) return false;
			return true;
		},
		
		
	});

	return LevelVO;
});
