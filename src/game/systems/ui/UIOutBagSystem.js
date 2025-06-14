define([
	'ash',
	'text/Text',
	'utils/UIState',
	'utils/UIList',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/UIConstants',
	'game/constants/ItemConstants',
	'game/constants/PlayerActionConstants',
	'game/nodes/player/ItemsNode',
	'game/components/common/PositionComponent',
], function (Ash, Text, UIState, UIList, GameGlobals, GlobalSignals, UIConstants, ItemConstants, PlayerActionConstants, ItemsNode, PositionComponent) {

	var UIOutBagSystem = Ash.System.extend({

		itemNodes: null,

		craftableItemDefinitions: null,

		constructor: function () {
			this.elements = {};
			this.elements.tabHeader = $("#tab-header h2");

			var sys = this;
			$("#checkbox-crafting-show-obsolete").change(function () {
				sys.onObsoleteToggled();
			});
			
			this.initElements();

			return this;
		},

		addToEngine: function (engine) {
			this.itemNodes = engine.getNodeList(ItemsNode);
			GlobalSignals.add(this, GlobalSignals.slowUpdateSignal, this.slowUpdate);
			GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.onTabChanged);
			GlobalSignals.add(this, GlobalSignals.inventoryChangedSignal, this.onInventoryChanged);
			GlobalSignals.add(this, GlobalSignals.equipmentChangedSignal, this.onEquipmentChanged);
			GlobalSignals.add(this, GlobalSignals.gameShownSignal, this.refresh);
			GlobalSignals.add(this, GlobalSignals.clearBubblesSignal, this.clearBubble);
		},
		
		removeFromEngine: function (engine) {
			this.itemNodes = null;
			GlobalSignals.removeAll(this);
		},
		
		initElements: function () {
			this.initItemSlots();
			this.initCraftingButtons();
			this.initUseItemButtons();
			this.initRepairItemButtons();
			
			$("#btn-self-manage-inventory").click($.proxy(this.showInventoryManageemntPopup, this));
			$("#btn-bag-autoequip").click($.proxy(this.autoEquip, this));
		},
				
		initItemSlots: function () {
			var sys = this;
			$.each($("#container-equipment-slots .item-slot"), function () {
				let $slot = $(this);
				var rawType = $slot.attr("id").split("-")[2];
				var itemTypeName = ItemConstants.itemTypes[rawType];
				var typeDisplay = ItemConstants.getItemTypeDisplayName(itemTypeName, true);
				$(this).append("<span class='item-slot-type-empty'>" + typeDisplay + "</span>");
				$(this).append("<span class='item-slot-type-equipped vision-text'>" + typeDisplay + "</span>");
				$(this).append("<span class='item-slot-name '></span>");
				$(this).append("<div class='item-slot-image'></div>");
				$(this).hover(function () {
					sys.refreshButtonsInCallout($slot);
					sys.highlightItemType(itemTypeName);
				}, function () {
					sys.highlightItemType(null);
				});
			});
		},

		initCraftingButtons: function () {
			var itemDefinitions = this.getCraftableItemDefinitionsByType();
			let div = "<div class='collapsible-container-group'>";

            for (let type in itemDefinitions) {
				let itemList = itemDefinitions[type];
				if (itemList.length === 0) continue;

				itemList = itemList.sort(UIConstants.sortItemsByRelevance);

				let tbl = "<table id='self-craft-" + type + "' class='fullwidth'>";
				for (let i in itemList) {
					let itemDefinition = itemList[i];
					let trID = this.getItemCraftTRID(itemDefinition);
					tbl += "<tr id='" + trID + "'><td class='list-main'> " + this.makeCraftingButton(itemDefinition) + " </td></tr>";
				}
				tbl += "</table>";
				let itemTypeName = ItemConstants.getItemTypeDisplayName(ItemConstants.itemTypes[type], true);
				let header = "<p class='collapsible-header'>" + itemTypeName + "<span class='header-count'>0</span></p>"
				let content = "<div class='collapsible-content'>" + tbl + "</div>"
				let containerID = this.getItemCraftContainerID(type);
				let container = "<div class='collapsible-container' id='" + containerID + "'>" + header + content + "</div>";
				div = div + container;
			}

			div = div + "</div>";
			$("#self-craft").append(div);
		},

		makeCraftingButton: function(itemDefinition) {
			var actionName = "craft_" + itemDefinition.id;
			let itemName = ItemConstants.getItemDisplayName(itemDefinition);
			return "<button class='action tabbutton multiline' action='" + actionName + "' data-tab='switch-bag'>" + itemName + "</button>";
		},
		
		initUseItemButtons: function () {
			let container = $("#self-use-items ul");
			let fnCreateItem = function () {
				var li = {};
				li.$root = $("<li><button class='action multiline' action=''></button></li>");
				return li;
			};
			let fnUpdateItem = function (li, data) {
				let item = data.items[0];
				let actionName = "use_item_" + item.id;
				let buttonLabel = ItemConstants.getUseItemActionDisplaName(item);

				if (data.items.length > 1) {
					buttonLabel = ItemConstants.getUseItemActionDisplayNameByBaseID(data.items);
					buttonLabel += " (" + (data.items.length) + ")";
				}

				li.$root.find("button.action").attr("action", actionName);
				li.$root.find("button.action").html(buttonLabel);
			};
			let fnIsDataSame = function (a, b) {
				return a.baseID == b.baseID;
			};
			this.useItemButtonList = UIList.create(this, container, fnCreateItem, fnUpdateItem, fnIsDataSame);
		},
		
		initRepairItemButtons: function () {
			let container = $("#self-repair-items table");
			let fnCreateItem = function () {
				var li = {};
				li.$root = $("<tr><td><button class='action multiline' action=''></button></td></tr>");
				return li;
			};
			let fnUpdateItem = function (li, data) {
				let actionName = "repair_item_" + data.itemID;
				let actionVerb = "Repair";
				let buttonLabel = actionVerb + " " + ItemConstants.getItemDisplayName(data, false);
				let $btn = li.$root.find("button.action");
				$btn.attr("action", actionName);
				$btn.html(buttonLabel);
			};
			let fnIsDataSame = function (a, b) {
				return a.itemID == b.itemID;
			};
			this.repairItemButtonList = UIList.create(this, container, fnCreateItem, fnUpdateItem, fnIsDataSame);
		},

		update: function (time) {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			let isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.bag;
			
			if (!isActive) {
				this.craftableItemDefinitions = null;
				this.craftableItemDefinitionsList = null;
				return;
			}

			this.bubbleCleared = false;
		},

		slowUpdate: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			let isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.bag;
			this.updateCrafting();
			this.updateSeenItems(isActive);
			this.updateBubble();
		},

		refresh: function () {
			this.elements.tabHeader.text(Text.t("ui.main.tab_bag_header"));

			let itemDefinitions = this.getCraftableItemDefinitionsByType();

			// close all but first
			let firstFound = false;
			for (let type in itemDefinitions) {
				let itemList = itemDefinitions[type];
				var containerID = this.getItemCraftContainerID(type);
				var numVisible = 0;
				for (let i in itemList) {
					let itemDefinition = itemList[i];
					var isVisible = this.isCraftableItemVisible(itemDefinition);
					if (isVisible) numVisible++;
				}
				GameGlobals.uiFunctions.toggleCollapsibleContainer("#" + containerID + " .collapsible-header", !firstFound && numVisible > 0);
				if (numVisible > 0) firstFound = true;
			}
			
			this.updateAutoEquip();
			this.updateItems();
			this.updateBagActions();
			this.updateUseItems();
			this.updateRepairItems();
			this.updateCrafting();
			this.updateSeenItems(true);
		},

		updateBubble: function () {
			let isStatIncreaseAvailable = this.isStatIncreaseAvailable();
			
			let numCraftableUnlockedUnseen = this.getMatchingUnseenItemCount(this.getCraftableItemDefinitionsList(), this.isCraftableUnlocked, GameGlobals.gameState.uiBagStatus.itemsCraftableUnlockedSeen);
			let numCraftableAvailableUnseen = this.getMatchingUnseenItemCount(this.getCraftableItemDefinitionsList(), this.isCraftableAvailable, GameGlobals.gameState.uiBagStatus.itemsCraftableAvailableSeen);
			let numImmedatelyUsableUnseen = this.getMatchingUnseenItemCount(this.getCarriedItems(), this.isCurrentlyUseable, GameGlobals.gameState.uiBagStatus.itemsUsableSeen);
			
			let bubbleNumber = Math.max(0, numCraftableUnlockedUnseen + numCraftableAvailableUnseen + numImmedatelyUsableUnseen);

			if (this.itemNodes.head.items.getEquipped().length > 0) {
				GameGlobals.gameState.markSeenTab(GameGlobals.uiFunctions.elementIDs.tabs.bag);
			}
			
			if (!GameGlobals.gameState.hasSeenTab(GameGlobals.uiFunctions.elementIDs.tabs.bag)) bubbleNumber = "!";

			let state = bubbleNumber + (isStatIncreaseAvailable ? 1000 : 0);
			UIState.refreshState(this, "bubble-num", state, function () {
				if (isStatIncreaseAvailable) {
					$("#switch-bag .bubble").text("");
					$("#switch-bag .bubble").toggleClass("bubble-increase", true);
				} else {
					$("#switch-bag .bubble").text(bubbleNumber);
					$("#switch-bag .bubble").toggleClass("bubble-increase", false);
				}
				GameGlobals.uiFunctions.toggle("#switch-bag .bubble", bubbleNumber !== 0 || isStatIncreaseAvailable);
			});
		},
		
		updateBagActions: function () {
			let inCamp = this.itemNodes.head.entity.get(PositionComponent).inCamp;
			let hasUnlockedCamp = GameGlobals.gameState.isFeatureUnlocked("camp");
			
			GameGlobals.uiFunctions.toggle("#self-bag-actions", !inCamp && hasUnlockedCamp);
		},

		updateItems: function () {
			this.updateItemSlots();
			this.updateItemList();
			this.updateItemComparisonIndicators();
		},

		updateCrafting: function () {
			this.isShowObsoleteChecked = $("#checkbox-crafting-show-obsolete").is(':checked');
			
			var isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.bag;
			var showObsolete = this.showObsolete();

			this.craftableItems = 0;
			this.numCraftableUnlockedUnseen = 0;

			var itemDefinitions = this.getCraftableItemDefinitionsByType();
			var countObsolete = 0;

			var tr;
			var itemList;
			var itemDefinition;
			for (let type in itemDefinitions) {
				itemList = itemDefinitions[type];
				var containerID = this.getItemCraftContainerID(type);
				var numVisible = 0;
				for (let i in itemList) {
					itemDefinition = itemList[i];
					var actionName = "craft_" + itemDefinition.id;
					var hasCosts = Object.keys(GameGlobals.playerActionsHelper.getCosts(actionName)).length > 0;

					if (isActive && !hasCosts) {
						log.w("Craftable item has no costs: " + itemDefinition.id);
					}

					var trID = this.getItemCraftTRID(itemDefinition);
					var tr = $("#" + trID);
					var isUnlocked = this.isItemUnlocked(itemDefinition);
					var isObsolete = this.isObsolete(itemDefinition);
					var isVisible = isUnlocked && (!isObsolete || showObsolete);

					if (isUnlocked && isObsolete) countObsolete++;

					if (isActive) {
						GameGlobals.uiFunctions.toggle(tr, isVisible);
						if (isVisible) numVisible++;
					}
				}

				if (isActive) {
					GameGlobals.uiFunctions.toggle($("#" + containerID), numVisible > 0);
					$("#" + containerID + " .header-count").text(" (" + numVisible + ")");
				}
			}

			if (isActive) {
				this.isShowObsoleteHidden = countObsolete <= 0;
				GameGlobals.uiFunctions.toggle("#checkbox-crafting-show-obsolete", countObsolete > 0);
				GameGlobals.uiFunctions.toggle("#label-crafting-show-obsolete", countObsolete > 0);
			}
		},

		updateUseItems: function () {
			let items = this.getAvailableItems();

			items = items.sort(UIConstants.sortItemsByType);
			items = items.filter(item => this.isUsable(item));

			let itemsByBaseID = {};

			for (let i = 0; i < items.length; i++) {
				let item = items[i];
				let itemBaseID = ItemConstants.getBaseItemID(item.id);
				if (!itemsByBaseID[itemBaseID]) itemsByBaseID[itemBaseID] = { baseID: itemBaseID, items: [] };
				itemsByBaseID[itemBaseID].items.push(item);
			}

			let numNewItems = UIList.update(this.useItemButtonList, Object.values(itemsByBaseID)).length;
			
			GameGlobals.uiFunctions.toggle("#header-self-use-items", items.length > 0);

			if (numNewItems > 0) {
				GameGlobals.uiFunctions.createButtons("#self-use-items");
				GlobalSignals.elementCreatedSignal.dispatch();
			}
		},

		updateRepairItems: function () {
			let items = this.getCarriedItems();

			items = items.sort(UIConstants.sortItemsByType);
			items = items.filter(item => this.isRepairable(item));

			let numNewItems = UIList.update(this.repairItemButtonList, items).length;
			
			GameGlobals.uiFunctions.toggle("#header-self-repair-items", items.length > 0);

			if (numNewItems > 0) {
				GameGlobals.uiFunctions.createButtons("#self-repair-items");
				GlobalSignals.elementCreatedSignal.dispatch();
			}
		},

		updateSeenItems: function (isActive) {
			if (!(isActive || this.bubbleCleared)) return;
			
			let carriedItems = this.getCarriedItems();
			for (let i = 0; i < carriedItems.length; i++) {
				this.updateSeenItem(isActive, carriedItems[i]);
			}
			
			let craftableItems = this.getCraftableItemDefinitionsList();
			for (let i = 0; i < craftableItems.length; i++) {
				this.updateSeenItemDefinition(isActive, craftableItems[i]);
			}
		},

		updateSeenItem: function (isActive, item) {
			if (!(isActive || this.bubbleCleared)) return;
			
			if (this.isHiddenItem(item)) {
				if (!GameGlobals.gameState.uiBagStatus.itemsOwnedSeen) GameGlobals.gameState.uiBagStatus.itemsOwnedSeen = [];
				if (GameGlobals.gameState.uiBagStatus.itemsOwnedSeen.indexOf(item.id) < 0) {
					GameGlobals.gameState.uiBagStatus.itemsOwnedSeen.push(item.id);
				}
			}
			
			if (this.isCurrentlyUseable(item)) {
				if (!GameGlobals.gameState.uiBagStatus.itemsUsableSeen) GameGlobals.gameState.uiBagStatus.itemsUsableSeen = [];
				if (GameGlobals.gameState.uiBagStatus.itemsUsableSeen.indexOf(item.id) < 0) {
					GameGlobals.gameState.uiBagStatus.itemsUsableSeen.push(item.id);
				}
			}
		},
		
		isHiddenItem: function (item) {
			return item.type == ItemConstants.itemTypes.uniqueEquipment;
		},
		
		updateSeenItemDefinition: function (isActive, itemDefinition) {
			if (this.isCraftableUnlocked(itemDefinition)) {
				if (GameGlobals.gameState.uiBagStatus.itemsCraftableUnlockedSeen.indexOf(itemDefinition.id) < 0) {
					GameGlobals.gameState.uiBagStatus.itemsCraftableUnlockedSeen.push(itemDefinition.id);
				}
			}
			
			if (this.isCraftableAvailable(itemDefinition)) {
				if (GameGlobals.gameState.uiBagStatus.itemsCraftableAvailableSeen.indexOf(itemDefinition.id) < 0) {
					GameGlobals.gameState.uiBagStatus.itemsCraftableAvailableSeen.push(itemDefinition.id);
				}
			}
		},
		
		pruneSeenItems: function () {
			let newList = [];
			if (GameGlobals.gameState.uiBagStatus.itemsUsableSeen) {
				for (let i = 0; i < GameGlobals.gameState.uiBagStatus.itemsUsableSeen.length; i++) {
					let id = GameGlobals.gameState.uiBagStatus.itemsUsableSeen[i];
					let itemDefinition = ItemConstants.getItemDefinitionByID(id);
					if (this.isOwned(itemDefinition)) {
						newList.push(id);
					}
				}
			}
			GameGlobals.gameState.uiBagStatus.itemsUsableSeen = newList;
		},

		updateItemComparisonIndicators: function () {
			let itemsComponent = this.itemNodes.head.items;
			$("#bag-items .item").each(function () {
				let $slot = $(this);
				let itemID = $slot.attr("data-itemid");
				let itemInstanceID = $slot.attr("data-iteminstanceid");

				let item = itemsComponent.getItem(itemID, itemInstanceID);
				if (!item) return;
				if (!item.equippable) return;
				var indicator = $slot.find(".item-comparison-indicator");
				
				let equippedItems = itemsComponent.getEquipped(item.type);
				let comparison = itemsComponent.getEquipmentComparison(item);
				let isEquipped = equippedItems.length > 0 && equippedItems[0].id == item.id && equippedItems[0].broken == item.broken;
				
				$(indicator).toggleClass("indicator-equipped", isEquipped);
				$(indicator).toggleClass("indicator-increase", !isEquipped && comparison > 0);
				$(indicator).toggleClass("indicator-even", !isEquipped && comparison == 0);
				$(indicator).toggleClass("indicator-decrease", !isEquipped && comparison < 0);
			});
		},

		updateItemList: function () {
			let itemsComponent = this.itemNodes.head.items;
			let inCamp = this.itemNodes.head.entity.get(PositionComponent).inCamp;

			let items = itemsComponent.getAll(inCamp);

			let getDisplayItemID = (itemVO) => itemVO.id + "_" + (itemVO.broken ? 1 : 0) + "_" + ItemConstants.getItemQuality(itemVO);

			let displayItems = [];
			let displayItemCounts = {}; // display id, count

			$("#bag-items").empty();

			for (let i = 0; i < items.length; i++) {
				let itemVO = items[i];
				if (itemVO.equipped) continue;
				let displayID = getDisplayItemID(itemVO);
				if (displayItemCounts[displayID]) {
					displayItemCounts[displayID]++;
				} else {
					displayItemCounts[displayID] = 1;
					displayItems.push(itemVO);
				}
			}

			displayItems.sort(UIConstants.sortItemsByType);

			for (let i = 0; i < displayItems.length; i++) {
				let itemVO = displayItems[i];
				let displayID = getDisplayItemID(itemVO);
				let count = displayItemCounts[displayID];

				let canDiscard = itemsComponent.isItemDiscardable(itemVO, inCamp);
				let canRepair = this.isRepairable(itemVO);
				let options = { canEquip: false, isEquipped: false, canUnequip: false, canDiscard: canDiscard, canUse: itemVO.useable, canRepair: canRepair };

				switch (itemVO.type) {
					case ItemConstants.itemTypes.uniqueEquipment:
						break;
					default:
						options.canEquip = itemVO.equippable;
						let smallSlot = UIConstants.getItemSlot(itemsComponent, itemVO, count, false, false, true, options, "switch-bag");
						$("#bag-items").append(smallSlot);
						break;
				}
			}
			
			var sys = this;
			$("#bag-items .item").each(function () {
				let $item = $(this);
				var id = $item.attr("data-itemid");
				var item = ItemConstants.getItemDefinitionByID(id);
				$item.hover(function () {
					sys.refreshButtonsInCallout($item.parents(".item-slot"));
					sys.highlightItemType(item.type);
				}, function () {
					sys.highlightItemType(null);
				});
			});

			GameGlobals.uiFunctions.toggle($("#bag-items-empty"), displayItems.length === 0);

			GameGlobals.uiFunctions.generateInfoCallouts("#bag-items");
			GameGlobals.uiFunctions.generateInfoCallouts("#container-equipment-slots");
			GameGlobals.uiFunctions.createButtons("#bag-items");
			GameGlobals.uiFunctions.createButtons("#container-equipment-slots");
		},

		updateItemSlots: function () {
			let itemsComponent = this.itemNodes.head.items;

			this.updateItemSlot(ItemConstants.itemTypes.light, itemsComponent.getEquipped(ItemConstants.itemTypes.light)[0] || null);
			this.updateItemSlot(ItemConstants.itemTypes.weapon, itemsComponent.getEquipped(ItemConstants.itemTypes.weapon)[0] || null);
			this.updateItemSlot(ItemConstants.itemTypes.clothing_over, itemsComponent.getEquipped(ItemConstants.itemTypes.clothing_over)[0] || null);
			this.updateItemSlot(ItemConstants.itemTypes.clothing_upper, itemsComponent.getEquipped(ItemConstants.itemTypes.clothing_upper)[0] || null);
			this.updateItemSlot(ItemConstants.itemTypes.clothing_lower, itemsComponent.getEquipped(ItemConstants.itemTypes.clothing_lower)[0] || null);
			this.updateItemSlot(ItemConstants.itemTypes.clothing_head, itemsComponent.getEquipped(ItemConstants.itemTypes.clothing_head)[0] || null);
			this.updateItemSlot(ItemConstants.itemTypes.clothing_hands, itemsComponent.getEquipped(ItemConstants.itemTypes.clothing_hands)[0] || null);
			this.updateItemSlot(ItemConstants.itemTypes.shoes, itemsComponent.getEquipped(ItemConstants.itemTypes.shoes)[0] || null);
			this.updateItemSlot(ItemConstants.itemTypes.bag, itemsComponent.getEquipped(ItemConstants.itemTypes.bag)[0] || null);
		},

		updateItemSlot: function (itemType, itemVO) {
			var itemsComponent = this.itemNodes.head.items;
			var slotID = "#item-slot-" + itemType.toLowerCase();
			var slot = $(slotID);
			switch (itemType) {
				case ItemConstants.itemTypes.clothing_over:
					slot = $("#item-slot-clothing_over");
					break;
				case ItemConstants.itemTypes.clothing_upper:
					slot = $("#item-slot-clothing_upper");
					break;
				case ItemConstants.itemTypes.clothing_lower:
					slot = $("#item-slot-clothing_lower");
					break;
				case ItemConstants.itemTypes.clothing_head:
					slot = $("#item-slot-clothing_head");
					break;
				case ItemConstants.itemTypes.clothing_hands:
					slot = $("#item-slot-clothing_hands");
					break;
			}

			let canRepair = this.isRepairable(itemVO);
			let options = { canEquip: false, isEquipped: true, canUnequip: true, canUse: false, canRepair: canRepair };
			let itemName = ItemConstants.getItemDisplayName(itemVO);
			$(slot).children(".item-slot-image").html(itemVO ? UIConstants.getItemDiv(itemsComponent, itemVO, null, UIConstants.getItemCallout(itemVO, false, true, options, "switch-bag"), true) : "");
			$(slot).children(".item-slot-name").html(itemVO ? itemName.toLowerCase() : "");

			GameGlobals.uiFunctions.toggle($(slot).children(".item-slot-type-empty"), itemVO === null);
			GameGlobals.uiFunctions.toggle($(slot).children(".item-slot-type-equipped"), itemVO !== null);
			GameGlobals.uiFunctions.toggle($(slot).children(".item-slot-name"), itemVO !== null);
			$(slot).toggleClass("item-slot-equipped", itemVO !== null);
		},
		
		updateAutoEquip: function () {
			$("#select-bag-autoequip-type").empty();
			
			let bonusTypes = [
				ItemConstants.itemBonusTypes.res_cold,
				ItemConstants.itemBonusTypes.res_radiation,
				ItemConstants.itemBonusTypes.res_poison,
				ItemConstants.itemBonusTypes.res_water,
				ItemConstants.itemBonusTypes.fight_def,
			];
			
			let items = this.getCarriedItems();
			
			// cache available options
			let itemsBySlot = {}; // itemType => []
			for (let i = 0; i < items.length; i++) {
				let item = items[i];
				if (!item.equippable) continue;
				if (!itemsBySlot[item.type]) itemsBySlot[item.type] = [];
				itemsBySlot[item.type].push(item);
			}
			
			let hasBonus = function (itemBonusType) {
				for (let i = 0; i < items.length; i++) {
					if (!items[i].equippable) continue;
					if (ItemConstants.getCurrentBonus(items[i], itemBonusType) > 0) return true;
				}
				return false;
			}
			
			let hasAlternativesForBonus = function (itemBonusType) {
				for (let itemType in itemsBySlot) {
					if (itemsBySlot[itemType].length < 2) continue;
					for (let i = 0; i < itemsBySlot[itemType].length; i++) {
						if (ItemConstants.getCurrentBonus(itemsBySlot[itemType][i], itemBonusType)) {
							// has at least 2 items for slot and at least one of them has matching bonus
							return true;
						}
					}
				}
				return false;
			}
			
			let numShown = 0;
			
			for (let i = 0; i < bonusTypes.length; i++) {
				let bonusType = bonusTypes[i];
				if (!hasBonus(bonusType)) continue;
				if (!hasAlternativesForBonus(bonusType)) continue;
				
				let displayName = UIConstants.getItemBonusName(bonusType);
				$("#select-bag-autoequip-type").append("<option value='" + bonusType +  "'>" + displayName + "</option>");
				numShown++;
			}
			
			GameGlobals.uiFunctions.toggle($("#bag-autoequip-container"), numShown > 0);
		},
		
		highlightItemType: function (itemType) {
			$("#bag-items .item").each(function () {
				let id = $(this).attr("data-itemid");
				let item = ItemConstants.getItemDefinitionByID(id);
				if (itemType && item && item.equippable && item.type == itemType) {
					$(this).toggleClass("highlighted", true);
				} else {
					$(this).toggleClass("highlighted", false);
				}
			});
			$.each($("#container-equipment-slots .item-slot"), function () {
				var rawType = $(this).attr("id").split("-")[2];
				var slotType = ItemConstants.itemTypes[rawType];
				if (itemType && slotType == itemType) {
					$(this).toggleClass("highlighted", true);
				} else {
					$(this).toggleClass("highlighted", false);
				}
			});
		},

		refreshButtonsInCallout: function ($slot) {
			let $calloutContent = $slot.find(".info-callout-content");
			let $buttons = $calloutContent.find("button.action");
			$.each($buttons, function () {
				GameGlobals.buttonHelper.updateButtonDisabledState($(this));
			});
		},

		showInventoryManageemntPopup: function () {
			GlobalSignals.triggerSoundSignal.dispatch(UIConstants.soundTriggerIDs.buttonClicked);
			GameGlobals.playerActionFunctions.startInventoryManagement();
		},
		
		autoEquip: function () {
			let itemBonusType = $("#select-bag-autoequip-type").val();
			if (!itemBonusType) return;
			GlobalSignals.triggerSoundSignal.dispatch(UIConstants.soundTriggerIDs.buttonClicked);
			log.i("auto equip best " + itemBonusType);
			let inCamp = this.itemNodes.head.entity.get(PositionComponent).inCamp;
			this.itemNodes.head.items.autoEquipByBonusType(itemBonusType, inCamp);
			
			GlobalSignals.equipmentChangedSignal.dispatch();
		},

		onObsoleteToggled: function () {
			this.updateCrafting();
		},

		onTabChanged: function () {
			if (GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.bag) {
				this.refresh();
			}
		},

		onInventoryChanged: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			if (GameGlobals.gameState.uiStatus.currentTab !== GameGlobals.uiFunctions.elementIDs.tabs.bag) return;
			this.updateAutoEquip();
			this.updateItems();
			this.updateUseItems();
			this.updateRepairItems();
			this.updateCrafting();
			this.pruneSeenItems();
			this.updateBubble();
		},

		onEquipmentChanged: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			this.updateAutoEquip();
			this.updateItems();
			this.updateUseItems();
			this.updateRepairItems();
			this.highlightItemType(null);
			this.updateBubble();
		},

		showObsolete: function () {
			return this.isShowObsoleteChecked || this.isShowObsoleteHidden;
		},

		isItemUnlocked: function (itemDefinition) {
			let actionName = "craft_" + itemDefinition.id;
			let reqsCheck = GameGlobals.playerActionsHelper.checkRequirements(actionName, false);
			if (reqsCheck.value >= 1)
				return true;
			if (reqsCheck.reason.baseReason === PlayerActionConstants.DISABLED_REASON_IN_PROGRESS)
				return true;
			if (reqsCheck.reason.baseReason === PlayerActionConstants.DISABLED_REASON_BAG_FULL)
				return true;
			if (reqsCheck.reason.baseReason === PlayerActionConstants.DISABLED_REASON_LOCKED_RESOURCES) {
				let reqs = GameGlobals.playerActionsHelper.getReqs(actionName);
				return reqs.upgrades && Object.keys(reqs.upgrades).length > 0;
			}
			return false;
		},

		isObsolete: function (itemVO) {
			var itemsComponent = this.itemNodes.head.items;
			var inCamp = this.itemNodes.head.entity.get(PositionComponent).inCamp;
			return GameGlobals.itemsHelper.isObsolete(itemVO, itemsComponent, inCamp);
		},
		
		isCurrentlyUseable: function (item) {
			if (!item.useable) return false;
			
			let actionName = "use_item_" + item.id;
			let isAvailable = GameGlobals.playerActionsHelper.checkAvailability(actionName, false);
			
			switch (item.id) {
				case "glowstick_1":
					return false;
				case "first_aid_kit_1":
				case "first_aid_kit_2":
					let inCamp = this.itemNodes.head.entity.get(PositionComponent).inCamp;
					if (inCamp) return false;
					break;
			}
			
			return isAvailable;
		},
		
		isUsable: function (item) {
			if (!item.useable) return false;
			if (this.isCurrentlyUseable(item)) return true;
			
			let actionName = "use_item_" + item.id;
			let reqsCheck = GameGlobals.playerActionsHelper.checkRequirements(actionName, false);
			let costsCheck = GameGlobals.playerActionsHelper.checkCosts(actionName);
			// TODO use PlayerActionsHelper.isVisible
			let isVisibleDisabledReason = reqsCheck.reason == PlayerActionConstants.DISABLED_REASON_NOT_IN_CAMP || reqsCheck.reason.baseReason == PlayerActionConstants.DISABLED_REASON_BUSY;
			
			return costsCheck >= 1 && isVisibleDisabledReason;
		},
		
		isCraftableItemVisible : function (itemDefinition) {
			let isHiddenByObsoleteToggle = this.isObsolete(itemDefinition) && !this.showObsolete();
			return this.isItemUnlocked(itemDefinition) && !isHiddenByObsoleteToggle;
		},
		
		isCraftableUnlocked: function (itemDefinition) {
			if (!itemDefinition.craftable) return false;
			if (!this.isItemUnlocked(itemDefinition)) return false;
			if (!this.isCraftableItemVisible(itemDefinition)) return false;
			return true;
		},
		
		isCraftableAvailable: function (itemDefinition) {
			if (!itemDefinition.craftable) return false;
			if (!this.isItemUnlocked(itemDefinition)) return false;
			if (!this.isCraftableItemVisible(itemDefinition)) return false;
			if (this.isOwned(itemDefinition)) return false;
			let actionName = "craft_" + itemDefinition.id;
			if (!GameGlobals.playerActionsHelper.checkAvailability(actionName, false)) return false;
			
			return true;
		},
		
		isOwned: function (itemDefinition) {
			if (!itemDefinition) return false;
			let itemsComponent = this.itemNodes.head.items;
		    return itemsComponent.contains(itemDefinition.id);
		},
		
		isStatIncreaseAvailable: function () {
			let itemsComponent = this.itemNodes.head.items;
			let inCamp = this.itemNodes.head.entity.get(PositionComponent).inCamp;
			let items = itemsComponent.getUniqueByIDAndState(inCamp);
			for (let i = 0; i < items.length; i++) {
				var item = items[i];
				if (item.equipped) continue;
				if (!item.equippable) continue;
				let comparison = itemsComponent.getEquipmentComparison(item);
				if (comparison > 0) return true;
			}
			return false;
		},
		
		isRepairable: function (itemVO) {
			if (!itemVO) return false;
			if (!itemVO.repairable) return false;
			if (!itemVO.broken) return false;
			return true;
		},
		
		// this.getMatchingUnseenItemCount(this.getCraftableItemDefinitionsList, this.isCraftableUnlocked, GameGlobals.gameState.uiBagStatus.itemsCraftableUnlockedSeen);
		getMatchingUnseenItemCount: function (itemList, filter, seenItemIds) {
			let result = 0;
			for (let i = 0; i < itemList.length; i++) {
				let item = itemList[i];
				if (!filter.apply(this, [item])) continue;
				if (seenItemIds && seenItemIds.indexOf(item.id) >= 0) continue;
				result++;
			}
			return result;
		},
		
		getOwnedItems: function () {
			let itemsComponent = this.itemNodes.head.items;
			return itemsComponent.getAll(true);
		},

		getAvailableItems: function () {
			let inCamp = this.itemNodes.head.entity.get(PositionComponent).inCamp;
			let itemsComponent = this.itemNodes.head.items;
			return itemsComponent.getAll(inCamp);
		},
		
		getCarriedItems: function () {
			let itemsComponent = this.itemNodes.head.items;
			let inCamp = this.itemNodes.head.entity.get(PositionComponent).inCamp;
			return itemsComponent.getUniqueByIDAndState(inCamp);
		},
		
		getCraftableItemDefinitionsList: function () {
			if (!this.craftableItemDefinitionsList || this.craftableItemDefinitionsList.length < 1) {
				let itemDefinitions = this.getCraftableItemDefinitionsByType();
				let result = [];
				for (let type in itemDefinitions) {
					let itemList = itemDefinitions[type];
					for (let i in itemList) {
						result.push(itemList[i]);
					}
				}
				
				this.craftableItemDefinitionsList = result;
			}
			
			return this.craftableItemDefinitionsList;
		},
		
		getCraftableItemDefinitionsByType: function () {
			
			if (!this.craftableItemDefinitions) {
				let result = {};
				let types = ItemConstants.itemTypes;
				for (let type in types) {
					let itemList = ItemConstants.itemDefinitions[type];
					result[type] = []
					for (let i in itemList) {
						let itemDefinition = itemList[i];
						if (itemDefinition.craftable) {
							result[type].push(itemDefinition);
						}
					}
				}
				
				this.craftableItemDefinitions = result;
			}

			return this.craftableItemDefinitions;
		},

		getItemCraftTRID: function (itemDefinition) {
			return "tr-craft-item-" + itemDefinition.id;
		},

		getItemCraftContainerID: function (type) {
			return "container-craft-items-" + type;
		},

		clearBubble: function () {
			this.bubbleCleared = true;
		}

	});

	return UIOutBagSystem;
});
