define([
	'ash',
	'utils/MathUtils',
	'utils/ObjectUtils',
	'game/helpers/ItemsHelper',
	'game/constants/LevelConstants',
	'game/constants/MovementConstants',
	'game/constants/PositionConstants',
	'game/constants/SectorConstants',
	'game/constants/WorldConstants',
	'game/constants/UpgradeConstants',
	'worldcreator/WorldCreatorConstants',
	'worldcreator/WorldCreatorHelper',
	'worldcreator/WorldCreatorRandom',
	'worldcreator/WorldTemplateVO',
], function (
	Ash, MathUtils, ObjectUtils, ItemsHelper, LevelConstants, MovementConstants, PositionConstants, SectorConstants, WorldConstants, UpgradeConstants, WorldCreatorConstants, WorldCreatorHelper, WorldCreatorRandom, WorldTemplateVO
) {
	let context = "WorldValidator";

	let WorldValidator = {

		SEVERITY_CRITICAL: 0, // world / template is broken
		SEVERITY_MAJOR: 1, // world is not well balanced
		SEVERITY_MINOR: 2, // world is not consistent / doesn't support story
		SEVERITY_COMPABILITY: 11, // world differs from template in a way that should not happen
		SEVERITY_CONTINUITY: 12, // world differs from template in a way that might be acceptable if the template is from an older version but needs to be handled properly in game logic
		
		// validates overall world skeleton, not levels or sectors
		// checks that the world is valid in itself, and also that it follows the template if one given
		validateWorld: function (worldVO, worldTemplateVO) {
			worldVO.resetPaths();

			let issues = [];
		
			let worldChecks = [
				this.checkWorldSeed, 
				this.checkWorldCampPositions, 
				this.checkWorldPassages,
				this.checkWorldFeatures,
				this.checkWorldDistricts,
				this.checkWorldMatchesTemplate,
			];

			for (let i = 0; i < worldChecks.length; i++) {
				let checkResult = worldChecks[i](worldVO, worldTemplateVO);
				if (!checkResult.isValid) issues = issues.concat(checkResult.issues);
			}
			
			return { check: "validateWorld", target: "worldVO", seed: worldVO.seed, isValid: issues.length === 0, issues: issues };
		},

		validateLevels: function (worldVO, worldTemplateVO, levels) {
			let issues = [];

			for (let i = 0; i < levels.length; i++) {
				let l = levels[i];
				let levelVO = worldVO.levels[l];
				let validationResult = this.validateLevel(worldVO, worldTemplateVO, levelVO);
				if (!validationResult.isValid) issues = issues.concat(validationResult.issues);
			}
			
			return { check: "validateLevels", target: "worldVO", seed: worldVO.seed, isValid: issues.length === 0, issues: issues };
		},

		// validates a given level, structure, sectors, features
		// checks that the level is valid in itself, and also that it follows the template if one given
		validateLevel: function (worldVO, worldTemplateVO, levelVO) {
			worldVO.resetPaths();

			let issues = [];

			let levelTemplateVO = worldTemplateVO ? worldTemplateVO.levels[levelVO.level] : null;

			let levelChecks = [ 
				this.checkLevelSize,
				this.checkLevelContinuous, 
				this.checkLevelPosition,
				this.checkLevelDensity,
				this.checkLevelPathLengths, 
				this.checkLevelCampsAndPassages, 
				this.checkLevelNumberOfSectors, 
				this.checkLevelNumberOfLocales,
				this.checkLevelMovementBlockers,
				this.checkLevelLight,
				this.checkLevelResources,
				this.checkLevelMatchesTemplate,
			];

			for (let i = 0; i < levelChecks.length; i++) {
				let checkResult = levelChecks[i](worldVO, levelVO, levelTemplateVO);
				if (!checkResult.isValid) issues = issues.concat(checkResult.issues);
			}

			let sectorChecks = [
				this.checkSectorPosition,
				this.checkSectorResources,
				this.checkSectorStashes,
				this.checkSectorHazards,
				this.checkSectorLocales,
				this.checkSectorFeatures,
				this.checkSectorMatchesTemplate,
			];

			for (let s = 0; s < levelVO.sectors.length; s++) {
				let sectorVO = levelVO.sectors[s];
				let sectorTemplateVO = levelTemplateVO ? levelTemplateVO.sectors[s] : null;

				for (let i = 0; i < sectorChecks.length; i++) {
					let checkResult = sectorChecks[i](worldVO, levelVO, sectorVO, sectorTemplateVO);
					if (!checkResult.isValid) issues = issues.concat(checkResult.issues);
				}
			}
			
			return { check: "validateLevel", target: "levelVO:" + levelVO.level, seed: worldVO.seed, isValid: issues.length === 0, issues: issues };
		},

		// validates that a WorldTemplateVO 
		// - reasonably matches the WorldVO it was created from
		// - exactly matches the source template the world was created from if there was one
		// - contains all necessary data
		// - and saves/loads correctly
		validateResultWorldTemplateVO: function (worldVO, worldTemplateVO, sourceWorldTemplateVO) {
			let issues = [];

			// TODO clear more of this data after world gen is done
			let notSavedKeysWorld = [ "districts", "stages", "examineSpotsPerLevel" ];
			let notSavedKeysLevel = [ 
				// derived data (no need to save in template per sector but available in SectorVO for convenience)
				"localeSectors", 
				"paths", 
				"raidDangerFactor", 
				"sectorNeighourCountCache",
				"sectorsByPos", 
				"sectorsByStage", 
				"stageCenterPositions",
				// debug data (no need to save but used for debug tools)
				"allConnectionPoints", 
				"centralStructureType",
				"invalidPositions", 
				"levelMapCenterPosition", 
				"levelPOICenterPosition", 
				"pendingConnectionPoints", 
				// validation data (used during world gen and validation)
				"maxSectors", 
				"requiredPaths", 
			];
			let notSavedKeysSector = [ 
				// derived data
				"criticalPathTypes", 
				"distanceToCamp",
				"districtIndex",
				"features",
				"hasRegularEnemies", 
				"isConnectionPoint", 
				"possibleEnemies", 
				"requiredFeatures", 
				"requiredResources", 
				"resourcesScavengable", 
				"waymarks", 
				// debug data
				"pathID", 
				"pathIndex", 
				"shape",
				"shapeID", 
				// unsorted
				"graffiti", 
				"id", 
			];

			// check worldTemplateVO matches worldVO
			let properties = Object.keys(worldVO);
			for (let i in properties) {
				let key = properties[i];
				let worldVOValue = worldVO[key];
				let templateVOValue = worldTemplateVO[key];
				if (notSavedKeysWorld.indexOf(key) >= 0 && !templateVOValue) continue;
				if (worldVOValue === templateVOValue) continue;
				if (key === "levels") {
					for (let level in worldVOValue) {
						let levelVO = worldVOValue[level];
						let levelTemplateVO = templateVOValue[level];
						let levelProperties = Object.keys(levelVO);
						for (let j in levelProperties) {
							let key2 = levelProperties[j];
							let levelVOValue = levelVO[key2];
							let levelTemplateVOValue = levelTemplateVO[key2];
							if (notSavedKeysLevel.indexOf(key2) >= 0 && !levelTemplateVOValue) continue;
							if (levelVOValue == levelTemplateVOValue) continue;
							if (levelVOValue.equals && levelVOValue.equals(levelTemplateVOValue)) continue;

							if (key2 === "sectors") {
								for (let s in levelVOValue) {
									let sectorVO = levelVOValue[s];
									let sectorTemplateVO = levelTemplateVOValue[s];
									let sectorProperties = Object.keys(sectorVO);
									for (let k in sectorProperties) {
										let key3 = sectorProperties[k];
										let sectorVOValue = sectorVO[key3];
										let sectorTemplateVOValue = sectorTemplateVO[key3];
										if (sectorVOValue == sectorTemplateVOValue) continue;
										if (notSavedKeysSector.indexOf(key3) >= 0 && !sectorTemplateVOValue) continue;
										issues.push({ 
											severity: WorldValidator.SEVERITY_CRITICAL, 
											desc: "SectorVO->SectorTemplateVO mismatch: " + key3 + " [" + sectorVOValue + "] [" +  sectorTemplateVOValue + "]"
										});
									}
								}
								continue;
							}

							if (Array.isArray(levelVOValue) && levelVOValue.length == levelTemplateVOValue.length) {
								let hasWrongValues = false;
								for (let i = 0; i < levelVOValue.length; i++) {
									if (!levelVOValue[i].equals(levelTemplateVOValue[i])) {
										hasWrongValues = true;
										break;
									}
								}

								if (!hasWrongValues) continue;
							}

							issues.push({ 
								severity: WorldValidator.SEVERITY_CRITICAL, 
								desc: "LevelVO->LevelTemplateVO mismatch: " + key2 + " [" + levelVOValue + "] [" +  levelTemplateVOValue + "]"
							});
						}
					}
					continue;
				}
				issues.push({ 
					severity: WorldValidator.SEVERITY_CRITICAL, 
					desc: "WorldVO->WorldTemplateVO mismatch: " + key + " [" + worldVOValue + "] [" +  templateVOValue + "]"
				});
			}

			// check worldTemplateVO saves and loads correctly
			let saveObject = worldTemplateVO.getCustomSaveObject();
			let saveJSON = JSON.stringify(saveObject);
			let parsedSaveObject = JSON.parse(saveJSON);
			let loadResult = new WorldTemplateVO();
			loadResult.customLoadFromSave(parsedSaveObject);
			let diff = ObjectUtils.diff(worldTemplateVO, loadResult);
			if (diff.total > 0) {
				issues.push({ 
					severity: WorldValidator.SEVERITY_CRITICAL, 
					desc: "worldTemplateVO did not save/load correctly: " + diff.total + ", keys: " + Object.keys(diff.byKey).join(", ")
				});
			}

			// check old and new WorldTemplateVO match (world gen did not change template)
			if (sourceWorldTemplateVO) {
				let diff = ObjectUtils.diff(worldTemplateVO, sourceWorldTemplateVO);
				if (diff.total > 0) {
					issues.push({ 
						severity: WorldValidator.SEVERITY_CRITICAL, 
						desc: "source and result world templates differ: " + diff.total + ", keys: " + Object.keys(diff.byKey).join(", ")
					});
				}
			}
			
			return { check: "validateResultWorldTemplateVO", target: "worldTemplateVO", seed: worldVO.seed, isValid: issues.length === 0, issues: issues };
		},

		// validates that a WorldTemplateVO loaded from save can be used as input to world generation 
		validateLoadedWorldTemplateVO: function (worldTemplateVO) {
			let issues = [];

			for (let l in worldTemplateVO.levels) {
				let levelTemplateVO = worldTemplateVO.levels[l];
				let isCampable = levelTemplateVO.isCampable;
				if (isCampable && levelTemplateVO.sectors.length > 0) {
					let numEarlySectors = levelTemplateVO.sectors.filter(s => s.stage == WorldConstants.CAMP_STAGE_EARLY).length;
					if (numEarlySectors == 0) issues.push("no early sectors on campable level");
				}
			}

			return { check: "validateLoadedWorldTemplateVO", target: "worldTemplateVO", seed: worldTemplateVO.seed, isValid: issues.length === 0, issues: issues };
		},

		logSummary: function (validationResult) {
			if (validationResult.isValid) {
				log.i("WorldValidator." + validationResult.check + ": " + validationResult.target + " (seed " + validationResult.seed + ") is VALID", "world");
			} else {
				let issues = validationResult.issues;
				let issuesBySeverity = {};
				let severities = [ WorldValidator.SEVERITY_CRITICAL, WorldValidator.SEVERITY_MAJOR, WorldValidator.SEVERITY_COMPABILITY, WorldValidator.SEVERITY_CONTINUITY ];
				for (let i = 0; i < severities.length; i++) {
					let severity = severities[i];
					issuesBySeverity[severity] = issues.filter(issue => (issue.severity || WorldValidator.SEVERITY_CRITICAL) === severity);
				}
				log.e("WorldValidator." + validationResult.check + ": " + validationResult.target + " (seed " + validationResult.seed + ") is INVALID! Issues: " + issues.length, "world");
				for (let i = 0; i < issues.length; i++) {
					let desc = issues[i].desc || issues[i];
					log.e("- " + desc, "world");
				}
			}
		},

		getSummary: function (validationResult) {
			if (validationResult.isValid) {
				return "valid";
			} else {
				let issues = validationResult.issues;
				return "invalid with " + issues.length + " issues (example: " + (issues[0].desc || issues[0]) + ")";
			}
		},

		checkWorldSeed: function (worldVO) {
			let issues = [];

			if (!worldVO.seed) issues.push({ severity: WorldValidator.SEVERITY_CRITICAL, desc: "no seed" });
			if (worldVO.seed < 0) issues.push({ severity: WorldValidator.SEVERITY_CRITICAL, desc: "negative seed" });

			return { isValid: issues.length === 0, issues: issues };
		},

		checkWorldCampPositions: function (worldVO) {
			let issues = [];

			let numCampPositions = Object.keys(worldVO.campPositions);
			if (numCampPositions < 15) issues.push({ severity: WorldValidator.SEVERITY_CRITICAL, desc: "too few camp positions (" + numCampPositions + ")" });
			if (numCampPositions > 15) issues.push({ severity: WorldValidator.SEVERITY_CRITICAL, desc: "too many camp positions (" + numCampPositions + ")" });

			return { isValid: issues.length === 0, issues: issues };
		},

		checkWorldPassages: function (worldVO) {
			let issues = [];

			for (let l = worldVO.bottomLevel; l <= worldVO.topLevel; l++) {
				if (!worldVO.passagePositions[l]) issues.push({ severity: WorldValidator.SEVERITY_CRITICAL, desc: "no passage positions defined for level " + l });
				if (!worldVO.passageTypes[l]) issues.push({ severity: WorldValidator.SEVERITY_CRITICAL, desc: "no passage types defined for level " + l });
			}

			return { isValid: issues.length === 0, issues: issues };
		},

		checkWorldFeatures: function (worldVO) {
			let issues = [];

			let requiredFeatures = [
				{ type: WorldConstants.FEATURE_HOLE_COLLAPSE, min: 1, max: 3 },
				{ type: WorldConstants.FEATURE_STRUCTURE_GIGA_CENTER, min: 1, max: 1 },
				{ type: WorldConstants.FEATURE_STRUCTURE_PILLAR, min: 20, max: -1 },
				{ type: WorldConstants.FEATURE_TRAIN_TRACKS_NEW, min: 2, max: -1 },
				{ type: WorldConstants.FEATURE_TRAIN_TRACKS_OLD, min: 2, max: -1 },
			];

			for (let i = 0; i < requiredFeatures.length; i++) {			
				let reqs = requiredFeatures[i];
				let featureVOs = worldVO.getFeaturesByType(reqs.type);

				if (reqs.min > 0 && featureVOs.length < reqs.min)
					issues.push({ severity: WorldValidator.SEVERITY_MINOR, desc: "not enough features of type " + reqs.type + " defined" });
				
				if (reqs.max >= 0 && featureVOs.length > reqs.max)
					issues.push({ severity: WorldValidator.SEVERITY_MINOR, desc: "too many features of type " + reqs.type + " defined" });
			}

			return { isValid: issues.length === 0, issues: issues };
		},

		checkWorldDistricts: function (worldVO) {
			let issues = [];

			let allDistrictTypes = [];
			let allDistrictStyles = [];

			for (let l = worldVO.bottomLevel; l <= worldVO.topLevel; l++) {
				let districts = worldVO.levels[l].districts;
				let levelDistrictTypes = [];

				if (districts.length < 2) {
					issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "too few districts (" + districts.length + ") on level " + l });
					continue;
				}

				for (let i = 0; i < districts.length; i++) {
					let districtVO = districts[i];
					let districtType = districtVO.type;
					if (allDistrictTypes.indexOf(districtType) < 0) allDistrictTypes.push(districtType);
					if (levelDistrictTypes.indexOf(districtType) < 0) levelDistrictTypes.push(districtType);

					let districtStyle = districtVO.style;
					if (allDistrictStyles.indexOf(districtStyle) < 0) allDistrictStyles.push(districtStyle);
				}

				if (l == 14) continue;

				if (levelDistrictTypes.length < 2) {
					issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "too few district district types (" + levelDistrictTypes.length + ") on level " + l + " (" + districts.length + " districts)" });
				}
			}

			if (allDistrictTypes.length < 4) {
				issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "too few district district types (" + allDistrictTypes.length + ") in world" });
			}

			if (allDistrictStyles.length < 6) {
				issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "too few district district styles (" + allDistrictStyles.length + ") in world" });
			}

			if (allDistrictStyles.indexOf(SectorConstants.STYLE_CITTADINIAN) < 0 && allDistrictStyles.indexOf(SectorConstants.STYLE_KIEVAN) < 0) {
				issues.push({ severity: WorldValidator.SEVERITY_MINOR, desc: "no city state found in world" });
			}

			return { isValid: issues.length === 0, issues: issues };
		},

		checkLevelSize: function (worldVO, levelVO) {
			let issues = [];

			let width = Math.abs(levelVO.maxX - levelVO.minX);
			let height = Math.abs(levelVO.maxY - levelVO.minY);

			if (width > WorldConstants.MAX_WIDTH) issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "level " + levelVO.level + " is too wide (" + width + ")" });
			if (height > WorldConstants.MAX_HEIGHT) issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "level " + levelVO.level + " is too tall (" + height + ")" });

			return { isValid: issues.length === 0, issues: issues };
		},
		
		checkLevelPathLengths: function (worldVO, levelVO) {
			let issues = [];

			// list paths to check
			// - critical paths (between passages and camps, length defined per type)
			let requiredPaths = WorldCreatorHelper.getRequiredPaths(worldVO, levelVO);

			// - paths to all sectors (between excursion start position and all sectors, most permissive length just to check it's not entirely impossible)
			let excursionStartPosition = levelVO.getExcursionStartPosition();
			let defaultMaxPathLen = WorldCreatorConstants.getMaxPathLength(levelVO.campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_2);
			for (let i = 0; i < levelVO.sectors.length; i++) {
				let sectorVO = levelVO.sectors[i];
				let pathType = null;
				let maxlen = defaultMaxPathLen;

				if (sectorVO.locales.length > 0) pathType = "locale";
				if (sectorVO.hasWorkshop) pathType = "workshop";
				if (sectorVO.hasTradeConnectorSpot) pathType = "trade connector spot";
				
				if (!pathType) {
					pathType = "s" + sectorVO.position.getCustomSaveObjectWithoutCamp();
					maxlen += 4;
				}

				requiredPaths.push({ start: excursionStartPosition, end: sectorVO.position, maxlen: maxlen, isValidationOnly: true, type: pathType });
			}

			// check lengths
			for (let i = 0; i < requiredPaths.length; i++) {
				let path = requiredPaths[i];
				let startPos = path.start.clone();
				let endPos = path.end.clone();
				if (PositionConstants.areEqual(startPos, endPos)) continue;
				let sectorPath = WorldCreatorRandom.findPath(worldVO, startPos, endPos, false, true, path.stage);

				if (!sectorPath || sectorPath.length < 1) {
					issues.push({ severity: WorldValidator.SEVERITY_CRITICAL, desc: "required path [" + path.type + "] on level " + levelVO.level + " is missing" });
					continue;
				} 

				if (path.maxlen > 0 && sectorPath.length > path.maxlen) {
					issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "required path [" + path.type + "] on level " + levelVO.level + " is too long (" + sectorPath.length + "/" + path.maxlen + ")" });
				}

				if (!path.isValidationOnly) {
					for (let s = 0; s < sectorPath.length; s++) {
						let pathPosition = sectorPath[i];
						let pathSectorVO = levelVO.getSectorByPos(pathPosition);
						if (pathSectorVO.criticalPathTypes.indexOf(path.type) < 0) {
							issues.push({ severity: WorldValidator.SEVERITY_MINOR, desc: "critical path " + path.type + " not marked on sector " + pathSectorVO.position });
						}
					}
				}
			}

			return { isValid: issues.length === 0, issues: issues };
		},
		
		checkLevelNumberOfSectors: function (worldVO, levelVO) {
			let issues = [];

			let maxOverflow = WorldCreatorConstants.getMaxSectorOverflow(levelVO.levelOrdinal);

			if (levelVO.sectors.length < levelVO.numSectors) {
				issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "too few sectors on level " + levelVO.level + ": " + levelVO.sectors.length + "/" + levelVO.numSectors });
			}
			if (levelVO.sectors.length > levelVO.maxSectors + maxOverflow) {
				issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "too many sectors on level " + levelVO.level + ": " + levelVO.sectors.length + "/" + levelVO.maxSectors });
			}

			let possibleStages = [ WorldConstants.CAMP_STAGE_EARLY, WorldConstants.CAMP_STAGE_LATE ];
			let validStages = levelVO.isCampable ? [ WorldConstants.CAMP_STAGE_EARLY, WorldConstants.CAMP_STAGE_LATE ] : [  WorldConstants.CAMP_STAGE_LATE ];
			let maxOverflowPerStage = Math.ceil(maxOverflow / validStages.length)

			for (let i = 0; i < possibleStages.length; i++) {
				let stage = possibleStages[i];

				// NOTE: sectors per stage is a minimum used for evidence balancing etc, a bit of overshoot is ok
				let numSectorsCreated = levelVO.getNumSectorsByStage(stage);
				let numSectorsPlanned = levelVO.numSectorsByStage[stage];

				if (numSectorsCreated < numSectorsPlanned) {
					issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "too few sectors on level " + levelVO.level + " stage " + stage + ": " + numSectorsCreated + "/" + numSectorsPlanned });
				}
				if (numSectorsCreated > numSectorsPlanned + maxOverflowPerStage) {
					issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "too many sectors on level " + levelVO.level + " stage " + stage + ": " + numSectorsCreated + "/" + numSectorsPlanned });
				}
			}

			return { isValid: issues.length === 0, issues: issues };
		},
		
		checkLevelNumberOfLocales: function (worldVO, levelVO) {
			let issues = [];

			let campOrdinal = levelVO.campOrdinal;

			let numEarlyLocales = 0;
			let numLateLocales = 0;
			for (var s = 0; s < levelVO.sectors.length; s++) {
				var sectorVO = levelVO.sectors[s];
				if (sectorVO.locales.length > 0) {
					for (var l = 0; l < sectorVO.locales.length; l++) {
						var isEarly = sectorVO.locales[l].isEarly;
						if (isEarly) {
							numEarlyLocales++;
						} else {
							numLateLocales++;
						}
					}
				}
			}

			let levelIndex = WorldCreatorHelper.getLevelIndexForCamp(worldVO.seed, campOrdinal, levelVO.level);
			let maxLevelIndex = WorldCreatorHelper.getMaxLevelIndexForCamp(worldVO.seed, campOrdinal, levelVO.level);
			let numEarlyBlueprints = UpgradeConstants.getPiecesByCampOrdinal(campOrdinal, UpgradeConstants.BLUEPRINT_BRACKET_EARLY, levelIndex, maxLevelIndex);
			if (numEarlyLocales < numEarlyBlueprints) {
				issues.push({ severity: WorldValidator.SEVERITY_CRITICAL, desc: "too few early locales for level " + levelVO.level + ", camp ordinal " + campOrdinal + " " + numEarlyLocales + "/" + numEarlyBlueprints });
			}
			let numLateBlueprints = UpgradeConstants.getPiecesByCampOrdinal(campOrdinal, UpgradeConstants.BLUEPRINT_BRACKET_LATE, levelIndex, maxLevelIndex);
			if (numLateLocales < numLateBlueprints) {
				issues.push({ severity: WorldValidator.SEVERITY_CRITICAL, desc: "too few late locales for level " + levelVO.level + ", camp ordinal " + campOrdinal + " " + numLateLocales + "/" + numLateBlueprints });
			}

			return { isValid: issues.length === 0, issues: issues };
		},
		
		checkLevelMovementBlockers: function (worldVO, levelVO) {
			let issues = [];

			let directions = PositionConstants.getLevelDirections();
			let entrancePosition = levelVO.getEntrancePassagePosition();

			let movementBlockers = [];

			let getBlockerID = function (s1, s2, blockerType) {
				let isSector1First = s1.position.sectorX + s1.position.sectorY < s2.position.sectorX + s2.position.sectorY;
				let pos1 = isSector1First ? s1.position : s2.position;
				let pos2 = isSector1First ? s2.position : s1.position;
				return pos1.sectorX + "-" + pos1.sectorY + "-" + pos2.sectorX + "-" + pos2.sectorY + "-" + blockerType;
			};

			let getBlockerDistance = function (blocker1, blocker2) {
				return Math.max(
					PositionConstants.getDistanceTo(blocker1.sector1.position, blocker2.sector1.position),
					PositionConstants.getDistanceTo(blocker1.sector2.position, blocker2.sector2.position),
					PositionConstants.getDistanceTo(blocker1.sector1.position, blocker2.sector2.position),
					PositionConstants.getDistanceTo(blocker1.sector2.position, blocker2.sector1.position),
				) - 1;
			};

			let getSectorsBetweenBlockers = function (blocker1, blocker2) {
				let result = [];
				let d_b1s1_b2s1 = PositionConstants.getDistanceTo(blocker1.sector1.position, blocker2.sector1.position);
				let d_b1s1_b2s2 = PositionConstants.getDistanceTo(blocker1.sector1.position, blocker2.sector2.position);
				let d_b1s2_b2s1 = PositionConstants.getDistanceTo(blocker1.sector2.position, blocker2.sector1.position);
				let d_b1s2_b2s2 = PositionConstants.getDistanceTo(blocker1.sector2.position, blocker2.sector2.position);

				if (d_b1s1_b2s1 < d_b1s2_b2s1) 
					result.push(blocker1.sector1);
				else
					result.push(blocker1.sector2);

				if (d_b1s1_b2s1 < d_b1s1_b2s2) 
					result.push(blocker2.sector1);
				else
					result.push(blocker2.sector2);

				return result;
			};

			let checkIsValidMovementBlockerSector = function (sectorVO) {
				if (sectorVO.isCamp) {
					issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "movement blocker at camp sector " + sectorVO });
					return false;
				}

				if (sectorVO.position.equals(entrancePosition)) {
					issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "movement blocker at entrance passage sector " + sectorVO });
					return false;
				}

				let numNeighbours = levelVO.getNeighbourCount(sectorVO.position.sectorX, sectorVO.position.sectorY);

				if (numNeighbours == 1) {
					issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "movement blocker at dead end sector " + sectorVO });
					return false;
				}
				return true;
			};

			let hasSectorUnblockedDirections = function (sectorVO, ignoreSectors) {
				for (let i in directions) {
					let direction = directions[i];
					let neighbourPos = PositionConstants.getPositionOnPath(sectorVO.position, direction, 1);
					let neighbour = levelVO.getSector(neighbourPos.sectorX, neighbourPos.sectorY);
					if (!neighbour) continue;
					if (ignoreSectors.indexOf(neighbour) >= 0) continue;
					let movementBlocker = sectorVO.movementBlockers[direction];
					if (movementBlocker) continue;
					return true;
				}

				return false;
			};

			let blockerTypes = [];

			// - find all movement blockers
			for (let s = 0; s < levelVO.sectors.length; s++) {
				let sectorVO = levelVO.sectors[s];
				for (let i in directions) {
					let direction = directions[i];
					let neighbourPos = PositionConstants.getPositionOnPath(sectorVO.position, direction, 1);
					let neighbour = levelVO.getSector(neighbourPos.sectorX, neighbourPos.sectorY);
					if (!neighbour) continue;
					let movementBlocker = sectorVO.movementBlockers[direction];
					if (!movementBlocker) continue;

					if (blockerTypes.indexOf(movementBlocker) < 0) blockerTypes.push(movementBlocker);

					let id = getBlockerID(sectorVO, neighbour, movementBlocker);
					
					if (movementBlockers.find(b => b.id == id)) continue;

					movementBlockers.push({ id: id, sector1: sectorVO, sector2: neighbour, blockerType: movementBlocker });
				}
			}

			// - check all movement blockers are valid
			for (let i = 0; i < movementBlockers.length; i++) {
				let movementBlocker = movementBlockers[i];

				checkIsValidMovementBlockerSector(movementBlocker.sector1);
				checkIsValidMovementBlockerSector(movementBlocker.sector2);

				if (movementBlocker.blockerType != MovementConstants.BLOCKER_TYPE_GANG) {
					// let pathAround =  WorldCreatorRandom.findPath(worldVO, movementBlocker.sector1.position, movementBlocker.sector2.position, true, true, null, true, 2);
					// if (pathAround && pathAround.length > 0) {
					// 	issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "path around movement blocker exists at " + movementBlocker.id + ", len: " + pathAround.length });
					// }
				}

				for (let j = i + 1; j < movementBlockers.length; j++) {
					let otherMovementBlocker = movementBlockers[j];
					let distance = getBlockerDistance(movementBlocker, otherMovementBlocker);
					if (distance > 3) continue;
					
					let sectorsInBetween = getSectorsBetweenBlockers(movementBlocker, otherMovementBlocker);
					let sectorsInBetweenWithUnblockedDirections = sectorsInBetween.filter(s => hasSectorUnblockedDirections(s, sectorsInBetween));

					if (sectorsInBetweenWithUnblockedDirections.length == 0) {					
						issues.push({ severity: WorldValidator.SEVERITY_MINOR, desc: "two movement blockers too close with no alternative path: " + movementBlocker.id + " " + otherMovementBlocker.id });
					}
				}
			}

			// - check there are some movement blockers
			let minMovementBlockers = levelVO.isCampable ? 3 : 1;
			if (movementBlockers.length < 1) {
				issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "level " + levelVO.level + " doesn't have any movement blockers" });
			} else if (movementBlockers.length < minMovementBlockers) {
				issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "level " + levelVO.level + " has very few movement blockers" });
			}

			// - check there are some variety 
			if (levelVO.isCampable && blockerTypes.length < 2) {
				issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "level " + levelVO.level + " has has only " + blockerTypes.length + " type of movement blockers" });
			}

			return { isValid: issues.length === 0, issues: issues };
		},

		checkLevelLight: function (worldVO, levelVO) {
			let issues = [];

			let sunlitSectors = levelVO.sectors.filter(s => s.sunlit > 0);
			let sunlitCount = sunlitSectors.length;
			let sunlitPercentage = sunlitCount / levelVO.sectors.length;

			let minSunlitPercentage = 0;
			if (levelVO.level > 14) minSunlitPercentage = 10;

			let maxSunlitPercentage = 0;
			if (levelVO.level > 14) maxSunlitPercentage = 20;
			if (levelVO.level < 10) maxSunlitPercentage = 10;
			if (levelVO.level > 20) maxSunlitPercentage = 100;

			if (sunlitPercentage < minSunlitPercentage)
				issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "too few sunlit sectors on level " + levelVO.level + "(" + sunlitCount + ")" });

			if (sunlitPercentage > maxSunlitPercentage)
				issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "too many sunlit sectors on level " + levelVO.level + "(" + sunlitCount + ")" });


			let numSunlitSectorsWithOnlyOneSunlitNeighbour = 0;
			for (let i = 0; i < sunlitSectors.length; i++) {
				let sectorVO = sunlitSectors[i];
				let neighbours = levelVO.getNeighbourList(sectorVO.position.sectorX, sectorVO.position.sectorY);
				if (!neighbours || neighbours.length <= 0) continue;
				let sunlitNeighbours = neighbours.filter(s => s.sunlit > 0);
				if (sunlitNeighbours.length == 0) {
					issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "sunlit sector without sunlit neighbours at " + sectorVO.position });
				}
				if (sunlitNeighbours.length == 1) {
					numSunlitSectorsWithOnlyOneSunlitNeighbour++;
				}
			}

			if (numSunlitSectorsWithOnlyOneSunlitNeighbour / sunlitCount > 0.15)
				issues.push({ severity: WorldValidator.SEVERITY_MINOR, desc: "too many sunlit sectors with only one sunlit neighbour on level " + levelVO.level });


			let beaconSpots = levelVO.sectors.filter(s => !s.sunlit && s.buildingDensity > 1 && s.buildingDensity < 10 && !s.hazards.hasHazards());
			let minBeaconSpots = levelVO.habitability > 0 ? 5 : 3;
			if (beaconSpots.length < minBeaconSpots)
				issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "not enough valid beacon ("+ beaconSpots.length + "/" + minBeaconSpots + ") spots on level " + levelVO.level });

			return { isValid: issues.length === 0, issues: issues };
		},
		
		checkLevelResources: function (worldVO, levelVO) {
			let issues = [];
			let isGround = levelVO.level == worldVO.bottomLevel;
			let isSurface = levelVO.level == worldVO.topLevel;
			let isPolluted = levelVO.notCampableReason == LevelConstants.UNCAMPABLE_LEVEL_TYPE_RADIATION || levelVO.notCampableReason == LevelConstants.UNCAMPABLE_LEVEL_TYPE_POLLUTION;

			let thresholds = {};
			thresholds[resourceNames.water] = { sca: { min: 0, max: 10 }, col: { min: 1, max: 15 } };
			thresholds[resourceNames.food] = { sca: { min: (isPolluted ? 0 : 1), max: 50 }, col: { min: 3, max: 30 } };
			thresholds[resourceNames.metal] = { sca: { min: 25, max: 99 } };
			thresholds[resourceNames.rope] = { sca: { min: 0, max: 15 } };
			thresholds[resourceNames.herbs] = { sca: { min: (isGround || isSurface ? 5 : 0), max: (isGround || isSurface ? 50 : 10) } };
			thresholds[resourceNames.fuel] = { sca: { min: 0, max: 10 } };
			thresholds[resourceNames.rubber] = { sca: { min: 0, max: 10 } };
			thresholds[resourceNames.tools] = { sca: { min: 0, max: 10 } };
			thresholds[resourceNames.medicine] = { sca: { min: 0, max: 10 } };
			thresholds[resourceNames.concrete] = { sca: { min: 0, max: 10 } };
			thresholds["any"] = { sca: { min: 30, max: 99 }, col: { min: 5, max: 45 } };
			thresholds["rare"] = { sca: { min: 0, max: 10 } };

			let hasScavengeable = function (sectorVO, name) {
				if (name == "any") return sectorVO.resourcesScavengable.getTotal() > 0;
				if (name == "rare") {
					return hasScavengeable(sectorVO, resourceNames.fuel) 
						|| hasScavengeable(sectorVO, resourceNames.rubber) 
						|| hasScavengeable(sectorVO, resourceNames.tools) 
						|| hasScavengeable(sectorVO, resourceNames.medicine);
				}
				return sectorVO.resourcesScavengable.hasResource(name);
			};

			let hasCollectable = function (sectorVO, name) {
				if (name == "any") return sectorVO.resourcesCollectable.getTotal() > 0;
				if (name == "rare") return false;
				let value = sectorVO.resourcesCollectable.hasResource(name);
				if (name == resourceNames.water) value = value || sectorVO.hasSpring;
				return value;
			};

			let checkResource = function (name) {
				let resourceScaCount = levelVO.sectors.filter(s => hasScavengeable(s, name)).length;
				let resourceScaFrequency = Math.round(resourceScaCount / levelVO.sectors.length * 100);

				if (thresholds[name] && thresholds[name].sca && resourceScaFrequency < thresholds[name].sca.min) 
					issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "level " + levelVO.level + " has too few sectors with scavengeable " + name + " (" + resourceScaFrequency + "%)" });
				if (thresholds[name] && thresholds[name].sca && resourceScaFrequency > thresholds[name].sca.max)
					issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "level " + levelVO.level + " has too many sectors with scavengeable " + name + " (" + resourceScaFrequency + "%)" });

				let resourceColCount = levelVO.sectors.filter(s => hasCollectable(s, name)).length;
				let resourceColFrequency = Math.round(resourceColCount / levelVO.sectors.length * 100);

				if (thresholds[name] && thresholds[name].col && resourceColFrequency < thresholds[name].col.min) 
					issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "level " + levelVO.level + " has too few sectors with collectable " + name + " (" + resourceColFrequency + "%)" });
				if (thresholds[name] && thresholds[name].col && resourceColFrequency > thresholds[name].col.max)
					issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "level " + levelVO.level + " has too many sectors with collectable " + name + " (" + resourceColFrequency + "%)" });
			}

			for (let name in resourceNames) {
				checkResource(name);
			}

			checkResource("any");
			checkResource("rare");

			return { isValid: issues.length === 0, issues: issues };
		},

		checkLevelContinuous: function (worldVO, levelVO) {
			let issues = [];

			let checkIsContinuous = function (startPosition, sectors, stage, context) {
				for (let i = 0; i < sectors.length; i++) {
					if (sectors[i].position.equals(startPosition)) continue;
					let sectorPath = WorldCreatorRandom.findPath(worldVO, startPosition, sectors[i].position, false, true, stage);
					if (!sectorPath || sectorPath.length < 1) {
						issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: context + " is not continuous on level " + levelVO.level });
						break;
					}
				}
			}

			let excursionStartPosition = levelVO.getExcursionStartPosition();
			checkIsContinuous(excursionStartPosition, levelVO.sectors, null, "whole level");

			let earlySectors = levelVO.sectorsByStage[WorldConstants.CAMP_STAGE_EARLY];
			if (earlySectors && earlySectors.length > 1) {
				checkIsContinuous(earlySectors[0].position, earlySectors, WorldConstants.CAMP_STAGE_EARLY, "early stage");
			}

			return { isValid: issues.length === 0, issues: issues };
		},

		checkLevelPosition: function (worldVO, levelVO) {
			let issues = [];

			let middlePosition = PositionConstants.getMiddlePoint(levelVO.sectors.map(sectorVO => sectorVO.position));

			let expectedMiddlePosition = { sectorX: 0, sectorY: 0 };
			if (levelVO.level < 13) expectedMiddlePosition = { sectorX: Math.round((13 - levelVO.level) * -5), sectorY: 0 };

			let distance = PositionConstants.getDistanceTo(middlePosition, expectedMiddlePosition);

			if (distance > 20) {
				issues.push({ severity: WorldValidator.SEVERITY_MINOR, desc: "level average sector position too far (" + Math.round(distance) + ") from expected on level " + levelVO.level });
			}

			return { isValid: issues.length === 0, issues: issues };
		},

		checkLevelDensity: function (worldVO, levelVO) {
			let issues = [];

			// good level is not too dense and not too spread out, giving player paths to choose from but not an open field

			let averageNumNeighbours = levelVO.sectors.reduce((accumulator, s) => accumulator + levelVO.getNeighbourCount(s.position.sectorX, s.position.sectorY), 0) / levelVO.sectors.length;

			if (averageNumNeighbours < 2.3) {
				issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "level average num neighbours is too low: " + Math.round(averageNumNeighbours*100)/100 });
			}

			if (averageNumNeighbours > 3.15) {
				issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "level average num neighbours is too high: " + Math.round(averageNumNeighbours*100)/100 });
			}

			let averageDensity = levelVO.sectors.reduce((accumulator, s) => accumulator + levelVO.getAreaDensity(s.position.sectorX, s.position.sectorY, 2), 0) / levelVO.sectors.length;

			if (averageDensity < 0.25) {
				issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "level average 2-area density is too low: " + Math.round(averageDensity*100)/100 });
			}

			if (averageDensity > 0.38) {
				issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "level average 2-area density is too high: " + Math.round(averageDensity*100)/100 });
			}

			for (let s = 0; s < levelVO.sectors.length; s++) {
				let sectorVO = levelVO.sectors[s];
				let localDensity = levelVO.getAreaDensity(sectorVO.position.sectorX, sectorVO.position.sectorY, 2);

				if (localDensity > 0.73) {
					issues.push({ severity: WorldValidator.SEVERITY_MINOR, desc: "sector local 2-area density is too high at " + sectorVO + " : " + Math.round(localDensity*100)/100 });
				}

			}

			return { isValid: issues.length === 0, issues: issues };
		},	
		
		checkLevelCampsAndPassages: function (worldVO, levelVO) {
			let issues = [];

			let pois = [];
			
			// passages up
			if (levelVO.level != worldVO.topLevel) {
				if (!levelVO.passageUpPosition) {
					issues.push({ severity: WorldValidator.SEVERITY_CRITICAL, desc: "level " + levelVO.level + " missing passage up position" });
				}
				let sector = levelVO.getSector(levelVO.passageUpPosition.sectorX, levelVO.passageUpPosition.sectorY);
				if (!sector) {
					issues.push({ severity: WorldValidator.SEVERITY_CRITICAL, desc: "level " + levelVO.level + " missing passage up sector" });
				}
				pois.push(levelVO.passageUpPosition);
			}
			
			// camps
			if (levelVO.isCampable) {
				if (levelVO.campPosition == null) {
					issues.push({ severity: WorldValidator.SEVERITY_CRITICAL, desc: "campable level " + levelVO.level + " missing camp positions" });
				}
				var pos = levelVO.campPosition;
				var sector = levelVO.getSector(pos.sectorX, pos.sectorY);
				if (!sector) {
					issues.push({ severity: WorldValidator.SEVERITY_CRITICAL, desc: "camp position " + pos + " has no sector" });
				}
				pois.push(pos);
			} else {
				if (levelVO.campPosition) {
					issues.push({ severity: WorldValidator.SEVERITY_CRITICAL, desc: "non-campable level " + levelVO.level + " has camp positions" });
				}
			}
			
			// passages down
			if (levelVO.level != worldVO.bottomLevel) {
				if (!levelVO.passageDownPosition) {
					issues.push({ severity: WorldValidator.SEVERITY_CRITICAL, desc: "level " + levelVO.level + " missing passage down position" });
				}
				var sector = levelVO.getSector(levelVO.passageDownPosition.sectorX, levelVO.passageDownPosition.sectorY);
				if (!sector) {
					issues.push({ severity: WorldValidator.SEVERITY_CRITICAL, desc: "level " + levelVO.level + " missing passage down sector" });
				}
				pois.push(levelVO.passageDownPosition);
			}
			
			// connections
			if (pois.length > 1) {
				for (let i = 0; i < pois.length - 1; i++) {
					if (pois[i].equals(pois[i + 1])) continue;
					var sectorPath = WorldCreatorRandom.findPath(worldVO, pois[i], pois[i + 1], false, true, null);
					if (!sectorPath || sectorPath.length < 1) {
						issues.push({ severity: WorldValidator.SEVERITY_CRITICAL, desc: "level " + levelVO.level + " pois not connected: " + pois[i] + " " + pois[i + 1] });
					}
				}
			}

			return { isValid: issues.length === 0, issues: issues };
		},

		checkWorldMatchesTemplate: function (worldVO, worldTemplateVO) {
			let issues = [];

			if (!worldTemplateVO) return { isValid: true, issues: issues };

			if (worldVO.seed != worldTemplateVO.seed) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "seed doesn't match template" });
			if (worldVO.topLevel != worldTemplateVO.topLevel) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "topLevel doesn't match template" });
			if (worldVO.bottomLevel != worldTemplateVO.bottomLevel) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "bottomLevel doesn't match template" });

			let campPositionResult = WorldValidator.checkListMatches(worldTemplateVO, worldTemplateVO, "campPositions", "camp position");
			if (!campPositionResult.isValid) issues = issues.concat(campPositionResult.issues);

			for (let l in worldVO.passagePositions) {
				let worldValue = worldVO.passagePositions[l];
				let templateValue = worldTemplateVO.passagePositions[l];

				if (!worldValue && !templateValue) continue;
				if (worldValue.up != templateValue.up) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "different passage up position on level " + l });
				if (worldValue.down != templateValue.down) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "different passage down position on level " + l });
			}

			if (worldTemplateVO.passageTypes) {
			for (let l in worldVO.passageTypes) {
				let worldValue = worldVO.passageTypes[l];
				let templateValue = worldTemplateVO.passageTypes[l];

				if (!worldValue && !templateValue) continue;
				if (worldValue.up != templateValue.up) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "different passage up type on level " + l });
				if (worldValue.down != templateValue.down) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "different passage down type on level " + l });
			}
			}

			return { isValid: issues.length === 0, issues: issues };
		},

		checkLevelMatchesTemplate: function (worldVO, levelVO, levelTemplateVO) {
			let issues = [];

			if (!levelTemplateVO) return { isValid: true, issues: issues };

			if (levelVO.levelOrdinal != levelTemplateVO.levelOrdinal) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "levelOrdinal doesn't match template" });
			if (levelVO.isCampable != levelTemplateVO.isCampable) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "isCampable doesn't match template" });
			if (levelVO.campOrdinal != levelTemplateVO.campOrdinal) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "campOrdinal doesn't match template" });
			if (levelVO.notCampableReason != levelTemplateVO.notCampableReason)  issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "notCampableReason doesn't match template" });
			if (levelVO.habitability != levelTemplateVO.habitability) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "habitability doesn't match template" });

			let additionalCampPositionsResult = WorldValidator.checkListMatches(levelVO, levelTemplateVO, "additionalCampPositions", "additional camp position");
			if (!additionalCampPositionsResult.isValid) return issues = issues.concat(additionalCampPositionsResult.issues);

			if (levelVO.campPosition && !levelVO.campPosition.equals(levelTemplateVO.campPosition))  issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "campPosition doesn't match template" });
			if (levelVO.passageDownPosition && !levelVO.passageDownPosition.equals(levelTemplateVO.passageDownPosition))  issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "passageDownPosition doesn't match template" });
			if (levelVO.passageUpPosition && !levelVO.passageUpPosition.equals(levelTemplateVO.passageUpPosition))  issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "passageUpPosition doesn't match template" });
			if (levelVO.passageDownType != levelTemplateVO.passageDownType) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "passageDownType doesn't match template" });
			if (levelVO.passageUpType != levelTemplateVO.passageUpType) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "passageUpType doesn't match template" });

			let luxuryResourcesResult = WorldValidator.checkListMatches(levelVO, levelTemplateVO, "luxuryResources");
			if (!luxuryResourcesResult.isValid) issues = issues.concat(luxuryResourcesResult.issues);

			if (levelVO.workshopResource != levelTemplateVO.workshopResource) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "workshopResource doesn't match template" });

			let workshopPositionsResult = WorldValidator.checkListMatches(levelVO, levelTemplateVO, "workshopPositions");
			if (!workshopPositionsResult.isValid) issues = issues.concat(workshopPositionsResult.issues);
			
			if (levelVO.sectors.length != levelTemplateVO.sectors.length) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "number of sectors doesn't match template" });

			return { isValid: issues.length === 0, issues: issues };
		},

		checkSectorMatchesTemplate: function (worldVO, levelVO, sectorVO, sectorTemplateVO) {
			let issues = [];

			if (!sectorTemplateVO) return { isValid: issues.length === 0, issues: issues };

			if (!sectorVO.position.equals(sectorTemplateVO.position)) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "sector position doesn't match template" });

			if (sectorVO.hasTradeConnectorSpot != sectorTemplateVO.hasTradeConnectorSpot) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "sector.hasTradeConnectorSpot doesn't match template" });
			if (sectorVO.hasWorkshop != sectorTemplateVO.hasWorkshop) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "sector.hasWorkshop doesn't match template" });
			if (sectorVO.workshopResource != sectorTemplateVO.workshopResource) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "sector.workshopResource doesn't match template" });
			if (sectorVO.isCamp != sectorTemplateVO.isCamp) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "sector.isCamp doesn't match template" });
			if (sectorVO.isPassageDown != sectorTemplateVO.isPassageDown) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "sector.isPassageDown doesn't match template" });
			if (sectorVO.isPassageUp != sectorTemplateVO.isPassageUp) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "sector.isPassageUp doesn't match template" });
			if (sectorVO.passageDownType != sectorTemplateVO.passageDownType) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "sector.passageDownType doesn't match template" });
			if (sectorVO.passageUpType != sectorTemplateVO.passageUpType) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "sector.passageUpType doesn't match template" });
			if (sectorVO.sectorType != sectorTemplateVO.sectorType) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "sector.sectorType doesn't match template" });
			if (sectorVO.sectorStyle != sectorTemplateVO.sectorStyle) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "sector.sectorStyle doesn't match template" });
			if (sectorVO.stage != sectorTemplateVO.stage) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "sector.stage doesn't match template" });
			if (sectorVO.zone != sectorTemplateVO.zone) issues.push({ severity: WorldValidator.SEVERITY_CONTINUITY, desc: "sector.zone doesn't match template" });
			if (sectorVO.sunlit != sectorTemplateVO.sunlit) issues.push({ severity: WorldValidator.SEVERITY_CONTINUITY, desc: "sector.sunlit doesn't match template" });

			// hazards: exact values can vary by version, but location should stay the same
			for (let hazard in sectorVO.hazards) {
				let sectorHasHazard = sectorVO.hazards[hazard] > 0;
				let templateHasHazard = sectorTemplateVO.hazards[hazard] > 0;
				if (sectorHasHazard != templateHasHazard) issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "sector hazards differ (" + hazard + ")" });
			}

			let movementBlockerResult = WorldValidator.checkListMatches(sectorVO, sectorTemplateVO, "movementBlockers");
			if (!movementBlockerResult.isValid) issues = issues.concat(movementBlockerResult.issues);

			let localesResult = WorldValidator.checkListMatches(sectorVO, sectorTemplateVO, "locales", "locales", (l1, l2) => {
				if (l1.type !== l2.type) return false;
				if (l1.isEasy !== l2.isEasy) return false;
				if (l1.isEarly !== l2.isEarly) return false;
				if (l1.hasBlueprints !== l2.hasBlueprints) return false;
				if (l1.explorerID !== l2.explorerID) return false;
				if (l1.luxuryResource !== l2.luxuryResource) return false;
				return true;
			});
			if (!localesResult.isValid) issues = issues.concat(localesResult.issues);

			let stashesResult = WorldValidator.checkListMatches(sectorVO, sectorTemplateVO, "stashes", "stashes", (s1, s2) => {
				if (s1.stashType !== s2.stashType) return false;
				if (s1.itemID !== s2.itemID) return false;
				return true;
			});
			if (!stashesResult.isValid) issues = issues.concat(stashesResult.issues);

			return { isValid: issues.length === 0, issues: issues };

		},

		checkSectorPosition: function (worldVO, levelVO, sectorVO, sectorTemplateVO) {
			let issues = [];

			let distanceToOrigo = Math.round(PositionConstants.getDistanceTo(sectorVO.position, levelVO.levelMapCenterPosition));
			if (distanceToOrigo > WorldConstants.MAX_DISTANCE_TO_MAP_CENTER) issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: sectorVO.toString() + " is too far (" + distanceToOrigo + ") from level center (" + levelVO.levelMapCenterPosition + ")" });

			let distanceToCrossing = WorldCreatorHelper.getShortestPathToMatchingSector(worldVO, levelVO, sectorVO.position, pos => levelVO.isCrossing(pos.sectorX, pos.sectorY), WorldConstants.MAX_PATH_NO_CROSSINGS_LENGTH - 1, WorldConstants.MAX_PATH_NO_CROSSINGS_LENGTH);
			if (distanceToCrossing > WorldConstants.MAX_PATH_NO_CROSSINGS_LENGTH) issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: sectorVO.toString() + " is too far from nearest crossing" });

			return { isValid: issues.length === 0, issues: issues };
		},

		checkSectorResources: function (worldVO, levelVO, sectorVO, sectorTemplateVO) {
			let issues = [];

			let hasWater = sectorVO.resourcesCollectable.water > 0 || sectorVO.resourcesScavengable.water > 0;
			let hasFood = sectorVO.resourcesCollectable.food > 0 || sectorVO.resourcesScavengable.food > 0;
			
			//if (hasFood && sectorVO.hazards.radiation > 0) issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: sectorVO.toString() + " has radioactivity and food" });
			if (hasWater && sectorVO.hazards.radiation > 0) issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: sectorVO.toString() + " has radioactivity and water" });

			return { isValid: issues.length === 0, issues: issues };
		},

		checkSectorStashes: function (worldVO, levelVO, sectorVO, sectorTemplateVO) {
			let issues = [];

			for (let i = 0; i < sectorVO.stashes.length; i++) {
				let stashVO = sectorVO.stashes[i];
				if (stashVO.localeType && sectorVO.locales.filter(localeVO => localeVO.type == stashVO.localeType).length < 1)
					issues.push({ severity: WorldValidator.SEVERITY_CRITICAL, desc: sectorVO.toString() + " has stash without matching locale" });
			}

			return { isValid: issues.length === 0, issues: issues };
		},

		checkSectorLocales: function (worldVO, levelVO, sectorVO, sectorTemplateVO) {
			let issues = [];

			if (sectorVO.locales.length > 3) {
				issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: sectorVO.toString() + " has too many locales (" + sectorVO.locales.length + ")" });
			}

			if ((sectorVO.isPassageUp || sectorVO.isPassageDown) && sectorVO.locales.length > 0) {
				issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: sectorVO.toString() + " is a passage and has a locale (confusing for maps)" });
			}

			for (let i = 0; i < sectorVO.locales.length; i++) {
				let localeVO = sectorVO.locales[i];
				
			}

			return { isValid: issues.length === 0, issues: issues };
		},

		checkSectorFeatures: function (worldVO, levelVO, sectorVO, sectorTemplateVO) {
			let issues = [];
			
			if (sectorVO.sunlit && levelVO.level < worldVO.topLevel) {
				if (sectorVO.isCamp) {
					issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: sectorVO.toString() + " is camp and sunlit" });
				}
			}

			return { isValid: issues.length === 0, issues: issues };
		},

		checkSectorHazards: function (worldVO, levelVO, sectorVO, sectorTemplateVO) {
			let issues = [];

			let itemsHelper = new ItemsHelper();
			let isGround = levelVO.level == worldVO.bottomLevel;

			let checkMaxHazards = function (context, campOrdinal, step, isHardLevel) {
				let maxCold = itemsHelper.getMaxHazardColdForLevel(campOrdinal, step, isHardLevel);
				let maxRadiation = itemsHelper.getMaxHazardRadiationForLevel(campOrdinal, step, isHardLevel);
				let maxPoison = itemsHelper.getMaxHazardPoisonForLevel(campOrdinal, step, isHardLevel);
				let maxFlooded = itemsHelper.getMaxHazardFloodedForLevel(campOrdinal, step, isHardLevel);

				if (sectorVO.hazards.cold > maxCold) 
					issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: sectorVO.toString() + (context ?? "") + " cold hazard (" + sectorVO.hazards.cold + ") is higher than max (" + maxCold + ")" });
				if (sectorVO.hazards.radiation > maxRadiation)
					issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: sectorVO.toString() + (context ?? "") + " radiation hazard (" + sectorVO.hazards.radiation + ") is higher than max (" + maxRadiation + ")" });
				if (sectorVO.hazards.poison > maxPoison)
					issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: sectorVO.toString() + (context ?? "") + " poison hazard (" + sectorVO.hazards.poison + ") is higher than max (" + maxPoison + ")" });
				if (sectorVO.hazards.flooded > maxFlooded)
					issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: sectorVO.toString() + (context ?? "") + " flooded hazard (" + sectorVO.hazards.flooded + ") is higher than max (" + maxFlooded + ")" });
			};

			let zone = sectorVO.zone;
			let isHardLevel = levelVO.isHard;
			let campOrdinal = levelVO.campOrdinal;
			let step = WorldConstants.getCampStep(zone);

			// ground level must not require post-favour equipment so player can find the grove
			if (isGround) step = Math.min(step, WorldConstants.CAMP_STEP_POI_2);

			checkMaxHazards("", campOrdinal, step, isHardLevel);

			let entrancePosition = levelVO.getEntrancePassagePosition();
			if (sectorVO.position.equals(entrancePosition)) {
				let previousLevelOrdinal = levelVO.levelOrdinal - 1;
				let previousLevel = WorldCreatorHelper.getLevelForOrdinal(worldVO.seed, previousLevelOrdinal);
				let previousLevelCampOrdinal = WorldCreatorHelper.getCampOrdinal(worldVO.seed,previousLevel);

				checkMaxHazards("entrance", previousLevelCampOrdinal, WorldConstants.CAMP_STEP_END, false);
			}

			let neighbours = levelVO.getNeighbourList(sectorVO.position.sectorX, sectorVO.position.sectorY);
			let neighbourHazards = [];
			for (let i = 0; i < neighbours.length; i++) {
				let neighbour = neighbours[0];
				let hazard = neighbour.hazards.getMainHazard();
				if (hazard && neighbourHazards.indexOf(hazard) < 0) neighbourHazards.push(hazard);
			}

			if (neighbourHazards.length > 1) {
				issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: sectorVO.toString() + " has neighbours with more than 1 type of hazard (" + neighbourHazards.join(",") + ")" });
			}

			return { isValid: issues.length === 0, issues: issues };
		},

		checkListMatches: function (vo, template, key, name, customEqualsCheck) {
			let issues = [];

			name = name || key;
			for (let i in vo[key]) {
				let voValue = vo[key][i];
				let templateValue = template[key][i];
				if (!voValue && !templateValue) continue;
				if (!voValue) {
					issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "missing " + name + " at index " + i });
					continue;
				}
				if (!templateValue) {
					issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "extra " + name + " at index " + i });
					continue;
				}
				if (voValue == templateValue) continue;
				if (voValue.equals && voValue.equals(templateValue)) continue;
				if (customEqualsCheck && customEqualsCheck(voValue, templateValue)) continue;
				 issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "different " + name + " at index " + i });
			}
			
			return { isValid: issues.length === 0, issues: issues };
		},

	};

	return WorldValidator;
});
