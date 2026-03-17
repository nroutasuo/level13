// Defines the given entity as a Level
define(['ash'], function (Ash) {
	
	let LevelComponent = Ash.Class.extend({
		
		position: 13,
		isCampable: false,
		notCampableReason: null,
		districts: [], // DistrictVO
		habitability: 1, // 0 for no camp, 0.5 outpost, 1 normal, >1 capital
		raidDangerFactor: 1,
		features: [],
		minX: 0,
		maxX: 0,
		minY: 0,
		maxY: 0,
		
		constructor: function (pos, isCampable, isHard, notCampableReason, districts, habitability, raidDangerFactor, features, minX, maxX, minY, maxY) {
			this.position = pos;
			this.isCampable = isCampable;
			this.isHard = isHard;
			this.notCampableReason = notCampableReason;
			this.districts = districts;
			this.habitability = habitability;
			this.raidDangerFactor = raidDangerFactor;
			this.features = features;
			this.minX = minX;
			this.maxX = maxX;
			this.minY = minY;
			this.maxY = maxY;
		}
	});

	return LevelComponent;
});
