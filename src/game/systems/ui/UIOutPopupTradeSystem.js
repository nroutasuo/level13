define([
	'ash',
	'utils/MathUtils',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/nodes/PlayerLocationNode',
	'game/nodes/player/ItemsNode',
	'game/components/sector/events/TraderComponent',
	'game/elements/HorizontalSelect',
	'game/constants/UIConstants',
	'game/constants/ItemConstants',
	'game/constants/TradeConstants',
	'game/vos/ResourcesVO'
], function (Ash, MathUtils, GameGlobals, GlobalSignals, PlayerLocationNode, ItemsNode, TraderComponent, HorizontalSelect, UIConstants, ItemConstants, TradeConstants, ResourcesVO) {
	var UIOutPopupTradeSystem = Ash.System.extend({

		itemNodes: null,

		constructor: function () {
			var sys = this;
			GlobalSignals.popupOpenedSignal.add(function (popupID) {
				if (popupID === "incoming-caravan-popup") {
					sys.clearSelection();
					sys.setupPopup();
					sys.createLists();
					sys.updateLists();
				}
			});
			this.initElements();
			return this;
		},

		addToEngine: function (engine) {
			this.engine = engine;
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			this.itemNodes = engine.getNodeList(ItemsNode);
		},

		removeFromEngine: function (engine) {
			this.engine = null;
			this.playerLocationNodes = null;
			this.itemNodes = null;
		},
			
		initElements: function () {
			var sys = this;
			$("#incoming-caravan-popup-reset").click(function (e) {
				GlobalSignals.triggerSoundSignal.dispatch(UIConstants.soundTriggerIDs.buttonClicked);
				sys.clearSelection();
				sys.updateLists();
			});
			$("#incoming-caravan-popup-cancel").click(function (e) {
				GlobalSignals.triggerSoundSignal.dispatch(UIConstants.soundTriggerIDs.buttonClicked);
				GameGlobals.uiFunctions.popupManager.closePopup("incoming-caravan-popup");
			});
			this.multiplierSelect = HorizontalSelect.init("incoming-caravan-popup-multiplier", "Selection");
		},

		setupPopup: function () {
			var traderComponent = this.playerLocationNodes.head.entity.get(TraderComponent);
			var caravan = traderComponent.caravan;
			$("#incoming-caravan-popup h3").text(caravan.name);
			$("#incoming-caravan-popup-markup").text((TradeConstants.VALUE_MARKUP_INCOMING_CARAVANS * 100) + "% markup");
		},

		createLists: function () {
			$("#inventorylist-incoming-caravan-trader-inventory ul").empty();
			$("#inventorylist-incoming-caravan-trader-offer ul").empty();
			$("#inventorylist-incoming-caravan-camp-inventory ul").empty();
			$("#inventorylist-incoming-caravan-camp-offer ul").empty();

			var traderComponent = this.playerLocationNodes.head.entity.get(TraderComponent);
			var caravan = traderComponent.caravan;
			var campStorage = GameGlobals.resourcesHelper.getCurrentStorage();
			var currencyComponent = GameGlobals.resourcesHelper.getCurrentCurrency();
			let itemsComponent = this.itemNodes.head.items;

			this.traderTotalItems = {}; // id:quality => []
			this.traderOfferLis = {};
			this.traderInventoryLis = {};
			this.campTotalItems = {}; // id:quality => []
			this.campOfferLis = {};
			this.campInventoryLis = {};

			this.allItems = {}; // instanceID => itemVO

			let sys = this;
			let highestAmount = 0;

			var addLis = function (li, key, section) {
				var inventoryLi = $(li).clone();
				$("#inventorylist-incoming-caravan-" + section + "-inventory ul").append(inventoryLi);
				sys[section + "InventoryLis"][key] = inventoryLi;
				var offerLi = $(li).clone();
				sys[section + "OfferLis"][key] = offerLi;
				$("#inventorylist-incoming-caravan-" + section + "-offer ul").append(offerLi);
			}

			// trader items: count
			for (let i = 0; i < caravan.sellItems.length; i++) {
				let id = ItemConstants.getLongItemID(caravan.sellItems[i]);
				if (!this.traderTotalItems[id])
					this.traderTotalItems[id] = [];
				this.traderTotalItems[id].push(caravan.sellItems[i])
				this.allItems[caravan.sellItems[i].itemID] = caravan.sellItems[i];
			}

			// trader items: create
			for (let longItemID in this.traderTotalItems) {
				let items = this.traderTotalItems[longItemID];
				if (!items || items.length <= 0) continue;
				let item = items[0];
				let li = UIConstants.getItemSlot(itemsComponent, item, 0, false, true);
				addLis(li, longItemID, "trader")
			}

			// camp items: count
			for (let j in caravan.buyItemTypes) {
				var category = caravan.buyItemTypes[j];
				if (category == "uniqueEquipment" || category == "explorer") continue;
				var itemList = itemsComponent.getAllByType(ItemConstants.itemTypes[category], true);
				for (let k in itemList) {
					if (itemList[k].equipped) continue;
					if (itemList[k].broken) continue;
					if (!ItemConstants.isUnselectable(itemList[k])) continue;
					let longID = ItemConstants.getLongItemID(itemList[k]);
					if (!this.campTotalItems[longID])
						this.campTotalItems[longID] = [];
					this.campTotalItems[longID].push(itemList[k]);
					this.allItems[itemList[k].itemID] = itemList[k];
				}
			}

			// camp items: create
			let count = 0;
			for (var longItemID in this.campTotalItems) {
				let items = this.campTotalItems[longItemID];
				if (!items || items.length <= 0) continue;
				let item = items[0];
				if (!item) continue;
				let li = UIConstants.getItemSlot(itemsComponent, item, 0, false, true);
				addLis(li, longItemID, "camp")
				count++;
				if (count >= 23) break;
			}

			// trader and camp resources
			for (let key in resourceNames) {
				var name = resourceNames[key];
				var traderInventoryAmount = caravan.sellResources.getResource(name);
				var campInventoryAmount = campStorage.resources.getResource(name);
				var willBuy = caravan.buyResources.indexOf(name) >= 0;
				
				if (traderInventoryAmount || (campInventoryAmount && willBuy)) {
					var li = UIConstants.getResourceLi(name, 0, false, true);
					if (traderInventoryAmount > 0) {
						addLis(li, key, "trader")
					}

					if (campInventoryAmount > 0 && willBuy) {
						addLis(li, key, "camp")
					}
						
					log.i("create " + name + " " + traderInventoryAmount + " " + campInventoryAmount)
					highestAmount = Math.max(highestAmount, traderInventoryAmount, campInventoryAmount);
				}
			}

			// trader and camp currency
			if (caravan.usesCurrency > 0) {
				var li = UIConstants.getCurrencyLi(0, true);
				var traderInventoryAmount = caravan.currency;
				if (traderInventoryAmount > 0) {
					addLis(li, "currency", "trader");
				}
				var campInventoryAmount = currencyComponent.currency;
				if (campInventoryAmount > 0) {
					addLis(li, "currency", "camp");
				}
				highestAmount = Math.max(highestAmount, traderInventoryAmount, campInventoryAmount);
			}

			let isMatchingItem = function (liItem, item) {
				return liItem && item && ItemConstants.getLongItemID(liItem) == ItemConstants.getLongItemID(item);
			};

			let moveItem = function ($li, source) {
				let divRes = $li.find(".res");
				let divItem = $li.find(".item");
				let resourceName = $(divRes).attr("data-resourcename");
				let itemID = $(divItem).attr("data-itemid");
				let isCurrency = resourceName === "currency";

				let isTraderInventory = $li.parents("#inventorylist-incoming-caravan-trader-inventory").length > 0;
				let isTraderOffer = $li.parents("#inventorylist-incoming-caravan-trader-offer").length > 0;
				let isCampInventory = $li.parents("#inventorylist-incoming-caravan-camp-inventory").length > 0;
				let isCampOffer = $li.parents("#inventorylist-incoming-caravan-camp-offer").length > 0;
				
				let amount = Math.max(1, HorizontalSelect.getSelection(sys.multiplierSelect).value);

				if (isCurrency) {
					if (isTraderInventory) {
						caravan.traderSelectedCurrency += amount;
					} else if (isTraderOffer && caravan.traderSelectedCurrency > 0) {
						caravan.traderSelectedCurrency -= amount;
					} else if (isCampInventory) {
						caravan.campSelectedCurrency += amount;
					} else if (isCampOffer) {
						caravan.campSelectedCurrency -= amount;
					}
					caravan.traderSelectedCurrency = MathUtils.clamp(caravan.traderSelectedCurrency, 0, caravan.currency);
					caravan.campSelectedCurrency = MathUtils.clamp(caravan.campSelectedCurrency, 0, currencyComponent.currency);
				} else if (resourceName) {
					if (isTraderInventory) {
						caravan.traderSelectedResources.addResource(resourceName, amount);
					} else if (isTraderOffer) {
						caravan.traderSelectedResources.addResource(resourceName, -amount);
					} else if (isCampInventory) {
						caravan.campSelectedResources.addResource(resourceName, amount);
					} else if (isCampOffer) {
						caravan.campSelectedResources.addResource(resourceName, -amount);
					}
					caravan.traderSelectedResources.limit(resourceName, 0, caravan.sellResources.getResource(resourceName), false);
					caravan.campSelectedResources.limit(resourceName, 0, campStorage.resources.getResource(resourceName), false);
				} else if (itemID) {
					let itemInstanceID = $(divItem).attr("data-iteminstanceid");
					let liItem = sys.allItems[itemInstanceID];

					if (isTraderInventory) {
						let traderInventoryItem = caravan.sellItems.find(i => isMatchingItem(liItem, i) && caravan.traderSelectedItems.indexOf(i) < 0);
						if (traderInventoryItem) {
							caravan.traderSelectedItems.push(traderInventoryItem);
						}
					} else if (isTraderOffer) {
						let traderOfferItem = caravan.traderSelectedItems.find(i => isMatchingItem(liItem, i) && caravan.traderSelectedItems.indexOf(i) >= 0);
						caravan.traderSelectedItems = caravan.traderSelectedItems.filter(i => i.itemID != traderOfferItem.itemID);
					} else if (isCampInventory) {
						let campInventoryItem = itemsComponent.getItem(itemID, null, true, false, i => isMatchingItem(liItem, i) && caravan.campSelectedItems.indexOf(i) < 0);
						if (campInventoryItem) {
							caravan.campSelectedItems.push(campInventoryItem);
						}
					} else if (isCampOffer) {
						let campOfferItem = caravan.campSelectedItems.find(i => isMatchingItem(liItem, i));
						caravan.campSelectedItems = caravan.campSelectedItems.filter(i => i.itemID != campOfferItem.itemID);
					}
				}

				sys.updateLists();
				GlobalSignals.updateButtonsSignal.dispatch();
			};

			var onLiClicked = function (e) {
				GlobalSignals.triggerSoundSignal.dispatch(UIConstants.soundTriggerIDs.buttonClicked);
				moveItem($(this), "click");
			};

			var onLiLongTap = function (e) {
				moveItem($(this), "longtap");
			};

			var lis = [
				$("#inventorylist-incoming-caravan-trader-inventory li"),
				$("#inventorylist-incoming-caravan-trader-offer li"),
				$("#inventorylist-incoming-caravan-camp-offer li"),
				$("#inventorylist-incoming-caravan-camp-inventory li")
			];

			for (i in lis) {
				lis[i].click(onLiClicked);
				GameGlobals.uiFunctions.registerLongTap(lis[i], onLiLongTap);
			}

			GameGlobals.uiFunctions.generateInfoCallouts("#inventorylist-incoming-caravan-trader-inventory");
			GameGlobals.uiFunctions.generateInfoCallouts("#inventorylist-incoming-caravan-trader-offer");
			GameGlobals.uiFunctions.generateInfoCallouts("#inventorylist-incoming-caravan-camp-inventory");
			GameGlobals.uiFunctions.generateInfoCallouts("#inventorylist-incoming-caravan-camp-offer");
			
			var selectionOptions = [{ value: 1, label: "1x" }];
			if (highestAmount > 10) selectionOptions.push({ value: 10, label: "10x" });
			if (highestAmount > 100) selectionOptions.push({ value: 100, label: "100x" });
			if (highestAmount > 1000) selectionOptions.push({ value: 1000, label: "1000x" });
			HorizontalSelect.setOptions(this.multiplierSelect, selectionOptions);
		},

		updateLists: function () {
			var traderComponent = this.playerLocationNodes.head.entity.get(TraderComponent);
			var caravan = traderComponent.caravan;
			if (!caravan) return;

			var currencyComponent = GameGlobals.resourcesHelper.getCurrentCurrency();
			var campStorage = GameGlobals.resourcesHelper.getCurrentStorage();

			var traderOfferValue = caravan.traderSelectedCurrency;
			var campOfferValue = caravan.campSelectedCurrency;

			var visibleLisTraderInventory = 0;
			var visibleLisTraderOffer = 0;
			var visibleLisCampInventory = 0;
			var visibleLisCampOffer = 0;

			// trader items
			for (let longItemID in this.traderTotalItems) {
				let itemID = ItemConstants.getItemIDFromLongID(longItemID);
				let quality = ItemConstants.getItemQualityFromLongID(longItemID);
				let items = this.traderTotalItems[longItemID];
				if (!items || items.length <= 0) continue;
				let item = items[0];
				let selectedAmount = caravan.traderSelectedItems.filter(i => i.id == itemID && ItemConstants.getItemQuality(i) == quality).length;
				let inventoryAmount = this.traderTotalItems[longItemID].length - selectedAmount;
				UIConstants.updateItemSlot(this.traderInventoryLis[longItemID], inventoryAmount);
				UIConstants.updateItemSlot(this.traderOfferLis[longItemID], selectedAmount);
				traderOfferValue += selectedAmount * TradeConstants.getItemValue(item, true, false);
				visibleLisTraderInventory += inventoryAmount > 0 ? 1 : 0;
				visibleLisTraderOffer += selectedAmount > 0 ? 1 : 0;
			}

			// camp items
			for (let longItemID in this.campTotalItems) {
				let itemID = ItemConstants.getItemIDFromLongID(longItemID);
				let quality = ItemConstants.getItemQualityFromLongID(longItemID);
				let items = this.campTotalItems[longItemID];
				if (!items || items.length <= 0) continue;
				let item = items[0];
				let selectedAmount = caravan.campSelectedItems.filter(i => i.id == itemID && ItemConstants.getItemQuality(i) == quality).length;
				let inventoryAmount = this.campTotalItems[longItemID].length - selectedAmount;
				UIConstants.updateItemSlot(this.campInventoryLis[longItemID], inventoryAmount);
				UIConstants.updateItemSlot(this.campOfferLis[longItemID], selectedAmount);
				campOfferValue += selectedAmount * TradeConstants.getItemValue(item, false, true);
				visibleLisCampInventory += inventoryAmount > 0 ? 1 : 0;
				visibleLisCampOffer += selectedAmount > 0 ? 1 : 0;
			}

			// trader and camp resources
			for (let key in resourceNames) {
				var name = resourceNames[key];
				var traderOfferAmount = caravan.traderSelectedResources.getResource(name);
				var traderInventoryAmount = caravan.sellResources.getResource(name) - traderOfferAmount;
				UIConstants.updateResourceLi(this.traderOfferLis[key], traderOfferAmount);
				UIConstants.updateResourceLi(this.traderInventoryLis[key], traderInventoryAmount);
				traderOfferValue += traderOfferAmount * TradeConstants.getResourceValue(name, true);
				visibleLisTraderInventory += traderInventoryAmount > 0 ? 1 : 0;
				visibleLisTraderOffer += traderOfferAmount > 0 ? 1 : 0;

				if (caravan.buyResources.indexOf(name) >= 0) {
					var campOfferAmount = caravan.campSelectedResources.getResource(name);
					var campInventoryAmount = campStorage.resources.getResource(name) - campOfferAmount;
					UIConstants.updateResourceLi(this.campOfferLis[key], campOfferAmount);
					UIConstants.updateResourceLi(this.campInventoryLis[key], campInventoryAmount);
					campOfferValue += campOfferAmount * TradeConstants.getResourceValue(name);
					visibleLisCampInventory += campInventoryAmount > 0 ? 1 : 0;
					visibleLisCampOffer += campOfferAmount > 0 ? 1 : 0;
				}
			}

			// trader and camp currency
			if (caravan.usesCurrency > 0) {
				var traderOfferAmount = caravan.traderSelectedCurrency;
				var traderInventoryAmount = caravan.currency - traderOfferAmount;
				var campOfferAmount = caravan.campSelectedCurrency;
				var campInventoryAmount = currencyComponent.currency - campOfferAmount;
				UIConstants.updateCurrencyLi(this.traderOfferLis["currency"], traderOfferAmount);
				UIConstants.updateCurrencyLi(this.traderInventoryLis["currency"], traderInventoryAmount);
				UIConstants.updateCurrencyLi(this.campOfferLis["currency"], campOfferAmount);
				UIConstants.updateCurrencyLi(this.campInventoryLis["currency"], campInventoryAmount);
				visibleLisTraderInventory += traderInventoryAmount > 0 ? 1 : 0;
				visibleLisTraderOffer += traderOfferAmount > 0 ? 1 : 0;
				visibleLisCampInventory += campInventoryAmount > 0 ? 1 : 0;
				visibleLisCampOffer += campOfferAmount > 0 ? 1 : 0;
			}

			// selection value
			traderOfferValue = Math.round(traderOfferValue * 100) / 100;
			campOfferValue = Math.round(campOfferValue * 100) / 100;
			caravan.traderOfferValue = traderOfferValue;
			caravan.campOfferValue = campOfferValue;
			$("#inventorylist-incoming-caravan-trader-offer .value").text("Value: " + traderOfferValue);
			$("#inventorylist-incoming-caravan-camp-offer .value").text("Value: " + campOfferValue);

			GameGlobals.uiFunctions.toggle("#inventorylist-incoming-caravan-trader-inventory .msg-empty", visibleLisTraderInventory === 0);
			GameGlobals.uiFunctions.toggle("#inventorylist-incoming-caravan-trader-offer .msg-empty", visibleLisTraderOffer === 0);
			GameGlobals.uiFunctions.toggle("#inventorylist-incoming-caravan-camp-inventory .msg-empty", visibleLisCampInventory === 0);
			GameGlobals.uiFunctions.toggle("#inventorylist-incoming-caravan-camp-offer .msg-empty", visibleLisCampOffer === 0);
			
			$("#incoming-caravan-popup-reset").toggleClass("btn-disabled", traderOfferValue == 0 && campOfferValue == 0);
			$("#incoming-caravan-popup-reset").attr("disabled", traderOfferValue == 0 && campOfferValue == 0);
		},

		clearSelection: function () {
			var traderComponent = this.playerLocationNodes.head.entity.get(TraderComponent);
			var caravan = traderComponent.caravan;
			caravan.clearSelection();
		}

	});

	return UIOutPopupTradeSystem;
});
