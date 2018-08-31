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
        findPath: function (startVO, goalVO, utilities, settings) {  
            if (!startVO) {
                console.log("WARN: No start sector defined.");
            }
            
            if (!goalVO) {
                console.log("WARN: No goal sector defined.");
            }
            
            if (!settings) settings = {};
            
            // build paths spanning multiple levels from several piecess
            
            var startLevel = startVO.position.level;
            var goalLevel = goalVO.position.level;
            
            if (startLevel > goalLevel) {
                var passageDown = utilities.findPassageDown(startLevel, settings.includeUnbuiltPassages);
                if (passageDown) {
                    var passageDownPos = passageDown.position;
                    var passageUp = utilities.getSectorByPosition(passageDownPos.level - 1, passageDownPos.sectorX, passageDownPos.sectorY);
                    var combined = this.findPathTo(startVO, passageDown, settings).concat([passageUp]).concat(this.findPathTo(passageUp, goalVO, settings));
                    return combined;
                } else {
                    console.log("Can't find path because there is no passage from level " + startLevel + " to level " + goalLevel);
                }
            } else if (startLevel < goalLevel) {
                var passageUp = utilities.findPassageUp(startLevel, settings.includeUnbuiltPassages);
                if (passageUp) {
                    var passageUpPos = passageUp.position;
                    var passageDown = utilities.getSectorByPosition(passageUpPos.level + 1, passageUpPos.sectorX, passageUpPos.sectorY);
                    var combined = this.findPathTo(startVO, passageUp, settings).concat([passageDown]).concat(this.findPathTo(passageDown, goalVO, settings));
                    return combined;
                } else {
                    console.log("Can't find path because there is no passage from level " + startLevel + " to level " + goalLevel);
                }
            }
            
            // Simple breadth-first search (implement A* if movement cost needs to be considered)
            
            var frontier = [];
            var visited = [];
            var cameFrom = {};
            
            var getKey = function (sector) {
                return sector.position.toString();
            };
            
            var isValid = function (sector, startSector, direction) {
                if (settings && settings.skipUnvisited && !sector.isVisited)
                    return false;
                if (settings && settings.skipBlockers && utilities.isBlocked(startSector, direction)) {
                    return false;
                }
                return true;
            };
            
            if (getKey(startVO) === getKey(goalVO))
                return [];
            
            visited.push(getKey(startVO));
            frontier.push(startVO);
            cameFrom[getKey(startVO)] = null;
            
            var pass = 0;
            var current;
            var neighbours;
            var next;
            mainLoop: while (frontier.length > 0) {
                pass++;
                current = frontier.shift();
                neighbours = utilities.getSectorNeighboursMap(current);
                for (var direction in neighbours) {
                    var next = neighbours[direction];
                    if (!next)
                        continue;
                    var neighbourKey = getKey(next);
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
            
            var result = [];
            var current = goalVO;
            while (current !== startVO) {
                result.push(current.result);
                current = cameFrom[getKey(current)];
                if (!current || result.length > 500) {
                    console.log("WARN: Failed to find path from " + getKey(startVO) + " to " + getKey(goalVO));
                    break;
                }
            }
            
            return result.reverse();
        }
    };

    return PathFinding;
});
