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
			return this;
		},

		addToEngine: function (engine) {
			this.itemNodes = engine.getNodeList(ItemsNode);
			this.initButtonListeners();
			this.initItemSlots();
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

		initItemSlots: function () {
			$.each($("#container-equipment-slots .item-slot"), function () {
				var typeDisplay = $(this).attr("id").split("-")[2];
				$(this).append("<span class='item-slot-type'>" + typeDisplay + "</span>");
				$(this).append("<span class='item-slot-effect'></span>");
				$(this).append("<div class='item-slot-image'></div>");
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

			// Header
			$("#tab-header h2").text("Bag");

			this.updateItems(uniqueItems);
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
			var showObsolete = $("#checkbox-crafting-show-obsolete").is(':checked');
			if (requiresUpdate) $("#self-craft table").empty();
			
			this.craftableItems = 0;
			this.availableCraftableItems = 0;
			
			var itemsComponent = this.itemNodes.head.items;
			var itemDefinitionList = [];

			var itemList;
			var itemDefinition;
			for (var type in ItemConstants.itemDefinitions) {
				itemList = ItemConstants.itemDefinitions[type];
				for (var i in itemList) {
					itemDefinition = itemList[i];
					if (itemDefinition.craftable && (showObsolete || !itemsComponent.isItemObsolete(itemDefinition))) {
						itemDefinitionList.push(itemDefinition);
					}
				}
			}
			
			itemDefinitionList = itemDefinitionList.sort(this.sortItemsByType);
			
			var tr;
			for (var j = 0; j < itemDefinitionList.length; j++) {
				var itemDefinition = itemDefinitionList[j];
				var actionName = "craft_" + itemDefinition.id;
				var reqsCheck = this.playerActionsHelper.checkRequirements(actionName, false);
				if (reqsCheck.value >= 1 || reqsCheck.reason === "Bag full.") {
					var isAvailable = this.playerActionsHelper.checkAvailability(actionName, false);
					if (requiresUpdate) {
						tr = "<tr><td><button class='action' action='" + actionName + "'>" + itemDefinition.name + "</button></td></tr>";
						$("#self-craft table").append(tr);
					}
					
					this.craftableItems++;
					if (isAvailable && !itemsComponent.contains(itemDefinition.name) && itemsComponent.getCurrentBonus(itemDefinition.type) < itemDefinition.bonus)
						this.availableCraftableItems++;
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
			
			this.updateItemSlot(ItemConstants.itemTypes.light, null);
			this.updateItemSlot(ItemConstants.itemTypes.shades, null);
			this.updateItemSlot(ItemConstants.itemTypes.weapon, null);
			this.updateItemSlot(ItemConstants.itemTypes.clothing, null);
			this.updateItemSlot(ItemConstants.itemTypes.shoes, null);
			this.updateItemSlot(ItemConstants.itemTypes.bag, null);
			
			items = items.sort(this.sortItemsByType);

			$("#bag-items").empty();
			for (var i = 0; i < items.length; i++) {
				var item = items[i];
				var count = itemsComponent.getCount(item);
				var smallSlot = UIConstants.getItemSlot(item, count);
				switch (item.type) {
					case ItemConstants.itemTypes.light:
					case ItemConstants.itemTypes.shades:
					case ItemConstants.itemTypes.weapon:
					case ItemConstants.itemTypes.clothing:
					case ItemConstants.itemTypes.shoes:
					case ItemConstants.itemTypes.bag:
						if (item.equipped) {
							this.updateItemSlot(item.type, item);
							if (count > 1) {
								smallSlot = UIConstants.getItemSlot(item, count - 1);
								$("#bag-items").append(smallSlot);
							}
						} else {
							$("#bag-items").append(smallSlot);
						}
						break;
					
					case ItemConstants.itemTypes.follower:
					case ItemConstants.itemTypes.uniqueEquipment:
						break;
					
					default:
						$("#bag-items").append(smallSlot);
						break;
				}
			}
			
			var rowItemCount = Math.floor($("#bag-items").width() / 46);
			var rowsToShow = 1 + Math.ceil($("#bag-items li").length / rowItemCount);
			for (var j = items.length; j <= rowsToShow * rowItemCount; j++) {
				$("#bag-items").append(UIConstants.getItemSlot(null));
			}

            this.uiFunctions.generateCallouts("#container-tab-two-bag .three-quarters");
		},

		refreshItemLists: function () {
			var itemsComponent = this.itemNodes.head.items;
			$.each($("#bag-items li .item"), function () {
				var id = $(this).attr("data-itemid");
				var count = itemsComponent.getCountById(id);
				$(this).find(".item-count").text(count + "x");
			});
		},
		
		updateItemSlot: function (itemType, itemVO) {
			var slot = $("#item-slot-" + itemType.toLowerCase());
			$(slot).children(".item-slot-effect").html(itemVO ? UIConstants.getItemBonusName(itemVO) + "<br/>" + UIConstants.getItemBonusText(itemVO) : "");
			$(slot).children(".item-slot-image").html(itemVO ? UIConstants.getItemDiv(itemVO, 0, false, false) : "");
			
			$(slot).children(".item-slot-type").toggle(itemVO === null);
			$(slot).children(".item-slot-effect").toggle(itemVO !== null);
			$(slot).toggleClass("item-slot-equipped", itemVO !== null);
		},
		
		sortItemsByType: function (a, b) {
			var getItemSortVal = function (itemVO) {
				var typeVal = 0;
				switch (itemVO.type) {
					case ItemConstants.itemTypes.bag: typeVal = 1; break;
					case ItemConstants.itemTypes.light: typeVal = 2; break;
					case ItemConstants.itemTypes.shades: typeVal = 3; break;
					case ItemConstants.itemTypes.weapon: typeVal = 4; break;
					case ItemConstants.itemTypes.clothing: typeVal = 5; break;
					case ItemConstants.itemTypes.shoes: typeVal = 6; break;
					case ItemConstants.itemTypes.exploration: typeVal = 7; break;
					case ItemConstants.itemTypes.ingredient: typeVal = 8; break;
					case ItemConstants.itemTypes.uniqueEquipment: typeVal = 0; break;
					case ItemConstants.itemTypes.artefact: typeVal = 9; break;
					case ItemConstants.itemTypes.note: typeVal = 10; break;
					case ItemConstants.itemTypes.follower: typeVal = 0; break;
				}
				return typeVal * 1000 - itemVO.bonus;
			};
			var aVal = getItemSortVal(a);
			var bVal = getItemSortVal(b);
			return aVal - bVal;
		},
    
	});

    return UIOutBagSystem;
});
