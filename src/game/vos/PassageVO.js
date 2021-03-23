define(['ash'], function (Ash) {
	
	var passageTypes = {
		1: [ "Hole", "Elevator" ],
		2: [ "Elevator", "Elevator" ],
		3: [ "Stairwell", "Stairwell" ],
		4: [ "Stairwell", "Stairwell" ],
	};
	
	var PassageVO = Ash.Class.extend({
	
		constructor: function (type) {
			this.type = type;
			
			if (!passageTypes[type]) log.w("No such passage type: " + type);
			
			this.name = passageTypes[type][0];
			this.nameRepaired = passageTypes[type][1];
			
			this.crossable = type === 3;
			this.climbable = type === 2;
			this.flyable = type === 2 || type === 1;
		},
	});

	return PassageVO;
});
