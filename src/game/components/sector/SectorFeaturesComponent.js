// A component that describes features of a sector, both functional (ability to build stuff)
// and purely aesthetic (description)
define(['ash', 'game/constants/WorldCreatorConstants'], function (Ash, WorldCreatorConstants) {
    
    var SectorFeaturesComponent = Ash.Class.extend({
        
        // Primary attributes
        level: 0,
        buildingDensity: 0,
        stateOfRepair: 0,
        sectorType: 0,
        
        sunlit: false,
        weather: false,
        campable: false,
        
        resourcesScavengable: null,
        resourcesCollectable: null,
        
        constructor: function (level, buildingDensity, stateOfRepair, sectorType, buildingStyle, sunlit, weather, campable, notCampableReason, resourcesScavengable, resourcesCollectable) {
            this.level = level;
            this.buildingDensity = buildingDensity;
            this.stateOfRepair = stateOfRepair;
            this.sectorType = sectorType;
            this.buildingStyle = buildingStyle,
            this.sunlit = sunlit;
            this.weather = weather;
            this.campable = campable;
            this.notCampableReason = notCampableReason;
            this.resourcesScavengable = resourcesScavengable;
            this.resourcesCollectable = resourcesCollectable;
        },
        
        // Secondary attributes
        canHaveCamp: function () {
            return  this.campable &&
                    this.buildingDensity > 0 && this.buildingDensity < 9 &&
                    this.resourcesScavengable.water > 0 && this.resourcesScavengable.food > 0 && this.resourcesScavengable.fuel <= 0 &&
                    this.stateOfRepair > 2;
        },
        
        // Convenience
        getSectorTypeName: function (hasLight) {
            var densityAdj = "";
            var repairAdj = "";
            var typeNoun = "";
            var genericNoun = "";
        
            if (this.buildingDensity > 8)      densityAdj = "narrow";
            else if (this.buildingDensity < 1) densityAdj = "emty";
            else                               densityAdj = ""
            
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
            
            if (hasLight) {
                if (this.sectorType == WorldCreatorConstants.SECTOR_TYPE_SLUM) genericNoun = "";
                return repairAdj + " " + typeNoun + " " + genericNoun;
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
                    s += key + ", ";
                }
            }
            if (s.length > 0) return s.substring(0, s.length - 2);
            else if (this.resourcesScavengable.getTotal() > 0) return "Unknown";
            else return "None";
        },
        
        getColResourcesString: function () {
            var s = "";
             for(var key in resourceNames) {
                var name = resourceNames[key];
                var amount = this.resourcesCollectable.getResource(name);
                if (amount > 0) {
                    s += key + ", ";
                }
            }
            if (s.length > 0) return s.substring(0, s.length - 2);
            else if (this.resourcesCollectable.getTotal() > 0) return "Unknown";
            else return "None";
        },
        
    });

    return SectorFeaturesComponent;
});
