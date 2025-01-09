define([
	'ash', 
	'json!game/data/StoryData.json',
	'game/vos/StoryVO',
	'game/vos/StorySegmentVO',
	'game/vos/StoryEffectVO',
], function (
	Ash, StoryData, StoryVO, StorySegmentVO, StoryEffectVO
) {
	
	let StoryConstants = {
	
		FALL_YEAR: 783,
		FALL_WEEK: 13,
		GAME_START_YEAR: 783,
		GAME_START_WEEK: 17,

		sectorExamineSpots: [
			{
				id: "test_vehicle",
				name: "strange vehicle",
				shortName: "vehicle",
				popupMsg: "A strange vehicle with the black GIGA logo on it",
				positionParams: {
					campOrdinal: 3,
					sectorType: "industrial"
				}
			},
			{
				id: "test_monument",
				name: "monument",
				shortName: "monument",
				popupMsg: "A monument to the defeat of an old dictatorship",
				positionParams: {
					campOrdinal: 4,
					sectorType: "public"
				}
			},
			{
				id: "test_wreckage",
				name: "burned wreckage",
				shortName: "wreckage",
				popupMsg: "Wreckage from the escape shuttle",
				positionParams: {
					campOrdinal: 15,
				}
			},
		],

		storyStatuses: {
			PENDING: "PENDING",
			STARTED: "STARTED",
			COMPLETED: "COMPLETED",
		},

		triggers: {
			immediate: "immediate",
			action_any: "action_any",
			action_build: "action_build",
			action_collect_rewards: "action_collect_rewards",
			action_complete_dialogue: "action_complete_dialogue",
			action_enter_camp: "action_enter_camp",
			action_leave_camp: "action_leave_camp",
			action_scavenge: "action_scavenge",
			action_scout: "action_scout",
			camp_event: "camp_event",
			change_inventory: "change_inventory",
			change_position: "change_position",
			feature_unlocked: "feature_unlocked",
			locale_scouted: "locale_scouted",
			story_flag_changed: "story_flag_changed",
			update: "update",
		},

		flags: {
			SEARCHING_FOR_GROUND: "SEARCHING_FOR_GROUND",
			PENDING_DISEASE: "PENDING_DISEASE",
			SEARCHING_FOR_CURE: "SEARCHING_FOR_CURE",
		},

		stories: {}, // id -> StoryVO

		loadData: function (data) {
			for (let storyID in data.stories) {
				let storyData = data.stories[storyID];
				let storyVO = new StoryVO(storyID);
				storyVO.startTrigger = this.parseStoryTrigger(storyData.startTrigger);
				storyVO.startConditions = this.parseStoryConditions(storyData.startConditions);
				storyVO.onStart = this.parseStoryEffects(storyData.onStart);
				storyVO.onComplete = this.parseStoryEffects(storyData.onComplete);

				storyVO.segments = [];
				for (let j = 0; j < storyData.segments.length; j++) {
					storyVO.segments.push(this.parseSegment(storyID, storyData.segments[j]));
				}

				this.stories[storyVO.storyID] = storyVO;
			}
		},

		parseStoryTrigger: function (data) {
			// TODO check triggers exist
			return data || "ANY";
		},

		parseStoryConditions: function (data) {
			// TODO check conditions are valid
			return data || {};
		},

		parseStoryEffects: function (data) {
			let result = new StoryEffectVO();
			if (!data) return result;

			result.popup = data.popup;

			if (typeof data.popup === "string") {
				result.popup = {};
				result.popup.text = data.popup;
			}

			// TODO check dialogue definition parts in more detail

			result.result = data.result;
			result.log = data.log;
			result.dialogue = data.dialogue;
			result.storyFlags = data.storyFlags || {};

			return result;
		},

		parseSegment: function (storyID, data) {
			// TODO check next segments actually exist
			
			let result = new StorySegmentVO(storyID, data.id);

			result.startTrigger = this.parseStoryTrigger(data.startTrigger);
			result.startConditions = this.parseStoryConditions(data.startConditions);
			result.completeTrigger = this.parseStoryTrigger(data.completeTrigger);
			result.completeConditions = this.parseStoryConditions(data.completeConditions);
			result.onStart = this.parseStoryEffects(data.onStart);
			result.onComplete = this.parseStoryEffects(data.onComplete);
			result.possibleNextSegments = data.possibleNextSegments || null;
			result.startFromAny = data.startFromAny || false;

			return result;
		},

		getStory: function (storyID) {
			return this.stories[storyID];
		},

		getSectorExampineSpot: function (id) {
			for (let i = 0; i < this.sectorExamineSpots.length; i++) {
				if (this.sectorExamineSpots[i].id == id) {
					return this.sectorExamineSpots[i];
				}
			}
			return null;
		},
		
	};

    StoryConstants.loadData(StoryData);
	
	return StoryConstants;
	
});
