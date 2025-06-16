define(['ash', 
    'text/Text', 
    'game/GameGlobals', 
    'game/constants/DialogueConstants', 
    'game/constants/ExplorerConstants',
    'game/constants/PositionConstants',
    'game/constants/StoryConstants',
    'game/components/common/PositionComponent',
    'game/nodes/player/DialogueNode' 
], function (Ash, Text, GameGlobals, DialogueConstants, ExplorerConstants, PositionConstants, StoryConstants, PositionComponent, DialogueNode) {
        
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

            getCurrentPageVO: function () {
                if (!this.dialogueNodes.head) return null;

                let dialogueComponent = this.dialogueNodes.head.dialogue;

                let currentPageID = dialogueComponent.currentPageID;

                if (!currentPageID && currentPageID !== 0) return null;

                let currentPageVO = this.dialogueNodes.head.dialogue.activeDialogue.pagesByID[currentPageID];

                return currentPageVO;
            },

            isDialogueValid: function (dialogueVO, explorerVO, storyTag) {
                if (!dialogueVO) return false;

                // story tag checks

                // - if explorer has pending dialogue, it becomes the default requested storyTag
                if (!storyTag && explorerVO && explorerVO.pendingDialogue) storyTag = explorerVO.pendingDialogue;

                // - if requesting specific story tag, dialogue must match
                if (storyTag && dialogueVO.storyTag !== storyTag) return false;

                // - if explorer has no pending dialogue, it can't use a dialogue with storyTag that is pending for someone else
                if (explorerVO && !explorerVO.pendingDialogue) {
                    let allPendingExplorerDialogues = this.getAllPendingExplorerDialogues();
                    if (allPendingExplorerDialogues.indexOf(dialogueVO.storyTag) >= 0) return false;
                }

                // conditions checks

                let conditions = dialogueVO.conditions;
                if (!conditions) return true;

                let reqsCheck = GameGlobals.playerActionsHelper.checkGeneralRequirementaInternal(conditions);
                if (reqsCheck.value < 1) return false;

                if (conditions.explorer) {
                    if (!explorerVO) return false;
                    if (conditions.explorer.trust && conditions.explorer.trust > explorerVO.trust) return false;
                    if (conditions.explorer.maxTrust && conditions.explorer.maxTrust < explorerVO.trust) return false;
                    if (typeof conditions.explorer.inParty !== "undefined" && conditions.explorer.inParty != explorerVO.inParty) return false;
                    if (conditions.explorer.injured && explorerVO.injuredTimer <= 0) return false;
                    if (conditions.explorer.abilityType && explorerVO.abilityType != conditions.explorer.abilityType) return false;
                    if (conditions.explorer.quest && GameGlobals.storyHelper.getExplorerQuestStories(explorerVO).indexOf(conditions.explorer.quest) <0) return false;
                    if (conditions.explorer.meetCampOrdinal 
                        && GameGlobals.playerActionsHelper.checkRequirementsRange(conditions.explorer.meetCampOrdinal, explorerVO.meetCampOrdinal)) return false;
                }

                if (conditions.vicinity) {
                    let requiredPOIType = dialogueVO.conditions.vicinity;
                    let requiredPOIScouted = dialogueVO.conditions.vicinityScouted;
                    let requiredPOIData = this.findPOIDataForDialogue(requiredPOIType, requiredPOIScouted);
                    if (!requiredPOIData) return false;
                }

                // some dialogues can ONLY be triggered when they are marked as pending dialogues from story (or requested for triggering one)
                if (conditions.pendingDialogue && !storyTag) {
                    if (!explorerVO || explorerVO.pendingDialogue != dialogueVO.storyTag) return false;
                }

                return true;
            },

            getDialogueTextParams: function (dialogueVO, pageVO, resultVO, isExplorer, staticTextParams) {
                let result = staticTextParams || {};


                if (dialogueVO.conditions.vicinity) {
                    let requiredPOIType = dialogueVO.conditions.vicinity;
                    let requiredPOIScouted = dialogueVO.conditions.vicinityScouted;
                    let requiredPOIData = this.findPOIDataForDialogue(requiredPOIType, requiredPOIScouted);
                    if (requiredPOIData) {
                        result.direction = requiredPOIData.directionTextKey;
                        result.name = requiredPOIData.nameTextKey;
                    }
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

                result.surfaceLevel = GameGlobals.gameState.getSurfaceLevel();
                result.surfaceLevelMinus1 = GameGlobals.gameState.getSurfaceLevel() - 1;

                return result;
            },

            findPOIDataForDialogue: function (poiType, isScouted) {
                let playerPosition = GameGlobals.playerHelper.getPosition();
                let playerLocation = GameGlobals.playerHelper.getLocation(); 

                let result = null;
            
                // no need to give directions if current sector has relevant poi
                if (GameGlobals.sectorHelper.getPOIData(playerLocation, poiType)) return result;

                let minDistance = this.getPOIMinDistance(poiType);
                let maxDistance = this.getPOIMaxDistance(poiType);
                
                GameGlobals.levelHelper.forEverySectorFromLocation(playerPosition, (sector) => {
                    let sectorPosition = sector.get(PositionComponent);
                    let distance = PositionConstants.getDistanceTo(playerPosition, sectorPosition);
                    if (distance == 0) return false;
                    if (minDistance > 0 && distance < minDistance) return false;
                    if (maxDistance > 0 && distance > maxDistance) return false;
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
                if (explorerVO.pendingDialogue && explorerVO.pendingDialogue == entry.storyTag)  {
                    return DialogueConstants.STATUS_FORCED;
                }

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

                if (!storyTag && explorerVO.pendingDialogue) storyTag = explorerVO.pendingDialogue;

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
                    if (!this.isDialogueValid(entry, explorerVO, storyTag)) continue;

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
                        if (GameGlobals.dialogueHelper.isDialogueValid(lastShownDialogueVO)) {
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

                    if (!this.isDialogueValid(entry)) continue;

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
    