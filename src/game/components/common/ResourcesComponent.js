// Defines the resources stored by an entity (player / (sector(camp) / tribe)
define(['ash', 'game/vos/ResourcesVO'], function (Ash, ResourcesVO) {
    
    var ResourcesComponent = Ash.Class.extend({
        
        resources: null,
        storageCapacity: 0,
        
        constructor: function (capacity) {
            this.resources = new ResourcesVO();
            this.storageCapacity = capacity;
            this.resetStorage();
        },
        
        resetStorage: function() {
            this.resources.reset();
        },
        
        limitToStorage: function() {
            if (this.storageCapacity >= 0) {
                for(var key in resourceNames) {
                    var name = resourceNames[key];
                    if (this.resources.getResource(name) > this.storageCapacity) {
                        this.resources.setResource(name, this.storageCapacity);
                    }
                }
            }
        },
        
        addResources: function(resourceVO) {
            for(var key in resourceNames) {
                var name = resourceNames[key];
                this.resources.addResource(name, resourceVO[name]);
            }
        },
    
        getResourceForLevel: function(lvl) {
            if (lvl < 0) {
                return resourceNames.herbs;
            }
            else {
                return resourceNames.fuel;
            }
        },
    });

    return ResourcesComponent;
});
