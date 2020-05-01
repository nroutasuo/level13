// Handles the first step of world generation, the abstract world template itself
define([
	'ash',
    'game/constants/PositionConstants',
    'game/constants/WorldConstants',
	'worldcreator/WorldCreatorConstants',
    'worldcreator/WorldCreatorHelper',
    'worldcreator/WorldCreatorRandom'
], function (Ash, PositionConstants, WorldConstants, WorldCreatorConstants, WorldCreatorHelper, WorldCreatorRandom) {
    
    var SectorGenerator = {
        
        prepareSectors: function (seed, worldVO) {
            for (var l = worldVO.topLevel; l >= worldVO.bottomLevel; l--) {
                var levelVO = worldVO.levels[l];
                this.generateZones(seed, worldVO, levelVO);
            }
        },
        
        generateZones: function (seed, worldVO, levelVO) {
            var level = levelVO.level;
            log.i("generate level zones " + level);
			var bottomLevel = worldVO.bottomLevel;
            var isCampableLevel = levelVO.isCampable;
            var isGoingDown = level <= 13 && level >= bottomLevel;
            var passageUp = levelVO.getSector(levelVO.passageUpPosition);
            var passageDown = levelVO.getSector(levelVO.passageDownPosition);
            var passage1 = isGoingDown ? passageUp : passageDown;
            var passage2 = isGoingDown ? passageDown : passageUp;
            
            var setSectorZone = function (sector, zone, force) {
                var existingZone = sector.zone;
                if (existingZone) {
                    var existingIndex = WorldCreatorConstants.getZoneOrdinal(existingZone);
                    var newIndex = WorldCreatorConstants.getZoneOrdinal(zone);
                    if (existingIndex <= newIndex) return;
                }
                var stage = sector.stage;
                if (!WorldConstants.isAllowedZone(stage, zone)) {
                    if (force) {
                        log.w("incompatible zone: " + sector.position + " stage: " + stage + " zone: " + zone);
                    } else {
                        return;
                    }
                }
                sector.zone = zone;
            };
            
            var setAreaZone = function (sector, zone, area, forceArea) {
                forceArea = forceArea || 0;
                setSectorZone(sector, zone, forceArea > 0);
                var d = area - 1;
                for (var x = sector.position.sectorX - d; x <= sector.position.sectorX + d; x++) {
                    for (var y = sector.position.sectorY - d; y <= sector.position.sectorY + d; y++) {
                        var neighbour = levelVO.getSector(x, y);
                        if (neighbour) {
                            var path = WorldCreatorRandom.findPath(worldVO, sector.position, neighbour.position, false, true);
                            if (path && path.length <= d) {
                                setSectorZone(neighbour, zone, forceArea > path.length);
                            }
                        }
                    }
                }
            };
            
            var setPathZone = function (path, zone, area, forceArea) {
                for (var i = 0; i < path.length; i++) {
                    var pos = path[i];
                    var sector = levelVO.getSector(pos.sectorX, pos.sectorY);
                    setAreaZone(sector, zone, area, forceArea);
                }
            };
                        
            // entrance to level ZONE_ENTRANCE
            setAreaZone(passage1, WorldConstants.ZONE_ENTRANCE, level == 14 ? 4 : 2, 2);
            
            if (isCampableLevel) {
                // camp:
                var campSector = levelVO.getSector(levelVO.campPositions[0]);
                // - path to camp ZONE_PASSAGE_TO_CAMP
                if (level != 13) {
                    setAreaZone(passage1, WorldConstants.ZONE_PASSAGE_TO_CAMP, 3, 1);
                    setAreaZone(campSector, WorldConstants.ZONE_PASSAGE_TO_CAMP, 3, 1);
                    var pathToCamp = WorldCreatorRandom.findPath(worldVO, passage1.position, campSector.position, false, true, WorldConstants.CAMP_STAGE_EARLY);
                    setPathZone(pathToCamp, WorldConstants.ZONE_PASSAGE_TO_CAMP, 2, 1);
                }
                // - path to passage2 ZONE_CAMP_TO_PASSAGE
                if (passage2) {
                    var pathToCamp = WorldCreatorRandom.findPath(worldVO, campSector.position, passage2.position, false, true);
                    setPathZone(pathToCamp, WorldConstants.ZONE_CAMP_TO_PASSAGE, 1, 1);
                }
                // - rest ZONE_POI_1, ZONE_POI_2, ZONE_EXTRA_CAMPABLE depending on stage and vornoi points
                var points = WorldCreatorHelper.getVornoiPoints(seed, worldVO, levelVO);
                for (var i = 0; i < levelVO.sectors.length; i++) {
                    var sector = levelVO.sectors[i];
                    var closestPoint = null;
                    var closestPointDist = 0;
                    for (var j = 0; j < points.length; j++) {
                        var point = points[j];
                        var dist = PositionConstants.getDistanceTo(sector.position, point.position);
                        if (closestPoint == null || dist < closestPointDist) {
                            closestPoint = point;
                            closestPointDist = dist;
                        }
                    }
                    closestPoint.sectors.push(sector);
                    var zone = closestPoint.zone;
                    if (zone == WorldConstants.ZONE_POI_TEMP) {
                        zone = sector.stage == WorldConstants.CAMP_STAGE_EARLY ? WorldConstants.ZONE_POI_1 : WorldConstants.ZONE_POI_2;
                    }
                    setSectorZone(sector, zone);
                }
            } else {
                // no camp:
                // - area around passage1 and path from passage to passage is ZONE_PASSAGE_TO_PASSAGE
                setAreaZone(passage1, WorldConstants.ZONE_PASSAGE_TO_PASSAGE, 6, 2);
                if (passage2) {
                    var pathPassageToPassage = WorldCreatorRandom.findPath(worldVO, passage1.position, passage2.position, false, true);
                    setPathZone(pathPassageToPassage, WorldConstants.ZONE_PASSAGE_TO_PASSAGE, 2, true);
                }
                // - rest is ZONE_EXTRA_UNCAMPABLE
                for (var i = 0; i < levelVO.sectors.length; i++) {
                    var sector = levelVO.sectors[i];
                    setSectorZone(sector, WorldConstants.ZONE_EXTRA_UNCAMPABLE, true);
                }
            }
        },
        
    };
    
    return SectorGenerator;
});
