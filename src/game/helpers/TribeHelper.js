define([
	'ash',
	'game/nodes/sector/CampNode',
	'game/nodes/tribe/TribeUpgradesNode'
], function (
	Ash,
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
		
	});

	return TribeHelper;
});
