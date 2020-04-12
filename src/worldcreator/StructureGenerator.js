// Handles the first step of world generation, the abstract world template itself
define([
	'ash',
    'game/constants/PositionConstants',
    'game/vos/PositionVO',
	'worldcreator/WorldCreatorConstants',
    'worldcreator/WorldCreatorHelper',
    'worldcreator/WorldCreatorRandom',
    'worldcreator/SectorVO',
], function (Ash, PositionConstants, PositionVO, WorldCreatorConstants, WorldCreatorHelper, WorldCreatorRandom, SectorVO) {
    
    var StructureGenerator = {
        
        prepareStructure: function (seed, worldVO) {
			for (var l = worldVO.topLevel; l >= worldVO.bottomLevel; l--) {
                var levelVO = worldVO.levels[l];
                this.createLevelStructure(seed, worldVO, levelVO);
            }
        },
        
        createLevelStructure: function(seed, worldVO, levelVO) {
			var topLevel = WorldCreatorHelper.getHighestLevel(seed);
			var bottomLevel = WorldCreatorHelper.getBottomLevel(seed);
            var l = levelVO.level;

            // create central structure
            var centerSize = 5;
            if (l < 8) centerSize = 3;
            if (l === bottomLevel) centerSize = 7;
            if (l === topLevel) centerSize = 3;
            this.createRectangleFromCenter(levelVO, 0, new PositionVO(levelVO.level, 0, 0), centerSize * 2, centerSize * 2);
            
            // generate required paths (between camp positions and passages)
            var requiredPaths = this.getRequiredPaths(levelVO);
            this.createRequiredPaths(seed, worldVO, levelVO, requiredPaths);
            
            /*
            // create the rest of the sectors randomly
            var attempts = 0;
            var maxAttempts = 1000;
            while (levelVO.sectors.length < levelVO.numSectors && attempts < maxAttempts) {
                attempts++;
                if (attempts % 2 !== 0) {
                    var isMassiveRectangle = levelVO.sectors.length < levelVO.numSectors / 4;
                    this.createRectangles(seed, attempts, levelVO, isMassiveRectangle);
                } else {
                    this.createPaths(seed, attempts, levelVO);
                }
            }
            
            // connect sectors that are close by direct distance by very far by path length
            this.createGapFills(worldVO, levelVO);
            */
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
                // generate required path
                var overshoot = WorldCreatorRandom.randomInt(seed % 22 * 100 + levelVO.level * 10 + i * 66, 2, 8);
                var path = this.createPathBetween(seed, levelVO, startPos, endPos, path.maxlen, path.type, overshoot);
                // ensure new path is connected to the rest of the level
                /*
                var pathToCenter = WorldCreatorRandom.findPath(worldVO, startPos, levelVO.sectors[0].position, false, true);
                if (!pathToCenter) {
                    var pair = WorldCreatorHelper.getClosestPair(levelVO.sectors, path);
                    var pairDist = PositionConstants.getDistanceTo(pair[0].position, pair[1].position);
                    this.createPathBetween(seed, levelVO, pair[0].position, pair[1].position, -1, path.type);
                }
                */
            }
        },

        createRectangles: function (seed, pathSeed, levelVO, isMassive) {
            var l = levelVO.levelOrdinal;
            var pathRandomSeed = levelVO.sectors.length * 4 + l + pathSeed * 5;
            var startingPosArray = levelVO.sectors;
            var pathStartingI = Math.floor(WorldCreatorRandom.random(seed * 938 * (l + 60) / pathRandomSeed + 2342 * l) * startingPosArray.length);
            var pathStartingPos = startingPosArray[pathStartingI].position.clone();

            var isDiagonal = WorldCreatorRandom.random(seed + (l * 44) * pathRandomSeed + pathSeed) < WorldCreatorConstants.DIAGONAL_PATH_PROBABILITY;
            var numRectangles = WorldCreatorRandom.randomInt((seed + pathRandomSeed * l - pathRandomSeed) / (pathSeed + 5), 1, 5);
            var startDirections = WorldCreatorRandom.randomDirections(seed * levelVO.levelOrdinal + 28381 + pathRandomSeed, numRectangles, false);
            var maxRectangleSize = isMassive ?
                WorldCreatorConstants.SECTOR_PATH_LENGTH_MAX * 3 / 4 :
                Math.min(WorldCreatorConstants.SECTOR_PATH_LENGTH_MAX / 2, levelVO.centralAreaSize / 2);
            var w = WorldCreatorRandom.randomInt(seed + pathRandomSeed / pathSeed + pathSeed * l, 4, maxRectangleSize);
            var h = WorldCreatorRandom.randomInt(seed + pathRandomSeed * l + pathSeed - pathSeed * l, 4, maxRectangleSize);

            var startDirection;
            for (var i = 0; i < numRectangles; i++) {
                if (!this.createRectangle(levelVO, i, pathStartingPos, w, h))
                    break;
            }
        },

        createRectangleFromCenter: function (levelVO, i, center, w, h) {
            var corner = new PositionVO(center.level, center.sectorX - w / 2, center.sectorY - h / 2);
            this.createRectangle(levelVO, i, corner, w, h, PositionConstants.DIRECTION_EAST);
        },

        createRectangle: function (levelVO, i, startPos, w, h, startDirection) {
            startDirection = startDirection || WorldCreatorRandom.randomDirections(i, 1, true)[0];
            var sideStartPos = startPos;
            var currentDirection = startDirection;
            for (var j = 0; j < 4; j++) {
                var sideLength = PositionConstants.isHorizontalDirection(currentDirection) ? w : h;
                var result = this.createPath(levelVO, sideStartPos, currentDirection, sideLength);
                if (!result.completed) return false;
                sideStartPos = PositionConstants.getPositionOnPath(sideStartPos, currentDirection, sideLength);
                currentDirection = PositionConstants.getNextClockWise(currentDirection, false);
            }
        },
        
        createPathBetween: function (seed, levelVO, startPos, endPos, maxlen, pathType, overshoot) {
            overshoot = overshoot || 0;
            var l = levelVO.level;
            var dist = Math.ceil(PositionConstants.getDistanceTo(startPos, endPos));
            var result = [];
            
            var pathLength;
            var totalLength = dist;
            if (dist == 0) {
                result.push(this.createSector(levelVO, startPos, null, pathType));
            } else if (dist == 1) {
                result.push(this.createSector(levelVO, startPos, null, pathType));
                result.push(this.createSector(levelVO, endPos, null, pathType));
            } else {
                var allowDiagonals = WorldCreatorRandom.randomBool(50000 + (l + 5) * 55 + dist * 555);
                var currentPos = startPos;
                var pathResult;
                var i = 0;
                while (!currentPos.equals(endPos)) {
                    var possibleDirections = PositionConstants.getDirectionsFrom(currentPos, endPos, allowDiagonals);
                    var directionIndex = WorldCreatorRandom.randomInt(seed % 10200 + l * 555 + dist * 77 + i * 1001, 0, possibleDirections.length);
                    var direction = possibleDirections[directionIndex];
                    pathLength = PositionConstants.getDistanceInDirection(currentPos, endPos, direction) + 1;
                    pathResult = this.createPath(levelVO, currentPos, direction, pathLength, true, pathType);
                    result = result.concat(pathResult.path);
                    currentPos = PositionConstants.getPositionOnPath(currentPos, direction, pathLength - 1);
                    i++;
                    if (i > 100) break;
                }
            }
            
            return result;
        },

        createPaths: function (seed, pathSeed, levelVO) {
            var l = levelVO.levelOrdinal;
            var pathRandomSeed = levelVO.sectors.length * 4 + l + pathSeed * 5;
            var startingPosArray = levelVO.sectors;
            var pathStartingI = Math.floor(WorldCreatorRandom.random(seed * 938 * (l + 60) / pathRandomSeed + 2342 * l) * startingPosArray.length);
            var pathStartingPos = startingPosArray[pathStartingI].position.clone();

            var canBeDiagonal = WorldCreatorRandom.random(seed + (l + 70) * pathRandomSeed) < WorldCreatorConstants.DIAGONAL_PATH_PROBABILITY;
            var pathDirections = WorldCreatorRandom.randomDirections(seed * levelVO.levelOrdinal + 28381 + pathRandomSeed, 1, canBeDiagonal);

            var pathLength;
            for (var di = 0; di < pathDirections.length; di++) {
                pathLength = WorldCreatorRandom.randomInt(seed * 3 * pathRandomSeed * (di + 1) + (di + 3) * l + 55, WorldCreatorConstants.SECTOR_PATH_LENGTH_MIN, WorldCreatorConstants.SECTOR_PATH_LENGTH_MAX);
                this.createPath(levelVO, pathStartingPos, pathDirections[di], pathLength);
            }
        },

        createPath: function (levelVO, startPos, direction, len, forceComplete, criticalPathType) {
            if (len < 1) return { path: [], completed: false };;
            var result = [];

            var requiredResources = null;
            var requiresWater = true;
            var requiresFood = true;
            var sectorPos;
            for (var si = 0; si < len; si++) {
                sectorPos = PositionConstants.getPositionOnPath(startPos, direction, si);
                sectorPos.level = levelVO.level;

                var sectorExists = levelVO.hasSector(sectorPos.sectorX, sectorPos.sectorY);

                // stop path when intersecting existing paths
                if (!forceComplete) {
                    var sectorHasUnmatchingNeighbours = false;
                    var neighbours = levelVO.getNeighbours(sectorPos.sectorX, sectorPos.sectorY);
                    if (neighbours[PositionConstants.DIRECTION_EAST] && neighbours[PositionConstants.DIRECTION_SOUTH]) sectorHasUnmatchingNeighbours = true;
                    if (neighbours[PositionConstants.DIRECTION_EAST] && neighbours[PositionConstants.DIRECTION_NORTH]) sectorHasUnmatchingNeighbours = true;
                    if (neighbours[PositionConstants.DIRECTION_WEST] && neighbours[PositionConstants.DIRECTION_SOUTH]) sectorHasUnmatchingNeighbours = true;
                    if (neighbours[PositionConstants.DIRECTION_WEST] && neighbours[PositionConstants.DIRECTION_NORTH]) sectorHasUnmatchingNeighbours = true;
                    if (sectorExists || sectorHasUnmatchingNeighbours || Object.keys(neighbours).length > 4) {
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

				result.push(this.createSector(levelVO, sectorPos, requiredResources, criticalPathType));
            }
            return { path: result, completed: true };
        },

        createGapFills: function (worldVO, levelVO) {
            var furthestPathDist = 0;
            var getFurthestPair = function () {
                var furthestPair = [null, null];
                furthestPathDist = 0;
                for (var i = 0; i < levelVO.sectors.length; i++) {
                    var sector1 = levelVO.sectors[i];
                    for (var j = i; j < levelVO.sectors.length; j++) {
                        var sector2 = levelVO.sectors[j];
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
                return furthestPair;
            }
            
            var currentPair = getFurthestPair();
            
            var i = 0;
            while (furthestPathDist > 15 && i < 10) {
                this.createPathBetween(0, levelVO, currentPair[0].position, currentPair[1].position);
                currentPair = getFurthestPair();
                i++;
            }
        },

		createSector: function (levelVO, sectorPos, requiredResources, criticalPathType) {
            var sectorVO = levelVO.getSector(sectorPos.sectorX, sectorPos.sectorY);
            if (!sectorVO) {
    			sectorVO = new SectorVO(sectorPos, levelVO.isCampable, levelVO.notCampableReason, requiredResources);
                sectorVO.isCamp = levelVO.isCampPosition(sectorPos);
                sectorVO.isPassageUp = levelVO.isPassageUpPosition(sectorPos);
                sectorVO.isPassageDown = levelVO.isPassageDownPosition(sectorPos);
    			levelVO.addSector(sectorVO);
            }
            if (criticalPathType) {
                sectorVO.addToCriticalPath(criticalPathType);
            }
            return sectorVO;
		},
        
        getRequiredPaths: function (levelVO) {
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
                var isGoingDown = level <= 13 && level >= levelVO.bottomLevel;
                var passageUpPathType = isGoingDown ? WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_CAMP : WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE;
                var passageDownPathType = isGoingDown ? WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE : WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_CAMP;
                if (level == 13) {
                    passageUpPathType = WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE;
                    passageDownPathType = WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE;
                }
                if (passageUpPosition) {
                    var closerCamp = WorldCreatorHelper.getClosestPosition(campPositions, passageUpPosition);
                    requiredPaths.push({ start: closerCamp, end: passageUpPosition, maxlen: maxPathLenC2P, type: passageUpPathType });
                }
                if (passageDownPosition) {
                    var closerCamp = WorldCreatorHelper.getClosestPosition(campPositions, passageDownPosition);
                    requiredPaths.push({ start: closerCamp, end: passageDownPosition, maxlen: maxPathLenC2P, type: passageDownPathType });
                }
                for (var i = 1; i < campPositions.length; i++) {
                    requiredPaths.push({ start: campPositions[0], end: campPositions[i], maxlen: -1, type: "camp_pos_to_camp_pos" });
                }
            } else if (!passageUpPosition) {
                // just passage down sector
                if (passageDownPosition) {
                    requiredPaths.push({ start: passageDownPosition, end: passageDownPosition, maxlen: 1, type: WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE });
                }
            } else if (!passageDownPosition) {
                // just passage up sector
                if (passageUpPosition) {
                    requiredPaths.push({ start: passageUpPosition, end: passageUpPosition, maxlen: 1, type: WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE });
                }
            } else {
                // passage up -> passage down
                requiredPaths.push({ start: passageUpPosition, end: passageDownPosition, maxlen: maxPathLenP2P, type: WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE });
            }
            return requiredPaths;
        },
        
    };
    
    return StructureGenerator;
});
