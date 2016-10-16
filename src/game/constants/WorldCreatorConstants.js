define(['ash'], function (Ash) {
    
    var WorldCreatorConstants = {
        
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
        
        CAMPS_BEFORE_GROUND: 9,
        CAMPS_AFTER_GROUND: 6,
        CAMPS_TOTAL: 15,
        LEVEL_NUMBER_MIN: 20,
        LEVEL_NUMBER_MAX: 24,
        
        SECTORS_PER_LEVEL_MIN: 100,
        DIAGONAL_PATH_PROBABILITY: 0.1,
        
        SECTOR_PATH_LENGTH_MIN: 10,
        SECTOR_PATH_LENGTH_MAX: 20,
        
        FIRST_CAMP_X: 1,
        FIRST_CAMP_Y: 0,
        LVL_13_PASSAGE_UP_X: 18,
        LVL_13_PASSAGE_UP_Y: 18,
        
        MIN_LEVEL_ORDINAL_HAZARD_RADIATION: 5,
        MIN_LEVEL_HAZARD_POISON: 15,
        
        getNumSectors: function (levelOrdinal) {
            return this.getNumSectorsCentral(levelOrdinal) * 1.1;
        },
        
        getNumSectorsCentral: function (levelOrdinal) {
            if (levelOrdinal < 2)
                return 100;
            if (levelOrdinal < 10)
                return 150;
            if (levelOrdinal < 15)
                return 200;
            return 300;
        }
    };
    
    return WorldCreatorConstants;
});
