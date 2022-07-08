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
		}
		
	});
	
	return MilestoneEffectsHelper;
});
