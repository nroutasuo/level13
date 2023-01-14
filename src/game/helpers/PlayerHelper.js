define([
	'ash',
	'utils/ValueCache',
	'game/GameGlobals',
	'game/constants/FollowerConstants',
	'game/constants/ItemConstants',
	'game/constants/PlayerStatConstants',
	'game/nodes/PlayerPositionNode',
	'game/nodes/player/PlayerStatsNode'
], function (
	Ash,
	ValueCache,
	GameGlobals,
	FollowerConstants,
	ItemConstants,
	PlayerStatConstants,
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
		
		getCurrentStamina: function () {
			return this.playerStatsNodes.head.stamina.stamina;
		},
		
		getCurrentStaminaWarningLimit: function () {
			return ValueCache.getValue("StaminaWarningLimit", 5, this.playerPosNodes.head.position.positionId(), () => PlayerStatConstants.getStaminaWarningLimit(this.playerStatsNodes.head.stamina));
		},
		
		hasItem: function (id) {
			let itemsComponent = this.playerStatsNodes.head.items;
			return itemsComponent.getCountById(id, true) > 0;
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
				let itemBonus = item.getCurrentBonus(itemBonusType);
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
			
			switch (itemBonusType) {
				case ItemConstants.itemBonusTypes.movement:
					let playerPosition = this.playerPosNodes.head.position.getPosition();
					let sector = GameGlobals.levelHelper.getSectorByPosition(playerPosition.level, playerPosition.sectorX, playerPosition.sectorY)
					let beaconBonus = GameGlobals.sectorHelper.getBeaconMovementBonus(sector, this.playerStatsNodes.head.perks);
					if (beaconBonus !== 1) {
						if (result.length > 0) result += "<br/>";
						result += "Beacon: " + beaconBonus;
					}
					let debrisMalus = GameGlobals.sectorHelper.getDebrisMovementMalus(sector);
					if (debrisMalus !== 1) {
						if (result.length > 0) result += "<br/>";
						result += "Debirs: " + debrisMalus;
					}
					break;
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
		
		getBestAvailableFollower: function (followerType) {
			let followersComponent = this.playerStatsNodes.head.followers;
			let followers = followersComponent.getFollowersByType(followerType, false);
			let result = null;
			let resultLevel = 0;
			for (let i = 0; i < followers.length; i++) {
				let follower = followers[i];
				if (follower.abilityLevel > resultLevel) {
					result = follower;
					resultLevel = follower.abilityLevel;
				}
			}
			return result;
		},
		
	});

	return PlayerHelper;
});
