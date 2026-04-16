// creates LevelVOs and any details about them that do not require structure and sectors - created for all levels of a world when world is created
define([
	'ash',
	'utils/MathUtils',
	'game/constants/LevelConstants',
	'game/constants/PositionConstants',
	'game/constants/SectorConstants',
	'game/constants/TribeConstants',
	'game/constants/WorldConstants',
	'game/vos/PositionVO',
	'worldcreator/WorldCreatorConstants',
	'worldcreator/WorldCreatorHelper',
	'worldcreator/WorldCreatorLogger',
	'worldcreator/WorldCreatorRandom',
	'worldcreator/LevelVO',
	'worldcreator/DistrictVO',
], function (Ash, MathUtils, LevelConstants, PositionConstants, SectorConstants, TribeConstants, WorldConstants, PositionVO, WorldCreatorConstants, WorldCreatorHelper, WorldCreatorLogger, WorldCreatorRandom, LevelVO, DistrictVO) {
	
	let LevelSkeletonGenerator = {

		CITY_STATE_LEVEL: 10,

		generate: function (seed, worldVO, worldTemplateVO) {
			let topLevel = worldVO.topLevel;
			let bottomLevel = worldVO.bottomLevel;

			for (let l = topLevel; l >= bottomLevel; l--) {
				let levelVO = new LevelVO(l);
				let levelTemplateVO = worldTemplateVO.levels[l] || { };

				this.generateLevel(seed, worldVO, levelTemplateVO, levelVO);

				worldVO.levels[levelVO.level] = levelVO;
			}
		},

		generateLevel: function (seed, worldVO, levelTemplateVO, levelVO) {
			let l = levelVO.level;

			let levelOrdinal = WorldCreatorHelper.getLevelOrdinal(seed, l);
			let campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, l);
			let isCampableLevel = WorldCreatorHelper.isCampableLevel(seed, l);

			// basics derived directly from seed
			levelVO.seed = seed;
			levelVO.levelOrdinal = levelOrdinal;
			levelVO.campOrdinal = campOrdinal;
			levelVO.isCampable = isCampableLevel;
			levelVO.isHard = WorldCreatorHelper.isHardLevel(seed, l);
			levelVO.notCampableReason = isCampableLevel ? null : levelTemplateVO.notCampableReason || WorldCreatorHelper.getNotCampableReason(seed, l);
			levelVO.habitability = isCampableLevel ? levelTemplateVO.habitability || WorldCreatorConstants.getHabitability(campOrdinal) : 0;
			levelVO.raidDangerFactor = isCampableLevel ? WorldCreatorConstants.getRaidDangerFactor(campOrdinal) : 0;

			let numSectors = WorldCreatorHelper.getNumSectorsForLevel(seed, l);
			levelVO.numSectors = numSectors;
			levelVO.maxSectors = numSectors + WorldCreatorConstants.getMaxSectorOverflow(levelOrdinal);
			
			// basics derived from world skeleton
			levelVO.campPosition = worldVO.campPositions[l] || null;
			levelVO.passageUpPosition = worldVO.passagePositions[l].up;
			levelVO.passageUpType = worldVO.passageTypes[l].up;
			levelVO.passageDownPosition = worldVO.passagePositions[l].down;
			levelVO.passageDownType = worldVO.passageTypes[l].down;
			levelVO.passagePositions = [];
			if (levelVO.passageUpPosition) levelVO.passagePositions.push(levelVO.passageUpPosition);
			if (levelVO.passageDownPosition) levelVO.passagePositions.push(levelVO.passageDownPosition);
			levelVO.numSectorsByStage[WorldConstants.CAMP_STAGE_EARLY] = WorldCreatorHelper.getNumSectorsForLevelStage(worldVO.seed, levelVO.campOrdinal, levelVO.level, WorldConstants.CAMP_STAGE_EARLY);
			levelVO.numSectorsByStage[WorldConstants.CAMP_STAGE_LATE] = WorldCreatorHelper.getNumSectorsForLevelStage(worldVO.seed, levelVO.campOrdinal, levelVO.level, WorldConstants.CAMP_STAGE_LATE);

			levelVO.levelMapCenterPosition = worldVO.levelCenterPositions[l];
			levelVO.requiredPositions = worldVO.requiredPositions[l] || [];
			levelVO.levelPOICenterPosition = this.getLevelPOICenterPosition(worldVO, levelVO);

			// generated
			levelVO.stageCenterPositions = this.getStageCenterPositions(worldVO, levelVO);
			levelVO.workshopResource = this.getWorkshopResource(seed, worldVO, levelTemplateVO, levelVO);
			levelVO.levelStyle = levelTemplateVO.levelStyle || this.getLevelArchitecturalStyle(seed, levelVO);
			levelVO.features = worldVO.getFeaturesByLevel(l);
			levelVO.districts = this.getDistricts(worldVO, levelVO);
			levelVO.numInvestigateSectors = this.getNumInvestigateSectors(seed, l);
			levelVO.luxuryResources = this.getLuxuryResources(seed, l, campOrdinal, worldVO.levels);
		},
		
		getStageCenterPositions: function (worldVO, levelVO) {
			let result = {};
			let level = levelVO.level;
			let stages = worldVO.getStages(level);
			if (stages.length == 1) {
				result[WorldConstants.CAMP_STAGE_EARLY] = [];
				result[WorldConstants.CAMP_STAGE_LATE] = [];
				result[stages[0].stage].push(levelVO.levelMapCenterPosition);
			} else {
				for (let i = 0; i < stages.length; i++) {
					let stageVO = stages[i];
					let positions = [];
					switch (stageVO.stage) {
						case WorldConstants.CAMP_STAGE_EARLY:
							positions.push(levelVO.campPosition);
							if (level < 13 && levelVO.passageUpPosition) {
								positions.push(levelVO.passageUpPosition);
							}
							if (level > 13 && levelVO.passageDownPosition) {
								positions.push(levelVO.passageDownPosition);
							}
							break;
						case WorldConstants.CAMP_STAGE_LATE:
							if (level <= 13 && levelVO.passageDownPosition) {
								positions.push(levelVO.passageDownPosition);
							}
							if (level >= 13 && levelVO.passageUpPosition) {
								positions.push(levelVO.passageUpPosition);
							}
							break;
					}
					result[stageVO.stage] = positions;
				}
			}
			return result;
		},

		getDistricts: function (worldVO, levelVO) {
			let result = [];

			let getNumDistrictsFromNumSectors = (numSectors) => numSectors > 0 ? MathUtils.clamp(Math.round(numSectors / 45), 1, 4) : 0;
			let numEarly = getNumDistrictsFromNumSectors(levelVO.numSectorsByStage[WorldConstants.CAMP_STAGE_EARLY]);
			let numLate = getNumDistrictsFromNumSectors(levelVO.numSectorsByStage[WorldConstants.CAMP_STAGE_LATE]);
			if (numEarly + numLate < 2) numLate++;
			let numDistricts = numEarly + numLate;

			let positions = [];
			if (numEarly > 0) positions = positions.concat(this.getDistrictPositions(levelVO, WorldConstants.CAMP_STAGE_EARLY, numEarly));
			if (numLate > 0) positions = positions.concat(this.getDistrictPositions(levelVO, WorldConstants.CAMP_STAGE_LATE, numLate));

			let previousDistrict = null;

			log.i("districts level " + levelVO.level + "(style: " + levelVO.levelStyle + ")");

			for (let i = 0; i < numDistricts; i++) {
				let isEarly = i < numEarly;
				let stageI = isEarly ? i : i - numEarly;
				let stage = isEarly ? WorldConstants.CAMP_STAGE_EARLY : WorldConstants.CAMP_STAGE_LATE;
				let position = positions[i];
				let type = this.getDistrictType(levelVO, stage, position, positions, i, stageI, previousDistrict ? previousDistrict.type : null);
				let districtVO = new DistrictVO(position, stage, type);
				districtVO.wear = this.getDistrictWear(levelVO, type, i);
				districtVO.wealth = this.getDistrictWealth(levelVO, type, position, positions, i);
				districtVO.size = this.getDistrictSize(levelVO, type, districtVO.wealth, districtVO.wear, position);
				districtVO.affiliation = this.getDistrictAffiliation(levelVO, type, i);
				districtVO.style = this.getDistrictStyle(levelVO, stage, type, districtVO.wealth, districtVO.affiliation, i);
				log.i("level " + levelVO.level + " " + stage + " district " + i + ": " + type + " (wealth: " + districtVO.wealth + ", style: " + districtVO.style + ", affiliation: " + districtVO.affiliation + ", size: " + districtVO.size +  ")");
				result.push(districtVO);
				previousDistrict = districtVO;
			}

			return result;
		},

		getDistrictPositions: function (levelVO, stage, num) {
			let otherStage = stage == WorldConstants.CAMP_STAGE_EARLY ? WorldConstants.CAMP_STAGE_LATE : WorldConstants.CAMP_STAGE_EARLY;
			let stageMiddle = PositionConstants.getMiddlePoint(levelVO.stageCenterPositions[stage], true);
			let otherStageMiddle = levelVO.hasStage(otherStage) ? PositionConstants.getMiddlePoint(levelVO.stageCenterPositions[otherStage], true) : null;

			let wrongDirections = otherStageMiddle ? PositionConstants.getDirectionsFrom(stageMiddle, otherStageMiddle, true) : [];
			let allowedDirections = PositionConstants.getLevelDirections().filter(d => wrongDirections.indexOf(d) < 0);
			
			let result = [];

			let removeDirection = function (direction, requiredBuffer) {
				let index = allowedDirections.indexOf(direction);
				if (index < 0) return;

				let numRemaining = num - result.length;
				let numExtra = allowedDirections.length - numRemaining;

				if (numExtra <= requiredBuffer) return;
				allowedDirections.splice(index, 1);
			};

			for (let i = 0; i < num; i++) {
				let direction = WorldCreatorRandom.randomItemFromArray(levelVO.level + i, allowedDirections);
				let distance = WorldCreatorRandom.randomInt(levelVO.seed + i, 3, 12);
				let pos = PositionConstants.getPositionOnPath(stageMiddle, direction, distance, true);
				result.push(new PositionVO(pos.level, pos.sectorX, pos.sectorY));
				
				removeDirection(direction, 0);
				removeDirection(PositionConstants.getNextClockWise(direction, true), 1);
				removeDirection(PositionConstants.getNextCounterClockWise(direction, true), 1);
			}

			return result;
		},

		getDistrictType: function (levelVO, stage, position, positions, i, stageI, previousType) {
			let possibleTypes = [];

			// hard-coded
			// - one city state
			if (levelVO.level == this.CITY_STATE_LEVEL && stage == WorldConstants.CAMP_STAGE_LATE) {
				possibleTypes.push(SectorConstants.SECTOR_TYPE_RESIDENTIAL);
				possibleTypes.push(SectorConstants.SECTOR_TYPE_COMMERCIAL);
				return WorldCreatorRandom.randomItemFromArray(i, possibleTypes);
			}

			// - workshops
			if (levelVO.workshopResource && stage == WorldConstants.CAMP_STAGE_LATE && stageI == 0) {
				return SectorConstants.SECTOR_TYPE_INDUSTRIAL;
			}

			// - level 14
			if (levelVO.level == 14) return SectorConstants.SECTOR_TYPE_INDUSTRIAL;

			// random
			let topLevel = WorldCreatorHelper.getHighestLevel(levelVO.seed);
			let centrality = WorldCreatorHelper.getPositionCentrality(position);

			// - residential: most places, especially a bit way from world zone center
			if (levelVO.level != 14) {
				possibleTypes.push(SectorConstants.SECTOR_TYPE_RESIDENTIAL);
				possibleTypes.push(SectorConstants.SECTOR_TYPE_RESIDENTIAL);
				if (centrality < 0.75) possibleTypes.push(SectorConstants.SECTOR_TYPE_RESIDENTIAL);
				if (centrality < 0.5) possibleTypes.push(SectorConstants.SECTOR_TYPE_RESIDENTIAL);
			}

			// - industrial: away from top and world zone center
			if (levelVO.level < topLevel - 1) {
				if (levelVO.notCampableReason == LevelConstants.UNCAMPABLE_LEVEL_TYPE_POLLUTION) possibleTypes.push(SectorConstants.SECTOR_TYPE_INDUSTRIAL);
				if (levelVO.notCampableReason == LevelConstants.UNCAMPABLE_LEVEL_TYPE_RADIATION) possibleTypes.push(SectorConstants.SECTOR_TYPE_INDUSTRIAL);
				if (levelVO.level < topLevel - 1) possibleTypes.push(SectorConstants.SECTOR_TYPE_INDUSTRIAL);
				if (Math.abs(position.sectorY) > 5) possibleTypes.push(SectorConstants.SECTOR_TYPE_INDUSTRIAL);
			}

			// - commercial: near world zone centers
			if (levelVO.level != 14) {
				possibleTypes.push(SectorConstants.SECTOR_TYPE_COMMERCIAL);
				possibleTypes.push(SectorConstants.SECTOR_TYPE_COMMERCIAL);
			}
			if (centrality > 0.5) possibleTypes.push(SectorConstants.SECTOR_TYPE_COMMERCIAL);

			// - public: particularly on dictatorship and recent levels
			if (centrality > 0.25) possibleTypes.push(SectorConstants.SECTOR_TYPE_PUBLIC);
			if (levelVO.level < 10 || levelVO.level >= 20) possibleTypes.push(SectorConstants.SECTOR_TYPE_PUBLIC);

			// - maintenance/empty: rare, but sometimes far from centers
			if (levelVO.level < topLevel - 2 && levelVO.level > 3 && centrality < 0.5 && levelVO.habitability < 1) {
				if (stage == WorldConstants.CAMP_STAGE_LATE) possibleTypes.push(SectorConstants.SECTOR_TYPE_MAINTENANCE);
				if (centrality < 0.25) possibleTypes.push(SectorConstants.SECTOR_TYPE_EMPTY);
			}

			// - positions near certain features
			if (this.isDistrictNearFeature(WorldConstants.FEATURE_HOLE_WELL, levelVO, position, positions)) {
				possibleTypes.push(SectorConstants.SECTOR_TYPE_RESIDENTIAL);
				possibleTypes = possibleTypes.filter(t => t != SectorConstants.SECTOR_TYPE_EMPTY && t != SectorConstants.SECTOR_TYPE_MAINTENANCE && t != SectorConstants.SECTOR_TYPE_INDUSTRIAL);
			} else if (this.isDistrictNearFeature(WorldConstants.FEATURE_HOLE_MOUNTAIN, levelVO, position, positions)) {
				possibleTypes.push(SectorConstants.SECTOR_TYPE_INDUSTRIAL);
			} else if (this.isDistrictNearFeature(WorldConstants.FEATURE_STRUCTURE_GIGA_CENTER, levelVO, position, positions)) {
				possibleTypes.push(SectorConstants.SECTOR_TYPE_INDUSTRIAL);
			}

			// - make previous one less likely to avoid repetition
			if (previousType && possibleTypes.length > 1) {
				let index = possibleTypes.indexOf(previousType);
				while (index >= 0 && possibleTypes.length > 1) {
					possibleTypes.splice(index, 1);
					index = possibleTypes.indexOf(previousType);
				}
			}

			return WorldCreatorRandom.randomItemFromArray(levelVO.level * 100 + i, possibleTypes);
		},

		isDistrictNearFeature: function (featureType, levelVO, position, positions) {
			// this is a bit of an educated guess since we don't know the size of the districts yet so what district the feature ends up being a part of is not guaranteed
			let distance = levelVO.getDistanceToFeature(position, featureType); 
			if (distance < 5) return true;
			if (distance > 30) return false;
			
			let closestPositions = positions.filter(pos => levelVO.getDistanceToFeature(pos, featureType) >= 0).sort(pos => levelVO.getDistanceToFeature(pos, featureType));
			if (closestPositions.length == 0) return false;

			return closestPositions[0].equals(position);
		},

		getDistrictAffiliation: function (levelVO, type, i) {
			let topLevel = WorldCreatorHelper.getHighestLevel(levelVO.seed);

			if (levelVO.level == this.CITY_STATE_LEVEL) return null;

			if (levelVO.level == topLevel) return null;

			let possibleResults = [ null ];

			if (type == SectorConstants.SECTOR_TYPE_INDUSTRIAL) {
				possibleResults.push(SectorConstants.SECTOR_AFFILIATION_AGRICORP);
				if (levelVO.level < topLevel - 3) possibleResults.push(SectorConstants.SECTOR_AFFILIATION_MINECORP);
			}

			if (type == SectorConstants.SECTOR_TYPE_RESIDENTIAL) {
				if (levelVO.level > 15 && levelVO.level < topLevel - 2) {
					possibleResults.push(SectorConstants.SECTOR_AFFILIATION_HANSA);
				}

				if (levelVO.level < topLevel - 3) {
					if (i > 0) possibleResults.push(SectorConstants.SECTOR_AFFILIATION_DONBALISM);
				}
			}

			return WorldCreatorRandom.randomItemFromArray(levelVO.seed + levelVO.level * 70 + i, possibleResults);
		},

		getDistrictWear: function (levelVO, type, i) {
			let topLevel = WorldCreatorHelper.getHighestLevel(levelVO.seed);
			let bottomLevel = WorldCreatorHelper.getBottomLevel(levelVO.seed);

			let levelWear = MathUtils.map(levelVO.level, bottomLevel + 1, topLevel - 3, 10, 0);
			let wear = levelWear;

			// some districts (especially industry) were built recently on top of old infrastructure
			let isRecentProbability = 0;
			if (type == SectorConstants.SECTOR_TYPE_INDUSTRIAL) isRecentProbability = 0.5;
			if (type == SectorConstants.SECTOR_TYPE_MAINTENANCE) isRecentProbability = 0.75;
			if (type == SectorConstants.SECTOR_TYPE_EMPTY) isRecentProbability = 0.25;
			let isRecent = WorldCreatorRandom.randomBool(levelVO.level + i, isRecentProbability);
			if (isRecent) wear = Math.min(wear, 2);

			// some districts are still inhabited and maintained by dark dwellers
			let isInhabitedProbability = 0;
			if (type == SectorConstants.SECTOR_TYPE_RESIDENTIAL) isInhabitedProbability = 0.2;
			if (type == SectorConstants.SECTOR_TYPE_COMMERCIAL) isInhabitedProbability = 0.3;
			if (type == SectorConstants.SECTOR_TYPE_PUBLIC) isInhabitedProbability = 0.1;
			let isInhabited = WorldCreatorRandom.randomBool(levelVO.level * 100 + i * 2, isInhabitedProbability);
			if (isInhabited) wear = Math.min(wear, 6);

			return MathUtils.clamp(Math.round(wear), 0, 10);
		},

		getDistrictWealth: function (levelVO, type, position, positions, i) {
			if (type == SectorConstants.SECTOR_TYPE_EMPTY) return 0;
			if (type == SectorConstants.SECTOR_TYPE_MAINTENANCE) return 5;

			let topLevel = WorldCreatorHelper.getHighestLevel(levelVO.seed);

			let min = 1;
			let max = 10;

			if (levelVO.level > topLevel - 3) {
				// near surface
				min = Math.max(min, 5);
				max = 10;
			} else if (levelVO.campOrdinal > 12) {
				// between surface and slums
				min = 4;
				max = 8;
			} else if (levelVO.level > 14) {
				// slums
				min = 1;
				max = 4;
			} else if (levelVO.level > 10) {
				// dark levels, city states and chaos
				min = 1;
				max = 9;
			} else if (levelVO.level > 3) {
				// dictatorship
				min = 3;
				max = 8;
			} else {
				// near ground, anything but extreme luxury
				min = 1;
				max = 8;
			}

			if (type == SectorConstants.SECTOR_TYPE_COMMERCIAL) {
				min = Math.max(min, 3);
			}

			if (type == SectorConstants.SECTOR_TYPE_INDUSTRIAL) {
				min = Math.max(min, 3);
				max = Math.min(max, 7);
			}

			if (type == SectorConstants.SECTOR_TYPE_PUBLIC) {
				min = Math.max(min, 4);
				max = Math.min(max, 8);
			}

			if (levelVO.level == this.CITY_STATE_LEVEL) {
				min = Math.max(min, 4);
			}

			if (this.isDistrictNearFeature(WorldConstants.FEATURE_HOLE_WELL, levelVO, position, positions)) {
				min = 4;
				max = Math.max(min, max);
				max++;
			}

			let result = WorldCreatorRandom.randomInt(levelVO.seed % 33 + levelVO.level + i * 3, min, max + 1);

			return MathUtils.clamp(result, 1, 10);
		},

		getDistrictSize: function (levelVO, type, wealth, wear, position) {
			let result = 1;

			let isReuse = levelVO.level < 18 && wear < 5 && type == SectorConstants.SECTOR_TYPE_INDUSTRIAL;
			
			if (type == SectorConstants.SECTOR_TYPE_RESIDENTIAL) result *= 1.5;
			if (type == SectorConstants.SECTOR_TYPE_MAINTENANCE) result *= 0.5;
			if (type == SectorConstants.SECTOR_TYPE_COMMERCIAL) result *= 0.5;

			if (!isReuse) {
				let centrality = WorldCreatorHelper.getPositionCentrality(position);
				if (centrality > 0.75) result = result *= 0.5;
				if (centrality < 0.25) result = result *= 1.25;
			}

			if (wealth < 3) result = result * 0.9;
			if (wealth > 7) result = result * 0.9;
			if (wealth > 8) result = result * 0.9;
			if (wealth > 9) result = result * 0.9;

			return Math.round(result * 20) / 20;
		},

		getDistrictStyle: function (levelVO, stage, type, wealth, affiliation, i) {
			let possibleResults = [];

			if (levelVO.level == this.CITY_STATE_LEVEL && stage == WorldConstants.CAMP_STAGE_LATE) {
				possibleResults.push(SectorConstants.STYLE_KIEVAN);
				possibleResults.push(SectorConstants.STYLE_CITTADINIAN);
				return WorldCreatorRandom.randomItemFromArray(levelVO.seed, possibleResults);
			}

			possibleResults.push(levelVO.levelStyle);
			possibleResults.push(levelVO.levelStyle);

			if (wealth < 4) possibleResults.push(SectorConstants.STYLE_SLUM_GENERAL);
			if (wealth < 4 && i > 0) possibleResults.push(SectorConstants.STYLE_SLUM_HUN);
			if (type == SectorConstants.SECTOR_TYPE_INDUSTRIAL) possibleResults.push(SectorConstants.STYLE_INDUSTRIAL);
			if (type == SectorConstants.SECTOR_TYPE_MAINTENANCE) possibleResults.push(SectorConstants.STYLE_HUMANIST);
			if (type == SectorConstants.SECTOR_TYPE_PUBLIC && levelVO.level > 12) possibleResults.push(SectorConstants.STYLE_HUMANIST);
			if (type == SectorConstants.SECTOR_TYPE_RESIDENTIAL && levelVO.level > 16 && wealth > 3) possibleResults.push(SectorConstants.STYLE_NEOWESTERN);
			if (type == SectorConstants.SECTOR_TYPE_COMMERCIAL && levelVO.level > 18) possibleResults.push(SectorConstants.STYLE_MODERN);
			if (levelVO.level < 3) possibleResults.push(SectorConstants.STYLE_WESTERN);
			if (affiliation == SectorConstants.SECTOR_AFFILIATION_AGRICORP) possibleResults.push(SectorConstants.STYLE_HUMANIST);
			if (affiliation == SectorConstants.SECTOR_AFFILIATION_MINECORP) possibleResults.push(SectorConstants.STYLE_INDUSTRIAL);
			if (levelVO.level > 1 && levelVO.level < 10) possibleResults.push(SectorConstants.STYLE_KARBOQUE);

			// TODO figure out when to use STYLE_CITTADINIAN, STYLE_KIEVAN

			return WorldCreatorRandom.randomItemFromArray(levelVO.seed / 2 + levelVO.level * 3 + i, possibleResults);
		},
		
		getLevelPOICenterPosition: function (worldVO, levelVO) {
			let pois = [];
			if (levelVO.isCampable) {
				pois.push(levelVO.levelMapCenterPosition);
				pois.push(levelVO.campPosition);
			} else {
				if (levelVO.passageUpPosition) pois.push(levelVO.passageUpPosition);
				if (levelVO.passageDownPosition) pois.push(levelVO.passageDownPosition);
			}
			let result = PositionConstants.getMiddlePoint(pois, true);
			return result;
		},
		
		getNumInvestigateSectors: function (seed, level) {
			let topLevel = WorldCreatorHelper.getHighestLevel(seed);
			return WorldConstants.getNumInvestigateSectors(level, topLevel);
		},

		getWorkshopResource: function (seed, worldVO, levelTemplateVO, levelVO) {
			if (levelTemplateVO && levelTemplateVO.workshopResource) return levelTemplateVO.workshopResource;

			let campOrdinal = levelVO.campOrdinal;
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
		
		getLuxuryResources: function (seed, level, campOrdinal, previousLevels) {
			let possibleLuxuries = TribeConstants.getPossibleLuxuriesByCampOrdinal(campOrdinal);
			if (possibleLuxuries.length == 0) return [];
			
			let levelIndex = WorldCreatorHelper.getLevelIndexForCamp(seed, campOrdinal, level);
			let maxLevelIndex = WorldCreatorHelper.getMaxLevelIndexForCamp(seed, campOrdinal, level);
			maxLevelIndex = Math.min(maxLevelIndex, 1); // don't allow luxury resources on level 14
			
			let luxuryResourceLevelIndex = WorldCreatorRandom.randomInt(1000 + seed + campOrdinal * 752, 0, maxLevelIndex + 1);
			let isLuxuryResourceFoundOnThisLevel = levelIndex == luxuryResourceLevelIndex;
			
			if (!isLuxuryResourceFoundOnThisLevel) return [];
			
			let validLuxuries = possibleLuxuries.concat();
			for (let level in previousLevels) {
				for (let j = 0; j < previousLevels[level].luxuryResources.length; j++) {
					let previousLuxury = previousLevels[level].luxuryResources[j];
					let index = validLuxuries.indexOf(previousLuxury);
					if (index >= 0) {
						validLuxuries.splice(index, 1);
					}
				}
			}
			
			if (validLuxuries.length == 0) {
				WorldCreatorLogger.w("no valid luxury resources for level " + level + " camp ordinal " + campOrdinal + " - picking from all");
				validLuxuries = Object.values(TribeConstants.luxuryType);
			}
			
			let selectedLuxury = WorldCreatorRandom.randomItemFromArray(seed, validLuxuries);
			
			return [ selectedLuxury ];
		},

		getLevelArchitecturalStyle: function (seed, levelVO) {
			let topLevel = WorldCreatorHelper.getHighestLevel(seed);

			if (levelVO.level < 3) return SectorConstants.STYLE_WESTERN;
			if (levelVO.level == 14) return SectorConstants.STYLE_INDUSTRIAL;
			if (levelVO.level == 13) return SectorConstants.STYLE_HUMANIST;
			if (levelVO.level == topLevel) return SectorConstants.STYLE_MODERN;
			if (levelVO.isCampable && levelVO.campOrdinal == 12) return SectorConstants.STYLE_NEOWESTERN;

			let possibleTypes = [];

			if (levelVO.notCampableReason == LevelConstants.UNCAMPABLE_LEVEL_TYPE_POLLUTION) possibleTypes.push(SectorConstants.STYLE_INDUSTRIAL);
			if (levelVO.notCampableReason == LevelConstants.UNCAMPABLE_LEVEL_TYPE_RADIATION) possibleTypes.push(SectorConstants.STYLE_INDUSTRIAL);

			if (levelVO.level >= 12) {
				possibleTypes.push(SectorConstants.STYLE_HUMANIST);
				possibleTypes.push(SectorConstants.STYLE_HUMANIST);
			}
			
			if (levelVO.level <= 12) possibleTypes.push(SectorConstants.STYLE_KARBOQUE);
			if (levelVO.level <= 8) possibleTypes.push(SectorConstants.STYLE_KARBOQUE);

			if (levelVO.level >= 18) possibleTypes.push(SectorConstants.STYLE_MODERN);
			if (levelVO.level >= 14 && levelVO.isCampable) possibleTypes.push(SectorConstants.STYLE_NEOWESTERN);
			
			return WorldCreatorRandom.randomItemFromArray(seed + levelVO.level, possibleTypes);
		},
		
	};
	
	return LevelSkeletonGenerator;
});
