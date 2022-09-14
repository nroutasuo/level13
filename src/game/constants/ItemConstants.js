define(['ash', 'json!game/data/ItemData.json', 'game/constants/PlayerActionConstants', 'game/constants/UpgradeConstants', 'game/constants/WorldConstants', 'game/vos/ItemVO'],
function (Ash, ItemData, PlayerActionConstants, UpgradeConstants, WorldConstants, ItemVO) {

	var ItemConstants = {
		
		PLAYER_DEFAULT_STORAGE: 10,
		
		MAX_RANDOM_EQUIPMENT_STASH_RARITY: 6,
			
		STASH_TYPE_ITEM: "item",
		STASH_TYPE_SILVER: "silver",
		
		itemTypes: {
			// Equippable / slots:
			light: "light",
			weapon: "weapon",
			clothing_over: "clothing_over",
			clothing_upper: "clothing_upper",
			clothing_lower: "clothing_lower",
			clothing_hands: "clothing_hands",
			clothing_head: "clothing_head",
			shoes: "shoes",
			bag: "bag",
			// Special effects / one-use:
			ingredient: "ingredient",
			voucher: "voucher",
			exploration: "exploration",
			uniqueEquipment: "uniqueEquipment",
			// Just inventory - no effects:
			artefact: "artefact",
			trade: "trade",
			note: "note",
		},
		
		itemTypesEquipment: {
			bag: "bag",
			light: "light",
			weapon: "weapon",
			clothing_over: "clothing_over",
			clothing_upper: "clothing_upper",
			clothing_lower: "clothing_lower",
			clothing_hands: "clothing_hands",
			clothing_head: "clothing_head",
			shoes: "shoes",
		},
		
		itemBonusTypes: {
			light: "light",
			fight_att: "att",
			fight_def: "def",
			fight_speed: "spd",
			fight_shield: "shield",
			movement: "movement",
			scavenge_cost: "scavenge_cost",
			scavenge_general: "scavenge_general",
			scavenge_ingredients: "scavenge_ingredients",
			scavenge_supplies: "scavenge_supplies",
			scout_cost: "scout_cost",
			bag: "bag",
			res_cold: "warmth",
			res_radiation: "res_rad",
			res_poison: "res_poison",
			shade: "shade",
			detect_hazards: "detect_hazards",
			detect_supplies: "detect_supplies",
			detect_ingredients: "detect_ingredients",
		},
		
		bookTypes: {
			history: "history",
			fiction: "fiction",
			science: "science",
			engineering: "engineering",
		},
		
		itemDefinitions: {},
		
		// caches
		itemByID: {},
		equipmentComparisonCache: {},

		loadData: function (data) {
			for (itemID in data) {
				let item = data[itemID];
				let bonuses = item.bonuses;
				let type = item.type;
				if (!this.itemDefinitions[type]) this.itemDefinitions[type] = [];
				let isRepairable = item.isRepairable;
				if (isRepairable === undefined) {
					isRepairable = item.isCraftable && item.isEquippable;
				}
				var itemVO = new ItemVO(item.id, item.name, item.type, item.level || 1, item.campOrdinalRequired, item.campOrdinalMaximum, item.isEquippable, item.isCraftable, isRepairable, item.isUseable, bonuses, item.icon, item.description, item.isSpecialEquipment);
				itemVO.scavengeRarity = item.rarityScavenge;
				itemVO.investigateRarity = item.rarityInvestigate;
				itemVO.localeRarity = item.rarityLocale;
				itemVO.tradeRarity = item.rarityTrade;
				itemVO.configData = item.configData || {};
				itemVO.nameShort = item.nameShort || null;
				itemVO.tradePrice = item.tradePrice;
				this.itemDefinitions[type].push(itemVO);
				this.itemByID[itemID] = itemVO;
			}
		},
		
		getItemTypeDisplayName: function (type, short) {
			switch (type) {
				case ItemConstants.itemTypes.clothing_over:
					return short ? "over" : "clothing (over)";
				case ItemConstants.itemTypes.clothing_upper:
					return short ? "upper" : "clothing (upper body)";
				case ItemConstants.itemTypes.clothing_lower:
					return short ? "lower" : "clothing (lower body)";
				case ItemConstants.itemTypes.clothing_hands:
					return short ? "hands" : "clothing (hands)";
				case ItemConstants.itemTypes.clothing_head:
					return short ? "head" : "clothing (head)";
				case ItemConstants.itemTypes.ingredient:
					return short ? "ingredient" : "crafting ingredient";
				case ItemConstants.itemTypes.voucher:
					return short ? "consumable" : "consumable";
			}
			return ItemConstants.itemTypes[type];
		},
		
		getItemDisplayName: function (item, short) {
			if (!short) return item.name;
			if (item.nameShort) return item.nameShort;
			let parts = item.name.split(" ");
			return parts[parts.length - 1];
		},
		
		getBaseItemId: function (itemId) {
			let parts = itemId.split("_");
			if (parts.length > 1) {
				let postfix = parts[parts.length - 1];
				if (/^\d+$/.test(postfix)) {
					return parts.slice(0, -1).join("_");
				}
			}
			return itemId;
		},
		
		isMultiplier: function (itemBonusType) {
			switch (itemBonusType) {
				case this.itemBonusTypes.fight_speed:
				case this.itemBonusTypes.movement:
				case this.itemBonusTypes.scavenge_cost:
				case this.itemBonusTypes.scavenge_general:
				case this.itemBonusTypes.scavenge_supplies:
				case this.itemBonusTypes.scavenge_ingredients:
				case this.itemBonusTypes.scout_cost:
					return true;
			}
			return false;
		},
		
		isStaticValue: function (itemBonusType) {
			switch (itemBonusType) {
				case ItemConstants.itemTypes.bag:
					return true;
			}
			return false;
		},
		
		isIncreasing: function (itemBonusType) {
			switch (itemBonusType) {
				case this.itemBonusTypes.movement:
				case this.itemBonusTypes.scavenge_cost:
				case this.itemBonusTypes.scout_cost:
					return false;
			}
			return true;
		},
		
		getItemByID: function (id, skipWarning) {
			let config = this.getItemConfigByID(id, skipWarning);
			if (!config) return null;
			return config.clone();
		},
		
		getItemConfigByID: function (id, skipWarning) {
			if (this.itemByID[id]) {
				return this.itemByID[id];
			}
			if (!skipWarning) log.w("no such item: config " + id);
			return null;
		},

		getItemDefaultBonus: function (item) {
			switch (item.type) {
				case ItemConstants.itemTypes.light:
					return ItemConstants.itemBonusTypes.light;
				case ItemConstants.itemTypes.weapon:
					return ItemConstants.itemBonusTypes.fight_att;
				case ItemConstants.itemTypes.shoes:
					return ItemConstants.itemBonusTypes.movement;
				case ItemConstants.itemTypes.bag:
					return ItemConstants.itemBonusTypes.bag;
				case ItemConstants.itemTypes.clothing_over:
				case ItemConstants.itemTypes.clothing_upper:
				case ItemConstants.itemTypes.clothing_lower:
				case ItemConstants.itemTypes.clothing_head:
				case ItemConstants.itemTypes.clothing_hands:
					return ItemConstants.itemBonusTypes.fight_def;
				default:
					return null;
			}
		},
		
		// returns 1 if given new item is better than the old item, 0 if the same or depends on bonus type, -1 if worse
		getEquipmentComparison: function (itemOld, itemNew) {
			if (!itemNew && !itemOld) return 0;
			if (!itemNew) return -1;
			if (!itemOld) return 1;
			if (itemNew.id === itemOld.id && itemNew.broken && itemOld.broken) return 0;
			
			let getItemCacheId = function (itemVO) { return itemVO.id + (itemVO.broken ? "b" : ""); }
			let cacheId = getItemCacheId(itemOld) + "--" + getItemCacheId(itemNew);
			
			if (this.equipmentComparisonCache[cacheId]) {
				return this.equipmentComparisonCache[cacheId];
			}
			
			let result = 0;
			for (var bonusKey in ItemConstants.itemBonusTypes) {
				var bonusType = ItemConstants.itemBonusTypes[bonusKey];
				var currentBonus = ItemConstants.getItemBonusComparisonValue(itemOld, bonusType);
				var newBonus = ItemConstants.getItemBonusComparisonValue(itemNew, bonusType);
				
				// TODO take speed inco account, but only together with damage
				if (bonusType == ItemConstants.itemBonusTypes.fight_speed) {
					continue;
				}
				if (currentBonus == newBonus) {
					continue;
				}
				if (newBonus < currentBonus) {
					if (result > 0) return 0;
					result = -1;
				} else if (newBonus > currentBonus) {
					if (result < 0) return 0;
					result = 1;
				}
			}
			
			this.equipmentComparisonCache[cacheId] = result;
			
			return result;
		},
		
		getItemBonusComparisonValue: function (item, bonusType) {
			if (!item) return 0;
			if (!bonusType) {
				return item.getCurrentTotalBonus();
			}
			let result = item.getCurrentBonus(bonusType);
			if (!ItemConstants.isIncreasing(bonusType)) {
				result = 1-result;
			}
			if (bonusType == ItemConstants.itemBonusTypes.fight_att) {
				result = result * item.getCurrentBonus(ItemConstants.itemBonusTypes.fight_speed);
			}
			return result;
		},
		
		getIngredientsToCraftMany: function (items) {
			let result = [];
			var getResultEntry = function (id) {
				for (let i = 0; i < result.length; i++) {
					if (result[i].id == id) return result[i];
				}
				var newEntry = { id: id, amount: 0 };
				result.push(newEntry);
				return newEntry;
			};
			for (let i = 0; i < items.length; i++) {
				var item = items[i];
				if (!item.craftable) continue;
				var itemIngredients = this.getIngredientsToCraft(item.id);
				if (!itemIngredients || itemIngredients.length < 1) continue;
				for (let j = 0; j < itemIngredients.length; j++) {
					var itemEntry = itemIngredients[j];
					var resultEntry = getResultEntry(itemEntry.id);
					resultEntry.amount = resultEntry.amount + itemEntry.amount;
				}
			}
			
			result.sort(function (a, b) {
				return b.amount - a.amount;
			});
			
			return result;
		},
		
		getIngredientsToCraft: function (itemID) {
			var craftAction = "craft_" + itemID;
			var costs = PlayerActionConstants.costs[craftAction];
			let result = [];
			if (!costs) return result;
			for (var key in costs) {
				if (key.startsWith("item_res_")) {
					result.push({ id: key.replace("item_", ""), amount: costs[key] });
				}
			}
			return result;
		},
		
		getResourcesToCraft: function (itemID) {
			var craftAction = "craft_" + itemID;
			var costs = PlayerActionConstants.costs[craftAction];
			let result = [];
			if (!costs) return result;
			for (var key in costs) {
				if (key.startsWith("resource_")) {
					result.push({ id: key.replace("resource_", ""), amount: costs[key] });
				}
			}
			return result;
		},
		
		getBag: function (campOrdinal) {
			let result = null;
			for (let i in this.itemDefinitions.bag) {
				let bag = this.itemDefinitions.bag[i];
				let requiredCampOrdinal = bag.requiredCampOrdinal;
				if (requiredCampOrdinal <= campOrdinal) {
					if (result == null || requiredCampOrdinal > result.requiredCampOrdinal) {
						result = bag;
					}
				}
			}
			return result;
		},
		
		getBagBonus: function (campOrdinal) {
			// takes only account bag and no follower bonuses
			let bag = this.getBag(campOrdinal);
			if (!bag) {
				return ItemConstants.PLAYER_DEFAULT_STORAGE;
			}
			return bag.bonus.bonuses.bag || ItemConstants.PLAYER_DEFAULT_STORAGE;
		},
		
		getRandomShoes: function (campOrdinal) {
			if (campOrdinal < this.itemDefinitions.shoes[1].requiredCampOrdinal) {
				return this.itemDefinitions.shoes[0];
			}
			if (campOrdinal < this.itemDefinitions.shoes[2].requiredCampOrdinal) {
				return this.itemDefinitions.shoes[Math.floor(2 * Math.random())];
			}
			return this.itemDefinitions.shoes[Math.floor(3 * Math.random())];
		},
		
		getAvailableMetalCaches: function (campOrdinal) {
			let result = [];
				for (var type in this.itemDefinitions ) {
					for (let i in this.itemDefinitions[type]) {
						var item = this.itemDefinitions[type][i];
						if (item.id.indexOf("cache_metal") == 0) {
							if (item.requiredCampOrdinal <= campOrdinal) {
								result.push(item.id);
							}
						}
					}
				}
			return result;
		},
		
		getIngredient: function (i) {
			let index = i || (this.itemDefinitions.ingredient.length) * Math.random();
			index = index % this.itemDefinitions.ingredient.length;
			return this.itemDefinitions.ingredient[parseInt(index)];
		},
		
		isQuicklyObsoletable: function (category) {
			let t = ItemConstants.itemTypes[category] || category;
			switch (t) {
				case ItemConstants.itemTypes.weapon:
				case ItemConstants.itemTypes.clothing_over:
				case ItemConstants.itemTypes.clothing_upper:
				case ItemConstants.itemTypes.clothing_lower:
				case ItemConstants.itemTypes.clothing_hands:
				case ItemConstants.itemTypes.clothing_head:
					return true;
				default:
					return false;
			}
		},
		
		isObsoletable: function (category) {
			let t = ItemConstants.itemTypes[category] || category;
			switch (t) {
				case ItemConstants.itemTypes.weapon:
				case ItemConstants.itemTypes.clothing_over:
				case ItemConstants.itemTypes.clothing_upper:
				case ItemConstants.itemTypes.clothing_lower:
				case ItemConstants.itemTypes.clothing_hands:
				case ItemConstants.itemTypes.clothing_head:
				case ItemConstants.itemTypes.light:
				case ItemConstants.itemTypes.bag:
					return true;
				default:
					return false;
			}
		},
	};
	
	ItemConstants.loadData(ItemData);
	
	return ItemConstants;

});
