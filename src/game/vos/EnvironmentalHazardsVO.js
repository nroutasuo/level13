define(['ash'], function (Ash) {

	let EnvironmentalHazardsVO = Ash.Class.extend({
		
		radiation: 0,
		poison: 0,
		cold: 0,
		debris: 0,
		flooded: 0,
		territory: 0,
		
		constructor: function () {
			this.radiation = 0;
			this.poison = 0;
			this.cold = 0;
			this.debris = 0;
			this.flooded = 0;
			this.territory = 0;
		},
			
		getMainHazard: function () {
			if (this.radiation > this.poison && this.radiation > this.cold) return "radiation";
			if (this.poison > this.radiation && this.poison > this.cold) return "poison";
			if (this.radiation > 0) return "radiation";
			if (this.poison > 0) return "poison";
			if (this.flooded > 0) return "flooded";
			if (this.territory > 0) return "territory";
			if (this.debris > 0) return "debris";
			if (this.cold > 0) return "cold";
			return null;
		},
		
		hasHazard: function (hazard) {
			return this[hazard] > 0;
		},
		
		hasHazards: function () {
			return this.radiation > 0 || this.poison > 0 || this.cold > 0 || this.debris > 0 || this.flooded > 0 || this.territory > 0;
		},
		
		clone: function () {
			let result = new EnvironmentalHazardsVO();
			result.radiation = this.radiation;
			result.poison = this.poison;
			result.cold = this.cold;
			result.debris = this.debris;
			result.flooded = this.flooded;
			result.territory = this.territory;
			return result;
		},
		
		getCustomSaveObject: function () {
			let copy = {};
			if (this.radiation !== 0) copy.r = this.radiation;
			if (this.poison !== 0) copy.p = this.poison;
			if (this.cold !== 0) copy.c = this.cold;
			if (this.debris !== 0) copy.d = this.debris;
			if (this.flooded !== 0) copy.f = this.flooded;
			if (this.territory !== 0) copy.t = this.territory;
			return copy;
		},

		customLoadFromSave: function (componentValues) {
			if (!componentValues) return;
			
			if (componentValues.r) this.radiation = componentValues.r;
			if (componentValues.p) this.poison = componentValues.p;
			if (componentValues.c) this.cold = componentValues.c;
			if (componentValues.d) this.debris = componentValues.d;
			if (componentValues.f) this.flooded = componentValues.f;
			if (componentValues.t) this.territory = componentValues.t;
		},
		
	});

	return EnvironmentalHazardsVO;
});
