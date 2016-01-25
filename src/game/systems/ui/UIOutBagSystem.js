define([
    'ash',
    'game/constants/UIConstants',
    'game/constants/ItemConstants',
    'game/nodes/player/ItemsNode',
    'game/components/common/ResourcesComponent',
    'game/components/player/StaminaComponent',
    'game/components/player/VisionComponent',
], function (Ash, UIConstants, ItemConstants, ItemsNode, ResourcesComponent, StaminaComponent, VisionComponent) {
    var UIOutBagSystem = Ash.System.extend({

		uiFunctions : null,
		playerActionsHelper: null,
		gameState: null,

		tabChangedSignal: null,

		itemNodes: null,
		
		bubbleNumber: 0,
		craftableItems: -1,
		lastShownCraftableItems: -1,
		uniqueItemsCount: -1,
		lastShownUniqueItemsCount: -1,

		constructor: function (uiFunctions, tabChangedSignal, playerActionsHelper, gameState) {
			this.gameState = gameState;
			this.uiFunctions = uiFunctions;
			this.playerActionsHelper = playerActionsHelper;
			this.tabChangedSignal = tabChangedSignal;

			var system = this;
			$("#container-tab-two-bag .golden-large").mouseleave(function (e) {
				system.setSelectedItemLI(null);
			});

			return this;
		},

		addToEngine: function (engine) {
			this.itemNodes = engine.getNodeList(ItemsNode);
			this.initButtonListeners();
			this.setSelectedItemLI(null);
		},

		initButtonListeners: function () {
			var itemsComponent = this.itemNodes.head.items;
			var uiFunctions = this.uiFunctions;
			var system = this;
			$("button[action='discard_item']").click(function (e) {
				var item = itemsComponent.selectedItem;
				var isDiscardable = itemsComponent.isItemDiscardable(item);
				if (!isDiscardable) {
					uiFunctions.showInfoPopup("Warning", "This item can't be discarded.");
					return;
				}
				var questionS = item.type === ItemConstants.itemTypes.follower ?
					"Are you sure you want to disband this follower?" : "Are you sure you want to discard this item?";
				uiFunctions.showConfirmation(
					questionS,
					function () {
						itemsComponent.discardItem(item);
						itemsComponent.selectedItem = null;
						system.updateItemLists();
					}
				);
			});
			$("button[action='discard_item_all']").click(function (e) {
				var item = itemsComponent.selectedItem;
				var isDiscardable = itemsComponent.isItemsDiscardable(item);
				var msg = isDiscardable ? "Are you sure you want to discard all of these items?" : "Are you sure you want to discard all but one of these items?";
				uiFunctions.showConfirmation(
					msg,
					function () {
						itemsComponent.discardItems(item);
						itemsComponent.selectedItem = null;
						system.updateItemLists();
					}
				);
			});
			$("button[action='equip_item']").click(function (e) {
				var item = itemsComponent.selectedItem;
				if (item.equipped) itemsComponent.unequip(item);
				else itemsComponent.equip(item);
				system.updateItemLists();
			});
		},

		removeFromEngine: function (engine) {
			this.itemNodes = null;
			this.tabChangedSignal.remove(this.onTabChanged);
			$("button[action='discard_item']").click(null);
		},

		update: function (time) {
			var isActive = this.uiFunctions.gameState.uiStatus.currentTab === this.uiFunctions.elementIDs.tabs.bag;
			var itemsComponent = this.itemNodes.head.items;
            var hasMap = itemsComponent.getCountById(ItemConstants.itemDefinitions.uniqueEquipment[0].id) > 0;
			var uniqueItems = itemsComponent.getUnique();
			
			this.uniqueItemsCount = uniqueItems.length;
			if (hasMap) this.uniqueItemsCount--;
			if (isActive || this.lastShownUniqueItemsCount < 0) this.lastShownUniqueItemsCount = this.uniqueItemsCount;
			
			this.updateCrafting(isActive);
			this.updateBubble();
			
			if (!isActive) return;

			var selectedItem = itemsComponent.selectedItem;

			// Header
			$("#tab-header h2").text("Bag");
			$("span#self-bag-capacity").text(itemsComponent.getCurrentBonus(ItemConstants.itemTypes.bag));

			// Items, parts and followers
			var itemsComponent = this.itemNodes.head.items;
			this.updateItems(uniqueItems);

			// Description
			$("#items-empty").toggle($("#bag-items li").length === 0);
			this.updateItemDetails(selectedItem, itemsComponent.getCount(selectedItem));
		},
        
        updateBubble: function () {
			var craftableNum = Math.max(0, this.craftableItems - this.lastShownCraftableItems);
			var availableCraftableNum = Math.max(0, this.availableCraftableItems - this.lastShownAvailableCraftableItems);
			var uniqueNum = Math.max(0, this.uniqueItemsCount - this.lastShownUniqueItemsCount);
            this.bubbleNumber = craftableNum + availableCraftableNum + uniqueNum;
            $("#switch-bag .bubble").text(this.bubbleNumber);
            $("#switch-bag .bubble").toggle(this.bubbleNumber > 0);
        },

		updateItems: function (uniqueItems) {
			if (uniqueItems.length !== this.lastUpdatedItemsLength) {
				this.lastUpdatedItemsLength = uniqueItems.length;
				this.updateItemLists();
			} else {
				this.refreshItemLists();
			}
		},

		updateCrafting: function (isActive) {
			var requiresUpdate = $("#self-craft table tr").length !== this.craftableItems;
			if (requiresUpdate) $("#self-craft table").empty();
			
			this.craftableItems = 0;
			this.availableCraftableItems = 0;
			
			var itemsComponent = this.itemNodes.head.items;

			var itemList;
			var itemDefinition;
			var tr;
			for (var type in ItemConstants.itemDefinitions) {
				itemList = ItemConstants.itemDefinitions[type];
				for (var i in itemList) {
					itemDefinition = itemList[i];
					if (itemDefinition.craftable) {
						var actionName = "craft_" + itemDefinition.id;
						if (this.playerActionsHelper.checkRequirements(actionName, false).value >= 1) {
							var isAvailable = this.playerActionsHelper.checkAvailability(actionName, false);
							if (requiresUpdate) {
								tr = "<tr><td><button class='action' action='" + actionName + "'>" + itemDefinition.name + "</button></td></tr>";
								$("#self-craft table").append(tr);
							}
							this.craftableItems++;
							if (isAvailable && !itemsComponent.contains(itemDefinition.name)) this.availableCraftableItems++;
						}
					}
				}
			}

			if (requiresUpdate) {
				this.uiFunctions.registerActionButtonListeners("#self-craft");
				this.uiFunctions.generateButtonOverlays("#self-craft");
				this.uiFunctions.generateCallouts("#self-craft");
			}
			
			if (isActive || this.lastShownCraftableItems < 0) this.lastShownCraftableItems = this.craftableItems;
			if (isActive || this.lastShownAvailableCraftableItems < 0) this.lastShownAvailableCraftableItems = this.availableCraftableItems;
		},

		updateItemLists: function () {
			var itemsComponent = this.itemNodes.head.items;
			var items = itemsComponent.getUnique();
			$("#bag-items").empty();
			$("#list-followers").empty();
			var UIOutBagSystem = this;
			for (var i = 0; i < items.length; i++) {
				var item = items[i];
				if (item.type === ItemConstants.itemTypes.bag) continue;
				
				var count = itemsComponent.getCount(item);
				var li = UIConstants.getItemLI(item, count, true);
				if (item.type !== ItemConstants.itemTypes.follower) {
					$("#bag-items").append(li);
				} else {
					$("#list-followers").append(li);
				}
			}

			var hasFollowers = $("#list-followers li").length > 0;
			var showFollowers = hasFollowers || this.gameState.unlockedFeatures.followers;
			$("#list-followers").toggle(hasFollowers);
			$("#header-followers").toggle(showFollowers);
			$("#followers-empty").toggle(showFollowers && !hasFollowers);

			$.each($("#container-tab-two-bag .itemlist li"), function () {
				$(this).hover(function (e) {
					UIOutBagSystem.setSelectedItemLI($(this));
				});
			});
		},

		refreshItemLists: function () {
			var itemsComponent = this.itemNodes.head.items;
			var items = itemsComponent.getUnique();
			$.each($("#container-tab-two-bag .itemlist li"), function () {
				var id = $(this).attr("data-itemid");
				var count = itemsComponent.getCountById(id);
				$(this).children(".item-count").text(count + "x");
			});
		},

		updateItemDetails: function (selectedItem, count) {
			if (selectedItem) {
				var itemsComponent = this.itemNodes.head.items;
				$("#item-desc-div h4").text(selectedItem.name);

				var itemBonusTxt = selectedItem.type;
				if (selectedItem.bonus !== 0) {
					var bonusName = "";
					switch (selectedItem.type) {
						case ItemConstants.itemTypes.light: bonusName = "max vision"; break;
						case ItemConstants.itemTypes.shades: bonusName = "max vision"; break;
						case ItemConstants.itemTypes.weapon: bonusName = "fight strength"; break;
						case ItemConstants.itemTypes.clothing: bonusName = "fight defence"; break;
						case ItemConstants.itemTypes.follower: bonusName = "follower strength"; break;
						case ItemConstants.itemTypes.shoes: bonusName = "movement cost"; break;
						case ItemConstants.itemTypes.bag: bonusName = "bag capacity"; break;
					}

					itemBonusTxt += " (" + bonusName + " " + UIConstants.getItemBonusText(selectedItem) + ")";
				}
				else {

					switch (selectedItem.id) {
					case "movement-bat":
						itemBonusTxt += " (all level passages and most sector obstacles)";
						break;
					}
				}

				$("#item-desc-div p#item-desc-bonus").text(itemBonusTxt);
				$("#item-desc-div p#item-desc-equipped").text(selectedItem.equippable ? (selectedItem.equipped ? "Equipped" : "Not equipped") : "");
				$("#item-desc-div p#item-desc-desc").text(selectedItem.description);

				var isFollower = selectedItem.type === ItemConstants.itemTypes.follower;
				var unequippable = itemsComponent.isItemDiscardable(selectedItem) || itemsComponent.isItemUnequippable(selectedItem);
				$("button[action='equip_item']").text(selectedItem.equipped ? "Unequip" : "Equip");
				$("button[action='equip_item']").toggle(!unequippable);
				
				var isDiscardable = itemsComponent.isItemDiscardable(selectedItem);
				var isAllDiscardable = itemsComponent.isItemsDiscardable(selectedItem);
				$("button[action='discard_item']").toggle(isDiscardable);
				$("button[action='discard_item']").text(isFollower ? "Part ways" : "Discard 1");
				$("button[action='discard_item_all']").text(isAllDiscardable ? "Discard all" : "Discard " + (count - 1));
				$("button[action='discard_item_all']").toggle(isAllDiscardable ? count > 1 : count > 2);
			}
		},

		setSelectedItemLI: function (li) {
			$.each($("#container-tab-two-bag .itemlist li"), function () {
				$(this).toggleClass("item-focused", false);
			});

			var itemsComponent = this.itemNodes.head.items;

			if (li) {
				$(li).toggleClass("item-focused", true);
				var id = $(li).attr("data-itemid");
				var instanceId = $(li).attr("data-iteminstanceid");
				var item = itemsComponent.getItem(id, instanceId);
				itemsComponent.selectedItem = item;
			} else {
				itemsComponent.selectedItem = null;
			}

			this.uiFunctions.slideToggleIf("#item-desc-div", "#item-desc-help", itemsComponent.selectedItem, 250, 150);
			$("#item-desc-help").toggle($("#item-desc-help").is(":visible") && $("#bag-items li").length > 0);
		},
    
	});

    return UIOutBagSystem;
});
