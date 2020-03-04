// A component that describes features of a sector, both functional (ability to build stuff)
// and purely aesthetic (description)
define(
    ['ash', 'game/constants/SectorConstants', 'game/constants/WorldCreatorConstants', 'game/vos/ResourcesVO'],
    function (Ash, SectorConstants, WorldCreatorConstants, ResourcesVO) {
    
    var SectorFeaturesComponent = Ash.Class.extend({
        
        // primary attributes
        level: 0,
        sectorType: 0,
        
        // description / atmosphere
        buildingDensity: 0,
        wear: 0,
        damage: 0,
        weather: false,
        sunlit: false,
        
        // pathfinding attributes
        criticalPaths: [],
        zone: null,
        
        // functionality
        hazards: null,
        campable: false,
        
        // resources
        resourcesScavengable: null,
        resourcesCollectable: null,
        
        constructor: function (level, criticalPaths, zone, buildingDensity, wear, damage, sectorType, buildingStyle, sunlit, hazards, weather,
                               campable, notCampableReason, resourcesScavengable, resourcesCollectable, hasSpring, stash) {
            this.level = level;
            this.criticalPaths = criticalPaths;
            this.zone = zone;
            this.buildingDensity = buildingDensity;
            this.wear = wear;
            this.damage = damage;
            this.sectorType = sectorType;
            this.buildingStyle = buildingStyle,
            this.sunlit = sunlit;
            this.hazards = hazards;
            this.weather = weather;
            this.campable = campable;
            this.notCampableReason = notCampableReason;
            this.resourcesScavengable = resourcesScavengable || new ResourcesVO();
            this.resourcesCollectable = resourcesCollectable || new ResourcesVO();
            this.hasSpring = hasSpring;
            this.stash = stash || null;
        },
        
        // Secondary attributes
        
        isOnCriticalPath: function (type) {
            return this.criticalPaths.indexOf(type) >= 0;
        },
        
        canHaveCamp: function () {
            return this.campable;
        },
        
        // Text functions
        
        getSectorTypeName: function (hasLight, hasCamp) {
            var densityAdj = "";
            var repairAdj = "";
            var typeNoun = "";
            var genericNoun = "";
        
            if (this.buildingDensity > 8)      densityAdj = "narrow";
            else if (this.buildingDensity < 1) densityAdj = "emty";
            else                               densityAdj = "";
            
            if (hasLight) {
                if (this.wear < 3)      repairAdj = "quiet";
                else if (this.wear < 5) repairAdj = "abandoned";
                else if (this.wear < 7) repairAdj = "crumbling";
                else                             repairAdj = "ruined";
            } else {
                if (this.wear < 5)      repairAdj = "";
                else                             repairAdj = "crumbling";
            }
            
            switch (this.sectorType) {
                case WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL: typeNoun = "residential"; break;
                case WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL: typeNoun = "industrial"; break;
                case WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE: typeNoun = "maintenance"; break;
                case WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL: typeNoun = "commercial"; break;
                case WorldCreatorConstants.SECTOR_TYPE_PUBLIC: typeNoun = "public"; break;
                case WorldCreatorConstants.SECTOR_TYPE_SLUM: typeNoun = "slum"; break;
            }
                 
            if (this.buildingDensity > 9)       genericNoun = "passage";
            if (this.buildingDensity > 8)       genericNoun = "corridor";
            else if (this.buildingDensity > 4)  genericNoun = "street";
            else if (this.buildingDensity > 0)  genericNoun = "square";
            else genericNoun = "sector";
           
            var wholeNoun = typeNoun + " " + genericNoun;
            if (this.sectorType === WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL && this.buildingDensity > 8) {
                wholeNoun = "back alley";
            }
            
            if (hasCamp) {
                return genericNoun + " with camp";
            } else if (hasLight) {
                return repairAdj + " " + wholeNoun;
            } else {
                return "dark" + " " + repairAdj + " " + densityAdj + " " + genericNoun;
            }
        },
        
        getScaResourcesString: function (discoveredResources) {
            var s = "";
             for(var key in resourceNames) {
                var name = resourceNames[key];
                var amount = this.resourcesScavengable.getResource(name);
                if (amount > 0 && discoveredResources.indexOf(name) >= 0) {
                    var amountDesc = "scarce";
                    if (amount > 3) amountDesc = "common"
                    if (amount > 7) amountDesc = "abundant"
                    s += key + " (" + amountDesc + "), ";
                }
            }
            if (s.length > 0) return s.substring(0, s.length - 2);
            else if (this.resourcesScavengable.getTotal() > 0) return "Unknown";
            else return "None";
        },
        
        getCondition: function () {
            if (this.damage > 7 || this.wear > 9)
                return SectorConstants.SECTOR_CONDITION_RUINED;
            if (this.damage > 0)
                return SectorConstants.SECTOR_CONDITION_DAMAGED;
            if (this.wear > 7)
                return SectorConstants.SECTOR_CONDITION_ABANDONED;
            if (this.wear > 4)
                return SectorConstants.SECTOR_CONDITION_WORN;
            if (this.wear > 0)
                return SectorConstants.SECTOR_CONDITION_RECENT;
            return SectorConstants.SECTOR_CONDITION_MAINTAINED;
        }
        
    });

    return SectorFeaturesComponent;
});
