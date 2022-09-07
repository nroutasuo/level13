define(['ash', 'text/Text', 'game/constants/TextConstants', 'game/constants/ItemConstants'], function (Ash, Text, TextConstants, ItemConstants) {

	var LogConstants = {

		// story
		MSG_ID_START: "START",

		// out actions
		MSG_ID_SCAVENGE: "SCAVENGE",
		MSG_ID_SCOUT: "SCOUT",
		MSG_ID_SCOUT_FOUND_SOMETHING: "MSG_ID_SCOUT_FOUND_SOMETHING",
		MSG_ID_INVESTIGATE: "MSG_ID_INVESTIGATE",
		MSG_ID_USE_SPRING: "MSG_ID_USE_SPRING",
		MSG_ID_CLEAR_WASTE: "MSG_ID_CLEAR_WASTE",
		MSG_ID_CLEAR_DEBRIS: "MSG_ID_CLEAR_DEBRIS",
		MSG_ID_BRIDGED_GAP: "BRIDGED_GAP",
		MSG_ID_SCOUT_LOCALE: "SCOUT_LOCALE",
		MSG_ID_WORKSHOP_CLEARED: "WORKSHOP_CLEARED",
		MSG_ID_GANG_DEFEATED: "GANG_DEFEATED",
		MSG_ID_USE_COLLECTOR_FAIL: "USE_COLLECTOR_FAIL",
		MSG_ID_NAP: "MSG_ID_NAP",
		MSG_ID_WAIT: "MAS_ID_WAIT",

		// in actions
		MSG_ID_ENTER_CAMP: "ENTER_CAMP",
		MSG_ID_LEAVE_CAMP: "LEAVE_CAMP",
		MSG_ID_USE_CAMPFIRE_SUCC: "USE_CAMPFIRE_SUCC",
		MSG_ID_USE_CAMPFIRE_FAIL: "USE_CAMPFIRE_FAIL",
		MSG_ID_USE_MARKET: "USE_MARKET",
		MSG_ID_USE_HOSPITAL: "USE_HOSPITAL",
		MSG_ID_USE_HOSPITAL2: "USE_HOSPITAL2",
		MSG_ID_USE_TEMPLE: "USE_TEMPLE",
		MSG_ID_USE_SHRINE: "USE_SHRINE",
		MSG_ID_BOUGHT_UPGRADE: "MSG_ID_BOUGHT_UPGRADE",
		MSG_ID_START_SEND_CAMP: "MSG_ID_START_SEND_CAMP",
		MSG_ID_FINISH_SEND_CAMP: "MSG_ID_FINISH_SEND_CAMP",
		MSG_ID_TRADE_WITH_CARAVAN: "MSG_ID_TRADE_WITH_CARAVAN",
		MSG_ID_RECRUIT: "MSG_ID_RECRUIT",

		// out atmospheric and results
		MSG_ID_ADD_HAZARD_PERK: "MSG_ID_ADD_HAZARD_PERK",
		MSG_ID_TIME_HAZARD_PERK: "MSG_ID_TIME_HAZARD_PERK",
		MSG_ID_REMOVE_HAZARD_PERK: "MSG_ID_REMOVE_HAZARD_PERK",
		MSG_ID_REMOVE_STAMINA_PERK: "MSG_ID_REMOVE_STAMINA_PERK",
		MSG_ID_FOUND_BLUEPRINT_FIRST: "MSG_ID_FOUND_BLUEPRINT_FIRST",
		MSG_ID_FOUND_ITEM_FIRST: "MSG_ID_FOUND_ITEM_FIRST",
		MSG_ID_LOST_ITEM: "MSG_ID_LOST_ITEM",
		MSG_ID_BROKE_ITEM: "MSG_ID_BROKE_ITEM",
		MSG_ID_LOST_FOLLOWER: "MSG_ID_LOST_FOLLOWER",
		MSG_ID_GOT_INJURED: "MSG_ID_GOT_INJURED",
		MSG_ID_FAINTED: "MSG_ID_FAINTED",
		MSG_ID_DESPAIR_AVAILABLE: "MSG_ID_DESPAIR_AVAILABLE",
		MSG_ID_STAMINA_WARNING: "MSG_ID_STAMINA_WARNING",
		MSG_ID_VISION_RESET: "MSG_ID_VISION_RESET",

		// in atmospheric and results
		MSG_ID_POPULATION_NATURAL: "POPULATION_NATURAL",
		MSG_ID_WORKER_STATUS: "WORKER_STATUS",
		MSG_ID_CAMP_EVENT: "CAMP_EVENT",
		MSG_ID_BUILT_CAMP_LEVEL_POPULATION: "MSG_ID_BUILT_CAMP_LEVEL_POPULATION",
		MSG_ID_ENTER_LEVEL: "MSG_ID_ENTER_LEVEL",
		MSG_ID_REPUTATION_PENALTY_FOOD: "MSG_ID_REPUTATION_PENALTY_FOOD",
		MSG_ID_REPUTATION_PENALTY_WATER: "MSG_ID_REPUTATION_PENALTY_WATER",
		MSG_ID_REPUTATION_PENALTY_DEFENCES: "MSG_ID_REPUTATION_PENALTY_DEFENCES",
		MSG_ID_REPUTATION_PENALTY_HOUSING: "MSG_ID_REPUTATION_PENALTY_HOUSING",

		// in buildings
		MSG_ID_BUILT_CAMP: "BUILT_CAMP",
		MSG_ID_BUILT_HOUSE: "BUILT_HOUSE",
		MSG_ID_BUILT_GENERATOR: "BUILT_GENERATOR",
		MSG_ID_BUILT_LIGHTS: "BUILT_LIGHTS",
		MSG_ID_BUILT_STORAGE: "BUILT_STORAGE",
		MSG_ID_BUILT_FORTIFICATION: "BUILT_FORTIFICATION",
		MSG_ID_BUILT_AQUEDUCT: "BUILT_AQUEDUCT",
		MSG_ID_BUILT_STABLE: "BUILT_STABLE",
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
		MSG_ID_BUILT_SQUARE: "MSG_ID_BUILT_SQUARE",
		MSG_ID_BUILT_GARDEN: "MSG_ID_BUILT_GARDEN",
		MSG_ID_BUILT_TEMPLE: "MSG_ID_BUILT_TEMPLE",
		MSG_ID_BUILT_SHRINE: "MSG_ID_BUILT_SHRINE",
		
		MSG_ID_IMPROVED_CAMPFIRE: "MSG_ID_IMPROVED_CAMPFIRE",
		MSG_ID_IMPROVED_LIBRARY: "MSG_ID_IMPROVED_LIBRARY",
		MSG_ID_IMPROVED_SQUARE: "MSG_ID_IMPROVED_SQUARE",
		MSG_ID_IMPROVED_GENERATOR: "MSG_ID_IMPROVED_GENERATOR",
		MSG_ID_IMPROVED_APOTHECARY: "MSG_ID_IMPROVED_APOTHECARY",
		MSG_ID_IMPROVED_SMITHY: "MSG_ID_IMPROVED_SMITHY",
		MSG_ID_IMPROVED_CEMENTMILL: "MSG_ID_IMPROVED_CEMENTMILL",
		MSG_ID_IMPROVED_MARKET: "MSG_ID_IMPROVED_MARKET",
		MSG_ID_IMPROVED_TEMPLE: "MSG_ID_IMPROVED_TEMPLE",

		// out buildings
		MSG_ID_BUILT_PASSAGE: "BUILT_PASSAGE",
		MSG_ID_BUILT_TRAP: "BUILT_TRAP",
		MSG_ID_BUILT_BUCKET: "BUILT_BUCKET",
		MSG_ID_BUILT_BEACON: "MSG_ID_BUILT_BEACON",
		MSG_ID_BUILT_SPACESHIP: "BUILT_SPACESHIP",

		// items
		MSG_ID_ADD_FOLLOWER: "ADD_FOLLOWER",
		MSG_ID_CRAFT_ITEM: "CRAFT_ITEM",
		MSG_ID_USE_FIRST_AID_KIT: "MSG_ID_USE_FIRST_AID_KIT",
		MSG_ID_USE_STAMINA_POTION: "MSG_ID_USE_STAMINA",
		MSG_ID_USE_METAL_CACHE: "MSG_ID_USE_METAL_CACHE",
		MSG_ID_USE_BOOK: "MSG_ID_USE_BOOK",
		MSG_ID_USE_MAP_PIECE: "MSG_ID_USE_MAP_PIECE",

		mergedMessages: [
			["SCAVENGE", "SCOUT", "SCOUT"],
		],
		
		getUniqueID: function () {
			return "unique-" + Math.floor(Math.random() * 100000);
		},

		getMergedMsgID: function (messages) {
			var messageIDsToMatch = [];
			for (var m = 0; m < messages.length; m++) {
				if (messages[m].logsgID) {
					messageIDsToMatch = messageIDsToMatch.concat(messages[m].logMsgID.split("-"));
				}
			}

			var mergeIDs;
			var allMatch;
			var messageID;
			for (let i = 0; i < this.mergedMessages.length; i++) {
				mergeIDs = this.mergedMessages[i];
				if (mergeIDs.length > messageIDsToMatch.length) continue;
				allMatch = true;
				for (let j = 0; j < messageIDsToMatch.length; j++) {
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
					return "Continued exploring.";

				default:
					log.w("text not defined for merged log message: " + mergedId);
					return String(mergedId);
			}
		},

		getLostItemMessage: function (resultVO) {
			var template = TextConstants.getLogItemsText(resultVO.lostItems);
			template.msg = "Lost " + template.msg + ". ";

			var intros = [];
			switch (resultVO.action) {
				default:
					intros.push("Almost fell into a crack in the street");
					intros.push("Fell through a rotten floor");
					intros.push("Dropped an item while climbing a fence");
					intros.push("Stumbled on some wrecked pipes");
					intros.push("Left a bag pocket open and some items fell out");
					intros.push("Got spooked of the shadows and ran, leaving some items behind");
					break;
			}
			var intro = intros[Math.floor(Math.random() * intros.length)];
			intro = intro + ". ";
			template.msg = intro + template.msg;

			return { msg: template.msg, replacements: template.replacements, values: template.values };
		},

		getBrokeItemMessage: function (resultVO) {
			var template = TextConstants.getLogItemsText(resultVO.brokenItems);
			template.msg = "Broke " + template.msg + ". ";

			var intros = [];
			switch (resultVO.action) {
				default:
					intros.push("Almost fell into a crack in the street");
					intros.push("Fell through a rotten floor");
					intros.push("Dropped an item while climbing a fence");
					intros.push("Stumbled on some wrecked pipes");
					intros.push("Fell while climbings");
					break;
			}
			var intro = intros[Math.floor(Math.random() * intros.length)];
			intro = intro + ". ";
			template.msg = intro + template.msg;

			return { msg: template.msg, replacements: template.replacements, values: template.values };
		},

		getInjuredMessage: function (resultVO) {
			return "Got injured.";
		},

		getLostPerksMessage: function (resultVO) {
			return "Lost an augmentation.";
		},

		getDespairMessage: function (isValidDespairHunger, isValidDespairThirst, isValidDespairStamina, isValidDespairMove) {
			if (isValidDespairThirst) {
				return "Too thirsty to go on.";
			}
			if (isValidDespairHunger) {
				return "Too hungry to go on.";
			}
			if (isValidDespairMove) {
				return "There is nowhere to go.";
			}
			return "Too tired to go on.";
		},

		getCraftItemMessage: function (itemVO) {
			var itemDetails = "";
			switch (itemVO.id) {
				case ItemConstants.itemDefinitions.light[0].id:
					itemDetails = " Light will make scavenging safer.";
					break;
			}
			return "Made " + Text.addArticle(itemVO.name).toLowerCase() + "." + itemDetails;
		},

	}

	return LogConstants;

});
