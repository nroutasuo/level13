define([
	'ash',
	'game/constants/ItemConstants',
	'game/nodes/player/PlayerStatsNode'
], function (
	Ash,
	ItemConstants,
	PlayerStatsNode
) {
	
	var PlayerHelper = Ash.Class.extend({
		
		playerStatsNodes: null,

		constructor: function (engine) {
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
		},
		
		getCurrentBonus: function (itemBonusType) {
			var isMultiplier = ItemConstants.isMultiplier(itemBonusType);
			var result = isMultiplier ? 1 : 0;
			
			if (isMultiplier) {
				result *= this.playerStatsNodes.head.items.getCurrentBonus(itemBonusType);
				result *= this.playerStatsNodes.head.followers.getCurrentBonus(itemBonusType);
			} else {
				result += this.playerStatsNodes.head.items.getCurrentBonus(itemBonusType);
				result += this.playerStatsNodes.head.followers.getCurrentBonus(itemBonusType);
			}
			
			return result;
		}
		
	});

	return PlayerHelper;
});
