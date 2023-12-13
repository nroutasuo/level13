// Defines the resources stored by an entity (player / (sector(camp) / tribe)
define(['ash', 'game/vos/ResourcesVO'], function (Ash, ResourcesVO) {
	
	var ResourcesComponent = Ash.Class.extend({
		
		name: null,
		resources: null,
		storageCapacity: 0,
		
		constructor: function (name, capacity) {
			this.name = name;
			this.resources = new ResourcesVO(storageTypes.STORAGE);
			this.storageCapacity = capacity;
			this.resetStorage("new");
		},
		
		resetStorage: function (reason) {
			this.resources.reset(reason);
		},
		
		limitToStorage: function (fixNegatives) {
			var spilledResources = new ResourcesVO(storageTypes.RESULT);
			if (this.storageCapacity >= 0) {
				for (var key in resourceNames) {
					var name = resourceNames[key];
					if (this.resources.getResource(name) > this.storageCapacity) {
						spilledResources.addResource(name, this.resources.getResource(name) - this.storageCapacity, "limit");
						this.resources.setResource(name, this.storageCapacity, "limit");
					}
					if (fixNegatives && this.resources.getResource(name) < 0) {
						spilledResources.addResource(name, -this.resources.getResource(name), "fix negatives");
						this.resources.setResource(name, 0, "limit");
					}
				}
			}
			return spilledResources;
		},
		
		addResource: function (resourceName, amount, reason) {
			return this.resources.addResource(resourceName, amount, reason);
		},
		
		getResource: function (resourceName) {
			return this.resources.getResource(resourceName);
		},
		
		addResources: function (resourceVO) {
			if (resourceVO !== null) {
				for(var key in resourceNames) {
					var name = resourceNames[key];
					this.resources.addResource(name, resourceVO[name]);
				}
			}
		},
		
		substractResources: function (resourceVO) {
			if (resourceVO !== null) {
				for(var key in resourceNames) {
					var name = resourceNames[key];
					this.resources.addResource(name, -resourceVO[name]);
				}
			}
		},
		
		isAtCapacity: function () {
			let threshold = this.storageCapacity;
			for (let key in resourceNames) {
				let name = resourceNames[key];
				if (this.resources.getResource(name) >= threshold) return true;
			}
			return false;
		},
		
		getSaveKey: function () {
			return "Res";
		},
		
		getCustomSaveObject: function () {
			// resources component needs to be saved only if there is storage (player/camp), otherwise the resources are defined by the WorldCreator
			if (this.storageCapacity <= 0) return null;
			var copy = {};
			copy.n = this.name;
			copy.r = this.resources.getCustomSaveObject();
			copy.c = this.storageCapacity;
			return copy;
		},

		customLoadFromSave: function (componentValues) {
			this.name = componentValues.n || "unknown";
			this.resources.customLoadFromSave(componentValues.r);
			this.storageCapacity = componentValues.c || 0;
		}
		
	});

	return ResourcesComponent;
});
