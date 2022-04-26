define(function () {
	var MathUtils = {
		
		clamp: function(num, min, max) {
			return num < min ? min : num > max ? max : num;
		},
		
		dist: function (x1, y1, x2, y2) {
			var a = x1 - x2;
			var b = y1 - y2;
			return Math.sqrt(a*a + b*b);
		},
		
		map: function (val, min1, max1, min2, max2) {
			if (val < min1) val = min1;
			if (val > max1) val = max1;
			if (min1 == max1) return min2;
			return (val - min1) * (max2 - min2) / (max1 - min1) + min2;
		},
		
		randomIntBetween: function (min, max) {
			return this.intBetween(Math.random(), min, max);
		},
		
		intBetween: function (min, max, pos) {
			min = Math.ceil(min);
			max = Math.floor(max);
			pos = this.clamp(pos, 0, 1);
			return Math.floor(pos * (max - min) + min);
		},
		
		// simple weighted random: first item twice as likely to be selected as the second and so on
		getWeightedRandom: function (min, max) {
			var bag = [];
			for (let i = min; i < max; i++) {
				for (let j = 0; j < (max - i); j++) {
					bag.push(i);
				}
			}
			return bag[Math.floor(Math.random() * bag.length)];
		},
		
		roundToPlaces: function (value, places) {
			let multiple = Math.pow(10, places);
			return MathUtils.roundToMultiple(value, multiple);
		},
		
		roundToMultiple: function (value, multiple) {
			return Math.round(value / multiple) * multiple;
		}
	};

	return MathUtils;
});
