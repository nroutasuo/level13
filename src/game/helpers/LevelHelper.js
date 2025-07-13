// Singleton with helper methods for level entities;
define([
	'ash',
	'game/GameGlobals',
	'utils/PathFinding',
	'utils/VOCache',
	'game/constants/EnemyConstants',
	'game/constants/FightConstants',
	'game/constants/ImprovementConstants',
	'game/constants/LocaleConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/PositionConstants',
	'game/constants/MovementConstants',
	'game/constants/TribeConstants',
	'game/constants/SectorConstants',
	'game/constants/WorldConstants',
	'game/nodes/level/LevelNode',
	'game/nodes/sector/BeaconNode',
	'game/nodes/sector/SectorNode',
	'game/nodes/GangNode',
	'game/components/common/PositionComponent',
	'game/components/common/RevealedComponent',
	'game/components/common/VisitedComponent',
	'game/components/common/CampComponent',
	'game/components/type/LevelComponent',
	'game/components/type/GangComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/sector/SectorLocalesComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/SectorControlComponent',
	'game/components/sector/PassagesComponent',
	'game/components/sector/improvements/BeaconComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/sector/improvements/WorkshopComponent',
	'game/components/level/LevelPassagesComponent',
	'game/components/level/LevelStatusComponent',
	'game/vos/LevelProjectVO',
	'game/vos/ImprovementVO',
	'game/vos/PositionVO'
], function (
	Ash,
	GameGlobals,
	PathFinding,
	VOCache,
	EnemyConstants,
	FightConstants,
	ImprovementConstants,
	LocaleConstants,
	PlayerActionConstants,
	PositionConstants,
	MovementConstants,
	TribeConstants,
	SectorConstants,
	WorldConstants,
	LevelNode,
	BeaconNode,
	SectorNode,
	GangNode,
	PositionComponent,
	RevealedComponent,
	VisitedComponent,
	CampComponent,
	LevelComponent,
	GangComponent,
	SectorStatusComponent,
	SectorLocalesComponent,
	SectorFeaturesComponent,
	SectorControlComponent,
	PassagesComponent,
	BeaconComponent,
	SectorImprovementsComponent,
	WorkshopComponent,
	LevelPassagesComponent,
	LevelStatusComponent,
	LevelProjectVO,
	ImprovementVO,
	PositionVO
) {
	var LevelHelper = Ash.Class.extend({

		engine: null,
		levelNodes: null,
		sectorNodes: null,
		beaconNodes: null,
		gangNodes: null,

		// todo check using VOCache for these (compare performance)
		sectorEntitiesByPosition: {}, // int (level) -> int (x) -> int (y) -> entity
		sectorEntitiesByLevel: {}, // int (level) -> []

		constructor: function (engine) {
			this.engine = engine;
			this.levelNodes = engine.getNodeList(LevelNode);
			this.sectorNodes = engine.getNodeList(SectorNode);
			this.beaconNodes = engine.getNodeList(BeaconNode);
			this.gangNodes = engine.getNodeList(GangNode);
			VOCache.create("LevelHelper-SectorNeighboursMap", 300);
		},

		reset: function () {
			this.sectorEntitiesByPosition = {};
			this.sectorEntitiesByLevel = {};
		},

		getLevelEntityForSector: function (sectorEntity) {
			let sectorPosition = sectorEntity.get(PositionComponent);
			return this.getLevelEntityForPosition(sectorPosition.level);
		},

		getLevelEntityForPosition: function (level) {
			if (!level && level !== 0) {
				log.w("getLevelEntityForPosition: level is null")
				return null;
			}

			// TODO: cache? (performance)
			level = parseInt(level);
			let levelPosition;
			for (let node = this.levelNodes.head; node; node = node.next) {
				levelPosition = node.entity.get(PositionComponent);
				if (levelPosition.level === level) return node.entity;
			}

			log.w("getLevelEntityForPosition: could not find level entity for position: [" + level + "]")
			return null;
		},

		isVisited: function (entity) {
			if (typeof(entity) == "number") 
				entity = this.getLevelEntityForPosition(entity);
			if (!entity) return false;
			let levelStatus = entity.get(LevelStatusComponent);
			return levelStatus.isVisited || entity.has(VisitedComponent) || false;
		},
		
		isLevelTypeRevealed: function (level) {
			let entity = this.getLevelEntityForPosition(level);
			let levelStatus = entity.get(LevelStatusComponent);
			return levelStatus.isLevelTypeRevealed || false;
		},
		
		getLevelMaxHazard: function (level, hazardType) {
			let result = 0;
			
			this.saveSectorsForLevel(level);
			
			for (let i = 0; i < this.sectorEntitiesByLevel[level].length; i++) {
				let sectorEntity = this.sectorEntitiesByLevel[level][i];
				let featuresComponent = sectorEntity.get(SectorFeaturesComponent);
				result = Math.max(result, featuresComponent.hazards[hazardType] || 0);
			}
			return result;
		},

		getSectorByPositionVO: function (positionVO) {
			if (!positionVO) return null;
			return this.getSectorByPosition(positionVO.level, positionVO.sectorX, positionVO.sectorY);
		},

		getSectorByPosition: function (level, sectorX, sectorY) {
			level = parseInt(level);
			sectorX = parseInt(sectorX);
			sectorY = parseInt(sectorY);

			// TODO check if saving uses up too much memory / this is the neatest way, speeds up fps a lot (esp for map)
			if (!this.sectorEntitiesByPosition[level]) this.sectorEntitiesByPosition[level] = {};
			if (!this.sectorEntitiesByPosition[level][sectorX]) this.sectorEntitiesByPosition[level][sectorX] = {};

			if (this.sectorEntitiesByPosition[level][sectorX][sectorY]) {
				return this.sectorEntitiesByPosition[level][sectorX][sectorY];
			}

			if (this.sectorEntitiesByPosition[level][sectorX][sectorY] === null) {
				return null;
			}
			
			var sectorPosition;
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

		getSectorBySectorId: function (level, sectorId) {
			let parts = sectorId.split(".");
			return this.getSectorByPosition(level, parts[0], parts[1]);
		},
		
		getSectorsAround: function (position, radius) {
			var result = [];
			
			for (var x = position.sectorX - radius; x <= position.sectorX + radius; x++) {
				for (var y = position.sectorY - radius; y <= position.sectorY + radius; y++) {
					var sector = this.getSectorByPosition(position.level, x, y);
					if (sector) {
						result.push(sector);
					}
				}
			}
			return result;
		},
		
		getSectorsByLevel: function (level) {
			this.saveSectorsForLevel(level);
			return this.sectorEntitiesByLevel[level];
		},
		
		getNumAvailableGangs: function (campOrdinal, playerStamina, itemsComponent) {
			let result = 0;
			
			for (var node = this.gangNodes.head; node; node = node.next) {
				let gangPosition = node.entity.get(PositionComponent);
				
				// wrong level
				let gangCampOrdinal = GameGlobals.gameState.getCampOrdinal(gangPosition.level);
				if (gangCampOrdinal != campOrdinal) {
					continue;
				}
				// already defeated
				if (node.gang.isDefeated()) {
					continue;
				}
				// too many failed attempts, player not likely to back
				if (node.gang.numAttempts - node.gang.numEnemiesDefeated > 1) {
					continue;
				}
				// not visible and accessible
				var sectors = this.getSectorsForGang(gangPosition);
				var hasValidSector = false;
				for (let i = 0; i < sectors.length; i++) {
					let pos = sectors[i].get(PositionComponent);
					let visited = GameGlobals.sectorHelper.isVisited(sectors[i]);
					let canExplore = GameGlobals.sectorHelper.canExploreSector(sectors[i], itemsComponent);
					if (visited && canExplore) {
						hasValidSector = true;
						break;
					}
				}
				if (!hasValidSector) {
					continue;
				}
				
				result++;
			}
			return result;
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
		
		getGangComponent: function (position, direction) {
			var gangEntity = GameGlobals.levelHelper.getGang(position, direction);
			if (!gangEntity) return null;
			return gangEntity.get(GangComponent);
		},
		
		getSectorsForGang: function (gangPosition) {
			var level = gangPosition.level;
			let result = [];
			var sectorX = [];
			if (gangPosition.sectorX % 1 == 0) {
				sectorX.push(gangPosition.sectorX);
			} else {
				sectorX.push(Math.floor(gangPosition.sectorX));
				sectorX.push(Math.ceil(gangPosition.sectorX));
			}
			var sectorY = [];
			if (gangPosition.sectorY % 1 == 0) {
				sectorY.push(gangPosition.sectorY);
			} else {
				sectorY.push(Math.floor(gangPosition.sectorY));
				sectorY.push(Math.ceil(gangPosition.sectorY));
			}
			for (var x = 0; x < sectorX.length; x++) {
				for (var y = 0; y < sectorY.length; y++) {
					let sector = this.getSectorByPosition(level, sectorX[x], sectorY[y]);
					if (sector) {
						result.push(sector);
					}
				}
			}
			return result;
		},
		
		hasUsableScavengingSpotsForItem: function (item) {
			for (let node = this.sectorNodes.head; node; node = node.next) {
				let visited = GameGlobals.sectorHelper.isVisited(node.entity);
				if (!visited) continue;
				let statusComponent = node.entity.get(SectorStatusComponent);
				if (!statusComponent.scavenged) continue;
				if (statusComponent.getScavengedPercent() > 75) continue;
				let discoveredItems = GameGlobals.sectorHelper.getLocationKnownItems(node.entity);
				for (let i = 0; i < discoveredItems.length; i++) {
					if (discoveredItems[i] == item.id) {
						return true;
					}
				}
			}
			return false;
		},

		isExamineSpotExamined: function (sector, id) {
			let levelEntity = GameGlobals.levelHelper.getLevelEntityForSector(sector);
			let levelStatus = levelEntity.get(LevelStatusComponent);

			for (let i = 0; i < levelStatus.examinedSpots.length; i++) {
				let spotID = levelStatus.examinedSpots[i];
				if (spotID == id) return true;
			}
			
			return false;
		},

		isDeadEnd: function (sector) {
			return this.getSectorNeighboursList(sector).length == 1;
		},

		// todo use neighboursmap so we benefit from the same cache
		getSectorNeighboursList: function (sector) {
			if (!sector)
				return null;
			let result = [];
			var sectorPos = sector.get(PositionComponent);
			var startingPos = sectorPos.getPosition();
			for (let i in PositionConstants.getLevelDirections()) {
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
			let result = {};

			var sectorPos = sector.get(PositionComponent);
			var cacheKey = sectorPos.positionId();
			var cachedMap = VOCache.getVO("LevelHelper-SectorNeighboursMap", cacheKey);

			if (cachedMap) {
				rawResult = cachedMap;
			} else {
				var startingPos = sectorPos.getPosition();
				var directions = PositionConstants.getLevelDirections();
				for (let i in directions) {
					var direction = directions[i];
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
		
		getNeighbour: function (sector, direction) {
			let map = this.getSectorNeighboursMap(sector);
			return map[direction];
		},

		getCampStep: function (pos) {
			var sector = this.getSectorByPosition(pos.level, pos.sectorX, pos.sectorY);
			if (!sector) return 1;
			var featuresComponent = sector.get(SectorFeaturesComponent);
			return WorldConstants.getCampStep(featuresComponent.zone);
		},

		findPathTo: function (startSector, goalSector, settings) {
			if (!startSector || !goalSector) return null;

			var levelHelper = this;

			var makePathSectorVO = function (entity) {
				if (!entity) return null;
				return {
					position: entity.get(PositionComponent).getPositionOutside(),
					isRevealed: GameGlobals.sectorHelper.isRevealed(entity),
					result: entity
				};
			};

			var startVO = makePathSectorVO(startSector);
			var goalVO = makePathSectorVO(goalSector);

			if (startVO.position.equals(goalVO.position)) return [];

			var utilities = {
				findPassageDown: function (level, includeUnbuilt) {
					let result = makePathSectorVO(levelHelper.findPassageDown(level, includeUnbuilt, true));
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
		
		getCampSectorOnLevel: function (level) {
			let campNode = GameGlobals.campHelper.getCampNodeForLevel(level);
			return campNode ? campNode.entity : null;
		},

		getEntranceSectorOnLevel: function (level) {
			if (level == 13) return this.getSectorByPosition(level, 0, 0);

			let isGoingDown = level < 13;
			if (isGoingDown) {
				return this.findPassageUp(level, true);
			} else {
				return this.findPassageDown(level, true);
			}
		},

		forEverySectorFromLocation: function (pos, func, limitToCurrentLevel) {
			// TODO go by path distance, not distance in coordinates / make that an option

			let startLevel = pos.level;

			var doLevel = function (level) {
				if (level != startLevel && !this.isLevelUnlocked(level)) return false;
				let sectors = this.getSectorsByLevel(level).slice(0);
				sectors.sort(function (a, b) {
					let posA = a.get(PositionComponent).getPosition();
					let posB = b.get(PositionComponent).getPosition();
					return PositionConstants.getDistanceTo(posA, pos) - PositionConstants.getDistanceTo(posB, pos);
				});
				for (let i = 0; i < sectors.length; i++) {
					let sector = sectors[i];
					let done = func(sector);
					if (done) {
						return true;
					}
				}
				return false;
			};

			let currentLevel = pos.level;
			let isDone;
			let dlimit = limitToCurrentLevel ? 1 : WorldConstants.LEVEL_NUMBER_MAX;
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

			let result = this.filterProjects(projects);

			return result;
		},

		getBuiltProjects: function () {
			return this.getBuiltProjectsForCamp(null);
		},

		getBuiltProjectsForCamp: function (sectorEntity) {
			var projects = [];

			// TODO performance bottleneck: cache

			// use to get projects only for that level: (now displaying all projects in all camps)
			// var campLevelEntity = this.getLevelEntityForSector(sectorEntity);

			// get all levels
			var levelProjects;
			for (var node = this.levelNodes.head; node; node = node.next) {
				levelProjects = this.getProjectsForLevel(node.entity, true);
				projects = projects.concat(levelProjects);
			}

			let result = this.filterProjects(projects);
			return result;
		},

		filterProjects: function (projects) {
			let result = [];
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
			for (let i = 0; i < projects.length; i++) {
				project = projects[i];
				projectExists = false;
				for (let j = 0; j < result.length; j++) {
					existingProject = result[j];
					
					// corresponding up and down passages
					if (existingProject.improvement && existingProject.improvement.isPassage() && project.improvement && project.improvement.isPassage()) {
						if (existingProject.sector === project.sector && (existingProject.level - 1 === project.level || existingProject.level + 1 === project.level)) {
							projectExists = true;
							break;
						}
					}
					
					// neighbouring movement blockers
					if (existingProject.action == project.action && project.direction && project.direction !== undefined) {
						if (existingProject.level === project.level) {
							let dist = PositionConstants.getDistanceTo(existingProject.position, project.position);
							if (dist < 2) {
								if (PositionConstants.getOppositeDirection(project.direction) == existingProject.direction) {
									projectExists = true;
									break;
								}
							}
						}
					}
				}
				if (!projectExists)
					result.push(project);
			}

			return result;
		},

		getLevelStatsGlobal: function () {
			let result = {};
			for (let level = GameGlobals.gameState.getGroundLevel(); level <= GameGlobals.gameState.getSurfaceLevel(); level++) {
				let levelStats = this.getLevelStats(level);
				for (let key in levelStats) {
					if (!result[key]) result[key] = 0;
					
					let value = levelStats[key];
					result[key] += value;
				}
			}

			this.calculateLevelStatPercentages(result);

			return result;
		},

		getLevelStats: function (level) {
			let levelStats = {};
			levelStats.totalSectors = 0;
			levelStats.countClearedSectors = 0;
			levelStats.countScavengedSectors = 0;
			levelStats.countFullyScavengedSectors = 0;
			levelStats.countScoutedSectors = 0;
			levelStats.countRevealedSectors = 0;
			levelStats.countVisitedSectors = 0;
			levelStats.countKnownIngredientSectors = 0;
			levelStats.countUnscoutedLocaleSectors = 0;
			levelStats.countInvestigatableSectors = 0;
			levelStats.countSeenClearedWorkshops = 0;
			levelStats.hasCamp = false;
			
			for (let node = this.sectorNodes.head; node; node = node.next) {
				let sectorPosition = node.entity.get(PositionComponent);
				let sectorStatus = GameGlobals.sectorHelper.getSectorStatus(node.entity);
				if (sectorPosition.level !== level) continue;
				levelStats.totalSectors++;

				let statusComponent = node.entity.get(SectorStatusComponent);
				let featuresComponent = node.entity.get(SectorFeaturesComponent);
				let workshopComponent = node.entity.get(WorkshopComponent);
				let sectorControlComponent = node.entity.get(SectorControlComponent);
				let isVisited = GameGlobals.sectorHelper.isVisited(node.entity);
				let hasUnscoutedLocales = GameGlobals.sectorHelper.getNumVisibleUnscoutedLocales(node.entity) > 0;
				
				if (sectorStatus === SectorConstants.MAP_SECTOR_STATUS_VISITED_CLEARED) levelStats.countClearedSectors++;
				if (statusComponent.scouted) levelStats.countScoutedSectors++;
				if (statusComponent.scavenged) levelStats.countScavengedSectors++;
				if (statusComponent.getScavengedPercent() >= 100) levelStats.countFullyScavengedSectors++;
				if (isVisited) levelStats.countVisitedSectors++;
				if (workshopComponent && workshopComponent.isClearable && !sectorControlComponent.hasControlOfLocale(LocaleConstants.LOCALE_ID_WORKSHOP)) levelStats.countSeenClearedWorkshops++;
				if (node.entity.has(RevealedComponent) || isVisited) levelStats.countRevealedSectors++;
				if (GameGlobals.sectorHelper.hasSectorVisibleIngredients(node.entity)) levelStats.countKnownIngredientSectors++;
				if (hasUnscoutedLocales) levelStats.countUnscoutedLocaleSectors++;
				if (GameGlobals.sectorHelper.canBeInvestigated(node.entity)) levelStats.countInvestigatableSectors++;
				if (node.entity.has(CampComponent)) levelStats.hasCamp = true;
			}

			this.calculateLevelStatPercentages(levelStats);

			return levelStats;
		},

		calculateLevelStatPercentages: function (levelStats) {
			levelStats.percentClearedSectors = levelStats.countClearedSectors == levelStats.totalSectors ? 1 : levelStats.countClearedSectors / levelStats.totalSectors;
			levelStats.percentScoutedSectors = levelStats.countScoutedSectors == levelStats.totalSectors ? 1 : levelStats.countScoutedSectors / levelStats.totalSectors;
			levelStats.percentRevealedSectors = levelStats.countRevealedSectors == levelStats.totalSectors ? 1 : levelStats.countRevealedSectors / levelStats.totalSectors;
			levelStats.percentVisitedSectors = levelStats.countVisitedSectors == levelStats.totalSectors ? 1 : levelStats.countVisitedSectors / levelStats.totalSectors;
		},

		getLevelNumScoutedSectors: function (level) {
			let result = 0;
			
			for (let node = this.sectorNodes.head; node; node = node.next) {
				let sectorPosition = node.entity.get(PositionComponent);
				if (sectorPosition.level !== level) continue;
				let statusComponent = node.entity.get(SectorStatusComponent);
				if (statusComponent.scouted) result++;
			}

			return result;
		},
		
		getWorkshopsSectorsForLevel: function (level) {
			let result = [];

			this.saveSectorsForLevel(level);

			var sectorPosition;
			for (let i = 0; i < this.sectorEntitiesByLevel[level].length; i++) {
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
			for (let i = 0; i < this.sectorEntitiesByLevel[level].length; i++) {
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
			var featuresComponent = sectorEntity.get(SectorFeaturesComponent);
			var improvementsComponent = sectorEntity.get(SectorImprovementsComponent);
			let level = sectorPosition.level;
			let levelOrdinal = GameGlobals.gameState.getLevelOrdinal(level);

			var scouted = statusComponent && statusComponent.scouted;
			if (!scouted) return projects;

			levelPassagesComponent = levelPassagesComponent || this.getLevelEntityForPosition(sectorPosition.level).get(LevelPassagesComponent);
			let camp = sectorEntity.get(CampComponent);

			var improvementName = "";
			var actionName = "";
			var actionLabel;

			// passages
			if (levelPassagesComponent.passagesUp[sectorPosition.sectorId()] && !levelPassagesComponent.passagesUpBuilt[sectorPosition.sectorId()]) {
				switch (levelPassagesComponent.passagesUp[sectorPosition.sectorId()].type) {
					case MovementConstants.PASSAGE_TYPE_HOLE:
						improvementName = improvementNames.passageUpHole;
						actionName = "build_out_passage_up_hole";
						actionLabel = "build";
						break;
					case MovementConstants.PASSAGE_TYPE_ELEVATOR:
						improvementName = improvementNames.passageUpElevator;
						actionName = "build_out_passage_up_elevator";
						actionLabel = "repair";
						break;
					case MovementConstants.PASSAGE_TYPE_STAIRWELL:
						improvementName = improvementNames.passageUpStairs;
						actionName = "build_out_passage_up_stairs";
						actionLabel = "repair";
						break;
				}
				if (GameGlobals.playerActionsHelper.isVisible(actionName, sectorEntity, [ PlayerActionConstants.DISABLED_REASON_UPGRADE ])) {
					actionName = actionName + "_" + levelOrdinal;
					projects.push(new LevelProjectVO(new ImprovementVO(improvementName), actionName, sectorPosition, PositionConstants.DIRECTION_UP, null, actionLabel));
				}
			}

			if (levelPassagesComponent.passagesDown[sectorPosition.sectorId()] && !levelPassagesComponent.passagesDownBuilt[sectorPosition.sectorId()]) {
				let passageType = levelPassagesComponent.passagesDown[sectorPosition.sectorId()].type;
				switch (passageType) {
					case MovementConstants.PASSAGE_TYPE_HOLE:
						improvementName = improvementNames.passageDownHole;
						actionName = GameGlobals.movementHelper.getBuildActionForPassageType(passageType);
						actionLabel = "build";
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
				}
				
				if (GameGlobals.playerActionsHelper.isVisible(actionName, sectorEntity, [ PlayerActionConstants.DISABLED_REASON_UPGRADE ])) {
					actionName = actionName + "_" + levelOrdinal;
					projects.push(new LevelProjectVO(new ImprovementVO(improvementName), actionName, sectorPosition, PositionConstants.DIRECTION_DOWN, null, actionLabel));
				}
			}

			// movement blockers (bridges and debris)
			for (let i in PositionConstants.getLevelDirections()) {
				var direction = PositionConstants.getLevelDirections()[i];
				var directionBlocker = sectorPassagesComponent.getBlocker(direction);
				if (directionBlocker) {
					if (!GameGlobals.movementHelper.isBlocked(sectorEntity, direction)) continue;

					switch (directionBlocker.type) {
						case MovementConstants.BLOCKER_TYPE_GAP:
							projects.push(new LevelProjectVO(null, "bridge_gap", sectorPosition, direction, "Gap", "bridge"));
							break;
						case MovementConstants.BLOCKER_TYPE_DEBRIS:
						case MovementConstants.BLOCKER_TYPE_EXPLOSIVES:
							let neighbour = this.getNeighbour(sectorEntity, direction);
							if (!neighbour) {
								log.w("no neighbour for clear blocker action found at " + sectorPosition);
								continue;
							}
							let neighbourFeaturesComponent = neighbour.get(SectorFeaturesComponent);
							let isEarlyZone = featuresComponent.isEarlyZone() && neighbourFeaturesComponent.isEarlyZone();
							let actionName = this.getClearBlockerActionName(directionBlocker.type, isEarlyZone);
							let projectName = this.getClearBlockerProjectName(directionBlocker.type);
							projects.push(new LevelProjectVO(null, actionName, sectorPosition, direction, projectName, "clear"));
							break;
					}
				}
			}

			// space ship and sundome
			if (levelOrdinal === GameGlobals.gameState.getSurfaceLevelOrdinal()) {
				if (camp) {
					var actions = [ "build_out_spaceship1", "build_out_spaceship2", "build_out_spaceship3", "build_out_sundome"];
					for (let i = 0; i < actions.length; i++) {
						let isReqsMet = GameGlobals.playerActionsHelper.isRequirementsMet(actions[i], null, [ PlayerActionConstants.DISABLED_REASON_PROJECT_IN_PROGRESS ]);
						if (isReqsMet || GameGlobals.playerActionsHelper.isInProgress(actions[i])) {
							var improvement = GameGlobals.playerActionsHelper.getImprovementNameForAction(actions[i]);
							if (improvementsComponent.getCount(improvement) <= 0) {
								projects.push(new LevelProjectVO(new ImprovementVO(improvement), actions[i], sectorPosition));
							}
						}
					}
				}
			}
			
			// lxuury resources
			if (improvementsComponent.getCount(improvementNames.luxuryOutpost) <= 0) {
				let luxuryResource = GameGlobals.sectorHelper.getLuxuryResourceOnSector(sectorEntity);
				if (luxuryResource && GameGlobals.gameState.foundLuxuryResources.indexOf(luxuryResource) >= 0) {
					let name = this.getProjectName(improvementNames.luxuryOutpost, sectorEntity);
					projects.push(new LevelProjectVO(new ImprovementVO(improvementNames.luxuryOutpost), "build_out_luxury_outpost", sectorPosition, null, name));
				}
			}
			
			// trade connector
			if (this.isFirstScoutedSectorWithFeatureOnLevel(sectorEntity, "hasTradeConnectorSpot")) {
				if (GameGlobals.playerActionsHelper.getCurrentImprovementCountOnLevel(level, "tradepost_connector") <= 0) {
					projects.push(new LevelProjectVO(new ImprovementVO(improvementNames.tradepost_connector), "build_out_tradepost_connector", sectorPosition));
				}
			}
			
			// buildable workshops
			if (featuresComponent.sunlit) {
				if (improvementsComponent.getCount(improvementNames.greenhouse) <= 0) {
					let workshopComponent = sectorEntity.get(WorkshopComponent);
					if (workshopComponent && workshopComponent.resource == resourceNames.herbs) {
						projects.push(new LevelProjectVO(new ImprovementVO(improvementNames.greenhouse), "build_out_greenhouse", sectorPosition, null, null, "repair"));
					}
				}
			}

			return projects;
		},

		getClearBlockerActionName: function (blockerType, isEarlyZone) {
			switch (blockerType) {
				case MovementConstants.BLOCKER_TYPE_GAP: return "bridge_gap";
				case MovementConstants.BLOCKER_TYPE_DEBRIS: return isEarlyZone ? "clear_debris_e" : "clear_debris_l";
				case MovementConstants.BLOCKER_TYPE_EXPLOSIVES: return isEarlyZone ? "clear_explosives_e" : "clear_explosives_l";
				case MovementConstants.BLOCKER_TYPE_TOLL_GATE: return "clear_gate";
			}
			
		},

		getClearBlockerProjectName: function (blockerType, isEarlyZone) {
			switch (blockerType) {
				case MovementConstants.BLOCKER_TYPE_GAP: return "Bridge";
				case MovementConstants.BLOCKER_TYPE_DEBRIS: return "Debris";
				case MovementConstants.BLOCKER_TYPE_EXPLOSIVES: return "Explosives";
			}
			
		},

		getBuiltProjectsForSector: function (sectorEntity) {
			let projects = [];
			let statusComponent = sectorEntity.get(SectorStatusComponent);
			let scouted = statusComponent && statusComponent.scouted;
			if (!scouted) return projects;

			let sectorPosition = sectorEntity.get(PositionComponent);
			let level = sectorPosition.level;
			let sectorImprovements = sectorEntity.get(SectorImprovementsComponent);
			let improvementList = sectorImprovements.getAll(improvementTypes.level);
			for (let i = 0; i < improvementList.length; i++) {
				let improvement = improvementList[i];
				if (improvement.name === improvementNames.collector_food) continue;
				if (improvement.name === improvementNames.collector_water) continue;
				if (improvement.name === improvementNames.beacon) continue;
				if (improvement.name === improvementNames.luxuryOutpost && !GameGlobals.sectorHelper.getLuxuryResourceOnSector(sectorEntity, true)) continue;
				let name = this.getProjectName(improvement.name, sectorEntity);
				projects.push(new LevelProjectVO(improvement, "", sectorPosition, null, name));
			}

			return projects;
		},
		
		getProjectName: function (improvementName, sector) {
			switch (improvementName) {
				case improvementNames.luxuryOutpost:
					let luxuryResource = GameGlobals.sectorHelper.getLuxuryResourceOnSector(sector);
					let resourceName = TribeConstants.getLuxuryDisplayName(luxuryResource);
					return "Resource outpost (" + resourceName + ")";
			}
			
			let improvementID = ImprovementConstants.getImprovementID(improvementName);
			return ImprovementConstants.getImprovementDisplayName(improvementID);
		},
		
		getTotalClearedWorkshopCount: function (resourceName) {
			let result = 0;
			for (let i = 1; i <= 15; i++) {
				result += this.getCampClearedWorkshopCount(i, resourceName);
			}
			return result;
		},
		
		getWorkshopsByResourceForCamp: function (campOrdinal) {
			let workshops = {};
			workshops.herbs = GameGlobals.levelHelper.getCampBuiltOutImprovementsCount(campOrdinal, improvementNames.greenhouse);
			workshops.rubber = GameGlobals.levelHelper.getCampClearedWorkshopCount(campOrdinal, resourceNames.rubber);
			workshops.fuel = GameGlobals.levelHelper.getCampClearedWorkshopCount(campOrdinal, resourceNames.fuel);
			return workshops;
		},
		
		getCampClearedWorkshopCount: function (campOrdinal, resourceName) {
			var levels = GameGlobals.gameState.getLevelsForCamp(campOrdinal);
			let result = 0;
			for (let i = 0; i < levels.length; i++) {
				result += this.getLevelClearedWorkshopCount(levels[i], resourceName);
			}
			return result;
		},

		getLevelClearedWorkshopCount: function (level, resourceName) {
			let entity = this.getLevelEntityForPosition(level);
			let levelStatus = entity.get(LevelStatusComponent);
			return levelStatus.clearedWorkshops[resourceName] || 0;
		},

		getSectorUnclearedWorkshopCount: function (sectorEntity) {
			var count = 0;
			var featuresComponent;
			var sectorControlComponent;
			featuresComponent = sectorEntity.get(SectorFeaturesComponent);
			sectorControlComponent = sectorEntity.get(SectorControlComponent);
			if (sectorEntity.has(WorkshopComponent)) {
				let workshopComponent = sectorEntity.get(WorkshopComponent);
				if (workshopComponent.isClearable && !sectorControlComponent.hasControlOfLocale(LocaleConstants.LOCALE_ID_WORKSHOP)) {
					count++;
				}
			}
			return count;
		},

		getCampBuiltOutImprovementsCount: function (campOrdinal, improvementName) {
			var levels = GameGlobals.gameState.getLevelsForCamp(campOrdinal);
			let result = 0;
			for (let i = 0; i < levels.length; i++) {
				result += this.getLevelBuiltOutImprovementsCount(levels[i], improvementName);
			}
			return result;
		},
		
		getLevelBuiltOutImprovementsCount: function (level, improvementName) {
			let levelEntity = this.getLevelEntityForPosition(level);
			let levelStatus = levelEntity.get(LevelStatusComponent);
			let improvementID = ImprovementConstants.getImprovementID(improvementName);
			return levelStatus.improvementCounts[improvementID] || 0;
		},

		getAllInvestigateableSectors: function () {
			let result = [];
			for (let node = this.sectorNodes.head; node; node = node.next) {
				if (GameGlobals.sectorHelper.canBeInvestigated(node.entity, true)) {
					result.push(node.entity);
				}
			}
			return result;
		},
		
		// TODO move to a system
		addFallbackInvestigateSectors: function () {
			let sectorNodes = this.sectorNodes;
			
			let isValidFallbackInvestigateSector = function (sector) {
				let featuresComponent = sector.get(SectorFeaturesComponent);
				if (featuresComponent.isInvestigatable) return false;
				if (featuresComponent.campable) return false;
				let statusComponent = sector.get(SectorStatusComponent);
				if (statusComponent.isFallbackInvestigateSector) return false;
				return true;
			};
			
			let getSectorScore = function (sector) {
				let result = 0;
				let featuresComponent = sector.get(SectorFeaturesComponent);
				let statusComponent = sector.get(SectorStatusComponent);
				let position = sector.get(PositionComponent);
				result += position.level * 100;
				result += featuresComponent.hazards.radiation || 0;
				result += featuresComponent.hazards.poison || 0;
				result -= statusComponent.getScavengedPercent();
				return result;
			};
			
			let selectCandidates = function (num) {
				let candidates = [];
				let maxCandidates = num * 3;
				
				for (let level = GameGlobals.gameState.getSurfaceLevel(); level >= GameGlobals.gameState.getGroundLevel(); level--) {
					let sectors = GameGlobals.levelHelper.getSectorsByLevel(level);
					for (let i in sectors) {
						let sector = sectors[i];
						if (isValidFallbackInvestigateSector(sector)) {
							candidates.push({ sector: sector, score: getSectorScore(sector) });
							if (candidates.length >= maxCandidates) return candidates;
						}
					}
				}
				
				return candidates;
			}
			
			let selectSectors = function (num) {
				let candidates = selectCandidates(num);
				
				if (candidates.length < num) return [];
				
				candidates.sort(function (a, b) { return a.score - b.score; });
				
				return candidates.slice(0, num);
			}
			
			let sectors = selectSectors(2);
			let result = [];
			
			for (let i in sectors) {
				let sector = sectors[i].sector;
				let statusComponent = sector.get(SectorStatusComponent);
				statusComponent.isFallbackInvestigateSector = true;
				result.push(sector);
			}
			
			return result;
		},

		getFoundLuxuryResourceOnLevel: function (level) {
			let resource = this.getLuxuryResourceOnLevel(level);
			
			if (resource == null) return null;
			
			if (GameGlobals.gameState.foundLuxuryResources.indexOf(resource) < 0) return null;
			
			return resource;
		},
		
		getLuxuryResourceOnLevel: function (level) {
			let locales = this.getLevelLocales(level, true);
			let resource = null;
			for (let i = 0; i < locales.length; i++) {
				let locale = locales[i];
				if (locale.luxuryResource) {
					return locale.luxuryResource;
				}
			}
			
			return null;
		},
		
		getFoundLuxuryResourceOnCampOrdinal: function (campOrdinal) {
			let levelsForCamp = GameGlobals.gameState.getLevelsForCamp(campOrdinal);
			for (let i = 0; i < levelsForCamp.length; i++) {
				let level = levelsForCamp[i];
				let resourceOnLevel = this.getFoundLuxuryResourceOnLevel(level);
				if (resourceOnLevel) {
					return resourceOnLevel;
				}
			}
			return null;
		},

		isLevelUnlocked: function (level) {
			if (level === 13) return true;
			if (level > GameGlobals.gameState.getSurfaceLevel()) return false;
			if (level < GameGlobals.gameState.getGroundLevel()) return false;
			let levelEntity = this.getLevelEntityForPosition(level);
			if (levelEntity) {
				if (level < 13) {
					return this.isPassageUpBuilt(level);
				}

				if (level > 13) {
					return this.isPassageDownBuilt(level);
				}
			}

			return false;
		},

		isPassageUpBuilt: function (level) {
			let levelEntity = this.getLevelEntityForPosition(level);
			let levelPassagesComponent = levelEntity.get(LevelPassagesComponent);
			let passageSectors = Object.keys(levelPassagesComponent.passagesUpBuilt);
			for (let iu = 0; iu < passageSectors.length; iu++) {
				let sectorID = passageSectors[iu];
				if (levelPassagesComponent.passagesUpBuilt[sectorID]) return true;
			}
			return false;
		},

		isPassageDownBuilt: function (level) {
			let levelEntity = this.getLevelEntityForPosition(level);
			let levelPassagesComponent = levelEntity.get(LevelPassagesComponent);
			let passageSectors = Object.keys(levelPassagesComponent.passagesDownBuilt);
			for (let id = 0; id < passageSectors.length; id++) {
				let sectorID = passageSectors[id];
				if (levelPassagesComponent.passagesDownBuilt[sectorID]) return true;
			}
			return false;
		},

		isPassageUpAvailable: function (level) {
			let levelEntity = this.getLevelEntityForPosition(level);
			let levelPassagesComponent = levelEntity.get(LevelPassagesComponent);
			let passageSectors = Object.keys(levelPassagesComponent.passagesUp);
			for (let iu = 0; iu < passageSectors.length; iu++) {
				let sectorID = passageSectors[iu];
				if (levelPassagesComponent.passagesUpBuilt[sectorID]) return true;
				let passageVO = levelPassagesComponent.passagesUp[sectorID];
				if (!passageVO) continue;
				let passageType = passageVO.type;
				if (passageType == MovementConstants.PASSAGE_TYPE_PREBUILT) return true;
			}
			return false;
		},

		isPassageDownAvailable: function (level) {
			let levelEntity = this.getLevelEntityForPosition(level);
			let levelPassagesComponent = levelEntity.get(LevelPassagesComponent);
			let passageSectors = Object.keys(levelPassagesComponent.passagesDown);
			for (let id = 0; id < passageSectors.length; id++) {
				let sectorID = passageSectors[id];
				if (levelPassagesComponent.passagesDownBuilt[sectorID]) return true;
				let passageVO = levelPassagesComponent.passagesDown[sectorID];
				if (!passageVO) continue;
				let passageType = passageVO.type;
				if (passageType == MovementConstants.PASSAGE_TYPE_PREBUILT) return true;
			}
			return false;
		},

		isPassageUpFound: function (level) {
			let levelEntity = this.getLevelEntityForPosition(level);
			let levelPassagesComponent = levelEntity.get(LevelPassagesComponent);
			let passageSectors = Object.keys(levelPassagesComponent.passagesUp);
			for (let iu = 0; iu < passageSectors.length; iu++) {
				let sectorID = passageSectors[iu];
				let sector = this.getSectorBySectorId(level, sectorID);
				let sectorStatus = sector.get(SectorStatusComponent);
				if (sectorStatus.scouted) return true;
			}
			return false;
		},

		isPassageDownFound: function (level) {
			let levelEntity = this.getLevelEntityForPosition(level);
			let levelPassagesComponent = levelEntity.get(LevelPassagesComponent);
			let passageSectors = Object.keys(levelPassagesComponent.passagesDown);
			for (let iu = 0; iu < passageSectors.length; iu++) {
				let sectorID = passageSectors[iu];
				let sector = this.getSectorBySectorId(level, sectorID);
				let sectorStatus = sector.get(SectorStatusComponent);
				if (sectorStatus.scouted) return true;
			}
			return false;
		},

		isNextPassageFound: function (level) {
			if (level == GameGlobals.gameState.getGroundLevel()) {
				return this.isPassageUpFound(13);
			} else if (level >= 14) {
				return this.isPassageUpFound(level);
			} else {
				return this.isPassageDownFound(level);
			}
		},

		isSectorReachable: function (startSector, goalSector) {
			var settings = { skipUnrevealed: false, skipBlockers: true, omitWarnings: false };
			var path = this.findPathTo(startSector, goalSector, settings);
			return path && path.length >= 0;
		},
		
		isLevelCampable: function (level) {
			let levelEntity = GameGlobals.levelHelper.getLevelEntityForPosition(level);
			let levelComponent = levelEntity.get(LevelComponent);
			return levelComponent.isCampable;
		},
		
		isCampReachableByTribeTraders: function (sector) {
			let camp = sector.get(CampComponent);
			if (!camp) return false;
			let position = sector.get(PositionComponent);
			if (position.level > 14) {
				if (this.getLevelBuiltOutImprovementsCount(14, improvementNames.tradepost_connector) < 1) {
					return false;
				}
			}
			return true;
		},

		isExplorationBlockedByGang: function () {
			for (let node = this.gangNodes.head; node; node = node.next) {
				let gangPosition = node.entity.get(PositionComponent);

				// already defeated
				if (node.gang.isDefeated()) {
					continue;
				}

				let sectors = this.getSectorsForGang(gangPosition);
				let numScouted = 0;
				for (let i = 0; i < sectors.length; i++) {
					let statusComponent = sectors[i].get(SectorStatusComponent);
					if (statusComponent.scouted) numScouted++;
				}

				// player not seen gang
				if (numScouted == 0) continue;

				// player been able to go around gang
				if (numScouted == sectors.length) continue;

				return true;
			}

			return false;
		},
		
		isScoutedSectorWithFeature: function (sector, feature) {
			let statusComponent = sector.get(SectorStatusComponent);
			if (!statusComponent.scouted) return false;
			let featuresComponent = sector.get(SectorFeaturesComponent);
			if (!featuresComponent[feature]) return false;
			return true;
		},
		
		getFirstScoutedSectorWithFeatureOnLevel: function (level, feature) {
			let entity = this.getLevelEntityForPosition(level);
			let levelStatus = entity.get(LevelStatusComponent);

			let sectorId = levelStatus.firstScoutedSectorByFeature[feature];

			if (!sectorId) return null;
			
			return this.getSectorBySectorId(level, sectorId);
		},
		
		isFirstScoutedSectorWithFeatureOnLevel: function (sector, feature) {
			if (!this.isScoutedSectorWithFeature(sector, feature)) return false;
			let level = sector.get(PositionComponent).level;
			
			let first = this.getFirstScoutedSectorWithFeatureOnLevel(level, feature);
			return first == sector;
		},
		
		getLevelLocales: function (level, includeScouted, localeBracket, excludeLocaleVO, requireBlueprints) {
			var locales = [];
			for (let i = 0; i < this.sectorEntitiesByLevel[level].length; i++) {
				var sectorEntity = this.sectorEntitiesByLevel[level][i];
				locales = locales.concat(this.getSectorLocales(sectorEntity, includeScouted, localeBracket, excludeLocaleVO, requireBlueprints));
			}
			return locales;
		},

		getSectorLocales: function (sectorEntity, includeScouted, localeBracket, excludeLocaleVO, requireBlueprints) {
			var locales = [];
			var sectorLocalesComponent = sectorEntity.get(SectorLocalesComponent);
			var sectorStatus = sectorEntity.get(SectorStatusComponent);
			var locale;
			for (let i = 0; i < sectorLocalesComponent.locales.length; i++) {
				locale = sectorLocalesComponent.locales[i];
				if (locale === excludeLocaleVO) continue;
				if (localeBracket && localeBracket !== locale.getBracket()) continue;
				if (!includeScouted && sectorStatus.isLocaleScouted(i)) continue;
				if (requireBlueprints && !locale.hasBlueprints) continue;
				locales.push(locale);
			}
			return locales;
		},

		getSectorLocalesForPlayer: function (sectorEntity) {
			var locales = [];
			var sectorLocalesComponent = sectorEntity.get(SectorLocalesComponent);
			var sectorStatus = sectorEntity.get(SectorStatusComponent);
			var locale;
			for (let i = 0; i < sectorLocalesComponent.locales.length; i++) {
				locale = sectorLocalesComponent.locales[i];
				var action = "scout_locale_" + locale.getCategory() + "_" + i;
				if (!sectorStatus.isLocaleScouted(i)) {
					if (GameGlobals.playerActionsHelper.checkAvailability(action, false, sectorEntity))
						locales.push(locale);
				}
			}
			return locales;
		},
		
		getLevelStashSectors: function (level) {
			var sectors = [];
			this.saveSectorsForLevel(level);
			for (let i = 0; i < this.sectorEntitiesByLevel[level].length; i++) {
				var sectorEntity = this.sectorEntitiesByLevel[level][i];
				var featuresComponent = sectorEntity.get(SectorFeaturesComponent);
				if (featuresComponent.stashes.length > 0) {
					sectors.push(sectorEntity);
				}
			}
			return sectors;
		},

		getSimpleDistance: function (pos1, pos2) {
			return PositionConstants.getDistanceTo(pos1, pos2);
		},
		
		getNearestBeacon: function (pos) {
			let sector = this.getSectorByPosition(pos.level, pos.sectorX, pos.sectorY);
			if (sector && sector.has(BeaconComponent)) return sector;
			
			let result = null;
			let resultDistance = -1;
			for (var node = this.beaconNodes.head; node; node = node.next) {
				if (node.position.level != pos.level) continue;
				let distance = PositionConstants.getDistanceTo(pos, node.position);
				if (result == null || distance < resultDistance) {
					result = node.entity;
					resultDistance = distance;
				}
			}
			return result;
		},
		
		findNearestKnownWaterSector: function (pos, limitToCurrentLevel) {
			let result = null;
			this.forEverySectorFromLocation(pos, (sector) => {
				if (GameGlobals.sectorHelper.hasSectorKnownResource(sector, resourceNames.water, true)) {
					result = sector;
					return true;
				}
				return false;
			}, limitToCurrentLevel);
			return result;
		},
		
		findNearestKnownFoodSector: function (pos, limitToCurrentLevel) {
			let result = null;
			this.forEverySectorFromLocation(pos, (sector) => {
				if (GameGlobals.sectorHelper.hasSectorKnownResource(sector, resourceNames.food, true)) {
					result = sector;
					return true;
				}
				return false;
			}, limitToCurrentLevel);
			return result;
		},

		findNearestLocaleSector: function (pos, localeType) {
			let result = null;
			this.forEverySectorFromLocation(pos, (sector) => {
				let sectorLocalesComponent = sector.get(SectorLocalesComponent);
				for (let i = 0; i < sectorLocalesComponent.locales.length; i++) {
					if (sectorLocalesComponent.locales[i].type == localeType) {
						result = sector;
						return true;
					}
				}
				return false;
			}, true);
			return result;
		},
		
		getAllSectorsWithImprovement: function (level, improvementName) {
			var sectors = [];
			this.saveSectorsForLevel(level);
			for (let i = 0; i < this.sectorEntitiesByLevel[level].length; i++) {
				var sector = this.sectorEntitiesByLevel[level][i];
				let improvementsComponent = sector.get(SectorImprovementsComponent);
				if (improvementsComponent.getCount(improvementName) > 0) {
					sectors.push(sector);
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
