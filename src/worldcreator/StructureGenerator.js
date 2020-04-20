// Handles the first step of world generation, the abstract world template itself
define([
	'ash',
    'game/constants/PositionConstants',
    'game/constants/WorldConstants',
    'game/vos/PositionVO',
	'worldcreator/WorldCreatorConstants',
    'worldcreator/WorldCreatorHelper',
    'worldcreator/WorldCreatorRandom',
    'worldcreator/SectorVO',
], function (Ash, PositionConstants, WorldConstants, PositionVO, WorldCreatorConstants, WorldCreatorHelper, WorldCreatorRandom, SectorVO) {
    
    var StructureGenerator = {
        
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

            // create central structure
            this.createCentralStructure(seed, worldVO, levelVO);
            
            // create other predefined structures
            this.createSmallStructures(seed, worldVO, levelVO);
            
            // create required paths
            var requiredPaths = this.getRequiredPaths(worldVO, levelVO);
            this.createRequiredPaths(seed, worldVO, levelVO, requiredPaths);
            
            // create random shapes to fill the level
            for (var i = 0; i < stages.length; i++) {
                var stageVO = stages[i];
                this.generateLevelStage(seed, worldVO, levelVO, stageVO);
            }
            
            // fill in annoying gaps (connect sectors that are close by direct distance but far by path length)
            this.createGapFills(worldVO, levelVO);
        },
        
        createCentralStructure: function (seed, worldVO, levelVO) {
            var l = levelVO.level;
            var center = new PositionVO(l, 0, 0);
            var position = center;
            if (PositionConstants.getDistanceTo(center, levelVO.levelCenterPosition) > 8) {
                position = PositionConstants.getMiddlePoint([center, levelVO.levelCenterPosition]);
            }
            var s1 = (seed % 4 + 1) * 11 + (l + 9) * 666;
            var s2 = (seed % 6 + 1) * 9 + (l + 7) * 331;
            var s3 = (seed % 3 + 1) * 5 + (l + 11) * 561;
            var s4 = 10000 + seed % 100 + l * 66 + levelVO.campOrdinal * 22 + levelVO.numSectors;
            var pois = [];
            if (levelVO.passageUpPosition) pois.push(levelVO.passageUpPosition);
            if (levelVO.passageDownPosition) pois.push(levelVO.passageDownPosition);
            
            var validShapes = [];
            if (l == 13) {
                validShapes = [ this.createCentralParallels, this.createCentralCrossings, this.createCentralRectanglesSide, this.createCentralRectanglesNested, this.createCentralRectanglesSimple ];
            } else if (l == 14) {
                validShapes = [ this.createCentralCrossings ];
            } else if (l == worldVO.topLevel) {
                validShapes = [ this.createCentralRectanglesNested ];
            } else if (l == worldVO.bottomLevel) {
                validShapes = [ this.createCentralRectanglesSide ];
            } else {
                validShapes = [ this.createCentralParallels, this.createCentralCrossings, this.createCentralPlaza, this.createCentralRectanglesSide, this.createCentralRectanglesNested, this.createCentralRectanglesSimple ];
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
            
            if (levelVO.campPositions.length > 0) {
                var existingSectors = levelVO.sectors.concat();
                var pos = PositionConstants.getMiddlePoint(levelVO.campPositions);
                var result = this.createSmallRectangle(s1, s2, s3, worldVO, levelVO, pos, levelVO.campPositions);
                this.connectNewPath(worldVO, levelVO, existingSectors, result);
            }
        },
        
        createCentralParallels: function (s1, s2, s3, worldVO, levelVO, position, pois) {
            var l = levelVO.level;
            
            // choose number of streets 2-4 (fewer on levels with few sectors overall)
            var max = Math.min(4, Math.round(levelVO.numSectors/25));
            var num = WorldCreatorRandom.randomInt(s1, 2, max + 1);
            
            // choose length
            var minlen = Math.min(9 + (max - num) * 2, levelVO.numSectors / 10);
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
                var result = [];
                for (var i = 0; i < num; i++) {
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
            var maxoffset = 3;
            var offset = this.getStructureOffset(levelVO, maxoffset, pois, getPaths);
            
            // create sectors
            var paths = getPaths(offset.x, offset.y);
            for (var i = 0; i < paths.length; i++) {
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
            var xlen = 9 + WorldCreatorRandom.randomInt(s2, 0, 7) * 2;
            var xdist = 2 + WorldCreatorRandom.randomInt(s1, 0, 6);
            var xdir = PositionConstants.DIRECTION_EAST;
            var ylen = 9 + WorldCreatorRandom.randomInt(s1, 0, 7) * 2;
            var ydist = 2 + WorldCreatorRandom.randomInt(s2, 0, 6);
            var ydir = PositionConstants.DIRECTION_SOUTH;
            
            // define paths
            var getPaths = function (ox, oy) {
                var result = [];
                for (var i = 0; i < numx; i++) {
                    var startPos = new PositionVO(l, position.sectorX + ox - xlen/2, position.sectorY + oy - (numx-1)*xdist/2+i*xdist);
                    startPos.normalize();
                    result.push({ startPos: startPos, dir: xdir, len: xlen });
                }
                for (var j = 0; j < numy; j++) {
                    var startPos = new PositionVO(l, position.sectorX + ox - (numy-1)*ydist/2 +j*ydist, position.sectorY + oy - ylen/2);
                    startPos.normalize();
                    result.push({ startPos: startPos, dir: ydir, len: ylen });
                }
                return result;
            };
            
            // check for offset to align to poi
            var maxoffset = 5;
            var offset = this.getStructureOffset(levelVO, maxoffset, pois, getPaths);
            
            // create sectors
            var paths = getPaths(offset.x, offset.y);
            var connectDirection = numy > numx ? ydir : xdir;
            for (var i = 0; i < paths.length; i++) {
                var path = paths[i];
                var connectionPoints = path.dir == connectDirection ? WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS : null;
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
                var result = [];
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
                    result.push(StructureGenerator.getPath(levelVO, new PositionVO(l, pos.sectorX + pathx, pos.sectorY + pathy), pathdir, len, true));
                }
                
                return result;
            };
            
            var offset = this.getStructureOffset(levelVO, 4, pois, getPaths);
            var paths = getPaths(offset.x, offset.y);
            for (var i = 0; i < paths.length; i++) {
                var path = paths[i];
                this.createPath(levelVO, path.startPos, path.dir, path.len, false, null, path.connectionPointType);
            }
        },
        
        createCentralRectanglesNested: function (s1, s2, s3, worldVO, levelVO, position, pois) {
            var l = levelVO.level;
            var isDiagonal = WorldCreatorRandom.random(s1) < 0.15;
            var minSize = 3;
            var maxSize = levelVO.numSectors / 10;
            var maxStep = Math.floor(maxSize - minSize) / 2;
            var innerS = minSize + WorldCreatorRandom.randomInt(s1, 0, Math.min(5, maxStep)) * 2;
            var outerS = innerS + 4 + WorldCreatorRandom.randomInt(s2, 0, 4) * 2;
            var getPaths = function (ox, oy) {
                var result = [];
                var pos = new PositionVO(position.level, position.sectorX + ox, position.sectorY + oy);
                pos.normalize();
                result = result.concat(StructureGenerator.getRectangleFromCenter(levelVO, 0, pos, innerS, innerS, false, isDiagonal));
                result = result.concat(StructureGenerator.getRectangleFromCenter(levelVO, 0, pos, outerS, outerS, false, isDiagonal, WorldCreatorConstants.CONNECTION_POINTS_RECT_OUTER));
                var numConnections = WorldCreatorRandom.randomInt(s3, 2, 5);
                for (var i = 0; i < numConnections; i ++) {
                    var connectionDir = WorldCreatorRandom.randomDirections(s3 + i * 1001, 1, true)[0];
                    var connectionStartPos = PositionConstants.getPositionOnPath(pos, connectionDir, Math.round(innerS/2));
                    var connectionLen = outerS / 2 - innerS / 2;
                    if (isDiagonal && !PositionConstants.isDiagonal(connectionDir)) connectionLen = outerS - innerS;
                    result.push(StructureGenerator.getPath(levelVO, connectionStartPos, connectionDir, connectionLen));
                }
                return result;
            };
            
            var offset = this.getStructureOffset(levelVO, 4, pois, getPaths);
            var paths = getPaths(offset.x, offset.y);
            var options = this.getDefaultOptions();
            for (var i = 0; i < paths.length; i++) {
                var path = paths[i];
                this.createPath(levelVO, path.startPos, path.dir, path.len, true, options, path.connectionPointType);
            }
        },
        
        createCentralRectanglesSimple: function (s1, s2, s3, worldVO, levelVO, position, pois) {
            var isDiagonal = WorldCreatorRandom.random(s1) < 0.25;
            var size = 5 + WorldCreatorRandom.randomInt(s2, 0, 5) * 2;
            var getPaths = function (ox, oy) {
                var pos = new PositionVO(position.level, position.sectorX + ox, position.sectorY + oy)
                var connectionPointType = size > 5 ? WorldCreatorConstants.CONNECTION_POINTS_RECT_ALL : WorldCreatorConstants.CONNECTION_POINTS_RECT_OUTER;
                var result = StructureGenerator.getRectangleFromCenter(levelVO, 0, pos, size, size, true, isDiagonal, connectionPointType);
                return result;
            };
            
            var offset = this.getStructureOffset(levelVO, 5, pois, getPaths);
            var paths = getPaths(offset.x, offset.y);
            for (var i = 0; i < paths.length; i++) {
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
            this.createRectangleFromCenter(levelVO, 0, center, size, size);
            
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
        
        createSmallRectangle: function (s1, s2, s3, worldVO, levelVO, position, pois) {
            var w = 3 + WorldCreatorRandom.randomInt(s2, 0, 3);
            var h = 3 + WorldCreatorRandom.randomInt(s3, 0, 3);
            if (pois.length > 1) {
                var matchHeight = WorldCreatorRandom.randomBool(s1);
                if (matchHeight) {
                    h = Math.max(3, Math.abs(pois[0].sectorY - pois[1].sectorY) + 1);
                } else {
                    w = Math.max(3, Math.abs(pois[0].sectorX - pois[1].sectorX) + 1);
                }
            }
            var getPaths = function (ox, oy) {
                var pos = new PositionVO(position.level, position.sectorX + ox, position.sectorY + oy)
                var result = StructureGenerator.getRectangleFromCenter(levelVO, 0, pos, w, h, true, false);
                return result;
            };
            
            var result = [];
            var offset = this.getStructureOffset(levelVO, 4, pois, getPaths);
            var paths = getPaths(offset.x, offset.y);
            for (var i = 0; i < paths.length; i++) {
                var path = paths[i];
                var pathResult = this.createPath(levelVO, path.startPos, path.dir, path.len, true);
                result = result.concat(pathResult.path);
            }
            return result;
        },
        
        generateLevelStage: function (seed, worldVO, levelVO, stageVO) {
            var stage = stageVO.stage;
            var maxSectors = WorldCreatorHelper.getNumSectorsForLevelStage(worldVO, levelVO, stageVO.stage);
            
            // geneate random rectangles and paths
            var attempts = 0;
            var maxAttempts = 999;
            while (levelVO.getNumSectorsByStage(stage) <= maxSectors && attempts < maxAttempts) {
                attempts++;
                var canConnectToDifferentStage = attempts > 5 && attempts % 5 == 0 && stage != WorldConstants.CAMP_STAGE_EARLY;
                var options = this.getDefaultOptions({ stage: stage, canConnectToDifferentStage: canConnectToDifferentStage });
                if (attempts % 2 == 0) {
                    this.createRectangles(seed, attempts, levelVO, options);
                } else {
                    this.createPaths(seed, attempts, levelVO, options);
                }
            }
            
            // ensure CAMP_STAGE_EARLY is connected
            if (stage == WorldConstants.CAMP_STAGE_EARLY) {
                var center = levelVO.campPositions[0];
                var getConnectedSectors = function () {
                    var sectors = levelVO.getSectorsByStage(stage);
                    return StructureGenerator.getConnectedSectors(worldVO, center, sectors, stage);
                };
                var division = getConnectedSectors();
                var attempts = 0;
                var options = this.getDefaultOptions({ stage: stage });
                while (division.disconnected.length > 0 && attempts < 100) {
                    log.i("connecting disconnected parts of early stage on level " + levelVO.level);
                    var pair = WorldCreatorHelper.getClosestPair(division.connected, division.disconnected);
                    var pairDist = PositionConstants.getDistanceTo(pair[0].position, pair[1].position);
                    this.createPathBetween(worldVO, levelVO, pair[0].position, pair[1].position, -1, options);
                    worldVO.resetPaths();
                    division = getConnectedSectors();
                    attempts++;
                }
            }
        },
        
        getConnectedSectors: function (worldVO, point, sectors, stage) {
            var result = { connected: [], disconnected: [] };
            for (var i = 0; i < sectors.length; i++) {
                var sector = sectors[i];
                if (PositionConstants.getDistanceTo(sector.position, point) <= 1) {
                    result.connected.push(sector);
                    continue;
                }
                var path = WorldCreatorRandom.findPath(worldVO, sector.position, point, false, true, stage);
                if (path && path.length > 0) {
                    result.connected.push(sector);
                    continue;
                }
                result.disconnected.push(sector);
            }
            return result;
        },
        
        createRequiredPaths: function (seed, worldVO, levelVO, requiredPaths) {
            if (requiredPaths.length === 0) return;
            var path;
            var startPos;
            var endPos;
            for (var i = 0; i < requiredPaths.length; i++) {
                path = requiredPaths[i];
                startPos = path.start.clone();
                endPos = path.end.clone();
                var existingSectors = levelVO.sectors.concat();
                var options = this.getDefaultOptions({ stage: path.stage, criticalPathType: path.type});
                var path = this.createPathBetween(worldVO, levelVO, startPos, endPos, path.maxlen, options);
                this.connectNewPath(worldVO, levelVO, existingSectors, path);
            }
        },

        createRectangles: function (seed, pathSeed, levelVO, options) {
            var l = levelVO.levelOrdinal;
            var pathRandomSeed = levelVO.sectors.length * 4 + l + pathSeed * 5;
            var s1 = seed * levelVO.levelOrdinal + 28381 + pathRandomSeed;
            var s2 = seed + (l * 44) * pathRandomSeed + pathSeed;
            
            var startPosArray = this.getPathStartPositions(levelVO, options);
            var pathStartI = Math.floor(WorldCreatorRandom.random(seed * 938 * (l + 60) / pathRandomSeed + 2342 * l) * startPosArray.length);
            var pathStartPoint = startPosArray[pathStartI];
            var pathStartPos = pathStartPoint.position.clone();

            var startDirection = this.getPathDirection(s1, s2, pathStartPoint);
                                    
            var maxRectangleSize = Math.min(Math.floor(WorldCreatorConstants.SECTOR_PATH_LENGTH_MAX * 0.75), Math.ceil(levelVO.numSectors)/11);
            var w = WorldCreatorRandom.randomInt(seed + pathRandomSeed / pathSeed + pathSeed * l, 4, maxRectangleSize);
            var h = WorldCreatorRandom.randomInt(seed + pathRandomSeed * l + pathSeed - pathSeed * l, 4, maxRectangleSize);

            var stage = levelVO.getSector(pathStartPos.sectorX, pathStartPos.sectorY).stage;
            if (!options.stage) options.stage = pathStartPos.stage;
            this.createRectangle(levelVO, 0, pathStartPos, w, h, startDirection, options, false, WorldCreatorConstants.CONNECTION_POINTS_RECT_ALL);
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
        
        createRectangleFromCenter: function (levelVO, i, center, w, h, forceComplete, isDiagonal) {
            var paths = this.getRectangleFromCenter(levelVO, i, center, w, h, forceComplete, isDiagonal);
            for (var i = 0; i < paths.length; i++) {
                this.createPath(levelVO, paths[i].startPos, paths[i].dir, paths[i].len, forceComplete);
            }
        },
        
        getRectangle: function (levelVO, i, startPos, w, h, startDirection, options, forceComplete, connectionPointsType) {
            startDirection = startDirection || WorldCreatorRandom.randomDirections(i, 1, true)[0];
            var result = [];
            var sideStartPos = startPos;
            var currentDirection = startDirection;
            for (var j = 0; j < 4; j++) {
                var sideLength = PositionConstants.isHorizontalDirection(currentDirection) ? w : h;
                var connectionPointType = this.getPathConnectionPointType(connectionPointsType);
                var path = this.getPath(levelVO, sideStartPos, currentDirection, sideLength, false, options, connectionPointType);
                result.push(path);
                if (!path.completed) return result;
                sideStartPos = PositionConstants.getPositionOnPath(sideStartPos, currentDirection, sideLength - 1);
                currentDirection = PositionConstants.getNextClockWise(currentDirection, false);
            }
            return result;
        },
        
        createRectangle: function (levelVO, i, startPos, w, h, startDirection, options, forceComplete, connectionPointsType) {
            var paths = this.getRectangle(levelVO, i, startPos, w, h, startDirection, options, forceComplete, connectionPointsType);
            for (var i = 0; i < paths.length; i++) {
                var pathResult = this.createPath(levelVO, paths[i].startPos, paths[i].dir, paths[i].len, forceComplete, options, paths[i].connectionPointType);
                if (!pathResult.completed) break;
            }
        },
        
        createPathBetween: function (worldVO, levelVO, startPos, endPos, maxlen, options) {
            var l = levelVO.level;
            var dist = Math.ceil(PositionConstants.getDistanceTo(startPos, endPos));
            var result = [];
            
            var existingPath = WorldCreatorRandom.findPath(worldVO, startPos, endPos, false, true);
            if (existingPath && existingPath.length > 0 && existingPath.length < maxlen) {
                return result;
            }
            
            var getConnectionPaths = function (s1, s2, allowDiagonals) {
                var paths = [];
                var currentPos = s1;
                var i = 0;
                while (!currentPos.equals(s2)) {
                    var possibleDirections = PositionConstants.getDirectionsFrom(currentPos, s2, allowDiagonals);
                    var directionIndex = WorldCreatorRandom.randomInt(worldVO.seed % 10200 + l * 555 + dist * 77 + i * 1001, 0, possibleDirections.length);
                    var direction = possibleDirections[directionIndex];
                    pathLength = PositionConstants.getDistanceInDirection(currentPos, s2, direction) + 1;
                    paths.push({ startPos: currentPos, dir: direction, len: pathLength });
                    currentPos = PositionConstants.getPositionOnPath(currentPos, direction, pathLength - 1);
                    i++;
                    if (i > 100) break;
                }
                return paths;
            };
            
            var createConnectionPath = function (s1, s2, allowDiagonals) {
                var paths = getConnectionPaths(s1, s2, allowDiagonals);
                var pathResult;
                for (var i = 0; i < paths.length; i++) {
                    var path = paths[i];
                    var pathResult = StructureGenerator.createPath(levelVO, path.startPos, path.dir, path.len, true, options);
                    result = result.concat(pathResult.path);
                }
            };
            
            var getTotalLength = function (paths) {
                return paths.length > 0 ? paths.reduce((sum, current) => sum + current.len, 0) : 0;
            };
            
            var options = options || this.getDefaultOptions();
            var pathLength;
            var totalLength = dist;
            if (dist == 0) {
                this.createAddSector(result, levelVO, startPos, options);
            } else if (dist == 1) {
                this.createAddSector(result, levelVO, startPos, options);
                this.createAddSector(result, levelVO, endPos, options);
            } else {
                var allowDiagonals = dist > maxlen / 2;
                
                // calculate 2 paths: via existing sectors or direct
                var validSectors = options.stage ? levelVO.getSectorsByStage(options.stage) : levelVO.sectors;
                var closestExisting1 = WorldCreatorHelper.getClosestSector(validSectors, startPos);
                var closestExisting2 = WorldCreatorHelper.getClosestSector(validSectors, endPos);
                var pathExisting = WorldCreatorRandom.findPath(worldVO, closestExisting1.position, closestExisting2.position, false, true, options.stage);
                
                var pathsWithExisting = getConnectionPaths(startPos, closestExisting1.position).concat(getConnectionPaths(closestExisting2.position, endPos));
                var lenWithExisting = getTotalLength(pathsWithExisting);
                var pathsDirect = getConnectionPaths(startPos, endPos, allowDiagonals);
                var lenDirect = getTotalLength(pathsDirect);
                
                // make path via existing if it's short enough, otherwise direct
                var preferExisting = lenWithExisting <= lenDirect;
                if (pathExisting && pathExisting.length > 0 && preferExisting) {
                    createConnectionPath(startPos, closestExisting1.position, true);
                    createConnectionPath(closestExisting2.position, endPos, true);
                } else {
                    // if that is too long, make a new path
                    createConnectionPath(startPos, endPos, allowDiagonals);
                }
            }
            
            return result;
        },

        createPaths: function (seed, pathSeed, levelVO, options) {
            var l = levelVO.levelOrdinal;
            var pathRandomSeed = levelVO.sectors.length * 4 + l + pathSeed * 5;
            var s1 = seed + (l + 70) * pathRandomSeed;
            var s2 = seed * levelVO.levelOrdinal + 28381 + pathRandomSeed;
            var s3 = seed * 3 * pathRandomSeed * l + 55;
            
            var startPosArray = this.getPathStartPositions(levelVO, options);
            var pathStartI = Math.floor(WorldCreatorRandom.random(seed * 938 * (l + 60) / pathRandomSeed + 2342 * l) * startPosArray.length);
            var pathStartPoint = startPosArray[pathStartI];
            var pathStartPos = pathStartPoint.position.clone();

            var startDirection = this.getPathDirection(s1, s2, pathStartPoint);

            var maxSectors = options.stage ? levelVO.numSectorsByStage[options.stage] : levelVO.numSectors;
            var existingSectors = options.stage ? levelVO.getNumSectorsByStage(options.stage) : levelVO.sectors.length;
            var maxLength = Math.max(WorldCreatorConstants.SECTOR_PATH_LENGTH_MIN, Math.min(WorldCreatorConstants.SECTOR_PATH_LENGTH_MAX, maxSectors - existingSectors));
            var pathLength = WorldCreatorRandom.randomInt(s3, WorldCreatorConstants.SECTOR_PATH_LENGTH_MIN, maxLength + 1);
            var result = this.createPath(levelVO, pathStartPos, startDirection, pathLength, false, options, WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL);
        },
        
        getPath: function (levelVO, startPos, direction, len, forceComplete, options, connectionPointType) {
            return { startPos: startPos, dir: direction, len: len, completed: true, connectionPointType: connectionPointType };
        },

        createPath: function (levelVO, startPos, direction, len, forceComplete, options, connectionPointType) {
            if (len < 1) return { path: [], completed: false };
            var result = [];
            var options = options || this.getDefaultOptions();
            var sectorPos;
            for (var si = 0; si < len; si++) {
                sectorPos = PositionConstants.getPositionOnPath(startPos, direction, si);
                sectorPos.level = levelVO.level;
                var connectionPoint = this.getConnectionPoint(connectionPointType, si, len, sectorPos, direction);

                var sectorExists = levelVO.hasSector(sectorPos.sectorX, sectorPos.sectorY);
                
                if (sectorExists) {
                    if (connectionPoint) levelVO.addPendingConnectionPoint(connectionPoint);
                }
                
                // stop path when intersecting existing paths
                if (!forceComplete) {
                    if (sectorExists || !this.isValidSectorPosition(levelVO, sectorPos, options.stage, options)) {
                        if (si > 0) {
                            return { path: result, completed: false };
                        } else {
                            continue;
                        }
                    }
                }

                if (sectorExists) {
                    result.push(levelVO.getSector(sectorPos.sectorX, sectorPos.sectorY));
                    continue;
                }

                var sectorResult = this.createSector(levelVO, sectorPos, options);
                
                if (sectorResult.vo) {
	                result.push(sectorResult.vo);
                    if (connectionPoint) levelVO.addPendingConnectionPoint(connectionPoint);
                } else {
                    return { path: result, completed: false };
                }
            }
            return { path: result, completed: true };
        },
        
        connectNewPath: function (worldVO, levelVO, existingSectors, newSectors) {
            if (existingSectors.length < 1) return;
            if (newSectors.length < 1) return;
            worldVO.resetPaths();
            var pathToCenter = WorldCreatorRandom.findPath(worldVO, newSectors[0].position, existingSectors[0].position, false, true);
            if (!pathToCenter) {
                var pair = WorldCreatorHelper.getClosestPair(existingSectors, newSectors);
                var pairDist = PositionConstants.getDistanceTo(pair[0].position, pair[1].position);
                var options2 = this.getDefaultOptions();
                this.createPathBetween(worldVO, levelVO, pair[0].position, pair[1].position, -1, options2);
            }
        },

        createGapFills: function (worldVO, levelVO) {
            var getFurthestPair = function () {
                var furthestPathDist = 0;
                var furthestPair = [null, null];
                for (var i = 0; i < levelVO.sectors.length; i++) {
                    var sector1 = levelVO.sectors[i];
                    for (var j = i; j < levelVO.sectors.length; j++) {
                        var sector2 = levelVO.sectors[j];
                        if (sector1.stage != sector2.stage) continue;
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
                return { sectors: furthestPair, pathDist: furthestPathDist };
            }
            
            var currentPair = getFurthestPair();
            
            var i = 0;
            while (currentPair.pathDist > 15 && i < 100) {
                var sectors = this.createPathBetween(worldVO, levelVO, currentPair.sectors[0].position, currentPair.sectors[1].position);
                for (var j = 0; j < sectors.length; j++) {
                    sectors[j].isFill = true;
                }
                worldVO.resetPaths();
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

		createSector: function (levelVO, sectorPos, options) {
            sectorPos.normalize();
            options = options || this.getDefaultOptions();
            var stage = options.stage || this.getDefaultStage(levelVO, sectorPos);
            var criticalPathType = options.criticalPathType;
            var sectorVO = levelVO.getSector(sectorPos.sectorX, sectorPos.sectorY);
            var exists = sectorVO != null;
            var created = false;
            
            if (!exists) {
                var validResult = this.isValidSectorPosition(levelVO, sectorPos, stage, options);
                if (validResult.isValid) {
        			sectorVO = new SectorVO(sectorPos, levelVO.isCampable, levelVO.notCampableReason);
                    sectorVO.stage = stage;
                    sectorVO.isCamp = levelVO.isCampPosition(sectorPos);
                    sectorVO.isPassageUp = levelVO.isPassageUpPosition(sectorPos);
                    sectorVO.isPassageDown = levelVO.isPassageDownPosition(sectorPos);
                    if (criticalPathType) {
                        sectorVO.addToCriticalPath(criticalPathType);
                    }
        			created = levelVO.addSector(sectorVO);
                } else {
                    log.w("invalid sector pos: " + sectorPos + " " + stage + " " + validResult.reason);
                }
            }
            
            return { isNew: created, vo: sectorVO };
		},
        
        isValidSectorPosition: function (levelVO, sectorPos, stage, options) {
            // exception for critical paths
            if (options.criticalPathType) return { isValid: true };
            // blocking features
            if (WorldCreatorHelper.containsBlockingFeature(sectorPos, this.currentFeatures, true))
                return { isValid: false, reason: "feature" };
            // blocking stage elements
            for (var levelStage in levelVO.stageCenterPositions) {
                if (levelStage == stage) continue;
                var positions = levelVO.stageCenterPositions[levelStage];
                for (var i = 0; i < positions.length; i++) {
                    var pos = positions[i];
                    var dist = PositionConstants.getDistanceTo(pos, sectorPos);
                    if (dist < 2) {
                        return { isValid: false, reason: "stage" };
                    }
                }
            }
            // too many neighbours for this position or neighbouring positions
            var numNeighbours = levelVO.getNeighbourCount(sectorPos.sectorX, sectorPos.sectorY);
            if (numNeighbours > 5) {
                return { isValid: false, reason: "num neighbours" };
            }
            var neighbours = levelVO.getNeighbours(sectorPos.sectorX, sectorPos.sectorY);
            var directions = PositionConstants.getLevelDirections();
            for (var d in directions) {
                var direction = directions[d];
                var neighbour = neighbours[direction];
                if (neighbour) {
                    var neighbourNumNeighbours = levelVO.getNeighbourCount(neighbour.position.sectorX, neighbour.position.sectorY);
                    if (neighbourNumNeighbours >= 5) {
                        return { isValid: false, reason: "neighbour num neighbours" };
                    }
                }
            }
            // too far from center
            var excursionLen = WorldCreatorConstants.getMaxPathLength(levelVO.campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_2);
            if (PositionConstants.getDistanceTo(sectorPos, levelVO.levelCenterPosition) > excursionLen) return { isValid: false, reason: "excursion length" };
            return { isValid: true };
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
                    if (isMiddle) {
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
                    log.w("unknown path connectio point type: " + type);
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
                    log.w("unknown rectangle connection point type: " + rectConnectionPointType);
                    return null;
            }
        },
        
        getStructureOffset: function (levelVO, maxoffset, pois, getPathsFunc) {
            var offsetx = 0;
            var offsety = 0;
            var checkOffset = function (x, y) {
                var points = 0;
                var paths = getPathsFunc(x, y);
                for (var i = 0; i < paths.length; i++) {
                    var path = paths[i];
                    for (var p = 0; p < pois.length; p++) {
                        var poi = pois[p];
                        if (PositionConstants.isOnPath(poi, path.startPos, path.dir, path.len)) {
                            points++;
                        }
                    }
                    for (var j = 0; j < path.len; j++) {
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
            for (var i = 0; i < candidates.length; i++) {
                var points = checkOffset(candidates[i].sectorX, candidates[i].sectorY);
                if (points > bestpoints) {
                    offsetx = candidates[i].sectorX;
                    offsety = candidates[i].sectorY;
                    bestpoints = points;
                }
            }
            return { x: offsetx, y: offsety };
        },
        
        getRequiredPaths: function (worldVO, levelVO) {
            var level = levelVO.level;
            var campOrdinal = levelVO.campOrdinal;
            var campPositions = levelVO.campPositions;
            var passageUpPosition = levelVO.passageUpPosition;
            var passageDownPosition = levelVO.passageDownPosition;
            
            var maxPathLenP2P = WorldCreatorConstants.getMaxPathLength(campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE);
            var maxPathLenC2P = WorldCreatorConstants.getMaxPathLength(campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE);
            
            var requiredPaths = [];
            
            if (campPositions.length > 0) {
                // passages up -> camps -> passages down
                var isGoingDown = level <= 13 && level >= worldVO.bottomLevel;
                var passageUpPathType = isGoingDown ? WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_CAMP : WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE;
                var passageUpStage = isGoingDown ? WorldConstants.CAMP_STAGE_EARLY : null;
                var passageDownPathType = isGoingDown ? WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE : WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_CAMP;
                var passageDownStage = isGoingDown ? null : WorldConstants.CAMP_STAGE_EARLY;
                if (level == 13) {
                    passageUpPathType = WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE;
                    passageUpStage = null;
                    passageDownPathType = WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE;
                    passageDownStage = null;
                }
                for (var i = 1; i < campPositions.length; i++) {
                    requiredPaths.push({ start: campPositions[0], end: campPositions[i], maxlen: -1, type: "camp_pos_to_camp_pos", stage: WorldConstants.CAMP_STAGE_EARLY });
                }
                if (passageUpPosition) {
                    var closerCamp = WorldCreatorHelper.getClosestPosition(campPositions, passageUpPosition);
                    requiredPaths.push({ start: closerCamp, end: passageUpPosition, maxlen: maxPathLenC2P, type: passageUpPathType, stage: passageUpStage });
                }
                if (passageDownPosition) {
                    var closerCamp = WorldCreatorHelper.getClosestPosition(campPositions, passageDownPosition);
                    requiredPaths.push({ start: closerCamp, end: passageDownPosition, maxlen: maxPathLenC2P, type: passageDownPathType, stage: passageDownStage });
                }
            } else if (!passageUpPosition) {
                // just passage down sector
                if (passageDownPosition) {
                    requiredPaths.push({ start: passageDownPosition, end: passageDownPosition, maxlen: 1, type: WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE, stage: WorldConstants.CAMP_STAGE_LATE });
                }
            } else if (!passageDownPosition) {
                // just passage up sector
                if (passageUpPosition) {
                    requiredPaths.push({ start: passageUpPosition, end: passageUpPosition, maxlen: 1, type: WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE, stage: WorldConstants.CAMP_STAGE_LATE });
                }
            } else {
                // passage up -> passage down
                requiredPaths.push({ start: passageUpPosition, end: passageDownPosition, maxlen: maxPathLenP2P, type: WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE, stage: WorldConstants.CAMP_STAGE_LATE });
            }
            return requiredPaths;
        },
        
        getPathStartPositions: function (levelVO, options) {
            var connectionPoints = levelVO.getPendingConnectionPoints(options.stage);
            if (connectionPoints.length > 0) {
                var point = connectionPoints.shift();
                var sector = levelVO.getSector(point.position.sectorX, point.position.sectorY);
                sector.isConnectionPoint = true;
                if (sector) return [ point ];
            }
            if (!options.stage)
                return levelVO.sectors;
            if (options.canConnectToDifferentStage)
                return levelVO.sectors;
            var stageSectors = levelVO.getSectorsByStage(options.stage);
            if (stageSectors && stageSectors.length > 0)
                return stageSectors;
            return levelVO.sectors;
        },
        
        getDefaultStage: function (levelVO, sectorPos) {
            var result = null;
            var shortestDist = -1;
            for (var stage in levelVO.stageCenterPositions) {
                var positions = levelVO.stageCenterPositions[stage];
                for (var i = 0; i < positions.length; i++) {
                    var pos = positions[i];
                    var dist = PositionConstants.getDistanceTo(pos, sectorPos);
                    if (shortestDist < 0 || dist < shortestDist) {
                        result = stage;
                        shortestDist = dist;
                    }
                }
            }
            if (shortestDist < 0 || shortestDist > 18) {
                return WorldConstants.CAMP_STAGE_LATE;
            }
            return result;
        },
        
        getDefaultOptions: function (options) {
            options = options || {};
            return { stage: options.stage, criticalPathType: options.criticalPathType, canConnectToDifferentStage: options.canConnectToDifferentStage };
        },

    };
    
    return StructureGenerator;
});
