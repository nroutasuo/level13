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
        FIRST_SECTOR: 1,
        LAST_SECTOR: 10,
    };
    
    return WorldCreatorConstants;
});
