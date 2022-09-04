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

		discardItem: function (item, autoEquip) {
			if (!item) log.w("Trying to discard null item.");
			if (!this.isItemDiscardable(item)) {
				log.w("Trying to discard un-discardable item.");
				return;
			}
			

			if (typeof this.items[item.type] !== 'undefined') {
				var typeItems = this.items[item.type];
				var splicei = -1;
				for (let i = 0; i < typeItems.length; i++) {
					if (typeItems[i].id === item.id && typeItems[i].equipped == item.equipped) {
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
				} else {
					log.w("Item to discard not found.");
				}
			}
		},

		isItemDiscardable: function (item) {
			return this.isItemsDiscardable(item) || this.getCount(item, true) > 1;
		},

		isItemsDiscardable: function (item) {
			if (!item) return false;
			switch (item.type) {
				case ItemConstants.itemTypes.bag:
					return this.getStrongestByType(item.type).id !== item.id;

				case ItemConstants.itemTypes.uniqueEquipment:
					return false;

				default: return true;
			}
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
			var shouldEquip = item.equippable;
			if (shouldEquip) {
				for (let i = 0; i < this.items[item.type].length; i++) {
					var existingItem = this.items[item.type][i];
					if (existingItem.itemID === item.itemID) continue;
					if (existingItem.equipped && !(this.isItemMultiEquippable(existingItem) && this.isItemMultiEquippable(item))) {
						var isExistingBonusBetter = existingItem.getCurrentTotalBonus() >= item.getCurrentTotalBonus();
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
			var best = null;
			for (let i = 0; i < this.items[itemType].length; i++) {
				var item = this.items[itemType][i];
				if (!item.equippable) continue;
				if (best === null || best.getCurrentTotalBonus() < item.getCurrentTotalBonus()) {
					 best = item;
				}
			}

			if (best!== null) this.autoEquip(best);
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
			if (this.isItemUnequippable(item)) {
				item.equipped = false;
			}
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
							let itemBonus = item.getCurrentBonus(bonusType);
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

		getAll: function (includeNotCarried) {
			var all = [];
			var item;
			for (var key in this.items) {
				for (let i = 0; i < this.items[key].length; i++) {
					item = this.items[key][i];
					if (includeNotCarried || item.carried) all.push(item);
				}
			}
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

		getUnique: function (includeNotCarried) {
			let result = [];
			let resultMap = {};

			for (let key in this.items) {
				for( let i = 0; i < this.items[key].length; i++) {
					let item = this.items[key][i];
					if (includeNotCarried || item.carried) {
						var itemKey = item.id + (item.broken ? "_b" : "");
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
				if (!weakest || item.getCurrentTotalBonus() < weakest.getCurrentTotalBonus()) weakest = item;
			}
			return weakest;
		},

		getStrongestByType: function (type) {
			var strongest = null;
			for (let i = 0; i < this.items[type].length; i++) {
				var item = this.items[type][i];
				if (!strongest || item.getCurrentTotalBonus() > strongest.getCurrentTotalBonus()) strongest = item;
			}
			return strongest;
		},

		getItem: function (id, instanceId, includeNotCarried, includeEquipped) {
			for (var key in this.items) {
				for( let i = 0; i < this.items[key].length; i++) {
					var item = this.items[key][i];
					if (id && id != item.id) continue;
					if (instanceId && instanceId != item.itemID) continue;
					if (!includeNotCarried && !item.carried) continue;
					if (!includeEquipped && item.equipped) continue;
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

		contains: function (name) {
			for (var key in this.items) {
				for (let i = 0; i < this.items[key].length; i++) {
					if(this.items[key][i].name == name) return true;
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
			return b.getCurrentTotalBonus() - a.getCurrentTotalBonus();
		},

		getSaveKey: function () {
			return "Items";
		},

		getCustomSaveObject: function () {
			var copy = {};
			copy.items = {};
			for(var key in this.items) {
				copy.items[key] = [];
				for (let i = 0; i < this.items[key].length; i++) {
					var item = this.items[key][i];
					copy.items[key][i] = item.getCustomSaveObject();
				}
			}
			return copy;
		},

		customLoadFromSave: function (componentValues) {
			for(var key in componentValues.items) {
				for (let i in componentValues.items[key]) {
					var id = componentValues.items[key][i].id;
					var definition = ItemConstants.getItemByID(id);
					if (!definition) {
						log.w("no item definition found: " + id);
						continue;
					}
					var item = definition.clone();
					item.itemID = componentValues.items[key][i].itemID;
					item.foundPosition = componentValues.items[key][i].foundPosition;
					item.broken = componentValues.items[key][i].broken == 1;
					var carried = componentValues.items[key][i].carried;
					this.addItem(item, carried);
					if (componentValues.items[key][i].equipped) {
						this.equip(item);
					}
				}
			}
		}
	});

	return ItemsComponent;
});
