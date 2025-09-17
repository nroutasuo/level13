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

			var keysToCheck = Array.isArray(keys) ? keys : [keys];

			for (var key of keysToCheck) {
				if (!(key in o1) || !(key in o2)) return false;
				if (o1[key] !== o2[key]) return false;
			}

			return true;
		},

		diff: function (obj1, obj2) {
			const summary = { total: 0, byKey: {}, examples: {} };

			function recordDiff(key, val1, val2) {
				summary.total += 1;
				summary.byKey[key] = (summary.byKey[key] || 0) + 1;
				if (!summary.examples[key]) {
					summary.examples[key] = { value1: val1, value2: val2 };
				}
			}

			function recurse(o1, o2, parentKey = null) {
				// If both are arrays → compare element by element
				if (Array.isArray(o1) && Array.isArray(o2)) {
					const len = Math.max(o1.length, o2.length);
					for (let i = 0; i < len; i++) {
						const v1 = o1[i];
						const v2 = o2[i];
						if (
							typeof v1 === "object" && v1 !== null &&
							typeof v2 === "object" && v2 !== null
						) {
							recurse(v1, v2, parentKey); // keep attribution to parent key
						} else if (v1 !== v2) {
							recordDiff(parentKey || "array", v1, v2);
						}
					}
					return;
				}

				// If both are plain objects → compare by keys
				if (
					typeof o1 === "object" && o1 !== null &&
					typeof o2 === "object" && o2 !== null
				) {
					const keys = new Set([...Object.keys(o1), ...Object.keys(o2)]);
					for (let key of keys) {
						recurse(o1[key], o2[key], key);
					}
					return;
				}

				// Base case: primitive values
				if (o1 !== o2) {
					recordDiff(parentKey || "root", o1, o2);
				}
			}

			recurse(obj1, obj2);
			return summary;
		},

	};

	return ObjectUtils;
});
