define([
	'json!strings/strings.json',
	'text/Text',
	'game/constants/DialogueConstants',
], function (DefaultTextsJSON, Text, DialogueConstants) {

	let defaultTexts = Text.getTextsFromJSON(DefaultTextsJSON);

	let getDialogueTextKeys = function (dialogueID, dialogueVO) {
		let result = [];
		let addKey = function (key, description) {
			if (key) result.push({ key: key, description: description });
		};

		addKey(dialogueVO.titleTextKey, "dialogue " + dialogueID + " title");

		for (let i = 0; i < dialogueVO.pages.length; i++) {
			let page = dialogueVO.pages[i];
			let pageDescription = "dialogue " + dialogueID + " page " + page.pageID;

			if (page.textKey !== "random") addKey(page.textKey, pageDescription + " text");
			addKey(page.titleTextKey, pageDescription + " title");
			addKey(page.metaTextKey, pageDescription + " meta text");
			addKey(page.logMessageKey, pageDescription + " log message");

			for (let j = 0; j < page.randomTextKeys.length; j++) {
				addKey(page.randomTextKeys[j].textKey, pageDescription + " random text " + j);
			}

			for (let j = 0; j < page.options.length; j++) {
				addKey(page.options[j].buttonTextKey, pageDescription + " option " + j + " button");
			}
		}

		return result;
	};

	QUnit.module("data/dialogues", function () {

		QUnit.test("every dialogue source has at least one dialogue", function (assert) {
			for (let sourceID in DialogueConstants.dialogueSources) {
				let source = DialogueConstants.dialogueSources[sourceID];
				let dialogueCount = 0;

				for (let context in source.dialogues) {
					dialogueCount += source.dialogues[context].length;
				}

				assert.ok(dialogueCount > 0, "source " + sourceID + " has at least one dialogue");
			}
		});

		QUnit.test("every dialogue referenced by a source exists", function (assert) {
			for (let sourceID in DialogueConstants.dialogueSources) {
				let source = DialogueConstants.dialogueSources[sourceID];

				for (let context in source.dialogues) {
					for (let i = 0; i < source.dialogues[context].length; i++) {
						let dialogueID = source.dialogues[context][i];
						assert.ok(
							Object.prototype.hasOwnProperty.call(DialogueConstants.dialogues, dialogueID),
							"source " + sourceID + " context " + context + " references existing dialogue " + dialogueID
						);
					}
				}
			}
		});

		QUnit.test("every dialogue is referenced by a source", function (assert) {
			let referencedDialogueIDs = {};
			let codeReferencedDialoguePrefixes = [ "locale_", "item_", "investigate_locale_intro_" ];

			for (let sourceID in DialogueConstants.dialogueSources) {
				let source = DialogueConstants.dialogueSources[sourceID];

				for (let context in source.dialogues) {
					for (let i = 0; i < source.dialogues[context].length; i++) {
						referencedDialogueIDs[source.dialogues[context][i]] = true;
					}
				}
			}

			for (let dialogueID in DialogueConstants.dialogues) {
				let isCodeReferenced = codeReferencedDialoguePrefixes.some(prefix => dialogueID.indexOf(prefix) === 0);
				if (isCodeReferenced) continue;

				assert.ok(referencedDialogueIDs[dialogueID], "dialogue " + dialogueID + " is referenced by a source");
			}
		});

		QUnit.test("every dialogue has at least one page", function (assert) {
			for (let dialogueID in DialogueConstants.dialogues) {
				let dialogue = DialogueConstants.dialogues[dialogueID];
				assert.ok(dialogue.pages.length > 0, "dialogue " + dialogueID + " has at least one page");
			}
		});

		QUnit.test("every text key referenced by dialogue data exists", function (assert) {
			for (let dialogueID in DialogueConstants.dialogues) {
				let textKeys = getDialogueTextKeys(dialogueID, DialogueConstants.dialogues[dialogueID]);

				for (let i = 0; i < textKeys.length; i++) {
					let entry = textKeys[i];
					assert.ok(defaultTexts[entry.key] !== undefined, entry.description + " references existing text key " + entry.key);
				}
			}
		});

		QUnit.test("every dialogue string is used by dialogue data", function (assert) {
			let referencedTextKeys = {};

			for (let dialogueID in DialogueConstants.dialogues) {
				let textKeys = getDialogueTextKeys(dialogueID, DialogueConstants.dialogues[dialogueID]);
				for (let i = 0; i < textKeys.length; i++) {
					referencedTextKeys[textKeys[i].key] = true;
				}
			}

			for (let textKey in defaultTexts) {
				if (textKey.indexOf("story.dialogue.") !== 0) continue;

				assert.ok(referencedTextKeys[textKey], "dialogue text key " + textKey + " is used by dialogue data");
			}
		});
	});
});
