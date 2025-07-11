define(['ash', 'game/vos/ItemVO', 'game/constants/ItemConstants'],
function (Ash, ItemVO, ItemConstants) {

	var ItemsComponent = Ash.Class.extend({

		items: {},
		
		uniqueItems: [],
		uniqueItemsCarried: [],

		constructor: function () {
			this.items = {};
		},

		addItem: function (item, isCarried) {
			if (!item) {
				log.w("Trying to add undefined item.");
				return;
			}

			if (this.getItem(item.id, item.itemID, true, true)) {
				log.w("Trying to add duplicate item: " + item.id);
				return;
			}

			if (typeof this.items[item.type] === 'undefined') {
				this.items[item.type] = [];
			}

			this.items[item.type].push(item);
			item.carried = isCarried;
		},

		removeItem: function (item, autoEquip) {
			if (!item) {
				log.w("Trying to remove null item.");
				return;
			}

			let longID = ItemConstants.getLongItemID(item);

			// for ingredients itemID alone isn't a perfect guarantee it's the right kind of item
			let isMatchingItem = function (i) {
				if (i.itemID !== item.itemID) return false;
				if (i.equipped !== item.equipped) return false;
				if (i.broken !== item.broken) return false;
				if (ItemConstants.getLongItemID(i) != longID) return false;
				return true;
			}
			
			if (typeof this.items[item.type] !== 'undefined') {
				var typeItems = this.items[item.type];
				var splicei = -1;
				for (let i = 0; i < typeItems.length; i++) {
					if (isMatchingItem(typeItems[i])) {
						splicei = i;
						if (typeItems[i].carried) {
							break;
						}
					}
				}
				
				if (splicei >= 0) {
					typeItems.splice(splicei, 1);
					if (autoEquip && item.equipped) {
						var nextItem = this.getSimilar(item);
						if (nextItem) this.equip(nextItem);
					}
					return;
				}
			}

			log.w("Item to remove not found.");
		},

		discardItem: function (item, isInCamp, autoEquip) {
			if (!item) {
				log.w("Trying to discard null item.");
				return;
			}
			
			if (!this.isItemDiscardable(item, isInCamp)) {
				log.w("Trying to discard un-discardable item.");
				return;
			}
			
			if (!ItemConstants.isUnselectable(item)) {
				log.w("Trying to discard non unselectable item.");
				return;
			}

			this.removeItem(item, autoEquip);
		},

		isItemDiscardable: function (item, isInCamp) {
			if (!item) return false;
			if (!ItemConstants.isUnselectable(item)) return false;
			switch (item.type) {
				case ItemConstants.itemTypes.bag:
					if (this.getStrongestByType(item.type).id === item.id && this.getCountById(item.id, isInCamp) === 1) return false;
					return true;

					
				case ItemConstants.itemTypes.voucher:
				case ItemConstants.itemTypes.note:
				case ItemConstants.itemTypes.uniqueEquipment:
					return false;
			}

			return true;
		},
		
		getEquipmentComparison: function (item) {
			if (!item) return -1;
			if (item.equipped) return 0;
			if (!item.equippable) return -1;
			var currentItems = this.getEquipped(item.type);
			return this.getEquipmentComparisonWithItems(item, currentItems);
		},
		
		getAllEquipmentComparison: function (item, includeNotCarried) {
			if (!item) return -1;
			if (!item.equippable) return -1;
			var currentItems = this.getAllByType(item.type, includeNotCarried);
			return this.getEquipmentComparisonWithItems(item, currentItems);
		},
		
		getEquipmentComparisonWithItems: function (item, items) {
			if (!item) return 0;
			if (!items || items.length == 0) return this.getEquipmentComparisonWithItem(item, null);
			let result = 0;
			for (let i = 0; i < items.length; i++) {
				if (i == 0) {
					result = this.getEquipmentComparisonWithItem(item, items[i]);
				} else {
					result = Math.min(result, this.getEquipmentComparisonWithItem(item, items[i]));
				}
			}
			return result;
		},
		
		getEquipmentComparisonWithItem: function (item, currentItem) {
			return ItemConstants.getEquipmentComparison(currentItem, item);
		},

		// Equips the given item if it's better than the previous equipment (based on total bonus)
		autoEquip: function (item) {
			let shouldEquip = item.equippable;
			if (shouldEquip) {
				for (let i = 0; i < this.items[item.type].length; i++) {
					var existingItem = this.items[item.type][i];
					if (existingItem.itemID === item.itemID) continue;
					if (existingItem.equipped && !(this.isItemMultiEquippable(existingItem) && this.isItemMultiEquippable(item))) {
						let isExistingBonusBetter = ItemConstants.getCurrentTotalBonus(existingItem) >= ItemConstants.getCurrentTotalBonus(item);
						if (!isExistingBonusBetter) {
							this.unequip(existingItem);
						}
						if (isExistingBonusBetter) {
							shouldEquip = false;
						}
					}
				}
			}

			if (shouldEquip) this.equip(item);
			else item.equipped = false;
		},

		autoEquipAll: function () {
			for (var key in this.items) {
				this.autoEquipByType(key);
			}
		},

		autoEquipByType: function (itemType) {
			let best = null;
			for (let i = 0; i < this.items[itemType].length; i++) {
				var item = this.items[itemType][i];
				if (!item.equippable) continue;
				if (best === null || ItemConstants.getCurrentTotalBonus(best) < ItemConstants.getCurrentTotalBonus(item)) {
					 best = item;
				}
			}

			if (best!== null) this.autoEquip(best);
		},
		
		autoEquipByBonusType: function (itemBonusType, includeNotCarried) {
			for (let key in this.items) {
				let defaultBonusType = ItemConstants.getItemTypeDefaultBonus(key);
				let bestItem = null;
				let bestItemBonus = 0;
				let bestItemTiebreakerBonus = 0;
				for (let i = 0; i < this.items[key].length; i++) {
					let item = this.items[key][i];
					if (!item.equippable) continue;
					if (!includeNotCarried && !item.carried) continue;
					let itemBonus = ItemConstants.getItemBonusComparisonValue(item, itemBonusType);
					let tiebreakerBonus = defaultBonusType ? ItemConstants.getItemBonusComparisonValue(item, defaultBonusType) : ItemConstants.getItemBonusComparisonValue(item);
					if (itemBonus > bestItemBonus || (itemBonus == bestItemBonus && tiebreakerBonus > bestItemTiebreakerBonus)) {
						bestItem = item;
						bestItemBonus = itemBonus;
						bestItemTiebreakerBonus = tiebreakerBonus;
					}
				}
				
				if (bestItem != null) {
					this.equip(bestItem);
				}
			}
		},

		isItemMultiEquippable: function (item) {
			return false;
		},

		isItemUnequippable: function (item) {
			return true;
		},

		// Equips the given item regardless of whether it's better than the previous equipment
		equip: function (item) {
			if (!item) return;
			if (item.equipped) return;
			if (item.equippable) {
				var previousItems = this.getEquipped(item.type);
				for (let i = 0; i < previousItems.length; i++) {
					var previousItem = previousItems[i];
					if (previousItem && previousItem.itemID !== item.itemID) {
						if (!(this.isItemMultiEquippable(item) && this.isItemMultiEquippable(previousItem))) {
							this.unequip(previousItem);
						}
					}
				}
				item.equipped = true;
			}
		},

		unequip: function (item) {
			if (!item) {
				log.w("trying to unequip null item");
				return;
			}

			if (!this.isItemUnequippable(item)) {
				log.w("trying to unequip an unequippable item");
				return;	
			}

			item.equipped = false;
		},

		getEquipped: function (type) {
			var equipped = [];
			for (var key in this.items) {
				if (key == type || !type) {
					for( let i = 0; i < this.items[key].length; i++) {
						var item = this.items[key][i];
						if (item.equipped) equipped.push(item);
					}
				}
			}
			return equipped.sort(this.itemSortFunction);
		},

		getCurrentBonus: function (bonusType, itemType) {
			var isMultiplier = ItemConstants.isMultiplier(bonusType);
			var bonus = isMultiplier ? 1 : 0;
			for (var key in this.items) {
				if (!itemType || itemType === key) {
					for (let i = 0; i < this.items[key].length; i++) {
						var item = this.items[key][i];
						if (item.equipped) {
							let itemBonus = ItemConstants.getCurrentBonus(item, bonusType);
							if (isMultiplier) {
								if (itemBonus != 0) {
									bonus *= itemBonus;
								}
							} else {
								bonus += itemBonus;
							}
						}
					}
				}
			}
			return bonus;
		},

		getAll: function (includeNotCarried, skipSort) {
			var all = [];
			var item;
			for (var key in this.items) {
				for (let i = 0; i < this.items[key].length; i++) {
					item = this.items[key][i];
					if (includeNotCarried || item.carried) all.push(item);
				}
			}

			if (skipSort) return all;

			return all.sort(this.itemSortFunction);
		},

		getAllByType: function (type, includeNotCarried) {
			if (!this.items[type]) return [];
			var all = [];
			var item;
			for (let i = 0; i < this.items[type].length; i++) {
				item = this.items[type][i];
				if (includeNotCarried || item.carried) all.push(item);
			}
			return all.sort(this.itemSortFunction);
		},

		getUniqueByID: function (includeNotCarried) {
			return this.getUnique(includeNotCarried, itemVO => itemVO.id);
		},

		getUniqueByIDAndState: function (includeNotCarried) {
			return this.getUnique(includeNotCarried, itemVO => itemVO.id + (itemVO.broken ? "_b" : "") + ItemConstants.getItemQuality(itemVO));
		},

		getUnique: function (includeNotCarried, getID) {
			let result = [];
			let resultMap = {};

			for (let key in this.items) {
				for( let i = 0; i < this.items[key].length; i++) {
					let item = this.items[key][i];
					if (includeNotCarried || item.carried) {
						var itemKey = getID(item);	
						if (resultMap[itemKey]) {
							resultMap[itemKey] = resultMap[itemKey] + 1;
						} else {
							result.push(item);
							resultMap[itemKey] = 1;
						}
					}
				}
			}
			
			return result.sort(this.itemSortFunction);
		},

		getCount: function (item, includeNotCarried) {
			if (!item) return 0;
			return this.getCountByIdAndStatus(item.id, item.broken, includeNotCarried);
		},

		getCountById: function (id, includeNotCarried) {
			let result = 0;
			
			for (let key in this.items) {
				for (let i = 0; i < this.items[key].length; i++) {
					var item = this.items[key][i];
					if (!includeNotCarried && !item.carried) continue;
					if (item.id == id) {
						result++;
					}
				}
			}
			
			return result;
		},
		
		getCountByBaseId: function (itemBaseId, includeNotCarried) {
			let result = 0;
			
			for (let key in this.items) {
				for (let i = 0; i < this.items[key].length; i++) {
					var item = this.items[key][i];
					if (!includeNotCarried && !item.carried) continue;
					let baseID = ItemConstants.getBaseItemID(item.id);
					if (baseID == itemBaseId) {
						result++;
					}
				}
			}
			
			return result;
		},
		
		getCountByIdAndStatus: function (id, isBroken, includeNotCarried) {
			let result = 0;
			
			for (let key in this.items) {
				for (let i = 0; i < this.items[key].length; i++) {
					let item = this.items[key][i];
					if (!includeNotCarried && !item.carried) continue;
					if (item.id == id && item.broken == isBroken) {
						result++;
					}
				}
			}
								
			return result;
		},

		getCountByType: function (type) {
			return this.items[type] ? this.items[type].length : 0;
		},

		getWeakestByType: function (type) {
			var weakest = null;
			for (let i = 0; i < this.items[type].length; i++) {
				var item = this.items[type][i];
				if (!weakest || ItemConstants.getCurrentTotalBonus(item) < ItemConstants.getCurrentTotalBonus(weakest)) weakest = item;
			}
			return weakest;
		},

		getStrongestByType: function (type) {
			var strongest = null;
			for (let i = 0; i < this.items[type].length; i++) {
				var item = this.items[type][i];
				if (!strongest || ItemConstants.getCurrentTotalBonus(item) > ItemConstants.getCurrentTotalBonus(strongest)) strongest = item;
			}
			return strongest;
		},

		getItem: function (id, instanceId, includeNotCarried, includeEquipped, filter) {
			for (var key in this.items) {
				for( let i = 0; i < this.items[key].length; i++) {
					var item = this.items[key][i];
					if (id && id != item.id) continue;
					if (instanceId && instanceId != item.itemID) continue;
					if (!includeNotCarried && !item.carried) continue;
					if (!includeEquipped && item.equipped) continue;
					if (filter && !filter(item)) continue;
					return item;
				}
			}
			return null;
		},

		getSimilar: function (item) {
			for (var key in this.items) {
				for( let i = 0; i < this.items[key].length; i++) {
					var otherItem = this.items[key][i];
					if (item.itemID != otherItem.itemID && item.id == otherItem.id) {
						return otherItem;
					}
				}
			}
			return null;
		},

		isEquipped: function (item) {
			let equippedItems = this.getEquipped(item.type);
			return equippedItems.length > 0 && equippedItems[0].id == item.id;
		},

		contains: function (id) {
			for (var key in this.items) {
				for (let i = 0; i < this.items[key].length; i++) {
					if(this.items[key][i].id == id) return true;
				}
			}
			return false;
		},

		itemSortFunction: function(a, b) {
			if (!a.equipped && b.equipped) return 1;
			if (a.equipped && !b.equipped) return -1;
			if (!a.equippable && b.equippable) return 1;
			if (a.equippable && !b.equippable) return -1;

			var getSortTypeValue = function (t) {
			switch (t) {
				case ItemConstants.itemTypes.bag:
				return 1;
				case ItemConstants.itemTypes.weapon:
				return 2;
				case ItemConstants.itemTypes.clothing_over:
				return 3;
				case ItemConstants.itemTypes.clothing_upper:
				return 4;
				case ItemConstants.itemTypes.clothing_lower:
				return 5;
				case ItemConstants.itemTypes.clothing_head:
				return 6;
				case ItemConstants.itemTypes.clothing_hands:
				return 7;
				case ItemConstants.itemTypes.shoes:
				return 8;
				case ItemConstants.itemTypes.light:
				return 9;
				default:
				return 100;
			}
			};
			if (getSortTypeValue(a.type) > getSortTypeValue(b.type)) return 1;
			if (getSortTypeValue(a.type) < getSortTypeValue(b.type)) return -1;
			return ItemConstants.getCurrentTotalBonus(b) - ItemConstants.getCurrentTotalBonus(a);
		},

		getSaveKey: function () {
			return "Items";
		},

		getCustomSaveObject: function () {
			let copy = {};
			copy.items = {};
			copy.ingredientsCarried = {};
			copy.ingredientsNotCarried = {};

			for (let key in this.items) {
				copy.items[key] = [];
				for (let i = 0; i < this.items[key].length; i++) {
					let item = this.items[key][i];
					if (key == ItemConstants.itemTypes.ingredient) {
						let id = item.id;
						if (item.carried) {
							if (!copy.ingredientsCarried[id]) copy.ingredientsCarried[id] = 0;
							copy.ingredientsCarried[id]++;
						} else {
							if (!copy.ingredientsNotCarried[id]) copy.ingredientsNotCarried[id] = 0;
							copy.ingredientsNotCarried[id]++;
						}
					} else {
						copy.items[key][i] = item.getCustomSaveObject();
					}
				}
			}
			
			return copy;
		},

		customLoadFromSave: function (componentValues) {
			let component = this;

			for (let key in componentValues.items) {
				for (let i in componentValues.items[key]) {
					let savedItem =  componentValues.items[key][i];
					if (!savedItem || !savedItem.id) continue;
					let itemID = ItemConstants.getItemIDFromSaved(savedItem.id);
					let definition = ItemConstants.getItemDefinitionByID(itemID);
					if (!definition) continue;

					let item = definition.clone(savedItem);
					let carried = savedItem.carried || false;
					let equipped = savedItem.equipped || false;

					this.addItem(item, carried);
					if (equipped) {
						this.equip(item);
					}
				}
			}

			let addIngredients = function (source, carried) {
				for (let ingredientID in source) {
					let num = source[ingredientID];
					let definition = ItemConstants.getItemDefinitionByID(ingredientID);
					if (!definition) continue;

					for (let i = 0; i < num; i++) {
						let item = definition.clone();
						component.addItem(item, carried);
					}
				}
			};

			addIngredients(componentValues.ingredientsCarried, true);
			addIngredients(componentValues.ingredientsNotCarried, false);
		}
	});

	return ItemsComponent;
});
