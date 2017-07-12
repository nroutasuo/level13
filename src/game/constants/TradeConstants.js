define(['ash', 'game/constants/ItemConstants', 'game/constants/UpgradeConstants', 'game/vos/TradingPartnerVO', 'game/vos/ResourcesVO', 'game/vos/ResultVO'], 
function (Ash, ItemConstants, UpgradeConstants, TradingPartnerVO, ResourcesVO, ResultVO) {
    
    var TradeConstants = {
        
        MIN_OUTGOING_CARAVAN_RES: 50,
        MAX_OUTGOING_CARAVAN_RES: 1000,
        
        GOOD_TYPE_NAME_CURRENCY: "currency",
        GOOD_TYPE_NAME_INGREDIENTS: "ingredients",
        
        VALUE_INGREDIENTS: 0.05,
        
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
        
        makeResultVO: function (outgoingCaravan) {
            var result = new ResultVO("send_camp");
            var amountTraded = TradeConstants.getAmountTraded(outgoingCaravan.buyGood, outgoingCaravan.sellGood, outgoingCaravan.sellAmount);
            if (isResource(outgoingCaravan.buyGood)) {
                result.gainedResources.setResource(outgoingCaravan.buyGood, amountTraded);
            } else if (outgoingCaravan.buyGood === TradeConstants.GOOD_TYPE_NAME_CURRENCY) {
                result.gainedCurrency = amountTraded;
            } else if (outgoingCaravan.buyGood === TradeConstants.GOOD_TYPE_NAME_INGREDIENTS) {
                var numIngredients = Math.min(amountTraded, Math.floor(Math.random() * 3) + 1);
                var amountLeft = amountTraded;
                for (var i = 0; i < numIngredients; i++) {
                    var ingredient = ItemConstants.getIngredient();
                    var max = amountLeft;
                    var min = Math.min(amountLeft, 1);
                    var amount = Math.floor(Math.random() * max) + min;
                    for (var j = 0; j < amount; j++) {
                        result.gainedItems.push(ingredient.clone());
                    }
                    amountLeft -= amount;
                }
            } else {
                console.log("WARN: Unknown buy good: " + outgoingCaravan.buyGood);
            }
            result.selectedItems = result.gainedItems;
            result.selectedResources = result.gainedResources;
            return result;
        },
        
        getAmountTraded: function (buyGood, sellGood, sellAmount) {
            var amountGet = 0;
            var valueSell = TradeConstants.getResourceValue(sellGood) * sellAmount;
            if (isResource(buyGood)) {
                amountGet = valueSell / TradeConstants.getResourceValue(buyGood);
            } else if (buyGood === TradeConstants.GOOD_TYPE_NAME_CURRENCY) {
                amountGet = valueSell;
            } else if (buyGood === TradeConstants.GOOD_TYPE_NAME_INGREDIENTS) {
                amountGet = valueSell / TradeConstants.VALUE_INGREDIENTS;
            } else {
                console.log("WARN: Unknown buy good: " + buyGood);
            }
            amountGet = Math.floor(amountGet+0.001);
            return amountGet;
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
                    return VALUE_INGREDIENTS;
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
