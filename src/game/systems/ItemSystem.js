// Handles item wear and durability
define([
	'ash',
	'text/Text',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/ItemConstants',
	'game/constants/LogConstants',
	'game/nodes/player/PlayerResourcesNode',
	'game/components/player/ItemsComponent',
], function (Ash, Text, GameGlobals, GlobalSignals, ItemConstants, LogConstants, PlayerResourcesNode, ItemsComponent) {
	
	let ItemSystem = Ash.System.extend({

		context: "ItemSystem",
		
		playerNodes: null,
	
		constructor: function () { },

		addToEngine: function (engine) {
			this.engine = engine;
			this.playerNodes = engine.getNodeList(PlayerResourcesNode);
			GlobalSignals.add(this, GlobalSignals.fightEndedSignal, this.onFightEnded);
			GlobalSignals.add(this, GlobalSignals.playerMoveCompletedSignal, this.onMoveFinished);
		},

		removeFromEngine: function (engine) {
			GlobalSignals.removeAll(this);
			this.playerNodes = null;
		},

		update: function () { },

		applyWear: function (item, amount) {
			if (!item || !item.equippable) return;
			
			let maxWear = ItemConstants.getMaxWear(item);
			if (maxWear <= 0) return;
			
			item.wear = (item.wear || 0) + amount;
			if (item.wear >= maxWear) {
				item.wear = maxWear;
				if (!item.broken) {
					item.broken = true;
					let itemName = ItemConstants.getItemDisplayName(item) || item.id;
					GameGlobals.playerHelper.addLogMessage(LogConstants.getUniqueID(), Text.t("ui.log.item_broke_from_wear_message", { name: itemName }));
					log.i("Item broke from wear: " + item.id, this);
				}
			}
		},

		onFightEnded: function () {
			let sys = this;
			if (!sys.playerNodes || !sys.playerNodes.head) return;
			
			let itemsComponent = sys.playerNodes.head.entity.get(ItemsComponent);
			if (!itemsComponent) return;

			let weapons = itemsComponent.getEquipped(ItemConstants.itemTypes.weapon);
			for (let i = 0; i < weapons.length; i++) {
				sys.applyWear(weapons[i], 1);
			}
		},

		onMoveFinished: function (position) {
			// if position is defined it was a real move and not a hack to refresh things
			if (!position) return;

			let sys = this;
			if (!sys.playerNodes || !sys.playerNodes.head) return;
			
			let itemsComponent = sys.playerNodes.head.entity.get(ItemsComponent);
			if (!itemsComponent) return;

			let equipped = itemsComponent.getEquipped();
			for (let i = 0; i < equipped.length; i++) {
				let item = equipped[i];
				if (item.type !== ItemConstants.itemTypes.weapon) {
					sys.applyWear(item, 1);
				}
			}
		},
	});

	return ItemSystem;
});
