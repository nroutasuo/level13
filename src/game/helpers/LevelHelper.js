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
	'game/components/common/CampComponent',
	'game/components/common/VisitedComponent',
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
	CampComponent,
	VisitedComponent,
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
					let visited = sectors[i].has(VisitedComponent);
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
				let visited = node.entity.has(VisitedComponent);
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

		forEverySectorFromLocation: function (pos, func, limitToCurrentLevel) {
			// TODO go by path distance, not distance in coordinates / make that an option

			var doLevel = function (level) {
				if (!this.isLevelUnlocked(level))
					return false;
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

			var currentLevel = pos.level;
			var isDone;
			var dlimit = limitToCurrentLevel ? 1 : WorldConstants.LEVEL_NUMBER_MAX;
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
					if (existingProject.sector === project.sector && (existingProject.level - 1 === project.level || existingProject.level + 1 === project.level)) {
						projectExists = true;
						break;
					}
					// neighbouring movement blockers
					if (project.direction !== undefined) {
						var dist = PositionConstants.getDistanceTo(existingProject.position, project.position);
						if (dist < 2) {
							if (PositionConstants.getOppositeDirection(project.direction) == existingProject.direction) {
								projectExists = true;
								break;
							}
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
			levelStats.countVisitedSectors = 0;
			levelStats.countKnownIngredientSectors = 0;

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
				if (node.entity.has(VisitedComponent)) levelStats.countVisitedSectors++;
				if (node.entity.has(RevealedComponent) || node.entity.has(VisitedComponent)) levelStats.countRevealedSectors++;
				if (GameGlobals.sectorHelper.hasSectorVisibleIngredients(node.entity)) levelStats.countKnownIngredientSectors++;
			}

			levelStats.percentClearedSectors = levelStats.countClearedSectors == levelStats.totalSectors ? 1 : levelStats.countClearedSectors / levelStats.totalSectors;
			levelStats.percentScoutedSectors = levelStats.countScoutedSectors == levelStats.totalSectors ? 1 : levelStats.countScoutedSectors / levelStats.totalSectors;
			levelStats.percentRevealedSectors = levelStats.countRevealedSectors == levelStats.totalSectors ? 1 : levelStats.countRevealedSectors / levelStats.totalSectors;
			levelStats.percentVisitedSectors = levelStats.countVisitedSectors == levelStats.totalSectors ? 1 : levelStats.countVisitedSectors / levelStats.totalSectors;

			return levelStats;
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
				if (GameGlobals.playerActionsHelper.isVisible(actionName, sectorEntity)) {
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
							let actionName = "clear_debris_e";
							let neighbour = this.getNeighbour(sectorEntity, direction);
							if (!neighbour) {
								log.w("no neighbour for clear debris action found at " + sectorPosition)
							}
							let neighbourFeaturesComponent = neighbour.get(SectorFeaturesComponent);
							if (!featuresComponent.isEarlyZone() || !neighbourFeaturesComponent.isEarlyZone()) {
								actionName = "clear_debris_l";
							}
							projects.push(new LevelProjectVO(null, actionName, sectorPosition, direction, "Debris", "clear"));
							break;
					}
				}
			}

			// space ship and sundome
			if (levelOrdinal === GameGlobals.gameState.getSurfaceLevelOrdinal()) {
				if (camp) {
					var actions = [ "build_out_spaceship1", "build_out_spaceship2", "build_out_spaceship3", "build_out_sundome"];
					for (let i = 0; i < actions.length; i++) {
						if (GameGlobals.playerActionsHelper.isRequirementsMet(actions[i])) {
							var improvement = GameGlobals.playerActionsHelper.getImprovementNameForAction(actions[i]);
							if (improvementsComponent.getCount(improvement) <= 0) {
								projects.push(new LevelProjectVO(new ImprovementVO(improvement), actions[i], sectorPosition));
							}
						}
					}
				}
			}
			
			// lxuury resources
			if (camp && improvementsComponent.getCount(improvementNames.luxuryOutpost) == 0) {
				let luxuryResource = this.getFoundLuxuryResourceOnLevel(level);
				if (luxuryResource) {
					let name = this.getProjectName(improvementNames.luxuryOutpost, level);
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
						projects.push(new LevelProjectVO(new ImprovementVO(improvementNames.greenhouse), "build_out_greenhouse", sectorPosition));
					}
				}
			}

			return projects;
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
				let name = this.getProjectName(improvement.name, level);
				projects.push(new LevelProjectVO(improvement, "", sectorPosition, name));
			}

			return projects;
		},
		
		getProjectName: function (improvementName, level) {
			switch (improvementName) {
				case improvementNames.luxuryOutpost:
					let luxuryResource = this.getFoundLuxuryResourceOnLevel(level);
					let resourceName = TribeConstants.getLuxuryDisplayName(luxuryResource);
					return "Resource outpost (" + resourceName + ")";
			}
			
			return ImprovementConstants.getImprovementDisplayName(improvementName);
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
				let workshopComponent = sectorEntity.get(WorkshopComponent);
				if (workshopComponent.isClearable && !sectorControlComponent.hasControlOfLocale(LocaleConstants.LOCALE_ID_WORKSHOP)) {
					count++;
				}
			}
			return count;
		},

		getCampBuiltOutImprovementsCount: function (campOrdinal, improvement) {
			var levels = GameGlobals.gameState.getLevelsForCamp(campOrdinal);
			let result = 0;
			for (let i = 0; i < levels.length; i++) {
				result += this.getLevelBuiltOutImprovementsCount(levels[i], improvement);
			}
			return result;
		},
		
		getLevelBuiltOutImprovementsCount: function (level, improvement) {
			var count = 0;
			var improvementsComponent;
			this.saveSectorsForLevel(level);
			for (let i = 0; i < this.sectorEntitiesByLevel[level].length; i++) {
				var sectorEntity = this.sectorEntitiesByLevel[level][i];
				improvementsComponent = sectorEntity.get(SectorImprovementsComponent);
				count += improvementsComponent.getCount(improvement);
			}
			return count;
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
		
		isScoutedSectorWithFeature: function (sector, feature) {
			let statusComponent = sector.get(SectorStatusComponent);
			if (!statusComponent.scouted) return false;
			let featuresComponent = sector.get(SectorFeaturesComponent);
			if (!featuresComponent[feature]) return false;
			return true;
		},
		
		getFirstScoutedSectorWithFeatureOnLevel: function (level, feature) {
			let result = null;
			let minTimestamp = null;
				
			for (let i = 0; i < this.sectorEntitiesByLevel[level].length; i++) {
				var sector = this.sectorEntitiesByLevel[level][i];
				if (!this.isScoutedSectorWithFeature(sector, feature)) continue;
				
				let timestamp = sector.get(SectorStatusComponent).scoutedTimestamp;
				if (!minTimestamp || minTimestamp > timestamp) {
					result = sector;
					minTimestamp = timestamp;
				}
			}
			
			return result;
		},
		
		isFirstScoutedSectorWithFeatureOnLevel: function (sector, feature) {
			if (!this.isScoutedSectorWithFeature(sector, feature)) return false;
			let level = sector.get(PositionComponent).level;
			
			let first = this.getFirstScoutedSectorWithFeatureOnLevel(level, feature);
			return first == sector;
		},
		
		getLevelLocales: function (level, includeScouted, localeBracket, excludeLocaleVO, requireBlueprints) {
			var locales = [];
			var sectorPosition;
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
		
		findNearestKnownWaterSector: function (pos) {
			let result = null;
			this.forEverySectorFromLocation(pos, (sector) => {
				if (GameGlobals.sectorHelper.hasSectorKnownResource(sector, resourceNames.water, true)) {
					result = sector;
					return true;
				}
				return false;
			});
			return result;
		},
		
		findNearestKnownFoodSector: function (pos) {
			let result = null;
			this.forEverySectorFromLocation(pos, (sector) => {
				if (GameGlobals.sectorHelper.hasSectorKnownResource(sector, resourceNames.food, true)) {
					result = sector;
					return true;
				}
				return false;
			});
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
