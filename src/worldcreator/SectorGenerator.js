// Handles the first step of world generation, the abstract world template itself
define([
	'ash',
    'game/constants/PositionConstants',
    'game/constants/SectorConstants',
    'game/constants/WorldConstants',
	'worldcreator/WorldCreatorConstants',
    'worldcreator/WorldCreatorHelper',
    'worldcreator/WorldCreatorRandom',
    'worldcreator/WorldCreatorDebug'
], function (Ash, PositionConstants, SectorConstants , WorldConstants, WorldCreatorConstants, WorldCreatorHelper, WorldCreatorRandom, WorldCreatorDebug ) {
    
    var SectorGenerator = {
        
        prepareSectors: function (seed, worldVO) {
            for (var l = worldVO.topLevel; l >= worldVO.bottomLevel; l--) {
                var levelVO = worldVO.levels[l];
                this.generateZones(seed, worldVO, levelVO);
                for (var s = 0; s < levelVO.sectors.length; s++) {
                    var sectorVO = levelVO.sectors[s];
                    sectorVO.sectorType = this.getSectorType(seed, worldVO, levelVO, sectorVO);
                    this.generateTexture(seed, sectorVO);
                }
                
            }
            WorldCreatorDebug.printWorld(worldVO, [ "sectorType" ]);
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
        
        getSectorType: function (seed, worldVO, levelVO, sectorVO) {
            var level = levelVO.level;
            var r1 = 9000 + seed % 2000 + (levelVO.level + 5) * 11 + sectorVO.position.sectorX * 141 + sectorVO.position.sectorY * 153;
            var rand = WorldCreatorRandom.random(r1);
            
			var sectorType = SectorConstants.SECTOR_TYPE_MAINTENANCE;
            if (level == worldVO.topLevel) {
                // special level: top level
                sectorType = SectorConstants.SECTOR_TYPE_COMMERCIAL;
				if (rand < 0.6) sectorType = SectorConstants.SECTOR_TYPE_PUBLIC;
				if (rand < 0.4) sectorType = SectorConstants.SECTOR_TYPE_RESIDENTIAL;
				if (rand < 0.05) sectorType = SectorConstants.SECTOR_TYPE_MAINTENANCE;
            } else if (level > worldVO.topLevel - 4) {
				// levels near top: mainly residentai
                sectorType = SectorConstants.SECTOR_TYPE_COMMERCIAL;
				if (rand < 0.7) sectorType = SectorConstants.SECTOR_TYPE_PUBLIC;
				if (rand < 0.5) sectorType = SectorConstants.SECTOR_TYPE_RESIDENTIAL;
				if (rand < 0.05) sectorType = SectorConstants.SECTOR_TYPE_MAINTENANCE;
			} else if (level > worldVO.topLevel - 8) {
				// first dark levels: mainly recent industrial and maintenance
				sectorType = SectorConstants.SECTOR_TYPE_INDUSTRIAL;
				if (rand < 0.7) sectorType = SectorConstants.SECTOR_TYPE_COMMERCIAL;
				if (rand < 0.65) sectorType = SectorConstants.SECTOR_TYPE_PUBLIC;
				if (rand < 0.5) sectorType = SectorConstants.SECTOR_TYPE_MAINTENANCE;
				if (rand < 0.4) sectorType = SectorConstants.SECTOR_TYPE_RESIDENTIAL;
				if (rand < 0.2) sectorType = SectorConstants.SECTOR_TYPE_SLUM;
			} else if (level > 14) {
				// levels baove 14: slums and maintenance
				sectorType = SectorConstants.SECTOR_TYPE_MAINTENANCE;
				if (rand < 0.75) sectorType = SectorConstants.SECTOR_TYPE_PUBLIC;
				if (rand < 0.7) sectorType = SectorConstants.SECTOR_TYPE_INDUSTRIAL;
				if (rand < 0.5) sectorType = SectorConstants.SECTOR_TYPE_RESIDENTIAL;
				if (rand < 0.4) sectorType = SectorConstants.SECTOR_TYPE_SLUM;
            } else if (level == 14) {
                // special level: 14
				sectorType = SectorConstants.SECTOR_TYPE_INDUSTRIAL;
				if (rand < 0.25) sectorType = SectorConstants.SECTOR_TYPE_MAINTENANCE;
				if (rand < 0.35) sectorType = SectorConstants.SECTOR_TYPE_SLUM;
            } else if (level > 4) {
				// levels below 14: mix of slum, maintenance, and everything else
				sectorType = SectorConstants.SECTOR_TYPE_SLUM;
				if (rand < 0.5) sectorType = SectorConstants.SECTOR_TYPE_INDUSTRIAL;
				if (rand < 0.4) sectorType = SectorConstants.SECTOR_TYPE_MAINTENANCE;
				if (rand < 0.3) sectorType = SectorConstants.SECTOR_TYPE_RESIDENTIAL;
				if (rand < 0.2) sectorType = SectorConstants.SECTOR_TYPE_COMMERCIAL;
				if (rand < 0.1) sectorType = SectorConstants.SECTOR_TYPE_PUBLIC;
            } else if (level > worldVO.bottomLevel) {
                // levels near ground: old levels
				sectorType = SectorConstants.SECTOR_TYPE_SLUM;
				if (rand < 0.9) sectorType = SectorConstants.SECTOR_TYPE_INDUSTRIAL;
				if (rand < 0.8) sectorType = SectorConstants.SECTOR_TYPE_MAINTENANCE;
				if (rand < 0.6) sectorType = SectorConstants.SECTOR_TYPE_RESIDENTIAL;
				if (rand < 0.4) sectorType = SectorConstants.SECTOR_TYPE_COMMERCIAL;
				if (rand < 0.2) sectorType = SectorConstants.SECTOR_TYPE_PUBLIC;
            } else if (level == worldVO.bottomLevel) {
                // special level: ground level
				sectorType = SectorConstants.SECTOR_TYPE_MAINTENANCE;
				if (rand < 0.8) sectorType = SectorConstants.SECTOR_TYPE_INDUSTRIAL;
				if (rand < 0.6) sectorType = SectorConstants.SECTOR_TYPE_RESIDENTIAL;
				if (rand < 0.4) sectorType = SectorConstants.SECTOR_TYPE_COMMERCIAL;
				if (rand < 0.2) sectorType = SectorConstants.SECTOR_TYPE_PUBLIC;
			}
            
            return sectorType;
        },
        
        /*
        SECTOR_TYPE_RESIDENTIAL: "residential",
        SECTOR_TYPE_INDUSTRIAL: "industrial",
        SECTOR_TYPE_MAINTENANCE: "maintenance",
        SECTOR_TYPE_COMMERCIAL: "commercial",
        SECTOR_TYPE_PUBLIC: "public",
        SECTOR_TYPE_SLUM: "slum",
        */
        
        generateTexture: function (seed, sectorVO) {
            /*
            var x = sectorVO.position.sectorX;
            var y = sectorVO.position.sectorY;
            var distanceToCenter = PositionConstants.getDistanceTo(sectorVO.position, new PositionVO(l, 0, 0));

            // sunlight
            var isOutsideTower = Math.abs(y) > WorldCreatorConstants.TOWER_RADIUS || Math.abs(x) > WorldCreatorConstants.TOWER_RADIUS;
            var isEdgeSector = levelVO.isEdgeSector(x, y, 2);
            var isOpenEdge = false;
            var isBrokenEdge = false;
            if (l === topLevel) {
                // surface: all lit
                sectorVO.sunlit = 1;
            } else if (l === 13) {
                // start levels: no sunlight
                sectorVO.sunlit = 0;
            } else {
                sectorVO.sunlit = 0;

                // one level below surface: center has broken "ceiling"
                if (l === topLevel - 1 && distanceToCenter <= 6) {
                    sectorVO.sunlit = 1;
                }
                
                if (isOutsideTower) {
                    sectorVO.sunlit = 1;
                }

                // all levels except surface: some broken or open edges
                if (isEdgeSector) {
                    var dir = levelVO.getEdgeDirection(x, y, 1);
                    var dirIndex = sunlitEdgeDirections.indexOf(dir);
                    if (dirIndex >= 0) {
                        sectorVO.sunlit = 2;
                        if (hasBrokenEdge && hasOpenEdge) {
                            isBrokenEdge = dirIndex === 0;
                            isOpenEdge = dirIndex > 1;
                        } else if(hasBrokenEdge) {
                            isBrokenEdge = true;
                        } else {
                            isOpenEdge = true;
                        }
                    }
                }
            }

            // wear and damage
            var explosionStrength = i - topLevel >= -3 && distanceToCenter <= 10 ? distanceToCenter * 2 : 0;
            var wear = levelWear + WorldCreatorRandom.randomInt(seed * l * (x + 100) * (y + 100), -2, 2);
            var damage = explosionStrength;
            if (sectorVO.camp) wear = Math.min(3, wear);
            if (sectorVO.camp) damage = Math.min(3, damage);
            if (isOpenEdge) wear = Math.max(4, wear);
            if (isBrokenEdge) wear = Math.max(6, wear);
            if (l == 14) damage = Math.max(3, damage);
            sectorVO.wear = MathUtils.clamp(Math.round(wear), 0, 10);
            sectorVO.damage = MathUtils.clamp(Math.round(damage), 0, 10);

            // buildingDensity
            var buildingDensity = levelDensity + WorldCreatorRandom.randomInt(seed * l * x + y + x, -5, 5);
            if (i == topLevel) buildingDensity = MathUtils.clamp(buildingDensity, 1, 8);
            if (sectorVO.camp) {
                buildingDensity = Math.min(1, Math.max(8, buildingDensity));
            }
            sectorVO.buildingDensity = MathUtils.clamp(Math.round(buildingDensity), 0, 10);
            */
        }
        
    };
    
    return SectorGenerator;
});
