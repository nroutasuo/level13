define(['ash', 'game/constants/PlayerStatConstants', 'game/constants/WorldConstants', 'utils/MathUtils'],
function (Ash, PlayerStatConstants, WorldConstants, MathUtils) {
    
    var WorldCreatorConstants = {
        
        CRITICAL_PATH_TYPE_PASSAGE_TO_CAMP: "passage_to_camp",
        CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE: "camp_to_passage",
        CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE: "passage_to_passage",
        CRITICAL_PATH_TYPE_CAMP_TO_POI_1: "camp_to_poi_1",
        CRITICAL_PATH_TYPE_CAMP_TO_POI_2: "camp_to_poi_2",
        
        BUILDING_STYLE_RECENT: 0,
        BUILDING_STYLE_PROSPERITY_RICH: 1,
        BUILDING_STYLE_PROSPERITY_QUICK: 2,
        BUILDING_STYLE_URBAN_EUROPEAN: 3,
        BUILDING_STYLE_URBAN_AFRICAN: 4,
        BUILDING_STYLE_URBAN_ASIAN: 5,
        BUILDING_STYLE_HISTORICAL: 6,
        
        DIAGONAL_PATH_PROBABILITY: 0.1,
        
        SURFACE_BLAST_RADIUS: 10,
        BELOW_SURFACE_BLAST_RADIUS: 6,
        CENTRAL_CORRIDOR_RADIUS: 5,
        TOWER_RADIUS: 20,
        
        MIN_CENTRAL_AREA_SIZE: 10,
        MAX_CENTRAL_AREA_SIZE: 25,
        SECTOR_PATH_LENGTH_MIN: 6,
        SECTOR_PATH_LENGTH_MAX: 15,
        SECTOR_RECT_EDGE_LENGTH_MAX: 20,
        
        MIN_LEVEL_ORDINAL_HAZARD_RADIATION: 5,
        MIN_LEVEL_ORDINAL_HAZARD_POISON: 3,
        
        getNumSectors: function (campOrdinal, isSmall) {
            if (isSmall) return 80;
            if (campOrdinal < 2)
                return 110;
            if (campOrdinal < WorldConstants.CAMPS_BEFORE_GROUND)
                return 170;
            if (campOrdinal < 12)
                return 190;
            return 200;
        },
        
        getNumSectorsCentral: function (campOrdinal, isSmall) {
            return Math.round(this.getNumSectors(campOrdinal, isSmall) * 0.8);
        },
        
        // max length of a path (limited by stamina) on the given camp ordinal
        // if a path spans several levels, lowest ordinal should be used
        getMaxPathLength: function (campOrdinal, pathType) {
            // TODO get rid of hard-coded values
            var movementCost = 10;
            if (campOrdinal > 1) movementCost = 9;
            if (campOrdinal > 7) movementCost = 8;
            var maxStamina = 1000;
            if (campOrdinal > 12) maxStamina = 1250;
            var movementCostLevel = movementCost * 10;
            var maxLength = maxStamina / movementCost;
            
            var deductScouts = true;
            var deductScavenges = true;

            switch (pathType) {
                case this.CRITICAL_PATH_TYPE_CAMP_TO_POI_1:
                case this.CRITICAL_PATH_TYPE_CAMP_TO_POI_2:
                    // there, scout/fight and back (these paths have a lot of points so less strict -> faster world creation)
                    var maxScoutCost = PlayerStatConstants.MAX_SCOUT_LOCALE_STAMINA_COST;
                    var fightCost = 10 * 3;
                    var actionCost = Math.max(fightCost, maxScoutCost);
                    maxLength = (maxLength - actionCost / movementCost) / 2;
                    deductScouts = false;
                    deductScavenges = false;
                    break;
                case this.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE:
                case this.CRITICAL_PATH_TYPE_PASSAGE_TO_CAMP:
                case this.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE:
                    // one there, but the whole route can be CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE  + CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE + CRITICAL_PATH_TYPE_PASSAGE_TO_CAMP
                    maxLength = maxLength / 3 - movementCostLevel / movementCost;
                    break;
                default:
                    log.w("Unknown path type: " + pathType);
                    break;
            }
            
            if (deductScouts) {
                var scoutCost = 5;
                var numScouts = MathUtils.clamp(Math.round(maxLength / 5), 1, 10);
                maxLength = maxLength - numScouts * scoutCost / movementCost;
            }
            
            if (deductScavenges) {
                var scavengeCost = 3;
                var numScavenges = MathUtils.clamp(Math.round(maxLength / 5), 1, 10);
                maxLength = maxLength - numScavenges * scavengeCost / movementCost;
            }
            
            var ordinalFactor = campOrdinal === 1 ? 0.85 : 1;
            maxLength = maxLength * ordinalFactor;
            
            return Math.floor(maxLength);
        },
        
        getPopulationGrowthFactor: function (campOrdinal) {
            if (campOrdinal <= 0) return 0;
            switch (campOrdinal) {
                // outposts
                case 3:
                case 5:
                case 7:
                case 8:
                case 10:
                case 11:
                case 14:
                    return 0.5;
                    
                // capital
                case 13:
                    return 1.5;
                    
                // regular camps
                default:
                    return 1;
            }
        },
        
        getZoneOrdinal: function (zone) {
            switch (zone) {
                // all levels
                case WorldConstants.ZONE_ENTRANCE: return 0;
                // campable levels
                case WorldConstants.ZONE_PASSAGE_TO_CAMP: return 1;
                case WorldConstants.ZONE_POI_1: return 2;
                case WorldConstants.ZONE_POI_2: return 3;
                case WorldConstants.ZONE_CAMP_TO_PASSAGE: return 4;
                case WorldConstants.ZONE_EXTRA_CAMPABLE: return 5;
                case WorldConstants.ZONE_POI_TEMP: return 6;
                // uncampable levels
                case WorldConstants.ZONE_PASSAGE_TO_PASSAGE: return 1;
                case WorldConstants.ZONE_EXTRA_UNCAMPABLE: return 2;
                default:
                    log.w("no ordinal defined for zone: " + zone);
                    return 5;
            }
        },
        
        isEarlierZone: function (zone1, zone2) {
            return this.getZoneOrdinal(zone1) < this.getZoneOrdinal(zone2);
        },

    };
    
    WorldCreatorConstants.CRITICAL_PATHS_BY_ORDER = [
            WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_CAMP,
            WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE,
            WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1,
            WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_2,
            WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE,
    ];
    
    return WorldCreatorConstants;
});
