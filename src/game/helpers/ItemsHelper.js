define([
	'ash',
	'game/GameGlobals',
	'game/constants/ItemConstants',
	'game/constants/UpgradeConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/WorldConstants',
], function (
	Ash,
	GameGlobals,
	ItemConstants,
	UpgradeConstants,
	PlayerActionConstants,
	WorldConstants,
) {
	var ItemsHelper = Ash.Class.extend({
		
		MAX_SCA_RARITY_DEFAULT_CLOTHING: 1,

		constructor: function () {},
		
		isAvailable: function (item, campOrdinal, step, includeCraftable, includeNonCraftable, maxScavengeRarity) {
			maxScavengeRarity = maxScavengeRarity || 100;
			var adjustCampOrdinal = step == WorldConstants.CAMP_STEP_START || step == WorldConstants.CAMP_STEP_PREVIOUS;
			var adjustedCampOrdinal = adjustCampOrdinal ? campOrdinal - 1 : campOrdinal;
			var adjustedStep = adjustCampOrdinal ? WorldConstants.CAMP_STEP_END : step - 1;
			
			let result = false;
			
			// craftable items: by craftable camp ordinal
			if (item.craftable && includeCraftable) {
				var req = GameGlobals.itemsHelper.getRequiredCampAndStepToCraft(item);
				result = (req.campOrdinal < adjustedCampOrdinal || (req.campOrdinal == adjustedCampOrdinal && req.step <= adjustedStep));
			}

			// non-craftable items: by item definition camp ordinal
			// TODO don't check for scavenge rarity, it's not a common way to find items, trade rarity instead? + take into account levels with no trade
			if (!item.craftable && includeNonCraftable) {
				result = true;
				result = result && item.requiredCampOrdinal <= adjustedCampOrdinal;
				result = result && item.scavengeRarity <= maxScavengeRarity;
				result = result && (item.maximumCampOrdinal <= 0 || item.maximumCampOrdinal >= adjustedCampOrdinal);
			}
			
			return result;
		},
		
		getDefaultEquipment: function (campOrdinal, step, itemBonusType, isHardLevel) {
			let result = {}
			
			let clothing = this.getDefaultClothing(campOrdinal, step, itemBonusType, isHardLevel);
			var itemsByType = {};
			for (let j = 0; j < clothing.length; j++) {
				var item = clothing[j];
				itemsByType[item.type] = item;
			}
			let slotTypes = Object.keys(ItemConstants.itemTypesEquipment);
			for (let j = 0; j < slotTypes.length; j++) {
				let slotType = slotTypes[j];
				let existing = itemsByType[slotType];
				if (existing) {
					result[slotType] = existing;
				} else {
					result[slotType] = this.getBestAvailableItem(campOrdinal, step, slotType, itemBonusType);
				}
			}
			
			return Object.values(result);
		},
		
		getDefaultWeapon: function (campOrdinal, step) {
			return this.getBestAvailableItem(campOrdinal, step, ItemConstants.itemTypes.weapon, ItemConstants.itemBonusTypes.fight_att, false);
		},
		
		getDefaultClothing: function (campOrdinal, step, itemBonusType, isHardLevel) {
			return this.getBestClothing(campOrdinal, step, itemBonusType, this.MAX_SCA_RARITY_DEFAULT_CLOTHING, isHardLevel);
		},
		
		getBestClothing: function (campOrdinal, step, itemBonusType, maxScavengeRarity, isHardLevel) {
			return this.getAvailableClothingList(campOrdinal, step, true, true, false, itemBonusType, maxScavengeRarity, isHardLevel);
		},
		
		getScavengeRewardClothing: function (campOrdinal, step) {
			return this.getAvailableClothingList(campOrdinal, step, true, true, true);
		},
		
		getScavengeNecessityClothing: function (campOrdinal, step) {
			return this.getAvailableClothingList(campOrdinal, step, false, true, false, null, this.MAX_SCA_RARITY_DEFAULT_CLOTHING);
		},
		
		getAvailableClothingList: function (campOrdinal, step, includeCraftable, includeNonCraftable, includeMultiplePerType, preferredItemBonus, maxScavengeRarity, includeSpecialEquipment) {
			step = step === 0 ? 0 : step || WorldConstants.CAMP_STEP_POI_2;
			let result = [];
			var clothingLists = [
				ItemConstants.itemDefinitions.clothing_over,
				ItemConstants.itemDefinitions.clothing_upper,
				ItemConstants.itemDefinitions.clothing_lower,
				ItemConstants.itemDefinitions.clothing_hands,
				ItemConstants.itemDefinitions.clothing_head
			];
			
			var bestAvailableItem;
			var bestAvailableItemBonus;
			var clothingList;
			var clothingItem;
			var isAvailable;
			
			for (let i = 0; i < clothingLists.length; i++) {
				bestAvailableItem = null;
				bestAvailableItemBonus = 0;
				clothingList = clothingLists[i];
				for (let j = 0; j < clothingList.length; j++) {
					clothingItem = clothingList[j];
					
					if (clothingItem.isSpecialEquipment && !includeSpecialEquipment) continue;
					
					isAvailable = this.isAvailable(clothingItem, campOrdinal, step, includeCraftable, includeNonCraftable, maxScavengeRarity);
					var bonus = preferredItemBonus ? clothingItem.getBaseBonus(preferredItemBonus) : clothingItem.getBaseTotalBonus();
					
					if (isAvailable && bonus > 0 && (!bestAvailableItem || bestAvailableItemBonus < bonus)) {
						bestAvailableItem = clothingItem;
						bestAvailableItemBonus = bonus;
					}
					
					if (isAvailable && includeMultiplePerType) {
						result.push(clothingItem);
					}
				}

				if (!includeMultiplePerType && bestAvailableItem) {
					// var reqs = PlayerActionConstants.requirements["craft_" + clothingItem.id];
					// var reqTech = reqs ? Object.keys(reqs.upgrades) : "none";
					// log.i("-> camp ordinal " + campOrdinal + " best " + clothingList[0].type + ": " + bestAvailableItem.name + " " + bestAvailableItem.id + " | " + bestAvailableItem.craftable)
					result.push(bestAvailableItem);
				}
			}
			
			return result;
		},
		
		getNewEquipment: function (campOrdinal) {
			let result = [];
			var prevNecessityClothing = this.getScavengeNecessityClothing(campOrdinal - 1, 1);
			var necessityClothing = this.getScavengeNecessityClothing(campOrdinal, 1);
			for (let i = 0; i < necessityClothing.length; i++) {
				var notNew = false;
				for (let j = 0; j < prevNecessityClothing.length; j++) {
					if (necessityClothing[i].id === prevNecessityClothing[j].id) {
						notNew = true;
					}
				}
				if (notNew) continue;
				result.push(necessityClothing[i]);
			}
			var prevWeapon = this.getDefaultWeapon(campOrdinal - 1, WorldConstants.CAMP_STEP_END);
			var weapon = this.getDefaultWeapon(campOrdinal, WorldConstants.CAMP_STEP_END);
			if (weapon && (!prevWeapon || weapon.id !== prevWeapon.id)) result.push(weapon);
			return result;
		},
		
		getBestAvailableItem: function (campOrdinal, step, itemType, itemBonusType, includeNonCraftable) {
			let bestItem = null;
			let bestBonus = 0;
			let bestTotal = 0;
			for (let i = 0; i < ItemConstants.itemDefinitions[itemType].length; i++) {
				let item = ItemConstants.itemDefinitions[itemType][i];
				let isAvailable = this.isAvailable(item, campOrdinal, WorldConstants.CAMP_STAGE_EARLY, true, includeNonCraftable);
				if (!isAvailable) continue;
				let bonus = ItemConstants.getItemBonusComparisonValue(item, itemBonusType);
				let total = item.getBaseTotalBonus();
				if (!bestItem || bonus > bestBonus || (bonus == bestBonus && total > bestTotal)) {
					bestItem = item;
					bestBonus = bonus;
					bestTotal = total;
				}
			}
			return bestItem;
		},
		
		getMaxHazardRadiationForLevel: function (campOrdinal, step, isHardLevel) {
			var defaultClothing = this.getDefaultClothing(campOrdinal, step, ItemConstants.itemBonusTypes.res_radiation, isHardLevel);
			var radiationProtection = 0;
			for (let i = 0; i < defaultClothing.length; i++) {
				radiationProtection += defaultClothing[i].getBaseBonus(ItemConstants.itemBonusTypes.res_radiation);
			}
			return radiationProtection;
		},
		
		getMaxHazardPoisonForLevel: function (campOrdinal, step, isHardLevel) {
			var defaultClothing = this.getDefaultClothing(campOrdinal, step, ItemConstants.itemBonusTypes.res_poison, isHardLevel);
			var poisonProtection = 0;
			for (let i = 0; i < defaultClothing.length; i++) {
				poisonProtection += defaultClothing[i].getBaseBonus(ItemConstants.itemBonusTypes.res_poison);
			}
			return poisonProtection;
		},
		
		getMaxHazardColdForLevel: function (campOrdinal, step, isHardLevel) {
			var defaultClothing = this.getDefaultClothing(campOrdinal, step, ItemConstants.itemBonusTypes.res_cold, isHardLevel);
			var coldProtection = 0;
			for (let i = 0; i < defaultClothing.length; i++) {
				coldProtection += defaultClothing[i].getBaseBonus(ItemConstants.itemBonusTypes.res_cold);
			}
			return coldProtection;
		},
		
		getMinHazardColdForLevel: function (campOrdinal, step, isHardLevel) {
			var minByLevel = this.getMaxHazardColdForLevel(campOrdinal - 1, WorldConstants.CAMP_STEP_START, isHardLevel);
			var minByItems = 0;
			var defaultClothing = this.getDefaultClothing(campOrdinal, step, null, isHardLevel);
			for (let i = 0; i < defaultClothing.length; i++) {
				minByItems += defaultClothing[i].getBaseBonus(ItemConstants.itemBonusTypes.res_cold);
			}
			return Math.min(minByItems, minByLevel);
		},
		
		getRequiredEquipment: function (campOrdinal, step, isHardLevel) {
			// all equipment required to clear a level (all hazards), even if multiple per slot
			let result = [];
			var addedIDs = [];
			var bonusTypes = [ ItemConstants.itemBonusTypes.res_poison, ItemConstants.itemBonusTypes.res_cold, ItemConstants.itemBonusTypes.res_radiation ];
			for (let i = 0; i < bonusTypes.length; i++) {
				var neededClothing = this.getDefaultClothing(campOrdinal, step, bonusTypes[i], isHardLevel);
				for (let j = 0; j < neededClothing.length; j++) {
					var id = neededClothing[j].id;
					if (addedIDs.indexOf(id) >= 0) continue;
					result.push(neededClothing[j]);
					addedIDs.push(id);
				}
			}
			var weapon = this.getDefaultWeapon(campOrdinal, step);
			result.push(weapon);
			return result;
		},
		
		requiredCampAndStepToCraftCache: {},
		
		getRequiredCampAndStepToCraft: function (item) {
			var cache = this.requiredCampAndStepToCraftCache;
			
			if (cache[item.id]) {
				return cache[item.id];
			}
			
			var cacheAndReturn = function (res) {
				cache[item.id] = res;
				return res;
			}
			
			let result = { campOrdinal: 0, step: 0 };
			if (!item.craftable) return cacheAndReturn(result);
			
			result = GameGlobals.playerActionsHelper.getMinimumCampAndStep("craft_" + item.id);
			
			return cacheAndReturn(result);
		},
		
		getNeededIngredients: function (campOrdinal, step, isHardLevel, itemsComponent, isStrict) {
			let result = [];
			let resultIds = [];
			
			let checkItem = function (item) {
				if (!item.craftable) return;
				if (itemsComponent.getCountById(item.id, true) < 1) {
					let ingredients = ItemConstants.getIngredientsToCraft(item.id);
					for (let i = 0; i < ingredients.length; i++) {
						let def = ingredients[i];
						if (resultIds.indexOf(def.id) < 0) {
							if (itemsComponent.getCountById(def.id, true) < (isStrict ? def.amount : Math.max(def.amount, 3))) {
								resultIds.push(def.id);
								result.push(ItemConstants.getItemByID(def.id));
							}
						}
					}
				}
			}
			
			checkItem(ItemConstants.getItemByID("exploration_1"));
			checkItem(this.getDefaultWeapon(campOrdinal, step));
			
			let bonusTypes = [ ItemConstants.itemBonusTypes.res_poison, ItemConstants.itemBonusTypes.res_cold, ItemConstants.itemBonusTypes.res_radiation ];
			
			for (let i = 0; i < bonusTypes.length; i++) {
				var neededClothing = this.getDefaultClothing(campOrdinal, step, bonusTypes[i], isHardLevel);
				for (let j = 0; j < neededClothing.length; j++) {
					checkItem(ItemConstants.getItemByID(neededClothing[j].id));
				}
			}
			
			return result;
		},
		
		getUsableIngredient: function (availableIngredients, rand) {
			rand = rand || Math.random();
			
			var usableIngredients = [];
			var campCount = GameGlobals.gameState.numCamps;
			var campOrdinal = Math.max(1, campCount);
			var itemList = ItemConstants.itemDefinitions.ingredient;
			for (let i in itemList) {
				var definition = itemList[i];
				if (availableIngredients && availableIngredients.indexOf(definition.id) < 0) {
					continue;
				}
				if (this.isUsableIngredient(definition, campOrdinal)) {
					usableIngredients.push(definition);
				}
			}
			if (usableIngredients.length == 0) return this.getUsableIngredient();
			let i = usableIngredients.length * rand;
			return usableIngredients[parseInt(i)];
		},
		
		isUsableIngredient: function (item, campOrdinal) {
			var craftableItems = [];
			var craftingRecipes = [];
			var itemList;
			var itemDefinition;
			for (var type in ItemConstants.itemDefinitions) {
				itemList = ItemConstants.itemDefinitions[type];
				for (let i in itemList) {
					itemDefinition = itemList[i];
					if (!itemDefinition.craftable) continue;
					var craftAction = "craft_" + itemDefinition.id;
					craftableItems.push(itemDefinition.id);
					craftingRecipes.push({ action: craftAction, reqs: PlayerActionConstants.requirements[craftAction], costs: PlayerActionConstants.costs[craftAction]});
				}
			}
			var foundMatching = false;
			for (let i = 0; i < craftingRecipes.length; i++) {
				var craftingResult = craftableItems[i];
				var recipe = craftingRecipes[i].costs;
				var matches = recipe && recipe["item_" + item.id];
				if (!matches) continue;
				var reqs = craftingRecipes[i].reqs;
				var isUnlocked = true;
				if (reqs && reqs.upgrades) {
					for (var upgradeID in reqs.upgrades) {
						var requirementBoolean = reqs.upgrades[upgradeID];
						if (requirementBoolean) {
							isUnlocked = isUnlocked && GameGlobals.upgradeEffectsHelper.getMinimumCampOrdinalForUpgrade(upgradeID) <= campOrdinal;
						}
					}
				}
				if (matches && isUnlocked) {
					return true;
				}
				if (matches) {
					foundMatching = true;
				}
			}
			if (!foundMatching) {
				log.w("no crafting recipe uses ingredient: " + item.id);
			}
			return false;
		},
		
		isObsolete: function (itemVO, itemsComponent, inCamp) {
			// if item is not equippable, it cannot be obsolete
			if (!itemVO.equippable) return false;

			// if the player already has one, equipped or not -> obsolete
			var owned = itemsComponent.getUnique(inCamp);
			for (let j = 0; j < owned.length; j++) {
				if (owned[j].id === itemVO.id) return true;
			}
			
			// if the player has a better item of same type -> obsolete
			var comparison = itemsComponent.getAllEquipmentComparison(itemVO, inCamp);
			if (comparison < 0) {
				return true;
			}

			// nothing better found -> not obsolete
			return false;
		},
		
		
	});
	
	return ItemsHelper;
});
