define(['ash', 'json!game/data/DialogueData.json', 'game/vos/DialogueVO', 'game/vos/DialoguePageVO', 'game/vos/DialogueOptionVO'], 
    function (Ash, DialogueData, DialogueVO, DialoguePageVO, DialogueOptionVO) {
	
	let DialogueConstants = {

        dialogueSettings: {
            meet: "meet", // when meeting outside
            event: "event", // when event relevant to the NPC is active (recruit, visit)
            interact: "interact", // when player chooses to interact with this NPC
            dismiss: "dismiss", // when dismissing a follower
        },

		dialogueSources: {},

        dialogues: {},

        init: function () {
        },

        loadData: function (data) {
            let sources = data.sources;
            this.dialogueSources = sources;

            let dialoguesRaw = data.dialogues;
            let dialogues = {};

            let getPageID = (i, data) => data.id || i;

            for (let dialogueID in dialoguesRaw) {
                let d = dialoguesRaw[dialogueID];
                let vo = new DialogueVO(dialogueID);

                for (let i = 0; i < d.pages.length; i++) {
                    let pageData = d.pages[i];
                    let pageID = getPageID(i, pageData);
                    let pageVO = new DialoguePageVO(pageID);
                    pageVO.textKey = pageData.key || null;
                    
                    pageVO.options = [];

                    if (pageData.options === "NEXT") {
                        pageData.options = [ "NEXT" ];
                    }

                    for (let j in pageData.options) {
                        let optionData = pageData.options[j];

                        let optionID = j;
                        let optionVO = new DialogueOptionVO(optionID);

                        if (typeof optionData === "string") {
                            if (optionData === "NEXT") {
                                optionVO.responsePageID = getPageID(i + 1, d.pages[i + 1]);
                            } else {
                                optionVO.responsePageID = optionData;
                            }
                        } else {
                            optionVO.buttonTextKey = optionData.buttonKey || null;
                            optionVO.costs = optionData.costs || {};
                            optionVO.responsePageID = optionData.response || null;
                        }

                        pageVO.options.push(optionVO);
                        pageVO.optionsByID[optionID] = optionVO;
                    }

                    vo.pages.push(pageVO);
                    vo.pagesByID[pageID] = pageVO;
                }

                dialogues[dialogueID] = vo;
            }

            this.dialogues = dialogues;
        },

        addSource: function (id, entries) {
            this.dialogueSources[id] = { id: id, entries: entries };
        },

        getDialogueEntries: function (sourceID, setting) {
            let source = this.getDialogueSource(sourceID);
            return source.entries[setting] || [];
        },

        getDialogue: function (dialogueID) {
            return this.dialogues[dialogueID] || null;
        },

        getDialogueSource: function (sourceID) {
            return this.dialogueSources[sourceID] || {};
        },
		
	};

    DialogueConstants.init();
    DialogueConstants.loadData(DialogueData);
	
	return DialogueConstants;
	
});
