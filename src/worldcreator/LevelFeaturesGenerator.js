// creates LevelVOs and their features apart from specific sectors
define([
	'ash',
	'game/constants/PositionConstants',
	'game/constants/TribeConstants',
	'game/constants/WorldConstants',
	'game/vos/PositionVO',
	'worldcreator/WorldCreatorConstants',
	'worldcreator/WorldCreatorHelper',
	'worldcreator/WorldCreatorLogger',
	'worldcreator/WorldCreatorRandom',
	'worldcreator/LevelVO',
], function (Ash, PositionConstants, TribeConstants, WorldConstants, PositionVO, WorldCreatorConstants, WorldCreatorHelper, WorldCreatorLogger, WorldCreatorRandom, LevelVO) {
	
	let LevelFeaturesGenerator = {

		generate: function (seed, worldVO) {
			let topLevel = worldVO.topLevel;
			let bottomLevel = worldVO.bottomLevel;

			for (let l = topLevel; l >= bottomLevel; l--) {
				let levelVO = new LevelVO(l);

				this.generateLevel(seed, worldVO, levelVO);

				worldVO.levels[levelVO.level] = levelVO;
			}
		},

		generateLevel: function (seed, worldVO, levelVO) {
			let l = levelVO.level;

			let levelOrdinal = WorldCreatorHelper.getLevelOrdinal(seed, l);
			let campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, l);
			let isCampableLevel = WorldCreatorHelper.isCampableLevel(seed, l);

			// basic stuff that does not need to change once generated
			levelVO.levelOrdinal = levelOrdinal;
			levelVO.campOrdinal = campOrdinal;
			levelVO.isCampable = isCampableLevel;
			levelVO.isHard = WorldCreatorHelper.isHardLevel(seed, l);
			levelVO.notCampableReason = isCampableLevel ? null : WorldCreatorHelper.getNotCampableReason(seed, l);
			levelVO.habitability = isCampableLevel ? WorldCreatorConstants.getHabitability(campOrdinal) : 0;
			levelVO.raidDangerFactor = isCampableLevel ? WorldCreatorConstants.getRaidDangerFactor(campOrdinal) : 0;

			let numSectors = WorldCreatorHelper.getNumSectorsForLevel(seed, l);
			levelVO.numSectors = numSectors;
			levelVO.maxSectors = numSectors + WorldCreatorConstants.getMaxSectorOverflow(levelOrdinal);
			
			levelVO.campPosition = worldVO.campPositions[l];
			levelVO.passageUpPosition = worldVO.passagePositions[l].up;
			levelVO.passageUpType = worldVO.passageTypes[l].up;
			levelVO.passageDownPosition = worldVO.passagePositions[l].down;
			levelVO.passageDownType = worldVO.passageTypes[l].down;
			levelVO.passagePositions = [];
			if (levelVO.passageUpPosition) levelVO.passagePositions.push(levelVO.passageUpPosition);
			if (levelVO.passageDownPosition) levelVO.passagePositions.push(levelVO.passageDownPosition);
			levelVO.numSectorsByStage[WorldConstants.CAMP_STAGE_EARLY] = WorldCreatorHelper.getNumSectorsForLevelStage(worldVO.seed, levelVO.campOrdinal, levelVO.level, WorldConstants.CAMP_STAGE_EARLY);
			levelVO.numSectorsByStage[WorldConstants.CAMP_STAGE_LATE] = WorldCreatorHelper.getNumSectorsForLevelStage(worldVO.seed, levelVO.campOrdinal, levelVO.level, WorldConstants.CAMP_STAGE_LATE);
			levelVO.stageCenterPositions = this.getStageCenterPositions(worldVO, levelVO);
			levelVO.levelCenterPosition = this.getLevelCenterPosition(worldVO, levelVO);
			levelVO.excursionStartPosition = this.getExcursionStartPosition(worldVO, levelVO);
			levelVO.seaPadding = this.getSeaPadding(seed, levelVO);

			// stuff that might need to be adjusted on worlds from old saves
			levelVO.numInvestigateSectors = this.getNumInvestigateSectors(seed, l);
			levelVO.luxuryResources = this.getLuxuryResources(seed, l, campOrdinal, worldVO.levels);
		},
		
		getStageCenterPositions: function (worldVO, levelVO) {
			let result = {};
			var level = levelVO.level;
			var stages = worldVO.getStages(level);
			if (stages.length == 1) {
				result[WorldConstants.CAMP_STAGE_EARLY] = [];
				result[WorldConstants.CAMP_STAGE_LATE] = [];
				result[stages[0].stage].push(new PositionVO(level, 0, 0));
			} else {
				for (let i = 0; i < stages.length; i++) {
					var stageVO = stages[i];
					var positions = [];
					switch (stageVO.stage) {
						case WorldConstants.CAMP_STAGE_EARLY:
							positions.push(levelVO.campPosition);
							if (level < 13 && levelVO.passageUpPosition) {
								positions.push(levelVO.passageUpPosition);
							}
							if (level > 13 && levelVO.passageDownPosition) {
								positions.push(levelVO.passageDownPosition);
							}
							if (level == 13) {
								let pd2c = PositionConstants.subtract(levelVO.campPosition, levelVO.passageDownPosition);
								let pu2c = PositionConstants.subtract(levelVO.campPosition, levelVO.passageUpPosition);
								let total = PositionConstants.add(pd2c, pu2c);
								let unit = PositionConstants.getUnitPosition(total);
								let secondaryCenter = PositionConstants.multiply(unit, 5, true);
								positions.push(secondaryCenter);
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
		
		getLevelCenterPosition: function (worldVO, levelVO) {
			var pois = [];
			if (levelVO.isCampable) {
				pois.push(new PositionVO(levelVO.level, 0, 0));
				pois.push(levelVO.campPosition);
			} else {
				if (levelVO.passageUpPosition) pois.push(levelVO.passageUpPosition);
				if (levelVO.passageDownPosition) pois.push(levelVO.passageDownPosition);
			}
			let result = PositionConstants.getMiddlePoint(pois, true);
			return result;
		},
		
		getExcursionStartPosition: function (worldVO, levelVO) {
			if (levelVO.isCampable) {
				return levelVO.campPosition;
			}
			if (levelVO.level < 13) {
				return levelVO.passageUpPosition;
			}
			return levelVO.passageDownPosition;
		},
		
		getNumInvestigateSectors: function (seed, level) {
			let topLevel = WorldCreatorHelper.getHighestLevel(seed);
			return WorldConstants.getNumInvestigateSectors(level, topLevel);
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
			
			let selectedLuxury = WorldCreatorRandom.getRandomItemFromArray(seed / 2 + 100 + campOrdinal * 77, validLuxuries);
			
			return [ selectedLuxury ];
		},
		
		getSeaPadding: function (seed, levelVO) {
			let bottomLevel = WorldCreatorHelper.getBottomLevel(seed);
			let isBottomLevel = bottomLevel == levelVO.level;
			let s1 = 5000 + seed % 1000 + (levelVO.level + 5) * 471;
			let min = Math.floor(levelVO.level / 7);
			if (isBottomLevel) {
				min = 3;
			}
			let max = Math.max(min + 3, 3);
			let result = WorldCreatorRandom.randomInt(s1, min, max);
			return result;
		}
		
	};
	
	return LevelFeaturesGenerator;
});
