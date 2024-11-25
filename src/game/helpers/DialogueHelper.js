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
            
            getExplorerDialogueKey: function (explorerVO, setting) {
                let entries = DialogueConstants.getDialogueEntries(explorerVO.dialogueSource, setting);

                let validKeys = [];

                for (let i = 0; i < entries.length; i++) {
                    let dialogueID = entries[i];
                    let entry = DialogueConstants.getDialogue(dialogueID);
                    let conditions = entry.conditions;

                    if (!entry.repeatable && explorerVO.seenDialogues && explorerVO.seenDialogues.indexOf(entry.key) >= 0) {
                        continue;
                    }

                    if (conditions) {
                        let reqsCheck = GameGlobals.playerActionsHelper.checkGeneralRequirementaInternal(conditions);
                        if (reqsCheck.value < 1) continue;

                        if (conditions.explorer && conditions.explorer.trust && conditions.explorer.trust > explorerVO.trust) continue;
                    }

                    validKeys.push(entry.dialogueID);
                }
                
                let randomIndex = Math.floor(Math.random() * validKeys.length);
                return validKeys[randomIndex];
            },
            
        });
    
        return DialogueHelper;
    });
    