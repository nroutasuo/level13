define(function () {
	
	// relativeProbabilities: object with possible return values as keys and relative probabilities as values
	// normalizedProbabilities: object with possible return values as keys and normalized probabilities as values
	
	let RandomUtils = {
		
		selectOneFromRelativeProbabilities: function (relativeProbabilities) {
			let normalizedProbabilities = this.getNormalizedProbabilities(relativeProbabilities);
			let roll = Math.random();
			let total = 0;
			let lastKey = null;
			
			for (let key in normalizedProbabilities) {
				let value = normalizedProbabilities[key];
				total += value;
				if (roll < total) return key;
				lastKey = key;
			}
			
			return lastKey;
		},
		
		getNormalizedProbabilities: function (relativeProbabilities) {
			let result = {};
			let total = 0;
			
			for (let key in relativeProbabilities) {
				let value = relativeProbabilities[key];
				total += value;
			}
			
			for (let key in relativeProbabilities) {
				let value = relativeProbabilities[key];
				result[key] = value / total;
			}
			
			return result;
		},
		
	};

	return RandomUtils;
});
