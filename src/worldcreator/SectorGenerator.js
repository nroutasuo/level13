// Handles the first step of world generation, the abstract world template itself
define([
	'ash',
    'utils/MathUtils',
    'game/constants/ItemConstants',
    'game/constants/MovementConstants',
    'game/constants/PositionConstants',
    'game/constants/SectorConstants',
    'game/constants/UpgradeConstants',
    'game/constants/WorldConstants',
	'game/vos/PathConstraintVO',
    'game/vos/PositionVO',
	'game/vos/ResourcesVO',
	'game/vos/StashVO',
	'worldcreator/WorldCreatorConstants',
    'worldcreator/WorldCreatorHelper',
    'worldcreator/WorldCreatorRandom',
    'worldcreator/WorldCreatorDebug'
], function (
    Ash, MathUtils,
    ItemConstants, MovementConstants, PositionConstants, SectorConstants, UpgradeConstants, WorldConstants,
    PathConstraintVO, PositionVO, ResourcesVO, StashVO,
    WorldCreatorConstants, WorldCreatorHelper, WorldCreatorRandom, WorldCreatorDebug
) {
    
    var SectorGenerator = {
        
        prepareSectors: function (seed, worldVO, itemsHelper) {
            for (var l = worldVO.topLevel; l >= worldVO.bottomLevel; l--) {
                var levelVO = worldVO.levels[l];
                // level features
                this.generateZones(seed, worldVO, levelVO);
                this.generateStashes(seed, worldVO, levelVO, itemsHelper);
                this.generateWorksops(seed, worldVO, levelVO);
                levelVO.paths = this.generatePaths(seed, worldVO, levelVO);
                // level path features
                for (var p = 0; p < levelVO.paths.length; p++) {
                    this.generateRequiredResources(seed, worldVO, levelVO, levelVO.paths[p]);
                }
                // sector features
                for (var s = 0; s < levelVO.sectors.length; s++) {
                    var sectorVO = levelVO.sectors[s];
                    sectorVO.sectorType = this.getSectorType(seed, worldVO, levelVO, sectorVO);
                    sectorVO.sunlit = this.isSunlit(seed, worldVO, levelVO, sectorVO);
                    sectorVO.passageUpType = this.getPassageUpType(seed, worldVO, levelVO, sectorVO);
                    sectorVO.passageDownType = this.getPassageDownType(seed, worldVO, levelVO, sectorVO);
                    this.generateTexture(seed, worldVO, levelVO, sectorVO);
                    this.generateResources(seed, worldVO, levelVO, sectorVO);
                }
                
            }
            WorldCreatorDebug.printWorld(worldVO, [ "resourcesAll.water"], "blue");
            //WorldCreatorDebug.printWorld(worldVO, [ "resourcesScavengable.food" ], "#ee8822");
            // WorldCreatorDebug.printWorld(worldVO, [ "workshopResource" ]);
            // WorldCreatorDebug.printWorld(this.world, [ "criticalPaths.length" ]);
        },
        
        generateZones: function (seed, worldVO, levelVO) {
            var level = levelVO.level;
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
        
        generatePaths: function (seed, worldVO, levelVO) {
            var result = [];
            var unvisitedSectors = [];
            var visitSector = function (pos, pathID) {
                var posSector = levelVO.getSector(pos);
                if (!posSector) return;
                if (posSector.pathID && pos.pathID != 0) return;
                var index = unvisitedSectors.indexOf(posSector);
                if (index < 0) return;
                posSector.pathID = pathID;
                unvisitedSectors.splice(index, 1);
            };
            var traverseSectors = function (startPos, sectors, pathStage) {
                var traverse = [];
                if (sectors.length <= 0) return;
                unvisitedSectors = sectors.concat();
                var currentPos = startPos;
                var pathID = 0;
                var i = 0;
                while (unvisitedSectors.length > 0) {
                    visitSector(currentPos, pathID);
                    var sectorsByDistance = unvisitedSectors.slice(0).sort(WorldCreatorHelper.sortSectorsByDistanceTo(currentPos));
                    var nextSector = sectorsByDistance[0];
                    var path = WorldCreatorRandom.findPath(worldVO, currentPos, nextSector.position, false, true, pathStage);
                    pathID =  result.length;
                    for (var j = 0; j < path.length; j++) {
                        var pathPos = path[j];
                        visitSector(pathPos, pathID);
                        traverse.push(pathPos);
                    }
                    currentPos = nextSector.position;
                    i++;
                }
                result.push(traverse);
            }
            var startPos = levelVO.excursionStartPosition;
            traverseSectors(startPos, levelVO.getSectorsByStage(WorldConstants.CAMP_STAGE_EARLY), WorldConstants.CAMP_STAGE_EARLY);
            traverseSectors(startPos, levelVO.getSectorsByStage(WorldConstants.CAMP_STAGE_LATE), null);
            return result;
        },
        
        generateStashes: function (seed, worldVO, levelVO, itemsHelper) {
            var l = levelVO.level;
            var lateZones = [ WorldConstants.ZONE_POI_2, WorldConstants.ZONE_EXTRA_CAMPABLE ];
            var earlyZones = [ WorldConstants.ZONE_PASSAGE_TO_CAMP, WorldConstants.ZONE_PASSAGE_TO_PASSAGE, WorldConstants.ZONE_POI_1 ];
            
            // TODO handle multiple stashes per sector (currently just overwrites)
            var addStashes = function (sectorSeed, reason, stashType, itemID, num, numItemsPerStash, excludedZones) {
                var options = { requireCentral: false, excludingFeature: "camp", excludedZones: excludedZones };
                var stashSectors = WorldCreatorRandom.randomSectors(sectorSeed, this.world, levelVO, num, num + 1, options);
                for (var i = 0; i < stashSectors.length; i++) {
                    stashSectors[i].stashItem = itemID;
                    stashSectors[i].stash = new StashVO(stashType, numItemsPerStash, itemID);
                    // log.i("add stash level " + l + " [" + reason + "]: " + itemID + " " + stashSectors[i].position + " " + stashSectors[i].zone + " | " + (excludedZones ? excludedZones.join(",") : "-"))
                }
            };
            
            // stashes: lock picks
            if (l == 13) {
                addStashes(seed * l * 8 / 3 + (l+100)*14 + 3333, "lockpick", StashVO.STASH_TYPE_ITEM, "exploration_1", 1, 1, lateZones);
            }
            
            // stashes: hairpins (for lockpics)
            var pinsPerStash = 3;
            var numHairpinStashes = 2;
            if (l == 13) numHairpinStashes = 5;
            if (!levelVO.isCampable) numHairpinStashes = 5;
            addStashes(seed * l * 8 / 3 + (l+100)*14 + 3333, "hairpin", StashVO.STASH_TYPE_ITEM, "res_hairpin", numHairpinStashes, pinsPerStash);
            
            // stashes: ingredients for craftable equipment (campable levels)
            if (levelVO.isCampable) {
                var requiredEquipment = itemsHelper.getRequiredEquipment(levelVO.campOrdinal, WorldConstants.CAMP_STEP_END, levelVO.isHard);
                var requiredEquipmentIngredients = itemsHelper.getIngredientsToCraftMany(requiredEquipment);
                var numStashIngredients = MathUtils.clamp(Math.floor(requiredEquipmentIngredients.length / 2), 1, 3);
                for (var i = 0; i < numStashIngredients; i++) {
                    var def = requiredEquipmentIngredients[i];
                    var amount = MathUtils.clamp(def.amount / 3, 3, 10);
                    addStashes(seed % 13 + l * 7 + 5 + (i+1) * 10, "craftable ingredients", StashVO.STASH_TYPE_ITEM, def.id, 2, amount);
                }
            }
            
            // stashes: non-craftable equipment
            var newEquipment = itemsHelper.getNewEquipment(levelVO.campOrdinal);
            for (var i = 0; i < newEquipment.length; i++) {
                if (!newEquipment[i].craftable && newEquipment[i].scavengeRarity <= 5) {
                    addStashes(seed / 3 + (l+551)*8 + (i+103)*18, "non-craftable equipment", StashVO.STASH_TYPE_ITEM, newEquipment[i].id, 1, 1, lateZones);
                }
            }
            
            // stashes: random ingredients (uncampable levels)
            if (!levelVO.isCampable) {
                var i = seed % (l+5) + 3;
                var ingredient = ItemConstants.getIngredient(i);
                addStashes(seed % 7 + 3000 + 101 * l, "random", StashVO.STASH_TYPE_ITEM, ingredient.id, 2, 3);
            }
            
            // stashes: metal caches
            if (l == 13) {
                addStashes(seed / 3 * 338 + l * 402, "metal", StashVO.STASH_TYPE_ITEM, "cache_metal_1", 2, 1, lateZones);
                addStashes(seed / 5 * 931 + l * 442, "metal", StashVO.STASH_TYPE_ITEM, "cache_metal_2", 2, 1, lateZones);
            } else {
                if (l % 2 == 0)
                    addStashes(seed / 5 * 931 + l * 442, "metal", StashVO.STASH_TYPE_ITEM, "cache_metal_1", 1, 1);
                else
                    addStashes(seed / 5 * 931 + l * 442, "metal", StashVO.STASH_TYPE_ITEM, "cache_metal_2", 1, 1);
            }
            
            // TODO add currency stashes just for fun
            // TODO add rare and non-essential stuff no non-campable levels
        },
        
        generateWorksops: function (seed, worldVO, levelVO) {
            var workshopResource = null;
            if (levelVO.isCampable && levelVO.campOrdinal === WorldConstants.CAMP_ORDINAL_FUEL)
                workshopResource = "fuel";
            if (levelVO.level == worldVO.bottomLevel)
                workshopResource = "rubber";
            if (!workshopResource) return;
            
            var l = levelVO.level;
            var pathConstraints = [];
            for (var i = 0; i < levelVO.campPositions.length; i++) {
                var startPos = levelVO.campPositions[i];
                var maxLength = WorldCreatorConstants.getMaxPathLength(levelVO.campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1);
                pathConstraints.push(new PathConstraintVO(startPos, maxLength, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1));
            }
            var options = { excludingFeature: "camp", pathConstraints: pathConstraints };
            var workshopSectors = WorldCreatorRandom.randomSectors(seed * l * 2 / 7 * l, worldVO, levelVO, 1, 2, options);
            for (var i = 0; i < workshopSectors.length; i++) {
                workshopSectors[i].hasWorkshop = true;
                workshopSectors[i].workshopResource = resourceNames[workshopResource];
                for (var j = 0; j < pathConstraints.length; j++) {
                    WorldCreatorHelper.addCriticalPath(worldVO, workshopSectors[i].position, pathConstraints[j].startPosition, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1);
                }
            }
        },
        
        generateRequiredResources: function (seed, worldVO, levelVO, path) {
            var bagSize =  ItemConstants.getBagBonus(levelVO.levelOrdinal);
            var maxStepsWater = Math.floor(bagSize / 2);
            var maxStepsFood = Math.floor(bagSize / 2 * 0.75);
            var stepsWater = 0;
            var stepsFood = 0;
            var requireResource = function (i, steps, maxSteps) {
                var minSteps = Math.floor(maxSteps/2);
                if (minSteps < 2)
                    return false;
                var probability = (steps - minSteps) / (maxSteps - minSteps);
                var s1 = 2000 + seed % 1000 * 2 + levelVO.level * 103 + i * 5;
                var r1 = WorldCreatorRandom.random(s1);
                return r1 < probability;
            };
            for (var i = 0; i < path.length; i++) {
                var pos = path[i];
                var sectorVO = levelVO.getSector(pos);
                if (requireResource(i, stepsWater, maxStepsWater)) {
                    sectorVO.requiredResources.water = true;
                    stepsWater = -1;
                }
                if (requireResource(9000 + i, stepsFood, maxStepsFood)) {
                    sectorVO.requiredResources.food = true;
                    stepsFood = -1;
                }
                stepsWater++;
                stepsFood++;
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
        },
        
        generateResources: function (seed, worldVO, levelVO, sectorVO) {
            var l = sectorVO.position.level;
            var x = sectorVO.position.sectorX;
            var y = sectorVO.position.sectorY;
            var ll = levelVO.level === 0 ? levelVO.level : 50;
            var sectorType = sectorVO.sectorType;
			var campOrdinal = levelVO.campOrdinal;
            
            // scavengeable resources
            var sRandom = (x * 22 + y * 3000);
            var sectorAbundanceFactor = WorldCreatorRandom.random(seed * sRandom + (x + 99) * 7 * (y - 888));
            var waterRandomPart = WorldCreatorRandom.random(seed * (l + 1000) * (x + y + 900) + 10134) * Math.abs(5 - sectorVO.wear) / 5;
            var sca = new ResourcesVO();
            switch (sectorType) {
            case SectorConstants.SECTOR_TYPE_RESIDENTIAL:
                sca.metal = 3;
                sca.food = WorldCreatorRandom.random(seed + l * x * y * 24 + x * 33 + 6) < 0.60 ? Math.round(sectorAbundanceFactor * 5 + sectorVO.wear / 2) : 0;
                sca.water = waterRandomPart > 0.82 ? 2 : 0;
                sca.rope = WorldCreatorRandom.random(seed + l * x / y * 44 + 6) > 0.95 ? 1 : 0;
                sca.medicine = campOrdinal > 2 && WorldCreatorRandom.random(seed / (l + 5) + x * x * y + 66) > 0.99 ? 1 : 0;
                break;
            case SectorConstants.SECTOR_TYPE_INDUSTRIAL:
                sca.water = waterRandomPart > 0.9 ? 1 : 0;
                sca.metal = 8;
                sca.tools = (l > 13) ? WorldCreatorRandom.random(seed + l * x / y * 44 + 6) > 0.95 ? 1 : 0 : 0;
                sca.rope = WorldCreatorRandom.random(seed + l * x / y * 44 + 6) > 0.90 ? 1 : 0;
                sca.fuel = WorldCreatorRandom.random(seed / (l + 5) + x * x * y + 66) > 0.90 ? 1 : 0;
                sca.rubber = WorldCreatorRandom.random(seed / x * ll + x * y * 16) > 0.90 ? 1 : 0;
                break;
            case SectorConstants.SECTOR_TYPE_MAINTENANCE:
                sca.metal = 10;
                sca.rope = WorldCreatorRandom.random(seed + l * x / y * 44 + 6) > 0.90 ? 1 : 0;
                sca.fuel = WorldCreatorRandom.random(seed / (l + 5) + x * x * y + 66) > 0.90 ? 1 : 0;
                sca.tools = (l > 13) ? WorldCreatorRandom.random(seed + l * x / y * 44 + 6) > 0.90 ? 1 : 0 : 0;
                break;
            case SectorConstants.SECTOR_TYPE_COMMERCIAL:
                sca.water = waterRandomPart > 0.85 ? 2 : 0;
                sca.metal = 2;
                sca.food = Math.round(sectorAbundanceFactor * 10);
                sca.medicine = campOrdinal > 2 && WorldCreatorRandom.random(seed / (l + 5) + x * x * y + 66) > 0.99 ? 1 : 0;
                break;
            case SectorConstants.SECTOR_TYPE_SLUM:
                sca.metal = 7;
                sca.food = WorldCreatorRandom.random(seed / (l+10) + x * y * 63) < 0.2 ? Math.round(sectorAbundanceFactor * 5 + sectorVO.wear / 2) : 0;
                sca.water = waterRandomPart > 0.75 ? 1 : 0;
                sca.rope = WorldCreatorRandom.random(seed + l * x / y * 44 + 6) > 0.85 ? 1 : 0;
                sca.fuel = WorldCreatorRandom.random(seed / (l + 5) + x * x * y + 66) > 0.95 ? 1 : 0;
                break;
            }
            
            // collectable resources
            var col = new ResourcesVO();
            var sectorCentralness = (10 - (Math.abs(x) / 10) + 10 - (Math.abs(y) / 10)) / 2;
            var sectorNatureFactor = (WorldCreatorRandom.random(seed + (x + 1453) / 55 * (y - 455)) * (sectorVO.wear)) / 10;
            var sectorWaterFactor = (WorldCreatorRandom.random(seed / (x + 30) + (y + 102214)) * (sectorCentralness + 10)) / 25;
            
            switch (sectorType) {
                case SectorConstants.SECTOR_TYPE_RESIDENTIAL:
                case SectorConstants.SECTOR_TYPE_COMMERCIAL:
                    col.food = sectorNatureFactor > 0.2 ? Math.round(sectorNatureFactor * 10) : 0;
                    col.water = sectorWaterFactor > 0.75 ? Math.round(Math.min(10, sectorWaterFactor * 10)) : 0;
                    break;
                case SectorConstants.SECTOR_TYPE_INDUSTRIAL:
                case SectorConstants.SECTOR_TYPE_MAINTENANCE:
                    col.food = sectorNatureFactor > 0.4 ? Math.round(sectorNatureFactor * 8) : 0;
                    col.water = sectorWaterFactor > 0.95 ? Math.round(Math.min(10, sectorWaterFactor * 11)) : 0;
                    break;
                case SectorConstants.SECTOR_TYPE_SLUM:
                    col.food = sectorNatureFactor > 0.1 ? Math.round(sectorNatureFactor * 10) : 0;
                    col.water = sectorWaterFactor > 0.9 ? Math.round(Math.min(10, sectorWaterFactor * 8)) : 0;
                    break;
            }
            
            // define springs
            if (col.water > 0 || sca.water > 0) {
                sectorVO.hasSpring =  WorldCreatorRandom.random(7777 + seed % 987 + ll * 7 + y * 71) < 0.25;
            } else {
                sectorVO.hasSpring = false;
            }
            
            // add workshop resources to scavengeable
            if (sectorVO.workshopResource) {
                sca[sectorVO.workshopResource] = Math.max(sca[sectorVO.workshopResource], 3);
            }
            
            // adjustments for special levels
            if (l === worldVO.bottomLevel) {
                col.food = col.food > 0 ? col.food + 2 : 0;
                col.water = col.water > 0 ? col.water + 3 : 0;
                sca.herbs = WorldCreatorRandom.random(seed * l / x + y * 423) * (10 - sectorVO.wear);
            }
            
            if (l === worldVO.bottomLevel + 1) {
                col.food = col.food > 0 ? col.food + 1 : 0;
                col.water = col.water > 0 ? col.water + 1 : 0;
                sca.herbs = WorldCreatorRandom.random(seed * l / x + y * 423) * (10 - sectorVO.wear) / 2;
            }
            
            // adjustments for sector features
            if (sectorVO.sunlit) {
                sca.herbs = WorldCreatorRandom.random(seed * l / x + y * 423) > 0.75 ? 2 : 0;
            }

            if (sectorVO.hazards.poison > 0 || sectorVO.hazards.radiation > 0) {
                col.water = 0;
                col.food = 0;
            }
            
            // adjustments for required resources
            if (sectorVO.requiredResources) {
                if (sectorVO.requiredResources.getResource("water") > 0) {
                    col.water = Math.max(col.water, 3);
                }
                if (sectorVO.requiredResources.getResource("food") > 0) {
                    sca.food = Math.max(sca.food, 3);
                }
            }
            
            // adjustments for possible ranges
            sca.food = sca.food > 2 ? sca.food : 0;
            sca.herbs = sca.herbs > 2 ? Math.min(sca.herbs, 10) : 0;
            
            sectorVO.resourcesScavengable = sca;
            sectorVO.resourcesCollectable = col;
            sectorVO.resourcesAll = sca.clone();
            sectorVO.resourcesAll.addAll(col);
        }
        
    };
    
    return SectorGenerator;
});
