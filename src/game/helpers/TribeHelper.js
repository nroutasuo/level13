define([
	'ash',
	'game/nodes/tribe/TribeUpgradesNode'
], function (
	Ash,
	TribeUpgradesNode
) {
	
	var TribeHelper = Ash.Class.extend({
		
		tribeUpgradesNodes: null,

		constructor: function (engine) {
			this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
		},
		
		hasUpgrade: function (upgradeID) {
			if (!upgradeID) return true;
			return this.tribeUpgradesNodes.head.upgrades.hasUpgrade(upgradeID);
		}
	});

	return TribeHelper;
});
