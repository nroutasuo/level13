define(['ash'], function (Ash) {
	
	let DialogueConstants = {

        dialogueSettings: {
            meet: "meet", // when meeting outside
            event: "event", // when event relevant to the NPC is active (recruit, visit)
            interact: "interact", // when player chooses to interact with this NPC
            dismiss: "dismiss", // when dismissing a follower
        },

		dialogueSources: {},

        init: function () {
            this.addSource("explorer_generic", {
                "meet": [ this.makeDialogueEntry("explorer_generic_meet_01") ],
                "event": [ this.makeDialogueEntry("explorer_generic_event_01") ],
                "interact": [ this.makeDialogueEntry("explorer_generic_interact_01"), this.makeDialogueEntry("explorer_generic_interact_02") ],
                "dismiss": [ this.makeDialogueEntry("explorer_generic_dismiss_01") ],
            });
            this.addSource("explorer_fighter", {
                "meet": [ this.makeDialogueEntry("explorer_fighter_meet_01") ],
                "event": [ this.makeDialogueEntry("explorer_fighter_event_01") ],
                "interact": [ this.makeDialogueEntry("explorer_fighter_interact_01"), this.makeDialogueEntry("explorer_fighter_interact_02") ],
                "dismiss": [ this.makeDialogueEntry("explorer_fighter_dismiss_01") ],
            });
            this.addSource("explorer_animal", {
                "meet": [ this.makeDialogueEntry("explorer_animal_meet_01") ],
                "event": [ this.makeDialogueEntry("explorer_animal_event_01") ],
                "interact": [ this.makeDialogueEntry("explorer_animal_interact_01"), this.makeDialogueEntry("explorer_animal_interact_02") ],
                "dismiss": [ this.makeDialogueEntry("explorer_animal_dismiss_01") ],
            });
        },

        makeDialogueEntry: function (key, conditions, repeatable) {
            let repeats = repeatable === false ? false : true;
            return { key: key, conditions: conditions || {}, repeatable: repeats };
        },

        addSource: function (id, entries) {
            this.dialogueSources[id] = { id: id, entries: entries };
        },

        getDialogueEntries: function (sourceID, setting) {
            let source = this.getDialogueSource(sourceID);
            return source.entries[setting] || [];
        },

        getDialogueSource: function (sourceID) {
            return this.dialogueSources[sourceID] || {};
        },
		
	};

    DialogueConstants.init();
	
	return DialogueConstants;
	
});
