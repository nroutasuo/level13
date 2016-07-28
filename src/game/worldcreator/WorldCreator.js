// Stores world definitions and returns world-related constants given a seed. The seed should be a positive int.
define([
	'ash',
	'game/constants/GameConstants',
    'game/worldcreator/WorldCreatorHelper',
    'game/worldcreator/WorldCreatorRandom',
    'game/worldcreator/WorldCreatorDebug',
	'game/vos/WorldVO',
	'game/vos/LevelVO',
	'game/vos/SectorVO',
	'game/vos/ResourcesVO',
	'game/vos/LocaleVO',
	'game/vos/PositionVO',
	'game/constants/WorldCreatorConstants',
	'game/constants/PositionConstants',
	'game/constants/MovementConstants',
	'game/constants/EnemyConstants',
	'game/constants/UpgradeConstants',
	'game/constants/LocaleConstants',
	'game/constants/ItemConstants'
], function (
    Ash, GameConstants,
    WorldCreatorHelper, WorldCreatorRandom, WorldCreatorDebug,
    WorldVO, LevelVO, SectorVO, ResourcesVO, LocaleVO, PositionVO,
    WorldCreatorConstants, PositionConstants, MovementConstants, EnemyConstants, UpgradeConstants, LocaleConstants, ItemConstants
) {

    var WorldCreator = {
        
		world: null,
		
		prepareWorld: function (seed) {
			var topLevel = WorldCreatorHelper.getHighestLevel(seed);
			var bottomLevel = WorldCreatorHelper.getBottomLevel(seed);
            this.world = new WorldVO(seed, topLevel, bottomLevel);
			
			// base: passages, campable sectors and levels, sunlight
			this.prepareWorldStructure(seed, topLevel, bottomLevel);
			// building density, state of repair
			this.prepareWorldTexture(seed, topLevel, bottomLevel);
			// resources (and workshops)
			this.prepareWorldResources(seed, topLevel, bottomLevel);
			// locales
			this.prepareWorldLocales(seed, topLevel, bottomLevel);
			// enemies
			this.prepareWorldEnemies(seed, topLevel, bottomLevel);
		},
		
		// campable sectors and levels, movement blockers, passages, sunlight
		prepareWorldStructure: function (seed, topLevel, bottomLevel) {
			var passageDownSectors = [];
			var passageDownPositions = [];
            this.totalSectors = 0;
			for (var l = topLevel; l >= bottomLevel; l--) {
                var isCampableLevel = WorldCreatorHelper.isCampableLevel(seed, l);
                var notCampableReason = isCampableLevel ? null : WorldCreatorHelper.getNotCampableReason(seed, l);
				var levelOrdinal = WorldCreatorHelper.getLevelOrdinal(seed, l);
                var levelVO = new LevelVO(l, levelOrdinal, isCampableLevel, notCampableReason);
				this.world.addLevel(levelVO);

                this.generateSectors(seed, levelVO, passageDownPositions);
					
				// camp: 1-5 spots for every campable level
				if (l === 13) {
					levelVO.getSector(WorldCreatorConstants.FIRST_CAMP_X, WorldCreatorConstants.FIRST_CAMP_Y).camp = true;
				} else {
					var numCamps = isCampableLevel ? WorldCreatorRandom.randomInt(seed / 3 * l, 1, 6) : 0;
					for (var i = 0; i < numCamps; i++) {
						var campPosition = WorldCreatorRandom.randomSector(seed * l * 534 * (i + 7), levelVO, true).position;
						levelVO.getSector(campPosition.sectorX, campPosition.sectorY).camp = true;
					}
				}
				
				// passages: up according to previous level
                var previousLevelVO = this.world.levels[l + 1];
                var passagePosition;
				for (var i = 0; i < passageDownSectors.length; i++) {
                    passagePosition = passageDownSectors[i].position;
					levelVO.getSector(passagePosition.sectorX, passagePosition.sectorY).passageUp =
                        previousLevelVO.getSector(passagePosition.sectorX, passagePosition.sectorY).passageDown;
				}
				
				// passages: down 1-2 per level
				if (l > bottomLevel) {
					var numPassages = WorldCreatorRandom.random(seed * l / 7 + l + l * l + seed) > 0.65 ? 2 : 1;
					if (l === 14) numPassages = 1;
					if (l === 13) numPassages = 1;
					passageDownSectors = WorldCreatorRandom.randomSectors(seed * l * 654 * (i + 2), levelVO, numPassages, numPassages + 1, true, "camp");
					passageDownPositions = [];
					for (var i = 0; i < passageDownSectors.length; i++) {
						passageDownPositions.push(passageDownSectors[i].position);
						if (l === 13) {
							passageDownSectors[i].passageDown = 3;
						} else if (l === 14) {
							passageDownSectors[i].passageDown = 1;
						} else {
							var availablePassageTypes = [MovementConstants.PASSAGE_TYPE_STAIRWELL];
							if (l < 6 || l > 13) availablePassageTypes.push(MovementConstants.PASSAGE_TYPE_HOLE);
							if (l > 15) availablePassageTypes.push(MovementConstants.PASSAGE_TYPE_ELEVATOR);
							var passageTypeIndex = WorldCreatorRandom.randomInt(9 * seed + l * i * 7 + i + l * seed, 0, availablePassageTypes.length);
							var passageType = availablePassageTypes[passageTypeIndex];
							passageDownSectors[i].passageDown = passageType;
						}
					}
				}
				
				// movement blockers: a few per level
				var maxBlockers = Math.round(WorldCreatorConstants.SECTORS_PER_LEVEL_MIN / (28 - levelOrdinal)) + levelOrdinal + 5;
				var numBlockers = WorldCreatorRandom.randomInt(88 + seed * 56 * l + seed % 7, levelOrdinal + 1, maxBlockers);
				var blockerSectors = WorldCreatorRandom.randomSectors(seed * l * l + 1 * 22 * i, levelVO, numBlockers, numBlockers + 1, true, "camp");
				for (var i = 0; i < blockerSectors.length; i++) {
					var blockerType = WorldCreatorRandom.randomInt(seed * 5831 / l + seed % 2 + (i + 78) * 4, 1, 4);
					if (l < 14 && blockerType === MovementConstants.BLOCKER_TYPE_WASTE) blockerType = MovementConstants.BLOCKER_TYPE_GAP;
					if (levelOrdinal < 7 && blockerType === MovementConstants.BLOCKER_TYPE_GAP) blockerType = MovementConstants.BLOCKER_TYPE_GANG;
                    
					var blockedSector = blockerSectors[i];
					var blockedNeighbour = WorldCreatorRandom.getRandomSectorNeighbour(seed * 101 + (i + 70) * (l + 900), levelVO, blockedSector, true);
					var direction = PositionConstants.getDirectionFrom(blockedSector.position, blockedNeighbour.position);
					
                    if (levelOrdinal === 1 && (Math.abs(blockedSector.position.sectorX) < 2 || Math.abs(blockedSector.position.sectorY < 2))) {
                        console.log("skip blocker at " + blockedSector.position);
                        continue;
                    }
					blockedSector.addBlocker(direction, blockerType);
					blockedNeighbour.addBlocker(PositionConstants.getOppositeDirection(direction), blockerType);
				}
			}
			
			console.log((GameConstants.isDebugOutputEnabled ? "START " + GameConstants.STARTTimeNow() + "\t " : "")
				+ "World structure ready."
				+ (GameConstants.isDebugOutputEnabled ? " (ground: " + bottomLevel + ", surface: " + topLevel + ", total sectors: " + this.totalSectors + ")" : ""));
            // WorldCreatorDebug.printWorld(this.world, [ "camp" ]);
		},
		
		// sector type, building density, state of repair, sunlight
		prepareWorldTexture: function (seed, topLevel, bottomLevel) {
			for (var i = topLevel; i >= bottomLevel; i--) {
				var l = i === 0 ? 1342 : i;
                var levelVO = this.world.getLevel(i);
                var previousLevelVO = this.world.getLevel(l + 1);
				
				var levelDensity = Math.min(Math.max(2, i % 2 * 4 + Math.random(seed * 7 * l / 3 + 62) * 7), 8);
				if (Math.abs(i - 15) < 2) levelDensity = 10;
				var levelRepair = Math.max(2, (i - 15) * 2);
				if (i <= 5) levelRepair = levelRepair - 2;
				
				for (var y = levelVO.minY; y <= levelVO.maxY; y++) {
					for (var x = levelVO.minX; x <= levelVO.maxX; x++) {
                        var sectorVO = levelVO.getSector(x, y);
                        var ceilingSector = previousLevelVO ? previousLevelVO.getSector(x, y) : null;
                        if (!sectorVO) continue;
                        
                        var distanceToCenter = PositionConstants.getDistanceTo(sectorVO.position, new PositionVO(l, 0, 0));
                        var edgeSector = (y === levelVO.minY || y === levelVO.maxY || x === levelVO.minX || x === levelVO.maxX) && Math.abs(x) > 1 && Math.abs(y) > 1;
                        var ceilingStateOfRepair = l === topLevel ? 0 : !ceilingSector ? sectorVO.stateOfRepair : ceilingSector.stateOfRepair;
                        var ceilingSunlit = l === topLevel || !ceilingSector ? true : ceilingSector.sunlit;
                    
                        // state of repair
                        var explosionStrength = i - topLevel >= -3 && distanceToCenter <= 10 ? distanceToCenter * 2 : 0;
                        var stateOfRepair = Math.min(10, Math.max(0, Math.ceil(levelRepair + (WorldCreatorRandom.random(seed * l * (x + 100) * (y + 100)) * 5)) - explosionStrength));
                        if (sectorVO.camp) stateOfRepair = Math.max(3, stateOfRepair);
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
                        
                        // sunlight
                        sectorVO.sunlit = l === topLevel || (ceilingSunlit && ceilingStateOfRepair < 3) || (edgeSector && stateOfRepair < 5);
                        if (!sectorVO.sunlit && (buildingDensity < 5 || stateOfRepair < 5)) {
                            var neighbours = levelVO.getNeighbours(x, y);
                            for (var neighbourDirection in neighbours) {
                                var sunlitRandVal = WorldCreatorRandom.random(seed / 3 + l + x + y * l * l + x * x + y * 7 - ceilingStateOfRepair);
                                if (neighbours[neighbourDirection].sunlit && sunlitRandVal > 0.15) {
                                    sectorVO.sunlit = true;
                                }
                            }
                        }
                    }
				}
			}
			
			console.log((GameConstants.isDebugOutputEnabled ? "START " + GameConstants.STARTTimeNow() + "\t " : "")
				+ "World texture ready.");
			// WorldCreatorDebug.printWorld(this.world, [ "sectorType" ]);
		},
		
		// resources
		prepareWorldResources: function (seed, topLevel, bottomLevel) {
			for (var l = topLevel; l >= bottomLevel; l--) {
                var levelVO = this.world.getLevel(l);
                var fuelSectors = [];
                var springSectors = [];
                
                if (WorldCreatorHelper.isDarkLevel(seed, l) && (l % 2 === 0))
                    fuelSectors = WorldCreatorRandom.randomSectors(seed * l * 2 / 7 * l, levelVO, 1, 2, true, "camp");
                
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
                springSectors = WorldCreatorRandom.randomSectors(seed * (l + 1000) / 11, levelVO, minSprings, maxSprings, true);
				
				for (var y = levelVO.minY; y <= levelVO.maxY; y++) {
					for (var x = levelVO.minX; x <= levelVO.maxX; x++) {
                        var sectorVO = levelVO.getSector(x, y);
                        if (!sectorVO) continue;
                        
                        sectorVO.resourcesScavengable = WorldCreatorHelper.getSectorScavengableResources(seed, topLevel, bottomLevel, sectorVO);
                        sectorVO.resourcesCollectable = WorldCreatorHelper.getSectorCollectableResources(seed, topLevel, bottomLevel, sectorVO);
                        
                        var fuel = 0;
                        if (fuelSectors.indexOf(sectorVO) >= 0) fuel = 5;
                        sectorVO.resourcesScavengable.fuel = fuel;
                        
                        sectorVO.workshopResource = sectorVO.resourcesScavengable.fuel > 0 ? resourceNames.fuel : null;
                        sectorVO.workshop = sectorVO.workshopResource !== null;
                        
                        sectorVO.hasSpring = springSectors.indexOf(sectorVO) >= 0;
                        if (sectorVO.hasSpring) sectorVO.resourcesCollectable.water = Math.max(3, sectorVO.resourcesCollectable.water);
                    }
                }
			}
			
			console.log((GameConstants.isDebugOutputEnabled ? "START " + GameConstants.STARTTimeNow() + "\t " : "")
				+ "World resources ready.");
            // WorldCreatorDebug.printWorld(this.world, [ "resourcesScavengable.herbs" ]);
            WorldCreatorDebug.printWorld(this.world, [ "hasSpring" ]);
		},
		
		// locales
		prepareWorldLocales: function (seed, topLevel, bottomLevel) {
			var getLocaleType = function (sectorType, level, levelOrdinal, localeRandom) {
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
                        else if (localeRandom > 0.2) localeType = localeTypes.hermit;
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
                        else if (localeRandom > 0.3) localeType = localeTypes.hermit;
                        else if (localeRandom > 0.2) localeType = localeTypes.caravan;
                        else localeType = localeTypes.sewer;
                        break;
						
                    case WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL:
                        if (localeRandom > 6) localeType = localeTypes.market;
                        else if (localeRandom > 0.4) localeType = localeTypes.warehouse;
                        else if (localeRandom > 0.3) localeType = localeTypes.transport;
                        else if (localeRandom > 0.25) localeType = localeTypes.hut;
                        else if (localeRandom > 0.2) localeType = localeTypes.hermit;
                        else if (localeRandom > 0.15) localeType = localeTypes.caravan;
                        else localeType = localeTypes.house;
                        break;
						
                    case WorldCreatorConstants.SECTOR_TYPE_SLUM:
                        if (localeRandom > 0.4) localeType = localeTypes.house;
                        else if (localeRandom > 0.35) localeType = localeTypes.camp;
                        else if (localeRandom > 0.3) localeType = localeTypes.hut;
                        else if (localeRandom > 0.25) localeType = localeTypes.hermit;
                        else localeType = localeTypes.sewer;
                        break;
						
					default:
						console.log("WARN: Unknown sector type " + sectorType);
					}
				}
				return localeType;
			};
			for (var l = topLevel; l >= bottomLevel; l--) {
                var levelVO = this.world.getLevel(l);
				var levelOrdinal = WorldCreatorHelper.getLevelOrdinal(seed, l);
				var campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, l);
				var countRand = WorldCreatorRandom.random((seed % 84) * l * l * l);
                
				// min number of (easy) locales ensures that player can get all upgrades intended for that level
				var minLocales = Math.max(1, UpgradeConstants.getPiecesByCampOrdinal(campOrdinal));
				var levelLocaleCount = Math.max(minLocales, Math.round(countRand * 25));
				var firstLocaleSector = l === 13 ? 5 : 1;
				for (var i = 0; i < levelLocaleCount; i++) {
					var localePos = WorldCreatorRandom.randomSectors(seed + i * l + i * 7394 * seed + i * i * l + i, levelVO, 1, 2, true, "camp");
                    var sectorVO = localePos[0];
					var localeType = getLocaleType(sectorVO.sectorType, l, levelOrdinal, WorldCreatorRandom.random(seed + seed + l * i * seed + localePos));
					var isEasy = i <= minLocales;
					var locale = new LocaleVO(localeType, isEasy);
					sectorVO.locales.push(locale);
				}
			}
			console.log((GameConstants.isDebugOutputEnabled ? "START " + GameConstants.STARTTimeNow() + "\t " : "")
				+ "World locales ready.");
			// WorldCreatorDebug.printWorld(this.world, [ "locales.length" ]);
		},
		
		// enemies
		prepareWorldEnemies: function (seed, topLevel, bottomLevel) {
			for (var l = topLevel; l >= bottomLevel; l--) {
                var levelVO = this.world.getLevel(l);
				for (var y = levelVO.minY; y <= levelVO.maxY; y++) {
					for (var x = levelVO.minX; x <= levelVO.maxX; x++) {
                        var sectorVO = levelVO.getSector(x, y);
                        if (!sectorVO) continue;
                        sectorVO.enemies = [];
                        sectorVO.localeEnemies = {};
                        
                        // regular enemies & enemy definitions
                        var hasSectorEnemies = !sectorVO.camp && WorldCreatorRandom.random(l * x * seed + y * seed + 4848) > 0.2;
                        var hasLocaleEnemies = sectorVO.hasBlockerOfType(MovementConstants.BLOCKER_TYPE_GANG) || sectorVO.workshop;
                        if (hasSectorEnemies || hasLocaleEnemies) {
							sectorVO.enemies = this.generateEnemies(seed, topLevel, bottomLevel, sectorVO);
						}
                        
                        // workshop and locale enemies (counts)
                        if (sectorVO.workshop) {
                            sectorVO.localeEnemies[LocaleConstants.LOCALE_ID_WORKSHOP] = 3;
                        }
                        
						for (var i in PositionConstants.getLevelDirections()) {
							var direction = PositionConstants.getLevelDirections()[i];
							if (sectorVO.getBlockerByDirection(direction) === MovementConstants.BLOCKER_TYPE_GANG) {
								sectorVO.localeEnemies[LocaleConstants.getPassageLocaleId(direction)] = 3;
							}
						}
                    }
				}
			}
			
			console.log((GameConstants.isDebugOutputEnabled ? "START " + GameConstants.STARTTimeNow() + "\t " : "") + "World enemies ready.");
			// WorldCreatorDebug.printWorld(this.world, [ "enemies.length" ]);
		},
        
        generateSectors: function (seed, levelVO, passagesUpPositions) {
            var l = levelVO.level;
            
            // TODO calculate excursion length better with new exploration vars
            // TODO make world structure not directly dependent on item constants so if they are changed, world doesn't change
            var equipmentSize = 4*3;
            var excursionLength = ItemConstants.getBag(levelVO.levelOrdinal).bonus - equipmentSize;
			var lowerLevelOrdinal = WorldCreatorHelper.getLevelOrdinal(seed, l - 1);
			var lowerLowerLevelOrdinal = WorldCreatorHelper.getLevelOrdinal(seed, l - 2);
			var lowerLevelExcursionLength = ItemConstants.getBag(lowerLevelOrdinal).bonus;
			var lowerLowerLevelExcursionLength = ItemConstants.getBag(lowerLowerLevelOrdinal).bonus;
            levelVO.centralAreaSize = Math.floor(Math.min((excursionLength + lowerLevelExcursionLength + lowerLowerLevelExcursionLength)  / 3 / 5 * 3, WorldCreatorConstants.MAX_CENTRAL_AREA_SIZE));
            
            var pathDirectionNums = [ 1, 1, 1, 1, 2, 2, 2, 3, 3, 4 ];
            
            var sectorsAll = [];
            var sectorsCentral = [];
            
            var sectorsCentralMin = Math.floor(excursionLength * WorldCreatorConstants.EXCURSIONS_PER_LEVEL_MIN);
            var sectorsTotalMin = Math.floor(Math.max(sectorsCentralMin, WorldCreatorConstants.SECTORS_PER_LEVEL_MIN));
            var sectorsTotalMax = WorldCreatorConstants.SECTORS_PER_LEVEL_MAX;
            var pathStartingPos;
            var pathLength;
            var pathDirection;
			var includeDiagonals;
			
			var existingPointsToConnect = [];
			existingPointsToConnect = existingPointsToConnect.concat(passagesUpPositions);
			if (l === 13) existingPointsToConnect.push(new PositionVO(13, 0, 0));
            
            var pathLengthMin = 3;
            var pathLengthMax = 20;
            
            // connect existing passages (up / down) and other predefined points
            if (existingPointsToConnect.length === 1) {
                pathStartingPos = existingPointsToConnect[0].clone();
				includeDiagonals = WorldCreatorRandom.random(seed + (l + 99) * 828) < WorldCreatorConstants.DIAGONAL_PATH_PROBABILITY;
                pathDirection = WorldCreatorRandom.randomDirections(seed * levelVO.levelOrdinal + 284, 1, includeDiagonals)[0];
                pathLength = WorldCreatorRandom.randomInt(seed * 3 * 53 * (l + 1) + l + 55, pathLengthMin, pathLengthMax);
                this.generateSectorPath(levelVO, pathStartingPos, pathDirection, pathLength, sectorsAll, sectorsCentral);
            } else if (existingPointsToConnect.length > 1) {
                for (var pi = 0; pi < existingPointsToConnect.length - 1; pi++) {
                    pathStartingPos = existingPointsToConnect[pi].clone();
                    pathLength = Math.abs(pathStartingPos.sectorX - existingPointsToConnect[pi + 1].sectorX) + 1;
                    pathDirection = PositionConstants.getXDirectionFrom(pathStartingPos, existingPointsToConnect[pi + 1]);
                    this.generateSectorPath(levelVO, pathStartingPos, pathDirection, pathLength, sectorsAll, sectorsCentral);
                    
                    var wayPoint = PositionConstants.getPositionOnPath(pathStartingPos, pathDirection, pathLength - 1);
                    pathLength = Math.abs(pathStartingPos.sectorY - existingPointsToConnect[pi + 1].sectorY) + WorldCreatorRandom.randomInt(seed * l / 35 * (pi + 1), 1, pathLengthMax);
                    pathDirection = PositionConstants.getYDirectionFrom(pathStartingPos, existingPointsToConnect[pi + 1]);
                    this.generateSectorPath(levelVO, wayPoint, pathDirection, pathLength, sectorsAll, sectorsCentral);
                }
            }
            
            // fill in the rest by creating random paths
            var attempts = 0;
            var maxAttempts = 1000;
            while ((sectorsCentral.length < sectorsCentralMin || sectorsAll.length < sectorsTotalMin) && attempts < maxAttempts && sectorsAll.length < sectorsTotalMax) {
                attempts++;
                var pathRandomSeed = sectorsAll.length * 4 + l * (sectorsCentral.length + 5) + attempts * 5;
                var isStartingPath = l === 13 && (!levelVO.hasSector(0, 0) || !levelVO.hasSector(WorldCreatorConstants.FIRST_CAMP_X, WorldCreatorConstants.FIRST_CAMP_Y));
                if (isStartingPath) {
                    pathStartingPos = new PositionVO(l, 0, 0);
                } else if (sectorsCentral.length === 0) {
                    pathStartingPos = WorldCreatorRandom.randomSectorPosition(seed * 66 / (l + 99) + pathRandomSeed * 7 + 23123, l, Math.ceil(levelVO.centralAreaSize / 4));
                } else {
                    pathStartingPos = sectorsCentral[Math.floor(WorldCreatorRandom.random(seed * 938 * (l + 60) / pathRandomSeed + 2342 * l) * sectorsCentral.length)].clone();
                }
                
				includeDiagonals = WorldCreatorRandom.random(seed + (l + 70) * pathRandomSeed) < WorldCreatorConstants.DIAGONAL_PATH_PROBABILITY;
                var numPathDirections = isStartingPath ? 1 : pathDirectionNums[WorldCreatorRandom.randomInt(seed * l * l + levelVO.levelOrdinal + pathRandomSeed, 0, pathDirectionNums.length)];
                var pathDirections = isStartingPath ?
					[ PositionConstants.DIRECTION_EAST ] :
					WorldCreatorRandom.randomDirections(seed * levelVO.levelOrdinal + 28381 + pathRandomSeed, numPathDirections, includeDiagonals);
                
                // console.log("starting pos: " + pathStartingPos.toString() + ", directions: " + pathDirections);
                
                for (var di = 0; di < pathDirections.length; di++) {
                    pathLength = WorldCreatorRandom.randomInt(seed * 3 * pathRandomSeed * (di + 1) + (di + 3) * l + 55, pathLengthMin, pathLengthMax);
                    this.generateSectorPath(levelVO, pathStartingPos, pathDirections[di], pathLength, sectorsAll, sectorsCentral);
                }
            }
            
            if (attempts === maxAttempts) {
                console.log("WARN: Generating sectors for level " + levelVO.level + " failed ("
                            + sectorsAll.length + "/" + sectorsTotalMin + " sectors, " + sectorsCentral.length + "/" + sectorsCentralMin + " central, "
							+ "passage up positions: " + passagesUpPositions
							+ ").");
                WorldCreatorDebug.printLevel(this.world, levelVO);
            }
			
			// fill in annoying hole sectors (if an empty position has more than one sector neighbours, fill it)
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
						var isHorizontalNeighbours = typeof neighbours[PositionConstants.DIRECTION_WEST] !== 'undefined' && typeof neighbours[PositionConstants.DIRECTION_EAST] !== 'undefined';
						var isVerticalNeighbours = typeof neighbours[PositionConstants.DIRECTION_NORTH] !== 'undefined' && typeof neighbours[PositionConstants.DIRECTION_SOUTH] !== 'undefined';
						if ((isHorizontalNeighbours || isVerticalNeighbours) && neighboursCount < 5) {
							this.createSector(levelVO, new PositionVO(levelVO.level, x, y), sectorsAll, sectorsCentral);
						}
					}
				}
			}
			
			// WorldCreatorDebug.printLevel(this.world, levelVO);
        },

        generateSectorPath: function (levelVO, pathStartingPos, pathDirection, pathLength, sectorsAll, sectorsCentral) {
            var sectorPos;
            for (var si = 0; si < pathLength; si++) {
                sectorPos = PositionConstants.getPositionOnPath(pathStartingPos, pathDirection, si);
                sectorPos.level = levelVO.level;

                // stop path when intersecting existing paths
                var sectorExists = levelVO.hasSector(sectorPos.sectorX, sectorPos.sectorY);
				var sectorHasUnmatchingNeighbours = false;
				var neighbours = levelVO.getNeighbours(sectorPos.sectorX, sectorPos.sectorY);
				if (neighbours[PositionConstants.DIRECTION_EAST] && neighbours[PositionConstants.DIRECTION_SOUTH]) sectorHasUnmatchingNeighbours = true;
				if (neighbours[PositionConstants.DIRECTION_EAST] && neighbours[PositionConstants.DIRECTION_NORTH]) sectorHasUnmatchingNeighbours = true;
				if (neighbours[PositionConstants.DIRECTION_WEST] && neighbours[PositionConstants.DIRECTION_SOUTH]) sectorHasUnmatchingNeighbours = true;
				if (neighbours[PositionConstants.DIRECTION_WEST] && neighbours[PositionConstants.DIRECTION_NORTH]) sectorHasUnmatchingNeighbours = true;
                if (sectorExists || sectorHasUnmatchingNeighbours || Object.keys(neighbours).length > 4) {
                    if (si > 0) {
                        break;
                    } else {
                        continue;
                    }
                }
				
				this.createSector(levelVO, sectorPos, sectorsAll, sectorsCentral);
            }
        },
		
		createSector: function (levelVO, sectorPos, sectorsAll, sectorsCentral) {
            this.totalSectors++;
			var sectorVO = new SectorVO(sectorPos, levelVO.isCampable, levelVO.notCampableReason);
			levelVO.addSector(sectorVO);
			sectorsAll.push(sectorPos);
			if (PositionConstants.isPositionInArea(sectorPos, levelVO.centralAreaSize)) sectorsCentral.push(sectorPos);
		},
		
		generateEnemies: function (seed, topLevel, bottomLevel, sectorVO) {
			var l = sectorVO.position.level;
			var x = sectorVO.position.sectorX;
			var y = sectorVO.position.sectorY;
			
			var bottomLevelOrdinal = WorldCreatorHelper.getLevelOrdinal(seed, bottomLevel);
			var totalLevels = topLevel - bottomLevel + 1;
			
			var enemies = sectorVO.enemies;
			var enemyDifficulty = WorldCreatorHelper.getLevelOrdinal(seed, l);
			var randomEnemyCheck = function (typeSeed, enemy) {
				var threshold = (enemy.rarity + 5) / 110;
				var r = WorldCreatorRandom.random(typeSeed * l * seed + x * l + y + typeSeed + typeSeed * x - y * typeSeed * x);
				return r > threshold;
			};
		
			var globalE = EnemyConstants.getEnemies(EnemyConstants.enemyTypes.global, enemyDifficulty, false, bottomLevelOrdinal, totalLevels);
			var enemy;
			for (var e in globalE) {
				enemy = globalE[e];
				if (randomEnemyCheck(11 * (e + 1), enemy)) enemies.push(enemy);
			}
			
			if (l <= bottomLevel + 1) {
				var earthE = EnemyConstants.getEnemies(EnemyConstants.enemyTypes.earth, enemyDifficulty, false, bottomLevelOrdinal, totalLevels);
				for (var e in earthE) {
					enemy = earthE[e];
					if (randomEnemyCheck(333 * (e + 1), enemy)) enemies.push(enemy);
				}
			}
			
			if (sectorVO.sunlit) {
				var sunE = EnemyConstants.getEnemies(EnemyConstants.enemyTypes.sunlit, enemyDifficulty, false, bottomLevelOrdinal, totalLevels);
				for (var e in sunE) {
					enemy = sunE[e];
					if (randomEnemyCheck(6666 * (e + 4) + 2, enemy)) enemies.push(enemy);
				}
			}
			
			if (l >= topLevel - 10) {
				var inhabitedE = EnemyConstants.getEnemies(EnemyConstants.enemyTypes.inhabited, enemyDifficulty, false, bottomLevelOrdinal, totalLevels);
				for (var e in inhabitedE) {
					enemy = inhabitedE[e];
					if (randomEnemyCheck(777 * (e + 2) ^ 2, enemy)) enemies.push(enemy);
				}
			}
			
			if (l >= topLevel - 5) {
				var urbanE = EnemyConstants.getEnemies(EnemyConstants.enemyTypes.urban, enemyDifficulty, false, bottomLevelOrdinal, totalLevels);
				for (var e in urbanE) {
					enemy = urbanE[e];
					if (randomEnemyCheck(99 * (e + 1), enemy)) enemies.push(enemy);
				}
			}
			
			if (enemies.length < 1) {
                if (globalE.length > 0) {
                    enemies.push(globalE[0]);
                } else {
                    console.log("WARN: No valid enemies defined for sector " + sectorVO.position);
                }
            }
			
			return enemies;
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
			sectorFeatures.sunlit = sectorVO.sunlit;
			sectorFeatures.sectorType = sectorVO.sectorType;
			sectorFeatures.hasSpring = sectorVO.hasSpring;
			sectorFeatures.resourcesScavengable = sectorVO.resourcesScavengable;
			sectorFeatures.resourcesCollectable = sectorVO.resourcesCollectable;
			sectorFeatures.workshopResource = sectorVO.workshopResource;
            sectorFeatures.campable = sectorVO.campableLevel;
            sectorFeatures.notCampableReason = sectorVO.notCampableReason;
			return sectorFeatures;
		},
		
		getLocales: function (level, sectorX, sectorY) {
			return this.world.getLevel(level).getSector(sectorX, sectorY).locales;
		},
		
		getSectorEnemies: function (level, sectorX, sectorY) {
			return this.world.getLevel(level).getSector(sectorX, sectorY).enemies;
		},
		
		getSectorEnemyCount: function (level, sectorX, sectorY) {
			return this.world.getLevel(level).getSector(sectorX, sectorY).enemies.length > 0 ? 25 : 0;
		},
		
		getSectorLocaleEnemyCount: function (level, sectorX, sectorY) {
			return this.world.getLevel(level).getSector(sectorX, sectorY).localeEnemies;
		},
        
    };

    return WorldCreator;
});
