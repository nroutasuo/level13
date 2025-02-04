define(['ash', 
    'game/GameGlobals', 
    'game/constants/DialogueConstants', 
    'game/constants/ExplorerConstants',
    'game/constants/PositionConstants',
    'game/constants/StoryConstants',
    'game/components/common/PositionComponent',
    'game/nodes/player/DialogueNode' 
], function (Ash, GameGlobals, DialogueConstants, ExplorerConstants, PositionConstants, StoryConstants, PositionComponent, DialogueNode) {
        
        let DialogueHelper = Ash.Class.extend({

            dialogueNodes: null,
		
            constructor: function (engine) {
                if (engine) {
                    this.dialogueNodes = engine.getNodeList(DialogueNode);
                }
            },

            getCurrentPageVO: function () {
                if (!this.dialogueNodes.head) return null;

                let dialogueComponent = this.dialogueNodes.head.dialogue;

                let currentPageID = dialogueComponent.currentPageID;

                let currentPageVO = this.dialogueNodes.head.dialogue.activeDialogue.pagesByID[currentPageID];

                return currentPageVO;
            },

            isDialogueValid: function (dialogueVO, explorerVO, storyTag) {
                if (!dialogueVO) return false;

                if (!storyTag && explorerVO && explorerVO.pendingDialogue) storyTag = explorerVO.pendingDialogue;

                if (storyTag && dialogueVO.storyTag !== storyTag) return false;
                if (!storyTag && dialogueVO.storyTag) return false;

                let conditions = dialogueVO.conditions;
                if (!conditions) return true;

                let reqsCheck = GameGlobals.playerActionsHelper.checkGeneralRequirementaInternal(conditions);
                if (reqsCheck.value < 1) return false;

                if (conditions.explorer) {
                    if (!explorerVO) return false;
                    if (conditions.explorer.trust && conditions.explorer.trust > explorerVO.trust) return false;
                }

                if (conditions.vicinity) {
                    let requiredPOIType = dialogueVO.conditions.vicinity;
                    let requiredPOIData = this.findPOIDataForDialogue(requiredPOIType);
                    if (!requiredPOIData) return false;
                }

                return true;
            },

            getDialogueTextParams: function (dialogueVO, pageVO) {
                let result = {};

                if (dialogueVO.conditions.vicinity) {
                    let requiredPOIType = dialogueVO.conditions.vicinity;
                    let requiredPOIData = this.findPOIDataForDialogue(requiredPOIType);
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

                return result;
            },

            findPOIDataForDialogue: function (poiType) {
                let playerPosition = GameGlobals.playerHelper.getPosition();

                let result = null;
                
                GameGlobals.levelHelper.forEverySectorFromLocation(playerPosition, (sector) => {
                    let poiData = GameGlobals.sectorHelper.getPOIData(sector, poiType);
                    if (poiData) {
                        let sectorPosition = sector.get(PositionComponent);
                        let direction = PositionConstants.getDirectionFrom(playerPosition, sectorPosition);
                        result = poiData;
                        result.directionTextKey = PositionConstants.getDirectionTextKey(direction);
                        return true;
                    }
                    return false;
                }, true);

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
                if (explorerVO.pendingDialogue && explorerVO.pendingDialogue == entry.storyTag)  {
                    return DialogueConstants.STATUS_FORCED;
                }

                let isNew = this.isExplorerDialogueNewForEntry(explorerVO, entry);

                if (isNew && entry.isUrgent) return DialogueConstants.STATUS_URGENT;

                if (isNew && entry.isPriority) return DialogueConstants.STATUS_PRIORITY_NEW;

                if (entry.isPriority) return DialogueConstants.STATUS_PRIORITY;

                if (isNew) return DialogueConstants.STATUS_NEW;

                return 0;
            },

            isExplorerDialogueNewForEntry: function (explorerVO, entry) {
                return explorerVO.seenDialogues && explorerVO.seenDialogues.indexOf(entry.dialogueID) < 0
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
                if (!explorerVO.dialogueSource) return [];
                
                let entries = DialogueConstants.getDialogueEntries(explorerVO.dialogueSource, setting);

                if (!storyTag && explorerVO.pendingDialogue) storyTag = explorerVO.pendingDialogue;

                let result = [];
                let highestStatus = 0;

                for (let i = 0; i < entries.length; i++) {
                    let dialogueID = entries[i];
                    let entry = DialogueConstants.getDialogue(dialogueID);

                    if (!entry.isRepeatable && explorerVO.seenDialogues && explorerVO.seenDialogues.indexOf(entry.dialogueID) >= 0) {
                        continue;
                    }

                    if (!this.isDialogueValid(entry, explorerVO, storyTag)) continue;

                    let status = this.getExplorerDialogueStatusForEntry(explorerVO, entry);

                    if (status < highestStatus) continue;

                    if (status > highestStatus) {
                        highestStatus = status;
                        result = [];
                    }

                    result.push(entry);
                }

                return result;
            },

            // refugee dialogue

            getRandomRefugeeDialogueSource: function () {
                let validSources = [];

                validSources.push("refugees_default");

                let randomIndex = Math.floor(Math.random() * validSources.length);
                return validSources[randomIndex];
            },
            
            // general

            getCharacterDialogueKey: function (dialogueSourceID, setting) {
                let validDialogues = this.getCharacterValidDialogues(dialogueSourceID, setting);

                if (validDialogues.length == 0) {
                    log.w("no valid dialogues found for character with " + dialogueSourceID + "." + setting);
                    return null;
                }
                
                let randomIndex = Math.floor(Math.random() * validDialogues.length);
                return validDialogues[randomIndex].dialogueID;
            },

            getCharacterValidDialogues: function (dialogueSourceID, setting) {
                let entries = DialogueConstants.getDialogueEntries(dialogueSourceID, setting);

                let result = [];

                for (let i = 0; i < entries.length; i++) {
                    let dialogueID = entries[i];
                    let entry = DialogueConstants.getDialogue(dialogueID);

                    if (!entry) continue;

                    if (!this.isDialogueValid(entry)) continue;

                    result.push(entry);
                }

                return result;
            },

            
        });
    
        return DialogueHelper;
    });
    