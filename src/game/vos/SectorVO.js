define(['ash', 'game/vos/ResourcesVO'], function (Ash, ResourcesVO) {

    var SectorVO = Ash.Class.extend({
	
		position: null,
        movementBlockers: {},
	
        constructor: function (position, isCampableLevel) {
			this.position = position;
            this.camp = false;
            this.campableLevel = isCampableLevel; // TODO define reasons for camping disabled: waste etc
            this.locales = [];
			this.movementBlockers = {};
            this.id = Math.floor(Math.random()*100000);
			this.passageUp = 0;
			this.passageDown = 0;
            this.resources = new ResourcesVO();
            this.movementBlockerCount = 0;
        },
		
		addBlocker: function (direction, blockerType) {
            this.movementBlockerCount++;
            if (this.position.level == 13 && this.position.sectorX == 5 && this.position.sectorY === 0) {
                console.log("add blocker " + direction + " " + blockerType + " " + this.id);
                console.log(this.movementBlockerCount);
                console.log(this.movementBlockers);
            }
			this.movementBlockers[direction] = blockerType;
            if (this.position.level == 13 && this.position.sectorX == 5 && this.position.sectorY === 0) {
                console.log(this.movementBlockers);
            }
		},
		
		getBlockerByDirection: function (direction) {
			return this.movementBlockers[direction];
		},
		
		hasBlockerOfType: function (blockerType) {
			for (var blockedDirection in this.movementBlockers) {
				if (this.movementBlockers[blockedDirection] === blockerType) return true;
			}
			return false;
		},
		
    });

    return SectorVO;
});
