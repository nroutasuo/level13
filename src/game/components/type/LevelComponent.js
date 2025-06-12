// Defines the given entity as a Level
define(['ash'], function (Ash) {
	
	let LevelComponent = Ash.Class.extend({
		
		position: 13,
		isCampable: false,
		notCampableReason: null,
		habitability: 1, // 0 for no camp, 0.5 outpost, 1 normal, >1 capital
		raidDangerFactor: 1,
		minX: 0,
		maxX: 0,
		minY: 0,
		maxY: 0,
		
		constructor: function (pos, isCampable, isHard, notCampableReason, habitability, raidDangerFactor, minX, maxX, minY, maxY) {
			this.position = pos;
			this.isCampable = isCampable;
			this.isHard = isHard;
			this.notCampableReason = notCampableReason;
			this.habitability = habitability;
			this.raidDangerFactor = raidDangerFactor;
			this.minX = minX;
			this.maxX = maxX;
			this.minY = minY;
			this.maxY = maxY;
		}
	});

	return LevelComponent;
});
