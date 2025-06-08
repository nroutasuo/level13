// A system that updates the player's resource storage capacity based on their currently equipped bag
define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/ItemConstants',
	'game/constants/BagConstants',
	'game/constants/PerkConstants',
	'game/nodes/player/PlayerResourcesNode',
	'game/components/player/ItemsComponent',
	'game/components/player/ExplorersComponent',
	'game/components/player/BagComponent',
	'game/components/player/PerksComponent',
	'game/vos/ResourcesVO'
], function (Ash, GameGlobals, GlobalSignals, ItemConstants, BagConstants, PerkConstants, PlayerResourcesNode, ItemsComponent, ExplorersComponent, BagComponent, PerksComponent, ResourcesVO) {
	
	let BagSystem = Ash.System.extend({
		
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
			var playerExplorers = this.playerNodes.head.entity.get(ExplorersComponent);
			
			var playerBagBonus = playerItems.getCurrentBonus(ItemConstants.itemBonusTypes.bag, null, true);
			var explorerBagBonus = playerExplorers.getCurrentBonus(ItemConstants.itemBonusTypes.bag);
			let baseCapacity = Math.max(playerBagBonus, ItemConstants.PLAYER_DEFAULT_STORAGE);
			let carryCapacity = baseCapacity + explorerBagBonus;
			
			playerResources.storageCapacity = carryCapacity;
			playerBag.baseCapacity = baseCapacity;
			playerBag.bonusCapacity = explorerBagBonus;
			playerBag.totalCapacity = carryCapacity;
			
			this.updateUsedCapacity(playerBag, playerResources, playerItems);
			
			var perksComponent = this.playerNodes.head.entity.get(PerksComponent);
			var hasWeightPerk = perksComponent.hasPerk(PerkConstants.perkIds.encumbered);
			var isEncumbered = playerBag.usedCapacity > playerBag.totalCapacity;
			if (isEncumbered && !hasWeightPerk) {
				perksComponent.addPerk(PerkConstants.getPerk(PerkConstants.perkIds.encumbered));
			} else if (!isEncumbered && hasWeightPerk) {
				perksComponent.removePerkById(PerkConstants.perkIds.encumbered);
			}
			
			if (playerItems.getAll().length > 0) {
				GameGlobals.playerActionFunctions.unlockFeature("bag");
			}
		},
		
		updateUsedCapacity: function (playerBag, playerResources, playerItems) {
			let oldUsedCapacity = playerBag.usedCapacity;
			let usedCapacity = 0;
			let carriedItems = playerItems.getAll(false, true);
			usedCapacity += BagConstants.getResourcesCapacity(playerResources.resources);

			for (let i = 0; i < carriedItems.length; i++) {
				if (carriedItems[i].equipped) continue;
				 usedCapacity += BagConstants.getItemCapacity(carriedItems[i]);
			}
			playerBag.usedCapacity = usedCapacity;

			if (usedCapacity != oldUsedCapacity) {
				GlobalSignals.storageCapacityChangedSignal.dispatch();
			}
		},
		
	});

	return BagSystem;
});
