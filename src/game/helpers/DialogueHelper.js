define(['ash', 
    'text/Text', 
    'game/GameGlobals', 
    'game/constants/DialogueConstants', 
    'game/constants/ExplorerConstants',
    'game/constants/ItemConstants',
    'game/constants/PositionConstants',
    'game/constants/StoryConstants',
    'game/constants/TextConstants',
    'game/constants/TribeConstants',
    'game/constants/EnemyConstants',
    'game/components/common/PositionComponent',
    'game/components/sector/EnemiesComponent',
    'game/components/sector/SectorFeaturesComponent',
    'game/nodes/player/DialogueNode' 
], function (Ash, Text, GameGlobals, DialogueConstants, ExplorerConstants, ItemConstants, PositionConstants, StoryConstants, TextConstants, TribeConstants, EnemyConstants, PositionComponent, EnemiesComponent, SectorFeaturesComponent, DialogueNode) {
        
        let DialogueHelper = Ash.Class.extend({

            dialogueNodes: null,
		
            constructor: function (engine) {
                if (engine) {
                    this.dialogueNodes = engine.getNodeList(DialogueNode);
                }
            },

            checkDialogueData: function () {
                // NOTE: should be only called after Texts are loaded

                let numErrors = 0;

                // check that all strings in story.dialogue are used in dialogues
                for (let textKey in Text.defaultTexts) {
                    if (textKey.indexOf("story.dialogue.") != 0) continue;
                    let textKeyShort = textKey.replace("story.dialogue.", "");
                    let foundTextKey = false;

                    let textKeyMatches = s => s == textKey || s == textKeyShort;

                    for (let dialogueID in DialogueConstants.dialogues) {
                        let dialogueVO = DialogueConstants.getDialogue(dialogueID);
                        for (let i = 0; i< dialogueVO.pages.length; i++) {
                            let pageVO = dialogueVO.pages[i];
                            if (textKeyMatches(pageVO.textKey) || textKeyMatches(pageVO.textKeyMeta)) {
                                foundTextKey = true;
                                break;
                            }

                            for (let j = 0; j < pageVO.options.length; j++) {
                                let optionVO = pageVO.options[j];
                                if (textKeyMatches(optionVO.buttonTextKey)) {
                                    foundTextKey = true;
                                    break;
                                }
                            }
                        }
                        if (foundTextKey) break;
                    }

                    if (!foundTextKey) {
                        numErrors++;
                        log.w("text key " + textKey + " doesn't seem to be used in any dialogue");
                    }
                }

                // check that all dialogues are listed in some source
                for (let dialogueID in DialogueConstants.dialogues) {
                    if (dialogueID.indexOf("locale_") == 0 || dialogueID.indexOf("item_") == 0) continue;
                    let foundDialogueSource = false;

                    for (let dialogueSourceID in DialogueConstants.dialogueSources) {
                        let dialogueSource = DialogueConstants.getDialogueSource(dialogueSourceID);
                        for (let context in dialogueSource.dialogues) {
                            let dialogueIDs = dialogueSource.dialogues[context];
                            if (dialogueIDs.indexOf(dialogueID) >= 0) {
                                foundDialogueSource = true;
                                break;
                            }
                        }
                        if (foundDialogueSource) break;
                    }

                    if (!foundDialogueSource) {
                        numErrors++;
                        log.w("dialogue " + dialogueID + " doesn't seem to be used in any dialogue source");
                    }
                }

                // check that all dialogues listed in dialogue sources exist

                for (let dialogueSourceID in DialogueConstants.dialogueSources) {
                    let dialogueSource = DialogueConstants.getDialogueSource(dialogueSourceID);
                    for (let context in dialogueSource.dialogues) {
                        let dialogueIDs = dialogueSource.dialogues[context];
                        for (i = 0; i < dialogueIDs.length; i++) {
                            let dialogueID = dialogueIDs[i];
                            if (!DialogueConstants.getDialogue(dialogueID)) {
                                // assuming getDialogue logs error
                                numErrors++;
                            }
                        }
                    }
                }

                if (numErrors > 0) {
                    log.w("TOTAL DIALOGUE DATA ERRORS: " + numErrors)
                }
            },

            getCurrentDialogeID: function () {
                if (!this.dialogueNodes.head.dialogue) return "(none)";
                if (!this.dialogueNodes.head.dialogue.activeDialogue) return "(none)";
                return this.dialogueNodes.head.dialogue.activeDialogue.dialogueID;
            },

            getCurrentPageVO: function () {
                if (!this.dialogueNodes.head) return null;

                let dialogueComponent = this.dialogueNodes.head.dialogue;

                let currentPageID = dialogueComponent.currentPageID;

                if (!currentPageID && currentPageID !== 0) return null;

                let currentPageVO = this.dialogueNodes.head.dialogue.activeDialogue.pagesByID[currentPageID];

                return currentPageVO;
            },

            getCurrentPageSelection: function () {
                let selection = $("#dialogue-page-selection");
                return selection && selection.length > 0 ? selection.val() : null;
            },

            isDialogueValid: function (dialogueVO, explorerVO, characterVO, storyTag) {
                if (!dialogueVO) return false;

                // story tag checks

                // - if explorer has a valid pending dialogue, it becomes the default requested storyTag
                if (!storyTag && explorerVO && this.hasValidPendingDialogue(explorerVO)) storyTag = explorerVO.pendingDialogue;

                // - if requesting specific story tag, dialogue must match
                if (storyTag && dialogueVO.storyTag !== storyTag) return false;

                // - if explorer has no pending dialogue, it can't use a dialogue with storyTag that is pending for someone else
                if (explorerVO && !explorerVO.pendingDialogue) {
                    let allPendingExplorerDialogues = this.getAllPendingExplorerDialogues();
                    if (allPendingExplorerDialogues.indexOf(dialogueVO.storyTag) >= 0) return false;
                }

                // conditions checks
                let conditions = dialogueVO.conditions;
                if (conditions) {
                    // - general
                    let reqsCheck = GameGlobals.playerActionsHelper.checkGeneralRequirementaInternal(conditions);
                    if (reqsCheck.value < 1) return false;

                    // - dialogue specific: explorer
                    if (conditions.explorer) {
                        if (!explorerVO) return false;
                        if (conditions.explorer.trust && conditions.explorer.trust > explorerVO.trust) return false;
                        if (conditions.explorer.maxTrust && conditions.explorer.maxTrust < explorerVO.trust) return false;
                        if (typeof conditions.explorer.inParty !== "undefined" && conditions.explorer.inParty != explorerVO.inParty) return false;
                        let forcedExplorerID = GameGlobals.explorerHelper.getForcedExplorerID();
                        let isForced = explorerVO.id == forcedExplorerID
                        if (typeof conditions.explorer.isForced !== "undefined" && conditions.explorer.isForced != isForced) return false;
                        if (conditions.explorer.injured && explorerVO.injuredTimer <= 0) return false;
                        if (conditions.explorer.abilityType && explorerVO.abilityType != conditions.explorer.abilityType) return false;
                        if (conditions.explorer.explorerType && ExplorerConstants.getExplorerTypeForAbilityType(explorerVO.abilityType) != conditions.explorer.explorerType) return false;
                        if (conditions.explorer.origin && explorerVO.origin != conditions.explorer.origin) return false;
                        if (conditions.explorer.quest && GameGlobals.storyHelper.getExplorerQuestStories(explorerVO).indexOf(conditions.explorer.quest) <0) return false;
                        if (typeof conditions.explorer.isFamiliarLevel !== "undefined" && conditions.explorer.isFamiliarLevel != GameGlobals.explorerHelper.isFamiliarWithCurrentLevel(explorerVO)) return false;
                        if (conditions.explorer.meetCampOrdinal 
                            && GameGlobals.playerActionsHelper.checkRequirementsRange(conditions.explorer.meetCampOrdinal, explorerVO.meetCampOrdinal)) return false;
                    }

                    if (conditions.character) {
                        if (!characterVO) return false;
                        if (conditions.character.minCompletedDialogues && characterVO.completedDialogues.length < conditions.character.minCompletedDialogues) return false;
                    }

                    // - dialogue specific: vicinity
                    if (conditions.vicinity) {
                        let requiredPOIType = dialogueVO.conditions.vicinity;
                        let requiredPOIScouted = dialogueVO.conditions.vicinityScouted;
                        let requiredPOIData = this.findPOIDataForDialogue(requiredPOIType, requiredPOIScouted);
                        if (!requiredPOIData) return false;
                    }

                    // - dialogue specific: enemy
                    if (conditions.enemy && this.getDialogueEnemyCandidates(conditions.enemy).length == 0) return false;
                }

                // some dialogues can ONLY be triggered when they are marked as pending dialogues from story (or requested for triggering one)
                if (conditions.pendingDialogue && !storyTag) {
                    if (!explorerVO || explorerVO.pendingDialogue != dialogueVO.storyTag) return false;
                }

                return true;
            },

            getDialogueTextParams: function (dialogueVO, pageVO, resultVO, isExplorer) {
                let dialogueComponent = this.dialogueNodes.head.dialogue;
                let staticTextParams = dialogueComponent.textParams;
                
                let result = staticTextParams || {};

                if (dialogueVO.conditions.vicinity) {
                    let requiredPOIType = dialogueVO.conditions.vicinity;
                    let requiredPOIScouted = dialogueVO.conditions.vicinityScouted;
                    let requiredPOIData = this.findPOIDataForDialogue(requiredPOIType, requiredPOIScouted);
                    if (requiredPOIData) {
                        result.direction = requiredPOIData.directionTextKey;
                        result.sectorType = TextConstants.getSectorTypeDisplayName(requiredPOIData.sectorType);
                        result.name = requiredPOIData.nameTextKey;
                    }
                }

                if (dialogueVO.conditions.missedUpgrade) {
                    let type = dialogueVO.conditions.missedUpgrade;
                    let upgradeIDs = GameGlobals.tribeHelper.getMissedUpgrades(type);
                    let upgradeID = upgradeIDs.length > 0 ? upgradeIDs[0] : "?";
                    result.upgradeName = TextConstants.getUpgradeDisplayName(upgradeID);
                }

                if (dialogueVO.conditions.upgrades) {
                    let upgradeIDs = Object.keys(dialogueVO.conditions.upgrades);
                    if (upgradeIDs.length > 0) {
                        let upgradeID = upgradeIDs[0];
                        result.upgradeName = TextConstants.getUpgradeDisplayName(upgradeID);
                    }
                }

                if (dialogueVO.conditions.availableLuxuryResources) {
                    for (let key in dialogueVO.conditions.availableLuxuryResources) {
                        result.luxuryResource = TribeConstants.getLuxuryDisplayName(key);
                        break;
                    }
                }

                if (dialogueVO.conditions.party?.hasInjuredExplorer) {
					let party = GameGlobals.playerHelper.getParty();
                    for (let i = 0; i < party.length; i++) {
                        let explorerVO = party[i];
                        if (explorerVO.injuredTimer >= 0) {
                            result.explorer = explorerVO.name;
                        }
                    }
                }

                if (dialogueVO.conditions.world?.hasInvestigatableLocale) {
                    let data = GameGlobals.levelHelper.getInvestigatableLocaleData();
                    if (data) {
                        result.level = data.level;
                        result.locale = TextConstants.getLocaleName(data.localeVO);
                    }
                }

                if (dialogueVO.conditions.world?.hasIncompleteLevel) {
                    result.level = GameGlobals.levelHelper.getIncompleteLevel();
                }

                if (dialogueVO.conditions.district?.hasHazard) {
                    result.hazard = TextConstants.getHazrdDisplayNameNoun(GameGlobals.levelHelper.getDistrictHazard());
                }

                if (dialogueVO.conditions.camp?.feature?.signatureDisaster) {
                    let playerPosition = GameGlobals.playerHelper.getPosition();
                    let campOrdinal = GameGlobals.worldState.getCampOrdinal(playerPosition.level);
                    let features = GameGlobals.campHelper.getCampUniqueFeaturesSummary(campOrdinal);
                    result.disasterType = features.signatureDisaster;
                }

                for (let j = 0; j < pageVO.options.length; j++) {
                    let optionVO = pageVO.options[j];
                    this.addDialogueTextParamsFromCosts(result, optionVO.costs);
                }

                if (GameGlobals.gameState.getStoryFlag(StoryConstants.flags.SPIRITS_SEARCHING_FOR_SPIRITS)) {
                    let requiredPOIData = this.findPOIDataForDialogue("grove");
                    if (requiredPOIData) {
                        result.direction = requiredPOIData.directionTextKey;
                        result.name = requiredPOIData.nameTextKey;
                    }
                }

                if (resultVO && resultVO.lostExplorerInjuries) {
                    for (let i = 0; i < resultVO.lostExplorerInjuries.length; i++) {
                        let explorerID = resultVO.lostExplorerInjuries[i];
					    let explorerVO = GameGlobals.playerHelper.getExplorerByID(explorerID);
                        if (explorerVO) {
                            result.explorerName = explorerVO.name;
                            break;
                        }
                    }
                }

                if (dialogueVO.conditions.enemy) {
                    let enemyCandidate = this.getDialogueEnemy(dialogueVO.conditions.enemy);
                    if (enemyCandidate) {
                        result.enemy = enemyCandidate.enemy.name;
                        result.enemies = Text.pluralify(enemyCandidate.enemy.name);

                        if (enemyCandidate.sector) {
                            let playerPosition = GameGlobals.playerHelper.getPosition();
					        let districtVO = GameGlobals.sectorHelper.getDistrictVO(enemyCandidate.sector);
                            let districtPosition = districtVO.adjustedPosition;
                            let direction = PositionConstants.getDirectionFrom(playerPosition, districtPosition);
                            result.sectorType = TextConstants.getSectorTypeDisplayName(districtVO.type);
                            result.direction = PositionConstants.getDirectionTextKey(direction);
                        }
                    }
                }

                Object.assign(result, GameGlobals.sectorHelper.getTextParams());
                
                result.surfaceLevel = GameGlobals.worldState.getSurfaceLevel();
                result.surfaceLevelMinus1 = GameGlobals.worldState.getSurfaceLevel() - 1;

                return result;
            },

            getDialogueEnemyCandidates: function (requirements) {
                // encountered
                if (requirements.source == "encountered") {
                    let encounteredIDs = GameGlobals.gameState.stats.uniqueEnemiesEncountered || [];
                    let encounteredCandidates = [];
                    for (let i = 0; i < encounteredIDs.length; i++) {
                        let enemy = EnemyConstants.tryGetEnemy(encounteredIDs[i]);
                        if (!enemy) continue;
                        if (requirements.type && enemy.enemyClass != requirements.type) continue;
                        
                        encounteredCandidates.push({ enemy: enemy, recencyScore: this.getEnemyRecencyScore(enemy.id) });
                    }
                    return encounteredCandidates;
                }

                // by level / district
                let playerPosition = GameGlobals.playerHelper.getPosition();
                let currentSector = GameGlobals.playerHelper.getLocation();
                let currentDistrictIndex = currentSector.get(SectorFeaturesComponent).districtIndex;
                if (!playerPosition || !currentSector) return [];

                let sectors = [];

                switch (requirements.source) {
                    case "current_district":
                        sectors = GameGlobals.levelHelper.getSectorsInDistrict(currentSector);
                        break;
                    case "other_district":
                        sectors = GameGlobals.levelHelper.getSectorsByLevel(playerPosition.level).filter(s => s.get(SectorFeaturesComponent).districtIndex != currentDistrictIndex);
                        break;
                    case "current_level":
                        sectors = GameGlobals.levelHelper.getSectorsByLevel(playerPosition.level);
                        break;
                    default:
                        return [];
                }

                sectors = sectors.slice().sort((a, b) => {
                    let posA = a.get(PositionComponent).getPosition();
                    let posB = b.get(PositionComponent).getPosition();
                    return PositionConstants.getDistanceTo(playerPosition, posA) - PositionConstants.getDistanceTo(playerPosition, posB);
                });

                let candidatesByID = {};

                for (let i = 0; i < sectors.length; i++) {
                    let sector = sectors[i];

                    let enemiesComponent = sector.get(EnemiesComponent);
                    if (!enemiesComponent || !enemiesComponent.hasEnemies) continue;

                    let sectorFeatures = sector.get(SectorFeaturesComponent);

                    for (let j = 0; j < enemiesComponent.possibleEnemies.length; j++) {
                        let enemyVO =  enemiesComponent.possibleEnemies[j];
                        if (requirements.type && enemyVO.enemyClass != requirements.type) continue;

                        let candidateID = requirements.source == "other_district"
                            ? sectorFeatures.districtIndex + ":" + enemyVO.id
                            : enemyVO.id;

                        if (!candidatesByID[candidateID]) {
                            candidatesByID[candidateID] = {
                                enemy: enemyVO,
                                sector: sector,
                                prevalence: 0,
                                recencyScore: this.getEnemyRecencyScore(enemyVO.id),
                            };
                        }

                        candidatesByID[candidateID].prevalence++;
                    }
                }

                return Object.keys(candidatesByID).map(id => candidatesByID[id]);
            },

            getDialogueEnemy: function (requirements) {
                let candidates = this.getDialogueEnemyCandidates(requirements);
                if (candidates.length == 0) return null;

                let getPreferenceValue = function (candidate) {
                    let difficulty = EnemyConstants.getDifficulty(candidate.enemy) || 0;
                    let rarity = candidate.enemy.rarity;
                    let localRarity = rarity - (candidate.prevalence || 0);

                    switch (requirements.preference) {
                        case "dangerous": return difficulty;
                        case "rare": return requirements.source == "encountered" ? rarity : localRarity;
                        case "common": return requirements.source == "encountered" ? -rarity : -localRarity;
                        default: return 0;
                    }
                };

                candidates.sort((a, b) => {
                    let preferenceDifference = getPreferenceValue(b) - getPreferenceValue(a);
                    if (preferenceDifference != 0) return preferenceDifference;
                    return b.recencyScore - a.recencyScore;
                });

                return candidates[0];
            },

            getEnemyRecencyScore: function (enemyID) {
                let recentEncounteredIDs = GameGlobals.gameState.stats.recentEnemiesEncountered || [];
                return recentEncounteredIDs.lastIndexOf(enemyID);
            },

            addDialogueTextParamsFromCosts: function (result, costs) {                
			    for (let costName in costs) {
                    let costNameParts = costName.split("_");
                    let costNameParam = costName.replace(costNameParts[0] + "_", "");

                    if (costName == "explorer_animal") {
					    let explorerVO = GameGlobals.playerActionsHelper.getExplorerForCost(costNameParam);
                        if (explorerVO) result.explorerName = explorerVO.name;
                    }
                }
            },

            findPOIDataForDialogue: function (poiType, isScouted) {
                let playerPosition = GameGlobals.playerHelper.getPosition();
                let playerLocation = GameGlobals.playerHelper.getLocation(); 

                let result = null;
            
                // no need to give directions if current sector has relevant poi
                if (GameGlobals.sectorHelper.getPOIData(playerLocation, poiType)) return result;

                let minDistance = this.getPOIMinDistance(poiType);
                let maxDistance = this.getPOIMaxDistance(poiType);
                let requiresPath = this.getPOIRequiresPath(poiType);
                
                let pathSettings = { skipBlockers: true, omitWarnings: true, maxLength: maxDistance };
                
                GameGlobals.levelHelper.forEverySectorFromLocation(playerPosition, (sector) => {
                    let sectorPosition = sector.get(PositionComponent);
                    let distance = PositionConstants.getDistanceTo(playerPosition, sectorPosition);
                    if (distance == 0) return false;
                    if (minDistance > 0 && distance < minDistance) return false;
                    if (maxDistance > 0 && distance > maxDistance) return false;
                    if (requiresPath && !GameGlobals.levelHelper.findPathTo(playerLocation, sector, pathSettings)) return false;
                    let poiData = GameGlobals.sectorHelper.getPOIData(sector, poiType, isScouted);
                    if (poiData) {
                        let direction = PositionConstants.getDirectionFrom(playerPosition, sectorPosition);
                        result = poiData;
                        result.directionTextKey = PositionConstants.getDirectionTextKey(direction);
                        return true;
                    }
                    return false;
                }, true);

                return result;
            },

            getPOIMinDistance: function (poiType) {
                switch (poiType) {
                    case "center": return 3;
                }
                return -1;
            },

            getPOIMaxDistance: function (poiType) {
                switch (poiType) {
                    case "campable": return -1;
                    case "grove": return -1;
                    case "center": return -1;
                }
                return 8;
            },

            getPOIRequiresPath: function (poiType) {
                switch (poiType) {
                    case "spring": return true;
                }
                return false;
            },

            hasResults: function (dialogueVO) {
                for (let i = 0; i < dialogueVO.pages.length; i++) {
                    let pageVO = dialogueVO.pages[i];
                    if (pageVO.resultTemplate) {
                        return true;
                    }
                }
                return false;
            },

            hasOptionWithReplaceDialoge: function (dialogueVO) {
                for (let i = 0; i < dialogueVO.pages.length; i++) {
                    let pageVO = dialogueVO.pages[i];
                    if (pageVO.resultTemplate && pageVO.resultTemplate.replaceDialogue) {
                        return true;
                    }
                }
                return false;
            },

            getSelectionOptions: function (source) {
                let result = [];

                if (source == "item_disassemblable") {
                    let items = GameGlobals.playerHelper.getAllAvailableItems();
                    for (let i = 0; i < items.length; i++) {
                        let itemVO = items[i];
                        if (ItemConstants.isDisassemblable(itemVO)) {
                            let label = ItemConstants.getItemDisplayName(itemVO);
                            if (itemVO.equipped) label += " " + Text.t("ui.common.value_detail_postfix", Text.t("ui.inventory.item_status_equipped"));
                            result.push({
                                label: label,
                                id: itemVO.itemID,
                            });
                        }
                    }
                }

                return result;
            },

            // explorer dialogue

            isValidExplorerDialogueSource: function (dialogueSourceID) {
                if (!dialogueSourceID) return false;
                let dialogueSource = DialogueConstants.getDialogueSource(dialogueSourceID);
                if (!dialogueSource) return false;
                if (DialogueConstants.getDialogueEntries(dialogueSourceID, DialogueConstants.dialogueSettings.meet).length < 1) return false;
                if (DialogueConstants.getDialogueEntries(dialogueSourceID, DialogueConstants.dialogueSettings.event).length < 1) return false;
                if (DialogueConstants.getDialogueEntries(dialogueSourceID, DialogueConstants.dialogueSettings.interact).length < 1) return false;
                return true;
            },

            updateExplorerDialogueSource: function (explorerVO) {
                if (this.isValidExplorerDialogueSource(explorerVO.dialogueSource)) return;
                explorerVO.dialogueSource = ExplorerConstants.getRandomDialogueSource(explorerVO.abilityType);
            },

            isExplorerDialogueNew: function (explorerVO, setting) {
                if (!explorerVO) return false;
                if (!setting) setting = DialogueConstants.dialogueSettings.interact;

                let validDialogues = this.getExplorerValidDialogues(explorerVO, setting);

                for (let i = 0; i < validDialogues.length; i++) {
                    let entry = validDialogues[i];
                    if (this.isExplorerDialogueNewForEntry(explorerVO, entry)) {
                        return true;
                    }
                }

                return false;
            },

            getExplorerDialogueStatus: function (explorerVO, setting) {
                let result = 0;

                if (!explorerVO) return result;

                if (!setting) setting = DialogueConstants.dialogueSettings.interact;

                let validDialogues = this.getExplorerValidDialogues(explorerVO, setting);

                if (!explorerVO.seenDialogues) result = DialogueConstants.STATUS_NEW;

                for (let i = 0; i < validDialogues.length; i++) {
                    let entry = validDialogues[i];
                    let status = this.getExplorerDialogueStatusForEntry(explorerVO, entry);
                    if (!status) continue;
                    if (!result || status > result) result = status;
                }

                return result;
            },

            getExplorerDialogueStatusForEntry: function (explorerVO, entry) {
                if (explorerVO.pendingDialogue && explorerVO.pendingDialogue == entry.storyTag) return DialogueConstants.STATUS_FORCED;

                let isNew = this.isExplorerDialogueNewForEntry(explorerVO, entry);

                if (isNew && entry.isForced) DialogueConstants.STATUS_FORCED;

                if (isNew && entry.isUrgent) return DialogueConstants.STATUS_URGENT;

                if (isNew && entry.isPriority) return DialogueConstants.STATUS_PRIORITY_NEW;

                if (entry.isPriority) return DialogueConstants.STATUS_PRIORITY;

                if (isNew) return DialogueConstants.STATUS_NEW;

                return DialogueConstants.STATUS_DEFAULT;
            },

            isExplorerDialogueNewForEntry: function (explorerVO, entry) {
                let isAnimal = ExplorerConstants.isAnimal(explorerVO.abilityType);
                if (isAnimal) return false;
                return GameGlobals.gameState.seenDialogues && GameGlobals.gameState.seenDialogues.indexOf(entry.dialogueID) < 0;
            },
            
            getExplorerDialogueKey: function (explorerVO, setting) {
                let validDialogues = this.getExplorerValidDialogues(explorerVO, setting);

                if (validDialogues.length == 0) {
                    log.w("no valid dialogues found for explorer");
                    return null;
                }
                
                let randomIndex = Math.floor(Math.random() * validDialogues.length);
                return validDialogues[randomIndex].dialogueID;
            },

            getExplorerValidDialogues: function (explorerVO, setting, storyTag) {
                if (!explorerVO) return [];

                let dialogueSource = explorerVO.dialogueSource || "explorer_generic_01";
                
                let entries = DialogueConstants.getDialogueEntries(dialogueSource, setting);

                if (!storyTag && this.hasValidPendingDialogue(explorerVO)) storyTag = explorerVO.pendingDialogue;

                let result = [];
                let highestStatus = 0;

                for (let i = 0; i < entries.length; i++) {
                    let dialogueID = entries[i];
                    let entry = DialogueConstants.getDialogue(dialogueID);

                    // skip if not repeatable and already seen from this explorer
                    if (!storyTag && !entry.isRepeatable && explorerVO.seenDialogues && explorerVO.seenDialogues.indexOf(entry.dialogueID) >= 0) {
                        continue;
                    }

                    // skip if unique and already seen from any explorer
                    if (!storyTag && entry.isUnique && GameGlobals.gameState.seenDialogues && GameGlobals.gameState.seenDialogues.indexOf(entry.dialogueID) >= 0) {
                        continue;
                    }

                    // skip if not valid due to dialogue conditions
                    if (!this.isDialogueValid(entry, explorerVO, null, storyTag)) continue;

                    let status = this.getExplorerDialogueStatusForEntry(explorerVO, entry);

                    // skip if not highest status
                    if (status < highestStatus) continue;

                    if (status > highestStatus) {
                        highestStatus = status;
                        result = [];
                    }

                    result.push(entry);
                }

                return result;
            },
            
            hasValidPendingDialogue: function (explorerVO) {
                if (!explorerVO) return false;
                if (!explorerVO.pendingDialogue) return false;
                if (this.getExplorerValidDialogues(explorerVO, "interact", explorerVO.pendingDialogue).length == 0) return false;
                return true;
            },

            getAllPendingExplorerDialogues: function () {
                let result = [];
                let explorers = GameGlobals.playerHelper.getExplorers();
                for (let i = 0; i < explorers.length; i++) {
                    let explorerVO = explorers[i];
                    let pendingDialogue = explorerVO.pendingDialogue;
                    if (pendingDialogue) {
                        result.push(pendingDialogue);
                    }
                }
                return result;
            },
            
            // general

            getNextCharacterDialogueID: function (characterVO, setting, minDialogueRepeatMins) {
                let dialogueID = null;
                let lastShownDialogueID = characterVO.lastShownDialogue;

                minDialogueRepeatMins = minDialogueRepeatMins || 3;
                let minDialogueRepeatTime = 1000 * 60 * minDialogueRepeatMins;

                // pick previously shown if one saved and it's not been long
                if (lastShownDialogueID && characterVO.lastShownDialogueTimestamp) {
                    let now = new Date().getTime();
                    if (now - characterVO.lastShownDialogueTimestamp < minDialogueRepeatTime) {
                        let lastShownDialogueVO = DialogueConstants.getDialogue(lastShownDialogueID);
                        if (GameGlobals.dialogueHelper.isDialogueValid(lastShownDialogueVO, null, characterVO)) {
                            dialogueID = lastShownDialogueID;
                        }
                    }
                }

                // if previously shown not found / no longer valid, pick new
                if (!dialogueID) {
                    dialogueID = GameGlobals.dialogueHelper.getRandomValidCharacterDialogueID(characterVO, setting);
                }

                return dialogueID;
            },

            getRandomValidCharacterDialogueID: function (characterVO, setting) {
                let dialogueSourceID = characterVO.dialogueSourceID;

                if (!characterVO.completedDialogues) characterVO.completedDialogues = [];
                
                let validDialogues = this.getCharacterValidDialogues(characterVO, setting);

                if (validDialogues.length == 0) {
                    log.w("no valid dialogues found for character with dialogue source " + dialogueSourceID + "." + setting);
                    return null;
                }
                
                let randomIndex = Math.floor(Math.random() * validDialogues.length);
                return validDialogues[randomIndex].dialogueID;
            },

            getCharacterValidDialogues: function (characterVO, setting) {
                let dialogueSourceID = characterVO.dialogueSourceID;
                let entries = DialogueConstants.getDialogueEntries(dialogueSourceID, setting);

                let result = [];

                for (let i = 0; i < entries.length; i++) {
                    let dialogueID = entries[i];
                    let entry = DialogueConstants.getDialogue(dialogueID);

                    if (!entry) continue;

                    if (!this.isDialogueValid(entry, null, characterVO)) continue;

                    result.push(entry);
                }

                if (characterVO.completedDialogues.length > 0) {
                    // filter out completed
                    let resultWithoutCompleted = result.filter(d => characterVO.completedDialogues.indexOf(d.dialogueID) < 0);
                    if (resultWithoutCompleted.length > 0) result = resultWithoutCompleted;

                    // filter out dialogues with results (second after completing one shouldn't give results)
                    let resultWithoutResults = result.filter(d => !GameGlobals.dialogueHelper.hasResults(d));
                    if (resultWithoutResults.length > 0) result = resultWithoutResults;

                    // filter out dialogues which replace dialogue (probably meant to see only one of these)
                    let resultWithoutReplaceDialogue = result.filter(d => !GameGlobals.dialogueHelper.hasOptionWithReplaceDialoge(d));
                    if (resultWithoutReplaceDialogue.length > 0) result = resultWithoutReplaceDialogue;
                }

                return result;
            },

            
        });
    
        return DialogueHelper;
    });
    