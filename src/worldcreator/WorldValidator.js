define([
	'ash',
	'utils/MathUtils',
	'utils/ObjectUtils',
	'game/helpers/ItemsHelper',
	'game/constants/PositionConstants',
	'game/constants/WorldConstants',
	'game/constants/UpgradeConstants',
	'worldcreator/WorldCreatorConstants',
	'worldcreator/WorldCreatorHelper',
	'worldcreator/WorldCreatorRandom',
	'worldcreator/WorldTemplateVO',
], function (
	Ash, MathUtils, ObjectUtils, ItemsHelper, PositionConstants, WorldConstants, UpgradeConstants, WorldCreatorConstants, WorldCreatorHelper, WorldCreatorRandom, WorldTemplateVO
) {
	let context = "WorldValidator";

	let WorldValidator = {

		SEVERITY_CRITICAL: 0, // world / template is broken
		SEVERITY_MAJOR: 1, // world is not well balanced
		SEVERITY_COMPABILITY: 11, // world differs from template in a way that should not happen
		SEVERITY_CONTINUITY: 12, // world differs from template in a way that might be acceptable if the template is from an older version but needs to be handled properly in game logic
		
		// TODO check that there's at least a few (useful?) beacon spots per level

		// validates overall world skeleton, not levels or sectors
		// checks that the world is valid in itself, and also that it follows the template if one given
		validateWorld: function (worldVO, worldTemplateVO) {
			worldVO.resetPaths();

			let issues = [];
		
			let worldChecks = [
				this.checkWorldSeed, 
				this.checkWorldCampPositions, 
				this.checkWorldPassages,
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
				this.checkLevelCriticalPaths, 
				this.checkLevelContinuousEarlyStage, 
				this.checkLevelCampsAndPassages, 
				this.checkLevelNumberOfSectors, 
				this.checkLevelNumberOfLocales,
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

			let notSavedKeysWorld = [ "districts", "features", "stages", "examineSpotsPerLevel" ];
			let notSavedKeysLevel = [ "maxSectors", "neighboursCacheContext", "pendingConnectionPointsByStage", "allConnectionPoints", "invalidPositions", "paths", "requiredPaths", "sectorsByStage", "sectorsByPos", "levelCenterPosition", "localeSectors", "raidDangerFactor", "stageCenterPositions" ];
			let notSavedKeysSector = [ "id", "distanceToCamp", "requiredFeatures", "requiredResources", "resourcesAll", "waymarks", "pathID", "possibleEnemies", "hasRegularEnemies", "isConnectionPoint", "resourcesScavengable", "campPosScore", "isFill", "criticalPathTypes", "graffiti" ];

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
							if (key2 === "sectors") {
								for (let s in levelVOValue) {
									let sectorVO = levelVOValue[s];
									let sectorTemplateVO = levelTemplateVOValue[s];
									let sectorProperties = Object.keys(sectorVO);
									for (let k in sectorProperties) {
										let key3 = sectorProperties[k];
										let sectorVOValue = sectorVO[key3];
										let sectorTemplateVOValue = sectorTemplateVO[key3];
										if (notSavedKeysSector.indexOf(key3) >= 0 && !sectorTemplateVOValue) continue;
										if (sectorVOValue == sectorTemplateVOValue) continue;
										issues.push({ 
											severity: WorldValidator.SEVERITY_CRITICAL, 
											desc: "SectorVO->SectorTemplateVO mismatch: " + key3 + " [" + sectorVOValue + "] [" +  sectorTemplateVOValue + "]"
										});
									}
								}
								continue;
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

		checkLevelSize: function (worldVO, levelVO) {
			let issues = [];

			let width = Math.abs(levelVO.maxX - levelVO.minX);
			let height = Math.abs(levelVO.maxY - levelVO.minY);

			if (width > 55) issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "level " + levelVO.level + " is too wide (" + width + ")" });
			if (height > 45) issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "level " + levelVO.level + " is too tall (" + height + ")" });

			return { isValid: issues.length === 0, issues: issues };
		},
		
		checkLevelCriticalPaths: function (worldVO, levelVO) {
			let issues = [];

			// required paths (between camp and passages)
			let excursionStartPosition = levelVO.getExcursionStartPosition();
			let excursionLen = WorldCreatorConstants.getMaxPathLength(levelVO.campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_2);
			let requiredPaths = WorldCreatorHelper.getRequiredPaths(worldVO, levelVO);

			for (let i = 0; i < levelVO.sectors.length; i++) {
				let sectorVO = levelVO.sectors[i];
				let pathType = null;
				if (sectorVO.locales.length > 0) pathType = "locale";
				if (sectorVO.hasWorkshop) pathType = "workshop";
				if (sectorVO.hasTradeConnectorSpot) pathType = "hasTradeConnectorSpot";
				if (pathType) {
					requiredPaths.push({ start: excursionStartPosition, end: sectorVO.position, maxlen: excursionLen, isValidationOnly: true, type: pathType });
				}
			}

			for (let i = 0; i < requiredPaths.length; i++) {
				let path = requiredPaths[i];
				let startPos = path.start.clone();
				let endPos = path.end.clone();
				if (startPos.equals(endPos)) continue;
				let sectorPath = WorldCreatorRandom.findPath(worldVO, startPos, endPos, false, true, path.stage);

				if (!sectorPath || sectorPath.length < 1) {
					issues.push({ severity: WorldValidator.SEVERITY_CRITICAL, desc: "required path " + path.type + " on level " + levelVO.level + " is missing" });
					continue;
				} 

				if (path.maxlen > 0 && sectorPath.length > path.maxlen) {
					issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "required path " + path.type + " on level " + levelVO.level + " is too long (" + sectorPath.length + "/" + path.maxlen + ")" });
				}

				if (!path.isValidationOnly) {
					for (let s = 0; s < sectorPath.length; s++) {
						let pathPosition = sectorPath[i];
						let pathSectorVO = levelVO.getSectorByPos(pathPosition);
						if (pathSectorVO.criticalPathTypes.indexOf(path.type) < 0) {
							issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "critical path " + path.type + " not marked on sector " + pathSectorVO.position });
						}
					}
				}
			}

			return { isValid: issues.length === 0, issues: issues };
		},
		
		checkLevelNumberOfSectors: function (worldVO, levelVO) {
			let issues = [];

			// NOTE: sectors per stage is a minimum used for evidence balancing etc, a bit of overshoot is ok
			if (levelVO.sectors.length < levelVO.numSectors) {
				issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "too few sectors on level " + levelVO.level + ": " + levelVO.sectors.length + "/" + levelVO.numSectors });
			}
			if (levelVO.sectors.length > levelVO.maxSectors) {
				issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "too many sectors on level " + levelVO.level + ": " + levelVO.sectors.length + "/" + levelVO.maxSectors });
			}

			let stages = [ WorldConstants.CAMP_STAGE_EARLY, WorldConstants.CAMP_STAGE_LATE ];
			for (let i = 0; i < stages.length; i++) {
				let stage = stages[i];
				let numSectorsCreated = levelVO.getNumSectorsByStage(stage);
				let numSectorsPlanned = levelVO.numSectorsByStage[stage];
				if (numSectorsCreated < numSectorsPlanned) {
					issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: "too few sectors on level " + levelVO.level + " stage " + stage + ": " + numSectorsCreated + "/" + numSectorsPlanned });
				}
				if (numSectorsCreated > numSectorsPlanned * 1.1) {
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
		
		checkLevelContinuousEarlyStage: function (worldVO, levelVO) {
			let issues = [];

			let earlySectors = levelVO.sectorsByStage[WorldConstants.CAMP_STAGE_EARLY];
			if (earlySectors && earlySectors.length > 1) {
				for (let j = 1; j < earlySectors.length; j++) {
					var sectorPath = WorldCreatorRandom.findPath(worldVO, earlySectors[0].position, earlySectors[j].position, false, true, WorldConstants.CAMP_STAGE_EARLY, true);
					if (!sectorPath || sectorPath.length < 1) {
						issues.push({ severity: WorldValidator.SEVERITY_COMPABILITY, desc: "early stage is not continuous on level " + levelVO.level });
					}
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

			let distanceToOrigo = Math.round(PositionConstants.getDistanceTo(sectorVO.position, { sectorX: 0, sectorY: 0 }));
			if (distanceToOrigo > 40) issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: sectorVO.toString() + " is too far (" + distanceToOrigo + ") from origo" });

			let pathToCrossing = WorldValidator.getShortestPathToMatchingSector(worldVO, levelVO, sectorVO, s => levelVO.isCrossing(s.position.sectorX, s.position.sectorY));
			let distanceToCrossing = pathToCrossing ? pathToCrossing.length : 999;
			if (distanceToCrossing > 14) issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: sectorVO.toString() + " is too far (" + distanceToCrossing + ") from nearest crossing" });

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

			return { isValid: issues.length === 0, issues: issues };
		},

		checkSectorHazards: function (worldVO, levelVO, sectorVO, sectorTemplateVO) {
			let issues = [];

			let itemsHelper = new ItemsHelper();

			let zone = sectorVO.zone;
			let isHardLevel = levelVO.isHard;
			let campOrdinal = levelVO.campOrdinal;
			let step = WorldConstants.getCampStep(zone);

			let maxCold = itemsHelper.getMaxHazardColdForLevel(campOrdinal, step, isHardLevel);
			let maxRadiation = itemsHelper.getMaxHazardRadiationForLevel(campOrdinal, step, isHardLevel);
			let maxPoison = itemsHelper.getMaxHazardPoisonForLevel(campOrdinal, step, isHardLevel);
			let maxFlooded = itemsHelper.getMaxHazardFloodedForLevel(campOrdinal, step, isHardLevel);

			if (sectorVO.hazards.cold > maxCold) 
				issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: sectorVO.toString() + " cold hazard (" + sectorVO.hazards.cold + ") is higher than max (" + maxCold + ")" });
			if (sectorVO.hazards.radiation > maxRadiation)
				issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: sectorVO.toString() + " radiation hazard (" + sectorVO.hazards.radiation + ") is higher than max (" + maxRadiation + ")" });
			if (sectorVO.hazards.poison > maxPoison)
				issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: sectorVO.toString() + " poison hazard (" + sectorVO.hazards.poison + ") is higher than max (" + maxPoison + ")" });
			if (sectorVO.hazards.flooded > maxFlooded)
				issues.push({ severity: WorldValidator.SEVERITY_MAJOR, desc: sectorVO.toString() + " flooded hazard (" + sectorVO.hazards.flooded + ") is higher than max (" + maxFlooded + ")" });

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

		getShortestPathToMatchingSector: function (worldVO, levelVO, sectorVO, filter) {
			let result = null;

			if (filter(sectorVO)) return [];

			for (let i = 0; i < levelVO.sectors.length; i++) {
				let candidate = levelVO.sectors[i];
				if (!filter(candidate)) continue;

				let distance = PositionConstants.getDistanceTo(sectorVO.position, candidate.position);
				if (result && result.length > 0 && result.length < distance) continue;

				let maxPathLength = result ? result.length : null;
				let path = WorldCreatorRandom.findPath(worldVO, sectorVO.position, candidate.position, false, true, null, true, maxPathLength);

				if (!path) continue;
				
				if (!result || path.length < result.length) {
					result = path;
				}
			}

			return result;
		},

	};

	return WorldValidator;
});
