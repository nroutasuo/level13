// generates the structure of levels and creates (mostly empty) SectorVOs
define([
	'ash',
	'utils/ObjectUtils',
	'utils/MathUtils',
	'game/constants/PositionConstants',
	'game/constants/WorldConstants',
	'game/vos/PositionVO',
	'worldcreator/WorldCreatorConstants',
	'worldcreator/WorldCreatorHelper',
	'worldcreator/WorldCreatorRandom',
	'worldcreator/WorldCreatorLogger',
	'worldcreator/SectorVO',
	'worldcreator/CriticalPathVO',
], function (Ash, ObjectUtils, MathUtils, PositionConstants, WorldConstants, PositionVO, WorldCreatorConstants, WorldCreatorHelper, WorldCreatorRandom, WorldCreatorLogger, SectorVO, CriticalPathVO) {
	
	let LevelStructureGenerator = {
		
		debugLevel: 0,
		
		generate: function (seed, worldVO, worldTemplateVO, levels) {
			this.currentFeatures = worldVO.features;

			for (let i = 0; i < levels.length; i++) {
				let l = levels[i];
				let levelVO = worldVO.levels[l];
				let levelTemplateVO = worldTemplateVO.levels[l] || {};

				if (levelTemplateVO && levelTemplateVO.sectors && levelTemplateVO.sectors.length > 0) {
					levelVO.version = levelTemplateVO.version;
					this.replicateLevelStructure(seed, worldVO, levelTemplateVO, levelVO);
				} else {
					levelVO.version = WorldConstants.version;
					this.createLevelStructure(seed, worldVO, levelVO);
				}
				
				this.markRequiredPaths(seed, worldVO, levelVO);
			}
			
			this.currentFeatures = null;
		},

		replicateLevelStructure: function (seed, worldVO, levelTemplateVO, levelVO) {
			levelVO.minX = levelTemplateVO.minX;
			levelVO.maxX = levelTemplateVO.maxX;
			levelVO.minY = levelTemplateVO.minY;
			levelVO.maxY = levelTemplateVO.maxY;
			
			for (let i = 0; i < levelTemplateVO.sectors.length; i++) {
				let sectorTemplateVO = levelTemplateVO.sectors[i];
				let sectorPos = sectorTemplateVO.position;
				let stage = sectorTemplateVO.stage;
				let sectorVO = this.makeSector(levelVO, sectorPos, stage);
				levelVO.addSector(sectorVO);
			}
		},

		markRequiredPaths: function (seed, worldVO, levelVO) {
			let requiredPaths = WorldCreatorHelper.getRequiredPaths(worldVO, levelVO);
			
			for (let i = 0; i < requiredPaths.length; i++) {
				let path = requiredPaths[i];
				let startPos = path.start.clone();
				let endPos = path.end.clone();
				let sectorPath = WorldCreatorRandom.findPath(worldVO, startPos, endPos, false, true, path.stage);
				if (!sectorPath) {
					WorldCreatorLogger.e("could not make required path");
					continue;
				}
				for (let j = 0; j < sectorPath.length; j++) {
					let sectorVO = levelVO.getSectorByPos(sectorPath[j]);
					sectorVO.addToCriticalPath(path);
				}
			}

		},
		
		createLevelStructure: function(seed, worldVO, levelVO) {
			let l = levelVO.level;

			// setup
			levelVO.requiredPaths = WorldCreatorHelper.getRequiredPaths(worldVO, levelVO);
			levelVO.structureSettings = {};
			levelVO.structureSettings.diagonalRate = 0.5;
			levelVO.structureSettings.rectangleRate = 0.5;
			levelVO.structureSettings.minPathLength = 5;
			levelVO.structureSettings.maxPathLength = 30;
			levelVO.structureSettings.density = 0.5;
			levelVO.structureSettings.symmetry = 0.5;
			
			// create central structure
			this.createCentralStructure(seed, worldVO, levelVO);

			// create a loop around camp sectors if not already in central structure
			this.createCampLoop(seed, worldVO, levelVO);
			
			// ensure early stage is connected
			this.connectLevelSectors(worldVO, levelVO, levelVO.getSectorsByStage(WorldConstants.CAMP_STAGE_EARLY), WorldConstants.CAMP_STAGE_EARLY, false);
			
			// create required paths
			this.createRequiredPaths(seed, worldVO, levelVO);

			// create random shapes to fill the level
			let stages = worldVO.getStages(l);
			for (let i = 0; i < stages.length; i++) {
				let stageVO = stages[i];
				this.generateLevelStage(seed, worldVO, levelVO, stageVO, 999);
			}
			
			// fill in annoying gaps (connect sectors that are close by direct distance but far by path length)
			this.createGapFills(worldVO, levelVO);
			
			// ensure whole level is connected
			this.connectLevelSectors(worldVO, levelVO, levelVO.getSectorsByStage(WorldConstants.CAMP_STAGE_EARLY), WorldConstants.CAMP_STAGE_EARLY, true);
			this.connectLevelSectors(worldVO, levelVO, levelVO.sectors, null, true);

			// cleanup
			levelVO.structureSettings = null;
		},
		
		createCentralStructure: function (seed, worldVO, levelVO) {
			let l = levelVO.level;
			let position = levelVO.levelCenterPosition;
			
			let s1 = (seed % 4 + 1) * 11 + (l + 9) * 666;
			let s2 = (seed % 6 + 1) * 9 + (l + 7) * 331;
			let s3 = (seed % 3 + 1) * 5 + (l + 11) * 561;
			let s4 = 1000 + (seed % 7 + 1) * 185 + (l + 3) * 121 + Math.abs(levelVO.levelCenterPosition.sectorX + 1) * 585;

			let pois = [];
			if (levelVO.passageUpPosition) pois.push(levelVO.passageUpPosition);
			if (levelVO.passageDownPosition) pois.push(levelVO.passageDownPosition);
			if (levelVO.campPosition) pois.push(levelVO.campPosition);
			
			let possibleShapes = [];

			if (l == 13) {
				possibleShapes = [ this.createCentralCrossings, this.createCentralRectanglesSide, this.createCentralRectanglesSimple, this.createCentralAvenue ];
			} else if (l == 14) {
				possibleShapes = [ this.createCentralStructureL14 ];
			} else if (l == worldVO.topLevel) {
				possibleShapes = [ this.createCentralRectanglesNested, this.createCentralGrid, this.createCentralAvenue, this.createCentralTriangle, this.createCentralCircle ];
			} else if (l == worldVO.bottomLevel) {
				possibleShapes = [ this.createCentralRectanglesSide, this.createCentralTriangle, this.createCentralCourt ];
			} else if (levelVO.isCampable) {
				possibleShapes = [ this.createCentralParallels, this.createCentralCrossings, this.createCentralPlaza, this.createCentralRectanglesSide, this.createCentralRectanglesNested, this.createCentralRectanglesSimple, this.createCentralGrid, this.createCentralAvenue, this.createCentralTriangle, this.createCentralCircle, this.createCentralCourt ];
			} else {
				possibleShapes = [ this.createCentralParallels, this.createCentralCrossings, this.createCentralRectanglesSide, this.createCentralAvenue, this.createCentralRectanglesSimple, this.createCentralGrid, this.createCentralTriangle, this.createCentralCircle, this.createCentralCourt ];
			}

			if (possibleShapes.length == 0) {
				return;
			}

			let index = WorldCreatorRandom.randomInt(s4, 0, possibleShapes.length);
			let shape = possibleShapes[index];

			shape.apply(this, [s1, s2, s3, worldVO, levelVO, position, pois]);

			levelVO.centralStructureType = shape.name.replace("createCentral", "");
		},
		
		createCampLoop: function (seed, worldVO, levelVO) {
			if (levelVO.campPosition == null) return;

			let pos = levelVO.campPosition;

			let hasExistingCampSector = levelVO.hasSector(pos.sectorX, pos.sectorY);
			let existingCampSectorNeighbourCount = levelVO.getNeighbourCount(pos.sectorX, pos.sectorY);

			if (hasExistingCampSector && existingCampSectorNeighbourCount > 1) return;

			let closest = WorldCreatorHelper.getClosestSector(levelVO.sectors, pos);
			if (closest) {
				let distance = PositionConstants.getDistanceTo(pos, closest.position);

				if (distance < 2) {
					this.createPathBetween(worldVO, levelVO, pos, closest.position);
					return;
				}

				if (distance < 3) {
					this.createPathBetween(worldVO, levelVO, pos, closest.position, null, {}, WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS);
					return;
				}
			}

			let pois = [ pos ];
			let l = levelVO.level;

			let s1 = (seed % 8 + 1) * 16 + (l + 11) * 76;
			let s2 = (seed % 11 + 1) * 12 + (l + 4) * 199;
			let s3 = (seed % 15 + 1) * 8 + (l + 7) * 444;

			let minSize = Math.round(MathUtils.map(levelVO.structureSettings.density, 0, 1, 6, 3));
			let maxSize = Math.round(MathUtils.map(levelVO.structureSettings.density, 0, 1, 9, 6));
				
			let w = l == 13 ? WorldCreatorConstants.START_RECT_SIZE : WorldCreatorRandom.randomInt(s2, minSize, maxSize + 1);
			let h = l == 13 ? WorldCreatorConstants.START_RECT_SIZE : WorldCreatorRandom.randomInt(s3, minSize, maxSize + 1);

			let getPaths = function (ox, oy, params) {
				let isDiagonal = params.isDiagonal;
				let width = MathUtils.clamp(params.w, minSize, maxSize);
				let height = MathUtils.clamp(params.h, minSize, maxSize);
				let center = new PositionVO(pos.level, pos.sectorX + ox, pos.sectorY + oy);
				return LevelStructureGenerator.getRectangleFromCenter(levelVO, center, width, height, true, isDiagonal, WorldCreatorConstants.CONNECTION_POINTS_RECT_CORNERS);
			};

			let existingSectors = levelVO.sectors.concat();
			
			let offset = this.getCentralStructureOffset(levelVO, pois, { isDiagonal: [ true, false ], w: [ w - 1, w, w + 1 ], h: [ h - 1, h, h + 1 ] }, getPaths);
			let paths = getPaths(offset.x, offset.y, offset.params );
			let result = this.createPaths(levelVO, paths, true);

			this.connectNewPath(worldVO, levelVO, existingSectors, result);
		},
		
		createCentralParallels: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			// choose number of streets 2-4 (fewer on levels with few sectors overall)
			let max = Math.min(4, Math.round(levelVO.numSectors/24));
			let num = WorldCreatorRandom.randomInt(s1, 2, max + 1);
			
			// choose length
			let minlen = Math.min(7 + (max - num) * 2, Math.round(levelVO.numSectors / 10));
			let maxlenstep = Math.min(5, Math.round(levelVO.numSectors / 20));
			let len = minlen + WorldCreatorRandom.randomInt(s2, 0, maxlenstep) * 2;
			
			// choose direction
			let dir = WorldCreatorRandom.randomDirection(s2 / 2, false);
			let oppositeDir = PositionConstants.getOppositeDirection(dir);
			let perpendicularDir = PositionConstants.getNextClockWise(PositionConstants.getNextClockWise(dir, true), true);
			
			// choose distance between streets
			let minDistance = Math.round(MathUtils.clamp(levelVO.structureSettings.density, 0, 1, 2, 4));
			let maxDistance = Math.round(MathUtils.clamp(levelVO.structureSettings.density, 0, 1, 8, 4));
			let dist = minDistance + WorldCreatorRandom.randomInt(s1, 0, maxDistance - minDistance + 1);
			
			// define paths
			let getStreetCenter = function (i, ox, oy, d) {
				let streetDist = -(num-1)*d/2 + i*d;
				let base = PositionConstants.getPositionOnPath(position, perpendicularDir, streetDist, true);
				return new PositionVO(base.level, base.sectorX + ox, base.sectorY + oy);
			};

			let getPaths = function (ox, oy, params) {
				let d = params.d;
				let result = [];
				for (let i = 0; i < num; i++) {
					let streetCenter = getStreetCenter(i, ox, oy, d);
					let startPos = PositionConstants.getPositionOnPath(streetCenter, oppositeDir, Math.floor(len / 2));
					result.push({ startPos: startPos, dir: dir, len: len, connectionPointType: WorldCreatorConstants.CONNECTION_POINTS_PATH_EXTRA });
				}
				if (num > 1) {
					let street1Center = getStreetCenter(0, ox, oy, d);
					let connectionPoint1 = PositionConstants.getPositionOnPath(street1Center, oppositeDir, 0);
					result.push({ startPos: connectionPoint1, dir: perpendicularDir, len: d * (num-1) + 1 });
				}
				return result;
			};
			
			// check for offset to align to poi
			let offset = this.getCentralStructureOffset(levelVO, pois, { d: [ dist - 1, dist, dist + 1 ] }, getPaths);
			
			// create sectors
			let paths = getPaths(offset.x, offset.y, offset.params);
			this.createPaths(levelVO, paths, true, null, WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL);
		},

		createCentralAvenue: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			// settings
			let allowDiagonal = levelVO.structureSettings.diagonalRate > 0.25;
			let forceDiagonal = levelVO.structureSettings.diagonalRate > 0.75;
			let num = 2;
			
			// choose length
			let minlen = Math.min(Math.round(levelVO.numSectors / 10), 13);
			let maxlen = Math.min(Math.round(levelVO.numSectors / 9), levelVO.structureSettings.maxPathLength * 2);
			let len = Math.floor(WorldCreatorRandom.randomInt(s1, minlen, maxlen + 1) / 2) * 2 + 1;
			
			// choose direction
			let dir = WorldCreatorRandom.randomDirection(s2, 1, allowDiagonal);
			if (forceDiagonal && !PositionConstants.isDiagonal(dir)) dir = PositionConstants.getNextClockWise(dir, true);
			let oppositeDir = PositionConstants.getOppositeDirection(dir);
			let perpendicularDir = PositionConstants.getNextClockWise(PositionConstants.getNextClockWise(dir, true), true);
			let isDiagonal = PositionConstants.isDiagonal(dir);
			
			// choose distance between streets
			let minDist = Math.round(MathUtils.map(levelVO.structureSettings.density, 0, 1, 3, isDiagonal ? 1 : 2));
			let maxDist = Math.round(MathUtils.map(levelVO.structureSettings.density, 0, 1, 4, 3));
			let dist = WorldCreatorRandom.randomInt(s3, minDist, maxDist + 1);

			let trailingEndsProbability = MathUtils.map(levelVO.structureSettings.rectangleRate, 0, 1, 0.75, 0);
			
			// define paths
			let getStreetCenter = function (i, ox, oy) {
				let streetDist = dist/2 + i*dist;
				let base = PositionConstants.getPositionOnPath(position, perpendicularDir, streetDist, true);
				return new PositionVO(base.level, base.sectorX + ox, base.sectorY + oy);
			};

			let getPaths = function (ox, oy) {
				let result = [];
				// two streets
				for (let i = 0; i < num; i++) {
					let streetCenter = getStreetCenter(i, ox, oy);
					let startPos = PositionConstants.getPositionOnPath(streetCenter, oppositeDir, Math.floor(len / 2));
					result.push({ startPos: startPos, dir: dir, len: len, connectionPointType: WorldCreatorConstants.CONNECTION_POINTS_PATH_EXTRA });
				}
				// connections
				if (dist > 1) {
					let connectionOffsets = [];
					if (len >= 10) connectionOffsets.push(0);
					let trailingEnds = len > 12 && WorldCreatorRandom.randomBool(s1, trailingEndsProbability);
					let endsOffset = Math.floor(trailingEnds ? len/2 - 3 : len/2);
					connectionOffsets.push(Math.floor(-endsOffset));
					connectionOffsets.push(Math.floor(endsOffset));
					for (let i = 0; i < connectionOffsets.length; i++) {
						let street1Center = getStreetCenter(0, ox, oy);
						let offset1 = connectionOffsets[i];
						let connectionPoint1 = PositionConstants.getPositionOnPath(street1Center, oppositeDir, offset1);
						result.push({ startPos: connectionPoint1, dir: perpendicularDir, len: dist * (num-1) + 1, connectionPointType: WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE });
					}
				}
				return result;
			};
			
			// check for offset to align to poi
			let offset = this.getCentralStructureOffset(levelVO, pois, {}, getPaths);
			
			// create sectors
			let paths = getPaths(offset.x, offset.y);
			this.createPaths(levelVO, paths, true, null, WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS);
		},
		
		createCentralCrossings: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			let l = levelVO.level;
			
			// choose number of streets
			let maxNum = 2;
			let numx = WorldCreatorRandom.randomInt(s1, 1, maxNum + 1);
			let numy = WorldCreatorRandom.randomInt(s2, 1, maxNum + 1);
			if (levelVO.numSectors < 80 && numx > 1) numy = 1;
			
			// choose length and direction
			let maxlen = Math.round(levelVO.numSectors / (numx + numy) / 1.75 / 2) * 2;
			let xlen = Math.min(9 + WorldCreatorRandom.randomInt(s2, 0, 7) * 2, maxlen);
			let xdist = l == 13 ? WorldCreatorConstants.START_RECT_SIZE - 1 : WorldCreatorRandom.randomInt(s1, 2, 6);
			let xdir = PositionConstants.DIRECTION_EAST;
			let ylen = Math.min(9 + WorldCreatorRandom.randomInt(s1, 0, 7) * 2, maxlen);
			let ydist = l == 13 ? WorldCreatorConstants.START_RECT_SIZE - 1 : WorldCreatorRandom.randomInt(s2, 2, 6);
			let ydir = PositionConstants.DIRECTION_SOUTH;
			
			// define paths
			let getPaths = function (ox, oy) {
				let result = [];
				for (let i = 0; i < numx; i++) {
					var startPos = new PositionVO(l, position.sectorX + ox - xlen/2, position.sectorY + oy - (numx-1)*xdist/2+i*xdist);
					startPos.normalize();
					result.push({ startPos: startPos, dir: xdir, len: xlen });
				}
				for (let j = 0; j < numy; j++) {
					var startPos = new PositionVO(l, position.sectorX + ox - (numy-1)*ydist/2 +j*ydist, position.sectorY + oy - ylen/2);
					startPos.normalize();
					result.push({ startPos: startPos, dir: ydir, len: ylen });
				}
				return result;
			};
			
			// check for offset to align to poi
			let offset = this.getCentralStructureOffset(levelVO, pois, {}, getPaths);
			
			// create sectors
			let paths = getPaths(offset.x, offset.y);
			this.createPaths(levelVO, paths, true, null, WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL);
		},
		
		createCentralRectanglesSide: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			let l = levelVO.level;
			let sizeFactor = Math.round(levelVO.numSectors / 50);
			let connectedProbability = MathUtils.map(levelVO.structureSettings.symmetry, 0, 1, 0.25, 0.75);
			let connected = WorldCreatorRandom.randomBool(s1, connectedProbability);
			let size = 5 + WorldCreatorRandom.randomInt(s2, 0, Math.min(sizeFactor, 5)) * 2;

			let mindist = Math.max(3, Math.floor(size / 3));
			let dist = mindist + (connected ? 0 : WorldCreatorRandom.randomInt(s2, 1, sizeFactor) * 2);
			if (dist > size) dist = size;

			let horizontal = WorldCreatorRandom.randomBool(s2);
			let x = horizontal ? dist : 0;
			let y = horizontal ? 0 : dist;
			
			var getPaths = function (ox, oy) {
				let result = [];
				var pos = new PositionVO(position.level, position.sectorX + ox, position.sectorY + oy)
				var connectionPointType = size <= 5 ? WorldCreatorConstants.CONNECTION_POINTS_RECT_OUTER : LevelStructureGenerator.getDefaultRectangleConnectionPointType(levelVO, size);
				result = result.concat(LevelStructureGenerator.getRectangleFromCenter(levelVO, new PositionVO(l, pos.sectorX+x, pos.sectorY+y), size, size, true, false, connectionPointType));
				result = result.concat(LevelStructureGenerator.getRectangleFromCenter(levelVO, new PositionVO(l, pos.sectorX-x, pos.sectorY-y), size, size, true, false, connectionPointType));
				
				if (!connected) {
					var pathpos = WorldCreatorRandom.randomInt(s1, Math.ceil(-dist/2), Math.floor(dist/2));
					var pathdist = Math.round(-dist + size/2) - 1;
					var pathx = horizontal ? pathdist : pathpos;
					var pathy = horizontal ? pathpos : pathdist;
					var pathdir = horizontal ? PositionConstants.DIRECTION_EAST : PositionConstants.DIRECTION_SOUTH;
					var len = (dist - mindist) * 2;
					result.push(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, pos.sectorX + pathx, pos.sectorY + pathy), pathdir, len, true));
				}
				
				return result;
			};
			
			let offset = this.getCentralStructureOffset(levelVO, pois, {}, getPaths);
			let paths = getPaths(offset.x, offset.y);
			this.createPaths(levelVO, paths, true);
		},
		
		createCentralRectanglesNested: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			let diagonalProbability = levelVO.structureSettings.diagonalRate;
			let isDiagonal = WorldCreatorRandom.randomBool(s1, diagonalProbability);

			let minDiff = 4;
			let minSize = 3;
			let maxSize = Math.min(levelVO.numSectors / 12, 21);
			let outerS = WorldCreatorRandom.randomInt(s2, minSize + minDiff, maxSize + 1);
			if (outerS % 2 == 0) outerS--;
			if (levelVO.structureSettings.density >= 0.75) outerS += 2;
			let innerS = WorldCreatorRandom.randomInt(s1, minSize, outerS - minDiff + 1);
			if (innerS % 2 == 0) innerS--;
			if (innerS > outerS - minDiff || innerS < minSize) innerS = outerS;

			let minConnections = 2;
			if (isDiagonal) minConnections = 3;
			if (levelVO.structureSettings.density <= 0.25) minConnections--;
			if (levelVO.structureSettings.density >= 0.75) minConnections++;
			let maxConnections = outerS > 7 ? 5 : 2;
			let numConnections = WorldCreatorRandom.randomInt(s3, minConnections, maxConnections + 1);

			let getPaths = function (ox, oy) {
				let result = [];
				var pos = new PositionVO(position.level, position.sectorX + ox, position.sectorY + oy);
				pos.normalize();
				if (innerS != outerS) {
					result = result.concat(LevelStructureGenerator.getRectangleFromCenter(levelVO, pos, innerS, innerS, false, isDiagonal, WorldCreatorConstants.CONNECTION_POINTS_RECT_OUTER));
				}
				result = result.concat(LevelStructureGenerator.getRectangleFromCenter(levelVO, pos, outerS, outerS, false, isDiagonal, WorldCreatorConstants.CONNECTION_POINTS_RECT_OUTER));
				
				var includeDiagonals = outerS - innerS > 4;
				var connectionDirs = WorldCreatorRandom.randomDirections(s3 + 1001, numConnections, includeDiagonals);
				for (let i = 0; i < numConnections; i ++) {
					var connectionDir = connectionDirs[i];
					var connectionStartPos = PositionConstants.getPositionOnPath(pos, connectionDir, Math.round(innerS/2));
					var connectionLen = outerS / 2 - innerS / 2;
					if (isDiagonal && !PositionConstants.isDiagonal(connectionDir)) connectionLen = outerS - innerS;
					let connectionPointType = connectionLen > 6 ? WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE : null;
					var connectionPathVO = LevelStructureGenerator.getPathVO(levelVO, connectionStartPos, connectionDir, connectionLen, false, null, connectionPointType);
					result.push(connectionPathVO);
				}
				return result;
			};
			
			let offset = this.getCentralStructureOffset(levelVO, pois, {}, getPaths);
			let paths = getPaths(offset.x, offset.y);
			this.createPaths(levelVO, paths, true, WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS);
		},
		
		createCentralRectanglesSimple: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			let isDiagonal = WorldCreatorRandom.randomBool(s1, levelVO.structureSettings.diagonalRate * 0.75);

			let minSize = isDiagonal ? 5 : 9;
			let maxSize = Math.round(Math.min(levelVO.numSectors / 8, levelVO.structureSettings.maxPathLength * 1.5));
			if (isDiagonal) maxSize = Math.min(maxSize, 12);

			let maxRandom = Math.floor((maxSize - minSize) / 2);
			let size = minSize + WorldCreatorRandom.randomInt(s1, 0, maxRandom) * 2;

			let getPaths = function (ox, oy, params) {
				let s = params.size;
				let pos = new PositionVO(position.level, position.sectorX + ox, position.sectorY + oy)
				let connectionPointType = LevelStructureGenerator.getDefaultRectangleConnectionPointType(levelVO, s);
				let result = LevelStructureGenerator.getRectangleFromCenter(levelVO, pos, s, s, true, isDiagonal, connectionPointType);
				return result;
			};
			
			let offset = this.getCentralStructureOffset(levelVO, pois, { size: [ size, size - 2, size + 2 ] }, getPaths);
			let paths = getPaths(offset.x, offset.y, offset.params);
			this.createPaths(levelVO, paths, true);
		},
		
		createCentralCourt: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			let size = 1 + WorldCreatorRandom.randomInt(s1, 2, 6) * 2;
			if (size > levelVO.numSectors / 16) size = size - 2;
			if (size > 5 && size > levelVO.numSectors / 16) size = size - 2;
			let diagonalSize = size > 5 ? size - 2 : 5;

			// direction of center rectangle's bottom side to which the other two connect
			let direction = WorldCreatorRandom.randomDirection(s2, false); 
			let isDiagonal = PositionConstants.isDiagonal(direction);

			let centerSize = isDiagonal ? diagonalSize : size;
			let sideSize = isDiagonal ? size : diagonalSize;

			let getPaths = function (ox, oy, params) {
				let pos = new PositionVO(position.level, position.sectorX + ox, position.sectorY + oy);
				let hasExtensions = params.hasExtensions;
				
				let centerConnectionPointType = centerSize > 5 ? WorldCreatorConstants.CONNECTION_POINTS_RECT_ALL : WorldCreatorConstants.CONNECTION_POINTS_RECT_OUTER;
				let sideConnectionPointType = WorldCreatorConstants.CONNECTION_POINTS_RECT_DIAGONAL;

				let half = Math.floor(centerSize/2);
				let cornerDistance = isDiagonal ? half * 2 : half;

				let result = [];

				let center1 = new PositionVO(pos.level, pos.sectorX, pos.sectorY);
				let rectangle1 = LevelStructureGenerator.getRectangleFromCenter(levelVO, center1, centerSize, centerSize, true, isDiagonal, centerConnectionPointType);

				let options = {};
				let dir2 = PositionConstants.getNextCounterClockWise(direction, true);
				let pos2 = PositionConstants.getPositionOnPath(center1, dir2, cornerDistance);
				options.isCounterClockwise = false;
				let rectangle2 = LevelStructureGenerator.getRectangle(levelVO, pos2, sideSize, sideSize, dir2, options, true, sideConnectionPointType);

				let dir3 = PositionConstants.getOppositeDirection(PositionConstants.getNextClockWise(direction, true));
				let pos3 = PositionConstants.getPositionOnPath(center1, dir3, cornerDistance);
				options.isCounterClockwise = true;
				let rectangle3 = LevelStructureGenerator.getRectangle(levelVO, pos3, sideSize, sideSize, dir3, options, true, sideConnectionPointType);

				result = result.concat(rectangle1);
				result = result.concat(rectangle2);
				result = result.concat(rectangle3);

				if (hasExtensions) {
					let extensionConnectionPointType = WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL;

					let extension1pos = PositionConstants.getPositionOnPath(pos2, dir2, sideSize - 1);
					let extension1dir = PositionConstants.getNextCounterClockWise(dir2, true);
					let extension1 = LevelStructureGenerator.getPathVO(levelVO, extension1pos, extension1dir, centerSize, false, null, extensionConnectionPointType);

					let extension2pos = PositionConstants.getPositionOnPath(pos3, dir3, sideSize - 1);
					let extension2dir = PositionConstants.getNextClockWise(dir3, true);
					let extension2 = LevelStructureGenerator.getPathVO(levelVO, extension2pos, extension2dir, centerSize, false, null, extensionConnectionPointType);

					result = result.concat(extension1);
					result = result.concat(extension2);
				}

				return result;
			};
			
			let params = { hasExtensions: [ true, false ] };
			let offset = this.getCentralStructureOffset(levelVO, pois, params, getPaths);
			let paths = getPaths(offset.x, offset.y, offset.params);

			this.createPaths(levelVO, paths, true);
		},
		
		createCentralCircle: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			let l = levelVO.level;
			
			let maxEdgeLen = MathUtils.clamp(Math.floor(levelVO.numSectors / 20), 5, 11);
			let maxDiagonalEdgeLen = MathUtils.clamp(Math.floor(levelVO.numSectors / 20), 3, 11);

			let straightEdgeLength = 1 + WorldCreatorRandom.randomInt(s1, 1, 5) * 2;
			let diagonalEdgeLength = 1 + WorldCreatorRandom.randomInt(s2, 1, 4) * 2;
			let crossingsHorizontal = WorldCreatorRandom.randomBool(s3);
			let crossingsBoth = WorldCreatorRandom.randomBool(s1/2);

			let crossingsSingleProbability = 0.2;
			if (straightEdgeLength + diagonalEdgeLength < 9) crossingsSingleProbability += 0.1;
			if (levelVO.numSectors < 80) crossingsSingleProbability += 0.8;
			let crossingsSingleHorizontal = WorldCreatorRandom.randomBool(s1/3, crossingsSingleProbability);
			let crossingsSingleVertical = WorldCreatorRandom.randomBool(s1/4, crossingsSingleProbability);

			let getPaths = function (ox, oy, params) {
				let straightLen = MathUtils.clamp(params.len1, 3, maxEdgeLen);
				let diagonalLen = MathUtils.clamp(params.len2, 3, maxDiagonalEdgeLen);

				let centerX = position.sectorX + ox;
				let centerY = position.sectorY + oy;
				let radius = Math.floor(straightLen / 2) + diagonalLen;

				let cornerNNWX = Math.ceil(centerX - straightLen/2);
				let cornerNNEX = Math.ceil(centerX + straightLen/2) - 1;
				let cornerENEX = Math.ceil(centerX + straightLen/2) - 1;
				let cornerENEY = Math.ceil(centerY - straightLen/2);
				let cornerESEY = Math.ceil(centerY + straightLen/2) - 1;
				let sideWX = centerX - radius + 1;
				let sideEX = centerX + radius - 1;
				let sideNY = centerY - radius + 1;
				let sideSY = centerY + radius - 1;

				let result = [];

				// - straight edges 
				let sideConnectionPointType = straightLen > 7 ? WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL : WorldCreatorConstants.CONNECTION_POINTS_PATH_T;
				result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, cornerNNWX, sideNY ), PositionConstants.DIRECTION_EAST, straightLen, true, {}, sideConnectionPointType));
				result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, cornerNNWX, sideSY ), PositionConstants.DIRECTION_EAST, straightLen, true, {}, sideConnectionPointType));
				result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, sideWX, cornerENEY ), PositionConstants.DIRECTION_SOUTH, straightLen, true, {}, sideConnectionPointType));
				result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, sideEX, cornerENEY ), PositionConstants.DIRECTION_SOUTH, straightLen, true, {}, sideConnectionPointType));

				// - diagonals
				let diagonalConnectionPointType = diagonalLen > 7 ? WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE : WorldCreatorConstants.CONNECTION_POINTS_PATH_NONE;
				result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, cornerNNWX, sideNY ), PositionConstants.DIRECTION_SW, diagonalLen, true, {}, diagonalConnectionPointType));
				result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, cornerENEX, sideNY ), PositionConstants.DIRECTION_SE, diagonalLen, true, {}, diagonalConnectionPointType));
				result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, cornerNNWX, sideSY ), PositionConstants.DIRECTION_NW, diagonalLen, true, {}, diagonalConnectionPointType));
				result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, cornerENEX, sideSY ), PositionConstants.DIRECTION_NE, diagonalLen, true, {}, diagonalConnectionPointType));

				// - crossings
				let crossingLen = radius * 2 - 1;
				let forceBoth = crossingLen > 12;
				let hasCrossingsHorizontal = crossingsHorizontal || crossingsBoth || forceBoth;
				let hasCrossingsVertical = !crossingsHorizontal || crossingsBoth || forceBoth;
				let crossingsConnectionPointType = hasCrossingsHorizontal && hasCrossingsVertical && straightLen < 11 ? WorldCreatorConstants.CONNECTION_POINTS_PATH_NONE : WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE;

				if (hasCrossingsHorizontal) {
					if (crossingsSingleHorizontal) {
						result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, sideWX, centerY ), PositionConstants.DIRECTION_EAST, crossingLen, true, {}, WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE));
					} else {
						result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, sideWX, cornerENEY ), PositionConstants.DIRECTION_EAST, crossingLen, true, {}, crossingsConnectionPointType));
						result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, sideWX, cornerESEY ), PositionConstants.DIRECTION_EAST, crossingLen, true, {}, crossingsConnectionPointType));
					}
				}

				if (hasCrossingsVertical) {
					if (crossingsSingleVertical) {
						result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, centerX, sideNY ), PositionConstants.DIRECTION_SOUTH, crossingLen, true, {}, WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE));
					} else {
						result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, cornerNNWX, sideNY ), PositionConstants.DIRECTION_SOUTH, crossingLen, true, {}, crossingsConnectionPointType));
						result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, cornerNNEX, sideNY ), PositionConstants.DIRECTION_SOUTH, crossingLen, true, {}, crossingsConnectionPointType));
					}
				}

				return result;
			};
			
			let params = { len1: [ straightEdgeLength - 2, straightEdgeLength, straightEdgeLength + 2 ], len2: [ diagonalEdgeLength - 2, diagonalEdgeLength, diagonalEdgeLength + 2 ] };
			let offset = this.getCentralStructureOffset(levelVO, pois, params, getPaths);
			let paths = getPaths(offset.x, offset.y, offset.params);
			this.createPaths(levelVO, paths, true);
		},

		createCentralTriangle: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			let diagonalDirections = [ PositionConstants.DIRECTION_NE, PositionConstants.DIRECTION_SE, PositionConstants.DIRECTION_SW, PositionConstants.DIRECTION_NW ];
			let diagonalDirection = WorldCreatorRandom.randomItemFromArray(levelVO.level, diagonalDirections);

			let diagonalLength = 1 + WorldCreatorRandom.randomInt(s1, 3, 6) * 2;
			if (levelVO.numSectors > 100) diagonalLength += 1;
			
			let hasBottomOvershoot = WorldCreatorRandom.randomBool(s3, 0.75);
			let bottomOvershoot = 3 + WorldCreatorRandom.randomInt(s2, 0, 4);

			let sideConnectionPointType = diagonalLength > 7 ? WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL : WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS;

			let getPaths = function (ox, oy) {
				let pos = new PositionVO(position.level, position.sectorX + ox, position.sectorY + oy);
				let result = [];

				let diagonalDirection2 = PositionConstants.getNextClockWise(diagonalDirection);
				let middleDirection = PositionConstants.getNextClockWise(diagonalDirection, true);
				let bottomDirection = PositionConstants.getNextClockWise(middleDirection);
				let bottomDirectionOpposite = PositionConstants.getOppositeDirection(bottomDirection);

				let cornerPos = PositionConstants.getPositionOnPath(pos, diagonalDirection, diagonalLength - 1);
				let bottomLength = diagonalLength * 2 - 1 * 2;
				let bottomStartPos = PositionConstants.getPositionOnPath(cornerPos, bottomDirection, 0);
				let bottomEndPos = PositionConstants.getPositionOnPath(cornerPos, bottomDirection, bottomLength);

				result.push({ startPos: pos, dir: middleDirection, len: diagonalLength, connectionPointType: WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL });
				result.push({ startPos: pos, dir: diagonalDirection, len: diagonalLength, connectionPointType: sideConnectionPointType });
				result.push({ startPos: pos, dir: diagonalDirection2, len: diagonalLength, connectionPointType: sideConnectionPointType });

				result.push({ startPos: bottomStartPos, dir: bottomDirection, len: bottomLength, connectionPointType: WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL });

				if (hasBottomOvershoot) {
					result.push({ startPos: bottomStartPos, dir: bottomDirectionOpposite, len: bottomOvershoot, connectionPointType: WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS });
					result.push({ startPos: bottomEndPos, dir: bottomDirection, len: bottomOvershoot, connectionPointType: WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS });
				}

				return result;
			};
			
			let offset = this.getCentralStructureOffset(levelVO, pois, {}, getPaths);
			let paths = getPaths(offset.x, offset.y);
			this.createPaths(levelVO, paths, true);
		},
		
		createCentralPlaza: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			let options = this.getDefaultOptions();
			let size = 3 + WorldCreatorRandom.randomInt(s3, 0, 2) * 2;
			let minCornerLen = MathUtils.clamp(Math.floor(levelVO.numSectors / 20), 4, 8);
			let cornerlen = minCornerLen + WorldCreatorRandom.randomInt(s1, 0, 4) * 2;
			let isDiagonal = WorldCreatorRandom.randomBool(s2, levelVO.structureSettings.diagonalRate);
			
			let getCorner = function (center, dir) {
				let startPos = PositionConstants.getPositionOnPath(center, dir, 2);
				let connectingType = cornerlen > 6 ? WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL : WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS;
				return LevelStructureGenerator.getPathVO(levelVO, startPos, dir, cornerlen, true, options, connectingType);
			};

			let getPaths = function (ox, oy) {
				let result = [];

				let center = new PositionVO(position.level, position.sectorX + ox, position.sectorY + oy)

				result = result.concat(LevelStructureGenerator.getRectangleFromCenter(levelVO, center, size, size, true));

				if (isDiagonal) {
					result = result.concat(getCorner(center, PositionConstants.DIRECTION_NE));
					result = result.concat(getCorner(center, PositionConstants.DIRECTION_NW));
					result = result.concat(getCorner(center, PositionConstants.DIRECTION_SE));
					result = result.concat(getCorner(center, PositionConstants.DIRECTION_SW));
				} else {
					result = result.concat(getCorner(center, PositionConstants.DIRECTION_NORTH));
					result = result.concat(getCorner(center, PositionConstants.DIRECTION_WEST));
					result = result.concat(getCorner(center, PositionConstants.DIRECTION_SOUTH));
					result = result.concat(getCorner(center, PositionConstants.DIRECTION_EAST));
				}

				return result;
			};

			let offset = this.getCentralStructureOffset(levelVO, pois, {}, getPaths);
			let paths = getPaths(offset.x, offset.y);
			this.createPaths(levelVO, paths, true);
		},
		
		createCentralGrid: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			let numMax = MathUtils.clamp(Math.round(levelVO.numSectors / 30), 2, 4);
			let isSymmetricalCount = WorldCreatorRandom.randomBool(s1);
			let numX = WorldCreatorRandom.randomInt(s2 / 2, 2, numMax + 1);
			let numY = isSymmetricalCount ? numX : WorldCreatorRandom.randomInt(s3 / 2, 2, numMax + 1);
			let isSymmetricalSmallRects = WorldCreatorRandom.randomBool(s2, levelVO.structureSettings.symmetry * 0.4);
			let maxSize = numX > 2 || numY > 2 ? 5 : 7;
			let w = WorldCreatorRandom.randomInt(s1 * 2, 4, maxSize + 1);
			let h = isSymmetricalSmallRects ? w : WorldCreatorRandom.randomInt(s3 * 2, 4, maxSize + 1);
			
			let totalWidth = numX * w - (numX - 1);
			let totalHeight = numY * h - (numY - 1);
			
			let startX = Math.round(position.sectorX + w/2 - totalWidth / 2);
			let startY = Math.round(position.sectorY + h/2 - totalHeight / 2);

			let forceSkipSomeEdges = numX > 2 && numY > 2;
			let skipSomeEdgesProbability = (numX + numY) / 10;
			let skipSomeEdges = forceSkipSomeEdges || WorldCreatorRandom.randomBool(worldVO.seed, skipSomeEdgesProbability);

			let getPaths = function (ox, oy) {
				let result = [];
				let skipEdgeProbability = forceSkipSomeEdges ? 0.8 : 0.15;
				for (let x = 0; x < numX; x++) {
					let isEdgex = x === 0 || x === numX - 1;
					for (let y = 0; y < numY; y++) {
						let isEdgeY = y === 0 || y === numY - 1;
						let isCorner = isEdgex && isEdgeY;
						let skipPath = !isCorner && skipSomeEdges && WorldCreatorRandom.randomBool(levelVO.level + x + y, skipEdgeProbability);

						if (skipPath) {
							skipEdgeProbability = MathUtils.clamp(skipEdgeProbability - 0.1, 0, 1);
							continue;
						} else {
							skipEdgeProbability = MathUtils.clamp(skipEdgeProbability + (forceSkipSomeEdges ? 0.1 : 0.05), 0, 1);
						}

						let connectionPointType = WorldCreatorConstants.CONNECTION_POINTS_RECT_CORNERS;
						let pos = new PositionVO(position.level, startX + x*w - x + ox, startY + y*h - y + oy)
						let pathResult = LevelStructureGenerator.getRectangleFromCenter(levelVO, pos, w, h, true, false, connectionPointType);
						result = result.concat(pathResult);
					}
				}
				return result;
			};

			let offset = this.getCentralStructureOffset(levelVO, pois, {}, getPaths);
			let paths = getPaths(offset.x, offset.y);
			this.createPaths(levelVO, paths, true);
		},

		createCentralStructureL14: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			let l = levelVO.level;

			let num = WorldCreatorRandom.randomInt(s1, 3, 5);
			let s = 3;
			let d = 1;

			let offsetCenterToEdge = (s - 1) / 2;

			let getPaths = function (ox, oy) {
				let result = [];

				let center = new PositionVO(l, position.sectorX + ox, position.sectorY + oy);
				let startX = center.sectorX - Math.floor(num/2) * s - Math.floor((num-1)/2)* d;

				let isLineOnTop = center.sectorY >= 0;
				let offsetLineY = isLineOnTop ? - offsetCenterToEdge : offsetCenterToEdge;
				let lineStartPosition = new PositionVO(levelVO.level, startX - offsetCenterToEdge, center.sectorY + offsetLineY);
				let linewidth = s * num + d * (num - 1);
				result = result.concat(LevelStructureGenerator.getPathVO(levelVO, lineStartPosition, PositionConstants.DIRECTION_EAST, linewidth, true, null, WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS));

				for (let i = 0; i < num; i++) {
					let x = startX + i * s + i * d;
					let pos = new PositionVO(l, x, center.sectorY);
					let pathResult = LevelStructureGenerator.getRectangleFromCenter(levelVO, pos, s, s, true, false, WorldCreatorConstants.CONNECTION_POINTS_RECT_CORNERS);
					result = result.concat(pathResult);
				}

				return result;
			}

			let offset = this.getCentralStructureOffset(levelVO, pois, {}, getPaths);
			let paths = getPaths(offset.x, offset.y);
			this.createPaths(levelVO, paths, true);
		},

		createPaths: function (levelVO, paths, forceComplete, options, connectionPointType) {
			options = options || this.getDefaultOptions();

			let result = [];

			for (let i = 0; i < paths.length; i++) {
				let path = paths[i];
				let pathConnectionPointType = path.connectionPointType || connectionPointType || this.getDefaultPathConnectionPointType(levelVO, path.len);
				let pathResult = this.createPath(levelVO, path.startPos, path.dir, path.len, forceComplete, options, pathConnectionPointType);
				result = result.concat(pathResult.path);

				if (!forceComplete && !pathResult.completed) {
					break;
				}
			}

			return result;
		},
		
		generateLevelStage: function (seed, worldVO, levelVO, stageVO, maxAttempts) {
			let stages = worldVO.getStages(levelVO.level);
			let stage = stageVO.stage;
			let numGoal = WorldCreatorHelper.getNumSectorsForLevelStage(worldVO.seed, levelVO.campOrdinal, levelVO.level, stageVO.stage);
			let numPadding = Math.floor(WorldCreatorConstants.MAX_SECTOR_COUNT_OVERFLOW / 4);
			let isOuterStage = stage != stages[0].stage;

			let rectangleRate = levelVO.structureSettings.rectangleRate;
			let isRectangleAttempt = function (i) {
				if (rectangleRate >= 1) return true;
				if (rectangleRate <= 0) return false;
				if (rectangleRate < 0.4) return i % 3 == 1;
				if (rectangleRate > 0.6) return i % 3 != 1; 
				return i % 2 == 1;
			};

			// geneate random rectangles and paths
			let attempts = 0;
			let failures = 0;
			let numCurrent = levelVO.getNumSectorsByStage(stage);
			while (numCurrent < numGoal && attempts < maxAttempts) {
				attempts++;
				let isFirstAttempt = attempts === 1;
				let isLateAttempt = attempts > 5 && attempts % 4 == 0;
				let canConnectToDifferentStage = (isFirstAttempt || isLateAttempt) && stage != WorldConstants.CAMP_STAGE_EARLY;
				let options = this.getDefaultOptions({ stage: stage, canConnectToDifferentStage: canConnectToDifferentStage, isOuterStage: isOuterStage });
				let numBefore = numCurrent;
				let numRemaining = numGoal - numCurrent;
				let makeRect = isRectangleAttempt(attempts) && numRemaining > 12;

				if (makeRect) {
					let maxRectSize = numRemaining + numPadding;
					this.createRandomRectangles(seed, attempts, levelVO, options, maxRectSize);
				} else {
					this.createRandomPaths(seed, attempts, levelVO, options, numRemaining + numPadding);
				}
				numCurrent = levelVO.getNumSectorsByStage(stage);
				let numAfter = numCurrent;
				let numCreated = numAfter - numBefore;
				let isSuccess = numCreated > 1;
				if (isSuccess) {
					failures = 0;
				} else {
					failures++;
				}
				if (failures > 25) {
					WorldCreatorLogger.w("problems generating level stage " + levelVO.level + " " + stageVO.stage);
				}
			}
			if (attempts == maxAttempts) {
				WorldCreatorLogger.w("level " + levelVO.level + " " + stageVO.stage + " could not be completed in " + attempts + " attempts");
			}
		},
		
		createRequiredPaths: function (seed, worldVO, levelVO) {
			if (levelVO.requiredPaths.length === 0) return;

			for (let i = 0; i < levelVO.requiredPaths.length; i++) {
				let path = levelVO.requiredPaths[i];
				let startPos = path.start.clone();
				let endPos = path.end.clone();
				let criticalPathVO = new CriticalPathVO(path.type, path.start, path.end);
				let existingSectors = levelVO.sectors.concat();
				let options = this.getDefaultOptions({ stage: path.stage, criticalPath: criticalPathVO });
				let currentDistance = this.getCurrentSectorDistance(worldVO, startPos, endPos, path.stage);
				if (currentDistance > 0 && currentDistance <= path.maxlen) continue;

				let pathResult = this.createPathBetween(worldVO, levelVO, startPos, endPos, path.maxlen, options, WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL);
				
				if (!pathResult.isComplete) {
					WorldCreatorLogger.w("failed to create required path on level " + levelVO.level);
					WorldCreatorLogger.i(path);
					WorldCreatorLogger.i(pathResult);
					throw new Error("failed to creare required path on level " + levelVO.level);
				}
				
				this.connectNewPath(worldVO, levelVO, existingSectors, pathResult.path);
			}
		},

		createRandomRectangles: function (seed, pathSeed, levelVO, options, maxlen) {
			let l = levelVO.levelOrdinal;
			let pathRandomSeed = levelVO.sectors.length * 4 + l + pathSeed * 5;
			let s1 = seed * levelVO.levelOrdinal + 28381 + pathRandomSeed;
			let s2 = seed + (l * 44) * pathRandomSeed + pathSeed;
			
			let pathStartPoint = this.getPathStartPosition(s1, s2, levelVO, false, options);
			let pathStartPos = pathStartPoint.position.clone();

			let stage = levelVO.getSector(pathStartPos.sectorX, pathStartPos.sectorY).stage;
			if (!options.stage) options.stage = pathStartPos.stage || stage;

			let diagonalModifier = 0.75;
			let possibleDirections = this.getPossiblePathDirections(s1, s2, levelVO, pathStartPoint, diagonalModifier, 0.2);
									
			let maxRectangleSizeFromSideLen = Math.floor(levelVO.structureSettings.maxPathLength);
			let maxRectangleSizeFromLevelPropotions = Math.ceil(levelVO.numSectors / 11);
			let maxRectangleSizeFromMaxLen = Math.ceil(maxlen/5);
			let minRectangleSize = 4;
			let maxRectangleSize = Math.min(maxRectangleSizeFromSideLen, maxRectangleSizeFromLevelPropotions, maxRectangleSizeFromMaxLen);
			
			let w = WorldCreatorRandom.randomInt(seed + pathRandomSeed / pathSeed + pathSeed * l, minRectangleSize, maxRectangleSize + 1);
			let h = WorldCreatorRandom.randomInt(seed + pathRandomSeed * l + pathSeed - pathSeed * l, minRectangleSize, maxRectangleSize + 1);

			let forceSymmetric = WorldCreatorRandom.randomBool(pathRandomSeed, levelVO.structureSettings.symmetry / 2);

			let connectionPointsType = WorldCreatorConstants.CONNECTION_POINTS_RECT_ALL;
			if (w < 6 && h < 6) {
				connectionPointsType = WorldCreatorConstants.CONNECTION_POINTS_RECT_CORNERS;
				options.allowNoOverlaps = true;
			}

			let canDuplicateProbability = levelVO.structureSettings.symmetry;
			let canDuplicate = w < maxRectangleSize * 0.7 && h < maxRectangleSize * 0.7 && WorldCreatorRandom.randomBool(pathSeed, canDuplicateProbability);

			let getPaths = function (params) {
				let width = MathUtils.clamp(params.w, minRectangleSize, maxRectangleSize);
				let height = MathUtils.clamp(params.h, minRectangleSize, maxRectangleSize);
				if (forceSymmetric) height = width;
				let duplicate = canDuplicate && params.duplicate;
				let startDirection = params.dir;
			
				let result = [];

				options.isCounterClockwise = false;
				let rectangle1 = LevelStructureGenerator.getRectangle(levelVO, pathStartPos, width, height, startDirection, options, false, connectionPointsType);
				result = result.concat(rectangle1);

				if (duplicate) {
					options.isCounterClockwise = true;
					let otherStartDirection = PositionConstants.getOppositeDirection(startDirection);
					let rectangle2 = LevelStructureGenerator.getRectangle(levelVO, pathStartPos, width, height, otherStartDirection, options, false, connectionPointsType);
					result = result.concat(rectangle2);
				}

				return result;
			};

			let params = { w: [ w, w - 1, w + 1 ], h: [ h, h - 1, h + 1 ], dir: possibleDirections };
			if (canDuplicate) params.duplicate = [ true, false ];
			let offset = this.getRandomPathsOffset(levelVO, params, getPaths, options);
			let paths = getPaths(offset);

			this.createPaths(levelVO, paths, false, options);
		},

		getRectangleFromCenter: function (levelVO, center, w, h, forceComplete, isDiagonal, connectionPointsType) {
			if (isDiagonal) {
				var corner = new PositionVO(center.level, center.sectorX, center.sectorY - h + 1);
				return this.getRectangle(levelVO, corner, w, h, PositionConstants.DIRECTION_SE, null, forceComplete, connectionPointsType);
			} else {
				var corner = new PositionVO(center.level, Math.round(center.sectorX - w / 2), Math.round(center.sectorY - h / 2));
				return this.getRectangle(levelVO, corner, w, h, PositionConstants.DIRECTION_EAST, null, forceComplete, connectionPointsType);
			}
		},
		
		getRectangle: function (levelVO, startPos, w, h, startDirection, options, forceComplete, connectionPointsType) {
			options = options || {};
			let result = [];
			let sideStartPos = startPos;
			let currentDirection = startDirection;
			for (let j = 0; j < 4; j++) {
				let sideLength = PositionConstants.isHorizontalDirection(currentDirection) ? w : h;
				let connectionPointType = this.getPathConnectionPointType(connectionPointsType);
				let path = this.getPathVO(levelVO, sideStartPos, currentDirection, sideLength, forceComplete, options, connectionPointType);
				
				result.push(path);

				sideStartPos = PositionConstants.getPositionOnPath(sideStartPos, currentDirection, sideLength - 1);
				currentDirection = options.isCounterClockwise ? 
					PositionConstants.getNextCounterClockWise(currentDirection, false) :
					PositionConstants.getNextClockWise(currentDirection, false);
			}
			return result;
		},
		
		createPathBetween: function (worldVO, levelVO, startPos, endPos, maxlen, options, connectionPointType) {
			options = options || {};

			let dist = Math.ceil(PositionConstants.getDistanceTo(startPos, endPos));
			let result = { path: [], isComplete: true };
			
			var startPosExists = levelVO.hasSector(startPos.sectorX, startPos.sectorY);
			var endPosExists = levelVO.hasSector(endPos.sectorX, endPos.sectorY);

			// WorldCreatorLogger.i("createPathBetween " + startPos + " " + endPos + " " + options.stage + " " + options.criticalPath + " / " + maxlen + ", dist: " + dist);

			let isComplete = function () {
				if (!startPosExists) return false;
				if (!endPosExists) return false;
				let stage = options.stage == WorldConstants.CAMP_STAGE_EARLY ? options.stage : null;
				let currentDistance = LevelStructureGenerator.getCurrentSectorDistance(worldVO, startPos, endPos, stage);
				return currentDistance > 0 && (maxlen < 0 || currentDistance <= maxlen)
			}
			
			if (isComplete()) {
				return { path: [], isComplete: true };
			}
			
			let validSectors = options.stage ? levelVO.getSectorsByStage(options.stage) : levelVO.sectors;
			
			let getConnectionPaths = function (s1, s2, allowDiagonals) {
				if (!s1 || !s2)
					return { paths: [], isValid: false, reason: "invalid positions" };
				if (s1.equals(s2))
					return { paths: [], isValid: true };
				var startDirections = PositionConstants.getDirectionsFrom(s1, s2, allowDiagonals);
				if (startDirections.length == 0) {
					return { paths: [], isValid: false, reason: "no directions" };
				}
				
				var frontier = [];
				var validPaths = [];
				var invalidPathReasons = [];
				var invalidPaths = [];
				for (let i = 0; i < startDirections.length; i++) {
					frontier.push({ currentPos: s1, currentDirection: startDirections[i], paths: [], len: 0 });
				}
				
				while (frontier.length > 0) {
					var current = frontier.shift();
					var currentPos = current.currentPos;
					var direction = current.currentDirection;
					var pathLength = PositionConstants.getDistanceInDirection(currentPos, s2, direction) + 1;
					var pathCandidate = { startPos: currentPos, dir: direction, len: pathLength };
					var validCheck = LevelStructureGenerator.isValidPath(levelVO, pathCandidate, null, options);
					if (validCheck.isValid) {
						var newPos = PositionConstants.getPositionOnPath(currentPos, direction, pathLength - 1);
						current.paths.push(pathCandidate);
						current.len += pathCandidate.len;
						if (newPos.equals(s2)) {
							validPaths.push(current);
						} else {
							var nextDirections = PositionConstants.getDirectionsFrom(currentPos, s2, allowDiagonals);
							for (let i = 0; i < nextDirections.length; i++) {
								frontier.push({ currentPos: newPos, currentDirection: nextDirections[i], paths: current.paths.slice(), len: current.len });
							}
						}
					} else {
						invalidPaths.push(pathCandidate);
						invalidPathReasons.push(pathCandidate.startPos + " " + PositionConstants.getDirectionName(pathCandidate.dir) + " " + pathCandidate.len + " " + validCheck.reason);
					}
				}
				
				if (validPaths.length == 0) {
					return { paths: [], isValid: false, reason: "no valid paths | invalid paths: " + invalidPathReasons.join(",") };
				}
				
				validPaths.sort(function (a, b) {
					return a.len - b.len;
				});
				
				return { paths: validPaths[0].paths, isValid: true };
			};
			
			let createConnectionPath = function (s1, s2, allowDiagonals) {
				let pathsResult = getConnectionPaths(s1, s2, allowDiagonals);
				
				if (pathsResult.isValid) {
					for (let i = 0; i < pathsResult.paths.length; i++) {
						// exit early if connection completed with partial path
						if (i > 0 && isComplete()) {
							break;
						}

						let path = pathsResult.paths[i];
						let pathResult = LevelStructureGenerator.createPath(levelVO, path.startPos, path.dir, path.len, true, options, connectionPointType);
						result.path = result.path.concat(pathResult.path);
					}
				} else {
					WorldCreatorLogger.w("couldn't create path between " + s1 + " and " + s2 + ", reason: " + pathsResult.reason);
					result.isComplete = false;
				}
			};
			
			var getClosestValid = function (validSectors, sector, allowDiagonals) {
				let result = null;
				var connectionPaths = null;
				var pathsResult = null;
				let i = 0;
				do {
					result = WorldCreatorHelper.getClosestSector(validSectors, sector, i);
					if (result) {
						pathsResult = getConnectionPaths(sector, result.position, allowDiagonals);
						connectionPaths = pathsResult.paths;
					}
					i++;
				} while (!connectionPaths && i < validSectors.length);
				return result;
			};
			
			var getNearestConnected = function (validSectors, position, targetSector, maxdist) {
				if (!levelVO.hasSector(position.sectorX, position.sectorY)) {
					return { position: position };
				}
				var connectedSectors = LevelStructureGenerator.getConnectedSectors(worldVO, position, validSectors, options.stage, maxdist);
				return WorldCreatorHelper.getClosestSector(connectedSectors.connected, targetSector);
			};
			
			var getPointData = function (validSectors, point, otherPoint, allowDiagonals, maxNearestConnectedDist) {
				var data = {};
				data.pos = point;
				if (validSectors.length > 0) {
					data.closestExisting = getClosestValid(validSectors, point, allowDiagonals);
					data.connectionPathsToCE = getConnectionPaths(point, data.closestExisting.position, allowDiagonals).paths;
					data.nearestConnected = getNearestConnected(validSectors, point, otherPoint, maxNearestConnectedDist);
				}
				return data;
			};
			
			var getTotalLength = function (paths) {
				if (!paths || paths.length <= 0) return 0;
				// several paths
				if (paths[0].len) return paths.reduce((sum, current) => sum + current.len, 0);
				// single path (array of sectors)
				return paths.length;
			};
			
			var getPathLength = function (path) {
				return path ? path.length : 0;
			};
			
			var options = options || this.getDefaultOptions();
			if (dist == 0) {
				this.createAddSector(result.path, levelVO, startPos, options);
				this.createAddSector(result.path, levelVO, endPos, options);
			} else if (dist == 1) {
				this.createAddSector(result.path, levelVO, startPos, options);
				this.createAddSector(result.path, levelVO, endPos, options);
			} else {
				var allowDiagonals = dist > maxlen / 2;
				
				// find important points and paths for both startPos and endPos (S)
				// - closest existing point (sector in validSectors closest to S, can be S itself)
				// - nearest connected (sector in validSectors that is connected to S, but closest to the other end point, can be null if S doesn't exist or is unconnected to anything else)
				var startPosData = getPointData(validSectors, startPos, endPos, allowDiagonals, dist);
				var endPosData = getPointData(validSectors, endPos, startPos, allowDiagonals, dist);
				
				// consider 3 alternative paths:
				// - direct
				var pathsDirect = getConnectionPaths(startPos, endPos, allowDiagonals).paths;
				var lenDirect = getTotalLength(pathsDirect);
				let maxIndirectLen = Math.max(lenDirect, maxlen);
				// - via existing: startPos -> startPosData.closestExisting (already created ->) endPosData.closestExisting -> endPos
				var pathBetweenExisting = startPosData.closestExisting && endPosData.closestExisting ?
					WorldCreatorRandom.findPath(worldVO, startPosData.closestExisting.position, endPosData.closestExisting.position, false, true, options.stage) : null;
				var pathsWithExisting = null;
				if (startPosData.connectionPathsToCE && endPosData.connectionPathsToCE) {
					pathsWithExisting = startPosData.connectionPathsToCE.concat(endPosData.connectionPathsToCE);
				}
				var isValidViaExisting = pathBetweenExisting && pathBetweenExisting.length > 0 && pathsWithExisting && pathsWithExisting.length > 0;
				var lenViaExisting = getTotalLength(pathsWithExisting) + getTotalLength(pathBetweenExisting);
				// - via nearest: startPos (already created ->) startPosData.nearestConnected -> endPosData.nearestConnected (already created- >) endPos
				var pathsBetweenNearest = null;
				if (startPosData.nearestConnected && endPosData.nearestConnected) {
					pathsBetweenNearest = getConnectionPaths(startPosData.nearestConnected.position, endPosData.nearestConnected.position, allowDiagonals).paths;
				}
				var pathFromStart = startPosExists && startPosData.nearestConnected ? WorldCreatorRandom.findPath(worldVO, startPos, startPosData.nearestConnected.position, false, true, options.stage) : [];
				var pathFromEnd = endPosExists && endPosData.nearestConnected ? WorldCreatorRandom.findPath(worldVO, endPos, endPosData.nearestConnected.position, false, true, options.stage) : [];
				var isValidBetweenNearest = startPosExists && endPosExists && startPosData.nearestConnected && endPosData.nearestConnected && pathsBetweenNearest && pathsBetweenNearest.length > 0;
				var lenBetweenNearest = getTotalLength(pathsBetweenNearest) + getPathLength(pathFromStart) + getPathLength(pathFromEnd);
				
				// make path via existing or nearest if they exist and are short enough, otherwise direct
				// WorldCreatorLogger.i("- lenDirect: " + lenDirect + ", lenViaExisting: " + lenViaExisting + ", lenBetweenNearest: " + lenBetweenNearest + ", max alternative len: " + maxIndirectLen + ", allowDiagonals: " + allowDiagonals);
				if (isValidBetweenNearest && lenBetweenNearest <= maxIndirectLen) {
					// WorldCreatorLogger.i("- use nearest: " + startPosData.nearestConnected.position + " - " + endPosData.nearestConnected.position);
					// WorldCreatorLogger.i(startPosData)
					// WorldCreatorLogger.i(pathFromStart)
					createConnectionPath(startPosData.nearestConnected.position, endPosData.nearestConnected.position, allowDiagonals);
				} else if (isValidViaExisting && lenViaExisting <= maxIndirectLen) {
					// WorldCreatorLogger.i("- use existing " + startPosData.closestExisting + " " + endPosData.closestExisting);
					createConnectionPath(startPos, startPosData.closestExisting.position, true);
					createConnectionPath(endPosData.closestExisting.position, endPos, true);
				} else {
					createConnectionPath(startPos, endPos, allowDiagonals);
				}
			}
			
			return result;
		},

		createRandomPaths: function (seed, pathSeed, levelVO, options, maxlen) {
			let l = levelVO.levelOrdinal;
			let pathRandomSeed = levelVO.sectors.length * 4 + l + pathSeed * 5;
			let s1 = seed + (l + 70) * pathRandomSeed;
			let s2 = seed * levelVO.levelOrdinal + 28381 + pathRandomSeed;
			let s3 = seed * 3 * pathRandomSeed * l + 55;
			
			let pathStartPoint = this.getPathStartPosition(s1, s2, levelVO, true, options);
			let pathStartPos = pathStartPoint.position.clone();

			let startDirection = this.getPathDirection(s1, s2, levelVO, pathStartPoint);

			let maxSectors = options.stage ? levelVO.numSectorsByStage[options.stage] : levelVO.numSectors;
			let existingSectors = options.stage ? levelVO.getNumSectorsByStage(options.stage) : levelVO.sectors.length;
			
			let minPathLength = levelVO.structureSettings.minPathLength;
			let maxPathLength = levelVO.structureSettings.maxPathLength;
			let maxLength = MathUtils.clamp(maxSectors - existingSectors, minPathLength, maxPathLength);

			if (maxLength > maxlen) {
				maxLength = maxlen;
			}

			let pathLength = WorldCreatorRandom.randomInt(s3, minPathLength, maxLength + 1);

			let getPath = function (params) {
				let len = MathUtils.clamp(params.len, minPathLength, maxLength);
				let connectionPointType = LevelStructureGenerator.getDefaultPathConnectionPointType(levelVO, len);
				return LevelStructureGenerator.getPathVO(levelVO, pathStartPos, startDirection, len, false, options, connectionPointType);
			};

			let getPaths = function (params) {
				return [ getPath(params) ];
			};

			let params = this.getRandomPathsOffset(levelVO, { len: [ pathLength, pathLength - 1, pathLength + 1, pathLength + 2 ] }, getPaths, options);
			let path = getPath(params);
			
			let connectionPointType = LevelStructureGenerator.getDefaultPathConnectionPointType(levelVO, path.len);
			return this.createPath(levelVO, path.startPos, path.dir, path.len, false, options, connectionPointType, 0, 1);
		},
		
		getPathVO: function (levelVO, startPos, direction, len, forceComplete, options, connectionPointType) {
			return { startPos: startPos, dir: direction, len: len, forceComplete: forceComplete, connectionPointType: connectionPointType };
		},
		
		getPathVOPositions: function (pathVO) {
			let result = [];
			for (var si = 0; si < pathVO.len; si++) {
				result.push(PositionConstants.getPositionOnPath(pathVO.startPos, pathVO.dir, si));
			}
			return result;
		},
		
		getPath: function (levelVO, startPos, direction, len, forceComplete, options, connectionPointType, shapeIndex, shapeLength) {
			if (len < 1) return { path: [], completed: false, isValid: false, reason: "too short" };

			let result = [];
			options = options || this.getDefaultOptions();
			let completed = true;
			let isValid = true;
			let reason = "";

			let isShapeEnd = !shapeLength || shapeIndex === 0 || shapeIndex === shapeLength - 1;
			
			for (let si = 0; si < len; si++) {
				let sectorPos = PositionConstants.getPositionOnPath(startPos, direction, si);
				sectorPos.level = levelVO.level;
				let completedLen = si + 1;
				let completedPercent = completedLen / len;
				
				// cancel path if invalid position
				let positionCheck = this.isValidSectorPosition(levelVO, sectorPos, options.stage, options, result);
				if (!positionCheck.isValid) {
					return { path: result, completed: false, isValid: false, reason: positionCheck.reason };
				}
				
				let sectorExists = levelVO.hasSector(sectorPos.sectorX, sectorPos.sectorY);

				if (sectorExists) {
					let isPathEnd = si == 0 || si == len - 1;

					if (isPathEnd) {
						result.push(sectorPos);
						continue;
					}

					if (forceComplete) {
						result.push(sectorPos);
						continue;
					}
						
					let existingSector = levelVO.getSector(sectorPos.sectorX, sectorPos.sectorY);

					if (!(isShapeEnd && isPathEnd) && options.allowNoOverlaps) {
						return { path: result, completed: false, isValid: false, reason: "allow no overlaps" };
					}

					if (!isShapeEnd && options.stage && existingSector.stage != options.stage && !options.canConnectToDifferentStage) {
						return { path: result, completed: false, isValid: false, reason: "existing sector has wrong stage" };
					}

					if (completedLen < 4 || completedPercent < 0.6) {
						return { path: result, completed: false, isValid: false, reason: "existing sector interrupts path too early" };
					}
					
					result.push(sectorPos);
					completed = false;
					break;
			}

				let sectorResult = this.canCreateSector(levelVO, sectorPos, options);
				
				if (sectorResult.result || sectorResult.exists) {
					result.push(sectorPos);
				} else {
					if (!sectorResult.result) {
						isValid = false;
						reason = "couldn't create sector " + sectorResult.reason;
					}
					completed = false;
					break;
				}
			}
			
			// check paths don't have too high average neighbour count (excluding start and end pos) (blocks parallel diagonals and some really crowded cross-paths)
			if (isValid && !forceComplete) {
				let totalNeighbours = 0;
				for (let i = 1; i < result.length - 1; i++) {
					totalNeighbours += WorldCreatorHelper.getNeighbourCount(levelVO, result[i], result);
				}
				let averageNeighbours = totalNeighbours / (result.length - 2);
				if (result.length > 5 && averageNeighbours > 3.5) {
					isValid = false;
					reason = "path has too many neighbours";
				}
				if (result.length > 3 && averageNeighbours > 4.5) {
					isValid = false;
					reason = "path has too many neighbours";
				}
			}
			
			return { path: result, completed: completed, isValid: isValid, reason: reason };
		},

		createPath: function (levelVO, startPos, direction, len, forceComplete, options, connectionPointType, shapeIndex, shapeLength) {
			if (len < 1) return { path: [], completed: false, reason: "too short" };

			options = options || this.getDefaultOptions();

			if (len != Math.round(len)) {
				debugger
				WorldCreatorLogger.w("non-integer length for path");
			}

			if (!connectionPointType) {
				WorldCreatorLogger.w("no connection point type defined for path");
			}
			
			let path = this.getPath(levelVO, startPos, direction, len, forceComplete, options, connectionPointType, shapeIndex, shapeLength);
			
			return this.createPathFromPath(levelVO, path, options, connectionPointType);
		},

		createPathFromPath: function (levelVO, path, options, connectionPointType) {
			if (!path.isValid) {
				return { path: [], completed: false, reason: "get path: " + path.reason };
			}

			let result = [];
			let completed = path.completed;

			let startPos = path.path[0];
			let len = path.path.length;

			for (let i = 0; i < path.path.length; i++) {
				let sectorPos = path.path[i];
				let sectorExists = levelVO.hasSector(sectorPos.sectorX, sectorPos.sectorY);

				if (sectorExists) {
					result.push(levelVO.getSector(sectorPos.sectorX, sectorPos.sectorY));
				} else {
					var sectorResult = this.createSector(levelVO, sectorPos, options);
					result.push(sectorResult.vo);
				}
			}

			if (path.path.length > 1) {
				let direction = PositionConstants.getDirectionFrom(startPos, path.path[1]);
				
				// add connection points
				for (var si = 0; si < path.path.length; si++) {
					let sectorPos = PositionConstants.getPositionOnPath(startPos, direction, si);
					sectorPos.level = levelVO.level;
					let connectionPoint = this.getConnectionPoint(connectionPointType, si, len, sectorPos, direction);
					this.addConnectionPoint(levelVO, sectorPos, connectionPoint);
				}
			}
			
			return { path: result, completed: completed };
		},
		
		connectNewPath: function (worldVO, levelVO, existingSectors, newSectors) {
			if (existingSectors.length < 1) return;
			if (newSectors.length < 1) return;
			let pathToCenter = WorldCreatorRandom.findPath(worldVO, newSectors[0].position, existingSectors[0].position, false, true);
			if (!pathToCenter) {
				let options = this.getDefaultOptions();
				let skip = 0;
				let attempts = 0;
				while (attempts < 10) {
					let pair = WorldCreatorHelper.getClosestPair(existingSectors, newSectors, skip);
					this.createPathBetween(worldVO, levelVO, pair[0].position, pair[1].position, -1, options);
					if (result.path && result.path.length > 0) {
						return;
					}
					skip++;
					attempts++;
				}
			}
		},
		
		connectLevelSectors: function (worldVO, levelVO, sectors, stage, errorOnFail) {
			var center = levelVO.campPosition != null ? levelVO.campPosition : levelVO.getExcursionStartPosition();
			var getConnectedSectors = function () {
				let res = LevelStructureGenerator.getConnectedSectors(worldVO, center, sectors, stage, 0);
				return res;
			};
			var stageName = (stage ? stage : "all");
			var division = getConnectedSectors();
			var attempts = 0;
			var options = this.getDefaultOptions({ stage: stage });
			var skip = 0;
			while (division.disconnected.length > 0 && division.connected.length > 0) {
				if (attempts > 99) {
					WorldCreatorLogger.i("disconnected sectors:");
					WorldCreatorLogger.i(division.disconnected.map(sector => sector.position))
					if (errorOnFail) {
						throw new Error("couldn't connect disconnected parts of level " + levelVO.level + " stage " + stageName);
					}
					break;
				}
			
				WorldCreatorLogger.i("connecting disconnected parts of level " + levelVO.level + " stage " + stageName + ", division " + division.connected.length + "-" + division.disconnected.length + ", center: " + center + ", skip: " + skip);
				var pair = WorldCreatorHelper.getClosestPair(division.connected, division.disconnected, skip);
				var pairDist = PositionConstants.getDistanceTo(pair[0].position, pair[1].position);
				let result = this.createPathBetween(worldVO, levelVO, pair[0].position, pair[1].position, -1, options);
				if (result.path && result.path.length > 0) {
					division = getConnectedSectors();
					skip = 0;
				} else {
					skip++;
				}
				attempts++;
			}
		},

		createGapFills: function (worldVO, levelVO) {
			let failedPairs = [];
			let isFailed = function (sector1, sector2) {
				for (let i = 0; i < failedPairs.length; i++) {
					if (failedPairs[i].sectors[0].position.equals(sector1.position) && failedPairs[i].sectors[1].position.equals(sector2.position)) return true;
					if (failedPairs[i].sectors[0].position.equals(sector2.position) && failedPairs[i].sectors[1].position.equals(sector1.position)) return true;
				}
				return false;
			}
			let getFurthestPair = function () {
				var furthestPathDist = 0;
				var furthestPair = [null, null];
				for (let i = 0; i < levelVO.sectors.length; i++) {
					var sector1 = levelVO.sectors[i];
					for (let j = i; j < levelVO.sectors.length; j++) {
						var sector2 = levelVO.sectors[j];
						if (sector1.stage != sector2.stage) continue;
						if (isFailed(sector1, sector2)) continue;
						let dist = PositionConstants.getDistanceTo(sector1.position, sector2.position);
						if (dist > 1 && dist < 3) {
							let path = WorldCreatorRandom.findPath(worldVO, sector1.position, sector2.position, false, true);
							var pathDist = path ? path.length : -1;
							if (pathDist > furthestPathDist) {
								furthestPathDist = pathDist;
								furthestPair = [sector1, sector2];
							}
						}
					}
				}
				return { sectors: furthestPair, pathDist: furthestPathDist, stage: furthestPair[0].stage };
			}

			let debugPair1 = new PositionVO(8, 7, 3);
			let debugPair2 = new PositionVO(8, 9, 2);
			
			// NOTE: getFurthestPair is a huge performance bottleneck (loops plus pathfinding), only a few tries
			let currentPair = getFurthestPair();
			let i = 0;
			while (currentPair.pathDist > 15 && i < 8) {
				let options = this.getDefaultOptions({ stage: currentPair.stage });
				let pathResult = this.createPathBetween(worldVO, levelVO, currentPair.sectors[0].position, currentPair.sectors[1].position, currentPair.pathDist - 1, options);
				log.i("- " + currentPair.sectors[0].position + " -> " + currentPair.sectors[1].position);
				if (pathResult.isComplete) {
					for (let j = 0; j < pathResult.path.length; j++) {
						pathResult.path[j].isFill = true;
					}
				} else {
					failedPairs.push(currentPair);
				}
				currentPair = getFurthestPair();
				i++;
				if (levelVO.sectors.length >= levelVO.maxSectors) break;
			}
		},
		
		createAddSector: function (arr, levelVO, sectorPos, options) {
			var sectorResult = this.createSector(levelVO, sectorPos, options);
			if (sectorResult.vo) {
				arr.push(sectorResult.vo);
			}
		},
		
		canCreateSector: function (levelVO, sectorPos, options) {
			sectorPos.normalize();
			options = options || this.getDefaultOptions();
			let stage = options.stage;
			let sectorVO = levelVO.getSector(sectorPos.sectorX, sectorPos.sectorY);
			
			let exists = sectorVO != null;
			let result = false;
			
			if (!exists) {
				let validResult = this.isValidSectorPosition(levelVO, sectorPos, stage, options);
				if (validResult.isValid) {
					result = true;
				} else {
					result = false;
					levelVO.invalidPositions.push(sectorPos);
				}
			}
			
			return { result: result, exists: exists, vo: sectorVO };
		},

		createSector: function (levelVO, sectorPos, options) {
			sectorPos.normalize();
			options = options || this.getDefaultOptions();
			let stage = options.stage || this.getDefaultStage(levelVO, sectorPos);
			let created = false;
			
			let check = this.canCreateSector(levelVO, sectorPos, options);
			let sectorVO = check.vo;
			if (check.result) {
				let vo = this.makeSector(levelVO, sectorPos, stage);
				created = levelVO.addSector(vo);
				if (created) {
					sectorVO = vo;
					levelVO.resetPaths();
				}
			}
			
			return { isNew: created, vo: sectorVO };
		},

		makeSector: function (levelVO, sectorPos, stage) {
			let vo = new SectorVO(sectorPos);
			// if (sectorPos.sectorX == -10 && sectorPos.sectorY == 7) debugger
			vo.stage = stage;
			vo.isCamp = levelVO.isCampPosition(sectorPos);
			vo.isPassageUp = levelVO.isPassageUpPosition(sectorPos);
			vo.passageUpType = levelVO.getPassageUpType(sectorPos);
			vo.isPassageDown = levelVO.isPassageDownPosition(sectorPos);
			vo.passageDownType = levelVO.getPassageDownType(sectorPos);
			return vo;
		},
		
		addConnectionPoint: function (levelVO, pos, point) {
			if (!point) return;
			if (!levelVO.hasSector(pos.sectorX, pos.sectorY)) return;

			// remove directions away from level middle if already too far
			let excursionStartPosition = levelVO.getExcursionStartPosition();
			let maxdist = Math.min(this.getMaxExcursionDistance(levelVO) - 5, 20);
			let dist = PositionConstants.getDistanceTo(pos, excursionStartPosition);
			if (dist > maxdist) {
				let directionToStart = PositionConstants.getDirectionFrom(pos, excursionStartPosition);
				let allowedDirections = [ 
					directionToStart, 
					PositionConstants.getNextClockWise(directionToStart, true), 
					PositionConstants.getNextCounterClockWise(directionToStart, true)
				];
				
				let directionArrays = [ point.dirs, point.dirs2 ];
				for (let a = 0; a < directionArrays.length; a++) {
					let array = directionArrays[a];
					let indicesToRemove = [];
					for (let i = 0; i < array.length; i++) {
						let direction = array[i];
						let isAllowed = allowedDirections.indexOf(direction) >= 0;
						if (!isAllowed) indicesToRemove.push(i);
					}

					for (let i = indicesToRemove.length - 1; i >= 0; i--) {
						array.splice(indicesToRemove[i], 1);
					}
				}
			}

			if (point.dirs.length == 0 && point.dirs2.length == 0) return;

			// skip if neighbours have connection points
			for (let i = 0; i < levelVO.allConnectionPoints.length; i++) {
				let existingPoint = levelVO.allConnectionPoints[i];
				if (PositionConstants.getDistanceTo(pos, existingPoint.position) < 2) return;
			}
			
			levelVO.addPendingConnectionPoint(point);
		},

		isValidPaths: function (levelVO, paths, stage, options) {
			for (let i = 0; i < paths.length; i++) {
				if (!this.isValidPath(levelVO, paths[i], stage, options)) return false;
			}
			return true;
		},
		
		isValidPath: function (levelVO, path, stage, options) {
			options = options || {};

			var startPos = path.startPos;
			var direction = path.dir;
			var pathPositions = this.getPathVOPositions(path);
			for (var si = 0; si < path.len; si++) {
				let sectorPos = PositionConstants.getPositionOnPath(startPos, direction, si);
				sectorPos.level = levelVO.level;
				if (levelVO.hasSector(sectorPos.sectorX, sectorPos.sectorY)) {
					var sector = levelVO.getSector(sectorPos.sectorX, sectorPos.sectorY);
					if (options.stage && sector.stage != options.stage) {
						return { isValid: false, reason: "contains sector of wrong stage: " + sector.stage + " " + sector.position };
					}
				}
				var validCheck = this.isValidSectorPosition(levelVO, sectorPos, stage, options, pathPositions);
				if (validCheck.isBlocked) {
					return { isValid: false, reason: validCheck.reason };
				}
			}
			return { isValid: true };
		},
		
		isValidSectorPosition: function (levelVO, sectorPos, stage, options, pendingSectors) {
			// exception for critical paths
			if (options.criticalPath) return { isValid: true, isBlocked: false };
			
			// blocking features
			if (WorldCreatorHelper.containsBlockingFeature(sectorPos, this.currentFeatures, true)) {
				return { isValid: false, isBlocked: true, reason: "feature" };
			}
			
			pendingSectors = pendingSectors || [];
				
			// blocking stage elements
			if (stage) {
				for (let levelStage in levelVO.stageCenterPositions) {
					if (levelStage == stage) continue;
					let positions = levelVO.stageCenterPositions[levelStage];
					for (let i = 0; i < positions.length; i++) {
						var pos = positions[i];
						var dist = PositionConstants.getDistanceTo(pos, sectorPos);
						if (dist < 2) {
							return { isValid: false, isBlocked: true, reason: "stage" };
						}
					}
				}
			}
			
			// too many neighbours for this position or neighbouring position
			var directions = PositionConstants.getLevelDirections();
			var getNumSharedNeighbours = function (pos, neighbours) {
				var sum = 0;
				for (var d in directions) {
					var direction = directions[d];
					var n = neighbours[direction];
					if (n && !n.position.equals(pos)) {
						if (PositionConstants.getDistanceTo(pos, n.position) <= 1) {
							sum++;
						}
					}
				}
				return sum;
			};
			var checkNeighbours = function (pos) {
				var posneighbours = WorldCreatorHelper.getNeighbours(levelVO, pos, pendingSectors);
				var numNeighbours = WorldCreatorHelper.getNeighbourCount(levelVO, pos, pendingSectors);
				if (!pos.equals(sectorPos)) {
					var dir = PositionConstants.getDirectionFrom(pos, sectorPos);
					if (!posneighbours[dir]) {
						numNeighbours++;
						posneighbours[dir] = { position: sectorPos };
					}
				}
				if (numNeighbours <= 4) return { isValid: true, pos: pos, numNeighbours: numNeighbours, neighbours: posneighbours };
				if (numNeighbours >= 7) return { isValid: false, pos: pos, numNeighbours: numNeighbours, neighbours: posneighbours };
				// count the number of "ends" aka neighbours n of pos (INCLUDING sectorPos) that are also neighbours with MAX 1 of the neighbours of n (no path around pos to them)
				// if numends is > 2, pos is ok, otherwise too crowded
				var numends = 0;
				for (var d in directions) {
					var direction = directions[d];
					var n = posneighbours[direction];
					if (n) {
						var overlap = getNumSharedNeighbours(n.position, posneighbours);
						if (overlap < 2) {
							numends++;
						}
					}
				}
				if (pos.equals(sectorPos)) numends += getNumSharedNeighbours(sectorPos, posneighbours);
				var isValid = numends > 2;
				return { isValid: isValid, pos: pos, neighbours: posneighbours, numNeighbours: numNeighbours, numends: numends };
			};
			var ncheck = checkNeighbours(sectorPos);
			if (!ncheck.isValid) {
				return { isValid: false, isBlocked: true, reason: "blocking neighbours " + ncheck.numNeighbours + " " + ncheck.numends };
			}
			
			var neighbours = WorldCreatorHelper.getNeighbours(levelVO, sectorPos, pendingSectors);
			for (var d in directions) {
				var direction = directions[d];
				var neighbour = neighbours[direction];
				if (neighbour) {
					var ncheck = checkNeighbours(neighbour.position);
					if (!ncheck.isValid) {
						return { isValid: false, isBlocked: true, reason: "neighbour has blocking neighbours " + neighbour.position + " " + ncheck.numNeighbours + " " + ncheck.numends + " | " + pendingSectors.join(",") };
					}
				}
			}
			
			// too far from entrance
			var maxdist = this.getMaxExcursionDistance(levelVO);
			var dist = PositionConstants.getDistanceTo(sectorPos, levelVO.getExcursionStartPosition());
			if (dist > maxdist) return { isValid: false, isBlocked: false, reason: "excursion length " + dist + "/" + maxdist };
			
			return { isValid: true, isBlocked: false };
		},
		
		isPreferredSectorPosition: function (levelVO, sectorPos) {
			let sectorVO = levelVO.getSectorByPos(sectorPos);
			
			if (levelVO.campPosition) {
				// non-preferred: sectors that are between entrance passage and camp position (keep path from entrance to camp simple)
				let passage1Position = levelVO.getEntrancePassagePosition();
				if (passage1Position) {
					let distanceToCamp = PositionConstants.getDistanceTo(levelVO.campPosition, sectorPos);
					let distanceToEntrance = PositionConstants.getDistanceTo(passage1Position, sectorPos);
					let distanceEntranceToCamp = PositionConstants.getDistanceTo(passage1Position, levelVO.campPosition);
					let distanceToEntranceThreshold = Math.max(distanceEntranceToCamp, 3);
					let distanceToCampThreshold = Math.max(distanceEntranceToCamp * 1.25, 3);
					if (distanceToEntrance < distanceToEntranceThreshold && distanceToCamp < distanceToCampThreshold) {
						return false;
					}
				}
			}
			
			return true;
		},
		
		getConnectedSectors: function (worldVO, point, sectors, stage, maxdist) {
			let result = { connected: [], disconnected: [] };
			if (!point || !worldVO.getLevel(point.level).hasSector(point.sectorX, point.sectorY)) return result;
			var knownConnectedPos = [];
			var savedByDist = 0;
			var savedByKnown = 0;
			// NOTE: WorldCreatorRandom.findPath can utilize caching more efficiently when starting from long paths, and sectors added late are more likely to be far from things
			for (let i = sectors.length - 1; i >= 0; i--) {
				var sector = sectors[i];
				var dist = PositionConstants.getDistanceTo(sector.position, point);
				if (dist <= 1) {
					result.connected.push(sector);
					savedByDist++;
					continue;
				}
				if (maxdist && dist > maxdist) {
					savedByDist++;
					continue;
				}
				if (knownConnectedPos.indexOf(sector.position) >= 0) {
					result.connected.push(sector);
					savedByKnown++;
					continue;
				}
				let path = WorldCreatorRandom.findPath(worldVO, sector.position, point, false, true, stage, true);
				if (path && path.length > 0) {
					result.connected.push(sector);
					for (var p = 0; p < path.length; p++) {
						if (knownConnectedPos.indexOf(path[p]) < 0) {
							knownConnectedPos.push(path[p]);
						}
					}
					continue;
				}
				result.disconnected.push(sector);
			}
			return result;
		},

		getCurrentSectorDistance: function (worldVO, pos1, pos2, stage) {
			let path = WorldCreatorRandom.findPath(worldVO, pos1, pos2, false, true, stage);
			if (!path || path.length == 0) return -1;
			return path.length;
		},

		areSectorsConnected: function (worldVO, pos1, pos2) {
			return this.getCurrentSectorDistance(worldVO, pos1, pos2) >= 0;
		},
		
		getPathDirection: function (s1, s2, levelVO, startPoint) {
			let possibleDirections = this.getPossiblePathDirections(s1, s2, levelVO, startPoint, 1, 1);

			let dirI = WorldCreatorRandom.randomInt(s1, 0, possibleDirections.length);
			let result = possibleDirections[dirI];

			return result;
		},

		getPossiblePathDirections: function (s1, s2, levelVO, startPoint, diagonalModifier, secondaryModifier) {
			let possibleDirections = [];

			if (startPoint.dirs) {
				possibleDirections = this.getPossiblePathDirectionsFromConnectionPoint(s1, s2, startPoint, levelVO, diagonalModifier, secondaryModifier);
			} else {
				let isDiagonal = WorldCreatorRandom.randomBool(s2, levelVO.structureSettings.diagonalRate);
				possibleDirections = PositionConstants.getLevelDirections(!isDiagonal);
			}

			return possibleDirections;
		},

		getPossiblePathDirectionsFromConnectionPoint: function (s1, s2, connectionPoint, levelVO, diagonalModifier, secondaryModifier) {
			diagonalModifier = diagonalModifier || 1;
			
			let result = [];

			let levelDiagonalRate = levelVO.structureSettings.diagonalRate;
			let levelOrthogonalRate = 1 - levelDiagonalRate;

			let bestProbability = -1;
			let bestProbabilityDirection = PositionConstants.DIRECTION_NONE;

			let checkDirections = function (dirs, randomSeed, baseProbability, contextDiagonalModifier, contextModifier) {
				for (let i = 0; i < dirs.length; i++) {
					let dir = dirs[i];
					let isDiagonal = PositionConstants.isDiagonal(dir);
					let levelDirectionModifier = isDiagonal ? levelDiagonalRate : levelOrthogonalRate;
					let contextDirectionlModifier = isDiagonal ? contextDiagonalModifier : 1;

					let probability = baseProbability * levelDirectionModifier * contextDirectionlModifier * contextModifier;
					let includeDirection = WorldCreatorRandom.randomBool(randomSeed + i, probability);
					if (includeDirection) result.push(dir);

					if (probability > bestProbability) {
						bestProbability = probability;
						bestProbabilityDirection = dir;
					}
				}
			}

			let primaryModifier = 1;
			checkDirections(connectionPoint.dirs, s1, 1, diagonalModifier, primaryModifier);

			let secondaryBaseProbability = MathUtils.map(levelVO.structureSettings.symmetry, 0, 1, 0.5, 0);
			if (result.length === 0) secondaryBaseProbability += 0.25;
			let secondaryDigonalModifier = diagonalModifier * 0.5;
			checkDirections(connectionPoint.dirs2, s2, secondaryBaseProbability, secondaryDigonalModifier, secondaryModifier);

			if (result.length == 0) {
				result.push(bestProbabilityDirection);
			}

			return result;
		},
		
		getConnectionPoint: function (type, pathi, pathlen, sectorPos, pathdir) {
			if (!type) return null;
			let dirs = [];
			let dirs2 = [];
			let oppositeDir = PositionConstants.getOppositeDirection(pathdir);

			let isPositiveDirection = PositionConstants.isPositiveDirection(pathdir);

			// round in in the same direction even when path direction is different to get matching connection points on opposite sides of even-sided rectangles
			let roundMiddle = (i) => isPositiveDirection ? Math.floor(i) : Math.ceil(i);
			let roundSecondaryMiddle = (i, isFirst) => isFirst ? Math.ceil(i) : Math.floor(i); 

			let maxIndex = pathlen - 1;

			let isStart = pathi == 0;
			let isEnd = pathi == maxIndex;
			let isMiddle = pathi == roundMiddle(maxIndex / 2);

			let isSecondaryMiddle = pathi == roundSecondaryMiddle(maxIndex / 4, true) || pathi == roundSecondaryMiddle(maxIndex / 4 * 3, false);

			switch (type) {
				case WorldCreatorConstants.CONNECTION_POINTS_PATH_END:
					if (isEnd) {
						dirs.push(pathdir);
						dirs.push(PositionConstants.getNextClockWise(pathdir));
						dirs.push(PositionConstants.getNextCounterClockWise(pathdir));
						dirs2.push(PositionConstants.getNextClockWise(pathdir, true));
						dirs2.push(PositionConstants.getNextCounterClockWise(pathdir, true));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					break;

				case WorldCreatorConstants.CONNECTION_POINTS_PATH_START:
					if (isStart) {
						dirs.push(oppositeDir);
						dirs.push(PositionConstants.getNextClockWise(oppositeDir));
						dirs.push(PositionConstants.getNextCounterClockWise(oppositeDir));
						dirs2.push(PositionConstants.getNextClockWise(oppositeDir, true));
						dirs2.push(PositionConstants.getNextCounterClockWise(oppositeDir, true));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					break;

				case WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS:
					return this.getConnectionPoint(WorldCreatorConstants.CONNECTION_POINTS_PATH_END, pathi, pathlen, sectorPos, pathdir)
						|| this.getConnectionPoint(WorldCreatorConstants.CONNECTION_POINTS_PATH_START, pathi, pathlen, sectorPos, pathdir);
					break;

				case WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE:
					if ((isMiddle && pathlen >= 5)) {
						dirs.push(PositionConstants.getNextClockWise(pathdir));
						dirs.push(PositionConstants.getNextCounterClockWise(pathdir));
						dirs2.push(PositionConstants.getNextClockWise(pathdir, true));
						dirs2.push(PositionConstants.getNextCounterClockWise(pathdir, true));
						dirs2.push(PositionConstants.getNextClockWise(oppositeDir, true));
						dirs2.push(PositionConstants.getNextCounterClockWise(oppositeDir, true));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					break;

				case WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE2:
					if (isSecondaryMiddle && pathlen >= 9) {
						dirs.push(PositionConstants.getNextClockWise(pathdir));
						dirs.push(PositionConstants.getNextCounterClockWise(pathdir));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					break;


				case WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL:
					return this.getConnectionPoint(WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE, pathi, pathlen, sectorPos, pathdir)
						|| this.getConnectionPoint(WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS, pathi, pathlen, sectorPos, pathdir);

				case WorldCreatorConstants.CONNECTION_POINTS_PATH_EXTRA:
					return this.getConnectionPoint(WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE, pathi, pathlen, sectorPos, pathdir)
						|| this.getConnectionPoint(WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE2, pathi, pathlen, sectorPos, pathdir)
						|| this.getConnectionPoint(WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS, pathi, pathlen, sectorPos, pathdir);

				case WorldCreatorConstants.CONNECTION_POINTS_PATH_CW:
					var cw = PositionConstants.getNextClockWise(pathdir);
					if (isEnd) {
						dirs.push(pathdir);
						dirs.push(cw);
						dirs2.push(PositionConstants.getNextClockWise(cw, true));
						dirs2.push(PositionConstants.getNextCounterClockWise(cw, true));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					if (isMiddle) {
						dirs.push(cw);
						dirs2.push(PositionConstants.getNextClockWise(cw, true));
						dirs2.push(PositionConstants.getNextCounterClockWise(cw, true));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					break;

				case WorldCreatorConstants.CONNECTION_POINTS_PATH_CCW:
					var ccw = PositionConstants.getNextCounterClockWise(pathdir);
					if (isEnd) {
						dirs.push(pathdir);
						dirs.push(ccw);
						dirs2.push(PositionConstants.getNextClockWise(ccw, true));
						dirs2.push(PositionConstants.getNextCounterClockWise(ccw, true));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					if (isMiddle) {
						dirs.push(ccw);
						dirs2.push(PositionConstants.getNextClockWise(ccw, true));
						dirs2.push(PositionConstants.getNextCounterClockWise(ccw, true));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					break;

				case WorldCreatorConstants.CONNECTION_POINTS_PATH_CONTINUE:
					if (isEnd) {
						dirs.push(pathdir);
						dirs2.push(PositionConstants.getNextClockWise(pathdir, true));
						dirs2.push(PositionConstants.getNextCounterClockWise(pathdir, true));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					if (isStart) {
						dirs.push(oppositeDir);
						dirs2.push(PositionConstants.getNextClockWise(oppositeDir, true));
						dirs2.push(PositionConstants.getNextCounterClockWise(oppositeDir, true));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					break;

				case WorldCreatorConstants.CONNECTION_POINTS_PATH_T:
					if (isEnd) {
						dirs.push(PositionConstants.getNextClockWise(pathdir));
						dirs.push(PositionConstants.getNextCounterClockWise(pathdir));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					if (isStart) {
						dirs.push(PositionConstants.getNextClockWise(oppositeDir));
						dirs.push(PositionConstants.getNextCounterClockWise(oppositeDir));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					break;

				case WorldCreatorConstants.CONNECTION_POINTS_PATH_Y:
					if (isEnd) {
						dirs.push(PositionConstants.getNextClockWise(pathdir, true));
						dirs.push(PositionConstants.getNextCounterClockWise(pathdir, true));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					if (isStart) {
						dirs.push(PositionConstants.getNextClockWise(oppositeDir, true));
						dirs.push(PositionConstants.getNextCounterClockWise(oppositeDir, true));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					return this.getConnectionPoint(WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE, pathi, pathlen, sectorPos, pathdir);

				case WorldCreatorConstants.CONNECTION_POINTS_PATH_X:
					if (isEnd) {
						dirs.push(PositionConstants.getNextClockWise(pathdir, true));
						dirs.push(PositionConstants.getNextCounterClockWise(pathdir, true));
						dirs.push(PositionConstants.getOppositeDirection(PositionConstants.getNextClockWise(pathdir, true)));
						dirs.push(PositionConstants.getOppositeDirection(PositionConstants.getNextCounterClockWise(pathdir, true)));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					if (isStart) {
						dirs.push(PositionConstants.getNextClockWise(oppositeDir, true));
						dirs.push(PositionConstants.getNextCounterClockWise(oppositeDir, true));
						dirs.push(PositionConstants.getOppositeDirection(PositionConstants.getNextClockWise(oppositeDir, true)));
						dirs.push(PositionConstants.getOppositeDirection(PositionConstants.getNextCounterClockWise(oppositeDir, true)));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					return this.getConnectionPoint(WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE, pathi, pathlen, sectorPos, pathdir);

				default:
					WorldCreatorLogger.w("unknown path connection point type: " + type);
					return null;
			}
		},
		
		getPathConnectionPointType: function (rectConnectionPointType) {
			if (!rectConnectionPointType) return null;
			switch (rectConnectionPointType) {
				case WorldCreatorConstants.CONNECTION_POINTS_RECT_CORNERS:
					return WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS;
					
				case WorldCreatorConstants.CONNECTION_POINTS_RECT_MIDDLE:
					return WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE;
					
				case WorldCreatorConstants.CONNECTION_POINTS_RECT_OUTER:
					return WorldCreatorConstants.CONNECTION_POINTS_PATH_CCW;
					
				case WorldCreatorConstants.CONNECTION_POINTS_RECT_INNER:
					return WorldCreatorConstants.CONNECTION_POINTS_PATH_CW;
					
				case WorldCreatorConstants.CONNECTION_POINTS_RECT_ALL:
					return WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL;
					
				case WorldCreatorConstants.CONNECTION_POINTS_RECT_EXTRA:
					return WorldCreatorConstants.CONNECTION_POINTS_PATH_EXTRA;

				case WorldCreatorConstants.CONNECTION_POINTS_RECT_DIAGONAL:
					return WorldCreatorConstants.CONNECTION_POINTS_PATH_X;

				default:
					WorldCreatorLogger.w("unknown rectangle connection point type: " + rectConnectionPointType);
					return null;
			}
		},

		getDefaultPathConnectionPointType: function (levelVO, len) {
			let density = levelVO.structureSettings.density;

			let extraPointsThreshold = MathUtils.map(density, 0, 1, 25, 9);
			if (len >= extraPointsThreshold) return WorldCreatorConstants.CONNECTION_POINTS_PATH_EXTRA;

			let middlePointsThreshold = MathUtils.map(density, 0, 1, 11, 5);
			if (len >= middlePointsThreshold) return WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL;

			return WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS;
		},

		getDefaultRectangleConnectionPointType: function (levelVO, sideLen) {
			let density = levelVO.structureSettings.density;

			let extraPointsThreshold = MathUtils.map(density, 0, 1, 29, 9);
			if (sideLen >= extraPointsThreshold) return WorldCreatorConstants.CONNECTION_POINTS_RECT_EXTRA;

			let middlePointsThreshold = MathUtils.map(density, 0, 1, 13, 5);
			if (sideLen >= middlePointsThreshold) return WorldCreatorConstants.CONNECTION_POINTS_RECT_ALL;

			return WorldCreatorConstants.CONNECTION_POINTS_RECT_CORNERS;
		},
		
		getCentralStructureOffset: function (levelVO, pois, params, getPathsFunc) {
			let maxoffset = 10;

			pois = pois || [];
			
			let scoreOptions = { pois: pois };

			let scoreOffset = function (x, y, p) {
				let paths = getPathsFunc(x, y, p);
				let score = LevelStructureGenerator.getCentralStructurePathsScore(levelVO, paths, scoreOptions);
				if (x === 0 && y === 0) score += 1;
				return score;
			};

			let positions = PositionConstants.getAllPositionsInArea(null, maxoffset);

			let paramCombinations = this.getParamCombinations(params);

			let candidates = [];

			for (let i = 0; i < positions.length; i++) {
				let pos = positions[i];
				for (let j = 0; j < paramCombinations.length; j++) {
					candidates.push({ sectorX: pos.sectorX, sectorY: pos.sectorY, params: paramCombinations[j] })
				}
			}

			let bestScore = -99;
			let result = { x: 0, y: 0, params: {} };

			for (let i = 0; i < candidates.length; i++) {
				let candidate = candidates[i];
				let score = scoreOffset(candidate.sectorX, candidate.sectorY, candidate.params);
				if (score > bestScore) {
					result.x = candidate.sectorX;
					result.y = candidate.sectorY;
					result.params = candidate.params;
					bestScore = score;
				}
			}

			return result;
		},

		// options:
		// - stage
		getRandomPathsOffset: function (levelVO, params, getPathsFunc, options) {
			let candidates = this.getParamCombinations(params);

			let scoreCandidate = function (params) {
				let paths = getPathsFunc(params);
				return LevelStructureGenerator.getRandomPathsScore(levelVO, paths, options);
			};

			let bestScore = -99;
			let result = candidates[0];

			for (let i = 0; i < candidates.length; i++) {
				let candidate = candidates[i];
				let score = scoreCandidate(candidate);
				if (score > bestScore) {
					result = candidate;
					bestScore = score;
				}
			}

			result.score = bestScore;

			return result;
		},

		getParamCombinations: function (params) {
			params = params || {};

			let paramCombinations = [ {} ];

			let paramNames = Object.keys(params);
			for (let paramName of paramNames) {
				let newResult = [];
				for (let paramCombination of paramCombinations) {
					for (let value of params[paramName]) {
						let newCombination = { ...paramCombination, [paramName]: value };
						newResult.push(newCombination);
					}
				}

				paramCombinations = newResult; 
			}

			return paramCombinations;
		},

		// calculates a score for a set of potential paths (sectors) to add to the level, used for comparing alternatives (highest score is best)
		// paths: array of PathVO
		// options:
		// - pois: array of PositionVO that the paths should overlap (if any defined, at least one is required)
		getCentralStructurePathsScore: function (levelVO, paths, options) {
			let pois = options.pois || [];

			let countPoisOnPaths = function (paths) {
				let count = 0;
				for (let p = 0; p < pois.length; p++) {
					let poi = pois[p];
					
					let maxPOIScore = 0;
					for (let i = 0; i < paths.length; i++) {
						let path = paths[i];
						if (PositionConstants.isOnPath(poi, path.startPos, path.dir, path.len)) {
							// in on path, count one
							maxPOIScore = Math.max(maxPOIScore, 1);
						} else if (PositionConstants.getIndexOnPath(poi, path.startPos, path.dir, path.len) !== undefined) {
							// if on extended path, count half
							maxPOIScore = Math.max(maxPOIScore, 0.5);
						}
					}

					count += maxPOIScore;
				}

				return count || 0;
			};

			let scoreForExistingStructure = function (paths) {
				let score = 0;

				if (levelVO.sectors.length === 0) return score;

				let numExistingSectors = 0;
				let numAlignedSectors = 0;
				let numCrossings = 0; 

				for (let i = 0; i < paths.length; i++) {
					let path = paths[i];

					let continuousOverlap = 0;
					let maxContinuousOverlap = 0;

					let crossingsTracker = [ ];
					let numExistingSectorsOnExtendedPath  = 0;

					for (let j = 0; j < path.len; j++) {
						let pos = PositionConstants.getPositionOnPath(path.startPos, path.dir, j);

						let hasSector = levelVO.hasSector(pos.sectorX, pos.sectorY);
						
						if (hasSector) {
							numExistingSectors++;
							continuousOverlap++;
							if (continuousOverlap > maxContinuousOverlap) maxContinuousOverlap = continuousOverlap;
						} else {
							score -= LevelStructureGenerator.getPositionAwkwardnessScore(levelVO, pos);
						}

						let existingConnectionPoints = levelVO.getPendingConnectionPoints();
						for (let c = 0; c < existingConnectionPoints.length; c++) {
							if (PositionConstants.getPositionAlignment(pos, existingConnectionPoints[c].position)) {
								numAlignedSectors++;
								break;
							}
						}

						crossingsTracker.push(hasSector);
						if (crossingsTracker.length > 3) crossingsTracker.shift();

						if (crossingsTracker.length == 3 && !crossingsTracker[0] && crossingsTracker[1] && !crossingsTracker[2]) {
							numCrossings++;
						}
					}

					for (let j = -20; j < path.len + 20; j++) {
						if (j >= 0 && j < path.len) continue;
						let pos = PositionConstants.getPositionOnPath(path.startPos, path.dir, j);
						let hasSector = levelVO.hasSector(pos.sectorX, pos.sectorY);
						if (hasSector) numExistingSectorsOnExtendedPath++;
					}

					// - continuous path overlap with existing sectors
					if (maxContinuousOverlap > 2) score += maxContinuousOverlap;

					// - existing sectors aligned with path
					if (numExistingSectorsOnExtendedPath > 1) score++;
					if (numExistingSectorsOnExtendedPath > 6) score++;
				}

				// - connects or easy to connect to something existing
				if (numExistingSectors > 0 || numAlignedSectors) score++;
				if (numAlignedSectors > 1) score++;

				// - crossings (crossing across existing path instead of following it)
				if (numCrossings > 2) score -= 1;

				return score || 0;
			};

			let scoreForPOIAlignment = function (paths) {
				let score = 0;

				for (let i = 0; i < paths.length; i++) {
					let path = paths[i];

					for (let j = 0; j < path.len; j++) {
						let pos = PositionConstants.getPositionOnPath(path.startPos, path.dir, j);

						if (pois.length > 1) {
							for (let p = 0; p < pois.length; p++) {
								let poi = pois[p];
								
								// - pois not on path but aligned so it would be easy to connect them (if trying to align to multiple poi, otherwise the one needs to be on the path period)
								score += PositionConstants.getPositionAlignment(pos, poi);

								// pois awkwardly close to the shape but not on it
								let distance = PositionConstants.getDistanceTo(pos, poi);
								if (distance > 0 && distance < 3) score -= 1;
							}
						}
					}
				}

				return score || 0;
			};

			let scoreForLevelFeatures = function (paths) {
				let score = 0;

				let totalDistance = 0;
				let numPositions = 0;

				for (let i = 0; i < paths.length; i++) {
					let path = paths[i];

					for (let j = 0; j < path.len; j++) {
						let pos = PositionConstants.getPositionOnPath(path.startPos, path.dir, j);

						numPositions++;
						
						// blocking features
						score -= WorldCreatorHelper.containsBlockingFeature(pos, LevelStructureGenerator.currentFeatures, true) ? 1 : 0;

						// distance to center
						let distance = PositionConstants.getDistanceTo(pos, levelVO.levelCenterPosition);
						totalDistance += distance;

						// alignment to key points
						if (pos.sectorX === 0) score++;
						if (pos.sectorY === 0) score++;
						if (pos.sectorX % 10 === 0) score++;
						if (pos.sectorY % 10 === 0) score++;
					}
				}

				// distance to level center pos
				let averageDistance = Math.round(totalDistance / numPositions);
				score -= averageDistance / 1000;

				return score || 0;
			};

			let score = 0;

			// - primary: number of POIs on paths
			score += countPoisOnPaths(paths) * 1000;

			if (pois.length > 0 && score <= 0) return score;

			// - secondary: how paths align to pois not ON paths (for paths trying to hit multiple pois)
			if (pois.length > 1) score += scoreForPOIAlignment(paths);

			// - secondary: how paths align to existing structure (sectors)
			score += scoreForExistingStructure(paths);

			// - secondary: how paths align to level features (blocking features, level center position and bounds)
			score += scoreForLevelFeatures(paths);

			return score;
		},

		// paths: array of PathVO
		getRandomPathsScore: function (levelVO, paths, options) {
			let score = 0;

			let densityScoreModifier = 1 - levelVO.structureSettings.density;

			let getConnectionPointsScore = function () {
				let score = 0;

				let connectionPoints = levelVO.getPendingConnectionPoints();

				let numMatchingConnectionPoints = 0;

				for (let i = 0; i < paths.length; i++) {
					let path = paths[i];
					let direction = path.dir;

					for (let j = 0; j < path.len; j++) {
						let pos = PositionConstants.getPositionOnPath(path.startPos, path.dir, j);

						for (let k = 0; k < connectionPoints.length; k++) {
							let connectionPoint = connectionPoints[k];
							let distance = PositionConstants.getDistanceTo(pos, connectionPoint.position);
							
							if (distance === 0 && connectionPoint.dirs.indexOf(direction) >= 0) numMatchingConnectionPoints += 1;
							if (distance === 0 && connectionPoint.dirs2.indexOf(direction) >= 0) numMatchingConnectionPoints += 1;

							let isClose = distance > 0 && distance < 2;
							if (isClose) score -= 1;
							if (isClose && i > 0 && i < path.len - 1) score -= 1;
						}
						
					}
				}

				if (numMatchingConnectionPoints > 0) score++;
				if (numMatchingConnectionPoints > 1) score++;

				return score || 0;
			};

			let getSectorPositionScore = function () {
				let score = 0;
				for (let i = 0; i < paths.length; i++) {
					let path = paths[i];
					let validCheck = LevelStructureGenerator.isValidPath(levelVO, path, path.stage, options);
					if (!validCheck.isValid) score -= 100;

					for (let j = 0; j < path.len; j++) {
						let pos = PositionConstants.getPositionOnPath(path.startPos, path.dir, j);

						score -= LevelStructureGenerator.getPositionAwkwardnessScore(levelVO, pos);

						let plannedStage = options.stage || path.stage;
						let defaultStage = LevelStructureGenerator.getDefaultStage(levelVO, pos);
						if (plannedStage && plannedStage != defaultStage) score -= 1;

						let distanceToCenter = PositionConstants.getDistanceTo(pos, levelVO.levelCenterPosition);
						if (distanceToCenter > 20) score -= 1 * levelVO.structureSettings.density;
						if (distanceToCenter > 30) score -= 1;
						if (distanceToCenter > 40) score -= 1;

						// alignment to key points
						if (pos.sectorX === 0) score++;
						if (pos.sectorY === 0) score++;
						if (pos.sectorX % 10 === 0) score++;
						if (pos.sectorY % 10 === 0) score++;
					}
				}

				return score;
			};

			let getPathsScore = function () {
				let score = 0;

				for (let i = 0; i < paths.length; i++) {
					let path = paths[i];

					// path completion
					let pathDetailed = LevelStructureGenerator.getPath(levelVO, path.startPos, path.dir, path.len, false, options, null, i, paths.length);
					if (pathDetailed.completed) score += 1;
					if (pathDetailed.isValid) score += 1;

					// path length
					if (path.len <= 3) score -= 1;
					if (path.len <= 4) score -= 1 * densityScoreModifier;
					if (pathDetailed.path.length < levelVO.structureSettings.minPathLength) score -= 1;
					if (pathDetailed.path.length > levelVO.structureSettings.maxPathLength) score -= 1;

					if (pathDetailed.path.length == 0) continue;

					// path direction
					let isDiagonal = PositionConstants.isDiagonal(path.dir);
					let diagonalRate = levelVO.structureSettings.diagonalRate;
					if (diagonalRate === 0 && isDiagonal) score -= 10;
					if (diagonalRate === 1 && !isDiagonal) score -= 10;
					let diagonalValue = isDiagonal ? 1 : 0;
					let diagonalValueDiff = Math.abs(diagonalValue - diagonalRate);
					if (diagonalValueDiff > 0.6) score--;
					if (diagonalValueDiff > 0.7) score--;
					if (diagonalValueDiff > 0.8) score--;
					if (diagonalValueDiff > 0.9) score--;

					// existing neighbours (avoid crowdedness)
					let averageNeighbourCount = 0;
					let minNeighbourCount = 99;
					for (let j = 0; j < path.len; j++) {
						let pos = PositionConstants.getPositionOnPath(path.startPos, path.dir, j);
						let neighbourCount = levelVO.getNeighbourCount(pos.sectorX, pos.sectorY);
						averageNeighbourCount += neighbourCount;
						minNeighbourCount = Math.min(minNeighbourCount, neighbourCount);
					}
					averageNeighbourCount = Math.round(averageNeighbourCount/path.len);
					if (averageNeighbourCount > 1) score -= 1 * densityScoreModifier;
					if (averageNeighbourCount > 2) score -= 1 * densityScoreModifier;
					if (averageNeighbourCount > 3) score -= 1;
					if (minNeighbourCount > 0) score -= path.len * densityScoreModifier;
					
					if (paths.length > 1) continue;

					// end pos connection (single lines only)
					let endPos = pathDetailed.path[pathDetailed.path.length - 1];
					let endPosExists = levelVO.hasSector(endPos.sectorX, endPos.sectorY);
					if (endPosExists) score += 1;
					let endPosHasConnectionPoint = endPosExists && levelVO.getPendingConnectionPoints().filter(p => p.position.equals(endPos)).length > 0;
					if (endPosHasConnectionPoint) score += 2;
				}

				return score || 0;
			}

			let getSectorCountScore = function () {
				// all else being equal prefer bigger structures to avoid super dense levels
				let score = 0;
				for (let i = 0; i < paths.length; i++) {
					let path = paths[i];
					score += path.len * densityScoreModifier;
				}
				return score;
			};

			score += getConnectionPointsScore();
			score += getSectorPositionScore();
			score += getPathsScore();
			score += getSectorCountScore();

			return score;
		},

		getPositionAwkwardnessScore: function (levelVO, pos) {
			let result = 0;

			let neighbourCount = WorldCreatorHelper.getNeighbourCount(levelVO, pos);

			if (neighbourCount > 4) result++;

			let neighbours = WorldCreatorHelper.getNeighbours(levelVO, pos);
			let mainDirections = PositionConstants.getLevelDirections(true);
			let directions = PositionConstants.getLevelDirections();

			for (let d in mainDirections) {
				let direction = mainDirections[d];
				let previous = PositionConstants.getNextCounterClockWise(direction);
				let next = PositionConstants.getNextClockWise(direction);
				let opposite = PositionConstants.getOppositeDirection(direction);

				// 3 neighbours all 90 degrees from another
				if (neighbourCount == 3 && neighbours[direction] && neighbours[previous] && neighbours[next]) result++;
			}

			return result;
		},
		
		getPathStartPosition: function (s1, s2, levelVO, isLine, options) {
			let densityScoreModifier = 1 - levelVO.structureSettings.density;

			let filterResult = function (arr) {
				let result = arr;
				let maxNeighbourCount = isLine ? 4 : 3;
				result = LevelStructureGenerator.filterIfSomethingLeft(result, (point) => LevelStructureGenerator.isPreferredSectorPosition(levelVO, point.position));
				result = LevelStructureGenerator.filterIfSomethingLeft(result, (point) => levelVO.getNeighbourCount(point.position.sectorX, point.position.sectorY) <= maxNeighbourCount);
				return result;
			};

			let getConnectionPointScore = function (point) {
				let score = 0;

				let stage = levelVO.getSector(point.position.sectorX, point.position.sectorY).stage;
				if (stage == options.stage) score++;

				let defaultStage = LevelStructureGenerator.getDefaultStage(levelVO, point.position);
				if (defaultStage == options.stage) score++;

				let neighbourCount = levelVO.getNeighbourCount(point.position.sectorX, point.position.sectorY);
				if (neighbourCount == 1 && isLine) score -= 2; // dead end that shouldn't be extended with another single line
				if (neighbourCount == 1 && !isLine) score += 1;
				if (neighbourCount == 2) score++; // line that could use some choices
				if (neighbourCount < 5) score += densityScoreModifier;
				if (neighbourCount < 4) score += densityScoreModifier;

				if (PositionConstants.getDistanceTo(point.position, new PositionVO(levelVO.level, 0, 0)) < 30) score++;
				if (PositionConstants.getDistanceTo(point.position, levelVO.getExcursionStartPosition()) < 20) score++;
				if (PositionConstants.getDistanceTo(point.position, levelVO.getExcursionStartPosition()) < 30) score++;

				return score;
			};

			let sortCandidates = function (arr) {
				return arr.sort((a, b) => getConnectionPointScore(b) - getConnectionPointScore(a));
			};

			let selectCandidate = function (arr) {
				let maxi = WorldCreatorRandom.randomInt(s1, 0, Math.floor(arr.length / 2) + 1);
				let i = WorldCreatorRandom.randomInt(s2, 0, maxi + 1);
				return arr[i];
			};
			
			// predefined connection points by stage (STAGE_LATE can include all stages)
			let connectionPoints = levelVO.getPendingConnectionPoints(options.stage);
			if (connectionPoints.length < 3 && options.canConnectToDifferentStage) {
				connectionPoints = levelVO.getPendingConnectionPoints();
			}

			connectionPoints = connectionPoints.concat();
			connectionPoints = filterResult(connectionPoints);
			connectionPoints = sortCandidates(connectionPoints);

			if (connectionPoints.length > 0) {
				let point = selectCandidate(connectionPoints);
				let sector = levelVO.getSector(point.position.sectorX, point.position.sectorY);
				if (sector) {
					levelVO.removePendingConnectionPoint(point);
					return point;
				}
			}

			// if no valid connection points, fall back to all level/stage sectors
			let sectors = levelVO.sectors;
			let stageSectors = levelVO.getSectorsByStage(options.stage);
			if (stageSectors && stageSectors.length > 0)
				sectors = stageSectors;

			return selectCandidate(filterResult(sectors));
		},
		
		filterIfSomethingLeft: function (arr, filter) {
			if (!arr || arr.length < 1) return arr;
			
			let filtered = arr.filter(filter);
			if (filtered.length > 0) return filtered;
			
			return arr;
		},
		
		getDefaultStage: function (levelVO, sectorPos) {
			var hasEarlyCenters = levelVO.stageCenterPositions[WorldConstants.CAMP_STAGE_EARLY].length > 0;
			var hasLateCenters = levelVO.stageCenterPositions[WorldConstants.CAMP_STAGE_LATE].length > 0;
			
			if (!hasEarlyCenters) {
				return WorldConstants.CAMP_STAGE_LATE;
			}
			
			var earlyNeighbourCount = levelVO.getNeighbourCount(sectorPos.sectorX, sectorPos.sectorY, WorldConstants.CAMP_STAGE_EARLY);
			
			// default: nearest stage center
			let result = null;
			var shortestDist = -1;
			var shorestDistCenter = null;
			for (var stage in levelVO.stageCenterPositions) {
				var positions = levelVO.stageCenterPositions[stage];
				var numOtherStageNeighbours = levelVO.getNeighbourCount(sectorPos.sectorX, sectorPos.sectorY, null, stage);
				for (let i = 0; i < positions.length; i++) {
					var pos = positions[i];
					var dist = PositionConstants.getDistanceTo(pos, sectorPos);
					var adjustedDist = dist + numOtherStageNeighbours;
					if (shortestDist < 0 || adjustedDist < shortestDist) {
						result = stage;
						shortestDist = adjustedDist;
						shortestDistCenter = pos;
					}
				}
			}
			
			// force late if nothing found
			if (shortestDist < 0) {
				return WorldConstants.CAMP_STAGE_LATE;
			}
			
			// force EARLY if likely on early required path
			for (let i = 0; i < levelVO.requiredPaths.length; i++) {
				path = levelVO.requiredPaths[i];
				if (path.stage == WorldConstants.CAMP_STAGE_EARLY) {
					if (PositionConstants.isBetween(path.start, path.end, sectorPos)) {
						return WorldConstants.CAMP_STAGE_EARLY;
					}
				}
			}
			
			// force LATE if far from anything
			var earlyCenter = PositionConstants.getMiddlePoint(levelVO.stageCenterPositions[WorldConstants.CAMP_STAGE_EARLY]);
			if (earlyCenter) {
				var distToEarly = PositionConstants.getDistanceTo(sectorPos, earlyCenter);
				var lateThreshold = (hasLateCenters ? 16 : 8) + earlyNeighbourCount;
				if (distToEarly > lateThreshold) {
					return WorldConstants.CAMP_STAGE_LATE;
				}
			}

			return result;
		},
		
		getDefaultOptions: function (options) {
			options = options || {};
			return {
				stage: options.stage,
				criticalPath: options.criticalPath,
				canConnectToDifferentStage: options.canConnectToDifferentStage
			};
		},
		
		getMaxExcursionDistance: function (levelVO) {
			let excursionLen = WorldCreatorConstants.getMaxPathLength(levelVO.campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_2);
			return Math.floor(excursionLen * 0.85);
		},

	};
	
	return LevelStructureGenerator;
});
