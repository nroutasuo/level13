define(['ash'], function (Ash) {
	
    var passageTypes = {
        1: [ "Hole" ],
		2: [ "Elevator" ],
		3: [ "Staircase" ],
    };
    
    var PassageVO = Ash.Class.extend({
	
        constructor: function (type) {
			this.type = type;
			
			if (!passageTypes[type]) console.log("WARN: No such passage type: " + type);
			
			this.name = passageTypes[type][0];
			
			this.crossable = type === 3;
			this.climbable = type === 2;
			this.flyable = type === 2 || type === 1;
        },
    });

    return PassageVO;
});
