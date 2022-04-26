// Handles the first step of world generation, the abstract world template itself
define([
	'ash',
	'game/constants/FollowerConstants',
	'game/constants/PositionConstants',
	'game/constants/WorldConstants',
	'game/vos/PositionVO',
	'worldcreator/WorldCreatorConstants',
	'worldcreator/WorldCreatorHelper',
	'worldcreator/WorldCreatorRandom',
	'worldcreator/LevelVO',
	'worldcreator/ZoneVO',
], function (Ash, FollowerConstants, PositionConstants, WorldConstants, PositionVO, WorldCreatorConstants, WorldCreatorHelper, WorldCreatorRandom, LevelVO, ZoneVO) {
	
	var LevelGenerator = {
		
		prepareLevels: function (seed, worldVO) {
			var topLevel = WorldCreatorHelper.getHighestLevel(seed);
			var bottomLevel = WorldCreatorHelper.getBottomLevel(seed);
			
			for (var l = topLevel; l >= bottomLevel; l--) {
				var isCampableLevel = WorldCreatorHelper.isCampableLevel(seed, l);
				var isHardLevel = WorldCreatorHelper.isHardLevel(seed, l);
				var notCampableReason = isCampableLevel ? null : WorldCreatorHelper.getNotCampableReason(seed, l);
				var ordinal = WorldCreatorHelper.getLevelOrdinal(seed, l);
				var campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, l);
				var populationFactor = isCampableLevel ? WorldCreatorConstants.getPopulationFactor(campOrdinal) : 0;
				var raidDangerFactor = isCampableLevel ? WorldCreatorConstants.getRaidDangerFactor(campOrdinal) : 0;
				var numSectors = WorldCreatorHelper.getNumSectorsForLevel(seed, l);
				
				var levelVO = new LevelVO(l, ordinal, campOrdinal, isCampableLevel, isHardLevel, notCampableReason, populationFactor, raidDangerFactor, numSectors);
				levelVO.campPosition = worldVO.campPositions[l];
				levelVO.passageUpPosition = worldVO.passagePositions[l].up;
				levelVO.passageDownPosition = worldVO.passagePositions[l].down;
				levelVO.passagePositions = [];
				if (levelVO.passageUpPosition) levelVO.passagePositions.push(levelVO.passageUpPosition);
				if (levelVO.passageDownPosition) levelVO.passagePositions.push(levelVO.passageDownPosition);
				levelVO.numSectorsByStage[WorldConstants.CAMP_STAGE_EARLY] = WorldCreatorHelper.getNumSectorsForLevelStage(worldVO.seed, levelVO.campOrdinal, levelVO.level, WorldConstants.CAMP_STAGE_EARLY);
				levelVO.numSectorsByStage[WorldConstants.CAMP_STAGE_LATE] = WorldCreatorHelper.getNumSectorsForLevelStage(worldVO.seed, levelVO.campOrdinal, levelVO.level, WorldConstants.CAMP_STAGE_LATE);
				levelVO.stageCenterPositions = this.getStageCenterPositions(worldVO, levelVO);
				levelVO.levelCenterPosition = this.getLevelCenterPosition(worldVO, levelVO);
				levelVO.excursionStartPosition = this.getExcursionStartPosition(worldVO, levelVO);
				levelVO.zones = this.generateZones(seed, levelVO);
				levelVO.seaPadding = this.getSeaPadding(seed, levelVO);
				levelVO.predefinedFollowers = this.getPredefinedFollowers(seed, l);
				worldVO.addLevel(levelVO);
			}
		},
		
		generateZones: function (seed, levelVO) {
			let result = [];
			result.push(new ZoneVO(levelVO.campOrdinal, WorldConstants.ZONE_ENTRANCE));
			if (levelVO.isCampable) {
				if (levelVO.level != 13) {
					result.push(new ZoneVO(levelVO.campOrdinal, WorldConstants.ZONE_PASSAGE_TO_CAMP));
				}
				result.push(new ZoneVO(levelVO.campOrdinal, WorldConstants.ZONE_POI_1));
				result.push(new ZoneVO(levelVO.campOrdinal, WorldConstants.ZONE_POI_2));
				result.push(new ZoneVO(levelVO.campOrdinal, WorldConstants.ZONE_CAMP_TO_PASSAGE));
				result.push(new ZoneVO(levelVO.campOrdinal, WorldConstants.ZONE_EXTRA_CAMPABLE));
			} else {
				result.push(new ZoneVO(levelVO.campOrdinal, WorldConstants.ZONE_PASSAGE_TO_PASSAGE));
				result.push(new ZoneVO(levelVO.campOrdinal, WorldConstants.ZONE_EXTRA_UNCAMPABLE));
			}
			return result;
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
		
		getPredefinedFollowers: function (seed, level) {
			let result = [];
			let isCampableLevel = WorldCreatorHelper.isCampableLevel(seed, level);
			if (!isCampableLevel) return result;
			let campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, level);
			let follower = FollowerConstants.predefinedFollowers[campOrdinal];
			if (!follower) return [];
			return [ follower ];
		},
		
		getSeaPadding: function (seed, levelVO) {
			var bottomLevel = WorldCreatorHelper.getBottomLevel(seed);
			var isBottomLevel = bottomLevel == levelVO.level;
			var s1 = 5000 + seed % 1000 + (levelVO.level + 5) * 471;
			var min = Math.floor(levelVO.level / 7);
			if (isBottomLevel) {
				min = 3;
			}
			var max = Math.max(min + 3, 3);
			let result = WorldCreatorRandom.randomInt(s1, min, max);
			return result;
		}
		
	};
	
	return LevelGenerator;
});
