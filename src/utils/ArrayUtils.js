define([], function () {

	let ArrayUtils = {

		filterIfAny: function (arr, filter, min) {
			min = min || 1;
			if (!arr || arr.length <= min) return arr;
			
			let filtered = arr.filter(filter);
			if (filtered.length >= min) return filtered;
			
			return arr;
		},

		containsAny: function (arr, options) {
			if (!arr || arr.length <= 0 || !options || options.length <= 0) return false;

			for (let i = 0; i < options.length; i++) {
				if (arr.indexOf(options[i]) >= 0) return true;
			}

			return false;
		}

	};

	return ArrayUtils;
});
