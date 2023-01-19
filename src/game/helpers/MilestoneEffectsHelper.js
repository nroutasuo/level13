// Helper to check effects of milestones (unlocks)
define([
	'ash',
	'game/GameGlobals',
	'game/constants/ImprovementConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/UpgradeConstants',
	'game/constants/TribeConstants',
	'game/constants/OccurrenceConstants',
	'game/vos/ImprovementVO',
], function (Ash, GameGlobals, ImprovementConstants, PlayerActionConstants, UpgradeConstants, TribeConstants, OccurrenceConstants, ImprovementVO) {
	
	var MilestoneEffectsHelper = Ash.Class.extend({
		
		constructor: function () {},
		
		getUnlockedActions: function (milestoneIndex) {
			let result = [];
			for (let action in PlayerActionConstants.requirements) {
				let reqs = PlayerActionConstants.requirements[action];
				if (reqs.milestone) {
					if (reqs.milestone == milestoneIndex) {
						result.push(action);
					}
				}
			}
			return result;
		},
		
		getMilestoneIndexForAction: function (action) {
			let reqs = PlayerActionConstants.requirements[action];
			if (reqs && reqs.milestone) {
				return reqs.milestone;
			}
			return 0;
		},
		
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
			if (!milestone.index) milestone = TribeConstants.getMilestone(milestone);
			
			let result = 0;
			let action = "claim_milestone_" + milestone.index;
			
			let reqs = GameGlobals.playerActionsHelper.getReqs(action);
			let previousMilestone = TribeConstants.getPreviousMilestone(milestone);
			
			if (reqs) {
				if (reqs.tribe && reqs.tribe.improvements) {
					for (let improvementID in reqs.tribe.improvements) {
						let improvementName = improvementNames[improvementID];
						let buildAction = PlayerActionConstants.getActionNameForImprovement(improvementName);
						let buildCampStep = GameGlobals.playerActionsHelper.getMinimumCampAndStep(buildAction);
						result = Math.max(result, buildCampStep.campOrdinal);
					}
				}
				if (reqs.tribe && reqs.tribe.projects) {
					for (let improvementID in reqs.tribe.projects) {
						let improvementName = improvementNames[improvementID];
						let buildAction = PlayerActionConstants.getActionNameForImprovement(improvementName);
						let buildCampStep = GameGlobals.playerActionsHelper.getMinimumCampAndStep(buildAction);
						result = Math.max(result, buildCampStep.campOrdinal);
					}
				}
				if (reqs.tribe && reqs.tribe.population) {
					result = Math.max(result, GameGlobals.campBalancingHelper.getMinCampOrdinalForPopulation(reqs.tribe.population, previousMilestone));
				}
			}
			
			return result;
		},
		
		getMilestoneAtCampOrdinal: function (campOrdinal) {
			let result = null;
			for (let i = 0; i < TribeConstants.milestones.length; i++) {
				let milestone = TribeConstants.getMilestone(i);
				if (this.getMinimumCampOrdinalForMilestone(milestone) > campOrdinal) {
					return result;
				}
				result = milestone;
			}
			return result;
		}
		
	});
	
	return MilestoneEffectsHelper;
});
