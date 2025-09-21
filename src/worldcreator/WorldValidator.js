define([
	'ash',
	'utils/MathUtils',
	'utils/ObjectUtils',
	'game/constants/WorldConstants',
	'game/constants/UpgradeConstants',
	'worldcreator/WorldCreatorHelper',
	'worldcreator/WorldCreatorRandom',
	'worldcreator/WorldTemplateVO',
], function (
	Ash, MathUtils, ObjectUtils, WorldConstants, UpgradeConstants, WorldCreatorHelper, WorldCreatorRandom, WorldTemplateVO
) {
	let context = "WorldValidator";

	let WorldValidator = {
		
		// TODO check that there's at least a few (useful?) beacon spots per level

		// validates overall world skeleton, not levels or sectors
		// checks that the world is valid in itself, and also that it follows the template given
		validateWorld: function (worldVO, worldTemplateVO) {
			worldVO.resetPaths();
		
			let worldChecks = [
				this.checkSeed, 
				this.checkCampPositions, 
				this.checkPassages,
				this.checkWorldMatchesTemplate,
			];

			for (let i = 0; i < worldChecks.length; i++) {
				let checkResult = worldChecks[i](worldVO, worldTemplateVO);
				if (!checkResult.isValid) {
					return { isValid: false, reason: checkResult.reason };
				}
			}
			
			return { isValid: true };
		},

		// validates a given level, structure, sectors, features
		// checks that the level is valid in itself, and also that it follows the template
		validateLevel: function (worldVO, worldTemplateVO, levelVO) {
			worldVO.resetPaths();

			let levelTemplateVO = worldTemplateVO ? worldTemplateVO.levels[levelVO.level] : {};

			let levelChecks = [ 
				this.checkCriticalPaths, 
				this.checkContinuousEarlyStage, 
				this.checkCampsAndPassages, 
				this.checkNumberOfSectors, 
				this.checkNumberOfLocales,
				this.checkLevelMatchesTemplate,
			];

			for (let i = 0; i < levelChecks.length; i++) {
				let checkResult = levelChecks[i](worldVO, levelVO, levelTemplateVO);
				if (!checkResult.isValid) {
					return { isValid: false, reason: checkResult.reason };
				}
			}
			
			return { isValid: true };
		},

		// validates that a WorldTemplateVO matches the WorldVO it was created from, contains all necessary data, and saves/loads correctly
		validateWorldTemplateVO: function (worldVO, worldTemplateVO) {
			log.i("validating worldTemplateVO");
			let numIssues = 0;
			// TODO move world template vo validation somewhere else? WorldValidator? Dedicated TemplateValidator?

			let notSavedKeysWorld = [ "districts", "features", "stages", "pathsAny", "pathsLatest", "examineSpotsPerLevel" ];
			let notSavedKeysLevel = [ "maxSectors", "neighboursCacheContext", "pendingConnectionPointsByStage", "invalidPositions", "paths", "requiredPaths", "sectorsByStage", "sectorsByPos", "predefinedExplorers", "levelCenterPosition", "localeSectors", "raidDangerFactor", "stageCenterPositions" ];
			let notSavedKeysSector = [ "id", "distanceToCamp", "requiredFeatures", "requiredResources", "resourcesAll", "pathID", "waymarks", "possibleEnemies", "isConnectionPoint", "criticalPaths", "resourcesScavengable", "criticalPathIndices", "criticalPath", "campPosScore", "isFill" ];

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
										numIssues++;
										log.e("SectorVO->SectorTemplateVO mismatch: " + key3 + " [" + sectorVOValue + "] [" +  sectorTemplateVOValue + "]");
									}
								}
								continue;
							}
							numIssues++;
							log.e("LevelVO->LevelTemplateVO mismatch: " + key2 + " [" + levelVOValue + "] [" +  levelTemplateVOValue + "]");
						}
					}
					continue;
				}
				numIssues++;
				log.e("WorldVO->worldTemplateVO mismatch: " + key + " [" + worldVOValue + "] [" +  templateVOValue + "]");
			}

			// check worldTemplateVO saves and loads correctly
			let saveObject = worldTemplateVO.getCustomSaveObject();
			let loadResult = new WorldTemplateVO();
			loadResult.customLoadFromSave(saveObject);
			let diff = ObjectUtils.diff(worldTemplateVO, loadResult);
			if (diff.total > 0) {
				numIssues += diff.total;
				debugger
				log.e("worldTemplateVO did not save/load correctly: " + diff.total + ", keys: " + Object.keys(diff.byKey).join(","));
			}

			if (numIssues == 0) log.i("worldTemplateVO validation OK")
		},

		checkSeed: function (worldVO) {
			if (!worldVO.seed) return { isValid: false, reason: "no seed" };
			if (worldVO.seed < 0) return { isValid: false, reason: "negative seed" };
			return { isValid: true };
		},

		checkCampPositions: function (worldVO) {
			let numCampPositions = Object.keys(worldVO.campPositions);

			if (numCampPositions < 15) return { isValid: false, reason: "too few camp positions (" + numCampPositions + ")" };
			if (numCampPositions > 15) return { isValid: false, reason: "too many camp positions (" + numCampPositions + ")" };

			return { isValid: true };
		},

		checkPassages: function (worldVO) {
			for (let l = worldVO.bottomLevel; l <= worldVO.topLevel; l++) {
				if (!worldVO.passagePositions[l]) return { isValid: false, reason: "no passage positions defined for level " + l };
				if (!worldVO.passageTypes[l]) return { isValid: false, reason: "no passage types defined for level " + l };
			}

			return { isValid: true };
		},
		
		checkCriticalPaths: function (worldVO, levelVO) {
			let requiredPaths = WorldCreatorHelper.getRequiredPaths(worldVO, levelVO);

			for (let i = 0; i < requiredPaths.length; i++) {
				var path = requiredPaths[i];
				var startPos = path.start.clone();
				var endPos = path.end.clone();
				if (startPos.equals(endPos)) continue;
				var sectorPath = WorldCreatorRandom.findPath(worldVO, startPos, endPos, false, true, path.stage);
				if (!sectorPath || sectorPath.length < 1) {
					return { isValid: false, reason: "required path " + path.type + " on level " + levelVO.level + " is missing" };
				}
				if (path.maxlen > 0 && sectorPath.length > path.maxlen) {
					return { isValid: false, reason: "required path " + path.type + " on level " + levelVO.level + " is too long (" + sectorPath.length + "/" + path.maxlen + ")" };
				}
			}
			return { isValid: true };
		},
		
		checkNumberOfSectors: function (worldVO, levelVO) {
			// NOTE: sectors per stage is a minimum used for evidence balancing etc, a bit of overshoot is ok
			if (levelVO.sectors.length < levelVO.numSectors) {
				return { isValid: false, reason: "too few sectors on level " + levelVO.level + ": " + levelVO.sectors.length + "/" + levelVO.numSectors };
			}
			if (levelVO.sectors.length > levelVO.maxSectors) {
				return { isValid: false, reason: "too many sectors on level " + levelVO.level + ": " + levelVO.sectors.length + "/" + levelVO.maxSectors };
			}
			var stages = [ WorldConstants.CAMP_STAGE_EARLY, WorldConstants.CAMP_STAGE_LATE ];
			for (let i = 0; i < stages.length; i++) {
				var stage = stages[i];
				var numSectorsCreated = levelVO.getNumSectorsByStage(stage);
				var numSectorsPlanned = levelVO.numSectorsByStage[stage];
				if (numSectorsCreated < numSectorsPlanned) {
					return { isValid: false, reason: "too few sectors on level " + levelVO.level + " stage " + stage + ": " + numSectorsCreated + "/" + numSectorsPlanned };
				}
				if (numSectorsCreated > numSectorsPlanned * 1.1) {
					return { isValid: false, reason: "too many sectors on level " + levelVO.level + " stage " + stage + ": " + numSectorsCreated + "/" + numSectorsPlanned };
				}
			}
			return { isValid: true };
		},
		
		checkNumberOfLocales: function (worldVO, levelVO) {
			let campOrdinal = levelVO.campOrdinal;

			var numEarlyLocales = 0;
			var numLateLocales = 0;
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
			var numEarlyBlueprints = UpgradeConstants.getPiecesByCampOrdinal(campOrdinal, UpgradeConstants.BLUEPRINT_BRACKET_EARLY, levelIndex, maxLevelIndex);
			if (numEarlyLocales < numEarlyBlueprints) {
				return { isValid: false, reason: "too few early locales for level " + levelVO.level + ", camp ordinal " + campOrdinal + " " + numEarlyLocales + "/" + numEarlyBlueprints };
			}
			var numLateBlueprints = UpgradeConstants.getPiecesByCampOrdinal(campOrdinal, UpgradeConstants.BLUEPRINT_BRACKET_LATE, levelIndex, maxLevelIndex);
			if (numLateLocales < numLateBlueprints) {
				return { isValid: false, reason: "too few late locales for level " + levelVO.level + ", camp ordinal " + campOrdinal + " " + numLateLocales + "/" + numLateBlueprints };
			}

			return { isValid: true };
		},
		
		checkContinuousEarlyStage: function (worldVO, levelVO) {
			var earlySectors = levelVO.sectorsByStage[WorldConstants.CAMP_STAGE_EARLY];
			if (earlySectors && earlySectors.length > 1) {
				for (let j = 1; j < earlySectors.length; j++) {
					var sectorPath = WorldCreatorRandom.findPath(worldVO, earlySectors[0].position, earlySectors[j].position, false, true, WorldConstants.CAMP_STAGE_EARLY, true);
					if (!sectorPath || sectorPath.length < 1) {
						return { isValid: false, reason: "early stage is not continuous on level " + levelVO.level };
					}
				}
			}
			return { isValid: true };
		},
		
		checkCampsAndPassages: function (worldVO, levelVO) {
			var pois = [];
			
			// passages up
			if (levelVO.level != worldVO.topLevel) {
				if (!levelVO.passageUpPosition) {
					return { isValid: false, reason: "level " + levelVO.level + " missing passage up position" };
				}
				var sector = levelVO.getSector(levelVO.passageUpPosition.sectorX, levelVO.passageUpPosition.sectorY);
				if (!sector) {
					return { isValid: false, reason: "level " + levelVO.level + " missing passage up sector" };
				}
				pois.push(levelVO.passageUpPosition);
			}
			
			// camps
			if (levelVO.isCampable) {
				if (levelVO.campPosition == null) {
					return { isValid: false, reason: "campable level " + levelVO.level + " missing camp positions" };
				}
				var pos = levelVO.campPosition;
				var sector = levelVO.getSector(pos.sectorX, pos.sectorY);
				if (!sector) {
					return { isValid: false, reason: "camp position " + pos + " has no sector" };
				}
				pois.push(pos);
			} else {
				if (levelVO.campPosition) {
					return { isValid: false, reason: "non-campable level " + levelVO.level + " has camp positions" };
				}
			}
			
			// passages down
			if (levelVO.level != worldVO.bottomLevel) {
				if (!levelVO.passageDownPosition) {
					return { isValid: false, reason: "level " + levelVO.level + " missing passage down position" };
				}
				var sector = levelVO.getSector(levelVO.passageDownPosition.sectorX, levelVO.passageDownPosition.sectorY);
				if (!sector) {
					return { isValid: false, reason: "level " + levelVO.level + " missing passage down sector" };
				}
				pois.push(levelVO.passageDownPosition);
			}
			
			// connections
			if (pois.length > 1) {
				for (let i = 0; i < pois.length - 1; i++) {
					if (pois[i].equals(pois[i + 1])) continue;
					var sectorPath = WorldCreatorRandom.findPath(worldVO, pois[i], pois[i + 1], false, true, null);
					if (!sectorPath || sectorPath.length < 1) {
						return { isValid: false, reason: "level " + levelVO.level + " pois not connected: " + pois[i] + " " + pois[i + 1] };
					}
				}
			}
			
			return { isValid: true };
		},

		checkWorldMatchesTemplate: function (worldVO, worldTemplateVO) {
			if (worldVO.seed != worldTemplateVO.seed) return { isValid: false, reason: "seed doesn't match template" };
			if (worldVO.topLevel != worldTemplateVO.topLevel) return { isValid: false, reason: "topLevel doesn't match template" };
			if (worldVO.bottomLevel != worldTemplateVO.bottomLevel) return { isValid: false, reason: "bottomLevel doesn't match template" };

			let campPositionResult = WorldValidator.checkListMatches(worldTemplateVO, worldTemplateVO, "campPositions", "camp position");
			if (!campPositionResult.isValid) return campPositionResult;

			for (let l in worldVO.passagePositions) {
				let worldValue = worldVO.passagePositions[l];
				let templateValue = worldTemplateVO.passagePositions[l];

				if (!worldValue && !templateValue) continue;
				if (worldValue.up != templateValue.up) return { isValid: false, reason: "different passage up position on level " + l };
				if (worldValue.down != templateValue.down) return { isValid: false, reason: "different passage down position on level " + l };
			}

			for (let l in worldVO.passageTypes) {
				let worldValue = worldVO.passageTypes[l];
				let templateValue = worldTemplateVO.passageTypes[l];

				if (!worldValue && !templateValue) continue;
				if (worldValue.up != templateValue.up) return { isValid: false, reason: "different passage up type on level " + l };
				if (worldValue.down != templateValue.down) return { isValid: false, reason: "different passage down type on level " + l };
			}
			
			return { isValid: true };
		},

		checkLevelMatchesTemplate: function (worldVO, levelVO, levelTemplateVO) {
			if (levelVO.levelOrdinal != levelTemplateVO.levelOrdinal) return { isValid: false, reason: "levelOrdinal doesn't match template" };
			if (levelVO.isCampable != levelTemplateVO.isCampable) return { isValid: false, reason: "isCampable doesn't match template" };
			if (levelVO.campOrdinal != levelTemplateVO.campOrdinal) return { isValid: false, reason: "campOrdinal doesn't match template" };
			if (levelVO.notCampableReason != levelTemplateVO.notCampableReason) return { isValid: false, reason: "notCampableReason doesn't match template" };
			if (levelVO.habitability != levelTemplateVO.habitability) return { isValid: false, reason: "habitability doesn't match template" };

			let additionalCampPositionsResult = WorldValidator.checkListMatches(levelVO, levelTemplateVO, "additionalCampPositions", "additional camp position");
			if (!additionalCampPositionsResult.isValid) return additionalCampPositionsResult;

			if (levelVO.campPosition && !levelVO.campPosition.equals(levelTemplateVO.campPosition)) return { isValid: false, reason: "campPosition doesn't match template" };
			if (levelVO.passageDownPosition && !levelVO.passageDownPosition.equals(levelTemplateVO.passageDownPosition)) return { isValid: false, reason: "passageDownPosition doesn't match template" };
			if (levelVO.passageUpPosition && !levelVO.passageUpPosition.equals(levelTemplateVO.passageUpPosition)) return { isValid: false, reason: "passageUpPosition doesn't match template" };
			if (levelVO.passageDownType != levelTemplateVO.passageDownType) return { isValid: false, reason: "passageDownType doesn't match template" };
			if (levelVO.passageUpType != levelTemplateVO.passageUpType) return { isValid: false, reason: "passageUpType doesn't match template" };

			let luxuryResourcesResult = WorldValidator.checkListMatches(levelVO, levelTemplateVO, "luxuryResources");
			if (!luxuryResourcesResult.isValid) return { isValid: false, reason: "luxuryResources doesn't match template" };

			if (levelVO.workshopResource != levelTemplateVO.workshopResource) return { isValid: false, reason: "workshopResource doesn't match template" };

			let workshopPositionsResult = WorldValidator.checkListMatches(levelVO, levelTemplateVO, "workshopPositions");
			if (!workshopPositionsResult.isValid) return workshopPositionsResult;
			
			if (levelVO.sectors.length != levelTemplateVO.sectors.length) return { isValid: false, reason: "number of sectors doesn't match template" };

			for (let i = 0; i < levelVO.sectors.length; i++) {
				let sectorVO = levelVO.sectors[i];
				let sectorTemplateVO = levelTemplateVO.sectors[i];
				let sectorResult = WorldValidator.checkSectorMatchesTemplate(worldVO, levelVO, sectorVO, sectorTemplateVO);
				if (!sectorResult.isValid) return sectorResult;
			}

			return { isValid: true };
		},

		checkSectorMatchesTemplate: function (worldVO, levelVO, sectorVO, sectorTemplateVO) {
			if (!sectorVO.position.equals(sectorTemplateVO.position)) return { isValid: false, reason: "sector position doesn't match template" };

			if (sectorVO.hasTradeConnectorSpot != sectorTemplateVO.hasTradeConnectorSpot) return { isValid: false, reason: "sector.hasTradeConnectorSpot doesn't match template" };
			if (sectorVO.hasWorkshop != sectorTemplateVO.hasWorkshop) return { isValid: false, reason: "sector.hasWorkshop doesn't match template" };
			if (sectorVO.workshopResource != sectorTemplateVO.workshopResource) return { isValid: false, reason: "sector.workshopResource doesn't match template" };
			if (sectorVO.isCamp != sectorTemplateVO.isCamp) return { isValid: false, reason: "sector.isCamp doesn't match template" };
			if (sectorVO.isPassageDown != sectorTemplateVO.isPassageDown) return { isValid: false, reason: "sector.isPassageDown doesn't match template" };
			if (sectorVO.isPassageUp != sectorTemplateVO.isPassageUp) return { isValid: false, reason: "sector.isPassageUp doesn't match template" };
			if (sectorVO.passageDownType != sectorTemplateVO.passageDownType) return { isValid: false, reason: "sector.passageDownType doesn't match template" };
			if (sectorVO.passageUpType != sectorTemplateVO.passageUpType) return { isValid: false, reason: "sector.passageUpType doesn't match template" };
			if (sectorVO.sectorType != sectorTemplateVO.sectorType) return { isValid: false, reason: "sector.sectorType doesn't match template" };
			if (sectorVO.stage != sectorTemplateVO.stage) return { isValid: false, reason: "sector.stage doesn't match template" };
			if (sectorVO.zone != sectorTemplateVO.zone) return { isValid: false, reason: "sector.zone doesn't match template" };
			if (sectorVO.sunlit != sectorTemplateVO.sunlit) return { isValid: false, reason: "sector.sunlit doesn't match template" };

			// hazards: exact values can vary by version, but location should stay the same
			for (let hazard in sectorVO.hazards) {
				let sectorHasHazard = sectorVO.hazards[hazard] > 0;
				let templateHasHazard = sectorTemplateVO.hazards[hazard] > 0;
				if (sectorHasHazard != templateHasHazard) return { isValid: false, reason: "sector hazards differ (" + hazard + ")" };
			}

			let movementBlockerResult = WorldValidator.checkListMatches(sectorVO, sectorTemplateVO, "movementBlockers");
			if (!movementBlockerResult.isValid) return movementBlockerResult;

			return { isValid: true };

		},

		checkListMatches: function (vo, template, key, name) {
			name = name || key;
			for (let i in vo[key]) {
				let voValue = vo[key][i];
				let templateValue = template[key][i];
				if (!voValue && !templateValue) continue;
				if (!voValue) return { isValid: false, reason: "missing " + name + " at index " + i };
				if (!templateValue) return { isValid: false, reason: "extra " + name + " at index " + i };
				if (voValue == templateValue) continue;
				if (voValue.equals && voValue.equals(templateValue)) continue;
				return { isValid: false, reason: "different " + name + " at index " + i };
			}
			
			return { isValid: true };
		}

	};

	return WorldValidator;
});
