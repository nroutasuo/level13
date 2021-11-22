define([
	'ash',
	'game/constants/FollowerConstants',
	'game/constants/ItemConstants',
	'game/nodes/PlayerPositionNode',
	'game/nodes/player/PlayerStatsNode'
], function (
	Ash,
	FollowerConstants,
	ItemConstants,
	PlayerPositionNode,
	PlayerStatsNode
) {
	
	var PlayerHelper = Ash.Class.extend({
		
		playerPosNodes: null,
		playerStatsNodes: null,

		constructor: function (engine) {
			this.playerPosNodes = engine.getNodeList(PlayerPositionNode);
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
		},
		
		isInCamp: function () {
			if (!this.playerPosNodes.head) return false;
			return this.playerPosNodes.head.position.inCamp;
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
		},
		
		getCurrentBonusDesc: function (itemBonusType) {
			let result = "";
			
			let items = this.playerStatsNodes.head.items.getEquipped();
			for (let i = 0; i < items.length; i++) {
				let item = items[i];
				let itemBonus = item.getBonus(itemBonusType);
				if (itemBonus > 0) {
					if (result.length > 0) result += "<br/>";
					result += item.name + ": " + itemBonus;
				}
			}
			
			let followers = this.playerStatsNodes.head.followers.getParty();
			for (let i = 0; i < followers.length; i++) {
				let follower = followers[i];
				let followerBonus = FollowerConstants.getFollowerItemBonus(follower, itemBonusType);
				if (followerBonus > 0) {
					if (result.length > 0) result += "<br/>";
					result += follower.name + ": " + Math.round(followerBonus*10)/10;
				}
			}
			
			return result;
		},
		
		addItem: function (itemDef, sourcePosition) {
			var itemsComponent = this.playerStatsNodes.head.items;
			var playerPosition = this.playerPosNodes.head.position.getPosition();
			sourcePosition = sourcePosition || playerPosition.clone();
			
			var item = itemDef.clone();
			
			itemsComponent.addItem(item, !playerPosition.inCamp && sourcePosition.equals(playerPosition));
			item.foundPosition = sourcePosition.clone();
		},
		
	});

	return PlayerHelper;
});
