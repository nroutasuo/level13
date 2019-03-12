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
        // - omitLog (bool)
        findPath: function (startVO, goalVO, utilities, settings) {
            if (!startVO) {
                console.log("WARN: No start sector defined.");
            }

            if (!goalVO) {
                console.log("WARN: No goal sector defined.");
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
                    console.log("Can't find path because there is no passage down from level " + startLevel);
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
                    console.log("Can't find path because there is no passage up from level " + startLevel);
                    return null;
                }
            }

            // Simple breadth-first search (implement A* if movement cost needs to be considered)

            var cameFrom = this.mapPaths(startVO, goalVO, utilities, settings);
            var result = this.findShortest(startVO, goalVO, settings, cameFrom);

            return result;
        },

        mapPaths: function (startVO, goalVO, utilities, settings, cameFrom) {
            var cameFrom = {};
            var frontier = [];
            var visited = [];

            visited.push(this.getKey(startVO));
            frontier.push(startVO);
            cameFrom[this.getKey(startVO)] = null;

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

            mainLoop: while (frontier.length > 0) {
                pass++;
                current = frontier.shift();
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
                    visited.push(neighbourKey);
                    frontier.push(next);
                    cameFrom[neighbourKey] = current;

                    if (next === goalVO) {
                        break mainLoop;
                    }
                }
            }

            return cameFrom;
        },

        findShortest: function (startVO, goalVO, settings, cameFrom) {
            var result = [];
            var current = goalVO;
            while (current !== startVO) {
                result.push(current.result);
                current = cameFrom[this.getKey(current)];
                // TODO check (pass?) reasonable max length
                if (!current || result.length > 500) {
                    if (!settings.omitLog) console.log("WARN: failed to find path (res len: " + result.length + ")");
                    return null;
                }
            }
            return result.reverse();
        },

        getKey: function (sector) {
            return sector.position.toString();
        },

    };

    return PathFinding;
});
