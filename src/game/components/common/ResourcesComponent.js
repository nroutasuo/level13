// Defines the resources stored by an entity (player / (sector(camp) / tribe)
define(['ash', 'game/vos/ResourcesVO'], function (Ash, ResourcesVO) {
	
	let ResourcesComponent = Ash.Class.extend({
		
		resources: null,
		storageCapacity: 0,
		isOptionalForSave: false,
		
		constructor: function (capacity, isOptionalForSave) {
			this.resources = new ResourcesVO();
			this.storageCapacity = capacity;
			this.isOptionalForSave = isOptionalForSave || false;

			this.resetStorage();
		},
		
		resetStorage: function () {
			this.resources.reset();
		},
		
		limitToStorage: function (fixNegatives) {
			var spilledResources = new ResourcesVO();
			if (this.storageCapacity >= 0) {
				for (var key in resourceNames) {
					var name = resourceNames[key];
					if (this.resources.getResource(name) > this.storageCapacity) {
						spilledResources.addResource(name, this.resources.getResource(name) - this.storageCapacity);
						this.resources.setResource(name, this.storageCapacity);
					}
					if (fixNegatives && this.resources.getResource(name) < 0) {
						spilledResources.addResource(name, -this.resources.getResource(name));
						this.resources.setResource(name, 0);
					}
				}
			}
			return spilledResources;
		},
		
		addResource: function (resourceName, amount) {
			return this.resources.addResource(resourceName, amount);
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

		getAtCapacityResource: function () {
			let threshold = this.storageCapacity;
			for (let key in resourceNames) {
				let name = resourceNames[key];
				if (this.resources.getResource(name) >= threshold) return name;
			}
			return null;
		},

		getMinimumFreeStorage: function () {
			let result = this.storageCapacity;
			for (let key in resourceNames) {
				let name = resourceNames[key];
				let freeStorage = this.storageCapacity - this.resources.getResource(name);
				if (freeStorage < result) result = freeStorage;
			}
			return result;
		},
		
		getSaveKey: function () {
			return "Res";
		},
		
		getCustomSaveObject: function () {
			// optimization to not save resources on sectors without camp or collectors
			if (this.isOptionalForSave && this.storageCapacity <= 0) return null;

			var copy = {};
			copy.r = this.resources.getCustomSaveObject();
			copy.c = this.storageCapacity;
			return copy;
		},

		customLoadFromSave: function (componentValues) {
			this.resources.customLoadFromSave(componentValues.r);
			this.storageCapacity = componentValues.c || 0;
		}
		
	});

	return ResourcesComponent;
});
