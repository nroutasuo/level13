define(['ash', 'worldcreator/WorldCreatorConstants','game/vos/ResourcesVO', 'game/vos/EnvironmentalHazardsVO'],
function (Ash, WorldCreatorConstants, ResourcesVO, EnvironmentalHazardsVO) {

    var SectorVO = Ash.Class.extend({
	
        constructor: function (position, isCampableLevel, notCampableReason, requiredResources) {
            this.id = Math.floor(Math.random() * 100000);
			this.position = position;
            this.level = position.level;
            this.campableLevel = isCampableLevel;
            this.notCampableReason = notCampableReason;
            this.requiredResources = requiredResources ? requiredResources : new ResourcesVO();
            
            this.isCamp = false;
            this.isPassageUp = false;
            this.isPassageDown = false;
            
            this.criticalPaths = [];
            this.locales = [];
			this.movementBlockers = {};
			this.passageUp = 0;
			this.passageDown = 0;
            this.sunlit = false;
            this.hazards = new EnvironmentalHazardsVO();
            this.hasSpring = false;
            this.resourcesScavengable = new ResourcesVO();
            this.resourcesCollectable = new ResourcesVO();
            this.numLocaleEnemies = {};
            
            this.distanceToCamp = -1;
        },
        
        isOnCriticalPath: function (type) {
            return this.criticalPaths.indexOf(type) >= 0;
        },
        
        isOnEarlyCriticalPath: function () {
            if (this.criticalPaths.indexOf(WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1) >= 0) return true;
            if (this.criticalPaths.indexOf(WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_CAMP) >= 0) return true;
            if (this.criticalPaths.indexOf(WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE) >= 0) return true;
            return false;
        },
        
        updateCriticalPath: function () {
            this.criticalPath = "-";
            for (var i = 0; i < this.criticalPaths.length; i++) {
                if (this.getCriticalPathPriority(this.criticalPaths[i] < this.getCriticalPathPriority(this.criticalPath))) {
                    var split = this.criticalPaths[i].split("_");
                    this.criticalPath = split[split.length - 1][0];
                }
            }
        },
        
        addToCriticalPath: function (type) {
            if (this.criticalPaths.indexOf(type) >= 0) return;
            this.criticalPaths.push(type);
            this.updateCriticalPath();
        },
        
        /*
        hasWater: function () {
            return this.hasSpring || this.resourcesScavengable.getResource(resourceNames.water) > 0 || this.resourcesCollectable.getResource(resourceNames.water) > 0;
        },
        
        isOnEarlyZone: function () {
            return this.zone == WorldConstants.ZONE_PASSAGE_TO_CAMP || this.zone == WorldConstants.ZONE_PASSAGE_TO_PASSAGE;
        },
		
		addBlocker: function (direction, blockerType, canOverride) {
            var existingType = this.movementBlockers[direction];
            if (existingType === blockerType) return;
            if (existingType) {
                log.w("movement blocker already exists:" + this.movementBlockers[direction] + " (trying to add: " + blockerType + ")");
                return;
            }
			this.movementBlockers[direction] = blockerType;
		},
		
		getBlockerByDirection: function (direction) {
			return this.movementBlockers[direction];
		},
        
        hasPassage: function () {
            return this.passageUp > 0 || this.passageDown > 0;
        },
        */
        
        getCriticalPathPriority: function (pathType) {
            if (!pathType) return 99;
            switch (pathType) {
                case this.CRITICAL_PATH_TYPE_CAMP_TO_POI_1: return 3;
                case this.CRITICAL_PATH_TYPE_CAMP_TO_POI_2: return 4;
                case this.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE: return 1;
                case this.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE: return 10;
                default: return 50;
            }
        },
        
        getZoneC: function () {
            return WorldCreatorConstants.getZoneOrdinal(this.zone);
        },
        
        getCriticalPathC: function () {
            for (var i = 0; i < WorldCreatorConstants.CRITICAL_PATHS_BY_ORDER.length; i++) {
                var path = WorldCreatorConstants.CRITICAL_PATHS_BY_ORDER[i];
                if (this.isOnCriticalPath(path)) return i;
            }
            return -1;
        },
		
    });

    return SectorVO;
});
