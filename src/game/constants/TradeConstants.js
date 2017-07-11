define(['ash', 'game/constants/ItemConstants', 'game/constants/UpgradeConstants', 'game/vos/TradingPartnerVO'], 
function (Ash, ItemConstants, UpgradeConstants, TradingPartnerVO) {
    
    var TradeConstants = {
        
        TRADING_PARTNERS: [
            new TradingPartnerVO(3, "Bone Crossing", [resourceNames.rope], [resourceNames.metal], false),
            new TradingPartnerVO(4, "Slugger Town", [resourceNames.metal], [], false),
            new TradingPartnerVO(6, "Old Waterworks", [resourceNames.fuel], [], true),
            new TradingPartnerVO(7, "Mill Road Academy", [resourceNames.food, resourceNames.water], [resourceNames.metal], true),
            new TradingPartnerVO(9, "Bleaksey", [resourceNames.herbs], [resourceNames.medicine], false),
            new TradingPartnerVO(10, "Pinewood", [resourceNames.medicine], [], true),
            new TradingPartnerVO(12, "Highgate", [resourceNames.tools], [resourceNames.metal], true),
            new TradingPartnerVO(14, "Factory 32", [resourceNames.concrete], [resourceNames.metal], true),
        ],
        
        getTradePartner: function (campOrdinal) {
            for (var i = 0; i < this.TRADING_PARTNERS.length; i++) {
                if (this.TRADING_PARTNERS[i].campOrdinal === campOrdinal)
                    return this.TRADING_PARTNERS[i];
            }
            return null;
        },
        
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
