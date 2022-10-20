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
		
		project: function (p, a, b) {
			// project point p to the line between points a and b
    
		    var atob = { x: b.x - a.x, y: b.y - a.y };
		    var atop = { x: p.x - a.x, y: p.y - a.y };
		    var len = atob.x * atob.x + atob.y * atob.y;
		    var dot = atop.x * atob.x + atop.y * atob.y;
		    var t = Math.min( 1, Math.max( 0, dot / len ) );

		    dot = ( b.x - a.x ) * ( p.y - a.y ) - ( b.y - a.y ) * ( p.x - a.x );
		    
		    return  {
	            x: a.x + atob.x * t,
	            y: a.y + atob.y * t
	        };
		},
		
		// finds intersection point of two lines (from 1 to 2 and 3 to 4) or returns false if they don't intersect
		lineIntersection: function (x1, y1, x2, y2, x3, y3, x4, y4) {
		  	// Check if none of the lines are of length 0
		    if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
		        return false
		    }

		    denominator = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1))

		  	// Lines are parallel
		    if (denominator === 0) {
		        return false
		    }

		    let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator
		    let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator

		  	// is the intersection along the segments
		    if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
		        return false
		    }

		  	// Return a object with the x and y coordinates of the intersection
		    let x = x1 + ua * (x2 - x1)
		    let y = y1 + ua * (y2 - y1)

		    return {x, y}
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
