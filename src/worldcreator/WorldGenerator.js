// Handles the first step of world generation, the abstract world template itself
define([
	'ash',
	'worldcreator/WorldCreatorConstants',
    'worldcreator/WorldCreatorRandom',
], function (Ash, WorldCreatorConstants, WorldCreatorRandom) {
    var WorldGenerator = {
        
        prepareWorld: function (seed, worldVO) {
            worldVO.holes = this.generateHoles(seed);
        },
        
        generateHoles: function (seed) {
            var result = [];
            // wells
            var num = 5;
            for (var i = 0; i < num; i++) {
                var pos = WorldCreatorRandom.randomSectorPosition(seed % 100 + i * 10, 0, WorldCreatorConstants.MAIN_AREA_SIZE);
                var h = 1 + i + WorldCreatorRandom.randomInt(seed % 33 + 101 + i * 8, 0, 5);
                var minS = Math.max(2, h / 4);
                var maxS = Math.min(10, h * 3);
                var x = WorldCreatorRandom.randomInt(seed % 50 + 66 + i * 3, minS, maxS);
                var y = WorldCreatorRandom.randomInt(seed % 33 + 101 + i * 8, minS, maxS);
                result.push({ pos: pos, sizeX: x, sizeY: y, height: h, type: "well" });
            }
            // collapses
            result.push({ pos: { sectorX: 0, sectorY: 0 }, sizeX: 10, sizeY: 10, height: 2, type: "collapse" });
            // geogrpahy
            // - sea to the west (bay)
            var bayR = 12;
            result.push({ pos: { sectorX: -WorldCreatorConstants.MAIN_AREA_SIZE - bayR, sectorY: 0 }, sizeX: bayR*2, sizeY: bayR*2, height: 100, type: "sea" });
            // - mountains to the east
            var num = 3;
            for (var i = 0; i < num; i++) {
                var x = WorldCreatorConstants.MAIN_AREA_SIZE - 10;
                var y = -20 + i * 11;
                var pos = { sectorX: x, sectorY: y };
                var h = 3 + i + WorldCreatorRandom.randomInt(seed % 22 + 80 + i * 11, 0, 6);
                var s = h * 3;
                result.push({ pos: pos, sizeX: s, sizeY: s, height: h, type: "mountain" });
            }
            return result;
        },
        
    };
    
    return WorldGenerator;
});
