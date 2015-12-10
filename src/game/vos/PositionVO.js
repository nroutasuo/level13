// Defines a coordinate position within the City (level, x, y)
define(['ash'], function (Ash) {

    var PositionVO = Ash.Class.extend({
	
		level: 0,
		sectorX: 0,
		sectorY: 0,
    
        constructor: function (level, sectorX, sectorY) {
			this.level = level;
			this.sectorX = sectorX;
			this.sectorY = sectorY;
        },
		
		toString: function () {
			return this.level + "." + this.sectorX + "." + this.sectorY;
		},
		
		clone: function () {
			return new PositionVO(this.level, this.sectorX, this.sectorY);
		},
    });

    return PositionVO;
});
