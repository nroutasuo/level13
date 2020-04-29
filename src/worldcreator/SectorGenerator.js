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
            
            var setSectorZone = function (sector, zone, area, force) {
                var existingZone = sector.zone;
                if (existingZone) {
                    var existingIndex = WorldCreatorConstants.getZoneOrdinal(existingZone);
                    var newIndex = WorldCreatorConstants.getZoneOrdinal(zone);
                    if (existingIndex <= newIndex) return;
                }
                sector.zone = zone;
                var d = area - 1;
                for (var x = sector.position.sectorX - d; x <= sector.position.sectorX + d; x++) {
                    for (var y = sector.position.sectorY - d; y <= sector.position.sectorY + d; y++) {
                        var neighbour = levelVO.getSector(x, y);
                        if (neighbour) {
                            var path = WorldCreatorRandom.findPath(worldVO, sector.position, neighbour.position, false, true);
                            if (path && path.length <= d) {
                                neighbour.zone = zone;
                            }
                        }
                    }
                }
            };
            
            var setPathZone = function (path, zone, area) {
                for (var i = 0; i < path.length; i++) {
                    var pos = path[i];
                    var sector = levelVO.getSector(pos.sectorX, pos.sectorY);
                    setSectorZone(sector, zone, area);
                }
            };
            
            setSectorZone(passage1, WorldConstants.ZONE_ENTRANCE, level == 14 ? 4 : 2);
            
            if (isCampableLevel) {
                // camp:
                var campSector = levelVO.getSector(levelVO.campPositions[0]);
                // path to camp ZONE_PASSAGE_TO_CAMP
                if (level != 13) {
                    setSectorZone(passage1, WorldConstants.ZONE_PASSAGE_TO_CAMP, 3);
                    setSectorZone(campSector, WorldConstants.ZONE_PASSAGE_TO_CAMP, 3);
                    var pathToCamp = WorldCreatorRandom.findPath(worldVO, passage1.position, campSector.position, false, true);
                    setPathZone(pathToCamp, WorldConstants.ZONE_PASSAGE_TO_CAMP, 2);
                }
                // path to passage2 ZONE_CAMP_TO_PASSAGE
                if (passage2) {
                    var pathToCamp = WorldCreatorRandom.findPath(worldVO, campSector.position, passage2.position, false, true);
                    setPathZone(pathToCamp, WorldConstants.ZONE_CAMP_TO_PASSAGE, 1);
                }
                // divide up the level into vornoi regions
                var points = WorldCreatorHelper.getVornoiPoints(seed, worldVO, levelVO, passage1, campSector);
                levelVO.zonePoints = points;
                // assign all sectors to a zone based on vornoi points
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
                    setSectorZone(sector, closestPoint.zone);
                }
                // split POI points between CAMP_TO_POI zones (1,2)
                // - find shortest distance to camp for each poi point
                var poipoints = [];
                var poipointSectorsTotal = 0;
                for (var i = 0; i < points.length; i++) {
                    var point = points[i];
                    if (point.zone != WorldConstants.ZONE_POI_TEMP) continue;
                    poipoints.push(point);
                    point.distanceToCamp = 9999;
                    for (var j = 0; j < point.sectors.length; j++) {
                        var sector = point.sectors[j];
                        var pathToCamp =  WorldCreatorRandom.findPath(worldVO, campSector.position, sector.position, false, true);
                        if (pathToCamp.length < point.distanceToCamp) {
                            point.distanceToCamp = pathToCamp.length;
                        }
                        poipointSectorsTotal++;
                    }
                }
                // - sort by distance
                poipoints.sort(function (a, b) {
                    return a.distanceToCamp - b.distanceToCamp;
                });
                // - assign closest ~half to ZONE_POI_1, rest to ZONE_POI_2
                var poipointSectorsAssigned = 0;
                for (var i = 0; i < poipoints.length; i++) {
                    var point = poipoints[i];
                    var zone = poipointSectorsAssigned / poipointSectorsTotal < 0.5 ? WorldConstants.ZONE_POI_1 : WorldConstants.ZONE_POI_2;
                    for (var j = 0; j < point.sectors.length; j++) {
                        var sector = point.sectors[j];
                        setSectorZone(sector, zone);
                        poipointSectorsAssigned++;
                    }
                }
            } else {
                // no camp:
                // area around passage1 and path from passage to passage is ZONE_PASSAGE_TO_PASSAGE
                setSectorZone(passage1, WorldConstants.ZONE_PASSAGE_TO_PASSAGE, 6);
                if (passage2) {
                    var pathPassageToPassage = WorldCreatorRandom.findPath(worldVO, passage1.position, passage2.position, false, true);
                    setPathZone(pathPassageToPassage, WorldConstants.ZONE_PASSAGE_TO_PASSAGE, 2);
                }
            }
            
            // rest ZONE_EXTRA
            for (var i = 0; i < levelVO.sectors.length; i++) {
                var sector = levelVO.sectors[i];
                if (!sector.zone) {
                    if (isCampableLevel) {
                        sector.zone = WorldConstants.ZONE_EXTRA_CAMPABLE;
                    } else {
                        sector.zone = WorldConstants.ZONE_EXTRA_UNCAMPABLE;
                    }
                }
            }
        },
        
    };
    
    return SectorGenerator;
});
