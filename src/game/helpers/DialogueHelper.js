define(['ash', 'game/GameGlobals', 'game/constants/DialogueConstants', 'game/constants/ExplorerConstants' ],
    function (Ash, GameGlobals, DialogueConstants, ExplorerConstants) {
        
        let DialogueHelper = Ash.Class.extend({
            
            getExplorerDialogueKey: function (explorerVO, setting) {
                let entries = DialogueConstants.getDialogueKeys(explorerVO.dialogueSource, setting);

                let validKeys = [];

                for (let i = 0; i < entries.length; i++) {
                    let entry = entries[i];
                    let conditions = entry.conditions;

                    if (!entry.repeatable && explorerVO.seenDialogues.indexOf(entry.key) >= 0) {
                        continue;
                    }

                    if (conditions) {
                        let reqsCheck = GameGlobals.playerActionsHelper.checkGeneralRequirementaInternal(conditions);
                        if (reqsCheck.value < 1) continue;

                        if (conditions.explorer.trust && conditions.explorer.trust > explorerVO.trust) continue;
                    }

                    validKeys.push(entry.key);
                }
                
                let randomIndex = Math.floor(Math.random() * validKeys.length);
                return validKeys[randomIndex];
            },
            
        });
    
        return DialogueHelper;
    });
    