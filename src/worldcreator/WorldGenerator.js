// Handles the first step of world generation, the abstract world template itself
define([
	'ash',
	'worldcreator/WorldCreatorConstants',
	'worldcreator/WorldCreatorHelper',
    'worldcreator/WorldCreatorRandom',
    'worldcreator/WorldFeatureVO',
	'game/vos/PositionVO',
    'game/constants/PositionConstants',
], function (Ash, WorldCreatorConstants, WorldCreatorHelper, WorldCreatorRandom, WorldFeatureVO, PositionVO, PositionConstants) {
    
    var WorldGenerator = {
        
        prepareWorld: function (seed, worldVO) {
            worldVO.features = worldVO.features.concat(this.generateHoles(seed));
            worldVO.campPositions = this.generateCampPositions(seed, worldVO.features);
            worldVO.passagePositions = this.generatePassagePositions(seed, worldVO.features, worldVO.campPositions);
        },
        
        generateHoles: function (seed) {
            var result = [];
			var topLevel = WorldCreatorHelper.getHighestLevel(seed);
			var bottomLevel = WorldCreatorHelper.getBottomLevel(seed);
            
            // wells
            var num = 5;
            for (var i = 0; i < num; i++) {
                var pos = WorldCreatorRandom.randomSectorPosition(seed % 100 + i * 10, 0, WorldCreatorConstants.MAIN_AREA_SIZE);
                var h = 1 + i + WorldCreatorRandom.randomInt(seed % 33 + 101 + i * 8, 0, 5);
                var minS = Math.max(i + 1, h / 4);
                var maxS = Math.min(10, h * 3);
                var x = WorldCreatorRandom.randomInt(seed % 50 + 66 + i * 31, minS, maxS);
                var y = WorldCreatorRandom.randomInt(seed % 33 + 101 + i * 82, minS, maxS);
                result.push(new WorldFeatureVO(pos.sectorX, pos.sectorX, x, y, topLevel - h, topLevel, WorldCreatorConstants.FEATURE_HOLE_WELL));
            }
            
            // collapses
            result.push(new WorldFeatureVO(0, 0, 8, 8, topLevel - 2, topLevel, WorldCreatorConstants.FEATURE_HOLE_COLLAPSE));
            
            // geogrpahy
            // - sea to the west (bay)
            var bayR = 12;
            result.push(new WorldFeatureVO(-WorldCreatorConstants.MAIN_AREA_SIZE, 0, bayR*2, bayR*2, bottomLevel, topLevel, WorldCreatorConstants.FEATURE_HOLE_SEA));
            // - mountains to the east
            var num = 3;
            for (var i = 0; i < num; i++) {
                var x = WorldCreatorConstants.MAIN_AREA_SIZE - 10;
                var y = -20 + i * 11;
                var h = 3 + i + WorldCreatorRandom.randomInt(seed % 22 + 80 + i * 11, 0, 6);
                var s = h * 3;
                result.push(new WorldFeatureVO(x, y, s, s, bottomLevel, bottomLevel + h, WorldCreatorConstants.FEATURE_HOLE_MOUNTAIN));
            }
            
            return result;
        },
        
        generateCampPositions: function (seed, features) {
            var result = [];
			var topLevel = WorldCreatorHelper.getHighestLevel(seed);
			var bottomLevel = WorldCreatorHelper.getBottomLevel(seed);
            var maxCampDist = 4;
            var isValid = function (pos) {
                return !WorldGenerator.containsBlockingFeature(pos, features);
            };
			for (var l = topLevel; l >= bottomLevel; l--) {
                var positions = [];
                var isCampableLevel = WorldCreatorHelper.isCampableLevel(seed, l);
                var campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, l);
                var maxPathLen = WorldCreatorConstants.getMaxPathLength(campOrdinal - 1, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE);
                var maxCenterDist = maxPathLen / 2 - maxCampDist;
                if (isCampableLevel) {
                    var center = new PositionVO(l, 0, 0);
                    var firstPos = new PositionVO(l, 0, 0);
                    if (l != 13) {
                        firstPos = WorldCreatorRandom.randomSectorPositionWithCheck(seed % 10 + (l+10) * 55, l, maxCenterDist, center, 0, isValid);
                    }
                    positions.push(firstPos);
                    if (l != 13) {
                        var secondPos = WorldCreatorRandom.randomSectorPositionWithCheck(seed % 100 + (l+5)*10, l, maxCampDist, firstPos, 1, isValid);
                        positions.push(secondPos);
                    }
                }
                result[l] = positions;
            }
            return result;
        },
        
        generatePassagePositions: function (seed, features, campPositions) {
            var result = [];
			var topLevel = WorldCreatorHelper.getHighestLevel(seed);
			var bottomLevel = WorldCreatorHelper.getBottomLevel(seed);
			for (var l = topLevel; l >= bottomLevel; l--) {
                var campThisUp = this.getNextCampPosUp(seed, campPositions, l, true);
                var campPosDown =  this.getNextCampPosDown(seed, campPositions, l, false);
                var up = l == topLevel ? null : result[l+1].down;
                var down = l == bottomLevel ? null : this.getPassagePosition(seed, l, features, campThisUp, campPosDown);
                result[l] = { up: up, down: down };
            }
            return result;
        },
        
        getPassagePosition: function (seed, level, features, campPos1, campPos2) {
            var campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, level);
            
            // find the camp positions furtherst away from one another (max camp-to-camp path length)
            if (campPos1.length == 0) campPos1.push(new PositionVO(level, 0, 0));
            if (campPos2.length == 0) campPos2.push(new PositionVO(level, 0, 0));
            var middle1 = PositionConstants.getMiddlePoint(campPos1);
            var middle2 = PositionConstants.getMiddlePoint(campPos2);
            campPos1.sort(function (a, b) { return PositionConstants.getDistanceTo(b, middle2) - PositionConstants.getDistanceTo(a, middle2); });
            campPos2.sort(function (a, b) { return PositionConstants.getDistanceTo(b, middle1) - PositionConstants.getDistanceTo(a, middle1); });
            var furthest1 = campPos1[0];
            var furthest2 = campPos2[0];;
            
            // find average of the max positions = position that adds 0 to the max path length
            var allPos = [furthest1, furthest2];
            var averagePos = PositionConstants.getMiddlePoint(allPos);
            
            // find out how much we can afford to add to the max path length by moving the passage from the "optimal" position
            var maxPathLength = WorldCreatorConstants.getMaxPathLength(campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE);
            var minPathLength = Math.ceil(Math.max(PositionConstants.getDistanceTo(averagePos, furthest1), PositionConstants.getDistanceTo(averagePos, furthest2)));
            var maxDiff = Math.floor((maxPathLength - minPathLength * 2) / 2);
            var minDiff = Math.floor(maxDiff / 2);
            
            // select random sector around averagePos
            var minCampPos = 2;
            var isValid = function (pos) {
                if (WorldGenerator.containsBlockingFeature(pos, features)) return false;
                for (var i = 0; i < campPos1.length; i++) {
                    if (PositionConstants.getDistanceTo(campPos1[i], pos) < minCampPos) return false;
                }
                for (var i = 0; i < campPos2.length; i++) {
                    if (PositionConstants.getDistanceTo(campPos2[i], pos) < minCampPos) return false;
                }
                return true;
            };
            var result = WorldCreatorRandom.randomSectorPositionWithCheck(seed % 1000 + 7 + (level+13)*101, level, maxDiff, averagePos, minDiff, isValid);
            var pathLen = Math.ceil(PositionConstants.getDistanceTo(furthest1, result) + PositionConstants.getDistanceTo(result, furthest2));
            
            return result;
            
        },
        
        getNextCampPosUp: function (seed, campPositions, from, inclusive) {
            var topLevel = WorldCreatorHelper.getHighestLevel(seed);
            var start = inclusive ? from : from + 1;
            for (var i = start; i <= topLevel; i++) {
                if (campPositions[i] && campPositions[i].length > 0) {
                    return campPositions[i];
                }
            }
            return null;
        },
        
        getNextCampPosDown: function (seed, campPositions, from, inclusive) {
            var bottomLevel = WorldCreatorHelper.getBottomLevel(seed);
            var start = inclusive ? from : from - 1;
            for (var i = start; i >= bottomLevel; i--) {
                if (campPositions[i] && campPositions[i].length > 0) {
                    return campPositions[i];
                }
            }
            return [];
        },

        containsBlockingFeature: function (pos, features) {
            for (var i = 0; i < features.length; i++) {
                var feature = features[i];
                if (feature.containsPosition(pos)) {
                    return true;
                }
            }
            return false;
        },

    };
    
    return WorldGenerator;
});
