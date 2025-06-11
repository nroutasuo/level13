define([
	'ash', 
	'json!game/data/DialogueData.json', 
	'game/vos/DialogueVO', 
	'game/vos/DialoguePageVO', 
	'game/vos/DialogueOptionVO', 
	'game/vos/ResultVO'
], function (Ash, DialogueData, DialogueVO, DialoguePageVO, DialogueOptionVO, ResultVO) {
	
	let DialogueConstants = {

		dialogueSettings: {
			meet: "meet", // when meeting outside
			event: "event", // when event relevant to the NPC is active (recruit, visit)
			interact: "interact", // when player chooses to interact with this NPC
		},

		STATUS_DEFAULT: 0,
		STATUS_NEW: 1,
		STATUS_PRIORITY: 2, // used to override default dialouge pool given a condition (like being injured)
		STATUS_PRIORITY_NEW: 3, // same as new but for priority dialogue
		STATUS_URGENT: 4, // highlighted in UI, can block explorer dismiss
		STATUS_FORCED: 5, // highlighted in UI, can block various actions

		dialogueSources: {},

		dialogues: {},

		init: function () {
		},

		loadData: function (data) {
			let sourcesRaw = data.sources;
			this.dialogueSources = {};

			for (let dialogueSourceID in sourcesRaw) {
				let source = sourcesRaw[dialogueSourceID];
				source.id = dialogueSourceID;
				this.dialogueSources[dialogueSourceID] = source;
			}

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

			vo.titleTextKey = this.parseTextKey(d.titleKey);
			vo.conditions = d.conditions || {};
			vo.storyTag = d.storyTag || null;
			vo.isRepeatable = d.repeatable === false ? false : true;
			vo.isUnique = d.isUnique;
			vo.isPriority = d.isPriority;
			vo.isUrgent = d.isUrgent;
			vo.isForced = d.isForced;

			if (!d.pages) {
				log.w("no pages defined for dialogue: " + dialogueID);
				return vo;
			}

			for (let i = 0; i < d.pages.length; i++) {
				let pageData = d.pages[i];
				let pageVO = this.parsePage(i, d.pages.length, pageData);

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

		parsePage: function (i, num, pageData) {
			let pageID = pageData.id || i;
			let pageVO = new DialoguePageVO(pageID);
			
			let pageKey = typeof pageData === "string" ? pageData : pageData.key;
			pageVO.textKey = this.parseTextKey(pageKey);

			if (pageData.titleKey) {
				pageVO.titleTextKey = this.parseTextKey(pageData.titleKey);
			}
			
			if (pageData.metaKey) {
				pageVO.metaTextKey = this.parseTextKey(pageData.metaKey);
			}

			let optionsData = pageData.options;

			if (!optionsData) {
				optionsData = i < num - 1 ? "NEXT" : "END";
			}

			if (optionsData === "NEXT") {
				let buttonKey = pageData.buttonKey;
				optionsData = [ { buttonKey: buttonKey, response: "NEXT" } ];
			}

			if (optionsData === "END") {
				let buttonKey = pageData.buttonKey;
				optionsData = [ { buttonKey: buttonKey, response: "END" } ];
			}

			pageVO.options = [];

			for (let j in optionsData) {
				let optionData = optionsData[j];

				let optionVO = this.parseDialogueOption(j, optionData);

				pageVO.options.push(optionVO);
				pageVO.optionsByID[optionVO.optionID] = optionVO;
			}

			pageVO.resultTemplate = this.parsePageResult(pageData.result);
			pageVO.action = pageData.action || null;

			return pageVO;
		},

		parseTextKey: function (key) {
			if (!key) return null;

			let result = key;

			if (result.indexOf(".") < 0) result = "story.dialogue." + result;

			return result;
		},

		parsePageResult: function (data) {
			if (!data) return null;

			let resultVO = new ResultVO("start_dialogue_page");

			if (data.action) {
				resultVO.templateAction = data.action;
				return resultVO;
			}

			if (data.gainedEvidence) resultVO.gainedEvidence = parseInt(data.gainedEvidence);
			if (data.gainedRumours) resultVO.gainedRumours = parseInt(data.gainedRumours);
			if (data.gainedHope) resultVO.gainedHope = parseInt(data.gainedHope);
			if (data.removeCharacter) resultVO.removeCharacter = true;
			if (data.replaceDialogue) resultVO.replaceDialogue = true;

			if (data.gainedPopulation) resultVO.gainedPopulation = parseInt(data.gainedPopulation);

			if (data.gainedItems) {
				resultVO.gainedItems = [];
				for (let i in data.gainedItems) {
					// TODO check item exists
					let itemID = data.gainedItems[i];
					resultVO.gainedItems.push(itemID);
				}
			}

			if (data.gainedResources) {
				for (let key in data.gainedResources) {
					resultVO.gainedResources.addResource(key, data.gainedResources[key]);
				}
			}

			if (data.gainedPerks) {
				resultVO.gainedPerks = [];
				for (let i in data.gainedPerks) {
					// TODO check perk exists (or is general injury)
					let perkID = data.gainedPerks[i];
					resultVO.gainedPerks.push(perkID);
				}
			}

			if (data.lostPerks) {
				resultVO.lostPerks = [];
				for (let i in data.lostPerks) {
					// TODO check perk exists (or is general injury)
					let perkID = data.lostPerks[i];
					resultVO.lostPerks.push(perkID);
				}
			}

			if (data.gainedItemUpgrades) {
				resultVO.gainedItemUpgrades = data.gainedItemUpgrades;
			}

			if (data.gainedExplorers) {
				resultVO.gainedExplorers = data.gainedExplorers;
			}

			if (data.lostExplorers) {
				resultVO.lostExplorers = data.lostExplorers;
			}

			if (data.lostExplorerInjuries) {
				resultVO.lostExplorerInjuries = data.lostExplorerInjuries;
			}

			if (data.storyFlags) {
				for (let flagID in data.storyFlags) {
					resultVO.storyFlags[flagID] = data.storyFlags[flagID];
				}
			}

			if (data.startQuest) {
				resultVO.startQuest = data.startQuest;
			}

			if (data.endQuest) {
				resultVO.endQuest = data.endQuest;
			}

			return resultVO;
		},

		parseDialogueOption: function (i, optionData) {
			let optionID = i;
			let optionVO = new DialogueOptionVO(optionID);

			if (typeof optionData === "string") {
				optionVO.responsePageID = optionData;
			} else {
				optionVO.buttonTextKey = this.parseTextKey(optionData.buttonKey);
				optionVO.costs = optionData.costs || {};
				optionVO.conditions = optionData.conditions || {};
				optionVO.responsePageID = optionData.response || null;
			}

			return optionVO;
		},

		getDialogueEntries: function (sourceID, setting) {
			let source = this.getDialogueSource(sourceID);
			if (!source || !source.dialogues) {
				log.w("no valid dialogue entries found: " + sourceID);
				return [];
			}
			return source.dialogues[setting] || [];
		},

		getDialogue: function (dialogueID) {
			let result = this.dialogues[dialogueID];
			if (!result) {
				log.w("no such dialogue found: " + dialogueID);
				return {};
			}
			return result;
		},

		getDialogueSource: function (sourceID) {
			let result = this.dialogueSources[sourceID]
			if (!result) {
				log.w("no such dialogue source found: " + sourceID);
				return {};
			}
			return result;
		},
		
	};

	DialogueConstants.init();
	DialogueConstants.loadData(DialogueData);
	
	return DialogueConstants;
	
});
