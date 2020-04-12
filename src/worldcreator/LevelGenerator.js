// Handles the first step of world generation, the abstract world template itself
define([
	'ash',
    'game/constants/WorldConstants',
	'worldcreator/WorldCreatorConstants',
    'worldcreator/WorldCreatorHelper',
    'worldcreator/WorldCreatorRandom',
	'worldcreator/LevelVO',
	'worldcreator/ZoneVO',
], function (Ash, WorldConstants, WorldCreatorConstants, WorldCreatorHelper, WorldCreatorRandom, LevelVO, ZoneVO) {
    
    var LevelGenerator = {
        
        prepareLevels: function (seed, worldVO) {
			var topLevel = WorldCreatorHelper.getHighestLevel(seed);
			var bottomLevel = WorldCreatorHelper.getBottomLevel(seed);
			for (var l = topLevel; l >= bottomLevel; l--) {
                var isCampableLevel = WorldCreatorHelper.isCampableLevel(seed, l);
                var isHardLevel = WorldCreatorHelper.isHardLevel(seed, l);
                var notCampableReason = isCampableLevel ? null : WorldCreatorHelper.getNotCampableReason(seed, l);
                var ordinal = WorldCreatorHelper.getLevelOrdinal(seed, l);
                var campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, l);
                var populationFactor = isCampableLevel ? WorldCreatorConstants.getPopulationFactor(campOrdinal) : 0;
                var isSmallLevel = !isCampableLevel && l !== bottomLevel && l < topLevel - 1;
                var numSectors = WorldCreatorConstants.getNumSectors(campOrdinal, isSmallLevel);
                
                var levelVO = new LevelVO(l, ordinal, campOrdinal, isCampableLevel, isHardLevel, notCampableReason, populationFactor, numSectors);
                levelVO.campPositions = worldVO.campPositions[l];
                levelVO.passageUpPosition = worldVO.passagePositions[l].up;
                levelVO.passageDownPosition = worldVO.passagePositions[l].down;
                levelVO.zones = this.generateZones(seed, levelVO);
                worldVO.addLevel(levelVO);
            }
        },
        
        generateZones: function (seed, levelVO) {
            var result = [];
            result.push(new ZoneVO(levelVO.campOrdinal, WorldConstants.ZONE_ENTRANCE));
            if (levelVO.isCampable) {
                if (levelVO.level != 13) {
                    result.push(new ZoneVO(levelVO.campOrdinal, WorldConstants.ZONE_PASSAGE_TO_CAMP));
                }
                result.push(new ZoneVO(levelVO.campOrdinal, WorldConstants.ZONE_POI_1));
                result.push(new ZoneVO(levelVO.campOrdinal, WorldConstants.ZONE_POI_2));
                result.push(new ZoneVO(levelVO.campOrdinal, WorldConstants.ZONE_CAMP_TO_PASSAGE));
                result.push(new ZoneVO(levelVO.campOrdinal, WorldConstants.ZONE_EXTRA_CAMPABLE));
            } else {
                result.push(new ZoneVO(levelVO.campOrdinal, WorldConstants.ZONE_PASSAGE_TO_PASSAGE));
                result.push(new ZoneVO(levelVO.campOrdinal, WorldConstants.ZONE_EXTRA_UNCAMPABLE));
            }
            return result;
        },
        
    };
    
    return LevelGenerator;
});
