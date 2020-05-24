// marks the sector as having a workshop and defines the resource associated with the workshop
// only added to clearable workshops that already exist on the map, not workshops that the player can build (greenhouse)
define(['ash'], function (Ash) {
    var WorkshopComponent = Ash.Class.extend({
        
        resource: null,
        
        constructor: function (resourceName) {
			this.resource = resourceName;
        },
        
    });

    return WorkshopComponent;
});
