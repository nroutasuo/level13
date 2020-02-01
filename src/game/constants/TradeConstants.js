define([
    'ash',
    'game/constants/ItemConstants', 'game/constants/UpgradeConstants', 'game/constants/BagConstants',
    'game/vos/TradingPartnerVO', 'game/vos/IncomingCaravanVO', 'game/vos/ResourcesVO', 'game/vos/ResultVO'],
function (Ash, ItemConstants, UpgradeConstants, BagConstants, TradingPartnerVO, IncomingCaravanVO, ResourcesVO, ResultVO) {
    
    var TradeConstants = {
        
        MIN_OUTGOING_CARAVAN_RES: 50,
        
        GOOD_TYPE_NAME_CURRENCY: "currency",
        GOOD_TYPE_NAME_INGREDIENTS: "ingredients",
        
        VALUE_INGREDIENTS: 0.1,
        VALUE_MARKUP_INCOMING_CARAVANS: 0.15,
        VALUE_MARKUP_OUTGOING_CARAVANS_INGREDIENTS: 0.5,
        VALUE_DISCOUNT_CAMP_ITEMS: 0.25,
        
        TRADING_PARTNERS: [
            new TradingPartnerVO(3, "Bone Crossing", [resourceNames.rope], [resourceNames.metal], false, false, [ "weapon" ], [ "weapon", "clothing_over", "clothing_upper", "clothing_lower", "clothing_hands", "clothing_head" ]),
            new TradingPartnerVO(4, "Slugger Town", [resourceNames.metal], [resourceNames.food], false, true, [], ["exploration", "shoes" ]),
            new TradingPartnerVO(6, "Old Waterworks", [resourceNames.fuel], [], true, false, [], [ "clothing_over", "clothing_upper", "clothing_lower", "clothing_hands", "clothing_head" ]),
            new TradingPartnerVO(7, "Mill Road Academy", [resourceNames.food, resourceNames.water], [resourceNames.metal], true, false, [], [ "weapon", "artefact" ]),
            new TradingPartnerVO(9, "Bleaksey", [resourceNames.herbs], [resourceNames.medicine], false, true, [], [ "clothing_over", "clothing_upper", "clothing_lower", "clothing_hands", "clothing_head" ]),
            new TradingPartnerVO(10, "Pinewood", [resourceNames.medicine], [], true, false, [], [ "artefact", "exploration" ]),
            new TradingPartnerVO(12, "Highgate", [resourceNames.tools], [resourceNames.metal], true, false, [], [ "clothing_over", "clothing_upper", "clothing_lower", "clothing_hands", "clothing_head" ]),
            new TradingPartnerVO(14, "Factory 32", [resourceNames.concrete], [resourceNames.metal], true, false, [], [ "exploration" ]),
        ],
        
        getRandomIncomingCaravan: function (campOrdinal, levelOrdinal, unlockedResources, neededIngredient) {
            var name = "";
            var sellItems = [];
            var sellResources = new ResourcesVO();
            var buyItemTypes = [];
            var buyResources = [];
            var usesCurrency = false;
            
            // TODO rare traders with blueprints?
            // TODO adjust resource amounts based on resource rarity / value (plenty of metal, less herbs)
            var minResAmount = 40 + campOrdinal * 10;
            var randResAmount = 450 + campOrdinal * 50;
            
            // TODO unify logic with scavenge rewards - many similar checks
            var addSellItemsFromCategories = function (categories, probability, maxAmount, includeCommon) {
                for (var j in categories) {
                    var category = categories[j];
                    var isObsoletable = ItemConstants.isObsoletable(category);
                    var itemList = ItemConstants.itemDefinitions[category];
                    for (var i in itemList) {
                        var itemDefinition = itemList[i];
                        var isNeeded = neededIngredient && itemDefinition.id == neededIngredient;
                        if (itemDefinition.requiredCampOrdinal > campOrdinal + 1)
                            continue;
                        if (ItemConstants.isQuicklyObsoletable(category)) {
                            if (itemDefinition.requiredCampOrdinal > 0 && itemDefinition.requiredCampOrdinal <= campOrdinal - 5)
                                continue;
                        }
                        if (!includeCommon && isObsoletable && itemDefinition.craftable && itemDefinition.requiredCampOrdinal < campOrdinal)
                            continue;
                        var tradeRarity = itemDefinition.tradeRarity;
                        if (tradeRarity <= 0)
                            continue;
                        var itemProbability = probability * (1/tradeRarity);
                        if (Math.random() > itemProbability && !isNeeded)
                            continue;
                        var req = ItemConstants.getRequiredCampAndStepToCraft(itemDefinition);
                        if (req.campOrdinal > campOrdinal + 2)
                            continue;
                        var amount = Math.ceil(Math.random() * maxAmount);
                        for (var j = 0; j < amount; j++) {
                            sellItems.push(itemDefinition.clone());
                        }
                    }
                }
            }
            
            var rand = Math.random();
            var rand2 = Math.random();
            if (rand <= 0.2 && !neededIngredient) {
                // 1) equipment trader: sells (equipment caterogy), buys equipment, uses currency
                var categories = [];
                if (rand2 <= 0.33) {
                    name = "Weapon trader";
                    categories.push("weapon");
                } else if (rand2 <= 0.66) {
                    name = "Clothing trader";
                    categories.push("clothing_over");
                    categories.push("clothing_upper");
                    categories.push("clothing_lower");
                    categories.push("clothing_hands");
                    categories.push("clothing_head");
                    categories.push("shoes");
                } else {
                    name = "Equipment trader";
                    categories.push("light");
                    categories.push("bag");
                    categories.push("exploration");
                }
                var prob = 0.75;
                while (sellItems.length < 4 && prob <= 1) {
                    addSellItemsFromCategories(categories, prob, 1, true);
                    prob += 0.05;
                }
                buyItemTypes = categories;
                usesCurrency = true;
            } else if (rand <= 0.4) {
                // 2) misc trader: sells ingredients, random items, buys all items, uses currency
                name = "General trader";
                var categories = [];
                while (categories.length < 3) {
                    if (Math.random() <= 0.2) categories.push("light");
                    if (Math.random() <= 0.5) categories.push("weapon");
                    if (Math.random() <= 0.3) categories.push("clothing_over");
                    if (Math.random() <= 0.3) categories.push("clothing_upper");
                    if (Math.random() <= 0.3) categories.push("clothing_lower");
                    if (Math.random() <= 0.3) categories.push("clothing_hands");
                    if (Math.random() <= 0.3) categories.push("clothing_head");
                    if (Math.random() <= 0.3) categories.push("shoes");
                    if (Math.random() <= 0.2) categories.push("bag");
                    if (Math.random() <= 0.7) categories.push("exploration");
                    if (Math.random() <= 0.1) categories.push("artefact");
                }
                var prob = 0.05;
                while (sellItems.length < 5 && prob < 1) {
                    addSellItemsFromCategories(categories, prob, 1, true);
                    prob += 0.05;
                }
                if (Math.random() < 0.5 || neededIngredient) {
                    addSellItemsFromCategories([ "ingredient"], 0.7, 5 + campOrdinal + 2, true);
                }
                buyItemTypes = Object.keys(ItemConstants.itemTypes);
                usesCurrency = true;
            } else if (rand <= 0.6 || neededIngredient) {
                // 3) ingredient trader: sells ingredients, buys ingredients, occational items, no currency
                name = "Crafting trader";
                var prob = 0.25;
                var num = 5 + campOrdinal * 3;
                while (sellItems.length < num && prob < 1) {
                    addSellItemsFromCategories([ "ingredient"], prob, num / 3, true);
                    prob += 0.05;
                }
                addSellItemsFromCategories([ "clothing_over", "clothing_upper", "clothing_lower", "clothing_hands", "clothing_head", "shoes", "bag", "exploration" ], 0.05, 1, false);
                buyItemTypes = [ "ingredient" ];
                usesCurrency = false;
            } else if (rand <= 0.8 && !neededIngredient) {
                // 4) resource trader: sells and buys a specific resource
                if (rand2 <= 0.2 && unlockedResources.herbs) {
                    name = "Herbs trader";
                    sellResources.addResource(resourceNames.herbs, minResAmount + Math.random() * randResAmount);
                    buyResources.push(resourceNames.herbs);
                    if (unlockedResources.medicine && Math.random() < 0.75) {
                        name = "Medicine trader";
                        sellResources.addResource(resourceNames.medicine, minResAmount + Math.random() * randResAmount);
                        buyResources.push(resourceNames.medicine);
                    }
                } else if (rand2 <= 0.3 && unlockedResources.tools) {
                    name = "Tools trader";
                    sellResources.addResource(resourceNames.tools, minResAmount + Math.random() * randResAmount);
                    buyResources.push(resourceNames.tools);
                } else if (rand2 <= 0.4 && unlockedResources.fuel) {
                    name = "Fuel trader";
                    sellResources.addResource(resourceNames.fuel, minResAmount + Math.random() * randResAmount);
                    buyResources.push(resourceNames.fuel);
                } else if (rand2 < 0.7) {
                    name = "Supplies trader";
                    sellResources.addResource(resourceNames.water, minResAmount + Math.random() * randResAmount);
                    sellResources.addResource(resourceNames.food, minResAmount + Math.random() * randResAmount);
                    buyResources.push(resourceNames.water);
                    buyResources.push(resourceNames.food);
                } else {
                    name = "Materials trader";
                    sellResources.addResource(resourceNames.metal, minResAmount + Math.random() * randResAmount);
                        buyResources.push(resourceNames.metal);
                    sellResources.addResource(resourceNames.rope, minResAmount + Math.random() * randResAmount);
                        buyResources.push(resourceNames.rope);
                    if (unlockedResources.concrete) {
                        sellResources.addResource(resourceNames.concrete, minResAmount + Math.random() * randResAmount);
                        buyResources.push(resourceNames.concrete);
                    }
                }
                usesCurrency = true;
            } else {
                // 5) trading partner trader: buys and sells same stuff as partner, plus occational items, currency based on partner
                var partner = this.getRandomTradePartner(campOrdinal);
                name = "Trader from " + partner.name;
                for (var i = 0; i < partner.sellsResources.length; i++) {
                    sellResources.addResource(partner.sellsResources[i], minResAmount + Math.random() * randResAmount);
                }
                for (var i = 0; i < partner.buysResources.length; i++) {
                    buyResources.push(partner.buysResources[i]);
                }
                var prob = 0.01;
                var numItems = Math.floor(Math.random() * 2);
                while (sellItems.length < numItems && prob < 1) {
                    addSellItemsFromCategories(partner.sellItemTypes, prob, 1, true);
                    prob += 0.01;
                }
                for (var i = 0; i < partner.buyItemTypes.length; i++) {
                    buyItemTypes.push(partner.buyItemTypes[i]);
                }
                if (!partner.usesCurrency || neededIngredient)
                    buyItemTypes.push("ingredient");
                usesCurrency = partner.usesCurrency;
            }
            
            var currency = usesCurrency ? 2 + Math.floor(Math.random() * levelOrdinal) : 0;
            return new IncomingCaravanVO(name, sellItems, sellResources, buyItemTypes, buyResources, usesCurrency, currency);
        },
        
        getTradePartner: function (campOrdinal) {
            for (var i = 0; i < this.TRADING_PARTNERS.length; i++) {
                if (this.TRADING_PARTNERS[i].campOrdinal === campOrdinal)
                    return this.TRADING_PARTNERS[i];
            }
            return null;
        },
        
        getRandomTradePartner: function (campOrdinal) {
            var options = [];
            for (var i = 0; i < this.TRADING_PARTNERS.length; i++) {
                if (this.TRADING_PARTNERS[i].campOrdinal <= campOrdinal + 2 && this.TRADING_PARTNERS[i].campOrdinal >= campOrdinal - 5) {
                    options.push(this.TRADING_PARTNERS[i]);
                }
            }
            return options[Math.floor(Math.random() * options.length)];
        },
        
        makeResultVO: function (outgoingCaravan) {
            var result = new ResultVO("send_camp");
            var amountTraded = TradeConstants.getAmountTraded(outgoingCaravan.buyGood, outgoingCaravan.sellGood, outgoingCaravan.sellAmount);
            if (amountTraded > outgoingCaravan.capacity) {
                amountTraded = outgoingCaravan.capacity;
            }
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
                log.w("Unknown buy good: " + outgoingCaravan.buyGood);
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
                amountGet = valueSell / TradeConstants.VALUE_INGREDIENTS * (1 - TradeConstants.VALUE_MARKUP_OUTGOING_CARAVANS_INGREDIENTS);
            } else {
                log.w("Unknown buy good: " + buyGood);
            }
            amountGet = Math.floor(amountGet+0.001);
            return amountGet;
        },
        
        getRequiredCapacity: function (good, amount) {
            if (isResource(good)) {
                return BagConstants.getResourceCapacity(good) * amount;
            } else if (good === TradeConstants.GOOD_TYPE_NAME_CURRENCY) {
                return BagConstants.CAPACITY_CURRENCY * amount;
            } else if (good === TradeConstants.GOOD_TYPE_NAME_INGREDIENTS) {
                return BagConstants.CAPACITY_ITEM_INGREDIENT * amount;
            } else {
                log.w("Unknown  good: " + good);
                return 0;
            }
        },
        
        getResourceValue: function (name, isTrader) {
            var value = 0;
            switch (name) {
                case resourceNames.water: value = 0.01; break;
                case resourceNames.food: value = 0.01; break;
                case resourceNames.metal: value = 0.005; break;
                
                case resourceNames.rope: value = 0.02; break;
                case resourceNames.herbs: value = 0.02; break;
                case resourceNames.fuel: value = 0.02; break;

                case resourceNames.medicine: value = 0.05; break;
                case resourceNames.tools: value = 0.05; break;
                case resourceNames.concrete: value = 0.05; break;
            }
            if (isTrader)
                value = value + value * TradeConstants.VALUE_MARKUP_INCOMING_CARAVANS;
            return value;
        },
        
        getItemValue: function (item, isTrader) {
            var value = 0;
            switch (item.type) {
                case ItemConstants.itemTypes.light:
                    var lightBonus = item.getTotalBonus(ItemConstants.itemBonusTypes.light);
                    if (lightBonus <= 25)
                        value = 0.1;
                    else
                        value = (lightBonus - 10) / 30;
                    break;
                case ItemConstants.itemTypes.weapon:
                    var attackBonus = item.getTotalBonus(ItemConstants.itemBonusTypes.fight_att);
                    if (attackBonus <= 3)
                        value = 0.1;
                    else
                        value = attackBonus / 5;
                    break;
                case ItemConstants.itemTypes.clothing_over:
                case ItemConstants.itemTypes.clothing_upper:
                case ItemConstants.itemTypes.clothing_lower:
                case ItemConstants.itemTypes.clothing_hands:
                case ItemConstants.itemTypes.clothing_head:
                    value = Math.max(0.1, (item.getTotalBonus() / 12));
                    break;
                case ItemConstants.itemTypes.shoes:
                    var shoeBonus = item.getTotalBonus(ItemConstants.itemBonusTypes.movement);
                    value = Math.pow(((shoeBonus)*5), 2);
                    break;
                case ItemConstants.itemTypes.bag:
                    value = Math.pow(((item.getTotalBonus() - 25) / 20), 1.5);
                    break;
                case ItemConstants.itemTypes.follower:
                    value = 0;
                    break;
                case ItemConstants.itemTypes.ingredient:
                    value = TradeConstants.VALUE_INGREDIENTS;
                    break;
                case ItemConstants.itemTypes.exploration:
                    // TODO instead of hard-coded ids, check if craftable & crafting doesn't require any ingredients -> cheap
                    if (item.id == "consumable_weapon_1")
                        value = 0.25;
                    else
                        value = 0.5;
                    break;
                case ItemConstants.itemTypes.uniqueEquipment:
                    value = 1;
                    break;
                case ItemConstants.itemTypes.artefact:
                    value = 1;
                    break;
                case ItemConstants.itemTypes.note:
                    value = 0;
                    break;
            }
            if (isTrader)
                value = value + value * TradeConstants.VALUE_MARKUP_INCOMING_CARAVANS;
            else
                value = value - value * TradeConstants.VALUE_DISCOUNT_CAMP_ITEMS;
            
            value = Math.round(value * 10) / 10;
                
            return value;
        },
        
        getBlueprintValue: function (upgradeID) {
            return UpgradeConstants.getBlueprintCampOrdinal(upgradeID) + 2;
        },
        
        getCaravanCapacity: function (stableLevel) {
            return stableLevel * 750;
        }
    
    };
    
    return TradeConstants;
    
});
