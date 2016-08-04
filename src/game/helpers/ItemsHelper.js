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

        constructor: function () {
        },
        
        getDefaultClothing: function (levelOrdinal, totalLevels) {
            var result = [];
            var clothingLists = [
                ItemConstants.itemDefinitions.clothing_over,
                ItemConstants.itemDefinitions.clothing_upper,
                ItemConstants.itemDefinitions.clothing_lower,
                ItemConstants.itemDefinitions.clothing_hands,
                ItemConstants.itemDefinitions.clothing_head
            ];

            // TODO define when which items become available through scavenging better 

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
                    // TODO determine item availability be level ordinal better based on required tech to craft
                    /*
                    if (clothingItem.craftable) {
                        var reqs = PlayerActionConstants.requirements["craft_" + clothingItem.id];
                        if (reqs) {
                            var requiredTech = Object.keys(PlayerActionConstants.requirements["craft_" + clothingItem.id].upgrades)[0];
                            var requiredTechLevel = UpgradeConstants.getMinimumCampOrdinalForUpgrade(requiredTech, PlayerActionConstants);
                            isAvailable = levelOrdinal >= requiredTechLevel;
                        } else {
                            isAvailable = true;
                        }
                    } else*/ {
                        isAvailable = levelOrdinal >= (j / clothingList.length) * totalLevels;
                    }
                    if (isAvailable && (!bestAvailableItem || bestAvailableItem.getTotalBonus() < clothingItem.getTotalBonus())) {
                        bestAvailableItem = clothingItem;
                    }
                }
                if (bestAvailableItem)
                    result.push(bestAvailableItem);
            }

            return result;
        },
        
    });
    
    return ItemsHelper;
});