// Random and seed related functions for the WorldCreator
define(['ash', 'utils/PathFinding', 'game/constants/PositionConstants', 'game/constants/GameConstants', 'game/vos/PositionVO'], 
function (Ash, PathFinding, PositionConstants, GameConstants, PositionVO) {

    var WorldCreatorRandom = {
		
		// Pseudo-random array of min (inclusive) to max (exclusive) existing sectors, optionally excluding sectors with the given feature
        // pathStartPos and pathMaxLen are optional arrays and all paths must be satisfied if present
		randomSectors: function (seed, worldVO, levelVO, min, max, requireCentral, excludingFeature, pathStartPos, pathMaxLen) {
			var sectors = [];
			var numSectors = this.randomInt(seed, min, max);
			var checkExclusion = function (sectorVO) {
                if (!sectorVO) return false;
				if (excludingFeature) {
					return !sectorVO[excludingFeature];
				}
				return true;
			};
			
			// pick sectors
			for (var i = 0; i < numSectors; i++) {
				var sector;
				var additionalRandom = 0;
				do {
					sector = this.randomSector(seed * 7 * i % 3 + additionalRandom + seed, worldVO, levelVO, requireCentral, pathStartPos, pathMaxLen);
					additionalRandom++;
				} while (sectors.indexOf(sector) >= 0 || !checkExclusion(sector));
				sectors.push(sector);
			}
			
			return sectors;
		},
		
		randomDirections: function (seed, num, includeDiagonals) {
			var directions = [];
			
			for (var i = 0; i < num; i++) {
				var direction;
				var additionalRandom = 0;
				do {
					direction = this.randomInt(seed*i^37+additionalRandom+seed*i+i+seed*num+seed, 1, includeDiagonals ? 9 : 5);
					additionalRandom += 39;
				} while(directions.indexOf(direction) >= 0);
				directions.push(direction);
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
		
		// Pseudo-random sector position on the given level, within the given area (distance from 0,0)
		randomSectorPosition: function (seed, level, areaSize) {
			var sectorX = this.randomInt(seed * 335, -areaSize, areaSize + 1);
			var sectorY = this.randomInt(seed * 7812 + level, -areaSize, areaSize + 1);
			return new PositionVO(level, sectorX, sectorY);
		},
		
		// Pseudo-random existing sector on the given level
        // pathStartPos and pathMaxLen are arrays and all paths must be satisfied if present
		randomSector: function (seed, worldVO, levelVO, isCentral, pathStartPos, pathMaxLen) {
            var sectors = isCentral ? levelVO.centralSectors : levelVO.sectors;
            
            if (!pathStartPos || !pathMaxLen || pathStartPos.length === 0) {
                return sectors[Math.floor(this.random(seed) * sectors.length)];
            }
            
            if (pathStartPos.length !== pathMaxLen.length) {
                console.log("WARN: paths for randomSector incorrectly configured");
            }
            
            var sector;
            for (var i = 0; i < 100; i++) {
                sector = sectors[Math.floor(this.random(seed + (i + 1) * 3) * sectors.length)];
                for (var j = 0; j < pathStartPos.length; j++) {
                    var pathLen = this.findPath(worldVO, pathStartPos[j], sector.position).length;
                    if (pathLen > pathMaxLen[j]) break;
                    if (pathLen <= 0) break;
                    return sector;
                }
            }
            
            console.log("WARN: Failed to find random sector that fulfills requirements. Returning random sector.");
            return null;
		},
		
		// Pseudo-random int between min (inclusive) and max (exclusive)
		randomInt: function (seed, min, max) {
            if (!isFinite(seed) || isNaN(seed)) {
                throw new Error("Invalid seed for WorldCreatorRandom.randomInt");
            }
			return Math.floor(Math.min(max - 1, Math.floor(this.random(seed) * (max - min + 1)) + min));
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
        
        findPath: function (worldVO, startPos, endPos) {
            if (!startPos) {
                console.log("WARN: No start pos defined.");
            }
            
            if (!endPos) {
                console.log("WARN: No goal pos defined.");
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
                    return makePathSectorVO(levelVO.findPassageOown().position);
                },
                findPassageUp: function (level) {
                    var levelVO = worldVO.getLevel(level);
                    return makePathSectorVO(levelVO.findPassageUp().position);
                },
                getSectorByPosition: function (level, sectorX, sectorY) {
                    return makePathSectorVO(new PositionVO(level, sectorX, sectorY));
                },
                getSectorNeighboursMap: function (pathSectorVO) {
                    var levelVO = worldVO.getLevel(pathSectorVO.position.level);
                    return levelVO.getNeighbours(pathSectorVO.result.sectorX, pathSectorVO.result.sectorY, 
                        function (sector) { return makePathSectorVO(sector.position); 
                    });
                },
                isBlocked: function (pathSectorVO, direction) {
                    var levelVO = worldVO.getLevel(pathSectorVO.position.level);
                    return levelVO.getNeighbours(pathSectorVO.result.sectorX, pathSectorVO.result.sectorY)[direction];
                }
            };
            var settings = { includeUnbuiltPassages: true, skipUnvisited: false, skipBlockers: false };
            
            return PathFinding.findPath(startVO, goalVO, utilities, settings);
        },
        
    };

    return WorldCreatorRandom;
});
