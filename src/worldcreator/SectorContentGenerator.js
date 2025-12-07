// generates content for sectors, stuff that can depend more on balancing and change between versions, stuff that other features should not depend on, last step in world gen
define([
	'ash',
	'utils/MathUtils',
	'game/constants/EnemyConstants',
	'game/constants/ExplorerConstants',
	'game/constants/PositionConstants',
	'game/constants/LevelConstants',
	'game/constants/LocaleConstants',
	'game/constants/MovementConstants',
	'game/constants/SectorConstants',
	'game/constants/StoryConstants',
	'game/constants/WorldConstants',
	'game/vos/GangVO',
	'game/vos/LocaleVO',
	'game/vos/PositionVO',
	'game/vos/WaymarkVO',
	'worldcreator/WorldCreatorConstants',
	'worldcreator/WorldCreatorHelper',
	'worldcreator/WorldCreatorLogger',
	'worldcreator/WorldCreatorRandom',
	'worldcreator/WorldCreatorDebug',
	'worldcreator/SectorGeneratorHelper',
], function (Ash, MathUtils,
	EnemyConstants, ExplorerConstants, PositionConstants, LevelConstants, LocaleConstants, MovementConstants, SectorConstants, StoryConstants, WorldConstants, 
	GangVO, LocaleVO, PositionVO, WaymarkVO, 
	WorldCreatorConstants, WorldCreatorHelper, WorldCreatorLogger, WorldCreatorRandom, WorldCreatorDebug, SectorGeneratorHelper) {
	
	let SectorContentGenerator = {

		generate: function (seed, worldVO, worldTemplateVO, levels, enemyCreator) {			
			this.generateExamineSpotsPerLevel(seed, worldVO);

			for (let i = 0; i < levels.length; i++) {
				let l = levels[i];
				let levelVO = worldVO.levels[l];

				this.generateLocalesForExplorers(seed, worldVO, levelVO);
				this.generateLocalesForStory(seed, worldVO, levelVO);
				this.generateEnemies(seed, worldVO, levelVO, enemyCreator);
				this.generateWaymarks(seed, worldVO, levelVO);
				this.generateSectorExamineSpots(seed, worldVO, levelVO);
				
				for (let s = 0; s < levelVO.sectors.length; s++) {
					let sectorVO = levelVO.sectors[s];
					sectorVO.graffiti = this.generateGraffiti(seed, worldVO, levelVO, sectorVO);
				}
			}

			// WorldCreatorDebug.printWorld(worldVO, [ "hasRegularEnemies"], "red" );
			// WorldCreatorDebug.printWorld(worldVO, [ "criticalPathTypes.length"], "red" );
		},

		generateLocalesForExplorers: function (seed, worldVO, levelVO) {
			let excludedFeatures = [ "isCamp", "isPassageUp", "isPassageDown", "workshopResource" ];
			let lateZones = [ WorldConstants.ZONE_POI_2, WorldConstants.ZONE_EXTRA_CAMPABLE ];

			for (let i = 0; i < levelVO.predefinedExplorers.length; i++) {
				let explorerID = levelVO.predefinedExplorers[i];
				let explorerTemplate = ExplorerConstants.getPredefinedExplorerTemplate(explorerID);
				let options = { excludingFeature: excludedFeatures, excludedZones: lateZones, filter: SectorGeneratorHelper.isValidSectorForLocale };
				let sector = WorldCreatorRandom.randomSectors(1000 + seed * 2, worldVO, levelVO, 1, 2, options)[0];
				let locale = new LocaleVO(explorerTemplate.localeType, true, true);
				locale.explorerID = explorerID;
				SectorGeneratorHelper.addLocale(levelVO, sector, locale);
			}
		},

		generateLocalesForStory: function (seed, worldVO, levelVO) {
			let excludedFeatures = [ "isCamp", "isPassageUp", "isPassageDown", "workshopResource" ];

			// TODO define hard coded locales in story constants or as input rather than hard-coding here
			// NOTE: keep texts referring to fall story facilities up to date if changing levels here

			let storyLocales = [
				{ type: localeTypes.grove, level: worldVO.bottomLevel, isEasy: true },
				{ type: localeTypes.compound, level: WorldCreatorHelper.getLastLevelForCamp(seed, 4), isEarly: false },
				{ type: localeTypes.depot, level: WorldCreatorHelper.getLastLevelForCamp(seed, 5), isEarly: false },
				{ type: localeTypes.seedDepot, level: WorldCreatorHelper.getLastLevelForCamp(seed, 6), isEarly: false },
				{ type: localeTypes.depot, level: WorldCreatorHelper.getLastLevelForCamp(seed, 7), isEarly: false },
				{ type: localeTypes.clinic, level: WorldCreatorHelper.getLastLevelForCamp(seed, 9), isEarly: true },
				{ type: localeTypes.spacefactory, level: WorldCreatorHelper.getLastLevelForCamp(seed, 10), isEarly: false },
				{ type: localeTypes.shelter, level: WorldCreatorHelper.getLastLevelForCamp(seed, 12), isEarly: false },
				{ type: localeTypes.clinic, level: WorldCreatorHelper.getFirstLevelForCamp(seed, 13), isEarly: true },
				{ type: localeTypes.isolationCenter, level: WorldCreatorHelper.getLastLevelForCamp(seed, 14), isEarly: false },
				{ type: localeTypes.expedition, level: WorldCreatorHelper.getLastLevelForCamp(seed, 15), isEarly: false },
			];

			for (let i = 0; i < storyLocales.length; i++) {
				let def = storyLocales[i];
				if (levelVO.level != def.level) continue;
				let options = { excludingFeature: excludedFeatures, filter: SectorGeneratorHelper.isValidSectorForLocale };
				let sector = WorldCreatorRandom.randomSectors(seed, worldVO, levelVO, 1, 2, options)[0];
				if (def.type == localeTypes.grove) sector.sunlit = 1;
				if (def.type == localeTypes.grove) sector.resourcesScavengable.food = Math.max(sector.resourcesScavengable.food, 3);
				if (def.type == localeTypes.grove) sector.resourcesScavengable.water = Math.max(sector.resourcesScavengable.water, 3);
				sector.hazards.radiation = 0;
				sector.hazards.poison = 0;
				let localeVO = new LocaleVO(def.type, def.isEarly, def.isEarly);
				SectorGeneratorHelper.addLocale(levelVO, sector, localeVO);
			}
		},

		generateEnemies: function (seed, worldVO, levelVO, enemyCreator) {
			var l = levelVO.level;
			var randomGangFreq = 45;
				
			var blockerType = MovementConstants.BLOCKER_TYPE_GANG;
			
			var selectEnemyIDsForGang = function (s1, s2) {
				let allEnemies = s1.possibleEnemies.concat(s2.possibleEnemies);
				let allEnemiesWithTags = allEnemies.filter(e => e.environment.indexOf("nogang") < 0);

				let possibleEnemies = allEnemiesWithTags;
				if (possibleEnemies.length == 0) possibleEnemies = allEnemies;
				
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
				if (!neighbourVO) neighbourVO = WorldCreatorRandom.getRandomSectorNeighbour(seed, levelVO, sectorVO);
				var direction = PositionConstants.getDirectionFrom(sectorVO.position, neighbourVO.position);
				var neighbourDirection = PositionConstants.getDirectionFrom(neighbourVO.position, sectorVO.position);
				
				var canHaveGang =
					WorldCreatorHelper.canPairHaveGang(levelVO, sectorVO, neighbourVO, true) &&
					WorldCreatorHelper.canSectorHaveGang(levelVO, sectorVO, direction, true) &&
					WorldCreatorHelper.canSectorHaveGang(levelVO, neighbourVO, neighbourDirection, true);
				if (canHaveGang) {
					var blockerSettings = { addDiagonals: addDiagonals };
					// callback is called twice, once for each sector
					SectorGeneratorHelper.addMovementBlocker(worldVO, levelVO, sectorVO, neighbourVO, blockerType, blockerSettings, function (s, direction) {
						s.numLocaleEnemies[LocaleConstants.getPassageLocaleId(direction)] = 3;
					}, function () {
						let enemyIDs = selectEnemyIDsForGang(sectorVO, neighbourVO);
						let pos1 = sectorVO.position;
						let pos2 = neighbourVO.position;
						let gangVO = new GangVO(pos1, pos2, enemyIDs);
						levelVO.gangs.push(gangVO);
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
				} else if (sectorVO.hazards.territory > 0) {
					sectorVO.hasRegularEnemies = true;
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
					var neighbourVO = WorldCreatorRandom.getRandomSectorNeighbour(seed, levelVO, sectorVO);
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

		generateExamineSpotsPerLevel: function (seed, worldVO) {
			let result = {}; // level => [ id ] 
			let spotDefinitions = StoryConstants.sectorExamineSpots;
			for (let i = 0; i < spotDefinitions.length; i++) {
				let def = spotDefinitions[i];
				let campOrdinal = def.positionParams.campOrdinal;
				let levels = WorldCreatorHelper.getLevelsForCamp(seed, campOrdinal);
				let levelIndex = def.positionParams.levelIndex;
				let level = typeof levelIndex === "undefined" ?
					WorldCreatorRandom.randomItemFromArray(seed, levels) :
					levels[Math.min(levelIndex, levels.length - 1)];
				if (!result[level]) result[level] = [];
				result[level].push(def.id);
			}
			
			worldVO.examineSpotsPerLevel = result;
		},

		generateSectorExamineSpots: function (seed, worldVO, levelVO) {
			let spots = worldVO.examineSpotsPerLevel[levelVO.level];
			if (!spots || spots.length == 0) return;
			
			let getExamineSpotSectorScore = function (sectorVO) {
				let score = 0;
				score -= sectorVO.locales.length;
				if (sectorVO.isInvestigatable) score -= 1;
				return score;
			};

			for (let i = 0; i < spots.length; i++) {
				let spotID = spots[i];
				let spot = StoryConstants.getSectorExampineSpot(spotID);

				let filter = function (sectorVO) {
					if (sectorVO.examineSpots.length > 0) return false;
					if (spot.positionParams.sectorType && spot.positionParams.sectorType != sectorVO.sectorType) return false;
					if (spot.positionParams.sunlit && !sectorVO.sunlit) return false;
					return true;
				};

				let excludedZones = [ WorldConstants.ZONE_ENTRANCE ];
				let excludedFeatures = [ "isCamp", "isPassageUp", "isPassageDown", "workshopResource" ];
				let options = { requireCentral: false, excludingFeature: excludedFeatures, pathConstraints: [], excludedZones: excludedZones, filter: filter };
				let sectors = WorldCreatorRandom.randomSectorsScored(1000 + i * 66, worldVO, levelVO, 1, 2, options, getExamineSpotSectorScore);
				if (sectors.length == 0) {
					WorldCreatorLogger.w("could not find sector for examine spot: " + spot.id);
					continue;
				}
				let sector = sectors[0];
				sector.examineSpots.push(spotID);
				WorldCreatorLogger.i("add examine spot " + spotID + " to " + sector.position);
			}
		},

		generateGraffiti: function (seed, worldVO, levelVO, sectorVO) {
			if (sectorVO.hazards.territory > 0) {
				let neighbours = levelVO.getNeighbourList(sectorVO.position.sectorX, sectorVO.position.sectorY);
				if (neighbours.every(neighbourVO => neighbourVO.hazards.territory > 0 && neighbourVO.graffiti == null)) {
					return "Red Hats";
				}
			}

			return null;
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
					
				let poiDistanceToStart = PositionConstants.getDistanceTo(candidate.poi.position, playerStartPosition);
				let waymarkDistanceToStart = PositionConstants.getDistanceTo(candidate.waymark.position, playerStartPosition);
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
			let maxNumWaymarksCommon = levelVO.habitability >= 1 ? 3 : 2;
			
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

		getPossibleEnemies: function (seed, worldVO, levelVO, sectorVO, enemyCreator) {
			let l = sectorVO.position.level;
			let x = sectorVO.position.sectorX;
			let y = sectorVO.position.sectorY;
			let campOrdinal = levelVO.campOrdinal;
			let step = WorldConstants.getCampStep(sectorVO.zone);

			let environmentTags = this.getSectorEnvironmentTags(worldVO, levelVO, sectorVO);
			
			let enemyDifficulty = enemyCreator.getDifficulty(campOrdinal, step);
			if (sectorVO.isOnEarlyCriticalPath()) enemyDifficulty -= 2;
			enemyDifficulty = Math.max(enemyDifficulty, 1);

			let enemies = [];
			
			// collect all valid enemies for this sector (candidates)
			let candidates = [];
			let candidateDifficulties = [];

			let allEnemies = enemyCreator.getEnemies(enemyDifficulty, environmentTags, 2);
			for (let e in allEnemies) {
				let enemy = allEnemies[e];
				candidates.push(enemy);
				candidateDifficulties.push(enemyCreator.getEnemyDifficultyLevel(enemy));
				enemyCreator.registerEnemyAsCandidateForSector(enemy.id, l, campOrdinal);
			}
			
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
					enemyCreator.registerEnemyAsPresentForSector(enemy.id, l, campOrdinal);
				}
			}

			return enemies;
		},

		getSectorEnvironmentTags: function (worldVO, levelVO, sectorVO) {
			let l = sectorVO.position.level;
			let x = sectorVO.position.sectorX;
			let y = sectorVO.position.sectorY;

			let tags = [];

			let isPollutedLevel = levelVO.notCampableReason === LevelConstants.UNCAMPABLE_LEVEL_TYPE_POLLUTION;
			let isRadiatedLevel = levelVO.notCampableReason === LevelConstants.UNCAMPABLE_LEVEL_TYPE_RADIATION;
			
			tags.push("nogang")
			if (levelVO.level == worldVO.bottomLevel) tags.push("ground");
			if (levelVO.level == worldVO.topLevel) tags.push("surface");
			if (levelVO.level < 14) tags.push("lowlevels");
			if (levelVO.level > 14) tags.push("highlevels");
			if (!isPollutedLevel && !isRadiatedLevel && !sectorVO.hazards.hasHazards()) tags.push("nohazard");
			if (sectorVO.hazards.cold > 0) tags.push("cold");
			if (isPollutedLevel || sectorVO.hazards.poison > 0) tags.push("toxic");
			if (isRadiatedLevel || sectorVO.hazards.radiation > 0) tags.push("radiation");
			if (sectorVO.sunlit) tags.push("sunlit");
			if (!sectorVO.sunlit) tags.push("dark");
			if (sectorVO.buildingDensity > 5) tags.push("dense");
			if (sectorVO.buildingDensity < 5) tags.push("sparse");
			if (sectorVO.activity < 4) tags.push("quiet");
			if (sectorVO.activity > 6) tags.push("busy");
			if (sectorVO.wealth == 3) tags.push("rich");
			if (sectorVO.wealth == 1) tags.push("poor");
			if (levelVO.habitability > 0) tags.push("inhabited");
			if (levelVO.habitability <= 0) tags.push("uninhabited");
			if (sectorVO.hazards.flooded > 0) tags.push("flooded");
			if (sectorVO.hazards.territory > 0) tags.push("territory");
			if (sectorVO.hazards.flooded === 0) tags.push("noflood");
			if (sectorVO.sectorType == SectorConstants.SECTOR_TYPE_INDUSTRIAL) tags.push("industrial");

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

			if (!isPollutedLevel && !isRadiatedLevel && hasWater) tags.push("water");

			return tags;
		},

	};
	
	return SectorContentGenerator;
});
