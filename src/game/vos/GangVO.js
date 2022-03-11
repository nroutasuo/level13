define(['ash', 'game/vos/PositionVO'], function (Ash, PositionVO) {

	var GangVO = Ash.Class.extend({
		
		pos: null,
		numEnemies: 0,
		
		constructor: function (pos1, pos2, enemyIDs) {
			this.pos1 = pos1;
			this.pos2 = pos2;
			this.pos = new PositionVO(pos1.level, (pos1.sectorX + pos2.sectorX) / 2, (pos1.sectorY + pos2.sectorY) / 2);
			this.enemyIDs = enemyIDs;
			this.numEnemies = 3;
		}
	
	});
	
	return GangVO;
});
