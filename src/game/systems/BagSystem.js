// A system that updates the player's resource storage capacity based on their currently equipped bag
define([
	'ash',
	'game/GameGlobals',
	'game/constants/ItemConstants',
	'game/constants/BagConstants',
	'game/constants/PerkConstants',
	'game/nodes/player/PlayerResourcesNode',
	'game/components/player/ItemsComponent',
	'game/components/player/FollowersComponent',
	'game/components/player/BagComponent',
	'game/components/player/PerksComponent',
	'game/vos/ResourcesVO'
], function (Ash, GameGlobals, ItemConstants, BagConstants, PerkConstants, PlayerResourcesNode, ItemsComponent, FollowersComponent, BagComponent, PerksComponent, ResourcesVO) {
	
	var BagSystem = Ash.System.extend({
		
		playerNodes: null,
	
		constructor: function () {
		},

		addToEngine: function (engine) {
			this.engine = engine;
			this.playerNodes = engine.getNodeList(PlayerResourcesNode);
		},

		removeFromEngine: function (engine) {
			this.playerNodes = null;
		},

		update: function () {
			var playerBag = this.playerNodes.head.entity.get(BagComponent);
			var playerResources = this.playerNodes.head.resources;
			var playerItems = this.playerNodes.head.entity.get(ItemsComponent);
			var playerFollowers = this.playerNodes.head.entity.get(FollowersComponent);
			
			var playerBagBonus = playerItems.getCurrentBonus(ItemConstants.itemBonusTypes.bag, null, true);
			var followerBagBonus = playerFollowers.getCurrentBonus(ItemConstants.itemBonusTypes.bag);
			let carryCapacity = Math.max(playerBagBonus, ItemConstants.PLAYER_DEFAULT_STORAGE) + followerBagBonus;
			
			playerResources.storageCapacity = carryCapacity;
			playerBag.baseCapacity = playerBagBonus;
			playerBag.totalCapacity = carryCapacity;
			playerBag.bonusCapacity = followerBagBonus;
			
			this.updateUsedCapacity(playerBag, playerResources, playerItems);
			
			var perksComponent = this.playerNodes.head.entity.get(PerksComponent);
			var hasWeightPerk = perksComponent.hasPerk(PerkConstants.perkIds.encumbered);
			var isEncumbered = playerBag.usedCapacity > playerBag.totalCapacity;
			if (isEncumbered && !hasWeightPerk) {
				perksComponent.addPerk(PerkConstants.getPerk(PerkConstants.perkIds.encumbered));
			} else if (!isEncumbered && hasWeightPerk) {
				perksComponent.removePerkById(PerkConstants.perkIds.encumbered);
			}
			
			GameGlobals.gameState.unlockedFeatures.bag = GameGlobals.gameState.unlockedFeatures.bag || playerItems.getAll().length > 0;
		},
		
		updateUsedCapacity: function (playerBag, playerResources, playerItems) {
			var usedCapacity = 0;
			var carriedItems = playerItems.getAll(false);
			usedCapacity += BagConstants.getResourcesCapacity(playerResources.resources);
			for (let i = 0; i < carriedItems.length; i++) {
				if (carriedItems[i].equipped) continue;
				 usedCapacity += BagConstants.getItemCapacity(carriedItems[i]);
			}
			playerBag.usedCapacity = usedCapacity;
		},
		
	});

	return BagSystem;
});
