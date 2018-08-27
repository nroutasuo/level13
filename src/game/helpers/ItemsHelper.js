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
        
        gameState: null,

        constructor: function (gameState) {
            this.gameState = gameState;
        },
        
        defaultClothing: {
        },
        
        availableClothing: {            
        },
        
        getBestClothing: function (levelOrdinal, itemBonusType) {
            return this.getAvailableClothingList(levelOrdinal, true, true, false, itemBonusType);
        },
        
        getScavengeRewardClothing: function (levelOrdinal, totalLevels) {
            return this.getAvailableClothingList(levelOrdinal, totalLevels, true, true, true);
        },
        
        getScavengeNecessityClothing: function (levelOrdinal) {
            return this.itemsHelper.getAvailableClothingList(levelOrdinal, false, true, false);
        },
        
        getAvailableClothingList: function (levelOrdinal, includeCraftable, includeNonCraftable, includeMultiplePerType, preferredItemBonus) {
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
                        isAvailable = ItemConstants.getRequiredLevelToCraft(clothingItem, this.gameState) <= levelOrdinal;
                    }

                    // non-craftable items added for scavenging results
                    if (!clothingItem.craftable && includeNonCraftable) {
                        isAvailable = clothingItem.requiredLevel >= 0 && clothingItem.requiredLevel <= levelOrdinal;
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
        
        // max radiation level at the END of the given level ordinal
        getMaxHazardRadiationForLevel: function (levelOrdinal, totalLevels) {
            var defaultClothing = this.getBestClothing(levelOrdinal, ItemConstants.itemBonusTypes.res_radiation);
            var radiationProtection = 0;
            for (var i = 0; i < defaultClothing.length; i++) {
                radiationProtection += defaultClothing[i].getBonus(ItemConstants.itemBonusTypes.res_radiation);
            }
            return radiationProtection;
        },
        
         // max radiation level at the END of the given level ordinal
        getMaxHazardPoisonForLevel: function (levelOrdinal) {
            var defaultClothing = this.getBestClothing(levelOrdinal, ItemConstants.itemBonusTypes.res_poison);
            var poisonProtection = 0;
            for (var i = 0; i < defaultClothing.length; i++) {
                poisonProtection += defaultClothing[i].getBonus(ItemConstants.itemBonusTypes.res_poison);
            }
            return poisonProtection;        
        },
        
         // max radiation level at the END of the given level ordinal
        getMaxHazardColdForLevel: function (levelOrdinal) {
            var defaultClothing = this.getBestClothing(levelOrdinal, ItemConstants.itemBonusTypes.res_cold);
            var coldProtection = 0;
            for (var i = 0; i < defaultClothing.length; i++) {
                coldProtection += defaultClothing[i].getBonus(ItemConstants.itemBonusTypes.res_cold);
            }
            return coldProtection;
        },
        
    });
    
    return ItemsHelper;
});