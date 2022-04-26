define(['ash'], function (Ash) {
	
	var PerkVO = Ash.Class.extend({
	
		id: "",
		name: "",
		type: "",
		effect: 0,
		icon: "",
		
		timestamp: 0,
		
		startTimer: -1,
		startTimerDuration: -1,
		removeTimer: -1,
		removeTimerDuration: -1,
		
		effectFactor: 1,
	
		constructor: function (id, name, type, effect, icon, addTimestamp) {
			this.id = id;
			this.name = name;
			this.type = type;
			this.effect = effect;
			this.icon = icon;
			this.addTimestamp = addTimestamp;
		},
		
		setStartTimer: function (duration) {
			this.startTimer = duration;
			this.startTimerDuration = duration;
			if (duration != -1) this.removeTimer = -1;
		},
		
		setRemoveTimer: function (duration) {
			this.removeTimer = duration;
			this.removeTimerDuration = duration;
			if (duration != -1) this.startTimer = -1;
		},
	
		clone: function() {
			return new PerkVO(this.id, this.name, this.type, this.effect, this.icon, this.addTimestamp);
		},
	});

	return PerkVO;
});
