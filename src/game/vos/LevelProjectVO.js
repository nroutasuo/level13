// Level projects are improvements that affect the whole level but are built in the camp
define(['ash', 'game/vos/ImprovementVO'], function (Ash, ImprovementVO) {
	
	var LevelProjectVO = Ash.Class.extend({
	
		constructor: function (improvement, action, position, direction, name, actionLabel) {
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
			this.actionLabel = actionLabel;
			if (!this.actionLabel) {
				this.actionLabel = "build";
			}
		},
		
		getID: function () {
			return this.action + "_" + this.level + "_" + this.position.sectorX + "_" + this.position.sectorY + "_" + this.direction;
		},
		
		isColonyProject: function () {
			return this.action.indexOf("space") >= 0 || (this.improvement && this.improvement.name.indexOf("Colony") >= 0);
		}
	
	});

	return LevelProjectVO;
});
