define([
	'ash',
	'text/Text',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/LogConstants'
], function (Ash, Text, GameGlobals, GlobalSignals, LogConstants) {
		
	let SequenceHelper = Ash.Class.extend({

		constructor: function () {},
		
		// starts a sequence of steps which is by default linear but can have branches
		// steps: array of step objects
		// step objects:
		// - should have a type and any params required by that type (see startSequenceStep)
		// - can have an id (otherwise index is used as id)
		// - can have a dictionary of branches (step result id => next step id or "END" which finishes the sequence)
		startSequence: function (steps, popupTitleKey) {

			log.i("start sequence with " + steps.length + " steps");

			if (popupTitleKey) {
				GameGlobals.gameState.uiStatus.sequenceTitleKey = popupTitleKey;
			}

			let helper = this;
			let stepIDToIndexMap = {};

			for (let i = 0; i < steps.length; i++) {
				let step = steps[i];
				let stepID = step.id || i;
				step.index = i;
				step.id = stepID;
				stepIDToIndexMap[stepID] = i;
			}

			let i = 0;
			let currentStep = null;

			let tryStartNextStep = function () {
				if (i < 0 || i >= steps.length) {
					onSequenceDone();
					return;
				}

				currentStep = steps[i];

				if (!currentStep) {
					onSequenceDone();
					return;
				}

				log.i("start sequence step [" + i + "] " + currentStep.id);

				helper.startSequenceStep(currentStep, onStepDone);
			}

			let moveToStep = function (stepID) {
				if (stepID == "END") {
					i = -1;
				} else {
					let nextIndex = stepIDToIndexMap[stepID];
					i = nextIndex;
				}
			};

			let moveToNextStep = function (result) {
				if (currentStep.next) {
					moveToStep(currentStep.next);
					return;
				}

				let stepBranches = currentStep.branches;
				if (stepBranches && stepBranches[result]) {
					let nextStepID = stepBranches[result];
					moveToStep(nextStepID);
					return;
				}

				i++;
			};

			let onSequenceDone = function () {
				GameGlobals.gameState.uiStatus.sequenceTitleKey = null;
				log.i("finish sequence");
			};

			let onStepDone = function (result) {
				log.i("complete sequence step [" + i + "] " + currentStep.id);
				moveToNextStep(result);
				tryStartNextStep();
			};

			tryStartNextStep();
		},

		startSequenceStep: function (step, cb) {
			let type = step.type;

			let textKey = step.textKey;
			let textParams = step.textParams || {};

			switch (type) {
				case "custom":
					step.f(cb);
					break;
				case "dialogue":
					let dialogueID = step.dialogueID;
					GameGlobals.playerActionFunctions.startDialogue(dialogueID, null, null, textParams);
					GlobalSignals.dialogueCompletedSignal.addOnce(() => { cb(); });
					break;
				case "fight":
					let chance = step.chance === 0 ? 0 : step.chance || 1;
					let numEnemies = step.numEnemies;
					let action = step.action;
					GameGlobals.fightHelper.handleFight(numEnemies, chance, action, () => cb("WIN"), () => cb("FLEE"), () => cb("LOSE"));
					break;
				case "log":
					let text = Text.t(textKey, textParams);
					GameGlobals.playerHelper.addLogMessage(LogConstants.getUniqueID(), text);
					cb();
					break;
				case "result":
					let resultVO = step.result;
					let rewardTexts = [];
					rewardTexts.push(Text.t(step.textKey));
					rewardTexts = rewardTexts.concat(step.customRewardTexts);
					let popupTitle = step.titleTextKey || GameGlobals.gameState.uiStatus.sequenceTitleKey;
					let popupMsg = rewardTexts.join("<br/>");
					GameGlobals.playerActionFunctions.handleRewards(resultVO, cb, true, popupTitle, popupMsg);
					break;
				case "storyFlag":
					let flagID = step.flagID;
					let value = step.value;
					GameGlobals.playerActionFunctions.setStoryFlag(flagID, value);
					cb();
					break;
				default: 
					log.w("unknown sequence step type: " + type);
					cb();
					break;
			}
		},
		
	});

	return SequenceHelper;
});
