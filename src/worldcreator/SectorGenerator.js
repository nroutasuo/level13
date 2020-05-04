// Handles the first step of world generation, the abstract world template itself
define([
	'ash',
    'utils/MathUtils',
    'game/constants/MovementConstants',
    'game/constants/PositionConstants',
    'game/constants/SectorConstants',
    'game/constants/UpgradeConstants',
    'game/constants/WorldConstants',
    'game/vos/PositionVO',
	'worldcreator/WorldCreatorConstants',
    'worldcreator/WorldCreatorHelper',
    'worldcreator/WorldCreatorRandom',
    'worldcreator/WorldCreatorDebug'
], function (Ash, MathUtils, MovementConstants, PositionConstants, SectorConstants, UpgradeConstants, WorldConstants, PositionVO, WorldCreatorConstants, WorldCreatorHelper, WorldCreatorRandom, WorldCreatorDebug ) {
    
    var SectorGenerator = {
        
        prepareSectors: function (seed, worldVO) {
            for (var l = worldVO.topLevel; l >= worldVO.bottomLevel; l--) {
                var levelVO = worldVO.levels[l];
                this.generateZones(seed, worldVO, levelVO);
                for (var s = 0; s < levelVO.sectors.length; s++) {
                    var sectorVO = levelVO.sectors[s];
                    sectorVO.sectorType = this.getSectorType(seed, worldVO, levelVO, sectorVO);
                    sectorVO.sunlit = this.isSunlit(seed, worldVO, levelVO, sectorVO);
                    sectorVO.passageUpType = this.getPassageUpType(seed, worldVO, levelVO, sectorVO);
                    sectorVO.passageDownType = this.getPassageDownType(seed, worldVO, levelVO, sectorVO);
                    if (sectorVO.passageDownType) {
                        log.i("passageDownType, level " + l + " " + sectorVO.passageDownType)
                    }
                    this.generateTexture(seed, worldVO, levelVO, sectorVO);
                }
                
            }
            WorldCreatorDebug.printWorld(worldVO, [ "buildingDensity" ]);
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
        
        isSunlit: function (seed, worldVO, levelVO, sectorVO) {
            var l = sectorVO.position.level;
            var isHole = function (pos) {
                var features = worldVO.getFeaturesByPos(pos);
                for (var i = 0; i < features.length; i++) {
                    switch (features[i].type) {
                        case WorldCreatorConstants.FEATURE_HOLE_WELL:
                        case WorldCreatorConstants.FEATURE_HOLE_COLLAPSE:
                        case WorldCreatorConstants.FEATURE_HOLE_SEA:
                        case WorldCreatorConstants.FEATURE_HOLE_MOUNTAIN:
                            return 1;
                    }
                }
                return 0;
            };
            if (l === worldVO.topLevel) {
                // surface: all lit
                return 1;
            } else if (l === 13) {
                // start level: no sunlight
                return 0;
            } else {
                // others: sunlight only if ceiling or edge is open
                // - sector itself is a hole
                if (isHole(sectorVO.position)) return 1;
                // - sector(s) above are holes or damaged enough
                for (var level = l + 1; l <= worldVO.topLevel; l++) {
                    var pos = new PositionVO(level, sectorVO.position.sectorX, sectorVO.position.sectorY);
                    var sectorVO2 = worldVO.getLevel(l).getSector(pos.sectorX, pos.sectorY, 5);
                    if (isHole(pos)) return 1;
                    if (!sectorVO2 || (sectorVO.wear < 8 && sectorVO.damage < 5)) break;
                    if (sectorVO2 && sectorVO2.sunlit) return 1;
                }
                // - sector is near edge to the sea
                var sea = worldVO.getFeaturesByType(WorldCreatorConstants.FEATURE_HOLE_SEA)[0];
                var distance = sea.getDistanceTo(sectorVO.position);
                if (distance <= 1 + levelVO.seaPadding) return 1;
                return 0;
            }
        },
        
        getPassageUpType: function (seed, worldVO, levelVO, sectorVO) {
            if (!sectorVO.isPassageUp) return null;
            var sectorUp  = worldVO.getLevel(levelVO.level + 1).getSector(sectorVO.position.sectorX, sectorVO.position.sectorY);
            return sectorUp.passageDownType;
        },
        
        getPassageDownType: function (seed, worldVO, levelVO, sectorVO) {
            if (!sectorVO.isPassageDown) return null;
            var l = levelVO.level;
            var s1 = seed + l * 7 + sectorVO.position.sectorX * seed % 6 * 10;
            var campOrdinal = levelVO.campOrdinal;
            var unlockElevatorOrdinal = UpgradeConstants.getMinimumCampOrdinalForUpgrade("unlock_building_passage_elevator");
            if (l === 13) {
                return MovementConstants.PASSAGE_TYPE_STAIRWELL;
            } else if (campOrdinal > WorldConstants.CAMP_ORDINAL_LIMIT) {
                return MovementConstants.PASSAGE_TYPE_BLOCKED;
            } else if (l === 14) {
                return MovementConstants.PASSAGE_TYPE_HOLE;
            } else if (levelVO.isCampable && campOrdinal == unlockElevatorOrdinal) {
                return MovementConstants.PASSAGE_TYPE_ELEVATOR;
            } else {
                var availablePassageTypes = [MovementConstants.PASSAGE_TYPE_STAIRWELL];
                if (campOrdinal >= unlockElevatorOrdinal)
                    availablePassageTypes.push(MovementConstants.PASSAGE_TYPE_ELEVATOR);
                if (l > 14)
                    availablePassageTypes.push(MovementConstants.PASSAGE_TYPE_HOLE);
                var passageTypeIndex = WorldCreatorRandom.randomInt(s1, 0, availablePassageTypes.length);
                var passageType = availablePassageTypes[passageTypeIndex];
                return passageType;
            }
        },
        
        generateTexture: function (seed, worldVO, levelVO, sectorVO) {
            var l = sectorVO.position.level;
            var x = sectorVO.position.sectorX;
            var y = sectorVO.position.sectorY;
            var features = worldVO.getFeaturesByPos(sectorVO.position);
            var surroundingFeatures = WorldCreatorHelper.getFeaturesSurrounding(worldVO, levelVO, sectorVO.position);

            // wear
            var levelWear = MathUtils.clamp((worldVO.topLevel - l) / (worldVO.topLevel - 5) * 8, 0, 10);
            var wear = levelWear + WorldCreatorRandom.randomInt(seed * l + (x + 100) * 82 + (y + 100) * 82, -3, 3);
            if (sectorVO.isCamp) wear = Math.min(3, wear);
            sectorVO.wear = MathUtils.clamp(Math.round(wear), 0, 10);

            // damage
            var damage = 0;
            var getFeatureDamage = function (feature) {
                switch (feature.type) {
                    case WorldCreatorConstants.FEATURE_HOLE_WELL: return 1;
                    case WorldCreatorConstants.FEATURE_HOLE_COLLAPSE: return 8;
                    case WorldCreatorConstants.FEATURE_HOLE_SEA: return 3;
                    default: return 0;
                }
            }
            for (var i = 0; i < features.length; i++) {
                damage = Math.max(damage, getFeatureDamage(features[i]));
            }
            for (var i = 0; i < surroundingFeatures.length; i++) {
                var d = surroundingFeatures[i].getDistanceTo(sectorVO.position);
                damage = Math.max(damage, getFeatureDamage(surroundingFeatures[i]) - d * 2);
            }
            if (sectorVO.isCamp) damage = Math.min(3, damage);
            if (l == 14) damage = Math.max(3, damage);
            sectorVO.damage = MathUtils.clamp(Math.round(damage), 0, 10);

            // building density
            var levelDensity = MathUtils.clamp(WorldCreatorRandom.random(seed * 7 * l / 3 + 62) * 10, 2, 9);
            if (l == worldVO.topLevel) levelDensity = 5;
            if (l == worldVO.topLevel - 1) levelDensity = 5;
            if (l == worldVO.topLevel - 2) levelDensity = 7;
            if (l == worldVO.topLevel - 3) levelDensity = 8;
            if (l == 14) levelDensity = 8;
            if (l == worldVO.bottomLevel + 1) levelDensity = 6;
            if (l == worldVO.bottomLevel) levelDensity = 3;
            
            var minDensity = 0;
            var maxDensity = 10;
            switch (sectorVO.sectorType) {
                case SectorConstants.SECTOR_TYPE_RESIDENTIAL:
                    minDensity = 2;
                    maxDensity = 8;
                    break;
                case SectorConstants.SECTOR_TYPE_INDUSTRIAL:
                    minDensity = 1;
                    maxDensity = 10;
                    break;
                case SectorConstants.SECTOR_TYPE_MAINTENANCE:
                    minDensity = 2;
                    maxDensity = 10;
                    break;
                case SectorConstants.SECTOR_TYPE_COMMERCIAL:
                    minDensity = 1;
                    maxDensity = 10;
                    break;
                case SectorConstants.SECTOR_TYPE_PUBLIC:
                    minDensity = 0;
                    maxDensity = 7;
                    break;
                case SectorConstants.SECTOR_TYPE_SLUM:
                    minDensity = 3;
                    maxDensity = 10;
                    break;
            }
            
            var randomDensity = WorldCreatorRandom.randomInt(seed * l * x + y + x, minDensity, maxDensity + 1);
            if (sectorVO.isCamp) randomDensity = 5;
            
            var density = (levelDensity + randomDensity) / 2;
            sectorVO.buildingDensity = MathUtils.clamp(Math.round(density), minDensity, maxDensity);
        }
        
    };
    
    return SectorGenerator;
});
