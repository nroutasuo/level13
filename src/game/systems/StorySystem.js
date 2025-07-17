define([
	'ash',
	'text/Text',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/LogConstants',
	'game/constants/StoryConstants'
], function (Ash, Text, GameGlobals, GlobalSignals, LogConstants, StoryConstants) {

	let StorySystem = Ash.System.extend({

		context: "story",

		storiesByTrigger: {}, // trigger -> storyID

		constructor: function () {
			this.initStories();
			this.setupTriggers();
		},

		addToEngine: function (engine) {
			this.engine = engine;
			GlobalSignals.add(this, GlobalSignals.triggerSignal, this.onTrigger);
			GlobalSignals.add(this, GlobalSignals.gameStateReadySignal, this.onGameStateReady);
		},

		removeFromEngine: function (engine) {
			this.engine = null;
			GlobalSignals.removeAll(this);
		},

		initStories: function () {
			for (let storyID in StoryConstants.stories) {
				let storyVO = StoryConstants.getStory(storyID);
				let trigger = storyVO.startTrigger;
				if (!this.storiesByTrigger[trigger]) this.storiesByTrigger[trigger] = [];
				this.storiesByTrigger[trigger].push(storyID);
			}
		},

		initState: function () {
			let activeSegments = this.getActiveSegments();
			for (let i = 0; i < activeSegments.length; i++) {
				let segmentVO = activeSegments[i];
				let storyVO = StoryConstants.getStory(segmentVO.storyID);
				if (storyVO) this.triggerEffects(storyVO.onStart, true);
				this.triggerEffects(segmentVO.onStart, true);
			}
		},

		setupTriggers: function () {
			GlobalSignals.registerTrigger(GlobalSignals.actionCompletedSignal, StoryConstants.triggers.action_any);
			GlobalSignals.registerTrigger(GlobalSignals.actionRewardsCollectedSignal, StoryConstants.triggers.action_collect_rewards);
			GlobalSignals.registerTrigger(GlobalSignals.campEventStartedSignal, StoryConstants.triggers.camp_event);
			GlobalSignals.registerTrigger(GlobalSignals.dialogueCompletedSignal, StoryConstants.triggers.action_complete_dialogue);
			GlobalSignals.registerTrigger(GlobalSignals.examineSpotExaminedSignal, StoryConstants.triggers.action_examine);
			GlobalSignals.registerTrigger(GlobalSignals.explorersChangedSignal, StoryConstants.triggers.explorers_changed);
			GlobalSignals.registerTrigger(GlobalSignals.featureUnlockedSignal, StoryConstants.triggers.feature_unlocked);
			GlobalSignals.registerTrigger(GlobalSignals.improvementBuiltSignal, StoryConstants.triggers.action_build);
			GlobalSignals.registerTrigger(GlobalSignals.inventoryChangedSignal, StoryConstants.triggers.change_inventory);
			GlobalSignals.registerTrigger(GlobalSignals.localeScoutedSignal, StoryConstants.triggers.locale_scouted);
			GlobalSignals.registerTrigger(GlobalSignals.playerEnteredCampSignal, StoryConstants.triggers.action_enter_camp);
			GlobalSignals.registerTrigger(GlobalSignals.playerLeftCampSignal, StoryConstants.triggers.action_leave_camp);
			GlobalSignals.registerTrigger(GlobalSignals.playerPositionChangedSignal, StoryConstants.triggers.change_position);
			GlobalSignals.registerTrigger(GlobalSignals.populationChangedSignal, StoryConstants.triggers.camp_population_changed);
			GlobalSignals.registerTrigger(GlobalSignals.sectorScoutedSignal, StoryConstants.triggers.action_scout);
			GlobalSignals.registerTrigger(GlobalSignals.slowUpdateSignal, StoryConstants.triggers.update);
			GlobalSignals.registerTrigger(GlobalSignals.storyFlagChangedSignal, StoryConstants.triggers.story_flag_changed);
			GlobalSignals.registerTrigger(GlobalSignals.upgradeUnlockedSignal, StoryConstants.triggers.upgrade_researched);
		},

		triggerStories: function (triggerID, param) {
			let storiesByTrigger = this.storiesByTrigger[triggerID];
			if (!storiesByTrigger) return;
			for (let i = 0; i < storiesByTrigger.length; i++) {
				let storyID = storiesByTrigger[i];
				this.triggerStartStory(storyID, param);
			}
		},

		triggerStartStory: function (storyID, triggerParam) {
			if (!this.isStoryAvailable(storyID, triggerParam)) return;
			this.startStory(storyID);
		},

		triggerSegments: function (triggerID, param) {
			// complete active segments
			let activeSegments = this.getActiveSegments();
			for (let i = 0; i < activeSegments.length; i++) {
				let segmentVO = activeSegments[i];
				if (segmentVO.completeTrigger != triggerID) continue;
				this.triggerCompleteSegment(segmentVO, param);
			}

			// start next segments
			let possibleNextSegments = this.getPossibleSegmentsToStart();
			for (let i = 0; i < possibleNextSegments.length; i++) {
				let segmentVO = possibleNextSegments[i];
				if (segmentVO.startTrigger != triggerID) continue;
				this.triggerStartSegment(segmentVO, param);
			}
		},

		triggerCompleteSegment: function (segmentVO, triggerParam) {
			if (!this.isConditionsMet(segmentVO.completeConditions, triggerParam)) return;
			this.completeSegment(segmentVO);
		},

		triggerStartSegment: function (segmentVO, triggerParam) {
			if (!this.isConditionsMet(segmentVO.startConditions, triggerParam)) return;
			this.startSegment(segmentVO);
		},

		startStory: function (storyID) {
			let storyVO = StoryConstants.getStory(storyID);
			if (!storyVO) return;
			log.i("start story: " + storyID, this);
			this.triggerEffects(storyVO.onStart);
			this.startSegment(storyVO.segments[0]);
			this.triggerSegments(StoryConstants.triggers.immediate);
		},

		completeStory: function (storyID) {
			let storyVO = StoryConstants.getStory(storyID);
			if (!storyVO) return;
			log.i("complete story: " + storyID, this);
			this.triggerEffects(storyVO.onComplete);
			GameGlobals.gameState.storyStatus[storyID] = StoryConstants.storyStatuses.COMPLETED;
			GameGlobals.storyHelper.endQuests(storyID);
		},

		startSegment: function (segmentVO) {
			if (!segmentVO) return;
			let segmentID = segmentVO.segmentID;
			let fullID = segmentVO.storyID + "." + segmentVO.segmentID;
			log.i("start segment: " + fullID, this);
			let storyID = segmentVO.storyID;
			GameGlobals.gameState.storyStatus[storyID] = segmentID;
			this.triggerEffects(segmentVO.onStart);
			this.triggerSegments(StoryConstants.triggers.immediate);
		},

		completeSegment: function (segmentVO) {
			if (!segmentVO) return;
			let fullID = segmentVO.storyID + "." + segmentVO.segmentID;
			log.i("complete segment: " + fullID, this);
			this.triggerEffects(segmentVO.onComplete);
			let nextSegment = this.getNextSegment(segmentVO);

			if (nextSegment) {
				this.startSegment(nextSegment);
			} else {
				this.completeStory(segmentVO.storyID);
			}
		},

		triggerEffects: function (effectVO, onlyStatus) {
			if (!effectVO) return;

			for (let flagID in effectVO.storyFlags) {
				let value = effectVO.storyFlags[flagID] == true;
				GameGlobals.gameState.setStoryFlag(flagID, value);
				GlobalSignals.storyFlagChangedSignal.dispatch(flagID);
			}

			if (effectVO.unlockFeature) {
				GameGlobals.playerActionFunctions.unlockFeature(effectVO.unlockFeature);
			}

			if (onlyStatus) return;

			if (effectVO.popup) {
				let delay = 100;
				setTimeout(() => {
					let title = Text.t(effectVO.popup.title || "story.stories.default_popup_title");
					let msg = Text.t(effectVO.popup.text);
					GameGlobals.uiFunctions.showInfoPopup(title, msg);
				}, delay);
			}

			if (effectVO.log) {
				let delay = typeof effectVO.log.delay === "number" ? effectVO.log.delay : 300;
				setTimeout(() => {
					let msg = Text.t(effectVO.log.textKey);
					let options = { visibility: effectVO.log.visibility || LogConstants.MSG_VISIBILITY_GLOBAL };
					GameGlobals.playerHelper.addLogMessage(LogConstants.getUniqueID(), msg, options);
				}, delay);
			}

			if (effectVO.dialogue) {
				GlobalSignals.triggerDialogueSignal.dispatch(effectVO.dialogue.owner, effectVO.dialogue.storyTag);
			}

			// TODO process result VOs
		},

		getActiveSegments: function () {
			let result = [];

			for (let storyID in GameGlobals.gameState.storyStatus) {
				let status = this.getStoryStatus(storyID);
				if (status == StoryConstants.storyStatuses.STARTED) {
					let storyVO = StoryConstants.getStory(storyID);
					let activeSegmentID = this.getActiveSegmentID(storyVO);
					let activeSegmentVO = storyVO.getSegment(activeSegmentID);
					if (activeSegmentVO) {
						result.push(activeSegmentVO);
					}
				}
			}

			return result;
		},

		getActiveSegmentID: function (storyVO) {
			let storyID = storyVO.storyID;
			let status = this.getStoryStatus(storyID);
			if (status !== StoryConstants.storyStatuses.STARTED) return null;

			let statusFlag = GameGlobals.gameState.storyStatus[storyID];
			let segmentVO = storyVO.getSegment(statusFlag);
			if (segmentVO) return segmentVO.segmentID;

			return storyVO.segments[0].segmentID;
		},

		getPossibleSegmentsToStart: function () {
			let result = [];

			let activeSegments = this.getActiveSegments();

			for (let i in activeSegments) {
				let activeSegmentVO = activeSegments[i];

				// next segments from active segments
				let possibleNextSegments = GameGlobals.storyHelper.getPossibleNextSegmentsFromSegment(activeSegmentVO);
				if (possibleNextSegments) {
					for (let j = 0; j < possibleNextSegments.length; j++) {
						result.push(possibleNextSegments[j]);
					}
				}

				// segments that can be started for any previous segment if their start conditions are met
				let activeStoryID = activeSegmentVO.storyID;
				let activeStoryVO = StoryConstants.getStory(activeStoryID);
				let activeSegmentIndex = activeStoryVO.getSegmentIndex(activeSegmentVO.segmentID);
				for (let i = activeSegmentIndex + 1; i < activeStoryVO.segments.length; i++) {
					let futureSegmentVO = activeStoryVO.segments[i];
					if (!futureSegmentVO.startFromAny) continue;
					if (result.indexOf(futureSegmentVO) >= 0) continue;
					result.push(futureSegmentVO);
				}
			}

			return result;
		},

		getNextSegment: function (segmentVO) {
			if (!segmentVO) return null;

			let possibleNextSegments = GameGlobals.storyHelper.getPossibleNextSegmentsFromSegment(segmentVO);

			// none at all defined - end of story
			if (possibleNextSegments.length == 0) return null;

			if (possibleNextSegments) {
				for (let i = 0; i < possibleNextSegments.length; i++) {
					let nextSegmentVO = possibleNextSegments[i];
					if (this.isConditionsMet(nextSegmentVO.startConditions)) {
						return nextSegmentVO;
					}
				}
			}

			// some defined but none are valid - log warning
			log.w("no next segment found for story after " + segmentVO.storyID + "." + segmentVO.segmentID, this);
			return null;
		},

		isStoryAvailable: function (storyID, triggerParam) {
			let storyVO = StoryConstants.getStory(storyID);
			if (!storyVO) return false;
			let status = this.getStoryStatus(storyID);
			if (status != StoryConstants.storyStatuses.PENDING) return false;
			if (!this.isConditionsMet(storyVO.startConditions, triggerParam)) return false;

			return true;
		},

		isConditionsMet: function (conditions, triggerParam) {
			let reqsCheck = GameGlobals.playerActionsHelper.checkGeneralRequirementaInternal(conditions);
			if (reqsCheck.value < 1) return false;

			let paramsCheck = GameGlobals.playerActionsHelper.checkTriggerParams(conditions, triggerParam);
			if (!paramsCheck) return false;

			return true;
		},

		getStoryStatus: function (storyID) {
			let storyStatus = GameGlobals.gameState.storyStatus[storyID];

			if (!storyStatus) return StoryConstants.storyStatuses.PENDING;

			if (storyStatus == StoryConstants.storyStatuses.COMPLETED) return StoryConstants.storyStatuses.COMPLETED;

			return StoryConstants.storyStatuses.STARTED;
		},

		onTrigger: function (triggerID, param) {
			this.triggerStories(triggerID, param);
			this.triggerSegments(triggerID, param);
		},

		onGameStateReady: function () {
			this.initState();
			this.triggerStories(StoryConstants.triggers.immediate);
			this.triggerSegments(StoryConstants.triggers.immediate);
		},

	});

	return StorySystem;
});
