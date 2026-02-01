define(['ash', 'game/constants/WorldConstants', 'worldcreator/WorldCreatorConstants', 'worldcreator/WorldCreatorLogger', 'game/vos/ResourcesVO', 'game/vos/EnvironmentalHazardsVO'],
function (Ash, WorldConstants, WorldCreatorConstants, WorldCreatorLogger, ResourcesVO, EnvironmentalHazardsVO) {

	let SectorVO = Ash.Class.extend({
	
		constructor: function (position) {
			this.id = Math.floor(Math.random() * 100000);
			this.position = position;
			this.level = position.level;

			this.activity = 0; // 0-10
			this.buildingDensity = 0; // 0-10
			this.criticalPathTypes = [];
			this.damage = 0; // 0-10
			this.examineSpots = [];
			this.features = []; // list of type
			this.graffiti = 0;
			this.hasBuildableWorkshop = false;
			this.hasClearableWorkshop = false;
			this.hasHeap = false;
			this.hasRegularEnemies = false;
			this.hasSpring = false;
			this.hasTradeConnectorSpot = false;
			this.hasWorkshop = false;
			this.hazards = new EnvironmentalHazardsVO();
			this.heapResource = null;
			this.isCamp = false;
			this.isInvestigatable = false;
			this.isPassageDown = false;
			this.isPassageUp = false;
			this.itemsScavengeable = [];
			this.locales = [];
			this.movementBlockers = {};
			this.numLocaleEnemies = {}; // localeID -> int
			this.passageDownType = null;
			this.passageUpType = null;
			this.possibleEnemies = [];
			this.resourcesCollectable = new ResourcesVO();
			this.resourcesScavengable = new ResourcesVO();
			this.scavengeDifficulty = 5;
			this.sectorStyle = null;
			this.sectorType = null;
			this.stage = null;
			this.stashes = [];
			this.sunlit = 0;
			this.waymarks = [];
			this.wealth = 0; // 0-3
			this.wear = 0; // 0-10
			this.workshopResource = null;
			this.zone = null;
			
			this.resetCaches();
		},
		
		resetInternalData: function () {
			this.id = 0;
			delete this.campPosScore;
		},

		resetCaches: function () {
			this.distanceToCamp = -1;
			this.isConnectionPoint = false;
			delete this.pathID;
			this.requiredFeatures = {};
			this.requiredResources = new ResourcesVO();
		},
		
		isOnCriticalPath: function (type) {
			if (type) {
				return this.criticalPathTypes.indexOf(type) >= 0;
			} else{
				return this.criticalPathTypes.length > 0;
			}
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
		
		addToCriticalPath: function (path) {
			if (this.criticalPathTypes.indexOf(path.type) < 0) this.criticalPathTypes.push(path.type);
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

		hasMovementBlockers() {
			return Object.keys(this.movementBlockers).length > 0;	
		},
		
		hasWater: function () {
			return this.hasSpring || this.resourcesScavengable.getResource(resourceNames.water) > 0 || this.resourcesCollectable.getResource(resourceNames.water) > 0;
		},

		hasLocaleOfType: function (localeType) {
			for (let i = 0; i < this.locales.length; i++) {
				if (this.locales[i].type == localeType) return true;
			}
			return false;
		},

		hasStashWithLocaleType: function (localeType) {
			for (let i = 0; i < this.stashes.length; i++) {
				if (this.stashes[i].localeType == localeType) return true;
			}
			return false;
		},

		hasFeature: function (featureType) {
			return this.features.indexOf(featureType) >= 0;
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
