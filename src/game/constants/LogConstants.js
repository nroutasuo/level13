define(['ash'], function (Ash) {

    var LogConstants = {
        
        MSG_ID_START: "START",
        MSG_ID_FAINTED: "FAINTED",
        MSG_ID_POPULATION_NATURAL: "POPULATION_NATURAL",
        MSG_ID_WORKER_STATUS: "WORKER_STATUS",
        MSG_ID_CAMP_EVENT: "CAMP_EVENT",
        MSG_ID_ENTER_CAMP: "ENTER_CAMP",
        MSG_ID_LEAVE_CAMP: "LEAVE_CAMP",
        
        MSG_ID_SCAVENGE: "SCAVENGE",
        MSG_ID_SCOUT: "SCOUT",
        MSG_ID_SCOUT_LOCALE: "SCOUT_LOCALE",
        MSG_ID_WORKSHOP_CLEARED: "WORKSHOP_CLEARED",
        MSG_ID_GANG_DEFEATED: "GANG_DEFEATED",
        
        MSG_ID_BUILT_CAMP: "BUILT_CAMP",
        MSG_ID_BUILT_HOUSE: "BUILT_HOUSE",
        MSG_ID_BUILT_LIGHTS: "BUILT_LIGHTS",
        MSG_ID_BUILT_CEILING: "BUILT_CEILING",
        MSG_ID_BUILT_STORAGE: "BUILT_STORAGE",
        MSG_ID_BUILT_FORTIFICATION: "BUILT_FORTIFICATION",
        MSG_ID_BUILT_AQUEDUCT: "BUILT_AQUEDUCT",
        MSG_ID_BUILT_BARRACKS: "BUILT_BARRACKS",
        MSG_ID_BUILT_SMITHY: "BUILT_SMITHY",
        MSG_ID_BUILT_APOTHECARY: "BUILT_APOTHECARY",
        MSG_ID_BUILT_CEMENT_MILL: "BUILT_CEMENT_MILL",
        MSG_ID_BUILT_RADIO: "BUILT_RADIO",
        MSG_ID_BUILT_CAMPFIRE: "BUILT_CAMPFIRE",
        MSG_ID_BUILT_DARKFARM: "BUILT_DARKFARM",
        MSG_ID_BUILT_HOSPITAL: "BUILT_HOSPITAL",
        MSG_ID_BUILT_LIBRARY: "BUILT_LIBRARY",
        MSG_ID_BUILT_MARKET: "BUILT_MARKET",
        MSG_ID_BUILT_TRADING_POST: "BUILT_TRADING_POST",
        MSG_ID_BUILT_INN: "BUILT_INN",
        
        MSG_ID_BUILT_PASSAGE: "BUILT_PASSAGE",
        MSG_ID_BUILT_TRAP: "BUILT_TRAP",
        MSG_ID_BUILT_BUCKET: "BUILT_BUCKET",
        
        MSG_ID_USE_CAMPFIRE_SUCC: "USE_CAMPFIRE_SUCC",
        MSG_ID_USE_CAMPFIRE_FAIL: "USE_CAMPFIRE_FAIL",
        MSG_ID_USE_HOSPITAL: "USE_HOSPITAL",
        MSG_ID_USE_HOSPITAL2: "USE_HOSPITAL2",
        MSG_ID_USE_COLLECTOR_FAIL: "USE_COLLECTOR_FAIL",
        
        MSG_ID_FOUND_BLUEPRINT_FIRST: "MSG_ID_FOUND_BLUEPRINT_FIRST",
        MSG_ID_FOUND_ITEM_FIRST: "MSG_ID_FOUND_ITEM_FIRST",
        
        MSG_ID_ADD_FOLLOWER: "ADD_FOLLOWER",
        MSG_ID_CRAFT_ITEM: "CRAFT_ITEM",
	
		mergedMessages: [
            ["SCAVENGE", "SCOUT", "SCOUT"],
        ],
        
        getMergedMsgID: function (messages) {
            var messageIDsToMatch = [];
            for (var m = 0; m < messages.length; m++) {
                messageIDsToMatch = messageIDsToMatch.concat(messages[m].logMsgID.split("-"));
            }
            
            var mergeIDs;
            var allMatch;
            var messageID;
            for (var i = 0; i < this.mergedMessages.length; i++) {
                mergeIDs = this.mergedMessages[i];
                if (mergeIDs.length > messageIDsToMatch.length) continue;
                allMatch = true;
                for (var j = 0; j < messageIDsToMatch.length; j++) {
                    messageID = messageIDsToMatch[j];
                    if (mergeIDs.indexOf(messageID) < 0) allMatch = false;
                }
                if (allMatch) {
                    return mergeIDs.join("-");
                }
            }
            return null;
        },
        
        getMergedMsgText: function (mergedId) {
            switch (mergedId) {
                case "SCAVENGE-SCOUT-SCOUT":
                    return "Continued exporing.";
                
                default:
                    console.log("WARN: text not defined for merged log message: " + mergedId);
                    return String(mergedId);
            }
        },
		
    }
    
    return LogConstants;
    
});
