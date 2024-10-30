define([
    'ash', 
    'json!game/data/DialogueData.json', 
    'game/constants/PerkConstants', 
    'game/vos/DialogueVO', 
    'game/vos/DialoguePageVO', 
    'game/vos/DialogueOptionVO', 
    'game/vos/ResultVO'
], function (Ash, DialogueData, PerkConstants, DialogueVO, DialoguePageVO, DialogueOptionVO, ResultVO) {
	
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

            for (let dialogueID in dialoguesRaw) {
                let d = dialoguesRaw[dialogueID];
                let vo = this.parseDialogue(dialogueID, d);

                dialogues[dialogueID] = vo;
            }

            this.dialogues = dialogues;
        },

        parseDialogue: function (dialogueID, d) {
            let vo = new DialogueVO(dialogueID);

            for (let i = 0; i < d.pages.length; i++) {
                let pageData = d.pages[i];
                let pageVO = this.parsePage(i, pageData);

                vo.pages.push(pageVO);
                vo.pagesByID[pageVO.pageID] = pageVO;
            }

            for (let i = 0; i < vo.pages.length; i++) {
                for (let j = 0; j < vo.pages[i].options.length; j++) {
                    let optionVO = vo.pages[i].options[j];
                    if (optionVO.responsePageID === "NEXT") {
                        optionVO.responsePageID = vo.pages[i+1].pageID;
                    } 
                }
            }

            return vo;
        },

        parsePage: function (i, pageData) {
            let pageID = pageData.id || i;
            let pageVO = new DialoguePageVO(pageID);
            pageVO.textKey = pageData.key || null;
            
            pageVO.options = [];

            if (pageData.options === "NEXT") {
                pageData.options = [ "NEXT" ];
            }

            for (let j in pageData.options) {
                let optionData = pageData.options[j];

                let optionVO = this.parseDialogueOption(j, optionData);

                pageVO.options.push(optionVO);
                pageVO.optionsByID[optionVO.optionID] = optionVO;
            }

            pageVO.resultTemplate = this.parsePageResult(pageData.result);

            return pageVO;
        },

        parsePageResult: function (data) {

            if (!data) return null;

            let resultVO = new ResultVO("start_dialogue_page");

            if (data.gainedRumours) resultVO.gainedRumours = parseInt(data.gainedRumours);

            if (data.gainedItems) {
                resultVO.gainedItems = [];
                for (let i in data.gainedItems) {
                    // TODO check item exists
                    let itemID = data.gainedItems[i];
                    resultVO.gainedItems.push(itemID);
                }
            }

            if (data.gainedPerks) {
                resultVO.gainedPerks = [];
                for (let i in data.gainedPerks) {
                    // TODO check item exists (or is general injury)
                    let perkID = data.gainedPerks[i];
                    resultVO.gainedPerks.push(perkID);
                }
            }

            return resultVO;
        },

        parseDialogueOption: function (i, optionData) {
            let optionID = i;
            let optionVO = new DialogueOptionVO(optionID);

            if (typeof optionData === "string") {
                optionVO.responsePageID = optionData;
            } else {
                optionVO.buttonTextKey = optionData.buttonKey || null;
                optionVO.costs = optionData.costs || {};
                optionVO.responsePageID = optionData.response || null;
            }

            return optionVO;
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
