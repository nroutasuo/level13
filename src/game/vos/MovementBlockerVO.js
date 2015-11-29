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
			
			this.actionDescription = this.getActionDescription();
			this.actionBaseID = this.getActionBaseId();
        },
		
		getActionDescription: function () {
			switch (this.type) {
				case 1: return "Bridge cap";
				case 2: return "Clear waste";
				case 3: return "Fight gang";
	 	 	}
		},
		
		getActionBaseId: function () {
			switch (this.type) {
				case 1: return "build_out_bridge";
				case 2: return "clear_waste";
				case 3: return "fight_gang";
	 	 	}
		},		
		
    });

    return MovementBlockerVO;
});
