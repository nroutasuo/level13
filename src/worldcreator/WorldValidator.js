define([
	'ash',
    'utils/MathUtils',
	'game/constants/WorldConstants',
    'worldcreator/WorldCreatorHelper',
    'worldcreator/WorldCreatorRandom',
    'worldcreator/WorldCreatorDebug',
    'worldcreator/EnemyCreator',
	'worldcreator/WorldVO',
	'worldcreator/LevelVO',
	'worldcreator/SectorVO',
	'worldcreator/WorldGenerator',
	'worldcreator/LevelGenerator',
	'worldcreator/StructureGenerator',
	'worldcreator/SectorGenerator',
], function (
    Ash, MathUtils, WorldConstants,
    WorldCreatorHelper, WorldCreatorRandom, WorldCreatorDebug, EnemyCreator,
    WorldVO, LevelVO, SectorVO, WorldGenerator, LevelGenerator, StructureGenerator, SectorGenerator,
) {
    var context = "WorldValidator";

    var WorldValidator = {

        validateWorld: function (worldVO) {
            var checks = [ this.checkSeed, this.checkCriticalPaths ];
            for (var i = 0; i < checks.length; i++) {
                var checkResult = checks[i](worldVO);
                if (!checkResult.isValid) {
                    return { isValid: false, reason: checkResult.reason };
                }
            }
            return { isValid: true };
        },
        
        checkSeed: function (worldVO) {
            if (worldVO.seed > 4000 && worldVO.seed < 5000) {
                return { isValid: false, reason: "seed range" };
            }
            return { isValid: true };
        },
        
        checkCriticalPaths: function (worldVO) {
            return { isValid: true };
        },

    };

    return WorldValidator;
});
