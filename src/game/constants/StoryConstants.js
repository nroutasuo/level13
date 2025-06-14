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
				id: "story_apocalypse_cracks_01",
				positionParams: {
					campOrdinal: 2
				}
			},
			{
				id: "world_monument_dictatorship",
				positionParams: {
					campOrdinal: 4,
					sectorType: "public"
				}
			},
			{
				id: "story_apocalypse_settlement",
				positionParams: {
					campOrdinal: 5,
				}
			},
			{
				id: "story_spirits_shrine_01",
				positionParams: {
					campOrdinal: 5,
					sectorType: "industrial"
				}
			},
			{
				id: "story_apocalypse_solar_panels_01",
				positionParams: {
					campOrdinal: 6,
					sunlit: true
				}
			},
			{
				id: "story_earthquake_pillars_01",
				positionParams: {
					campOrdinal: 6,
					levelIndex: 0,
				}
			},
			{
				id: "story_apocalypse_solar_panels_02",
				positionParams: {
					campOrdinal: 7,
					sunlit: true
				}
			},
			{
				id: "story_earthquake_pillars_02",
				positionParams: {
					campOrdinal: 7,
					levelIndex: 1,
				}
			},
			{
				id: "story_spirits_shrine_02",
				positionParams: {
					campOrdinal: 7
				}
			},
			{
				id: "story_apocalypse_measuring_station",
				positionParams: {
					campOrdinal: 8,
					levelIndex: 0
				}
			},
			{
				id: "story_apocalypse_cracks_02",
				positionParams: {
					campOrdinal: 9
				}
			},
			{
				id: "story_spirits_shrine_03",
				positionParams: {
					campOrdinal: 11,
					sectorType: "slum"
				}
			},
			{
				id: "world_fall_tent_village",
				positionParams: {
					campOrdinal: 13
				}
			},
			{
				id: "world_fall_supply_truck",
				positionParams: {
					campOrdinal: 14
				}
			},
			{
				id: "story_fall_escape_pod",
				positionParams: {
					campOrdinal: 15
				},
				storyTag: "spaceDebris"
			},
			{
				id: "story_fall_hull_wreckage",
				positionParams: {
					campOrdinal: 15
				},
				storyTag: "spaceDebris"
			},
			{
				id: "story_fall_sundome_shards_01",
				positionParams: {
					campOrdinal: 15
				}
			},
			{
				id: "story_fall_sundome_shards_02",
				positionParams: {
					campOrdinal: 15
				}
			}
		],

		storyStashes: [
			{
				campOrdinal: 9,
				itemID: "artefact_rescue_1",
			},
			{
				campOrdinal: 9,
				itemID: "document_story_apocalypse_cause_01",
				localeType: "office",
			},
			{
				campOrdinal: 10,
				itemID: "document_story_apocalypse_cause_02",
				localeType: "office",
			},
			{
				campOrdinal: 11,
				itemID: "document_story_fall_launch_schedule_01",
				localeType: "lab",
			},
			{
				campOrdinal: 12,
				itemID: "document_story_fall_evacuation_01",
				localeType: "office",
			},
			{
				campOrdinal: 12,
				itemID: "document_story_apocalypse_severity_01",
				localeType: "office",
			},
			{
				campOrdinal: 12,
				itemID: "document_story_fall_evacuation_02",
				localeType: "office",
			},
			{
				campOrdinal: 13,
				itemID: "document_story_apocalypse_evacuation_01",
				localeType: "office",
			},
			{
				campOrdinal: 13,
				itemID: "document_story_expedition_leaflet_01"
			},
			{
				campOrdinal: 14,
				itemID: "document_story_fall_warning_01",
				localeType: "office"
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
			APOCALYPSE_KNOWN: "APOCALYPSE_KNOWN",
			APOCALYPSE_PENDING_REFUGEES: "APOCALYPSE_PENDING_REFUGEES",
			APOCALYPSE_PLAN_READY: "APOCALYPSE_PLAN_READY",
			APOCALYPSE_TECH_READY: "APOCALYPSE_TECH_READY",
			ESCAPE_PASSAGE_DOWN_BUILT: "ESCAPE_PASSAGE_DOWN_BUILT",
			ESCAPE_PASSAGE_DOWN_FOUND: "ESCAPE_PASSAGE_DOWN_FOUND",
			ESCAPE_REACHED_SURFACE: "ESCAPE_REACHED_SURFACE",
			ESCAPE_SEARCHING_FOR_EXIT: "ESCAPE_SEARCHING_FOR_EXIT",
			ESCAPE_SEARCHING_FOR_GROUND: "ESCAPE_SEARCHING_FOR_GROUND",
			ESCAPE_WORRIED_ABOUT_OUTSIDE: "ESCAPE_WORRIED_ABOUT_OUTSIDE",
			EXPEDITION_FATE_KNOWN: "EXPEDITION_FATE_KNOWN",
			EXPEDITION_PENDING_VISITORS: "EXPEDITION_PENDING_VISITORS",
			EXPEDITION_START_KNOWN: "EXPEDITION_START_KNOWN",
			FALL_INVESTIGATING: "FALL_INVESTIGATING",
			FALL_SEEN_DEBRIS: "FALL_SEEN_DEBRIS",
			FALL_SEEN_EVACUATION: "FALL_SEEN_EVACUATION",
			FALL_SEEN_SPACEFACTORY: "FALL_SEEN_SPACEFACTORY",
			FALL_SEEN_STOREHOUSE: "FALL_SEEN_STOREHOUSE",
			FALL_LINKED_EXODUS_TO_FALL: "FALL_LINKED_EXODUS_TO_FALL",
			GANG_COMPOUND_FOUND: "GANG_COMPOUND_FOUND",
			GREENHOUSE_PENDING_DISEASE: "GREENHOUSE_PENDING_DISEASE",
			GREENHOUSE_DISEASE_SEEN: "GREENHOUSE_DISEASE_SEEN",
			GREENHOUSE_SEARCHING_FOR_CURE: "GREENHOUSE_SEARCHING_FOR_CURE",
			GREENHOUSE_FOUND: "GREENHOUSE_FOUND",
			GREENHOUSE_RESTORED: "GREENHOUSE_RESTORED",
			RESCUE_SISTER_INTRODUCED: "RESCUE_SISTER_INTRODUCED",
			RESCUE_PASSAGE_UP_BUILT: "RESCUE_PASSAGE_UP_BUILT",
			RESCUE_LEVEL_14_HAZARD_FOUND: "RESCUE_LEVEL_14_HAZARD_FOUND",
			RESCUE_EXPLORER_LEFT: "RESCUE_LEVEL_14_HAZARD_FOUND",
			RESCUE_EXPLORER_FOUND: "RESCUE_EXPLORER_FOUND",
			SPIRITS_MAGIC_PENDING: "SPIRITS_MAGIC_PENDING",
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

			result.log = data.log;

			if (typeof data.log === "string") {
				result.log = {};
				result.log.textKey = data.log;
			}

			// TODO check dialogue definition parts in more detail

			result.result = data.result;
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
					let spotVO =  this.sectorExamineSpots[i];
					spotVO.nameKey = spotVO.nameKey || "story.spots." + id + "_name";
					spotVO.shortNameKey = spotVO.shortNameKey || "story.spots." + id + "_name_short";
					spotVO.descriptionKey = spotVO.descriptionKey || "story.spots." + id + "_message";
					spotVO.logMessageKey = spotVO.logMessageKey || "story.spots." + id + "_log_message";
					return spotVO;
				}
			}
			return null;
		},

		getPreferredExplorersForStoryTag: function (storyTag) {
			if (storyTag.indexOf("apocalypse") >= 0) {
				return [ "prospector", "journalist", "architect", "guard", "lover" ];
			}
			return [];
		}
		
	};

    StoryConstants.loadData(StoryData);
	
	return StoryConstants;
	
});
