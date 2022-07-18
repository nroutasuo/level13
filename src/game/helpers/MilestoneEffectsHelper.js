// Helper to check effects of milestones (unlocks)
define([
	'ash',
	'game/GameGlobals',
	'game/constants/ImprovementConstants',
	'game/constants/UpgradeConstants',
	'game/constants/TribeConstants',
	'game/constants/OccurrenceConstants',
	'game/vos/ImprovementVO',
], function (Ash, GameGlobals, ImprovementConstants, UpgradeConstants, TribeConstants, OccurrenceConstants, ImprovementVO) {
	
	var MilestoneEffectsHelper = Ash.Class.extend({
		
		constructor: function () {},
		
		getMilestoneIndexForOccurrence: function (occurrence) {
			for (let i = 0; i < TribeConstants.milestones.length; i++) {
				let milestone = TribeConstants.getMilestone(i);
				if (milestone.unlockedEvents) {
					if (milestone.unlockedEvents.indexOf(occurrence) >= 0) {
						return i;
					}
				}
			}
			return 0;
		},
		
		getMinimumCampOrdinalForMilestone: function (milestone) {
			let result = 0;
			let action = "claim_milestone_" + milestone.index;
			
			let reqs = GameGlobals.playerActionsHelper.getReqs(action);
			
			if (reqs) {
				if (reqs.tribe && reqs.tribe.population) {
					result = Math.max(result, GameGlobals.campBalancingHelper.getMinCampOrdinalForPopulation(reqs.tribe.population));
				}
				if (reqs.tribe && reqs.tribe.improvements) {
					for (let improvementID in reqs.tribe.improvements) {
						let improvementName = improvementNames[improvementID];
						let buildAction = GameGlobals.playerActionsHelper.getActionNameForImprovement(improvementName);
						let buildCampStep = GameGlobals.playerActionsHelper.getMinimumCampAndStep(buildAction);
						result = Math.max(result, buildCampStep.campOrdinal);
					}
				}
				if (reqs.tribe && reqs.tribe.projects) {
					for (let improvementID in reqs.tribe.projects) {
						let improvementName = improvementNames[improvementID];
						let buildAction = GameGlobals.playerActionsHelper.getActionNameForImprovement(improvementName);
						let buildCampStep = GameGlobals.playerActionsHelper.getMinimumCampAndStep(buildAction);
						result = Math.max(result, buildCampStep.campOrdinal);
					}
				}
			}
			
			return result;
		}
		
	});
	
	return MilestoneEffectsHelper;
});
