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
		},

		compare: function (a1, a2) {
			if (a1.length != a2.length) {
				return false;
			}

			a1 = a1.slice();
			a1.sort();
			a2 = a2.slice();
			a2.sort();

			for (var i = 0; i < a1.length; i++) {
				if (a1[i] != a2[i]) {
					return false;
				}
			}

			return true;
		},

	};

	return ArrayUtils;
});
