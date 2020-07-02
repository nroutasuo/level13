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
            
            var levelChecks = [ this.checkCriticalPaths ];
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
            /*
            if (worldVO.seed > 9000 && worldVO.seed < 10000) {
                return { isValid: false, reason: "seed range" };
            }
            */
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

    };

    return WorldValidator;
});
