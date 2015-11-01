// Stores world definitions and returns world-related constants given a seed. The seed should be a positive int.
define([
	'ash',
	'game/vos/ResourcesVO',
	'game/vos/LocaleVO',
	'game/constants/WorldCreatorConstants',
	'game/constants/EnemyConstants',
	'game/constants/UpgradeConstants'
], function (Ash, ResourcesVO, LocaleVO, WorldCreatorConstants, EnemyConstants, UpgradeConstants) {

    var WorldCreator = {
        
		world: {
		},
		
		prepareWorld: function (seed) {
			var topLevel = this.getHighestLevel(seed);
			var bottomLevel = this.getBottomLevel(seed);
			
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
			var passageDownPos = [];
			for (var l = topLevel; l >= bottomLevel; l--) {
				this.world[l] = [];
				
				var firstSector = this.getFirstSector(seed, l);
				var lastSector = this.getLastSector(seed, l);
                var isCampableLevel = this.isCampableLevel(seed, l);
				for (var s = firstSector; s <= lastSector; s++) {
					this.world[l][s] = {};
					this.world[l][s].camp = false;
                    this.world[l][s].campableLevel = isCampableLevel; // TODO define reasons for camping disabled: waste etc
					this.world[l][s].blockerRight = 0;
					this.world[l][s].blockerLeft = 0;
					this.world[l][s].locales = [];
				}
					
				// camp: 1-2 spots for every campable level
				if (l === 13) {
					this.world[l][3].camp = true;
				} else {
					var numCamps = isCampableLevel ? this.randomInt(seed / 3 * l, 1, 5) : 0;
					for (var i = 0; i < numCamps; i++)
					{
						var campS = this.randomInt(seed * l * 534 * (i + 7), firstSector, lastSector);
						this.world[l][campS].camp = true;
					}
				}
				
				// passages: up according to previous level
				for (var i = 0; i < passageDownPos.length; i++) {
					this.world[l][passageDownPos[i]].passageUp = this.world[l + 1][passageDownPos[i]].passageDown;
				}
				
				// passages: down 1-2 per level
				if (l > bottomLevel) {
					var numPassages = this.random(seed * l / 7 + l + l * l + seed) > 0.8 ? 2 : 1;
					if (l === 14) numPassages = 1;
					if (l === 13) numPassages = 1;
					var firstPassSector = firstSector;
					if (l === 13 || l === 14) firstPassSector = 5;
					var lastPassSector = lastSector;
					passageDownPos = this.randomSectors(seed * l * 654 * (i + 2), l, firstPassSector, lastPassSector, numPassages, numPassages + 1, "camp");
					
					for (var i = 0; i < passageDownPos.length; i++) {
						if (l === 13) {
							this.world[l][passageDownPos[i]].passageDown = 3;
						} else if (l === 14) {
							this.world[l][passageDownPos[i]].passageDown = 1;
						} else {
							var availablePassageTypes = [3];
							if (l < 6 || l > 13) availablePassageTypes.push(1);
							if (l > 15) availablePassageTypes.push(2);
							var passageTypeIndex = this.randomInt(9 * seed + l * i * 7 + i + l * seed, 0, availablePassageTypes.length);
							var passageType = availablePassageTypes[passageTypeIndex];
							
							this.world[l][passageDownPos[i]].passageDown = passageType;
						}
					}
				}
				
				// movement blockers: a few per level
				var numBlockers = this.randomInt(88 + seed * 56 * l + seed % 7, 0, Math.ceil(1 + (Math.abs(l - 13) / 3)));
				if (l === 13) numBlockers = 0;
				var blockerSectors = this.randomSectors(seed * l * l + 1 * 22 * i, l, firstSector, lastSector, numBlockers, numBlockers + 1, "camp");
				for (var i = 0; i < blockerSectors.length; i++) {
					var blockerType = this.randomInt(seed * 5831 / l + seed % 2, 1, 4);
					var blockedSector = blockerSectors[i];
					this.world[l][blockedSector].blockerRight = blockerType;
					if (blockedSector < lastSector) this.world[l][blockedSector + 1].blockerLeft = blockerType;
				}
			}
			
			// Debug print
			console.log("World structure ready. (ground: " + bottomLevel + ", surface: " + topLevel + ")");
			//this.printWorld(seed, [ "campableLevel" ]);
			//this.printWorld(seed, [ "blockerLeft" ]);
			//this.printWorld(seed, [ "blockerRight" ]);
			// this.printWorld(seed, [ "camp" ]);
		},
		
		// sector type, building density, state of repair, sunlight
		prepareWorldTexture: function(seed, topLevel, bottomLevel) {
			for(var i = topLevel; i>= bottomLevel; i--) {
				var l = i == 0 ? 1 : i;
				var firstSector = this.getFirstSector(seed, i);
				var lastSector = this.getLastSector(seed, i);
				
				var levelDensity = Math.min(Math.max(2, i % 2 * 4 + Math.random(seed*7*l/3+62)*7), 8);
				if (Math.abs(i - 15) < 2) levelDensity = 10;
				var levelRepair = Math.max(2, (i-15)*2);
				if (i <= 5) levelRepair = levelRepair - 2;
				
				for(var s = firstSector; s <= lastSector; s++) {
					var edgeSector = s == firstSector || s == lastSector;
					var ceilingStateOfRepair = i == topLevel ? 0 : this.world[i+1][s].stateOfRepair;
				
					// state of repair
					var explosionStrength = i - topLevel >= -3 && Math.abs((firstSector + 5) - s) < 2 ?
					Math.max(1, 5 - Math.abs(i - topLevel) + 3-Math.abs((firstSector + 5) - s))*2 :
					0;		    
					var stateOfRepair = Math.min(10, Math.max(0,
					Math.ceil(levelRepair + (this.random(seed*l*s)*5)) - explosionStrength
					));
					if (this.world[i][s].camp) stateOfRepair = Math.max(3, stateOfRepair);
					this.world[i][s].stateOfRepair = stateOfRepair;
					
					// sunlight
					this.world[i][s].sunlit = l == topLevel || (l == topLevel-1 && ceilingStateOfRepair < 2) || (edgeSector && stateOfRepair < 2);
					
					// sector type
					var sectorType = this.getSectorType(seed, l, s);
					this.world[i][s].sectorType = sectorType;
							
					// buildingDensity
					var buildingDensity = Math.ceil(Math.min(Math.min(levelDensity+1, 10), Math.max(0,
					levelDensity/1.5 + Math.round((this.random(seed*l*s)-0.5)*5) + (stateOfRepair)/5
					)));
					if (this.world[i][s].camp) {
						buildingDensity = Math.min(1, Math.max(8, buildingDensity));
					}
					this.world[i][s].buildingDensity = buildingDensity;
				}
			}
			
			console.log("World texture ready.");
			// this.printWorld(seed, [ "sunlit" ]);
		},
		
		// resources  
		prepareWorldResources: function(seed, topLevel, bottomLevel) {	    
			for(var l = topLevel; l>= bottomLevel; l--) {
			var firstSector = this.getFirstSector(seed, l);
			var lastSector = this.getLastSector(seed, l);
			
			var fallbackFoodSector = this.randomInt(seed*l*l+l*22, firstSector, lastSector+1);
			var foodOnLevel = 0;
			
			var fuelSectors = [];
			if (this.isDarkLevel(seed, l) && (l % 2 == 0))
				fuelSectors = this.randomSectors(seed*l^2/7*l, l, firstSector, lastSector, 1, 3, "camp");
			
			for(var s = firstSector; s <= lastSector; s++) {
				this.world[l][s].resources = new ResourcesVO();
				var stateOfRepair = this.world[l][s].stateOfRepair;
				var sectorType = this.world[l][s].sectorType;
				
				var food = 0;
				if (sectorType == WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL) food = Math.round(this.random(seed+l*l+s*88+324)*3 + stateOfRepair / 2);
				if (sectorType == WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL) food = 0;
				if (sectorType == WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE) food = this.randomInt(seed%8+33+seed*l+s*s*33+seed, 0, 6);
				if (sectorType == WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL) food = Math.round(this.random(seed+l*l+s*33+324)*3 + stateOfRepair / 2);
				if (sectorType == WorldCreatorConstants.SECTOR_TYPE_SLUM) food = Math.round(this.random(seed+l*l*4*seed+s*33+2114)*(Math.abs(l-10)));
				if (l == bottomLevel) food = Math.max(food, 3);
				if (l == bottomLevel+1) food = food + 2;
				if (l == 13 && s == 2) food = 5;
				if (food < 3) food = 0;
				
				var waterRandomPart = Math.round(this.random(seed*l*s+10134)*stateOfRepair/2);
				var waterSectorTypePart = 0;
				if (sectorType == WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL) waterSectorTypePart = Math.round(this.random(seed*5*l*s+1364)*5);
				if (sectorType == WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL) waterSectorTypePart = Math.round(this.random(seed*5*l*s+1364)*1);
				if (sectorType == WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE) waterSectorTypePart = Math.round(this.random(seed*5*l*s+1364)*1);
				if (sectorType == WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL) waterSectorTypePart = Math.round(this.random(seed*5*l*s+1364)*3);
				if (sectorType == WorldCreatorConstants.SECTOR_TYPE_SLUM) waterSectorTypePart = Math.round(this.random(seed*5*l*s+1364)*2);
				var water = Math.max(0, Math.min(10, Math.round(waterRandomPart + waterSectorTypePart)));
				if (l == bottomLevel) water = water+2;
				if (l == 13 && s == 2) water = Math.max(5, water);
				if (water < 3) water = 0;
				
				if (this.world[l][s].camp) water = Math.max(water, 3);
				if (this.world[l][s].camp) food = Math.max(food, 1);
				
				var fuel = 0;
				var herbs = 0;
				if (this.isSunLevel(seed, l)) {
				
				} else if (fuelSectors.indexOf(s) >= 0) {
					fuel = 5;
				}
					else if (this.isEarthLevel(seed, l)) {
				}
				
				this.world[l][s].resources.water = water;
				this.world[l][s].resources.food = food;
				this.world[l][s].resources.metal = 5;
				this.world[l][s].resources.fuel = fuel;
				this.world[l][s].resources.herbs = herbs;
				this.world[l][s].workshop = this.world[l][s].resources.fuel > 0;
				
				foodOnLevel += food;
			}
			
			if (foodOnLevel <= 0) {
				this.world[l][fallbackFoodSector].resources.food = Math.max(4, this.world[l][fallbackFoodSector].resources.food);
			}
			}
			
			console.log("World resources ready.");
			// this.printWorld(seed, [ "resources.fuel" ]);
		},
		
		// locales
		prepareWorldLocales: function (seed, topLevel, bottomLevel) {
			var getLocaleType = function (sectorType, level, levelOrdinal, localeRandom) {
				var localeType = localeTypes.house;
				
				// level-based
				if (l == bottomLevel && localeRandom < 0.25) localeType = localeTypes.grove;
				else if (l >= topLevel - 1 && localeRandom < 0.25) localeType = localeTypes.lab;
				// sector type based
				else {
					switch(sectorType) {
						case WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL:
							if (localeRandom > 0.5) localeType = localeTypes.house;
							else if (localeRandom > 0.4) localeType = localeTypes.transport;
							else if (localeRandom > 0.3) localeType = localeTypes.sewer;
							else if (localeRandom > 0.2) localeType = localeTypes.warehouse;
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
							if (localeRandom > 0.5) localeType = localeTypes.maintenance;
							else if (localeRandom > 0.4) localeType = localeTypes.transport;
							else localeType = localeTypes.sewer;
							break;
						
						case WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL:
							if (localeRandom > 5) localeType = localeTypes.market;
							else if (localeRandom > 0.3) localeType = localeTypes.warehouse;
							else if (localeRandom > 0.2) localeType = localeTypes.transport;
							else localeType = localeTypes.house;
							break;
						
						case WorldCreatorConstants.SECTOR_TYPE_SLUM:
							if (localeRandom > 0.3) localeType = localeTypes.house;
							else localeType = localeTypes.sewer;
							break;
						
						default: console.log("WARN: Unknown sector type.");
					}
				}
				return localeType;
			};
			for (var l = topLevel; l >= bottomLevel; l--) {
				var firstSector = this.getFirstSector(seed, l);
				var lastSector = this.getLastSector(seed, l);
				var levelOrdinal = this.getLevelOrdinal(seed, l);
				var campOrdinal = this.getCampOrdinal(seed, l);
				var countRand = this.random((seed % 84) * l * l * l);
				// min number of (easy) locales ensures that player can get all upgrades intended for that level
				var minLocales = Math.max(1, UpgradeConstants.bluePrintsByCampOrdinal[campOrdinal] ? UpgradeConstants.bluePrintsByCampOrdinal[campOrdinal].length : 0);
				var levelLocaleCount = Math.max(minLocales, Math.round(countRand * 5));
				var firstLocaleSector = l == 13 ? 5 : 1;
				for (var i = 0; i < levelLocaleCount; i++) {
					var localePos = this.randomInt(seed + i * l + i * 7394 * seed + i * i * l, firstLocaleSector, lastSector + 1);
					var localeType = getLocaleType(this.world[l][localePos].sectorType, l, levelOrdinal, this.random(seed+seed+l*i*seed+localePos));
					var isEasy = i <= minLocales;
					var locale = new LocaleVO(localeType, isEasy);
					this.world[l][localePos].locales.push(locale);
				}
			}
			console.log("World locales ready.");
			// this.printWorld(seed, [ "locales.length" ]);
		},
		
		// enemies
		prepareWorldEnemies: function (seed, topLevel, bottomLevel) {	
			var passageDownPos = [];
			var bottomLevelOrdinal = this.getLevelOrdinal(seed, bottomLevel);
			var totalLevels = topLevel - bottomLevel + 1;
			for(var l = topLevel; l>= bottomLevel; l--) {		
				var firstSector = this.getFirstSector(seed, l);
				var lastSector = this.getLastSector(seed, l);
				for (var s = firstSector; s <= lastSector; s++) {
					this.world[l][s].enemies = [];		    
					var hasEnemies = !this.world[l][s].camp && (this.world[l][s].blockerLeft == 3 ||
						this.world[l][s].blockerRight == 3 ||
						this.world[l][s].workshop ||
						this.random(l*s*seed+s*seed+4848) > 0.2);
					
					if (hasEnemies) {
					var enemies = this.world[l][s].enemies;
					var enemyDifficulty = this.getLevelOrdinal(seed, l);
					var pseudorandom = this.random;
					var randomEnemyCheck = function(typeSeed, enemy) {
						var threshold = (enemy.rarity + 5)/110;
						var r = pseudorandom(typeSeed*l*seed + s*l + s + typeSeed + typeSeed*s - s*typeSeed*s);
						return r > threshold;
					};
					
					var globalE = EnemyConstants.getEnemies(EnemyConstants.enemyTypes.global, enemyDifficulty, false, bottomLevelOrdinal, totalLevels);
					var enemy;
					for(var e in globalE) {
						enemy = globalE[e];
						if (randomEnemyCheck(11*(e+1), enemy)) enemies.push(enemy);
					}
					
					if (l <= bottomLevel+1) {
						var earthE = EnemyConstants.getEnemies(EnemyConstants.enemyTypes.earth, enemyDifficulty, false, bottomLevelOrdinal, totalLevels);
						for(var e in earthE) {
						enemy = earthE[e];
						if (randomEnemyCheck(333*(e+1), enemy)) enemies.push(enemy);
						}
					}
					
					if (this.world[l][s].sunlit) {
						var sunE = EnemyConstants.getEnemies(EnemyConstants.enemyTypes.sunlit, enemyDifficulty, false, bottomLevelOrdinal, totalLevels);
						for(var e in sunE) {
						enemy = sunE[e];
						if (randomEnemyCheck(6666*(e+4)+2, enemy)) enemies.push(enemy);
						}
					}
					
					if (l >= topLevel-10) {
						var inhabitedE = EnemyConstants.getEnemies(EnemyConstants.enemyTypes.inhabited, enemyDifficulty, false, bottomLevelOrdinal, totalLevels);
						for(var e in inhabitedE) {
						enemy = inhabitedE[e];
						if (randomEnemyCheck(777*(e+2)^2, enemy)) enemies.push(enemy);
						} 
					}
					
					if (l >= topLevel-5) {
						var urbanE = EnemyConstants.getEnemies(EnemyConstants.enemyTypes.urban, enemyDifficulty, false, bottomLevelOrdinal, totalLevels);
						for(var e in urbanE) {
						enemy = urbanE[e];
						if (randomEnemyCheck(99*(e+1), enemy)) enemies.push(enemy);
						}     
					}
					
					if (enemies.length < 1) enemies.push(globalE[0]);
					
					var enemyS = l+"."+s + ":\t";
					var stats;
					for(var e in enemies) {
						stats = enemies[e].att + enemies[e].def;
						enemyS += enemies[e].name + "(" + stats + "), ";
					}
					// console.log(enemyS.slice(0,-2));
					}
				}
			//console.log("- - - ")
			}
			
			console.log("World enemies ready.");
			//this.printWorld(seed, [ "camp" ]);
		},
        
		
		getBottomLevel: function (seed) {
			return 3 - Math.ceil(this.random(seed)*6);
		},
		
		getHighestLevel: function (seed) {
            var bottomLevel = this.getBottomLevel(seed);
			return Math.max(bottomLevel+WorldCreatorConstants.LEVEL_NUMBER_MIN-1, 14+WorldCreatorConstants.CAMPS_AFTER_GROUND);
		},
		
		getLevelOrdinal: function(seed, level) {
			if (level > 13) {
                var bottomLevel = this.getBottomLevel(seed);
                var bottomLevelOrdinal = this.getLevelOrdinal(seed, bottomLevel);
                return bottomLevelOrdinal + (level - 13);
			} else {
                return -level + 14;
            }
		},
		
		getLevelOrdinalFromCampOrdinal: function (campOrdinal) {
			var levelOrdinal = 1;
			// TODO calculate level ordinal from camp ordinal
			return levelOrdinal;
		},
		
		getCampOrdinal: function (seed, level) {
            var camplessLevelOrdinals = this.getCamplessLevelOrdinals(seed);
			var levelOrdinal = this.getLevelOrdinal(seed, level);
			var ordinal = 0;
			for (var i = 0; i < levelOrdinal; i++) {
				if (camplessLevelOrdinals.indexOf(i) < 0) ordinal++;
			}
			return ordinal;
		},
		
		getFirstSector: function (seed, level) {
			return WorldCreatorConstants.FIRST_SECTOR;
		},
		
		getLastSector: function (seed, level) {
			return WorldCreatorConstants.LAST_SECTOR;
		},
        
        isCampableLevel: function (seed, level) {
            var camplessLevelOrdinals = this.getCamplessLevelOrdinals(seed);            
            var levelOrdinal = this.getLevelOrdinal(seed, level);
            return camplessLevelOrdinals.indexOf(levelOrdinal) < 0;
        },
		
		getCamplessLevelOrdinals: function (seed) {
            var camplessLevelOrdinals = [];
            
            var camplessLvlFreq;
            var camplessLvlFreqSmall;
            var camplessLvlFreqBig;
            var numCamplessLvls;
            var groundLvlOrdinal = this.getLevelOrdinal(seed, this.getBottomLevel(seed));
			var totalLevels = this.getHighestLevel(seed) - this.getBottomLevel(seed) + 1;
			
			// before ground
			numCamplessLvls = groundLvlOrdinal - WorldCreatorConstants.CAMPS_BEFORE_GROUND;
			camplessLvlFreq = (groundLvlOrdinal-3)/(numCamplessLvls);
			camplessLvlFreqSmall = camplessLvlFreq < 2 ? 1 : camplessLvlFreq;
			camplessLvlFreqBig = Math.max(2, camplessLvlFreq);
			for (var i = 1; i <= numCamplessLvls; i++) {
				 if(i == 1)
					camplessLevelOrdinals.push(groundLvlOrdinal - Math.floor(camplessLvlFreqSmall));
				 else if(i == 2)
					camplessLevelOrdinals.push(Math.ceil(groundLvlOrdinal - camplessLvlFreqSmall * 2));
				 else
					camplessLevelOrdinals.push(Math.ceil(camplessLevelOrdinals[camplessLevelOrdinals.length-1] - camplessLvlFreqBig));
			}
			
			// after ground	
			var numLevelsAfterGround = totalLevels - groundLvlOrdinal;
			numCamplessLvls = numLevelsAfterGround - WorldCreatorConstants.CAMPS_AFTER_GROUND;
			camplessLvlFreq = (numLevelsAfterGround-1)/(numCamplessLvls);
			camplessLvlFreqSmall = camplessLvlFreq < 2 ? 1 : camplessLvlFreq;
			camplessLvlFreqBig = Math.max(2, camplessLvlFreq);
			for (var i = 1; i <= numCamplessLvls; i++) {
				 if(i == 1)
					camplessLevelOrdinals.push(groundLvlOrdinal + 1);
				 else if(i == 2)
					camplessLevelOrdinals.push(Math.ceil(groundLvlOrdinal + camplessLvlFreqSmall));
				 else
					camplessLevelOrdinals.push(Math.floor(camplessLevelOrdinals[camplessLevelOrdinals.length-1] + camplessLvlFreqBig));
			}
			
			return camplessLevelOrdinals;
		},
		
		isDarkLevel: function (seed, level) {
			return !this.isEarthLevel(seed, level) && !this.isSunLevel(seed, level);
		},
		
		isEarthLevel: function( seed, level ) {
			var lowest = this.getBottomLevel(seed, level);
			return level <= Math.min(lowest + 5, 3);
		},
		
		isSunLevel: function( seed, level ) {
			var highest = this.getHighestLevel(seed, level);
			return level >= highest - 5;
		},
		
		// !! Functions that require that prepareWorld has been called first below this
		
		getPassageUp: function( level, sector ) {
			var def = this.world[level][sector];
			if (def.passageUp) return def.passageUp;
			return null;
		},
		
		getPassageDown: function( level, sector ) {
			var def = this.world[level][sector];
			if (def.passageDown) return def.passageDown;
			return null;
		},
		
		getBlockerLeft: function( level, sector ) {
			var def = this.world[level][sector];
			if (def.blockerLeft) return def.blockerLeft;
			return 0;
		},
		
		getBlockerRight: function( level, sector ) {
			var def = this.world[level][sector];
			if (def.blockerRight) return def.blockerRight;
			return 0;
		},
		
		getSectorType: function(seed, level, sector) {
			var topLevel = this.getHighestLevel(seed);
			var sectorType = WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE;
			if (level > topLevel - 5) {
				// Recent mostly residential and commercial area
				sectorType = WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL;
				if (this.random(seed*level*sector+5) < 0.3) sectorType = WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL; 
				if (this.random(seed*level*sector+5) < 0.05) sectorType = WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL; 
			} else if (level > topLevel - 7) {
				// Recent industrial and maintenance area
				sectorType = WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL;
				if (this.random(seed*level*sector+2) < 0.4) sectorType = WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE; 
				if (this.random(seed*level*sector+2) < 0.15) sectorType = WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL; 
			} else if (level > topLevel - 10) {
				// Recent slums & maintenance
				sectorType = WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE;
				if (this.random(seed*level*sector+5) < 0.3) sectorType = WorldCreatorConstants.SECTOR_TYPE_SLUM; 
			} else {
				// Old levels: mix of slum, maintenance, and everything else
				sectorType = WorldCreatorConstants.SECTOR_TYPE_SLUM;
				if (this.random(seed*level*sector*4) < 0.4) sectorType = WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL; 
				if (this.random(seed*level*sector*4) < 0.3) sectorType = WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE; 
				if (this.random(seed*level*sector*4) < 0.2) sectorType = WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL;
				if (this.random(seed*level*sector*4) < 0.1) sectorType = WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL; 
			}
			return sectorType;
		},
		
		getSectorFeatures: function (level, sector) {
			var def = this.world[level][sector];
			var sectorFeatures = {};
			sectorFeatures.buildingDensity = def.buildingDensity;
			sectorFeatures.stateOfRepair = def.stateOfRepair;
			sectorFeatures.sunlit = def.sunlit;
			sectorFeatures.sectorType = def.sectorType;	    
			sectorFeatures.resources = def.resources;
            sectorFeatures.campable = def.campableLevel;
			return sectorFeatures;
		},
		
		getLocales: function (level, sector) {
			return this.world[level][sector].locales;
		},
		
		getSectorEnemies: function( level, sector ) {
			return this.world[level][sector].enemies;
		},
		
		getSectorEnemyCount: function(level, sector) {
			return this.world[level][sector].enemies.length > 0 ? 5 : 0;
		},
		
		// Helper functions for randomisation, seeds etc below this
		
		printWorld: function(seed, keys) {
			console.log("Print world, seed: " + seed + ", attributes: " + keys)
			var print = "";
			for(var i = this.getHighestLevel(seed); i >= this.getBottomLevel(seed); i--) {
			print += i + "\t[ ";
			for(var s = this.getFirstSector(seed, i); s <= this.getLastSector(seed, i); s++) {
				print += "[";
				var def = this.world[i][s];
				for (var k = 0; k < keys.length; k++) {
				var key = keys[k];
				var keySplit = key.split(".");
				if (keySplit.length == 1) {
					if(def[key] || def[key] == 0) print += def[key] + " ";
				} else {
					if(def[keySplit[0]][keySplit[1]] || def[keySplit[0]][keySplit[1]] == 0) print += def[keySplit[0]][keySplit[1]] + " ";
				}
				}
				if(print.charAt(print.length-1) != "[") print = print.substring(0, print.length-1);
				print += "]\t";		    
			}
			print = print.substring(0, print.length - 1);
			print += " ]\n";
			}
			console.log(print.trim());
		},
		
		// Pseudo-random array of min (inclusive) to max (exclusive) sectors from the sector pos
		// range of firstSector to lastSector, optionally excluding sectors with the given feature
		randomSectors: function(seed, level, firstSector, lastSector, min, max, excludingFeature) {
			var sectors = [];
			var numSectors = Math.min(this.randomInt(seed, min, max), (lastSector - firstSector));
			var world = this.world;
			var checkExclusion = function(sector) {
			if (excludingFeature) {
				return !world[level][sector][excludingFeature];
			}
			return true;
			};
			
			// pick sectors
			for(var i = 0; i < numSectors; i++) {
			var sector;
			var additionalRandom = 0;
			do {
				sector = this.randomInt(seed*7*i^3+additionalRandom+seed, firstSector, lastSector+1);
				additionalRandom++;
			} while(sectors.indexOf(sector) >= 0 || !checkExclusion(sector));
			
				sectors.push(sector);
			}
			
			return sectors;
		},
		
		// Pseudo-random int between min (inclusive) and max (exclusive)
		randomInt: function(seed, min, max) {	    
			return Math.min(max-1, Math.floor(this.random(seed) * (max - min + 1)) + min);
		},
		
		// Pseudo-random number based on the seed, evenly distributed between 0-1
		random: function (seed) {
			var mod1 = 7247;
			var mod2 = 7823;
			var result = (seed*seed) % (mod1*mod2);
			return result/(mod1*mod2);
		},
		
		getNewSeed: function() {
			return Math.round(Math.random() * 10000);
		}
        
    };

    return WorldCreator;
});
