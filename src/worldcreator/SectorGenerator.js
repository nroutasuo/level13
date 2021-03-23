// Handles the first step of world generation, the abstract world template itself
define([
	'ash',
	'utils/MathUtils',
	'game/constants/EnemyConstants',
	'game/constants/ItemConstants',
	'game/constants/LevelConstants',
	'game/constants/LocaleConstants',
	'game/constants/MovementConstants',
	'game/constants/PositionConstants',
	'game/constants/SectorConstants',
	'game/constants/TradeConstants',
	'game/constants/UpgradeConstants',
	'game/constants/WorldConstants',
	'game/vos/GangVO',
	'game/vos/LocaleVO',
	'game/vos/PathConstraintVO',
	'game/vos/PositionVO',
	'game/vos/ResourcesVO',
	'game/vos/StashVO',
	'worldcreator/WorldCreatorConstants',
	'worldcreator/WorldCreatorHelper',
	'worldcreator/WorldCreatorRandom',
	'worldcreator/WorldCreatorDebug',
	'worldcreator/WorldCreatorLogger',
	'worldcreator/CriticalPathVO',
], function (
	Ash, MathUtils,
	EnemyConstants, ItemConstants, LevelConstants, LocaleConstants, MovementConstants, PositionConstants, SectorConstants, TradeConstants, UpgradeConstants, WorldConstants,
	GangVO, LocaleVO, PathConstraintVO, PositionVO, ResourcesVO, StashVO,
	WorldCreatorConstants, WorldCreatorHelper, WorldCreatorRandom, WorldCreatorDebug, WorldCreatorLogger, CriticalPathVO
) {
	
	var SectorGenerator = {
		
		itemsHelper: null,
		
		prepareSectors: function (seed, worldVO, itemsHelper, enemyCreator) {
			this.itemsHelper = itemsHelper;
			
			for (var l = worldVO.topLevel; l >= worldVO.bottomLevel; l--) {
				var levelVO = worldVO.levels[l];
				
				// level-wide features 1
				this.generateZones(seed, worldVO, levelVO);
				this.generateStashes(seed, worldVO, levelVO);
				this.generateWorksops(seed, worldVO, levelVO);
				
				// level path features
				levelVO.paths = this.generatePaths(seed, worldVO, levelVO);
				for (var p = 0; p < levelVO.paths.length; p++) {
					this.generateRequiredResources(seed, worldVO, levelVO, levelVO.paths[p]);
				}
				
				this.generateHazards(seed, worldVO, levelVO);
				
				// sector features
				for (var s = 0; s < levelVO.sectors.length; s++) {
					var sectorVO = levelVO.sectors[s];
					sectorVO.requiredFeatures = this.getRequiredFeatures(seed, worldVO, levelVO, sectorVO);
					sectorVO.sectorType = this.getSectorType(seed, worldVO, levelVO, sectorVO);
					sectorVO.sunlit = this.isSunlit(seed, worldVO, levelVO, sectorVO);
					sectorVO.passageUpType = this.getPassageUpType(seed, worldVO, levelVO, sectorVO);
					sectorVO.passageDownType = this.getPassageDownType(seed, worldVO, levelVO, sectorVO);
					this.generateTexture(seed, worldVO, levelVO, sectorVO);
					this.generateResources(seed, worldVO, levelVO, sectorVO);
				}
				
				// level-wide features 2
				this.generateLocales(seed, worldVO, levelVO);
				this.generateMovementBlockers(seed, worldVO, levelVO);
				this.generateEnemies(seed, worldVO, levelVO, enemyCreator);
				
				// sector features 2
				for (var s = 0; s < levelVO.sectors.length; s++) {
					var sectorVO = levelVO.sectors[s];
					this.generateAdditionalHazards(seed, worldVO, levelVO, sectorVO);
				}
			}
			
			// debug
			// WorldCreatorDebug.printWorld(worldVO, [ "hasRegularEnemies"], "red" );
			// WorldCreatorDebug.printWorld(worldVO, [ "possibleEnemies.length" ]);
			// WorldCreatorDebug.printWorld(worldVO, [ "enemyDifficulty" ]);
			// WorldCreatorDebug.printWorld(worldVO, [ "hazards.radiation" ], "red");
			// WorldCreatorDebug.printWorld(worldVO, [ "resourcesAll.water"], "blue");
			// WorldCreatorDebug.printWorld(worldVO, [ "resourcesScavengable.food" ], "#ee8822");
			// WorldCreatorDebug.printWorld(worldVO, [ "workshopResource" ]);
			// WorldCreatorDebug.printWorld(worldVO, [ "criticalPaths.length" ], "red" );
			// WorldCreatorDebug.printWorld(worldVO, [ "requiredResources.food" ], "red" );
			// WorldCreatorDebug.printWorld(worldVO, [ "requiredResources.water" ], "blue" );
		},
		
		generateZones: function (seed, worldVO, levelVO) {
			var level = levelVO.level;
			var bottomLevel = worldVO.bottomLevel;
			var isCampableLevel = levelVO.isCampable;
			var isGoingDown = level <= 13 && level >= bottomLevel;
			var passageUp = levelVO.getSectorByPos(levelVO.passageUpPosition);
			var passageDown = levelVO.getSectorByPos(levelVO.passageDownPosition);
			var passage1 = isGoingDown ? passageUp : passageDown;
			var passage2 = isGoingDown ? passageDown : passageUp;
			
			var setSectorZone = function (sector, zone, force) {
				if (!sector) return;
				var existingZone = sector.zone;
				if (existingZone) {
					var existingIndex = WorldCreatorConstants.getZoneOrdinal(existingZone);
					var newIndex = WorldCreatorConstants.getZoneOrdinal(zone);
					if (existingIndex <= newIndex) return;
				}
				var stage = sector.stage;
				if (!WorldConstants.isAllowedZone(stage, zone)) {
					if (force) {
						WorldCreatorLogger.w("incompatible zone: " + sector.position + " stage: " + stage + " zone: " + zone);
					} else {
						return;
					}
				}
				sector.zone = zone;
				levelVO.resetPaths();
			};
			
			var setAreaZone = function (sector, zone, area, forceArea) {
				if (!sector) return;
				forceArea = forceArea || 0;
				setSectorZone(sector, zone, forceArea > 0);
				var d = area - 1;
				for (var x = sector.position.sectorX - d; x <= sector.position.sectorX + d; x++) {
					for (var y = sector.position.sectorY - d; y <= sector.position.sectorY + d; y++) {
						var neighbour = levelVO.getSector(x, y);
						if (neighbour) {
							var path = WorldCreatorRandom.findPath(worldVO, sector.position, neighbour.position, false, true);
							if (path && path.length <= d) {
								setSectorZone(neighbour, zone, forceArea > path.length);
							}
						}
					}
				}
			};
			
			var setPathZone = function (path, zone, area, forceArea) {
				for (var i = 0; i < path.length; i++) {
					var pos = path[i];
					var sector = levelVO.getSector(pos.sectorX, pos.sectorY);
					setAreaZone(sector, zone, area, forceArea);
				}
			};
						
			// entrance to level ZONE_ENTRANCE
			setAreaZone(passage1, WorldConstants.ZONE_ENTRANCE, 2, 2);
			
			if (isCampableLevel) {
				// camp:
				var campSector = levelVO.getSectorByPos(levelVO.campPositions[0]);
				// - path to camp ZONE_PASSAGE_TO_CAMP
				if (level != 13) {
					setAreaZone(passage1, WorldConstants.ZONE_PASSAGE_TO_CAMP, 3, 1);
					setAreaZone(campSector, WorldConstants.ZONE_PASSAGE_TO_CAMP, 3, 1);
					var pathToCamp = WorldCreatorRandom.findPath(worldVO, passage1.position, campSector.position, false, true, WorldConstants.CAMP_STAGE_EARLY);
					setPathZone(pathToCamp, WorldConstants.ZONE_PASSAGE_TO_CAMP, 2, 1);
				}
				// - path to passage2 ZONE_CAMP_TO_PASSAGE
				if (passage2) {
					var pathToCamp = WorldCreatorRandom.findPath(worldVO, campSector.position, passage2.position, false, true);
					setPathZone(pathToCamp, WorldConstants.ZONE_CAMP_TO_PASSAGE, 1, 1);
				}
				// - rest ZONE_POI_1, ZONE_POI_2, ZONE_EXTRA_CAMPABLE depending on stage and vornoi points
				var points = WorldCreatorHelper.getVornoiPoints(seed, worldVO, levelVO);
				for (var i = 0; i < levelVO.sectors.length; i++) {
					var sector = levelVO.sectors[i];
					var closestPoint = null;
					var closestPointDist = 0;
					for (var j = 0; j < points.length; j++) {
						var point = points[j];
						var dist = PositionConstants.getDistanceTo(sector.position, point.position);
						if (closestPoint == null || dist < closestPointDist) {
							closestPoint = point;
							closestPointDist = dist;
						}
					}
					closestPoint.sectors.push(sector);
					var zone = closestPoint.zone;
					if (zone == WorldConstants.ZONE_POI_TEMP) {
						zone = sector.stage == WorldConstants.CAMP_STAGE_EARLY ? WorldConstants.ZONE_POI_1 : WorldConstants.ZONE_POI_2;
					}
					setSectorZone(sector, zone);
				}
			} else {
				// no camp:
				// - area around passage1 and path from passage to passage is ZONE_PASSAGE_TO_PASSAGE
				setAreaZone(passage1, WorldConstants.ZONE_PASSAGE_TO_PASSAGE, 6, 2);
				if (passage2) {
					var pathPassageToPassage = WorldCreatorRandom.findPath(worldVO, passage1.position, passage2.position, false, true);
					setPathZone(pathPassageToPassage, WorldConstants.ZONE_PASSAGE_TO_PASSAGE, 2, true);
				}
				// - rest is ZONE_EXTRA_UNCAMPABLE
				for (var i = 0; i < levelVO.sectors.length; i++) {
					var sector = levelVO.sectors[i];
					setSectorZone(sector, WorldConstants.ZONE_EXTRA_UNCAMPABLE, true);
				}
			}
		},
		
		generateHazards: function (seed, worldVO, levelVO) {
			var l = levelVO.level == 0 ? 1342 : levelVO.level;
			var campOrdinal = levelVO.campOrdinal;
			var levelOrdinal = levelVO.levelOrdinal;
			var generator = this;
				
			var isPollutedLevel = levelVO.notCampableReason === LevelConstants.UNCAMPABLE_LEVEL_TYPE_POLLUTION;
			var isRadiatedLevel = levelVO.notCampableReason === LevelConstants.UNCAMPABLE_LEVEL_TYPE_RADIATION;
			
			// hazard areas (cold)
			var hasCold = levelVO.level != 14;
			let centerRadius = isPollutedLevel || isRadiatedLevel ? 6 : 2;
			if (hasCold) {
				for (var s = 0; s < levelVO.sectors.length; s++) {
					// - block for certain sectors
					var sectorVO = levelVO.sectors[s];
					if (sectorVO.isCamp) continue;
					if (sectorVO.isOnCriticalPath(WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_CAMP)) continue;
					var x = sectorVO.position.sectorX;
					var y = sectorVO.position.sectorY;
					if (Math.abs(y) <= centerRadius && Math.abs(x) <= centerRadius) continue;
					var distanceToCamp = WorldCreatorHelper.getQuickDistanceToCamp(levelVO, sectorVO);
					var distanceToCampThreshold = l == 13 ? 6 : 3;
					if (distanceToCamp < distanceToCampThreshold) continue;
						
					// - determine value range
					var step = WorldConstants.getCampStep(sectorVO.zone);
					var maxHazardCold = Math.min(100, this.itemsHelper.getMaxHazardColdForLevel(campOrdinal, step, levelVO.isHard));
					var minHazardCold = this.itemsHelper.getMinHazardColdForLevel(campOrdinal, step, levelVO.isHard);
					minHazardCold = Math.min(minHazardCold, maxHazardCold - 1);
					minHazardCold = Math.max(minHazardCold, 1);
					if (maxHazardCold < 5) continue;
						
					// - determine eligibility
					var isEarlyZone = sectorVO.zone == WorldConstants.ZONE_PASSAGE_TO_CAMP || sectorVO.zone == WorldConstants.ZONE_PASSAGE_TO_PASSAGE;
					var isEarlyCriticalPath = sectorVO.isOnEarlyCriticalPath();
					var distanceToEdge = Math.min(Math.abs(y - levelVO.minY), Math.abs(y - levelVO.maxY), Math.abs(x - levelVO.minX), Math.abs(x - levelVO.maxX));
					var edgeThreshold = isEarlyCriticalPath || isEarlyZone ? 7 : 5;
					var centerThreshold = isEarlyCriticalPath || isEarlyZone ? WorldCreatorConstants.TOWER_RADIUS + 2 : WorldCreatorConstants.TOWER_RADIUS;
					var isFullLevel = l === worldVO.topLevel;
					var coldEdgeDist = Math.max(edgeThreshold - distanceToEdge, Math.abs(y) - centerThreshold, Math.abs(x) - centerThreshold);
					if (isFullLevel || coldEdgeDist > 0) {
						var hazardValueRand = WorldCreatorRandom.random(3000 + seed / (l + 40) + x * y / 6 + seed + y * 2 + l * l * 959);
						var value = hazardValueRand * 100;
						if (value < minHazardCold)
							value = minHazardCold;
						if (value > maxHazardCold)
							value = maxHazardCold;
						if (!isFullLevel && coldEdgeDist == 1)
							value = value / 2;
						if (value > 10) {
							value = Math.floor(value / 5) * 5;
						} else {
							value = Math.floor(value);
						}
						sectorVO.hazards.cold = value;
					}
				}
			}
			
			// hazard clusters (radiation and poison)
			if (levelOrdinal < WorldCreatorConstants.MIN_LEVEL_ORDINAL_HAZARD_RADIATION && levelOrdinal < WorldCreatorConstants.MIN_LEVEL_ORDINAL_HAZARD_POISON) {
				return;
			}
			
			if (!(isPollutedLevel || isRadiatedLevel)) {
				// normal level
				// - random clusters
				var maxNumHazardClusters = Math.round(Math.min(4, levelVO.sectors.length / 100));
				var options = { excludingFeature: "camp", excludedZones: [ WorldConstants.ZONE_PASSAGE_TO_CAMP ] };
				var hazardSectors = WorldCreatorRandom.randomSectors(seed / 3 * levelOrdinal + 73 * levelVO.maxX, worldVO, levelVO, 0, maxNumHazardClusters, options);
				for (var h = 0; h < hazardSectors.length; h++) {
					var centerSector = hazardSectors[h];
					var hrRandom = WorldCreatorRandom.random(84848 + levelOrdinal * 99 + (h+12) * 111 + seed / 777);
					var radius = Math.round(hrRandom * 7) + 2;
					this.addHazardCluster(seed, h, levelVO, centerSector, radius);
				}
				
				// - clusters on border sectors (to guide player to camp)
				var borderSectors = WorldCreatorHelper.getBorderSectorsForZone(levelVO, WorldConstants.ZONE_PASSAGE_TO_CAMP, true);
				var startPos = levelVO.excursionStartPosition;
				borderSectors.sort(function (a, b) { return PositionConstants.getDistanceTo(startPos, b.sector.position) - PositionConstants.getDistanceTo(startPos, a.sector.position) });
				for (var i = 0; i < borderSectors.length; i++) {
					var pair = borderSectors[i];
					var maxHazardValue = this.getMaxHazardValue(levelVO, pair.neighbour, false, pair.neighbour.zone);
					if (maxHazardValue < 1) continue;
					var distanceToCamp = Math.min(
						WorldCreatorHelper.getDistanceToCamp(worldVO, levelVO, pair.sector),
						WorldCreatorHelper.getDistanceToCamp(worldVO, levelVO, pair.neighbour)
					);
					if (distanceToCamp < 3) continue;
					var s = 2000 + seed % 26 * 3331 + 100 + (i + 5) * 6541 + distanceToCamp * 11;
					var add = WorldCreatorRandom.randomBool(s);
					if (add) {
						var radius = WorldCreatorRandom.randomInt(s / 2, 2, 3);
						this.addHazardCluster(seed, i, levelVO, pair.sector, radius);
						break;
					}
				}
			} else {
				// level completely covered in hazard
				var isRadiation = isRadiatedLevel;
				for (var i = 0; i < levelVO.sectors.length; i++) {
					var sectorVO = levelVO.sectors[i];
					if (sectorVO.zone == WorldConstants.ZONE_ENTRANCE) continue;
					var maxHazardValue = generator.getMaxHazardValue(levelVO, sectorVO, isRadiation, sectorVO.zone);
					var minHazardValue = Math.floor(maxHazardValue / 2);
					if (levelVO.isHard) minHazardValue = maxHazardValue;
					var hazardValueRand = WorldCreatorRandom.random(levelOrdinal * (i + 11) / seed * 55 + seed / (i + 99) - i * i);
					var hazardValue = Math.ceil((minHazardValue + hazardValueRand * (maxHazardValue - minHazardValue)) / 5) * 5;
					if (hazardValue > maxHazardValue) hazardValue = maxHazardValue;
					if (isPollutedLevel) {
						sectorVO.hazards.poison = hazardValue;
					} else if (isRadiatedLevel) {
						sectorVO.hazards.radiation = hazardValue;
					}
				}
			}
		},
		
		generateMovementBlockers: function (seed, worldVO, levelVO) {
			var l = levelVO.level;
			var levelOrdinal = WorldCreatorHelper.getLevelOrdinal(seed, l);
			var campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, l);
			
			var blockerTypesEarly = this.getLevelBlockerTypes(levelVO, WorldConstants.CAMP_STAGE_EARLY);
			var blockerTypesLate = this.getLevelBlockerTypes(levelVO, WorldConstants.CAMP_STAGE_LATE);
			if (blockerTypesLate.length < 1) return;
			
			var creator = this;
			var getBlockerType = function (seed, stage) {
				var blockerTypes = stage == WorldConstants.CAMP_STAGE_LATE ? blockerTypesLate : blockerTypesEarly;
				var typeix = blockerTypes.length > 1 ? WorldCreatorRandom.randomInt(seed, 0, blockerTypes.length) : 0;
				return blockerTypes[typeix];
			};
			
			var addBlocker = function (seed, sectorVO, neighbourVO, type, addDiagonals, allowedCriticalPaths) {
				neighbourVO = neighbourVO || WorldCreatorRandom.getRandomSectorNeighbour(seed, levelVO, sectorVO, true);
				var blockerType = type || getBlockerType(seed, sectorVO.stage);
				var options = { addDiagonals: addDiagonals, allowedCriticalPaths: allowedCriticalPaths };
				var sectorcb = function (s) {
					
				};
				creator.addMovementBlocker(worldVO, levelVO, sectorVO, neighbourVO, blockerType, options, sectorcb);
			};

			var addBlockersBetween = function (seed, levelVO, pointA, pointB, type, maxPaths, allowedCriticalPaths) {
				var path;
				var index;
				for (var i = 0; i < maxPaths; i++) {
					path = WorldCreatorRandom.findPath(worldVO, pointA, pointB, true, true);
					if (!path || path.length < 3) {
						break;
					}
					var padding = Math.round(path.length / 6);
					var min = Math.max(1, padding);
					var max = MathUtils.clamp(path.length - padding, min, path.length - 2);
					var finalSeed = Math.abs(seed + 6700 - (i+1) * 555);
					index = WorldCreatorRandom.randomInt(finalSeed, min, max);
					
					// try a few indices
					for (let j = 0; j < (max-min); j++)
					{
						index += j;
						if (index > max) index = min;
						var sectorVO = levelVO.getSector(path[index].sectorX, path[index].sectorY);
						var neighbourVO = levelVO.getSector(path[index + 1].sectorX, path[index + 1].sectorY);
						if (!WorldCreatorHelper.canPairHaveGang(levelVO, sectorVO, neighbourVO)) {
							continue;
						} else {
							addBlocker(finalSeed, sectorVO, neighbourVO, type, true, allowedCriticalPaths);
							break;
						}
					}
				}
			};
			
			// critical paths: between passages on certain levels
			var numBetweenPassages = 0;
			if (l === 14) numBetweenPassages = 5;
			if (!levelVO.isCampable && campOrdinal == 7) numBetweenPassages = 3;
			if (numBetweenPassages > 0) {
				var allowedCriticalPaths = [ WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE ];
				for (var i = 0; i < levelVO.passagePositions.length; i++) {
					for (var j = i + 1; j < levelVO.passagePositions.length; j++) {
						var rand = Math.round(2222 + seed + (i+21) * 41 + (j + 2) * 33);
						var type = l == 14 ? MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE : null;
						addBlockersBetween(rand, levelVO, levelVO.passagePositions[i], levelVO.passagePositions[j], type, numBetweenPassages, allowedCriticalPaths);
					}
				}
			}
			
			// campable levels: zone borders
			if (levelVO.isCampable) {
				var freq = 0.25;
				// - from ZONE_PASSAGE_TO_CAMP to other (to lead player towards camp)
				var allowedCriticalPaths = [ WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_2, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE ];
				var borderSectors1 = WorldCreatorHelper.getBorderSectorsForZone(levelVO, WorldConstants.ZONE_PASSAGE_TO_CAMP, true);
				for (var i = 0; i < borderSectors1.length; i++) {
					var pair = borderSectors1[i];
					if (WorldCreatorHelper.canHaveBlocker(levelVO, pair.sector, pair.neighbour, allowedCriticalPaths)) {
						var s = seed % 26 * 3331 + 100 + (i + 5) * 654;
						if (WorldCreatorRandom.random(s) < freq) {
							addBlocker(s * 2, pair.sector, pair.neighbour, null, true, allowedCriticalPaths);
						}
					}
				}
			}
			
			// campable levels: block all paths to one POI
			// TODO check that that POI is in a different direction than first passage of the level, otherwise the movement blockers will just get blocked because blockers on zone ZONE_PASSAGE_TO_CAMP are not allowed
			if (levelVO.isCampable && WorldCreatorRandom.randomBool(seed % 888 + l * 777, 0.75)) {
				var localeSectors = levelVO.localeSectors;
				var rand = seed % 333 + 1000 + l * 652;
				var i = WorldCreatorRandom.randomInt(rand, 0, localeSectors.length);
				var poiSector = localeSectors[i];
				var campPos = levelVO.campPositions[0];
				var allowedCriticalPaths = [ WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_2, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE ];
				addBlockersBetween(rand, levelVO, campPos, poiSector.position, null, 3, allowedCriticalPaths);
			}

			// random ones
			var numRandom = 1;
			if (l === 14) numRandom = 2;
			if (l === worldVO.topLevel - 1) numRandom = 4;
			if (l === worldVO.topLevel) numRandom = 8;
			if (numRandom > 0) {
				var randomSeed = seed % 8 * 1751 + 1000 + (l + 5) * 291;
				var options = { excludingFeature: "camp" };
				var sectors = WorldCreatorRandom.randomSectors(randomSeed, worldVO, levelVO, numRandom, numRandom + 1, options);
				for (var i = 0; i < sectors.length; i++) {
					var sector = sectors[i];
					var addDiagonals = (l + i + 9) % 3 !== 0;
					addBlocker(randomSeed - (i + 1) * 321, sector, null, null, addDiagonals);
				}
			}
		},
		
		generatePaths: function (seed, worldVO, levelVO) {
			var result = [];
			var unvisitedSectors = [];
			var visitSector = function (pos, pathID) {
				var posSector = levelVO.getSectorByPos(pos);
				if (!posSector) return;
				if (posSector.pathID && pos.pathID != 0) return;
				var index = unvisitedSectors.indexOf(posSector);
				if (index < 0) return;
				posSector.pathID = pathID;
				unvisitedSectors.splice(index, 1);
			};
			var traverseSectors = function (startPos, sectors, pathStage) {
				var traverse = [];
				if (sectors.length <= 0) return;
				unvisitedSectors = sectors.concat();
				var currentPos = startPos;
				var pathID = 0;
				while (unvisitedSectors.length > 0) {
					visitSector(currentPos, pathID);
					var sectorsByDistance = unvisitedSectors.slice(0).sort(WorldCreatorHelper.sortSectorsByDistanceTo(currentPos));
					var nextSector = sectorsByDistance[0];
					if (!nextSector) break;
					var path = WorldCreatorRandom.findPath(worldVO, currentPos, nextSector.position, false, true, pathStage);
					if (!path) {
						throw new Error("couldn't find level path " + currentPos + " " + nextSector.position);
					}
					pathID = result.length;
					for (var j = 0; j < path.length; j++) {
						var pathPos = path[j];
						visitSector(pathPos, pathID);
						traverse.push(pathPos);
					}
					currentPos = nextSector.position;
				}
				result.push(traverse);
			}
			var startPos = levelVO.excursionStartPosition;
			traverseSectors(startPos, levelVO.getSectorsByStage(WorldConstants.CAMP_STAGE_EARLY), WorldConstants.CAMP_STAGE_EARLY);
			traverseSectors(startPos, levelVO.getSectorsByStage(WorldConstants.CAMP_STAGE_LATE), null);
			return result;
		},
		
		generateStashes: function (seed, worldVO, levelVO) {
			var l = levelVO.level;
			let nextLevel = WorldCreatorHelper.getLevelForOrdinal(seed, levelVO.levelOrdinal + 1);
			let nextLevelVO = worldVO.getLevel(nextLevel) || levelVO;
			let levelIndex = WorldCreatorHelper.getLevelIndexForCamp(seed, levelVO.campOrdinal, levelVO.level);
			let maxLevelIndex = WorldCreatorHelper.getMaxLevelIndexForCamp(seed, levelVO.campOrdinal, levelVO.level);
			
			var lateZones = [ WorldConstants.ZONE_POI_2, WorldConstants.ZONE_EXTRA_CAMPABLE ];
			var earlyZones = [ WorldConstants.ZONE_PASSAGE_TO_CAMP, WorldConstants.ZONE_PASSAGE_TO_PASSAGE, WorldConstants.ZONE_POI_1 ];
			var earlyZonesEntrance = [ WorldConstants.ZONE_ENTRANCE ];
			
			// TODO position (some) stashes more purposefully in hard-to-reach places (distance from camp? sectors marked as high-reward during pathfinding?)
			
			var addStashes = function (sectorSeed, reason, stashType, itemID, num, numItemsPerStash, excludedZones) {
				var options = { requireCentral: false, excludingFeature: "camp", excludedZones: excludedZones };
				var stashSectors = WorldCreatorRandom.randomSectors(sectorSeed, worldVO, levelVO, num, num + 1, options);
				var isAmountRange = typeof(numItemsPerStash) !== "number";
				var min = Math.round(isAmountRange ? numItemsPerStash[0] : numItemsPerStash);
				var max = Math.round(isAmountRange ? numItemsPerStash[1] : numItemsPerStash);
				for (var i = 0; i < stashSectors.length; i++) {
					var numItems = isAmountRange ? WorldCreatorRandom.randomInt(sectorSeed * 2, min, max) : numItemsPerStash;
					var stash = new StashVO(stashType, numItems, itemID);
					stashSectors[i].stashes.push(stash);
					// WorldCreatorLogger.i("add stash level " + l + " [" + reason + "]: " + itemID + " x" + numItems + " (" + min + "-" + max + ") " + stashSectors[i].position + " " + stashSectors[i].zone + " | " + (excludedZones ? excludedZones.join(",") : "-"))
				}
			};
			
			// stashes: lock picks
			if (l == 13) {
				addStashes(seed * l * 8 / 3 + (l+100)*14 + 3333, "lockpick", ItemConstants.STASH_TYPE_ITEM, "exploration_1", 1, 1, lateZones);
			} else if (!levelVO.isCampable) {
				addStashes(seed * l * 8 / 3 + (l+100)*14 + 3333, "lockpick", ItemConstants.STASH_TYPE_ITEM, "exploration_1", 1, 1);
			}
			
			// stashes: hairpins (for lockpics)
			var pinsPerStash = 3;
			var numHairpinStashes = 1;
			if (l == 13) numHairpinStashes = 3;
			if (!levelVO.isCampable) numHairpinStashes = 3;
			addStashes(seed * l * 8 / 3 + (l+100)*14 + 3333, "hairpin", ItemConstants.STASH_TYPE_ITEM, "res_hairpin", numHairpinStashes, pinsPerStash);
			
			// stashes: stamina potions
			if (!levelVO.isCampable) {
				addStashes(seed % 45 * (l + 11) * 9 + (l+100)*7 + 1111, "stamina potions", ItemConstants.STASH_TYPE_ITEM, "stamina_potion_1", 1, 1);
			}
			
			// stashes: ingredients for craftable equipment (campable levels)
			let stashIngredients;
			let requiredEquipment = this.itemsHelper.getRequiredEquipment(levelVO.campOrdinal, WorldConstants.CAMP_STEP_END, levelVO.isHard);
			if (levelVO.isCampable) {
				stashIngredients = ItemConstants.getIngredientsToCraftMany(requiredEquipment);
			} else {
				requiredEquipment = this.itemsHelper.getRequiredEquipment(nextLevelVO.campOrdinal, WorldConstants.CAMP_STEP_POI_1, nextLevelVO.isHard);
				stashIngredients = ItemConstants.getIngredientsToCraftMany(requiredEquipment);
			}
			let numStashIngredients = MathUtils.clamp(Math.floor(stashIngredients.length / 2), 1, 3);
			for (var i = 0; i < numStashIngredients; i++) {
				var def = stashIngredients[i];
				var amount = def.amount > 9 ? 10 : def.amount > 5 ? 6 : 3;
				addStashes(seed % 13 + l * 7 + 5 + (i+1) * 10, "craftable ingredients", ItemConstants.STASH_TYPE_ITEM, def.id, 1, amount);
			}
			
			// stashes: non-craftable equipment
			// TODO don't do these per level but per equipment; place one instance of each non-craftable equipment somewhere
			if (levelIndex == 0) {
				var newEquipment = this.itemsHelper.getNewEquipment(levelVO.campOrdinal);
				for (var i = 0; i < newEquipment.length; i++) {
					if (!newEquipment[i].craftable && newEquipment[i].scavengeRarity <= 5) {
						addStashes(seed / 3 + (l+551)*8 + (i+103)*18, "non-craftable equipment", ItemConstants.STASH_TYPE_ITEM, newEquipment[i].id, 1, 1, lateZones);
					}
				}
			}
			
			// stashes: random ingredients (uncampable levels)
			if (!levelVO.isCampable) {
				var i = seed % (l+5) + 3;
				var ingredient = ItemConstants.getIngredient(i);
				addStashes(seed % 7 + 3000 + 101 * l, "random", ItemConstants.STASH_TYPE_ITEM, ingredient.id, 2, 3);
			}
			
			// stashes: metal caches
			if (l == 13) {
				addStashes(seed / 3 * 338 + l * 402, "metal", ItemConstants.STASH_TYPE_ITEM, "cache_metal_1", 2, 1, lateZones);
				addStashes(seed / 5 * 931 + l * 442, "metal", ItemConstants.STASH_TYPE_ITEM, "cache_metal_2", 2, 1, lateZones);
			}
			if (l % 2 == 0) {
				addStashes(seed / 7 * 937 + l * 331, "metal", ItemConstants.STASH_TYPE_ITEM, "cache_metal_1", 3, 1);
			} else {
				addStashes(seed / 7 * 937 + l * 331, "metal", ItemConstants.STASH_TYPE_ITEM, "cache_metal_2", 3, 1);
			}
			
			// stashes: currency (uncampable levels and late zones)
			if (levelVO.campOrdinal > 2) {
				var minCurrencyStashes = levelVO.isCampable ? 0 : 1;
				var maxCurrencyStashes = levelVO.isCampable ? 1 : 3;
				var numCurrencyStashes = WorldCreatorRandom.randomInt(700 + seed % 7 * 1112 + (l+7) * 3412, minCurrencyStashes, maxCurrencyStashes + 1);
				if (numCurrencyStashes > 0) {
					var itemValues = requiredEquipment.map(item => TradeConstants.getItemValue(item, false, false)).sort();
					var minItemValue = Math.ceil(itemValues[0]);
					var maxItemValue = Math.ceil(itemValues[itemValues.length - 1] * 1.5);
					var currencyAmount = [minItemValue, maxItemValue];
					var excludedZones = levelVO.isCampable ? earlyZones : earlyZonesEntrance;
					addStashes(500 + seed / 5 + (l + 5) * 2541, "currency", ItemConstants.STASH_TYPE_SILVER, "", numCurrencyStashes, currencyAmount, excludedZones);
				}
			}
			
			// stashes: uncraftable misc items (uncampable levels)
			if (!levelVO.isCampable) {
				let searchDefs = [
					{ itemType: "shoes", itemBonusType: ItemConstants.itemBonusTypes.movement, probability: 0.5 },
					{ itemType: "bag", itemBonusType: ItemConstants.itemBonusTypes.bag, probability: 0.5 },
					{ itemType: "light", itemBonusType: ItemConstants.itemBonusTypes.light, probability: 0.5 },
					{ itemType: "clothing_head", itemBonusType: ItemConstants.itemBonusTypes.shade, probability: 0.2 },
					{ itemType: "weapon", itemBonusType: ItemConstants.itemBonusTypes.fight_att, probability: 0.2 },
				];
				for (let i = 0; i < searchDefs.length; i++) {
					let searchDef = searchDefs[i];
					let bestItem = this.itemsHelper.getBestAvailableItem(nextLevelVO.campOrdinal, searchDef.itemType, searchDef.itemBonusType);
					let s1 = 6000 + seed % 8 + (l + 5) * 555 + i * 44;
					let s2 = 5001 + seed % 5 * 301 + (l + 5) * 102 + i * 66;
					if (bestItem && !bestItem.craftable && WorldCreatorRandom.random(s1) < searchDef.probability) {
						addStashes(s2, "uncraftable " + searchDef.itemType, ItemConstants.STASH_TYPE_ITEM, bestItem.id, 1, 1);
					}
				}
			}
			
			// stashes: one-use exploration items (uncampable levels and late zones)
			var consumableItems = [ "first_aid_kit_1", "first_aid_kit_2", "glowstick_1", "consumable_weapon_1", "flee_1" ];
			var validItems = [];
			for (var i = 0; i < consumableItems.length; i++) {
				var item = ItemConstants.getItemByID(consumableItems[i]);
				if (!item) continue;
				if (!this.itemsHelper.isAvailable(item, levelVO.campOrdinal, WorldConstants.CAMP_STEP_END, true, true, 9)) continue;
				var req = ItemConstants.getRequiredCampAndStepToCraft(item);
				validItems.push(item);
			}
			var numItems = Math.min(levelVO.isCampable ? 1 : 3, validItems.length);
			for (var i = 0; i < numItems; i++) {
				var s3 = 2222 + (l + 8) * 281 + (i + 16) * 182 + i * i * 2;
				var index = WorldCreatorRandom.randomInt(s3, 0, validItems.length);
				var item = validItems[index];
				var itemAmount = levelVO.isCampable ? 1 : [ 1, 3 ];
				addStashes(1000 + seed % 11 * 71 + (l + 15) * 15 + (i + 21) * 16, "consumables", ItemConstants.STASH_TYPE_ITEM, item.id, 1, itemAmount);
			}
		},
		
		generateWorksops: function (seed, worldVO, levelVO) {
			var campOrdinal = levelVO.campOrdinal;
			var l = levelVO.level;
			let levelIndex = WorldCreatorHelper.getLevelIndexForCamp(seed, campOrdinal, levelVO.level);
			let maxLevelIndex = WorldCreatorHelper.getMaxLevelIndexForCamp(seed, campOrdinal, levelVO.level);
			
			// pick resource
			var workshopResource = null;
			if (levelVO.isCampable && campOrdinal === WorldConstants.CAMP_ORDINAL_FUEL)
				workshopResource = "fuel";
			if (levelIndex == maxLevelIndex && (campOrdinal === WorldConstants.CAMP_ORDINAL_GREENHOUSE_1 || campOrdinal == WorldConstants.CAMP_ORDINAL_GREENHOUSE_2))
				workshopResource = "herbs";
			if (levelVO.level == worldVO.bottomLevel)
				workshopResource = "rubber";
			if (!workshopResource) return;

			// pick sectors
			var workshopSectors = [];
			var pathConstraints = [];
			switch (workshopResource) {
				case "herbs":
					var sea = worldVO.getFeaturesByType(WorldCreatorConstants.FEATURE_HOLE_SEA)[0];
					var seaPos = sea.getPosition(l);
					var sectorsByDistance = levelVO.sectors.slice(0).sort(WorldCreatorHelper.sortSectorsByDistanceTo(seaPos));
					var sector = sectorsByDistance[0];
					workshopSectors.push(sector);
					break;
				default:
					for (var i = 0; i < levelVO.campPositions.length; i++) {
						var startPos = levelVO.campPositions[i];
						var maxLength = WorldCreatorConstants.getMaxPathLength(levelVO.campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1);
						pathConstraints.push(new PathConstraintVO(startPos, maxLength, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1));
					}
					var options = { excludingFeature: "camp", pathConstraints: pathConstraints };
					workshopSectors = WorldCreatorRandom.randomSectors(seed * l * 2 / 7 * l, worldVO, levelVO, 1, 2, options);
					break;
			}
			
			// set sector flags and critical paths
			for (var i = 0; i < workshopSectors.length; i++) {
				WorldCreatorLogger.i("placed workshop " + workshopResource + " at " + workshopSectors[i].position);
				workshopSectors[i].hasWorkshop = true;
				workshopSectors[i].hasClearableWorkshop = workshopResource != "herbs";
				workshopSectors[i].hasBuildableWorkshop = workshopResource == "herbs";
				workshopSectors[i].workshopResource = resourceNames[workshopResource];
				for (var j = 0; j < pathConstraints.length; j++) {
					let criticalPathVO = new CriticalPathVO(WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1, workshopSectors[i].position, pathConstraints[j].startPosition);
					WorldCreatorHelper.addCriticalPath(worldVO, criticalPathVO);
				}
			}
		},
		
		generateRequiredResources: function (seed, worldVO, levelVO, path) {
			// near passages
			let excludedZones = levelVO.isCampable ?
				[ WorldConstants.ZONE_EXTRA_CAMPABLE ] :
				[ WorldConstants.ZONE_EXTRA_UNCAMPABLE ];
			for (let i = 0; i < levelVO.passagePositions.length; i++) {
				let passagePos = levelVO.passagePositions[i];
				let pathConstraints = [];
				pathConstraints.push(new PathConstraintVO(passagePos, 3, null));
				let options = { requireCentral: false, excludingFeature: "camp", pathConstraints: pathConstraints, excludedZones: excludedZones };
				let safeSectors = WorldCreatorRandom.randomSectors(seed % 10000 + levelVO.level * 192 + i * 991, worldVO, levelVO, 1, 2, options);
				if (safeSectors.length == 1) {
					safeSectors[0].requiredResources.water = true;
					safeSectors[0].requiredResources.food = true;
				} else {
					WorldCreatorLogger.w("Couldn't find safe sector for passage on level " + levelVO.level);
				}
			}
			// based on paths
			var bagSize = ItemConstants.getBagBonus(levelVO.levelOrdinal);
			var maxStepsWater = Math.floor(bagSize / 2.5);
			var maxStepsFood = Math.floor(bagSize / 3);
			var stepsWater = 0;
			var stepsFood = 0;
			var requireResource = function (i, count, sectorVO, steps, maxSteps) {
				// end of path, probably a dead end and need supplies to return
				if (i == count - 1 && steps > 3)
					return true;
				// not too often
				var minSteps = Math.floor(maxSteps * 0.75);
				if (steps < minSteps)
					return false;
				// guarantee max steps regardless of hazard factor etc
				if (steps >= maxSteps)
					return true;
				// probability
				var hazardFactor = (sectorVO.hazards.poison || sectorVO.hazards.radiation) ? 0.25 : 1;
				var probability = (steps - minSteps) / (maxSteps - minSteps) * hazardFactor;
				var s1 = 2000 + seed % 1000 * 2 + levelVO.level * 103 + i * 5;
				var r1 = WorldCreatorRandom.random(s1);
				return r1 < probability;
			};
			for (var i = 0; i < path.length; i++) {
				var pos = path[i];
				var sectorVO = levelVO.getSectorByPos(pos);
				if (requireResource(i, path.length, sectorVO, stepsWater, maxStepsWater)) {
					sectorVO.requiredResources.water = true;
					stepsWater = -1;
				}
				if (requireResource(9000 + i, path.length, sectorVO, stepsFood, maxStepsFood)) {
					sectorVO.requiredResources.food = true;
					stepsFood = -1;
				}
				stepsWater++;
				stepsFood++;
			}
		},
		
		getRequiredFeatures: function (seed, worldVO, levelVO, sectorVO) {
			let requiredFeatures = {};
			
			// middle of paths to passages: require features allowing a beacon
			for (let i = 0; i < sectorVO.criticalPaths.length; i++) {
				let pathVO = sectorVO.criticalPaths[i];
				let pathType = pathVO.type;
				let isBeaconPath =
					(levelVO.isCampable && pathType == WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE) ||
					(!levelVO.isCampable && WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE);
				if (isBeaconPath && pathVO.length > 4) {
					let index = sectorVO.criticalPathIndices[i];
					if (index == Math.round(pathVO.length / 2)) {
						requiredFeatures.beacon = true;
					}
				}
			}
			
			return requiredFeatures;
		},
		
		generateTexture: function (seed, worldVO, levelVO, sectorVO) {
			var l = sectorVO.position.level;
			var x = sectorVO.position.sectorX;
			var y = sectorVO.position.sectorY;
			var features = worldVO.getFeaturesByPos(sectorVO.position);
			var surroundingFeatures = WorldCreatorHelper.getFeaturesSurrounding(worldVO, levelVO, sectorVO.position);

			// wear
			var levelWear = MathUtils.clamp((worldVO.topLevel - l) / (worldVO.topLevel - 5) * 8, 0, 10);
			var wear = levelWear + WorldCreatorRandom.randomInt(seed * l + (x + 100) * 82 + (y + 100) * 82, -3, 3);
			if (sectorVO.isCamp) wear = Math.min(3, wear);
			sectorVO.wear = MathUtils.clamp(Math.round(wear), 0, 10);

			// damage
			var damage = 0;
			var getFeatureDamage = function (feature) {
				switch (feature.type) {
					case WorldCreatorConstants.FEATURE_HOLE_WELL: return 1;
					case WorldCreatorConstants.FEATURE_HOLE_COLLAPSE: return 8;
					case WorldCreatorConstants.FEATURE_HOLE_SEA: return 3;
					default: return 0;
				}
			}
			for (var i = 0; i < features.length; i++) {
				damage = Math.max(damage, getFeatureDamage(features[i]));
			}
			for (var i = 0; i < surroundingFeatures.length; i++) {
				var d = surroundingFeatures[i].getDistanceTo(sectorVO.position);
				damage = Math.max(damage, getFeatureDamage(surroundingFeatures[i]) - d * 2);
			}
			if (sectorVO.isCamp) damage = Math.min(3, damage);
			if (l == 14) damage = Math.max(3, damage);
			sectorVO.damage = MathUtils.clamp(Math.round(damage), 0, 10);

			// building density
			var levelDensity = MathUtils.clamp(WorldCreatorRandom.random(seed * 7 * l / 3 + 62) * 10, 2, 9);
			if (l == worldVO.topLevel) levelDensity = 5;
			if (l == worldVO.topLevel - 1) levelDensity = 5;
			if (l == worldVO.topLevel - 2) levelDensity = 7;
			if (l == worldVO.topLevel - 3) levelDensity = 8;
			if (l == 14) levelDensity = 8;
			if (l == worldVO.bottomLevel + 1) levelDensity = 6;
			if (l == worldVO.bottomLevel) levelDensity = 3;
			
			var minDensity = 0;
			var maxDensity = 10;
			switch (sectorVO.sectorType) {
				case SectorConstants.SECTOR_TYPE_RESIDENTIAL:
					minDensity = 2;
					maxDensity = 8;
					break;
				case SectorConstants.SECTOR_TYPE_INDUSTRIAL:
					minDensity = 1;
					maxDensity = 10;
					break;
				case SectorConstants.SECTOR_TYPE_MAINTENANCE:
					minDensity = 2;
					maxDensity = 10;
					break;
				case SectorConstants.SECTOR_TYPE_COMMERCIAL:
					minDensity = 1;
					maxDensity = 10;
					break;
				case SectorConstants.SECTOR_TYPE_PUBLIC:
					minDensity = 0;
					maxDensity = 7;
					break;
				case SectorConstants.SECTOR_TYPE_SLUM:
					minDensity = 3;
					maxDensity = 10;
					break;
			}
			
			var isStartPosition = l == 13 && sectorVO.isCamp;
			if (isStartPosition) {
				minDensity = 3;
				maxDensity = 8;
			}
			
			if (sectorVO.requiredFeatures.beacon) {
				minDensity = 2;
				maxDensity = 8;
			}
			
			var randomDensity = WorldCreatorRandom.randomInt(seed * l * x + y + x, minDensity, maxDensity + 1);
			if (sectorVO.isCamp) randomDensity = 5;
			
			var density = (levelDensity + randomDensity) / 2;
			sectorVO.buildingDensity = MathUtils.clamp(Math.round(density), minDensity, maxDensity);
		},
		
		generateResources: function (seed, worldVO, levelVO, sectorVO) {
			var l = sectorVO.position.level;
			var x = sectorVO.position.sectorX;
			var y = sectorVO.position.sectorY;
			var ll = levelVO.level === 0 ? levelVO.level : 50;
			var sectorType = sectorVO.sectorType;
			var campOrdinal = levelVO.campOrdinal;
			var isStartPosition = l == 13 && sectorVO.isCamp;
			
			// scavengeable resources
			var sRandom = (x * 22 + y * 3000);
			var sectorAbundanceFactor = WorldCreatorRandom.random(seed * sRandom + (x + 99) * 7 * (y - 888));
			var waterRandomPart = WorldCreatorRandom.random(seed * (l + 1000) * (x + y + 900) + 10134) * Math.abs(5 - sectorVO.wear) / 5;
			var s1 = 5000 + seed / (l+10) + x + x * y * 63 + sectorVO.buildingDensity * 3 + x % 3 * 123 + y % 4 * 81;
			var r1 = WorldCreatorRandom.random(s1);
			var sca = new ResourcesVO();
			switch (sectorType) {
				case SectorConstants.SECTOR_TYPE_RESIDENTIAL:
					sca.metal = 3;
					sca.food = r1 < 0.3 ? Math.round(sectorAbundanceFactor * 5 + sectorVO.wear / 2) : 0;
					sca.water = waterRandomPart > 0.8 ? 2 : 0;
					sca.rope = WorldCreatorRandom.random(seed + l * x / y * 44 + 6) > 0.95 ? 1 : 0;
					sca.medicine = campOrdinal > 3 && WorldCreatorRandom.random(seed / (l + 5) + x * x * y + 66) > 0.99 ? 1 : 0;
					break;
				case SectorConstants.SECTOR_TYPE_INDUSTRIAL:
					sca.water = waterRandomPart > 0.9 ? 1 : 0;
					sca.metal = 8;
					sca.tools = (l > 13) ? WorldCreatorRandom.random(seed + l * x / y * 44 + 6) > 0.95 ? 1 : 0 : 0;
					sca.rope = WorldCreatorRandom.random(seed + l * x / y * 44 + 6) > 0.90 ? 1 : 0;
					sca.fuel = WorldCreatorRandom.random(seed / (l + 5) + x * x * y + 66) > 0.90 ? 1 : 0;
					if (l > 14) {
						sca.rubber = WorldCreatorRandom.random(seed / x * ll + x * y * 16) > 0.90 ? 1 : 0;
					}
					break;
				case SectorConstants.SECTOR_TYPE_MAINTENANCE:
					sca.metal = 10;
					sca.rope = WorldCreatorRandom.random(seed + l * x / y * 44 + 6) > 0.90 ? 1 : 0;
					sca.fuel = WorldCreatorRandom.random(seed / (l + 5) + x * x * y + 66) > 0.90 ? 1 : 0;
					sca.tools = (l > 13) ? WorldCreatorRandom.random(seed + l * x / y * 44 + 6) > 0.90 ? 1 : 0 : 0;
					break;
				case SectorConstants.SECTOR_TYPE_COMMERCIAL:
					sca.water = waterRandomPart > 0.8 ? 2 : 0;
					sca.metal = 2;
					sca.food = r1 < 0.5 ? Math.round(sectorAbundanceFactor * 10) : 0;
					sca.medicine = campOrdinal > 2 && WorldCreatorRandom.random(seed / (l + 5) + x * x * y + 66) > 0.99 ? 1 : 0;
					break;
				case SectorConstants.SECTOR_TYPE_SLUM:
					sca.metal = 7;
					sca.food = r1 < 0.2 ? Math.round(sectorAbundanceFactor * 5 + sectorVO.wear / 2) : 0;
					sca.water = waterRandomPart > 0.8 ? 1 : 0;
					sca.rope = WorldCreatorRandom.random(seed + l * x / y * 44 + 6) > 0.85 ? 1 : 0;
					sca.fuel = WorldCreatorRandom.random(seed / (l + 5) + x * x * y + 66) > 0.95 ? 1 : 0;
					break;
			}
			
			// collectable resources
			var col = new ResourcesVO();
			var sectorCentralness = (10 - (Math.abs(x) / 10) + 10 - (Math.abs(y) / 10)) / 2;
			var s11 = seed + (x + 1453) * 3 + (y * 4155) / 71 + sectorVO.wear * 35;
			var s12 = (x % 2 + 1) * 449 + (x + 11) * 521 + (y + 50) * 121 + 2 * Math.abs(x) * Math.abs(y) + sectorCentralness * 541;
			var r12 = WorldCreatorRandom.random(s12);
			var sectorNatureFactor = (WorldCreatorRandom.random(s11) * (sectorVO.wear)) / 10;
			var sectorWaterFactor = (WorldCreatorRandom.random(seed / (x + 30) + (y + 102214)) * (sectorCentralness + 10)) / 25;
			switch (sectorType) {
				case SectorConstants.SECTOR_TYPE_RESIDENTIAL:
					col.food = sectorNatureFactor > 0.55 || r12 > 0.7 ? 3 + sectorNatureFactor * 7 : 0;
					col.water = sectorWaterFactor > 0.75 ? Math.round(Math.min(10, sectorWaterFactor * 10)) : 0;
					break;
				case SectorConstants.SECTOR_TYPE_COMMERCIAL:
				case SectorConstants.SECTOR_TYPE_PUBLIC:
					col.food = sectorNatureFactor > 0.75 || r12 > 0.8 ? 2 + Math.round(sectorNatureFactor * 8) : 0;
					col.water = sectorWaterFactor > 0.7 ? Math.round(Math.min(10, sectorWaterFactor * 10)) : 0;
					break;
				case SectorConstants.SECTOR_TYPE_INDUSTRIAL:
				case SectorConstants.SECTOR_TYPE_MAINTENANCE:
					col.food = sectorNatureFactor > 0.85 || r12 > 0.9 ? 2 + Math.round(sectorNatureFactor * 8) : 0;
					col.water = sectorWaterFactor > 0.95 ? Math.round(Math.min(10, sectorWaterFactor * 11)) : 0;
					break;
				case SectorConstants.SECTOR_TYPE_SLUM:
					col.food = sectorNatureFactor > 0.5 || r12 > 0.6 ? 3 + Math.round(sectorNatureFactor * 7) : 0;
					col.water = sectorWaterFactor > 0.9 ? Math.round(Math.min(10, sectorWaterFactor * 8)) : 0;
					break;
			}
			
			// define springs
			if ((col.water > 0 || sca.water > 0) && this.canHaveSpring(levelVO, sectorVO)) {
				sectorVO.hasSpring = WorldCreatorRandom.random(7777 + seed % 987 + ll * 7 + y * 71) < 0.25;
			} else {
				sectorVO.hasSpring = false;
			}
			
			// add workshop resources to scavengeable
			if (sectorVO.workshopResource) {
				sca[sectorVO.workshopResource] = Math.max(sca[sectorVO.workshopResource], 3);
			}
			
			// adjustments for special levels
			if (l === worldVO.bottomLevel) {
				col.food = col.food > 0 ? col.food + 2 : 0;
				col.water = col.water > 0 ? col.water + 3 : 0;
				sca.herbs = WorldCreatorRandom.random(seed * l / x + y * 423) * (10 - sectorVO.wear);
			}
			
			if (l === worldVO.bottomLevel + 1) {
				col.food = col.food > 0 ? col.food + 1 : 0;
				col.water = col.water > 0 ? col.water + 1 : 0;
			}
			
			// adjustments for sector features
			if (sectorVO.sunlit) {
				sca.herbs = WorldCreatorRandom.random(seed * l / x + y * 423) > 0.75 ? 2 : 0;
			}
			if (sectorVO.workshopResource == "herbs") {
				col.water = Math.max(col.water, 3);
			}

			if (sectorVO.hazards.poison > 0 || sectorVO.hazards.radiation > 0) {
				col.water = 0;
				col.food = 0;
			}
			
			if (sectorVO.isCamp) {
				sca.food = Math.max(sca.food, 3);
				sca.metal = MathUtils.clamp(sca.metal, 3, 7);
				if (WorldCreatorRandom.randomBool(l * 100 + x * 377 + y * 598, 0.5)) {
					col.water = Math.max(col.water, 3);
				}
				if (isStartPosition) {
					sca.food = MathUtils.clamp(sca.food, 4, 6);
					col.food = Math.max(sca.food, 3);
					col.water = Math.max(sca.water, 3);
				}
			}
			
			// adjustments for required resources
			if (sectorVO.requiredResources) {
				if (sectorVO.requiredResources.getResource("water") > 0) {
					if (this.isRequiredResourceWaterSpring(levelVO, sectorVO)) {
						sectorVO.hasSpring = true;
					} else {
						col.water = Math.max(col.water, 3);
					}
				}
				if (sectorVO.requiredResources.getResource("food") > 0) {
					if (this.isRequiredResourceFoodTrap(sectorVO)) {
						col.food = Math.max(col.food, 3);
					} else {
						sca.food = Math.max(sca.food, 3);
					}
				}
			}
			
			// adjustments for possible ranges
			sca.food = sca.food > 2 ? sca.food : 0;
			sca.herbs = sca.herbs > 2 ? Math.min(sca.herbs, 10) : 0;
			
			sectorVO.resourcesScavengable = sca;
			sectorVO.resourcesCollectable = col;
			sectorVO.resourcesAll = sca.clone();
			sectorVO.resourcesAll.addAll(col);
		},
		
		generateEnemies: function (seed, worldVO, levelVO, enemyCreator) {
			var l = levelVO.level;
			var creator = this;
			var randomGangFreq = 45;
				
			var blockerType = MovementConstants.BLOCKER_TYPE_GANG;
			
			// TODO make gangs not consists of only one enemy
			
			var addGang = function (sectorVO, neighbourVO, addDiagonals) {
				if (!neighbourVO) neighbourVO = WorldCreatorRandom.getRandomSectorNeighbour(seed, levelVO, sectorVO, true);
				var direction = PositionConstants.getDirectionFrom(sectorVO.position, neighbourVO.position);
				var neighbourDirection = PositionConstants.getDirectionFrom(neighbourVO.position, sectorVO.position);
				
				var canHaveGang =
					WorldCreatorHelper.canPairHaveGang(levelVO, sectorVO, neighbourVO, true) &&
					WorldCreatorHelper.canSectorHaveGang(levelVO, sectorVO, direction, true) &&
					WorldCreatorHelper.canSectorHaveGang(levelVO, neighbourVO, neighbourDirection, true);
				if (canHaveGang) {
					var blockerSettings = { addDiagonals: addDiagonals };
					// callback is called twice, once for each sector
					creator.addMovementBlocker(worldVO, levelVO, sectorVO, neighbourVO, blockerType, blockerSettings, function (s, direction) {
						s.numLocaleEnemies[LocaleConstants.getPassageLocaleId(direction)] = 3;
					}, function () {
						var possibleEnemies = sectorVO.possibleEnemies.concat(neighbourVO.possibleEnemies);
						possibleEnemies.sort(function (a, b) {
							var diff1 = EnemyConstants.enemyDifficulties[a.id];
							var diff2 = EnemyConstants.enemyDifficulties[b.id];
							return diff2 - diff1;
						});
						var pos1 = sectorVO.position;
						var pos2 = neighbourVO.position;
						var gang = new GangVO(pos1, pos2, possibleEnemies[0]);
						levelVO.addGang(gang);
					});
					return true;
				} else {
					WorldCreatorLogger.w("Skipped adding gang at " + sectorVO.position + " " + sectorVO.isCamp + " " + sectorVO.zone + " " + sectorVO.movementBlockers[direction]);
					return false;
				}
			};

			var addGangs = function (seed, reason, levelVO, pointA, pointB, maxPaths) {
				var num = 0;
				var path;
				var index;
				for (var i = 0; i < maxPaths; i++) {
					path = WorldCreatorRandom.findPath(worldVO, pointA, pointB, true, true);
					if (!path || path.length < 3) break;
					var min = Math.round(path.length / 4) + 1;
					var max = path.length - 2;
					var finalSeed = Math.abs(seed + (i+1) * 231);
					index = WorldCreatorRandom.randomInt(finalSeed, min, max);
					var sectorVO = levelVO.getSector(path[index].sectorX, path[index].sectorY);
					var neighbourVO = levelVO.getSector(path[index + 1].sectorX, path[index + 1].sectorY);
					var direction = PositionConstants.getDirectionFrom(sectorVO.position, neighbourVO.position);
					var neighbourDirection = PositionConstants.getDirectionFrom(neighbourVO.position, sectorVO.position);
					if (!WorldCreatorHelper.canSectorHaveGang(levelVO, sectorVO, direction)) continue;
					if (!WorldCreatorHelper.canSectorHaveGang(levelVO, neighbourVO, neighbourDirection)) continue;
					if (!WorldCreatorHelper.canPairHaveGang(levelVO, sectorVO, neighbourVO)) continue;
					if (addGang(sectorVO, neighbourVO, false)) num++;
				}
				return num;
			};
			
			// sector-based: possible enemies, random encounters and locales
			let center = levelVO.levelCenterPosition;
			for (var i = 0; i < levelVO.sectors.length; i++) {
				var sectorVO = levelVO.sectors[i];
				let dist = PositionConstants.getDistanceTo(center, sectorVO.position);
				var distanceToCamp = WorldCreatorHelper.getQuickDistanceToCamp(levelVO, sectorVO);
				sectorVO.possibleEnemies = [];
				sectorVO.hasRegularEnemies = 0;

				// possible enemy definitions
				sectorVO.possibleEnemies = this.getPossibleEnemies(seed, worldVO, levelVO, sectorVO, enemyCreator);

				// regular enemies (random encounters not tied to locales / gangs)
				if (distanceToCamp < 3) {
					sectorVO.hasRegularEnemies = false;
				} else {
					let baseThreshold = levelVO.isCampable ? 0.15 : 0.65;
					let distanceFactor = MathUtils.map(dist, 0, 25, 0, 1);
					let r = WorldCreatorRandom.random(l * sectorVO.position.sectorX * seed + sectorVO.position.sectorY * seed + 4848);
					sectorVO.hasRegularEnemies = r < baseThreshold + distanceFactor;
				}

				// workshop and locale enemies (counts)
				if (sectorVO.hasClearableWorkshop) {
					sectorVO.numLocaleEnemies[LocaleConstants.LOCALE_ID_WORKSHOP] = 3;
				}
			}
				
			// gangs: on zone borders
			// - ZONE_PASSAGE_TO_CAMP: all except too close to camp
			var borderSectors = WorldCreatorHelper.getBorderSectorsForZone(levelVO, WorldConstants.ZONE_PASSAGE_TO_CAMP, true);
			for (var i = 0; i < borderSectors.length; i++) {
				var pair = borderSectors[i];
				if (pair.sector.zone == WorldConstants.ZONE_ENTRANCE || pair.neighbour.zone == WorldConstants.ZONE_ENTRANCE) continue;
				var direction = PositionConstants.getDirectionFrom(pair.sector.position, pair.neighbour.position);
				if (pair.sector.movementBlockers[direction]) continue;
				var distanceToCamp = Math.min(
					WorldCreatorHelper.getQuickDistanceToCamp(levelVO, pair.sector),
					WorldCreatorHelper.getQuickDistanceToCamp(levelVO, pair.neighbour)
				);
				var distanceToCampThreshold = l == 13 ? 4 : 2;
				if (distanceToCamp > distanceToCampThreshold) {
					addGang(pair.sector, pair.neighbour, true);
				}
			}
				
			// - ZONE_PASSAGE_TO_PASSAGE: most
			var isGoingDown = l <= 13 && l >= worldVO.bottomLevel;
			var passageUp = levelVO.passageUpSector;
			var passageDown = levelVO.passageDownSector;
			var passage1 = isGoingDown ? passageUp : passageDown;
			var passage2 = isGoingDown ? passageDown : passageUp;
			if (passage2) {
				borderSectors = WorldCreatorHelper.getBorderSectorsForZone(levelVO, WorldConstants.ZONE_PASSAGE_TO_PASSAGE, false);
				for (var i = 0; i < borderSectors.length; i++) {
					// sector: z_extra, neighbour: z_p2p - if distance from sector is longer than from neighbour, add blocker
					var pair = borderSectors[i];
					var distance1 = WorldCreatorRandom.findPath(worldVO, pair.sector.position, passage2.position, false, true).length;
					var distance2 = WorldCreatorRandom.findPath(worldVO, pair.neighbour.position, passage2.position, false, true).length;
					if (distance1 > distance2) {
						addGang(pair.sector, pair.neighbour, true);
					}
				}
			}
				
			// gangs: critical paths
			var numLocales = 0;
			for (var s = 0; s < levelVO.campPositions.length; s++) {
				var campPos = levelVO.campPositions[s];
				for (var i = 0; i < levelVO.sectors.length; i++) {
					var sectorVO = levelVO.sectors[i];
					if (sectorVO.hasClearableWorkshop) {
						// camps to workshops (all paths)
						var rand = Math.round(1000 + seed + (l+21) * 11 + (s + 2) * 31 + (i + 1) * 51);
						addGangs(rand, "workshop", levelVO, campPos, sectorVO.position, 100);
					} else if (sectorVO.locales.length > 0) {
						// camps to locales (some paths)
						var rand = Math.round(50 + seed + (l+11) * 11 + (s + 41) * 3 + (i + 1) * 42);
						if (numLocales % 2 === 0) {
							addGangs(rand, "locale", levelVO, campPos, sectorVO.position, 1);
						}
						numLocales++;
					}
				}
			}

			// gangs: some random gangs regardless of camps
			var randomGangIndex = 0;
			for (var i = 0; i < levelVO.sectors.length; i++) {
				var sectorVO = levelVO.sectors[i];
				if (!WorldCreatorHelper.canSectorHaveGang(levelVO, sectorVO)) continue;
				if (randomGangIndex >= randomGangFreq) {
					var neighbourVO = WorldCreatorRandom.getRandomSectorNeighbour(seed, levelVO, sectorVO, true);
					var direction = PositionConstants.getDirectionFrom(sectorVO.position, neighbourVO.position);
					var neighbourDirection = PositionConstants.getDirectionFrom(neighbourVO.position, sectorVO.position);
					if (!WorldCreatorHelper.canSectorHaveGang(levelVO, neighbourVO, neighbourDirection)) continue;
					if (!WorldCreatorHelper.canPairHaveGang(levelVO, sectorVO, neighbourVO)) continue;
					var direction = PositionConstants.getDirectionFrom(sectorVO.position, neighbourVO.position);
					if (!sectorVO.movementBlockers[direction]) {
						var addDiagonals = i % (randomGangFreq * 2) === 0;
						addGang(sectorVO, neighbourVO, addDiagonals);
						randomGangIndex = 0;
					}
				}

				randomGangIndex++;
			}
		},
		
		generateLocales: function (seed, worldVO, levelVO) {
			var l = levelVO.level;
			var campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, levelVO.level);
			var generator = this;
						
			var addLocale = function (sectorVO, locale) {
				sectorVO.locales.push(locale);
				levelVO.localeSectors.push(sectorVO);
				levelVO.numLocales++;
			};
			
			// 1) spawn trading partners
			for (var i = 0; i < TradeConstants.TRADING_PARTNERS.length; i++) {
				var partner = TradeConstants.TRADING_PARTNERS[i];
				var levelOrdinal = WorldCreatorHelper.getLevelOrdinalForCampOrdinal(seed, partner.campOrdinal);
				var level = WorldCreatorHelper.getLevelForOrdinal(seed, levelOrdinal);
				if (level == levelVO.level) {
					var sectorVO = WorldCreatorRandom.randomSector(seed - 9393 + i * i, worldVO, levelVO, false);
					var locale = new LocaleVO(localeTypes.tradingpartner, true, false);
					// WorldCreatorLogger.i("trade partner at " + sectorVO.position)
					addLocale(sectorVO, locale);
				}
			}
			
			// 2) spanw grove
			if (levelVO.level == worldVO.bottomLevel) {
				var options = { excludingFeature: "workshopResource" };
				var groveSector = WorldCreatorRandom.randomSectors(seed, worldVO, levelVO, 1, 2, options)[0];
				var groveLocale = new LocaleVO(localeTypes.grove, true, false);
				groveSector.sunlit = 1;
				groveSector.hazards.radiation = 0;
				groveSector.hazards.pollution = 0;
				addLocale(groveSector, groveLocale);
			}

			// 3) spawn other types (for blueprints)
			var createLocales = function (worldVO, levelVO, campOrdinal, isEarly, count, countEasy) {
				var pathConstraints = [];
				for (var j = 0; j < levelVO.campPositions.length; j++) {
					var pathType = isEarly ? WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1 : WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_2;
					var pos = levelVO.campPositions[j];
					var length = WorldCreatorConstants.getMaxPathLength(campOrdinal, pathType);
					if (isEarly) {
						length = Math.ceil(length * 0.75);
					}
					if (levelVO.level == 13) {
						length = Math.ceil(length * 0.75);
					}
					pathConstraints.push(new PathConstraintVO(pos, length, pathType));
				}
				var excludedZones = isEarly ?
					[ WorldConstants.ZONE_POI_2, WorldConstants.ZONE_CAMP_TO_PASSAGE, WorldConstants.ZONE_EXTRA_CAMPABLE ] :
					[ WorldConstants.ZONE_ENTRANCE, WorldConstants.ZONE_PASSAGE_TO_CAMP, WorldConstants.ZONE_POI_1, WorldConstants.ZONE_EXTRA_CAMPABLE ];
				var options = { requireCentral: false, excludingFeature: "camp", pathConstraints: pathConstraints, excludedZones: excludedZones, numDuplicates: 2 };
				var l = levelVO.level;
				var sseed = seed - (isEarly ? 5555 : 0) + (l + 50) * 2;
				for (var i = 0; i < count; i++) {
					var localePos = WorldCreatorRandom.randomSectors(sseed + i + i * 7394 * sseed + i * i * l + i, worldVO, levelVO, 1, 2, options);
					var sectorVO = localePos[0];
					if (!sectorVO) continue;
					var s1 = sseed + sectorVO.position.sectorX * 871 + sectorVO.position.sectorY * 659;
					var r1 = WorldCreatorRandom.random(s1);
					var localeType = generator.getLocaleType(worldVO, levelVO, sectorVO, s1, isEarly);
					var isEasy = i <= countEasy;
					var locale = new LocaleVO(localeType, isEasy, isEarly);
					addLocale(sectorVO, locale);
					// WorldCreatorLogger.i(levelVO.level + " added locale: isEarly:" + isEarly + ", distance to camp: " + WorldCreatorHelper.getDistanceToCamp(worldVO, levelVO, sectorVO) + ", zone: " + sectorVO.zone);
					for (var j = 0; j < pathConstraints.length; j++) {
						let criticalPathVO = new CriticalPathVO(pathConstraints[j].pathType, sectorVO.position, pathConstraints[j].startPosition);
						WorldCreatorHelper.addCriticalPath(worldVO, criticalPathVO);
					}
				}
			};
			
			// min number of (easy) locales ensures that player can get all upgrades intended for that level
			// two brackets of locales for critical paths, those on path 2 can require tech from path 1 to reach but not the other way around
			let levelIndex = WorldCreatorHelper.getLevelIndexForCamp(seed, campOrdinal, levelVO.level);
			let maxLevelIndex = WorldCreatorHelper.getMaxLevelIndexForCamp(seed, campOrdinal, levelVO.level);
			var earlyBlueprints = UpgradeConstants.getBlueprintsByCampOrdinal(campOrdinal, UpgradeConstants.BLUEPRINT_BRACKET_EARLY, levelIndex, maxLevelIndex);
			var numEarlyBlueprints = UpgradeConstants.getPiecesByCampOrdinal(campOrdinal, UpgradeConstants.BLUEPRINT_BRACKET_EARLY, levelIndex, maxLevelIndex);
			if (numEarlyBlueprints) {
				var minEarly = WorldCreatorConstants.getMinLocales(numEarlyBlueprints);
				var maxEarly = WorldCreatorConstants.getMaxLocales(numEarlyBlueprints);
				var countEarly = WorldCreatorRandom.randomInt((seed % 84) * l * l * l + 1, minEarly, maxEarly + 1);
				createLocales(worldVO, levelVO, campOrdinal, true, countEarly, minEarly);
			}

			var lateBlueprints = UpgradeConstants.getBlueprintsByCampOrdinal(campOrdinal, UpgradeConstants.BLUEPRINT_BRACKET_LATE, levelIndex, maxLevelIndex);
			var numLateBlueprints = UpgradeConstants.getPiecesByCampOrdinal(campOrdinal, UpgradeConstants.BLUEPRINT_BRACKET_LATE, levelIndex, maxLevelIndex);
			if (numLateBlueprints > 0) {
				var minLate = WorldCreatorConstants.getMinLocales(numLateBlueprints);
				var maxLate = WorldCreatorConstants.getMaxLocales(numLateBlueprints);
				var countLate = WorldCreatorRandom.randomInt((seed % 84) * l * l * l + 1, minLate, maxLate + 1);
				createLocales(worldVO, levelVO, campOrdinal, false, countLate, minLate);
			}
		},
		
		generateAdditionalHazards: function (seed, worldVO, levelVO, sectorVO) {
			var directions = PositionConstants.getLevelDirections();
			for (var d in directions) {
				var direction = directions[d];
				var blocker = sectorVO.movementBlockers[direction];
				if (blocker == MovementConstants.BLOCKER_TYPE_WASTE_TOXIC) {
					this.addHazardCluster(seed, d, levelVO, sectorVO, WorldCreatorConstants.WASTE_HAZARD_RADIUS, 1, false, true);
				}
				if (blocker == MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE) {
					this.addHazardCluster(seed, d, levelVO, sectorVO, WorldCreatorConstants.WASTE_HAZARD_RADIUS, 1, true, true);
				}
			}
		},
		
		addHazardCluster: function (seed, s1, levelVO, centerSector, radius, value, isRadiation, override) {
			var levelOrdinal = levelVO.levelOrdinal;
			isRadiation = isRadiation || WorldCreatorRandom.random(seed / 3381 + levelOrdinal * 777 + (s1+44)*(s1+11)) > 0.5;
			value = value || WorldCreatorRandom.random(levelOrdinal * (s1+11) / seed * 2 + seed/(s1+99+levelOrdinal) - s1*s1);
			for (var hx = centerSector.position.sectorX - radius; hx <= centerSector.position.sectorX + radius; hx++) {
				for (var hy = centerSector.position.sectorY - radius; hy <= centerSector.position.sectorY + radius; hy++) {
					var sectorVO = levelVO.getSector(hx, hy);
					if (!sectorVO) continue;
					if (sectorVO.isCamp) continue;
					if (WorldCreatorConstants.isEarlierZone(sectorVO.zone, centerSector.zone)) {
						continue;
					}
					let isClusterEdge = PositionConstants.getDistanceTo(sectorVO.position, centerSector.position) >= radius;
					this.setSectorHazard(levelVO, sectorVO, value, isRadiation, isClusterEdge, override);
				}
			}
		},
		
		addMovementBlocker: function (worldVO, levelVO, sectorVO, neighbourVO, blockerType, options, sectorcb, cb) {
			var direction = PositionConstants.getDirectionFrom(sectorVO.position, neighbourVO.position);
			var neighbourDirection = PositionConstants.getDirectionFrom(neighbourVO.position, sectorVO.position);

			if (sectorVO.movementBlockers[direction] || neighbourVO.movementBlockers[neighbourDirection]) {
				var existing = sectorVO.movementBlockers[direction] || neighbourVO.movementBlockers[neighbourDirection];
				if (!options.skipWarnings && blockerType != existing) {
					WorldCreatorLogger.w("skipping movement blocker (" + blockerType + "): sector already has movement blocker (" + existing + ")");
				}
				return false;
			}
			
			if (sectorVO.isCamp || neighbourVO.isCamp) {
				if (!options.skipWarnings) WorldCreatorLogger.w("skipping movement blocker (" + blockerType + "): too close to camp ");
				return false;
			}
			
			if (sectorVO.zone == WorldConstants.ZONE_PASSAGE_TO_CAMP && neighbourVO.zone == WorldConstants.ZONE_PASSAGE_TO_CAMP) {
				if (!options.skipWarnings) WorldCreatorLogger.w("skipping movement blocker (" + blockerType + "): in ZONE_PASSAGE_TO_CAMP");
				return false;
			}

			var allowedForGangs = [ WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_2, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE ];
			for (var i = 0; i < sectorVO.criticalPaths.length; i++) {
				var pathType = sectorVO.criticalPaths[i].type;
				if (options.allowedCriticalPaths && options.allowedCriticalPaths.indexOf(pathType) >= 0) continue;
				if (blockerType === MovementConstants.BLOCKER_TYPE_GANG && allowedForGangs.indexOf(pathType) >= 0) continue;
				for (var j = 0; j < neighbourVO.criticalPaths.length; j++) {
					if (pathType === neighbourVO.criticalPaths[j].type) {
						if (!options.skipWarnings) WorldCreatorLogger.w("skipping movement blocker on critical path: " + pathType + " (type: " + blockerType + ")");
						return false;
					}
				}
			}
					
			// add blocker
			sectorVO.addBlocker(direction, blockerType);
			neighbourVO.addBlocker(neighbourDirection, blockerType);

			// add blockers to adjacent paths too (if present) so player can't just walk around the blocker
			if (options.addDiagonals) {
				var diagonalsOptions = Object.assign({}, options);
				diagonalsOptions.addDiagonals = false;
				diagonalsOptions.skipWarnings = true;
				var nextNeighbours = levelVO.getNextNeighbours(sectorVO, direction);
				for (var j = 0; j < nextNeighbours.length; j++) {
					this.addMovementBlocker(worldVO, levelVO, sectorVO, nextNeighbours[j], blockerType, diagonalsOptions, sectorcb);
				}
				nextNeighbours = levelVO.getNextNeighbours(neighbourVO, neighbourDirection);
				for (var j = 0; j < nextNeighbours.length; j++) {
					this.addMovementBlocker(worldVO, levelVO, neighbourVO, nextNeighbours[j], blockerType, diagonalsOptions, sectorcb);
				}
			}
			
			worldVO.resetPaths();

			if (sectorcb) {
				sectorcb(sectorVO, direction);
				sectorcb(neighbourVO, neighbourDirection);
			}
			
			if (cb) {
				cb();
			}
			
			return true;
		},
		
		setSectorHazard: function (levelVO, sectorVO, hazardValueRand, isRadiation, isClusterEdge, override) {
			var maxHazardValue = this.getMaxHazardValue(levelVO, sectorVO, isRadiation, sectorVO.zone, override);
			var minHazardValue = Math.floor(Math.min(20, maxHazardValue / 3 * 2));
			var hazardValue = minHazardValue + hazardValueRand * (maxHazardValue - minHazardValue);
			if (isClusterEdge) {
				hazardValue = hazardValue / 2;
			}
			hazardValue = Math.ceil(hazardValue / 5) * 5;
			if (hazardValue > maxHazardValue) hazardValue = maxHazardValue;
			if (isRadiation) {
				sectorVO.hazards.radiation = hazardValue;
			} else {
				sectorVO.hazards.poison = hazardValue;
			}
			
			if (override && hazardValue > 0) {
				sectorVO.hazards.cold = 0;
				var directions = PositionConstants.getLevelDirections();
				var neighbours = levelVO.getNeighbours(sectorVO.position.sectorX, sectorVO.position.sectorY);
				for (var d in directions) {
					var direction = directions[d];
					var neighbour = neighbours[direction];
					if (neighbour) {
						neighbour.hazards.cold = 0;
					}
				}
				if (isRadiation) {
					sectorVO.hazards.poison = 0;
				} else {
					sectorVO.hazards.radiation = 0;
				}
			}
		},
		
		getSectorType: function (seed, worldVO, levelVO, sectorVO) {
			var level = levelVO.level;
			var r1 = 9000 + seed % 2000 + (levelVO.level + 5) * 11 + sectorVO.position.sectorX * 141 + sectorVO.position.sectorY * 153;
			var rand = WorldCreatorRandom.random(r1);
			
			var sectorType = SectorConstants.SECTOR_TYPE_MAINTENANCE;
			if (level == worldVO.topLevel) {
				// special level: top level
				sectorType = SectorConstants.SECTOR_TYPE_COMMERCIAL;
				if (rand < 0.6) sectorType = SectorConstants.SECTOR_TYPE_PUBLIC;
				if (rand < 0.4) sectorType = SectorConstants.SECTOR_TYPE_RESIDENTIAL;
				if (rand < 0.05) sectorType = SectorConstants.SECTOR_TYPE_MAINTENANCE;
			} else if (level > worldVO.topLevel - 4) {
				// levels near top: mainly residentai
				sectorType = SectorConstants.SECTOR_TYPE_COMMERCIAL;
				if (rand < 0.7) sectorType = SectorConstants.SECTOR_TYPE_PUBLIC;
				if (rand < 0.5) sectorType = SectorConstants.SECTOR_TYPE_RESIDENTIAL;
				if (rand < 0.05) sectorType = SectorConstants.SECTOR_TYPE_MAINTENANCE;
			} else if (level > worldVO.topLevel - 8) {
				// first dark levels: mainly recent industrial and maintenance
				sectorType = SectorConstants.SECTOR_TYPE_INDUSTRIAL;
				if (rand < 0.7) sectorType = SectorConstants.SECTOR_TYPE_COMMERCIAL;
				if (rand < 0.65) sectorType = SectorConstants.SECTOR_TYPE_PUBLIC;
				if (rand < 0.5) sectorType = SectorConstants.SECTOR_TYPE_MAINTENANCE;
				if (rand < 0.4) sectorType = SectorConstants.SECTOR_TYPE_RESIDENTIAL;
				if (rand < 0.2) sectorType = SectorConstants.SECTOR_TYPE_SLUM;
			} else if (level > 14) {
				// levels baove 14: slums and maintenance
				sectorType = SectorConstants.SECTOR_TYPE_MAINTENANCE;
				if (rand < 0.75) sectorType = SectorConstants.SECTOR_TYPE_PUBLIC;
				if (rand < 0.7) sectorType = SectorConstants.SECTOR_TYPE_INDUSTRIAL;
				if (rand < 0.5) sectorType = SectorConstants.SECTOR_TYPE_RESIDENTIAL;
				if (rand < 0.4) sectorType = SectorConstants.SECTOR_TYPE_SLUM;
			} else if (level == 14) {
				// special level: 14
				sectorType = SectorConstants.SECTOR_TYPE_INDUSTRIAL;
				if (rand < 0.25) sectorType = SectorConstants.SECTOR_TYPE_MAINTENANCE;
				if (rand < 0.35) sectorType = SectorConstants.SECTOR_TYPE_SLUM;
			} else if (level > 4) {
				// levels below 14: mix of slum, maintenance, and everything else
				sectorType = SectorConstants.SECTOR_TYPE_SLUM;
				if (rand < 0.5) sectorType = SectorConstants.SECTOR_TYPE_INDUSTRIAL;
				if (rand < 0.4) sectorType = SectorConstants.SECTOR_TYPE_MAINTENANCE;
				if (rand < 0.3) sectorType = SectorConstants.SECTOR_TYPE_RESIDENTIAL;
				if (rand < 0.2) sectorType = SectorConstants.SECTOR_TYPE_COMMERCIAL;
				if (rand < 0.1) sectorType = SectorConstants.SECTOR_TYPE_PUBLIC;
			} else if (level > worldVO.bottomLevel) {
				// levels near ground: old levels
				sectorType = SectorConstants.SECTOR_TYPE_SLUM;
				if (rand < 0.9) sectorType = SectorConstants.SECTOR_TYPE_INDUSTRIAL;
				if (rand < 0.8) sectorType = SectorConstants.SECTOR_TYPE_MAINTENANCE;
				if (rand < 0.6) sectorType = SectorConstants.SECTOR_TYPE_RESIDENTIAL;
				if (rand < 0.4) sectorType = SectorConstants.SECTOR_TYPE_COMMERCIAL;
				if (rand < 0.2) sectorType = SectorConstants.SECTOR_TYPE_PUBLIC;
			} else if (level == worldVO.bottomLevel) {
				// special level: ground level
				sectorType = SectorConstants.SECTOR_TYPE_MAINTENANCE;
				if (rand < 0.8) sectorType = SectorConstants.SECTOR_TYPE_INDUSTRIAL;
				if (rand < 0.6) sectorType = SectorConstants.SECTOR_TYPE_RESIDENTIAL;
				if (rand < 0.4) sectorType = SectorConstants.SECTOR_TYPE_COMMERCIAL;
				if (rand < 0.2) sectorType = SectorConstants.SECTOR_TYPE_PUBLIC;
			}
			
			if (sectorVO.workshopResource == "fuel") {
				sectorType = SectorConstants.SECTOR_TYPE_INDUSTRIAL;
			}
			
			if (sectorVO.workshopResource == "rubber") {
				sectorType = SectorConstants.SECTOR_TYPE_INDUSTRIAL;
			}
			
			return sectorType;
		},
		
		isSunlit: function (seed, worldVO, levelVO, sectorVO) {
			var l = sectorVO.position.level;
			var isHole = function (pos) {
				var features = worldVO.getFeaturesByPos(pos);
				for (var i = 0; i < features.length; i++) {
					switch (features[i].type) {
						case WorldCreatorConstants.FEATURE_HOLE_WELL:
						case WorldCreatorConstants.FEATURE_HOLE_COLLAPSE:
						case WorldCreatorConstants.FEATURE_HOLE_SEA:
						case WorldCreatorConstants.FEATURE_HOLE_MOUNTAIN:
							return 1;
					}
				}
				return 0;
			};
			if (l === worldVO.topLevel) {
				// surface: all lit
				return 1;
			} else if (l === 13) {
				// start level: no sunlight
				return 0;
			} else if (sectorVO.workshopResource == "herbs") {
				// greenhouse (herbs workshop) sectors: all lit
				return 1;
			} else {
				// others: sunlight only if ceiling or edge is open
				// - sector itself is a hole
				if (isHole(sectorVO.position)) return 1;
				// - sector(s) above are holes or damaged enough
				for (var level = l + 1; l <= worldVO.topLevel; l++) {
					var pos = new PositionVO(level, sectorVO.position.sectorX, sectorVO.position.sectorY);
					var sectorVO2 = worldVO.getLevel(l).getSector(pos.sectorX, pos.sectorY, 5);
					if (isHole(pos)) return 1;
					if (!sectorVO2 || (sectorVO.wear < 8 && sectorVO.damage < 5)) break;
					if (sectorVO2 && sectorVO2.sunlit) return 1;
				}
				// - sector is near edge to the sea
				var sea = worldVO.getFeaturesByType(WorldCreatorConstants.FEATURE_HOLE_SEA)[0];
				var distance = sea.getDistanceTo(sectorVO.position);
				if (distance <= 1 + levelVO.seaPadding) return 1;
				return 0;
			}
		},
		
		isRequiredResourceWaterSpring: function (levelVO, sectorVO) {
			return this.canHaveSpring(levelVO, sectorVO) && sectorVO.position.sectorX % 5 == 0;
		},
		
		isRequiredResourceFoodTrap: function (sectorVO) {
			let isPreferredZone = sectorVO.isOnCriticalPath()
				|| sectorVO.zone == WorldConstants.ZONE_ENTRANCE
				|| sectorVO.zone == WorldConstants.ZONE_PASSAGE_TO_CAMP
				|| sectorVO.zone == WorldConstants.ZONE_PASSAGE_TO_PASSAGE
				|| sectorVO.zone == WorldConstants.ZONE_POI_1
				|| sectorVO.zone == WorldConstants.ZONE_POI_2
				|| sectorVO.zone == WorldConstants.ZONE_CAMP_TO_PASSAGE;
			return isPreferredZone && sectorVO.hazards.radiation <= 0;
		},
		
		canHaveSpring: function (levelVO, sectorVO) {
			var isStartPosition = sectorVO.position.level == 13 && sectorVO.isCamp;
			if (isStartPosition) return false;
			if (sectorVO.hazards.radiation || sectorVO.hazards.pollution) return false;
			
			var directions = PositionConstants.getLevelDirections();
			var neighbours = levelVO.getNeighbours(sectorVO.position.sectorX, sectorVO.position.sectorY);
			for (var d in directions) {
				var direction = directions[d];
				var neighbour = neighbours[direction];
				if (neighbour && neighbour.hasSpring) {
					return false;
				}
			}
			
			return true;
		},
		
		getPassageUpType: function (seed, worldVO, levelVO, sectorVO) {
			if (!sectorVO.isPassageUp) return null;
			var sectorUp = worldVO.getLevel(levelVO.level + 1).getSector(sectorVO.position.sectorX, sectorVO.position.sectorY);
			return sectorUp.passageDownType;
		},
		
		getPassageDownType: function (seed, worldVO, levelVO, sectorVO) {
			if (!sectorVO.isPassageDown) return null;
			var l = levelVO.level;
			var s1 = seed + l * 7 + sectorVO.position.sectorX * seed % 6 * 10;
			var campOrdinal = levelVO.campOrdinal;
			var unlockElevatorOrdinal = UpgradeConstants.getMinimumCampOrdinalForUpgrade("unlock_building_passage_elevator");
			var unlockHoleOrdinal = UpgradeConstants.getMinimumCampOrdinalForUpgrade("unlock_building_passage_hole");
			if (l === 13) {
				return MovementConstants.PASSAGE_TYPE_STAIRWELL;
			} else if (campOrdinal > WorldConstants.CAMP_ORDINAL_LIMIT) {
				return MovementConstants.PASSAGE_TYPE_BLOCKED;
			} else if (l === 14) {
				return MovementConstants.PASSAGE_TYPE_HOLE;
			} else if (levelVO.isCampable && campOrdinal == unlockElevatorOrdinal) {
				return MovementConstants.PASSAGE_TYPE_ELEVATOR;
			}else if (levelVO.isCampable && campOrdinal == unlockHoleOrdinal) {
				return MovementConstants.PASSAGE_TYPE_HOLE;
			} else {
				var availablePassageTypes = [MovementConstants.PASSAGE_TYPE_STAIRWELL];
				if (campOrdinal >= unlockElevatorOrdinal)
					availablePassageTypes.push(MovementConstants.PASSAGE_TYPE_ELEVATOR);
				if (campOrdinal >= unlockHoleOrdinal)
					availablePassageTypes.push(MovementConstants.PASSAGE_TYPE_HOLE);
				var passageTypeIndex = WorldCreatorRandom.randomInt(s1, 0, availablePassageTypes.length);
				var passageType = availablePassageTypes[passageTypeIndex];
				return passageType;
			}
		},
		
		getPossibleEnemies: function (seed, worldVO, levelVO, sectorVO, enemyCreator) {
			var l = sectorVO.position.level;
			var x = sectorVO.position.sectorX;
			var y = sectorVO.position.sectorY;
			var campOrdinal = levelVO.campOrdinal;
			var step = WorldConstants.getCampStep(sectorVO.zone);
			var isPollutedLevel = levelVO.notCampableReason === LevelConstants.UNCAMPABLE_LEVEL_TYPE_POLLUTION;
			var isRadiatedLevel = levelVO.notCampableReason === LevelConstants.UNCAMPABLE_LEVEL_TYPE_RADIATION;
			
			var enemyDifficulty = enemyCreator.getDifficulty(campOrdinal, step);
			if (sectorVO.isOnEarlyCriticalPath()) enemyDifficulty -= 2;
			enemyDifficulty = Math.max(enemyDifficulty, 1);
			sectorVO.enemyDifficulty = enemyDifficulty;

			var enemies = [];
			
			// collect all valid enemies for this sector (candidates)
			var candidates = [];
			var enemy;
			var candidateDifficulties = [];
			var addEnemyCandidates = function (enemyType) {
				var typeEnemies = enemyCreator.getEnemies(enemyType, enemyDifficulty, false);
				for (var e in typeEnemies) {
					enemy = typeEnemies[e];
					candidates.push(enemy);
					candidateDifficulties.push(enemyCreator.getEnemyDifficultyLevel(enemy));
				}
			};

			addEnemyCandidates(EnemyConstants.enemyTypes.global);
			if (!isPollutedLevel && !isRadiatedLevel && !sectorVO.hazards.hasHazards()) addEnemyCandidates(EnemyConstants.enemyTypes.nohazard);
			if (sectorVO.hazards.cold > 0) addEnemyCandidates(EnemyConstants.enemyTypes.cold);
			if (isPollutedLevel || sectorVO.hazards.poison > 0) addEnemyCandidates(EnemyConstants.enemyTypes.toxic);
			if (isRadiatedLevel || sectorVO.hazards.radiation > 0) addEnemyCandidates(EnemyConstants.enemyTypes.radiation);
			if (sectorVO.sunlit) addEnemyCandidates(EnemyConstants.enemyTypes.sunlit);
			if (!sectorVO.sunlit) addEnemyCandidates(EnemyConstants.enemyTypes.dark);
			if (!isPollutedLevel && !isRadiatedLevel && sectorVO.buildingDensity > 5) addEnemyCandidates(EnemyConstants.enemyTypes.dense);
			if (!isPollutedLevel && !isRadiatedLevel && sectorVO.buildingDensity <= 5) addEnemyCandidates(EnemyConstants.enemyTypes.sparse);
			
			var hasWater = sectorVO.hasWater();
			var directions = PositionConstants.getLevelDirections();
			var neighbours = levelVO.getNeighbours(x, y);
			for (var d in directions) {
				var direction = directions[d];
				var neighbour = neighbours[direction];
				if (neighbour) {
					hasWater = hasWater || neighbour.hasWater();
				}
			}
			if (!isPollutedLevel && !isRadiatedLevel && hasWater) addEnemyCandidates(EnemyConstants.enemyTypes.water);

			// check that we found some candidates
			if (candidates.length < 1) {
				WorldCreatorLogger.w("No valid enemies defined for sector " + sectorVO.position + " difficulty " + enemyDifficulty);
				return enemies;
			}
			
			// select enemies from candidates by rarity and difficulty
			candidates = candidates.sort(function (a,b) {
				return a.rarity - b.rarity;
			});
			candidateDifficulties = candidateDifficulties.sort(function (a,b) {
				return a - b;
			});
			
			var minDifficulty = levelVO.isHard ? candidateDifficulties[Math.floor(candidateDifficulties.length/2)] : candidateDifficulties[0];
			for (var i = 0; i < candidates.length; i++) {
				enemy = candidates[i];
				if (enemyCreator.getEnemyDifficultyLevel(enemy) < minDifficulty) continue;
				var threshold = (enemy.rarity + 5) / 110;
				var r = WorldCreatorRandom.random(9999 + l * seed + x * l * 80 + y * 10 + i * x *22 - y * i * x * 15);
				if (i == 0 || r > threshold) {
					enemies.push(enemy);
				}
			}

			return enemies;
		},
		
		getMaxHazardValue: function (levelVO, sectorVO, isRadiation, zone, override) {
			var step = WorldConstants.getCampStep(zone);
			var campOrdinal = levelVO.campOrdinal;
			if (sectorVO.requiredResources.water) {
				return 0;
			}
			if (!override) {
				if (sectorVO.hazards.cold) return 0;
				var directions = PositionConstants.getLevelDirections();
				var neighbours = levelVO.getNeighbours(sectorVO.position.sectorX, sectorVO.position.sectorY);
				for (var d in directions) {
					var direction = directions[d];
					var neighbour = neighbours[direction];
					if (neighbour && neighbour.hazards.cold) return 0;
				}
			}
			if (sectorVO.workshopResource != null) return 0;
			let value = 0;
			if (isRadiation) {
				value = Math.min(100, this.itemsHelper.getMaxHazardRadiationForLevel(campOrdinal, step, levelVO.isHard));
			} else {
				value = Math.min(100, this.itemsHelper.getMaxHazardPoisonForLevel(campOrdinal, step, levelVO.isHard));
			}
			if (zone == WorldConstants.ZONE_PASSAGE_TO_CAMP || sectorVO.isPassageUp || sectorVO.isPassageDown) {
				// TODO replace hard-coded level with a check like "early-ish level ordinal, campable, previous level not campable"
				if (levelVO.level == 10) {
					value = 0;
				} else {
					value = Math.floor(value * 2 / 3);
				}
			}
			return value;
		},
		
		getLevelBlockerTypes: function (levelVO, campStage) {
			var levelOrdinal = levelVO.levelOrdinal;
			var campOrdinal = levelVO.campOrdinal;
			var isPollutedLevel = levelVO.notCampableReason === LevelConstants.UNCAMPABLE_LEVEL_TYPE_POLLUTION;
			var isRadiatedLevel = levelVO.notCampableReason === LevelConstants.UNCAMPABLE_LEVEL_TYPE_RADIATION;

			var blockerTypes = [];
			if (levelOrdinal > 1) {
				blockerTypes.push(MovementConstants.BLOCKER_TYPE_DEBRIS);
				blockerTypes.push(MovementConstants.BLOCKER_TYPE_DEBRIS);
			}
			
			var unlockGapOrdinal = UpgradeConstants.getMinimumCampOrdinalForUpgrade("unlock_building_bridge");
			if (campOrdinal > unlockGapOrdinal || (campOrdinal == unlockGapOrdinal && campStage == WorldConstants.CAMP_STAGE_LATE)) {
				blockerTypes.push(MovementConstants.BLOCKER_TYPE_GAP);
			}
			
			// TODO non-hardcoded levels
			if (campOrdinal >= 7 && !isRadiatedLevel) {
				blockerTypes.push(MovementConstants.BLOCKER_TYPE_WASTE_TOXIC);
			}
			
			if (levelVO.level >= 14 && isRadiatedLevel) {
				blockerTypes.push(MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE);
			}
			
			return blockerTypes;
		},
		
		getLocaleType: function (worldVO, levelVO, sectorVO, s1, isEarly) {
			var possibleTypes = [];
			var l = levelVO.level;
			var sectorType = sectorVO.sectorType;
			var distanceToCamp = WorldCreatorHelper.getQuickDistanceToCamp(levelVO, sectorVO);

			// level-based
			if (l >= worldVO.topLevel - 1)
				possibleTypes.push(localeTypes.lab);
			
			if (l == 14)
				possibleTypes.push(localeTypes.factory);
				
			// sector type based
			switch (sectorType) {
				case SectorConstants.SECTOR_TYPE_RESIDENTIAL:
					possibleTypes.push(localeTypes.house);
					possibleTypes.push(localeTypes.transport);
					possibleTypes.push(localeTypes.sewer);
					possibleTypes.push(localeTypes.warehouse);
					possibleTypes.push(localeTypes.hut);
					possibleTypes.push(localeTypes.market);
					if (distanceToCamp > 3 && levelVO.level !== 13) {
						possibleTypes.push(localeTypes.camp);
						possibleTypes.push(localeTypes.hermit);
					}
					break;

				case SectorConstants.SECTOR_TYPE_INDUSTRIAL:
					possibleTypes.push(localeTypes.factory);
					possibleTypes.push(localeTypes.warehouse);
					possibleTypes.push(localeTypes.transport);
					possibleTypes.push(localeTypes.sewer);
					break;

				case SectorConstants.SECTOR_TYPE_MAINTENANCE:
					possibleTypes.push(localeTypes.maintenance);
					possibleTypes.push(localeTypes.transport);
					possibleTypes.push(localeTypes.hermit);
					possibleTypes.push(localeTypes.sewer);
					break;

				case SectorConstants.SECTOR_TYPE_COMMERCIAL:
					possibleTypes.push(localeTypes.market);
					possibleTypes.push(localeTypes.warehouse);
					possibleTypes.push(localeTypes.transport);
					possibleTypes.push(localeTypes.hut);
					possibleTypes.push(localeTypes.hermit);
					possibleTypes.push(localeTypes.house);
					break;

				case SectorConstants.SECTOR_TYPE_SLUM:
					possibleTypes.push(localeTypes.house);
					possibleTypes.push(localeTypes.hut);
					possibleTypes.push(localeTypes.hermit);
					possibleTypes.push(localeTypes.sewer);
					if (distanceToCamp > 3 && levelVO.level !== 13) {
						possibleTypes.push(localeTypes.camp);
					}
					break;
					
				case SectorConstants.SECTOR_TYPE_PUBLIC:
					possibleTypes.push(localeTypes.lab);
					possibleTypes.push(localeTypes.transport);
					possibleTypes.push(localeTypes.library);
					break;

				default:
					WorldCreatorLogger.w("Unknown sector type " + sectorType);
					return null;
			}
			
			var localeRandom = WorldCreatorRandom.random(s1);
			return possibleTypes[Math.floor(localeRandom * possibleTypes.length)];
		},
		
	};
	
	return SectorGenerator;
});
