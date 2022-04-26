// Random and seed related functions for the WorldCreator
define([
	'ash',
	'utils/MathUtils',
	'utils/PathFinding',
	'worldcreator/WorldCreatorLogger',
	'game/constants/PositionConstants',
	'game/constants/GameConstants',
	'game/constants/MovementConstants',
	'game/constants/WorldConstants',
	'game/vos/PositionVO',
	'game/vos/PathConstraintVO'],
function (Ash, MathUtils, PathFinding, WorldCreatorLogger, PositionConstants, GameConstants, MovementConstants, WorldConstants, PositionVO, PathConstraintVO) {

	var WorldCreatorRandom = {
		
		// Pseudo-random array of min (inclusive) to max (exclusive) existing sectors
		// options:
		// - excludingFeature (string/array): exclude sectors that have this featue (for example "isCamp")
		// - excludedZones (array of strings): exclude sectors assigned to give zone
		// - pathConstraints (array of PathConstraintVO): all paths must be satisfied if present
		// - numDuplicates (int): how many of the returned sectors can be the same (default 1 -> no duplicates) (0 -> no limit)
		// - filter (function) custom filter to reject any sector (sector => bool)
		randomSectors: function (seed, worldVO, levelVO, min, max, options) {
			var sectors = [];
			var numSectors = this.randomInt(seed, min, max);
			
			// pick sectors (use different algorithm depending on if we need to find a few or a lot of sectors)
			var availableSectors = levelVO.sectors;
			if (numSectors < 0.15 * availableSectors.length) {
				sectors = this.getRandomSectorsSmall(seed, worldVO, levelVO, numSectors, options);
			} else {
				sectors = this.getRandomSectorsBig(seed, worldVO, levelVO, numSectors, options);
			}
			
			return sectors;
		},
		
		getRandomSectorsSmall: function (seed, worldVO, levelVO, numSectors, options) {
			var maxDuplicates = options.numDuplicates || 1;
			let result = [];
			var selectedSectors = {}; // id -> times selected
			var checkedSectors = {}; // id -> times checked
			
			var rejectedByReason = {};
			
			var addRejection = function (sectorVO, reason) {
				if (!rejectedByReason[reason]) {
					rejectedByReason[reason] = 0;
				}
				rejectedByReason[reason]++;
			};
			
			var checkDuplicates = function (sectorVO) {
				if (maxDuplicates === 0) return true;
				if (!sectorVO) return false;
				if (selectedSectors[sectorVO.id] && selectedSectors[sectorVO.id] >= maxDuplicates) {
					addRejection(sectorVO, "duplicate");
					return false;
				}
				return true;
			};
			
			var checkExclusion = function (sectorVO) {
				let reason = WorldCreatorRandom.getSectorInvalidReason(worldVO, sectorVO, options);
				if (reason) {
					addRejection(sectorVO, reason);
					return false;
				}
				return true;
			};
			
			for (let i = 0; i < numSectors; i++) {
				var sector;
				var additionalRandom = 0;
				do {
					var s1 = seed + (i + 1) * 369 + additionalRandom * 55;
					sector = this.randomSector(s1, worldVO, levelVO, options.requireCentral, options.pathConstraints);
					
					if (!checkedSectors[sector.id]) checkedSectors[sector.id] = 0;
					checkedSectors[sector.id]++;
					
					additionalRandom++;
					if (additionalRandom > 500) {
						WorldCreatorLogger.w("getRandomSectorsSmall: Couldn't find random sector " + (i+1) + "/" + numSectors + " (level: " + levelVO.level + ") | " + s1 + " " + seed);
						WorldCreatorLogger.i(options);
						WorldCreatorLogger.i(selectedSectors);
						WorldCreatorLogger.i(checkedSectors);
						WorldCreatorLogger.i(rejectedByReason);
						return result;
					}
				} while (!checkDuplicates(sector) || !checkExclusion(sector));
				
				result.push(sector);
				if (!selectedSectors[sector.id]) selectedSectors[sector.id] = 0;
				selectedSectors[sector.id]++;
			}
			return result;
		},
		
		getRandomSectorsBig:function (seed, worldVO, levelVO, numSectors, options) {
			var sectors = [];
			var availableSectors = levelVO.sectors;
			var maxDuplicates = options.numDuplicates || 1;

			// map possible sectors
			var checkExclusion = function (sectorVO) {
				return WorldCreatorRandom.getSectorInvalidReason(worldVO, sectorVO, options) == null;
			};
			var possibleSectors = [];
			for (let i = 0; i < availableSectors.length; i++) {
				if (checkExclusion(availableSectors[i])) {
					for (let j = 0; j < maxDuplicates; j++) {
						possibleSectors.push(availableSectors[i]);
					}
				}
			}
			
			if (numSectors > possibleSectors.length) {
				WorldCreatorLogger.w("Not enough valid sectors (" + possibleSectors.length + ") to pick random sectors (" + numSectors + ") (level: " + levelVO.level + ")");
				return possibleSectors;
			}
			
			// pick some from possible sectors
			for (let i = 0; i < possibleSectors.length; i++) {
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
		
		getSectorInvalidReason: function (worldVO, sectorVO, options) {
			if (!sectorVO) return "null sector";
			
			if (WorldCreatorRandom.sectorHasExcludedFeatures(options.excludingFeature, sectorVO)) {
				return "excluding feature: " + options.excludingFeature;
			}
			
			if (options.excludedZones) {
				for (let i = 0; i < options.excludedZones.length; i++) {
					if (sectorVO.zone == options.excludedZones[i]) {
						return "excluded zone: " + options.excludedZones[i];
					}
				}
			}
			
			if (options.filter) {
				if (!options.filter(sectorVO)) {
					return "filter";
				}
			}
			
			if (!WorldCreatorRandom.checkPathRequirements(worldVO, sectorVO, options.pathConstraints)) {
				return "path requirements";
			}
				
			return null;
		},
		
		sectorHasExcludedFeatures: function (excludingFeature, sectorVO) {
			if (!sectorVO) return false;
			if (!excludingFeature) return false;
			
			if (typeof excludingFeature === "string") {
				return this.sectorHasExcludedFeature(excludingFeature, sectorVO);
			} else {
				for (let i = 0; i < excludingFeature.length; i++) {
					if (this.sectorHasExcludedFeature(excludingFeature[i], sectorVO)) {
						return true;
					}
				}
			}
			
			return false;
		},
		
		sectorHasExcludedFeature: function (excludingFeature, sectorVO) {
			let result = sectorVO[excludingFeature];
			return result;
		},
		
		randomDirections: function (seed, num, includeDiagonals) {
			var directions = [];
			if (!num || num === 0) return directions;
			var options = PositionConstants.getLevelDirections(!includeDiagonals);
			
			for (let i = 0; i < num; i++) {
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
			for (let i = 0; i < directionOrder.length; i++) {
				var direction = directionOrder[i];
				var directionNeighbourPos = PositionConstants.getPositionOnPath(sectorVO.position, direction, 1);
				var directionNeighbour = levelVO.getSector(directionNeighbourPos.sectorX, directionNeighbourPos.sectorY);
				if (directionNeighbour) neighbour = directionNeighbour;
			}
			return neighbour;
		},
		
		// Pseudo-random sector position on the given level, with a check for validity and look for nearby positions of position is not valid
		randomSectorPositionWithCheck: function (seed, id, level, areaSize, centerPos, minDist, check) {
			var getAlternative = function (i) {
				var res = WorldCreatorRandom.randomSectorPosition(seed + i, level, areaSize, centerPos, minDist);
				return res;
			};
			return this.randomResultWithCheck(seed, id, getAlternative, check);
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
			let result = new PositionVO(level, Math.round(centerPos.sectorX + sectorX), Math.round(centerPos.sectorY + sectorY));
			return result;
		},
		
		// Pseudo-random existing sector on the given level
		// pathConstraints is an array of PathConstraintVOs and all paths must be satisfied if present
		randomSector: function (seed, worldVO, levelVO, isCentral, pathConstraints) {
			var sectors = levelVO.sectors;
			var startIndex = Math.floor(this.random(seed) * sectors.length);
			
			if (!pathConstraints || pathConstraints.length === 0) {
				return sectors[startIndex];
			}
			
			var index = startIndex;
			var sector;
			for (let i = 0; i < sectors.length; i++) {
				sector = sectors[index];
				if (this.checkPathRequirements(worldVO, sector, pathConstraints)) {
					return sector;
				}
				index++;
				if (index >= sectors.length) index = 0;
			}
			
			// print some debug info about the failed sector and paths
			WorldCreatorLogger.w("Failed to find random sector that fulfills requirements: central: " + isCentral + ", " + (pathConstraints ? pathConstraints.length : 0) + " paths, " + sectors.length + " sectors (level: " + levelVO.level + ")");
			var fails = [];
			for (let j = 0; j < pathConstraints.length; j++) {
				fails[j] = 0;
				for (let i = 0; i < sectors.length; i++) {
					var sector = sectors[i];
					if (!this.checkPathRequirements(worldVO, sector, [ pathConstraints[j] ], true)) {
						fails[j]++;
					}
				}
				WorldCreatorLogger.i("- " + pathConstraints[j].pathType + " max len " + pathConstraints[j].maxLength + ", start pos " + pathConstraints[j].startPosition + ": " + fails[j] + "/" + sectors.length + " fails");
			}
			return null;
		},
		
		checkPathRequirements: function (worldVO, sector, pathConstraints, logFails) {
			if (!pathConstraints || pathConstraints.length === 0) return true;
			for (let j = 0; j < pathConstraints.length; j++) {
				if (pathConstraints[j].maxLength <= 0) {
					WorldCreatorLogger.w("Max path length is <= 0, skipping check.");
					continue;
				}
				// check min possible path distance before doing pathfinding
				var dist = PositionConstants.getBlockDistanceTo(pathConstraints[j].startPosition, sector.position);
				if (dist > pathConstraints[j].maxLength) {
					if (logFails) WorldCreatorLogger.i("path distance too long: " + pathLen + " / " + pathConstraints[j].maxLength + ", start: " + pathConstraints[j].startPosition + ", candidate " + sector.position);
					return false;
				}
				// check path
				var path = this.findPath(worldVO, pathConstraints[j].startPosition, sector.position, false, true, null, false, pathConstraints[j].maxLength);
				if (!path) return false;
				var pathLen = path.length;
				if (pathLen > pathConstraints[j].maxLength) {
					if (logFails) WorldCreatorLogger.i("path too long: " + pathLen + " / " + pathConstraints[j].maxLength + ", start: " + pathConstraints[j].startPosition + ", candidate " + sector.position);
					return false;
				}
				if (pathLen <= 0) return false;
			}
			return true;
		},
		
		getProbabilityFromFactors: function (factors) {
			if (factors.length == 0) {
				WorldCreatorLogger.w("no factors for getProbabilityFromFactors");
				return 0.5;
			}
			let total = 0;
			for (let i = 0; i < factors.length; i++) {
				let factor = factors[i];
				let value = factor.value;
				if (typeof(value) == "boolean") {
					total += value ? 1 : 0;
				} else {
					total += MathUtils.map(value, factor.min || 0, factor.max || 1, 0, 1);
				}
			}
			
			return total / factors.length;
		},
		
		// get random result with a validity check function, try max 99 times with different seeds, keep track of fails
		randomResultWithCheck: function (seed, id, resultFunc, checkFunc) {
			// set up failed result bookeeping
			var failReasons = {};
			var failResults = [];
			var checkResult = function (r) {
				var checkResult = checkFunc(r);
				if (!checkResult.isValid) {
					var reason = checkResult.reason || "unknown";
					var details = checkResult.details || "-";
					if (!failReasons[reason]) failReasons[reason] = { details: [], count: 0};
					failReasons[reason].count++
					if (details) failReasons[reason].details.push(details);
					failResults.push(r + " | " + reason + " " + details);
				}
				return checkResult.isValid;
			};
			// try to find a valid result
			var maxtries = 99;
			let result = null;
			for (let i = 0; i < maxtries; i++) {
				result = resultFunc(i);
				if (checkResult(result)) {
					return result;
				}
			}
			
			// no valid result found, print fail reasons and return something
			WorldCreatorLogger.w("randomResultWithCheck [" + id + "] ran out of tries, returning invalid result");
			WorldCreatorLogger.i(failReasons);
			//WorldCreatorLogger.i(failResults)
			
			return result;
		},
		
		getRandomItemFromArray: function (seed, array) {
			let index = this.randomInt(seed, 0, array.length);
			return array[index];
		},
		
		getRandomIntFromRange: function (seed, range) {
			let isRange = typeof(range) !== "number";
			if (!isRange) return range;
			let min = Math.round(range[0])
			let max = Math.round(range[1]);
			return WorldCreatorRandom.randomInt(seed, min, max);
		},
		
		// Pseudo-random int between min (inclusive) and max (exclusive)
		randomInt: function (seed, min, max) {
			if (!isFinite(seed) || isNaN(seed)) {
				throw new Error("Invalid seed for WorldCreatorRandom.randomInt: " + seed);
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
			let result = (seed*seed) % (mod1*mod2);
			return result/(mod1*mod2);
		},
		
		getNewSeed: function() {
			return Math.round(Math.random() * 10000);
		},
		
		// anyPath: if true, not necessarily SHORTEST path, just one known to exist
		findPath: function (worldVO, startPos, endPos, blockByBlockers, omitWarnings, stage, anyPath, maxLength) {
			if (!startPos) {
				WorldCreatorLogger.w("No start pos defined.");
			}
			
			if (!endPos) {
				WorldCreatorLogger.w("No goal pos defined.");
			}
			
			if (startPos.equals(endPos)) {
				return [];
			}
			
			var cachedPath = this.getCachedPath(worldVO, startPos, endPos, blockByBlockers, stage, anyPath);
			if (cachedPath) {
				//log.i("got cached path " + startPos + " to " + endPos);
				return cachedPath;
			}
			
			var makePathSectorVO = function (position) {
				if (!position) return null;
				var levelVO = worldVO.getLevel(position.level);
				if (!levelVO.hasSector(position.sectorX, position.sectorY)) return null;
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
					let result = levelVO.findPassageDown();
					return result ? makePathSectorVO(result.position) : null;
				},
				findPassageUp: function (level) {
					var levelVO = worldVO.getLevel(level);
					let result = levelVO.findPassageUp();
					return result ? makePathSectorVO(result.position) : null;
				},
				getSectorByPosition: function (level, sectorX, sectorY) {
					var levelVO = worldVO.getLevel(level);
					return makePathSectorVO(new PositionVO(level, sectorX, sectorY));
				},
				getSectorNeighboursMap: function (pathSectorVO) {
					var levelVO = worldVO.getLevel(pathSectorVO.position.level);
					var raw = levelVO.getNeighbours(pathSectorVO.result.sectorX, pathSectorVO.result.sectorY, stage);
					var wrapped = {};
					for (var dir in raw) {
						wrapped[dir] = makePathSectorVO(raw[dir].position);
					}
					return wrapped;
				},
				isBlocked: function (pathSectorVO, direction) {
					if (!blockByBlockers) return false;
					var levelVO = worldVO.getLevel(pathSectorVO.position.level);
					var sectorVO = levelVO.getSector(pathSectorVO.position.sectorX, pathSectorVO.position.sectorY);
					if (sectorVO.getBlockerByDirection(direction)) return true;
					return false;
				}
			};
			var settings = { includeUnbuiltPassages: true, skipUnvisited: false, skipBlockers: blockByBlockers, omitWarnings: omitWarnings, maxLength: maxLength };
			
			let result = PathFinding.findPath(startVO, goalVO, utilities, settings);
			
			this.addCachedPath(worldVO, startPos, endPos, blockByBlockers, stage, result);
			
			return result;
		},
		
		getCachedPath: function (worldVO, startPos, endPos, blockByBlockers, stage, anyPath) {
			let res = worldVO.getPath(startPos, endPos, blockByBlockers, stage, anyPath);
			if (res) return res;
			if (!stage) {
				res = worldVO.getPath(startPos, endPos, blockByBlockers, WorldConstants.CAMP_STAGE_EARLY, anyPath)
					|| worldVO.getPath(startPos, endPos, blockByBlockers, WorldConstants.CAMP_STAGE_LATE, anyPath);
			}
			return res;
		},
		
		addCachedPath: function (worldVO, startPos, endPos, blockByBlockers, stage, path) {
			if (path) {
				// cache path and subpaths
				for (var p = path.length; p > 0; p--) {
					let subPath = path.slice(0, p);
					let subPathEndPos = subPath[subPath.length - 1];
					worldVO.addPath(startPos, subPathEndPos, blockByBlockers, stage, subPath);
				}
			} else {
				// only cache the fact that there is no path
				worldVO.addPath(startPos, endPos, blockByBlockers, stage, path);
			}
		},
		
	};

	return WorldCreatorRandom;
});
