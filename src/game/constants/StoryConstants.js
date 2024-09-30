define(['ash'], function (Ash) {
	
	let StoryConstants = {
	
		FALL_YEAR: 783,
		FALL_WEEK: 13,
		GAME_START_YEAR: 783,
		GAME_START_WEEK: 17,

		sectorExamineSpots: [
			{
				id: "test_vehicle",
				name: "strange vehicle",
				shortName: "vehicle",
				popupMsg: "A strange vehicle with the black GIGA logo on it",
				positionParams: {
					campOrdinal: 3,
					sectorType: "industrial"
				}
			},
			{
				id: "test_monument",
				name: "monument",
				shortName: "monument",
				popupMsg: "A monument to the defeat of an old dictatorship",
				positionParams: {
					campOrdinal: 4,
					sectorType: "public"
				}
			},
			{
				id: "test_wreckage",
				name: "burned wreckage",
				shortName: "wreckage",
				popupMsg: "Wreckage from the escape shuttle",
				positionParams: {
					campOrdinal: 15,
				}
			},
		],

		getSectorExampineSpot: function (id) {
			for (let i = 0; i < this.sectorExamineSpots.length; i++) {
				if (this.sectorExamineSpots[i].id == id) {
					return this.sectorExamineSpots[i];
				}
			}
			return null;
		},
		
	};
	
	return StoryConstants;
	
});
