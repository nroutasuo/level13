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
                        var requiredOrdinal = ItemConstants.getRequiredCampOrdinalToCraft(clothingItem);
                        var requiredStep = ItemConstants.getRequiredLevelStepToCraft(clothingItem);
                        isAvailable = requiredOrdinal <= adjustedCampOrdinal && requiredStep <= step;
                    }

                    // non-craftable items added for scavenging results
                    if (!clothingItem.craftable && includeNonCraftable) {
                        isAvailable = clothingItem.requiredCampOrdinal >= 0 && clothingItem.requiredCampOrdinal <= adjustedCampOrdinal && clothingItem.scavengeRarity <= maxScavengeRarity;
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
            var defaultClothing = this.getBestClothing(campOrdinal, step, ItemConstants.itemBonusTypes.res_radiation, 1);
            var radiationProtection = 0;
            for (var i = 0; i < defaultClothing.length; i++) {
                radiationProtection += defaultClothing[i].getBonus(ItemConstants.itemBonusTypes.res_radiation);
            }
            return radiationProtection;
        },
        
        getMaxHazardPoisonForLevel: function (campOrdinal, step) {
            var defaultClothing = this.getBestClothing(campOrdinal, step, ItemConstants.itemBonusTypes.res_poison, 1);
            var poisonProtection = 0;
            for (var i = 0; i < defaultClothing.length; i++) {
                poisonProtection += defaultClothing[i].getBonus(ItemConstants.itemBonusTypes.res_poison);
            }
            return poisonProtection;
        },
        
        getMaxHazardColdForLevel: function (campOrdinal, step) {
            var defaultClothing = this.getBestClothing(campOrdinal, step, ItemConstants.itemBonusTypes.res_cold, 1);
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
        }
        
    });
    
    return ItemsHelper;
});
