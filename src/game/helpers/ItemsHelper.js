define([
    'ash',
    'game/constants/ItemConstants',
    'game/constants/UpgradeConstants',
    'game/constants/PlayerActionConstants',
    'game/constants/WorldCreatorConstants'
], function (
    Ash,
    ItemConstants,
    UpgradeConstants,
    PlayerActionConstants,
    WorldCreatorConstants
) {
    var ItemsHelper = Ash.Class.extend({

        constructor: function () { },
        
        defaultClothing: {
        },
        
        availableClothing: {
        },
        
        getBestClothing: function (campOrdinal, step, itemBonusType) {
            return this.getAvailableClothingList(campOrdinal, step, true, true, false, itemBonusType);
        },
        
        getScavengeRewardClothing: function (campOrdinal, step) {
            return this.getAvailableClothingList(campOrdinal, step, true, true, true);
        },
        
        getScavengeNecessityClothing: function (campOrdinal, step) {
            return this.getAvailableClothingList(campOrdinal, step, false, true, false);
        },
        
        getAvailableClothingList: function (campOrdinal, step, includeCraftable, includeNonCraftable, includeMultiplePerType, preferredItemBonus) {
            step = step || 2;
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
                    
                    // only craftable items are considered default (no reliable source especially when possible to lose once acquired)
                    if (clothingItem.craftable && includeCraftable) {
                        var comparisonOrdinal = step == 1 ? campOrdinal - 1 : campOrdinal;
                        isAvailable = ItemConstants.getRequiredCampOrdinalToCraft(clothingItem) <= comparisonOrdinal;
                    }

                    // non-craftable items added for scavenging results
                    if (!clothingItem.craftable && includeNonCraftable) {
                        isAvailable = clothingItem.requiredCampOrdinal >= 0 && clothingItem.requiredCampOrdinal <= campOrdinal;
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
                    // log.i("-> level ordinal " + levelOrdinal + " best " + clothingList[0].type + ": " + bestAvailableItem.name + " " + bestAvailableItem.id + " | " + bestAvailableItem.craftable + " " + reqTech)
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
        
        // max radiation level at the END of the given camp ordinal (all tech and items etc)
        getMaxHazardRadiationForLevel: function (campOrdinal, step) {
            var defaultClothing = this.getBestClothing(campOrdinal, step, ItemConstants.itemBonusTypes.res_radiation);
            var radiationProtection = 0;
            for (var i = 0; i < defaultClothing.length; i++) {
                radiationProtection += defaultClothing[i].getBonus(ItemConstants.itemBonusTypes.res_radiation);
            }
            return radiationProtection;
        },
        
         // max radiation level at the END of the given camp ordinal (all tech and items etc)
        getMaxHazardPoisonForLevel: function (campOrdinal, step) {
            var defaultClothing = this.getBestClothing(campOrdinal, step, ItemConstants.itemBonusTypes.res_poison);
            var poisonProtection = 0;
            for (var i = 0; i < defaultClothing.length; i++) {
                poisonProtection += defaultClothing[i].getBonus(ItemConstants.itemBonusTypes.res_poison);
            }
            return poisonProtection;
        },
        
         // max radiation level at the END of the given camp ordinal (all tech and items etc)
        getMaxHazardColdForLevel: function (campOrdinal, step) {
            var defaultClothing = this.getBestClothing(campOrdinal, step, ItemConstants.itemBonusTypes.res_cold);
            var coldProtection = 0;
            for (var i = 0; i < defaultClothing.length; i++) {
                coldProtection += defaultClothing[i].getBonus(ItemConstants.itemBonusTypes.res_cold);
            }
            return coldProtection;
        },
        
    });
    
    return ItemsHelper;
});
