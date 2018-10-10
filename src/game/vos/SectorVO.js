define(['ash', 'game/constants/WorldCreatorConstants','game/vos/ResourcesVO', 'game/vos/EnvironmentalHazardsVO'], 
function (Ash, WorldCreatorConstants, ResourcesVO, EnvironmentalHazardsVO) {

    var SectorVO = Ash.Class.extend({
	
		position: null,
        movementBlockers: {},
	
        constructor: function (position, isCampableLevel, notCampableReason, requiredResources) {
			this.position = position;
            this.level = position.level;
            this.campableLevel = isCampableLevel;
            this.notCampableReason = notCampableReason;
            this.criticalPaths = [];
            this.requiredResources = requiredResources ? requiredResources : new ResourcesVO();
            
            this.id = Math.floor(Math.random() * 100000);
            this.camp = false;
            this.locales = [];
			this.movementBlockers = {};
			this.passageUp = 0;
			this.passageDown = 0;
            this.sunlit = false;
            this.hazards = new EnvironmentalHazardsVO();
            this.hasSpring = false;
            this.resourcesRequired = new ResourcesVO();
            this.resourcesScavengable = new ResourcesVO();
            this.resourcesCollectable = new ResourcesVO();
            this.numLocaleEnemies = {};
        },
        
        isOnCriticalPath: function (type) {
            return this.criticalPaths.indexOf(type) >= 0;
        },
        
        isOnEarlyCriticalPath: function () {
            if (this.criticalPaths.indexOf(WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_LOCALE_1) >= 0) return true;
            if (this.criticalPaths.indexOf(WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE) >= 0) return true;
            if (this.criticalPaths.indexOf(WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_CAMP) >= 0) return true;
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
		
		addBlocker: function (direction, blockerType, canOverride) {
            var existingType = this.movementBlockers[direction];
            if (existingType === blockerType) return;
            if (existingType) {
                console.log("WARN: movement blocker already exists:" + this.movementBlockers[direction] + " (trying to add: " + blockerType + ")");
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
        
        getCriticalPathPriority: function (pathType) {
            if (!pathType) return 99;
            switch (pathType) {
                case this.CRITICAL_PATH_TYPE_CAMP_TO_LOCALE_1: return 3;
                case this.CRITICAL_PATH_TYPE_CAMP_TO_LOCALE_2: return 4;
                case this.CRITICAL_PATH_TYPE_CAMP_TO_WORKSHOP: return 2;
                case this.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE: return 1;
                case this.CRITICAL_PATH_TYPE_CAMP_TO_CAMP: return 5;
                case this.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE: return 10;
                default: return 50;
            }
        },
		
    });

    return SectorVO;
});
