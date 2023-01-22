define([
	'ash',
	'utils/UIState',
	'utils/UIList',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/UIConstants',
	'game/constants/ItemConstants',
	'game/constants/PlayerActionConstants',
	'game/nodes/player/ItemsNode',
	'game/components/common/PositionComponent',
], function (Ash, UIState, UIList, GameGlobals, GlobalSignals, UIConstants, ItemConstants, PlayerActionConstants, ItemsNode, PositionComponent) {

	var UIOutBagSystem = Ash.System.extend({

		itemNodes: null,

		craftableItemDefinitions: null,
		inventoryItemsBag: [],

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
		},
				
		initItemSlots: function () {
			var sys = this;
			$.each($("#container-equipment-slots .item-slot"), function () {
				var rawType = $(this).attr("id").split("-")[2];
				var itemTypeName = ItemConstants.itemTypes[rawType];
				var typeDisplay = ItemConstants.getItemTypeDisplayName(itemTypeName, true);
				$(this).append("<span class='item-slot-type-empty'>" + typeDisplay + "</span>");
				$(this).append("<span class='item-slot-type-equipped vision-text'>" + typeDisplay + "</span>");
				$(this).append("<span class='item-slot-name '></span>");
				$(this).append("<div class='item-slot-image'></div>");
				$(this).hover(function () {
					sys.highlightItemType(itemTypeName);
				}, function () {
					sys.highlightItemType(null);
				});
			});
		},

		initCraftingButtons: function () {
			var itemDefinitions = this.getCraftableItemDefinitionsByType();
			var itemList;
			var itemDefinition;
			var div = "<div class='collapsible-container-group'>";
            for (let type in itemDefinitions) {
				itemList = itemDefinitions[type];
				if (itemList.length === 0) continue;
				var tbl = "<table id='self-craft-" + type + "' class='fullwidth'>";
				for (let i in itemList) {
					itemDefinition = itemList[i];
					var trID = this.getItemCraftTRID(itemDefinition);
					tbl += "<tr id='" + trID + "'><td class='list-main'> " + this.makeCraftingButton(itemDefinition) + " </td></tr>";
				}
				tbl += "</table>";
				let itemTypeName = ItemConstants.getItemTypeDisplayName(ItemConstants.itemTypes[type], true);
				var header = "<p class='collapsible-header'>" + itemTypeName + "<span class='header-count'>0</span></p>"
				var content = "<div class='collapsible-content'>" + tbl + "</div>"
				var containerID = this.getItemCraftContainerID(type);
				var container = "<div class='collapsible-container' id='" + containerID + "'>" + header + content + "</div>";
				div = div + container;
			}
			div = div + "</div>";
			$("#self-craft").append(div);
		},

		makeCraftingButton: function(itemDefinition) {
			var actionName = "craft_" + itemDefinition.id;
			return "<button class='action tabbutton multiline' action='" + actionName + "' data-tab='switch-bag'>" + itemDefinition.name + "</button>";
		},
		
		initUseItemButtons: function () {
			let container = $("#self-use-items table");
			let fnCreateItem = function () {
				var li = {};
				li.$root = $("<tr><td><button class='action multiline' action=''></button></td></tr>");
				return li;
			};
			let fnUpdateItem = function (li, data) {
				let actionName = "use_item_" + data.id;
				let actionVerb = data.id.startsWith("cache_metal") ? "Disassemble" : "Use";
				let buttonLabel = actionVerb + " " + ItemConstants.getItemDisplayName(data, true);
				li.$root.find("button.action").attr("action", actionName);
				li.$root.find("button.action").html(buttonLabel);
			};
			let fnIsDataEqual = function (a, b) {
				return a.id == b.id;
			};
			this.useItemButtonList = UIList.create(container, fnCreateItem, fnUpdateItem, fnIsDataEqual);
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
			let fnIsDataEqual = function (a, b) {
				return a.itemID == b.itemID;
			};
			this.repairItemButtonList = UIList.create(container, fnCreateItem, fnUpdateItem, fnIsDataEqual);
		},

		update: function (time) {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			var isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.bag;
			
			this.updateSeenItems(isActive);

			if (!isActive) {
				this.craftableItemDefinitions = null;
				this.craftableItemDefinitionsList = null;
				return;
			}

			this.bubbleCleared = false;
		},

		slowUpdate: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			this.updateCrafting();
			this.updateBubble();
		},

		refresh: function () {
			this.elements.tabHeader.text("Bag");

			var showObsolete = this.showObsolete();
			var itemDefinitions = this.getCraftableItemDefinitionsByType();

			// close all but first
			var firstFound = false;
			for (let type in itemDefinitions) {
				let itemList = itemDefinitions[type];
				var containerID = this.getItemCraftContainerID(type);
				var numVisible = 0;
				for (let i in itemList) {
					let itemDefinition = itemList[i];
					var isUnlocked = this.isItemUnlocked(itemDefinition);
					var isObsolete = this.isObsolete(itemDefinition);
					var isVisible = this.isCraftableItemVisible(itemDefinition);
					if (isVisible) numVisible++;
				}
				GameGlobals.uiFunctions.toggleCollapsibleContainer("#" + containerID + " .collapsible-header", !firstFound && numVisible > 0);
				if (numVisible > 0) firstFound = true;
			}

			this.updateItems();
			this.updateUseItems();
			this.updateRepairItems();
			this.updateCrafting();
		},

		updateBubble: function () {
			let isStatIncreaseAvailable = this.isStatIncreaseAvailable();
			
			let numCraftableUnlockedUnseen = this.getMatchingUnseenItemCount(this.getCraftableItemDefinitionsList(), this.isCraftableUnlocked, GameGlobals.gameState.uiBagStatus.itemsCraftableUnlockedSeen);
			let numCraftableAvailableUnseen = this.getMatchingUnseenItemCount(this.getCraftableItemDefinitionsList(), this.isCraftableAvailable, GameGlobals.gameState.uiBagStatus.itemsCraftableAvailableSeen);
			let numImmedatelyUsableUnseen = this.getMatchingUnseenItemCount(this.getCarriedItems(), this.isCurrentlyUseable, GameGlobals.gameState.uiBagStatus.itemsUsableSeen);
			
			var bubbleNumber = Math.max(0, numCraftableUnlockedUnseen + numCraftableAvailableUnseen + numImmedatelyUsableUnseen);
			var state = bubbleNumber + (isStatIncreaseAvailable ? 1000 : 0);
			UIState.refreshState(this, "bubble-num", state, function () {
				if (isStatIncreaseAvailable) {
					$("#switch-bag .bubble").text("");
					$("#switch-bag .bubble").toggleClass("bubble-increase", true);
				} else {
					$("#switch-bag .bubble").text(bubbleNumber);
					$("#switch-bag .bubble").toggleClass("bubble-increase", false);
				}
				GameGlobals.uiFunctions.toggle("#switch-bag .bubble", bubbleNumber > 0 || isStatIncreaseAvailable);
			});
		},

		updateItems: function () {
			this.updateItemLists();
			this.updateItemComparisonIndicators();
		},

		updateCrafting: function () {
			this.isShowObsoleteChecked = $("#checkbox-crafting-show-obsolete").is(':checked');
			
			var isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.bag;
			var showObsolete = this.showObsolete();

			this.craftableItems = 0;
			this.numCraftableUnlockedUnseen = 0;

			var itemsComponent = this.itemNodes.head.items;
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
					var isAvailable = isUnlocked && GameGlobals.playerActionsHelper.checkAvailability(actionName, false);
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
			var items = this.getOwnedItems();

			items = items.sort(UIConstants.sortItemsByType);
			items = items.filter(item => this.isUsable(item));

			let numNewItems = UIList.update(this.useItemButtonList, items);
			
			GameGlobals.uiFunctions.toggle("#header-self-use-items", items.length > 0);

			if (numNewItems > 0) {
				GameGlobals.uiFunctions.registerActionButtonListeners("#self-use-items");
				GameGlobals.uiFunctions.generateButtonOverlays("#self-use-items");
				GameGlobals.uiFunctions.generateCallouts("#self-use-items");
				GlobalSignals.elementCreatedSignal.dispatch();
			}
		},

		updateRepairItems: function () {
			var items = this.getOwnedItems();

			items = items.sort(UIConstants.sortItemsByType);
			items = items.filter(item => this.isRepairable(item));

			let numNewItems = UIList.update(this.repairItemButtonList, items);
			
			GameGlobals.uiFunctions.toggle("#header-self-repair-items", items.length > 0);

			if (numNewItems > 0) {
				GameGlobals.uiFunctions.registerActionButtonListeners("#self-repair-items");
				GameGlobals.uiFunctions.generateButtonOverlays("#self-repair-items");
				GameGlobals.uiFunctions.generateCallouts("#self-repair-items");
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
					if (this.isOwned(id)) {
						newList.push(id);
					}
				}
			}
			GameGlobals.gameState.uiBagStatus.itemsUsableSeen = newList;
		},

		updateItemComparisonIndicators: function () {
			var itemsComponent = this.itemNodes.head.items;
			for (let i = 0; i < this.inventoryItemsBag.length; i++) {
				var item = this.inventoryItemsBag[i];
				if (!item.equippable) continue;
				var slot = $("#bag-items div[data-itemid='" + item.id + "']");
				var indicator = $(slot[0]).find(".item-comparison-indicator");
				
				let equippedItems = itemsComponent.getEquipped(item.type);
				let comparison = itemsComponent.getEquipmentComparison(item);
				let isEquipped = equippedItems.length > 0 && equippedItems[0].id == item.id && equippedItems[0].broken == item.broken;
				
				$(indicator).toggleClass("indicator-equipped", isEquipped);
				$(indicator).toggleClass("indicator-increase", !isEquipped && comparison > 0);
				$(indicator).toggleClass("indicator-even", !isEquipped && comparison == 0);
				$(indicator).toggleClass("indicator-decrease", !isEquipped && comparison < 0);
			}
		},

		updateItemLists: function () {
			var isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.bag;
			var itemsComponent = this.itemNodes.head.items;
			var inCamp = this.itemNodes.head.entity.get(PositionComponent).inCamp;
			var items = itemsComponent.getUnique(inCamp);

			this.updateItemSlot(ItemConstants.itemTypes.light, null);
			this.updateItemSlot(ItemConstants.itemTypes.weapon, null);
			this.updateItemSlot(ItemConstants.itemTypes.clothing_over, null);
			this.updateItemSlot(ItemConstants.itemTypes.clothing_upper, null);
			this.updateItemSlot(ItemConstants.itemTypes.clothing_lower, null);
			this.updateItemSlot(ItemConstants.itemTypes.clothing_head, null);
			this.updateItemSlot(ItemConstants.itemTypes.clothing_hands, null);
			this.updateItemSlot(ItemConstants.itemTypes.shoes, null);
			this.updateItemSlot(ItemConstants.itemTypes.bag, null);

			items.sort(UIConstants.sortItemsByType);
			this.inventoryItemsBag = [];

			$("#bag-items").empty();
			for (let i = 0; i < items.length; i++) {
				let item = items[i];
				// TODO less hacky fix for the fact that getUnique doesn't prefer equipped items (could return unequipped instance even when an equipped one exists)
				let equipped = itemsComponent.getEquipped(item.type);
				let isEquipped = equipped && equipped.length > 0 && equipped[0].id == item.id && equipped[0].broken == item.broken;
				let count = itemsComponent.getCount(item, inCamp);
				switch (item.type) {
					case ItemConstants.itemTypes.light:
					case ItemConstants.itemTypes.weapon:
					case ItemConstants.itemTypes.clothing_over:
					case ItemConstants.itemTypes.clothing_upper:
					case ItemConstants.itemTypes.clothing_lower:
					case ItemConstants.itemTypes.clothing_head:
					case ItemConstants.itemTypes.clothing_hands:
					case ItemConstants.itemTypes.shoes:
					case ItemConstants.itemTypes.bag:
						var showCount = count;
						var canEquip = !isEquipped;
						var canDiscard = itemsComponent.isItemDiscardable(item);
						if (isEquipped) {
							this.updateItemSlot(item.type, item);
							showCount = count - 1;
						}
						if (showCount > 0) {
							var options = { canEquip: canEquip, isEquipped: item.equipped, canUnequip: false, canDiscard: canDiscard };
							var smallSlot = UIConstants.getItemSlot(itemsComponent, item, showCount, false, false, true, options, "switch-bag");
							$("#bag-items").append(smallSlot);
							this.inventoryItemsBag.push(item);
						}
						break;

					case ItemConstants.itemTypes.uniqueEquipment:
						break;

					default:
						var smallSlot = UIConstants.getItemSlot(itemsComponent, item, count);
						$("#bag-items").append(smallSlot);
						this.inventoryItemsBag.push(item);
						break;
				}
			}
			
			var sys = this;
			$("#bag-items .item").each(function () {
				var id = $(this).attr("data-itemid");
				var item = ItemConstants.getItemByID(id);
				$(this).hover(function () {
					sys.highlightItemType(item.type);
				}, function () {
					sys.highlightItemType(null);
				});
			});

			GameGlobals.uiFunctions.toggle($("#bag-items-empty"), this.inventoryItemsBag.length === 0);

			GameGlobals.uiFunctions.generateCallouts("#container-tab-two-bag .three-quarters");
			GameGlobals.uiFunctions.generateButtonOverlays("#container-tab-two-bag .three-quarters");
			GameGlobals.uiFunctions.registerActionButtonListeners("#bag-items");
			GameGlobals.uiFunctions.registerActionButtonListeners("#container-equipment-slots");
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

			var options = { canEquip: false, isEquipped: true, canUnequip: true };
			$(slot).children(".item-slot-image").html(itemVO ? UIConstants.getItemDiv(itemsComponent, itemVO, null, UIConstants.getItemCallout(itemVO, false, true, options, "switch-bag"), true) : "");
			$(slot).children(".item-slot-name").html(itemVO ? itemVO.name.toLowerCase() : "");

			GameGlobals.uiFunctions.toggle($(slot).children(".item-slot-type-empty"), itemVO === null);
			GameGlobals.uiFunctions.toggle($(slot).children(".item-slot-type-equipped"), itemVO !== null);
			GameGlobals.uiFunctions.toggle($(slot).children(".item-slot-name"), itemVO !== null);
			$(slot).toggleClass("item-slot-equipped", itemVO !== null);
		},
		
		highlightItemType: function (itemType) {
			$("#bag-items .item").each(function () {
				var id = $(this).attr("data-itemid");
				var item = ItemConstants.getItemByID(id);
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
			this.updateItems();
			this.updateUseItems();
			this.updateRepairItems();
			this.updateCrafting();
			this.pruneSeenItems();
			this.updateBubble();
		},

		onEquipmentChanged: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
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
			if (reqsCheck.reason === PlayerActionConstants.DISABLED_REASON_BAG_FULL)
				return true;
			if (reqsCheck.reason === PlayerActionConstants.DISABLED_REASON_LOCKED_RESOURCES) {
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
				case "stamina_potion_1":
					let currentStamina = GameGlobals.playerHelper.getCurrentStamina();
					let staminaWarningLimit = GameGlobals.playerHelper.getCurrentStaminaWarningLimit();
					if (currentStamina > staminaWarningLimit) return false;
					break;
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
			let isVisibleDisabledReason = reqsCheck.reason == PlayerActionConstants.DISABLED_REASON_NOT_IN_CAMP || reqsCheck.baseReason == PlayerActionConstants.DISABLED_REASON_BUSY;
			
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
			var actionName = "craft_" + itemDefinition.id;
			if (!GameGlobals.playerActionsHelper.checkAvailability(actionName, false)) return false;
			
			return true;
		},
		
		isOwned: function (itemDefinition) {
			var itemsComponent = this.itemNodes.head.items;
		    return itemsComponent.contains(itemDefinition.name);
		},
		
		isStatIncreaseAvailable: function () {
			var itemsComponent = this.itemNodes.head.items;
			var inCamp = this.itemNodes.head.entity.get(PositionComponent).inCamp;
			var items = itemsComponent.getUnique(inCamp);
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
			var itemsComponent = this.itemNodes.head.items;
			return itemsComponent.getUnique(true);
		},
		
		getCarriedItems: function () {
			var itemsComponent = this.itemNodes.head.items;
			var inCamp = this.itemNodes.head.entity.get(PositionComponent).inCamp;
			return itemsComponent.getUnique(inCamp);
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
