define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/TradeConstants',
	'game/constants/ItemConstants',
	'game/constants/UIConstants',
	'game/nodes/PlayerLocationNode',
	'game/nodes/player/ItemsNode',
	'game/nodes/tribe/TribeUpgradesNode',
	'game/components/common/PositionComponent',
	'game/components/sector/OutgoingCaravansComponent',
	'game/components/sector/events/TraderComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/vos/ResourcesVO',
	'game/vos/OutgoingCaravanVO'
], function (
	Ash, GameGlobals, GlobalSignals, TradeConstants, ItemConstants, UIConstants, PlayerLocationNode, ItemsNode, TribeUpgradesNode, PositionComponent, OutgoingCaravansComponent, TraderComponent, SectorImprovementsComponent, ResourcesVO, OutgoingCaravanVO
) {
	var UIOutTradeSystem = Ash.System.extend({

		bubbleNumber: null,
		availableTradingPartnersCount: 0,
		lastShownTradingPartnersCount: -1,
		currentIncomingTraders: 0,

		playerLocationNodes: null,
		tribeUpgradesNodes: null,

		constructor: function () {
			return this;
		},

		addToEngine: function (engine) {
			this.engine = engine;
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
			this.itemNodes = engine.getNodeList(ItemsNode);
			GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.onTabChanged);
			GlobalSignals.add(this, GlobalSignals.caravanSentSignal, this.refresh);
			GlobalSignals.add(this, GlobalSignals.playerMovedSignal, this.refresh);
		},

		removeFromEngine: function (engine) {
			this.engine = null;
			this.playerLocationNodes = null;
			this.tribeUpgradesNodes = null;
			this.itemNodes = null;
			GlobalSignals.removeAll(this);
		},

		update: function (time) {
			if (!this.playerLocationNodes.head) return;
			var isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.trade;
			this.availableTradingPartnersCount = GameGlobals.gameState.foundTradingPartners.length;

			this.updateBubble();
			this.updateIncomingCaravan(isActive);

			if (!isActive) return;

			this.updateOutgoingCaravanPrepare();

			this.lastShownTradingPartnersCount = this.availableTradingPartnersCount;

			GameGlobals.uiFunctions.toggle("#trade-caravans-incoming-empty-message", this.currentIncomingTraders === 0);
			$("#tab-header h2").text("Trade");
		},
		
		refresh: function () {
			if (!this.playerLocationNodes.head) return;
			if (GameGlobals.gameState.uiStatus.currentTab !== GameGlobals.uiFunctions.elementIDs.tabs.trade) return;
			this.updateOutgoingCaravansList();
			this.updateOutgoingCaravansHints();
		},

		onTabChanged: function () {
			this.hideOutgoingPlanRows();
			this.refresh();
		},

		updateBubble: function () {
			if (GameGlobals.gameState.uiStatus.isBlocked) return;
			var newBubbleNumber = this.availableTradingPartnersCount - this.lastShownTradingPartnersCount;
			if (this.lastShownTradingPartnersCount === -1)
				newBubbleNumber = 0;
			newBubbleNumber += this.currentIncomingTraders;
			if (this.bubbleNumber === newBubbleNumber)
				return;
			
			GameGlobals.uiFunctions.updateBubble("#switch-trade .bubble", this.bubbleNumber, newBubbleNumber);
			this.bubbleNumber = newBubbleNumber;
		},

		updateOutgoingCaravansList: function (isActive) {
			let level = this.playerLocationNodes.head.entity.get(PositionComponent).level;
			let campOrdinal = GameGlobals.gameState.getCampOrdinal(level);
			let totalCaravans = this.getNumOutgoingCaravansTotal();
			let availableCaravans = this.getNumOutgoingCaravansAvailable();
			
			let getOptionElement = function (value, label, savedValue) {
				let result = "<option ";
				result += "value='" + value + "'";
				if (value == savedValue) result += " selected"
				result += ">";
				result += label;
				result += "</option>";
				return result;
			};

			$("#trade-caravans-outgoing-container table").empty();
			for (let i = 0; i < GameGlobals.gameState.foundTradingPartners.length; i++) {
				let partner = TradeConstants.getTradePartner(GameGlobals.gameState.foundTradingPartners[i]);
				if (!partner) continue;
				let traderId = partner.campOrdinal;
				
				let savedSellOption = GameGlobals.gameState.uiStatus.lastSelection["outoing-caravan-sell-" + traderId];
				let savedBuyOption = GameGlobals.gameState.uiStatus.lastSelection["outoing-caravan-buy-" + traderId];
				
				let tdName = "<td class='item-name'>" + partner.name + "</td>";
				let buysS = partner.buysResources.join(", ");
				let sellsS = partner.sellsResources.join(", ");
				if (sellsS.length <= 0) sellsS = "-";
				let tdTrades = "<td>Buys: " + buysS + "<br/>Sells: " + sellsS + "</td>";
				let toggleBtnID = "btn_send_caravan_" + partner.campOrdinal + "_toggle";
				let btn = "<button id='" + toggleBtnID + "' class='btn-trade-caravans-outgoing-toggle'>Send caravan</button>";
				if (totalCaravans < 1) {
					btn = "";
				}
				let tdButton = "<td class='minwidth'>" + btn + "</td>";
				let tr = "<tr class='trade-caravans-outgoing' id='trade-caravans-outgoing-" + partner.campOrdinal + "'>" + tdName + tdTrades + tdButton + "</tr>";
				$("#trade-caravans-outgoing-container table").append(tr);

				let sendTR = "<tr style='display:none;' class='trade-caravans-outgoing-plan highlightbox' id='trade-caravans-outgoing-plan-" + partner.campOrdinal + "'>";
				sendTR += "<td colspan='2'>";
				sendTR += "<div class='row-detail-indicator'>></div>";
				sendTR += "Sell: <select class='trade-caravans-outgoing-select-sell' data-trader-id='" + traderId +"'>";
				for (let j = 0; j < partner.buysResources.length; j++) {
					sendTR += getOptionElement(partner.buysResources[j], partner.buysResources[j], savedSellOption);
				}
				sendTR += "</select>";
				
				let maxSelection = this.getCaravanCapacity();
				let defaultSelection = maxSelection;
				if (partner.sellsResources.length && partner.buysResources.length) {
					let maxValueReturned = TradeConstants.getResourceValue(partner.sellsResources[0]) * maxSelection;
					let maxUsefulTrade = maxValueReturned / TradeConstants.getResourceValue(partner.buysResources[0]);
					maxUsefulTrade = Math.floor(maxUsefulTrade+0.001);
					defaultSelection = Math.min(maxUsefulTrade, maxSelection);
				}
				
				sendTR += "<input type='range' class='trade-caravans-outgoing-range-sell' min='" + TradeConstants.MIN_OUTGOING_CARAVAN_RES + "' max='" + maxSelection + "' value='" + defaultSelection + "' step='10' />";
				sendTR += " <span class='trade-sell-value-invalid'></span>";
				sendTR += " <span class='trade-sell-value'>0</span>";
				sendTR += "<span class='trade-caravans-outgoing-buy'>";
				sendTR += "&nbsp;&nbsp;|&nbsp;&nbsp;"
				
				sendTR += "Get: <select class='trade-caravans-outgoing-select-buy' data-trader-id='" + traderId + "'>";
				for (let k = 0; k < partner.sellsResources.length; k++) {
					let sellRes = partner.sellsResources[k];
					sendTR += getOptionElement(sellRes, sellRes, savedBuyOption);
				}
				if (partner.usesCurrency) {
					sendTR += getOptionElement(TradeConstants.GOOD_TYPE_NAME_CURRENCY, "silver", savedBuyOption);
				}
				if (partner.sellsIngredients) {
					sendTR += getOptionElement(TradeConstants.GOOD_TYPE_NAME_INGREDIENTS, "ingredients", savedBuyOption);
				}
				sendTR += "</select>";
				
				sendTR += " <span class='trade-buy-value'>0</span>";
				sendTR += "</span>";
				sendTR += "</td>";
				sendTR += "<td class='minwidth'><button class='action btn-trade-caravans-outgoing-send' action='send_caravan_" + partner.campOrdinal + "'>Send</button></td></tr>";
				$("#trade-caravans-outgoing-container table").append(sendTR);
			}
			
			$("#trade-caravans-outgoing-container table input").on("change", function () {
				GlobalSignals.updateButtonsSignal.dispatch();
			});
			
			$("#trade-caravans-outgoing-container table select").on("change", function (e) {
				let $elem = $(e.target);
				let value = $elem.val();
				let traderId = $elem.data("trader-id");
				if ($elem.hasClass("trade-caravans-outgoing-select-buy")) {
					GameGlobals.gameState.uiStatus.lastSelection["outoing-caravan-buy-" + traderId] = value;
				} else if ($elem.hasClass("trade-caravans-outgoing-select-sell")) {
					GameGlobals.gameState.uiStatus.lastSelection["outoing-caravan-sell-" + traderId] = value;
				}
			});
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
		},
		
		updateOutgoingCaravansHints: function () {
			GameGlobals.uiFunctions.toggle("#trade-caravans-outgoing-empty-message", this.availableTradingPartnersCount === 0);
			GameGlobals.uiFunctions.toggle("#trade-caravans-outgoing-num", this.availableTradingPartnersCount > 0);
			
			if (this.availableTradingPartnersCount > 0) {
				var totalCaravans = this.getNumOutgoingCaravansTotal();
				if (totalCaravans > 0) {
					var availableCaravans = this.getNumOutgoingCaravansAvailable();
					$("#trade-caravans-outgoing-num").html(
						"Available caravans: <span class='hl-functionality'>" + availableCaravans + "/" + totalCaravans + "</span>. " +
						"Capacity: <span class='hl-functionality'>" + this.getCaravanCapacity() + "</span> per caravan.");
				} else {
					var stableUnlocked = GameGlobals.playerActionsHelper.isRequirementsMet("build_in_stable");
					if (stableUnlocked) {
						$("#trade-caravans-outgoing-num").html("Available caravans: <span class='hl-functionality'>0</span> (build the stable to send caravans)");
					} else {
						$("#trade-caravans-outgoing-num").html("");
					}
				}
			}
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
				for (let i = 0; i < caravan.sellItems.length; i++) {
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
				var maxVal = Math.min(this.getCaravanCapacity(), Math.floor(ownedSellAmount / 10) * 10);
				$(sellSlider).attr("max", maxVal);
				$(sellSlider).attr("step", maxVal >= 100 ? 10 : 5);
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
			let amountGetRaw = TradeConstants.getAmountTraded(selectedBuy, selectedSell, amountSell);
			var amountGet = Math.min(amountGetRaw, this.getCaravanCapacity());
			if (hasEnoughSellRes) {
				let showAmountGetWarning = (amountGet > ownedStorage.storageCapacity) || (amountGetRaw > amountGet);
				$(trID + " .trade-caravans-outgoing-buy").toggle(true);
				$(trID + " .trade-buy-value").text("x" + amountGet);
				$(trID + " .trade-buy-value").toggleClass("warning", showAmountGetWarning);
			} else {
				$(trID + " .trade-caravans-outgoing-buy").toggle(false);
				$(trID + " .trade-buy-value").text("");
			}
			
			var caravanCapacity = this.getCaravanCapacity();
			var isWithinCaravanCapacity = true;
			var capacityOutgoing = TradeConstants.getRequiredCapacity(selectedSell, amountSell);
			var capacityIncoming = TradeConstants.getRequiredCapacity(selectedBuy, amountGet);
			var isCapacityOK = capacityOutgoing <= caravanCapacity && capacityIncoming <= caravanCapacity;
			
			// set valid selection
			var isValid = hasEnoughSellRes && amountSell > 0 && amountGet > 0 && isCapacityOK;
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
			var capacity = this.getCaravanCapacity();
			caravansComponent.pendingCaravan = new OutgoingCaravanVO(campOrdinal, tradePartnerOrdinal, capacity);
		},

		resetPendingCaravan: function () {
			var caravansComponent = this.playerLocationNodes.head.entity.get(OutgoingCaravansComponent);
			caravansComponent.pendingCaravan = null;
		},
		
		getNumOutgoingCaravansTotal: function () {
			var improvementsComponent = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			return improvementsComponent.getCount(improvementNames.stable);
		},
		
		getNumOutgoingCaravansAvailable: function () {
			var totalCaravans = this.getNumOutgoingCaravansTotal();
			var caravansComponent = this.playerLocationNodes.head.entity.get(OutgoingCaravansComponent);
			if (!caravansComponent) return 0;
			var busyCaravans = caravansComponent.outgoingCaravans.length;
			return totalCaravans - busyCaravans;
		},
		
		getCaravanCapacity: function () {
			var improvementsComponent = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			var stableLevel = improvementsComponent.getLevel(improvementNames.stable);
			return TradeConstants.getCaravanCapacity(stableLevel);
		}

	});

	return UIOutTradeSystem;
});
