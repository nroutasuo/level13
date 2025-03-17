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
		
	};

	return ObjectUtils;
});
