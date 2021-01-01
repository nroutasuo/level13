define([
    'ash',
    'game/GameGlobals',
    'game/constants/ItemConstants',
    'game/constants/UpgradeConstants',
    'game/constants/PlayerActionConstants',
    'game/constants/WorldConstants',
    'game/nodes/tribe/TribeUpgradesNode',
], function (
    Ash,
    GameGlobals,
    ItemConstants,
    UpgradeConstants,
    PlayerActionConstants,
    WorldConstants,
    TribeUpgradesNode
) {
    var ItemsHelper = Ash.Class.extend({
        
        MAX_SCA_RARITY_DEFAULT_CLOTHING: 1,

        constructor: function (engine) {
            this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
        },
        
        isAvailable: function (item, campOrdinal, step, includeCraftable, includeNonCraftable, maxScavengeRarity) {
            maxScavengeRarity = maxScavengeRarity || 100;
            var adjustCampOrdinal = step == WorldConstants.CAMP_STEP_START || step == WorldConstants.CAMP_STEP_PREVIOUS;
            var adjustedCampOrdinal = adjustCampOrdinal ? campOrdinal - 1 : campOrdinal;
            var adjustedStep = adjustCampOrdinal ? WorldConstants.CAMP_STEP_END : step - 1;
            
            let result = false;
            
            // craftable items: by craftable camp ordinal
            if (item.craftable && includeCraftable) {
                var req = ItemConstants.getRequiredCampAndStepToCraft(item);
                result = req.campOrdinal < adjustedCampOrdinal || (req.campOrdinal == adjustedCampOrdinal && req.step <= adjustedStep);
            }

            // non-craftable items: by item defintiion camp ordinal
            // TODO don't check for scavenge rarity, it's not a common way to find items, trade rarity instead? + take into account levels with no trade
            if (!item.craftable && includeNonCraftable) {
                result = item.requiredCampOrdinal <= adjustedCampOrdinal && item.scavengeRarity <= maxScavengeRarity;
            }
            
            return result;
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
            step = step || WorldConstants.CAMP_STEP_POI_2;
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
                    
                    if (clothingItem.isSpecialEquipment && !includeSpecialEquipment) continue;
                    
                    isAvailable = this.isAvailable(clothingItem, campOrdinal, step, includeCraftable, includeNonCraftable, maxScavengeRarity);
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
            var prevWeapon = ItemConstants.getDefaultWeapon(campOrdinal - 1, WorldConstants.CAMP_STEP_END);
            var weapon = ItemConstants.getDefaultWeapon(campOrdinal, WorldConstants.CAMP_STEP_END);
            if (weapon && (!prevWeapon || weapon.id !== prevWeapon.id)) result.push(weapon);
            return result;
        },
        
        getBestAvailableItem: function (campOrdinal, itemType, itemBonusType) {
            let bestItem = null;
            let bestBonus = 0;
            for (var i = 0; i < ItemConstants.itemDefinitions[itemType].length; i++) {
                let item = ItemConstants.itemDefinitions[itemType][i];
                if (!this.isAvailable(item, campOrdinal, WorldConstants.CAMP_STAGE_EARLY, true, true)) {
                    continue;
                }
                let bonus = ItemConstants.getItemBonusComparisonValue(item, itemBonusType)
                if (!bestItem || bonus > bestBonus) {
                    bestItem = item;
                    bestBonus = bonus;
                }
            }
            return bestItem;
        },
        
        getMaxHazardRadiationForLevel: function (campOrdinal, step, isHardLevel) {
            var defaultClothing = this.getDefaultClothing(campOrdinal, step, ItemConstants.itemBonusTypes.res_radiation, isHardLevel);
            var radiationProtection = 0;
            for (var i = 0; i < defaultClothing.length; i++) {
                radiationProtection += defaultClothing[i].getBonus(ItemConstants.itemBonusTypes.res_radiation);
            }
            return radiationProtection;
        },
        
        getMaxHazardPoisonForLevel: function (campOrdinal, step, isHardLevel) {
            var defaultClothing = this.getDefaultClothing(campOrdinal, step, ItemConstants.itemBonusTypes.res_poison, isHardLevel);
            var poisonProtection = 0;
            for (var i = 0; i < defaultClothing.length; i++) {
                poisonProtection += defaultClothing[i].getBonus(ItemConstants.itemBonusTypes.res_poison);
            }
            return poisonProtection;
        },
        
        getMaxHazardColdForLevel: function (campOrdinal, step, isHardLevel) {
            var defaultClothing = this.getDefaultClothing(campOrdinal, step, ItemConstants.itemBonusTypes.res_cold, isHardLevel);
            var coldProtection = 0;
            for (var i = 0; i < defaultClothing.length; i++) {
                coldProtection += defaultClothing[i].getBonus(ItemConstants.itemBonusTypes.res_cold);
            }
            return coldProtection;
        },
        
        getMinHazardColdForLevel: function (campOrdinal, step, isHardLevel) {
            var minByLevel = this.getMaxHazardColdForLevel(campOrdinal - 1, WorldConstants.CAMP_STEP_START, isHardLevel);
            var minByItems = 0;
            var defaultClothing = this.getDefaultClothing(campOrdinal, step, null, isHardLevel);
            for (var i = 0; i < defaultClothing.length; i++) {
                minByItems += defaultClothing[i].getBonus(ItemConstants.itemBonusTypes.res_cold);
            }
            return Math.min(minByItems, minByLevel);
        },
        
        getRequiredEquipment: function (campOrdinal, step, isHardLevel) {
            // all equipment required to clear a level (all hazards), even if multiple per slot
            var result = [];
            var addedIDs = [];
            var bonusTypes = [ ItemConstants.itemBonusTypes.res_poison, ItemConstants.itemBonusTypes.res_cold, ItemConstants.itemBonusTypes.res_radiation ];
            for (var i = 0; i < bonusTypes.length; i++) {
                var neededClothing = this.getDefaultClothing(campOrdinal, step, bonusTypes[i], isHardLevel);
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
        
        getNeededIngredient: function (campOrdinal, step, isHardLevel, itemsComponent, isStrict) {
            var checkItem = function (item) {
                if (!item.craftable) return null;
                if (itemsComponent.getCountById(item.id, true) < (isStrict ? 1 : 1)) {
                    var ingredients = ItemConstants.getIngredientsToCraft(item.id);
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
                var neededClothing = this.getDefaultClothing(campOrdinal, step, bonusTypes[i], isHardLevel);
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
        
        isObsolete: function (itemVO, itemsComponent, inCamp) {
            // if item is not equippable, it cannot be obsolete
            if (!itemVO.equippable) return false;

            // if the player already has one, equipped or not -> obsolete
            var owned = itemsComponent.getUnique(inCamp);
            for (var j = 0; j < owned.length; j++) {
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
