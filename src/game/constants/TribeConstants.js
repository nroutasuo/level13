define(['ash', 'game/constants/OccurrenceConstants'], function (Ash, OccurrenceConstants) {
	
	var TribeConstants = {
		
		milestones: [
			{
				name: "lone camp",
				maxRumours: 500,
				maxEvidence: 300,
				maxFavour: 0,
			},
			{
				name: "milestone 1",
				maxRumours: 1000,
				maxEvidence: 500,
				maxFavour: 0,
				unlockedEvents: [ OccurrenceConstants.campOccurrenceTypes.raid ],
			},
			{
				name: "milestone 2",
				maxRumours: 4000,
				maxEvidence: 1000,
				maxFavour: 0,
			},
			{
				name: "milestone 3",
				maxRumours: 8000,
				maxEvidence: 2000,
				maxFavour: 600,
			},
			{
				name: "milestone 4",
				maxRumours: 10000,
				maxEvidence: 3000,
				maxFavour: 800,
			},
			{
				name: "milestone 5",
				maxRumours: 25000,
				maxEvidence: 5000,
				maxFavour: 1000,
			},
			{
				name: "milestone 6",
				maxRumours: 50000,
				maxEvidence: 8000,
				maxFavour: 2000,
			},
			{
				name: "milestone 7",
				maxRumours: 100000,
				maxEvidence: 10000,
				maxFavour: 3000,
			},
		],
		
		init: function () {
			for (let i = 0; i < this.milestones.length; i++) {
				this.milestones[i].index = i;
			}
		},
		
		getMilestone: function (i) {
			let milestone = this.milestones[i] || {};
			milestone.index = i;
			return milestone;
		},
		
		getPreviousMilestone: function (milestone) {
			let previousIndex = milestone.index - 1;
			if (previousIndex < 0) return null;
			return this.milestones[previousIndex];
		},
		
		getNextMilestone: function (milestone) {
			let nextIndex = milestone.index + 1;
			if (nextIndex >= this.milestones.length) return null;
			return this.milestones[nextIndex];
		}
		
	};
	
	TribeConstants.init();
	
	return TribeConstants;
	
});
