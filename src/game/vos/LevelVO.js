define(['ash', 'game/constants/PositionConstants', 'game/vos/PositionVO'], function (Ash, PositionConstants, PositionVO) {

    var LevelVO = Ash.Class.extend({
	
		level: -1,
		levelOrdinal: -1,
		isCampable: false,
		centralAreaSize: 0,
		
		sectors: [],
		centralSectors: [],
		sectorsByPos: {},
		minX: 0,
		maxX: 0,
		minY: 0,
		maxY: 0,
	
        constructor: function (level, levelOrdinal, isCampable) {
			this.level = level;
			this.levelOrdinal = levelOrdinal;
			this.isCampable = isCampable;
			
			this.sectors = [];
			this.centralSectors = [];
			this.sectorsByPos = [];
			this.minX = 0;
			this.maxX = 0;
			this.minY = 0;
			this.maxY = 0;
        },
		
		addSector: function (sectorVO) {
			if (sectorVO === null) {
				console.log("WARN: tried to add null sector to a level");
			}
			
			if (this.hasSector(sectorVO.position.sectorX, sectorVO.position.sectorY)) {
				console.log("WARN: Level aready contains sector " + sectorVO.position + " " + this.getSector(sectorVO.position.sectorX, sectorVO.position.sectorY).position);
			}
			
			this.sectors.push(sectorVO);
			
			if (this.isCentral(sectorVO.position.sectorX, sectorVO.position.sectorY)) this.centralSectors.push(sectorVO);
			
			if (!this.sectorsByPos[sectorVO.position.sectorX]) this.sectorsByPos[sectorVO.position.sectorX] = {};
			this.sectorsByPos[sectorVO.position.sectorX][sectorVO.position.sectorY] = sectorVO;
			
			this.minX = Math.min(this.minX, sectorVO.position.sectorX);
			this.maxX = Math.max(this.maxX, sectorVO.position.sectorX);
			this.minY = Math.min(this.minY, sectorVO.position.sectorY);
			this.maxY = Math.max(this.maxY, sectorVO.position.sectorY);
		},
		
		hasSector: function (sectorX, sectorY) {
			var colList = this.sectorsByPos[sectorX];
			if (colList) {
				var sector = this.sectorsByPos[sectorX][sectorY];
				if (sector != null && typeof sector !== 'undefined') {
					return true;
				}
			}
			return false;
		},
		
		getSector: function (sectorX, sectorY) {
			return this.hasSector(sectorX, sectorY) ? this.sectorsByPos[sectorX][sectorY] : null;
		},
		
		isCentral: function (sectorX, sectorY) {
			return PositionConstants.isPositionInArea(new PositionVO(this.level, sectorX, sectorY), this.centralAreaSize);
		},
		
    });

    return LevelVO;
});
