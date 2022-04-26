define(['ash', 'game/constants/WorldConstants', 'worldcreator/WorldCreatorConstants', 'worldcreator/WorldCreatorLogger', 'game/vos/ResourcesVO', 'game/vos/EnvironmentalHazardsVO'],
function (Ash, WorldConstants, WorldCreatorConstants, WorldCreatorLogger, ResourcesVO, EnvironmentalHazardsVO) {

	var SectorVO = Ash.Class.extend({
	
		constructor: function (position, isCampableLevel, notCampableReason) {
			this.id = Math.floor(Math.random() * 100000);
			this.position = position;
			this.level = position.level;
			this.campableLevel = isCampableLevel;
			this.notCampableReason = notCampableReason;
			
			this.isCamp = false;
			this.isPassageUp = false;
			this.isPassageDown = false;
			
			this.requiredResources = new ResourcesVO();
			this.criticalPaths = [];
			this.criticalPathTypes = [];
			this.criticalPathIndices = [];
			this.locales = [];
			this.movementBlockers = {};
			this.passageUpType = null;
			this.passageDownType = null;
			this.sunlit = false;
			this.hazards = new EnvironmentalHazardsVO();
			this.hasSpring = false;
			this.hasTradeConnectorSpot = false;
			this.scavengeDifficulty = 5;
			this.resourcesScavengable = new ResourcesVO();
			this.resourcesCollectable = new ResourcesVO();
			this.itemsScavengeable = [];
			this.numLocaleEnemies = {};
			this.possibleEnemies = [];
			this.stashes = [];
			this.waymarks = [];
			
			this.distanceToCamp = -1;
		},
		
		isOnCriticalPath: function (type) {
			return this.criticalPathTypes.indexOf(type) >= 0;
		},
		
		isOnEarlyCriticalPath: function () {
			if (this.criticalPathTypes.indexOf(WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1) >= 0) return true;
			if (this.criticalPathTypes.indexOf(WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_CAMP) >= 0) return true;
			if (this.criticalPathTypes.indexOf(WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE) >= 0) return true;
			return false;
		},
		
		isOnPassageCriticalPath: function () {
			if (this.criticalPathTypes.indexOf(WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_CAMP) >= 0) return true;
			if (this.criticalPathTypes.indexOf(WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE) >= 0) return true;
			if (this.criticalPathTypes.indexOf(WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE) >= 0) return true;
			return false;
		},
		
		updateCriticalPath: function () {
			this.criticalPath = "-";
			for (let i = 0; i < this.criticalPathTypes.length; i++) {
				if (this.getCriticalPathPriority(this.criticalPathTypes[i] < this.getCriticalPathPriority(this.criticalPath))) {
					var split = this.criticalPathTypes[i].split("_");
					this.criticalPath = split[split.length - 1][0];
				}
			}
		},
		
		addToCriticalPath: function (path) {
			if (this.criticalPaths.indexOf(path) >= 0) return;
			let index = path.length;
			this.criticalPaths.push(path);
			this.criticalPathTypes.push(path.type);
			this.criticalPathIndices.push(index);
			path.length++;
			this.updateCriticalPath();
		},
		
		addBlocker: function (direction, blockerType, canOverride) {
			var existingType = this.movementBlockers[direction];
			if (existingType === blockerType) return;
			if (existingType) {
				WorldCreatorLogger.w("movement blocker already exists:" + this.movementBlockers[direction] + " (trying to add: " + blockerType + ")");
				return;
			}
			this.movementBlockers[direction] = blockerType;
		},
		
		getBlockerByDirection: function (direction) {
			return this.movementBlockers[direction];
		},
		
		hasWater: function () {
			return this.hasSpring || this.resourcesScavengable.getResource(resourceNames.water) > 0 || this.resourcesCollectable.getResource(resourceNames.water) > 0;
		},
		
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
			switch (this.zone) {
				case WorldConstants.ZONE_ENTRANCE:
					return "e";
				case WorldConstants.ZONE_PASSAGE_TO_CAMP:
					return "p";
				case WorldConstants.ZONE_POI_1:
					return "1";
				case WorldConstants.ZONE_POI_2:
					return "2";
				case WorldConstants.ZONE_CAMP_TO_PASSAGE:
					return "b";
				case WorldConstants.ZONE_EXTRA_CAMPABLE:
					return "x";
				case WorldConstants.ZONE_POI_TEMP:
					return "t";
				case WorldConstants.ZONE_PASSAGE_TO_PASSAGE:
					return "i";
				case WorldConstants.ZONE_EXTRA_UNCAMPABLE:
					return "x";
				default:
					WorldCreatorLogger.w("no debug char defined for zone " + this.zone);
					return WorldCreatorConstants.getZoneOrdinal(this.zone);
			}
		},
		
		getCriticalPathC: function () {
			for (let i = 0; i < WorldCreatorConstants.CRITICAL_PATHS_BY_ORDER.length; i++) {
				var path = WorldCreatorConstants.CRITICAL_PATHS_BY_ORDER[i];
				if (this.isOnCriticalPath(path)) return i;
			}
			return -1;
		},
		
		toString: function () {
			return "s-" + this.position;
		},
		
	});

	return SectorVO;
});
