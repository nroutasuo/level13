define(['ash', 'game/constants/ItemConstants'], function (Ash, ItemConstants) {

	var BagConstants = {
		
		CAPACITY_RESOURCE: 1,
		CAPACITY_ITEM_INGREDIENT: 0.1,
		CAPACITY_ITEM_EXPLORATION: 0.5,
		CAPACITY_ITEM_VOUCHER: 0.5,
		CAPACITY_ITEM_HEAVY: 2,
		CAPACITY_ITEM_DEFAULT: 1,
		CAPACITY_CURRENCY: 0.05,
		
		updateCapacity: function (bagComponent, rewards, playerResources, playerAllItems) {
			bagComponent.selectionStartCapacity = this.getSelectionStartCapacity(playerResources, playerAllItems);
			bagComponent.selectedCapacity = this.getSelectedCapacity(rewards, playerResources, playerAllItems);
			bagComponent.selectableCapacity = this.getSelectableCapacity(rewards, playerResources, playerAllItems);
		},

		getSelectionStartCapacity: function (playerResources, playerAllItems) {
			let originalResC = this.getResourcesCapacity(playerResources.resources);
			let originalItemC = this.getItemsCapacity(playerAllItems);

			return originalResC + originalItemC;
		},

		getSelectedCapacity: function (rewards, playerResources, playerAllItems) {
			let originalResC = this.getResourcesCapacity(playerResources.resources);
			let discardedResC = this.getResourcesCapacity(rewards.discardedResources);
			let lostResC = this.getResourcesCapacity(rewards.lostResources);
			let selectedResC = this.getResourcesCapacity(rewards.selectedResources);

			let originalItemC = this.getItemsCapacity(playerAllItems);
			let discardedItemC = this.getItemsCapacity(rewards.discardedItems);
			let lostItemC = this.getItemsCapacity(rewards.lostItems);
			let selectedItemC = this.getItemsCapacity(rewards.selectedItems);

			return originalResC - discardedResC - lostResC + selectedResC + originalItemC - discardedItemC - lostItemC + selectedItemC;
		},

		getSelectableCapacity: function (rewards, playerResources, playerAllItems) {
			let originalResC = this.getResourcesCapacity(playerResources.resources);
			let lostResC = this.getResourcesCapacity(rewards.lostResources);
			let gainedResC = this.getResourcesCapacity(rewards.gainedResources);

			let originalItemC = this.getItemsCapacity(playerAllItems);
			let lostItemC = this.getItemsCapacity(rewards.lostItems);
			let gainedItemC = this.getItemsCapacity(rewards.gainedItems);

			return originalResC - lostResC + gainedResC + originalItemC - lostItemC + gainedItemC;
		},
		
		getItemsCapacity: function (itemList) {
			var capacity = 0;
			for(let i = 0; i < itemList.length; i++) {
				if (itemList[i].equipped) continue;
				capacity += this.getItemCapacity(itemList[i]);
			}
			return capacity;
		},

		getItemCapacity: function (itemVO) {
			if (itemVO.weight) return itemVO.weight;
			if (itemVO.type === ItemConstants.itemTypes.bag) return 0;
			if (itemVO.type === ItemConstants.itemTypes.uniqueEquipment) return 0;
			if (itemVO.type === ItemConstants.itemTypes.exploration) return BagConstants.CAPACITY_ITEM_EXPLORATION;
			if (itemVO.type === ItemConstants.itemTypes.voucher) return BagConstants.CAPACITY_ITEM_VOUCHER;
			if (itemVO.type === ItemConstants.itemTypes.note) return BagConstants.CAPACITY_ITEM_VOUCHER;
			if (itemVO.type === ItemConstants.itemTypes.ingredient) return BagConstants.CAPACITY_ITEM_INGREDIENT;
			if (itemVO.type === ItemConstants.itemTypes.clothing_over) return BagConstants.CAPACITY_ITEM_HEAVY;
			if (itemVO.type === ItemConstants.itemTypes.clothing_lower) return BagConstants.CAPACITY_ITEM_HEAVY;
			if (itemVO.type === ItemConstants.itemTypes.clothing_upper) return BagConstants.CAPACITY_ITEM_HEAVY;
			if (itemVO.type === ItemConstants.itemTypes.weapon) return BagConstants.CAPACITY_ITEM_HEAVY;
			return BagConstants.CAPACITY_ITEM_DEFAULT;
		},
		
		getResourcesCapacity: function (resourcesVO) {
			return resourcesVO.getTotal() * BagConstants.CAPACITY_RESOURCE;
		},
		
		getResourceCapacity: function (resourceName) {
			return BagConstants.CAPACITY_RESOURCE;
		}

	};
	
	return BagConstants;
});
