// generates basic features of sectors, stuff that should change less between versions, depend less on balancing / story content
define([
	'ash',
	'utils/MathUtils',
	'game/GameGlobals',
	'game/constants/ExplorerConstants',
	'game/constants/ItemConstants',
	'game/constants/LevelConstants',
	'game/constants/MovementConstants',
	'game/constants/PositionConstants',
	'game/constants/SectorConstants',
	'game/constants/StoryConstants',
	'game/constants/TradeConstants',
	'game/constants/TribeConstants',
	'game/constants/UpgradeConstants',
	'game/constants/WorldConstants',
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
	'worldcreator/SectorGeneratorHelper',
	'worldcreator/CriticalPathVO',
], function (
	Ash, MathUtils, GameGlobals,
	ExplorerConstants, ItemConstants, LevelConstants, MovementConstants, PositionConstants, SectorConstants, StoryConstants, TradeConstants, TribeConstants, UpgradeConstants, WorldConstants,
	LocaleVO, PathConstraintVO, PositionVO, ResourcesVO, StashVO,
	WorldCreatorConstants, WorldCreatorHelper, WorldCreatorRandom, WorldCreatorDebug, WorldCreatorLogger, SectorGeneratorHelper, CriticalPathVO
) {
	
	let SectorFeaturesGenerator = {
		
		itemsHelper: null,
		
		LUXURY_RESOURCE_LOCATION_TYPE_FARMABLE: "LUXURY_RESOURCE_LOCATION_TYPE_FARMABLE",
		LUXURY_RESOURCE_LOCATION_TYPE_BIO: "LUXURY_RESOURCE_LOCATION_TYPE_BIO",
		LUXURY_RESOURCE_LOCATION_TYPE_MINERAL: "LUXURY_RESOURCE_LOCATION_TYPE_MINERAL",
		
		generate: function (seed, worldVO, worldTemplateVO, levels, itemsHelper) {
			this.itemsHelper = itemsHelper;
			
			for (let i = 0; i < levels.length; i++) {
				let l = levels[i];
				let levelVO = worldVO.levels[l];
				let levelTemplateVO = worldTemplateVO.levels[l] || { sectors: [] };
				
				this.generateLevel(seed, worldVO, levelTemplateVO, levelVO);
			}
			
			// debug
			// WorldCreatorDebug.printWorld(worldVO, [ "isCampAdditional"], "red" );
			// WorldCreatorDebug.printWorld(worldVO, [ "possibleEnemies.length" ]);
			// WorldCreatorDebug.printWorld(worldVO, [ "enemyDifficulty" ]);
			// WorldCreatorDebug.printWorld(worldVO, [ "hazards.radiation" ], "red");
			// WorldCreatorDebug.printWorld(worldVO, [ "hazards.flooded" ], "blue");
			// WorldCreatorDebug.printWorld(worldVO, [ "resourcesAll.water"], "blue");
			// WorldCreatorDebug.printWorld(worldVO, [ "resourcesScavengable.food" ], "#ee8822");
			// WorldCreatorDebug.printWorld(worldVO, [ "resourcesScavengable.metal" ], "#000");
			// WorldCreatorDebug.printWorld(worldVO, [ "workshopResource" ]);
			// WorldCreatorDebug.printWorld(worldVO, [ "criticalPathTypes.length" ], "red" );
			// WorldCreatorDebug.printWorld(worldVO, [ "requiredResources.food" ], "red" );
			// WorldCreatorDebug.printWorld(worldVO, [ "requiredResources.water" ], "blue" );
			// WorldCreatorDebug.printWorld(worldVO, [ "scavengeDifficulty" ] );
		},

		generateLevel: function (seed, worldVO, levelTemplateVO, levelVO) {
			// level-wide features 1
			this.generateWorkshops(seed, worldVO, levelTemplateVO, levelVO);
			this.generateStashes(seed, worldVO, levelTemplateVO, levelVO);
			
			// level path features
			levelVO.paths = this.generatePaths(seed, worldVO, levelVO);

			for (var p = 0; p < levelVO.paths.length; p++) {
				this.generateRequiredResources(seed, worldVO, levelVO, levelVO.paths[p]);
			}
			
			this.generateHazards(seed, worldVO, levelTemplateVO, levelVO);
			
			// sector features
			for (let s = 0; s < levelVO.sectors.length; s++) {
				let sectorVO = levelVO.sectors[s];
				let sectorTemplateVO = levelTemplateVO.sectors[s] || {};

				sectorVO.requiredFeatures = this.getRequiredFeatures(seed, worldVO, levelVO, sectorVO);
				sectorVO.sectorType = this.getSectorType(seed, worldVO, levelVO, sectorTemplateVO, sectorVO);
				sectorVO.sunlit = this.isSunlit(seed, worldVO, levelVO, sectorTemplateVO, sectorVO) || 0;

				this.generateTexture(seed, worldVO, levelVO, sectorTemplateVO, sectorVO);
				this.generateDifficulty(seed, worldVO, levelVO, sectorVO);
				this.generateResources(seed, worldVO, levelVO, sectorTemplateVO, sectorVO);
			}
			
			// level-wide features 2
			levelVO.predefinedExplorers = this.getPredefinedExplorers(seed, levelVO.level);
			this.generateInvestigateSectors(seed, worldVO, levelVO);
			this.generateLocalesForTradingPartners(seed, worldVO, levelTemplateVO, levelVO);	
			this.generateLocalesForLuxuryResources(seed, worldVO, levelTemplateVO, levelVO);
			this.generateLocalesForBlueprints(seed, worldVO, levelTemplateVO, levelVO);
			this.generateMovementBlockers(seed, worldVO, levelVO);
			this.generateHeaps(seed, worldVO, levelVO);
			this.generateItems(seed, worldVO, levelVO);
			
			// sector features 2
			for (let s = 0; s < levelVO.sectors.length; s++) {
				let sectorVO = levelVO.sectors[s];
				sectorVO.sunlit = sectorVO.sunlit || this.isSunlitByNeighbours(worldVO, levelVO, sectorVO) || 0;
			}
		},
		
		getPredefinedExplorers: function (seed, level) {
			let result = [];
			let isCampableLevel = WorldCreatorHelper.isCampableLevel(seed, level);
			if (!isCampableLevel) return result;
			let campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, level);
			let explorer = ExplorerConstants.predefinedExplorers[campOrdinal];
			if (!explorer) return [];
			return [ explorer.id ];
		},
		
		generateHazards: function (seed, worldVO, levelTemplateVO, levelVO) {
			let l = levelVO.level == 0 ? 1342 : levelVO.level;
			let campOrdinal = levelVO.campOrdinal;
			let levelOrdinal = levelVO.levelOrdinal;
			
			let isPollutedLevel = levelVO.notCampableReason === LevelConstants.UNCAMPABLE_LEVEL_TYPE_POLLUTION;
			let isRadiatedLevel = levelVO.notCampableReason === LevelConstants.UNCAMPABLE_LEVEL_TYPE_RADIATION;
			let isFloodedLevel = levelVO.notCampableReason === LevelConstants.UNCAMPABLE_LEVEL_TYPE_FLOODED;
			let isHazardLevel = isPollutedLevel || isRadiatedLevel || isFloodedLevel;
			
			// hazard areas (cold)
			let hasCold = levelVO.level != 14;
			let centerRadius = isHazardLevel ? 6 : 2;
			if (hasCold) {
				for (var s = 0; s < levelVO.sectors.length; s++) {
					// - block for certain sectors
					let sectorVO = levelVO.sectors[s];
					if (sectorVO.isCamp) continue;
					let sectorTemplateVO = levelTemplateVO.sectors[s] || {};
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
					if (levelVO.level != worldVO.topLevel && this.isSunlit(seed, worldVO, levelVO, sectorTemplateVO, sectorVO) && distanceToEdge > 1) {
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
						value = this.getHazardValue(value, maxHazardCold);
						sectorVO.hazards.cold = value;
					}
				}
			}
			
			// hazard clusters (radiation, poison, debris, flooded)
			let minHazardClusterLevel = Math.min(
				WorldCreatorConstants.MIN_CAMP_ORDINAL_HAZARD_RADIATION, 
				WorldCreatorConstants.MIN_CAMP_ORDINAL_HAZARD_POISON,
				WorldCreatorConstants.MIN_CAMP_ORDINAL_HAZARD_DEBRIS,
				WorldCreatorConstants.MIN_CAMP_ORDINAL_HAZARD_FLOODED
			)

			if (campOrdinal < minHazardClusterLevel) {
				return;
			}
			
			let defaultHazardType = isRadiatedLevel ? SectorConstants.HAZARD_TYPE_RADIATION : isFloodedLevel ? SectorConstants.HAZARD_TYPE_FLOODED : SectorConstants.HAZARD_TYPE_POLLUTION;
			
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
				var startPos = levelVO.getExcursionStartPosition();
				borderSectors.sort(function (a, b) { return PositionConstants.getDistanceTo(startPos, b.sector.position) - PositionConstants.getDistanceTo(startPos, a.sector.position) });
				for (let i = 0; i < borderSectors.length; i++) {
					var pair = borderSectors[i];
					if (pair.neighbour.zone == WorldConstants.ZONE_ENTRANCE) continue;
					var maxHazardValue = this.getMaxHazardValue(levelVO, pair.neighbour, defaultHazardType, pair.neighbour.zone);
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
					var maxHazardValue = this.getMaxHazardValue(levelVO, sectorVO, defaultHazardType, sectorVO.zone);
					var minHazardValue = Math.floor(maxHazardValue / 2);
					if (levelVO.isHard) minHazardValue = maxHazardValue;
					var hazardValueRand = WorldCreatorRandom.random(levelOrdinal * (i + 11) / seed * 55 + seed / (i + 99) - i * i);
					var hazardValue = minHazardValue + hazardValueRand * (maxHazardValue - minHazardValue);
					hazardValue = this.getHazardValue(hazardValue, maxHazardValue);
					if (hazardValue > maxHazardValue) hazardValue = maxHazardValue;
					if (isPollutedLevel) {
						sectorVO.hazards.poison = hazardValue;
					} else if (isRadiatedLevel) {
						sectorVO.hazards.radiation = hazardValue;
					} else if (isFloodedLevel) {
						sectorVO.hazards.flooded = hazardValue;
					}
				}
			}
		},
		
		generateMovementBlockers: function (seed, worldVO, levelVO) {
			var l = levelVO.level;
			var levelOrdinal = WorldCreatorHelper.getLevelOrdinal(seed, l);
			var campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, l);
			
			var blockerTypesEarly = this.getLevelBlockerTypes(worldVO, levelVO, WorldConstants.CAMP_STAGE_EARLY);
			var blockerTypesLate = this.getLevelBlockerTypes(worldVO, levelVO, WorldConstants.CAMP_STAGE_LATE);
			if (blockerTypesLate.length < 1) return;
			
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
			
			var addBlocker = function (seed, sectorVO, neighbourVO, type, addDiagonals, allowedCriticalPathTypes) {
				neighbourVO = neighbourVO || WorldCreatorRandom.getRandomSectorNeighbour(seed, levelVO, sectorVO, true);
				var blockerType = type || getBlockerType(seed, sectorVO);
				var options = { addDiagonals: addDiagonals, allowedCriticalPathTypes: allowedCriticalPathTypes };
				var sectorcb = function (s) {
					
				};
				SectorGeneratorHelper.addMovementBlocker(worldVO, levelVO, sectorVO, neighbourVO, blockerType, options, sectorcb);
			};

			var addBlockersBetween = function (seed, levelVO, pointA, pointB, type, maxPaths, allowedCriticalPathTypes) {
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
							addBlocker(finalSeed, sectorVO, neighbourVO, type, true, allowedCriticalPathTypes);
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
				var allowedCriticalPathTypes = [ WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE ];
				for (let i = 0; i < levelVO.passagePositions.length; i++) {
					for (let j = i + 1; j < levelVO.passagePositions.length; j++) {
						var rand = Math.round(2222 + seed + (i+21) * 41 + (j + 2) * 33);
						var type = l == 14 ? MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE : null;
						addBlockersBetween(rand, levelVO, levelVO.passagePositions[i], levelVO.passagePositions[j], type, numBetweenPassages, allowedCriticalPathTypes);
					}
				}
			}
			
			// campable levels: zone borders
			if (levelOrdinal > 1 && levelVO.isCampable) {
				var freq = 0.75;
				// - from ZONE_PASSAGE_TO_CAMP to other (to lead player towards camp)
				var allowedCriticalPathTypes = [ WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_2, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE ];
				var borderSectors1 = WorldCreatorHelper.getBorderSectorsForZone(levelVO, WorldConstants.ZONE_PASSAGE_TO_CAMP, true);
				for (let i = 0; i < borderSectors1.length; i++) {
					var pair = borderSectors1[i];
					if (WorldCreatorHelper.canHaveBlocker(levelVO, pair.sector, pair.neighbour, allowedCriticalPathTypes)) {
						var s = seed % 26 * 3331 + 100 + (i + 5) * 654;
						if (WorldCreatorRandom.random(s) < freq) {
							addBlocker(s * 2, pair.sector, pair.neighbour, null, true, allowedCriticalPathTypes);
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
				var allowedCriticalPathTypes = [ WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_2, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE ];
				addBlockersBetween(rand, levelVO, campPos, poiSector.position, null, 3, allowedCriticalPathTypes);
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
			let unvisitedSectors = [];
			let visitSector = function (pos, pathID) {
				let posSector = levelVO.getSectorByPos(pos);
				if (!posSector) return;
				if (posSector.pathID && pos.pathID != 0) return;
				let index = unvisitedSectors.indexOf(posSector);
				if (index < 0) return;
				posSector.pathID = pathID;
				unvisitedSectors.splice(index, 1);
			};
			let traverseSectors = function (startPos, sectors, pathStage) {
				let positions = [];
				if (sectors.length <= 0) return;
				unvisitedSectors = sectors.concat();
				let currentPos = startPos;
				let pathID = 0;
				while (unvisitedSectors.length > 0) {
					visitSector(currentPos, pathID);
					let sectorsByDistance = unvisitedSectors.slice(0).sort(WorldCreatorHelper.sortSectorsByDistanceTo(currentPos));
					let nextSector = sectorsByDistance[0];
					if (!nextSector) break;
					let path = WorldCreatorRandom.findPath(worldVO, currentPos, nextSector.position, false, true, pathStage);
					if (!path) {
						throw new Error("couldn't find level path " + currentPos + " " + nextSector.position);
					}
					pathID = result.length;
					for (let j = 0; j < path.length; j++) {
						let pathPos = path[j];
						visitSector(pathPos, pathID);
						positions.push(pathPos);
					}
					currentPos = nextSector.position;
				}
				result.push(positions);
			}
			let startPos = levelVO.getExcursionStartPosition();
			let earlySectors = levelVO.getSectorsByStage(WorldConstants.CAMP_STAGE_EARLY);
			let lateSectors = levelVO.getSectorsByStage(WorldConstants.CAMP_STAGE_LATE);
			traverseSectors(startPos, earlySectors, WorldConstants.CAMP_STAGE_EARLY);
			traverseSectors(startPos, lateSectors, null);
			return result;
		},
		
		generateStashes: function (seed, worldVO, levelTemplateVO, levelVO) {
			let l = levelVO.level;
			let nextLevel = WorldCreatorHelper.getLevelForOrdinal(seed, levelVO.levelOrdinal + 1);
			let nextLevelVO = worldVO.getLevel(nextLevel) || levelVO;
			let levelIndex = WorldCreatorHelper.getLevelIndexForCamp(seed, levelVO.campOrdinal, levelVO.level);
			let maxLevelIndex = WorldCreatorHelper.getMaxLevelIndexForCamp(seed, levelVO.campOrdinal, levelVO.level);
			
			let lateZones = [ WorldConstants.ZONE_POI_2, WorldConstants.ZONE_EXTRA_CAMPABLE ];
			let earlyZones = [ WorldConstants.ZONE_PASSAGE_TO_CAMP, WorldConstants.ZONE_PASSAGE_TO_PASSAGE, WorldConstants.ZONE_POI_1 ];
			let earlyZonesEntrance = [ WorldConstants.ZONE_ENTRANCE ];
			let earlyZonesOnCampableLevels = [ WorldConstants.ZONE_PASSAGE_TO_CAMP, WorldConstants.ZONE_POI_1 ];

			let templateStasheDatas = WorldCreatorHelper.getStashDataFromTemplate(levelTemplateVO, levelVO);

			let getMatchingUnusedTemplateStash = function (sectorVO, stashType, itemIDs) {
				let matchingTemplates = templateStasheDatas.filter(d => {
					if (!sectorVO.position.equals(d.sectorVO.position)) return false;
					if (stashType != d.stashVO.stashType) return false;
					if (stashType == ItemConstants.STASH_TYPE_ITEM && itemIDs.indexOf(d.stashVO.itemID) < 0) return false;
					if (sectorVO.stashes.length >= d.sectorTemplateVO.stashes.length) return false;
					return true;
				});

				return matchingTemplates[0];
			};
			
			let getStashSectorScore = function (sectorVO, stashType, itemIDs) {
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

				if (getMatchingUnusedTemplateStash(sectorVO, stashType, itemIDs)) result += 100;
				
				if (sectorVO.isCamp) result -= 2;
				if (sectorVO.isPassageUp) result -= 1;
				if (sectorVO.isPassageDown) result -= 1;
				result -= sectorVO.stashes.length;
				result -= sectorVO.locales.length;
				
				result += Math.abs(sectorVO.position.sectorX) / 1000;
				result += Math.abs(sectorVO.position.sectorY) / 1000;
				
				return result;
			};

			let addStash = function (sectorVO, reason, stashType, numItems, itemID, localeType) {
				numItems = numItems || 1;
				let stash = new StashVO(stashType, numItems, itemID, localeType);
				sectorVO.stashes.push(stash);
				if (stash.localeType) {
					let locale = new LocaleVO(localeType, false, false);
					SectorGeneratorHelper.addLocale(levelVO, sectorVO, locale);
				}
				// WorldCreatorLogger.i("add stash level " + l + " [" + reason + "]: " + itemID + " x" + numItems + " " + sectorVO.position + " " + sectorVO.zone);
			};
			
			let addStashes = function (sectorSeed, reason, stashType, itemIDs, numStashes, numItemsPerStash, excludedZones, localeType) {
				numStashes = WorldCreatorRandom.randomIntFromRange(sectorSeed / 2 + 222, numStashes);
				
				let options = { requireCentral: false, excludingFeature: "isCamp", excludedZones: excludedZones };
				let numCandidates = numStashes * 2;
				let stashSectorCandidates = WorldCreatorRandom.randomSectors(sectorSeed, worldVO, levelVO, numCandidates, numCandidates + 1, options);
				let num = Math.min(numStashes, stashSectorCandidates.length);
				
				stashSectorCandidates = stashSectorCandidates.sort((a, b) => getStashSectorScore(b, stashType, itemIDs) - getStashSectorScore(a, stashType, itemIDs));
				let stashSectors = stashSectorCandidates.slice(0, num);
				
				for (let i = 0; i < stashSectors.length; i++) {
					let stashSeed = sectorSeed * 2 + i * 3121;
					let item = WorldCreatorRandom.randomItemFromArray(stashSeed, itemIDs);
					let itemID = item.id ? item.id : item;
					let numItems = WorldCreatorRandom.randomIntFromRange(stashSeed, numItemsPerStash);
					addStash(stashSectors[i], reason, stashType, numItems, itemID, localeType);
				}
			};
			
			// stashes: early guaranteed items
			if (l == 13) {
				let campPosition = levelVO.campPosition;
				let campNeighbours = levelVO.getNeighbourList(campPosition.sectorX, campPosition.sectorY);
				let firstCacheSector = WorldCreatorRandom.randomItemFromArray(seed, campNeighbours);
				addStash(firstCacheSector, "first-cache", ItemConstants.STASH_TYPE_ITEM, 1, "cache_metal_1");
				addStashes(seed / 2 * 401 + l * 801, "guaranteed-early", ItemConstants.STASH_TYPE_ITEM, ["cache_water_1"], 3, 1, lateZones);
				addStashes(seed / 4 * 278 + l * 151, "guaranteed-early", ItemConstants.STASH_TYPE_ITEM, ["cache_food_1"], 3, 1, lateZones);
				addStashes(seed / 3 * 338 + l * 402, "guaranteed-early", ItemConstants.STASH_TYPE_ITEM, ["cache_metal_1"], 7, 1, lateZones);
				addStashes(seed * l * 8 / 3 + (l+100)*14 + 3333, "guaranteed-early", ItemConstants.STASH_TYPE_ITEM, [ "exploration_1" ], 1, 1, lateZones);
			}
			
			if (l == WorldConstants.LEVEL_NUMBER_STASH_ADVANCED_MAP) {
				addStashes(seed / 2 + 5312, "guaranteed-early", ItemConstants.STASH_TYPE_ITEM, [ "equipment_map_2" ], 1, 1, earlyZonesEntrance);
			}

			if (l == WorldConstants.LEVEL_NUMBER_STASH_ROBOT_1 || l == WorldConstants.LEVEL_NUMBER_STASH_ROBOT_2) {
				addStashes(seed / 3 + 1111, "guaranteed-late", ItemConstants.STASH_TYPE_ITEM, [ "robot_1" ], 1, 1, earlyZones);
			}
			
			// stashes: every campable level guaranteed items
			if (levelVO.isCampable && l != 13) {
				let numCaches = levelVO.habitability >= 1 ? 3 : 5;
				addStashes(seed / 7 * 937 + l * 331, "guaranteed-campable-early", ItemConstants.STASH_TYPE_ITEM, ItemConstants.getAvailableMetalCaches(levelVO.campOrdinal), numCaches, 1, lateZones);
				addStashes(3000 + seed % 7 * 188 + (levelVO.level % 3) * 105 + Math.abs(levelVO.minX + 50) * 77, "guaranteed-campable", ItemConstants.STASH_TYPE_ITEM, [ "consumable_map_1", "consumable_map_2" ], [1, 3], 1, lateZones);
			}
			
			// stashes: every non-campable level guaranteed items
			if (!levelVO.isCampable) {
				addStashes(seed % 45 * (l + 11) * 9 + (l+100)*7 + 1111, "guaranteed-noncampable", ItemConstants.STASH_TYPE_ITEM, [ "stamina_potion_1"], 1, 1);
				addStashes(seed / 2 + l * 3, "guaranteed-noncampable", ItemConstants.STASH_TYPE_ITEM, [ "cache_food_1"], 1, 1);
				addStashes(seed % 6 * 1000 + l * 5, "guaranteed-noncampable", ItemConstants.STASH_TYPE_ITEM, [ "cache_water_1"], 1, 1);
				if (levelVO.level != worldVO.bottomLevel) {
					addStashes(3000 + seed % 7 * 188 + (levelVO.level % 3) * 105 + Math.abs(levelVO.minX + 50) * 77, "guaranteed-noncampable", ItemConstants.STASH_TYPE_ITEM, [ "consumable_map_1", "consumable_map_2" ], 2, 1, lateZones);
				}
			}
			
			// stashes: currency (uncampable levels and late zones)
			if (levelVO.campOrdinal > 2) {
				let minCurrencyStashes = levelVO.isCampable ? 0 : 1;
				let maxCurrencyStashes = levelVO.isCampable ? 1 : 3;
				let numCurrencyStashes = WorldCreatorRandom.randomInt(700 + seed % 7 * 1112 + (l+7) * 3412, minCurrencyStashes, maxCurrencyStashes + 1);
				if (numCurrencyStashes > 0) {
					let requiredEquipment = this.itemsHelper.getRequiredEquipment(levelVO.campOrdinal, WorldConstants.CAMP_STEP_END, levelVO.isHard);
					let itemValues = requiredEquipment.map(item => Math.round(TradeConstants.getItemValue(item, false, false))).sort();
					let minItemValue = itemValues.length > 0 ? Math.ceil(itemValues[0]) : 1;
					let maxItemValue = itemValues.length > 1 ? Math.ceil(itemValues[itemValues.length - 1] * 1.5) : minItemValue + 1;
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

			// stashes: story items
			for (let i = 0; i < StoryConstants.storyStashes.length; i++) {
				let stashDefinition = StoryConstants.storyStashes[i];
				if (stashDefinition.campOrdinal != levelVO.campOrdinal) continue;
				if (levelIndex != maxLevelIndex) continue;
				addStashes(seed / 2 + 16831 + i * 312, "story", ItemConstants.STASH_TYPE_ITEM, [ stashDefinition.itemID ], 1, 1, earlyZonesOnCampableLevels, stashDefinition.localeType);
			}
		},
		
		getPossibleBonusStashItems: function (levelVO) {
			let allItems = [
				"first_aid_kit_1",
				"first_aid_kit_2",
				"glowstick_1",
				"exploration_2",
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
				"cache_rumours_11",
				"cache_rumours_22",
				"cache_metal_1",
				"cache_metal_2",
				"cache_metal_3",
				"cache_metal_4",
				"cache_food_1",
				"cache_food_2",
				"cache_water_1",
				"cache_water_2",
			];
			return allItems.filter((itemID) => this.itemsHelper.isAvailable(ItemConstants.getItemDefinitionByID(itemID), levelVO.campOrdinal, WorldConstants.CAMP_STEP_END, true, true));
		},
		
		generateWorkshops: function (seed, worldVO, levelTemplateVO, levelVO) {
			let campOrdinal = levelVO.campOrdinal;
			let l = levelVO.level;
			
			let workshopResource = levelVO.workshopResource;
			if (!workshopResource) return;

			let existingPositions = levelTemplateVO.workshopPositions || [];

			// pick sectors
			let workshopSectors = [];
			let pathConstraints = [];
			switch (workshopResource) {
				case "herbs":
					let sea = worldVO.getFeaturesByType(WorldCreatorConstants.FEATURE_HOLE_SEA)[0];
					let seaPos = sea.getPosition(l);
					let sectorsByDistance = levelVO.sectors.slice(0).sort(WorldCreatorHelper.sortSectorsByDistanceTo(seaPos));
					let sector = sectorsByDistance[0];
					workshopSectors.push(sector);
					break;
				default:
					if (levelVO.campPosition) {
						var startPos = levelVO.campPosition;
						var maxLength = WorldCreatorConstants.getMaxPathLength(levelVO.campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1);
						pathConstraints.push(new PathConstraintVO(startPos, maxLength, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1));
					}
					let options = { excludingFeature: "isCamp", pathConstraints: pathConstraints, excludedZones: [ WorldConstants.ZONE_ENTRANCE, WorldConstants.ZONE_PASSAGE_TO_CAMP, WorldConstants.ZONE_EXTRA_CAMPABLE ] };
					workshopSectors = WorldCreatorRandom.randomSectors(seed * l * 2 / 7 * l, worldVO, levelVO, 1, 2, options);
					break;
			}

			workshopSectors = workshopSectors || existingPositions.map(pos => levelVO.getSectorByPos(pos));
			
			// set sector flags and critical paths
			for (let i = 0; i < workshopSectors.length; i++) {
				let position = workshopSectors[i].position;
				WorldCreatorLogger.i("placed workshop " + workshopResource + " at " + position);
				workshopSectors[i].hasWorkshop = true;
				workshopSectors[i].hasClearableWorkshop = workshopResource != "herbs";
				workshopSectors[i].hasBuildableWorkshop = workshopResource == "herbs";
				workshopSectors[i].workshopResource = resourceNames[workshopResource];
				for (let j = 0; j < pathConstraints.length; j++) {
					let criticalPathVO = new CriticalPathVO(WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1, position, pathConstraints[j].startPosition);
					WorldCreatorHelper.addCriticalPath(worldVO, criticalPathVO);
				}

				levelVO.workshopPositions.push(position);
			}

			// add locales associated with workshops
			if (workshopResource == "herbs" && campOrdinal === WorldConstants.CAMP_ORDINAL_GREENHOUSE_1) {
				let locale = new LocaleVO(localeTypes.greenhouse, true, false);
				SectorGeneratorHelper.addLocale(levelVO, workshopSectors[0], locale);
			}
			
		},

		generateHeaps: function (seed, worldVO, levelVO) {
			let heapResource = resourceNames.metal;

			let getHeapSectorScore = function (sectorVO) {
				let score = sectorVO.resourcesScavengable.getResource(heapResource);
				score -= WorldCreatorHelper.getQuickMinDistanceToCamp(levelVO, sectorVO);
				score -= sectorVO.locales.length;
				if (sectorVO.hasLocaleOfType(localeTypes.grove)) score -= 100;
				if (sectorVO.hazards.radiation > 0) score -= 5;
				if (sectorVO.hazards.poison > 0) score -= 5;
				if (sectorVO.hazards.flooded > 0) score -= 1;
				if (sectorVO.locales.length > 0) score -= 1;
				if (sectorVO.resourcesCollectable.getTotal() > 0) score -= 1;
				if (sectorVO.hasWater()) score -= 1;
				if (sectorVO.sectorType == SectorConstants.SECTOR_TYPE_SLUM) score += 10;
				if (sectorVO.sectorType == SectorConstants.SECTOR_TYPE_MAINTENANCE) score += 1;
				if (sectorVO.sectorType == SectorConstants.SECTOR_TYPE_PUBLIC) score -= 1;
				if (sectorVO.sectorType == SectorConstants.SECTOR_TYPE_COMMERCIAL) score -= 2;
				return score;
			};

			let count = 2;
			if (levelVO.level == 13) count++;
			if (!levelVO.isCampable) count--;
			if (levelVO.isHard) count--;

			let excludedZones = [ WorldConstants.ZONE_EXTRA_CAMPABLE, WorldConstants.ZONE_EXTRA_UNCAMPABLE ];
			if (levelVO.campOrdinal == 1) {
				excludedZones.push(WorldConstants.ZONE_POI_2);
			}
			let excludedFeatures = [ "isCamp", "isPassageUp", "isPassageDown", "hasWorkshop" ];
			let options = { requireCentral: true, excludingFeature: excludedFeatures, excludedZones: excludedZones };
			let heapSectors = WorldCreatorRandom.randomSectorsScored(seed, worldVO, levelVO, count, count + 1, options, getHeapSectorScore);

			for (let i = 0; i < heapSectors.length; i++) {
				heapSectors[i].hasHeap = true;
				heapSectors[i].heapResource = heapResource;
				WorldCreatorLogger.i("heap [" +  heapResource + "]: " + heapSectors[i].position);
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

			// TODO set requiredFeatures.beacon again (deleted due to using too complex critical path logic)
			
			return requiredFeatures;
		},
		
		generateTexture: function (seed, worldVO, levelVO, sectorTemplateVO, sectorVO) {
			let l = sectorVO.position.level;
			let x = sectorVO.position.sectorX;
			let y = sectorVO.position.sectorY;
			let features = worldVO.getFeaturesByPos(sectorVO.position);
			let surroundingFeatures = WorldCreatorHelper.getFeaturesSurrounding(worldVO, levelVO, sectorVO.position);

			// wear
			let levelWear = MathUtils.clamp((worldVO.topLevel - l) / (worldVO.topLevel - 5) * 8, 0, 10);
			let wear = sectorTemplateVO.wear || levelWear + WorldCreatorRandom.randomInt(seed * l + (x + 100) * 82 + (y + 100) * 82, -3, 3);
			if (sectorVO.isCamp) wear = Math.min(3, wear);
			if (sectorVO.sectorType == SectorConstants.SECTOR_TYPE_SLUM) wear = Math.max(3, wear);
			sectorVO.wear = MathUtils.clamp(Math.round(wear), 0, 10);

			// damage
			let damage = sectorTemplateVO.damage || 0;
			let getFeatureDamage = function (feature) {
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
			let levelDensity = MathUtils.clamp(WorldCreatorRandom.random(seed * 7 * l / 3 + 62) * 10, 2, 9);
			if (l == worldVO.topLevel) levelDensity = 5;
			if (l == worldVO.topLevel - 1) levelDensity = 5;
			if (l == worldVO.topLevel - 2) levelDensity = 7;
			if (l == worldVO.topLevel - 3) levelDensity = 8;
			if (l == 14) levelDensity = 8;
			if (l == worldVO.bottomLevel + 1) levelDensity = 6;
			if (l == worldVO.bottomLevel) levelDensity = 3;
			
			let minDensity = 0;
			let maxDensity = 10;
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
			
			let isStartPosition = l == 13 && sectorVO.isCamp;
			if (isStartPosition) {
				minDensity = 3;
				maxDensity = 8;
			}
			
			if (sectorVO.requiredFeatures.beacon) {
				minDensity = 2;
				maxDensity = 8;
			}

			if (PositionConstants.isWorldPillarPosition(sectorVO.position)) {
				minDensity = 2;
			}
			
			let randomDensity = WorldCreatorRandom.randomInt(seed * l * x + y + x, minDensity, maxDensity + 1);
			if (sectorVO.isCamp) randomDensity = 5;
			
			let density = sectorTemplateVO.buildingDensity || (levelDensity + randomDensity) / 2;
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
			// TODO fix this doesn't actually do anything
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
			
			// - habitability (easier scavenging around outposts)
			scavengeDifficultyScore *= MathUtils.map(levelVO.habitability, 0, 1, 0.75, 1.25);
			
			// - hazards
			if (sectorVO.hazards.poison > 0) scavengeDifficultyScore *= 1.5;
			if (sectorVO.hazards.radiation > 0)  scavengeDifficultyScore *= 2;
			if (sectorVO.hazards.flooded > 0)  scavengeDifficultyScore *= 1.25;
			
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
		
		generateResources: function (seed, worldVO, levelVO, sectorTemplateVO, sectorVO) {
			var l = sectorVO.position.level;
			var x = sectorVO.position.sectorX;
			var y = sectorVO.position.sectorY;
			var ll = levelVO.level === 0 ? levelVO.level : 50;
			var sectorType = sectorVO.sectorType;
			var campOrdinal = levelVO.campOrdinal;
			var isStartPosition = l == 13 && sectorVO.isCamp;
			
			// scavengeable resources (not saved to template)
			var r1 = WorldCreatorRandom.random(5000 + seed / (l+10) + x + x * y * 63 + sectorVO.buildingDensity * 3 + x % 3 * 123 + y % 4 * 81);
			var r2 = WorldCreatorRandom.random(seed + l * x / y * 44 + 6);
			var r3 = WorldCreatorRandom.random(seed / (l + 5) + x * x * y + 66);

			var sca = new ResourcesVO();
			let metalThresholds = { "ABUNDANT": 0.95, "COMMON": 0.8, "DEFAULT": Math.ceil(campOrdinal / 3) * 0.02 };
			let foodThresholds = { "ABUNDANT": 0.98, "COMMON": 0.95, "DEFAULT": 0.75 };
			let waterThresholds = { "ABUNDANT": 1, "COMMON": 0.95, "DEFAULT": 0.85 };
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
			
			// collectable resources (saved to template)
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
			
			// define springs (saved to template)
			if ((col.water > 0 || sca.water > 0) && this.canHaveSpring(levelVO, sectorVO)) {
				sectorVO.hasSpring = sectorTemplateVO.hasSpring || WorldCreatorRandom.random(7777 + seed % 987 + ll * 7 + y * 71) < 0.25;
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

			if (sectorVO.hazards.flooded > 0) {
				col.food = 0;
			}
			
			if (sectorVO.hazards.hasHazards()) {
				sca.water = 0;
			}
			
			// adjustments for camp positions
			if (sectorVO.isCamp) {
				let isMainCamp = sectorVO.position.equals(levelVO.campPosition);
				let isOutpost = levelVO.habitability < 1;
				
				if (isStartPosition) {
					sca.metal = WorldConstants.resourcePrevalence.ABUNDANT;
					sca.food = WorldConstants.resourcePrevalence.COMMON;
					col.water = WorldConstants.resourcePrevalence.RARE;
					col.food = WorldConstants.resourcePrevalence.RARE;
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
				let maxPerType = levelVO.levelOrdinal > 10 ? 1 : levelVO.levelOrdinal > 3 ? 2 : 8;
				
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
					let requiredItems = [ "exploration_1" ].map(itemID => ItemConstants.getItemDefinitionByID(itemID));
					let requiredItemIngredients = ItemConstants.getIngredientsToCraftMany(requiredItems);
					let requiredItemIngredientsMax = Math.min(maxPerType, requiredItemIngredients.length);
					for (let i = 0; i < requiredItemIngredientsMax; i++) {
						let def = requiredItemIngredients[i];
						addItemLocation(def.id, stageVO.stage, "required-items");
					}
				}
				
				// a couple of random ingredients
				let numRandomIngredients = Math.min(2, levelVO.campOrdinal);
				for (let i = 0; i < numRandomIngredients; i++) {
					var s1 = 4200 + seed % 3000 + (levelVO.level + 5) * 217 + i * 991;
					var r1 = WorldCreatorRandom.random(s1);
					var ingredient = GameGlobals.itemsHelper.getUsableIngredient(null, r1);
					addItemLocation(ingredient.id, stageVO.stage, "random");
				}
			}
		},
		
		generateInvestigateSectors: function (seed, worldVO, levelVO) {
			if (levelVO.numInvestigateSectors < 1) return;
			
			let addSector = function (sectorVO) {
				sectorVO.isInvestigatable = true;
			};
			
			let getInvestigateSectorScore = function (sectorVO) {
				let score = 0;
				score -= sectorVO.criticalPathTypes.length;
				score -= sectorVO.locales.length;
				score -= sectorVO.waymarks.length;
				switch (sectorVO.sectorType) {
					case SectorConstants.SECTOR_TYPE_RESIDENTIAL: score += 1; break;
					case SectorConstants.SECTOR_TYPE_INDUSTRIAL: score += 3; break;
					case SectorConstants.SECTOR_TYPE_MAINTENANCE: score += 0; break;
					case SectorConstants.SECTOR_TYPE_COMMERCIAL: score += 1; break;
					case SectorConstants.SECTOR_TYPE_PUBLIC: score += 3; break;
					case SectorConstants.SECTOR_TYPE_SLUM: score += 0; break;
				}
				return score;
			};
			
			let l = levelVO.level;
			let campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, levelVO.level);
			let startPos = levelVO.getExcursionStartPosition();
			
			let excludedZones = [ WorldConstants.ZONE_ENTRANCE ];
			let excludedFeatures = [ "isCamp", "isPassageUp", "isPassageDown", "workshopResource" ];
			let pathConstraints = [];
			
			let pathType = WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_2;
			let maxLength = WorldCreatorConstants.getMaxPathLength(campOrdinal, pathType);
			pathConstraints.push(new PathConstraintVO(startPos, maxLength, pathType));
			
			let options = { requireCentral: false, excludingFeature: excludedFeatures, pathConstraints: pathConstraints, excludedZones: excludedZones };
			let count = levelVO.numInvestigateSectors;
			let sectors = WorldCreatorRandom.randomSectorsScored(seed, worldVO, levelVO, count, count + 1, options, getInvestigateSectorScore);
			WorldCreatorLogger.i("add investigate sectors on level " + l + ": " + sectors.length);
			for (let i = 0; i < sectors.length; i++) {
				addSector(sectors[i]);
			}
		},

		generateLocalesForTradingPartners: function (seed, worldVO, levelTemplateVO, levelVO) {
			let excludedFeatures = [ "isCamp", "isPassageUp", "isPassageDown", "workshopResource" ];

			for (let i = 0; i < TradeConstants.TRADING_PARTNERS.length; i++) {
				let partner = TradeConstants.TRADING_PARTNERS[i];
				let levelOrdinal = WorldCreatorHelper.getLevelOrdinalForCampOrdinal(seed, partner.campOrdinal);
				let level = WorldCreatorHelper.getLevelForOrdinal(seed, levelOrdinal);
				if (level == levelVO.level) {
					let existingSectors = WorldCreatorHelper.getLocaleDataFromTemplate(levelTemplateVO, levelVO, localeTypes.tradingpartner);
					let sectorVO = existingSectors.length > 0 ? existingSectors[0].sectorVO : null;
					if (!sectorVO) {
						let options = { excludingFeature: excludedFeatures };
						sectorVO = WorldCreatorRandom.randomSectors(seed - 9393 + i * i, worldVO, levelVO, 1, 2, options)[0];
					}
					let locale = new LocaleVO(localeTypes.tradingpartner, true, false);
					SectorGeneratorHelper.addLocale(levelVO, sectorVO, locale);
					sectorVO.scavengeDifficulty = 10;
				}
			}
		},

		generateLocalesForLuxuryResources: function (seed, worldVO, levelTemplateVO, levelVO) {
			let excludedFeatures = [ "isCamp", "isPassageUp", "isPassageDown", "workshopResource" ];
			let lateZones = [ WorldConstants.ZONE_POI_2, WorldConstants.ZONE_EXTRA_CAMPABLE ];

			for (let i = 0; i < levelVO.luxuryResources.length; i++) {
				let resource = levelVO.luxuryResources[i];
				let locationType = this.getLuxuryResourceLocationType(resource);
				
				let existingSectors = WorldCreatorHelper.getLocaleDataFromTemplate(levelTemplateVO, levelVO, null, (localeVO) => localeVO.luxuryResource === resource);
				let sectorVO = existingSectors.length > 0 ? existingSectors[0].sectorVO : null;

				if (!sectorVO) {
					let filter = sectorVO => this.filterSectorForLuxuryLocationType(sectorVO, locationType);
					let options = { excludingFeature: excludedFeatures, excludedZones: lateZones, excludedZones: [ WorldConstants.ZONE_PASSAGE_TO_CAMP ], filter: filter };
					sectorVO = WorldCreatorRandom.randomSectors(seed  + 773 + levelVO.level * 24 + i * 992, worldVO, levelVO, 1, 2, options)[0];
					if (!sectorVO) continue;
				}

				let localeType = this.getLocaleTypeForLuxuryResourceOnSector(seed, locationType, sectorVO);
				let locale = new LocaleVO(localeType, false, false);
				locale.luxuryResource = resource;
				SectorGeneratorHelper.addLocale(levelVO, sectorVO, locale);
			}
		},

		generateLocalesForBlueprints: function (seed, worldVO, levelTemplateVO, levelVO) {
			let l = levelVO.level;
			let campOrdinal = WorldCreatorHelper.getCampOrdinal(seed, levelVO.level);
			let generator = this;

			let getPathConstraints = function (isEarly) {
				let pathConstraints = [];

				if (levelVO.campPosition) {
					let pos = levelVO.campPosition;
					let pathType = isEarly ? WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1 : WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_2;
					let length = WorldCreatorConstants.getMaxPathLength(campOrdinal, pathType);
					if (isEarly) {
						length = Math.ceil(length * 0.75);
					}
					if (levelVO.level == 13) {
						length = Math.ceil(length * 0.75);
					}
					pathConstraints.push(new PathConstraintVO(pos, length, pathType));
				}

				return pathConstraints;
			}

			let createLocale = function (sectorVO, localeVO) {
				let pathConstraints = getPathConstraints(localeVO.isEarly);
				SectorGeneratorHelper.addLocale(levelVO, sectorVO, localeVO);
				for (let j = 0; j < pathConstraints.length; j++) {
					let criticalPathVO = new CriticalPathVO(pathConstraints[j].pathType, sectorVO.position, pathConstraints[j].startPosition);
					WorldCreatorHelper.addCriticalPath(worldVO, criticalPathVO);
				}
			};

			let createLocales = function (worldVO, levelVO, isEarly, count, countEasy) {
				let pathConstraints = getPathConstraints(isEarly);

				let excludedFeatures = [ "isCamp", "isPassageUp", "isPassageDown", "workshopResource" ];
				let excludedZones = isEarly ?
					[ WorldConstants.ZONE_POI_2, WorldConstants.ZONE_CAMP_TO_PASSAGE, WorldConstants.ZONE_EXTRA_CAMPABLE ] :
					[ WorldConstants.ZONE_ENTRANCE, WorldConstants.ZONE_PASSAGE_TO_CAMP, WorldConstants.ZONE_POI_1, WorldConstants.ZONE_EXTRA_CAMPABLE ];
				
				let options = { requireCentral: false, excludingFeature: excludedFeatures, pathConstraints: pathConstraints, excludedZones: excludedZones, numDuplicates: 2 };
				let l = levelVO.level;
				let sseed = Math.abs(seed - (isEarly ? 5555 : 0) + (l + 50) * 2);

				for (let i = 0; i < count; i++) {
					let isEasy = i <= countEasy;

					let sectorVO = WorldCreatorRandom.randomSectors(sseed + i + i * 72 * sseed + i * l + i, worldVO, levelVO, 1, 2, options)[0];

					let s1 = sseed + sectorVO.position.sectorX * 871 + sectorVO.position.sectorY * 659 + i * 212;
					let localeType = generator.getLocaleType(worldVO, levelVO, sectorVO, s1, isEarly);

					let localeVO = new LocaleVO(localeType, isEasy, isEarly);
					localeVO.hasBlueprints = true;

					createLocale(sectorVO, localeVO);
				}
			};

			// use sectors that have matching locales in template if possible
			let existingLocaleData = WorldCreatorHelper.getLocaleDataFromTemplate(levelTemplateVO, levelVO, null, (localeVO) => localeVO.hasBlueprints);
			let numExistingEarly = 0;
			let numExistingLate = 0;
			for (let i = 0; i < existingLocaleData.length; i++) {
				let data = existingLocaleData[i];
				let isEarly = data.localeVO.isEarly;
				createLocale(data.sectorVO, data.localeVO);
				if (isEarly) numExistingEarly++;
				else numExistingLate++;
			}
			
			// min number of (easy) locales ensures that player can get all upgrades intended for that level
			// two brackets of locales for critical paths, those on path 2 can require tech from path 1 to reach but not the other way around
			let levelIndex = WorldCreatorHelper.getLevelIndexForCamp(seed, campOrdinal, levelVO.level);
			let maxLevelIndex = WorldCreatorHelper.getMaxLevelIndexForCamp(seed, campOrdinal, levelVO.level);
			let numEarlyBlueprints = UpgradeConstants.getPiecesByCampOrdinal(campOrdinal, UpgradeConstants.BLUEPRINT_BRACKET_EARLY, levelIndex, maxLevelIndex);
			if (numEarlyBlueprints) {
				let minEarly = WorldCreatorConstants.getMinLocales(numEarlyBlueprints);
				let maxEarly = WorldCreatorConstants.getMaxLocales(numEarlyBlueprints);
				let countEarly = WorldCreatorRandom.randomInt((seed % 84) * l * l * l + 1, minEarly, maxEarly + 1);
				createLocales(worldVO, levelVO, true, countEarly - numExistingEarly, minEarly - numExistingEarly);
			}

			let numLateBlueprints = UpgradeConstants.getPiecesByCampOrdinal(campOrdinal, UpgradeConstants.BLUEPRINT_BRACKET_LATE, levelIndex, maxLevelIndex);
			if (numLateBlueprints > 0) {
				let minLate = WorldCreatorConstants.getMinLocales(numLateBlueprints);
				let maxLate = WorldCreatorConstants.getMaxLocales(numLateBlueprints);
				let countLate = WorldCreatorRandom.randomInt((seed % 84) * l * l * l + 1, minLate, maxLate + 1);
				createLocales(worldVO, levelVO, false, countLate - numExistingLate, minLate - numExistingLate);
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
		
		setSectorHazard: function (levelVO, sectorVO, hazardValueRand, hazardType, isClusterEdge, override) {
			var maxHazardValue = this.getMaxHazardValue(levelVO, sectorVO, hazardType, sectorVO.zone, override);
			if (maxHazardValue <= 0) return;
			var minHazardValue = this.getMaxHazardValueForLevel(hazardType, levelVO.campOrdinal - 1, sectorVO.zone, false);
			var hazardValue = minHazardValue + hazardValueRand * (maxHazardValue - minHazardValue);
			if (isClusterEdge) {
				hazardValue = hazardValue / 2;
			}
			hazardValue = this.getHazardValue(hazardValue, maxHazardValue);
			
			sectorVO.hazards[hazardType] = hazardValue;

			//WorldCreatorLogger.i("set sector hazard " + sectorVO.position + " type " + hazardType + " " + hazardValue);	
			
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
				
					if (hazardType == SectorConstants.HAZARD_TYPE_POLLUTION) {
						sectorVO.hazards.radiation = 0;
					}
				}
			}
		},

		getHazardValue: function (value, maxValue) {
			let result = value;

			if (result < 10) {
				result = Math.floor(result);
			} else {
				result = Math.ceil(result / 5) * 5;
			}

			if (result > maxValue) result = maxValue;

			return result;
		},
		
		getSectorType: function (seed, worldVO, levelVO, sectorTemplateVO, sectorVO) {
			let level = levelVO.level;
			let r1 = 9000 + seed % 2000 + (levelVO.level + 5) * 11 + sectorVO.position.sectorX * 141 + sectorVO.position.sectorY * 153;
			let rand = WorldCreatorRandom.random(r1);

			let savedType = sectorTemplateVO.sectorTYpe;
			
			let sectorType = SectorConstants.SECTOR_TYPE_MAINTENANCE;
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

			if (savedType) sectorType = savedType;
			
			if (sectorVO.workshopResource == "fuel") {
				sectorType = SectorConstants.SECTOR_TYPE_INDUSTRIAL;
			}
			
			if (sectorVO.workshopResource == "rubber") {
				sectorType = SectorConstants.SECTOR_TYPE_INDUSTRIAL;
			}

			if (sectorVO.hasStashWithLocaleType(localeTypes.office)) {
				sectorType = SectorConstants.SECTOR_TYPE_COMMERCIAL;
			}

			if (sectorVO.hasStashWithLocaleType(localeTypes.lab)) {
				sectorType = SectorConstants.SECTOR_TYPE_INDUSTRIAL;
			}
			
			return sectorType;
		},

		filterSectorForLuxuryLocationType: function (sectorVO, luxuryLocationType) {			
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
			
			return WorldCreatorRandom.randomItemFromArray(seed, options);
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
		
		isSunlit: function (seed, worldVO, levelVO, sectorTemplateVO, sectorVO) {
			let isSurfaceLevel = levelVO.level === worldVO.topLevel;
			
			if (sectorVO.isCamp && !isSurfaceLevel) return false;
			
			let l = sectorVO.position.level;
			let savedValue = sectorTemplateVO.sunlit || 0;
			
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
				return savedValue || 0;
			}
		},
		
		isSunlitByNeighbours: function (worldVO, levelVO, sectorVO) {
			let isSurfaceLevel = levelVO.level === worldVO.topLevel;
			if (sectorVO.isCamp && !isSurfaceLevel) return false;
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
			}
			if (campOrdinal > WorldCreatorConstants.MIN_CAMP_ORDINAL_HAZARD_POISON) {
				result.push(SectorConstants.HAZARD_TYPE_POLLUTION);
			}

			if (campOrdinal >= WorldCreatorConstants.MIN_CAMP_ORDINAL_HAZARD_RADIATION) {
				result.push(SectorConstants.HAZARD_TYPE_RADIATION);
			}
			if (campOrdinal > WorldCreatorConstants.MIN_CAMP_ORDINAL_HAZARD_RADIATION) {
				result.push(SectorConstants.HAZARD_TYPE_RADIATION);
			}

			if (campOrdinal >= WorldCreatorConstants.MIN_CAMP_ORDINAL_HAZARD_FLOODED) {
				result.push(SectorConstants.HAZARD_TYPE_FLOODED);
				result.push(SectorConstants.HAZARD_TYPE_FLOODED);
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
				}
			}

			if (levelVO.isCampable && campOrdinal > WorldConstants.CAMPS_BEFORE_GROUND) {
				let distanceToCamp = WorldCreatorHelper.getQuickMinDistanceToCamp(levelVO, sectorVO);

				if (distanceToCamp > 3) {
					result.push(SectorConstants.HAZARD_TYPE_GANG_TERRITORY);
					result.push(SectorConstants.HAZARD_TYPE_GANG_TERRITORY);

					if (levelVO.habitability >= 1) {
						result.push(SectorConstants.HAZARD_TYPE_GANG_TERRITORY);
						result.push(SectorConstants.HAZARD_TYPE_GANG_TERRITORY);
					}
				}
			}

			return result;
		},
		
		getMaxHazardValue: function (levelVO, sectorVO, hazardType, zone, override) {
			if (sectorVO.isCamp) return 0;
			if (sectorVO.requiredResources.water) return 0;
			if (sectorVO.workshopResource != null) return 0;
			if (sectorVO.hasLocaleOfType(localeTypes.grove)) return 0;
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
			} else if (hazardType == SectorConstants.HAZARD_TYPE_FLOODED) {
				return Math.min(100, this.itemsHelper.getMaxHazardFloodedForLevel(campOrdinal, step, isHardLevel));
			} else if (hazardType == SectorConstants.HAZARD_TYPE_GANG_TERRITORY) {
				return 1;
			} else {
				return 0;
			}
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
			
			let isValidForSettlement = distanceToCamp > 3 && levelVO.level !== 13 && levelVO.isCampable;
				
			// sector type based
			switch (sectorType) {
				case SectorConstants.SECTOR_TYPE_RESIDENTIAL:
					possibleTypes.push(localeTypes.grocery);
					possibleTypes.push(localeTypes.grocery);
					possibleTypes.push(localeTypes.house);
					possibleTypes.push(localeTypes.house);
					possibleTypes.push(localeTypes.transport);
					possibleTypes.push(localeTypes.warehouse);
					if (isValidForSettlement) {
						possibleTypes.push(localeTypes.camp);
					}
					break;

				case SectorConstants.SECTOR_TYPE_INDUSTRIAL:
					possibleTypes.push(localeTypes.factory);
					possibleTypes.push(localeTypes.factory);
					possibleTypes.push(localeTypes.junkyard);
					possibleTypes.push(localeTypes.transport);
					possibleTypes.push(localeTypes.warehouse);
					possibleTypes.push(localeTypes.warehouse);
					break;

				case SectorConstants.SECTOR_TYPE_MAINTENANCE:
					possibleTypes.push(localeTypes.bunker);
					possibleTypes.push(localeTypes.maintenance);
					possibleTypes.push(localeTypes.maintenance);
					possibleTypes.push(localeTypes.junkyard);
					possibleTypes.push(localeTypes.transport);
					break;

				case SectorConstants.SECTOR_TYPE_COMMERCIAL:
					possibleTypes.push(localeTypes.farm);
					possibleTypes.push(localeTypes.grocery);
					possibleTypes.push(localeTypes.grocery);
					possibleTypes.push(localeTypes.lab);
					possibleTypes.push(localeTypes.market);
					possibleTypes.push(localeTypes.market);
					possibleTypes.push(localeTypes.office);
					possibleTypes.push(localeTypes.office);
					possibleTypes.push(localeTypes.restaurant);
					possibleTypes.push(localeTypes.store);
					possibleTypes.push(localeTypes.store);
					possibleTypes.push(localeTypes.transport);
					possibleTypes.push(localeTypes.transport);
					possibleTypes.push(localeTypes.warehouse);
					break;

				case SectorConstants.SECTOR_TYPE_SLUM:
					possibleTypes.push(localeTypes.store);
					possibleTypes.push(localeTypes.house);
					possibleTypes.push(localeTypes.junkyard);
					possibleTypes.push(localeTypes.junkyard);
					if (isValidForSettlement) {
						possibleTypes.push(localeTypes.camp);
					}
					break;
					
				case SectorConstants.SECTOR_TYPE_PUBLIC:
					possibleTypes.push(localeTypes.lab);
					possibleTypes.push(localeTypes.library);
					possibleTypes.push(localeTypes.office);
					possibleTypes.push(localeTypes.transport);
					possibleTypes.push(localeTypes.hospital);
					break;

				default:
					WorldCreatorLogger.w("Unknown sector type " + sectorType);
					return null;
			}

			// other
			if (sectorVO.sunlit) {
				possibleTypes.push(localeTypes.farm);
			}
			
			var localeRandom = WorldCreatorRandom.random(s1);
			return possibleTypes[Math.floor(localeRandom * possibleTypes.length)];
		},
		
	};
	
	return SectorFeaturesGenerator;
});
