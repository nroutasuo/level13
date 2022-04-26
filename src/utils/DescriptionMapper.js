// maps a number of properties to text descriptions / templates, for example sector features to a sector description
// add descriptions with properties required to match them
// get description with an object
// - returns description whose properties ALL match that of the object
// - if several match, returns a "random" one from matching (prefers one with many properties and guaranteed to be the same one every time for the same properties)
// properties in descriptions may be simple (equals) or ranges (array of two values (inclusive))

define(function () {
	
	var DescriptionMapper = {
		
		WILDCARD: "WILDCARD",
		descriptions: {},
		
		add: function (type, props, text) {
			if (!this.descriptions[type]) this.descriptions[type] = [];
			this.descriptions[type].push({ props: props, text: text})
		},
		
		get: function (type, props) {
			if (!this.descriptions[type]) {
				log.w("no such description type: " + type);
				return "";
			}
			
			var matches = [];
			var weightedMatches = [];
			for (let i = 0; i < this.descriptions[type].length; i++) {
				var desc = this.descriptions[type][i];
				if (this.matches(props, desc)) {
					var score = this.getMatchScore(desc);
					matches.push(desc);
					for (let j = 0; j < score; j++) {
						weightedMatches.push(desc);
					}
				}
			}
			
			// no matches: warning
			if (matches.length == 0) {
				log.w("no description found with type " + type);
				return "";
			}
			
			// single match, return that
			if (matches.length == 1) {
				return matches[0].text;
			}
			
			// several matches, select one in a semi-random way (same object should return the same one if called again but should be different for different objects)
			return this.pickRandom(weightedMatches, props).text;
		},
		
		matches: function (props, desc) {
			for (var [key, value] of Object.entries(desc.props)) {
				// test for simple value
				if (props[key] === value) continue;
				// test for range
				if (value.length && value.length == 2) {
					if (props[key] >= value[0] && props[key] <= value[1]) continue;
				}
				// test for wildcard
				if (value == this.WILDCARD) continue;
				return false;
			}
			return true;
		},
		
		getMatchScore: function (desc) {
			 return Object.keys(desc.props).length;
		},
		
		pickRandom: function (candidates, props) {
			var checksum = this.getPropsChecksum(props);
			var index = checksum % candidates.length;
			return candidates[index];
		},
		
		getPropsChecksum: function (props) {
			let result = 0;
			for (var [key, value] of Object.entries(props)) {
				let t = typeof value;
				if (t == "number") {
					result += value;
				} else {
					if (value) result++;
				}
			}
			return Math.round(result);
		}
		
	};
	return DescriptionMapper;
});
