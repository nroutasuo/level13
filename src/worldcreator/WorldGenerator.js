// Handles the first step of world generation, the abstract world template itself
define([
	'ash',
	'worldcreator/WorldCreatorConstants',
	'worldcreator/WorldCreatorHelper',
    'worldcreator/WorldCreatorRandom',
    'worldcreator/WorldFeatureVO',
	'game/vos/PositionVO',
], function (Ash, WorldCreatorConstants, WorldCreatorHelper, WorldCreatorRandom, WorldFeatureVO, PositionVO) {
    var WorldGenerator = {
        
        prepareWorld: function (seed, worldVO) {
            worldVO.features = worldVO.features.concat(this.generateHoles(seed));
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
        
    };
    
    return WorldGenerator;
});
