// Helper functions for SectorVO features during world generation
define([
	'ash',
	'game/GameGlobals',
	'worldcreator/WorldCreatorConstants',
	'game/constants/LevelConstants',
	'game/constants/MovementConstants',
	'game/constants/PositionConstants',
	'game/constants/SectorConstants',
	'game/constants/WorldConstants',
	'worldcreator/WorldCreatorLogger',
], function (Ash, GameGlobals, WorldCreatorConstants, LevelConstants, MovementConstants, PositionConstants, SectorConstants, WorldConstants, WorldCreatorLogger) {

	let SectorGeneratorHelper = {

		addLocale: function (levelVO, sectorVO, localeVO) {
			sectorVO.locales.push(localeVO);
			levelVO.localeSectors.push(sectorVO);

			// let localeFeatures = [];
			// if (localeVO.hasBlueprints) localeFeatures.push("blueprints");
			// if (localeVO.explorerID) localeFeatures.push("explorer:" + localeVO.explorerID);
			// if (localeVO.luxuryResource) localeFeatures.push("resource:" + localeVO.luxuryResource);

			// WorldCreatorLogger.i("add locale " + sectorVO.position + ": " + localeVO.type + " (" + localeFeatures.join(",") +")");
		},

		getLevelBlockerTypes: function (worldVO, levelVO, campStage) {
			var levelOrdinal = levelVO.levelOrdinal;
			var campOrdinal = levelVO.campOrdinal;
			let isSurfaceLevel = levelVO.level === worldVO.topLevel;
			var isPollutedLevel = levelVO.notCampableReason === LevelConstants.UNCAMPABLE_LEVEL_TYPE_POLLUTION;
			var isRadiatedLevel = levelVO.notCampableReason === LevelConstants.UNCAMPABLE_LEVEL_TYPE_RADIATION;

			let blockerTypes = [];

			blockerTypes.push(MovementConstants.BLOCKER_TYPE_DEBRIS);
			blockerTypes.push(MovementConstants.BLOCKER_TYPE_DEBRIS);

			if (levelVO.level < 13 && campOrdinal < 6) {
				blockerTypes.push(MovementConstants.BLOCKER_TYPE_EXPLOSIVES);
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
					blockerTypes.push(MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE);
				}
			}

			if (levelVO.isCampable && campOrdinal > WorldConstants.CAMPS_BEFORE_GROUND && !isSurfaceLevel) {
				blockerTypes.push(MovementConstants.BLOCKER_TYPE_TOLL_GATE);

				if (levelVO.habitability >= 1) {
					blockerTypes.push(MovementConstants.BLOCKER_TYPE_TOLL_GATE);
				}
			}
			
			return blockerTypes;
		},

		getSectorDistanceToLevelEdge: function (levelVO, sectorVO) {
			let x = sectorVO.position.sectorX;
			let y = sectorVO.position.sectorY;
			return Math.min(Math.abs(y - levelVO.minY), Math.abs(y - levelVO.maxY), Math.abs(x - levelVO.minX), Math.abs(x - levelVO.maxX));
		},
		
		addMovementBlocker: function (worldVO, levelVO, sectorVO, neighbourVO, blockerType, options, sectorcb, cb) {
			var direction = PositionConstants.getDirectionFrom(sectorVO.position, neighbourVO.position);
			var neighbourDirection = PositionConstants.getDirectionFrom(neighbourVO.position, sectorVO.position);

			if (sectorVO.position.sectorX == -7 && sectorVO.position.sectorY == -1) debugger
			if (neighbourVO.position.sectorX == -7 && neighbourVO.position.sectorY == -1) debugger

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

			let allowedCriticalPathTypes = options.allowedCriticalPathTypes || [ WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_2 ];
			let allowedForGangs = [ WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_2, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE ];

			for (let i = 0; i < sectorVO.criticalPathTypes.length; i++) {
				var pathType = sectorVO.criticalPathTypes[i];
				if (allowedCriticalPathTypes && allowedCriticalPathTypes.indexOf(pathType) >= 0) continue;
				if (blockerType === MovementConstants.BLOCKER_TYPE_GANG && allowedForGangs.indexOf(pathType) >= 0) continue;
				for (let j = 0; j < neighbourVO.criticalPathTypes.length; j++) {
					if (pathType === neighbourVO.criticalPathTypes[j]) {
						if (!options.skipWarnings) WorldCreatorLogger.w("skipping movement blocker on critical path: " + pathType + " (type: " + blockerType + ")");
						return false;
					}
				}
			}
					
			// add blocker
			sectorVO.addBlocker(direction, blockerType);
			neighbourVO.addBlocker(neighbourDirection, blockerType);

			//WorldCreatorLogger.i("add movement blocker " + blockerType + " at " + sectorVO.position);

			// add blockers to adjacent paths too (if present) so player can't just walk around the blocker
			if (options.addDiagonals) {
				var diagonalsOptions = Object.assign({}, options);
				diagonalsOptions.addDiagonals = true;
				diagonalsOptions.skipWarnings = true;
				let nextNeighbours = levelVO.getNextNeighbours(sectorVO, direction);
				for (let j = 0; j < nextNeighbours.length; j++) {
					this.addMovementBlocker(worldVO, levelVO, sectorVO, nextNeighbours[j], blockerType, diagonalsOptions, sectorcb);
				}
				let nextNeighbours2 = levelVO.getNextNeighbours(neighbourVO, neighbourDirection);
				for (let j = 0; j < nextNeighbours2.length; j++) {
					if (nextNeighbours.indexOf(nextNeighbours2[j]) >= 0) continue;
					this.addMovementBlocker(worldVO, levelVO, neighbourVO, nextNeighbours2[j], blockerType, diagonalsOptions, sectorcb);
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

		isValidSectorForLocale: function (sectorVO) {
			if (sectorVO.isCamp) return false;
			if (sectorVO.isPassageUp) return false;
			if (sectorVO.isPassageDown) return false;
			return true;
		}
		
	};

	return SectorGeneratorHelper;
});
