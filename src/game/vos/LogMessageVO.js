define(['ash'], function (Ash) {
    
    var LogMessageVO = Ash.Class.extend({
        
	constructor: function (message, replacements, values) {
	    this.time = new Date();
	    this.message = message;
	    this.replacements = replacements ? replacements : [];
	    this.values = values ? values : [];
	    
	    this.loadedFromSave = false;	    
	    this.combined = 0;
	    this.text = this.createText();
        },
	
	setPending: function(visibleLevel, visibleSector, visibleInCamp) {
	    this.pendingLevel = visibleLevel;
	    this.pendingSector = visibleSector;
	    this.pendingInCamp = visibleInCamp;
	},
	
	setPendingOver: function() {
	    this.time = new Date();
	},
	
	createText: function() {
	    this.text = this.message;
	    
	    var value = 0;
	    var useValues = this.values.length > 0;
	    for (var i = 0; i < this.replacements.length; i++) {
		if (useValues) {
		    value = this.values[i];
		}
		if (value > 0 || !useValues) {
		    this.text = this.text.replace("$" + i, this.replacements[i]);
		} else {
		    this.text = this.text.replace("$" + i, "");
		}
		
		if (useValues) {
		    this.text = this.text.replace("#" + i, this.values[i]);
		}
	    }
	    
	    this.text = this.text.replace(/ ,/g, "");
	    if(this.text.substr(this.text.length - 1) != "." && this.text.substr(this.text.length - 1) != "!")
		this.text += ".";;
	    this.text = this.text.replace(/\, \./g, ".");
		
	    return this.text;
	},
	
	getText: function() {
	    if (!this.text) {
		this.createText();
	    }
	    return this.text;
	}
	
    });

    return LogMessageVO;
});
