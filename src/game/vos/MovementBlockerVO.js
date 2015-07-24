define(['ash'], function (Ash) {
	
    var blockerTypes = {
        1: [ "Gap" ],
	2: [ "Toxic Waste" ],
	3: [ "Gang" ],
    };
    
    var MovementBlockerVO = Ash.Class.extend({
	
        constructor: function (type) {
	    this.type = type;
	    
	    if (!blockerTypes[type]) console.log("WARN: No such blocker type: " + type);
	    
	    this.name = blockerTypes[type][0];
	    this.bridgeable = type == 1;
	    this.cleanable = type == 2;
	    this.defeatable = type == 3;
	    this.flyable = type == 1 || type == 2;
        },
    });

    return MovementBlockerVO;
});
