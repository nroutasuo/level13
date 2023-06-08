// Defines the change in resources stored by an entity (sector/tribe) per second
define(['ash', 'game/vos/ResourcesVO'], function (Ash, ResourcesVO) {
	
	var ResourceAccumulationComponent = Ash.Class.extend({
		
		name: "",
		resourceChange: null,
		sources: {},
		
		constructor: function (name) {
			this.name = name;
			this.resourceChange = new ResourcesVO();
		},
		
		getSources: function(resourceName) {
			return this.sources[resourceName];
		},
		
		addChange: function(resourceName, amount, source, sourceCount) {
			if (!resourceName) return;
			if (amount == 0) return;
			source = source || "Unknown";
			sourceCount = sourceCount || 1;
			
			this.resourceChange.addResource(resourceName, amount);
			
			if (!this.sources[resourceName]) {
				this.sources[resourceName] = [];
			}
			
			let resSources = this.getSources(resourceName);
			for (let i = 0; i < resSources.length; i++) {
				var change = resSources[i];
				if (change.source == source) {
					change.sourceCount += sourceCount;
					change.amount += amount;
					return;
				}
			}
				
			this.sources[resourceName].push({
				source: source,
				sourceCount: sourceCount,
				amount: amount
			});
		},
		
		getChange: function (resourceName) {
			return this.resourceChange.getResource(resourceName);
		},
		
		reset: function() {
			this.resourceChange.reset();
			this.sources = {};
		},
	});

	return ResourceAccumulationComponent;
});
