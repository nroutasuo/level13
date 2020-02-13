define(['ash', 'utils/MathUtils'], function (Ash, MathUtils) {
    
    var WorldCreatorConstants = {
        
        CRITICAL_PATH_TYPE_PASSAGE_TO_CAMP: "passage_to_camp",
        CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE: "camp_to_passage",
        CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE: "passage_to_passage",
        CRITICAL_PATH_TYPE_CAMP_TO_POI_1: "camp_to_poi_1",
        CRITICAL_PATH_TYPE_CAMP_TO_POI_2: "camp_to_poi_2",
        
        ZONE_ENTRANCE: "z_e",
        ZONE_PASSAGE_TO_CAMP: "z_p2c",
        ZONE_PASSAGE_TO_PASSAGE: "z_p2p",
        ZONE_POI_1: "z_poi1",
        ZONE_POI_2: "z_poi2",
        ZONE_CAMP_TO_PASSAGE: "z_c2p",
        ZONE_EXTRA_CAMPABLE: "z_extra_c",
        ZONE_EXTRA_UNCAMPABLE: "z_extra_u",
        ZONE_POI_TEMP: "z_poi_temp",
        
        CAMP_STEP_PREVIOUS: 0,  // passage to level sector
        CAMP_STEP_START: 1,     // zones up to and including POI_1
        CAMP_STEP_POI_2: 2,     // zone POI_2
        CAMP_STEP_END: 3,       // zones after POI_2
        
        // Sector features
        SECTOR_TYPE_RESIDENTIAL: "residential",
        SECTOR_TYPE_INDUSTRIAL: "industrial",
        SECTOR_TYPE_MAINTENANCE: "maintenance",
        SECTOR_TYPE_COMMERCIAL: "commercial",
        SECTOR_TYPE_SLUM: "slum",
        
        BUILDING_STYLE_RECENT: 0,
        BUILDING_STYLE_PROSPERITY_RICH: 1,
        BUILDING_STYLE_PROSPERITY_QUICK: 2,
        BUILDING_STYLE_URBAN_EUROPEAN: 3,
        BUILDING_STYLE_URBAN_AFRICAN: 4,
        BUILDING_STYLE_URBAN_ASIAN: 5,
        BUILDING_STYLE_HISTORICAL: 6,
        
        CAMPS_BEFORE_GROUND: 8,
        CAMPS_AFTER_GROUND: 7,
        CAMPS_TOTAL: 15,
        LEVEL_NUMBER_MIN: 25,
        LEVEL_NUMBER_MAX: 27,
        
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
        
        FIRST_CAMP_X: 1,
        FIRST_CAMP_Y: 0,
        
        CAMP_ORDINAL_LIMIT: 7,
        
        MIN_LEVEL_ORDINAL_HAZARD_RADIATION: 5,
        MIN_LEVEL_ORDINAL_HAZARD_POISON: 3,
        
        MAX_SCOUT_LOCALE_STAMINA_COST: 500,
        
        CAMP_ORDINAL_BAG_2: 3,
        CAMP_ORDINAL_BAG_3: 6,
        CAMP_ORDINAL_BAG_4: 10,
        CAMP_ORDINAL_BAG_5: 14,
        
        BAG_BONUS_1: 30,
        BAG_BONUS_2: 40,
        BAG_BONUS_3: 50,
        BAG_BONUS_4: 80,
        BAG_BONUS_5: 100,
        BAG_BONUS_6: 150,
        
        isStartPosition: function (pos) {
            return pos.level === 13 && pos.sectorX === this.FIRST_CAMP_X && pos.sectorY == this.FIRST_CAMP_Y;
        },
        
        getNumSectors: function (campOrdinal, isSmall) {
            if (isSmall) return 80;
            if (campOrdinal < 2)
                return 110;
            if (campOrdinal < WorldCreatorConstants.CAMPS_BEFORE_GROUND)
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
                    var maxScoutCost = WorldCreatorConstants.MAX_SCOUT_LOCALE_STAMINA_COST;
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
        
        getBagBonus: function (levelOrdinal) {
            if (levelOrdinal < this.CAMP_ORDINAL_BAG_2) {
                return this.BAG_BONUS_1;
            }
            if (levelOrdinal < this.CAMP_ORDINAL_BAG_3) {
                return this.BAG_BONUS_2;
            }
            if (levelOrdinal < this.CAMP_ORDINAL_BAG_4) {
                return this.BAG_BONUS_3;
            }
            if (levelOrdinal < this.CAMP_ORDINAL_BAG_5) {
                return this.BAG_BONUS_4;
            }
            return this.BAG_BONUS_5;
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
                case WorldCreatorConstants.ZONE_ENTRANCE: return 0;
                // campable levels
                case WorldCreatorConstants.ZONE_PASSAGE_TO_CAMP: return 1;
                case WorldCreatorConstants.ZONE_POI_1: return 2;
                case WorldCreatorConstants.ZONE_POI_2: return 3;
                case WorldCreatorConstants.ZONE_CAMP_TO_PASSAGE: return 4;
                case WorldCreatorConstants.ZONE_EXTRA_CAMPABLE: return 5;
                case WorldCreatorConstants.ZONE_POI_TEMP: return 6;
                // uncampable levels
                case WorldCreatorConstants.ZONE_PASSAGE_TO_PASSAGE: return 1;
                case WorldCreatorConstants.ZONE_EXTRA_UNCAMPABLE: return 2;
                default:
                    log.w("no ordinal defined for zone: " + zone);
                    return 5;
            }
        },
        
        isEarlierZone: function (zone1, zone2) {
            return this.getZoneOrdinal(zone1) < this.getZoneOrdinal(zone2);
        },
        
        getCampStep: function (zone) {
            switch (zone) {
                // all levels
                case WorldCreatorConstants.ZONE_ENTRANCE: return WorldCreatorConstants.CAMP_STEP_PREVIOUS;
                // campable levels
                case WorldCreatorConstants.ZONE_PASSAGE_TO_CAMP: return WorldCreatorConstants.CAMP_STEP_START;
                case WorldCreatorConstants.ZONE_POI_1: return WorldCreatorConstants.CAMP_STEP_START;
                case WorldCreatorConstants.ZONE_POI_2: return WorldCreatorConstants.CAMP_STEP_POI_2;
                case WorldCreatorConstants.ZONE_CAMP_TO_PASSAGE: return WorldCreatorConstants.CAMP_STEP_END;
                case WorldCreatorConstants.ZONE_EXTRA_CAMPABLE: return WorldCreatorConstants.CAMP_STEP_END;
                case WorldCreatorConstants.ZONE_POI_TEMP: return WorldCreatorConstants.CAMP_STEP_END;
                // uncampable levels
                case WorldCreatorConstants.ZONE_PASSAGE_TO_PASSAGE: return WorldCreatorConstants.CAMP_STEP_END;
                case WorldCreatorConstants.ZONE_EXTRA_UNCAMPABLE: return WorldCreatorConstants.CAMP_STEP_END;
                default:
                    log.i("no camp step defined for zone: " + zone);
                    return 5;
            }
        }

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
