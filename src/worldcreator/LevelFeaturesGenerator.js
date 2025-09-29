// generates level-wide features that require structure and/or SectorVOs to have been generated first
define([
	'ash',
	'game/constants/PositionConstants',
	'game/constants/WorldConstants',
	'worldcreator/WorldCreatorConstants',
	'worldcreator/WorldCreatorHelper',
	'worldcreator/WorldCreatorLogger',
	'worldcreator/WorldCreatorRandom',
	'worldcreator/LevelVO',
], function (Ash, PositionConstants, WorldConstants, WorldCreatorConstants, WorldCreatorHelper, WorldCreatorLogger, WorldCreatorRandom, LevelVO) {
	
	let LevelFeaturesGenerator = {

		generate: function (seed, worldVO, worldTemplateVO, levels) {
			for (let i = 0; i < levels.length; i++) {
				let l = levels[i];
				let levelVO = worldVO.levels[l];
				let levelTemplateVO = worldTemplateVO.levels[l] || { sectors: [] };

				this.generateLevel(seed, worldVO, levelTemplateVO, levelVO);
			}
		},

		generateLevel: function (seed, worldVO, levelTemplateVO, levelVO) {
			levelVO.additionalCampPositions = this.getAdditionalCampPositions(seed, worldVO, levelTemplateVO, levelVO);

			this.generateZones(seed, worldVO, levelTemplateVO, levelVO);
			this.generateBuildingProjectSpots(seed, worldVO, levelTemplateVO, levelVO);
		},
		
		getAdditionalCampPositions: function (seed, worldVO, levelTemplateVO, levelVO) {
			let result = [];

			if (levelVO.level == 13) return result;
			if (!levelVO.isCampable) return result;
			
			let validSectors = [];
			let numPositions = 3;

			if (levelTemplateVO.additionalCampPositions) {
				validSectors = levelTemplateVO.additionalCampPositions.map(pos => levelVO.getSectorByPos(pos));
				numPositions = levelTemplateVO.additionalCampPositions.length;
			} else {
			
				let isSurfaceLevel = levelVO.level === worldVO.topLevel;
				let campOrdinal = levelVO.campOrdinal;
				let minPathlenC2P = 3;
				let maxPathLenC2P = WorldCreatorConstants.getMaxPathLength(campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE);
				
				let isValidAdditionalCampPosition = function (sectorVO) {
					if (sectorVO.isCamp) return false;
					if (sectorVO.isPassageUp || sectorVO.isPassageDown) return false;
					if (sectorVO.stage != WorldConstants.CAMP_STAGE_EARLY) return false;
					if (sectorVO.sunlit && !isSurfaceLevel) return false;
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
				
				for (var s = 0; s < levelVO.sectors.length; s++) {
					var sectorVO = levelVO.sectors[s];
					if (!isValidAdditionalCampPosition(sectorVO)) continue;
					validSectors.push(sectorVO);
					let distanceToCamp = WorldCreatorHelper.getDistanceToCamp(worldVO, levelVO, sectorVO);
					let numNeighboursWeighted = levelVO.getNeighbourCountWeighted(sectorVO.position.sectorX, sectorVO.position.sectorY);
					sectorVO.campPosScore = numNeighboursWeighted * 3 - distanceToCamp;
				}
				
				validSectors.sort(function (a, b) { return b.campPosScore - a.campPosScore });
			}
			
			for (let i = 0; i < numPositions; i++) {
				if (!validSectors[i]) break;
				validSectors[i].isCamp = true;
				result.push(validSectors[i].position)
			}

			return result;
		},
		
		generateZones: function (seed, worldVO, levelTemplateVO, levelVO) {
			let level = levelVO.level;
			let bottomLevel = worldVO.bottomLevel;
			let isCampableLevel = levelVO.isCampable;
			let isGoingDown = level <= 13 && level >= bottomLevel;
			let passageUp = levelVO.getSectorByPos(levelVO.passageUpPosition);
			let passageDown = levelVO.getSectorByPos(levelVO.passageDownPosition);
			let passage1 = isGoingDown ? passageUp : passageDown;
			let passage2 = isGoingDown ? passageDown : passageUp;

			WorldCreatorHelper.copyValueForAllSectors(levelTemplateVO, levelVO, "zone");
			
			let setSectorZone = function (sector, zone, force) {
				if (!sector) return;
				let existingZone = sector.zone;
				if (existingZone) {
					var existingIndex = WorldCreatorConstants.getZoneOrdinal(existingZone);
					var newIndex = WorldCreatorConstants.getZoneOrdinal(zone);
					if (existingIndex <= newIndex) return;
				}
				let stage = sector.stage;
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
			
			let setAreaZone = function (sector, zone, area, forceArea) {
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
			
			let setPathZone = function (path, zone, areaMin, areaMax, forceArea) {
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
					let pathPassageToPassage = WorldCreatorRandom.findPath(worldVO, passage1.position, passage2.position, false, true);
					setPathZone(pathPassageToPassage, WorldConstants.ZONE_PASSAGE_TO_PASSAGE, 1, 3, true);
				}
				// - ground level: all ZONE_POI_2
				if (level == bottomLevel) {
					// TODO should be just the path from passage1 to grove instead but currently we don't know the grove position at this point
					setAreaZone(passage1, WorldConstants.ZONE_POI_2, 50, true);
				}
				// - rest is ZONE_EXTRA_UNCAMPABLE
				for (let i = 0; i < levelVO.sectors.length; i++) {
					let sector = levelVO.sectors[i];
					setSectorZone(sector, WorldConstants.ZONE_EXTRA_UNCAMPABLE, true);
				}
			}
		},
		
		generateBuildingProjectSpots: function (seed, worldVO, levelTemplateVO, levelVO) {
			let l = levelVO.level;
			
			if (l == 14) {
				let numSectors = 3;

				let sectors = [];
				let existingSectors = WorldCreatorHelper.getSectorsByTemplateFeature(levelTemplateVO, levelVO, "hasTradeConnectorSpot");
				sectors.push(...existingSectors);

				let numNewSectors = numSectors - sectors.length;
				if (numNewSectors > 0) {
					let excludedZones = [ WorldConstants.ZONE_PASSAGE_TO_CAMP, WorldConstants.ZONE_CAMP_TO_PASSAGE, WorldConstants.ZONE_EXTRA_CAMPABLE ];
					let options = { excludingFeature: "isCamp", excludedZones: excludedZones };
					let newSectors = WorldCreatorRandom.randomSectors(seed / 2 + 1111, worldVO, levelVO, numNewSectors, numNewSectors + 1, options);
					sectors.push(...newSectors);
				}

				for (let i = 0; i < sectors.length; i++) {
					sectors[i].hasTradeConnectorSpot = true;
					WorldCreatorLogger.i("tradeConnectorSpot: " + sectors[i].position);
				}
			}
		},
		
	};
	
	return LevelFeaturesGenerator;
});
