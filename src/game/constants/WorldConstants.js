define(['ash'], function (Ash) {
    
    var WorldConstants = {
    
        LEVEL_NUMBER_MIN: 25,
        LEVEL_NUMBER_MAX: 27,
        
        CAMPS_TOTAL: 15,
        
        CAMP_ORDINAL_LIMIT: 8,
        CAMP_ORDINAL_FUEL: 3,
        CAMP_ORDINAL_GREENHOUSE_1: 5,
        CAMP_ORDINAL_GREENHOUSE_2: 7,
        CAMP_ORDINAL_GROUND: 8,
        CAMPS_BEFORE_GROUND: 8,
        
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
        }
        
    };
    
    return WorldConstants;
    
});
