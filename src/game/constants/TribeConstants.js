define(['ash'], function (Ash) {
	
	var TribeConstants = {
	
		// values from balancing spreadsheet
		approxStatsPerCamp: [
			{ rumours: 22, evidence: 90, favour: 0 },
			{ rumours: 84, evidence: 135, favour: 0 },
			{ rumours: 189, evidence: 142, favour: 7 },
			{ rumours: 488, evidence: 153, favour: 18 },
			{ rumours: 732, evidence: 164, favour: 29 },
			{ rumours: 1674, evidence: 200, favour: 65 },
			{ rumours: 2177, evidence: 189, favour: 54 },
			{ rumours: 3418, evidence: 189, favour: 104 },
			{ rumours: 9258, evidence: 221, favour: 86 },
			{ rumours: 10504, evidence: 288, favour: 118 },
			{ rumours: 20283, evidence: 310, favour: 130 },
			{ rumours: 30314, evidence: 369, favour: 199 },
			{ rumours: 38964, evidence: 407, favour: 237 },
			{ rumours: 41561, evidence: 439, favour: 269 },
			{ rumours: 59117, evidence: 711, favour: 466 }
		],
		
		getFirstCampOrdinalWithMinStat: function (stat, val) {
			for (var i = 0; i < this.approxStatsPerCamp.length; i++) {
				var campStats = this.approxStatsPerCamp[i];
				if (campStats[stat] >= val) return i;
			}
			return 15;
		}
	
	};
	
	return TribeConstants;
	
});
