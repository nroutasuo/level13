// Generates a world given a random seed. The seed should be a positive int.
// A world (WorldVO) consists of LevelVOs which in turn consist of SectorVOs.
define([
	'ash',
    'utils/MathUtils',
	'game/constants/GameConstants',
	'game/constants/ItemConstants',
	'game/constants/LevelConstants',
	'game/constants/SectorConstants',
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
	'game/vos/GangVO',
	'game/vos/ResourcesVO',
	'game/vos/PositionVO',
	'game/vos/PathConstraintVO',
	'worldcreator/WorldCreatorConstants',
	'game/constants/PositionConstants',
	'game/constants/MovementConstants',
	'game/constants/EnemyConstants',
	'game/constants/UpgradeConstants',
	'game/constants/LocaleConstants',
], function (
    Ash, MathUtils, GameConstants, ItemConstants, LevelConstants, SectorConstants, WorldConstants,
    WorldCreatorHelper, WorldCreatorRandom, WorldCreatorDebug, EnemyCreator,
    WorldVO, LevelVO, SectorVO, WorldGenerator, LevelGenerator, StructureGenerator, SectorGenerator,
    GangVO, ResourcesVO, PositionVO, PathConstraintVO,
    WorldCreatorConstants, PositionConstants, MovementConstants, EnemyConstants, UpgradeConstants, LocaleConstants
) {
    var context = "WorldCreator";

    var WorldCreator = {

		world: null,

		prepareWorld: function (seed, itemsHelper) {
            /*
            this.enemyCreator = new EnemyCreator();
            this.enemyCreator.createEnemies();
            */

			var topLevel = WorldCreatorHelper.getHighestLevel(seed);
			var bottomLevel = WorldCreatorHelper.getBottomLevel(seed);
            this.world = new WorldVO(seed, topLevel, bottomLevel);
            
            log.i("Step 1/4: World template", this.context);
            WorldGenerator.prepareWorld(seed, this.world);
            WorldCreatorDebug.printWorldTemplate(this.world);
            
            log.i("Step 2/4: Level templates", this.context);
            LevelGenerator.prepareLevels(seed, this.world);
            WorldCreatorDebug.printLevelTemplates(this.world);
            
            log.i("Step 3/4: Level structure", this.context);
            StructureGenerator.prepareStructure(seed, this.world);
            WorldCreatorDebug.printLevelStructure(this.world);
            
            log.i("Step 4/4: Sector templates", this.context);
            SectorGenerator.prepareSectors(seed, this.world, itemsHelper);
            // WorldCreatorDebug.printSectorTemplates(this.world);

            /*
			// base: paths, zones, passages, campable sectors and levels
			this.prepareWorldStructure(seed, topLevel, bottomLevel);
			// building density, state of repair
			this.prepareWorldTexture(seed, topLevel, bottomLevel);
			// locales
            this.prepareWorldLocales(seed, topLevel, bottomLevel);
            // movement blockers
            this.prepareWorldMovementBlockers(seed, topLevel, bottomLevel);
            // hazards
            this.prepareHazards(seed, topLevel, bottomLevel, itemsHelper);
			// resources, workshops and stashes
			this.prepareWorldResources(seed, topLevel, bottomLevel, itemsHelper);
			// enemies (and gangs)
			this.prepareWorldEnemies(seed, topLevel, bottomLevel);
            */
            
            return this.world;
		},

        discardWorld: function () {
            log.i("Discard world", this.context)
            this.world.levels = [];
            this.world = null;
        },
        

		// campable sectors and levels, passages, zones
		prepareWorldStructure: function (seed, topLevel, bottomLevel) {
			var passageDownPosition = null;
            this.totalSectors = 0;
            /*
			for (var l = topLevel; l >= bottomLevel; l--) {
                // prepare level vo
                (( creating level vos - copied ))
                
                ((determining camp and passage positions - replaced))
                
                ((determining camp and passage sector positions - copied))
                
                // zones: areas based around critical paths that define difficulty level of fights etc across the level
                this.generateZones(seed, levelVO);
			}
            */

			log.i("START " + GameConstants.STARTTimeNow() + "\t "
				+ "World structure ready."
				+ (" (ground: " + bottomLevel + ", surface: " + topLevel + ", total sectors: " + this.totalSectors + ")"));
            // WorldCreatorDebug.printWorld(this.world, [ "passageDown" ]);
            // WorldCreatorDebug.printWorld(this.world, [ "criticalPaths.length" ]);
            // WorldCreatorDebug.printWorld(this.world, [ "locales.length" ]);
		},
        
        /*
		// sector type, building density, state of repair, sunlight
		prepareWorldTexture: function (seed, topLevel, bottomLevel) {
            (( copied ))
		},

		// resources and stashes
		prepareWorldResources: function (seed, topLevel, bottomLevel, itemsHelper) {
			(( copied ))
		},

		// locales
		prepareWorldLocales: function (seed, topLevel, bottomLevel) {
            (( copied ))
		},
        
        // movement blockers
        prepareWorldMovementBlockers: function (seed, topLevel, bottomLevel) {
			(( copied ))
        },

        // hazards
        prepareHazards: function (seed, topLevel, bottomLevel, itemsHelper) {
			for (var i = topLevel; i >= bottomLevel; i--) {
                var levelVO = this.world.getLevel(i);

                // non-clustered environmental hazards (cold) (edges of the map)
                this.generateHazardAreas(seed, levelVO, itemsHelper);
                
                // hazard clusters (radiation and poison)
                this.generateHazardClusters(seed, levelVO, itemsHelper);
            }

			log.i("START " + GameConstants.STARTTimeNow() + "\t World hazards ready.");
            // WorldCreatorDebug.printWorld(this.world, [ "hazards.cold" ]);
        },

		// enemies
		prepareWorldEnemies: function (seed, topLevel, bottomLevel) {
            var worldVO = this.world;
            var creator = this;
            var randomGangFreq = 45;
            
			for (var l = topLevel; l >= bottomLevel; l--) {
                var levelVO = this.world.getLevel(l);
                
                var blockerType = MovementConstants.BLOCKER_TYPE_GANG;
                var addGang = function (sectorVO, neighbourVO, addDiagonals, force) {
                    if (!neighbourVO) neighbourVO = WorldCreatorRandom.getRandomSectorNeighbour(seed, levelVO, sectorVO, true);
                    if (force || (creator.canHaveGang(sectorVO) && creator.canHaveGang(neighbourVO))) {
                        var blockerSettings = { addDiagonals: addDiagonals };
                        // callback is called twice, once for each sector
                        creator.addMovementBlocker(levelVO, sectorVO, neighbourVO, blockerType, blockerSettings, function (s, direction) {
                            s.numLocaleEnemies[LocaleConstants.getPassageLocaleId(direction)] = 3;
                        }, function () {
                            // TODO add a bit of randomness
                            var possibleEnemies = sectorVO.possibleEnemies.concat(neighbourVO.possibleEnemies);
                            possibleEnemies.sort(creator.enemyCreator.sortByDifficulty);
                            var pos1 = sectorVO.position;
                            var pos2 = neighbourVO.position;
                            var gang = new GangVO(pos1, pos2, possibleEnemies[0]);
                            levelVO.addGang(gang);
                        });
                        return true;
                    } else {
                        log.w("Skipped adding gang at " + sectorVO.position);
                        return false;
                    }
                };

                var addGangs = function (seed, reason, levelVO, pointA, pointB, maxPaths) {
                    var num = 0;
                    var path;
                    var index;
                    for (var i = 0; i < maxPaths; i++) {
                        path = WorldCreatorRandom.findPath(worldVO, pointA, pointB, true, true);
                        if (!path || path.length < 3) break;
                        var min = Math.round(path.length / 4) + 1;
                        var max = path.length - 2;
                        var finalSeed = Math.abs(seed + (i+1) * 231);
                        index = WorldCreatorRandom.randomInt(finalSeed, min, max);
                        var sectorVO = levelVO.getSector(path[index].sectorX, path[index].sectorY);
                        var neighbourVO = levelVO.getSector(path[index + 1].sectorX, path[index + 1].sectorY);
                        if (!creator.canHaveGang(sectorVO)) continue;
                        if (!creator.canHaveGang(neighbourVO)) continue;
                        if (addGang(sectorVO, neighbourVO, false)) num++;
                    }
                    return num;
                };
                
                // sector-based: possible enemies, random encounters and locales
                for (var i = 0; i < levelVO.sectors.length; i++) {
                    var sectorVO = levelVO.sectors[i];
                    sectorVO.possibleEnemies = [];
                    sectorVO.hasRegularEnemies = 0;

                    // possible enemy definitions
                    sectorVO.possibleEnemies = this.generateEnemies(seed, topLevel, bottomLevel, sectorVO);

                    // regular enemies (random encounters not tied to locales / gangs)
                    sectorVO.hasRegularEnemies = !sectorVO.camp && WorldCreatorRandom.random(l * sectorVO.position.sectorX * seed + sectorVO.position.sectorY * seed + 4848) > 0.2;

                    // workshop and locale enemies (counts)
                    if (sectorVO.hasWorkshop) {
                        sectorVO.numLocaleEnemies[LocaleConstants.LOCALE_ID_WORKSHOP] = 3;
                    }
				}
                
                // gangs: on zone borders
                // - ZONE_PASSAGE_TO_CAMP: all except too close to camp
                var borderSectors = WorldCreatorHelper.getBorderSectorsForZone(levelVO, WorldConstants.ZONE_PASSAGE_TO_CAMP, true);
                for (var i = 0; i < borderSectors.length; i++) {
                    var pair = borderSectors[i];
                    var distanceToCamp = Math.min(
                        WorldCreatorHelper.getDistanceToCamp(this.world, levelVO, pair.sector),
                        WorldCreatorHelper.getDistanceToCamp(this.world, levelVO, pair.neighbour)
                    );
                    var distanceToCampThreshold = l == 13 ? 4 : 2;
                    if (distanceToCamp > distanceToCampThreshold) {
                        addGang(pair.sector, pair.neighbour, true, true);
                    }
                }
                
                // - ZONE_PASSAGE_TO_PASSAGE: most
                var isGoingDown = l <= 13 && l >= bottomLevel;
                var passageUp = levelVO.passageUpSector;
                var passageDown = levelVO.passageDownSector;
                var passage1 = isGoingDown ? passageUp : passageDown;
                var passage2 = isGoingDown ? passageDown : passageUp;
                if (passage2) {
                    borderSectors = WorldCreatorHelper.getBorderSectorsForZone(levelVO, WorldConstants.ZONE_PASSAGE_TO_PASSAGE, false);
                    for (var i = 0; i < borderSectors.length; i++) {
                        // sector: z_extra, neighbour: z_p2p - if distance from sector is longer than from neighbour, add blocker
                        var pair = borderSectors[i];
                        var distance1 = WorldCreatorRandom.findPath(worldVO, pair.sector.position, passage2.position, false, true).length;
                        var distance2 = WorldCreatorRandom.findPath(worldVO, pair.neighbour.position, passage2.position, false, true).length;
                        if (distance1 > distance2) {
                            addGang(pair.sector, pair.neighbour, true, true);
                        }
                    }
                }
                
                // gangs: critical paths
                var numLocales = 0;
                for (var s = 0; s < levelVO.campSectors.length; s++) {
                    var campSector = levelVO.campSectors[s];
                    for (var i = 0; i < levelVO.sectors.length; i++) {
                        var sectorVO = levelVO.sectors[i];
                        if (sectorVO.hasWorkshop) {
                            // camps to workshops (all paths)
                            var rand = Math.round(1000 + seed + (l+21) * 11 + (s + 2) * 31 + (i + 1) * 51);
                            addGangs(rand, "workshop", levelVO, campSector.position, sectorVO.position, 100);
                        } else if (sectorVO.locales.length > 0) {
                            // camps to locales (some paths)
                            var rand = Math.round(50 + seed + (l+11) * 11 + (s + 41) * 3 + (i + 1) * 42);
                            if (numLocales % 2 === 0) {
                                addGangs(rand, "locale", levelVO, campSector.position, sectorVO.position, 1);
                            }
                            numLocales++;
                        }
                    }
                }

                // gangs: some random gangs regardless of camps
                var randomGangIndex = 0;
                for (var i = 0; i < levelVO.sectors.length; i++) {
                    var sectorVO = levelVO.sectors[i];
                    if (!creator.canHaveGang(sectorVO)) continue;
                    if (randomGangIndex >= randomGangFreq) {
                        var neighbourVO = WorldCreatorRandom.getRandomSectorNeighbour(seed, levelVO, sectorVO, true);
                        if (!creator.canHaveGang(neighbourVO)) continue;
                        var direction = PositionConstants.getDirectionFrom(sectorVO.position, neighbourVO.position);
                        if (!sectorVO.movementBlockers[direction]) {
                            var addDiagonals = i % (randomGangFreq * 2) === 0;
                            addGang(sectorVO, neighbourVO, addDiagonals);
                            randomGangIndex = 0;
                        }
                    }

                    randomGangIndex++;
                }
			}

			log.i("START " + GameConstants.STARTTimeNow() + "\t World enemies ready.");
            // WorldCreatorDebug.printWorld(this.world, [ "possibleEnemies.length" ]);
            // WorldCreatorDebug.printWorld(this.world, [ "enemyDifficulty" ]);
		},

        createRequiredPathsFromPositions: function (level, campOrdinal, passageUpPosition, campPositions, passageDownPosition, bottomLevel) {
            ((copied))
        },

        generateSectors: function (seed, levelVO, campPositions, requiredPaths) {
            ((copied))
        },
        
        generateCentralRectangle: function (levelVO, topLevel, bottomLevel) {
            ((copied))
        },

        generateRequiredPaths: function (seed, levelVO, requiredPaths) {
            ((copied))
        },
        
        generatePathBetween: function (seed, levelVO, startPos, endPos, maxlen, pathType, overshoot) {
            ((copied))
        },

        generateSectorsPaths: function(seed, pathSeed, levelVO, forceCentralStart) {
            ((copied))
        },

        generateSectorRectangles: function (seed, pathSeed, levelVO, forceCentralStart, isMassive) {
            ((copied))
        },

        generateSectorRectangle: function (levelVO, i, startPos, startDirection, w, h) {
            ((copied))
        },

        generateSectorsFillGaps: function (levelVO) {
            ((copied))
        },

        stepsTillSupplies: {
            water: 0,
            food: 0,
        },

        generateSectorPath: function (levelVO, startPos, direction, len, continueStepsTillSupplies, forceComplete, criticalPathType) {
            ((copied))
        },

		createSector: function (levelVO, sectorPos, requiredResources, criticalPathType) {
            ((copied))
		},

        generatePassages: function (seed, levelVO, passageUpPositions, passageDownPositions, bottomLevel) {
            var l = levelVO.level;
            var isCampable = levelVO.isCampable;
            var campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, l);

            // passages up: according to previous level
            var previousLevelVO = this.world.levels[l + 1];
            var passagePosition;
            var passageSector;
            for (var i = 0; i < passageUpPositions.length; i++) {
                passagePosition = passageUpPositions[i];
                if (passagePosition == null) continue;
                passageSector = levelVO.getSector(passagePosition.sectorX, passagePosition.sectorY);
                passageSector.passageUp = previousLevelVO.getSector(passagePosition.sectorX, passagePosition.sectorY).passageDown;
                levelVO.addPassageUpSector(passageSector);
            }
            
            // passages down: generate types
            var passageDownSectors = [];
            for (var i = 0; i < passageDownPositions.length; i++) {
                (( copied ))
            }
        },
        
        generateZones: function (seed, levelVO) {
            ((copied))
        },

        addMovementBlocker: function(levelVO, sectorVO, neighbourVO, blockerType, options, sectorcb, cb) {
            (( copied ))
        },

        addMovementBlockers: function(seed, l, levelVO, blockerTypes) {
            (( copied ))
        },
        
        generateHazardAreas: function (seed, levelVO, itemsHelper) {
            var topLevel = WorldCreatorHelper.getHighestLevel(seed);
            var l = levelVO.level == 0 ? 1342 : levelVO.level;
            // no cold on level 14
            if (l == 14) return;
            var campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, levelVO.level);
            for (var s = 0; s < levelVO.sectors.length; s++) {
                // - block for certain sectors
                var sectorVO = levelVO.sectors[s];
                if (sectorVO.camp) continue;
                if (sectorVO.isOnCriticalPath(WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_CAMP)) continue;
                var x = sectorVO.position.sectorX;
                var y = sectorVO.position.sectorY;
                if (Math.abs(y) <= 2 && Math.abs(x) <= 2) continue;
                var distanceToCamp = WorldCreatorHelper.getQuickDistanceToCamp(this.world, levelVO, sectorVO);
                var distanceToCampThreshold = l == 13 ? 6 : 3;
                if (distanceToCamp < distanceToCampThreshold) continue;
                
                // - determine value range
                var step = WorldConstants.getCampStep(sectorVO.zone);
                var maxHazardCold = Math.min(100, itemsHelper.getMaxHazardColdForLevel(campOrdinal, step, levelVO.isHard));
                var minHazardCold = itemsHelper.getMinHazardColdForLevel(campOrdinal, step, levelVO.isHard);
                minHazardCold = Math.min(minHazardCold, maxHazardCold - 1);
                minHazardCold = Math.max(minHazardCold, 1);
                if (maxHazardCold < 5) continue;
                
                // - determine eligibility
                var isEarlyZone = sectorVO.zone == WorldConstants.ZONE_PASSAGE_TO_CAMP || sectorVO.zone == WorldConstants.ZONE_PASSAGE_TO_PASSAGE;
                var isEarlyCriticalPath = sectorVO.isOnEarlyCriticalPath();
                var edgeSector = levelVO.isEdgeSector(x, y);
                var distanceToEdge = Math.min(Math.abs(y - levelVO.minY), Math.abs(y - levelVO.maxY), Math.abs(x - levelVO.minX), Math.abs(x - levelVO.maxX));
                var edgeThreshold = isEarlyCriticalPath || isEarlyZone ? 7 : 5;
                var centerThreshold = isEarlyCriticalPath || isEarlyZone ? WorldCreatorConstants.TOWER_RADIUS + 2 : WorldCreatorConstants.TOWER_RADIUS;
                
                if (edgeSector || l === topLevel || distanceToEdge < edgeThreshold || Math.abs(y) > centerThreshold || Math.abs(x) > centerThreshold) {
                    var hazardValueRand = WorldCreatorRandom.random(3000 + seed / (l + 40) + x * y / 6 + seed + y * 2 + l * l * 959);
                    var value = hazardValueRand * 100;
                    if (value < minHazardCold) value = minHazardCold;
                    if (value > maxHazardCold) value = maxHazardCold;
                    if (value > 10) {
                        value = Math.floor(value / 5) * 5;
                    } else {
                        value = Math.floor(value);
                    }
                    sectorVO.hazards.cold = value;
                }
            }
        },

        generateHazardClusters: function (seed, levelVO, itemsHelper) {
            var levelOrdinal = levelVO.levelOrdinal;
            var campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, levelVO.level);

            if (levelOrdinal < WorldCreatorConstants.MIN_LEVEL_ORDINAL_HAZARD_RADIATION && levelOrdinal < WorldCreatorConstants.MIN_LEVEL_ORDINAL_HAZARD_POISON) {
                return;
            }

            var isPollutedLevel = levelVO.notCampableReason === LevelConstants.UNCAMPABLE_LEVEL_TYPE_POLLUTION;
            var isRadiatedLevel = levelVO.notCampableReason === LevelConstants.UNCAMPABLE_LEVEL_TYPE_RADIATION;

            var getMaxValue = function (sectorVO, isRadiation, zone) {
                var step = WorldConstants.getCampStep(zone);
                if (sectorVO.hazards.cold) return 0;
                if (isRadiation) {
                    return Math.min(100, itemsHelper.getMaxHazardRadiationForLevel(campOrdinal, step, levelVO.isHard));
                } else {
                    return Math.min(100, itemsHelper.getMaxHazardPoisonForLevel(campOrdinal, step, levelVO.isHard));
                }
            }
            
            var setSectorHazard = function (sectorVO, hazardValueRand, isRadiation) {
                var maxHazardValue = getMaxValue(sectorVO, isRadiation, sectorVO.zone);
                var minHazardValue = Math.floor(Math.min(20, maxHazardValue / 3 * 2));
                var hazardValue = Math.ceil((minHazardValue + hazardValueRand * (maxHazardValue - minHazardValue)) / 5) * 5;
                if (hazardValue > maxHazardValue) hazardValue = maxHazardValue;
                if (isRadiation) {
                    sectorVO.hazards.radiation = hazardValue;
                } else {
                    sectorVO.hazards.poison = hazardValue;
                }
            };
            
            var makeCluster = function (centerSector, h, radius) {
                var isRadiation = WorldCreatorRandom.random(seed / 3381 + levelOrdinal * 777 + (h+44)*(h+11)) > 0.5;
                var hazardValueRand = WorldCreatorRandom.random(levelOrdinal * (h+11) / seed * 2 + seed/(h+99+levelOrdinal) - h*h);
                for (var hx = centerSector.position.sectorX - radius; hx <= centerSector.position.sectorX + radius; hx++) {
                    for (var hy = centerSector.position.sectorY - radius; hy <= centerSector.position.sectorY + radius; hy++) {
                        var sectorVO = levelVO.getSector(hx, hy);
                        if (!sectorVO) continue;
                        if (sectorVO.camp) continue;
                        if (WorldCreatorConstants.isEarlierZone(sectorVO.zone, centerSector.zone)) continue;
                        setSectorHazard(sectorVO, hazardValueRand, isRadiation);
                    }
                }
            }

            if (!(isPollutedLevel || isRadiatedLevel)) {
                // normal level
                // - random clusters
                var maxNumHazardClusters = Math.round(Math.min(4, levelVO.sectors.length / 100));
                var options = { excludingFeature: "camp", excludedZones: [ WorldConstants.ZONE_PASSAGE_TO_CAMP ] };
                var hazardSectors = WorldCreatorRandom.randomSectors(seed / 3 * levelOrdinal + 73 * levelVO.maxX, this.world, levelVO, 0, maxNumHazardClusters, options);
                for (var h = 0; h < hazardSectors.length; h++) {
                    var centerSector = hazardSectors[h];
                    var hrRandom = WorldCreatorRandom.random(84848 + levelOrdinal * 99 + (h+12) * 111 + seed / 777);
                    var radius = Math.round(hrRandom * 7) + 2;
                    makeCluster(centerSector, h, radius);
                }
                
                // - zone ZONE_EXTRA (only on campable levels as on on-campable ones ZONE_EXTRA is most of the level)
                if (levelVO.isCampable) {
                    var isRadiation = levelOrdinal >= WorldCreatorConstants.MIN_LEVEL_ORDINAL_HAZARD_RADIATION && WorldCreatorRandom.randomBool(seed / 3385 + levelOrdinal * 7799);
                    for (var i = 0; i < levelVO.sectors.length; i++) {
                        var sectorVO = levelVO.sectors[i];
                        if (sectorVO.zone != WorldConstants.ZONE_EXTRA_CAMPABLE) continue;
                        setSectorHazard(sectorVO, 1, isRadiation);
                        
                    }
                }
                // - clusters on border sector (to guide player to camp)
                var freq = 0.75;
                var borderSectors = WorldCreatorHelper.getBorderSectorsForZone(levelVO, WorldConstants.ZONE_PASSAGE_TO_CAMP, true);
                for (var i = 0; i < borderSectors.length; i++) {
                    var pair = borderSectors[i];
                    var distanceToCamp = Math.min(
                        WorldCreatorHelper.getDistanceToCamp(this.world, levelVO, pair.sector),
                        WorldCreatorHelper.getDistanceToCamp(this.world, levelVO, pair.neighbour)
                    );
                    if (distanceToCamp > 2) {
                        var s = 2000 + seed % 26 * 3331 + 100 + (i + 5) * 6541 + distanceToCamp * 11;
                        var add = WorldCreatorRandom.randomBool(s);
                        if (add) {
                            var radius = WorldCreatorRandom.randomInt(s / 2, 1, 3);
                            makeCluster(pair.sector, i, radius);
                        }
                    }
                }
            } else {
                // level completely covered in hazard
                var isRadiation = isRadiatedLevel;
                for (var i = 0; i < levelVO.sectors.length; i++) {
                    var sectorVO = levelVO.sectors[i];
                    if (sectorVO.zone == WorldConstants.ZONE_ENTRANCE) continue;
                    var maxHazardValue = getMaxValue(sectorVO, isRadiation, sectorVO.zone);
                    var minHazardValue = Math.floor(maxHazardValue / 2);
                    if (levelVO.isHard) minHazardValue = maxHazardValue;
                    var hazardValueRand = WorldCreatorRandom.random(levelOrdinal * (i + 11) / seed * 55 + seed / (i + 99) - i * i);
                    var hazardValue = Math.ceil((minHazardValue + hazardValueRand * (maxHazardValue - minHazardValue)) / 5) * 5;
                    if (hazardValue > maxHazardValue) hazardValue = maxHazardValue;
                    if (isPollutedLevel) {
                        sectorVO.hazards.poison = hazardValue;
                    } else if (isRadiatedLevel) {
                        sectorVO.hazards.radiation = hazardValue;
                    }
                }
            }
        },

		generateEnemies: function (seed, topLevel, bottomLevel, sectorVO) {
			var l = sectorVO.position.level;
			var x = sectorVO.position.sectorX;
			var y = sectorVO.position.sectorY;
            var levelVO = this.world.getLevel(l);
            var campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, l);
            var step = WorldConstants.getCampStep(sectorVO.zone);
            var isPollutedLevel = levelVO.notCampableReason === LevelConstants.UNCAMPABLE_LEVEL_TYPE_POLLUTION;
            var isRadiatedLevel = levelVO.notCampableReason === LevelConstants.UNCAMPABLE_LEVEL_TYPE_RADIATION;
            
			var enemyDifficulty = this.enemyCreator.getDifficulty(campOrdinal, step);
            if (sectorVO.isOnEarlyCriticalPath()) enemyDifficulty -= 2;
            enemyDifficulty = Math.max(enemyDifficulty, 1);
            sectorVO.enemyDifficulty = enemyDifficulty;

			var enemies = [];
            
            // collect all valid enemies for this sector (candidates)
            var candidates = [];
            var enemyCreator = this.enemyCreator;
            var enemy;
            var candidateDifficulties = [];
            var addEnemyCandidates = function (enemyType) {
                var typeEnemies = enemyCreator.getEnemies(enemyType, enemyDifficulty, false);
    			for (var e in typeEnemies) {
    				enemy = typeEnemies[e];
    				candidates.push(enemy);
                    candidateDifficulties.push(enemyCreator.getEnemyDifficultyLevel(enemy));
    			}
            };

            addEnemyCandidates(EnemyConstants.enemyTypes.global);
            if (!isPollutedLevel && !isRadiatedLevel && !sectorVO.hazards.hasHazards()) addEnemyCandidates(EnemyConstants.enemyTypes.nohazard);
            if (sectorVO.hazards.cold > 0) addEnemyCandidates(EnemyConstants.enemyTypes.cold);
            if (isPollutedLevel || sectorVO.hazards.poison > 0) addEnemyCandidates(EnemyConstants.enemyTypes.toxic);
            if (isRadiatedLevel || sectorVO.hazards.radiation > 0) addEnemyCandidates(EnemyConstants.enemyTypes.radiation);
            if (sectorVO.sunlit) addEnemyCandidates(EnemyConstants.enemyTypes.sunlit);
            if (!sectorVO.sunlit) addEnemyCandidates(EnemyConstants.enemyTypes.dark);
            if (!isPollutedLevel && !isRadiatedLevel && sectorVO.buildingDensity > 5) addEnemyCandidates(EnemyConstants.enemyTypes.dense);
            if (!isPollutedLevel && !isRadiatedLevel && sectorVO.buildingDensity <= 5) addEnemyCandidates(EnemyConstants.enemyTypes.sparse);
            
            var hasWater = sectorVO.hasWater();
            var directions = PositionConstants.getLevelDirections();
            var neighbours = levelVO.getNeighbours(x, y);
            for (var d in directions) {
                var direction = directions[d];
                var neighbour = neighbours[direction];
                if (neighbour) {
                    hasWater = hasWater || neighbour.hasWater();
                }
            }
            if (!isPollutedLevel && !isRadiatedLevel && hasWater) addEnemyCandidates(EnemyConstants.enemyTypes.water);

            // check that we found some candidates
			if (candidates.length < 1) {
                log.w("No valid enemies defined for sector " + sectorVO.position + " difficulty " + enemyDifficulty);
                return enemies;
            }
            
            // select enemies from candidates by rarity and difficulty
            candidates = candidates.sort(function (a,b) {
                return a.rarity - b.rarity;
            });
            candidateDifficulties = candidateDifficulties.sort(function (a,b) {
                return a - b;
            });
            
            var minDifficulty = levelVO.isHard ? candidateDifficulties[Math.floor(candidateDifficulties.length/2)] : candidateDifficulties[0];
            for (var i = 0; i < candidates.length; i++) {
                enemy = candidates[i];
                if (enemyCreator.getEnemyDifficultyLevel(enemy) < minDifficulty)  continue;
				var threshold = (enemy.rarity + 5) / 110;
				var r = WorldCreatorRandom.random(9999 + l * seed + x * l * 80 + y * 10 + i * x *22 - y * i * x * 15);
                if (i == 0 || r > threshold) {
                    enemies.push(enemy);
                }
            }

			return enemies;
		},
        
        canHaveGang: function (sectorVO) {
            if (!sectorVO) return false;
            if (sectorVO.camp) return false;
            if (sectorVO.zone == WorldConstants.ZONE_PASSAGE_TO_CAMP) return false;
            if (sectorVO.zone == WorldConstants.ZONE_PASSAGE_TO_PASSAGE) return false;
            var position = sectorVO.position;
            return true;
        },
        */
        

		// Functions that require that prepareWorld has been called first below this

		getPassageUp: function (level, sectorX, sectorY) {
			var sectorVO = this.world.getLevel(level).getSector(sectorX, sectorY);
			if (sectorVO.passageUpType) return sectorVO.passageUpType;
			return null;
		},

		getPassageDown: function (level, sectorX, sectorY) {
			var sectorVO = this.world.getLevel(level).getSector(sectorX, sectorY);
			if (sectorVO.passageDownType) return sectorVO.passageDownType;
			return null;
		},

		getSectorFeatures: function (level, sectorX, sectorY) {
			var sectorVO = this.world.getLevel(level).getSector(sectorX, sectorY);
			var sectorFeatures = {};
            sectorFeatures.criticalPaths = sectorVO.criticalPaths || [];
            sectorFeatures.zone = sectorVO.zone;
			sectorFeatures.buildingDensity = sectorVO.buildingDensity;
			sectorFeatures.wear = sectorVO.wear;
			sectorFeatures.damage = sectorVO.damage;
			sectorFeatures.sunlit = sectorVO.sunlit > 0;
            sectorFeatures.hazards = sectorVO.hazards;
			sectorFeatures.sectorType = sectorVO.sectorType;
			sectorFeatures.hasSpring = sectorVO.hasSpring;
			sectorFeatures.resourcesScavengable = sectorVO.resourcesScavengable;
			sectorFeatures.resourcesCollectable = sectorVO.resourcesCollectable;
			sectorFeatures.workshopResource = sectorVO.workshopResource;
            sectorFeatures.campable = sectorVO.camp;
            sectorFeatures.notCampableReason = sectorVO.notCampableReason;
            sectorFeatures.stash = sectorVO.stash || null;
			return sectorFeatures;
		},

		getLocales: function (level, sectorX, sectorY) {
			return this.world.getLevel(level).getSector(sectorX, sectorY).locales;
		},

		getCriticalPaths: function (level, sectorX, sectorY) {
			return this.world.getLevel(level).getSector(sectorX, sectorY).criticalPaths;
		},

		getSectorEnemies: function (level, sectorX, sectorY) {
			return this.world.getLevel(level).getSector(sectorX, sectorY).possibleEnemies;
		},

		getHasSectorRegularEnemies: function (level, sectorX, sectorY) {
			return this.world.getLevel(level).getSector(sectorX, sectorY).hasRegularEnemies;
		},

		getSectorLocaleEnemyCount: function (level, sectorX, sectorY) {
			return this.world.getLevel(level).getSector(sectorX, sectorY).numLocaleEnemies;
		},

    };

    return WorldCreator;
});
