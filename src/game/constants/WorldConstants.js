define(['ash'], function (Ash) {
	
	var WorldConstants = {
	
		LEVEL_NUMBER_MIN: 25,
		LEVEL_NUMBER_MAX: 27,
		
		CAMPS_TOTAL: 15,
		CAMPS_BEFORE_GROUND: 8,
		
		CAMP_ORDINAL_FUEL: 3,
		CAMP_ORDINAL_GREENHOUSE_1: 5,
		CAMP_ORDINAL_GREENHOUSE_2: 7,
		CAMP_ORDINAL_GROUND: 8,
		CAMP_ORDINAL_FUEL_2: 12,
		CAMP_ORDINAL_RUBBER_2: 14,
		
		CAMP_STAGE_EARLY: "e",
		CAMP_STAGE_LATE: "l",
		
		CAMP_STEP_PREVIOUS: 0,  // passage to camp sector
		CAMP_STEP_START: 1,     // zones up to and including POI_1
		CAMP_STEP_POI_2: 2,     // zone POI_2
		CAMP_STEP_END: 3,       // zones after POI_2
		
		ZONE_ENTRANCE: "z_e",
		ZONE_PASSAGE_TO_CAMP: "z_p2c",
		ZONE_PASSAGE_TO_PASSAGE: "z_p2p",
		ZONE_POI_1: "z_poi1",
		ZONE_POI_2: "z_poi2",
		ZONE_CAMP_TO_PASSAGE: "z_c2p",
		ZONE_EXTRA_CAMPABLE: "z_extra_c",
		ZONE_EXTRA_UNCAMPABLE: "z_extra_u",
		ZONE_POI_TEMP: "z_poi_temp",
		
		LEVEL_NUMBER_STASH_ADVANCED_MAP: 11,
		
		resourcePrevalence: {
			RARE: 1,		// only for rare resources
			DEFAULT: 2, 	// default value, scavenging is worth it but not traveling a long way for it
			COMMON: 3,		// good sectors
			ABUNDANT: 4,	// exceptionally good sectors
		},
		
		getCampStep: function (zone) {
			switch (zone) {
				// all levels
				case WorldConstants.ZONE_ENTRANCE: return WorldConstants.CAMP_STEP_PREVIOUS;
				// campable levels
				case WorldConstants.ZONE_PASSAGE_TO_CAMP: return WorldConstants.CAMP_STEP_START;
				case WorldConstants.ZONE_POI_1: return WorldConstants.CAMP_STEP_START;
				case WorldConstants.ZONE_POI_2: return WorldConstants.CAMP_STEP_POI_2;
				case WorldConstants.ZONE_CAMP_TO_PASSAGE: return WorldConstants.CAMP_STEP_END;
				case WorldConstants.ZONE_EXTRA_CAMPABLE: return WorldConstants.CAMP_STEP_END;
				case WorldConstants.ZONE_POI_TEMP: return WorldConstants.CAMP_STEP_END;
				// uncampable levels
				case WorldConstants.ZONE_PASSAGE_TO_PASSAGE: return WorldConstants.CAMP_STEP_END;
				case WorldConstants.ZONE_EXTRA_UNCAMPABLE: return WorldConstants.CAMP_STEP_END;
				default:
					log.i("no camp step defined for zone: " + zone);
					return 5;
			}
		},
		
		getStage: function (zone) {
			switch (zone) {
				case WorldConstants.ZONE_ENTRANCE:
				case WorldConstants.ZONE_PASSAGE_TO_CAMP:
				case WorldConstants.ZONE_POI_1:
					return WorldConstants.CAMP_STAGE_EARLY;
				case WorldConstants.ZONE_POI_2:
				case WorldConstants.ZONE_CAMP_TO_PASSAGE:
				case WorldConstants.ZONE_EXTRA_CAMPABLE:
				case WorldConstants.ZONE_POI_TEMP:
				case WorldConstants.ZONE_PASSAGE_TO_PASSAGE:
				case WorldConstants.ZONE_EXTRA_UNCAMPABLE:
					return WorldConstants.CAMP_STAGE_LATE;
				default:
					log.i("no camp stage defined for zone: " + zone);
					return WorldConstants.CAMP_STAGE_LATE;
			}
		},
		
		getStageForStep: function (step) {
			switch (step) {
				case WorldConstants.CAMP_STEP_END: return WorldConstants.CAMP_STAGE_LATE;
				case WorldConstants.CAMP_STEP_POI_2: return WorldConstants.CAMP_STAGE_LATE;
				default: return WorldConstants.CAMP_STAGE_EARLY;
			}
		},
		
		getStepForStage: function (stage) {
			switch (stage) {
				case WorldConstants.CAMP_STAGE_EARLY: return WorldConstants.CAMP_STEP_START;
				case WorldConstants.CAMP_STAGE_LATE: return WorldConstants.CAMP_STAGE_LATE;
			}
			log.w("unknown stage: " + stage);
			return WorldConstants.CAMP_STEP_START;
		},
		
		isAllowedZone: function (stage, zone) {
			var zoneStage = WorldConstants.getStage(zone);
			if (stage == zoneStage) return true;
			switch (zone) {
				case WorldConstants.ZONE_ENTRANCE:
				case WorldConstants.ZONE_EXTRA_CAMPABLE:
				case WorldConstants.ZONE_CAMP_TO_PASSAGE:
					return true;
			}
			return false;
		},
		
		getCampAndStep: function (campOrdinal, step, offset) {
			let resultOrdinal = campOrdinal;
			let resultStep = step;
			let currentOffset = offset;
			while (currentOffset > 0) {
				if (resultOrdinal == 15 && resultStep == WorldConstants.CAMP_STEP_END) break;
				currentOffset--;
				resultStep++;
				if (resultStep > WorldConstants.CAMP_STEP_END) {
					resultOrdinal++;
					resultStep = WorldConstants.CAMP_STEP_START;
				}
			}
			while (currentOffset < 0) {
				if (resultOrdinal == 1 && resultStep == WorldConstants.CAMP_STEP_START) break;
				currentOffset++;
				resultStep--;
				if (resultStep < WorldConstants.CAMP_STEP_START) {
					resultOrdinal--;
					resultStep = WorldConstants.CAMP_STEP_END;
				}
			}
			return { campOrdinal: resultOrdinal, step: resultStep };
		},
		
		isHigherCampOrdinalAndStage: function (campOrdinal, campStage, campOrdinal2, campStage2) {
			if (campOrdinal > campOrdinal2)
				return true;
			if (campOrdinal == campOrdinal2 && campStage == WorldConstants.CAMP_STAGE_LATE && campStage2 == WorldConstants.CAMP_STAGE_EARLY)
				return true;
			return false;
		},
		
		isHigherOrEqualCampOrdinalAndStage: function (campOrdinal, campStage, campOrdinal2, campStage2) {
			if (campOrdinal > campOrdinal2)
				return true;
			if (campOrdinal == campOrdinal2 && campStage == campStage2)
				return true;
			return false;
		},
		
		isHigherOrEqualCampOrdinalAndStep: function (campOrdinal, campStep, campOrdinal2, campStep2) {
			if (campOrdinal > campOrdinal2)
				return true;
			if (campOrdinal == campOrdinal2 && campStep >= campStep2)
				return true;
			return false;
		}
		
	};
	
	return WorldConstants;
	
});
