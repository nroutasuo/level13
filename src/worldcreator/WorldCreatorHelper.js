// Helper functions for the WorldCreator - stuff that may be useful outside of world creation as well
define([
	'ash',
	'game/GameGlobals',
	'game/vos/ResourcesVO',
	'worldcreator/WorldCreatorRandom',
	'worldcreator/WorldCreatorConstants',
	'game/constants/LevelConstants',
	'game/constants/PositionConstants',
	'game/constants/SectorConstants',
	'game/constants/WorldConstants',
], function (Ash, GameGlobals, ResourcesVO, WorldCreatorRandom, WorldCreatorConstants, LevelConstants, PositionConstants, SectorConstants, WorldConstants) {

	let WorldCreatorHelper = {
		
		camplessLevelOrdinals: {},
		hardLevelOrdinals: {},

		copyValueForAllSectors: function (levelTemplateVO, levelVO, key) {
			if (!levelTemplateVO || !levelTemplateVO.sectors) return;

			for (let i = 0; i < levelTemplateVO.sectors.length; i++) {
				let sectorTemplateVO = levelTemplateVO.sectors[i];
				if (sectorTemplateVO && sectorTemplateVO[key]) {
					let sectorVO = levelVO.getSectorByPos(sectorTemplateVO.position);
					if (sectorVO) sectorVO[key] = sectorTemplateVO[key];
				}
			}
		},

		getSectorsByTemplateFeature: function (levelTemplateVO, levelVO, feature) {
			let result = [];
			for (let i = 0; i < levelTemplateVO.sectors.length; i++) {
				let sectorTemplateVO = levelTemplateVO.sectors[i];
				if (sectorTemplateVO && sectorTemplateVO[feature]) {
					let sectorVO = levelVO.getSectorByPos(sectorTemplateVO.position);
					if (sectorVO) result.push(sectorVO);
				}
			}
			return result;
		},

		getLocaleDataFromTemplate: function (levelTemplateVO, levelVO, localeType, filter) {
			let result = [];
			for (let i = 0; i < levelTemplateVO.sectors.length; i++) {
				let sectorTemplateVO = levelTemplateVO.sectors[i];
				if (sectorTemplateVO && sectorTemplateVO.locales) {
					for (let j = 0; j < sectorTemplateVO.locales.length; j++) {
						let localeVO = sectorTemplateVO.locales[j];
						if (localeType && localeVO.type != localeType) continue;
						if (filter && !filter(localeVO)) continue;
						let sectorVO = levelVO.getSectorByPos(sectorTemplateVO.position);
						if (sectorVO) {
							result.push({ sectorVO: sectorVO, sectorTemplateVO: sectorTemplateVO, localeVO: localeVO });
						}
					}
				}
			}
			return result;
		},

		getStashDataFromTemplate: function (levelTemplateVO, levelVO) {
			let result = [];
			for (let i = 0; i < levelTemplateVO.sectors.length; i++) {
				let sectorTemplateVO = levelTemplateVO.sectors[i];
				if (sectorTemplateVO && sectorTemplateVO.stashes && sectorTemplateVO.stashes.length > 0) {
					let sectorVO = levelVO.getSectorByPos(sectorTemplateVO.position);
					if (!sectorVO) continue;
					for (let j = 0; j < sectorTemplateVO.stashes.length; j++) {
						let stashVO = sectorTemplateVO.stashes[j];
						result.push({ sectorVO: sectorVO, sectorTemplateVO: sectorTemplateVO, stashVO: stashVO });
						break;
					}
				}
			}
			return result;
		},
		
		addCriticalPath: function (worldVO, criticalPathVO) {
			let path = WorldCreatorRandom.findPath(worldVO, criticalPathVO.startPos, criticalPathVO.endPos);
			for (let j = 0; j < path.length; j++) {
				let levelVO = worldVO.getLevel(path[j].level);
				levelVO.getSector(path[j].sectorX, path[j].sectorY).addToCriticalPath(criticalPathVO);
			}
		},
		
		getConnectionPair: function (levelVO, sectors1, sectors2, skip) {
			skip = skip || 0;
			let pairs = [];
			for (let i = 0; i < sectors1.length; i++) {
				for (let j = 0; j < sectors2.length; j++) {
					pairs.push([sectors1[i], sectors2[j]]);
				}
			}

			let getSectorScore = function (sectorVO) {
				let score = 0;
				let numNeighbours = levelVO.getNeighbourCount(sectorVO.position.sectorX, sectorVO.position.sectorY);
				if (numNeighbours < 3) score++;
				if (numNeighbours > 3) score--;
				if (levelVO.hasConnectionPointAt(sectorVO.position.sectorX, sectorVO.position.sectorY)) score++;
				return score;
			};

			let getPairScore = function (pair) {
 				let distance = PositionConstants.getDistanceTo(pair[0].position, pair[1].position);
				return getSectorScore(pair[0]) + getSectorScore(pair[1]) - distance;
			};

			pairs.sort(function (a, b) { return getPairScore(b) - getPairScore(a); });
			
			return pairs[skip];
		},
		
		getClosestSector: function (sectors, pos, skip) {
			skip = skip || 0;
			if (skip >= sectors.length) skip = sectors.length - 1;
			var sorted = sectors.concat();
			sorted.sort(function (a, b) {
				return PositionConstants.getDistanceTo(a.position, pos) - PositionConstants.getDistanceTo(b.position, pos);
			});
			return sorted[skip];
		},
		
		getClosestPosition: function (positions, pos) {
			let result = null;
			var resultDist = 0;
			for (let i = 0; i < positions.length; i++) {
				var dist = PositionConstants.getDistanceTo(positions[i], pos);
				if (!result || dist < resultDist) {
					result = positions[i];
					resultDist = dist;
				}
			}
			return result;
		},
		
		getDistanceToCamp: function (worldVO, levelVO, sector, maxDistance) {
			if (sector.distanceToCamp >= 0) return sector.distanceToCamp;
			let result = 9999;
			var campPos = levelVO.campPosition;
			if (campPos) {
				var path = WorldCreatorRandom.findPath(worldVO, sector.position, campPos, false, true, null, false, maxDistance);
				if (path && path.length >= 0) {
					var dist = path.length;
					result = Math.min(result, dist);
				}
			}
			if (!maxDistance) {
				sector.distanceToCamp = result;
			}
			return result;
		},
		
		getQuickMinDistanceToCamp: function (levelVO, sector) {
			let result = 9999;
			let campPositions = levelVO.getAllCampPositions();
			for (let i = 0; i < campPositions.length; i++) {
				var campPos = campPositions[i];
				var dist = PositionConstants.getDistanceTo(sector.position, campPos);
				result = Math.min(result, dist);
			}
			return result;
		},
		
		getQuickMaxDistanceToCamp: function (levelVO, sector) {
			let result = 0;
			let campPositions = levelVO.getAllCampPositions();
			for (let i = 0; i < campPositions.length; i++) {
				var campPos = campPositions[i];
				var dist = PositionConstants.getDistanceTo(sector.position, campPos);
				result = Math.max(result, dist);
			}
			return result;
		},
		
		sortSectorsByPathLenTo: function (worldVO, sector) {
			return function (a, b) {
				var patha = WorldCreatorRandom.findPath(worldVO, sector.position, a.position);
				var pathb = WorldCreatorRandom.findPath(worldVO, sector.position, b.position);
				return patha.length - pathb.length;
			};
		},
		
		sortSectorsByDistanceTo: function (position) {
			return function (a, b) {
				var dista = PositionConstants.getDistanceTo(position, a.position);
				var distb = PositionConstants.getDistanceTo(position, b.position);
				return dista - distb;
			};
		},
		
		getNeighbours: function (levelVO, pos, pendingSectors) {
			let result = levelVO.getNeighbours(pos.sectorX, pos.sectorY);
			if (pendingSectors) {
				for (let i = 0; i < pendingSectors.length; i++) {
					var pendingPos = pendingSectors[i];
					if (levelVO.hasSector(pendingPos.sectorX, pendingPos.sectorY)) continue;
					var distance = PositionConstants.getDistanceTo(pos, pendingPos);
					if (distance >= 1 && distance < 2) {
						var direction = PositionConstants.getDirectionFrom(pos, pendingPos);
						result[direction] = { position: pendingPos };
					}
				}
			}
			return result;
		},
		
		getNeighbourCount: function (levelVO, pos, pendingSectors) {
			let result = levelVO.getNeighbourCount(pos.sectorX, pos.sectorY);
			if (pendingSectors) {
				for (let i = 0; i < pendingSectors.length; i++) {
					var pendingPos = pendingSectors[i];
					if (levelVO.hasSector(pendingPos.sectorX, pendingPos.sectorY)) continue;
					var distance = PositionConstants.getDistanceTo(pos, pendingPos);
					if (distance >= 1 && distance < 2) {
						result++;
					}
				}
			}
			return result;
		},

		getUnconncetedNeighbourCount: function (levelVO, sectorX, sectorY, stage) {
			let neighbours = levelVO.getNeighbours(sectorX, sectorY, stage);

			let groups = [];
			let options = { blockedPositions: [ { level: levelVO.level, sectorX: sectorX, sectorY: sectorY } ] };

			for (let direction in neighbours) {
				let neighbour = neighbours[direction];
				let matchingGroup = null;

				for (let i = 0; i < groups.length; i++) {
					let otherNeighbour = groups[i][0];
					let path = WorldCreatorRandom.findPathOnLevel(levelVO, neighbour.position, otherNeighbour.position, false, true, null, 3, options);
					if (path && path.length > 0 && path.length < 3) {
						matchingGroup = groups[i];
						break;
					}
				}

				if (matchingGroup) {
					matchingGroup.push(neighbour);
				} else {
					groups.push([neighbour]);
					continue;
				}
			}

			log.i("getUnconncetedNeighbourCount " + sectorX + "." + sectorY + ": " + groups.length)

			return groups.length;
		},
		
		getZoneVornoiPoints: function (seed, worldVO, levelVO) {
			var level = levelVO.level;
			var points = [];
			var addPoint = function (position, zone, minDistance) {
				if (minDistance) {
					for (let i = 0; i < points.length; i++) {
						if (PositionConstants.getDistanceTo(points[i].position, position) <= minDistance) return false;
					}
				}
				points.push({ position: position, zone: zone, sectors: [] });
				return true;
			};
			
			// camp
			var campMiddle = PositionConstants.getMiddlePoint(levelVO.campPosition);
			addPoint(campMiddle, WorldConstants.ZONE_POI_TEMP);
			
			// two sectors furthest away from the camp (but not next to each other)
			var sectorsByDistance = levelVO.sectors.slice(0).sort(WorldCreatorHelper.sortSectorsByDistanceTo(campMiddle));
			addPoint(sectorsByDistance[sectorsByDistance.length - 1].position, WorldConstants.ZONE_EXTRA_CAMPABLE);
			let i = 1;
			while (i < sectorsByDistance.length) {
				i++;
				var added = addPoint(sectorsByDistance[sectorsByDistance.length - i].position, WorldConstants.ZONE_POI_TEMP, 8);
				if (added) break;
			}
			
			// randomish positions in 8 cardinal directions from camp
			var directions = PositionConstants.getLevelDirections();
			for (let i in directions) {
				var direction = directions[i];
				var pointDist = 7 + WorldCreatorRandom.randomInt(10101 + seed % 11 * 182 + i*549 + level * 28, 0, 7);
				var pointPos = PositionConstants.getPositionOnPath(campMiddle, direction, pointDist);
				if (levelVO.containsPosition(pointPos)) {
					addPoint(pointPos, WorldConstants.ZONE_POI_TEMP, 6);
				}
			}
			
			return points;
		},
		
		getBorderSectorsForZone: function (levelVO, zone, includeAllPairs) {
			let result = [];
			let directions = PositionConstants.getLevelDirections();
			for (let i = 0; i < levelVO.sectors.length; i++) {
				let sector = levelVO.sectors[i];
				if (sector.zone != zone) continue;
				let neighbours = levelVO.getNeighbours(sector.position.sectorX, sector.position.sectorY);
				for (let d in directions) {
					let direction = directions[d];
					let neighbour = neighbours[direction];
					if (neighbour && neighbour.zone != zone) {
						result.push({ sector: sector, neighbour: neighbour, zone: neighbour.zone });
						if (!includeAllPairs) break;
					}
				}
			}
			return result;
		},
		
		getFeaturesSurrounding: function (worldVO, levelVO, pos) {
			let result = [];
			var candidates = PositionConstants.getAllPositionsInArea(pos, 5);
			for (let i = 0; i < candidates.length; i++) {
				var position = candidates[i];
				var features = worldVO.getFeaturesByPos(position);
				for (let j = 0; j < features.length; j++) {
					var feature = features[j];
					if (result.indexOf(feature) >= 0) {
						continue;
					}
					result.push(feature);
				}
			}
			return result;
		},
		
		getBottomLevel: function (seed) {
			switch (seed % 5) {
				case 0: return 0;
				case 1: return 1;
				case 2: return -1;
				case 3: return 1;
				case 4: return 0;
			}
		},
		
		getHighestLevel: function (seed) {
			switch (seed % 5) {
				case 0: return 25;
				case 1: return 26;
				case 2: return 25;
				case 3: return 26;
				case 4: return 24;
			}
		},
		
		getLevelOrdinal: function(seed, level) {
			if (level > 13) {
				var bottomLevel = this.getBottomLevel(seed);
				var bottomLevelOrdinal = this.getLevelOrdinal(seed, bottomLevel);
				return bottomLevelOrdinal + (level - 13);
			} else {
				return -level + 14;
			}
		},
		
		getLevelForOrdinal: function (seed, levelOrdinal) {
			var bottomLevel = this.getBottomLevel(seed);
			var bottomLevelOrdinal = this.getLevelOrdinal(seed, bottomLevel);
			if (levelOrdinal <= bottomLevelOrdinal)
				return 13 - (levelOrdinal - 1);
			else
				return 13 + (levelOrdinal - bottomLevelOrdinal);
		},
		
		getCampOrdinal: function (seed, level) {
			var camplessLevelOrdinals = this.getCamplessLevelOrdinals(seed);
			var levelOrdinal = this.getLevelOrdinal(seed, level);
			var ordinal = 0;
			for (let i = 1; i <= levelOrdinal; i++) {
				if (camplessLevelOrdinals.indexOf(i) < 0) ordinal++;
			}
			return ordinal;
		},
		
		getLevelsForCamp: function (seed, campOrdinal) {
			let result = [];
			var mainLevelOrdinal = this.getLevelOrdinalForCampOrdinal(seed, campOrdinal);
			var mainLevel = this.getLevelForOrdinal(seed, mainLevelOrdinal);
			result.push(mainLevel);
			
			var camplessLevelOrdinals = this.getCamplessLevelOrdinals(seed);
			for (let i = 0; i < camplessLevelOrdinals.length; i++) {
				var l = this.getLevelForOrdinal(seed, camplessLevelOrdinals[i]);
				var co = this.getCampOrdinal(seed, l);
				if (co == campOrdinal) {
					result.push(l);
				}
			}
			
			return result;
		},

		getFirstLevelForCamp: function (seed, campOrdinal) {
			let levels = WorldCreatorHelper.getLevelsForCamp(seed, campOrdinal);
			return levels[0];
		},

		getLastLevelForCamp: function (seed, campOrdinal) {
			let levels = WorldCreatorHelper.getLevelsForCamp(seed, campOrdinal);
			return levels[levels.length - 1];
		},
		
		getLevelIndexForCamp: function (seed, campOrdinal, level) {
			let levels = this.getLevelsForCamp(seed, campOrdinal);
			return levels.indexOf(level);
		},
		
		getMaxLevelIndexForCamp: function (seed, campOrdinal, level) {
			let levels = this.getLevelsForCamp(seed, campOrdinal);
			return levels.length - 1;
		},
		
		getNumSectorsForLevel: function (seed, level) {
			let campOrdinal = this.getCampOrdinal(seed, level);
			let numSectorsForCampOrdinal = WorldCreatorConstants.getNumSectors(campOrdinal);
			let ratio = 1;

			let getSizeFactor = function (l) {
				if (WorldCreatorHelper.isSmallLevel(seed, l))
					return 0.5;
				return 1;
			};
			
			let levels = this.getLevelsForCamp(seed, campOrdinal);
			if (levels.length == 1) {
				// only level: a little less than all sectors to avoid huge single levels (all sectors calculates with assumption of 2 levels for most camp ordinals)
				ratio = getSizeFactor(levels[0]);
				if (campOrdinal > 2 && campOrdinal < WorldConstants.CAMPS_TOTAL) ratio = 0.9;
			} else {
				// several levels: distribute on levels
				let sizeFactor = getSizeFactor(level);
				let totalSizeFactor = levels.map(level => getSizeFactor(level)).reduce((total, num) => total + num);
				ratio = sizeFactor / totalSizeFactor;
			}

			return Math.round(numSectorsForCampOrdinal * ratio);
		},
		
		getNumSectorsForLevels: function (seed, levels) {
			let result = 0;
			for (let i = 0; i < levels.length; i++) {
				result += this.getNumSectorsForLevel(seed, levels[i]);
			}
			return result;
		},
		
		getNumSectorsForStage: function (seed, campOrdinal, stage) {
			var levels = WorldCreatorHelper.getLevelsForCamp(seed, campOrdinal);
			let result = 0;
			for (let i = 0; i < levels.length; i++) {
				result += WorldCreatorHelper.getNumSectorsForLevelStage(seed, campOrdinal, levels[i], stage);
			}
			return result;
		},
		
		getNumSectorsForLevelStage: function (seed, campOrdinal, level, stage) {
			let isCampableLevel = this.isCampableLevel(seed, level);

			if (!isCampableLevel && stage == WorldConstants.CAMP_STAGE_EARLY)
				return 0;
			
			let numSectorsLevel = WorldCreatorHelper.getNumSectorsForLevel(seed, level);
			if (!isCampableLevel) {
				return numSectorsLevel;
			}
			
			let campLevels = WorldCreatorHelper.getLevelsForCamp(seed, campOrdinal);
			let earlyRatio = campLevels.length > 1 ? 0.6 : 0.5;
			let numEarlySectors = Math.round(earlyRatio * numSectorsLevel);
			if (stage == WorldConstants.CAMP_STAGE_EARLY) {
				return numEarlySectors;
			} else {
				return numSectorsLevel - numEarlySectors;
			}
		},
		
		getLevelOrdinalForCampOrdinal: function (seed, campOrdinal) {
			// this assumes camplessLevelOrdinals are sorted from smallest to biggest
			var levelOrdinal = campOrdinal;
			var camplessLevelOrdinals = this.getCamplessLevelOrdinals(seed);
			for (let i = 0; i < camplessLevelOrdinals.length; i++) {
				if (camplessLevelOrdinals[i] <= levelOrdinal) {
					levelOrdinal++;
				}
			}
			return levelOrdinal;
		},
		
		isCampableLevel: function (seed, level) {
			var camplessLevelOrdinals = this.getCamplessLevelOrdinals(seed);
			var levelOrdinal = this.getLevelOrdinal(seed, level);
			var campOrdinal = this.getCampOrdinal(seed, level);
			return camplessLevelOrdinals.indexOf(levelOrdinal) < 0;
		},
		
		isHardLevel: function (seed, level) {
			var hardLevelOrdinals = this.getHardLevelOrdinals(seed);
			var levelOrdinal = this.getLevelOrdinal(seed, level);
			return hardLevelOrdinals.includes(levelOrdinal);
		},
		
		isSmallLevel: function (seed, level) {
			var isCampableLevel = this.isCampableLevel(seed, level);
			var topLevel = this.getHighestLevel(seed);
			var bottomLevel = this.getBottomLevel(seed);
			return !isCampableLevel && level !== bottomLevel && level < topLevel - 1;
		},
		
		getNextUncampableLevelOrdinalForCampOrdinal: function (seed, campOrdinal) {
			var campLevelOrdinal = this.getLevelOrdinalForCampOrdinal(seed, campOrdinal);
			var camplessLevelOrdinals = this.getCamplessLevelOrdinals(seed);
			for (let i = 0; i < camplessLevelOrdinals.length; i++) {
				if (camplessLevelOrdinals[i] > campLevelOrdinal) {
					return camplessLevelOrdinals[i];
				}
			}
			return null;
		},
		
		getNotCampableReason: function (seed, level) {
			if (this.isCampableLevel(seed, level)) return null;
			var bottomLevel = this.getBottomLevel(seed);
			
			if (level === 14) return LevelConstants.UNCAMPABLE_LEVEL_TYPE_RADIATION;
			if (level == bottomLevel) return LevelConstants.UNCAMPABLE_LEVEL_TYPE_SUPERSTITION;
			
			let campOrdinal = this.getCampOrdinal(seed, level);
			
			let options = [];
			let levelOrdinal = this.getLevelOrdinal(seed, level);
			
			let unlockToxicWasteCampOrdinal = GameGlobals.upgradeEffectsHelper.getMinimumCampOrdinalForUpgrade("unlock_action_clear_waste_t");
			if (levelOrdinal == this.getNextUncampableLevelOrdinalForCampOrdinal(seed, unlockToxicWasteCampOrdinal)) {
				return LevelConstants.UNCAMPABLE_LEVEL_TYPE_POLLUTION;
			}
				
			let unlockRadioactiveWasteCampOrdinal = GameGlobals.upgradeEffectsHelper.getMinimumCampOrdinalForUpgrade("unlock_action_clear_waste_r");
			if (levelOrdinal == this.getNextUncampableLevelOrdinalForCampOrdinal(seed, unlockRadioactiveWasteCampOrdinal)) {
				return LevelConstants.UNCAMPABLE_LEVEL_TYPE_RADIATION;
			}
			
			if (campOrdinal >= WorldCreatorConstants.MIN_CAMP_ORDINAL_HAZARD_RADIATION && campOrdinal != 9)
				options.push(LevelConstants.UNCAMPABLE_LEVEL_TYPE_RADIATION);
			if (campOrdinal >= WorldCreatorConstants.MIN_CAMP_ORDINAL_HAZARD_POISON)
				options.push(LevelConstants.UNCAMPABLE_LEVEL_TYPE_POLLUTION);
			if (campOrdinal != 8 && campOrdinal != 15 && campOrdinal != 14)
				options.push(LevelConstants.UNCAMPABLE_LEVEL_TYPE_FLOODED);
				
			if (options.length == 0)
				return LevelConstants.UNCAMPABLE_LEVEL_TYPE_SUPERSTITION;
				
			return options[WorldCreatorRandom.randomInt(seed % 4 + level + level * 8 + 88, 0, options.length)];
		},
		
		getCamplessLevelOrdinals: function (seed) {
			if (!this.camplessLevelOrdinals[seed]) {
				var camplessLevelOrdinals = [];

				switch (seed % 5) {
					case 0:
						camplessLevelOrdinals.push(25);
						camplessLevelOrdinals.push(23);
						camplessLevelOrdinals.push(20);
						camplessLevelOrdinals.push(17);
						camplessLevelOrdinals.push(14);
						camplessLevelOrdinals.push(15);
						camplessLevelOrdinals.push(12);
						camplessLevelOrdinals.push(10);
						camplessLevelOrdinals.push(8);
						camplessLevelOrdinals.push(5);
						camplessLevelOrdinals.push(3);
						break;
					case 1:
						camplessLevelOrdinals.push(25);
						camplessLevelOrdinals.push(23);
						camplessLevelOrdinals.push(21);
						camplessLevelOrdinals.push(19);
						camplessLevelOrdinals.push(17);
						camplessLevelOrdinals.push(14);
						camplessLevelOrdinals.push(13);
						camplessLevelOrdinals.push(11);
						camplessLevelOrdinals.push(9);
						camplessLevelOrdinals.push(6);
						camplessLevelOrdinals.push(3);
						break;
					case 2:
						camplessLevelOrdinals.push(26);
						camplessLevelOrdinals.push(24);
						camplessLevelOrdinals.push(22);
						camplessLevelOrdinals.push(19);
						camplessLevelOrdinals.push(16);
						camplessLevelOrdinals.push(15);
						camplessLevelOrdinals.push(13);
						camplessLevelOrdinals.push(11);
						camplessLevelOrdinals.push(9);
						camplessLevelOrdinals.push(7);
						camplessLevelOrdinals.push(5);
						camplessLevelOrdinals.push(3);
						break;
					case 3:
						camplessLevelOrdinals.push(25);
						camplessLevelOrdinals.push(23);
						camplessLevelOrdinals.push(21);
						camplessLevelOrdinals.push(18);
						camplessLevelOrdinals.push(16);
						camplessLevelOrdinals.push(14);
						camplessLevelOrdinals.push(13);
						camplessLevelOrdinals.push(11);
						camplessLevelOrdinals.push(8);
						camplessLevelOrdinals.push(6);
						camplessLevelOrdinals.push(3);
						break;
					case 4:
						camplessLevelOrdinals.push(23);
						camplessLevelOrdinals.push(20);
						camplessLevelOrdinals.push(17);
						camplessLevelOrdinals.push(15);
						camplessLevelOrdinals.push(14);
						camplessLevelOrdinals.push(12);
						camplessLevelOrdinals.push(10);
						camplessLevelOrdinals.push(7);
						camplessLevelOrdinals.push(5);
						camplessLevelOrdinals.push(3);
						break;
				}
				
				this.camplessLevelOrdinals[seed] = camplessLevelOrdinals.sort((a, b) => a - b);
			}
			return this.camplessLevelOrdinals[seed];
		},
		
		getHardLevelOrdinals: function (seed) {
			if (!this.hardLevelOrdinals[seed]) {
				var hardLevelOrdinals = [];
				var surfaceLevel = this.getHighestLevel(seed);
				hardLevelOrdinals.push(this.getLevelOrdinal(seed, 14));
				hardLevelOrdinals.push(this.getLevelOrdinal(seed, surfaceLevel));
				switch (seed % 5) {
					case 0:
						hardLevelOrdinals.push(10);
						hardLevelOrdinals.push(23);
						break;
					case 1:
						hardLevelOrdinals.push(9);
						hardLevelOrdinals.push(23);
						break;
					case 2:
						hardLevelOrdinals.push(11);
						hardLevelOrdinals.push(24);
						break;
					case 3:
						hardLevelOrdinals.push(11);
						hardLevelOrdinals.push(23);
						break;
					case 4:
						hardLevelOrdinals.push(10);
						hardLevelOrdinals.push(23);
						break;
				}
				this.hardLevelOrdinals[seed] = hardLevelOrdinals.sort();
			}
			return this.hardLevelOrdinals[seed];
		},
		
		getRequiredPaths: function (worldVO, levelVO) {
			var level = levelVO.level;
			var campOrdinal = levelVO.campOrdinal;
			var campPosition = levelVO.campPosition;
			var passageUpPosition = levelVO.passageUpPosition;
			var passageDownPosition = levelVO.passageDownPosition;
			
			var maxPathLenP2P = WorldCreatorConstants.getMaxPathLength(campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE);
			var maxPathLenC2P = WorldCreatorConstants.getMaxPathLength(campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE);
			
			var requiredPaths = [];
			
			if (campPosition) {
				// passages up -> camps -> passages down
				var isGoingDown = level <= 13 && level >= worldVO.bottomLevel;
				var passageUpPathType = isGoingDown ? WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_CAMP : WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE;
				var passageUpStage = isGoingDown ? WorldConstants.CAMP_STAGE_EARLY : null;
				var passageDownPathType = isGoingDown ? WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE : WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_CAMP;
				var passageDownStage = isGoingDown ? null : WorldConstants.CAMP_STAGE_EARLY;
				if (level == 13) {
					passageUpPathType = WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE;
					passageUpStage = null;
					passageDownPathType = WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE;
					passageDownStage = null;
				}
				if (passageUpPosition) {
					requiredPaths.push({ start: campPosition, end: passageUpPosition, maxlen: maxPathLenC2P, type: passageUpPathType, stage: passageUpStage });
				}
				if (passageDownPosition) {
					requiredPaths.push({ start: campPosition, end: passageDownPosition, maxlen: maxPathLenC2P, type: passageDownPathType, stage: passageDownStage });
				}
			} else if (!passageUpPosition) {
				// just passage down sector
				if (passageDownPosition) {
					requiredPaths.push({ start: passageDownPosition, end: passageDownPosition, maxlen: 0, type: WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE, stage: WorldConstants.CAMP_STAGE_LATE });
				}
			} else if (!passageDownPosition) {
				// just passage up sector
				if (passageUpPosition) {
					requiredPaths.push({ start: passageUpPosition, end: passageUpPosition, maxlen: 0, type: WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE, stage: WorldConstants.CAMP_STAGE_LATE });
				}
			} else {
				// passage up -> passage down
				requiredPaths.push({ start: passageUpPosition, end: passageDownPosition, maxlen: maxPathLenP2P, type: WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE, stage: WorldConstants.CAMP_STAGE_LATE });
			}
			return requiredPaths;
		},
		
		canSectorHaveGang: function (levelVO, sectorVO, direction) {
			if (!sectorVO) return false;
			if (sectorVO.isCamp) return false;
			if (sectorVO.zone == WorldConstants.ZONE_ENTRANCE) return false;
			if (direction && sectorVO.movementBlockers[direction]) return false;
			if (levelVO.getNeighbourCount(sectorVO.position.sectorX, sectorVO.position.sectorY) <= 1) return false;			
			if (this.getQuickMinDistanceToCamp(levelVO, sectorVO) < 3) return false;
			return true;
		},
		
		canPairHaveGang: function (levelVO, sectorVO1, sectorVO2) {
			if (sectorVO1.zone == sectorVO2.zone) {
				if (sectorVO1.zone == WorldConstants.ZONE_PASSAGE_TO_CAMP) return false;
				if (sectorVO1.zone == WorldConstants.ZONE_PASSAGE_TO_PASSAGE) return false;
			}
			if (sectorVO1.possibleEnemies.length == 0 && sectorVO2.possibleEnemies.length == 0) {
				return false;
			}
			if (!this.canPairHaveBlocker(levelVO, sectorVO1, sectorVO2)) {
				return false;
			}
			return true;
		},

		canSectorHaveMovementBlocker: function (levelVO, sectorVO) {
			if (sectorVO.isCamp) return false;
			if (sectorVO.isPassageUp && levelVO.level >= 13) return false;
			if (sectorVO.isPassageDown && levelVO.level <= 13) return false;
			if (levelVO.getNeighbourCount(sectorVO.position.sectorX, sectorVO.position.sectorY) < 2) return false;
			if (levelVO.getUnblockedNeighbourCount(sectorVO.position.sectorX, sectorVO.position.sectorY) < 2) return false;
			if (this.getUnconncetedNeighbourCount(levelVO, sectorVO.position.sectorX, sectorVO.position.sectorY) < 2) return false;

			return true;
		},
		
		canHaveBlocker: function (levelVO, sectorVO1, sectorVO2, allowedCriticalPathTypes) {
			let distanceToCamp = Math.min(
				WorldCreatorHelper.getQuickMinDistanceToCamp(levelVO, sectorVO1),
				WorldCreatorHelper.getQuickMinDistanceToCamp(levelVO, sectorVO2)
			);
			if (distanceToCamp <= 1) return false;
			
			for (let i = 0; i < sectorVO1.criticalPathTypes.length; i++) {
				var pathType = sectorVO1.criticalPathTypes[i];
				if (allowedCriticalPathTypes && allowedCriticalPathTypes.indexOf(pathType) >= 0) continue;
				for (let j = 0; j < sectorVO2.criticalPathTypes.length; j++) {
					if (pathType === sectorVO2.criticalPathTypes[j]) {
						return false;
					}
				}
			}

			if (!this.canSectorHaveMovementBlocker(levelVO, sectorVO1)) return false;
			if (!this.canSectorHaveMovementBlocker(levelVO, sectorVO2)) return false;

			let direction12 = PositionConstants.getDirectionFrom(sectorVO1.position, sectorVO2.position);
			if (sectorVO2.movementBlockers[direction12]) return false;

			let direction21 = PositionConstants.getDirectionFrom(sectorVO2.position, sectorVO1.position);
			if (sectorVO1.movementBlockers[direction21]) return false;
			
			return true;
		},

		canPairHaveBlocker: function (levelVO, sectorVO1, sectorVO2) {
			if (!this.hasOtherUnblockedPaths(levelVO, sectorVO1, sectorVO2, 2)) {
				return false;
			}

			if (!this.hasOtherUnblockedPaths(levelVO, sectorVO2, sectorVO1, 2)) {
				return false;
			}
			
			if (sectorVO1.zone == sectorVO2.zone && sectorVO1.zone == WorldConstants.ZONE_ENTRANCE) {
				return false;
			}

			return true;
		},

		hasOtherUnblockedPaths: function (levelVO, s1, s2, minLen) {
			// checks if there are unblocked paths to SOMEWHERE from s1 excluding via s2 or if it's a dead end

			let frontier = [ { sectorVO: s1, distance: 0 } ];

			let visited = [];

			while (frontier.length > 0) {
				let current = frontier.pop();
				let currentSector = current.sectorVO;

				visited.push(currentSector);

				let neighbours = levelVO.getNeighbourList(currentSector.position.sectorX, currentSector.position.sectorY); 

				for (let i in neighbours) {
					let neighbour = neighbours[i];
					if (neighbour == s2) continue;
					if (visited.indexOf(neighbour) >= 0) continue;

					let direction = PositionConstants.getDirectionFrom(currentSector.position, neighbour.position);
					if (currentSector.getBlockerByDirection(direction)) continue;

					let newLen = current.distance + 1;

					if (newLen > minLen) return true;

					frontier.push({ sectorVO: neighbour, distance: newLen });
				}
			}

			return false;
		},
		
		isDarkLevel: function (seed, level) {
			return !this.isEarthLevel(seed, level) && !this.isSunLevel(seed, level);
		},
		
		isEarthLevel: function( seed, level ) {
			var lowest = this.getBottomLevel(seed, level);
			return level <= Math.min(lowest + 5, 3);
		},
		
		isSunLevel: function( seed, level ) {
			var highest = this.getHighestLevel(seed, level);
			return level >= highest - 5;
		},

		getShortestDistanceToMatchingSector: function (worldVO, levelVO, position, filter, minDistance, maxDistance) {
			minDistance = minDistance || 0;
			maxDistance = maxDistance || 999;
			
			let result = 999;

			if (levelVO.hasSector(position.secotX, position.sectorY) && filter(levelVO.getSector(position.secotX, position.sectorY))) return 0;

			for (let i = 0; i < levelVO.sectors.length; i++) {
				let candidate = levelVO.sectors[i];
				if (!filter(candidate)) continue;

				let distance = PositionConstants.getDistanceTo(position, candidate.position);

				// too far to matter
				if (distance > maxDistance) continue;

				if (distance < result) {
					result = distance;

					// found short enough
					if (result <= minDistance) break;
				}
			}

			return result;
		},

		getShortestPathToMatchingSector: function (worldVO, levelVO, position, filter, minDistance, maxDistance) {
			let result = null;

			minDistance = minDistance || 0;
			maxDistance = maxDistance || 999;

			if (filter(position)) return [];

			for (let i = 0; i < levelVO.sectors.length; i++) {
				let candidate = levelVO.sectors[i];
				if (!filter(candidate.position)) continue;

				let distance = PositionConstants.getDistanceTo(position, candidate.position);

				// further than current best
				if (result && result.length > 0 && result.length < distance) continue;

				// too far to matter
				if (distance > maxDistance) continue;

				let maxPathLength = result ? result.length : null;
				let path = WorldCreatorRandom.findPath(worldVO, position, candidate.position, false, true, null, true, maxPathLength);

				if (!path) continue;
				
				if (!result || path.length < result.length) {
					result = path;

					// found short enough
					if (result.length <= minDistance) break;
				}
			}

			return result;
		},
		
		containsBlockingFeature: function (pos, features, allowNonBuilt) {
			for (let i = 0; i < features.length; i++) {
				var feature = features[i];
				if (allowNonBuilt && !feature.isBuilt()) continue;
				if (feature.containsPosition(pos)) {
					return true;
				}
			}
			return false;
		},
		
	};

	return WorldCreatorHelper;
});
