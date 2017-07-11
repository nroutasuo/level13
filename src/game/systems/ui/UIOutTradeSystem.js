define([
    'ash',
    'game/constants/TradeConstants'
], function (
    Ash, TradeConstants
) {
    var UIOutTradeSystem = Ash.System.extend({
        
        bubbleNumber: 0,
        availableTradingPartnersCount: 0,
        lastShownTradingPartnersCount: -1,
        
        constructor: function (uiFunctions, tabChangedSignal, gameState) {
            this.uiFunctions = uiFunctions;
            this.tabChangedSignal = tabChangedSignal;
            this.gameState = gameState;
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
            this.updateOutgoingCaravans(isActive);
            
            if (!isActive) {
                return;
            }
            
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
        
        updateOutgoingCaravans: function (isActive) {
            this.availableTradingPartnersCount = this.gameState.foundTradingPartners.length;
            
            if (!isActive)
                return;
            
            if ($("#trade-caravans-outgoing-container tr").length === this.availableTradingPartnersCount)
                return;
            
            $("#trade-caravans-outgoing-container table").empty();
            for (var i = 0; i < this.gameState.foundTradingPartners.length; i++) {
                var partner = TradeConstants.getTradePartner(this.gameState.foundTradingPartners[i]);
                var tdName = "<td>" + partner.name + "</td>";
                var buysS = partner.buysResources.join(", ");
                var sellsS = partner.sellsResources.join(", ");
                var tdTrades = "<td>Buys: " + buysS + "<br/>Sells: " + sellsS + "</td>";
                var tdButton = "<td class='minwidth'><button class='action' action='send_caravan_" + partner.campOrdinal + "'>Send Caravan</button></td>";
                var tr = "<tr>" + tdName + tdTrades + tdButton + "</tr>";
                $("#trade-caravans-outgoing-container table").append(tr);
            }
            
            this.lastShownTradingPartnersCount = this.availableTradingPartnersCount;
        }
        
    });

    return UIOutTradeSystem;
});