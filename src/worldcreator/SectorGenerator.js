// Handles the first step of world generation, the abstract world template itself
define([
	'ash',
	'utils/MathUtils',
	'game/GameGlobals',
	'game/constants/EnemyConstants',
	'game/constants/ItemConstants',
	'game/constants/LevelConstants',
	'game/constants/LocaleConstants',
	'game/constants/MovementConstants',
	'game/constants/PositionConstants',
	'game/constants/SectorConstants',
	'game/constants/TradeConstants',
	'game/constants/TribeConstants',
	'game/constants/UpgradeConstants',
	'game/constants/WorldConstants',
	'game/vos/GangVO',
	'game/vos/LocaleVO',
	'game/vos/PathConstraintVO',
	'game/vos/PositionVO',
	'game/vos/ResourcesVO',
	'game/vos/StashVO',
	'game/vos/WaymarkVO',
	'worldcreator/WorldCreatorConstants',
	'worldcreator/WorldCreatorHelper',
	'worldcreator/WorldCreatorRandom',
	'worldcreator/WorldCreatorDebug',
	'worldcreator/WorldCreatorLogger',
	'worldcreator/CriticalPathVO',
], function (
	Ash, MathUtils, GameGlobals,
	EnemyConstants, ItemConstants, LevelConstants, LocaleConstants, MovementConstants, PositionConstants, SectorConstants, TradeConstants, TribeConstants, UpgradeConstants, WorldConstants,
	GangVO, LocaleVO, PathConstraintVO, PositionVO, ResourcesVO, StashVO, WaymarkVO,
	WorldCreatorConstants, WorldCreatorHelper, WorldCreatorRandom, WorldCreatorDebug, WorldCreatorLogger, CriticalPathVO
) {
	
	var SectorGenerator = {
		
		itemsHelper: null,
		
		LUXURY_RESOURCE_LOCATION_TYPE_FARMABLE: "LUXURY_RESOURCE_LOCATION_TYPE_FARMABLE",
		LUXURY_RESOURCE_LOCATION_TYPE_BIO: "LUXURY_RESOURCE_LOCATION_TYPE_BIO",
		LUXURY_RESOURCE_LOCATION_TYPE_MINERAL: "LUXURY_RESOURCE_LOCATION_TYPE_MINERAL",
		
		prepareSectors: function (seed, worldVO, itemsHelper, enemyCreator) {
			this.itemsHelper = itemsHelper;
			
			for (var l = worldVO.topLevel; l >= worldVO.bottomLevel; l--) {
				var levelVO = worldVO.levels[l];
				
				// level-wide features 1
				this.generateAdditionalCampPositions(seed, worldVO, levelVO);
				this.generateZones(seed, worldVO, levelVO);
				this.generateStashes(seed, worldVO, levelVO);
				this.generateWorkshops(seed, worldVO, levelVO);
				this.generateBuildingProjectSpots(seed, worldVO, levelVO);
				
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
					this.generateDifficulty(seed, worldVO, levelVO, sectorVO);
					this.generateResources(seed, worldVO, levelVO, sectorVO);
				}
				
				// level-wide features 2
				this.generateLocales(seed, worldVO, levelVO);
				this.generateMovementBlockers(seed, worldVO, levelVO);
				this.generateEnemies(seed, worldVO, levelVO, enemyCreator);
				this.generateItems(seed, worldVO, levelVO);
				
				// sector features 2
				for (var s = 0; s < levelVO.sectors.length; s++) {
					var sectorVO = levelVO.sectors[s];
					sectorVO.sunlit = sectorVO.sunlit || this.isSunlitByNeighbours(worldVO, levelVO, sectorVO);
				}
				this.generateWaymarks(seed, worldVO, levelVO);
			}
			
			// debug
			// WorldCreatorDebug.printWorld(worldVO, [ "isCampAdditional"], "red" );
			// WorldCreatorDebug.printWorld(worldVO, [ "hasRegularEnemies"], "red" );
			// WorldCreatorDebug.printWorld(worldVO, [ "possibleEnemies.length" ]);
			// WorldCreatorDebug.printWorld(worldVO, [ "enemyDifficulty" ]);
			// WorldCreatorDebug.printWorld(worldVO, [ "hazards.radiation" ], "red");
			// WorldCreatorDebug.printWorld(worldVO, [ "resourcesAll.water"], "blue");
			// WorldCreatorDebug.printWorld(worldVO, [ "resourcesScavengable.food" ], "#ee8822");
			// WorldCreatorDebug.printWorld(worldVO, [ "resourcesScavengable.metal" ], "#000");
			// WorldCreatorDebug.printWorld(worldVO, [ "workshopResource" ]);
			// WorldCreatorDebug.printWorld(worldVO, [ "criticalPaths.length" ], "red" );
			// WorldCreatorDebug.printWorld(worldVO, [ "requiredResources.food" ], "red" );
			// WorldCreatorDebug.printWorld(worldVO, [ "requiredResources.water" ], "blue" );
			// WorldCreatorDebug.printWorld(worldVO, [ "scavengeDifficulty" ] );
		},
		
		generateAdditionalCampPositions: function (seed, worldVO, levelVO) {
			if (levelVO.level == 13) return;
			if (!levelVO.isCampable) return;
			
			levelVO.additionalCampPositions = [];
			
			let campOrdinal = levelVO.campOrdinal;
			let minPathlenC2P = 3;
			let maxPathLenC2P = WorldCreatorConstants.getMaxPathLength(campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE);
			
			let numPositions = 3;
			
			let isValidAdditionalCampPosition = function (sectorVO) {
				if (sectorVO.isCamp) return false;
				if (sectorVO.isPassageUp || sectorVO.isPassageDown) return false;
				if (sectorVO.stage != WorldConstants.CAMP_STAGE_EARLY) return false;
				if (WorldCreatorHelper.getDistanceToCamp(worldVO, levelVO, sectorVO, WorldCreatorConstants.MAX_CAMP_POS_DISTANCE) > WorldCreatorConstants.MAX_CAMP_POS_DISTANCE) return false;
				
				for (let i = 0; i < levelVO.passagePositions.length; i++) {
					let passagePos = levelVO.passagePositions[i];
					let stage = null; // WorldConstants.CAMP_STAGE_EARLY
					let path = WorldCreatorRandom.findPath(worldVO, sectorVO.position, passagePos, false, true, stage);
					if (!path) return false;
					if (path.length > maxPathLenC2P) return false;
					if (path.length < minPathlenC2P) return false;
				}
				return true;
			};
			
			let validSectors = [];
			for (var s = 0; s < levelVO.sectors.length; s++) {
				var sectorVO = levelVO.sectors[s];
				if (!isValidAdditionalCampPosition(sectorVO)) continue;
				validSectors.push(sectorVO);
				let distanceToCamp = WorldCreatorHelper.getDistanceToCamp(worldVO, levelVO, sectorVO);
				let numNeighboursWeighted = levelVO.getNeighbourCountWeighted(sectorVO.position.sectorX, sectorVO.position.sectorY);
				sectorVO.campPosScore = numNeighboursWeighted * 3 - distanceToCamp;
			}
			
			validSectors.sort(function (a, b) { return b.campPosScore - a.campPosScore });
			
			for (let i = 0; i < numPositions; i++) {
				if (!validSectors[i]) break;
				validSectors[i].isCampAdditional = true;
				validSectors[i].isCamp = true;
				levelVO.additionalCampPositions.push(validSectors[i].position)
			}
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
			
			var setPathZone = function (path, zone, areaMin, areaMax, forceArea) {
				for (let i = 0; i < path.length; i++) {
					var pos = path[i];
					var sector = levelVO.getSector(pos.sectorX, pos.sectorY);
					var s = path.length * 987 + pos.sectorX * 76 + i * 276;
					var area = WorldCreatorRandom.randomInt(s, areaMin, areaMax + 1);
					setAreaZone(sector, zone, area, forceArea);
				}
			};
						
			// entrance to level ZONE_ENTRANCE
			if (level != 13) {
				setAreaZone(passage1, WorldConstants.ZONE_ENTRANCE, 2, 2);
			}
			
			if (isCampableLevel) {
				// camp:
				var campSector = levelVO.getSectorByPos(levelVO.campPosition);
				// - path to camp ZONE_PASSAGE_TO_CAMP
				if (level != 13) {
					setAreaZone(passage1, WorldConstants.ZONE_PASSAGE_TO_CAMP, 3, 1);
					setAreaZone(campSector, WorldConstants.ZONE_PASSAGE_TO_CAMP, 3, 1);
					var pathToCamp = WorldCreatorRandom.findPath(worldVO, passage1.position, campSector.position, false, true, WorldConstants.CAMP_STAGE_EARLY);
					setPathZone(pathToCamp, WorldConstants.ZONE_PASSAGE_TO_CAMP, 1, 3);
				}
				// - path to passage2 ZONE_CAMP_TO_PASSAGE
				if (passage2) {
					var pathToCamp = WorldCreatorRandom.findPath(worldVO, campSector.position, passage2.position, false, true);
					setPathZone(pathToCamp, WorldConstants.ZONE_CAMP_TO_PASSAGE, 1, 2);
				}
				// - rest ZONE_POI_1, ZONE_POI_2, ZONE_EXTRA_CAMPABLE depending on stage and vornoi points
				var points = WorldCreatorHelper.getVornoiPoints(seed, worldVO, levelVO);
				for (let i = 0; i < levelVO.sectors.length; i++) {
					var sector = levelVO.sectors[i];
					var closestPoint = null;
					var closestPointDist = 0;
					for (let j = 0; j < points.length; j++) {
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
					setPathZone(pathPassageToPassage, WorldConstants.ZONE_PASSAGE_TO_PASSAGE, 1, 3, true);
				}
				// - ground level: all ZONE_POI_2
				if (level == bottomLevel) {
					// TODO should be just the path from passage1 to grove instead but currently we don't know the grove position at this point
					setAreaZone(passage1, WorldConstants.ZONE_POI_2, 50, true);
				}
				// - rest is ZONE_EXTRA_UNCAMPABLE
				for (let i = 0; i < levelVO.sectors.length; i++) {
					var sector = levelVO.sectors[i];
					setSectorZone(sector, WorldConstants.ZONE_EXTRA_UNCAMPABLE, true);
				}
			}
		},
		
		generateHazards: function (seed, worldVO, levelVO) {
			var l = levelVO.level == 0 ? 1342 : levelVO.level;
			var campOrdinal = levelVO.campOrdinal;
			var levelOrdinal = levelVO.levelOrdinal;
			
			let isPollutedLevel = levelVO.notCampableReason === LevelConstants.UNCAMPABLE_LEVEL_TYPE_POLLUTION;
			let isRadiatedLevel = levelVO.notCampableReason === LevelConstants.UNCAMPABLE_LEVEL_TYPE_RADIATION;
			let isHazardLevel = isPollutedLevel || isRadiatedLevel;
			
			// hazard areas (cold)
			let hasCold = levelVO.level != 14;
			let centerRadius = isHazardLevel ? 6 : 2;
			if (hasCold) {
				for (var s = 0; s < levelVO.sectors.length; s++) {
					// - block for certain sectors
					var sectorVO = levelVO.sectors[s];
					if (sectorVO.isCamp) continue;
					if (sectorVO.isOnCriticalPath(WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_CAMP)) continue;
					var x = sectorVO.position.sectorX;
					var y = sectorVO.position.sectorY;
					if (Math.abs(y) <= centerRadius && Math.abs(x) <= centerRadius) continue;
					var distanceToCamp = WorldCreatorHelper.getQuickMinDistanceToCamp(levelVO, sectorVO);
					var distanceToCampThreshold = l == 13 ? 6 : 3;
					if (distanceToCamp < distanceToCampThreshold) continue;
						
					// - determine value range
					var step = WorldConstants.getCampStep(sectorVO.zone);
					var distanceToEdge = Math.min(Math.abs(y - levelVO.minY), Math.abs(y - levelVO.maxY), Math.abs(x - levelVO.minX), Math.abs(x - levelVO.maxX));
					
					var maxHazardCold = Math.min(100, this.itemsHelper.getMaxHazardColdForLevel(campOrdinal, step, levelVO.isHard));
					var minHazardCold = this.itemsHelper.getMinHazardColdForLevel(campOrdinal, step, levelVO.isHard);
					if (levelVO.level != worldVO.topLevel && this.isSunlit(seed, worldVO, levelVO, sectorVO) && distanceToEdge > 1) {
						maxHazardCold /= 2;
						minHazardCold /= 2;
					}
					if (maxHazardCold < Math.max(5, minHazardCold)) continue;
					minHazardCold = Math.min(minHazardCold, maxHazardCold - 1);
					minHazardCold = Math.max(minHazardCold, 1);
						
					// - determine eligibility
					var isEarlyZone = sectorVO.zone == WorldConstants.ZONE_PASSAGE_TO_CAMP || sectorVO.zone == WorldConstants.ZONE_PASSAGE_TO_PASSAGE;
					var isEarlyCriticalPath = sectorVO.isOnEarlyCriticalPath();
					var edgeThreshold = isEarlyCriticalPath || isEarlyZone ? 10 : 5;
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
			
			// hazard clusters (radiation, poison and debris)
			if (campOrdinal < WorldCreatorConstants.MIN_CAMP_ORDINAL_HAZARD_RADIATION && campOrdinal < WorldCreatorConstants.MIN_CAMP_ORDINAL_HAZARD_POISON && campOrdinal < WorldCreatorConstants.MIN_CAMP_ORDINAL_HAZARD_DEBRIS) {
				return;
			}
			
			var hazardType = isRadiatedLevel ? SectorConstants.HAZARD_TYPE_RADIATION : SectorConstants.HAZARD_TYPE_POLLUTION;
			
			if (!isHazardLevel) {
				// normal level
				// - random clusters
				let minHazardClusters = 1;
				let maxHazardClusters = levelVO.isCampable ? 2 : 3;
				if (levelVO.level >= worldVO.topLevel - 1) {
					minHazardClusters++;
					maxHazardClusters++;
				}
				var options = { excludingFeature: "isCamp", excludedZones: [ WorldConstants.ZONE_PASSAGE_TO_CAMP ] };
				var hazardSectors = WorldCreatorRandom.randomSectors(seed / 3 * levelOrdinal + 73 * levelVO.maxX, worldVO, levelVO, minHazardClusters, maxHazardClusters + 1, options);
				for (var h = 0; h < hazardSectors.length; h++) {
					var centerSector = hazardSectors[h];
					var hrRandom = WorldCreatorRandom.random(84848 + levelOrdinal * 99 + (h+12) * 111 + seed / 777);
					var radius = Math.round(hrRandom * 6) + 3;
					this.addHazardCluster(seed, levelVO, centerSector, radius);
				}
				
				// - clusters on border sectors (to guide player to camp)
				var borderSectors = WorldCreatorHelper.getBorderSectorsForZone(levelVO, WorldConstants.ZONE_PASSAGE_TO_CAMP, true);
				var startPos = levelVO.excursionStartPosition;
				borderSectors.sort(function (a, b) { return PositionConstants.getDistanceTo(startPos, b.sector.position) - PositionConstants.getDistanceTo(startPos, a.sector.position) });
				for (let i = 0; i < borderSectors.length; i++) {
					var pair = borderSectors[i];
					if (pair.neighbour.zone == WorldConstants.ZONE_ENTRANCE) continue;
					var maxHazardValue = this.getMaxHazardValue(levelVO, pair.neighbour, hazardType, pair.neighbour.zone);
					if (maxHazardValue < 1) continue;
					var distanceToCamp = Math.min(
						WorldCreatorHelper.getQuickMinDistanceToCamp(levelVO, pair.sector),
						WorldCreatorHelper.getQuickMinDistanceToCamp(levelVO, pair.neighbour)
					);
					if (distanceToCamp < 3) continue;
					var s = 2000 + seed % 26 * 3331 + 100 + (i + 5) * 6541 + distanceToCamp * 11;
					if (WorldCreatorRandom.randomBool(s, 0.35)) {
						var radius = WorldCreatorRandom.randomInt(s / 2, 2, 3);
						this.addHazardCluster(seed, levelVO, pair.neighbour, radius);
						break;
					}
				}
			} else {
				// level completely covered in hazard
				for (let i = 0; i < levelVO.sectors.length; i++) {
					var sectorVO = levelVO.sectors[i];
					if (sectorVO.zone == WorldConstants.ZONE_ENTRANCE) continue;
					var maxHazardValue = this.getMaxHazardValue(levelVO, sectorVO, hazardType, sectorVO.zone);
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
			var getBlockerType = function (seed, sectorVO) {
				let stage = sectorVO.stage;
				let blockerTypes = stage == WorldConstants.CAMP_STAGE_LATE ? blockerTypesLate : blockerTypesEarly;
				if (sectorVO.hazards.radiation > 0) {
					if (blockerTypes.indexOf(MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE) >= 0 && WorldCreatorRandom.randomBool(seed, 0.8)) {
						return MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE;
					}
					blockerTypes = blockerTypes.filter(type => type != MovementConstants.BLOCKER_TYPE_WASTE_TOXIC);
				}
				if (sectorVO.hazards.poison > 0) {
					if (blockerTypes.indexOf(MovementConstants.BLOCKER_TYPE_WASTE_TOXIC) >= 0 && WorldCreatorRandom.randomBool(seed, 0.8)) {
						return MovementConstants.BLOCKER_TYPE_WASTE_TOXIC;
					}
					blockerTypes = blockerTypes.filter(type => type != MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE);
				}
				let typeix = blockerTypes.length > 1 ? WorldCreatorRandom.randomInt(seed, 0, blockerTypes.length) : 0;
				return blockerTypes[typeix];
			};
			
			var addBlocker = function (seed, sectorVO, neighbourVO, type, addDiagonals, allowedCriticalPaths) {
				neighbourVO = neighbourVO || WorldCreatorRandom.getRandomSectorNeighbour(seed, levelVO, sectorVO, true);
				var blockerType = type || getBlockerType(seed, sectorVO);
				var options = { addDiagonals: addDiagonals, allowedCriticalPaths: allowedCriticalPaths };
				var sectorcb = function (s) {
					
				};
				creator.addMovementBlocker(worldVO, levelVO, sectorVO, neighbourVO, blockerType, options, sectorcb);
			};

			var addBlockersBetween = function (seed, levelVO, pointA, pointB, type, maxPaths, allowedCriticalPaths) {
				var path;
				var index;
				for (let i = 0; i < maxPaths; i++) {
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
					for (let j = 0; j < (max-min); j++) {
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
				for (let i = 0; i < levelVO.passagePositions.length; i++) {
					for (let j = i + 1; j < levelVO.passagePositions.length; j++) {
						var rand = Math.round(2222 + seed + (i+21) * 41 + (j + 2) * 33);
						var type = l == 14 ? MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE : null;
						addBlockersBetween(rand, levelVO, levelVO.passagePositions[i], levelVO.passagePositions[j], type, numBetweenPassages, allowedCriticalPaths);
					}
				}
			}
			
			// campable levels: zone borders
			if (levelVO.isCampable) {
				var freq = 0.75;
				// - from ZONE_PASSAGE_TO_CAMP to other (to lead player towards camp)
				var allowedCriticalPaths = [ WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_2, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE ];
				var borderSectors1 = WorldCreatorHelper.getBorderSectorsForZone(levelVO, WorldConstants.ZONE_PASSAGE_TO_CAMP, true);
				for (let i = 0; i < borderSectors1.length; i++) {
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
				let i = WorldCreatorRandom.randomInt(rand, 0, localeSectors.length);
				var poiSector = localeSectors[i];
				var campPos = levelVO.campPosition;
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
				var options = { excludingFeature: "isCamp" };
				var sectors = WorldCreatorRandom.randomSectors(randomSeed, worldVO, levelVO, numRandom, numRandom + 1, options);
				for (let i = 0; i < sectors.length; i++) {
					var sector = sectors[i];
					var addDiagonals = (l + i + 9) % 3 !== 0;
					addBlocker(randomSeed - (i + 1) * 321, sector, null, null, addDiagonals);
				}
			}
		},
		
		generatePaths: function (seed, worldVO, levelVO) {
			let result = [];
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
					for (let j = 0; j < path.length; j++) {
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
			let l = levelVO.level;
			let nextLevel = WorldCreatorHelper.getLevelForOrdinal(seed, levelVO.levelOrdinal + 1);
			let nextLevelVO = worldVO.getLevel(nextLevel) || levelVO;
			let levelIndex = WorldCreatorHelper.getLevelIndexForCamp(seed, levelVO.campOrdinal, levelVO.level);
			let maxLevelIndex = WorldCreatorHelper.getMaxLevelIndexForCamp(seed, levelVO.campOrdinal, levelVO.level);
			
			let lateZones = [ WorldConstants.ZONE_POI_2, WorldConstants.ZONE_EXTRA_CAMPABLE ];
			let earlyZones = [ WorldConstants.ZONE_PASSAGE_TO_CAMP, WorldConstants.ZONE_PASSAGE_TO_PASSAGE, WorldConstants.ZONE_POI_1 ];
			let earlyZonesEntrance = [ WorldConstants.ZONE_ENTRANCE ];
			let earlyZonesOnCampableLevels = [ WorldConstants.ZONE_PASSAGE_TO_CAMP, WorldConstants.ZONE_POI_1 ];
			
			let getStashSectorScore = function (sectorVO, stashType) {
				let result = 0;
				let isEasyToFind = stashType == "guaranteed-early" || stashType == "guaranteed-campable-early";
				
				let distance = WorldCreatorHelper.getQuickMinDistanceToCamp(levelVO, sectorVO);
				let numNeighours = levelVO.getNeighbourCount(sectorVO.position.sectorX, sectorVO.position.sectorY);
				
				if (isEasyToFind) {
					result += MathUtils.clamp(distance / 5, 3, 0);
				} else {
					result += MathUtils.clamp(distance / 5, 0, 3);
					result += MathUtils.map(numNeighours, 1, 4, 3, 0);
				}
				
				if (sectorVO.isCamp) result -= 2;
				if (sectorVO.isPassageUp) result -= 1;
				if (sectorVO.isPassageDown) result -= 1;
				result -= sectorVO.stashes.length;
				result -= sectorVO.locales.length;
				
				result += Math.abs(sectorVO.position.sectorX) / 1000;
				result += Math.abs(sectorVO.position.sectorY) / 1000;
				
				return result;
			};

			let addStash = function (sectorVO, reason, stashType, numItems, itemID) {
				let stash = new StashVO(stashType, numItems, itemID);
				sectorVO.stashes.push(stash);
				// WorldCreatorLogger.i("add stash level " + l + " [" + reason + "]: " + itemID + " x" + numItems + " " + sectorVO.position + " " + sectorVO.zone);
			};
			
			let addStashes = function (sectorSeed, reason, stashType, itemIDs, numStashes, numItemsPerStash, excludedZones) {
				numStashes = WorldCreatorRandom.getRandomIntFromRange(sectorSeed / 2 + 222, numStashes);
				
				let options = { requireCentral: false, excludingFeature: "isCamp", excludedZones: excludedZones };
				let numCandidates = numStashes * 2;
				let stashSectorCandidates = WorldCreatorRandom.randomSectors(sectorSeed, worldVO, levelVO, numCandidates, numCandidates + 1, options);
				let num = Math.min(numStashes, stashSectorCandidates.length);
				
				stashSectorCandidates = stashSectorCandidates.sort((a, b) => getStashSectorScore(b, stashType) - getStashSectorScore(a, stashType));
				let stashSectors = stashSectorCandidates.slice(0, num);
				
				for (let i = 0; i < stashSectors.length; i++) {
					let stashSeed = sectorSeed * 2 + i * 3121;
					let item = WorldCreatorRandom.getRandomItemFromArray(stashSeed, itemIDs);
					let itemID = item.id ? item.id : item;
					let numItems = WorldCreatorRandom.getRandomIntFromRange(stashSeed, numItemsPerStash);
					addStash(stashSectors[i], reason, stashType, numItems, itemID);
				}
			};
			
			// stashes: early guaranteed items
			if (l == 13) {
				let campPosition = levelVO.campPosition;
				let campNeighbours = levelVO.getNeighbourList(campPosition.sectorX, campPosition.sectorY);
				let firstCacheSector = WorldCreatorRandom.getRandomItemFromArray(seed, campNeighbours);
				addStash(firstCacheSector, "first-cache", ItemConstants.STASH_TYPE_ITEM, 1, "cache_metal_1");
				addStashes(seed / 3 * 338 + l * 402, "guaranteed-early", ItemConstants.STASH_TYPE_ITEM, ["cache_metal_1"], 4, 1, lateZones);
				addStashes(seed * l * 8 / 3 + (l+100)*14 + 3333, "guaranteed-early", ItemConstants.STASH_TYPE_ITEM, [ "exploration_1" ], 1, 1, lateZones);
			}
			
			if (l == WorldConstants.LEVEL_NUMBER_STASH_ADVANCED_MAP) {
				addStashes(seed / 2 + 5312, "guaranteed-early", ItemConstants.STASH_TYPE_ITEM, [ "equipment_map_2" ], 1, 1, earlyZonesEntrance);
			}
			
			// stashes: every campable level guaranteed items
			if (levelVO.isCampable && l != 13) {
				var numCaches = levelVO.populationFactor >= 1 ? 3 : 5;
				addStashes(seed / 7 * 937 + l * 331, "guaranteed-campable-early", ItemConstants.STASH_TYPE_ITEM, ItemConstants.getAvailableMetalCaches(levelVO.campOrdinal), numCaches, 1, lateZones);
				addStashes(3000 + seed % 7 * 188 + (levelVO.level % 3) * 105 + Math.abs(levelVO.minX + 50) * 77, "guaranteed-campable", ItemConstants.STASH_TYPE_ITEM, [ "consumable_map_1", "consumable_map_2" ], [1, 3], 1, lateZones);
			}
			
			// stashes: every non-campable level guaranteed items
			if (!levelVO.isCampable) {
				addStashes(seed % 45 * (l + 11) * 9 + (l+100)*7 + 1111, "guaranteed-noncampable", ItemConstants.STASH_TYPE_ITEM, [ "stamina_potion_1"], 1, 1);
				addStashes(3000 + seed % 7 * 188 + (levelVO.level % 3) * 105 + Math.abs(levelVO.minX + 50) * 77, "guaranteed-noncampable", ItemConstants.STASH_TYPE_ITEM, [ "consumable_map_1", "consumable_map_2" ], 2, 1, lateZones);
			}
			
			// stashes: currency (uncampable levels and late zones)
			if (levelVO.campOrdinal > 2) {
				let minCurrencyStashes = levelVO.isCampable ? 0 : 1;
				let maxCurrencyStashes = levelVO.isCampable ? 1 : 3;
				let numCurrencyStashes = WorldCreatorRandom.randomInt(700 + seed % 7 * 1112 + (l+7) * 3412, minCurrencyStashes, maxCurrencyStashes + 1);
				if (numCurrencyStashes > 0) {
					let requiredEquipment = this.itemsHelper.getRequiredEquipment(levelVO.campOrdinal, WorldConstants.CAMP_STEP_END, levelVO.isHard);
					let itemValues = requiredEquipment.map(item => Math.round(TradeConstants.getItemValue(item, false, false))).sort();
					let minItemValue = Math.ceil(itemValues[0]);
					let maxItemValue = Math.ceil(itemValues[itemValues.length - 1] * 1.5);
					let excludedZones = levelVO.isCampable ? earlyZones : earlyZonesEntrance;
					addStashes(500 + seed / 5 + (l + 5) * 2541, "currency", ItemConstants.STASH_TYPE_SILVER, [""], numCurrencyStashes, [minItemValue, maxItemValue + 1], excludedZones);
				}
			}
			
			// stashes: non-craftable equipment
			// TODO don't do these per level but per equipment; place one instance of each non-craftable equipment somewhere
			if (levelIndex == 0) {
				var newEquipment = this.itemsHelper.getNewEquipment(levelVO.campOrdinal);
				for (let i = 0; i < newEquipment.length; i++) {
					if (!newEquipment[i].craftable && newEquipment[i].scavengeRarity <= ItemConstants.MAX_RANDOM_EQUIPMENT_STASH_RARITY) {
						addStashes(seed / 3 + (l+551)*8 + (i+103)*18, "non-craftable equipment", ItemConstants.STASH_TYPE_ITEM, [ newEquipment[i].id ], 1, 1, lateZones);
					}
				}
			}
			
			// stashes: consumables and other bonus rewards (uncampable levels and late zones)
			let bonusStashItems = this.getPossibleBonusStashItems(levelVO);
			var numItems = Math.min(levelVO.isCampable ? 1 : 3, bonusStashItems.length);
			addStashes(seed + (l + 151) * 115, "bonus", ItemConstants.STASH_TYPE_ITEM, bonusStashItems, numItems, 1, earlyZonesOnCampableLevels);
		},
		
		getPossibleBonusStashItems: function (levelVO) {
			let allItems = [
				"first_aid_kit_1",
				"first_aid_kit_2",
				"glowstick_1",
				"consumable_weapon_1",
				"consumable_weapon_bio",
				"consumable_weapon_mechanical",
				"consumable_graffiti_01",
				"flee_1",
				"cache_evidence_11",
				"cache_evidence_12",
				"cache_evidence_21",
				"cache_evidence_22",
				"cache_evidence_31",
				"cache_evidence_32",
				"cache_metal_1",
				"cache_metal_2",
				"cache_metal_3",
				"cache_metal_4",
			];
			var maxRarity = 9;
			return allItems.filter((itemID) => this.itemsHelper.isAvailable(ItemConstants.getItemConfigByID(itemID), levelVO.campOrdinal, WorldConstants.CAMP_STEP_END, true, true, maxRarity));
		},
		
		generateWorkshops: function (seed, worldVO, levelVO) {
			var campOrdinal = levelVO.campOrdinal;
			var l = levelVO.level;
			
			var workshopResource = this.getWorkshopResourceForLevel(seed, worldVO, levelVO);
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
					if (levelVO.campPosition) {
						var startPos = levelVO.campPosition;
						var maxLength = WorldCreatorConstants.getMaxPathLength(levelVO.campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1);
						pathConstraints.push(new PathConstraintVO(startPos, maxLength, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1));
					}
					var options = { excludingFeature: "isCamp", pathConstraints: pathConstraints, excludedZones: [ WorldConstants.ZONE_ENTRANCE, WorldConstants.ZONE_PASSAGE_TO_CAMP, WorldConstants.ZONE_EXTRA_CAMPABLE ] };
					workshopSectors = WorldCreatorRandom.randomSectors(seed * l * 2 / 7 * l, worldVO, levelVO, 1, 2, options);
					break;
			}
			
			// set sector flags and critical paths
			for (let i = 0; i < workshopSectors.length; i++) {
				WorldCreatorLogger.i("placed workshop " + workshopResource + " at " + workshopSectors[i].position);
				workshopSectors[i].hasWorkshop = true;
				workshopSectors[i].hasClearableWorkshop = workshopResource != "herbs";
				workshopSectors[i].hasBuildableWorkshop = workshopResource == "herbs";
				workshopSectors[i].workshopResource = resourceNames[workshopResource];
				for (let j = 0; j < pathConstraints.length; j++) {
					let criticalPathVO = new CriticalPathVO(WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1, workshopSectors[i].position, pathConstraints[j].startPosition);
					WorldCreatorHelper.addCriticalPath(worldVO, criticalPathVO);
				}
			}
		},
		
		generateBuildingProjectSpots: function (seed, worldVO, levelVO) {
			var campOrdinal = levelVO.campOrdinal;
			var l = levelVO.level;
			
			if (l == 14) {
				let excludedZones = [ WorldConstants.ZONE_PASSAGE_TO_CAMP, WorldConstants.ZONE_CAMP_TO_PASSAGE, WorldConstants.ZONE_EXTRA_CAMPABLE ];
				var options = { excludingFeature: "isCamp", excludedZones: excludedZones };
				let sectors = WorldCreatorRandom.randomSectors(seed / 2 + 1111, worldVO, levelVO, 3, 4, options);
				for (let i = 0; i < sectors.length; i++) {
					sectors[i].hasTradeConnectorSpot = true;
					WorldCreatorLogger.i("tradeConnectorSpot: " + sectors[i].position);
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
				let options = { requireCentral: false, excludingFeature: "isCamp", pathConstraints: pathConstraints, excludedZones: excludedZones };
				let safeSectors = WorldCreatorRandom.randomSectors(seed % 10000 + levelVO.level * 192 + i * 991, worldVO, levelVO, 1, 2, options);
				if (safeSectors.length == 1) {
					safeSectors[0].requiredResources.water = true;
					safeSectors[0].requiredResources.food = true;
				} else {
					WorldCreatorLogger.w("Couldn't find safe sector for passage on level " + levelVO.level);
				}
			}
			// near camps
			if (levelVO.campPosition) {
				let pathConstraintsCamp = [];
				pathConstraintsCamp.push(new PathConstraintVO(levelVO.campPosition, 3, null));
				let safeSectorsCampOptions = { pathConstraints: pathConstraintsCamp };
				let safeSectorsCamp = WorldCreatorRandom.randomSectors(1111 + levelVO.level * 881, worldVO, levelVO, 1, 3, safeSectorsCampOptions);
				if (safeSectorsCamp.length == 1) {
					WorldCreatorLogger.i("safe sector for camp on level " + levelVO.level + " at " + safeSectorsCamp[0].position);
					safeSectorsCamp[0].requiredResources.water = true;
					safeSectorsCamp[0].requiredResources.food = true;
				} else if (safeSectorsCamp.length == 2) {
					WorldCreatorLogger.i("safe sectors for camp on level " + levelVO.level + " at " + safeSectorsCamp[0].position + " and " + safeSectorsCamp[1].position);
					safeSectorsCamp[0].requiredResources.water = true;
					safeSectorsCamp[1].requiredResources.food = true;
				} else {
					WorldCreatorLogger.w("Couldn't find safe sector for camp on level " + levelVO.level);
				}
			}
			// based on paths
			var bagSize = ItemConstants.getBagBonus(levelVO.campOrdinal);
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
			for (let i = 0; i < path.length; i++) {
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
			for (let i = 0; i < features.length; i++) {
				damage = Math.max(damage, getFeatureDamage(features[i]));
			}
			for (let i = 0; i < surroundingFeatures.length; i++) {
				var d = surroundingFeatures[i].getDistanceTo(sectorVO.position);
				damage = Math.max(damage, getFeatureDamage(surroundingFeatures[i]) - d * 2);
			}
			if (sectorVO.isCamp) damage = Math.min(3, damage);
			if (sectorVO.hazards.debris > 0) damage = Math.max(3, damage);
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
		
		generateDifficulty: function (seed, worldVO, levelVO, sectorVO) {
			// scavenge difficulty: how much stuff there is (left), how good shape it's in (rot, pollution) and how easy it's to find get to (locked doors, general debris, easy to navigate storages)l
			let scavengeDifficultyScore = 0.5;
			
			// - most important factor: increase toward end-game
			scavengeDifficultyScore *= MathUtils.map(levelVO.campOrdinal, 1, 15, 0.25, 2);
			
			// - random factor: some sectors are just randomly very hard or very easy
			let randomSeed = WorldCreatorRandom.random(5000 + (sectorVO.position.sectorX % 3 * 3331) + (sectorVO.position.sectorY % 5) * 1113);
			if (randomSeed < 0.1) scavengeDifficultyScore *= 0.25;
			if (randomSeed > 0.9) scavengeDifficultyScore *= 4;
			
			// - variety from sector types
			switch (sectorVO.sectorType) {
				case SectorConstants.SECTOR_TYPE_RESIDENTIAL:
					scavengeDifficultyScore * 0.5;
					break;
				case SectorConstants.SECTOR_TYPE_INDUSTRIAL:
					scavengeDifficultyScore * 1.25;
					break;
				case SectorConstants.SECTOR_TYPE_MAINTENANCE:
					scavengeDifficultyScore * 1.5;
					break;
				case SectorConstants.SECTOR_TYPE_COMMERCIAL:
					scavengeDifficultyScore * 0.25;
					break;
				case SectorConstants.SECTOR_TYPE_PUBLIC:
					scavengeDifficultyScore * 1;
					break;
				case SectorConstants.SECTOR_TYPE_SLUM:
					scavengeDifficultyScore * 0.75;
					break;
			}
			
			// - population factor (easier scavenging around outposts)
			scavengeDifficultyScore *= MathUtils.map(levelVO.populationFactor, 0, 1, 0.75, 1.25);
			
			// - hazards
			if (sectorVO.hazards.poison > 0) scavengeDifficultyScore *= 1.5;
			if (sectorVO.hazards.radiation > 0)  scavengeDifficultyScore *= 2;
			
			// - special levels
			if (levelVO.level == worldVO.bottomLevel) scavengeDifficultyScore *= 1.25;
			if (levelVO.level == 14) scavengeDifficultyScore *= 1.25;
			if (levelVO.level == worldVO.topLevel) scavengeDifficultyScore *= 1.25;
			
			// - small adjustments from sector texture
			if (sectorVO.wear >= 8) scavengeDifficultyScore *= 1.1;
			if (sectorVO.damage >= 5) scavengeDifficultyScore *= 1.1;
			if (sectorVO.damage >= 8) scavengeDifficultyScore *= 1.1;
			if (sectorVO.buildingDensity <= 2) scavengeDifficultyScore *= 1.5;
			if (sectorVO.sunlit) scavengeDifficultyScore *= 0.85;
			
			// - adjustments for required resources
			if (sectorVO.requiredResources && sectorVO.requiredResources.getTotal() > 0) {
				scavengeDifficultyScore *= 0.25;
			}
			
			sectorVO.scavengeDifficulty = Math.round(MathUtils.map(scavengeDifficultyScore, 0, 1, 0, 10));
			
			var isStartPosition = levelVO.level == 13 && sectorVO.isCamp;
			if (isStartPosition) {
				sectorVO.scavengeDifficulty = 0;
			}
		},
		
		generateResources: function (seed, worldVO, levelVO, sectorVO) {
			var l = sectorVO.position.level;
			var x = sectorVO.position.sectorX;
			var y = sectorVO.position.sectorY;
			var ll = levelVO.level === 0 ? levelVO.level : 50;
			var sectorType = sectorVO.sectorType;
			var campOrdinal = levelVO.campOrdinal;
			var isStartPosition = l == 13 && sectorVO.isCamp;
			var scavengeDifficulty = sectorVO.scavengeDifficulty;
			
			// scavengeable resources
			var r1 = WorldCreatorRandom.random(5000 + seed / (l+10) + x + x * y * 63 + sectorVO.buildingDensity * 3 + x % 3 * 123 + y % 4 * 81);
			var r2 = WorldCreatorRandom.random(seed + l * x / y * 44 + 6);
			var r3 = WorldCreatorRandom.random(seed / (l + 5) + x * x * y + 66);
			var r4 = WorldCreatorRandom.random(seed / x * ll + x * y * 16);
			var sca = new ResourcesVO();
			var metalThresholds = { "ABUNDANT": 0.95, "COMMON": 0.8, "DEFAULT": 0.03 };
			var foodThresholds = { "ABUNDANT": 0.98, "COMMON": 0.95, "DEFAULT": 0.75 };
			var waterThresholds = { "ABUNDANT": 1, "COMMON": 0.95, "DEFAULT": 0.85 };
			switch (sectorType) {
				case SectorConstants.SECTOR_TYPE_RESIDENTIAL:
					metalThresholds.ABUNDANT = 1;
					foodThresholds.DEFAULT = 0.65;
					sca.rope = r1 > 0.98 ? WorldConstants.resourcePrevalence.DEFAULT : r1 > 0.94 ? WorldConstants.resourcePrevalence.RARE : 0;
					sca.medicine = campOrdinal > 3 && r2 > 0.99 ? WorldConstants.resourcePrevalence.RARE : 0;
					break;
				case SectorConstants.SECTOR_TYPE_INDUSTRIAL:
					metalThresholds.COMMON = 0.75;
					foodThresholds.DEFAULT = 0.85;
					sca.rope = r1 > 0.98 ? WorldConstants.resourcePrevalence.DEFAULT : r1 > 0.90 ? WorldConstants.resourcePrevalence.RARE : 0;
					sca.tools = (l > 13) ? r2 > 0.95 ? WorldConstants.resourcePrevalence.RARE : 0 : 0;
					sca.fuel = r3 > 0.90 ? WorldConstants.resourcePrevalence.RARE : 0;
					break;
				case SectorConstants.SECTOR_TYPE_MAINTENANCE:
					metalThresholds.COMMON = 0.75;
					foodThresholds.DEFAULT = 0.85;
					sca.rope = r1 > 0.98 ? WorldConstants.resourcePrevalence.DEFAULT : r1 > 0.90 ? WorldConstants.resourcePrevalence.RARE : 0;
					sca.fuel = r3 > 0.98 ? WorldConstants.resourcePrevalence.DEFAULT : r1 > 0.90 ? WorldConstants.resourcePrevalence.RARE : 0;
					sca.tools = (l > 13) ? r2 > 0.90 ? WorldConstants.resourcePrevalence.RARE : 0 : 0;
					break;
				case SectorConstants.SECTOR_TYPE_COMMERCIAL:
					foodThresholds.DEFAULT = 0.65;
					waterThresholds.DEFAULT = 0.8;
					sca.medicine = campOrdinal > 2 && r3 > 0.99 ? WorldConstants.resourcePrevalence.RARE : 0;
					break;
				case SectorConstants.SECTOR_TYPE_PUBLIC:
					break;
				case SectorConstants.SECTOR_TYPE_SLUM:
					metalThresholds.ABUNDANT = 0.9;
					metalThresholds.COMMON = 0.7;
					foodThresholds.DEFAULT = 0.65;
					waterThresholds.DEFAULT = 0.8;
					sca.rope = r1 > 0.97 ? WorldConstants.resourcePrevalence.DEFAULT : r1 > 0.96 ? WorldConstants.resourcePrevalence.RARE : 0;
					sca.fuel = r3 > 0.95 ? WorldConstants.resourcePrevalence.RARE : 0;
					break;
			}
			var rm = WorldCreatorRandom.random(seed * (x * 22 + y * 3000) + (x + 99) * 7 * (y - 888));
			var rf = WorldCreatorRandom.random(seed / (l + 5) * 99 + x * x * y + 66);
			let rw = WorldCreatorRandom.random(seed * (l + 1000) * (x * 1.5 + y + 900) + 10134) * Math.abs(5 - sectorVO.wear) / 5;
			sca.metal =
					rm > metalThresholds.ABUNDANT ? WorldConstants.resourcePrevalence.ABUNDANT :
					rm > metalThresholds.COMMON ? WorldConstants.resourcePrevalence.COMMON :
					rm > metalThresholds.DEFAULT ? WorldConstants.resourcePrevalence.DEFAULT : 0;
			sca.food =
					rf > foodThresholds.ABUNDANT ? WorldConstants.resourcePrevalence.ABUNDANT :
					rf > foodThresholds.COMMON ? WorldConstants.resourcePrevalence.COMMON :
					rf > foodThresholds.DEFAULT ? WorldConstants.resourcePrevalence.DEFAULT : 0;
			sca.water =
					rw > waterThresholds.ABUNDANT ? WorldConstants.resourcePrevalence.ABUNDANT :
					rw > waterThresholds.COMMON ? WorldConstants.resourcePrevalence.COMMON :
					rw > waterThresholds.DEFAULT ? WorldConstants.resourcePrevalence.DEFAULT : 0;
			
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
					col.food = sectorNatureFactor > 0.55 || r12 > 0.7 ? WorldConstants.resourcePrevalence.DEFAULT : 0;
					col.water = sectorWaterFactor > 0.75 ? WorldConstants.resourcePrevalence.DEFAULT : 0;
					break;
				case SectorConstants.SECTOR_TYPE_COMMERCIAL:
				case SectorConstants.SECTOR_TYPE_PUBLIC:
					col.food = sectorNatureFactor > 0.75 || r12 > 0.8 ? WorldConstants.resourcePrevalence.DEFAULT : 0;
					col.water = sectorWaterFactor > 0.7 ? WorldConstants.resourcePrevalence.DEFAULT : 0;
					break;
				case SectorConstants.SECTOR_TYPE_INDUSTRIAL:
				case SectorConstants.SECTOR_TYPE_MAINTENANCE:
					col.food = sectorNatureFactor > 0.85 || r12 > 0.9 ? WorldConstants.resourcePrevalence.DEFAULT : 0;
					col.water = sectorWaterFactor > 0.95 ? WorldConstants.resourcePrevalence.DEFAULT : 0;
					break;
				case SectorConstants.SECTOR_TYPE_SLUM:
					col.food = sectorNatureFactor > 0.5 || r12 > 0.6 ? WorldConstants.resourcePrevalence.DEFAULT : 0;
					col.water = sectorWaterFactor > 0.9 ? WorldConstants.resourcePrevalence.DEFAULT : 0;
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
				sca.herbs = WorldCreatorRandom.random(seed * l / x + y * 423) * sectorVO.wear > 6 ? WorldConstants.resourcePrevalence.RARE : 0;
			}
			
			// adjustments for sector features
			if (sectorVO.sunlit) {
				sca.herbs = WorldCreatorRandom.random(seed * l / x + y * 423) > 0.8 ? WorldConstants.resourcePrevalence.RARE : 0;
			}
			if (sectorVO.workshopResource == "herbs") {
				col.water = Math.max(col.water, WorldConstants.resourcePrevalence.RARE);
			}

			if (sectorVO.hazards.poison > 0 || sectorVO.hazards.radiation > 0) {
				col.water = 0;
				col.food = 0;
			}
			
			if (sectorVO.hazards.hasHazards()) {
				sca.water = 0;
			}
			
			// adjustments for camp positions
			if (sectorVO.isCamp) {
				let isMainCamp = sectorVO.position.equals(levelVO.campPosition);
				let isOutpost = levelVO.populationFactor < 1;
				
				if (isStartPosition) {
					sca.metal = WorldConstants.resourcePrevalence.ABUNDANT;
					sca.food = WorldConstants.resourcePrevalence.COMMON;
					col.water = WorldConstants.resourcePrevalence.RARE;
				} else {
					if (isOutpost) {
						sca.metal = MathUtils.clamp(sca.metal, WorldConstants.resourcePrevalence.COMMON, WorldConstants.resourcePrevalence.ABUNDANT);
					} else {
						sca.metal = MathUtils.clamp(sca.metal, WorldConstants.resourcePrevalence.DEFAULT, WorldConstants.resourcePrevalence.COMMON);
					}
					
					if (isMainCamp || WorldCreatorRandom.randomBool(l * 100 + x * 377 + y * 598, 0.45)) {
						col.water = Math.max(col.water, 3);
					} else if (WorldCreatorRandom.randomBool(1521 + x * 871 + y * 351, 0.35)) {
						sca.water = WorldConstants.resourcePrevalence.RARE;
					}
					
					if (WorldCreatorRandom.randomBool(seed / 4 * 100 + l * 1111 + x * 99 + y * 5)) {
						col.food =  Math.max(col.food, 3);
					} else {
						sca.food = Math.max(sca.food, WorldConstants.resourcePrevalence.COMMON);
					}
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
						sca.food = Math.max(sca.food, WorldConstants.resourcePrevalence.COMMON);
					}
				}
			}
			
			sectorVO.resourcesScavengable = sca;
			sectorVO.resourcesCollectable = col;
			sectorVO.resourcesAll = sca.clone();
			sectorVO.resourcesAll.addAll(col);
		},
		
		generateItems: function (seed, worldVO, levelVO) {
			var stages = worldVO.getStages(levelVO.level);
			
			// TODO create a correlation between items appearing and sector type / texture
			
			let i = 0;
			let excludedZones = {};
			excludedZones[WorldConstants.CAMP_STAGE_EARLY] = [ WorldConstants.ZONE_POI_2, WorldConstants.ZONE_CAMP_TO_PASSAGE, WorldConstants.ZONE_EXTRA_CAMPABLE, WorldConstants.ZONE_EXTRA_UNCAMPABLE ];
			excludedZones[WorldConstants.CAMP_STAGE_LATE] = [ WorldConstants.ZONE_ENTRANCE, WorldConstants.ZONE_PASSAGE_TO_CAMP, WorldConstants.ZONE_POI_1 ];
			
			var addItemLocation = function (itemID, stage, reason) {
				let s = 3223 + (itemID.length + 3) * 88 + levelVO.level * 208 + (i + 24) * 619;
				let r = WorldCreatorRandom.random(s);
				let options = { requireCentral: false, excludingFeature: [ "isCamp", "workshopResource" ], excludedZones: excludedZones[stage], filter: sectorVO => sectorVO.itemsScavengeable.length == 0 };
				let sector = WorldCreatorRandom.randomSectors(s, worldVO, levelVO, 1, 2, options)[0];
				sector.itemsScavengeable.push(itemID);
				// WorldCreatorLogger.i("addItemLocation level " + levelVO.level + " " + stage + " " + itemID + " " + reason + " | " + sector.position);
				i++;
			};
			
			for (let i = 0; i < stages.length; i++) {
				var stageVO = stages[i];
				let step = WorldConstants.getStepForStage(stageVO.stage);
				let maxPerType = levelVO.levelOrdinal > 10 ? 1 : levelVO.levelOrdinal > 3 ? 3 : 10;
				
				// ingredients for required equipment
				let requiredEquipment = [];
				if (stageVO.stage == WorldConstants.CAMP_STAGE_EARLY) {
					requiredEquipment = this.itemsHelper.getRequiredEquipment(levelVO.campOrdinal, WorldConstants.CAMP_STEP_END, levelVO.isHard);
				} else {
					let nextLevel = WorldCreatorHelper.getLevelForOrdinal(seed, levelVO.levelOrdinal + 1);
					let nextLevelVO = worldVO.getLevel(nextLevel) || levelVO;
					requiredEquipment = this.itemsHelper.getRequiredEquipment(nextLevelVO.campOrdinal, WorldConstants.CAMP_STEP_START, nextLevelVO.isHard);
				}
				let requiredEquipmentIngredients = ItemConstants.getIngredientsToCraftMany(requiredEquipment);
				let requiredEquipmentIngredientsMax = Math.min(maxPerType, requiredEquipmentIngredients.length);
				for (let i = 0; i < requiredEquipmentIngredientsMax; i++) {
					let def = requiredEquipmentIngredients[i];
					addItemLocation(def.id, stageVO.stage, "required-equipment");
				}
				
				// ingredients for crafting other important items
				if (stageVO.stage == WorldConstants.CAMP_STAGE_EARLY) {
					let requiredItems = [ "exploration_1" ].map(itemID => ItemConstants.getItemConfigByID(itemID));
					let requiredItemIngredients = ItemConstants.getIngredientsToCraftMany(requiredItems);
					let requiredItemIngredientsMax = Math.min(maxPerType, requiredItemIngredients.length);
					for (let i = 0; i < requiredItemIngredientsMax; i++) {
						let def = requiredItemIngredients[i];
						addItemLocation(def.id, stageVO.stage, "required-items");
					}
				}
				
				// a couple of random ingredients
				let numRandomIngredients = 2;
				for (let i = 0; i < numRandomIngredients; i++) {
					var s1 = 4200 + seed % 3000 + (levelVO.level + 5) * 217 + i * 991;
					var r1 = WorldCreatorRandom.random(s1);
					var ingredient = GameGlobals.itemsHelper.getUsableIngredient(null, r1);
					addItemLocation(ingredient.id, stageVO.stage, "random");
				}
			}
		},
		
		generateEnemies: function (seed, worldVO, levelVO, enemyCreator) {
			var l = levelVO.level;
			var creator = this;
			var randomGangFreq = 45;
				
			var blockerType = MovementConstants.BLOCKER_TYPE_GANG;
			
			var selectEnemyIDsForGang = function (s1, s2) {
				let possibleEnemies = s1.possibleEnemies.concat(s2.possibleEnemies);
				possibleEnemies.sort(function (a, b) {
					var diff1 = EnemyConstants.enemyDifficulties[a.id];
					var diff2 = EnemyConstants.enemyDifficulties[b.id];
					return diff2 - diff1;
				});
				let hardestEnemy = possibleEnemies[0];
				let result = [ hardestEnemy.id ];
				if (possibleEnemies.length > 1) {
					let secondEnemyCandidates = possibleEnemies.slice(1);
					secondEnemyCandidates.sort(function (a, b) {
						var score1 = a.nouns.filter(v => hardestEnemy.nouns.indexOf(v) >= 0).length;
						var score2 = b.nouns.filter(v => hardestEnemy.nouns.indexOf(v) >= 0).length;
						return score2 - score1;
					});
					result.push(secondEnemyCandidates[0].id);
				}
				return result;
			};
			
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
						let enemyIDs = selectEnemyIDsForGang(sectorVO, neighbourVO);
						var pos1 = sectorVO.position;
						var pos2 = neighbourVO.position;
						var gang = new GangVO(pos1, pos2, enemyIDs);
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
				for (let i = 0; i < maxPaths; i++) {
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
			for (let i = 0; i < levelVO.sectors.length; i++) {
				var sectorVO = levelVO.sectors[i];
				let dist = PositionConstants.getDistanceTo(center, sectorVO.position);
				var distanceToCamp = WorldCreatorHelper.getQuickMinDistanceToCamp(levelVO, sectorVO);
				sectorVO.possibleEnemies = [];
				sectorVO.hasRegularEnemies = 0;

				// possible enemy definitions
				sectorVO.possibleEnemies = this.getPossibleEnemies(seed, worldVO, levelVO, sectorVO, enemyCreator);

				// regular enemies (random encounters not tied to locales / gangs)
				if (distanceToCamp < 3) {
					sectorVO.hasRegularEnemies = false;
				} else {
					let r = WorldCreatorRandom.random(l * sectorVO.position.sectorX * seed + sectorVO.position.sectorY * seed + 4848);
					let probability = WorldCreatorRandom.getProbabilityFromFactors([
						{ name: "uncampable", value: !levelVO.isCampable },
						{ name: "distance", value: dist, min: 0, max: 25 },
						{ name: "hazards", value: sectorVO.hazards.hasHazards() },
					]);
					sectorVO.hasRegularEnemies = r < probability;
				}

				// workshop and locale enemies (counts)
				if (sectorVO.hasClearableWorkshop) {
					sectorVO.numLocaleEnemies[LocaleConstants.LOCALE_ID_WORKSHOP] = 3;
				}
			}
				
			// gangs: on zone borders
			// - ZONE_PASSAGE_TO_CAMP: all except too close to camp
			var borderSectors = WorldCreatorHelper.getBorderSectorsForZone(levelVO, WorldConstants.ZONE_PASSAGE_TO_CAMP, true);
			for (let i = 0; i < borderSectors.length; i++) {
				var pair = borderSectors[i];
				if (pair.sector.zone == WorldConstants.ZONE_ENTRANCE || pair.neighbour.zone == WorldConstants.ZONE_ENTRANCE) continue;
				var direction = PositionConstants.getDirectionFrom(pair.sector.position, pair.neighbour.position);
				if (pair.sector.movementBlockers[direction]) continue;
				var distanceToCamp = Math.min(
					WorldCreatorHelper.getQuickMinDistanceToCamp(levelVO, pair.sector),
					WorldCreatorHelper.getQuickMinDistanceToCamp(levelVO, pair.neighbour)
				);
				var distanceToCampThreshold = l == 13 ? 5 : 2;
				if (distanceToCamp >= distanceToCampThreshold) {
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
				for (let i = 0; i < borderSectors.length; i++) {
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
			var campPos = levelVO.campPosition;
			if (campPos) {
				for (let i = 0; i < levelVO.sectors.length; i++) {
					var sectorVO = levelVO.sectors[i];
					if (sectorVO.hasClearableWorkshop) {
						// camps to workshops (all paths)
						var rand = Math.round(1000 + seed + (l+21) * 11 + (i + 1) * 51);
						addGangs(rand, "workshop", levelVO, campPos, sectorVO.position, 100);
					} else if (sectorVO.locales.length > 0) {
						// camps to locales (some paths)
						var rand = Math.round(50 + seed + (l+11) * 11 + (i + 1) * 42);
						if (numLocales % 2 === 0) {
							addGangs(rand, "locale", levelVO, campPos, sectorVO.position, 1);
						}
						numLocales++;
					}
				}
			}

			// gangs: some random gangs regardless of camps
			var randomGangIndex = 0;
			for (let i = 0; i < levelVO.sectors.length; i++) {
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
			
			let excludedFeatures = [ "isCamp", "isPassageUp", "isPassageDown", "workshopResource" ];
			let lateZones = [ WorldConstants.ZONE_POI_2, WorldConstants.ZONE_EXTRA_CAMPABLE ];
			
			// 1) spawn trading partners
			for (let i = 0; i < TradeConstants.TRADING_PARTNERS.length; i++) {
				var partner = TradeConstants.TRADING_PARTNERS[i];
				var levelOrdinal = WorldCreatorHelper.getLevelOrdinalForCampOrdinal(seed, partner.campOrdinal);
				var level = WorldCreatorHelper.getLevelForOrdinal(seed, levelOrdinal);
				if (level == levelVO.level) {
					var options = { excludingFeature: excludedFeatures };
					var sectorVO = WorldCreatorRandom.randomSectors(seed - 9393 + i * i, worldVO, levelVO, 1, 2, options)[0];
					var locale = new LocaleVO(localeTypes.tradingpartner, true, false);
					// WorldCreatorLogger.i("trade partner at " + sectorVO.position)
					addLocale(sectorVO, locale);
					sectorVO.scavengeDifficulty = 10;
				}
			}
			
			// 2) spanw grove
			if (levelVO.level == worldVO.bottomLevel) {
				var options = { excludingFeature: excludedFeatures };
				var groveSector = WorldCreatorRandom.randomSectors(seed, worldVO, levelVO, 1, 2, options)[0];
				var groveLocale = new LocaleVO(localeTypes.grove, true, false);
				groveSector.sunlit = 1;
				groveSector.hazards.radiation = 0;
				groveSector.hazards.pollution = 0;
				addLocale(groveSector, groveLocale);
				WorldCreatorLogger.i("add grove at: " + groveSector);
			}
			
			// 3) spawn locales with hard-coded followers
			for (let i = 0; i < levelVO.predefinedFollowers.length; i++) {
				let follower = levelVO.predefinedFollowers[i];
				let options = { excludingFeature: excludedFeatures, excludedZones: lateZones };
				let sector = WorldCreatorRandom.randomSectors(1000 + seed * 2, worldVO, levelVO, 1, 2, options)[0];
				let locale = new LocaleVO(follower.localeType, true, true);
				locale.followerID = follower.id;
				addLocale(sector, locale);
				// WorldCreatorLogger.i("add follower locale at " + sector)
			}
			
			// 4) spawn locales for luxury resources
			for (let i = 0; i < levelVO.luxuryResources.length; i++) {
				let resource = levelVO.luxuryResources[i];
				let locationType = this.getLuxuryResourceLocationType(resource);
				let filter = sectorVO => this.filterSectorForLuxuryLocationType(sectorVO, locationType);
				let options = { excludingFeature: excludedFeatures, excludedZones: lateZones, excludedZones: [ WorldConstants.ZONE_PASSAGE_TO_CAMP ], filter: filter };
				let sector = WorldCreatorRandom.randomSectors(seed  + 773 + levelVO.level * 24 + i * 992, worldVO, levelVO, 1, 2, options)[0];
				let localeType = this.getLocaleTypeForLuxuryResourceOnSector(seed, locationType, sector);
				let locale = new LocaleVO(localeType, false, false);
				locale.luxuryResource = resource;
				addLocale(sector, locale);
				WorldCreatorLogger.i("add luxury resource locale at " + sector);
			}

			// 5) spawn other types (for blueprints)
			var createLocales = function (worldVO, levelVO, campOrdinal, isEarly, count, countEasy) {
				var pathConstraints = [];
				if (levelVO.campPosition) {
					var pos = levelVO.campPosition;
					var pathType = isEarly ? WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1 : WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_2;
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
				var options = { requireCentral: false, excludingFeature: excludedFeatures, pathConstraints: pathConstraints, excludedZones: excludedZones, numDuplicates: 2 };
				var l = levelVO.level;
				var sseed = Math.abs(seed - (isEarly ? 5555 : 0) + (l + 50) * 2);
				for (let i = 0; i < count; i++) {
					var localePos = WorldCreatorRandom.randomSectors(sseed + i + i * 72 * sseed + i * l + i, worldVO, levelVO, 1, 2, options);
					var sectorVO = localePos[0];
					var s1 = sseed + sectorVO.position.sectorX * 871 + sectorVO.position.sectorY * 659;
					var r1 = WorldCreatorRandom.random(s1);
					var localeType = generator.getLocaleType(worldVO, levelVO, sectorVO, s1, isEarly);
					var isEasy = i <= countEasy;
					var locale = new LocaleVO(localeType, isEasy, isEarly);
					locale.hasBlueprints = true;
					addLocale(sectorVO, locale);
					// WorldCreatorLogger.i(sectorVO.position + " added locale: isEarly:" + isEarly + ", distance to camp: " + WorldCreatorHelper.getDistanceToCamp(worldVO, levelVO, sectorVO) + ", zone: " + sectorVO.zone);
					for (let j = 0; j < pathConstraints.length; j++) {
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
		
		generateWaymarks: function (seed, worldVO, levelVO) {
			// conditions (some levels don't have any waymarks)
			if (levelVO.level == worldVO.bottomLevel) return;
			if (levelVO.notCampableReason === LevelConstants.UNCAMPABLE_LEVEL_TYPE_POLLUTION) return;
			if (levelVO.notCampableReason === LevelConstants.UNCAMPABLE_LEVEL_TYPE_RADIATION) return;
			
			// find waymarkSectors (possible sectors where waymarks are found)
			let waymarkSectors = [];
			for (var s = 0; s < levelVO.sectors.length; s++) {
				var sectorVO = levelVO.sectors[s];
				if (sectorVO.isCamp) continue;
				if (sectorVO.isPassageUp) continue;
				if (sectorVO.isPassageDown) continue;
				if (sectorVO.zone == WorldConstants.ZONE_ENTRANCE) continue;
				if (sectorVO.hazards.radiation > 0) continue;
				if (sectorVO.hazards.poison > 0) continue;
				var distanceToCamp = WorldCreatorHelper.getQuickMinDistanceToCamp(levelVO, sectorVO);
				if (distanceToCamp < 2) continue;
				var neighbours = levelVO.getNeighbourList(sectorVO.position.sectorX, sectorVO.position.sectorY);
				if (neighbours.length < 2) continue;
				waymarkSectors.push(sectorVO);
			}
			
			let maxWaymarksPerSector = 2;
			let maxTotalWaymarks = 10;
			let selectedWaymarks = [];
			
			let isValidCandidate = function (candidate) {
				if (selectedWaymarks.length > maxTotalWaymarks) return false;
				
				// not too close to other waymarks / pois
				let numSameWaymark = 0;
				let numSamePoi = 0;
				for (let j = 0; j < selectedWaymarks.length; j++) {
					let distanceWaymarks = PositionConstants.getDistanceTo(candidate.waymark.position, selectedWaymarks[j].waymark.position);
					if (distanceWaymarks == 0) numSameWaymark++;
					if (distanceWaymarks < 2) return false;
					let distancePois = PositionConstants.getDistanceTo(candidate.poi.position, selectedWaymarks[j].poi.position);
					if (distancePois == 0) numSamePoi++;
				}
				
				// not too many waymarks / pois on the same sector
				if (numSameWaymark >= maxWaymarksPerSector || numSamePoi >= maxWaymarksPerSector) return false;
				
				// waymark should be closer to where the player is likely coming from that poi
				let entrancePassagePosition = levelVO.getEntrancePassagePosition();
				let playerStartPosition = levelVO.campPosition;
				if (entrancePassagePosition) {
					if (!playerStartPosition) playerStartPosition = entrancePassagePosition;
					if (candidate.poi.zone == WorldConstants.ZONE_ENTRANCE || candidate.poi.zone == WorldConstants.ZONE_PASSAGE_TO_CAMP) playerStartPosition = entrancePassagePosition;
				}
					
				let poiDistanceToStart = WorldCreatorRandom.findPath(worldVO, candidate.poi.position, playerStartPosition, false, true, null, false).length;//PositionConstants.getDistanceTo(candidate.poi.position, playerStartPosition);
				let waymarkDistanceToStart = WorldCreatorRandom.findPath(worldVO, candidate.waymark.position, playerStartPosition, false, true, null, false).length;
				if (waymarkDistanceToStart > poiDistanceToStart) return false;
				
				return true;
			};
			
			let selectWaymarks = function (type, isNegative, maxNum, maxDistance, idealDistance, filterPOI, filterCandidate) {
				if (selectedWaymarks.length > maxTotalWaymarks) return;
				
				// find pois (possible sectors where waymarks point to)
				let pois = [];
				for (var s = 0; s < levelVO.sectors.length; s++) {
					var sectorVO = levelVO.sectors[s];
					if (type != SectorConstants.WAYMARK_TYPE_CAMP) {
						var distanceToCamp = WorldCreatorHelper.getQuickMinDistanceToCamp(levelVO, sectorVO);
						if (distanceToCamp < 2) continue;
					}
					if (filterPOI(sectorVO)) {
						let poi = { sector: sectorVO, type: type, isNegative: isNegative };
						pois.push(poi);
					}
				}
				
				// list valid pairs
				let minDistance = 1;
				let waymarkCandidates = [];
				for (let i = 0; i < pois.length; i++) {
					let poi = pois[i];
					let poiSector = pois[i].sector;
					for (let j = 0; j < waymarkSectors.length; j++) {
						let waymarkSector = waymarkSectors[j];
						if (WorldCreatorConstants.getZoneOrdinal(poiSector.zone) > WorldCreatorConstants.getZoneOrdinal(waymarkSector.zone)) continue;
						let distance = PositionConstants.getDistanceTo(poiSector.position, waymarkSector.position);
						if (distance <= 0) continue;
						if (distance > maxDistance) continue;
						let path = WorldCreatorRandom.findPath(worldVO, waymarkSector.position, poiSector.position, true, true, null, false, maxDistance);
						if (!path || path.length > maxDistance) continue;
						
						var poiSectorNeighbours = levelVO.getNeighbourCount(poiSector.position.sectorX, poiSector.position.sectorY);
						var waymarkNeighboursWeighted = levelVO.getNeighbourCountWeighted(sectorVO.position.sectorX, sectorVO.position.sectorY);
	
						let score = waymarkNeighboursWeighted;
						score -= Math.abs(path.length - idealDistance);
						if (poiSector.locales.length > 0) score++;
						if (poiSectorNeighbours > 1) score++;
						if (poiSectorNeighbours > 2) score++;
						if (!poi.isNegative && waymarkSector.zone != poiSector.zone) score--;
						if (!poi.isNegative && poiSector.hazards.hasHazards()) score--;
	
						let candidate = { poi: poiSector, waymark: waymarkSector, score: score, type: poi.type };
						waymarkCandidates.push(candidate);
					}
				}
				
				// sort pairs
				let getFallbackOrderNumber = function (candidate) {
					return Math.abs(candidate.poi.position.sectorX) + Math.abs(candidate.waymark.position.sectorX) + Math.abs(candidate.poi.position.sectorY) + Math.abs(candidate.waymark.position.sectorY);
				};
				waymarkCandidates = waymarkCandidates.sort(function (a,b) {
					if (a.score != b.score)
						return b.score - a.score;
					else
						return getFallbackOrderNumber(a) - getFallbackOrderNumber(b);
				});
				
				// select pairs (avoid too many involveing the same /neighbouring sectors)
				let numWaymarks = Math.min(waymarkCandidates.length, maxNum);
				let numSelected = 0;
				for (let i = 0; i < waymarkCandidates.length; i++) {
					let candidate = waymarkCandidates[i];
					if (!isValidCandidate(candidate)) continue;
					if (filterCandidate && !filterCandidate(candidate)) continue;
					selectedWaymarks.push(candidate);
					numSelected++;
					if (numSelected >= numWaymarks) break;
				}
			};
			
			let isValidHazardPOI = function (sectorVO, hazard) {
				if (!sectorVO.hazards[hazard]) return false;
				let numNeighboursWithHazard = 0;
				let numNeighboursWithoutHazard = 0;
				let neighbours = levelVO.getNeighbourList(sectorVO.position.sectorX, sectorVO.position.sectorY);
				for (let i = 0; i < neighbours.length; i++) {
					let neighbourHazard = neighbours[i].hazards[hazard];
					if (neighbourHazard > 0) numNeighboursWithHazard++;
					if (!neighbourHazard) numNeighboursWithoutHazard++;
				}
				return numNeighboursWithHazard > 0 && numNeighboursWithoutHazard > 0;
			};
			let isValidHazardCandidate = function (candidate, hazard) {
				if (candidate.waymark.hazards[hazard]) return false;
				let neighbours = levelVO.getNeighbourList(candidate.waymark.position.sectorX, candidate.waymark.position.sectorY);
				for (let i = 0; i < neighbours.length; i++) {
					if (neighbours[i].position.equals(candidate.poi.position)) continue;
					if (neighbours[i].hazards[hazard]) return false;
				}
				return true;
			};
			
			// select waymarks by type
			let maxNumWaymarksCommon = levelVO.populationFactor >= 1 ? 3 : 2;
			
			if (levelVO.isCampable && levelVO.campOrdinal > 1) {
				selectWaymarks(SectorConstants.WAYMARK_TYPE_CAMP, false, 1, 5, 3, sectorVO => sectorVO.isCamp);
			}
			selectWaymarks(SectorConstants.WAYMARK_TYPE_SPRING, false, maxNumWaymarksCommon, 5, 3, sectorVO => sectorVO.hasSpring, candidate => !candidate.waymark.hasWater());
			selectWaymarks(SectorConstants.WAYMARK_TYPE_RADIATION, false, 1, 3, 2, sectorVO => isValidHazardPOI(sectorVO, "radiation"), candidate => isValidHazardCandidate(candidate, "radiation"));
			selectWaymarks(SectorConstants.WAYMARK_TYPE_POLLUTION, false, 1, 3, 2, sectorVO => isValidHazardPOI(sectorVO, "poison"), candidate => isValidHazardCandidate(candidate, "poison"));
			selectWaymarks(SectorConstants.WAYMARK_TYPE_SETTLEMENT, false, 1, 5, 3, sectorVO => sectorVO.locales.filter(localeVO => localeVO.type == localeTypes.tradingpartner).length > 0);
			
			// mark selected
			for (let i = 0; i < selectedWaymarks.length; i++) {
				let waymark = selectedWaymarks[i];
				//WorldCreatorLogger.i("selected waymark: " + waymark.type + " " + waymark.waymark + " (" + waymark.waymark.zone + ") -> " + waymark.poi + "(" + waymark.poi.zone + ")");
				waymark.waymark.waymarks.push(new WaymarkVO(waymark.waymark.position, waymark.poi.position, waymark.type))
			}
		},
		
		addHazardCluster: function (seed, levelVO, centerSector, radius) {
			let levelOrdinal = levelVO.levelOrdinal;
			let s1 = seed / 2 + centerSector.position.sectorX * 79 + centerSector.position.sectorY * 242;
			let s2 = levelOrdinal * 11 / seed * 2 + seed/(s1 + 9 + 9 + levelOrdinal) - s1*s1;
			
			let validTypes = this.getPossibleWeightedHazardTypesForLevel(levelVO, centerSector);
			
			if (validTypes.length == 0) return;
			
			let hazardIndex = WorldCreatorRandom.randomInt(s1, 0, validTypes.length);
			let hazardType = validTypes[hazardIndex];
			let value = WorldCreatorRandom.random(s2);
			
			for (var hx = centerSector.position.sectorX - radius; hx <= centerSector.position.sectorX + radius; hx++) {
				for (var hy = centerSector.position.sectorY - radius; hy <= centerSector.position.sectorY + radius; hy++) {
					var sectorVO = levelVO.getSector(hx, hy);
					if (!sectorVO) continue;
					if (WorldCreatorConstants.isEarlierZone(sectorVO.zone, centerSector.zone)) {
						continue;
					}
					let isClusterEdge = PositionConstants.getDistanceTo(sectorVO.position, centerSector.position) >= radius;
					this.setSectorHazard(levelVO, sectorVO, value, hazardType, isClusterEdge);
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
			for (let i = 0; i < sectorVO.criticalPaths.length; i++) {
				var pathType = sectorVO.criticalPaths[i].type;
				if (options.allowedCriticalPaths && options.allowedCriticalPaths.indexOf(pathType) >= 0) continue;
				if (blockerType === MovementConstants.BLOCKER_TYPE_GANG && allowedForGangs.indexOf(pathType) >= 0) continue;
				for (let j = 0; j < neighbourVO.criticalPaths.length; j++) {
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
				for (let j = 0; j < nextNeighbours.length; j++) {
					this.addMovementBlocker(worldVO, levelVO, sectorVO, nextNeighbours[j], blockerType, diagonalsOptions, sectorcb);
				}
				nextNeighbours = levelVO.getNextNeighbours(neighbourVO, neighbourDirection);
				for (let j = 0; j < nextNeighbours.length; j++) {
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
		
		setSectorHazard: function (levelVO, sectorVO, hazardValueRand, hazardType, isClusterEdge, override) {
			var maxHazardValue = this.getMaxHazardValue(levelVO, sectorVO, hazardType, sectorVO.zone, override);
			var minHazardValue = this.getMaxHazardValueForLevel(hazardType, levelVO.campOrdinal - 1, sectorVO.zone, false);
			var hazardValue = minHazardValue + hazardValueRand * (maxHazardValue - minHazardValue);
			if (isClusterEdge) {
				hazardValue = hazardValue / 2;
			}
			hazardValue = Math.ceil(hazardValue / 5) * 5;
			if (hazardValue > maxHazardValue) hazardValue = maxHazardValue;
			
			sectorVO.hazards[hazardType] = hazardValue;
			
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
				if (hazardType == SectorConstants.HAZARD_TYPE_RADIATION) {
					sectorVO.hazards.poison = 0;
				} else if (hazardType == "poison") {
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

		filterSectorForLuxuryLocationType: function (sectorVO, luxuryLocationType) {
			if (sectorVO.sectorType == SectorConstants.SECTOR_TYPE_SLUM) return false;
			if (sectorVO.sectorType == SectorConstants.SECTOR_TYPE_PUBLIC) return false;
			
			switch (luxuryLocationType) {
				case this.LUXURY_RESOURCE_LOCATION_TYPE_FARMABLE:
					return !sectorVO.hazards.hasHazards();
				case this.LUXURY_RESOURCE_LOCATION_TYPE_BIO:
					return !sectorVO.hazards.radiation;
				case this.LUXURY_RESOURCE_LOCATION_TYPE_MINERAL:
					return sectorVO.sectorType != SectorConstants.SECTOR_TYPE_RESIDENTIAL;
			}
			
			return true;
		},
		
		getLocaleTypeForLuxuryResourceOnSector: function (seed, luxuryLocationType, sector) {
			let options = [ ];
			
			if (sector.sectorType == SectorConstants.SECTOR_TYPE_COMMERCIAL || sector.sectorType == SectorConstants.SECTOR_TYPE_RESIDENTIAL) {
				options.push(localeTypes.market);
			} else {
				options.push(localeTypes.warehouse);
			}
			
			switch (luxuryLocationType) {
				case this.LUXURY_RESOURCE_LOCATION_TYPE_FARMABLE:
					options.push(localeTypes.farm);
					break;
				case this.LUXURY_RESOURCE_LOCATION_TYPE_BIO:
					options.push(localeTypes.lab);
					break;
			}
			
			return WorldCreatorRandom.getRandomItemFromArray(seed, options);
		},
		
		getLuxuryResourceLocationType: function (luxuryType) {
			switch (luxuryType) {
				case TribeConstants.luxuryType.HONEY:
				case TribeConstants.luxuryType.OLIVES:
				case TribeConstants.luxuryType.TRUFFLES:
				case TribeConstants.luxuryType.CHOCOLATE:
				case TribeConstants.luxuryType.COFFEE:
				case TribeConstants.luxuryType.SPICES:
				case TribeConstants.luxuryType.TOBACCO:
				case TribeConstants.luxuryType.TEA:
					return this.LUXURY_RESOURCE_LOCATION_TYPE_FARMABLE;
					
				case TribeConstants.luxuryType.AMBER:
				case TribeConstants.luxuryType.PEARLS:
				case TribeConstants.luxuryType.IVORY:
				case TribeConstants.luxuryType.SALT:
					return this.LUXURY_RESOURCE_LOCATION_TYPE_BIO;
				
				case TribeConstants.luxuryType.DIAMONDS:
				case TribeConstants.luxuryType.EMERALDS:
				case TribeConstants.luxuryType.GOLD:
				case TribeConstants.luxuryType.JADE:
				case TribeConstants.luxuryType.SILVER:
					return this.LUXURY_RESOURCE_LOCATION_TYPE_MINERAL;
					
				default:
					log.w("unknown luxury resource type: " + luxuryType);
					return this.LUXURY_RESOURCE_LOCATION_TYPE_MINERAL;
			}
		},
		
		isSunlit: function (seed, worldVO, levelVO, sectorVO) {
			let l = sectorVO.position.level;
			
			let isHole = function (pos) {
				var features = worldVO.getFeaturesByPos(pos);
				for (let i = 0; i < features.length; i++) {
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
		
		isSunlitByNeighbours: function (worldVO, levelVO, sectorVO) {
			let numTotal = 0;
			let numSunlit = 0;
			let neighbours = levelVO.getNeighbourList(sectorVO.position.sectorX, sectorVO.position.sectorY);
			for (let i = 0; i < neighbours.length; i++) {
				numTotal++;
				if (neighbours[i].sunlit) numSunlit++;
			}
			let isSunlit = numSunlit / numTotal > 0.8;
			return isSunlit ? 0.5 : 0;
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
		
		getPossibleWeightedHazardTypesForLevel: function (levelVO, sectorVO) {
			let result = [];
			let campOrdinal = levelVO.campOrdinal;
			if (campOrdinal >= WorldCreatorConstants.MIN_CAMP_ORDINAL_HAZARD_POISON) {
				result.push(SectorConstants.HAZARD_TYPE_POLLUTION);
				result.push(SectorConstants.HAZARD_TYPE_POLLUTION);
			}
			if (campOrdinal > WorldCreatorConstants.MIN_CAMP_ORDINAL_HAZARD_POISON) {
				result.push(SectorConstants.HAZARD_TYPE_POLLUTION);
				result.push(SectorConstants.HAZARD_TYPE_POLLUTION);
			}
			if (campOrdinal >= WorldCreatorConstants.MIN_CAMP_ORDINAL_HAZARD_RADIATION) {
				result.push(SectorConstants.HAZARD_TYPE_RADIATION);
				result.push(SectorConstants.HAZARD_TYPE_RADIATION);
			}
			if (campOrdinal > WorldCreatorConstants.MIN_CAMP_ORDINAL_HAZARD_RADIATION) {
				result.push(SectorConstants.HAZARD_TYPE_RADIATION);
				result.push(SectorConstants.HAZARD_TYPE_RADIATION);
			}
			if (!sectorVO.isOnPassageCriticalPath()) {
				if (campOrdinal >= WorldCreatorConstants.MIN_CAMP_ORDINAL_HAZARD_DEBRIS) {
					result.push(SectorConstants.HAZARD_TYPE_DEBRIS);
				}
				if (campOrdinal > WorldConstants.CAMPS_BEFORE_GROUND) {
					result.push(SectorConstants.HAZARD_TYPE_DEBRIS);
				}
				if (campOrdinal > WorldConstants.CAMPS_BEFORE_GROUND + 1) {
					result.push(SectorConstants.HAZARD_TYPE_DEBRIS);
					result.push(SectorConstants.HAZARD_TYPE_DEBRIS);
					result.push(SectorConstants.HAZARD_TYPE_DEBRIS);
					result.push(SectorConstants.HAZARD_TYPE_DEBRIS);
				}
			}
			return result;
		},
		
		getWorkshopResourceForLevel: function (seed, worldVO, levelVO) {
			var campOrdinal = levelVO.campOrdinal;
			let levelIndex = WorldCreatorHelper.getLevelIndexForCamp(seed, campOrdinal, levelVO.level);
			let maxLevelIndex = WorldCreatorHelper.getMaxLevelIndexForCamp(seed, campOrdinal, levelVO.level);
			
			if (levelVO.isCampable && (campOrdinal === WorldConstants.CAMP_ORDINAL_FUEL || campOrdinal == WorldConstants.CAMP_ORDINAL_FUEL_2))
				return "fuel";
			if (levelIndex == maxLevelIndex && (campOrdinal === WorldConstants.CAMP_ORDINAL_GREENHOUSE_1 || campOrdinal == WorldConstants.CAMP_ORDINAL_GREENHOUSE_2))
				return "herbs";
			if (levelVO.level == worldVO.bottomLevel || (levelVO.isCampable && campOrdinal == WorldConstants.CAMP_ORDINAL_RUBBER_2))
				return "rubber";
			return null;
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
			var unlockElevatorOrdinal = GameGlobals.upgradeEffectsHelper.getMinimumCampOrdinalForUpgrade("unlock_building_passage_elevator");
			var unlockHoleOrdinal = GameGlobals.upgradeEffectsHelper.getMinimumCampOrdinalForUpgrade("unlock_building_passage_hole");
			if (l === 13) {
				return MovementConstants.PASSAGE_TYPE_STAIRWELL;
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
			let l = sectorVO.position.level;
			let x = sectorVO.position.sectorX;
			let y = sectorVO.position.sectorY;
			let campOrdinal = levelVO.campOrdinal;
			let step = WorldConstants.getCampStep(sectorVO.zone);
			let isPollutedLevel = levelVO.notCampableReason === LevelConstants.UNCAMPABLE_LEVEL_TYPE_POLLUTION;
			let isRadiatedLevel = levelVO.notCampableReason === LevelConstants.UNCAMPABLE_LEVEL_TYPE_RADIATION;
			
			let enemyDifficulty = enemyCreator.getDifficulty(campOrdinal, step);
			if (sectorVO.isOnEarlyCriticalPath()) enemyDifficulty -= 2;
			enemyDifficulty = Math.max(enemyDifficulty, 1);
			sectorVO.enemyDifficulty = enemyDifficulty;

			let enemies = [];
			
			// collect all valid enemies for this sector (candidates)
			let candidates = [];
			let enemy;
			let candidateDifficulties = [];
			let addEnemyCandidates = function (enemyType) {
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
			if (levelVO.populationFactor > 0) addEnemyCandidates(EnemyConstants.enemyTypes.inhabited);
			if (levelVO.populationFactor <= 0) addEnemyCandidates(EnemyConstants.enemyTypes.uninhabited);
			
			let hasWater = sectorVO.hasWater();
			let directions = PositionConstants.getLevelDirections();
			let neighbours = levelVO.getNeighbours(x, y);
			for (var d in directions) {
				let direction = directions[d];
				let neighbour = neighbours[direction];
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
			
			// select enemies from candidates by (sector adjusted) rarity and difficulty
			let getAdjustedRarity = function (enemyVO) {
				let result = enemyVO.rarity;
				if (!levelVO.isCampable && enemyVO.enemyClass == "bandit") {
					result += 50;
				}
				result = MathUtils.clamp(result, 1, 100);
				return result;
			};
			candidates = candidates.sort(function (a,b) {
				return getAdjustedRarity(a) - getAdjustedRarity(b);
			});
			candidateDifficulties = candidateDifficulties.sort(function (a,b) {
				return a - b;
			});
			
			let minDifficulty = levelVO.isHard ? candidateDifficulties[Math.floor(candidateDifficulties.length/2)] : candidateDifficulties[0];
			for (let i = 0; i < candidates.length; i++) {
				let enemy = candidates[i];
				let rarity = getAdjustedRarity(enemy);
				if (enemyCreator.getEnemyDifficultyLevel(enemy) < minDifficulty) continue;
				let threshold = MathUtils.map(rarity, 1, 100, 0.01, 0.99);
				let r = WorldCreatorRandom.random(9999 + l * seed + x * l * 80 + y * 10 + i * x *22 - y * i * x * 15);
				if (i == 0 || r > threshold) {
					enemies.push(enemy);
				}
			}

			return enemies;
		},
		
		getMaxHazardValue: function (levelVO, sectorVO, hazardType, zone, override) {
			if (sectorVO.isCamp) return 0;
			if (sectorVO.requiredResources.water) return 0;
			if (sectorVO.workshopResource != null) return 0;
			if (zone == WorldConstants.ZONE_PASSAGE_TO_CAMP) return 0;
			
			let isDebris = hazardType == "debris";
			
			let hasBlockingExistingHazard = function (sectorVO) {
				if (sectorVO.hazards.cold > 0) return true;
				if (hazardType != SectorConstants.HAZARD_TYPE_POLLUTION && sectorVO.hazards.poison > 0) return true;
				if (hazardType != SectorConstants.HAZARD_TYPE_RADIATION && sectorVO.hazards.radiation > 0) return true;
				return false;
			};
			
			let campOrdinal = levelVO.campOrdinal;
			if (!override && !isDebris) {
				if (hasBlockingExistingHazard(sectorVO)) return 0;
				var directions = PositionConstants.getLevelDirections();
				var neighbours = levelVO.getNeighbours(sectorVO.position.sectorX, sectorVO.position.sectorY);
				for (var d in directions) {
					var direction = directions[d];
					var neighbour = neighbours[direction];
					if (neighbour && hasBlockingExistingHazard(neighbour)) return 0;
				}
			}
			
			let value = this.getMaxHazardValueForLevel(hazardType, campOrdinal, zone, levelVO.isHard);
			if (sectorVO.isPassageUp || sectorVO.isPassageDown) {
				// TODO replace hard-coded level with a check like "early-ish level ordinal, campable, previous level not campable"
				if (levelVO.level == 10) {
					value = 0;
				} else {
					value = Math.floor(value * 2 / 3);
				}
			}
			if (isDebris && sectorVO.isOnPassageCriticalPath()) {
				value = 0;
			}
			return value;
		},
		
		getMaxHazardValueForLevel: function (hazardType, campOrdinal, zone, isHardLevel) {
			let step = WorldConstants.getCampStep(zone);
			if (hazardType == SectorConstants.HAZARD_TYPE_RADIATION) {
				return Math.min(100, this.itemsHelper.getMaxHazardRadiationForLevel(campOrdinal, step, isHardLevel));
			} else if (hazardType == SectorConstants.HAZARD_TYPE_POLLUTION) {
				return Math.min(100, this.itemsHelper.getMaxHazardPoisonForLevel(campOrdinal, step, isHardLevel));
			} else if (hazardType == SectorConstants.HAZARD_TYPE_DEBRIS) {
				return campOrdinal >= WorldCreatorConstants.MIN_CAMP_ORDINAL_HAZARD_DEBRIS ? 9 : 0;
			} else {
				return 0;
			}
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
			
			var unlockGapOrdinal = GameGlobals.upgradeEffectsHelper.getMinimumCampOrdinalForUpgrade("unlock_building_bridge");
			if (campOrdinal > unlockGapOrdinal || (campOrdinal == unlockGapOrdinal && campStage == WorldConstants.CAMP_STAGE_LATE)) {
				blockerTypes.push(MovementConstants.BLOCKER_TYPE_GAP);
			}
			
			let unlockToxicWasteOrdinal = GameGlobals.upgradeEffectsHelper.getMinimumCampOrdinalForUpgrade("unlock_action_clear_waste_t");
			let unlockToxicWasteStep = GameGlobals.upgradeEffectsHelper.getMinimumCampStepForUpgrade("unlock_action_clear_waste_t");
			let unlockToxicWasteStage = WorldConstants.getStageForStep(unlockToxicWasteStep);
			if (WorldConstants.isHigherCampOrdinalAndStage(campOrdinal, campStage, unlockToxicWasteOrdinal, unlockToxicWasteStage) && !isRadiatedLevel) {
				blockerTypes.push(MovementConstants.BLOCKER_TYPE_WASTE_TOXIC);
				if (isPollutedLevel) {
					blockerTypes.push(MovementConstants.BLOCKER_TYPE_WASTE_TOXIC);
					blockerTypes.push(MovementConstants.BLOCKER_TYPE_WASTE_TOXIC);
				}
			}
			
			var unlockRadioactiveWasteOrdinal = GameGlobals.upgradeEffectsHelper.getMinimumCampOrdinalForUpgrade("unlock_action_clear_waste_r");
			let unlockRadioactiveWasteStep = GameGlobals.upgradeEffectsHelper.getMinimumCampStepForUpgrade("unlock_action_clear_waste_r");
			let unlockRadioactiveWasteStage = WorldConstants.getStageForStep(unlockRadioactiveWasteStep);
			if (WorldConstants.isHigherCampOrdinalAndStage(campOrdinal, campStage, unlockRadioactiveWasteOrdinal, unlockRadioactiveWasteStage)) {
				blockerTypes.push(MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE);
				if (isRadiatedLevel) {
					blockerTypes.push(MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE);
				}
			}
			
			return blockerTypes;
		},
		
		getLocaleType: function (worldVO, levelVO, sectorVO, s1, isEarly) {
			var possibleTypes = [];
			var l = levelVO.level;
			var sectorType = sectorVO.sectorType;
			var distanceToCamp = WorldCreatorHelper.getQuickMinDistanceToCamp(levelVO, sectorVO);

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
