// A component that describes features of a sector, both functional (ability to build stuff)
// and purely aesthetic (description)
define(
	['ash', 'game/constants/GameConstants', 'game/constants/SectorConstants', 'game/constants/WorldConstants', 'game/vos/ResourcesVO'],
	function (Ash, GameConstants, SectorConstants, WorldConstants, ResourcesVO) {
	
	let SectorFeaturesComponent = Ash.Class.extend({
		
		// primary attributes
		level: 0,
		
		// description / atmosphere
		sectorType: 0, // SectorConstants
		sectorStyle: null, // SectorConstants
		activity: 0, // 0-10
		buildingDensity: 0, // 0-10
		wealth: 0, // 0-10 where 1 is poorest, 0 is N/A
		wear: 0, // 0-10
		damage: 0, // 0-10
		sunlit: false,
		ground: false,
		surface: false,
		levelFeatures: [], // list of type
		
		// pathfinding attributes
		isOnCriticalPath: false,
		zone: null,
		
		// functionality
		hazards: null,
		campable: false,
		hasSpring: false,
		hasTradeConnectorSpot: false,
		isInvestigatable: false,
		stashes: [],
		waymarks: [],
		examineSpots: [],
		
		// resources and items
		resourcesScavengable: null,
		resourcesCollectable: null,
		heapResource: null,
		itemsScavengeable: [],
		
		constructor: function (level, features) {
			this.level = level;
			this.levelFeatures = features.levelFeatures || [];
			this.zone = features.zone;
			this.activity = features.activity;
			this.buildingDensity = features.buildingDensity;
			this.wealth = features.wealth;
			this.wear = features.wear;
			this.damage = features.damage;
			this.sectorType = features.sectorType;
			this.sectorStyle = features.sectorStyle;
			this.sunlit = features.sunlit || false;
			this.ground = features.ground || false;
			this.surface = features.surface || false;
			this.hazards = features.hazards || null;
			this.campable = features.isCamp || false;
			this.resourcesScavengable = features.resourcesScavengable || new ResourcesVO();
			this.resourcesCollectable = features.resourcesCollectable || new ResourcesVO();
			this.itemsScavengeable = features.itemsScavengeable || [];
			this.hasSpring = features.hasSpring || false;
			this.hasTradeConnectorSpot = features.hasTradeConnectorSpot || false;
			this.isInvestigatable = features.isInvestigatable || false;
			this.isOnCriticalPath = features.isOnCriticalPath || false;
			this.stashes = features.stashes || [];
			this.waymarks = features.waymarks || [];
			this.heapResource = features.heapResource || null;
			this.examineSpots = features.examineSpots || [];
			this.graffiti = features.graffiti || null;
		},
		
		// Secondary attributes
		
		canHaveCamp: function () {
			return this.campable;
		},

		hasHazards: function () {
			return this.hazards && this.hazards.hasHazards();
		},

		hasFeature: function (featureType) {
			return this.levelFeatures.indexOf(featureType) >= 0;
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
