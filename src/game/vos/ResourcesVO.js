// Defines the resources used in the game
define(['ash'], function (Ash) {

	// Global static definitions
	resourceNames = {
		water: "water",
		food: "food",
		metal: "metal",
		rope: "rope",
		
		herbs: "herbs",
		fuel: "fuel",
		rubber: "rubber",
		
		medicine: "medicine",
		tools: "tools",
		concrete: "concrete",
		robots: "robots",
	};
	
	isResource = function (name) {
		return typeof resourceNames[name] != "undefined";
	};
	
	var ResourcesVO = Ash.Class.extend({
	
		// Basic
		water: 0,
		food: 0,
		metal: 0,
		rope: 0,
			
		// Level-dependent
		herbs: 0,
		fuel: 0,
		rubber: 0,
	
		// Advanced
		tools: 0,
		medicine: 0,
		concrete: 0,
	
		constructor: function () {
			this.reset();
		},
			
		reset: function () {
			// Basic
			this.water = 0;
			this.food = 0;
			this.metal = 0;
			this.rope = 0;
			
			// Level-dependent
			this.herbs = 0;
			this.fuel = 0;
			this.rubber = 0;
			
			// Advanced
			this.tools = 0;
			this.medicine = 0;
			this.concrete = 0;
			this.robots = 0;
		},
		
		addResource: function (res, amount) {
			if (isNaN(amount)) return;
			if (amount == 0) return;
			this.cleanUp();
			switch(res) {
				case resourceNames.water: this.water += amount; break;
				case resourceNames.food: this.food += amount; break;
				case resourceNames.metal: this.metal += amount; break;
				case resourceNames.rope: this.rope += amount; break;
				case resourceNames.herbs: this.herbs += amount; break;
				case resourceNames.fuel: this.fuel += amount; break;
				case resourceNames.rubber: this.rubber += amount; break;
				case resourceNames.tools: this.tools += amount; break;
				case resourceNames.medicine: this.medicine += amount; break;
				case resourceNames.concrete: this.concrete += amount; break;
				case resourceNames.robots: this.robots += amount; break;
				default:
					log.w("Unknown resource name: " + res);
			}
		},
		
		setResource: function(res, amount) {
			if (isNaN(amount)) return;
			switch(res) {
				case resourceNames.water: this.water = amount; break;
				case resourceNames.food: this.food = amount; break;
				case resourceNames.metal: this.metal = amount; break;
				case resourceNames.rope: this.rope = amount; break;
				case resourceNames.herbs: this.herbs = amount; break;
				case resourceNames.fuel: this.fuel = amount; break;
				case resourceNames.rubber: this.rubber = amount; break;
				case resourceNames.tools: this.tools = amount; break;
				case resourceNames.medicine: this.medicine = amount; break;
				case resourceNames.concrete: this.concrete = amount; break;
				case resourceNames.robots: this.robots = amount; break;
				default:
					log.w("Unknown resource name: " + res);
			}
		},
	
		getResource: function(res) {
			let val = 0;

			switch(res) {
				case resourceNames.water: val = this.water || 0; break;
				case resourceNames.food: val = this.food || 0; break;
				case resourceNames.metal: val = this.metal || 0; break;
				case resourceNames.rope: val = this.rope || 0; break;
					
				case resourceNames.herbs: val = this.herbs || 0; break;
				case resourceNames.fuel: val = this.fuel || 0; break;
				case resourceNames.rubber: val = this.rubber || 0; break;
			
				case resourceNames.medicine: val = this.medicine || 0; break;
				case resourceNames.tools: val = this.tools || 0; break;
				case resourceNames.concrete: val = this.concrete || 0; break;
				case resourceNames.robots: val = this.robots || 0; break;
				
				default: log.w("Unknown resource name: " + res); break;
			}

			if (isNaN(val)) val = 0;

			return val;
		},
		
		getResourcesWithHighestAmount: function () {
			let result = [];
			let max = 0;
			for (let key in resourceNames) {
				let name = resourceNames[key];
				let amount = this.getResource(name);
				if (amount == max) {
					result.push(name);
					continue;
				}
				if (amount > max) {
					result = [];
					result.push(name);
					max = amount;
					continue;
				}
			}
			return result;
		},
		
		addAll: function (resourceVO) {
			for (let key in resourceNames) {
				var name = resourceNames[key];
				this.addResource(name, resourceVO.getResource(name));
			}
		},
		
		limitAll: function (min, max) {
			for (let key in resourceNames) {
				let name = resourceNames[key];
				this.limit(name, min, max);
			}
		},
		
		limit: function (name, min, max, allowDecimalOverflow) {
			if (allowDecimalOverflow) {
				max = Math.floor(max) + 0.9999;
			}
			
			let amount = this.getResource(name);
			if (amount == 0) return;
			if (amount < min)
				this.setResource(name, min);
			if (amount > max)
				this.setResource(name, max);
		},
	
		cleanUp: function() {
			for (let key in resourceNames) {
				let name = resourceNames[key];
				let amount = this.getResource(name);
				if (isNaN(amount)) {
					log.e("resource value was NaN, setting to 0 (" + name + ")");
					this.setResource(name, 0);
				}
			}
		},
		
		getTotal: function() {
			let total = 0;
			for (let key in resourceNames) {
				let name = resourceNames[key];
				let amount = this.getResource(name);
				total += amount;
			}
			return total;
		},
		
		getNames: function () {
			let result = [];
			 for (let key in resourceNames) {
				var name = resourceNames[key];
				var amount = this.getResource(name);
				if (amount > 0)
					result.push(name);
			}
			return result;
		},
		
		isOnlySupplies: function () {
			return this.getTotal() == this.getResource(resourceNames.food) + this.getResource(resourceNames.water);
		},
		
		isOneResource: function () {
			return this.getNames().length == 1;
		},
		
		getCustomSaveObject: function () {
			var copy = {};
			if (this.water !== 0) copy.w = this.water;
			if (this.food !== 0) copy.f = this.food;
			if (this.metal !== 0) copy.m = this.metal;
			if (this.rope !== 0) copy.r = this.rope;
			if (this.herbs !== 0) copy.h = this.herbs;
			if (this.fuel !== 0) copy.fu = this.fuel;
			if (this.rubber !== 0) copy.ru = this.rubber;
			if (this.tools !== 0) copy.t = this.tools;
			if (this.medicine !== 0) copy.med = this.medicine;
			if (this.concrete !== 0) copy.c = this.concrete;
			if (this.robots !== 0) copy.rb = this.robots;
			return copy;
		},

		customLoadFromSave: function (componentValues) {
			if (!componentValues) return;
			
			if (componentValues.water) this.water = componentValues.water;
			if (componentValues.food) this.food = componentValues.food;
			if (componentValues.metal) this.metal = componentValues.metal;
			if (componentValues.rope) this.rope = componentValues.rope;
			if (componentValues.herbs) this.herbs = componentValues.herbs;
			if (componentValues.fuel) this.fuel = componentValues.fuel;
			if (componentValues.rubber) this.rubber = componentValues.rubber;
			if (componentValues.tools) this.tools = componentValuestoolst;
			if (componentValues.medicine) this.medicine = componentValues.medicine;
			if (componentValues.concrete) this.concrete = componentValues.concrete;
			if (componentValues.robots) this.robots = componentValues.robots;
			
			if (componentValues.w) this.water = componentValues.w;
			if (componentValues.f) this.food = componentValues.f;
			if (componentValues.m) this.metal = componentValues.m;
			if (componentValues.r) this.rope = componentValues.r;
			if (componentValues.h) this.herbs = componentValues.h;
			if (componentValues.fu) this.fuel = componentValues.fu;
			if (componentValues.ru) this.rubber = componentValues.ru;
			if (componentValues.t) this.tools = componentValues.t;
			if (componentValues.med) this.medicine = componentValues.med;
			if (componentValues.c) this.concrete = componentValues.c;
			if (componentValues.rb) this.robots = componentValues.rb;
		},
		
		clone: function() {
			var c = new ResourcesVO();
			for (let key in resourceNames) {
				var name = resourceNames[key];
				c.setResource(name, this.getResource(name));
			}
			return c;
		}
	});

	return ResourcesVO;
});
