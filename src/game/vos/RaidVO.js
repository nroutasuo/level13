// describes a past raid on a camp
define(['ash', 'game/vos/ResourcesVO'], function (Ash, ResourcesVO) {
    
    var RaidVO = Ash.Class.extend({
	
        wasVictory: false,
        resourcesLost: null,
        timestamp: null, // end time
	
        constructor: function (raidComponent) {
            if (raidComponent) {
                this.wasVictory = raidComponent.victory;
                this.resourcesLost = raidComponent.resourcesLost;
                this.timestamp = new Date().getTime();
            }
            this.resourcesLost = new ResourcesVO();
        },
        
        isValid: function() {
            return this.timestamp != null && this.timestamp > 0;
        }
        
    });

    return RaidVO;
});
