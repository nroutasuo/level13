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
        
        getDefaultClothing: function (levelOrdinal, totalLevels) {
            if (this.defaultClothing[levelOrdinal]) return this.defaultClothing[levelOrdinal];
            
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
            console.log("LEVEL ORDINAL " + levelOrdinal)
            for (var i = 0; i < clothingLists.length; i++) {
                bestAvailableItem = null;
                clothingList = clothingLists[i];
                for (var j = 0; j < clothingList.length; j++) {
                    clothingItem = clothingList[j];
                    isAvailable = false;
                    
                    // non-craftable items are not considered default (no reliable source especially when possible to lose once acquired)
                    if (clothingItem.craftable) {
                        var reqs = PlayerActionConstants.requirements["craft_" + clothingItem.id];
                        if (reqs) {
                            var requiredTech = Object.keys(reqs.upgrades);
                            isAvailable = requiredTech.length > 0;
                            for (var k = 0; k < requiredTech.length; k++) {
                                var requiredTechCampOrdinal = UpgradeConstants.getMinimumCampOrdinalForUpgrade(requiredTech[k]);
                                var requiredTechLevelOrdinal = this.gameState.getLevelOrdinalForCampOrdinal(requiredTechCampOrdinal);
                                isAvailable = isAvailable && levelOrdinal >= requiredTechLevelOrdinal;
                            }
                        } else {
                            isAvailable = true;
                        }
                    }
                    
                    if (isAvailable && (!bestAvailableItem || bestAvailableItem.getTotalBonus() < clothingItem.getTotalBonus())) {
                        bestAvailableItem = clothingItem;
                    }
                }
                
                if (bestAvailableItem) {
                    var reqs = PlayerActionConstants.requirements["craft_" + clothingItem.id];
                    var reqTech = reqs ? Object.keys(reqs.upgrades) : "none";
                    console.log("-> level ordinal " + levelOrdinal + " best " + clothingList[0].type + ": " + bestAvailableItem.name + " " + bestAvailableItem.id + " | " + bestAvailableItem.craftable + " " + reqTech)
                    result.push(bestAvailableItem);
                }
            }
            
            this.defaultClothing[levelOrdinal] = result;

            return this.defaultClothing[levelOrdinal];
        },
        
        getMaxHazardRadiationForLevel: function (levelOrdinal) {
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
            return coldProtection;          
        },
        
    });
    
    return ItemsHelper;
});