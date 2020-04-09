// Handles the first step of world generation, the abstract world template itself
define([
	'ash',
	'worldcreator/WorldCreatorConstants',
    'worldcreator/WorldCreatorHelper',
    'worldcreator/WorldCreatorRandom',
	'worldcreator/LevelVO',
], function (Ash, WorldCreatorConstants, WorldCreatorHelper, WorldCreatorRandom, LevelVO) {
    
    var LevelGenerator = {
        
        prepareLevels: function (seed, worldVO) {
            this.generateLevels(seed, worldVO);
        },
        
        generateLevels: function (seed, worldVO) {
			var topLevel = WorldCreatorHelper.getHighestLevel(seed);
			var bottomLevel = WorldCreatorHelper.getBottomLevel(seed);
			for (var l = topLevel; l >= bottomLevel; l--) {
                worldVO.addLevel(new LevelVO(l));
            }
        }
        
    };
    
    return LevelGenerator;
});
