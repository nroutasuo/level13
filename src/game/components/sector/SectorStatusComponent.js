// Current sector control status & wins needed
define(['ash'], function (Ash) {
    
    var SectorStatusComponent = Ash.Class.extend({
        
        discoveredResources: [],
        scouted: false,
        
        constructor: function () {
            this.discoveredResources = [];
            this.scouted = false;
        },
        
        addDiscoveredResource: function (name) {
            if (this.discoveredResources.indexOf(name) < 0) {
                this.discoveredResources.push(name);
            }
        }
        
    });

    return SectorStatusComponent;
});
