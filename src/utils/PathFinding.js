define(function () {
	var PathFinding = {

		// startVO and goalVO must contain:
		// - position (PositionVO)
		// - isVisited (bool)
		// - result (object you want to be contained in the result if this sector is contained such as SectorVO or entity)
		// utilities must contain:
		// - findPassageDown (function (level, includeUnBuiltPassages))
		// - findPassageUp (function (level, includeUnBuiltPassages))
		// - getSectorByPosition (function (level, sectorX, sectorY))
		// - getSectorNeighboursMap (function (pathSectorVO))
		// - isBlocked (function (pathSectorVO, direction))
		// settings can contain:
		// - includeUnbuiltPassages (bool)
		// - skipUnvisited (bool)
		// - skipBlockers (bool)
		// - omitWarnings (bool)
		// - maxLength (int)
		findPath: function (startVO, goalVO, utilities, settings) {
			if (!startVO) {
				log.w("No start sector defined.");
				return null;
			}

			if (!goalVO) {
				log.w("No goal sector defined.");
				return null;
			}

			if (this.getKey(startVO) === this.getKey(goalVO)) return [];

			if (!settings) settings = {};

			// build paths spanning multiple levels from several pieces

			var startLevel = startVO.position.level;
			var goalLevel = goalVO.position.level;

			if (startLevel > goalLevel) {
				var passageDown = utilities.findPassageDown(startLevel, settings.includeUnbuiltPassages);
				if (passageDown) {
					var passageDownPos = passageDown.position;
					var passageUp = utilities.getSectorByPosition(passageDownPos.level - 1, passageDownPos.sectorX, passageDownPos.sectorY);
					if (passageUp) {
						var path1 = this.findPath(startVO, passageDown, utilities, settings);
						if (!path1) return null;
						return path1.concat([passageUp.result]).concat(this.findPath(passageUp, goalVO, utilities, settings));
					} else {
						return null;
					}
				} else {
					log.i("Can't find path because there is no passage down from level " + startLevel);
					return null;
				}
			} else if (startLevel < goalLevel) {
				var passageUp = utilities.findPassageUp(startLevel, settings.includeUnbuiltPassages);
				if (passageUp) {
					var passageUpPos = passageUp.position;
					var passageDown = utilities.getSectorByPosition(passageUpPos.level + 1, passageUpPos.sectorX, passageUpPos.sectorY);
					if (passageDown) {
						var path1 = this.findPath(startVO, passageUp, utilities, settings);
						if (!path1) return null;
						return path1.concat([passageDown.result]).concat(this.findPath(passageDown, goalVO, utilities, settings));
					} else {
						return null;
					}
				} else {
					log.i("Can't find path because there is no passage up from level " + startLevel);
					return null;
				}
			}

			// Simple breadth-first search (implement A* if movement cost needs to be considered)

			var cameFrom = this.mapPaths(startVO, goalVO, utilities, settings);
			let result = this.findShortest(startVO, goalVO, settings, cameFrom);

			return result;
		},

		mapPaths: function (startVO, goalVO, utilities, settings) {
			var cameFrom = {};
			var frontier = [];
			var visited = [];
			
			var startKey = this.getKey(startVO);
			var goalKey = this.getKey(goalVO);
			
			startVO.distance = 0;
			visited.push(startKey);
			frontier.push(startVO);
			cameFrom[startKey] = null;

			var pass = 0;
			var current;
			var neighbours;
			var next;

			var isValid = function (sector, startSector, direction) {
				if (settings && settings.skipUnvisited && !sector.isVisited)
					return false;
				if (settings && settings.skipBlockers && utilities.isBlocked(startSector, direction)) {
					return false;
				}
				return true;
			};
			
			var foundGoal = false;
			mainLoop: while (frontier.length > 0) {
				pass++;
				current = frontier.shift();
				if (settings.maxLength && settings.maxLength <= current.distance) continue;
				neighbours = utilities.getSectorNeighboursMap(current);
				for (var direction in neighbours) {
					var next = neighbours[direction];
					if (!next)
						continue;
					var neighbourKey = this.getKey(next);
					if (visited.indexOf(neighbourKey) >= 0)
						continue;
					if (!isValid(next, current, parseInt(direction)))
						continue;
					next.distance = current.distance + 1;
					visited.push(neighbourKey);
					frontier.push(next);
					cameFrom[neighbourKey] = current;

					if (neighbourKey === goalKey) {
						foundGoal = true;
						break mainLoop;
					}
				}
			}
			
			if (!foundGoal && !settings.omitWarnings) {
				log.w("Couldn't find goal (mapping paths " + startVO.position + " - " + goalVO.position + ") (pass: " + pass + ")");
				this.printPaths(startVO, goalVO, cameFrom);
			}

			return cameFrom;
		},

		findShortest: function (startVO, goalVO, settings, cameFrom) {
			let result = [];
			var previous = null;
			var current = goalVO;
			while (current !== startVO) {
				previous = current;
				result.push(previous.result);
				current = cameFrom[this.getKey(previous)];
				// TODO check (pass?) reasonable max length
				if (!current || result.length > 500) {
					if (!settings.omitWarnings) {
						log.w("failed to find path (res len: " + result.length + ", prev: " + this.getKey(previous) + ")");
						log.i(cameFrom);
						log.i(previous);
					}
					return null;
				}
			}
			return result.reverse();
		},

		getKey: function (sector) {
			if (!sector) return null;
			return sector.position.toString();
		},
		
		printPaths: function (startVO, goalVO, cameFrom) {
			var pathsByLastKey = {};
			var frontier = [];

			var startKey = this.getKey(startVO);
			frontier.push(startKey);
			pathsByLastKey[startKey] = [];
			pathsByLastKey[startKey].push([startKey]);
			
			var sys = this;
			var getLeaves = function (key) {
				let result = [];
				var parent;
				for (let k in cameFrom) {
					parent = cameFrom[k];
					if (sys.getKey(parent) == key) {
						result.push(k);
					}
				}
				return result;
			};
			
			var current;
			var currentPaths;
			var leaves;
			var steps = 0;
			while (frontier.length > 0) {
				steps++;
				current = frontier.shift();
				currentPaths = pathsByLastKey[current];
				leaves = getLeaves(current);
				if (leaves.length > 0) {
					for (let i = 0; i < leaves.length; i++) {
						var leaf = leaves[i];
						frontier.push(leaf);
						for (let j = 0; j < currentPaths.length; j++) {
							var path = currentPaths[j].slice(0); // copy
							path.push(leaf);
							if (!pathsByLastKey[leaf]) pathsByLastKey[leaf] = [];
							pathsByLastKey[leaf].push(path);
						}
					}
					delete pathsByLastKey[current];
				}
			}
			
			for (let k in pathsByLastKey) {
				for (let i = 0; i < pathsByLastKey[k].length; i++) {
					log.i(pathsByLastKey[k][i].join("|"));
				}
			}
		},

	};

	return PathFinding;
});
