define(['ash', 'game/vos/TradingPartnerVO'], function (Ash, TradingPartnerVO) {
    
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
        
        DIAGONAL_PATH_PROBABILITY: 0.1,
        
        MAX_CENTRAL_AREA_SIZE: 25,
        SECTOR_PATH_LENGTH_MIN: 10,
        SECTOR_PATH_LENGTH_MAX: 20,
        
        FIRST_CAMP_X: 1,
        FIRST_CAMP_Y: 0,
        LVL_13_PASSAGE_UP_X: 10,
        LVL_13_PASSAGE_UP_Y: 10,
        
        MIN_LEVEL_ORDINAL_HAZARD_RADIATION: 5,
        MIN_LEVEL_HAZARD_POISON: 15,
        
        LEVEL_ORDINAL_BAG_2: 5,
        LEVEL_ORDINAL_BAG_3: 10,
        LEVEL_ORDINAL_BAG_4: 15,
        
        BAG_BONUS_1: 30,
        BAG_BONUS_2: 50,
        BAG_BONUS_3: 80,
        BAG_BONUS_4: 150,
        
        TRADING_PARTNERS: [
            new TradingPartnerVO(3, "Bone Crossing", [resourceNames.rope], [resourceNames.metal], false),
            new TradingPartnerVO(4, "Slugger Town", [resourceNames.metal], [], false),
            new TradingPartnerVO(6, "Old Waterworks", [resourceNames.fuel], [], true),
            new TradingPartnerVO(7, "Mill Road Academy", [resourceNames.food, resourceNames.water], [resourceNames.metal], true),
            new TradingPartnerVO(9, "Bleaksey", [resourceNames.herbs], [resourceNames.medicine], false),
            new TradingPartnerVO(10, "Pinewood", [resourceNames.medicine], [], true),
            new TradingPartnerVO(12, "Highgate", [resourceNames.tools], [resourceNames.metal], true),
            new TradingPartnerVO(14, "Factory 32", [resourceNames.concrete], [resourceNames.metal], true),
        ],
        
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
            return this.BAG_BONUS_4;
        },
        
        getPopulationGrowthFactor: function (campOrdinal) {
            if (campOrdinal <= 0) return 0;
            switch (campOrdinal) {
                case 3:
                case 4:
                case 14:
                    return 0.5;
                    
                case 5:
                case 6:
                    return 0.25;
                
                case 7:
                case 8:
                case 15:
                    return 0.1;
                
                case 10:
                case 13:
                    return 2;                    
                    
                default:
                    return 1;
            }
        }
    };
    
    return WorldCreatorConstants;
});
