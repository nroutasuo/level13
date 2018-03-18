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
        
        getDefaultClothing: function (levelOrdinal) {
            return this.getAvailableClothingList(levelOrdinal, false, false);
        },
        
        getScavengeRewardClothing: function (levelOrdinal, totalLevels) {
            var possibleItems = this.getAvailableClothingList(levelOrdinal, totalLevels, true, true);
            return possibleItems[Math.floor(Math.random() * possibleItems.length)].clone();
        },
        
        getAvailableClothingList: function (levelOrdinal, includeNonCraftable, includeMultiplePerType) {
            if (!includeNonCraftable && !includeMultiplePerType && this.defaultClothing[levelOrdinal]) return this.defaultClothing[levelOrdinal];
            if (includeNonCraftable && includeMultiplePerType && this.availableClothing[levelOrdinal]) return this.availableClothing[levelOrdinal];
            
            var result = [];
            var clothingLists = [
                ItemConstants.itemDefinitions.clothing_over,
                ItemConstants.itemDefinitions.clothing_upper,
                ItemConstants.itemDefinitions.clothing_lower,
                ItemConstants.itemDefinitions.clothing_hands,
                ItemConstants.itemDefinitions.clothing_head
            ];
            var bestAvailableItem;
            var clothingList;
            var clothingItem;
            var isAvailable;
            for (var i = 0; i < clothingLists.length; i++) {
                bestAvailableItem = null;
                clothingList = clothingLists[i];
                for (var j = 0; j < clothingList.length; j++) {
                    clothingItem = clothingList[j];
                    isAvailable = false;
                    
                    // only craftable items are considered default (no reliable source especially when possible to lose once acquired)
                    if (clothingItem.craftable) {
                        isAvailable = ItemConstants.getRequiredLevelToCraft(clothingItem, this.gameState) <= levelOrdinal;
                    }

                    // non-craftable items added for scavenging results
                    if (!clothingItem.craftable && includeNonCraftable) {
                        isAvailable = clothingItem.requiredLevel >= 0 && clothingItem.requiredLevel <= levelOrdinal;
                    }

                    if (isAvailable && (!bestAvailableItem || bestAvailableItem.getTotalBonus() < clothingItem.getTotalBonus())) {
                        bestAvailableItem = clothingItem;
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

            if (!includeNonCraftable && !includeMultiplePerType)
                this.defaultClothing[levelOrdinal] = result;
            else if (includeNonCraftable && includeMultiplePerType)
                this.availableClothing[levelOrdinal] = result;
            
            return result;
        },
        
        getMaxHazardRadiationForLevel: function (levelOrdinal, totalLevels) {
            var defaultClothing = this.getDefaultClothing(levelOrdinal);
            var radiationProtection = 0;
            for (var i = 0; i < defaultClothing.length; i++) {
                radiationProtection += defaultClothing[i].getBonus(ItemConstants.itemBonusTypes.res_radiation);
            }
            return radiationProtection;
        },
        
        getMaxHazardPoisonForLevel: function (levelOrdinal) {
            var defaultClothing = this.getDefaultClothing(levelOrdinal);
            var poisonProtection = 0;
            for (var i = 0; i < defaultClothing.length; i++) {
                poisonProtection += defaultClothing[i].getBonus(ItemConstants.itemBonusTypes.res_poison);
            }
            return poisonProtection;        
        },
        
        getMaxHazardColdForLevel: function (levelOrdinal) {
            var defaultClothing = this.getDefaultClothing(levelOrdinal);
            var coldProtection = 0;
            for (var i = 0; i < defaultClothing.length; i++) {
                coldProtection += defaultClothing[i].getBonus(ItemConstants.itemBonusTypes.res_cold);
            }
            return (coldProtection - 5);
        },
        
    });
    
    return ItemsHelper;
});