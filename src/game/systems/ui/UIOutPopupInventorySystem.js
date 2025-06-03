define([
	'ash',
	'text/Text',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/UIConstants',
	'game/constants/ItemConstants',
	'game/constants/BagConstants',
	'game/nodes/player/ItemsNode',
	'game/nodes/player/PlayerActionResultNode',
	'game/components/common/PositionComponent',
	'game/components/player/BagComponent'
], function (Ash, Text, GameGlobals, GlobalSignals, UIConstants, ItemConstants, BagConstants, ItemsNode, PlayerActionResultNode, PositionComponent, BagComponent) {
	var UIOutPopupInventorySystem = Ash.System.extend({

		playerActionResultNodes: null,

		INVENTORYBOX_FOUND_ID: "FOUND",
		INVENTORYBOX_KEPT_ID: "KEPT",

		constructor: function () {
			return this;
		},

		addToEngine: function (engine) {
			this.itemNodes = engine.getNodeList(ItemsNode);
			this.playerActionResultNodes = engine.getNodeList(PlayerActionResultNode);
			this.playerActionResultNodes.nodeAdded.add(this.onNodeAdded, this);

			GlobalSignals.add(this, GlobalSignals.popupShownSignal, this.onPopupShown);
		},

		removeFromEngine: function (engine) {
			this.playerActionResultNodes.nodeAdded.remove(this.onNodeAdded, this);
			this.playerActionResultNodes = null;
			this.itemNodes = null;

			GlobalSignals.removeAll(this);
		},

		onNodeAdded: function (node) {
			this.pendingListUpdate = true;
			this.pendingButtonsUpdate = true;
		},

		update: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			if (!this.playerActionResultNodes.head)
				return;
				
			if (!this.playerActionResultNodes.head.result.pendingResultVO) return;

			if (this.pendingButtonsUpdate) {
				this.updateButtons();
			}

			if (this.pendingListUpdate) {
				GameGlobals.uiFunctions.toggle($("#resultlist-positive"), $("#resultlist-positive li").length > 0);
				this.updateLists();
			}
		},

		updateButtons: function() {
			var resultNode = this.playerActionResultNodes.head;
			if (resultNode) {
				var rewards = resultNode.result.pendingResultVO;
				var hasPickedSomething = this.getHasSelectedSomething(rewards);
				var canPickSomething = rewards && (rewards.gainedResources.getTotal() > 0 || rewards.gainedItems.length > 0);
				$(".inventory-selection-ok .btn-label").text(hasPickedSomething ? "Take selected" : canPickSomething ? "Leave" : "Continue");
				$(".inventory-selection-ok").toggleClass("btn-secondary", !hasPickedSomething && canPickSomething);
				this.pendingButtonsUpdate = false;

				GlobalSignals.updateButtonsSignal.dispatch();
			}
		},

		updateLists: function () {
			$("#resultlist-inventorymanagement-found ul").empty();
			$("#resultlist-inventorymanagement-kept ul").empty();
			$("#resultlist-loststuff-lost ul").empty();

			let sys = this;

			let inCamp = this.playerActionResultNodes.head.entity.get(PositionComponent).inCamp;
			let resultNode = this.playerActionResultNodes.head;
			let rewards = resultNode.result.pendingResultVO;

			let playerAllItems = resultNode.items.getAll(inCamp);

			var findItemById = function (itemID, itemList, notInItemList, skipEquipped) {
				for (let i = 0; i < itemList.length; i++) {
					var item = itemList[i];
					if (skipEquipped && item.equipped) continue;
					if (item.id === itemID) {
						var foundInOtherList = false;
						if (notInItemList !== null) {
							for (let j = 0; j < notInItemList.length; j++) {
								if (item.itemID === notInItemList[j].itemID) {
									foundInOtherList = true;
									break;
								}
							}
						}
						if (!foundInOtherList) return item;
					}
				}
				return null;
			};

			var onLiClicked = function (e) {
				var divRes = $(this).find(".res");
				var divItem = $(this).find(".item");
				var resourceName = $(divRes).attr("data-resourcename");
				var itemId = $(divItem).attr("data-itemid");

				GlobalSignals.triggerSoundSignal.dispatch(UIConstants.soundTriggerIDs.buttonClicked);

				var isInKeptList = $(this).parents("#resultlist-inventorymanagement-kept").length > 0;

				if (resourceName) {
					if (isInKeptList) {
						rewards.discardedResources.addResource(resourceName, 1);
					} else {
						rewards.selectedResources.addResource(resourceName, 1);
					}
				} else if (itemId) {
					var isInRewards = findItemById(itemId, rewards.gainedItems, null) !== null;
					var isInSelected = findItemById(itemId, rewards.selectedItems, null) !== null;

					if (isInKeptList) {
						// player wants to discard an item; discard rewards first then own items
						if (isInSelected) {
							var itemToLeave = findItemById(itemId, rewards.selectedItems, null);
							log.i("leave: " + itemToLeave);
							rewards.selectedItems.splice(itemToLeave);
						} else {
							var itemToDiscard = findItemById(itemId, playerAllItems, rewards.discardedItems, true);
							if (!itemToDiscard) return;
							log.i("discard: " + itemToDiscard);
							rewards.discardedItems.push(itemToDiscard);
						}
					} else {
						// player wants to take an item; take own items first then rewards
						if (isInRewards) {
							var itemToTake = findItemById(itemId, rewards.gainedItems, rewards.selectedItems);
							log.i("take: " + itemToTake);
							rewards.selectedItems.push(itemToTake);
						} else {
							var itemToKeep = findItemById(itemId, rewards.discardedItems, null);
							log.i("keep: " + itemToKeep);
							rewards.discardedItems.splice(itemToKeep);
						}
					}
				}

				sys.updateLists();
				sys.pendingButtonsUpdate = true;
			};

			this.addItemsToLists(rewards, playerAllItems);
			this.addResourcesToLists(rewards, resultNode);

			let isFoundBoxEmpty = $("#resultlist-inventorymanagement-found ul li").length <= 0;
			GameGlobals.uiFunctions.toggle("#resultlist-inventorymanagement-found .msg-empty", isFoundBoxEmpty);
			$("#resultlist-inventorymanagement-found .msg-empty").text(this.getEmptyMessage(rewards, this.INVENTORYBOX_FOUND_ID));

			let isKeptBoxEmpty = $("#resultlist-inventorymanagement-kept ul li").length <= 0;
			GameGlobals.uiFunctions.toggle("#resultlist-inventorymanagement-kept .msg-empty", isKeptBoxEmpty);
			$("#resultlist-inventorymanagement-kept .msg-empty").text(this.getEmptyMessage(rewards, this.INVENTORYBOX_KEPT_ID));

			$("#resultlist-inventorymanagement-kept li").click(onLiClicked);
			$("#resultlist-inventorymanagement-found li").click(onLiClicked);

			GameGlobals.uiFunctions.generateInfoCallouts("#resultlist-inventorymanagement-kept");
			GameGlobals.uiFunctions.generateInfoCallouts("#resultlist-inventorymanagement-found");
			GameGlobals.uiFunctions.generateInfoCallouts("#resultlist-loststuff-lost");

			this.updateCapacity(rewards, resultNode, playerAllItems);
			
			GlobalSignals.updateButtonsSignal.dispatch();
			
			this.pendingListUpdate = false;
		},

		getEmptyMessage: function (resultVO, type) {
			let isFight = resultVO.action == "fight";
			let hasBag = this.itemNodes.head.items.getCurrentBonus(ItemConstants.itemBonusTypes.bag) > 0;
			let hasDrops = resultVO.gainedResources.getTotal() > 0 || resultVO.gainedItems.length > 0;

			if (type == this.INVENTORYBOX_FOUND_ID) {
				if (isFight) return Text.t("ui.inventory_management.found_box_empty_fight_message");
				if (!hasDrops) return Text.t("ui.inventory_management.found_box_empty_no_drops_message");
				return Text.t("ui.inventory_management.found_box_empty_default_message");
			} else {
				if (!hasBag) return Text.t("ui.inventory_management.kept_box_empty_no_bag_message");
				return Text.t("ui.inventory_management.kept_box_empty_default_message");
			}
		},

		updateCapacity: function (rewards, resultNode, playerAllItems) {
			var bagComponent = this.playerActionResultNodes.head.entity.get(BagComponent);
			BagConstants.updateCapacity(bagComponent, rewards, resultNode.resources, playerAllItems);

			var selectedCapacityPercent = bagComponent.selectedCapacity / bagComponent.totalCapacity * 100;
			$("#inventory-popup-bar").attr("data-progress-percent", selectedCapacityPercent);
			$("#inventory-popup-bar .progress-label").text((Math.ceil( bagComponent.selectedCapacity * 10) / 10) + " / " + bagComponent.totalCapacity);

			GameGlobals.uiFunctions.toggle(".inventory-selection-takeall", bagComponent.selectableCapacity > bagComponent.selectionStartCapacity);
		},

		addItemsToLists: function (rewards, playerAllItems) {
			var itemsComponent = this.itemNodes.head.items;
			
			if (!rewards) return;

			var lostItemCounts = {};
			var lostItemVOs = {};
			var foundItemCounts = {};
			var foundItemVOs = {};
			var keptItemCounts = {};
			var keptItemVOs = {};

			var item;
			var li;

			var countLostItem = function (item) {
				if (!lostItemCounts[item.id]) {
					lostItemCounts[item.id] = 0;
					lostItemVOs[item.id] = item;
				}
				lostItemCounts[item.id]++;
			};

			var countFoundItem = function (item) {
				if (!foundItemCounts[item.id]) {
					foundItemCounts[item.id] = 0;
					foundItemVOs[item.id] = item;
				}
				foundItemCounts[item.id]++;
			};

			var countKeptItem = function (item) {
				if (!keptItemCounts[item.id]) {
					keptItemCounts[item.id] = 0;
					keptItemVOs[item.id] = item;
				}
				keptItemCounts[item.id]++;
			};

			// lost items: one list
			for (let j = 0; j < rewards.lostItems.length; j++) {
				countLostItem(rewards.lostItems[j]);
			}

			// gained items: non-selected to found, selected to kept
			for ( let i = 0; i < rewards.gainedItems.length; i++ ) {
				item = rewards.gainedItems[i];
				li = UIConstants.getItemSlot(itemsComponent, item, 1);
				if (rewards.selectedItems.indexOf(item) < 0) {
					countFoundItem(item);
				} else {
					countKeptItem(item);
				}
			}

			// bag items: non-discarded to kept, discarded to found
			for (let k = 0; k < playerAllItems.length; k++ ) {
				item = playerAllItems[k];
				if (item.equipped) continue;
				if (item.type === ItemConstants.itemTypes.bag) continue;
				if (item.type === ItemConstants.itemTypes.uniqueEquipment) continue;
				if (rewards.lostItems && rewards.lostItems.indexOf(item) >= 0) continue;
				if (rewards.discardedItems.indexOf(item) < 0) {
					countKeptItem(item);
				} else {
					countFoundItem(item);
				}
			}

			for (var itemId in lostItemCounts ) {
				item = lostItemVOs[itemId];
				li = UIConstants.getItemSlot(itemsComponent, item, lostItemCounts[itemId], true);
				$("#resultlist-loststuff-lost ul").append(li);
			}

			for (var itemId in foundItemCounts) {
				item = foundItemVOs[itemId];
				li = UIConstants.getItemSlot(itemsComponent, item, foundItemCounts[itemId]);
				$("#resultlist-inventorymanagement-found ul").append(li);
			}

			for (var itemId in keptItemCounts ) {
				item = keptItemVOs[itemId];
				li = UIConstants.getItemSlot(itemsComponent, item, keptItemCounts[itemId]);
				$("#resultlist-inventorymanagement-kept ul").append(li);
			}
		},

		addResourcesToLists: function (rewards, resultNode) {
			if (!rewards) return;
			// bag resources: non-discarded to kept, discarded to found
			// gained resources: non-selected to found, selected to kept
			for (var key in resourceNames) {
				var name = resourceNames[key];
				var amountOriginal = resultNode.resources.resources.getResource(name);
				var amountGained = rewards.gainedResources.getResource(name);
				var amountDiscarded = rewards.discardedResources.getResource(name);
				var amountSelected = rewards.selectedResources.getResource(name);
				var amountLost = rewards.lostResources.getResource(name);
				var amountKept = amountOriginal - amountDiscarded - amountLost + amountSelected;
				var amountFound = amountGained + amountDiscarded - amountSelected;
				if (amountLost >= 1) {
					$("#resultlist-loststuff-lost ul").append(UIConstants.getResourceLi(name, amountLost, true));
				}
				if (amountKept >= 1) {
					$("#resultlist-inventorymanagement-kept ul").append(UIConstants.getResourceLi(name, amountKept));
				}
				if (amountFound >= 1) {
					$("#resultlist-inventorymanagement-found ul").append(UIConstants.getResourceLi(name, amountFound));
				}
			}
		},

		getHasSelectedSomething: function (resultVO) {
			if (!resultVO) return false;
			return resultVO.selectedItems.length > 0 || resultVO.selectedResources.getTotal() > 0 || resultVO.discardedItems.length > 0 || resultVO.discardedResources.getTotal() > 0;
		},

		onPopupShown: function () {
			this.pendingListUpdate = true;
		},

	});

	return UIOutPopupInventorySystem;
});
