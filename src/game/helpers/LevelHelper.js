// Singleton with helper methods for level entities;
define([
    'ash',
    'game/GameGlobals',
    'utils/PathFinding',
    'utils/VOCache',
    'game/constants/LocaleConstants',
    'game/constants/PositionConstants',
    'game/constants/MovementConstants',
    'game/constants/SectorConstants',
    'game/constants/WorldCreatorConstants',
    'game/nodes/level/LevelNode',
    'game/nodes/sector/SectorNode',
    'game/nodes/GangNode',
    'game/components/common/PositionComponent',
    'game/components/common/RevealedComponent',
    'game/components/common/CampComponent',
    'game/components/common/VisitedComponent',
    'game/components/type/LevelComponent',
    'game/components/sector/SectorStatusComponent',
    'game/components/sector/SectorLocalesComponent',
    'game/components/sector/SectorFeaturesComponent',
    'game/components/sector/SectorControlComponent',
    'game/components/sector/PassagesComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/components/sector/improvements/WorkshopComponent',
    'game/components/level/LevelPassagesComponent',
    'game/vos/LevelProjectVO',
    'game/vos/ImprovementVO',
    'game/vos/PositionVO'
], function (
	Ash,
    GameGlobals,
    PathFinding,
    VOCache,
	LocaleConstants,
	PositionConstants,
	MovementConstants,
	SectorConstants,
    WorldCreatorConstants,
	LevelNode,
    SectorNode,
    GangNode,
	PositionComponent,
    RevealedComponent,
    CampComponent,
    VisitedComponent,
    LevelComponent,
	SectorStatusComponent,
	SectorLocalesComponent,
	SectorFeaturesComponent,
	SectorControlComponent,
	PassagesComponent,
	SectorImprovementsComponent,
	WorkshopComponent,
	LevelPassagesComponent,
	LevelProjectVO,
	ImprovementVO,
    PositionVO
) {
    var LevelHelper = Ash.Class.extend({

		engine: null,
		levelNodes: null,
		sectorNodes: null,
        gangNodes: null,

        // todo check using VOCache for these (compare performance)
        sectorEntitiesByPosition: {}, // int (level) -> int (x) -> int (y) -> entity
        sectorEntitiesByLevel: {}, // int (level) -> []

		constructor: function (engine) {
			this.engine = engine;
			this.levelNodes = engine.getNodeList(LevelNode);
			this.sectorNodes = engine.getNodeList(SectorNode);
            this.gangNodes = engine.getNodeList(GangNode);
            VOCache.create("LevelHelper-SectorNeighboursMap", 300);
		},

        reset: function () {
            this.sectorEntitiesByPosition = {};
            this.sectorEntitiesByLevel = {};
        },

		getLevelEntityForSector: function (sectorEntity) {
			var levelPosition;
			var sectorPosition = sectorEntity.get(PositionComponent);
			for (var node = this.levelNodes.head; node; node = node.next) {
				levelPosition = node.entity.get(PositionComponent);
				if (levelPosition.level === sectorPosition.level) return node.entity;
			}
			log.w("No level entity found for sector with position " + sectorPosition);
			return null;
		},

		getLevelEntityForPosition: function (level) {
			var levelPosition;
			for (var node = this.levelNodes.head; node; node = node.next) {
				levelPosition = node.entity.get(PositionComponent);
				if (levelPosition.level === level) return node.entity;
			}
			return null;
		},

		getSectorByPosition: function (level, sectorX, sectorY) {
			var sectorPosition;
            level = parseInt(level);
            sectorX = parseInt(sectorX);
            sectorY = parseInt(sectorY);

            // TODO check if saving uses up too much memory / this is the neatest way, speeds up fps a lot (esp for map)
            if (!this.sectorEntitiesByPosition[level]) this.sectorEntitiesByPosition[level] = {};
            if (!this.sectorEntitiesByPosition[level][sectorX]) this.sectorEntitiesByPosition[level][sectorX] = {};

            if (this.sectorEntitiesByPosition[level][sectorX][sectorY]) {
                return this.sectorEntitiesByPosition[level][sectorX][sectorY];
            }

            if (this.sectorEntitiesByPosition[level][sectorX][sectorY] === null)  {
                return null;
            }

			for (var node = this.sectorNodes.head; node; node = node.next) {
				sectorPosition = node.entity.get(PositionComponent);
				if (sectorPosition.level === level && sectorPosition.sectorX === sectorX && sectorPosition.sectorY === sectorY) {
                    this.sectorEntitiesByPosition[level][sectorX][sectorY] = node.entity;
                    return node.entity;
                }
			}
            this.sectorEntitiesByPosition[level][sectorX][sectorY] = null;

			return null;
		},
        
        getGang: function (position, direction) {
            // TODO do some caching here
            var level = position.level;
            var neighbourPosition = PositionConstants.getNeighbourPosition(position, direction);
            var sectorX = (position.sectorX + neighbourPosition.sectorX) / 2;
            var sectorY = (position.sectorY + neighbourPosition.sectorY) / 2;
            var gangPosition;
			for (var node = this.gangNodes.head; node; node = node.next) {
				gangPosition = node.entity.get(PositionComponent);
				if (gangPosition.level === level && gangPosition.sectorX === sectorX && gangPosition.sectorY === sectorY) {
                    return node.entity;
                }
			}
            return null;
        },

        // todo use neighboursmap so we benefit from the same cache
        getSectorNeighboursList: function (sector) {
            if (!sector)
                return null;
			var result = [];
            var sectorPos = sector.get(PositionComponent);
			var startingPos = sectorPos.getPosition();
			for (var i in PositionConstants.getLevelDirections()) {
				var direction = PositionConstants.getLevelDirections()[i];
				var neighbourPos = PositionConstants.getPositionOnPath(startingPos, direction, 1);
                var neighbour = this.getSectorByPosition(neighbourPos.level, neighbourPos.sectorX, neighbourPos.sectorY);
				if (neighbour) {
					result.push(neighbour);
				}
			}
			return result;
        },

        getSectorNeighboursMap: function (sector, neighbourWrapFunc) {
            if (!sector) return null;

            var rawResult = {};
			var result = {};

            var sectorPos = sector.get(PositionComponent);
            var cacheKey = sectorPos.positionId();
            var cachedMap = VOCache.getVO("LevelHelper-SectorNeighboursMap", cacheKey);

            if (cachedMap) {
                rawResult = cachedMap;
            } else {
    			var startingPos = sectorPos.getPosition();
    			for (var i in PositionConstants.getLevelDirections()) {
    				var direction = PositionConstants.getLevelDirections()[i];
    				var neighbourPos = PositionConstants.getPositionOnPath(startingPos, direction, 1);
                    var neighbour = this.getSectorByPosition(neighbourPos.level, neighbourPos.sectorX, neighbourPos.sectorY);
                    rawResult[direction] = neighbour;
    			}
                VOCache.addVO("LevelHelper-SectorNeighboursMap", cacheKey, rawResult);
            }

            if (neighbourWrapFunc) {
                for (var direction in rawResult) {
                    result[direction] = neighbourWrapFunc(rawResult[direction]);
                }
            } else {
                result = rawResult;
            }

			return result;
        },

        getCampStep: function (pos) {
            var sector = this.getSectorByPosition(pos.level, pos.sectorX, pos.sectorY);
            if (!sector) return 1;
            var featuresComponent = sector.get(SectorFeaturesComponent);
            return WorldCreatorConstants.getCampStep(featuresComponent.zone);
        },

        findPathTo: function (startSector, goalSector, settings) {
            if (!startSector || !goalSector) return null;

            var levelHelper = this;

            var makePathSectorVO = function (entity) {
                if (!entity) return null;
                return {
                    position: entity.get(PositionComponent).getPosition(),
                    isVisited: entity.has(VisitedComponent),
                    result: entity
                };
            };

            var startVO = makePathSectorVO(startSector);
            var goalVO = makePathSectorVO(goalSector);

            if (startVO.position.equals(goalVO.position)) return [];

            var utilities = {
                findPassageDown: function (level, includeUnbuilt) {
                    var result = makePathSectorVO(levelHelper.findPassageDown(level, includeUnbuilt, true));
                    return result;
                },
                findPassageUp: function (level, includeUnbuilt) {
                    return makePathSectorVO(levelHelper.findPassageUp(level, includeUnbuilt));
                },
                getSectorByPosition: function (level, sectorX, sectorY) {
                    return makePathSectorVO(levelHelper.getSectorByPosition(level, sectorX, sectorY, true));
                },
                getSectorNeighboursMap: function (pathSectorVO) {
                    return levelHelper.getSectorNeighboursMap(pathSectorVO.result, makePathSectorVO);
                },
                isBlocked: function (pathSectorVO, direction) {
                    return GameGlobals.movementHelper.isBlocked(pathSectorVO.result, direction);
                }
            };

            return PathFinding.findPath(startVO, goalVO, utilities, settings);
        },

        findPassageUp: function (level, includeUnbuiltPassages) {
            var levelEntity = this.getLevelEntityForPosition(level);
			var levelPassagesComponent = levelEntity.get(LevelPassagesComponent);
			var passageSectors = Object.keys(levelPassagesComponent.passagesUp);
            var level = levelEntity.get(PositionComponent).level;
            var sectorId;
            for (var iu = 0; iu < passageSectors.length; iu++) {
                sectorId = passageSectors[iu];
                var passage = levelPassagesComponent.passagesUp[sectorId];
                if (!passage) continue;
                var passageBuilt = levelPassagesComponent.passagesUpBuilt[sectorId];
                if (includeUnbuiltPassages || passageBuilt) {
                    return this.getSectorByPosition(level, sectorId.split(".")[0], sectorId.split(".")[1]);
                }
            }
            return null;
        },

        findPassageDown: function (level, includeUnbuiltPassages, log) {
            var levelEntity = this.getLevelEntityForPosition(level);
			var levelPassagesComponent = levelEntity.get(LevelPassagesComponent);
			var passageSectors = Object.keys(levelPassagesComponent.passagesDown);
            var level = levelEntity.get(PositionComponent).level;
            var sectorId;
            for (var iu = 0; iu < passageSectors.length; iu++) {
                sectorId = passageSectors[iu];
                var passage = levelPassagesComponent.passagesDown[sectorId];
                if (!passage) continue;
                var passageBuilt = levelPassagesComponent.passagesDownBuilt[sectorId];
                if (includeUnbuiltPassages || passageBuilt !== null) {
                    return this.getSectorByPosition(level, sectorId.split(".")[0], sectorId.split(".")[1]);
                }
            }
            return null;
        },

        forEverySectorFromLocation: function (playerPosition, func, limitToCurrentLevel) {
            // TODO go by path distance, not distance in coordinates

			var doLevel = function (level) {
                if (!this.isLevelUnlocked(level))
                    return false;
                // spiralling search: find sectors closest to current position first
                var levelComponent = this.getLevelEntityForPosition(level).get(LevelComponent);
                var levelVO = levelComponent.levelVO;
                var checkPos = playerPosition.clone();
                var spiralRadius = 0;
                var spiralEdgeLength;
                while ((checkPos.sectorX >= levelVO.minX && checkPos.sectorX <= levelVO.maxX) || (checkPos.sectorY >= levelVO.minY && checkPos.sectorY <= levelVO.maxY)) {
                    spiralEdgeLength = spiralRadius * 2 + 1;
                    checkPos = new PositionVO(playerPosition.level, playerPosition.sectorX - spiralRadius, playerPosition.sectorY - spiralRadius);
                    for (var spiralEdge = 0; spiralEdge < 4; spiralEdge++) {
                        for (var spiralEdgeI = 0; spiralEdgeI < spiralEdgeLength; spiralEdgeI++) {
                            if (spiralEdgeI > 0) {
                                if (spiralEdge === 0) checkPos.sectorX++;
                                if (spiralEdge === 1) checkPos.sectorY++;
                                if (spiralEdge === 2) checkPos.sectorX--;
                                if (spiralEdge === 3) checkPos.sectorY--;

                                var sector = this.getSectorByPosition(level, checkPos.sectorX, checkPos.sectorY);
                                if (sector) {
                                    var isDone = func(sector);
                                    if (isDone) {
                                        return true;
                                    }
                                }
                            }
                        }
                        spiralRadius++;
                    }
                }

                return false;
            };

			var currentLevel = playerPosition.level;
            var isDone;
            var dlimit  = limitToCurrentLevel ? 1 : WorldCreatorConstants.LEVEL_NUMBER_MAX;
			for (var ld = 0; ld < dlimit; ld++) {
                if (ld === 0) {
                    isDone = doLevel.call(this, currentLevel);
                } else {
    				isDone = doLevel.call(this, currentLevel + ld);
        			isDone = isDone || doLevel.call(this, currentLevel - ld);
                }
                if (isDone) break;
			}
        },

		getAvailableProjectsForCamp: function (sectorEntity) {
			var projects = [];

			// use to get projects only for that level: (now displaying all available projects in all camps)
			// var campLevelEntity = this.getLevelEntityForSector(sectorEntity);

			// get all levels
            var levelProjects;
			for (var node = this.levelNodes.head; node; node = node.next) {
                levelProjects = this.getProjectsForLevel(node.entity, false);
				projects = projects.concat(levelProjects);
			}

            var result = this.filterProjects(projects);

			return result;
		},

        getBuiltProjectsForCamp: function (sectorEntity) {
			var projects = [];

			// use to get projects only for that level: (now displaying all projects in all camps)
			// var campLevelEntity = this.getLevelEntityForSector(sectorEntity);

			// get all levels
            var levelProjects;
			for (var node = this.levelNodes.head; node; node = node.next) {
                levelProjects = this.getProjectsForLevel(node.entity, true);
				projects = projects.concat(levelProjects);
			}

            var result = this.filterProjects(projects);
			return result;
        },

        filterProjects: function (projects) {
            var result = [];
			var project;
			var projectExists;
			var existingProject;

			// sort by level ordinal
			var gameState = GameGlobals.gameState;
			result.sort(function (a, b) {
				var levelOrdinalA = gameState.getLevelOrdinal(a.level);
				var levelOrdinalB = gameState.getLevelOrdinal(b.level);
				return levelOrdinalB - levelOrdinalA;
			});

			// filter duplicates
			for (var i = 0; i < projects.length; i++) {
				project = projects[i];
				projectExists = false;
				for (var j = 0; j < result.length; j++) {
					existingProject = result[j];
                    // corresponding up and down passages
					if (existingProject.sector === project.sector && (existingProject.level - 1 === project.level || existingProject.level + 1 === project.level)) {
						projectExists = true;
						break;
					}
                    // neighbouring movement blockers
                    var dist = PositionConstants.getDistanceTo(existingProject.position, project.position);
                    if (dist < 2) {
                        if (PositionConstants.getOppositeDirection(project.direction) == existingProject.direction) {
                            projectExists = true;
                            break;
                        }
                    }
				}
				if (!projectExists)
                    result.push(project);
			}

            return result;
        },

        getLevelStats: function (level) {
            var levelStats = {};
            levelStats.totalSectors = 0;
            levelStats.countClearedSectors = 0;
            levelStats.countScoutedSectors = 0;
            levelStats.countRevealedSectors = 0;

            var sectorPosition;
            var statusComponent;
            var sectorStatus;
			for (var node = this.sectorNodes.head; node; node = node.next) {
				sectorPosition = node.entity.get(PositionComponent);
                sectorStatus = SectorConstants.getSectorStatus(node.entity);
				if (sectorPosition.level !== level) continue;
                levelStats.totalSectors++;

                statusComponent = node.entity.get(SectorStatusComponent);
                if (sectorStatus === SectorConstants.MAP_SECTOR_STATUS_VISITED_CLEARED) levelStats.countClearedSectors++;
                if (statusComponent.scouted) levelStats.countScoutedSectors++;
                if (node.entity.has(RevealedComponent)) levelStats.countRevealedSectors++;
            }

            levelStats.percentClearedSectors = levelStats.countClearedSectors == levelStats.totalSectors ? 1 : levelStats.countClearedSectors / levelStats.totalSectors;
            levelStats.percentScoutedSectors = levelStats.countScoutedSectors == levelStats.totalSectors ? 1 : levelStats.countScoutedSectors / levelStats.totalSectors;
            levelStats.percentRevealedSectors = levelStats.countRevealedSectors == levelStats.totalSectors ? 1 : levelStats.countRevealedSectors / levelStats.totalSectors;

            return levelStats;
        },
        
        getWorkshopsSectorsForLevel: function (level) {
			var result = [];

            this.saveSectorsForLevel(level);

            var sectorPosition;
			for (var i = 0; i < this.sectorEntitiesByLevel[level].length; i++) {
                var sectorEntity = this.sectorEntitiesByLevel[level][i];
				sectorPosition = sectorEntity.get(PositionComponent);
				if (sectorPosition.level !== level) continue;
                if (sectorEntity.has(WorkshopComponent)) {
	                result.push(sectorEntity);
                }
			}

			return result;
        },

		getProjectsForLevel: function (levelEntity, getBuilt) {
			var projects = [];
			var level = levelEntity.get(PositionComponent).level;
			var levelPassagesComponent = levelEntity.get(LevelPassagesComponent);

            this.saveSectorsForLevel(level);

            var sectorPosition;
			for (var i = 0; i < this.sectorEntitiesByLevel[level].length; i++) {
				sectorPosition = this.sectorEntitiesByLevel[level][i].get(PositionComponent);
				if (sectorPosition.level !== level) continue;
				projects = projects.concat(
                    getBuilt ?
                    this.getBuiltProjectsForSector(this.sectorEntitiesByLevel[level][i]) :
                    this.getAvailableProjectsForSector(this.sectorEntitiesByLevel[level][i], levelPassagesComponent)
                );
			}

			return projects;
		},

        getAvailableProjectsForSector: function (sectorEntity, levelPassagesComponent) {
            var projects = [];
			var sectorPosition = sectorEntity.get(PositionComponent);
            var statusComponent = sectorEntity.get(SectorStatusComponent);
            var sectorPassagesComponent = sectorEntity.get(PassagesComponent);
            var levelOrdinal = GameGlobals.gameState.getLevelOrdinal(sectorPosition.level);

            var scouted = statusComponent && statusComponent.scouted;
            if (!scouted) return projects;

            levelPassagesComponent = levelPassagesComponent || this.getLevelEntityForPosition(sectorPosition.level).get(LevelPassagesComponent);

            var improvementName = "";
            var actionName = "";
            var actionLabel;

            // passages
            if (levelPassagesComponent.passagesUp[sectorPosition.sectorId()] && !levelPassagesComponent.passagesUpBuilt[sectorPosition.sectorId()]) {
                switch (levelPassagesComponent.passagesUp[sectorPosition.sectorId()].type) {
                    case 1:
                        improvementName = improvementNames.passageUpHole;
                        actionName = "build_out_passage_up_hole";
                        actionLabel = "build";
                        break;
                    case 2:
                        improvementName = improvementNames.passageUpElevator;
                        actionName = "build_out_passage_up_elevator";
                        actionLabel = "repair";
                        break;
                    case 3:
                        improvementName = improvementNames.passageUpStairs;
                        actionName = "build_out_passage_up_stairs";
                        actionLabel = "repair";
                        break;
                }
                if (GameGlobals.playerActionsHelper.checkRequirements(actionName, false, sectorEntity).value > 0) {
                    actionName = actionName + "_" + levelOrdinal;
                    projects.push(new LevelProjectVO(new ImprovementVO(improvementName), actionName, sectorPosition, PositionConstants.DIRECTION_UP, null, actionLabel));
                }
            }

            if (levelPassagesComponent.passagesDown[sectorPosition.sectorId()] && !levelPassagesComponent.passagesDownBuilt[sectorPosition.sectorId()]) {
                switch (levelPassagesComponent.passagesDown[sectorPosition.sectorId()].type) {
                    case MovementConstants.PASSAGE_TYPE_HOLE:
                        improvementName = improvementNames.passageDownHole;
                        actionName = "build_out_passage_down_hole";
                        actionLabel = "repair";
                        break;
                    case MovementConstants.PASSAGE_TYPE_ELEVATOR:
                        improvementName = improvementNames.passageDownElevator;
                        actionName = "build_out_passage_down_elevator";
                        actionLabel = "repair";
                        break;
                    case MovementConstants.PASSAGE_TYPE_STAIRWELL:
                        improvementName = improvementNames.passageDownStairs;
                        actionName = "build_out_passage_down_stairs";
                        actionLabel = "repair";
                        break;
                    case MovementConstants.PASSAGE_TYPE_BLOCKED:
                        break;
                }
                
                if (GameGlobals.playerActionsHelper.checkRequirements(actionName, false, sectorEntity).value > 0) {
                    actionName = actionName + "_" + levelOrdinal;
                    projects.push(new LevelProjectVO(new ImprovementVO(improvementName), actionName, sectorPosition, PositionConstants.DIRECTION_DOWN, null, actionLabel));
                }
            }

            // movement blockers (bridges and debris)
            for (var i in PositionConstants.getLevelDirections()) {
                var direction = PositionConstants.getLevelDirections()[i];
                var directionBlocker = sectorPassagesComponent.getBlocker(direction);
                if (directionBlocker) {
                    if (!GameGlobals.movementHelper.isBlocked(sectorEntity, direction)) continue;
                    switch (directionBlocker.type) {
        				case MovementConstants.BLOCKER_TYPE_GAP:
                            projects.push(new LevelProjectVO(null, "bridge_gap", sectorPosition, direction, "Gap", "bridge"));
                            break;
        				case MovementConstants.BLOCKER_TYPE_DEBRIS:
                            projects.push(new LevelProjectVO(null, "clear_debris", sectorPosition, direction, "Debris", "clear"));
                            break;
                    }
                }
            }

            // space ship
            if (levelOrdinal === GameGlobals.gameState.getSurfaceLevelOrdinal()) {
                var camp = sectorEntity.get(CampComponent);
                if (camp) {
                    var actions = [ "build_out_spaceship1", "build_out_spaceship2", "build_out_spaceship3"];
                    for (var i = 0; i < actions.length; i++) {
                        if (GameGlobals.playerActionsHelper.checkRequirements(actions[i])) {
                            var improvement = GameGlobals.playerActionsHelper.getImprovementNameForAction(actions[i]);
                            projects.push(new LevelProjectVO(new ImprovementVO(improvement), actions[i], sectorPosition));
                        }
                    }
                }
            }

            return projects;
        },

        getBuiltProjectsForSector: function (sectorEntity) {
            var projects = [];
            var statusComponent = sectorEntity.get(SectorStatusComponent);
            var scouted = statusComponent && statusComponent.scouted;
            if (!scouted) return projects;

			var sectorPosition = sectorEntity.get(PositionComponent);
            var sectorImprovements = sectorEntity.get(SectorImprovementsComponent);
			var improvementList = sectorImprovements.getAll(improvementTypes.level);
            for (var i = 0; i < improvementList.length; i++) {
                var improvement = improvementList[i];
                if (improvement.name === improvementNames.collector_food) continue;
                if (improvement.name === improvementNames.collector_water) continue;
                projects.push(new LevelProjectVO(improvement, "", sectorPosition));
            }

            return projects;
        },

        getLevelClearedWorkshopCount: function (level, resourceName) {
			var count = 0;
            var featuresComponent;
            var sectorControlComponent;
			var workshopComponent;
            for (var node = this.sectorNodes.head; node; node = node.next) {
                if (node.entity.get(PositionComponent).level === level) {
                    featuresComponent = node.entity.get(SectorFeaturesComponent);
                    sectorControlComponent = node.entity.get(SectorControlComponent);
					workshopComponent = node.entity.get(WorkshopComponent);
                    if (workshopComponent && workshopComponent.resource === resourceName) {
                        if (sectorControlComponent && sectorControlComponent.hasControlOfLocale(LocaleConstants.LOCALE_ID_WORKSHOP)) {
                            count++;
                        }
                    }
                }
            }
            return count;
        },

		getSectorUnclearedWorkshopCount: function (sectorEntity) {
			var count = 0;
            var featuresComponent;
            var sectorControlComponent;
			featuresComponent = sectorEntity.get(SectorFeaturesComponent);
			sectorControlComponent = sectorEntity.get(SectorControlComponent);
			if (sectorEntity.has(WorkshopComponent)) {
				if (!sectorControlComponent.hasControlOfLocale(LocaleConstants.LOCALE_ID_WORKSHOP)) {
					count++;
				}
			}
            return count;
		},

		isLevelUnlocked: function (level) {
			if (level === 13) return true;
			var levelEntity = this.getLevelEntityForPosition(level);
			if (levelEntity) {
				var levelPassagesComponent = levelEntity.get(LevelPassagesComponent);
				var passageSectors;
				if (level < 13) {
					passageSectors = Object.keys(levelPassagesComponent.passagesUpBuilt);
					for (var iu = 0; iu < passageSectors.length; iu++) {
						if (levelPassagesComponent.passagesUpBuilt[passageSectors[iu]]) return true;
					}
				}

				if (level > 13) {
					passageSectors = Object.keys(levelPassagesComponent.passagesDownBuilt);
					for (var id = 0; id < passageSectors.length; id++) {
						if (levelPassagesComponent.passagesDownBuilt[passageSectors[id]]) return true;
					}
				}
			}

			return false;
		},

        isSectorReachable: function (startSector, goalSector) {
            var settings = { skipUnvisited: false, skipBlockers: true, omitWarnings: false };
            var path = this.findPathTo(startSector, goalSector, settings);
            return path && path.length >= 0;
        },
        
		getLevelLocales: function (level, includeScouted, localeBracket, excludeLocaleVO) {
			var locales = [];
			var sectorPosition;
			for (var node = this.sectorNodes.head; node; node = node.next) {
				sectorPosition = node.entity.get(PositionComponent);
				if (sectorPosition.level === level) {
					locales = locales.concat(this.getSectorLocales(node.entity, includeScouted, localeBracket, excludeLocaleVO));
				}
			}
			return locales;
		},

		getSectorLocales: function (sectorEntity, includeScouted, localeBracket, excludeLocaleVO) {
			var locales = [];
			var sectorLocalesComponent = sectorEntity.get(SectorLocalesComponent);
			var sectorStatus = sectorEntity.get(SectorStatusComponent);
			var locale;
			for (var i = 0; i < sectorLocalesComponent.locales.length; i++) {
				locale = sectorLocalesComponent.locales[i];
				if (locale === excludeLocaleVO) continue;
                if (localeBracket && localeBracket !== locale.getBracket()) continue;
                if (!includeScouted && sectorStatus.isLocaleScouted(i)) continue;
				locales.push(locale);
			}
			return locales;
		},

		getSectorLocalesForPlayer: function (sectorEntity) {
			var locales = [];
			var sectorLocalesComponent = sectorEntity.get(SectorLocalesComponent);
			var sectorStatus = sectorEntity.get(SectorStatusComponent);
			var locale;
			for (var i = 0; i < sectorLocalesComponent.locales.length; i++) {
				locale = sectorLocalesComponent.locales[i];
				var action = "scout_locale_" + locale.getCategory() + "_" + i;
				if (!sectorStatus.isLocaleScouted(i)) {
					if (GameGlobals.playerActionsHelper.checkAvailability(action, true, sectorEntity))
						locales.push(locale);
                }
			}
			return locales;
		},
        
        getLevelStashSectors:  function (level) {
            var sectors = [];
            this.saveSectorsForLevel(level);
			for (var i = 0; i < this.sectorEntitiesByLevel[level].length; i++) {
                var sectorEntity = this.sectorEntitiesByLevel[level][i];
                var featuresComponent = sectorEntity.get(SectorFeaturesComponent);
                if (featuresComponent.stash) {
                    sectors.push(sectorEntity);
                }
			}
            return sectors;
        },

        saveSectorsForLevel: function (level) {
            if (this.sectorEntitiesByLevel[level] && this.sectorEntitiesByLevel[level] !== null && this.sectorEntitiesByLevel[level].length > 0) {
                return;
            }

            this.sectorEntitiesByLevel[level] = [];

            var sectorPosition;
            for (var node = this.sectorNodes.head; node; node = node.next) {
                sectorPosition = node.entity.get(PositionComponent);
                if (sectorPosition.level !== level)
                    continue;
                this.sectorEntitiesByLevel[level].push(node.entity);
            }
        }

    });

    return LevelHelper;
});
