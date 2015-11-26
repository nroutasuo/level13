// marks the sector as having a workshop and defines the resource associated with the workshop
define(['ash'], function (Ash) {
    var WorkshopComponent = Ash.Class.extend({
        
        resource: null,
        
        constructor: function (resourceName) {
			this.resource = resourceName;
        },
        
    });

    return WorkshopComponent;
});
