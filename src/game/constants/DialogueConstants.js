define([
	'ash', 
	'json!game/data/DialogueData.json', 
	'game/constants/PlayerActionConstants',
	'game/constants/EnemyConstants',
	'game/vos/DialogueVO', 
	'game/vos/DialoguePageVO', 
	'game/vos/DialogueOptionVO', 
	'game/vos/ResultVO'
], function (Ash, DialogueData, PlayerActionConstants, EnemyConstants, DialogueVO, DialoguePageVO, DialogueOptionVO, ResultVO) {
	
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

		context: "dialogue",

		init: function () {
		},

		loadData: function (data) {
			let sourcesRaw = data.sources || {};
			let bundlesRaw = data.bundles || {};
			this.dialogueSources = {};

			for (let dialogueSourceID in sourcesRaw) {
				let sourceRaw = sourcesRaw[dialogueSourceID];
				let source = Object.assign({}, sourceRaw);
				source.id = dialogueSourceID;
				source.dialogues = {};
				for (let context in (sourceRaw.dialogues || {})) {
					source.dialogues[context] = (sourceRaw.dialogues[context] || []).slice();
				}
				this.dialogueSources[dialogueSourceID] = source;
			}

			for (let dialogueSourceID in this.dialogueSources) {
				let source = this.dialogueSources[dialogueSourceID];
				let includes = source.includes || [];
				for (let i = 0; i < includes.length; i++) {
					let bundleID = includes[i];
					this.mergeBundleIntoSource(source, bundleID, bundlesRaw, []);
				}
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

		mergeBundleIntoSource: function (source, bundleID, bundlesRaw, seenBundles) {
			let bundle = bundlesRaw[bundleID];

			if (!bundle) {
				log.w("no such dialogue bundle found: " + bundleID + " included by source " + source.id, this);
				return;
			}

			if (seenBundles.indexOf(bundleID) >= 0) {
				log.w("dialogue bundle recursion detected: " + bundleID, this);
				return;
			}

			seenBundles.push(bundleID);

			let bundleDialogues = bundle.dialogues || {};
			for (let context in bundleDialogues) {
				let target = source.dialogues[context] || [];
				let bundleContextIDs = bundleDialogues[context] || [];
				for (let j = 0; j < bundleContextIDs.length; j++) {
					let dialogueID = bundleContextIDs[j];
					if (target.indexOf(dialogueID) < 0) {
						target.push(dialogueID);
					}
				}
				source.dialogues[context] = target;
			}

			let nestedBundles = bundle.includes || [];
			for (let i = 0; i < nestedBundles.length; i++) {
				this.mergeBundleIntoSource(source, nestedBundles[i], bundlesRaw, seenBundles.slice());
			}
		},

		parseDialogue: function (dialogueID, d) {
			let vo = new DialogueVO(dialogueID);

			vo.titleTextKey = this.parseTextKey(d.titleKey);
			vo.conditions = PlayerActionConstants.getRequirementsFromRaw(d.conditions);
			vo.conditions.enemy = this.parseEnemyRequirements(dialogueID, vo.conditions.enemy);
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

			if (pageVO.textKey == "random") {
				pageVO.randomTextKeys = [];
				for (let j = 0; j < pageData.randomKeys.length; j++) {
					let randomKeyData = pageData.randomKeys[j];
					let randomKeyVO = {};
					randomKeyVO.textKey = this.parseTextKey(randomKeyData.key);
					randomKeyVO.conditions = PlayerActionConstants.getRequirementsFromRaw(randomKeyData.conditions);
					pageVO.randomTextKeys.push(randomKeyVO);
				}
			}

			if (pageData.titleKey) {
				pageVO.titleTextKey = this.parseTextKey(pageData.titleKey);
			}
			
			if (pageData.metaKey) {
				pageVO.metaTextKey = this.parseTextKey(pageData.metaKey);
			}

			if (pageData.logMessageKey) {
				pageVO.logMessageKey = this.parseTextKey(pageData.logMessageKey);
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
			pageVO.selection = pageData.selection;
			pageVO.action = pageData.action || null;

			return pageVO;
		},

		parseTextKey: function (key) {
			if (!key) return null;
			if (key === "random") return "random";

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
				optionVO.isPreviewCosts = optionData.isPreviewCosts || false;
				optionVO.conditions = PlayerActionConstants.getRequirementsFromRaw(optionData.conditions);
				optionVO.responsePageID = optionData.response || null;
			}

			return optionVO;
		},

		parseEnemyRequirements: function (dialogueID, data) {
			if (!data) return null;

			let validSources = [ "current_district", "current_level", "other_district", "encountered" ];
			let validPreferences = [ "dangerous", "rare", "common" ];
			let source = data.source || "current_level";
			let preference = data.preference || "common";
			let type = data.type || null;

			if (validSources.indexOf(source) < 0) {
				log.w("invalid enemy source for dialogue " + dialogueID + ": " + source, this);
				source = "current_level";
			}

			if (validPreferences.indexOf(preference) < 0) {
				log.w("invalid enemy preference for dialogue " + dialogueID + ": " + preference, this);
				preference = "common";
			}
			
			if (type && !EnemyConstants.enemyTexts[type]) {
				log.w("invalid enemy type for dialogue " + dialogueID + ": " + type, this);
				type = null;
			}

			return { source: source, preference: preference, type: type };
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

		hasDialogue: function (dialogueID) {
			let dialogueVO = this.getDialogue(dialogueID);
			return dialogueVO && dialogueVO.dialogueID;	
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
