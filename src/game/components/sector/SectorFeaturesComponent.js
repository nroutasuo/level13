// A component that describes features of a sector, both functional (ability to build stuff)
// and purely aesthetic (description)
define(
    ['ash', 'game/constants/GameConstants', 'game/constants/SectorConstants', 'game/constants/WorldConstants', 'game/vos/ResourcesVO'],
    function (Ash, GameConstants, SectorConstants, WorldConstants, ResourcesVO) {
    
    var SectorFeaturesComponent = Ash.Class.extend({
        
        // primary attributes
        level: 0,
        sectorType: 0,
        
        // description / atmosphere
        buildingDensity: 0,
        wear: 0,
        damage: 0,
        sunlit: false,
        ground: false,
        
        // pathfinding attributes
        criticalPaths: [],
        zone: null,
        
        // functionality
        hazards: null,
        campable: false,
        stashes: [],
        
        // resources
        resourcesScavengable: null,
        resourcesCollectable: null,
        
        constructor: function (level, criticalPaths, zone, buildingDensity, wear, damage, sectorType, sunlit, ground, hazards,
                               campable, notCampableReason, resourcesScavengable, resourcesCollectable, hasSpring, stashes) {
            this.level = level;
            this.criticalPaths = criticalPaths;
            this.zone = zone;
            this.buildingDensity = buildingDensity;
            this.wear = wear;
            this.damage = damage;
            this.sectorType = sectorType;
            this.sunlit = sunlit;
            this.ground = ground;
            this.hazards = hazards;
            this.campable = campable;
            this.notCampableReason = notCampableReason;
            this.resourcesScavengable = resourcesScavengable || new ResourcesVO();
            this.resourcesCollectable = resourcesCollectable || new ResourcesVO();
            this.hasSpring = hasSpring;
            this.stashes = stashes || [];
        },
        
        // Secondary attributes
        
        isOnCriticalPath: function (type) {
            if (type) {
                return this.criticalPathTypes.indexOf(type) >= 0;
            } else {
                return this.criticalPathTypes.length > 0;
            }
        },
        
        canHaveCamp: function () {
            return this.campable;
        },
        
        // Text functions
        
        getScaResourcesString: function (discoveredResources) {
            var s = "";
             for(var key in resourceNames) {
                var name = resourceNames[key];
                var amount = this.resourcesScavengable.getResource(name);
                if (amount > 0 && discoveredResources.indexOf(name) >= 0) {
                    var amountDesc =  "scarce";
                    if (amount > 3) amountDesc = "common"
                    if (amount > 7) amountDesc = "abundant"
                    if (GameConstants.isDebugVersion) amountDesc += " " + Math.round(amount);
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
        },
        
        isEarlyZone: function () {
            return WorldConstants.getStage(this.zone) == WorldConstants.CAMP_STAGE_EARLY;
        }
        
    });

    return SectorFeaturesComponent;
});
