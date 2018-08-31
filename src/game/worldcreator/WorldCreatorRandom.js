// Random and seed related functions for the WorldCreator
define(['ash', 'utils/PathFinding', 'game/constants/PositionConstants', 'game/constants/GameConstants', 'game/vos/PositionVO'], 
function (Ash, PathFinding, PositionConstants, GameConstants, PositionVO) {

    var WorldCreatorRandom = {
		
		// Pseudo-random array of min (inclusive) to max (exclusive) existing sectors, optionally excluding sectors with the given feature
		randomSectors: function (seed, levelVO, min, max, requireCentral, excludingFeature) {
			var sectors = [];
			var numSectors = this.randomInt(seed, min, max);
			var checkExclusion = function (sectorVO) {
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
					sector = this.randomSector(seed * 7 * i % 3 + additionalRandom + seed, levelVO, requireCentral);
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
		randomSector: function (seed, levelVO, isCentral) {
			if (isCentral)
				return levelVO.centralSectors[Math.floor(this.random(seed * 76) * levelVO.centralSectors.length)];
			else
				return levelVO.sectors[Math.floor(this.random(seed * 76) * levelVO.sectors.length)];
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
        
        findPath: function (levelVO, startPos, endPos) {
            if (startPos.level !== levelVO.level || endPos.level !== levelVO.level) {
                console.log("findPath only supports positions on the same level!")
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
                findPassageDown: function (level, includeUnbuilt) {
                    // todo implement
                    return makePathSectorVO(null);
                },
                findPassageUp: function (level, includeUnbuilt) {
                    // todo implement
                    return makePathSectorVO(null);
                },
                getSectorByPosition: function (level, sectorX, sectorY) {
                    return makePathSectorVO(new PositionVO(level, sectorX, sectorY));
                },
                getSectorNeighboursMap: function (pathSectorVO) {
                    return levelVO.getNeighbours(pathSectorVO.result.sectorX, pathSectorVO.result.sectorY, 
                        function (sector) { return makePathSectorVO(sector.position); 
                    });
                },
                isBlocked: function (pathSectorVO, direction) {
                    return levelVO.getNeighbours(pathSectorVO.result.sectorX, pathSectorVO.result.sectorY)[direction];
                }
            };
            
            var settings = { includeUnbuiltPassages: true, skipUnvisited: false, skipBlockers: false };
            
            return PathFinding.findPath(startVO, goalVO, utilities, settings);
        },
        
    };

    return WorldCreatorRandom;
});
