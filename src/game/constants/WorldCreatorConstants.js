define(['ash', 'utils/MathUtils'], function (Ash, MathUtils) {
    
    var WorldCreatorConstants = {
        
        CRITICAL_PATH_TYPE_CAMP_TO_WORKSHOP: "camp_to_workshop",
        CRITICAL_PATH_TYPE_CAMP_TO_LOCALE_1: "camp_to_locale_1",
        CRITICAL_PATH_TYPE_CAMP_TO_LOCALE_2: "camp_to_locale_2",
        CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE: "camp_to_passage",
        CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE: "passage_to_passage",
        CRITICAL_PATH_TYPE_CAMP_TO_CAMP: "camp_to_camp",
        
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
        
        MIN_LEVEL_ORDINAL_HAZARD_RADIATION: 10,
        MIN_LEVEL_HAZARD_POISON: 15,
        
        MAX_SCOUT_LOCALE_STAMINA_COST: 500,
        
        LEVEL_ORDINAL_BAG_2: 2,
        LEVEL_ORDINAL_BAG_3: 6,
        LEVEL_ORDINAL_BAG_4: 10,
        LEVEL_ORDINAL_BAG_5: 14,
        LEVEL_ORDINAL_BAG_6: 18,
        
        BAG_BONUS_1: 30,
        BAG_BONUS_2: 40,
        BAG_BONUS_3: 50,
        BAG_BONUS_4: 80,
        BAG_BONUS_5: 100,
        BAG_BONUS_6: 150,
        
        getNumSectors: function (levelOrdinal) {
            return Math.round(this.getNumSectorsCentral(levelOrdinal) * 1.15);
        },
        
        getNumSectorsCentral: function (levelOrdinal) {
            if (levelOrdinal < 2)
                return 100;
            if (levelOrdinal < 10)
                return 150;
            if (levelOrdinal < 15)
                return 200;
            return 300;
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
            var maxLength = maxStamina / movementCost;
            
            var deductScouts = true;
            var deductScavenges = true;

            switch (pathType) {
                case this.CRITICAL_PATH_TYPE_CAMP_TO_LOCALE_1:
                case this.CRITICAL_PATH_TYPE_CAMP_TO_LOCALE_2:
                    // there, scout and back (these paths have a lot of points so less strict -> faster world creation)
                    var maxScoutCost = WorldCreatorConstants.MAX_SCOUT_LOCALE_STAMINA_COST;
                    maxLength = (maxLength - maxScoutCost / movementCost) / 2;
                    deductScouts = false;
                    deductScavenges = false;
                    break;
                case this.CRITICAL_PATH_TYPE_CAMP_TO_WORKSHOP:
                    // there, fight and back
                    var fightCost = 10 * 3;
                    maxLength = (maxLength - fightCost / movementCost) / 2;
                    deductScouts = false;
                    break;
                case this.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE:
                    // there and back
                    // must be smaller than CAMP_TO_CAMP because that one can me CAMP_TO_PASSAGE + PASSAGE_TO_PASSAGE + CAMP_TO_PASSAGE
                    maxLength = maxLength / 3;
                    break;
                case this.CRITICAL_PATH_TYPE_CAMP_TO_CAMP:
                    // only need to make it there
                    break;
                case this.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE:
                    // there and back
                    // must be smaller than CAMP_TO_CAMP because that one can me CAMP_TO_PASSAGE + PASSAGE_TO_PASSAGE + CAMP_TO_PASSAGE
                    maxLength = maxLength / 3;
                    break;
                default:
                    console.log("WARN: Unknown path type: " + pathType);
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
            if (levelOrdinal < this.LEVEL_ORDINAL_BAG_2) {
                return this.BAG_BONUS_1;
            }
            if (levelOrdinal < this.LEVEL_ORDINAL_BAG_3) {
                return this.BAG_BONUS_2;
            }
            if (levelOrdinal < this.LEVEL_ORDINAL_BAG_4) {
                return this.BAG_BONUS_3;
            }
            if (levelOrdinal < this.LEVEL_ORDINAL_BAG_5) {
                return this.BAG_BONUS_4;
            }
            if (levelOrdinal < this.LEVEL_ORDINAL_BAG_6) {
                return this.BAG_BONUS_5;
            }
            return this.BAG_BONUS_6;
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
        }
    };
    
    return WorldCreatorConstants;
});
