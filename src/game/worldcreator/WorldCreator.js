// Stores world definitions and returns world-related constants given a seed. The seed should be a positive int.
define([
	'ash',
    'utils/MathUtils',
	'game/constants/GameConstants',
	'game/constants/ItemConstants',
	'game/constants/LevelConstants',
	'game/constants/TradeConstants',
    'game/worldcreator/WorldCreatorHelper',
    'game/worldcreator/WorldCreatorRandom',
    'game/worldcreator/WorldCreatorDebug',
    'game/worldcreator/EnemyCreator',
	'game/vos/WorldVO',
	'game/vos/LevelVO',
	'game/vos/SectorVO',
	'game/vos/GangVO',
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
    Ash, MathUtils, GameConstants, ItemConstants, LevelConstants, TradeConstants,
    WorldCreatorHelper, WorldCreatorRandom, WorldCreatorDebug, EnemyCreator,
    WorldVO, LevelVO, SectorVO, GangVO, ResourcesVO, LocaleVO, PositionVO, StashVO, PathConstraintVO,
    WorldCreatorConstants, PositionConstants, MovementConstants, EnemyConstants, UpgradeConstants, LocaleConstants
) {
    var context = "WorldCreator";

    var WorldCreator = {

		world: null,

		prepareWorld: function (seed, itemsHelper) {
            this.enemyCreator = new EnemyCreator();
            this.enemyCreator.createEnemies();

			var topLevel = WorldCreatorHelper.getHighestLevel(seed);
			var bottomLevel = WorldCreatorHelper.getBottomLevel(seed);
            this.world = new WorldVO(seed, topLevel, bottomLevel);

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
            
			for (var l = topLevel; l >= bottomLevel; l--) {
                var levelVO = this.world.getLevel(l);
                // WorldCreatorDebug.printLevel(this.world, levelVO);
            }
            
            return this.world;
		},

        discardWorld: function () {
            this.world.levels = [];
            this.world = null;
        },

		// campable sectors and levels, passages, zones
		prepareWorldStructure: function (seed, topLevel, bottomLevel) {
			var passageDownPosition = null;
            this.totalSectors = 0;

			for (var l = topLevel; l >= bottomLevel; l--) {
                // prepare level vo
                var isCampableLevel = WorldCreatorHelper.isCampableLevel(seed, l);
                var notCampableReason = isCampableLevel ? null : WorldCreatorHelper.getNotCampableReason(seed, l);
				var levelOrdinal = WorldCreatorHelper.getLevelOrdinal(seed, l);
                var campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, l);
                var populationGrowthFactor = isCampableLevel ? WorldCreatorConstants.getPopulationGrowthFactor(campOrdinal) : 0;
                var levelVO = new LevelVO(l, levelOrdinal, campOrdinal, isCampableLevel, notCampableReason, populationGrowthFactor);
				this.world.addLevel(levelVO);

                // passages up: previous passages down (positions)
                var passageUpPosition = null;
                if (passageDownPosition) {
                    passageUpPosition = passageDownPosition.clone();
                    passageUpPosition.level = l;
                }
                
                // level center: use to position camps and passages down near (first) passage up (without slipping too far from level middle)
                var levelCenter = passageUpPosition == null ? new PositionVO(l,0,0) : passageUpPosition.clone();
                levelCenter.level = l;
                levelCenter.sectorX = MathUtils.clamp(levelCenter.sectorX, -5, 5);
                levelCenter.sectorY = MathUtils.clamp(levelCenter.sectorY, -5, 5);
                var passagePositionsArea = 11;
                var campPositionsArea = 7;
                
				// camps: a few guaranteed campable spots for every campable level (positions)
                var campPositions = [];
                if (l === 13) {
                    campPositions.push(new PositionVO(l, WorldCreatorConstants.FIRST_CAMP_X, WorldCreatorConstants.FIRST_CAMP_Y));
                } else {
					var numCamps = isCampableLevel ? 2 : 0;
                    if (numCamps > 0) {
                        var basePosition = WorldCreatorRandom.randomSectorPosition(seed * l * 534, l, campPositionsArea, levelCenter, 2);
                        for (var i = 0; i < numCamps; i++) {
                            campPositions.push(WorldCreatorRandom.randomSectorPosition(l * 100 + i * 101, l, i * 2, basePosition, 1));
                        }
                    }
                }
                
                // passages down: 1-2 per level (positions)
                passageDownPosition = null;
                if (l > bottomLevel) {
                    var numPassages = 1;
                    if (numPassages > 0) {
                        passageDownPosition = WorldCreatorRandom.randomSectorPosition(seed - l * 654, l, passagePositionsArea, levelCenter, 3);
                    }
                }

                // create basic structure (sectors and paths)
                var requiredPaths = this.createRequiredPathsFromPositions(l, campOrdinal, passageUpPosition, campPositions, passageDownPosition, bottomLevel);
                this.generateSectors(seed, levelVO, campPositions, requiredPaths);
                
                // camps: assign camps to sectors in camp positions
                for (var i = 0; i < campPositions.length; i++) {
                    var sectorVO = levelVO.getSector(campPositions[i].sectorX, campPositions[i].sectorY);
                    sectorVO.camp = true;
                    levelVO.addCampSector(sectorVO);
                }
                
                // passages: assign passages to sectors in passage positions
                this.generatePassages(seed, levelVO, [ passageUpPosition ], [ passageDownPosition ], bottomLevel);
                
                // zones: areas based around critical paths that define difficulty level of fights etc across the level
                this.generateZones(seed, levelVO);
			}

			log.i("START " + GameConstants.STARTTimeNow() + "\t "
				+ "World structure ready."
				+ (" (ground: " + bottomLevel + ", surface: " + topLevel + ", total sectors: " + this.totalSectors + ")"));
            // WorldCreatorDebug.printWorld(this.world, [ "passageDown" ]);
            // WorldCreatorDebug.printWorld(this.world, [ "criticalPaths.length" ]);
            // WorldCreatorDebug.printWorld(this.world, [ "locales.length" ]);
		},

		// sector type, building density, state of repair, sunlight
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

			log.i("START " + GameConstants.STARTTimeNow() + "\t World texture ready.");
            // WorldCreatorDebug.printWorld(this.world, [ "sunlit" ]);
		},

		// resources and stashes
		prepareWorldResources: function (seed, topLevel, bottomLevel, itemsHelper) {
			for (var l = topLevel; l >= bottomLevel; l--) {
                var ll = l === 0 ? l : 50;
                var levelVO = this.world.getLevel(l);
				var campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, l);
                var lateZones = [ WorldCreatorConstants.ZONE_POI_2, WorldCreatorConstants.ZONE_EXTRA_CAMPABLE ];
                var earlyZones = [ WorldCreatorConstants.ZONE_PASSAGE_TO_CAMP, WorldCreatorConstants.ZONE_PASSAGE_TO_PASSAGE, WorldCreatorConstants.ZONE_POI_1 ];

                // stashes
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
                
                // - stashes: lock picks
                if (l == 13) {
                    addStashes(seed * l * 8 / 3 + (l+100)*14 + 3333, "lockpick", StashVO.STASH_TYPE_ITEM, "exploration_1", 1, 1, lateZones);
                }
                
                // - stashes: hairpins (for lockpics)
                var pinsPerStash = 3;
                var numHairpinStashes = 2;
                if (l == 13) numHairpinStashes = 5;
                if (!levelVO.isCampable) numHairpinStashes = 5;
                addStashes(seed * l * 8 / 3 + (l+100)*14 + 3333, "hairpin", StashVO.STASH_TYPE_ITEM, "res_hairpin", numHairpinStashes, pinsPerStash);
                
                // - stashes: ingredients for craftable equipment (campable levels)
                if (levelVO.isCampable) {
                    var requiredEquipment = itemsHelper.getRequiredEquipment(campOrdinal, WorldCreatorConstants.CAMP_STEP_END);
                    var requiredEquipmentIngredients = itemsHelper.getIngredientsToCraftMany(requiredEquipment);
                    var numStashIngredients = MathUtils.clamp(Math.floor(requiredEquipmentIngredients.length / 2), 1, 3);
                    for (var i = 0; i < numStashIngredients; i++) {
                        var def = requiredEquipmentIngredients[i];
                        var amount = MathUtils.clamp(def.amount / 3, 3, 10);
                        addStashes(seed % 13 + l * 7 + 5 + (i+1) * 10, "craftable ingredients", StashVO.STASH_TYPE_ITEM, def.id, 2, amount);
                    }
                }
                
                // - stashes: non-craftable equipment
                var newEquipment = itemsHelper.getNewEquipment(campOrdinal);
                for (var i = 0; i < newEquipment.length; i++) {
                    if (!newEquipment[i].craftable && newEquipment[i].scavengeRarity <= 5) {
                        addStashes(seed / 3 + (l+551)*8 + (i+103)*18, "non-craftable equipment", StashVO.STASH_TYPE_ITEM, newEquipment[i].id, 1, 1, lateZones);
                    }
                }
                
                // - stashes: random ingredients (uncampable levels)
                if (!levelVO.isCampable) {
                    var i = seed % (l+5) + 3;
                    var ingredient = ItemConstants.getIngredient(i);
                    addStashes(seed % 7 + 3000 + 101 * l, "random", StashVO.STASH_TYPE_ITEM, ingredient.id, 2, 3);
                }
                
                // - stashes: metal caches
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
                        var maxLength = WorldCreatorConstants.getMaxPathLength(campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1);
                        pathConstraints.push(new PathConstraintVO(startPos, maxLength, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1));
                    }
                    var options = { requireCentral: false, excludingFeature: "camp", pathConstraints: pathConstraints };
                    var refinerySectors = WorldCreatorRandom.randomSectors(seed * l * 2 / 7 * l, this.world, levelVO, 1, 2, options);
                    for (var i = 0; i < refinerySectors.length; i++) {
                        refinerySectors[i].resourcesScavengable.fuel = 5;
                        refinerySectors[i].workshopResource = resourceNames.fuel;
                        refinerySectors[i].workshop = true;
                        for (var j = 0; j < pathConstraints.length; j++) {
                            WorldCreatorHelper.addCriticalPath(this.world, refinerySectors[i].position, pathConstraints[j].startPosition, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1);
                        }
                    }
                }
			}

			log.i("START " + GameConstants.STARTTimeNow() + "\t World resources ready.");
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
                var locale = new LocaleVO(localeTypes.tradingpartner, true, false);
                // log.i("trade partner at " + sectorVO.position)
                sectorVO.locales.push(locale);
                levelVO.numLocales++;
            }

            // 2) spawn other types (for blueprints)
            var worldVO = this.world;
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
						log.w("Unknown sector type " + sectorType);
					}
				}
				return localeType;
			};
			var createLocales = function (worldVO, levelVO, campOrdinal, isEarly, count, countEasy) {
                var pathConstraints = [];
                for (var j = 0; j < levelVO.campSectors.length; j++) {
                    var pathType = isEarly ? WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1 : WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_2;
                    var pos = levelVO.campSectors[j].position;
                    var length = WorldCreatorConstants.getMaxPathLength(campOrdinal, pathType);
                    pathConstraints.push(new PathConstraintVO(pos, length, pathType));
                }
                var excludedZones = isEarly ? [ WorldCreatorConstants.ZONE_POI_2, WorldCreatorConstants.ZONE_EXTRA_CAMPABLE, WorldCreatorConstants.ZONE_CAMP_TO_PASSAGE ] : [ WorldCreatorConstants.ZONE_PASSAGE_TO_CAMP, WorldCreatorConstants.ZONE_POI_1, WorldCreatorConstants.ZONE_EXTRA_CAMPABLE ];
                var options = { requireCentral: false, excludingFeature: "camp", pathConstraints: pathConstraints, excludedZones: excludedZones, numDuplicates: 2 };
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
                    levelVO.localeSectors.push(sectorVO);
                    levelVO.numLocales++;
                    // log.i(levelVO.level + " added locale: isEarly:" + isEarly + ", distance to camp: " + WorldCreatorHelper.getDistanceToCamp(worldVO, levelVO, sectorVO) + ", zone: " + sectorVO.zone);
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
                var numEarlyBlueprints = UpgradeConstants.getPiecesByCampOrdinal(campOrdinal, UpgradeConstants.BLUEPRINT_TYPE_EARLY);
                if (numEarlyBlueprints) {
    				var minEarly = 2 + numEarlyBlueprints;
                    var maxEarly = numEarlyBlueprints * 2;
    				var countEarly = WorldCreatorRandom.randomInt((seed % 84) * l * l * l + 1, minEarly, maxEarly);
                    createLocales(this.world, levelVO, campOrdinal, true, countEarly, minEarly);
                } else {
                    log.w("no early blueprints on camp level " + l);
                }

                var numLateBlueprints = UpgradeConstants.getPiecesByCampOrdinal(campOrdinal, UpgradeConstants.BLUEPRINT_TYPE_LATE);
                if (numLateBlueprints > 0) {
                    var minLate = 2 + numLateBlueprints;
                    var maxLate = numLateBlueprints * 2;
    				var countLate = WorldCreatorRandom.randomInt((seed % 84) * l * l * l + 1, minLate, maxLate);
                    createLocales(this.world, levelVO, campOrdinal, false, countLate, minLate);
                } else {
                    log.w("no late blueprints on camp level " + l);
                }
			}

			log.i("START " + GameConstants.STARTTimeNow() + "\t World locales ready.");
            // WorldCreatorDebug.printWorld(this.world, [ "locales.length" ]);
            // WorldCreatorDebug.printWorld(this.world, [ "criticalPath" ]);
		},
        
        // movement blockers
        prepareWorldMovementBlockers: function (seed, topLevel, bottomLevel) {
			for (var l = topLevel; l >= bottomLevel; l--) {
                var levelVO = this.world.getLevel(l);
				var levelOrdinal = WorldCreatorHelper.getLevelOrdinal(seed, l);
                var campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, l);
                var blockerTypes = [];
                if (levelOrdinal > 1) {
                    blockerTypes.push(MovementConstants.BLOCKER_TYPE_DEBRIS);
                    blockerTypes.push(MovementConstants.BLOCKER_TYPE_DEBRIS);
                }
                if (campOrdinal >= 5) {
                    blockerTypes.push(MovementConstants.BLOCKER_TYPE_GAP);
                }
                if (l >= 14) {
                    blockerTypes.push(MovementConstants.BLOCKER_TYPE_WASTE);
                }
                this.addMovementBlockers(seed, l, levelVO, blockerTypes);
            }
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
                    if (sectorVO.workshop) {
                        sectorVO.numLocaleEnemies[LocaleConstants.LOCALE_ID_WORKSHOP] = 3;
                    }
				}
                
                // gangs: on zone borders
                // - ZONE_PASSAGE_TO_CAMP: all except too close to camp
                var borderSectors = WorldCreatorHelper.getBorderSectorsForZone(levelVO, WorldCreatorConstants.ZONE_PASSAGE_TO_CAMP, true);
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
                    borderSectors = WorldCreatorHelper.getBorderSectorsForZone(levelVO, WorldCreatorConstants.ZONE_PASSAGE_TO_PASSAGE, false);
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
            var maxPathLenP2P = WorldCreatorConstants.getMaxPathLength(campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE);
            var maxPathLenC2P = WorldCreatorConstants.getMaxPathLength(campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE);
            var requiredPaths = [];
            if (campPositions.length > 0) {
                // passages up -> camps -> passages down
                var isGoingDown = level <= 13 && level >= bottomLevel;
                var passageUpPathType = isGoingDown ? WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_CAMP : WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE;
                var passageDownPathType = isGoingDown ? WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE : WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_CAMP;
                if (level == 13) {
                    passageUpPathType = WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE;
                    passageDownPathType = WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE;
                }
                if (passageUpPosition) {
                    requiredPaths.push({ start: campPositions[0], end: passageUpPosition, maxlen: maxPathLenC2P, type: passageUpPathType });
                }
                if (passageDownPosition) {
                    requiredPaths.push({ start: campPositions[0], end: passageDownPosition, maxlen: maxPathLenC2P, type: passageDownPathType });
                }
                for (var i = 1; i < campPositions.length; i++) {
                    requiredPaths.push({ start: campPositions[0], end: campPositions[i], maxlen: 0 });
                }
            } else if (!passageUpPosition) {
                // just passage down sector
                if (passageDownPosition) {
                    requiredPaths.push({ start: passageDownPosition, end: passageDownPosition, maxlen: 1, type: WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE });
                }
            } else if (!passageDownPosition) {
                // just passage up sector
                if (passageUpPosition) {
                    requiredPaths.push({ start: passageUpPosition, end: passageUpPosition, maxlen: 1, type: WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE });
                }
            } else {
                // passage up -> passage down
                requiredPaths.push({ start: passageUpPosition, end: passageDownPosition, maxlen: maxPathLenP2P, type: WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE });
            }
            return requiredPaths;
        },

        generateSectors: function (seed, levelVO, campPositions, requiredPaths) {
            var l = levelVO.level;
            var campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, l);
			var topLevel = WorldCreatorHelper.getHighestLevel(seed);
			var bottomLevel = WorldCreatorHelper.getBottomLevel(seed);

            var bagSize = WorldCreatorConstants.getBagBonus(levelVO.levelOrdinal);
            var bagSizePrevious = WorldCreatorConstants.getBagBonus(levelVO.levelOrdinal - 1);
            var bagSizeAvg = Math.floor((bagSize + bagSizePrevious) / 2);
            levelVO.centralAreaSize = Math.min(Math.max(Math.floor(bagSizeAvg / 6), WorldCreatorConstants.MIN_CENTRAL_AREA_SIZE), WorldCreatorConstants.MAX_CENTRAL_AREA_SIZE);
            levelVO.bagSize = bagSizeAvg;

            var isSmallLevel = !levelVO.isCampable && l !== bottomLevel && l < topLevel - 1;
            var numSectors = WorldCreatorConstants.getNumSectors(campOrdinal, isSmallLevel);
            var numSectorsCentral = WorldCreatorConstants.getNumSectorsCentral(campOrdinal, isSmallLevel);

            // create central structure
            this.generateCentralRectangle(levelVO, topLevel, bottomLevel);
            levelVO.centralRectSectors = levelVO.sectors.slice(0);
            
            // draw a line across the camp position so camp is never in a dead end
            if (campPositions.length > 0) {
                var campPos = campPositions[0];
                var connectingSector = WorldCreatorHelper.getClosestSector(levelVO.centralRectSectors, campPos);
                var overshoot = WorldCreatorRandom.randomInt(5555 + seed % 18 * 159 + (l+5)^2, 2, 5);
                this.generatePathBetween(seed, levelVO, connectingSector.position, campPos, -1, null, overshoot);
            }
            
            // create required paths
            this.generateRequiredPaths(seed, levelVO, requiredPaths);
            
            // create the rest of the sectors randomly
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
            
            // connect sectors that are close by direct distance by very far by path length
            this.generateSectorsFillGaps(levelVO);
            
            // WorldCreatorDebug.printLevel(this.world, levelVO);
        },
        
        generateCentralRectangle: function (levelVO, topLevel, bottomLevel) {
            var l = levelVO.level;
            var centerSize = 5;
            if (l < 8) centerSize = 3;
            if (l === bottomLevel) centerSize = 7;
            if (l === topLevel) centerSize = 3;
            this.generateSectorRectangle(levelVO, 0, new PositionVO(levelVO.level, centerSize, centerSize), PositionConstants.DIRECTION_WEST, centerSize * 2, centerSize * 2);
        },

        generateRequiredPaths: function (seed, levelVO, requiredPaths) {
            if (requiredPaths.length === 0) return;
            var path;
            var startPos;
            var endPos;
            for (var i = 0; i < requiredPaths.length; i++) {
                path = requiredPaths[i];
                startPos = path.start.clone();
                endPos = path.end.clone();
                // generate required path
                var overshoot = WorldCreatorRandom.randomInt(seed % 22 * 100 + levelVO.level * 10 + i * 66, 2, 8);
                var path = this.generatePathBetween(seed, levelVO, startPos, endPos, path.maxlen, path.type, overshoot);
                // ensure new path is connected to the rest of the level
                var pathToCenter = WorldCreatorRandom.findPath(this.world, startPos, levelVO.centralRectSectors[0].position, false, true);
                if (!pathToCenter) {
                    var pair = WorldCreatorHelper.getClosestPair(levelVO.centralRectSectors, path);
                    var pairDist = PositionConstants.getDistanceTo(pair[0].position, pair[1].position);
                    this.generatePathBetween(seed, levelVO, pair[0].position, pair[1].position, -1, path.type);
                }
            }
        },
        
        generatePathBetween: function (seed, levelVO, startPos, endPos, maxlen, pathType, overshoot) {
            overshoot = overshoot || 0;
            var l = levelVO.level;
            var dist = Math.ceil(PositionConstants.getDistanceTo(startPos, endPos));
            var result = [];
            
            var pathLength;
            var totalLength = dist;
            if (dist == 0) {
                result.push(this.createSector(levelVO, startPos, null, pathType));
            } else if (dist == 1) {
                result.push(this.createSector(levelVO, startPos, null, pathType));
                result.push(this.createSector(levelVO, endPos, null, pathType));
            } else {
                var allowDiagonals = WorldCreatorRandom.randomBool(50000 + (l + 5) * 55 + dist * 555);
                var currentPos = startPos;
                var pathResult;
                var i = 0;
                while (!currentPos.equals(endPos)) {
                    var possibleDirections = PositionConstants.getDirectionsFrom(currentPos, endPos, allowDiagonals);
                    var directionIndex = WorldCreatorRandom.randomInt(seed % 10200 + l * 555 + dist * 77 + i * 1001, 0, possibleDirections.length);
                    var direction = possibleDirections[directionIndex];
                    pathLength = PositionConstants.getDistanceInDirection(currentPos, endPos, direction) + 1;
                    pathResult = this.generateSectorPath(levelVO, currentPos, direction, pathLength, false, true, pathType);
                    result = result.concat(pathResult.path);
                    currentPos = PositionConstants.getPositionOnPath(currentPos, direction, pathLength - 1);
                    i++;
                    if (i > 100) break;
                }
            }
            
            if (maxlen > 0) {
                if (dist > maxlen) {
                    log.w("-- required path max len < distance");
                }
                if (totalLength > maxlen) {
                    log.w("-- required path max len < final len");
                }
            }
            return result;
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
                var result = this.generateSectorPath(levelVO, sideStartingPos, currentDirection, sideLength, i > 0 || j > 0);
                if (!result.completed) return false;
                sideStartingPos = PositionConstants.getPositionOnPath(sideStartingPos, currentDirection, sideLength);
                currentDirection = PositionConstants.getNextClockWise(currentDirection, false);
            }
        },

        generateSectorsFillGaps: function (levelVO) {
            var worldVO = this.world;
            var furthestPathDist = 0;
            var getFurthestPair = function () {
                var furthestPair = [null, null];
                furthestPathDist = 0;
                for (var i = 0; i < levelVO.sectors.length; i++) {
                    var sector1 = levelVO.sectors[i];
                    for (var j = i; j < levelVO.sectors.length; j++) {
                        var sector2 = levelVO.sectors[j];
                        var dist = PositionConstants.getDistanceTo(sector1.position, sector2.position);
                        if (dist > 1 && dist < 3) {
                            var pathDist = WorldCreatorRandom.findPath(worldVO, sector1.position, sector2.position, false, true).length;
                            if (pathDist > furthestPathDist) {
                                furthestPathDist = pathDist;
                                furthestPair = [sector1, sector2];
                            }
                        }
                    }
                }
                return furthestPair;
            }
            
            var currentPair = getFurthestPair();
            
            var i = 0;
            while (furthestPathDist > 15 && i < 10) {
                this.generatePathBetween(0, levelVO, currentPair[0].position, currentPair[1].position);
                currentPair = getFurthestPair();
                i++;
            }
        },

        stepsTillSupplies: {
            water: 0,
            food: 0,
        },

        generateSectorPath: function (levelVO, startPos, direction, len, continueStepsTillSupplies, forceComplete, criticalPathType) {
            if (len < 1) return { path: [], completed: false };;
            var result = [];
            var maxStepsTillSupplies = continueStepsTillSupplies ? levelVO.bagSize / 2 : Math.min(len, levelVO.bagSize / 2);

            if (!continueStepsTillSupplies) {
                this.stepsTillSupplies.water = Math.floor(
                    maxStepsTillSupplies / 2 +
                    WorldCreatorRandom.random(73999 + levelVO.level * 9 + levelVO.maxX * startPos.sectorY + startPos.sectorX * 5) * maxStepsTillSupplies / 2 +
                    1);
                this.stepsTillSupplies.food = Math.floor(
                    maxStepsTillSupplies / 2 +
                    WorldCreatorRandom.random(10764 + levelVO.level * 3 + +levelVO.maxY * startPos.sectorX + startPos.sectorY * 8) * maxStepsTillSupplies / 2 +
                    1);
            }

            var requiredResources = null;
            var requiresWater = true;
            var requiresFood = true;
            var sectorPos;
            for (var si = 0; si < len; si++) {
                sectorPos = PositionConstants.getPositionOnPath(startPos, direction, si);
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
                            return { path: result, completed: false };
                        } else {
                            continue;
                        }
                    }
                }

                if (sectorExists) {
                    result.push(levelVO.getSector(sectorPos.sectorX, sectorPos.sectorY));
                    continue;
                }

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

				result.push(this.createSector(levelVO, sectorPos, requiredResources, criticalPathType));
            }
            return { path: result, completed: true };
        },

		createSector: function (levelVO, sectorPos, requiredResources, criticalPathType) {
            var sectorVO = levelVO.getSector(sectorPos.sectorX, sectorPos.sectorY);
            if (!sectorVO) {
                this.totalSectors++;
    			sectorVO = new SectorVO(sectorPos, levelVO.isCampable, levelVO.notCampableReason, requiredResources);
    			levelVO.addSector(sectorVO);
                this.world.resetPaths();
            }
            if (criticalPathType) {
                sectorVO.addToCriticalPath(criticalPathType);
            }
            return sectorVO;
		},

        generatePassages: function (seed, levelVO, passageUpPositions, passageDownPositions, bottomLevel) {
            var l = levelVO.level;
            var isCampable = levelVO.isCampable;
            var campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, l);
            var unlockElevatorOrdinal = UpgradeConstants.getMinimumCampOrdinalForUpgrade("unlock_building_passage_elevator");
            var unlockHoleOrdinal = Math.max(
                UpgradeConstants.getMinimumCampOrdinalForUpgrade("unlock_building_passage_hole"),
                UpgradeConstants.getMinimumCampOrdinalForUpgrade("unlock_building_cementmill"),
            );

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
                passagePosition = passageDownPositions[i];
                if (passagePosition == null) continue;
                passageDownSectors[i] = levelVO.getSector(passagePosition.sectorX, passagePosition.sectorY);
                if (l === 13) {
                    passageDownSectors[i].passageDown = MovementConstants.PASSAGE_TYPE_STAIRWELL;
                } else if (campOrdinal >= WorldCreatorConstants.CAMP_ORDINAL_LIMIT) {
                    passageDownSectors[i].passageDown = MovementConstants.PASSAGE_TYPE_BLOCKED;
                } else if (l === 14) {
                    passageDownSectors[i].passageDown = MovementConstants.PASSAGE_TYPE_HOLE;
                } else if (isCampable && campOrdinal == unlockElevatorOrdinal) {
                    passageDownSectors[i].passageDown = MovementConstants.PASSAGE_TYPE_ELEVATOR;
                } else if (isCampable && campOrdinal == unlockHoleOrdinal) {
                    passageDownSectors[i].passageDown = MovementConstants.PASSAGE_TYPE_HOLE;
                } else {
                    var availablePassageTypes = [MovementConstants.PASSAGE_TYPE_STAIRWELL];
                    if (campOrdinal >= unlockElevatorOrdinal)
                        availablePassageTypes.push(MovementConstants.PASSAGE_TYPE_ELEVATOR);
                    if (campOrdinal >= unlockHoleOrdinal)
                        availablePassageTypes.push(MovementConstants.PASSAGE_TYPE_HOLE);
                    var passageTypeIndex = WorldCreatorRandom.randomInt(9 * seed + l * i * 7 + i + l * seed, 0, availablePassageTypes.length);
                    var passageType = availablePassageTypes[passageTypeIndex];
                    passageDownSectors[i].passageDown = passageType;
                }
                levelVO.addPassageDownSector(passageDownSectors[i]);
            }
        },
        
        generateZones: function (seed, levelVO) {
            var worldVO = this.world;
            var level = levelVO.level;
			var bottomLevel = WorldCreatorHelper.getBottomLevel(seed);
            var isCampableLevel = WorldCreatorHelper.isCampableLevel(seed, level);
            var isGoingDown = level <= 13 && level >= bottomLevel;
            var passageUp = levelVO.passageUpSector;
            var passageDown = levelVO.passageDownSector;
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
            
            setSectorZone(passage1, WorldCreatorConstants.ZONE_ENTRANCE, 2);
            
            if (isCampableLevel) {
                // camp:
                var camp = levelVO.campSectors[0];
                // path to camp ZONE_PASSAGE_TO_CAMP
                if (level != 13) {
                    setSectorZone(passage1, WorldCreatorConstants.ZONE_PASSAGE_TO_CAMP, 3);
                    setSectorZone(camp, WorldCreatorConstants.ZONE_PASSAGE_TO_CAMP, 3);
                    var pathToCamp = WorldCreatorRandom.findPath(worldVO, passage1.position, camp.position, false, true);
                    setPathZone(pathToCamp, WorldCreatorConstants.ZONE_PASSAGE_TO_CAMP, 2);
                }
                // path to passage2 ZONE_CAMP_TO_PASSAGE
                if (passage2) {
                    var pathToCamp = WorldCreatorRandom.findPath(worldVO, camp.position, passage2.position, false, true);
                    setPathZone(pathToCamp, WorldCreatorConstants.ZONE_CAMP_TO_PASSAGE, 1);
                }
                // divide up the level into vornoi regions
                var points = WorldCreatorHelper.getVornoiPoints(seed, worldVO, levelVO, passage1, camp);
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
                    if (point.zone != WorldCreatorConstants.ZONE_POI_TEMP) continue;
                    poipoints.push(point);
                    point.distanceToCamp = 9999;
                    for (var j = 0; j < point.sectors.length; j++) {
                        var sector = point.sectors[j];
                        var pathToCamp =  WorldCreatorRandom.findPath(worldVO, camp.position, sector.position, false, true);
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
                    var zone = poipointSectorsAssigned / poipointSectorsTotal < 0.5 ? WorldCreatorConstants.ZONE_POI_1 : WorldCreatorConstants.ZONE_POI_2;
                    for (var j = 0; j < point.sectors.length; j++) {
                        var sector = point.sectors[j];
                        setSectorZone(sector, zone);
                        poipointSectorsAssigned++;
                    }
                }
            } else {
                // no camp:
                // area around passage1 and path from passage to passage is ZONE_PASSAGE_TO_PASSAGE
                setSectorZone(passage1, WorldCreatorConstants.ZONE_PASSAGE_TO_PASSAGE, 6);
                if (passage2) {
                    var pathPassageToPassage = WorldCreatorRandom.findPath(worldVO, passage1.position, passage2.position, false, true);
                    setPathZone(pathPassageToPassage, WorldCreatorConstants.ZONE_PASSAGE_TO_PASSAGE, 2);
                }
            }
            
            // rest ZONE_EXTRA
            for (var i = 0; i < levelVO.sectors.length; i++) {
                var sector = levelVO.sectors[i];
                if (!sector.zone) {
                    if (isCampableLevel) {
                        sector.zone = WorldCreatorConstants.ZONE_EXTRA_CAMPABLE;
                    } else {
                        sector.zone = WorldCreatorConstants.ZONE_EXTRA_UNCAMPABLE;
                    }
                }
            }
        },

        addMovementBlocker: function(levelVO, sectorVO, neighbourVO, blockerType, options, sectorcb, cb) {
            var direction = PositionConstants.getDirectionFrom(sectorVO.position, neighbourVO.position);
            var neighbourDirection = PositionConstants.getDirectionFrom(neighbourVO.position, sectorVO.position);

            // check for existing movement blocker
            if (sectorVO.movementBlockers[direction] || neighbourVO.movementBlockers[neighbourDirection]) {
                var existing = sectorVO.movementBlockers[direction] || neighbourVO.movementBlockers[neighbourDirection];
                log.w(this, "skipping movement blocker (" + blockerType + "): sector already has movement blocker (" + existing + ")");
                return;
            }
            
            // check for too close to camp or in ZONE_PASSAGE_TO_CAMP
            if (sectorVO.camp || neighbourVO.camp || (levelVO.isCampable && sectorVO.zone == WorldCreatorConstants.ZONE_PASSAGE_TO_CAMP)) {
                log.w(this, "skipping movement blocker (" + blockerType + "): too close to camp");
                return;
            }

            // check for critical paths
            var allowedForGangs = [ WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_2, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE ];
            for (var i = 0; i < sectorVO.criticalPaths.length; i++) {
                var pathType = sectorVO.criticalPaths[i];
                if (options.allowedCriticalPaths && options.allowedCriticalPaths.indexOf(pathType) >= 0) continue;
                if (blockerType === MovementConstants.BLOCKER_TYPE_GANG && allowedForGangs.indexOf(pathType) >= 0) continue;
                for (var j = 0; j < neighbourVO.criticalPaths.length; j++) {
                    if (pathType === neighbourVO.criticalPaths[j]) {
                        log.w("(level " + levelVO.level + ") Skipping blocker on critical path: " + pathType + " (type: " + blockerType + ")");
                        return;
                    }
                }
            }
                    
            // add blocker
            sectorVO.addBlocker(direction, blockerType);
            neighbourVO.addBlocker(neighbourDirection, blockerType);

            // add blockers to adjacent paths too (if present) so player can't just walk around the blocker
            if (options.addDiagonals) {
                var diagonalsOptions = Object.assign({}, options);
                diagonalsOptions.addDiagonals = false;
                var nextNeighbours = levelVO.getNextNeighbours(sectorVO, direction);
                for (var j = 0; j < nextNeighbours.length; j++) {
                    this.addMovementBlocker(levelVO, sectorVO, nextNeighbours[j], blockerType, diagonalsOptions, sectorcb);
                }
                nextNeighbours = levelVO.getNextNeighbours(neighbourVO, neighbourDirection);
                for (var j = 0; j < nextNeighbours.length; j++) {
                    this.addMovementBlocker(levelVO, neighbourVO, nextNeighbours[j], blockerType, diagonalsOptions, sectorcb);
                }
            }
            
            this.world.resetPaths();

            if (sectorcb) {
                sectorcb(sectorVO, direction);
                sectorcb(neighbourVO, neighbourDirection);
            }
            
            if (cb) {
                cb();
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
                    var min = Math.round(path.length / 2);
                    var max = Math.max(min, path.length - 2);
                    var finalSeed = Math.abs(seed + 6700 - (i+1) * 555);
                    index = WorldCreatorRandom.randomInt(finalSeed, min, max);
                    var sectorVO = levelVO.getSector(path[index].sectorX, path[index].sectorY);
                    var neighbourVO = levelVO.getSector(path[index + 1].sectorX, path[index + 1].sectorY);
                    addBlocker(finalSeed, sectorVO, neighbourVO, true, allowedCriticalPaths);
                }
            };
            
            // critical paths: between passages on certain levels
            var numBetweenPassages = 0;
            if (l === 14) numBetweenPassages = 5;
            if (!levelVO.isCampable && campOrdinal == 7) numBetweenPassages = 5;
            if (numBetweenPassages > 0) {
                var allowedCriticalPaths = [ WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE ];
                for (var i = 0; i < levelVO.passageSectors.length; i++) {
                    for (var j = i + 1; j < levelVO.passageSectors.length; j++) {
                        var rand = Math.round(2222 + seed + (i+21) * 41 + (j + 2) * 33);
                        log.i("- block passages ", this);
                        addBlockersBetween(rand, levelVO, levelVO.passageSectors[i].position, levelVO.passageSectors[j].position, numBetweenPassages, allowedCriticalPaths);
                    }
                }
            }
            
            // campable levels: zone borders
            if (levelVO.isCampable) {
                var freq = 0.25;
                // - from ZONE_PASSAGE_TO_CAMP to other (to lead player towards camp)
                var allowedCriticalPaths = [ WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_2, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE ];
                var borderSectors1 = WorldCreatorHelper.getBorderSectorsForZone(levelVO, WorldCreatorConstants.ZONE_PASSAGE_TO_CAMP, true);
                for (var i = 0; i < borderSectors1.length; i++) {
                    var pair = borderSectors1[i];
                    var distanceToCamp = Math.min(
                        WorldCreatorHelper.getDistanceToCamp(this.world, levelVO, pair.sector),
                        WorldCreatorHelper.getDistanceToCamp(this.world, levelVO, pair.neighbour)
                    );
                    if (distanceToCamp > 3) {
                        var s =  seed % 26 * 3331 + 100 + (i + 5) * 654;
                        if (WorldCreatorRandom.random(s) < freq) {
                            addBlocker(s * 2, pair.sector, pair.neighbour, true, allowedCriticalPaths);
                        }
                    }
                }
            }
            
            // campable levels: block all paths to one POI
            // TODO check that that POI is in a different direction than first passage of the level, otherwise the movement blockers will just get blocked because blockers on zone ZONE_PASSAGE_TO_CAMP are not allowed
            if (levelVO.isCampable && WorldCreatorRandom.randomBool(seed % 888 + l * 777, 0.75)) {
                var localeSectors = levelVO.localeSectors;
                var rand = seed % 333 + 1000 + l * 652;
                var i = WorldCreatorRandom.randomInt(rand, 0, localeSectors.length);
                var poiSector = localeSectors[i];
                var campSector = levelVO.campSectors[0];
                log.i("- block locale at " + poiSector.position, this);
                var allowedCriticalPaths = [ WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_2, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE ];
                addBlockersBetween(rand, levelVO, campSector.position, poiSector.position, 3, allowedCriticalPaths);
            }

            // random ones
            var numRandom = 1;
            if (l === 14) numRandom = 2;
            if (l === topLevel - 1) numRandom = 4;
            if (l === topLevel) numRandom = 8;
            if (numRandom > 0) {
                var randomSeed = seed % 8 * 1751 + 1000 + (l + 5) * 291;
                var options = { excludingFeature: "camp" };
                var sectors = WorldCreatorRandom.randomSectors(randomSeed, worldVO, levelVO, numRandom, numRandom + 1, options);
                for (var i = 0; i < sectors.length; i++) {
                    var addDiagonals = (l + i + 9) % 3 !== 0;
                    addBlocker(randomSeed - (i + 1) * 321, sectors[i], null, addDiagonals);
                }
            }
        },
        
        generateHazardAreas: function (seed, levelVO, itemsHelper) {
            var topLevel = WorldCreatorHelper.getHighestLevel(seed);
            var l = levelVO.level == 0 ? 1342 : levelVO.level;
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
                var step = WorldCreatorConstants.getCampStep(sectorVO.zone);
                var maxHazardCold = Math.min(100, itemsHelper.getMaxHazardColdForLevel(campOrdinal, step));
                var minHazardCold = itemsHelper.getMinHazardColdForLevel(campOrdinal, step);
                minHazardCold = Math.min(minHazardCold, maxHazardCold - 1);
                minHazardCold = Math.max(minHazardCold, 1);
                if (maxHazardCold < 5) continue;
                
                // - determine eligibility
                var isEarlyZone = sectorVO.zone == WorldCreatorConstants.ZONE_PASSAGE_TO_CAMP || sectorVO.zone == WorldCreatorConstants.ZONE_PASSAGE_TO_PASSAGE;
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
                var step = WorldCreatorConstants.getCampStep(zone);
                if (sectorVO.hazards.cold) return 0;
                if (isRadiation) {
                    return Math.min(100, itemsHelper.getMaxHazardRadiationForLevel(campOrdinal, step));
                } else {
                    return Math.min(100, itemsHelper.getMaxHazardPoisonForLevel(campOrdinal, step));
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
                var options = { excludingFeature: "camp", excludedZones: [ WorldCreatorConstants.ZONE_PASSAGE_TO_CAMP ] };
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
                        if (sectorVO.zone != WorldCreatorConstants.ZONE_EXTRA_CAMPABLE) continue;
                        setSectorHazard(sectorVO, 1, isRadiation);
                        
                    }
                }
                // - clusters on border sector (to guide player to camp)
                var freq = 0.75;
                var borderSectors = WorldCreatorHelper.getBorderSectorsForZone(levelVO, WorldCreatorConstants.ZONE_PASSAGE_TO_CAMP, true);
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
                for (var i = 0; i < levelVO.sectors.length; i++) {
                    var sectorVO = levelVO.sectors[i];
                    var maxHazardValue = getMaxValue(sectorVO, isRadiation, sectorVO.zone);
                    var minHazardValue = Math.min(10, maxHazardValue);
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
            var step = WorldCreatorConstants.getCampStep(sectorVO.zone);
            
			var enemyDifficulty = this.enemyCreator.getDifficulty(campOrdinal, step);
            if (sectorVO.isOnEarlyCriticalPath()) enemyDifficulty -= 2;
            enemyDifficulty = Math.max(enemyDifficulty, 1);
            sectorVO.enemyDifficulty = enemyDifficulty;

			var enemies = sectorVO.possibleEnemies;
            
            // collect all valid enemies for this sector (candidates)
            var candidates = [];
            var enemyCreator = this.enemyCreator;
            var enemy;
            var addEnemyCandidates = function (enemyType) {
                var typeEnemies = enemyCreator.getEnemies(enemyType, enemyDifficulty, false);
    			for (var e in typeEnemies) {
    				enemy = typeEnemies[e];
    				candidates.push(enemy);
    			}
            };

            addEnemyCandidates(EnemyConstants.enemyTypes.global);
            if (!sectorVO.hazards.hasHazards()) addEnemyCandidates(EnemyConstants.enemyTypes.nohazard);
            if (sectorVO.hazards.cold > 0) addEnemyCandidates(EnemyConstants.enemyTypes.cold);
            if (sectorVO.hazards.poison > 0) addEnemyCandidates(EnemyConstants.enemyTypes.toxic);
            if (sectorVO.hazards.radiation > 0) addEnemyCandidates(EnemyConstants.enemyTypes.radiation);
            if (sectorVO.sunlit) addEnemyCandidates(EnemyConstants.enemyTypes.sunlit);
            if (!sectorVO.sunlit) addEnemyCandidates(EnemyConstants.enemyTypes.dark);
            if (sectorVO.buildingDensity > 5) addEnemyCandidates(EnemyConstants.enemyTypes.dense);
            if (sectorVO.buildingDensity <= 5) addEnemyCandidates(EnemyConstants.enemyTypes.sparse);
            
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
            if (hasWater) addEnemyCandidates(EnemyConstants.enemyTypes.water);
            
            // select enemies from candidates by rarity
            candidates = candidates.sort(function (a,b) {
                return a.rarity - b.rarity;
            });
            for (var i = 0; i < candidates.length; i++) {
                enemy = candidates[i];
				var threshold = (enemy.rarity + 5) / 110;
				var r = WorldCreatorRandom.random(9999 + l * seed + x * l * 80 + y * 10 + i * x *22 - y * i * x * 15);
                if (i == 0 || r > threshold) {
                    enemies.push(enemy);
                }
            }

			if (enemies.length < 1) {
                log.w("No valid enemies defined for sector " + sectorVO.position + " difficulty " + enemyDifficulty);
            }

			return enemies;
		},
        
        canHaveGang: function (sectorVO) {
            if (!sectorVO) return false;
            if (sectorVO.camp) return false;
            if (sectorVO.zone == WorldCreatorConstants.ZONE_PASSAGE_TO_CAMP) return false;
            if (sectorVO.zone == WorldCreatorConstants.ZONE_PASSAGE_TO_PASSAGE) return false;
            var position = sectorVO.position;
            if (position.level == 13) {
                var firstCampPosition = new PositionVO(position.level, WorldCreatorConstants.FIRST_CAMP_X , WorldCreatorConstants.FIRST_CAMP_Y)
                var path = WorldCreatorRandom.findPath(this.world, position, firstCampPosition, false, true);
                if (path.length < 4) return false;
            }
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
            sectorFeatures.criticalPaths = sectorVO.criticalPaths || [];
            sectorFeatures.zone = sectorVO.zone;
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
