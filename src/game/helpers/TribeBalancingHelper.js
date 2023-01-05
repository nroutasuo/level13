// Helpers for trible balancing that are independent of game state
define([
	'ash',
	'game/GameGlobals',
	'game/constants/GameConstants',
	'game/constants/TribeConstants',
], function (Ash, GameGlobals, GameConstants, TribeConstants) {
	
	var TribeBalancingHelper = Ash.Class.extend({
		
		constructor: function () { },

		getMaxReputationBaseValue: function (campOrdinal, milestone) {
			milestone = milestone || GameGlobals.milestoneEffectsHelper.getMilestoneAtCampOrdinal(campOrdinal);
			return this.getReputationBaseValue(milestone.index);
		},
		
		getReputationBaseValue: function (currentMilestoneIndex) {
			let value = 0;
			let maxMilestoneIndex = Math.min(TribeConstants.milestones.length - 1, currentMilestoneIndex);
			for (let i = 0; i <= maxMilestoneIndex; i++) {
				let milestone = TribeConstants.getMilestone(i);
				if (milestone.baseReputation) {
					value = milestone.baseReputation;
				}
			}
			return value;
		},

	});

	return TribeBalancingHelper;
});
