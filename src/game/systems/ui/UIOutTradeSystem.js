define([
    'ash',
    'game/constants/TradeConstants',
    'game/vos/ResourcesVO'
], function (
    Ash, TradeConstants, ResourcesVO
) {
    var UIOutTradeSystem = Ash.System.extend({
        
        bubbleNumber: 0,
        availableTradingPartnersCount: 0,
        lastShownTradingPartnersCount: -1,
        
        constructor: function (uiFunctions, tabChangedSignal, gameState, resourcesHelper) {
            this.uiFunctions = uiFunctions;
            this.tabChangedSignal = tabChangedSignal;
            this.gameState = gameState;
            this.resourcesHelper = resourcesHelper;
            return this;
        },

        addToEngine: function (engine) {
            this.engine  = engine;
        },

        removeFromEngine: function (engine) {
            this.engine = null;
        },

        update: function (time) {
            var isActive = this.gameState.uiStatus.currentTab === this.uiFunctions.elementIDs.tabs.trade;
            
            this.updateBubble();
            this.updateOutgoingCaravansList(isActive);
            
            if (!isActive) {
                $(".btn-trade-caravans-outgoing-toggle").text("Prepare Caravan");
                $(".trade-caravans-outgoing-plan").toggle(false);                
                return;
            }
            
            this.updateOutgoingCaravanPrepare();
            
            $("#trade-caravans-outgoing-empty-message").toggle(this.availableTradingPartnersCount === 0);
            $("#tab-header h2").text("Trade");
        },
        
        updateBubble: function () {
            this.bubbleNumber = this.availableTradingPartnersCount - this.lastShownTradingPartnersCount;
            if (this.lastShownTradingPartnersCount === -1)
                this.bubbleNumber = 0;
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
                sendTR += "&nbsp;&nbsp;"
                sendTR += " Get: <select class='trade-caravans-outgoing-select-buy'>";
                for (var k = 0; k < partner.sellsResources.length; k++) {
                    sendTR += "<option value='" + partner.sellsResources[k] + "'>" + partner.sellsResources[k] + "</option>";
                }
                if (partner.usesCurrency) {
                    sendTR += "<option value='currency'>silver</option>";
                }
                else if (partner.sellsResources.length === 0) {
                    sendTR += "<option value='ingredients'>crafting ingredients</option>";                    
                }
                sendTR += "</select>";
                sendTR += " <span class='trade-buy-value'>0</span>";
                sendTR += "</td>";
                sendTR += "<td class='minwidth'><button class='action' action='send_caravan_" + partner.campOrdinal + "'>Send</button></td></tr>";
                $("#trade-caravans-outgoing-container table").append(sendTR);
            }
            
            // TODO animate transitions
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
                }                
            });
            
            this.uiFunctions.generateButtonOverlays("#trade-caravans-outgoing-container table");
            this.uiFunctions.generateCallouts("#trade-caravans-outgoing-container table");
            this.uiFunctions.registerActionButtonListeners("#trade-caravans-outgoing-container table");
            
            this.lastShownTradingPartnersCount = this.availableTradingPartnersCount;
        },
        
        updateOutgoingCaravanPrepare: function () {
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
            
            // set get value
            var valueSell = TradeConstants.getResourceValue(selectedSell) * amountSell;
            var amountGet = 0;
            if (isResource(selectedBuy)) {
                amountGet = valueSell / TradeConstants.getResourceValue(selectedBuy);
            } else if (selectedBuy === "currency") {
                amountGet = valueSell;
            } else if (selectedBuy === "ingredients") {
                amountGet = valueSell / TradeConstants.VALUE_INGREDIENTS;
            } else {
                console.log("WARN: Unknown buy good: " + selectedBuy);
            }
            amountGet = Math.floor(amountGet+0.001);
            $(trID + " .trade-buy-value").text(amountGet);
            
            // set valid selection
            var isValid = hasEnoughSellRes && amountSell > 0 && amountGet > 0;
            $(trID + " button.action").attr("data-isselectionvalid", isValid);
        }
        
    });

    return UIOutTradeSystem;
});