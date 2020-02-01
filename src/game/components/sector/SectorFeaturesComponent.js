// A component that describes features of a sector, both functional (ability to build stuff)
// and purely aesthetic (description)
define(
    ['ash', 'game/constants/WorldCreatorConstants', 'game/vos/ResourcesVO'],
    function (Ash, WorldCreatorConstants, ResourcesVO) {
    
    var SectorFeaturesComponent = Ash.Class.extend({
        
        // Primary attributes
        level: 0,
        buildingDensity: 0,
        stateOfRepair: 0,
        sectorType: 0,
        
        criticalPaths: [],
        zone: null,
        
        sunlit: false,
        hazards: null,
        weather: false,
        campable: false,
        
        resourcesScavengable: null,
        resourcesCollectable: null,
        
        constructor: function (level, criticalPaths, zone, buildingDensity, stateOfRepair, sectorType, buildingStyle, sunlit, hazards, weather,
                               campable, notCampableReason, resourcesScavengable, resourcesCollectable, hasSpring, stash) {
            this.level = level;
            this.criticalPaths = criticalPaths;
            this.zone = zone;
            this.buildingDensity = buildingDensity;
            this.stateOfRepair = stateOfRepair;
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
                if (this.stateOfRepair > 7)      repairAdj = "quiet";
                else if (this.stateOfRepair > 5) repairAdj = "abandoned";
                else if (this.stateOfRepair > 2) repairAdj = "crumbling";
                else                             repairAdj = "ruined";
            } else {
                if (this.stateOfRepair > 5)      repairAdj = "";
                else                             repairAdj = "crumbling";
            }
            
            switch (this.sectorType) {
                case WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL: typeNoun = "residential"; break;
                case WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL: typeNoun = "industrial"; break;
                case WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE: typeNoun = "maintenance"; break;
                case WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL: typeNoun = "commercial"; break;
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
        
    });

    return SectorFeaturesComponent;
});
