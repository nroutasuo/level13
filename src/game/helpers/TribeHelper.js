define([
	'ash',
	'game/GameGlobals',
	'game/constants/TribeConstants',
	'game/nodes/sector/CampNode',
	'game/nodes/tribe/TribeUpgradesNode'
], function (
	Ash,
	GameGlobals,
	TribeConstants,
	CampNode,
	TribeUpgradesNode
) {
	
	var TribeHelper = Ash.Class.extend({
		
		tribeUpgradesNodes: null,
		campNodes: null,

		constructor: function (engine) {
			this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
			this.campNodes = engine.getNodeList(CampNode);
		},
		
		hasUpgrade: function (upgradeID) {
			if (!upgradeID) return true;
			return this.tribeUpgradesNodes.head.upgrades.hasUpgrade(upgradeID);
		},
		
		getTotalPopulation: function () {
			let result = 0;
			for (let campNode = this.campNodes.head; campNode; campNode = campNode.next) {
				result += Math.floor(campNode.camp.population);
			}
			return result;
		},
		
		getCurrentMilestone: function () {
			let currentIndex = GameGlobals.gameState.numUnlockedMilestones;
			return TribeConstants.getMilestone(currentIndex);
		},
		
		getNextMilestone: function () {
			let nextIndex = GameGlobals.gameState.numUnlockedMilestones + 1;
			return TribeConstants.getMilestone(nextIndex);
		},
		
		getCurrentEvidenceLimit: function () {
			let currentMilestone = this.getCurrentMilestone();
			return currentMilestone.maxEvidence || -1;
		},
		
		getCurrentRumoursLimit: function () {
			let currentMilestone = this.getCurrentMilestone();
			return currentMilestone.maxRumours || -1;
		},
		
		getCurrentFavourLimit: function () {
			let currentMilestone = this.getCurrentMilestone();
			return currentMilestone.maxFavour || -1;
		},
		
		getCurrentReputationBaseValue: function () {
			let milestone = this.getCurrentMilestone();
			return GameGlobals.tribeBalancingHelper.getReputationBaseValue(milestone.index);
		}
		
	});

	return TribeHelper;
});
