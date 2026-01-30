// generates an overall stucture for the world, independent of specific levels or sectors, first step in world gen
define([
	'worldcreator/WorldCreatorConstants',
	'worldcreator/WorldCreatorHelper',
	'worldcreator/WorldCreatorRandom',
	'worldcreator/WorldFeatureVO',
	'worldcreator/StageVO',
	'worldcreator/DistrictVO',
	'game/vos/AreaVO',
	'game/vos/PositionVO',
	'game/constants/MovementConstants',
	'game/constants/SectorConstants',
	'game/constants/PositionConstants',
	'game/constants/WorldConstants',
], function (
	WorldCreatorConstants, WorldCreatorHelper, WorldCreatorRandom, 
	WorldFeatureVO, StageVO, DistrictVO, AreaVO, PositionVO, 
	MovementConstants, SectorConstants, PositionConstants, WorldConstants) {
	
	let WorldSkeletonGenerator = {

		generate: function (seed, worldVO, worldTemplateVO, progressionConfig) {
			this.progressionConfig = progressionConfig;

			worldVO.topLevel = this.getTopLevel(seed, worldTemplateVO);
			worldVO.bottomLevel = this.getBottomLevel(seed, worldTemplateVO);

			worldVO.levelCenterPositions = this.generateLevelCenterPositions(seed);
			worldVO.features = this.generateWorldFeatures(seed, worldTemplateVO, worldVO.levelCenterPositions);
			worldVO.stages = this.generateStages(seed);
			worldVO.campPositions = worldTemplateVO.campPositions || this.generateCampPositions(seed, worldVO.features, worldVO.levelCenterPositions);
			worldVO.passagePositions = worldTemplateVO.passagePositions || this.generatePassagePositions(seed, worldVO.features, worldVO.campPositions, worldVO.levelCenterPositions);
			worldVO.passageTypes = worldTemplateVO.passageTypes || this.generatePassageTypes(seed, worldVO);
			worldVO.districts = this.generateDistricts(seed, worldVO.features);
		},

		getTopLevel: function (seed, worldTemplateVO) {
			return worldTemplateVO.topLevel || WorldCreatorHelper.getHighestLevel(seed);
		},

		getBottomLevel: function (seed, worldTemplateVO) {
			return worldTemplateVO.bottomLevel || worldTemplateVO.bottomLevel === 0 ? worldTemplateVO.bottomLevel : WorldCreatorHelper.getBottomLevel(seed);
		},

		generateLevelCenterPositions: function (seed) {
			let result = {};

			let topLevel = WorldCreatorHelper.getHighestLevel(seed);
			let bottomLevel = WorldCreatorHelper.getBottomLevel(seed);
			for (let l = topLevel; l >= bottomLevel; l--) {
				let centerX = 0;

				// moving towards rumoured exit to the west
				if (l < 13) centerX = Math.round((13 - l) * -5);

				// avoid crater
				if (l >= topLevel - 2) centerX = centerX += 6;

				result[l] = new PositionVO(l, centerX, 0);
			}

			return result;
		},
		
		generateWorldFeatures: function (seed, worldTemplateVO, levelCenterPositions) {
			if (worldTemplateVO && worldTemplateVO.features && worldTemplateVO.features.length > 0) return worldTemplateVO.features;

			let result = [];
			let topLevel = WorldCreatorHelper.getHighestLevel(seed);
			let bottomLevel = WorldCreatorHelper.getBottomLevel(seed);
			
			// collapse (origo)
			let collapseAreas = [];
			collapseAreas.push(new AreaVO(topLevel, -5, 5, -5, 5));
			collapseAreas.push(new AreaVO(topLevel - 1, -3, 3, -3, 3));
			collapseAreas.push(new AreaVO(topLevel - 2, -1, 1, -1, 1));
			result.push(new WorldFeatureVO(WorldConstants.FEATURE_HOLE_COLLAPSE, collapseAreas));
			
			// mountain (far northeast)
			let mountainAreas = [];
			let mountainCenter = new PositionVO(bottomLevel, 30, -40);
			for (let l = bottomLevel; l <= topLevel; l++) {
				let height = l - bottomLevel;
				let reductionPct = height/(height + 6);
				let radiusPct = 1 - reductionPct;
				let mountainRadius = Math.max(4, Math.round(20 *radiusPct));
				mountainAreas.push(new AreaVO(l, mountainCenter.sectorX - mountainRadius, mountainCenter.sectorX + mountainRadius, mountainCenter.sectorY - mountainRadius, mountainCenter.sectorY + mountainRadius));
			}
			result.push(new WorldFeatureVO(WorldConstants.FEATURE_HOLE_MOUNTAIN, mountainAreas));

			// giga center (near northwest)
			let gigaAreas = [];
			let randomGigaX = WorldCreatorRandom.randomInt(seed / 3, -5, 5);
			let randomGigaY = WorldCreatorRandom.randomInt(seed + 3, -10, -5);
			let levelCenter = levelCenterPositions[16];
			let gigaCenter = new PositionVO(WorldConstants.LEVEL_NUMBER_GIGA_CENTER_1, levelCenter.sectorX + randomGigaX, levelCenter.sectorY + randomGigaY);
			gigaAreas.push(new AreaVO(WorldConstants.LEVEL_NUMBER_GIGA_CENTER_1, gigaCenter.sectorX, gigaCenter.sectorX + 1, gigaCenter.sectorY, gigaCenter.sectorY + 1));
			gigaAreas.push(new AreaVO(WorldConstants.LEVEL_NUMBER_GIGA_CENTER_2, gigaCenter.sectorX, gigaCenter.sectorX + 1, gigaCenter.sectorY, gigaCenter.sectorY + 1));
			result.push(new WorldFeatureVO(WorldConstants.FEATURE_STRUCTURE_GIGA_CENTER, gigaAreas));

			// pillars (in a grid)
			for (let x = -50; x <= 50; x += 50) {
				for (let y = -50; y <= 50; y += 50) {
					for (let dx = -10; dx <= 10; dx += 20) {
						for (let dy = -10; dy <= 10; dy += 20) {
							let pillarAreas = [];
							for (let l = bottomLevel; l < topLevel; l++) {
								let pillarX = x + dx;
								let pillarY = y + dy;
								pillarAreas.push(new AreaVO(l, pillarX, pillarX, pillarY, pillarY));
							}
							result.push(new WorldFeatureVO(WorldConstants.FEATURE_STRUCTURE_PILLAR, pillarAreas));
						}
					}
				}
			}

			// sunwells (west)
			let well1Areas = [];
			let well2Areas = [];
			let well1Center = new PositionVO(topLevel, -20, 10);
			let well2Center = new PositionVO(topLevel, -40, 10);
			for (let l = 15; l <= topLevel; l++) {
				well1Areas.push(new AreaVO(l, well1Center.sectorX - 1, well1Center.sectorX + 1, well1Center.sectorY - 2, well1Center.sectorY + 2));
				well2Areas.push(new AreaVO(l, well2Center.sectorX - 1, well2Center.sectorX + 1, well2Center.sectorY - 2, well2Center.sectorY + 2));
			}
			result.push(new WorldFeatureVO(WorldConstants.FEATURE_HOLE_WELL, well1Areas));
			result.push(new WorldFeatureVO(WorldConstants.FEATURE_HOLE_WELL, well2Areas));

			// train tracks and stations
			let findFeaturePositions = function (level, featureType) {
				let positions = [];
				for (let i = 0; i < result.length; i++) {
					let featureVO = result[i];
					if (featureVO.type !== featureType) continue;
					if (!featureVO.spansLevel(level)) continue;
					positions = positions.concat(featureVO.getPositions(level));
				}
				return positions;
			};
			let getTrainTrackStartPosition = function (level, hasStations, i) {
				let levelCenter = levelCenterPositions[level];
				let sectorX = levelCenter.sectorX;
				let sectorY = levelCenter.sectorY;

				let sX = seed % 5 + level + i * 5;
				let sY = seed % 3 + level * 2 + i * 2;

				if (hasStations) {
					let stationPositions = [];
					let connectToAbove = WorldCreatorRandom.randomBool(level + i * 3, 0.75);
					if (i > 0) {
						stationPositions = stationPositions.concat(findFeaturePositions(level, WorldConstants.FEATURE_TRAIN_STATION));
					} else if (connectToAbove) {
						stationPositions = stationPositions.concat(findFeaturePositions(level + 1, WorldConstants.FEATURE_TRAIN_STATION));
					}
					if (stationPositions.length == 0) {
						stationPositions.push(new PositionVO(level, WorldCreatorRandom.randomInt(sX, -4, 5) * 5, WorldCreatorRandom.randomInt(sY, -4, 5) * 5));
					}

					let station = WorldCreatorRandom.randomItemFromArray(seed % 11 + level + i, stationPositions);
					sectorX = station.sectorX;		
					sectorY = station.sectorY;
				} else {
					sectorX += WorldCreatorRandom.randomInt(sX, -20, 20);
					sectorY += WorldCreatorRandom.randomInt(sY, -20, 20);
				}
				
				return new PositionVO(level, sectorX, sectorY);
			};
			let getTrainTrackDirection = function (level, startPosition, isCentral) {
				let levelCenter = levelCenterPositions[level];
				let distance = PositionConstants.getDistanceTo(startPosition, levelCenter);
				let directions = isCentral ? PositionConstants.getDirectionsFrom(startPosition, levelCenter, false) : PositionConstants.getLevelDirections(true);
				if (distance <= 0 || directions.length <= 0) return PositionConstants.DIRECTION_EAST;
				return WorldCreatorRandom.randomItemFromArray(level, directions);
			}
			let createLine = function (level, featureType, startPosition, direction, length, hasStations) {
				let trackAreas = [];
				let stationAreas = [];
				let lastStationPos = 0;
				
				for (let i = 0; i < length; i++) {
					let pos = PositionConstants.getPositionOnPath(startPosition, direction, i);
					trackAreas.push(new AreaVO(level, pos.sectorX, pos.sectorX, pos.sectorY, pos.sectorY));

					if (hasStations) {
						let isRandomStation = i >= 5 && i <= length - 5 && i - lastStationPos >= 5 && WorldCreatorRandom.randomBool(startPosition.sectorX + level + i, 0.1);
						let isStation = i == 0 || i == length - 1 || isRandomStation;
						if (isStation) {
							stationAreas.push(new AreaVO(level, pos.sectorX, pos.sectorX, pos.sectorY, pos.sectorY));
							lastStationPos = i;
						}
					}
				}
				result.push(new WorldFeatureVO(featureType, trackAreas));
				result.push(new WorldFeatureVO(WorldConstants.FEATURE_TRAIN_STATION, stationAreas));
			}
			let generateTrainTracks = function (level, featureType, num, hasStations) {
				for (let i = 0; i < num; i++) {
					let startPosition = getTrainTrackStartPosition(level, hasStations, i);
					let direction = getTrainTrackDirection(level, startPosition, i == 0);
					let length = featureType == WorldConstants.FEATURE_TRAIN_TRACKS_NEW ? 50 : 20;
					createLine(level, featureType, startPosition, direction, length, hasStations);
				}
			};
			for (let l = topLevel - 1; l >= bottomLevel; l--) {
				let isModern = l > 14;
				let numNew = isModern ? 2 : 0;
				let numOld = isModern ? 0 : 1;
				generateTrainTracks(l, WorldConstants.FEATURE_TRAIN_TRACKS_NEW, numNew, true);
				generateTrainTracks(l, WorldConstants.FEATURE_TRAIN_TRACKS_OLD, numOld, false);
			}
			
			return result;
		},
		
		generateStages: function (seed) {
			var stages = [];
			for (var campOrdinal = 1; campOrdinal <= WorldConstants.CAMPS_TOTAL; campOrdinal++) {
				var levels = WorldCreatorHelper.getLevelsForCamp(seed, campOrdinal);
				stages.push(new StageVO(campOrdinal, WorldConstants.CAMP_STAGE_EARLY, [ levels[0] ], WorldCreatorHelper.getNumSectorsForStage(seed, campOrdinal, WorldConstants.CAMP_STAGE_EARLY)));
				stages.push(new StageVO(campOrdinal, WorldConstants.CAMP_STAGE_LATE, levels, WorldCreatorHelper.getNumSectorsForStage(seed, campOrdinal, WorldConstants.CAMP_STAGE_LATE)));
			}
			return stages;
		},
		
		generateCampPositions: function (seed, features, centers) {
			let positionsByLevel = {};
			let topLevel = WorldCreatorHelper.getHighestLevel(seed);
			let bottomLevel = WorldCreatorHelper.getBottomLevel(seed);
			let maxCampDist = 4;
			for (let l = topLevel; l >= bottomLevel; l--) {
				let position = null;
				let isCampableLevel = WorldCreatorHelper.isCampableLevel(seed, l);
				let campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, l);
				if (isCampableLevel) {
					let maxPathLen = WorldCreatorConstants.getMaxPathLength(campOrdinal - 1, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE);
					let maxCenterDist = Math.min(15, Math.floor(maxPathLen * 0.8 - maxCampDist));					
					let center = centers[l];

					if (l == 13) {
						position = new PositionVO(l, 0, 0);
					} else {
						let isValid = function (pos) { return WorldSkeletonGenerator.isValidCampPos(seed, pos, positionsByLevel, features); };
						position = WorldCreatorRandom.randomSectorPositionWithCheck(seed % 10 + (l+10) * 55, "camp pos", l, maxCenterDist, center, 0, isValid);
					}
				}
				positionsByLevel[l] = position;
			}
			return positionsByLevel;
		},
		
		generatePassagePositions: function (seed, features, campPositions, levelCenterPositions) {
			let result = {};
			let topLevel = WorldCreatorHelper.getHighestLevel(seed);
			let bottomLevel = WorldCreatorHelper.getBottomLevel(seed);
			for (let l = topLevel; l >= bottomLevel; l--) {
				let campThisUp = this.getNextCampPosUp(seed, campPositions, l, true);
				let campPosDown = this.getNextCampPosDown(seed, campPositions, l, false);
				let previousDown = l == topLevel ? null : result[l+1].down;
				let up = previousDown ? new PositionVO(l, previousDown.sectorX, previousDown.sectorY) : null;
				let down = l == bottomLevel ? null : this.getPassageDownPosition(seed, l, features, levelCenterPositions[l], up, campThisUp, campPosDown);
				result[l] = { up: up, down: down };
			}
			return result;
		},

		generatePassageTypes: function (seed, worldVO) {
			let result = {};
			let topLevel = WorldCreatorHelper.getHighestLevel(seed);
			let bottomLevel = WorldCreatorHelper.getBottomLevel(seed);
			for (let l = topLevel; l >= bottomLevel; l--) {
				let up = this.getPassageUpType(seed, worldVO, l, result);
				let down = this.getPassageDownType(seed, worldVO, l);
				result[l] = { up: up, down: down };
			}
			return result;
		},
		
		generateDistricts: function (seed, features) {
			let result = {};
			let topLevel = WorldCreatorHelper.getHighestLevel(seed);
			let bottomLevel = WorldCreatorHelper.getBottomLevel(seed);
			
			// districts on specific levels
			for (let l = topLevel; l >= bottomLevel; l--) {
				result[l] = [];
				if (l == 14) {
					this.generateDistrict(seed, result, SectorConstants.SECTOR_TYPE_INDUSTRIAL, l, 0, 0, 8, 8);
				}
			}
			
			// districts around features
			for (let i = 0; i < features.length; i++) {
				let feature = features[i];
				switch (feature.type) {
					case WorldConstants.FEATURE_HOLE_MOUNTAIN:
						this.generateDistrictAround(seed, result, feature, SectorConstants.SECTOR_TYPE_INDUSTRIAL, 2, bottomLevel, topLevel);
						break;
				}
			}
			
			return result;
		},
		
		generateDistrictAround: function (seed, districts, feature, type, padding, minLevel, maxLevel) {
			for (var l = minLevel; l <= maxLevel; l++) {
				if (feature.spansLevel(l)) {
					this.generateDistrict(seed, districts, type, l, feature.posX, feature.posY, feature.sizeX + padding * 2, feature.sizeY + padding * 2);
				}
			}
		},
		
		generateDistrict: function (seed, districts, type, level, x, y, sizeX, sizeY) {
			districts[level].push(new DistrictVO(level, x, y, sizeX, sizeY, type));
		},
		
		getPassageDownPosition: function (seed, level, features, levelCenter, passageUp, campPos1, campPos2) {
			let campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, level);
			if (campPos1 == null) campPos1 = levelCenter;
			if (campPos2 == null) campPos2 = levelCenter;
			
			// find average of the max positions = position that adds 0 to the max path length
			let allPos = [campPos1, campPos2, levelCenter];
			let averagePos = PositionConstants.getMiddlePoint(allPos);
			averagePos.level = level;
			
			// find out how much we can afford to add to the max path length by moving the passage from the "optimal" position
			var maxPathLength = WorldCreatorConstants.getMaxPathLength(campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE);
			var startPathLength = Math.ceil(Math.max(PositionConstants.getDistanceTo(averagePos, campPos1), PositionConstants.getDistanceTo(averagePos, campPos2)));
			var maxDiff = Math.min(20, maxPathLength - startPathLength);
			var minDiff = Math.min(3, Math.floor(maxDiff / 2));
			 //WorldCreatorLogger.i("passage position " + level + " " + campPos1 + " - " + campPos2 + " -> middle: " + averagePos + " -> maxPathLength: " + maxPathLength + ", startPathLength: " + startPathLength + ", maxDiff: " + maxDiff + ", minDiff: " + minDiff);
			
			// select random sector around averagePos
			let candidates = [];
			for (let i = 0; i < 5; i++) {
				let rseed = seed % (1000 - i * 99) + 7 + (level + 13) * 101;
				let candidate = WorldCreatorRandom.randomSectorPositionWithCheck(
					rseed, "passage down pos " + level, level, maxDiff, averagePos, minDiff,
					(pos) => WorldSkeletonGenerator.isValidPassageDownPos(seed, pos, features, passageUp, campPos1, campPos2)
				);
				let score = PositionConstants.getDistanceTo(candidate, averagePos);
				candidates.push({ result: candidate, score: score });
			}
			candidates.sort(function (a, b) { return a.score - b.score; });
			return candidates[0].result;
		},
		
		getNextCampPosUp: function (seed, campPositions, from, inclusive) {
			var topLevel = WorldCreatorHelper.getHighestLevel(seed);
			var start = inclusive ? from : from + 1;
			for (let i = start; i <= topLevel; i++) {
				if (campPositions[i]) {
					return campPositions[i];
				}
			}
			return null;
		},
		
		getNextCampPosDown: function (seed, campPositions, from, inclusive) {
			var bottomLevel = WorldCreatorHelper.getBottomLevel(seed);
			var start = inclusive ? from : from - 1;
			for (let i = start; i >= bottomLevel; i--) {
				if (campPositions[i]) {
					return campPositions[i];
				}
			}
			return null;
		},

		isValidCampPos: function (seed, pos, positionsByLevel, features) {
			// blocked: positions in holes etc
			if (WorldCreatorHelper.containsBlockingFeature(pos, features)) return { isValid: false, reason: "blocking feature" };
			// blocked: positions too close to camp positions on previous few levels (so that on levels between them passages up/down don't end up too close)
			var min = 5;
			for (let i = 2; i <= 3; i++) {
				var prevPositions = positionsByLevel[pos.level + i];
				if (!prevPositions) continue;
				for (let j = 0; j < prevPositions.length; j++) {
					var prevPos = prevPositions[j];
					var dist = PositionConstants.getDistanceTo(pos, prevPos);
					if (dist < min) return { isValid: false, reason: "min distance between consecutive camps" };
				}
			}
			// blocked: positions too far away from camp positions on previous two levels
			var campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, pos.level);
			var maxPathLengthC2P = WorldCreatorConstants.getMaxPathLength(campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE);
			for (let i = 1; i < 3; i++) {
				var prevPositions = positionsByLevel[pos.level + i];
				if (!prevPositions) continue;
				for (let j = 0; j < prevPositions.length; j++) {
					var prevPos = prevPositions[j];
					var dist = PositionConstants.getBlockDistanceTo(pos, prevPos);
					var max = Math.min(maxPathLengthC2P * (1 + (i-1) * 0.25), 35);
					if (dist > max) return { isValid: false, reason: "max distance between camps on previous levels ", details: pos + " vs " + prevPos };
				}
			}
			// otherwise ok
			return { isValid: true };
		},
		
		isValidPassageDownPos: function (seed, pos, features, passageUp, campPos1, campPos2) {
			let campOrdinal = Math.min(WorldCreatorHelper.getCampOrdinal(seed, pos.level), WorldCreatorHelper.getCampOrdinal(seed, pos.level - 1));
			let isCampableLevel = WorldCreatorHelper.isCampableLevel(seed, pos.level);
			let maxPathLengthC2P = WorldCreatorConstants.getMaxPathLength(campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE);
			let level = pos.level;
			
			// check blocking features like holes
			if (WorldCreatorHelper.containsBlockingFeature(pos, features)) return { isValid: false, reason: "blocking feature" };
			
			// check that not too close or not too far from camps on this level or the level below
			let allCamps = [ campPos1, campPos2 ];
			let minCampDist = 4;
			let maxCampDist = Math.min(20, maxPathLengthC2P);
			for (let i = 0; i < allCamps.length; i++) {
				var campPos = allCamps[i];
				if (campPos.level == pos.level || campPos.level == pos.level - 1) {
					var dist = Math.round(PositionConstants.getDistanceTo(pos, campPos));
					var bdist = PositionConstants.getBlockDistanceTo(pos, campPos);
					if (dist < minCampDist) return { isValid: false, reason: "min distance to camp", details: "camp pos " + campPos + " " + dist + "/" + minCampDist };
					if (bdist > maxCampDist) return { isValid: false, reason: "max distance to camp", details: "camp pos: " + campPos + " " + bdist + "/" + maxCampDist };
				}
			}
			
			// check that passages on same level are not too close and (on campless levels) not too far
			var maxPathLengthP2P = WorldCreatorConstants.getMaxPathLength(campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE);
			if (passageUp) {
				var minPassageDist = isCampableLevel ? 3 : 8;
				var maxPassageDist = isCampableLevel ? 100 : Math.min(20, maxPathLengthP2P);
				var dist = PositionConstants.getDistanceTo(pos, passageUp);
				if (dist < minPassageDist) return { isValid: false, reason: "min distance to passage up " + passageUp, details: Math.round(dist) + "/" + minPassageDist };
				if (dist > maxPassageDist) return { isValid: false, reason: "max distance to passage up " + passageUp, details: Math.round(dist) + "/" + maxPassageDist };
			}
			
			// check that late passage isn't between early passage and camps on this level (similar direction and shorter distance)
			if (passageUp) {
				var posE = level <= 13 ? passageUp : pos;
				var posL = level <= 13 ? pos : passageUp;
				for (let i = 0; i < allCamps.length; i++) {
					var campPos = allCamps[i];
					if (campPos.level == pos.level) {
						var dirE = PositionConstants.getDirectionFrom(campPos, posE);
						var dirL = PositionConstants.getDirectionFrom(campPos, posL);
						var isSame = dirE == dirL;
						var isNeighbouring = PositionConstants.isNeighbouringDirection(dirE, dirL, true);
						if (isSame || isNeighbouring) {
							var distE = PositionConstants.getDistanceTo(campPos, posE);
							var distL = PositionConstants.getDistanceTo(campPos, posL);
							if (distL < distE) {
								return { isValid: false, reason: "late passage closer to camp", details: "level " + level };
							}
						}
					}
				}
			}
			
			return { isValid: true };
		},
		
		getPassageUpType: function (seed, worldVO, level, passageTypes) {
			if (level == worldVO.topLevel) return null;
			return passageTypes[level + 1].down;
		},
		
		getPassageDownType: function (seed, worldVO, level) {
			if (level == worldVO.bottomLevel) return null;

			let s1 = seed / 2 + level * 301;

			let isPlayerGoingDown = level <= 13;
			let otherLevel = level - 1;
			let startLevel = isPlayerGoingDown ? level : otherLevel;
			let endLevel = isPlayerGoingDown ? otherLevel : level;
			
			let campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, startLevel);
			let isCampable = WorldCreatorHelper.isCampableLevel(seed, startLevel);

			let unlockElevatorOrdinal = WorldCreatorHelper.progressionConfig.unlockCampOrdinals.passageElevator;
			let unlockHoleOrdinal = WorldCreatorHelper.progressionConfig.unlockCampOrdinals.passageHole;

			let guaranteedReadyPassageLevel = this.getGuaranteedReadyPassageLevel(seed, worldVO);

			if (level === 13) {
				return MovementConstants.PASSAGE_TYPE_STAIRWELL;
			} else if (level === 14) {
				return MovementConstants.PASSAGE_TYPE_HOLE;
			} else if (isCampable && campOrdinal == unlockElevatorOrdinal) {
				return MovementConstants.PASSAGE_TYPE_ELEVATOR;
			} else if (isCampable && campOrdinal == unlockHoleOrdinal) {
				return MovementConstants.PASSAGE_TYPE_HOLE;
			} else if (level == guaranteedReadyPassageLevel) {
				return MovementConstants.PASSAGE_TYPE_PREBUILT;
			} else {
				let availablePassageTypes = this.getAvailablePassageTypes(seed, startLevel, endLevel, unlockElevatorOrdinal, unlockHoleOrdinal);
				let passageTypeIndex = WorldCreatorRandom.randomInt(s1, 0, availablePassageTypes.length);
				let passageType = availablePassageTypes[passageTypeIndex];
				return passageType;
			}
		},

		getAvailablePassageTypes: function (seed, startLevel, endLevel, unlockElevatorOrdinal, unlockHoleOrdinal) {
			let campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, startLevel);
			let isCampable = WorldCreatorHelper.isCampableLevel(seed, startLevel);

			let result = [ MovementConstants.PASSAGE_TYPE_STAIRWELL ];

			if (campOrdinal >= unlockElevatorOrdinal) {
				result.push(MovementConstants.PASSAGE_TYPE_ELEVATOR);
			}
			
			if (campOrdinal >= unlockHoleOrdinal) {
				result.push(MovementConstants.PASSAGE_TYPE_HOLE);
			}

			let topLevel = WorldCreatorHelper.getHighestLevel(seed);
			let isKeyCamp = campOrdinal == 1 || campOrdinal == WorldConstants.CAMPS_BEFORE_GROUND || campOrdinal == WorldConstants.CAMPS_TOTAL;
			let isSurface = endLevel == topLevel;
			if (!isKeyCamp && !isSurface && !isCampable) {
				result.push(MovementConstants.PASSAGE_TYPE_PREBUILT);
			}
			
			return result;
		},

		getGuaranteedReadyPassageLevel: function (seed, worldVO) {
			let camplessLevels = WorldCreatorHelper.getCamplessLevelOrdinals(seed);
			let validCamplessLevels = [];
			for (let i = 0; i < camplessLevels.length; i++) {
				let level = camplessLevels[i];
				if (level >= worldVO.topLevel - 2) continue;
				if (level == 15) continue;
				if (level == 14) continue;
				if (level == 11) continue;
				validCamplessLevels.push(level);
			}

			let levelIndex = WorldCreatorRandom.randomInt(seed, 0, validCamplessLevels.length);
			return validCamplessLevels[levelIndex];
		},

	};
	
	return WorldSkeletonGenerator;
});
