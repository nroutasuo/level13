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
				id: "monument_dictatorship",
				name: "monument",
				shortName: "monument",
				popupMsg: "A chipped monument celebrating defeat of an old dictatorship",
				positionParams: {
					campOrdinal: 4,
					sectorType: "public"
				}
			},
			{
				id: "story_apocalypse_solar_panels_01",
				name: "solar panels",
				shortName: "panels",
				popupMsg: "Massive solar panels, still providing the failing City with power for basic functions. They look a little run-down though.",
				positionParams: {
					campOrdinal: 6,
					sunlit: true
				}
			},
			{
				id: "story_apocalypse_solar_panels_02",
				name: "solar panels",
				shortName: "panels",
				popupMsg: "If these kind of panels are what's keeping the City's remaining lights on, they won't last many years without maintenance.",
				positionParams: {
					campOrdinal: 7,
					sunlit: true
				}
			},
			{
				id: "story_earthquake_pillars",
				name: "pillars",
				shortName: "pillars",
				popupMsg: "These massive pillars look like they were built relatively recently. They seem like reinforcements to help hold the weight of the City above. One of them is already cracked.",
				positionParams: {
					campOrdinal: 7,
					levelIndex: 1,
				}
			},
			{
				id: "story_escape_pod",
				name: "piece of escape pod",
				shortName: "debris",
				popupMsg: "A damaged piece of a spacecraft, built to transport people. Thankfully, the remains have been reduced to skeletons.",
				positionParams: {
					campOrdinal: 15
				},
				storyTag: "spaceDebris"
			},
			{
				id: "story_fall_hull_wreckage",
				name: "burned wreckage",
				shortName: "wreckage",
				popupMsg: "Wreckage from the escape shuttle. You recognize the material from the factory, still sleek and polished where it has not fractured.",
				positionParams: {
					campOrdinal: 15
				},
				storyTag: "spaceDebris"
			},
			{
				id: "story_fall_sundome_shards",
				name: "sundome shards",
				shortName: "shards",
				popupMsg: "Sharp, glistering, human-sized shards of the sundome that used to cover the Surface.",
				positionParams: {
					campOrdinal: 15
				}
			}
		],

		storyStashes: [
			{
				campOrdinal: 11,
				itemID: "document_story_launch_schedule",
				localeType: "lab",
			},
			{
				campOrdinal: 12,
				itemID: "document_story_evacuation_schedule",
				localeType: "office",
			},
			{
				campOrdinal: 13,
				itemID: "document_story_evacuation_reason",
				localeType: "office",
			},
			{
				campOrdinal: 12,
				itemID: "document_story_earthquakes_severity_01",
				localeType: "office",
			},
			{
				campOrdinal: 11,
				itemID: "document_story_earthquakes_cause_01",
				localeType: "office",
			},
			{
				campOrdinal: 13,
				itemID: "document_story_expedition_leaflet_01"
			},
			{
				campOrdinal: 14,
				itemID: "document_story_expedition_leaflet_01"
			},
		],

		storyStatuses: {
			PENDING: "PENDING",
			STARTED: "STARTED",
			COMPLETED: "COMPLETED",
		},

		triggers: {
			action_any: "action_any",
			action_build: "action_build",
			action_collect_rewards: "action_collect_rewards",
			action_complete_dialogue: "action_complete_dialogue",
			action_enter_camp: "action_enter_camp",
			action_examine: "action_examine",
			action_leave_camp: "action_leave_camp",
			action_scavenge: "action_scavenge",
			action_scout: "action_scout",
			camp_event: "camp_event",
			camp_population_changed: "camp_population_changed",
			change_inventory: "change_inventory",
			change_position: "change_position",
			explorers_changed: "explorers_changed",
			feature_unlocked: "feature_unlocked",
			immediate: "immediate",
			locale_scouted: "locale_scouted",
			story_flag_changed: "story_flag_changed",
			update: "update",
			upgrade_researched: "upgrade_researched",
		},

		flags: {
			APOCALYPSE_PENDING_REFUGEES: "APOCALYPSE_PENDING_REFUGEES",
			APOCALYPSE_KNOWN: "APOCALYPSE_KNOWN",
			ESCAPE_SEARCHING_FOR_EXIT: "ESCAPE_SEARCHING_FOR_EXIT",
			ESCAPE_SEARCHING_FOR_GROUND: "ESCAPE_SEARCHING_FOR_GROUND",
			ESCAPE_WORRIED_ABOUT_OUTSIDE: "ESCAPE_WORRIED_ABOUT_OUTSIDE",
			ESCAPE_REACHED_SURFACE: "ESCAPE_REACHED_SURFACE",
			EXPEDITION_PENDING_VISITORS: "EXPEDITION_PENDING_VISITORS",
			EXPEDITION_START_KNOWN: "EXPEDITION_START_KNOWN",
			EXPEDITION_FATE_KNOWN: "EXPEDITION_FATE_KNOWN",
			FALL_INVESTIGATING: "FALL_INVESTIGATING",
			FALL_SEEN_STOREHOUSE: "FALL_SEEN_STOREHOUSE",
			FALL_SEEN_EVACUATION: "FALL_SEEN_EVACUATION",
			FALL_SEEN_SPACEFACTORY: "FALL_SEEN_SPACEFACTORY",
			FALL_SEEN_DEBRIS: "FALL_SEEN_DEBRIS",
			GANG_COMPOUND_FOUND: "GANG_COMPOUND_FOUND",
			GREENHOUSE_PENDING_DISEASE: "GREENHOUSE_PENDING_DISEASE",
			GREENHOUSE_SEARCHING_FOR_CURE: "GREENHOUSE_SEARCHING_FOR_CURE",
			GREENHOUSE_FOUND: "GREENHOUSE_FOUND",
			GREENHOUSE_RESTORED: "GREENHOUSE_RESTORED",
			RESCUE_SISTER_INTRODUCED: "RESCUE_SISTER_INTRODUCED",
			RESCUE_PASSAGE_UP_BUILT: "RESCUE_PASSAGE_UP_BUILT",
			RESCUE_LEVEL_14_HAZARD_FOUND: "RESCUE_LEVEL_14_HAZARD_FOUND",
			RESCUE_EXPLORER_LEFT: "RESCUE_LEVEL_14_HAZARD_FOUND",
			RESCUE_EXPLORER_FOUND: "RESCUE_EXPLORER_FOUND",
			SPIRITS_MAGIC_SEEN: "SPIRITS_MAGIC_SEEN",
			SPIRITS_SEARCHING_FOR_SPIRITS: "SPIRITS_SEARCHING_FOR_SPIRITS",
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
			result.unlockFeature = data.unlockFeature || null;
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
