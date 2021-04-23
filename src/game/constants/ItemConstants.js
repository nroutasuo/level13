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
			follower: "follower",
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
			movement: "movement",
			bag: "bag",
			res_cold: "warmth",
			res_radiation: "res_rad",
			res_poison: "res_poison",
			shade: "shade",
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
		
		isMultiplier: function (itemBonusType) {
			switch (itemBonusType) {
				case this.itemBonusTypes.fight_speed:
				case this.itemBonusTypes.movement:
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
			if (id.indexOf("follower-") >= 0)
				return this.getFollowerByID(id);
			for (var type in this.itemDefinitions ) {
				for (var i in this.itemDefinitions[type]) {
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
				case ItemConstants.itemTypes.follower:
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
			var result = [];
			var getResultEntry = function (id) {
				for (var i = 0; i < result.length; i++) {
					if (result[i].id == id) return result[i];
				}
				var newEntry = { id: id, amount: 0 };
				result.push(newEntry);
				return newEntry;
			};
			for (var i = 0; i < items.length; i++) {
				var item = items[i];
				if (!item.craftable) continue;
				var itemIngredients = this.getIngredientsToCraft(item.id);
				if (!itemIngredients || itemIngredients.length < 1) continue;
				for (var j = 0; j < itemIngredients.length; j++) {
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
			var result = [];
			if (!costs) return result;
			for (var key in costs) {
				if (key.startsWith("item_res_")) {
					result.push({ id: key.replace("item_", ""), amount: costs[key] });
				}
			}
			return result;
		},
		
		requiredCampAndStepToCraftCache: {},
		
		getRequiredCampAndStepToCraft: function (item) {
			if (ItemConstants.requiredCampAndStepToCraftCache[item.id]) {
				return ItemConstants.requiredCampAndStepToCraftCache[item.id];
			}
			
			var cacheAndReturn = function (res) {
				ItemConstants.requiredCampAndStepToCraftCache[item.id] = res;
				return res;
			}
			
			var result = { campOrdinal: 0, step: 0 };
			if (!item.craftable) return cacheAndReturn(result);
			
			var addRequirement = function (campOrdinal, step, source) {
				if (campOrdinal > result.campOrdinal || (campOrdinal == result.campOrdinal && step > result.step)) {
					result = { campOrdinal: campOrdinal, step: step };
				}
			};
			
			// upgrades
			var reqs = PlayerActionConstants.requirements["craft_" + item.id];
			if (reqs && reqs.upgrades) {
				var requiredTech = Object.keys(reqs.upgrades);
				for (var k = 0; k < requiredTech.length; k++) {
					var campOrdinal = UpgradeConstants.getMinimumCampOrdinalForUpgrade(requiredTech[k]);
					var step = UpgradeConstants.getMinimumCampStepForUpgrade(requiredTech[k]);
					addRequirement(campOrdinal, step, requiredTech[k]);
				}
			}
			
			// resources
			var costs = PlayerActionConstants.costs["craft_" + item.id];
			if (costs) {
				if (costs && costs.resource_fuel && costs.resource_fuel > 0) {
					addRequirement(WorldConstants.CAMP_ORDINAL_FUEL, WorldConstants.CAMP_STEP_POI_2, "fuel");
				}
				if (costs && costs.resource_rubber && costs.resource_rubber > 0) {
					addRequirement(WorldConstants.CAMP_ORDINAL_GROUND, WorldConstants.CAMP_STEP_POI_2, "rubber");
				}
				if (costs && costs.resource_herbs && costs.resource_herbs > 0) {
					addRequirement(WorldConstants.CAMP_ORDINAL_GROUND, WorldConstants.CAMP_STEP_POI_2, "herbs");
				}
			}
			
			return cacheAndReturn(result);
		},
		
		getFollower: function (level, campCount) {
			var minStrength = campCount;
			var maxStrength = 1.5 + campCount * 1.5;
			var strengthDiff = maxStrength - minStrength;
			var strength = Math.round(minStrength + strengthDiff * Math.random());
			var type = "d";
			if (level < 5)
				type = "g";
			if (level > 15)
				type = "c";
			var id = "follower-" + strength + "-" + type;
			return this.getFollowerByID(id);
		},
		
		getFollowerByID: function (id) {
			var name = "Follower";
			var type = this.itemTypes.follower;
			var strength = parseInt(id.split("-")[1]);
			var bonuses = {att: strength};

			// TODO persist image depending on id
			var icon = "img/items/follower-" + Math.floor(Math.random() * 4 + 1) + ".png";

			// TODO more varied follower descriptions
			var description = "A fellow traveller who has agreed to travel together.";
			return new ItemVO(id, name, type, 1, true, false, false, -1, -1, bonuses, icon, description);
		},
		
		getBag: function (campOrdinal) {
			let result = null;
			for (var i in this.itemDefinitions.bag) {
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
			var result = null;
			for (var i = 0; i < totalWeapons; i++) {
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
			var i = i || (this.itemDefinitions.ingredient.length) * Math.random();
			i = i % this.itemDefinitions.ingredient.length;
			return this.itemDefinitions.ingredient[parseInt(i)];
		},
		
		isQuicklyObsoletable: function (category) {
			var t = ItemConstants.itemTypes[category] || category;
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
			var t = ItemConstants.itemTypes[category] || category;
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
