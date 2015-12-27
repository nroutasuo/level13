// Level projects are improvements that affect the whole level but are built in the camp
define(['ash', 'game/vos/ImprovementVO'], function (Ash, ImprovementVO) {
    
    var LevelProjectVO = Ash.Class.extend({
	
        constructor: function (improvement, action, position, direction, name) {
			this.improvement = improvement;
			this.action = action;
			this.position = position;
			this.level = position.level;
			this.sector = position.sectorId();
            this.direction = direction;
			this.name = name;
			if (!this.name) {
				this.name = this.improvement.name;
			}
		},
	
    });

    return LevelProjectVO;
});
