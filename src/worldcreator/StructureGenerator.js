// Handles the first step of world generation, the abstract world template itself
define([
	'ash',
	'game/constants/PositionConstants',
	'game/constants/WorldConstants',
	'game/vos/PositionVO',
	'worldcreator/WorldCreatorConstants',
	'worldcreator/WorldCreatorHelper',
	'worldcreator/WorldCreatorRandom',
	'worldcreator/WorldCreatorLogger',
	'worldcreator/SectorVO',
	'worldcreator/CriticalPathVO',
], function (Ash, PositionConstants, WorldConstants, PositionVO, WorldCreatorConstants, WorldCreatorHelper, WorldCreatorRandom, WorldCreatorLogger, SectorVO, CriticalPathVO) {
	
	var StructureGenerator = {
		
		debugLevel: 0,
		
		prepareStructure: function (seed, worldVO) {
			this.currentFeatures = worldVO.features;
			for (var l = worldVO.topLevel; l >= worldVO.bottomLevel; l--) {
				var levelVO = worldVO.levels[l];
				this.createLevelStructure(seed, worldVO, levelVO);
			}
			this.currentFeatures = null;
		},
		
		createLevelStructure: function(seed, worldVO, levelVO) {
			var l = levelVO.level;
			var stages = worldVO.getStages(l);
			levelVO.requiredPaths = WorldCreatorHelper.getRequiredPaths(worldVO, levelVO);
			
			// create small predefined structures
			this.createSmallStructures(seed, worldVO, levelVO);
			
			// create central structure
			this.createCentralStructure(seed, worldVO, levelVO);
			
			// create required paths
			this.createRequiredPaths(seed, worldVO, levelVO);
			
			// ensure early stage is connected
			this.connectLevelSectors(worldVO, levelVO, levelVO.getSectorsByStage(WorldConstants.CAMP_STAGE_EARLY), WorldConstants.CAMP_STAGE_EARLY, false);
			
			// create random shapes to fill the level
			for (let i = 0; i < stages.length; i++) {
				var stageVO = stages[i];
				this.generateLevelStage(seed, worldVO, levelVO, stageVO, 999);
			}
				
			// fill in annoying gaps (connect sectors that are close by direct distance but far by path length)
			this.createGapFills(worldVO, levelVO);
			
			// ensure whole level is connected
			this.connectLevelSectors(worldVO, levelVO, levelVO.sectors, null, true);
			this.connectLevelSectors(worldVO, levelVO, levelVO.getSectorsByStage(WorldConstants.CAMP_STAGE_EARLY), WorldConstants.CAMP_STAGE_EARLY, true);
		},
		
		createCentralStructure: function (seed, worldVO, levelVO) {
			var l = levelVO.level;
			var center = new PositionVO(l, 0, 0);
			var position = levelVO.levelCenterPosition;
			
			var s1 = (seed % 4 + 1) * 11 + (l + 9) * 666;
			var s2 = (seed % 6 + 1) * 9 + (l + 7) * 331;
			var s3 = (seed % 3 + 1) * 5 + (l + 11) * 561;
			var s4 = 1000 + (seed % 7 + 1) * 185 + (l + 3) * 121 + Math.abs(levelVO.levelCenterPosition.sectorX + 1) * 585;
			var pois = [];
			if (levelVO.passageUpPosition) pois.push(levelVO.passageUpPosition);
			if (levelVO.passageDownPosition) pois.push(levelVO.passageDownPosition);
			if (l == 13) pois.push(levelVO.campPosition);
			
			var validShapes = [];
			if (l == 13) {
				validShapes = [ this.createCentralParallels, this.createCentralCrossings, this.createCentralRectanglesSide, this.createCentralRectanglesNested, this.createCentralRectanglesSimple ];
			} else if (l == 14) {
				validShapes = [];
			} else if (l == worldVO.topLevel) {
				validShapes = [ this.createCentralRectanglesNested, this.centralGrid ];
			} else if (l == worldVO.bottomLevel) {
				validShapes = [ this.createCentralRectanglesSide ];
			} else if (levelVO.isCampable) {
				validShapes = [ this.createCentralParallels, this.createCentralCrossings, this.createCentralPlaza, this.createCentralRectanglesSide, this.createCentralRectanglesNested, this.createCentralRectanglesSimple, this.centralGrid ];
			} else {
				validShapes = [ this.createCentralParallels, this.createCentralCrossings, this.createCentralRectanglesSide, this.createCentralRectanglesNested, this.createCentralRectanglesSimple ];
			}
			if (validShapes.length == 0) {
				return;
			}
			var index = WorldCreatorRandom.randomInt(s4, 0, validShapes.length);
			var shape = validShapes[index];
			shape.apply(this, [s1, s2, s3, worldVO, levelVO, position, pois]);
		},
		
		createSmallStructures: function (seed, worldVO, levelVO) {
			var l = levelVO.level;
			var s1 = (seed % 8 + 1) * 16 + (l + 11) * 76;
			var s2 = (seed % 11 + 1) * 12 + (l + 4) * 199;
			var s3 = (seed % 15 + 1) * 8 + (l + 7) * 444;
			
			if (levelVO.campPosition != null) {
				var existingSectors = levelVO.sectors.concat();
				var pos = levelVO.campPosition;
				var w = l == 13 ? WorldCreatorConstants.START_RECT_SIZE : null;
				var h = l == 13 ? WorldCreatorConstants.START_RECT_SIZE : null;
				let result = this.createSmallRectangle(s1, s2, s3, worldVO, levelVO, pos, [ levelVO.campPosition ], w, h);
				this.connectNewPath(worldVO, levelVO, existingSectors, result);
			}
			
			if (levelVO.level == 14) {
				var center = levelVO.levelCenterPosition;
				var num = 3;
				var s = 3;
				var d = 1;
				var startX = center.sectorX - Math.floor(num/2) * s - Math.floor((num-1)/2)* d;
				var path = [];
				for (let i = 0; i < num; i++) {
					var existingSectors = levelVO.sectors.concat();
					var x = startX + i * s + i * d;
					var pos = new PositionVO(levelVO.level, x, center.sectorY);
					let result = this.createRectangleFromCenter(levelVO, 0, pos, s, s);
					this.connectNewPath(worldVO, levelVO, existingSectors, result);
				}
				
				var existingSectors = levelVO.sectors.concat();
				let paddingY = 4;
				let connectingPathStartPos = new PositionVO(levelVO.level, startX - 1, center.sectorY - Math.floor(s-1) - paddingY + 1);
				let connectingPathLen = s + paddingY * 2;
				let result2 = this.createPath(levelVO, connectingPathStartPos, PositionConstants.DIRECTION_SOUTH, connectingPathLen, true, null, WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL);
				this.connectNewPath(worldVO, levelVO, existingSectors, result2.path);
			}
		},
		
		createCentralParallels: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			var l = levelVO.level;
			
			// choose number of streets 2-4 (fewer on levels with few sectors overall)
			var max = Math.min(4, Math.round(levelVO.numSectors/25));
			var num = WorldCreatorRandom.randomInt(s1, 2, max + 1);
			
			// choose length
			var minlen = Math.min(7 + (max - num) * 2, levelVO.numSectors / 10);
			var maxlenstep = Math.min(5, Math.round(levelVO.numSectors / 20));
			var len = minlen + WorldCreatorRandom.randomInt(s2, 0, maxlenstep) * 2;
			
			// choose direction
			var dir = WorldCreatorRandom.randomDirections(s2 / 2, 1, num < 3)[0];
			var oppositeDir = PositionConstants.getOppositeDirection(dir);
			var perpendicularDir = PositionConstants.getNextClockWise(PositionConstants.getNextClockWise(dir, true), true);
			
			// choose distance between streets
			var dist = 3 + WorldCreatorRandom.randomInt(s1, 0, 4);
			
			// define paths
			var getStreetCenter = function (i, ox, oy) {
				var streetDist = -(num-1)*dist/2 + i*dist;
				var base = PositionConstants.getPositionOnPath(position, perpendicularDir, streetDist, true);
				return new PositionVO(base.level, base.sectorX + ox, base.sectorY + oy);
			};
			var getPaths = function (ox, oy) {
				let result = [];
				for (let i = 0; i < num; i++) {
					var streetCenter = getStreetCenter(i, ox, oy);
					var startPos = PositionConstants.getPositionOnPath(streetCenter, oppositeDir, Math.floor(len / 2));
					result.push({ startPos: startPos, dir: dir, len: len});
				}
				if (num > 1) {
					var street1Center = getStreetCenter(0, ox, oy);
					var offset1 = WorldCreatorRandom.randomInt(s1, -len/3, len/3);
					var connectionPoint1 = PositionConstants.getPositionOnPath(street1Center, oppositeDir, offset1);
					result.push({ startPos: connectionPoint1, dir: perpendicularDir, len: dist * (num-1) + 1 });
				}
				return result;
			};
			
			// check for offset to align to poi
			var offset = this.getStructureOffset(levelVO, pois, getPaths);
			
			// create sectors
			var paths = getPaths(offset.x, offset.y);
			for (let i = 0; i < paths.length; i++) {
				var path = paths[i];
				var options = this.getDefaultOptions();
				this.createPath(levelVO, path.startPos, path.dir, path.len, true, options, WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS);
			}
		},
		
		createCentralCrossings: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			var l = levelVO.level;
			
			// choose number of streets
			var numx = WorldCreatorRandom.randomInt(s1, 1, 3);
			var numy = WorldCreatorRandom.randomInt(s2, 1, 3);
			
			// choose length and direction
			var isDiagonal = WorldCreatorRandom.random(s3) < 0.9;
			let maxlen = Math.round(levelVO.numSectors / (numx + numy) / 1.75 / 2) * 2;
			var xlen = Math.min(9 + WorldCreatorRandom.randomInt(s2, 0, 7) * 2, maxlen);
			var xdist = l == 13 ? WorldCreatorConstants.START_RECT_SIZE - 1 : 2 + WorldCreatorRandom.randomInt(s1, 0, 6);
			var xdir = PositionConstants.DIRECTION_EAST;
			var ylen = Math.min(9 + WorldCreatorRandom.randomInt(s1, 0, 7) * 2, maxlen);
			var ydist = l == 13 ? WorldCreatorConstants.START_RECT_SIZE - 1 : 2 + WorldCreatorRandom.randomInt(s2, 0, 6);
			var ydir = PositionConstants.DIRECTION_SOUTH;
			
			// define paths
			var getPaths = function (ox, oy) {
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
			var offset = this.getStructureOffset(levelVO, pois, getPaths);
			
			// create sectors
			var paths = getPaths(offset.x, offset.y);
			var connectDirection = numy > numx ? ydir : xdir;
			for (let i = 0; i < paths.length; i++) {
				var path = paths[i];
				var connectionPoints = WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS;
				this.createPath(levelVO, path.startPos, path.dir, path.len, true, null, connectionPoints);
			}
		},
		
		createCentralRectanglesSide: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			var l = levelVO.level;
			var sizeFactor = Math.round(levelVO.numSectors / 50);
			var connected = WorldCreatorRandom.randomBool(s1);
			var horizontal = WorldCreatorRandom.randomBool(s2);
			var size = 5 + WorldCreatorRandom.randomInt(s2, 0, sizeFactor) * 2;
			var mindist = Math.floor(size / 2);
			var dist = mindist + (connected ? 0 : WorldCreatorRandom.randomInt(s2, 1, sizeFactor) * 2);
			var x = horizontal ? dist : 0;
			var y = horizontal ? 0 : dist;
			
			var getPaths = function (ox, oy) {
				let result = [];
				var pos = new PositionVO(position.level, position.sectorX + ox, position.sectorY + oy)
				var connectionPointType = size <= 5 ? WorldCreatorConstants.CONNECTION_POINTS_RECT_CORNERS : WorldCreatorConstants.CONNECTION_POINTS_RECT_OUTER;
				result = result.concat(StructureGenerator.getRectangleFromCenter(levelVO, 0, new PositionVO(l, pos.sectorX+x, pos.sectorY+y), size, size, true, false, connectionPointType));
				result = result.concat(StructureGenerator.getRectangleFromCenter(levelVO, 0, new PositionVO(l, pos.sectorX-x, pos.sectorY-y), size, size, true, false, connectionPointType));
				
				if (!connected) {
					var pathpos = WorldCreatorRandom.randomInt(s1, Math.ceil(-dist/2), Math.floor(dist/2));
					var pathdist = Math.round(-dist + size/2) - 1;
					var pathx = horizontal ? pathdist : pathpos;
					var pathy = horizontal ? pathpos : pathdist;
					var pathdir = horizontal ? PositionConstants.DIRECTION_EAST : PositionConstants.DIRECTION_SOUTH;
					var len = (dist - mindist) * 2;
					result.push(StructureGenerator.getPathVO(levelVO, new PositionVO(l, pos.sectorX + pathx, pos.sectorY + pathy), pathdir, len, true));
				}
				
				return result;
			};
			
			var offset = this.getStructureOffset(levelVO, pois, getPaths);
			var paths = getPaths(offset.x, offset.y);
			for (let i = 0; i < paths.length; i++) {
				var path = paths[i];
				this.createPath(levelVO, path.startPos, path.dir, path.len, true, null, path.connectionPointType);
			}
		},
		
		createCentralRectanglesNested: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			var l = levelVO.level;
			var isDiagonal = WorldCreatorRandom.random(s1) < 0.15;
			var minDiff = 4;
			var minSize = 3;
			var maxSize = Math.min(levelVO.numSectors / 12, 19);
			var outerS = WorldCreatorRandom.randomInt(s2, minSize + minDiff, maxSize + 1);
			if (outerS % 2 == 0) outerS--;
			var innerS = WorldCreatorRandom.randomInt(s1, minSize, outerS - minDiff + 1);
			if (innerS % 2 == 0) innerS--;
			if (innerS > outerS - minDiff || innerS < minSize) innerS = outerS;
			var minConnections = 2;
			var maxConnections = outerS > 7 ? 5 : 2;
			var numConnections = WorldCreatorRandom.randomInt(s3, minConnections, maxConnections + 1);

			var getPaths = function (ox, oy) {
				let result = [];
				var pos = new PositionVO(position.level, position.sectorX + ox, position.sectorY + oy);
				pos.normalize();
				if (innerS != outerS) {
					result = result.concat(StructureGenerator.getRectangleFromCenter(levelVO, 0, pos, innerS, innerS, false, isDiagonal));
				}
				result = result.concat(StructureGenerator.getRectangleFromCenter(levelVO, 0, pos, outerS, outerS, false, isDiagonal, WorldCreatorConstants.CONNECTION_POINTS_RECT_OUTER));
				
				var includeDiagonals = outerS - innerS > 4;
				var connectionDirs = WorldCreatorRandom.randomDirections(s3 + 1001, numConnections, includeDiagonals);
				for (let i = 0; i < numConnections; i ++) {
					var connectionDir = connectionDirs[i];
					var connectionStartPos = PositionConstants.getPositionOnPath(pos, connectionDir, Math.round(innerS/2));
					var connectionLen = outerS / 2 - innerS / 2;
					if (isDiagonal && !PositionConstants.isDiagonal(connectionDir)) connectionLen = outerS - innerS;
					let connectionPointType = connectionLen > 6 ? WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE : null;
					var connectionPathVO = StructureGenerator.getPathVO(levelVO, connectionStartPos, connectionDir, connectionLen, false, null, connectionPointType);
					result.push(connectionPathVO);
				}
				return result;
			};
			
			var offset = this.getStructureOffset(levelVO, pois, getPaths);
			var paths = getPaths(offset.x, offset.y);
			var options = this.getDefaultOptions();
			for (let i = 0; i < paths.length; i++) {
				var path = paths[i];
				var res = this.createPath(levelVO, path.startPos, path.dir, path.len, true, options, path.connectionPointType);
			}
		},
		
		createCentralRectanglesSimple: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			var isDiagonal = WorldCreatorRandom.random(s1) < 0.25;
			var maxSize = Math.round(levelVO.numSectors / 7);
			var size = Math.min(maxSize, 6 + WorldCreatorRandom.randomInt(s2, 0, 5) * 2);
			var getPaths = function (ox, oy) {
				var pos = new PositionVO(position.level, position.sectorX + ox, position.sectorY + oy)
				var connectionPointType = WorldCreatorConstants.CONNECTION_POINTS_RECT_ALL;
				let result = StructureGenerator.getRectangleFromCenter(levelVO, 0, pos, size, size, true, isDiagonal, connectionPointType);
				return result;
			};
			
			var offset = this.getStructureOffset(levelVO, pois, getPaths);
			var paths = getPaths(offset.x, offset.y);
			for (let i = 0; i < paths.length; i++) {
				var path = paths[i];
				this.createPath(levelVO, path.startPos, path.dir, path.len, true, null, path.connectionPointType);
			}
		},
		
		createCentralPlaza: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			var poi = WorldCreatorHelper.getClosestPosition(pois, position);
			var center = position;
			if (poi && PositionConstants.getDistanceTo(position, poi) < 8) {
				center.sectorX = poi.sectorX + WorldCreatorRandom.randomInt(s1, -1, 2);
				center.sectorY = poi.sectorY + WorldCreatorRandom.randomInt(s2, -1, 2);
			}
			center.normalize();
			
			var options = this.getDefaultOptions();
			var size = 3 + WorldCreatorRandom.randomInt(s3, 0, 2) * 2;
			this.createRectangleFromCenter(levelVO, 0, center, size, size, true);
			
			var cornerlen = 3 + WorldCreatorRandom.randomInt(s1, 0, 4) * 2;
			var makeCorner = function (dir) {
				var startPos = PositionConstants.getPositionOnPath(center, dir, 2);
				var connectingType = cornerlen > 6 ? WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL : WorldCreatorConstants.CONNECTION_POINTS_PATH_END;
				StructureGenerator.createPath(levelVO, startPos, dir, cornerlen, true, options, connectingType);
			};
			if (WorldCreatorRandom.randomBool(s2)) {
				makeCorner(PositionConstants.DIRECTION_NE);
				makeCorner(PositionConstants.DIRECTION_NW);
				makeCorner(PositionConstants.DIRECTION_SE);
				makeCorner(PositionConstants.DIRECTION_SW);
			} else {
				makeCorner(PositionConstants.DIRECTION_NORTH);
				makeCorner(PositionConstants.DIRECTION_WEST);
				makeCorner(PositionConstants.DIRECTION_SOUTH);
				makeCorner(PositionConstants.DIRECTION_EAST);
			}
		},
		
		centralGrid: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			let numMax = levelVO.numSectors >= 100 ? 3 : 2;
			let isSymmetricalCount = WorldCreatorRandom.randomBool(s1);
			let numX = WorldCreatorRandom.randomInt(s2 / 2, 2, numMax + 1);
			let numY = isSymmetricalCount ? numX : WorldCreatorRandom.randomInt(s3 / 2, 2, numMax + 1);
			let isSymmetricalSmallRects = WorldCreatorRandom.randomBool(s2);
			let maxSize = numX > 2 || numY > 2 ? 5 : 7;
			let w = WorldCreatorRandom.randomInt(s1 * 2, 4, maxSize + 1);
			let h = isSymmetricalSmallRects ? w : WorldCreatorRandom.randomInt(s3 * 2, 4, maxSize + 1);
			
			let totalWidth = numX * w - (numX - 1);
			let totalHeight = numY * h - (numY - 1);
			
			let startX = Math.round(position.sectorX + w/2 - totalWidth / 2);
			let startY = Math.round(position.sectorY + h/2 - totalHeight / 2);
			let getPaths = function (ox, oy) {
				let result = [];
				for (let x = 0; x < numX; x++) {
					for (let y = 0; y < numY; y++) {
						var connectionPointType = WorldCreatorConstants.CONNECTION_POINTS_RECT_CORNERS;
						var pos = new PositionVO(position.level, startX + x*w - x + ox, startY + y*h - y + oy)
						let pathResult = StructureGenerator.getRectangleFromCenter(levelVO, 0, pos, w, h, true, false, connectionPointType);
						result = result.concat(pathResult);
					}
				}
				return result;
			};
			let offset = this.getStructureOffset(levelVO, pois, getPaths);
			let paths = getPaths(offset.x, offset.y);
			for (let i = 0; i< paths.length; i++) {
				var path = paths[i];
				this.createPath(levelVO, path.startPos, path.dir, path.len, true, null, path.connectionPointType);
			}
		},
		
		createSmallRectangle: function (s1, s2, s3, worldVO, levelVO, position, pois, width, height) {
			var w = width || 5 + WorldCreatorRandom.randomInt(s2, 0, 3);
			var h = height || 5 + WorldCreatorRandom.randomInt(s3, 0, 3);
			if (pois && pois.length > 1) {
				var matchHeight = WorldCreatorRandom.randomBool(s1);
				if (matchHeight) {
					h = Math.max(3, Math.abs(pois[0].sectorY - pois[1].sectorY) + 1);
				} else {
					w = Math.max(3, Math.abs(pois[0].sectorX - pois[1].sectorX) + 1);
				}
			}
			var getPaths = function (ox, oy) {
				var pos = new PositionVO(position.level, position.sectorX + ox, position.sectorY + oy);
				let result = StructureGenerator.getRectangleFromCenter(levelVO, 0, pos, w, h, true, false, WorldCreatorConstants.CONNECTION_POINTS_RECT_CORNERS);
				return result;
			};
			
			let result = [];
			var offset = this.getStructureOffset(levelVO, pois, getPaths);
			var paths = getPaths(offset.x, offset.y);
			for (let i = 0; i < paths.length; i++) {
				var path = paths[i];
				var pathResult = this.createPath(levelVO, path.startPos, path.dir, path.len, true, null, WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS, i, paths.length);
				result = result.concat(pathResult.path);
			}
			return result;
		},
		
		generateLevelStage: function (seed, worldVO, levelVO, stageVO, maxAttempts) {
			var stage = stageVO.stage;
			var numGoal = WorldCreatorHelper.getNumSectorsForLevelStage(worldVO.seed, levelVO.campOrdinal, levelVO.level, stageVO.stage);
			var numPadding = Math.floor(WorldCreatorConstants.MAX_SECTOR_COUNT_OVERFLOW / 4);
			
			// geneate random rectangles and paths
			var attempts = 0;
			var failures = 0;
			var numCurrent = levelVO.getNumSectorsByStage(stage);
			while (numCurrent < numGoal && attempts < maxAttempts) {
				attempts++;
				var canConnectToDifferentStage = attempts > 5 && attempts % 5 == 0 && stage != WorldConstants.CAMP_STAGE_EARLY;
				var options = this.getDefaultOptions({ stage: stage, canConnectToDifferentStage: canConnectToDifferentStage });
				var numBefore = numCurrent;
				var numRemaining = numGoal - numCurrent;
				var makeRect = attempts % 2 == 0 && numRemaining > 12;
				if (makeRect) {
					this.createRectangles(seed, attempts, levelVO, options, numRemaining + numPadding);
				} else {
					this.createPaths(seed, attempts, levelVO, options, numRemaining + numPadding);
				}
				numCurrent = levelVO.getNumSectorsByStage(stage);
				var numAfter = numCurrent;
				var numCreated = numAfter - numBefore;
				var isSuccess = numCreated > 1;
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
			var path;
			var startPos;
			var endPos;
			for (let i = 0; i < levelVO.requiredPaths.length; i++) {
				path = levelVO.requiredPaths[i];
				startPos = path.start.clone();
				endPos = path.end.clone();
				var criticalPathVO = new CriticalPathVO(path.type, path.start, path.end);
				var existingSectors = levelVO.sectors.concat();
				var options = this.getDefaultOptions({ stage: path.stage, criticalPath: criticalPathVO });
				var pathResult = this.createPathBetween(worldVO, levelVO, startPos, endPos, path.maxlen, options, WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL);
				if (!pathResult.isComplete) {
					WorldCreatorLogger.w("failed to create required path on level " + levelVO.level);
					WorldCreatorLogger.i(path);
					WorldCreatorLogger.i(pathResult);
					throw new Error("failed to creare required path on level " + levelVO.level);
				}
				var stage = options.stage == WorldConstants.CAMP_STAGE_EARLY ? options.stage : null;
				var sectorPath = WorldCreatorRandom.findPath(worldVO, startPos, endPos, false, true, stage);
				for (let j = 0; j < sectorPath.length; j++) {
					var sector = levelVO.getSectorByPos(sectorPath[j]);
					sector.addToCriticalPath(criticalPathVO);
				}
				this.connectNewPath(worldVO, levelVO, existingSectors, pathResult.path);
			}
		},

		createRectangles: function (seed, pathSeed, levelVO, options, maxlen) {
			var l = levelVO.levelOrdinal;
			var pathRandomSeed = levelVO.sectors.length * 4 + l + pathSeed * 5;
			var s1 = seed * levelVO.levelOrdinal + 28381 + pathRandomSeed;
			var s2 = seed + (l * 44) * pathRandomSeed + pathSeed;
			
			var startPosArray = this.getPathStartPositions(s1, s2, levelVO, options);
			var pathStartI = Math.floor(WorldCreatorRandom.random(seed * 938 * (l + 60) / pathRandomSeed + 2342 * l) * startPosArray.length);
			var pathStartPoint = startPosArray[pathStartI];
			var pathStartPos = pathStartPoint.position.clone();

			var startDirection = this.getPathDirection(s1, s2, pathStartPoint);
									
			var maxRectangleSize = Math.min(Math.floor(WorldCreatorConstants.SECTOR_PATH_LENGTH_MAX * 0.75), Math.ceil(levelVO.numSectors)/11, maxlen/4);
			var w = WorldCreatorRandom.randomInt(seed + pathRandomSeed / pathSeed + pathSeed * l, 4, maxRectangleSize, maxlen/4);
			var h = WorldCreatorRandom.randomInt(seed + pathRandomSeed * l + pathSeed - pathSeed * l, 4, maxRectangleSize);

			var stage = levelVO.getSector(pathStartPos.sectorX, pathStartPos.sectorY).stage;
			if (!options.stage) options.stage = pathStartPos.stage;
			var connectionPointsType = WorldCreatorConstants.CONNECTION_POINTS_RECT_ALL;
			if (w < 6 || h < 6) {
				connectionPointsType = WorldCreatorConstants.CONNECTION_POINTS_RECT_CORNERS;
			}
			this.createRectangle(levelVO, 0, pathStartPos, w, h, startDirection, options, false, connectionPointsType);
		},

		getRectangleFromCenter: function (levelVO, i, center, w, h, forceComplete, isDiagonal, connectionPointsType) {
			if (isDiagonal) {
				var corner = new PositionVO(center.level, center.sectorX, center.sectorY - h + 1);
				return this.getRectangle(levelVO, i, corner, w, h, PositionConstants.DIRECTION_SE, null, forceComplete, connectionPointsType);
			} else {
				var corner = new PositionVO(center.level, Math.round(center.sectorX - w / 2), Math.round(center.sectorY - h / 2));
				return this.getRectangle(levelVO, i, corner, w, h, PositionConstants.DIRECTION_EAST, null, forceComplete, connectionPointsType);
			}
		},
		
		createRectangleFromCenter: function (levelVO, i, center, w, h, forceComplete, isDiagonal, connectionPointsType) {
			let result = [];
			var paths = this.getRectangleFromCenter(levelVO, i, center, w, h, forceComplete, isDiagonal, connectionPointsType);
			for (let i = 0; i < paths.length; i++) {
				var pathResult = this.createPath(levelVO, paths[i].startPos, paths[i].dir, paths[i].len, forceComplete, null, connectionPointsType, i, paths.length);
				result = result.concat(pathResult.path);
			}
			return result;
		},
		
		getRectangle: function (levelVO, i, startPos, w, h, startDirection, options, forceComplete, connectionPointsType) {
			startDirection = startDirection || WorldCreatorRandom.randomDirections(i, 1, true)[0];
			let result = [];
			var sideStartPos = startPos;
			var currentDirection = startDirection;
			for (let j = 0; j < 4; j++) {
				var sideLength = PositionConstants.isHorizontalDirection(currentDirection) ? w : h;
				var connectionPointType = this.getPathConnectionPointType(connectionPointsType);
				var path = this.getPathVO(levelVO, sideStartPos, currentDirection, sideLength, false, options, connectionPointType);
				result.push(path);
				sideStartPos = PositionConstants.getPositionOnPath(sideStartPos, currentDirection, sideLength - 1);
				currentDirection = PositionConstants.getNextClockWise(currentDirection, false);
			}
			return result;
		},
		
		createRectangle: function (levelVO, i, startPos, w, h, startDirection, options, forceComplete, connectionPointsType) {
			var paths = this.getRectangle(levelVO, i, startPos, w, h, startDirection, options, forceComplete, connectionPointsType);
			for (let i = 0; i < paths.length; i++) {
				var pathResult = this.createPath(levelVO, paths[i].startPos, paths[i].dir, paths[i].len, forceComplete, options, paths[i].connectionPointType, i, paths.length);
				if (!pathResult.completed) {
					break;
				}
			}
		},
		
		createPathBetween: function (worldVO, levelVO, startPos, endPos, maxlen, options, connectionPointType) {
			var l = levelVO.level;
			var dist = Math.ceil(PositionConstants.getDistanceTo(startPos, endPos));
			let result = { path: [], isComplete: true };
			
			var startPosExists = levelVO.hasSector(startPos.sectorX, startPos.sectorY);
			var endPosExists = levelVO.hasSector(endPos.sectorX, endPos.sectorY);
			
			// WorldCreatorLogger.i("createPathBetween " + startPos + " " + endPos + " " + options.stage + " " + options.criticalPath + " / " + maxlen + ", dist: " + dist);
			
			if (startPosExists && endPosExists) {
				var stage = options.stage == WorldConstants.CAMP_STAGE_EARLY ? options.stage : null;
				var existingPath = WorldCreatorRandom.findPath(worldVO, startPos, endPos, false, true, stage);
				if (existingPath && existingPath.length > 0 && (maxlen < 0 || existingPath.length < maxlen)) {
					// WorldCreatorLogger.i("- path exists");
					return { path: [], isComplete: true };
				}
			}
			
			var validSectors = options.stage ? levelVO.getSectorsByStage(options.stage) : levelVO.sectors;
			
			var getConnectionPaths = function (s1, s2, allowDiagonals) {
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
					var validCheck = StructureGenerator.isValidPath(levelVO, pathCandidate, null, options);
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
			
			var createConnectionPath = function (s1, s2, allowDiagonals) {
				var pathsResult = getConnectionPaths(s1, s2, allowDiagonals);
				if (pathsResult.isValid) {
					var pathResult;
					for (let i = 0; i < pathsResult.paths.length; i++) {
						var path = pathsResult.paths[i];
						var pathResult = StructureGenerator.createPath(levelVO, path.startPos, path.dir, path.len, true, options, connectionPointType);
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
				var connectedSectors = StructureGenerator.getConnectedSectors(worldVO, position, validSectors, options.stage, maxdist);
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
			var pathLength;
			var totalLength = dist;
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
				var maxAlternativeLen = lenDirect > 0 ?
					lenDirect <= maxlen ? Math.min(lenDirect * 1.5, maxlen) : lenDirect
					: maxlen;
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
				var pathFromStart = startPosExists ? WorldCreatorRandom.findPath(worldVO, startPos, startPosData.nearestConnected.position, false, true, options.stage) : [];
				var pathFromEnd = endPosExists && endPosData.nearestConnected ? WorldCreatorRandom.findPath(worldVO, endPos, endPosData.nearestConnected.position, false, true, options.stage) : [];
				var isValidBetweenNearest = startPosData.nearestConnected && endPosData.nearestConnected && pathsBetweenNearest && pathsBetweenNearest.length > 0;
				var lenBetweenNearest = getTotalLength(pathsBetweenNearest) + getPathLength(pathFromStart) + getPathLength(pathFromEnd);
				
				// make path via existing or nearest if they exist and are short enough, otherwise direct
				// WorldCreatorLogger.i("- lenDirect: " + lenDirect + ", lenViaExisting: " + lenViaExisting + ", lenBetweenNearest: " + lenBetweenNearest + ", max alternative len: " + maxAlternativeLen + ", allowDiagonals: " + allowDiagonals);
				if (isValidBetweenNearest && lenBetweenNearest <= maxAlternativeLen) {
					// WorldCreatorLogger.i("- use nearest: " + startPosData.nearestConnected.position + " - " + endPosData.nearestConnected.position);
					// WorldCreatorLogger.i(startPosData)
					// WorldCreatorLogger.i(pathFromStart)
					createConnectionPath(startPosData.nearestConnected.position, endPosData.nearestConnected.position, allowDiagonals);
				} else if (isValidViaExisting && lenViaExisting <= maxAlternativeLen) {
					// WorldCreatorLogger.i("- use existing " + startPosData.closestExisting + " " + endPosData.closestExisting);
					createConnectionPath(startPos, startPosData.closestExisting.position, true);
					createConnectionPath(endPosData.closestExisting.position, endPos, true);
				} else {
					// WorldCreatorLogger.i("- create new");
					createConnectionPath(startPos, endPos, allowDiagonals);
				}
			}
			
			return result;
		},

		createPaths: function (seed, pathSeed, levelVO, options, maxlen) {
			var l = levelVO.levelOrdinal;
			var pathRandomSeed = levelVO.sectors.length * 4 + l + pathSeed * 5;
			var s1 = seed + (l + 70) * pathRandomSeed;
			var s2 = seed * levelVO.levelOrdinal + 28381 + pathRandomSeed;
			var s3 = seed * 3 * pathRandomSeed * l + 55;
			
			var startPosArray = this.getPathStartPositions(s1, s2, levelVO, options);
			var pathStartI = Math.floor(WorldCreatorRandom.random(seed * 938 * (l + 60) / pathRandomSeed + 2342 * l) * startPosArray.length);
			var pathStartPoint = startPosArray[pathStartI];
			var pathStartPos = pathStartPoint.position.clone();

			var startDirection = this.getPathDirection(s1, s2, pathStartPoint);

			var maxSectors = options.stage ? levelVO.numSectorsByStage[options.stage] : levelVO.numSectors;
			var existingSectors = options.stage ? levelVO.getNumSectorsByStage(options.stage) : levelVO.sectors.length;
			var maxLength = Math.max(WorldCreatorConstants.SECTOR_PATH_LENGTH_MIN, Math.min(WorldCreatorConstants.SECTOR_PATH_LENGTH_MAX, maxSectors - existingSectors));
			if (maxLength > maxlen) {
				maxLength = maxlen;
			}
			var pathLength = WorldCreatorRandom.randomInt(s3, WorldCreatorConstants.SECTOR_PATH_LENGTH_MIN, maxLength + 1);
			let result = this.createPath(levelVO, pathStartPos, startDirection, pathLength, false, options, WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL);
		},
		
		getPathVO: function (levelVO, startPos, direction, len, forceComplete, options, connectionPointType) {
			return { startPos: startPos, dir: direction, len: len, completed: true, connectionPointType: connectionPointType };
		},
		
		getPathVOPositions: function (pathVO) {
			let result = [];
			for (var si = 0; si < pathVO.len; si++) {
				result.push(PositionConstants.getPositionOnPath(pathVO.startPos, pathVO.dir, si));
			}
			return result;
		},
		
		getPath: function (levelVO, startPos, direction, len, forceComplete, options, connectionPointType, shapeIndex, shapeLength) {
			if (len < 1) return { path: [], completed: false, reason: "too short" };
			let result = [];
			var options = options || this.getDefaultOptions();
			var sectorPos;
			var completed = true;
			var isValid = true;
			var reason = "";
			
			let isShapeEnd = !shapeLength || shapeIndex === 0 || shapeIndex === shapeLength - 1;
			
			for (var si = 0; si < len; si++) {
				sectorPos = PositionConstants.getPositionOnPath(startPos, direction, si);
				sectorPos.level = levelVO.level;
				var sectorExists = levelVO.hasSector(sectorPos.sectorX, sectorPos.sectorY);
				var positionCheck = this.isValidSectorPosition(levelVO, sectorPos, options.stage, options, result);
				
				// stop path if invalid position
				if (!positionCheck.isValid) {
					return { path: result, completed: false, reason: positionCheck.reason };
				}
				
				if (!forceComplete && sectorExists) {
					let isPathEnd = si == 0 || si == len - 1;
					
					// stop path when intersecting existing paths
					if (!isPathEnd) {
						return { path: result, completed: false, reason: "sector exists" };
					}
					
					// stop path if shape intersecting existing sectors with wrong stage
					let existingSector = levelVO.getSector(sectorPos.sectorX, sectorPos.sectorY);
					if (!isShapeEnd && options.stage && existingSector.stage != options.stage && !options.canConnectToDifferentStage) {
						return { path: result, completed: false, reason: "existing sector has wrong stage" };
					}
				}

				if (sectorExists) {
					result.push(sectorPos);
					continue;
				}

				var sectorResult = this.canCreateSector(levelVO, sectorPos, options);
				
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
			let result = [];
			var options = options || this.getDefaultOptions();
			var sectorPos;
			
			var path = this.getPath(levelVO, startPos, direction, len, forceComplete, options, connectionPointType, shapeIndex, shapeLength);
			
			if (!path.isValid) {
				return { path: [], completed: false, reason: "get path: " + path.reason };
			}
			
			var completed = path.completed;
			for (let i = 0; i < path.path.length; i++) {
				var sectorPos = path.path[i];
				var sectorExists = levelVO.hasSector(sectorPos.sectorX, sectorPos.sectorY);

				if (sectorExists) {
					result.push(levelVO.getSector(sectorPos.sectorX, sectorPos.sectorY));
				} else {
					var sectorResult = this.createSector(levelVO, sectorPos, options);
					result.push(sectorResult.vo);
				}
			}
			
			// add connection points
			for (var si = 0; si < len; si++) {
				sectorPos = PositionConstants.getPositionOnPath(startPos, direction, si);
				sectorPos.level = levelVO.level;
				var connectionPoint = this.getConnectionPoint(connectionPointType, si, len, sectorPos, direction);
				this.addConnectionPoint(levelVO, sectorPos, connectionPoint);
			}
			
			return { path: result, completed: completed };
		},
		
		connectNewPath: function (worldVO, levelVO, existingSectors, newSectors) {
			if (existingSectors.length < 1) return;
			if (newSectors.length < 1) return;
			var pathToCenter = WorldCreatorRandom.findPath(worldVO, newSectors[0].position, existingSectors[0].position, false, true);
			if (!pathToCenter) {
				var options = this.getDefaultOptions();
				var skip = 0;
				var attempts = 0;
				while (attempts < 10) {
					var pair = WorldCreatorHelper.getClosestPair(existingSectors, newSectors, skip);
					var pairDist = PositionConstants.getDistanceTo(pair[0].position, pair[1].position);
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
			var center = levelVO.campPosition != null ? levelVO.campPosition : levelVO.excursionStartPosition;
			var getConnectedSectors = function () {
				let res = StructureGenerator.getConnectedSectors(worldVO, center, sectors, stage, 0);
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
			var failedPairs = [];
			var isFailed = function (sector1, sector2) {
				for (let i = 0; i < failedPairs.length; i++) {
					if (failedPairs[i].sectors[0].position.equals(sector1.position) && failedPairs[i].sectors[1].position.equals(sector2.position)) return true;
					if (failedPairs[i].sectors[0].position.equals(sector2.position) && failedPairs[i].sectors[1].position.equals(sector1.position)) return true;
				}
				return false;
			}
			var getFurthestPair = function () {
				var furthestPathDist = 0;
				var furthestPair = [null, null];
				for (let i = 0; i < levelVO.sectors.length; i++) {
					var sector1 = levelVO.sectors[i];
					for (let j = i; j < levelVO.sectors.length; j++) {
						var sector2 = levelVO.sectors[j];
						if (sector1.stage != sector2.stage) continue;
						if (isFailed(sector1, sector2)) continue;
						var dist = PositionConstants.getDistanceTo(sector1.position, sector2.position);
						if (dist > 1 && dist < 3) {
							var path = WorldCreatorRandom.findPath(worldVO, sector1.position, sector2.position, false, true);
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
			
			// NOTE: getFurthestPair is a huge performance bottleneck (loops plus pathfinding), only a few tries
			var currentPair = getFurthestPair();
			let i = 0;
			while (currentPair.pathDist > 15 && i < 8) {
				var options = this.getDefaultOptions({ stage: currentPair.stage });
				var pathResult = this.createPathBetween(worldVO, levelVO, currentPair.sectors[0].position, currentPair.sectors[1].position, currentPair.pathDist, options);
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
			var stage = options.stage || this.getDefaultStage(levelVO, sectorPos);
			var sectorVO = levelVO.getSector(sectorPos.sectorX, sectorPos.sectorY);
			
			var exists = sectorVO != null;
			let result = false;
			
			if (!exists) {
				var validResult = this.isValidSectorPosition(levelVO, sectorPos, stage, options);
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
			var stage = options.stage || this.getDefaultStage(levelVO, sectorPos);
			var created = false;
			
			var check = this.canCreateSector(levelVO, sectorPos, options);
			var sectorVO = check.vo;
			if (check.result) {
				var vo = new SectorVO(sectorPos, levelVO.isCampable, levelVO.notCampableReason);
				vo.stage = stage;
				vo.isCamp = levelVO.isCampPosition(sectorPos);
				vo.isPassageUp = levelVO.isPassageUpPosition(sectorPos);
				vo.isPassageDown = levelVO.isPassageDownPosition(sectorPos);
				var criticalPath = options.criticalPath;
				if (criticalPath) {
					vo.addToCriticalPath(criticalPath);
				}
				created = levelVO.addSector(vo);
				if (created) {
					sectorVO = vo;
					levelVO.resetPaths();
				}
			}
			
			return { isNew: created, vo: sectorVO };
		},
		
		addConnectionPoint: function (levelVO, pos, point) {
			if (!point) return;
			if (!levelVO.hasSector(pos.sectorX, pos.sectorY)) return;
			
			var maxdist = this.getMaxExcursionDistance(levelVO) - 5;
			var dist = PositionConstants.getDistanceTo(pos, levelVO.excursionStartPosition);
			if (dist > maxdist) return;
			
			levelVO.addPendingConnectionPoint(point);
		},
		
		isValidPath: function (levelVO, path, stage, options) {
			var startPos = path.startPos;
			var direction = path.dir;
			var pathPositions = this.getPathVOPositions(path);
			for (var si = 0; si < path.len; si++) {
				sectorPos = PositionConstants.getPositionOnPath(startPos, direction, si);
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
				for (var levelStage in levelVO.stageCenterPositions) {
					if (levelStage == stage) continue;
					var positions = levelVO.stageCenterPositions[levelStage];
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
			var dist = PositionConstants.getDistanceTo(sectorPos, levelVO.excursionStartPosition);
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
				
				// non-preferred: certain critical paths that shouldn't branch too much
				if (sectorVO.isOnCriticalPath(WorldConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_CAMP)) {
					return false;
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
				var path = WorldCreatorRandom.findPath(worldVO, sector.position, point, false, true, stage, true);
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
		
		getPathDirection: function (s1, s2, startPoint) {
			var possibleDirections = [];
			if (startPoint.dirs) {
				possibleDirections = startPoint.dirs.concat();
				var includeSecondary = WorldCreatorRandom.random(s2) < 0.2;
				if (includeSecondary) {
					possibleDirections = startPoint.dirs2.concat();
				}
			} else {
				var isDiagonal = WorldCreatorRandom.random(s2) < WorldCreatorConstants.DIAGONAL_PATH_PROBABILITY;
				possibleDirections = PositionConstants.getLevelDirections(!isDiagonal);
			}
			var dirI = WorldCreatorRandom.randomInt(s1, 0, possibleDirections.length);
			return possibleDirections[dirI];
		},
		
		getConnectionPoint: function (type, pathi, pathlen, sectorPos, pathdir) {
			if (!type) return null;
			var dirs = [];
			var dirs2 = [];
			var oppositeDir = PositionConstants.getOppositeDirection(pathdir);
			var isStart = pathi == 0;
			var isMiddle = pathi == Math.floor(pathlen / 2);
			var isEnd = pathi == pathlen - 1;
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
					if (isMiddle && pathlen >= 5) {
						dirs.push(PositionConstants.getNextClockWise(pathdir));
						dirs.push(PositionConstants.getNextCounterClockWise(pathdir));
						dirs2.push(PositionConstants.getNextClockWise(pathdir, true));
						dirs2.push(PositionConstants.getNextCounterClockWise(pathdir, true));
						dirs2.push(PositionConstants.getNextClockWise(oppositeDir, true));
						dirs2.push(PositionConstants.getNextCounterClockWise(oppositeDir, true));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					break;
				case WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL:
					return this.getConnectionPoint(WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE, pathi, pathlen, sectorPos, pathdir)
						|| this.getConnectionPoint(WorldCreatorConstants.CONNECTION_POINTS_PATH_END, pathi, pathlen, sectorPos, pathdir);
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
				default:
					WorldCreatorLogger.w("unknown path connection point type: " + type);
					return null;
			}
		},
		
		getPathConnectionPointType: function (rectConnectionPointType) {
			if (!rectConnectionPointType) return null;
			switch (rectConnectionPointType) {
				case WorldCreatorConstants.CONNECTION_POINTS_RECT_CORNERS:
					return WorldCreatorConstants.CONNECTION_POINTS_PATH_END;
					
				case WorldCreatorConstants.CONNECTION_POINTS_RECT_MIDDLE:
					return WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE;
					
				case WorldCreatorConstants.CONNECTION_POINTS_RECT_OUTER:
					return WorldCreatorConstants.CONNECTION_POINTS_PATH_CCW;
					
				case WorldCreatorConstants.CONNECTION_POINTS_RECT_INNER:
					return WorldCreatorConstants.CONNECTION_POINTS_PATH_CW;
					
				case WorldCreatorConstants.CONNECTION_POINTS_RECT_ALL:
					return WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL;
				default:
					WorldCreatorLogger.w("unknown rectangle connection point type: " + rectConnectionPointType);
					return null;
			}
		},
		
		getStructureOffset: function (levelVO, pois, getPathsFunc) {
			var maxoffset = 5;
			var offsetx = 0;
			var offsety = 0;
			var checkOffset = function (x, y) {
				var points = 0;
				var paths = getPathsFunc(x, y);
				// POIs on paths (max 1 per POI)
				if (pois) {
					for (var p = 0; p < pois.length; p++) {
						var poi = pois[p];
						for (let i = 0; i < paths.length; i++) {
							var path = paths[i];
							if (PositionConstants.isOnPath(poi, path.startPos, path.dir, path.len)) {
								points++;
								break;
							}
						}
					}
				}
				// features and existing sectors on and next to paths
				for (let i = 0; i < paths.length; i++) {
					var path = paths[i];
					for (let j = 0; j < path.len; j++) {
						var pos = PositionConstants.getPositionOnPath(path.startPos, path.dir, j);
						if (WorldCreatorHelper.containsBlockingFeature(pos, StructureGenerator.currentFeatures, true)) {
							points--;
						}
						
						var neighbourCount = levelVO.getNeighbourCount(pos.sectorX, pos.sectorY);
						if (levelVO.hasSector(pos.sectorX, pos.sectorY)) {
							points += 0.1;
						} else if (neighbourCount > 2) {
							points -= 0.5 * neighbourCount;
						}
					}
				}
				return points;
			};
			var bestpoints = -99;
			var candidates = PositionConstants.getAllPositionsInArea(null, maxoffset);
			for (let i = 0; i < candidates.length; i++) {
				var points = checkOffset(candidates[i].sectorX, candidates[i].sectorY);
				if (points > bestpoints) {
					offsetx = candidates[i].sectorX;
					offsety = candidates[i].sectorY;
					bestpoints = points;
				}
			}
			return { x: offsetx, y: offsety };
		},
		
		getPathStartPositions: function (s1, s2, levelVO, options) {
			let filterResult = function (arr) {
				return StructureGenerator.filterIfSomethingLeft(arr, (point) => StructureGenerator.isPreferredSectorPosition(levelVO, point.position));
			};
			
			// predefined connection points by stage (STAGE_LATE can include all stages)
			var connectionPoints = levelVO.getPendingConnectionPoints(options.stage);
			if (connectionPoints.length < 3 && options.canConnectToDifferentStage) {
				connectionPoints = levelVO.getPendingConnectionPoints();
			}
			connectionPoints = filterResult(connectionPoints);
			if (connectionPoints.length > 0) {
				var maxi = WorldCreatorRandom.randomInt(s1, 0, Math.floor(connectionPoints.length / 2) + 1);
				let i = WorldCreatorRandom.randomInt(s2, 0, maxi + 1);
				var point = connectionPoints[i];
				var sector = levelVO.getSector(point.position.sectorX, point.position.sectorY);
				if (sector) {
					levelVO.removePendingConnectionPoint(point);
					return [ point ];
				}
			}
			// all sectors
			if (!options.stage)
				return filterResult(levelVO.sectors);
			if (options.canConnectToDifferentStage)
				return filterResult(levelVO.sectors);
			var stageSectors = levelVO.getSectorsByStage(options.stage);
			if (stageSectors && stageSectors.length > 0)
				return filterResult(stageSectors);
			return filterResult(levelVO.sectors);
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
			var excursionLen = WorldCreatorConstants.getMaxPathLength(levelVO.campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_2);
			return Math.floor(excursionLen * 0.85);
		},

	};
	
	return StructureGenerator;
});
