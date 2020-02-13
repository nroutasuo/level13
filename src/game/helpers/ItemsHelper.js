define([
    'ash',
    'game/GameGlobals',
    'game/constants/ItemConstants',
    'game/constants/UpgradeConstants',
    'game/constants/PlayerActionConstants',
    'game/constants/WorldCreatorConstants',
    'game/nodes/tribe/TribeUpgradesNode',
], function (
    Ash,
    GameGlobals,
    ItemConstants,
    UpgradeConstants,
    PlayerActionConstants,
    WorldCreatorConstants,
    TribeUpgradesNode
) {
    var ItemsHelper = Ash.Class.extend({
        
        MAX_SCA_RARITY_DEFAULT_CLOTHING: 1,

        constructor: function (engine) {
            this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
        },
        
        defaultClothing: {
        },
        
        availableClothing: {
        },
        
        getBestClothing: function (campOrdinal, step, itemBonusType, maxScavengeRarity) {
            return this.getAvailableClothingList(campOrdinal, step, true, true, false, itemBonusType, maxScavengeRarity);
        },
        
        getScavengeRewardClothing: function (campOrdinal, step) {
            return this.getAvailableClothingList(campOrdinal, step, true, true, true);
        },
        
        getScavengeNecessityClothing: function (campOrdinal, step) {
            return this.getAvailableClothingList(campOrdinal, step, false, true, false, null, 5);
        },
        
        getAvailableClothingList: function (campOrdinal, step, includeCraftable, includeNonCraftable, includeMultiplePerType, preferredItemBonus, maxScavengeRarity) {
            step = step || 2;
            var adjustedCampOrdinal = step == 1 ? campOrdinal - 1 : campOrdinal;
            var adjustedStep = step == 1 ? WorldCreatorConstants.CAMP_STEP_END : step - 1;
            maxScavengeRarity = maxScavengeRarity || 100;
            var result = [];
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
            for (var i = 0; i < clothingLists.length; i++) {
                bestAvailableItem = null;
                bestAvailableItemBonus = 0;
                clothingList = clothingLists[i];
                for (var j = 0; j < clothingList.length; j++) {
                    clothingItem = clothingList[j];
                    isAvailable = false;
                    
                    // only craftable items are considered by default (scavenging is not a reliable source especially when possible to lose once acquired)
                    if (clothingItem.craftable && includeCraftable) {
                        var req = ItemConstants.getRequiredCampAndStepToCraft(clothingItem);
                        isAvailable = req.campOrdinal < adjustedCampOrdinal || (req.campOrdinal == adjustedCampOrdinal && req.step <= adjustedStep);
                    }

                    // non-craftable items added for scavenging results
                    if (!clothingItem.craftable && includeNonCraftable) {
                        isAvailable = clothingItem.requiredCampOrdinal <= adjustedCampOrdinal && clothingItem.scavengeRarity <= maxScavengeRarity;
                    }

                    var bonus = preferredItemBonus ? clothingItem.getBonus(preferredItemBonus) : clothingItem.getTotalBonus();
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
            var result = [];
            var prevNecessityClothing = this.getScavengeNecessityClothing(campOrdinal - 1, 1);
            var necessityClothing = this.getScavengeNecessityClothing(campOrdinal, 1);
            for (var i = 0; i < necessityClothing.length; i++) {
                var notNew = false;
                for (var j = 0; j < prevNecessityClothing.length; j++) {
                    if (necessityClothing[i].id === prevNecessityClothing[j].id) {
                        notNew = true;
                    }
                }
                if (notNew) continue;
                result.push(necessityClothing[i]);
            }
            var prevWeapon = ItemConstants.getDefaultWeapon(campOrdinal - 1, WorldCreatorConstants.CAMP_STEP_END);
            var weapon = ItemConstants.getDefaultWeapon(campOrdinal, WorldCreatorConstants.CAMP_STEP_END);
            if (weapon && (!prevWeapon || weapon.id !== prevWeapon.id)) result.push(weapon);
            return result;
        },
        
        getMaxHazardRadiationForLevel: function (campOrdinal, step) {
            var defaultClothing = this.getBestClothing(campOrdinal, step, ItemConstants.itemBonusTypes.res_radiation, this.MAX_SCA_RARITY_DEFAULT_CLOTHING);
            var radiationProtection = 0;
            for (var i = 0; i < defaultClothing.length; i++) {
                radiationProtection += defaultClothing[i].getBonus(ItemConstants.itemBonusTypes.res_radiation);
            }
            return radiationProtection;
        },
        
        getMaxHazardPoisonForLevel: function (campOrdinal, step) {
            var defaultClothing = this.getBestClothing(campOrdinal, step, ItemConstants.itemBonusTypes.res_poison, this.MAX_SCA_RARITY_DEFAULT_CLOTHING);
            var poisonProtection = 0;
            for (var i = 0; i < defaultClothing.length; i++) {
                poisonProtection += defaultClothing[i].getBonus(ItemConstants.itemBonusTypes.res_poison);
            }
            return poisonProtection;
        },
        
        getMaxHazardColdForLevel: function (campOrdinal, step) {
            var defaultClothing = this.getBestClothing(campOrdinal, step, ItemConstants.itemBonusTypes.res_cold, this.MAX_SCA_RARITY_DEFAULT_CLOTHING);
            var coldProtection = 0;
            for (var i = 0; i < defaultClothing.length; i++) {
                coldProtection += defaultClothing[i].getBonus(ItemConstants.itemBonusTypes.res_cold);
            }
            return coldProtection;
        },
        
        getMinHazardColdForLevel: function (campOrdinal, step) {
            var minByLevel = this.getMaxHazardColdForLevel(campOrdinal - 1, WorldCreatorConstants.CAMP_STEP_START);
            var minByItems = 0;
            var defaultClothing = this.getBestClothing(campOrdinal, step, null, 0);
            for (var i = 0; i < defaultClothing.length; i++) {
                minByItems += defaultClothing[i].getBonus(ItemConstants.itemBonusTypes.res_cold);
            }
            return Math.min(minByItems, minByLevel);
        },
        
        getRequiredEquipment: function (campOrdinal, step) {
            // all equipment required to clear a level (all hazards), even if multiple per slot
            var result = [];
            var addedIDs = [];
            var bonusTypes = [ ItemConstants.itemBonusTypes.res_poison, ItemConstants.itemBonusTypes.res_cold, ItemConstants.itemBonusTypes.res_radiation ];
            for (var i = 0; i < bonusTypes.length; i++) {
                var neededClothing = this.getBestClothing(campOrdinal, step, bonusTypes[i], this.MAX_SCA_RARITY_DEFAULT_CLOTHING);
                for (var j = 0; j < neededClothing.length; j++) {
                    var id = neededClothing[j].id;
                    if (addedIDs.indexOf(id) >= 0) continue;
                    result.push(neededClothing[j]);
                    addedIDs.push(id);
                }
            }
            var weapon = ItemConstants.getDefaultWeapon(campOrdinal, step);
            result.push(weapon);
            return result;
        },
        
        getNeededIngredient: function (campOrdinal, step, itemsComponent, isStrict) {
            var checkItem = function(item) {
                if (!item.craftable) return null;
                if (itemsComponent.getCountById(item.id, true) < (isStrict ? 1 : 1)) {
                    var ingredients = GameGlobals.itemsHelper.getIngredientsToCraft(item.id);
                    log.i(ingredients);
                    for (var i = 0; i < ingredients.length; i++) {
                        var def = ingredients[i];
                        if (itemsComponent.getCountById(def.id, true) < (isStrict ? def.amount : Math.max(def.amount, 3))) {
                            return ItemConstants.getItemByID(def.id);
                        }
                    }
                }
                return null;
            }
            
            var exploration = checkItem(ItemConstants.getItemByID("exploration_1"));
            if (exploration) return exploration;
            
            var bonusTypes = [ ItemConstants.itemBonusTypes.res_poison, ItemConstants.itemBonusTypes.res_cold, ItemConstants.itemBonusTypes.res_radiation ];
            for (var i = 0; i < bonusTypes.length; i++) {
                var neededClothing = this.getAvailableClothingList(campOrdinal, step, true, false, false, bonusTypes[i], 10);
                for (var j = 0; j < neededClothing.length; j++) {
                    var item = checkItem(ItemConstants.getItemByID(neededClothing[j].id));
                    if (item) return item;
                }
            }
            
            return null;
        },
        
        getUsableIngredient: function () {
            var usableIngredients = [];
			var campCount = GameGlobals.gameState.numCamps;
            var campOrdinal = Math.max(1, campCount);
            var itemList = ItemConstants.itemDefinitions.ingredient;
            for (var i in itemList) {
                var definition = itemList[i];
                if (this.isUsableIngredient(definition, campOrdinal)) {
                    usableIngredients.push(definition);
                }
            }
            var i = usableIngredients.length * Math.random();
            return usableIngredients[parseInt(i)];
        },
        
        isUsableIngredient: function (item, campOrdinal) {
            var craftableItems = [];
            var craftingRecipes = [];
            var itemList;
            var itemDefinition;
            for (var type in ItemConstants.itemDefinitions) {
                itemList = ItemConstants.itemDefinitions[type];
                for (var i in itemList) {
                    itemDefinition = itemList[i];
                    if (!itemDefinition.craftable) continue;
                    var craftAction = "craft_" + itemDefinition.id;
                    craftableItems.push(itemDefinition.id);
                    craftingRecipes.push({ action: craftAction, reqs: PlayerActionConstants.requirements[craftAction], costs: PlayerActionConstants.costs[craftAction]});
                }
            }
            var foundMatching = false;
            for (var i = 0; i < craftingRecipes.length; i++) {
                var craftingResult = craftableItems[i];
                var recipe = craftingRecipes[i].costs;
                var matches = recipe && recipe["item_" + item.id];
                if (!matches) continue;
                var reqs = craftingRecipes[i].reqs;
                var isUnlocked = true;
                if (reqs && reqs.upgrades) {
                    for (var upgradeId in reqs.upgrades) {
                        var requirementBoolean = reqs.upgrades[upgradeId];
                        if (requirementBoolean) {
                            isUnlocked = isUnlocked && UpgradeConstants.getMinimumCampOrdinalForUpgrade(upgradeId) <= campOrdinal;
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
        
        isObsolete: function (itemVO, itemsComponent, inCamp) {
            // if item is not equippable, it cannot be obsolete
            if (!itemVO.equippable) return false;

            // if the player already has one, equipped or not -> obsolete
            var owned = itemsComponent.getUnique(inCamp);
            for (var j = 0; j < owned.length; j++) {
                if (owned[j].id === itemVO.id) return true;
            }

            // if no equipped item of type -> not obsolete
            var equipped = itemsComponent.getEquipped(itemVO.type);
            if (equipped.length === 0) return false;

            // if item bonus is higher than any bonus on the currently equipped item of the same type -> not obsolete
            // exception: fight_speed (ignored)
            // TODO take fight_speed into account, but only together with attack
            for (var bonusKey in ItemConstants.itemBonusTypes) {
                var bonusType = ItemConstants.itemBonusTypes[bonusKey];
                var itemBonus = itemVO.getBonus(bonusType);
                if (bonusType == ItemConstants.itemBonusTypes.fight_speed) continue;
                for (var i = 0; i < equipped.length; i++) {
                    if (itemBonus > equipped[i].getBonus(bonusType) && bonusType != ItemConstants.itemBonusTypes.movement) {
                        return false;
                    }
                    else if (itemBonus < equipped[i].getBonus(bonusType) && bonusType == ItemConstants.itemBonusTypes.movement) {
                        return false;
                    }
                }
            }

            // has equipped item of type and no bonus is higher -> obsolete
            return true;
        },
        
        
    });
    
    return ItemsHelper;
});
