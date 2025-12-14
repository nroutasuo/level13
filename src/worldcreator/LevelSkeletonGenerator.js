// creates LevelVOs and any details about them that do not require structure and sectors
define([
	'ash',
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
], function (Ash, LevelConstants, PositionConstants, SectorConstants, TribeConstants, WorldConstants, PositionVO, WorldCreatorConstants, WorldCreatorHelper, WorldCreatorLogger, WorldCreatorRandom, LevelVO) {
	
	let LevelSkeletonGenerator = {

		generate: function (seed, worldVO, worldTemplateVO) {
			let topLevel = worldVO.topLevel;
			let bottomLevel = worldVO.bottomLevel;

			for (let l = topLevel; l >= bottomLevel; l--) {
				let levelVO = new LevelVO(l);
				levelVO.seed = seed;
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
			levelVO.stageCenterPositions = this.getStageCenterPositions(worldVO, levelVO);
			levelVO.levelCenterPosition = this.getLevelCenterPosition(worldVO, levelVO);
			levelVO.workshopResource = this.getWorkshopResource(seed, worldVO, levelTemplateVO, levelVO);

			// story stuff 
			levelVO.levelStyle = levelTemplateVO.levelStyle || this.getLevelArchitecturalStyle(seed, levelVO);
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
