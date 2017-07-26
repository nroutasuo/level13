define([
    'ash',
    'game/constants/TradeConstants',
    'game/constants/ItemConstants',
    'game/constants/UIConstants',
    'game/nodes/PlayerLocationNode',
    'game/components/sector/OutgoingCaravansComponent',
    'game/components/sector/events/TraderComponent',
    'game/vos/ResourcesVO',
    'game/vos/OutgoingCaravanVO'
], function (
    Ash, TradeConstants, ItemConstants, UIConstants, PlayerLocationNode, OutgoingCaravansComponent, TraderComponent, ResourcesVO, OutgoingCaravanVO
) {
    var UIOutTradeSystem = Ash.System.extend({
        
        bubbleNumber: 0,
        availableTradingPartnersCount: 0,
        lastShownTradingPartnersCount: -1,
        currentIncomingTraders: 0,
        lastShownIncomingTraders: 0,
        
        playerLocationNodes: null,
        
        constructor: function (uiFunctions, tabChangedSignal, gameState, resourcesHelper) {
            this.uiFunctions = uiFunctions;
            this.tabChangedSignal = tabChangedSignal;
            this.gameState = gameState;
            this.resourcesHelper = resourcesHelper;
            return this;
        },

        addToEngine: function (engine) {
            this.engine  = engine;
            this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
        },

        removeFromEngine: function (engine) {
            this.engine = null;
            this.playerLocationNodes = null;
        },

        update: function (time) {
            if (!this.playerLocationNodes.head) return;
            var isActive = this.gameState.uiStatus.currentTab === this.uiFunctions.elementIDs.tabs.trade;
            
            this.updateBubble();
            this.updateOutgoingCaravansList(isActive);
            this.updateIncomingCaravan(isActive);
            
            if (!isActive) {
                $(".btn-trade-caravans-outgoing-toggle").text("Prepare Caravan");
                $(".trade-caravans-outgoing-plan").toggle(false);                
                return;
            }
            
            this.updateOutgoingCaravanPrepare();
            
            $("#trade-caravans-outgoing-empty-message").toggle(this.availableTradingPartnersCount === 0);
            $("#trade-caravans-incoming-empty-message").toggle(this.currentIncomingTraders === 0);
            $("#tab-header h2").text("Trade");
        },
        
        updateBubble: function () {
            this.bubbleNumber = this.availableTradingPartnersCount - this.lastShownTradingPartnersCount;
            if (this.lastShownTradingPartnersCount === -1)
                this.bubbleNumber = 0;
            this.bubbleNumber += (this.currentIncomingTraders - this.lastShownIncomingTraders);
            $("#switch-trade .bubble").text(this.bubbleNumber);
            $("#switch-trade .bubble").toggle(this.bubbleNumber > 0);  
        },
        
        updateOutgoingCaravansList: function (isActive) {
            this.availableTradingPartnersCount = this.gameState.foundTradingPartners.length;
            
            if (!isActive)
                return;
            
            if ($("#trade-caravans-outgoing-container tr").length === (2 * this.availableTradingPartnersCount))
                return;
            
            $("#trade-caravans-outgoing-container table").empty();
            for (var i = 0; i < this.gameState.foundTradingPartners.length; i++) {
                var partner = TradeConstants.getTradePartner(this.gameState.foundTradingPartners[i]);
                var tdName = "<td>" + partner.name + "</td>";
                var buysS = partner.buysResources.join(", ");
                var sellsS = partner.sellsResources.join(", ");
                var tdTrades = "<td>Buys: " + buysS + "<br/>Sells: " + sellsS + "</td>";
                var toggleBtnID = "btn_send_caravan_" + partner.campOrdinal + "_toggle";
                var tdButton = "<td class='minwidth'><button id='" + toggleBtnID + "' class='btn-trade-caravans-outgoing-toggle'>Prepare Caravan</button></td>";
                var tr = "<tr>" + tdName + tdTrades + tdButton + "</tr>";
                $("#trade-caravans-outgoing-container table").append(tr);
                
                var sendTR = "<tr style='display:none;' class='trade-caravans-outgoing-plan highlightbox' id='trade-caravans-outgoing-plan-" + partner.campOrdinal + "'>";
                sendTR += "<td colspan='2'>";
                sendTR += "Sell: <select class='trade-caravans-outgoing-select-sell'>";
                for (var j = 0; j < partner.buysResources.length; j++) {
                    sendTR += "<option value='" + partner.buysResources[j] + "'>" + partner.buysResources[j] + "</option>";
                }
                sendTR += "</select>";
                sendTR += "<input type='range' class='trade-caravans-outgoing-range-sell' min='" + TradeConstants.MIN_OUTGOING_CARAVAN_RES + "' max='" + TradeConstants.MAX_OUTGOING_CARAVAN_RES + "' step='10' />";
                sendTR += " <span class='trade-sell-value-invalid'></span>";
                sendTR += " <span class='trade-sell-value'>0</span>";
                sendTR += "&nbsp;&nbsp;&nbsp;"
                sendTR += " Get: <select class='trade-caravans-outgoing-select-buy'>";
                for (var k = 0; k < partner.sellsResources.length; k++) {
                    sendTR += "<option value='" + partner.sellsResources[k] + "'>" + partner.sellsResources[k] + "</option>";
                }
                if (partner.usesCurrency) {
                    sendTR += "<option value='" + TradeConstants.GOOD_TYPE_NAME_CURRENCY + "'>silver</option>";
                }
                else if (partner.sellsResources.length === 0) {
                    sendTR += "<option value='" + TradeConstants.GOOD_TYPE_NAME_INGREDIENTS + "'>crafting ingredients</option>";                    
                }
                sendTR += "</select>";
                sendTR += " <span class='trade-buy-value'>0</span>";
                sendTR += "</td>";
                sendTR += "<td class='minwidth'><button class='action btn-trade-caravans-outgoing-send' action='send_caravan_" + partner.campOrdinal + "'>Send</button></td></tr>";
                $("#trade-caravans-outgoing-container table").append(sendTR);
            }
            
            // TODO animate transitions
            var sys = this;
            $(".btn-trade-caravans-outgoing-toggle").click(function() {
                var ordinal = $(this).attr("id").split("_")[3];
                var tr = $("#trade-caravans-outgoing-plan-" + ordinal);
                var wasVisible = $(tr).is(":visible");
                
                // hide all others
                $(".btn-trade-caravans-outgoing-toggle").text("Prepare Caravan");
                $(".trade-caravans-outgoing-plan").toggle(false);
                
                // set this button and tr to correct state
                if (!wasVisible) {
                    $(this).text("Cancel");
                    $(tr).toggle(true);
                    sys.initPendingCaravan(ordinal);
                } else {
                    sys.resetPendingCaravan();
                }
            });
            $(".btn-trade-caravans-outgoing-send").click(function() {
                var ordinal = $(this).attr("action").split("_")[2];
                sys.confirmPendingCaravan(ordinal);
            });
            
            this.uiFunctions.generateButtonOverlays("#trade-caravans-outgoing-container table");
            this.uiFunctions.generateCallouts("#trade-caravans-outgoing-container table");
            this.uiFunctions.registerActionButtonListeners("#trade-caravans-outgoing-container table");
            
            this.lastShownTradingPartnersCount = this.availableTradingPartnersCount;
        },
        
        updateIncomingCaravan: function (isActive) {
            this.currentIncomingTraders = 0;
            
            var traderComponent = this.playerLocationNodes.head.entity.get(TraderComponent);
            if (traderComponent) this.currentIncomingTraders++;
            
            if (!isActive)
                return;
            
            if (!traderComponent)
                return;
            
            var caravan = traderComponent.caravan;
            
            if (this.lastShownIncomingCaravan === caravan && this.lastShownIncomingCaravanTrades === caravan.tradesMade)
                return;
            
            // TODO show currency / more information about the trader
            // TODO combine items
            
            $("#trade-caravans-incoming-container table").empty();
            var nameTD = "<td>" + caravan.name + "</td>";

            var inventoryUL = "<ul>";
            
            var itemCounts = {};
            for (var i = 0; i < caravan.sellItems.length; i++) {
                if (!itemCounts[caravan.sellItems[i].id])
                    itemCounts[caravan.sellItems[i].id] = 0;
                itemCounts[caravan.sellItems[i].id]++;
            }
            
            for (var itemID in itemCounts) {
                var item = ItemConstants.getItemByID(itemID);
                var amount = itemCounts[itemID];
                inventoryUL += UIConstants.getItemSlot(item, amount, false);
            }
            
            for (var key in resourceNames) {
                var name = resourceNames[key];
                var amount = caravan.sellResources.getResource(name);
                if (amount > 0) {
                    inventoryUL += UIConstants.getResourceLi(name, amount);
                }
            }
            if (caravan.currency > 0) {
                inventoryUL += UIConstants.getCurrencyLi(caravan.currency);
            }
            inventoryUL += "</ul>";
            var inventoryTD = "<td class='maxwidth'><div class='inventorybox'>" + inventoryUL + "</div></td>";
            var buttonsTD = "<td><button id='trade-caravans-incoming-trade'>Trade</button></td>";
            var tr = "<tr>" + nameTD + inventoryTD + buttonsTD + "</tr>";
            $("#trade-caravans-incoming-container table").append(tr);
            
            var uiFunctions = this.uiFunctions;
            $("#trade-caravans-incoming-trade").click(function () {
                uiFunctions.showIncomingCaravanPopup();
            });
            
            this.uiFunctions.generateCallouts("#trade-caravans-incoming-container table");
            
            this.lastShownIncomingTraders = this.currentIncomingTraders;
            this.lastShownIncomingCaravan = caravan;
            this.lastShownIncomingCaravanTrades = caravan.tradesMade;
        },
        
        updateOutgoingCaravanPrepare: function () {
            var caravansComponent = this.playerLocationNodes.head.entity.get(OutgoingCaravansComponent);
            
            var selectedCaravanTR = $(".trade-caravans-outgoing-plan:visible");
            if (selectedCaravanTR.length < 1)
                return;
            var tr = selectedCaravanTR[0];
            var trID = "#" + $(tr).attr("id");
            
            var selectedSell = $(trID + " .trade-caravans-outgoing-select-sell").val();
            var selectedBuy = $(trID + " .trade-caravans-outgoing-select-buy").val();
            var sellSlider = $(trID + " .trade-caravans-outgoing-range-sell");
            
            // set sell slider min max steps & sell value
            var amountSell = 0;
            var ownedStorage = this.resourcesHelper.getCurrentStorage();
            var ownedSellAmount = ownedStorage.resources.getResource(selectedSell);
            var hasEnoughSellRes = ownedSellAmount >= TradeConstants.MIN_OUTGOING_CARAVAN_RES;
            if (hasEnoughSellRes) {
                amountSell = Math.min(ownedSellAmount, $(sellSlider).val()); 
                $(sellSlider).toggle(true);
                $(sellSlider).attr("max", Math.min(TradeConstants.MAX_OUTGOING_CARAVAN_RES, Math.floor(ownedSellAmount / 10) * 10));
                $(trID + " .trade-sell-value-invalid").toggle(false);
                $(trID + " .trade-sell-value").toggle(true);
                $(trID + " .trade-sell-value").text(amountSell);
            } else {
                $(sellSlider).toggle(false);
                $(trID + " .trade-sell-value-invalid").toggle(true); 
                $(trID + " .trade-sell-value-invalid").text("Not enough " + selectedSell);
                $(trID + " .trade-sell-value").toggle(false);
            }
            
            // set get amount
            var amountGet = TradeConstants.getAmountTraded(selectedBuy, selectedSell, amountSell);
            $(trID + " .trade-buy-value").text(amountGet);
            
            // set valid selection
            var isValid = hasEnoughSellRes && amountSell > 0 && amountGet > 0;
            $(trID + " button.action").attr("data-isselectionvalid", isValid);
            
            if (caravansComponent.pendingCaravan) {
                caravansComponent.pendingCaravan.sellGood = selectedSell;
                caravansComponent.pendingCaravan.sellAmount = amountSell;
                caravansComponent.pendingCaravan.buyGood = selectedBuy;
            }
        },
        
        confirmPendingCaravan: function (campOrdinal) {
            campOrdinal = parseInt(campOrdinal);
            var caravansComponent = this.playerLocationNodes.head.entity.get(OutgoingCaravansComponent);
            if (!caravansComponent.pendingCaravan || caravansComponent.pendingCaravan.campOrdinal != campOrdinal) {
                console.log("WARN: Can't start caravan. No valid pending caravans found.");
                return;
            }
            if (caravansComponent.outgoingCaravans[campOrdinal]) {
                console.log("WARN: Can't start caravan. Camp ordinal already occupied.");
                return;
            }
            caravansComponent.outgoingCaravans[campOrdinal] = caravansComponent.pendingCaravan;
            caravansComponent.pendingCaravan = null;
        },
        
        initPendingCaravan: function (campOrdinal) {
            var caravansComponent = this.playerLocationNodes.head.entity.get(OutgoingCaravansComponent);
            caravansComponent.pendingCaravan = new OutgoingCaravanVO(campOrdinal);
        },
        
        resetPendingCaravan: function () {
            var caravansComponent = this.playerLocationNodes.head.entity.get(OutgoingCaravansComponent);
            caravansComponent.pendingCaravan = null;
        }
        
    });

    return UIOutTradeSystem;
});