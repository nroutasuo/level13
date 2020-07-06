define([
	'ash',
    'utils/MathUtils',
	'game/constants/WorldConstants',
    'worldcreator/WorldCreatorHelper',
    'worldcreator/WorldCreatorRandom'
], function (
    Ash, MathUtils, WorldConstants, WorldCreatorHelper, WorldCreatorRandom
) {
    var context = "WorldValidator";

    var WorldValidator = {

        validateWorld: function (worldVO) {
            worldVO.resetPaths();
        
            var worldChecks = [ this.checkSeed ];
            for (var i = 0; i < worldChecks.length; i++) {
                var checkResult = worldChecks[i](worldVO);
                if (!checkResult.isValid) {
                    return { isValid: false, reason: checkResult.reason };
                }
            }
            
            var levelChecks = [ this.checkCriticalPaths, this.checkNumberOfSectors ];
			for (var l = worldVO.topLevel; l >= worldVO.bottomLevel; l--) {
                var levelVO = worldVO.levels[l];
                for (var i = 0; i < levelChecks.length; i++) {
                    var checkResult = levelChecks[i](worldVO, levelVO);
                    if (!checkResult.isValid) {
                        return { isValid: false, reason: checkResult.reason };
                    }
                }
            }
            
            return { isValid: true };
        },
        
        checkSeed: function (worldVO) {
            return { isValid: true };
        },
        
        checkCriticalPaths: function (worldVO, levelVO) {
            var requiredPaths = WorldCreatorHelper.getRequiredPaths(worldVO, levelVO);
            for (var i = 0; i < requiredPaths.length; i++) {
                var path = requiredPaths[i];
                var startPos = path.start.clone();
                var endPos = path.end.clone();
                if (startPos.equals(endPos)) continue;
                var sectorPath = WorldCreatorRandom.findPath(worldVO, startPos, endPos, false, true, path.stage);
                if (!sectorPath || sectorPath.length < 1) {
                    return { isValid: false, reason: "required path " + path.type + " on level " + levelVO.level + " is missing" };
                }
                if (path.maxlen > 0 && sectorPath.length > path.maxlen) {
                    return { isValid: false, reason: "required path " + path.type + " on level " + levelVO.level + " is too long (" + sectorPath.length + "/" + path.maxlen + ")" };
                }
            }
            return { isValid: true };
        },
        
        checkNumberOfSectors: function (worldVO, levelVO) {
            // NOTE: sectors per stage is a minimum used for evidence balancing etc, a bit of overshoot is ok
            if (levelVO.sectors.length < levelVO.numSectors) {
                return { isValid: false, reason: "too few sectors on level " + levelVO.level };
            }
            if (levelVO.sectors.length > levelVO.maxSectors) {
                return { isValid: false, reason: "too many sectors on level " + levelVO.level };
            }
            var stages = [ WorldConstants.CAMP_STAGE_EARLY, WorldConstants.CAMP_STAGE_LATE ];
            for (var i = 0; i < stages.length; i++) {
                var stage = stages[i];
                var numSectorsCreated = levelVO.getNumSectorsByStage(stage);
                var numSectorsPlanned = levelVO.numSectorsByStage[stage];
                if (numSectorsCreated < numSectorsPlanned) {
                    return { isValid: false, reason: "too few sectors on level " + levelVO.level + " stage " + stage };
                }
                if (numSectorsCreated > numSectorsPlanned * 1.1) {
                    return { isValid: false, reason: "too many sectors on level " + levelVO.level + " stage " + stage };
                }
            }
            return { isValid: true };
        },

    };

    return WorldValidator;
});
