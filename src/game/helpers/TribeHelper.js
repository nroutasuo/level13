define([
	'ash',
	'game/GameGlobals',
	'game/constants/PlayerActionConstants',
	'game/constants/TribeConstants',
	'game/constants/UpgradeConstants',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/sector/CampNode',
	'game/components/player/HopeComponent',
	'game/nodes/tribe/TribeUpgradesNode'
], function (
	Ash,
	GameGlobals,
	PlayerActionConstants,
	TribeConstants,
	UpgradeConstants,
	PlayerStatsNode,
	CampNode,
	HopeComponent,
	TribeUpgradesNode
) {
	
	let TribeHelper = Ash.Class.extend({
		
		tribeUpgradesNodes: null,
		campNodes: null,
		plyerStatsNodes: null,

		constructor: function (engine) {
			this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
			this.campNodes = engine.getNodeList(CampNode);
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
		},

		hasDeity: function () {
			return this.playerStatsNodes.head.hope.hasDeity;
		},
		
		hasUpgrade: function (upgradeID) {
			if (!upgradeID) return true;
			return this.tribeUpgradesNodes.head.upgrades.hasUpgrade(upgradeID);
		},

		getAllUnlockedUpgrades: function () {
			return this.tribeUpgradesNodes.head.upgrades.boughtUpgrades;
		},
		
		getUpgradeStatus: function (upgradeID) {
			if (this.hasUpgrade(upgradeID))
				return UpgradeConstants.upgradeStatus.UNLOCKED;

			if (GameGlobals.playerActionsHelper.checkAvailability(upgradeID, false))
				return UpgradeConstants.upgradeStatus.UNLOCKABLE;

			if (GameGlobals.playerActionsHelper.isVisible(upgradeID))
				return UpgradeConstants.upgradeStatus.VISIBLE_FULL;

			if (this.tribeUpgradesNodes.head.upgrades.hasAvailableBlueprint(upgradeID))
				return UpgradeConstants.upgradeStatus.VISIBLE_FULL;

			if (this.isUpgradeRevealedByMilestone(upgradeID))
				return UpgradeConstants.upgradeStatus.VISIBLE_FULL;

			if (this.tribeUpgradesNodes.head.upgrades.hasNewBlueprint(upgradeID))
				return UpgradeConstants.upgradeStatus.BLUEPRINT_USABLE;

			if (this.tribeUpgradesNodes.head.upgrades.hasUnfinishedBlueprint(upgradeID))
				return UpgradeConstants.upgradeStatus.BLUEPRINT_IN_PROGRESS;

			if (this.isUpgradeRevealedByVisibleUpgrade(upgradeID))
				return UpgradeConstants.upgradeStatus.VISIBLE_HINT;
				
			return UpgradeConstants.upgradeStatus.HIDDEN;
		},

		isUpgradeRevealedByVisibleUpgrade: function (upgradeID) {
			let reqs = PlayerActionConstants.requirements[upgradeID];

			if (!reqs) return false;
			if (!reqs.upgrades) return false;
			if (reqs.blueprint) return false;
			if (reqs.milestone) return false;
			if (reqs.deity) return false;

			for (let requiredUpgradeID in reqs.upgrades) {
				if (requiredUpgradeID != upgradeID) return false;
			}
			
			return true;
		},
		
		isUpgradeRevealedByMilestone: function (upgradeID) {
			let currentMilestone = GameGlobals.tribeHelper.getCurrentMilestone();
			let revealingMilestoneIndex = GameGlobals.milestoneEffectsHelper.getMilestoneRevealingUpgrade(upgradeID);
			return revealingMilestoneIndex >= 0 && revealingMilestoneIndex <= currentMilestone.index;
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
		
		getCurrentHopeLimit: function () {
			let currentMilestone = this.getCurrentMilestone();
			return currentMilestone.maxHope || -1;
		},
		
		getCurrentInsightLimit: function () {
			let currentMilestone = this.getCurrentMilestone();
			return currentMilestone.maxInsight || -1;
		},
		
		getCurrentReputationBaseValue: function () {
			let milestone = this.getCurrentMilestone();
			return GameGlobals.tribeBalancingHelper.getReputationBaseValue(milestone.index);
		}
		
	});

	return TribeHelper;
});
