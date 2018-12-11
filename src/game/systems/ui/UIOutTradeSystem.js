define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/TradeConstants',
	'game/constants/ItemConstants',
	'game/constants/UIConstants',
	'game/nodes/PlayerLocationNode',
	'game/nodes/player/ItemsNode',
	'game/components/common/PositionComponent',
	'game/components/sector/OutgoingCaravansComponent',
	'game/components/sector/events/TraderComponent',
	'game/vos/ResourcesVO',
	'game/vos/OutgoingCaravanVO'
], function (
	Ash, GameGlobals, GlobalSignals, TradeConstants, ItemConstants, UIConstants, PlayerLocationNode, ItemsNode, PositionComponent, OutgoingCaravansComponent, TraderComponent, ResourcesVO, OutgoingCaravanVO
) {
	var UIOutTradeSystem = Ash.System.extend({

		bubbleNumber: null,
		availableTradingPartnersCount: 0,
		lastShownTradingPartnersCount: -1,
		currentIncomingTraders: 0,
		lastShownIncomingTraders: 0,

		playerLocationNodes: null,

		constructor: function () {
			return this;
		},

		addToEngine: function (engine) {
			this.engine = engine;
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			this.itemNodes = engine.getNodeList(ItemsNode);
			GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.onTabChanged);
		},

		removeFromEngine: function (engine) {
			this.engine = null;
			this.playerLocationNodes = null;
			this.itemNodes = null;
			GlobalSignals.removeAll(this);
		},

		update: function (time) {
			if (!this.playerLocationNodes.head) return;
			var isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.trade;

			this.updateBubble();
			this.updateOutgoingCaravansList(isActive);
			this.updateIncomingCaravan(isActive);

			if (!isActive) return;

			this.updateOutgoingCaravanPrepare();

			GameGlobals.uiFunctions.toggle("#trade-caravans-outgoing-empty-message", this.availableTradingPartnersCount === 0);
			GameGlobals.uiFunctions.toggle("#trade-caravans-incoming-empty-message", this.currentIncomingTraders === 0);
			$("#tab-header h2").text("Trade");
		},

		onTabChanged: function () {
			this.hideOutgoingPlanRows();
		},

		updateBubble: function () {
			var newBubbleNumber = this.availableTradingPartnersCount - this.lastShownTradingPartnersCount;
			if (this.lastShownTradingPartnersCount === -1)
				newBubbleNumber = 0;
			newBubbleNumber += (this.currentIncomingTraders - this.lastShownIncomingTraders);
			if (this.bubbleNumber === newBubbleNumber)
				return;
			this.bubbleNumber = newBubbleNumber;
			$("#switch-trade .bubble").text(this.bubbleNumber);
			GameGlobals.uiFunctions.toggle("#switch-trade .bubble", this.bubbleNumber > 0);
		},

		updateOutgoingCaravansList: function (isActive) {
			this.availableTradingPartnersCount = GameGlobals.gameState.foundTradingPartners.length;

			if (!isActive)
				return;

			if ($("#trade-caravans-outgoing-container tr").length === (2 * this.availableTradingPartnersCount))
				return;
                
            var level = this.playerLocationNodes.head.entity.get(PositionComponent).level;
            var campOrdinal = GameGlobals.gameState.getCampOrdinal(level);

			$("#trade-caravans-outgoing-container table").empty();
			for (var i = 0; i < GameGlobals.gameState.foundTradingPartners.length; i++) {
				var partner = TradeConstants.getTradePartner(GameGlobals.gameState.foundTradingPartners[i]);
				var tdName = "<td class='item-name'>" + partner.name + "</td>";
				var buysS = partner.buysResources.join(", ");
				var sellsS = partner.sellsResources.join(", ");
				if (sellsS.length <= 0) sellsS = "-";
				var tdTrades = "<td>Buys: " + buysS + "<br/>Sells: " + sellsS + "</td>";
				var toggleBtnID = "btn_send_caravan_" + partner.campOrdinal + "_toggle";
				var tdButton = "<td class='minwidth'><button id='" + toggleBtnID + "' class='btn-trade-caravans-outgoing-toggle'>Send caravan</button></td>";
				var tr = "<tr class='trade-caravans-outgoing' id='trade-caravans-outgoing-" + partner.campOrdinal + "'>" + tdName + tdTrades + tdButton + "</tr>";
				$("#trade-caravans-outgoing-container table").append(tr);

				var sendTR = "<tr style='display:none;' class='trade-caravans-outgoing-plan highlightbox' id='trade-caravans-outgoing-plan-" + partner.campOrdinal + "'>";
				sendTR += "<td colspan='2'>";
				sendTR += "<div class='row-detail-indicator'>></div>";
				sendTR += "Sell: <select class='trade-caravans-outgoing-select-sell'>";
				for (var j = 0; j < partner.buysResources.length; j++) {
					sendTR += "<option value='" + partner.buysResources[j] + "'>" + partner.buysResources[j] + "</option>";
				}
				sendTR += "</select>";
				sendTR += "<input type='range' class='trade-caravans-outgoing-range-sell' min='" + TradeConstants.MIN_OUTGOING_CARAVAN_RES + "' max='" + TradeConstants.MAX_OUTGOING_CARAVAN_RES + "' step='10' />";
				sendTR += " <span class='trade-sell-value-invalid'></span>";
				sendTR += " <span class='trade-sell-value'>0</span>";
				sendTR += "<span class='trade-caravans-outgoing-buy'>";
				sendTR += "&nbsp;&nbsp;|&nbsp;&nbsp;"
				sendTR += "Get: <select class='trade-caravans-outgoing-select-buy'>";
				for (var k = 0; k < partner.sellsResources.length; k++) {
					sendTR += "<option value='" + partner.sellsResources[k] + "'>" + partner.sellsResources[k] + "</option>";
				}
				if (partner.usesCurrency) {
					sendTR += "<option value='" + TradeConstants.GOOD_TYPE_NAME_CURRENCY + "'>silver</option>";
				} else if (partner.sellsResources.length === 0) {
					sendTR += "<option value='" + TradeConstants.GOOD_TYPE_NAME_INGREDIENTS + "'>crafting ingredients</option>";
				}
				sendTR += "</select>";
				sendTR += " <span class='trade-buy-value'>0</span>";
				sendTR += "</span>";
				sendTR += "</td>";
				sendTR += "<td class='minwidth'><button class='action btn-trade-caravans-outgoing-send' action='send_caravan_" + partner.campOrdinal + "'>Send</button></td></tr>";
				$("#trade-caravans-outgoing-container table").append(sendTR);
			}
			GlobalSignals.elementCreatedSignal.dispatch();

			// TODO animate transitions
			var sys = this;
			$(".btn-trade-caravans-outgoing-toggle").click(function () {
				var ordinal = $(this).attr("id").split("_")[3];
				var tr = $("#trade-caravans-outgoing-plan-" + ordinal);
				var wasVisible = $(tr).is(":visible");

				sys.hideOutgoingPlanRows();

				// set this button and tr to correct state
				if (!wasVisible) {
					sys.showOutgoingPlanRow(ordinal);
				} else {
					sys.resetPendingCaravan();
				}
			});

			$(".btn-trade-caravans-outgoing-send").click(function () {
				var ordinal = $(this).attr("action").split("_")[2];
				sys.confirmPendingCaravan();
			});

			GameGlobals.uiFunctions.generateButtonOverlays("#trade-caravans-outgoing-container table");
			GameGlobals.uiFunctions.generateCallouts("#trade-caravans-outgoing-container table");
			GameGlobals.uiFunctions.registerActionButtonListeners("#trade-caravans-outgoing-container table");

			this.lastShownTradingPartnersCount = this.availableTradingPartnersCount;
		},

		hideOutgoingPlanRows: function () {
			$(".btn-trade-caravans-outgoing-toggle").text("Send caravan");
			GameGlobals.uiFunctions.toggle(".trade-caravans-outgoing-plan", false, true);
			$(".trade-caravans-outgoing").toggleClass("selected", false);
		},

		showOutgoingPlanRow: function (tradePartnerOrdinal) {
			var tr = $("#trade-caravans-outgoing-plan-" + tradePartnerOrdinal);
			$("#trade-caravans-outgoing-" + tradePartnerOrdinal + " button").text("cancel");
			$("#trade-caravans-outgoing-" + tradePartnerOrdinal).toggleClass("selected", true);
			GameGlobals.uiFunctions.toggle(tr, true);
			this.initPendingCaravan(tradePartnerOrdinal);
		},

		updateIncomingCaravan: function (isActive) {
			this.currentIncomingTraders = 0;

			var traderComponent = this.playerLocationNodes.head.entity.get(TraderComponent);
			if (traderComponent) this.currentIncomingTraders++;

			if (!isActive)
				return;

			var caravan = traderComponent ? traderComponent.caravan : null;
			var tradesMade = caravan ? caravan.tradesMade : null;

			if (this.lastShownIncomingCaravan === caravan && this.lastShownIncomingCaravanTrades === tradesMade) {
				return;
			}

			var itemsComponent = this.itemNodes.head.items;

			// TODO show currency / more information about the trader

			$("#trade-caravans-incoming-container table").empty();
			if (caravan) {
				var nameTD = "<td class='item-name'>" + caravan.name + "</td>";

				var inventoryUL = "<ul class='ul-horizontal'>";
				var numLis = 0;
				var skippedLis = 0;

				var itemCounts = {};
				for (var i = 0; i < caravan.sellItems.length; i++) {
					if (!itemCounts[caravan.sellItems[i].id])
						itemCounts[caravan.sellItems[i].id] = 0;
					itemCounts[caravan.sellItems[i].id]++;
				}

				for (var itemID in itemCounts) {
					var item = ItemConstants.getItemByID(itemID);
					if (numLis < 6) {
						inventoryUL += UIConstants.getItemSlot(itemsComponent, item, null, false, true);
						numLis++;
					} else {
						skippedLis++;
					}
				}

				for (var key in resourceNames) {
					var name = resourceNames[key];
					var amount = caravan.sellResources.getResource(name);
					if (amount > 0) {
						if (numLis < 9) {
							inventoryUL += UIConstants.getResourceLi(name, amount, false, true);
							numLis++;
						} else {
							skippedLis++;
						}
					}
				}

				if (caravan.currency > 0) {
					inventoryUL += UIConstants.getCurrencyLi(caravan.currency, true);
					numLis++;
				}

				if (skippedLis > 0) {
					inventoryUL += "<li class='item-slot item-slot-simple item-slot-small' style='vertical-align: bottom;text-align: center;width: 10px;font-weight: bold;'><div class'item-slot-image' style='padding-top: 5px'>+</div></li>";
				}

				inventoryUL += "</ul>";
				var inventoryTD = "<td><div style='margin-right: 5px'>" + inventoryUL + "</div></td>";
				var buttonsTD = "<td><button class='trade-caravans-incoming-trade'>Trade</button>";
				buttonsTD += "<button class='trade-caravans-incoming-dismiss btn-secondary'>Dismiss</button></td>";
				var tr = "<tr>" + nameTD + inventoryTD + buttonsTD + "</tr>";
				$("#trade-caravans-incoming-container table").append(tr);

				var uiFunctions = GameGlobals.uiFunctions;
				$(".trade-caravans-incoming-trade").click(function () {
					uiFunctions.showIncomingCaravanPopup();
				});
				$(".trade-caravans-incoming-dismiss").click(function () {
					traderComponent.isDismissed = true;
				});

				GameGlobals.uiFunctions.generateCallouts("#trade-caravans-incoming-container table");
				GlobalSignals.elementCreatedSignal.dispatch();
			}

			this.lastShownIncomingTraders = this.currentIncomingTraders;
			this.lastShownIncomingCaravan = caravan;
			this.lastShownIncomingCaravanTrades = caravan ? caravan.tradesMade : 0;
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
			var ownedStorage = GameGlobals.resourcesHelper.getCurrentStorage();
			var ownedSellAmount = ownedStorage.resources.getResource(selectedSell);
			var hasEnoughSellRes = ownedSellAmount >= TradeConstants.MIN_OUTGOING_CARAVAN_RES;
			if (hasEnoughSellRes) {
				amountSell = Math.min(ownedSellAmount, $(sellSlider).val());
				GameGlobals.uiFunctions.toggle(sellSlider, true);
				$(sellSlider).attr("max", Math.min(TradeConstants.MAX_OUTGOING_CARAVAN_RES, Math.floor(ownedSellAmount / 10) * 10));
				GameGlobals.uiFunctions.toggle(trID + " .trade-sell-value-invalid", false);
				GameGlobals.uiFunctions.toggle(trID + " .trade-sell-value", true);
				$(trID + " .trade-sell-value").text("x" + amountSell);
			} else {
				GameGlobals.uiFunctions.toggle(sellSlider, false);
				GameGlobals.uiFunctions.toggle(trID + " .trade-sell-value-invalid", true);
				$(trID + " .trade-sell-value-invalid").text("Not enough " + selectedSell);
				GameGlobals.uiFunctions.toggle(trID + " .trade-sell-value", false);
			}

			// set get amount
			var amountGet = TradeConstants.getAmountTraded(selectedBuy, selectedSell, amountSell);
			if (hasEnoughSellRes) {
				$(trID + " .trade-caravans-outgoing-buy").toggle(true);
				$(trID + " .trade-buy-value").text("x" + amountGet);
			} else {
				$(trID + " .trade-caravans-outgoing-buy").toggle(false);
				$(trID + " .trade-buy-value").text("");
			}

			// set valid selection
			var isValid = hasEnoughSellRes && amountSell > 0 && amountGet > 0;
			$(trID + " button.action").attr("data-isselectionvalid", isValid);

			if (caravansComponent.pendingCaravan) {
				caravansComponent.pendingCaravan.sellGood = selectedSell;
				caravansComponent.pendingCaravan.sellAmount = amountSell;
				caravansComponent.pendingCaravan.buyGood = selectedBuy;
			}
		},

		confirmPendingCaravan: function () {
			this.hideOutgoingPlanRows();
		},

		initPendingCaravan: function (tradePartnerOrdinal) {
            var level = this.playerLocationNodes.head.entity.get(PositionComponent).level;
			var caravansComponent = this.playerLocationNodes.head.entity.get(OutgoingCaravansComponent);
            var campOrdinal = GameGlobals.gameState.getCampOrdinal(level);
			caravansComponent.pendingCaravan = new OutgoingCaravanVO(campOrdinal, tradePartnerOrdinal);
		},

		resetPendingCaravan: function () {
			var caravansComponent = this.playerLocationNodes.head.entity.get(OutgoingCaravansComponent);
			caravansComponent.pendingCaravan = null;
		}

	});

	return UIOutTradeSystem;
});
