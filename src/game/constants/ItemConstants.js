define(['ash', 'json!game/data/ItemData.json', 'game/constants/PlayerActionConstants', 'game/constants/UpgradeConstants', 'game/constants/WorldConstants', 'game/vos/ItemVO'],
function (Ash, ItemData, PlayerActionConstants, UpgradeConstants, WorldConstants, ItemVO) {

	var ItemConstants = {
		
		PLAYER_DEFAULT_STORAGE: 10,
			
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
			exploration: "exploration",
			uniqueEquipment: "uniqueEquipment",
			// Just inventory - no effects:
			artefact: "artefact",
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
			hazard_prediction: "hazard_prediction",
		},
		
		itemDefinitions: { },

		loadData: function (data) {
			for (itemID in data) {
				let item = data[itemID];
				let bonuses = item.bonuses;
				let type = item.type;
				if (!this.itemDefinitions[type]) this.itemDefinitions[type] = [];
				this.itemDefinitions[type].push(
					new ItemVO(item.id, item.name, item.type, item.requiredCampOrdinal, item.isEquippable, item.isCraftable, item.isUseable, item.rarityScavenge, item.rarityTrade, bonuses, item.icon, item.description, item.isSpecialEquipment)
				);
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
			}
			return ItemConstants.itemTypes[type];
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
					return false;
			}
			return true;
		},
		
		getItemByID: function (id) {
			for (var type in this.itemDefinitions ) {
				for (let i in this.itemDefinitions[type]) {
					var item = this.itemDefinitions[type][i];
					if (item.id === id) {
						return item.clone();
					}
				}
			}
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
		
		getItemBonusComparisonValue: function (item, bonusType) {
			if (!item) return 0;
			if (!bonusType) {
				return item.getTotalBonus();
			}
			let result = item.getBonus(bonusType);
			if (!ItemConstants.isIncreasing(bonusType)) {
				result = 100-result;
			}
			if (bonusType == ItemConstants.itemBonusTypes.fight_att) {
				result = result * item.getBonus(ItemConstants.itemBonusTypes.fight_speed);
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
		
		getDefaultWeapon: function (campOrdinal, step) {
			var step = step || 2;
			var totalWeapons = this.itemDefinitions.weapon.length;
			let result = null;
			for (let i = 0; i < totalWeapons; i++) {
				var weapon = this.itemDefinitions.weapon[i];
				var weaponCampOrdinal = Math.max(1, weapon.requiredCampOrdinal);
				if (step == 1 && weaponCampOrdinal >= campOrdinal) break;
				if (step == 2 && weaponCampOrdinal >= campOrdinal) break;
				if (step == 3 && weaponCampOrdinal > campOrdinal) break;
				result = weapon;
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
		}
	};
	
	ItemConstants.loadData(ItemData);
	
	return ItemConstants;

});
