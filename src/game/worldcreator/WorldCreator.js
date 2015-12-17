// Stores world definitions and returns world-related constants given a seed. The seed should be a positive int.
define([
	'ash',
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
    Ash,
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
			for (var l = topLevel; l >= bottomLevel; l--) {
                var isCampableLevel = WorldCreatorHelper.isCampableLevel(seed, l);
				var levelOrdinal = WorldCreatorHelper.getLevelOrdinal(seed, l);
                var levelVO = new LevelVO(l, levelOrdinal, isCampableLevel);
				this.world.addLevel(levelVO);

                this.generateSectors(seed, levelVO, passageDownSectors);
					
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
					var numPassages = WorldCreatorRandom.random(seed * l / 7 + l + l * l + seed) > 0.8 ? 2 : 1;
					if (l === 14) numPassages = 1;
					if (l === 13) numPassages = 1;
					passageDownSectors = WorldCreatorRandom.randomSectors(seed * l * 654 * (i + 2), levelVO, numPassages, numPassages + 1, true, "camp");
					for (var i = 0; i < passageDownSectors.length; i++) {
						if (l === 13) {
							passageDownSectors[i].passageDown = 3;
						} else if (l === 14) {
							passageDownSectors[i].passageDown = 1;
						} else {
							var availablePassageTypes = [3];
							if (l < 6 || l > 13) availablePassageTypes.push(1);
							if (l > 15) availablePassageTypes.push(2);
							var passageTypeIndex = WorldCreatorRandom.randomInt(9 * seed + l * i * 7 + i + l * seed, 0, availablePassageTypes.length);
							var passageType = availablePassageTypes[passageTypeIndex];
							passageDownSectors[i].passageDown = passageType;
						}
					}
				}
				
				// movement blockers: a few per level
				// TODO remove debug numbers for blockers
				var maxBlockers = WorldCreatorConstants.SECTORS_PER_LEVEL_MIN * levelOrdinal / 25 / 5;
				var numBlockers = 80//WorldCreatorRandom.randomInt(88 + seed * 56 * l + seed % 7, 1, maxBlockers);
				// if (l === 13) numBlockers = 0;
				var blockerSectors = WorldCreatorRandom.randomSectors(seed * l * l + 1 * 22 * i, levelVO, numBlockers, numBlockers + 1, true, "camp");
				for (var i = 0; i < blockerSectors.length; i++) {
					var blockerType = WorldCreatorRandom.randomInt(seed * 5831 / l + seed % 2 + (i + 78) * 4, 1, 4);
					// if (l < 14 && blockerType === MovementConstants.BLOCKER_TYPE_WASTE) blockerType = MovementConstants.BLOCKER_TYPE_GAP;
					// if (levelOrdinal < 7 && blockerType === MovementConstants.BLOCKER_TYPE_GAP) blockerType = MovementConstants.BLOCKER_TYPE_GANG;
					
					var blockedSector = blockerSectors[i];
					var blockedNeighbour = WorldCreatorRandom.getRandomSectorNeighbour(seed * 101 + (i + 70) * (l + 900), levelVO, blockedSector);
					var direction = PositionConstants.getDirectionFrom(blockedSector.position, blockedNeighbour.position);
					
					blockedSector.addBlocker(direction, blockerType);
					blockedNeighbour.addBlocker(PositionConstants.getOppositeDirection(direction), blockerType);
				}
			}
			
			// Debug print
			console.log("World structure ready. (ground: " + bottomLevel + ", surface: " + topLevel + ")");
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
                        var edgeSector = y === levelVO.minY || y === levelVO.maxY || x === levelVO.minX || x === levelVO.maxX;
                        var ceilingStateOfRepair = l === topLevel || !ceilingSector ? 0 : ceilingSector.stateOfRepair;
                    
                        // state of repair
                        var explosionStrength = i - topLevel >= -3 && distanceToCenter <= 10 ? distanceToCenter * 2 : 0;
                        var stateOfRepair = Math.min(10, Math.max(0, Math.ceil(levelRepair + (WorldCreatorRandom.random(seed * l * (x + 100) * (y + 100)) * 5)) - explosionStrength));
                        if (sectorVO.camp) stateOfRepair = Math.max(3, stateOfRepair);
                        sectorVO.stateOfRepair = stateOfRepair;
                        
                        // sunlight
                        sectorVO.sunlit = l === topLevel || (l === topLevel - 1 && ceilingStateOfRepair < 2) || (edgeSector && stateOfRepair < 2);
                        
                        // sector type
                        var sectorType = WorldCreatorHelper.getSectorType(seed, l, x, y);
                        sectorVO.sectorType = sectorType;
                                
                        // buildingDensity
                        var buildingDensity = Math.ceil(Math.min(Math.min(levelDensity + 1, 10), Math.max(0, levelDensity / 1.5 + Math.round((WorldCreatorRandom.random(seed * l * x)-0.5)*5) + (stateOfRepair) / 5)));
                        if (sectorVO.camp) {
                            buildingDensity = Math.min(1, Math.max(8, buildingDensity));
                        }
                        sectorVO.buildingDensity = buildingDensity;
                    }
				}
			}
			
			console.log("World texture ready.");
			// WorldCreatorDebug.printWorld(this.world, [ "sectorType" ]);
		},
		
		// resources
		prepareWorldResources: function (seed, topLevel, bottomLevel) {
			for (var l = topLevel; l >= bottomLevel; l--) {
                var levelVO = this.world.getLevel(l);
                var foodOnLevel = 0;
                var fuelSectors = [];
                
                if (WorldCreatorHelper.isDarkLevel(seed, l) && (l % 2 === 0))
                    fuelSectors = WorldCreatorRandom.randomSectors(seed * l * 2 / 7 * l, levelVO, 1, 2, "camp");
				
				for (var y = levelVO.minY; y <= levelVO.maxY; y++) {
					for (var x = levelVO.minX; x <= levelVO.maxX; x++) {
                        var sectorVO = levelVO.getSector(x, y);
                        var sRandom = (x + y + 3000);
                        if (!sectorVO) continue;
                        
                        sectorVO.resources = new ResourcesVO();
                        var stateOfRepair = sectorVO.stateOfRepair;
                        var sectorType = sectorVO.sectorType;
                        
                        var food = 0;
                        if (sectorType === WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL) food = Math.round(WorldCreatorRandom.random(seed + l * l + sRandom * 88 + 324) * 3 + stateOfRepair / 2);
                        if (sectorType === WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL) food = 0;
                        if (sectorType === WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE) food = WorldCreatorRandom.randomInt(seed % 8 + 33 + seed * l + sRandom * 33 + seed, 0, 6);
                        if (sectorType === WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL) food = Math.round(WorldCreatorRandom.random(seed + l * l + sRandom * 33 + 324) * 3 + stateOfRepair / 2);
                        if (sectorType === WorldCreatorConstants.SECTOR_TYPE_SLUM) food = Math.round(WorldCreatorRandom.random(seed + l * l * 4 * seed + sRandom * 33 + 2114) * (Math.abs(l - 10)));
                        if (l === bottomLevel) food = Math.max(food, 3);
                        if (l === bottomLevel + 1) food = food + 2;
                        if (l === 13 && x === 0 && y === 0) food = 5;
                        if (food < 3) food = 0;
                        
                        var waterRandomPart = Math.round(WorldCreatorRandom.random(seed * l * (x + y + 900) + 10134) * stateOfRepair / 2);
                        var waterSectorTypePart = 0;
                        if (sectorType === WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL) waterSectorTypePart = Math.round(WorldCreatorRandom.random(seed * 5 * l * sRandom + 1364) * 5);
                        if (sectorType === WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL) waterSectorTypePart = Math.round(WorldCreatorRandom.random(seed * 5 * l * sRandom + 1364) * 1);
                        if (sectorType === WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE) waterSectorTypePart = Math.round(WorldCreatorRandom.random(seed * 5 * l * sRandom + 1364) * 1);
                        if (sectorType === WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL) waterSectorTypePart = Math.round(WorldCreatorRandom.random(seed * 5 * l * sRandom + 1364) * 3);
                        if (sectorType === WorldCreatorConstants.SECTOR_TYPE_SLUM) waterSectorTypePart = Math.round(WorldCreatorRandom.random(seed * 5 * l * sRandom + 1364) * 2);
                        var water = Math.max(0, Math.min(10, Math.round(waterRandomPart + waterSectorTypePart)));
                        if (l === bottomLevel) water = water + 2;
                        if (l === 13 && x === 0 && y === 0) water = Math.max(5, water);
                        if (water < 3) water = 0;
                        
                        if (sectorVO.camp) water = Math.max(water, 3);
                        if (sectorVO.camp) food = Math.max(food, 1);
                        
                        var fuel = 0;
                        var herbs = 0;
                        
                        if (fuelSectors.indexOf(sectorVO) >= 0) fuel = 5;
                        
                        sectorVO.resources.water = water;
                        sectorVO.resources.food = food;
                        sectorVO.resources.metal = 5;
                        sectorVO.resources.herbs = herbs;
                        sectorVO.workshopResource = fuel > 0 ? resourceNames.fuel : null;
                        sectorVO.workshop = sectorVO.workshopResource !== null;
                        
                        foodOnLevel += food;
                    }
                }
			}
			
			console.log("World resources ready.");
            // WorldCreatorDebug.printWorld(this.world, [ "resources.food" ]);
            // WorldCreatorDebug.printWorld(this.world, [ "sectorType" ]);
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
						
					default: console.log("WARN: Unknown sector type " + sectorType);
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
				var minLocales = Math.max(1, UpgradeConstants.bluePrintsByCampOrdinal[campOrdinal] ? UpgradeConstants.bluePrintsByCampOrdinal[campOrdinal].length : 0);
				var levelLocaleCount = Math.max(minLocales, Math.round(countRand * 15));
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
			console.log("World locales ready.");
			// WorldCreatorDebug.printWorld(this.world, [ "locales.length" ]);
		},
		
		// enemies
		prepareWorldEnemies: function (seed, topLevel, bottomLevel) {
			var bottomLevelOrdinal = WorldCreatorHelper.getLevelOrdinal(seed, bottomLevel);
			var totalLevels = topLevel - bottomLevel + 1;
			for (var l = topLevel; l >= bottomLevel; l--) {
                var levelVO = this.world.getLevel(l);
				for (var y = levelVO.minY; y <= levelVO.maxY; y++) {
					for (var x = levelVO.minX; x <= levelVO.maxX; x++) {
                        var sectorVO = levelVO.getSector(x, y);
                        if (!sectorVO) continue;
                        sectorVO.enemies = [];
                        sectorVO.localeEnemies = {};
                        
                        // regular enemies
                        var hasSectorEnemies = !sectorVO.camp && WorldCreatorRandom.random(l * x * seed + y * seed + 4848) > 0.2;
                        var hasLocaleEnemies = sectorVO.hasBlockerOfType(MovementConstants.BLOCKER_TYPE_GANG) || sectorVO.workshop;
                        
                        if (hasSectorEnemies || hasLocaleEnemies) {
                            var enemies = sectorVO.enemies;
                            var enemyDifficulty = WorldCreatorHelper.getLevelOrdinal(seed, l);
                            var pseudorandom = this.random;
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
                            
                            if (enemies.length < 1) enemies.push(globalE[0]);
                            
                            var enemyS = l + "." + x + "." + y + ":\t";
                            var stats;
                            for (var e in enemies) {
                                stats = enemies[e].att + enemies[e].def;
                                enemyS += enemies[e].name + "(" + stats + "), ";
                            }
                            // console.log(enemyS.slice(0,-2));
                        }
                        
                        // workshop and locale enemies
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
			//console.log("- - - ")
			}
			
			console.log("World enemies ready.");
			// WorldCreatorDebug.printWorld(this.world, [ "enemies.length" ]);
		},
        
        generateSectors: function (seed, levelVO, passagesUpSectors) {
            var l = levelVO.level;
            var excursionLength = ItemConstants.getBag(levelVO.levelOrdinal).bonus;
            levelVO.centralAreaSize = excursionLength;
            
            var pathDirectionNums = [ 1, 1, 1, 1, 2, 2, 2, 3, 3, 4 ];
            
            var sectorsAll = [];
            var sectorsCentral = [];
            
            var sectorsCentralMin = excursionLength * WorldCreatorConstants.EXCURSIONS_PER_LEVEL_MIN;
            var sectorsTotalMin = Math.max(sectorsCentralMin, WorldCreatorConstants.SECTORS_PER_LEVEL_MIN);
            var pathStartingPos;
            var pathLength;
            var pathDirection;
            
            // connect existing passages
            if (passagesUpSectors.length === 1) {
                pathStartingPos = passagesUpSectors[0].position.clone();
                pathDirection = WorldCreatorRandom.randomDirections(seed * levelVO.levelOrdinal + 284, 1)[0];
                pathLength = WorldCreatorRandom.randomInt(seed * 3 * 53 * (l + 1) + l + 55, 2, 30);
                this.generateSectorPath(levelVO, pathStartingPos, pathDirection, pathLength, sectorsAll, sectorsCentral);
            } else if (passagesUpSectors.length > 1) {
                for (var pi = 0; pi < passagesUpSectors.length-1; pi++) {
                    pathStartingPos = passagesUpSectors[pi].position.clone();
                    pathLength = Math.abs(pathStartingPos.sectorX - passagesUpSectors[pi + 1].position.sectorX) + 1;
                    pathDirection = PositionConstants.getXDirectionFrom(pathStartingPos, passagesUpSectors[pi + 1].position);
                    this.generateSectorPath(levelVO, pathStartingPos, pathDirection, pathLength, sectorsAll, sectorsCentral);
                    
                    var wayPoint = PositionConstants.getPositionOnPath(pathStartingPos, pathDirection, pathLength - 1);
                    pathLength = Math.abs(pathStartingPos.sectorY - passagesUpSectors[pi + 1].position.sectorY) + WorldCreatorRandom.randomInt(seed * l / 35 * (pi + 1), 1, 5);
                    pathDirection = PositionConstants.getYDirectionFrom(pathStartingPos, passagesUpSectors[pi + 1].position);
                    this.generateSectorPath(levelVO, wayPoint, pathDirection, pathLength, sectorsAll, sectorsCentral);
                }
            }
            
            // fill in the rest by creating random paths
            var attempts = 0;
            var maxAttempts = 100;
            while ((sectorsCentral.length < sectorsCentralMin || sectorsAll.length < sectorsTotalMin) && attempts < maxAttempts) {
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
                
                var numPathDirections = isStartingPath ? 1 : pathDirectionNums[WorldCreatorRandom.randomInt(seed * l * l + levelVO.levelOrdinal + pathRandomSeed, 0, pathDirectionNums.length)];
                var pathDirections = isStartingPath ? [ PositionConstants.DIRECTION_EAST ] : WorldCreatorRandom.randomDirections(seed * levelVO.levelOrdinal + 28381 + pathRandomSeed, numPathDirections);
                
                // console.log("starting pos: " + pathStartingPos.toString() + ", directions: " + pathDirections);
                
                for (var di = 0; di < pathDirections.length; di++) {
                    pathLength = WorldCreatorRandom.randomInt(seed * 3 * pathRandomSeed * (di + 1) + (di + 3) * l + 55, 2, 30);
                    this.generateSectorPath(levelVO, pathStartingPos, pathDirections[di], pathLength, sectorsAll, sectorsCentral);
                }
            }
            
            if (attempts === maxAttempts) console.log("WARN: Generating sectors for level " + levelVO.level + " failed.");
        },

        generateSectorPath: function (levelVO, pathStartingPos, pathDirection, pathLength, sectorsAll, sectorsCentral) {
            var sectorPos;
            for (var si = 0; si < pathLength; si++) {
                sectorPos = PositionConstants.getPositionOnPath(pathStartingPos, pathDirection, si);
                sectorPos.level = levelVO.level;

                // stop path when intersecting existing paths
                var sectorExists = levelVO.hasSector(sectorPos.sectorX, sectorPos.sectorY);
                if (sectorExists) {
                    if (si > 0) {
                        break;
                    } else {
                        continue;
                    }
                }
                
                var sectorVO = new SectorVO(sectorPos, levelVO.isCampable);
                levelVO.addSector(sectorVO);
                sectorsAll.push(sectorPos);
                if (PositionConstants.isPositionInArea(sectorPos, levelVO.centralAreaSize)) sectorsCentral.push(sectorPos);
            }
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
			sectorFeatures.resources = sectorVO.resources;
			sectorFeatures.workshopResource = sectorVO.workshopResource;
            sectorFeatures.campable = sectorVO.campableLevel;
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
