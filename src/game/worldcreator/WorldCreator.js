// Stores world definitions and returns world-related constants given a seed. The seed should be a positive int.
define([
	'ash',
	'game/constants/GameConstants',
	'game/constants/LevelConstants',
	'game/constants/TradeConstants',
    'game/worldcreator/WorldCreatorHelper',
    'game/worldcreator/WorldCreatorRandom',
    'game/worldcreator/WorldCreatorDebug',
    'game/worldcreator/EnemyCreator',
	'game/vos/WorldVO',
	'game/vos/LevelVO',
	'game/vos/SectorVO',
	'game/vos/ResourcesVO',
	'game/vos/LocaleVO',
	'game/vos/PositionVO',
	'game/vos/StashVO',
	'game/vos/PathConstraintVO',
	'game/constants/WorldCreatorConstants',
	'game/constants/PositionConstants',
	'game/constants/MovementConstants',
	'game/constants/EnemyConstants',
	'game/constants/UpgradeConstants',
	'game/constants/LocaleConstants',
], function (
    Ash, GameConstants, LevelConstants, TradeConstants,
    WorldCreatorHelper, WorldCreatorRandom, WorldCreatorDebug, EnemyCreator,
    WorldVO, LevelVO, SectorVO, ResourcesVO, LocaleVO, PositionVO, StashVO, PathConstraintVO,
    WorldCreatorConstants, PositionConstants, MovementConstants, EnemyConstants, UpgradeConstants, LocaleConstants
) {

    var WorldCreator = {

		world: null,

		prepareWorld: function (seed, itemsHelper) {

            this.enemyCreator = new EnemyCreator();
            this.enemyCreator.createEnemies();

			var topLevel = WorldCreatorHelper.getHighestLevel(seed);
			var bottomLevel = WorldCreatorHelper.getBottomLevel(seed);
            this.world = new WorldVO(seed, topLevel, bottomLevel);

			// base: passages, campable sectors and levels, sunlight
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
		},

        discardWorld: function () {
            this.world.levels = [];
            this.world = null;
        },

		// campable sectors and levels, movement blockers, passages, sunlight
		prepareWorldStructure: function (seed, topLevel, bottomLevel) {
			var passageDownPositions = [];
            var previousCampPositions = [];
            this.totalSectors = 0;

			for (var l = topLevel; l >= bottomLevel; l--) {
                // prepare level vo
                var isCampableLevel = WorldCreatorHelper.isCampableLevel(seed, l);
                var notCampableReason = isCampableLevel ? null : WorldCreatorHelper.getNotCampableReason(seed, l);
				var levelOrdinal = WorldCreatorHelper.getLevelOrdinal(seed, l);
                var campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, l);
                var populationGrowthFactor = isCampableLevel ? WorldCreatorConstants.getPopulationGrowthFactor(campOrdinal) : 0;
                var levelVO = new LevelVO(l, levelOrdinal, isCampableLevel, notCampableReason, populationGrowthFactor);
				this.world.addLevel(levelVO);

                var passageUpPositions = passageDownPositions;

                // basic structure (sectors and paths)
                this.generateSectors(seed, levelVO, passageUpPositions, bottomLevel);

				// passages: up based on previous level and down based on path length
                passageDownPositions = this.generatePassages(seed, levelVO, passageUpPositions, bottomLevel);

				// camps: a few guaranteed campable spots for every campable level
				if (l === 13) {
                    var campSector = levelVO.getSector(WorldCreatorConstants.FIRST_CAMP_X, WorldCreatorConstants.FIRST_CAMP_Y);
					campSector.camp = true;
                    levelVO.addCampSector(campSector);
                    previousCampPositions = [ campSector.position ];
				} else {
					var numCamps = isCampableLevel ? 2 : 0;
                    if (campOrdinal > WorldCreatorConstants.CAMP_ORDINAL_LIMIT) numCamps = 0;
                    var campPositions = [];
                    if (numCamps > 0) {
                        for (var i = 0; i < numCamps; i++) {
                            var pathConstraints = [];
                            // critical paths: to previous camp positions
                            // at least one camp pos on this level should be within reach for each previous camp pos
                            if (previousCampPositions.length > 0) {
                                var ci = Math.min(i, previousCampPositions.length-1);
                                var startPos = previousCampPositions[ci];
                                var maxLength = WorldCreatorConstants.getMaxPathLength(campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_CAMP);
                                var pathType = WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_CAMP;
                                pathConstraints.push(new PathConstraintVO(startPos, maxLength, pathType));
                            }

                            // critical paths: to passages down
                            // each camp pos on this level should have at least one passage down within reach
                            var pd = Math.min(i, passageDownPositions.length-1);
                            var startPos = passageDownPositions[pd];
                            if (startPos) {
                                var maxLength = WorldCreatorConstants.getMaxPathLength(campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE);
                                var pathType = WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE;
                                pathConstraints.push(new PathConstraintVO(startPos, maxLength, pathType));
                            }

                            // critical paths: to passages up
                            // at least one camp pos on this level should be within reach for each passage up
                            if (passageUpPositions.length > 0) {
                                var pu =  Math.min(i, passageUpPositions.length-1);
                                var startPos = passageUpPositions[pu].clone();
                                if (startPos) {
                                    startPos.level = l;
                                    var maxLength = WorldCreatorConstants.getMaxPathLength(campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE);
                                    var pathType = WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE;
                                    pathConstraints.push(new PathConstraintVO(startPos, maxLength, pathType));
                                }
                            }
                            var campSector = WorldCreatorRandom.randomSector(seed * l * 534 * (i + 7), this.world, levelVO, true, pathConstraints);
                            if (campSector) {
                                campSector.camp = true;
                                levelVO.addCampSector(campSector);
                                campPositions.push(campSector.position);
                                for (var j = 0; j < pathConstraints.length; j++) {
                                    WorldCreatorHelper.addCriticalPath(this.world, campSector.position, pathConstraints[j].startPosition, pathConstraints[j].pathType);
                                }
                            } else {
                                console.log("WARN: Couldn't find camp sector " + i + "/" + numCamps + " on level " + l);
                            }
                        }
                    }
                    previousCampPositions = campPositions;
				}
			}

			console.log((GameConstants.logInfo ? "START " + GameConstants.STARTTimeNow() + "\t " : "")
				+ "World structure ready."
				+ (GameConstants.logInfo ? " (ground: " + bottomLevel + ", surface: " + topLevel + ", total sectors: " + this.totalSectors + ")" : ""));
            // WorldCreatorDebug.printWorld(this.world, [ "passageDown" ]);
            // WorldCreatorDebug.printWorld(this.world, [ "criticalPaths.length" ]);
            // WorldCreatorDebug.printWorld(this.world, [ "locales.length" ]);
		},

		// sector type, building density, state of repair, sunlight, hazards
		prepareWorldTexture: function (seed, topLevel, bottomLevel) {
            var brokenEdgeLevels = [ 10, 8, 4, topLevel - 5 ];
            var openEdgeLevels = [ topLevel - 1, topLevel - 2, topLevel - 3 ];
			for (var i = topLevel; i >= bottomLevel; i--) {
				var l = i === 0 ? 35 : i;
                var levelVO = this.world.getLevel(i);
                var origo = new PositionVO(i, 0, 0);

                var hasBrokenEdge = brokenEdgeLevels.indexOf(i) >= 0;
                var hasOpenEdge = openEdgeLevels.indexOf(i) >= 0;
                var numEdges = hasBrokenEdge && hasOpenEdge ? 2 : (hasBrokenEdge || hasOpenEdge) ? 1 : 0;
                var sunlitEdgeDirections = WorldCreatorRandom.randomDirections(seed + i * 222, numEdges, false);

				var levelDensity = Math.min(Math.max(2, i % 2 * 4 + WorldCreatorRandom.random(seed * 7 * l / 3 + 62) * 7), 8);
				if (Math.abs(i - 15) < 2) levelDensity = 10;
				var levelRepair = Math.max(2, (i - 15) * 2);
				if (i <= 5) levelRepair = levelRepair - 2;

                for (var s = 0; s < levelVO.sectors.length; s++) {
                    var sectorVO = levelVO.sectors[s];
                    var x = sectorVO.position.sectorX;
                    var y = sectorVO.position.sectorY;

                    var distanceToCenter = PositionConstants.getDistanceTo(sectorVO.position, new PositionVO(l, 0, 0));

                    // sunlight
                    var isOutsideTower = Math.abs(y) > WorldCreatorConstants.TOWER_RADIUS || Math.abs(x) > WorldCreatorConstants.TOWER_RADIUS;
                    var isEdgeSector = levelVO.isEdgeSector(x, y, 1);
                    var isOpenEdge = false;
                    var isBrokenEdge = false;
                    if (l === topLevel) {
                        // surface: all lit
                        sectorVO.sunlit = 1;
                    } else if (l === 13 || l === 12) {
                        // start levels: no sunlight
                        sectorVO.sunlit = 0;
                    } else {
                        sectorVO.sunlit = 0;

                        // one level below surface: center has broken "ceiling"
                        if (l === topLevel - 1 && distanceToCenter <= 6) {
                            sectorVO.sunlit = 1;
                        }

                        // all levels except surface: some broken or open edges
                        if (isEdgeSector || isOutsideTower) {
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

                    // state of repair
                    var explosionStrength = i - topLevel >= -3 && distanceToCenter <= 10 ? distanceToCenter * 2 : 0;
                    var stateOfRepair = Math.min(10, Math.max(0, Math.ceil(levelRepair + (WorldCreatorRandom.random(seed * l * (x + 100) * (y + 100)) * 5)) - explosionStrength));
                    if (sectorVO.camp) stateOfRepair = Math.max(3, stateOfRepair);
                    if (isOpenEdge) stateOfRepair = Math.min(7, stateOfRepair);
                    if (isBrokenEdge) stateOfRepair = Math.min(3, stateOfRepair);
                    sectorVO.stateOfRepair = stateOfRepair;

                    // sector type
                    var sectorType = WorldCreatorHelper.getSectorType(seed, l, x, y);
                    sectorVO.sectorType = sectorType;

                    // buildingDensity
                    var buildingDensity = Math.ceil(
                        Math.min(Math.min(levelDensity + 1, 10),
                        Math.max(0, levelDensity / 1.5 + Math.round((WorldCreatorRandom.random(seed * l * x + y + x) - 0.5) * 5) + (stateOfRepair) / 5)));
                    if (sectorVO.camp) {
                        buildingDensity = Math.min(1, Math.max(8, buildingDensity));
                    }
                    sectorVO.buildingDensity = buildingDensity;
				}
			}

			console.log((GameConstants.logInfo ? "START " + GameConstants.STARTTimeNow() + "\t " : "")
				+ "World texture ready.");
            // WorldCreatorDebug.printWorld(this.world, [ "sunlit" ]);
		},

		// resources and stashes
		prepareWorldResources: function (seed, topLevel, bottomLevel, itemsHelper) {
			for (var l = topLevel; l >= bottomLevel; l--) {
                var ll = l === 0 ? l : 50;
                var levelVO = this.world.getLevel(l);
				var campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, l);

                // stashes
                var addStashes = function (sectorSeed, stashType, itemID, num, numItemsPerStash) {
                    var options = { requireCentral: false, excludingFeature: "camp" };
                    var stashSectors = WorldCreatorRandom.randomSectors(sectorSeed, this.world, levelVO, num, num + 1, options);
                    for (var i = 0; i < stashSectors.length; i++) {
                        stashSectors[i].stashItem = itemID;
                        stashSectors[i].stash = new StashVO(stashType, numItemsPerStash, itemID);
                    }
                };
                var minSilkPerStash = 3;
                var maxSilkPerStash = 6;
                var amountSilk = levelVO.numLocales || minSilkPerStash;
                var numSilkStashes = Math.ceil(amountSilk / maxSilkPerStash);
                var numSilkPerStash = Math.ceil(amountSilk / numSilkStashes);
                addStashes(seed * l * 8 / 3 + (l+100)*14, StashVO.STASH_TYPE_ITEM, "res_silk", numSilkStashes, numSilkPerStash);

                var newEquipment = itemsHelper.getNewEquipment(campOrdinal);
                for (var i = 0; i < newEquipment.length; i++) {
                    addStashes(seed / 3 + (l+551)*8 + (i+103)*18, StashVO.STASH_TYPE_ITEM, newEquipment[i].id, 1, 1);
                }

                // TODO add currency stashes just for fun

                // springs
                var springSectors = [];
                var maxSprings = 5;
                var minSprings = 2;
                if (l === bottomLevel) {
                    maxSprings = 20;
                    minSprings = 10;
                }
                if (l > topLevel - 3) {
                    maxSprings = 10;
                    minSprings = 3;
                }
                var numSprings = WorldCreatorRandom.randomInt(seed * (l + 1000) / 11, minSprings, maxSprings);
                var shuffledPossibleSprings = levelVO.possibleSpringSectors.sort(function (a, b) {
                    return .5 - WorldCreatorRandom.random(seed + a.sectorX + b.sectorY);
                });
                springSectors = shuffledPossibleSprings.slice(0, Math.min(numSprings, shuffledPossibleSprings.length));

                // scavenge and collector resources
				for (var y = levelVO.minY; y <= levelVO.maxY; y++) {
					for (var x = levelVO.minX; x <= levelVO.maxX; x++) {
                        var sectorVO = levelVO.getSector(x, y);
                        if (!sectorVO) continue;

                        sectorVO.resourcesScavengable = WorldCreatorHelper.getSectorScavengableResources(seed, topLevel, bottomLevel, sectorVO);
                        sectorVO.resourcesCollectable = WorldCreatorHelper.getSectorCollectableResources(seed, topLevel, bottomLevel, sectorVO);

                        sectorVO.hasSpring = springSectors.indexOf(sectorVO) >= 0;
                        if (sectorVO.hasSpring) sectorVO.resourcesCollectable.water = Math.max(3, sectorVO.resourcesCollectable.water);
                    }
                }

                // workshops
                if (campOrdinal === 3 && levelVO.isCampable) {
                    var pathConstraints = [];
                    for (var i = 0; i < levelVO.campSectors.length; i++) {
                        var startPos = levelVO.campSectors[i].position;
                        var maxLength = WorldCreatorConstants.getMaxPathLength(campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_WORKSHOP);
                        pathConstraints.push(new PathConstraintVO(startPos, maxLength, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_WORKSHOP));
                    }
                    var options = { requireCentral: true, excludingFeature: "camp", pathConstraints: pathConstraints };
                    var refinerySectors = WorldCreatorRandom.randomSectors(seed * l * 2 / 7 * l, this.world, levelVO, 1, 2, options);
                    for (var i = 0; i < refinerySectors.length; i++) {
                        refinerySectors[i].resourcesScavengable.fuel = 5;
                        refinerySectors[i].workshopResource = resourceNames.fuel;
                        refinerySectors[i].workshop = true;
                        for (var j = 0; j < pathConstraints.length; j++) {
                            WorldCreatorHelper.addCriticalPath(this.world, refinerySectors[i].position, pathConstraints[j].startPosition, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_WORKSHOP);
                        }
                    }
                }
			}

			console.log((GameConstants.logInfo ? "START " + GameConstants.STARTTimeNow() + "\t " : "")
				+ "World resources ready.");
            // WorldCreatorDebug.printWorld(this.world, [ "resourcesScavengable.food" ]);
            // WorldCreatorDebug.printWorld(this.world, [ "hasSpring" ]);
            // WorldCreatorDebug.printWorld(this.world, [ "criticalPaths.length" ]);
		},

		// locales
		prepareWorldLocales: function (seed, topLevel, bottomLevel) {
            // 1) spawn trading partners
            for (var i = 0; i < TradeConstants.TRADING_PARTNERS.length; i++) {
                var partner = TradeConstants.TRADING_PARTNERS[i];
                var levelOrdinal = WorldCreatorHelper.getLevelOrdinalForCampOrdinal(seed, partner.campOrdinal);
                var level = WorldCreatorHelper.getLevelForOrdinal(seed, levelOrdinal);
                var levelVO = this.world.getLevel(level);
                var sectorVO = WorldCreatorRandom.randomSector(seed - 9393 + i * i, this.world, levelVO, false);
                var locale = new LocaleVO(localeTypes.tradingpartner, true);
                sectorVO.locales.push(locale);
                levelVO.numLocales++;
            }

            // 2) spawn other types (for blueprints)
			var getLocaleType = function (localeRandom, sectorType, l, isEarly) {
				var localeType = localeTypes.house;

				// level-based
				if (l === bottomLevel && localeRandom < 0.25) localeType = localeTypes.grove;
				else if (l >= topLevel - 1 && localeRandom < 0.25) localeType = localeTypes.lab;
				// sector type based
				else {
					switch (sectorType) {
					case WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL:
						if (localeRandom > 0.7) localeType = localeTypes.house;
                        else if (localeRandom > 0.6) localeType = localeTypes.transport;
                        else if (localeRandom > 0.55) localeType = localeTypes.sewer;
                        else if (localeRandom > 0.45) localeType = localeTypes.warehouse;
                        else if (localeRandom > 0.4) localeType = localeTypes.camp;
                        else if (localeRandom > 0.3) localeType = localeTypes.hut;
                        else if (localeRandom > 0.2 && !isEarly) localeType = localeTypes.hermit;
                        else if (localeRandom > 0.1) localeType = localeTypes.caravan;
                        else localeType = localeTypes.market;
						break;

                    case WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL:
                        if (localeRandom > 0.5) localeType = localeTypes.factory;
                        else if (localeRandom > 0.3) localeType = localeTypes.warehouse;
                        else if (localeRandom > 0.2) localeType = localeTypes.transport;
                        else if (localeRandom > 0.1) localeType = localeTypes.sewer;
                        else localeType = localeTypes.market;
                        break;

                    case WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE:
                        if (localeRandom > 0.6) localeType = localeTypes.maintenance;
                        else if (localeRandom > 0.4) localeType = localeTypes.transport;
                        else if (localeRandom > 0.3 && !isEarly) localeType = localeTypes.hermit;
                        else if (localeRandom > 0.2) localeType = localeTypes.caravan;
                        else localeType = localeTypes.sewer;
                        break;

                    case WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL:
                        if (localeRandom > 6) localeType = localeTypes.market;
                        else if (localeRandom > 0.4) localeType = localeTypes.warehouse;
                        else if (localeRandom > 0.3) localeType = localeTypes.transport;
                        else if (localeRandom > 0.25) localeType = localeTypes.hut;
                        else if (localeRandom > 0.2 && !isEarly) localeType = localeTypes.hermit;
                        else if (localeRandom > 0.15 && !isEarly) localeType = localeTypes.caravan;
                        else localeType = localeTypes.house;
                        break;

                    case WorldCreatorConstants.SECTOR_TYPE_SLUM:
                        if (localeRandom > 0.4) localeType = localeTypes.house;
                        else if (localeRandom > 0.35) localeType = localeTypes.camp;
                        else if (localeRandom > 0.3) localeType = localeTypes.hut;
                        else if (localeRandom > 0.25 && !isEarly) localeType = localeTypes.hermit;
                        else localeType = localeTypes.sewer;
                        break;

					default:
						console.log("WARN: Unknown sector type " + sectorType);
					}
				}
				return localeType;
			};
			var createLocales = function (worldVO, levelVO, campOrdinal, isEarly, count, countEasy) {
                var pathConstraints = [];
                for (var j = 0; j < levelVO.campSectors.length; j++) {
                    var pathType = isEarly ? WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_LOCALE_1 : WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_LOCALE_2;
                    var pos = levelVO.campSectors[j].position;
                    var length = WorldCreatorConstants.getMaxPathLength(campOrdinal, pathType);
                    pathConstraints.push(new PathConstraintVO(pos, length, pathType));
                }
                var options = { requireCentral: false, excludingFeature: "camp", pathConstraints: pathConstraints, numDuplicates: 2 };
                var l = levelVO.level;
                var sseed = seed - (isEarly ? 5555 : 0) + (l + 50) * 2;
				for (var i = 0; i < count; i++) {
					var localePos = WorldCreatorRandom.randomSectors(sseed + i + i * 7394 * sseed + i * i * l + i, worldVO, levelVO, 1, 2, options);
                    var sectorVO = localePos[0];
                    if (!sectorVO) continue;
                    var localeType = getLocaleType(WorldCreatorRandom.random(sseed + sseed + i * seed + localePos), sectorVO.sectorType, l, isEarly);
                    var isEasy = i <= countEasy;
                    var locale = new LocaleVO(localeType, isEasy, isEarly);
                    sectorVO.locales.push(locale);
                    levelVO.numLocales++;
                    for (var j = 0; j < pathConstraints.length; j++) {
                        WorldCreatorHelper.addCriticalPath(worldVO, sectorVO.position, pathConstraints[j].startPosition, pathConstraints[j].pathType);
                    }
				}
            };

            for (var l = topLevel; l >= bottomLevel; l--) {
                var levelVO = this.world.getLevel(l);
				var campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, l);

                // TODO have some blueprints on campless levels too (but ensure not critical ones)
                if (!levelVO.isCampable) continue;

				// min number of (easy) locales ensures that player can get all upgrades intended for that level
                // two "levels" of locales for critical paths, those on path 2 can require tech from path 1 to reach but not the other way around
				var minEarly = Math.max(1, UpgradeConstants.getPiecesByCampOrdinal(campOrdinal, UpgradeConstants.BLUEPRINT_TYPE_EARLY));
                var maxEarly = minEarly * 2;
				var countEarly = WorldCreatorRandom.randomInt((seed % 84) * l * l * l + 1, minEarly, maxEarly);
                createLocales(this.world, levelVO, campOrdinal, true, countEarly, minEarly);

                var minLate = Math.max(1, UpgradeConstants.getPiecesByCampOrdinal(campOrdinal, UpgradeConstants.BLUEPRINT_TYPE_LATE));
                var maxLate = minLate * 2;
				var countLate = WorldCreatorRandom.randomInt((seed % 84) * l * l * l + 1, minLate, maxLate);
                createLocales(this.world, levelVO, campOrdinal, false, countLate, minLate);
			}

			console.log((GameConstants.logInfo ? "START " + GameConstants.STARTTimeNow() + "\t " : "")
				+ "World locales ready.");
            // WorldCreatorDebug.printWorld(this.world, [ "locales.length" ]);
            // WorldCreatorDebug.printWorld(this.world, [ "criticalPath" ]);
		},

        prepareWorldMovementBlockers: function (seed, topLevel, bottomLevel) {
			for (var l = topLevel; l >= bottomLevel; l--) {
                var levelVO = this.world.getLevel(l);
				var levelOrdinal = WorldCreatorHelper.getLevelOrdinal(seed, l);
                var blockerTypes = [];
                if (l >= 14) blockerTypes.push(MovementConstants.BLOCKER_TYPE_WASTE);
                if (levelOrdinal >= 4 && l !== 14) blockerTypes.push(MovementConstants.BLOCKER_TYPE_GAP);
                this.addMovementBlockers(seed, l, levelVO, blockerTypes);
            }
        },

        // hazards
        prepareHazards: function (seed, topLevel, bottomLevel, itemsHelper) {
			for (var i = topLevel; i >= bottomLevel; i--) {
				var l = i === 0 ? 1342 : i;
                var levelVO = this.world.getLevel(i);
				var campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, i);

                // hazards: level-wide values
                var maxHazardCold = Math.min(100, itemsHelper.getMaxHazardColdForLevel(campOrdinal));
                var maxHazardColdEasy = Math.min(100, itemsHelper.getMaxHazardColdForLevel(campOrdinal - 1));
                this.generateHazardClusters(seed, levelVO, itemsHelper);

                // non-clustered environmental hazards (cold)
                for (var s = 0; s < levelVO.sectors.length; s++) {
                    var sectorVO = levelVO.sectors[s];
                    var x = sectorVO.position.sectorX;
                    var y = sectorVO.position.sectorY;
                    var edgeSector = levelVO.isEdgeSector(x, y);
                    var distanceToEdge = Math.min(Math.abs(y - levelVO.minY), Math.abs(y - levelVO.maxY), Math.abs(x - levelVO.minX), Math.abs(x - levelVO.maxX));

                    if (Math.abs(y) > 2 && Math.abs(x) > 2 && !sectorVO.camp) {
                        var hazardValueRand = WorldCreatorRandom.random(seed / (l + 40) + x * y / 6 + seed + y * 2 + l * l * 959);
                        if (edgeSector || l === topLevel || distanceToEdge < 5 || Math.abs(y) > WorldCreatorConstants.TOWER_RADIUS || Math.abs(x) > WorldCreatorConstants.TOWER_RADIUS) {
                            var maxValue = sectorVO.isOnEarlyCriticalPath() ? maxHazardColdEasy : maxHazardCold;
                            sectorVO.hazards.cold = Math.min(maxValue, Math.ceil(hazardValueRand * 10) * 10);
                        }
                    }
                }
            }

			console.log((GameConstants.logInfo ? "START " + GameConstants.STARTTimeNow() + "\t " : "")
				+ "World hazards ready.");
            // WorldCreatorDebug.printWorld(this.world, [ "hazards.cold" ]);
        },

		// enemies
		prepareWorldEnemies: function (seed, topLevel, bottomLevel) {
            var worldVO = this.world;
            var creator = this;
			for (var l = topLevel; l >= bottomLevel; l--) {
                var levelVO = this.world.getLevel(l);
                var numLocales = 0;
                var randomGangFreq = 45;
                
                var blockerType = MovementConstants.BLOCKER_TYPE_GANG;
                var blockerSettings = { addDiagonals: addDiagonals };
                var addGang = function (sectorVO, neighbourVO, addDiagonals) {
                    if (!neighbourVO) neighbourVO = WorldCreatorRandom.getRandomSectorNeighbour(seed, levelVO, sectorVO, true);
                    if (creator.canHaveGang(sectorVO) && creator.canHaveGang(neighbourVO)) {
                        creator.addMovementBlocker(levelVO, sectorVO, neighbourVO, blockerType, blockerSettings, function (s, direction) {
                            s.numLocaleEnemies[LocaleConstants.getPassageLocaleId(direction)] = 3;
                        });
                        return true;
                    } else {
                        if (GameConstants.logWarnings) console.log("WARN: Skipped adding gang at " + sectorVO.position);
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
                        if (addGang(sectorVO, neighbourVO, false)) num++;
                    }
                    return num;
                };

                // sector-based: possible enemies, random encounters and locales
                var randomGangIndex = 0;
                for (var i = 0; i < levelVO.sectors.length; i++) {
                    var sectorVO = levelVO.sectors[i];
                    sectorVO.possibleEnemies = [];
                    sectorVO.hasRegularEnemies = 0;

                    // possible enemy definitions
                    sectorVO.possibleEnemies = this.generateEnemies(seed, topLevel, bottomLevel, sectorVO);

                    // regular enemies (random encounters not tied to locales / gangs)
                    sectorVO.hasRegularEnemies = !sectorVO.camp && WorldCreatorRandom.random(l * sectorVO.position.sectorX * seed + sectorVO.position.sectorY * seed + 4848) > 0.2;

                    // workshop and locale enemies (counts)
                    if (sectorVO.workshop) {
                        sectorVO.numLocaleEnemies[LocaleConstants.LOCALE_ID_WORKSHOP] = 3;
                    }

                    // gangs: critical paths
                    for (var s = 0; s < levelVO.campSectors.length; s++) {
                        var campSector = levelVO.campSectors[s];
                        if (sectorVO.workshop) {
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

                    // gangs: some random gangs regardless of camps
                    if (randomGangIndex >= randomGangFreq) {
                        var neighbourVO = WorldCreatorRandom.getRandomSectorNeighbour(seed, levelVO, sectorVO, true);
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

			console.log((GameConstants.logInfo ? "START " + GameConstants.STARTTimeNow() + "\t " : "") + "World enemies ready.");
            // WorldCreatorDebug.printWorld(this.world, [ "possibleEnemies.length" ]);
            // WorldCreatorDebug.printWorld(this.world, [ "enemyDifficulty" ]);
		},

        generateSectors: function (seed, levelVO, passagesUpPositions) {
            var l = levelVO.level;

            var bagSize = WorldCreatorConstants.getBagBonus(levelVO.levelOrdinal);
            var bagSizePrevious = WorldCreatorConstants.getBagBonus(levelVO.levelOrdinal - 1);
            var bagSizeAvg = Math.floor((bagSize + bagSizePrevious) / 2);
            levelVO.centralAreaSize = Math.min(Math.max(Math.floor(bagSizeAvg / 6), WorldCreatorConstants.MIN_CENTRAL_AREA_SIZE), WorldCreatorConstants.MAX_CENTRAL_AREA_SIZE);
            levelVO.bagSize = bagSizeAvg;

            var numSectors = WorldCreatorConstants.getNumSectors(levelVO.levelOrdinal);
            var numSectorsCentral = WorldCreatorConstants.getNumSectorsCentral(levelVO.levelOrdinal);

            //  create central structure
			var topLevel = WorldCreatorHelper.getHighestLevel(seed);
			var bottomLevel = WorldCreatorHelper.getBottomLevel(seed);
            var centerSize = 5;
            if (l < 8) centerSize = 3;
            if (l === bottomLevel) centerSize = 7;
            if (l === topLevel) centerSize = 3;
            this.generateSectorRectangle(levelVO, 0, new PositionVO(levelVO.level, centerSize, centerSize), PositionConstants.DIRECTION_WEST, centerSize * 2, centerSize * 2);

            // connect existing positions (passages from the level above & initial starting camp position & central structure)
            var existingPointsToConnect = [];
            existingPointsToConnect.push(levelVO.sectors[0].position);
            existingPointsToConnect = existingPointsToConnect.concat(passagesUpPositions);
            if (l === 13) {
                existingPointsToConnect.push(new PositionVO(13, WorldCreatorConstants.FIRST_CAMP_X, WorldCreatorConstants.FIRST_CAMP_Y));
                if (seed % 2 === 0) {
                    existingPointsToConnect.push(new PositionVO(13, WorldCreatorConstants.FIRST_CAMP_X - 3, WorldCreatorConstants.FIRST_CAMP_Y));
                    existingPointsToConnect.push(new PositionVO(13, WorldCreatorConstants.FIRST_CAMP_X + 3, WorldCreatorConstants.FIRST_CAMP_Y));
                } else {
                    existingPointsToConnect.push(new PositionVO(13, WorldCreatorConstants.FIRST_CAMP_X, WorldCreatorConstants.FIRST_CAMP_Y - 3));
                    existingPointsToConnect.push(new PositionVO(13, WorldCreatorConstants.FIRST_CAMP_X, WorldCreatorConstants.FIRST_CAMP_Y + 3));
                }
            }
            this.generateSectorsForExistingPoints(seed, levelVO, existingPointsToConnect);

            // then create the rest of the sectors
            var attempts = 0;
            var maxAttempts = 1000;
            while ((levelVO.sectors.length < numSectors && levelVO.centralSectors.length < numSectorsCentral) && (attempts < maxAttempts)) {
                attempts++;
                var forceCentralStart = levelVO.centralSectors.length < numSectorsCentral;
                if (attempts % 2 !== 0) {
                    var isMassiveRectangle = levelVO.centralSectors.length < numSectorsCentral / 4 && levelVO.sectors.length < numSectors / 4;
                    this.generateSectorRectangles(seed, attempts, levelVO, forceCentralStart, isMassiveRectangle);
                } else {
                    this.generateSectorsPaths(seed, attempts, levelVO, forceCentralStart);
                }
            }

            this.generateSectorsFillSingleGaps(levelVO);

            // WorldCreatorDebug.printLevel(this.world, levelVO);
        },

        generateSectorsForExistingPoints: function (seed, levelVO, existingPoints) {
            if (existingPoints.length === 0) {
                this.createSector(levelVO, new PositionVO(levelVO.level, 0, 0), null);
                return;
            }

            var l = levelVO.levelOrdinal;
            var includeDiagonals = true;

            var pathStartingPos;
            var pathDirection;
            var pathLength;
            if (existingPoints.length === 1) {
                pathStartingPos = existingPoints[0].clone();
                pathDirection = WorldCreatorRandom.randomDirections(seed * levelVO.levelOrdinal + 482, 1, includeDiagonals)[0];
                pathLength = WorldCreatorRandom.randomInt(seed * 3 * 53 * (l + 1) + l + 55, WorldCreatorConstants.SECTOR_PATH_LENGTH_MIN, WorldCreatorConstants.SECTOR_PATH_LENGTH_MAX);
                this.generateSectorPath(levelVO, pathStartingPos, pathDirection, pathLength, false, true);
            } else if (existingPoints.length > 1) {
                for (var pi = 0; pi < existingPoints.length - 1; pi++) {
                    pathStartingPos = existingPoints[pi].clone();
                    pathLength = Math.abs(pathStartingPos.sectorX - existingPoints[pi + 1].sectorX) + 1;
                    pathDirection = PositionConstants.getXDirectionFrom(pathStartingPos, existingPoints[pi + 1]);
                    this.generateSectorPath(levelVO, pathStartingPos, pathDirection, pathLength, false, true);

                    var wayPoint = PositionConstants.getPositionOnPath(pathStartingPos, pathDirection, pathLength - 1);
                    pathLength = Math.abs(pathStartingPos.sectorY - existingPoints[pi + 1].sectorY) + WorldCreatorRandom.randomInt(seed * l / 35 * (pi + 1), 1, WorldCreatorConstants.SECTOR_PATH_LENGTH_MAX);
                    pathDirection = PositionConstants.getYDirectionFrom(pathStartingPos, existingPoints[pi + 1]);
                    this.generateSectorPath(levelVO, wayPoint, pathDirection, pathLength, false, true);
                }
            }
        },

        generateSectorsPaths: function(seed, pathSeed, levelVO, forceCentralStart) {
            var l = levelVO.levelOrdinal;
            var pathRandomSeed = levelVO.sectors.length * 4 + l * (levelVO.centralSectors.length + 5) + pathSeed * 5;
            var startingPosArray = forceCentralStart ? levelVO.centralSectors : levelVO.sectors;
            var pathStartingI = Math.floor(WorldCreatorRandom.random(seed * 938 * (l + 60) / pathRandomSeed + 2342 * l) * startingPosArray.length);
            var pathStartingPos = startingPosArray[pathStartingI].position.clone();

            var canBeDiagonal = WorldCreatorRandom.random(seed + (l + 70) * pathRandomSeed) < WorldCreatorConstants.DIAGONAL_PATH_PROBABILITY;
            var pathDirections = WorldCreatorRandom.randomDirections(seed * levelVO.levelOrdinal + 28381 + pathRandomSeed, 1, canBeDiagonal);

            var pathLength;
            for (var di = 0; di < pathDirections.length; di++) {
                pathLength = WorldCreatorRandom.randomInt(seed * 3 * pathRandomSeed * (di + 1) + (di + 3) * l + 55, WorldCreatorConstants.SECTOR_PATH_LENGTH_MIN, WorldCreatorConstants.SECTOR_PATH_LENGTH_MAX);
                this.generateSectorPath(levelVO, pathStartingPos, pathDirections[di], pathLength);
            }
        },

        generateSectorRectangles: function (seed, pathSeed, levelVO, forceCentralStart, isMassive) {
            var l = levelVO.levelOrdinal;
            var pathRandomSeed = levelVO.sectors.length * 4 + l * (levelVO.centralSectors.length + 5) + pathSeed * 5;
            var startingPosArray = forceCentralStart ? levelVO.centralSectors : levelVO.sectors;
            var pathStartingI = Math.floor(WorldCreatorRandom.random(seed * 938 * (l + 60) / pathRandomSeed + 2342 * l) * startingPosArray.length);
            var pathStartingPos = startingPosArray[pathStartingI].position.clone();

            var isDiagonal = WorldCreatorRandom.random(seed + (l * 44) * pathRandomSeed + pathSeed) < WorldCreatorConstants.DIAGONAL_PATH_PROBABILITY;
            var numRectangles = WorldCreatorRandom.randomInt((seed + pathRandomSeed * l - pathRandomSeed) / (pathSeed + 5), 1, 5);
            var startDirections = WorldCreatorRandom.randomDirections(seed * levelVO.levelOrdinal + 28381 + pathRandomSeed, numRectangles, false);
            var maxRectangleSize = isMassive ?
                WorldCreatorConstants.SECTOR_PATH_LENGTH_MAX * 3 / 4 :
                Math.min(WorldCreatorConstants.SECTOR_PATH_LENGTH_MAX / 2, levelVO.centralAreaSize / 2);
            var w = WorldCreatorRandom.randomInt(seed + pathRandomSeed / pathSeed + pathSeed * l, 4, maxRectangleSize);
            var h = WorldCreatorRandom.randomInt(seed + pathRandomSeed * l + pathSeed - pathSeed * l, 4, maxRectangleSize);

            var startDirection;
            for (var i = 0; i < numRectangles; i++) {
                startDirection = isDiagonal ? PositionConstants.getNextClockWise(startDirections[i], true) : startDirections[i];
                if (!this.generateSectorRectangle(levelVO, i, pathStartingPos, startDirection, w, h))
                    break;
            }
        },

        generateSectorRectangle: function (levelVO, i, startPos, startDirection, w, h) {
            var sideStartingPos = startPos;
            var currentDirection = startDirection;
            for (var j = 0; j < 4; j++) {
                var sideLength = PositionConstants.isHorizontalDirection(currentDirection) ? w : h;
                var fullyCreated = this.generateSectorPath(levelVO, sideStartingPos, currentDirection, sideLength, i > 0 || j > 0);
                if (!fullyCreated) return false;
                sideStartingPos = PositionConstants.getPositionOnPath(sideStartingPos, currentDirection, sideLength);
                currentDirection = PositionConstants.getNextClockWise(currentDirection, false);
            }
        },

        generateSectorsFillSingleGaps: function(levelVO) {
            // fill in annoying hole sectors (if an empty position has more than one sector neighbours + conditions, fill it in)
            // 1 neighbour = end of line, no fill
            // 2-5 neighbours = if there is one from where it's not possible to move to any of the others already, fill
            // 6+ neighbours = can always move around, no fill
            var directions = PositionConstants.getLevelDirections();
            var canMoveAroundSector = function(sectorNeighbours) {
                for (var i in directions) {
                    var direction = directions[i];
                    var neighbourToTest = sectorNeighbours[direction];
                    if (neighbourToTest) {
                        var canMove = false;
                        for (var j in directions) {
                            var otherNeighbour = neighbours[directions[j]];
                            if (otherNeighbour && PositionConstants.isNeighbouringDirection(direction, directions[j])) {
                                canMove = true;
                            }
                        }
                        if (!canMove) return false;
                    }
                }
                return true;
            };

            var minY = levelVO.minY;
            var maxY = levelVO.maxY;
            var minX = levelVO.minY;
            var maxX = levelVO.maxX;
            var neighbours;
            var neighboursCount;
            for (var y = minY; y <= maxY; y++) {
                for (var x = minX; x <= maxX; x++) {
                    if (!levelVO.hasSector(x, y)) {
                        neighbours = levelVO.getNeighbours(x, y);
                        neighboursCount = Object.keys(neighbours).length;
                        var canMoveAround = canMoveAroundSector(neighbours);
                        var needFill = neighboursCount > 1 && neighboursCount < 6 && !canMoveAround;
                        if (needFill) {
                            this.createSector(levelVO, new PositionVO(levelVO.level, x, y, null));
                        }
                    }
                }
            }
        },

        stepsTillSupplies: {
            water: 0,
            food: 0,
        },

        generateSectorPath: function (levelVO, pathStartingPos, pathDirection, pathLength, continueStepsTillSupplies, forceComplete) {
            var maxStepsTillSupplies = continueStepsTillSupplies ?  levelVO.bagSize / 2 : Math.min(pathLength, levelVO.bagSize / 2);

            if (!continueStepsTillSupplies) {
                this.stepsTillSupplies.water = Math.floor(
                    maxStepsTillSupplies / 2 +
                    WorldCreatorRandom.random(73999 + levelVO.level * 9 + levelVO.maxX * pathStartingPos.sectorY + pathStartingPos.sectorX * 5) * maxStepsTillSupplies / 2 +
                    1);
                this.stepsTillSupplies.food = Math.floor(
                    maxStepsTillSupplies / 2 +
                    WorldCreatorRandom.random(10764 + levelVO.level * 3 + +levelVO.maxY * pathStartingPos.sectorX + pathStartingPos.sectorY * 8) * maxStepsTillSupplies / 2 +
                    1);
            }

            var requiredResources = null;
            var requiresWater = true;
            var requiresFood = true;
            var sectorPos;
            for (var si = 0; si < pathLength; si++) {
                sectorPos = PositionConstants.getPositionOnPath(pathStartingPos, pathDirection, si);
                sectorPos.level = levelVO.level;

                this.stepsTillSupplies.water--;
                this.stepsTillSupplies.food--;

                var sectorExists = levelVO.hasSector(sectorPos.sectorX, sectorPos.sectorY);

                // stop path when intersecting existing paths
                if (!forceComplete) {
                    var sectorHasUnmatchingNeighbours = false;
                    var neighbours = levelVO.getNeighbours(sectorPos.sectorX, sectorPos.sectorY);
                    if (neighbours[PositionConstants.DIRECTION_EAST] && neighbours[PositionConstants.DIRECTION_SOUTH]) sectorHasUnmatchingNeighbours = true;
                    if (neighbours[PositionConstants.DIRECTION_EAST] && neighbours[PositionConstants.DIRECTION_NORTH]) sectorHasUnmatchingNeighbours = true;
                    if (neighbours[PositionConstants.DIRECTION_WEST] && neighbours[PositionConstants.DIRECTION_SOUTH]) sectorHasUnmatchingNeighbours = true;
                    if (neighbours[PositionConstants.DIRECTION_WEST] && neighbours[PositionConstants.DIRECTION_NORTH]) sectorHasUnmatchingNeighbours = true;
                    if (sectorExists || sectorHasUnmatchingNeighbours || Object.keys(neighbours).length > 4) {
                        if (si > 0) {
                            return false;
                        } else {
                            continue;
                        }
                    }
                }

                if (sectorExists) continue;

                requiresWater = this.stepsTillSupplies.water <= 0;
                requiresFood = this.stepsTillSupplies.food <= 0;

                if (requiresWater || requiresFood) {
                    requiredResources = new ResourcesVO();
                    if (requiresWater) {
                        requiredResources.setResource(resourceNames.water, 1);
                        this.stepsTillSupplies.water = maxStepsTillSupplies;
                    }
                    if (requiresFood) {
                        requiredResources.setResource(resourceNames.food, 1);
                        this.stepsTillSupplies.food = maxStepsTillSupplies;
                    }
                } else {
                    requiredResources = null;
                }

				this.createSector(levelVO, sectorPos, requiredResources);
            }
            return true;
        },

		createSector: function (levelVO, sectorPos, requiredResources) {
            this.totalSectors++;
			var sectorVO = new SectorVO(sectorPos, levelVO.isCampable, levelVO.notCampableReason, requiredResources);
			levelVO.addSector(sectorVO);
		},

        generatePassages: function (seed, levelVO, passageUpPositions, bottomLevel) {
            var l = levelVO.level;
            var campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, l);

            // passages: up according to previous level
            var previousLevelVO = this.world.levels[l + 1];
            var passagePosition;
            var passageSector;
            for (var i = 0; i < passageUpPositions.length; i++) {
                passagePosition = passageUpPositions[i];
                passageSector = levelVO.getSector(passagePosition.sectorX, passagePosition.sectorY);
                passageSector.passageUp = previousLevelVO.getSector(passagePosition.sectorX, passagePosition.sectorY).passageDown;
                levelVO.addPassageSector(passageSector);
            }

            var passageDownPositions = [];
            var passageDownSectors = [];

            // passages: down 1-2 per level
            if (l > bottomLevel) {
                // number of passages
                var numPassages = WorldCreatorRandom.random(seed * l / 7 + l + l * l + seed) > 0.65 ? 2 : 1;
                if (campOrdinal >= WorldCreatorConstants.CAMP_ORDINAL_LIMIT) numPassages = 0;
                if (l === 14) numPassages = 1;
                if (l === 13) numPassages = 1;

                // passage positions (at least one must be within reach from passages up)
                for (var i = 0; i < numPassages; i++) {
                    // get a random sector that a) exists on the level b) is within path distance from corresponding passage up
                    var passageUpPos = passageUpPositions.length > i ? passageUpPositions[i] : passageUpPositions[0];
                    if (passageUpPos) {
                        passageUpPos = passageUpPos.clone();
                        passageUpPos.level = l;
                        var maxPathLen = WorldCreatorConstants.getMaxPathLength(campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE);
                        var pathConstraints = [ new PathConstraintVO(passageUpPos, maxPathLen, WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE)];
                        passageDownSectors[i] = WorldCreatorRandom.randomSector(seed * l * 654 * (i + 2), this.world, levelVO, true, pathConstraints);
                        WorldCreatorHelper.addCriticalPath(this.world, passageUpPos, passageDownSectors[i].position, WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE);
                    } else {
                        passageDownSectors[i] = WorldCreatorRandom.randomSector(seed * l * 654 * (i + 2), this.world, levelVO, true);
                    }
                    passageDownPositions.push(passageDownSectors[i].position);
                }

                // passage types
                for (var i = 0; i < passageDownSectors.length; i++) {
                    if (l === 13) {
                        passageDownSectors[i].passageDown = MovementConstants.PASSAGE_TYPE_STAIRWELL;
                    } else if (l === 14) {
                        passageDownSectors[i].passageDown = MovementConstants.PASSAGE_TYPE_HOLE;
                    } else {
                        var availablePassageTypes = [MovementConstants.PASSAGE_TYPE_STAIRWELL];
                        if (l < 5 || l > 13) availablePassageTypes.push(MovementConstants.PASSAGE_TYPE_HOLE);
                        if (l > 15) availablePassageTypes.push(MovementConstants.PASSAGE_TYPE_ELEVATOR);
                        var passageTypeIndex = WorldCreatorRandom.randomInt(9 * seed + l * i * 7 + i + l * seed, 0, availablePassageTypes.length);
                        var passageType = availablePassageTypes[passageTypeIndex];
                        passageDownSectors[i].passageDown = passageType;
                    }
                    levelVO.addPassageSector(passageDownSectors[i]);
                }
            }

            return passageDownPositions;
        },

        addMovementBlocker: function(levelVO, sectorVO, neighbourVO, blockerType, options, cb) {
            var direction = PositionConstants.getDirectionFrom(sectorVO.position, neighbourVO.position);
            var neighbourDirection = PositionConstants.getDirectionFrom(neighbourVO.position, sectorVO.position);

            // check for existing movement blocker
            if (sectorVO.movementBlockers[direction] || neighbourVO.movementBlockers[neighbourDirection]) {
                return;
            }

            // check for critical paths (not allowed on early paths for blockers other than gang)
            if (blockerType !== MovementConstants.BLOCKER_TYPE_GANG) {
                for (var i = 0; i < sectorVO.criticalPaths.length; i++) {
                    var pathType = sectorVO.criticalPaths[i];
                    if (options.allowedCriticalPaths && options.allowedCriticalPaths.indexOf(pathType) >= 0) continue;
                    for (var j = 0; j < neighbourVO.criticalPaths.length; j++) {
                        if (pathType === neighbourVO.criticalPaths[j]) {
                            // console.log("WARN: (level " + levelVO.level + ") Skipping blocker on critical path: " + pathType + " (type: " + blockerType + ")");
                            return;
                        }
                    }
                }
            }

            // add blocker
            sectorVO.addBlocker(direction, blockerType);
            neighbourVO.addBlocker(neighbourDirection, blockerType);

            if (cb) {
                cb(sectorVO, direction);
                cb(neighbourVO, neighbourDirection);
            }

            // add blockers to adjacent paths too (if present) so player can't just walk around the blocker
            if (options.addDiagonals) {
                var diagonalsOptions = Object.assign({}, options);
                diagonalsOptions.addDiagonals = false;
                var nextNeighbours = levelVO.getNextNeighbours(sectorVO, direction);
                for (var j = 0; j < nextNeighbours.length; j++) {
                    this.addMovementBlocker(levelVO, sectorVO, nextNeighbours[j], blockerType, diagonalsOptions, cb);
                }
                nextNeighbours = levelVO.getNextNeighbours(neighbourVO, neighbourDirection);
                for (var j = 0; j < nextNeighbours.length; j++) {
                    this.addMovementBlocker(levelVO, neighbourVO, nextNeighbours[j], blockerType, diagonalsOptions, cb);
                }
            }
        },

        addMovementBlockers: function(seed, l, levelVO, blockerTypes) {
            if (blockerTypes.length < 1) return;
            var worldVO = this.world;
            var campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, l);
			var topLevel = WorldCreatorHelper.getHighestLevel(seed);
            var creator = this;

            var getBlockerType = function (seed) {
                var typeix = blockerTypes.length > 1 ? WorldCreatorRandom.randomInt(seed, 0, blockerTypes.length) : 0;
                return blockerTypes[typeix];
            };

            var addBlocker = function (seed, sectorVO, neighbourVO, addDiagonals, allowedCriticalPaths) {
                if (!neighbourVO) neighbourVO = WorldCreatorRandom.getRandomSectorNeighbour(seed, levelVO, sectorVO, true);
                var blockerType = getBlockerType(seed);
                creator.addMovementBlocker(levelVO, sectorVO, neighbourVO, blockerType, { addDiagonals: addDiagonals, allowedCriticalPaths: allowedCriticalPaths });
            };

            var addBlockersBetween = function (seed, levelVO, pointA, pointB, maxPaths, allowedCriticalPaths) {
                var path;
                var index;
                for (var i = 0; i < maxPaths; i++) {
                    path = WorldCreatorRandom.findPath(worldVO, pointA, pointB, true, true);
                    if (!path || path.length < 3) {
                        break;
                    }
                    var min = Math.round(path.length / 5) + 1;
                    var max = path.length - 2;
                    var finalSeed = Math.abs(seed + 6700 - (i+1) * 555);
                    index = WorldCreatorRandom.randomInt(finalSeed, min, max);
                    var sectorVO = levelVO.getSector(path[index].sectorX, path[index].sectorY);
                    var neighbourVO = levelVO.getSector(path[index + 1].sectorX, path[index + 1].sectorY);
                    addBlocker(finalSeed, sectorVO, neighbourVO, maxPaths < 2, allowedCriticalPaths);
                }
            };

            // critical paths: between passages
            var numBetweenPassages = 0;
            if (l === 14) numBetweenPassages = 1;
            if (numBetweenPassages > 0) {
                var allowedCriticalPaths = [ WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_LOCALE_2 ];
                for (var i = 0; i < levelVO.passageSectors.length; i++) {
                    for (var j = i + 1; j < levelVO.passageSectors.length; j++) {
                        var rand = Math.round(2222 + seed + (i+21) * 41 + (j + 2) * 33);
                        addBlockersBetween(rand, levelVO, levelVO.passageSectors[i].position, levelVO.passageSectors[j].position, numBetweenPassages, allowedCriticalPaths);
                    }
                }
            }

            if (levelVO.isCampable) {
                // critical paths: from camp to next passage / to locale
                var numToPassage = 0;
                if (campOrdinal === 8) numToPassage = 2;
                if (campOrdinal === 12) numToPassage = 2;
                if (campOrdinal === 14) numToPassage = 2;

                var numToLocale = 0;
                if (campOrdinal === 9) numToLocale = 2;

                for (var s = 0; s < levelVO.campSectors.length; s++) {
                    var campSector = levelVO.campSectors[s];

                    if (numToPassage > 0) {
                        var isPassageForward = function (sector) {
                            if (l > 13) return sector.passageUp > 0;
                            return sector.passageDown > 0;
                        };
                        var allowedCriticalPaths = [ WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE, WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE ];
                        for (var i = 0; i < levelVO.passageSectors.length; i++) {
                            var passageSector = levelVO.passageSectors[i];
                            if (!isPassageForward(passageSector)) continue;
                            var rand = Math.round(2222 + seed + (i+21) * 41 + (s + 2) * 33);
                            addBlockersBetween(rand, levelVO, passageSector.position, campSector.position, numToPassage, allowedCriticalPaths);
                        }
                    }

                    if (numToLocale > 0) {
                        var numLocales = 0;
                        var allowedCriticalPaths = [
                            WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_CAMP,
                            WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE,
                            WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_LOCALE_1,
                            WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_LOCALE_2
                        ];
                        for (var i = 0; i < levelVO.sectors.length; i++) {
                            var sectorVO = levelVO.sectors[i];
                            if (sectorVO.locales.length > 0) {
                                if (numLocales % 4 === 0) {
                                    var rand = Math.round(2222 + seed + (i+21) * 41 + (s + 2) * 351);
                                    addBlockersBetween(rand, levelVO, sectorVO.position, campSector.position, numToLocale, allowedCriticalPaths);
                                }
                                numLocales++;
                            }
                        }
                    }
                }
            }

            // random ones
            var numRandom = 0;
            if (l === 14) numRandom = 2;
            if (l === 15) numRandom = 1;
            if (l === topLevel - 1) numRandom = 4;
            if (l === topLevel) numRandom = 8;
            if (numRandom > 0) {
                var randomSeed = seed % 8 * 1751 + 1000 + (l + 5) * 291;
                var options = { excludingFeature: "camp" };
                var sectors = WorldCreatorRandom.randomSectors(randomSeed, worldVO, levelVO, numRandom, numRandom+1, options);
                for (var i = 0; i < sectors.length; i++) {
                    var addDiagonals = (l + i + 9) % 3 !== 0;
                    addBlocker(randomSeed - (i + 1) * 321, sectors[i], null, addDiagonals);
                }
            }
        },

        generateHazardClusters: function (seed, levelVO, itemsHelper) {
            var levelOrdinal = levelVO.levelOrdinal;
            var campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, levelVO.level);
            var easyCampOrdinal = campOrdinal - 1;
            if (!levelVO.isCampable) easyCampOrdinal = campOrdinal;

            if (levelOrdinal < WorldCreatorConstants.MIN_LEVEL_ORDINAL_HAZARD_RADIATION && levelVO.level < WorldCreatorConstants.MIN_LEVEL_HAZARD_POISON) {
                return;
            }

            var maxHazardRadiation = Math.min(100, itemsHelper.getMaxHazardRadiationForLevel(campOrdinal));
            var maxHazardRadiationEasy = Math.min(100, itemsHelper.getMaxHazardRadiationForLevel(easyCampOrdinal));
            var maxHazardPoison = Math.min(100, itemsHelper.getMaxHazardPoisonForLevel(campOrdinal));
            var maxHazardPoisonEasy = Math.min(100, itemsHelper.getMaxHazardPoisonForLevel(easyCampOrdinal));

            if (maxHazardRadiation <= 0 && maxHazardPoison <= 0) return;
            var isPollutedLevel = levelVO.notCampableReason === LevelConstants.UNCAMPABLE_LEVEL_TYPE_POLLUTION;
            var isRadiatedLevel = levelVO.notCampableReason === LevelConstants.UNCAMPABLE_LEVEL_TYPE_RADIATION;

            var getMaxValue = function (isRadiation, isEasy) {
                if (isEasy) {
                    if (isRadiation) return maxHazardRadiationEasy;
                    else return maxHazardPoisonEasy;
                } else {
                    if (isRadiation) return maxHazardRadiation;
                    else return maxHazardPoison;
                }
            }

            if (!(isPollutedLevel || isRadiatedLevel)) {
                var maxNumHazardClusters = Math.min(4, levelVO.sectors.length / 100);
                var options = { excludingFeature: "camp" };
                var hazardSectors = WorldCreatorRandom.randomSectors(seed / 3 * levelOrdinal + 73 * levelVO.maxX, this.world, levelVO, 0, maxNumHazardClusters, options);

                // console.log("level " + levelVO.level + ": " + hazardSectors.length + "/" + maxNumHazardClusters + " clusters");

                for (var h = 0; h < hazardSectors.length; h++) {
                    var hs = hazardSectors[h];
                    var hrRandom = WorldCreatorRandom.random(84848 + levelOrdinal * 99 + (h+12) * 111 + seed / 777);
                    var hr = Math.round(hrRandom * 8) + 2;
                    var isRadiation = WorldCreatorRandom.random(seed / 3381 + levelOrdinal * 777 + (h+44)*(h+11)) > 0.5;
                    var hazardValueRand = WorldCreatorRandom.random(levelOrdinal * (h+11) / seed * 2 + seed/(h+99+levelOrdinal) - h*h);
                    for (var hx = hs.position.sectorX - hr; hx <= hs.position.sectorX + hr; hx++) {
                        for (var hy = hs.position.sectorY - hr; hy <= hs.position.sectorY + hr; hy++) {
                            var sectorVO = levelVO.getSector(hx, hy);
                            if (sectorVO && !sectorVO.camp) {
                                var maxHazardValue = getMaxValue(isRadiation, sectorVO.isOnEarlyCriticalPath());
                                var minHazardValue = Math.min(20, maxHazardValue / 3 * 2);
                                var hazardValue = Math.ceil((minHazardValue + hazardValueRand * (maxHazardValue - minHazardValue)) / 5) * 5;
                                if (isRadiation) {
                                    sectorVO.hazards.radiation = hazardValue;
                                } else {
                                    sectorVO.hazards.poison = hazardValue;
                                }
                            }
                        }
                    }
                }
            } else {
                for (var i = 0; i < levelVO.sectors.length; i++) {
                    var sectorVO = levelVO.sectors[i];
                    var maxHazardValue = getMaxValue(isRadiation, sectorVO.isOnEarlyCriticalPath());
                    var minHazardValue = Math.min(10, maxHazardValue);
                    var hazardValueRand = WorldCreatorRandom.random(levelOrdinal * (i + 11) / seed * 55 + seed / (i + 99) - i * i);
                    var hazardValue = Math.ceil((minHazardValue + hazardValueRand * (maxHazardValue - minHazardValue)) / 5) * 5;
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

			var randomEnemyCheck = function (typeSeed, enemy) {
				var threshold = (enemy.rarity + 5) / 110;
				var r = WorldCreatorRandom.random(typeSeed * l * seed + x * l + y + typeSeed + typeSeed * x - y * typeSeed * x);
				return r > threshold;
			};

			var enemyDifficulty = WorldCreatorHelper.getCampOrdinal(seed, l);
            if (sectorVO.isOnEarlyCriticalPath() && enemyDifficulty > 1) enemyDifficulty -= 1;

            sectorVO.enemyDifficulty = enemyDifficulty;

			var enemies = sectorVO.possibleEnemies;
            var enemy;

            var globalE = this.enemyCreator.getEnemies(EnemyConstants.enemyTypes.global, enemyDifficulty, false);
			for (var e in globalE) {
				enemy = globalE[e];
				if (randomEnemyCheck(11 * (e + 1), enemy)) enemies.push(enemy);
			}

			if (l <= bottomLevel + 1) {
				var earthE = this.enemyCreator.getEnemies(EnemyConstants.enemyTypes.earth, enemyDifficulty, false);
				for (var e in earthE) {
					enemy = earthE[e];
					if (randomEnemyCheck(333 * (e + 1), enemy)) enemies.push(enemy);
				}
			}

			if (sectorVO.sunlit) {
				var sunE = this.enemyCreator.getEnemies(EnemyConstants.enemyTypes.sunlit, enemyDifficulty, false);
				for (var e in sunE) {
					enemy = sunE[e];
					if (randomEnemyCheck(6666 * (e + 4) + 2, enemy)) enemies.push(enemy);
				}
			}

			if (l >= topLevel - 10) {
				var inhabitedE = this.enemyCreator.getEnemies(EnemyConstants.enemyTypes.inhabited, enemyDifficulty, false);
				for (var e in inhabitedE) {
					enemy = inhabitedE[e];
					if (randomEnemyCheck(777 * (e + 2) ^ 2, enemy)) enemies.push(enemy);
				}
			}

			if (l >= topLevel - 5) {
				var urbanE = this.enemyCreator.getEnemies(EnemyConstants.enemyTypes.urban, enemyDifficulty, false);
				for (var e in urbanE) {
					enemy = urbanE[e];
					if (randomEnemyCheck(99 * (e + 1), enemy)) enemies.push(enemy);
				}
			}

			if (enemies.length < 1) {
                if (globalE.length > 0) {
                    enemies.push(globalE[0]);
                } else {
                    console.log("WARN: No valid enemies defined for sector " + sectorVO.position + " difficulty " + enemyDifficulty);
                }
            }

			return enemies;
		},
        
        canHaveGang: function (sectorVO) {
            if (!sectorVO) return false;
            var position = sectorVO.position;
            if (position.level == 13 && position.sectorX == WorldCreatorConstants.FIRST_CAMP_X && position.sectorY == WorldCreatorConstants.FIRST_CAMP_Y) return false;
            return true;
        },



		// Functions that require that prepareWorld has been called first below this

		getPassageUp: function (level, sectorX, sectorY) {
			var sectorVO = this.world.getLevel(level).getSector(sectorX, sectorY);
			if (sectorVO.passageUp) return sectorVO.passageUp;
			return null;
		},

		getPassageDown: function (level, sectorX, sectorY) {
			var sectorVO = this.world.getLevel(level).getSector(sectorX, sectorY);
			if (sectorVO.passageDown) return sectorVO.passageDown;
			return null;
		},

		getSectorFeatures: function (level, sectorX, sectorY) {
			var sectorVO = this.world.getLevel(level).getSector(sectorX, sectorY);
			var sectorFeatures = {};
			sectorFeatures.buildingDensity = sectorVO.buildingDensity;
			sectorFeatures.stateOfRepair = sectorVO.stateOfRepair;
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
