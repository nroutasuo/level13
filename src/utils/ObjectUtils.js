define([], function () {
	
	let ObjectUtils = {
		
		// assign all values from o2 to o1 recursively, without overwriting but instead of adding to objects
		// modifies o1 but does not modify o2
		assignValues: function (o1, o2) {
			for (let key in o2) {
				let value = o2[key];

				if (typeof value === "object") {
					if (o1[key]) {
						value = Object.assign({}, value);
						ObjectUtils.assignValues(value, o1[key]);
					}
				}

				o1[key] = value;
			}
			return o1;
		},

		keysMatch: function (o1, o2, keys) {
			if (o1 == null || o2 == null) return false;

			var keysToCheck = Array.isArray(keys) ? keys : [ keys ];

			for (var key of keysToCheck) {
				if (!(key in o1) || !(key in o2)) return false;
				if (o1[key] !== o2[key]) return false;
			}

			return true;
}
		
	};

	return ObjectUtils;
});
