define([
    'ash',
    'game/nodes/PlayerLocationNode',
    'game/nodes/player/ItemsNode',
    'game/components/sector/events/TraderComponent',
    'game/constants/UIConstants',
    'game/constants/ItemConstants',
    'game/constants/TradeConstants',
    'game/vos/ResourcesVO'
], function (Ash, PlayerLocationNode, ItemsNode, TraderComponent, UIConstants, ItemConstants, TradeConstants, ResourcesVO) {
    var UIOutPopupTradeSystem = Ash.System.extend({

        uiFunctions: null,
        resourcesHelper: null,
        popupOpenedSignal: null,
        
        itemNodes: null,
    
        constructor: function (uiFunctions, resourcesHelper, popupOpenedSignal) {
            this.uiFunctions = uiFunctions;
            this.resourcesHelper = resourcesHelper;
            this.popupOpenedSignal = popupOpenedSignal;
            
            var sys = this;
            this.popupOpenedSignal.add(function (popupID) {
                if (popupID === "incoming-caravan-popup") {
                    sys.clearSelection();
                    sys.updateLists();
                }
            });
			return this;
        },

        addToEngine: function (engine) {
            this.engine  = engine;
            this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			this.itemNodes = engine.getNodeList(ItemsNode);
        },

        removeFromEngine: function (engine) {
            this.engine = null;
            this.playerLocationNodes = null;
			this.itemNodes = null;
        },

        update: function (time) {
            if (!($(".popup").is(":visible")) || $(".popup").data("fading") == true)
                return;
        },
        
        updateLists: function () {
            
            $("#inventorylist-incoming-caravan-trader-inventory ul").empty();
            $("#inventorylist-incoming-caravan-trader-offer ul").empty();
            $("#inventorylist-incoming-caravan-camp-inventory ul").empty();
            $("#inventorylist-incoming-caravan-camp-offer ul").empty();
            
            var traderComponent = this.playerLocationNodes.head.entity.get(TraderComponent);
            var caravan = traderComponent.caravan;
            var campStorage = this.resourcesHelper.getCurrentStorage();
			var currencyComponent = this.resourcesHelper.getCurrentCurrency();

            $("#incoming-caravan-popup h3").text(caravan.name);
            
            var sys = this;
            
            var onLiClicked = function (e) {
                var divRes = $(this).find(".res");
                var divItem = $(this).find(".item");
                var resourceName = $(divRes).attr("data-resourcename");
                var itemId = $(divItem).attr("data-itemid");
                var isCurrency = resourceName === "currency";
                
                var isTraderInventory = $(this).parents("#inventorylist-incoming-caravan-trader-inventory").length > 0;
                var isTraderOffer = $(this).parents("#inventorylist-incoming-caravan-trader-offer").length > 0;
                var isCampInventory = $(this).parents("#inventorylist-incoming-caravan-camp-inventory").length > 0;
                var isCampOffer = $(this).parents("#inventorylist-incoming-caravan-camp-offer").length > 0;
                
                if (isCurrency) {
                    if (isTraderInventory) {
                        caravan.traderSelectedCurrency++;
                    } else if (isTraderOffer) {
                        caravan.traderSelectedCurrency--;
                    } else if (isCampInventory) {
                        caravan.campSelectedCurrency++;
                    } else if (isCampOffer) {
                        caravan.campSelectedCurrency--;
                    }
                } else if (resourceName) {
                    if (isTraderInventory) {
                        caravan.traderSelectedResources.addResource(resourceName, 1);
                    } else if (isTraderOffer) {
                        caravan.traderSelectedResources.addResource(resourceName, -1);
                    } else if (isCampInventory) {
                        caravan.campSelectedResources.addResource(resourceName, 1);
                    } else if (isCampOffer) {
                        caravan.campSelectedResources.addResource(resourceName, -1);
                    }
                } else if (itemId) {
                    if (isTraderInventory) {
                        if (!caravan.traderSelectedItems[itemId])
                            caravan.traderSelectedItems[itemId] = 0;
                        caravan.traderSelectedItems[itemId]++;
                    } else if (isTraderOffer) {
                        caravan.traderSelectedItems[itemId]--;
                    } else if (isCampInventory) {
                        if (!caravan.campSelectedItems[itemId])
                            caravan.campSelectedItems[itemId] = 0;
                        caravan.campSelectedItems[itemId]++;
                    } else if (isCampOffer) {
                        caravan.campSelectedItems[itemId]--;
                    }
                }
                
                sys.updateLists();
            };
            
            var traderTotalItems = {};
            var campTotalItems = {};
            var traderOfferValue = caravan.traderSelectedCurrency;
            var campOfferValue = caravan.campSelectedCurrency;
            
            // trader items
            for (var i = 0; i < caravan.sellItems.length; i++) {
                if (!traderTotalItems[caravan.sellItems[i].id])
                    traderTotalItems[caravan.sellItems[i].id] = 0;
                traderTotalItems[caravan.sellItems[i].id]++;
            }
            
            for (var itemID in traderTotalItems) {
                var item = ItemConstants.getItemByID(itemID);
                var selectedAmount = (caravan.traderSelectedItems[itemID] ? caravan.traderSelectedItems[itemID] : 0);
                var inventoryAmount = traderTotalItems[itemID] - selectedAmount;
                if (inventoryAmount > 0)
                    $("#inventorylist-incoming-caravan-trader-inventory ul").append(UIConstants.getItemSlot(item, inventoryAmount, false));
                if (selectedAmount > 0)
                    $("#inventorylist-incoming-caravan-trader-offer ul").append(UIConstants.getItemSlot(item, selectedAmount, false));
                traderOfferValue += selectedAmount * TradeConstants.getItemValue(item, true);
            }
            
            // camp items
            for (var j in caravan.buyItemTypes) {
                var category = caravan.buyItemTypes[j];
                if (category == "uniqueEquipment" || category == "follower")
                    continue;
                var itemList = this.itemNodes.head.items.getAllByType(ItemConstants.itemTypes[category]);
                for (var k in itemList) {
                    if (itemList[k].equipped)
                        continue;
                    if (!campTotalItems[itemList[k].id])
                        campTotalItems[itemList[k].id] = 0;
                    campTotalItems[itemList[k].id]++;
                }
            }
            
            for (var itemID in campTotalItems) {
                var item = ItemConstants.getItemByID(itemID);
                var selectedAmount = (caravan.campSelectedItems[itemID] ? caravan.campSelectedItems[itemID] : 0);
                var inventoryAmount = campTotalItems[itemID] - selectedAmount;
                if (inventoryAmount > 0)
                    $("#inventorylist-incoming-caravan-camp-inventory ul").append(UIConstants.getItemSlot(item, inventoryAmount, false));
                if (selectedAmount > 0)
                    $("#inventorylist-incoming-caravan-camp-offer ul").append(UIConstants.getItemSlot(item, selectedAmount, false));
                campOfferValue += selectedAmount * TradeConstants.getItemValue(item);
            }
            
            
            // trader and camp resources
            for (var key in resourceNames) {
                var name = resourceNames[key];
                var traderOfferAmount = caravan.traderSelectedResources.getResource(name);
                var traderInventoryAmount = caravan.sellResources.getResource(name) - traderOfferAmount;
                if (traderInventoryAmount > 0) {
                    $("#inventorylist-incoming-caravan-trader-inventory ul").append(UIConstants.getResourceLi(name, traderInventoryAmount));
                }
                if (traderOfferAmount > 0) {
                    $("#inventorylist-incoming-caravan-trader-offer ul").append(UIConstants.getResourceLi(name, traderOfferAmount));
                }
                traderOfferValue += traderOfferAmount * TradeConstants.getResourceValue(name, true);
                
                if (caravan.buyResources.indexOf(name) >= 0) {
                    var campOfferAmount = caravan.campSelectedResources.getResource(name);
                    var campInventoryAmount = campStorage.resources.getResource(name) - campOfferAmount;
                    if (campInventoryAmount > 0) {
                        $("#inventorylist-incoming-caravan-camp-inventory ul").append(UIConstants.getResourceLi(name, campInventoryAmount));
                    }
                    if (campOfferAmount > 0) {
                        $("#inventorylist-incoming-caravan-camp-offer ul").append(UIConstants.getResourceLi(name, campOfferAmount));
                    }
                    campOfferValue += campOfferAmount * TradeConstants.getResourceValue(name);
                }
            }
            
            // trader and camp currency
            if (caravan.usesCurrency > 0) {
                var traderOfferAmount = caravan.traderSelectedCurrency;
                var traderInventoryAmount = caravan.currency - traderOfferAmount;
                var campOfferAmount = caravan.campSelectedCurrency;
                var campInventoryAmount = currencyComponent.currency - campOfferAmount;
                if (traderOfferAmount > 0)
                    $("#inventorylist-incoming-caravan-trader-offer ul").append(UIConstants.getCurrencyLi(traderOfferAmount));
                if (traderInventoryAmount > 0)
                    $("#inventorylist-incoming-caravan-trader-inventory ul").append(UIConstants.getCurrencyLi(traderInventoryAmount));
                if (campOfferAmount > 0)
                    $("#inventorylist-incoming-caravan-camp-offer ul").append(UIConstants.getCurrencyLi(campOfferAmount));
                if (campInventoryAmount > 0)
                    $("#inventorylist-incoming-caravan-camp-inventory ul").append(UIConstants.getCurrencyLi(campInventoryAmount));
            }
            
            // selection value
            traderOfferValue = Math.round(traderOfferValue * 100) / 100;
            campOfferValue = Math.round(campOfferValue * 100) / 100;
            caravan.traderOfferValue = traderOfferValue;
            caravan.campOfferValue = campOfferValue;
            $("#inventorylist-incoming-caravan-trader-offer .value").text("Value: " + traderOfferValue + " (" + (TradeConstants.VALUE_MARKUP_INCOMING_CARAVANS * 100) + "% markup)");
            $("#inventorylist-incoming-caravan-camp-offer .value").text("Value: " + campOfferValue);
            
            $("#inventorylist-incoming-caravan-trader-inventory li").click(onLiClicked);
            $("#inventorylist-incoming-caravan-trader-offer li").click(onLiClicked);
            $("#inventorylist-incoming-caravan-camp-inventory li").click(onLiClicked);
            $("#inventorylist-incoming-caravan-camp-offer li").click(onLiClicked);
            
            $("#inventorylist-incoming-caravan-trader-inventory .msg-empty").toggle($("#inventorylist-incoming-caravan-trader-inventory li").length === 0);
            $("#inventorylist-incoming-caravan-trader-offer .msg-empty").toggle($("#inventorylist-incoming-caravan-trader-offer li").length === 0);
            $("#inventorylist-incoming-caravan-camp-inventory .msg-empty").toggle($("#inventorylist-incoming-caravan-camp-inventory li").length === 0);
            $("#inventorylist-incoming-caravan-camp-offer .msg-empty").toggle($("#inventorylist-incoming-caravan-camp-offer li").length === 0);
            
            this.uiFunctions.generateCallouts("#inventorylist-incoming-caravan-trader-inventory");
            this.uiFunctions.generateCallouts("#inventorylist-incoming-caravan-trader-offer");
            this.uiFunctions.generateCallouts("#inventorylist-incoming-caravan-camp-inventory");
            this.uiFunctions.generateCallouts("#inventorylist-incoming-caravan-camp-offer");
        },
        
        clearSelection: function () {
            var traderComponent = this.playerLocationNodes.head.entity.get(TraderComponent);
            var caravan = traderComponent.caravan;
            caravan.clearSelection();
        }
            
	});

    return UIOutPopupTradeSystem;
});