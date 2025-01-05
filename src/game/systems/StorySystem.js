define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/LogConstants',
	'game/constants/StoryConstants'
], function (Ash, GameGlobals, GlobalSignals, LogConstants, StoryConstants) {

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

		setupTriggers: function () {
			GlobalSignals.registerTrigger(GlobalSignals.slowUpdateSignal, StoryConstants.triggers.update);
			GlobalSignals.registerTrigger(GlobalSignals.sectorScavengedSignal, StoryConstants.triggers.action_scavenge);
			GlobalSignals.registerTrigger(GlobalSignals.sectorScoutedSignal, StoryConstants.triggers.action_scout);
			GlobalSignals.registerTrigger(GlobalSignals.improvementBuiltSignal, StoryConstants.triggers.action_build);
			GlobalSignals.registerTrigger(GlobalSignals.actionCompletedSignal, StoryConstants.triggers.action_any);
			GlobalSignals.registerTrigger(GlobalSignals.playerEnteredCampSignal, StoryConstants.triggers.action_enter_camp);
			GlobalSignals.registerTrigger(GlobalSignals.playerLeftCampSignal, StoryConstants.triggers.action_leave_camp);
			GlobalSignals.registerTrigger(GlobalSignals.actionRewardsCollectedSignal, StoryConstants.triggers.action_collect_rewards);
			GlobalSignals.registerTrigger(GlobalSignals.inventoryChangedSignal, StoryConstants.triggers.change_inventory);
			GlobalSignals.registerTrigger(GlobalSignals.playerPositionChangedSignal, StoryConstants.triggers.change_position);
			GlobalSignals.registerTrigger(GlobalSignals.featureUnlockedSignal, StoryConstants.triggers.feature_unlocked);
		},

		triggerStories: function (triggerID) {
			let storiesByTrigger = this.storiesByTrigger[triggerID];
			if (!storiesByTrigger) return;
			for (let i = 0; i < storiesByTrigger.length; i++) {
				let storyID = storiesByTrigger[i];
				this.triggerStartStory(storyID);
			}
		},

		triggerStartStory: function (storyID) {
			if (!this.isStoryAvailable(storyID)) return;
			this.startStory(storyID);
		},

		triggerSegments: function (triggerID) {
			// complete active segments
			let activeSegments = this.getActiveSegments();
			for (let i = 0; i < activeSegments.length; i++) {
				let segmentVO = activeSegments[i];
				if (segmentVO.completeTrigger != triggerID) continue;
				this.triggerCompleteSegment(segmentVO);
			}

			// start next segments
			let possibleNextSegments = this.getPossibleSegmentsToStart();
			for (let i = 0; i < possibleNextSegments.length; i++) {
				let segmentVO = possibleNextSegments[i];
				if (segmentVO.startTrigger != triggerID) continue;
				this.triggerStartSegment(segmentVO);
			}
		},

		triggerCompleteSegment: function (segmentVO) {
			if (!this.isConditionsMet(segmentVO.completeConditions)) return;
			this.completeSegment(segmentVO);
		},

		triggerStartSegment: function (segmentVO) {
			if (!this.isConditionsMet(segmentVO.startConditions)) return;
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
		},

		startSegment: function (segmentVO) {
			if (!segmentVO) return;
			let segmentID = segmentVO.segmentID;
			log.i("start segment: " + segmentID, this);
			this.triggerEffects(segmentVO.onStart);
			let storyID = segmentVO.storyID;
			GameGlobals.gameState.storyStatus[storyID] = segmentID;
		},

		completeSegment: function (segmentVO) {
			if (!segmentVO) return;
			log.i("complete segment: " + segmentVO.segmentID, this);
			this.triggerEffects(segmentVO.onComplete);
			let nextSegment = this.getNextSegment(segmentVO);

			if (nextSegment) {
				this.startSegment(nextSegment);
			} else {
				this.completeStory(segmentVO.storyID);
			}
		},

		triggerEffects: function (effectVO) {
			if (!effectVO) return;

			for (let flagID in effectVO.storyFlags) {
				let value = effectVO.storyFlags[flagID] == true;
				GameGlobals.gameState.storyFlags[flagID] = value;
			}

			if (effectVO.popup) {
				let title = effectVO.popup.title;
				let msg = effectVO.popup.text;
				GameGlobals.uiFunctions.showInfoPopup(title, msg);
			}

			if (effectVO.log) {
				let msg = effectVO.log;
				GameGlobals.playerHelper.addLogMessage(LogConstants.getUniqueID(), msg, LogConstants.MSG_VISIBILITY_GLOBAL);
			}

			// TODO show dialogues (can we use DialogueSystem?)
			// TODO process result VOs
		},

		getActiveStories: function () {
			let result = [];

			for (let storyID in GameGlobals.gameState.storyStatus) {
				let status = this.getStoryStatus(storyID);
				if (status == StoryConstants.storyStatuses.STARTED) {
					result.push(storyID);
				}
			}

			return result;
		},

		getActiveSegments: function () {
			let result = [];

			for (let storyID in GameGlobals.gameState.storyStatus) {
				let status = this.getStoryStatus(storyID);
				if (status == StoryConstants.storyStatuses.STARTED) {
					let storyVO = StoryConstants.getStory(storyID);
					let activeSegmentID = GameGlobals.gameState.storyStatus[storyID];
					let activeSegmentVO = storyVO.getSegment(activeSegmentID);
					result.push(activeSegmentVO);
				}
			}

			return result;
		},

		getPossibleSegmentsToStart: function () {
			let result = [];

			let activeSegments = this.getActiveSegments();

			for (let i in activeSegments) {
				let activeSegmentVO = activeSegments[i];

				// next segments from active segments
				let possibleNextSegments = this.getPossibleNextSegmentsFromSegment(activeSegmentVO);
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

		getPossibleNextSegmentsFromSegment: function (segmentVO) {
			if (!segmentVO) return [];
			let storyVO = StoryConstants.getStory(segmentVO.storyID);
			if (!storyVO) return [];

			let possibleNextSegments = segmentVO.possibleNextSegments;

			if (possibleNextSegments == null) {
				// default: next segment
				let index = storyVO.segments.indexOf(segmentVO);
				let nextSegmentIndex = index + 1;
				if (storyVO.segments.length > nextSegmentIndex) {
					return [ storyVO.segments[nextSegmentIndex] ];
				}
			} else if (possibleNextSegments.length == 0) {
				// none: end of story
				return [];
			} else {
				// specific segments: find by id
				let result = [];
				for (let i = 0; i < possibleNextSegments.length; i++) {
					let nextSegmentID = possibleNextSegments[i];
					result.push(storyVO.getSegment(nextSegmentID));
				}
				return result;
			}
		},

		getNextSegment: function (segmentVO) {
			if (!segmentVO) return null;

			let possibleNextSegments = this.getPossibleNextSegmentsFromSegment(segmentVO);

			for (let i = 0; i < possibleNextSegments.length; i++) {
				let nextSegmentVO = possibleNextSegments[i];
				if (this.isConditionsMet(nextSegmentVO.startConditions)) {
					return nextSegmentVO;
				}
			}

			log.w("no next segment found for story after " + segmentVO.storyID + "." + segmentVO.segmentID, this);
			return null;
		},

		isStoryAvailable: function (storyID) {
			let storyVO = StoryConstants.getStory(storyID);
			if (!storyVO) return false;
			let status = this.getStoryStatus(storyID);
			if (status != StoryConstants.storyStatuses.PENDING) return false;
			if (!this.isConditionsMet(storyVO.startConditions)) return false;

			return true;
		},

		isConditionsMet: function (conditions) {
			let reqsCheck = GameGlobals.playerActionsHelper.checkGeneralRequirementaInternal(conditions);
			if (reqsCheck.value < 1) return false;

			if (conditions.action) {
				let lastAction = GameGlobals.gameState.lastAction;
				if (conditions.action != lastAction) {
					return false;
				}
			}

			return true;
		},

		getStoryStatus: function (storyID) {
			let storyStatus = GameGlobals.gameState.storyStatus[storyID];

			if (!storyStatus) return StoryConstants.storyStatuses.PENDING;

			if (storyStatus == StoryConstants.storyStatuses.COMPLETED) return StoryConstants.storyStatuses.COMPLETED;

			return StoryConstants.storyStatuses.STARTED;
		},

		onTrigger: function (triggerID) {
			this.triggerStories(triggerID);
			this.triggerSegments(triggerID);
		},

		onGameStateReady: function () {
			this.triggerStories(StoryConstants.triggers.immediate);
			this.triggerSegments(StoryConstants.triggers.immediate);
		},

	});

	return StorySystem;
});
