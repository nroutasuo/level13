define(['ash', 'game/GameGlobals', 'game/constants/DialogueConstants', 'game/constants/ExplorerConstants', 'game/nodes/player/DialogueNode' ],
    function (Ash, GameGlobals, DialogueConstants, ExplorerConstants, DialogueNode) {
        
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

            getExplorerDialogueStatus: function (explorerVO, setting) {
                let result = 0;

                if (!explorerVO) return result;

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
                if (explorerVO.seenDialogues && explorerVO.seenDialogues.indexOf(entry.dialogueID) < 0) {
                    if (entry.isUrgent) {
                        return DialogueConstants.STATUS_URGENT;
                    }
                    return DialogueConstants.STATUS_NEW;
                }

                return 0;
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

            getExplorerValidDialogues: function (explorerVO, setting) {
                if (!explorerVO) return [];
                
                let entries = DialogueConstants.getDialogueEntries(explorerVO.dialogueSource, setting);

                let result = [];
                let highestStatus = 0;

                for (let i = 0; i < entries.length; i++) {
                    let dialogueID = entries[i];
                    let entry = DialogueConstants.getDialogue(dialogueID);
                    let conditions = entry.conditions;

                    if (!entry.isRepeatable && explorerVO.seenDialogues && explorerVO.seenDialogues.indexOf(entry.dialogueID) >= 0) {
                        continue;
                    }

                    if (conditions) {
                        let reqsCheck = GameGlobals.playerActionsHelper.checkGeneralRequirementaInternal(conditions);
                        if (reqsCheck.value < 1) continue;

                        if (conditions.explorer && conditions.explorer.trust && conditions.explorer.trust > explorerVO.trust) continue;
                    }

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
                    let conditions = entry.conditions;

                    if (conditions) {
                        let reqsCheck = GameGlobals.playerActionsHelper.checkGeneralRequirementaInternal(conditions);
                        if (reqsCheck.value < 1) continue;
                    }

                    result.push(entry);
                }

                return result;
            },

            
        });
    
        return DialogueHelper;
    });
    