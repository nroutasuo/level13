define(['ash', 'game/constants/ItemConstants', 'game/constants/UpgradeConstants'], function (Ash, ItemConstants, UpgradeConstants) {
    
    var TradeConstants = {
        
        getResourceValue: function (name) {
            switch (name) {
                case resourceNames.water: return 0.01;
                case resourceNames.food: return 0.005;
                case resourceNames.metal: return 0.001;
                case resourceNames.rope: return 0.01;

                case resourceNames.herbs: return 0.01;
                case resourceNames.fuel: return 0.01;

                case resourceNames.medicine: return 0.02;
                case resourceNames.tools: return 0.02;
                case resourceNames.concrete: return 0.02;
            }            
            return 0;
        },
        
        getItemValue: function (item) {            
            switch (item.type) {
                case ItemConstants.itemTypes.light:
                case ItemConstants.itemTypes.weapon:
                case ItemConstants.itemTypes.clothing_over:
                case ItemConstants.itemTypes.clothing_upper:
                case ItemConstants.itemTypes.clothing_lower:
                case ItemConstants.itemTypes.clothing_hands:
                case ItemConstants.itemTypes.clothing_head:
                case ItemConstants.itemTypes.shoes:
                case ItemConstants.itemTypes.bag:
                    return Math.ceil(item.getTotalBonus() / 5);
                case ItemConstants.itemTypes.follower:
                    return 0;
                case ItemConstants.itemTypes.ingredient:
                    return 0.1;
                case ItemConstants.itemTypes.exploration:
                    return 1;
                case ItemConstants.itemTypes.uniqueEquipment:
                    return 2;
                case ItemConstants.itemTypes.artefact:
                    return 2;
                case ItemConstants.itemTypes.note:
                    return 0;
            }
            return 0;
        },
        
        getBlueprintValue: function (upgradeID) {
            return UpgradeConstants.getBlueprintCampOrdinal(upgradeID) + 2;
        }
    
    };
    
    return TradeConstants;
    
});
