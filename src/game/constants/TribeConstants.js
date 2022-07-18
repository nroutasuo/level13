define(['ash', 'game/constants/OccurrenceConstants'], function (Ash, OccurrenceConstants) {
	
	var TribeConstants = {
		
		milestones: [
			{
				"name": "lone camp",
			},
			{
				"name": "milestone 1",
				"unlockedEvents": [ OccurrenceConstants.campOccurrenceTypes.raid ],
			},
			{
				"name": "milestone 2",
			},
			{
				"name": "milestone 3",
			},
			{
				"name": "milestone 4",
			},
			{
				"name": "milestone 5",
			},
			{
				"name": "milestone 6",
			},
			{
				"name": "milestone 7",
			},
		],
		
		getMilestone: function (i) {
			let milestone = this.milestones[i] || {};
			milestone.index = i;
			return milestone;
		},
		
		getPreviousMilestone: function (milestone) {
			if (milestone.index <= 0) return null;
			return this.milestones[milestone.index - 1];
		}
		
	};
	
	return TribeConstants;
	
});
