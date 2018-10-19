define([
    'ash',
    'game/constants/ItemConstants',
    'game/constants/UpgradeConstants',
    'game/constants/PlayerActionConstants'
], function (
    Ash,
    ItemConstants,
    UpgradeConstants,
    PlayerActionConstants
) {
    var ItemsHelper = Ash.Class.extend({

        constructor: function () { },
        
        defaultClothing: {
        },
        
        availableClothing: {            
        },
        
        getBestClothing: function (campOrdinal, itemBonusType) {
            return this.getAvailableClothingList(campOrdinal, true, true, false, itemBonusType);
        },
        
        getScavengeRewardClothing: function (campOrdinal) {
            return this.getAvailableClothingList(campOrdinal, true, true, true);
        },
        
        getScavengeNecessityClothing: function (campOrdinal) {
            return this.getAvailableClothingList(campOrdinal, false, true, false);
        },
        
        getAvailableClothingList: function (campOrdinal, includeCraftable, includeNonCraftable, includeMultiplePerType, preferredItemBonus) {
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
                        isAvailable = ItemConstants.getRequiredCampOrdinalToCraft(clothingItem) <= campOrdinal;
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
                    // console.log("-> level ordinal " + levelOrdinal + " best " + clothingList[0].type + ": " + bestAvailableItem.name + " " + bestAvailableItem.id + " | " + bestAvailableItem.craftable + " " + reqTech)
                    result.push(bestAvailableItem);
                }
            }
            
            return result;
        },
        
        getNewEquipment: function (campOrdinal) {
            var result = [];
            var prevNecessityClothing = this.getScavengeNecessityClothing(campOrdinal - 1);
            var necessityClothing = this.getScavengeNecessityClothing(campOrdinal);
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
            var prevWeapon = ItemConstants.getDefaultWeapon(campOrdinal - 1);
            var weapon = ItemConstants.getDefaultWeapon(campOrdinal);
            if (weapon && (!prevWeapon || weapon.id !== prevWeapon.id)) result.push(weapon);
            return result;
        },
        
        // max radiation level at the END of the given camp ordinal (all tech and items etc)
        getMaxHazardRadiationForLevel: function (campOrdinal) {
            var defaultClothing = this.getBestClothing(campOrdinal, ItemConstants.itemBonusTypes.res_radiation);
            var radiationProtection = 0;
            for (var i = 0; i < defaultClothing.length; i++) {
                radiationProtection += defaultClothing[i].getBonus(ItemConstants.itemBonusTypes.res_radiation);
            }
            return radiationProtection;
        },
        
         // max radiation level at the END of the given camp ordinal (all tech and items etc)
        getMaxHazardPoisonForLevel: function (campOrdinal) {
            var defaultClothing = this.getBestClothing(campOrdinal, ItemConstants.itemBonusTypes.res_poison);
            var poisonProtection = 0;
            for (var i = 0; i < defaultClothing.length; i++) {
                poisonProtection += defaultClothing[i].getBonus(ItemConstants.itemBonusTypes.res_poison);
            }
            return poisonProtection;        
        },
        
         // max radiation level at the END of the given camp ordinal (all tech and items etc)
        getMaxHazardColdForLevel: function (campOrdinal) {
            var defaultClothing = this.getBestClothing(campOrdinal, ItemConstants.itemBonusTypes.res_cold);
            var coldProtection = 0;
            for (var i = 0; i < defaultClothing.length; i++) {
                coldProtection += defaultClothing[i].getBonus(ItemConstants.itemBonusTypes.res_cold);
            }
            return coldProtection;
        },
        
    });
    
    return ItemsHelper;
});