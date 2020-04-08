// Random and seed related functions for the WorldCreator
define([
    'ash',
    'utils/PathFinding',
    'game/constants/PositionConstants',
    'game/constants/GameConstants',
    'game/constants/MovementConstants',
    'game/vos/PositionVO',
    'game/vos/PathConstraintVO'],
function (Ash, PathFinding, PositionConstants, GameConstants, MovementConstants, PositionVO, PathConstraintVO) {

    var WorldCreatorRandom = {
		
		// Pseudo-random array of min (inclusive) to max (exclusive) existing sectors
        // options:
        // - requireCentral (boolean): only include central sectors (default false)
        // - excludingFeature (string): exclude sectors that have this featue (for example "camp")
        // - excludedZones (array of strings): exclude sectors assigned to give zone
        // - pathConstraints (array of PathConstraintVO): all paths must be satisfied if present
        // - numDuplicates (int): how many of the returned sectors can be the same (default 1 -> no duplicates) (0 -> no limit)
		randomSectors: function (seed, worldVO, levelVO, min, max, options) {
			var sectors = [];
			var numSectors = this.randomInt(seed, min, max);
            
			// pick sectors (use different algorithm depending on if we need to find a few or a lot of sectors)
            var availableSectors = options.requireCentral ? levelVO.centralSectors : levelVO.sectors;
            if (numSectors < 0.15 * availableSectors.length) {
                sectors = this.getRandomSectorsSmall(seed, worldVO, levelVO, numSectors, options);
            } else {
                sectors = this.getRandomSectorsBig(seed, worldVO, levelVO, numSectors, options);
            }
			
			return sectors;
		},
        
        getRandomSectorsSmall: function (seed, worldVO, levelVO, numSectors, options) {
            var sectors = [];
            var counts = {};
            
            var maxDuplicates = options.numDuplicates || 1;
            var checkDuplicates = function (sectorVO) {
                if (maxDuplicates === 0) return true;
                if (!sectorVO) return false;
                if (counts[sectorVO.id] && counts[sectorVO.id] >= maxDuplicates) {
                    return false;
                }
                return true;
            };
			var checkExclusion = function (sectorVO) {
                if (!sectorVO) return false;
				if (options.excludingFeature && sectorVO[options.excludingFeature]) return false;
                if (options.excludedZones) {
                    for (var i = 0; i < options.excludedZones.length; i++) {
                        if (sectorVO.zone == options.excludedZones[i]) return false;
                    }
                }
				return true;
			};
			for (var i = 0; i < numSectors; i++) {
				var sector;
				var additionalRandom = 0;
				do {
					sector = this.randomSector(seed + (i + 1) * 369 + additionalRandom * 55, worldVO, levelVO, options.requireCentral, options.pathConstraints);
					additionalRandom++;
                    if (additionalRandom > 100) {
                        log.w("getRandomSectorsSmall: Couldn't find random sector " + (i+1) + "/" + numSectors + " (level: " + levelVO.level + ")");
                        log.i(options);
                        log.i(counts)
                        return sectors;
                    }
				} while (!checkDuplicates(sector) || !checkExclusion(sector));
                
				sectors.push(sector);
                if (!counts[sector.id]) counts[sector.id] = 0;
                counts[sector.id]++;
			}
            return sectors;
        },
        
        getRandomSectorsBig:function (seed, worldVO, levelVO, numSectors, options) {
            var sectors = [];
            var availableSectors = options.requireCentral ? levelVO.centralSectors : levelVO.sectors;
            var maxDuplicates = options.numDuplicates || 1;

            // map possible sectors
			var checkExclusion = function (sectorVO) {
                if (!sectorVO) return false;
				if (options.excludingFeature && sectorVO[options.excludingFeature]) {
					return false;
				}
                if (options.excludedZones) {
                    for (var i = 0; i < options.excludedZones.length; i++) {
                        if (sectorVO.zone == options.excludedZones[i]) return false;
                    }
                }
                if (!WorldCreatorRandom.checkPathRequirements(worldVO, sector, options.pathConstraints)) {
                    return false;
                }
				return true;
			};
            var possibleSectors = [];
			for (var i = 0; i < availableSectors.length; i++) {
                if (checkExclusion(availableSectors[i])) {
                    for (var j = 0; j < maxDuplicates; j++) {
                        possibleSectors.push(availableSectors[i]);
                    }
                }
            }
            
            if (numSectors > possibleSectors.length) {
                log.w("Not enough valid sectors (" + possibleSectors.length + ") to pick random sectors (" + numSectors + ") (level: " + levelVO.level + ")");
                return possibleSectors;
            }
            
            // pick some from possible sectors
			for (var i = 0; i < possibleSectors.length; i++) {
				var sector = possibleSectors[i];
                var numLeft = possibleSectors.length - i;
                var numLeftToPick = numSectors - sectors.length;
                var threshold = numLeftToPick / numLeft;
                if (threshold >= 1 || this.random(seed % 3 + (i+3)*5) < threshold) {
                    sectors.push(sector);
                }
                if (sectors.length === numSectors) break;
			}
            return sectors;
        },
		
		randomDirections: function (seed, num, includeDiagonals) {
			var directions = [];
            if (!num || num === 0) return directions;
            var options = PositionConstants.getLevelDirections(!includeDiagonals);
			
			for (var i = 0; i < num; i++) {
                var index = this.randomInt(seed*i^37+seed*i+i+seed*num+seed, 0, options.length);
                directions.push(options[index]);
                options.splice(index, 1);
			}
			
			return directions;
		},
		
		getRandomSectorNeighbour: function (seed, levelVO, sectorVO, includeDiagonals) {
			// TODO add a preference for non-camp sectors
			var neighbour = null;
			var directionOrder = this.randomDirections(seed * 3, 8, includeDiagonals);
			for (var i = 0; i < directionOrder.length; i++) {
				var direction = directionOrder[i];
				var directionNeighbourPos = PositionConstants.getPositionOnPath(sectorVO.position, direction, 1);
				var directionNeighbour = levelVO.getSector(directionNeighbourPos.sectorX, directionNeighbourPos.sectorY);
				if (directionNeighbour) neighbour = directionNeighbour;
			}
			return neighbour;
		},
		
		// Pseudo-random sector position on the given level, within the given area (distance from 0,0 or centerPos)
		randomSectorPosition: function (seed, level, areaSize, centerPos, minDist) {
            centerPos = centerPos || new PositionVO(level, 0, 0);
            minDist = minDist || 0;
			var sectorX = this.randomInt(seed * 335, -areaSize, areaSize + 1);
            if (sectorX > 0 && sectorX < minDist) sectorX = minDist;
            if (sectorX < 0 && sectorX > minDist) sectorX =- minDist;
			var sectorY = this.randomInt(seed * 7812 + level, -areaSize, areaSize + 1);
            if (sectorY > 0 && sectorY < minDist) sectorY = minDist;
            if (sectorY < 0 && sectorY > minDist) sectorY =- minDist;
            var result = new PositionVO(level, Math.round(centerPos.sectorX + sectorX), Math.round(centerPos.sectorY + sectorY));
			return result;
		},
		
		// Pseudo-random existing sector on the given level
        // pathConstraints is an array of PathConstraintVOs and all paths must be satisfied if present
		randomSector: function (seed, worldVO, levelVO, isCentral, pathConstraints) {
            var sectors = isCentral ? levelVO.centralSectors : levelVO.sectors;
            var startIndex = Math.floor(this.random(seed) * sectors.length);
            
            if (!pathConstraints || pathConstraints.length === 0) {
                return sectors[startIndex];
            }
            
            var index = startIndex;
            var sector;
            for (var i = 0; i < sectors.length; i++) {
                sector = sectors[index];
                if (this.checkPathRequirements(worldVO, sector, pathConstraints)) {
                    return sector;
                }
                index++;
                if (index >= sectors.length) index = 0;
            }
            
            // print some debug info about the failed sector and paths
            log.w("Failed to find random sector that fulfills requirements: central: " + isCentral + ", " + (pathConstraints ? pathConstraints.length : 0) + " paths, " + sectors.length + " sectors (level: " + levelVO.level + ")");
            var fails = [];
            for (var j = 0; j < pathConstraints.length; j++) {
                fails[j] = 0;
                for (var i = 0; i < sectors.length; i++) {
                    var sector = sectors[i];
                    if (!this.checkPathRequirements(worldVO, sector, [ pathConstraints[j] ], true)) {
                        fails[j]++;
                    }
                }
                log.i("- " + pathConstraints[j].pathType + " max len " + pathConstraints[j].maxLength + ", start pos " + pathConstraints[j].startPosition + ": " + fails[j] + "/" + sectors.length + " fails");
            }
            return null;
		},
        
        checkPathRequirements: function (worldVO, sector, pathConstraints, logFails) {
            if (!pathConstraints || pathConstraints.length === 0) return true;
            for (var j = 0; j < pathConstraints.length; j++) {
                if (pathConstraints[j].maxLength <= 0) {
                    log.w("Max path length is <= 0, skipping check.");
                    continue;
                }
                var path = this.findPath(worldVO, pathConstraints[j].startPosition, sector.position, false, true);
                if (!path) return false;
                var pathLen = path.length;
                if (pathLen > pathConstraints[j].maxLength) {
                    if (logFails) log.i("path too long: " + pathLen + " / " + pathConstraints[j].maxLength + ", start: " + pathConstraints[j].startPosition + ", candidate " + sector.position);
                    return false;
                }
                if (pathLen <= 0) return false;
            }
            return true;
        },
		
		// Pseudo-random int between min (inclusive) and max (exclusive)
		randomInt: function (seed, min, max) {
            if (!isFinite(seed) || isNaN(seed)) {
                throw new Error("Invalid seed for WorldCreatorRandom.randomInt");
            }
			return Math.floor(Math.min(max - 1, Math.floor(this.random(seed) * (max - min + 1)) + min));
		},
        
        randomBool: function (seed, probability) {
            probability = probability || 0.5;
            return this.random(seed) < probability;
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
		},
        
        findPath: function (worldVO, startPos, endPos, blockByBlockers, omitWarnings) {
            if (!startPos) {
                log.w("No start pos defined.");
            }
            
            if (!endPos) {
                log.w("No goal pos defined.");
            }
            
            var cachedPath = worldVO.getPath(startPos, endPos, blockByBlockers);
            if (cachedPath) {
                return cachedPath;
            }
             
            var makePathSectorVO = function (position) {
                if (!position) return null;
                return {
                    position: position,
                    isVisited: false,
                    result: position
                };
            };
            
            var startVO = makePathSectorVO(startPos);
            var goalVO = makePathSectorVO(endPos);
            
            var utilities = {
                findPassageDown: function (level) {
                    var levelVO = worldVO.getLevel(level);
                    var result = levelVO.findPassageDown();
                    return result ? makePathSectorVO(result.position) : null;
                },
                findPassageUp: function (level) {
                    var levelVO = worldVO.getLevel(level);
                    var result = levelVO.findPassageUp();
                    return result ? makePathSectorVO(result.position) : null;
                },
                getSectorByPosition: function (level, sectorX, sectorY) {
                    return makePathSectorVO(new PositionVO(level, sectorX, sectorY));
                },
                getSectorNeighboursMap: function (pathSectorVO) {
                    var levelVO = worldVO.getLevel(pathSectorVO.position.level);
                    return levelVO.getNeighbours(pathSectorVO.result.sectorX, pathSectorVO.result.sectorY, function (sector) {
                        return makePathSectorVO(sector.position);
                    });
                },
                isBlocked: function (pathSectorVO, direction) {
                    if (!blockByBlockers) return false;
                    var levelVO = worldVO.getLevel(pathSectorVO.position.level);
                    var sectorVO = levelVO.getSector(pathSectorVO.position.sectorX, pathSectorVO.position.sectorY);
                    if (sectorVO.getBlockerByDirection(direction)) return true;
                    return false;
                }
            };
            var settings = { includeUnbuiltPassages: true, skipUnvisited: false, skipBlockers: blockByBlockers, omitWarnings: omitWarnings };
            
            var result = PathFinding.findPath(startVO, goalVO, utilities, settings);
            
            worldVO.addPath(startPos, endPos, blockByBlockers, result);
            
            return result;
        },
        
    };

    return WorldCreatorRandom;
});
