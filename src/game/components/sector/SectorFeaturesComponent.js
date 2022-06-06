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
		waymarks: [],
		
		// resources
		scacengeDifficulty: 3,
		resourcesScavengable: null,
		resourcesCollectable: null,
		itemsScavengeable: [],
		
		constructor: function (level, criticalPaths, zone, buildingDensity, wear, damage, sectorType, sunlit, ground, surface, hazards,
							   campable, notCampableReason, resourcesScavengable, resourcesCollectable, itemsScavengeable, hasSpring, hasTradeConnectorSpot, stashes, waymarks) {
			this.level = level;
			this.criticalPaths = criticalPaths;
			this.zone = zone;
			this.buildingDensity = buildingDensity;
			this.wear = wear;
			this.damage = damage;
			this.sectorType = sectorType;
			this.sunlit = sunlit;
			this.ground = ground;
			this.surface = surface;
			this.hazards = hazards;
			this.campable = campable;
			this.notCampableReason = notCampableReason;
			this.resourcesScavengable = resourcesScavengable || new ResourcesVO();
			this.resourcesCollectable = resourcesCollectable || new ResourcesVO();
			this.itemsScavengeable = itemsScavengeable || [];
			this.hasSpring = hasSpring;
			this.hasTradeConnectorSpot = hasTradeConnectorSpot;
			this.stashes = stashes || [];
			this.waymarks = waymarks || [];
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
