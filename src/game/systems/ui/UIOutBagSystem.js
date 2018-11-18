define([
    'ash',
    'game/GameGlobals',
    'game/GlobalSignals',
    'game/constants/UIConstants',
    'game/constants/ItemConstants',
    'game/constants/PlayerActionConstants',
    'game/nodes/player/ItemsNode',
    'game/components/common/PositionComponent',
], function (Ash, GameGlobals, GlobalSignals, UIConstants, ItemConstants, PlayerActionConstants, ItemsNode, PositionComponent) {

    var UIOutBagSystem = Ash.System.extend({

		itemNodes: null,

        craftableItemDefinitions: {},
        inventoryItemsAll: [],
        inventoryItemsBag: [],

		bubbleNumber: -1,
        craftableItems: -1,
        lastShownCraftableItems: -1,
        numOwnedUnseen: 0,
		numCraftableUnlockedUnseen: -1,
		numCraftableAvailableUnseen: -1,

		constructor: function () {
            this.elements = {};
            this.elements.tabHeader = $("#tab-header h2");

            var sys = this;
            $("#checkbox-crafting-show-obsolete").change(function () {
                sys.onObsoleteToggled();
            });

			return this;
		},

		addToEngine: function (engine) {
			this.itemNodes = engine.getNodeList(ItemsNode);
			this.initItemSlots();
            this.initCraftingButtons();
            GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.onTabChanged);
            GlobalSignals.add(this, GlobalSignals.inventoryChangedSignal, this.onInventoryChanged);
            GlobalSignals.add(this, GlobalSignals.equipmentChangedSignal, this.onEquipmentChanged);
            GlobalSignals.add(this, GlobalSignals.gameShownSignal, this.refresh);
            GlobalSignals.add(this, GlobalSignals.clearBubblesSignal, this.clearBubble);
		},

		initItemSlots: function () {
			$.each($("#container-equipment-slots .item-slot"), function () {
				var rawType = $(this).attr("id").split("-")[2];
                var typeDisplay = ItemConstants.itemTypes[rawType].toLowerCase();
				$(this).append("<span class='item-slot-type-empty'>" + typeDisplay + "</span>");
				$(this).append("<span class='item-slot-type-equipped'>" + typeDisplay + "</span>");
				$(this).append("<span class='item-slot-name '></span>");
				$(this).append("<div class='item-slot-image'></div>");
			});
		},

        initCraftingButtons: function () {
			var itemDefinitions = this.getCraftableItemDefinitions();
            var itemList;
            var itemDefinition;
            var div = "<div class='collapsible-container-group'>";
            for (var type in itemDefinitions) {
                itemList = itemDefinitions[type];
                if (itemList.length === 0) continue;
                var tbl = "<table id='self-craft-" + type + "' class='fullwidth'>";
                for (var i in itemList) {
                    itemDefinition = itemList[i];
                    var trID = this.getItemCraftTRID(itemDefinition);
                    tbl += "<tr id='" + trID + "'><td class='list-main'> " + this.makeCraftingButton(itemDefinition) + " </td></tr>";
                }
                tbl += "</table>";
                var header = "<p class='collapsible-header'>" + ItemConstants.itemTypes[type] + "<span class='header-count'>0</span></p>"
                var content = "<div class='collapsible-content'>" + tbl + "</div>"
                var containerID = this.getItemCraftContainerID(type);
                var container = "<div class='collapsible-container' id='" + containerID + "'>" + header + content + "</div>";
                div = div + container;
            }
            div = div + "</div>";
            $("#self-craft").append(div);
            GameGlobals.uiFunctions.registerActionButtonListeners("#self-craft");
            GameGlobals.uiFunctions.registerCollapsibleContainerListeners("#self-craft");
            GameGlobals.uiFunctions.generateButtonOverlays("#self-craft");
            GameGlobals.uiFunctions.generateCallouts("#self-craft");
            GlobalSignals.elementCreatedSignal.dispatch();
        },

		removeFromEngine: function (engine) {
			this.itemNodes = null;
            GlobalSignals.removeAll(this);
		},

		update: function (time) {
            if (GameGlobals.gameState.uiStatus.isHidden) return;
			var isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.bag;

			this.updateCrafting(isActive);
			this.updateBubble();

			if (!isActive) {
                this.updateItemCounts(isActive);
                this.craftableItemDefinitions = {};
                return;
            }

            this.bubbleCleared = false;
		},

        refresh: function () {
			this.elements.tabHeader.text("Bag");

            var showObsolete = this.showObsolete();
			var itemDefinitions = this.getCraftableItemDefinitions();
            var itemList;
            var itemDefinition;

            // close all but first
            var firstFound = false;
            for (var type in itemDefinitions) {
                itemList = itemDefinitions[type];
                var containerID = this.getItemCraftContainerID(type);
                var numVisible = 0;
                for (var i in itemList) {
                    itemDefinition = itemList[i];
                    var isUnlocked = this.isItemUnlocked(itemDefinition);
                    var isObsolete = this.isObsolete(itemDefinition);
                    var isVisible = isUnlocked && (!isObsolete || showObsolete);
                    if (isVisible) numVisible++;
                }
                GameGlobals.uiFunctions.toggleCollapsibleContainer("#" + containerID + " .collapsible-header", !firstFound && numVisible > 0);
                if (numVisible > 0) firstFound = true;
            }

            this.updateItems();
            this.updateUseItems();
        },

        updateBubble: function () {
            var newBubbleNumber = Math.max(0, this.numOwnedUnseen + this.numCraftableUnlockedUnseen + this.numCraftableAvailableUnseen);
            if (this.bubbleNumber === newBubbleNumber)
                return;

            this.bubbleNumber = newBubbleNumber;
            $("#switch-bag .bubble").text(this.bubbleNumber);
            GameGlobals.uiFunctions.toggle("#switch-bag .bubble", this.bubbleNumber > 0);
        },

		updateItems: function () {
            this.updateItemLists();
            this.updateItemComparisonIndicators();
		},

		updateCrafting: function (isActive) {
            var showObsolete = this.showObsolete();

            this.craftableItems = 0;
			this.numCraftableUnlockedUnseen = 0;
            this.numCraftableAvailableUnseen = 0;

			var itemsComponent = this.itemNodes.head.items;
			var itemDefinitions = this.getCraftableItemDefinitions();
			var countObsolete = 0;

			var tr;
            var itemList;
            var itemDefinition;
            for (var type in itemDefinitions) {
                itemList = itemDefinitions[type];
                var containerID = this.getItemCraftContainerID(type);
                var numVisible = 0;
                for (var i in itemList) {
                    itemDefinition = itemList[i];
                    var actionName = "craft_" + itemDefinition.id;
                    var costFactor = GameGlobals.playerActionsHelper.getCostFactor(actionName);
                    var hasCosts = Object.keys(GameGlobals.playerActionsHelper.getCosts(actionName, costFactor)).length > 0;

                    if (isActive && !hasCosts) {
                        console.log("WARN: Craftable item has no costs: " + itemDefinition.id);
                    }

                    var trID = this.getItemCraftTRID(itemDefinition);
                    var tr = $("#" + trID);
                    var isUnlocked = this.isItemUnlocked(itemDefinition);
                    var isObsolete = this.isObsolete(itemDefinition);
                    var isAvailable = isUnlocked && GameGlobals.playerActionsHelper.checkAvailability(actionName, false);
                    var isVisible = isUnlocked && (!isObsolete || showObsolete);

                    if (isUnlocked && isObsolete) countObsolete++;

                    if (isUnlocked) {
                        if (!isObsolete) {
                            if (GameGlobals.gameState.uiBagStatus.itemsCraftableUnlockedSeen.indexOf(itemDefinition.id) < 0) {
                                if (isActive || this.bubbleCleared) {
                                    GameGlobals.gameState.uiBagStatus.itemsCraftableUnlockedSeen.push(itemDefinition.id);
                                } else {
                                    this.numCraftableUnlockedUnseen++;
                                }
                            }
                        }

                        if (isVisible) {
                            this.craftableItems++;

                            if (isAvailable && !itemsComponent.contains(itemDefinition.name) && !isObsolete) {
                                if (GameGlobals.gameState.uiBagStatus.itemsCraftableAvailableSeen.indexOf(itemDefinition.id) < 0) {
                                    if (isActive || this.bubbleCleared) {
                                        GameGlobals.gameState.uiBagStatus.itemsCraftableAvailableSeen.push(itemDefinition.id);
                                    } else {
                                        this.numCraftableAvailableUnseen++;
                                    }
                                }
                            }
                        }
                    }

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

        makeCraftingButton: function(itemDefinition) {
            var actionName = "craft_" + itemDefinition.id;
            return "<button class='action multiline' action='" + actionName + "'>" + itemDefinition.name + "</button>";
        },

        updateUseItems: function () {
            var itemDefinitionList = [];

            var itemList;
            var itemDefinition;
            for (var type in ItemConstants.itemDefinitions) {
                itemList = ItemConstants.itemDefinitions[type];
                for (var i in itemList) {
                    itemDefinition = itemList[i];
                    if (itemDefinition.useable) {
                        var actionName = "use_item_" + itemDefinition.id;
                        var reqsCheck = GameGlobals.playerActionsHelper.checkAvailability(actionName, false);
                        if (reqsCheck) {
                            itemDefinitionList.push(itemDefinition);
                        }
                    }
                }
            }

            GameGlobals.uiFunctions.toggle("#header-self-use-items", itemDefinitionList.length > 0);
            if ($("#self-use-items table tr").length === itemDefinitionList.length) return;
            $("#self-use-items table").empty();

            itemDefinitionList = itemDefinitionList.sort(UIConstants.sortItemsByType);

            var tr;
            for (var j = 0; j < itemDefinitionList.length; j++) {
                var itemDefinition = itemDefinitionList[j];
                var actionName = "use_item_" + itemDefinition.id;
                tr = "<tr><td><button class='action multiline' action='" + actionName + "'>Use " + itemDefinition.name + "</button></td></tr>";
                $("#self-use-items table").append(tr);
            }

            GameGlobals.uiFunctions.registerActionButtonListeners("#self-use-items");
            GameGlobals.uiFunctions.generateButtonOverlays("#self-use-items");
            GameGlobals.uiFunctions.generateCallouts("#self-use-items");
            GlobalSignals.elementCreatedSignal.dispatch();
        },

        updateItemCounts: function (isActive) {
            this.numOwnedUnseen = 0;
            var itemsComponent = this.itemNodes.head.items;
            var inCamp = this.itemNodes.head.entity.get(PositionComponent).inCamp;
            var items = itemsComponent.getUnique(inCamp);
            for (var i = 0; i < items.length; i++) {
                this.updateItemCount(isActive, items[i]);
            }
        },

        updateItemComparisonIndicators: function () {
            var itemsComponent = this.itemNodes.head.items;
			for (var i = 0; i < this.inventoryItemsBag.length; i++) {
                var item = this.inventoryItemsBag[i];
                if (!item.equippable) continue;
                var slot = $("#bag-items div[data-itemid='" + item.id + "']");
                var indicator = $(slot[0]).find(".item-comparison-indicator");

                var comparison = itemsComponent.getEquipmentComparison(item);
                $(indicator).toggleClass("indicator-increase", comparison > 0);
                $(indicator).toggleClass("indicator-even", comparison == 0);
                $(indicator).toggleClass("indicator-decrease", comparison < 0);
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

			this.inventoryItemsAll = items.sort(UIConstants.sortItemsByType);
            this.inventoryItemsBag = [];

            this.numOwnedUnseen = 0;

			$("#bag-items").empty();
			for (var i = 0; i < this.inventoryItemsAll.length; i++) {
				var item = this.inventoryItemsAll[i];
                this.updateItemCount(isActive, item);
				var count = itemsComponent.getCount(item, inCamp);
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
                        var canEquip = !item.equipped;
                        var canDiscard = itemsComponent.isItemDiscardable(item);
						if (item.equipped) {
							this.updateItemSlot(item.type, item);
							showCount = count - 1;
						}
                        if (showCount > 0) {
                            var options = { canEquip: canEquip, isEquipped: item.equipped, canUnequip: false, canDiscard: canDiscard };
                            var smallSlot = UIConstants.getItemSlot(itemsComponent, item, showCount, false, false, true, options);
                            $("#bag-items").append(smallSlot);
                            this.inventoryItemsBag.push(item);
                        }
						break;

					case ItemConstants.itemTypes.follower:
					case ItemConstants.itemTypes.uniqueEquipment:
						break;

					default:
                        var smallSlot = UIConstants.getItemSlot(itemsComponent, item, count);
						$("#bag-items").append(smallSlot);
                        this.inventoryItemsBag.push(item);
						break;
				}
			}

            GameGlobals.uiFunctions.toggle($("#bag-items-empty"), this.inventoryItemsBag.length === 0);

            GameGlobals.uiFunctions.generateCallouts("#container-tab-two-bag .three-quarters");
            GameGlobals.uiFunctions.generateButtonOverlays("#container-tab-two-bag .three-quarters");
            GameGlobals.uiFunctions.registerActionButtonListeners("#bag-items");
            GameGlobals.uiFunctions.registerActionButtonListeners("#container-equipment-slots");
		},

        updateItemCount: function (isActive, item) {
            if (GameGlobals.gameState.uiBagStatus.itemsOwnedSeen.indexOf(item.id) < 0) {
                if (item.id !== "equipment_map" && item.type !== ItemConstants.itemTypes.follower) {
                    if (isActive || this.bubbleCleared) {
                        GameGlobals.gameState.uiBagStatus.itemsOwnedSeen.push(item.id);
                    } else {
                        this.numOwnedUnseen++;
                    }
                }
            }
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
			$(slot).children(".item-slot-image").html(itemVO ? UIConstants.getItemDiv(itemsComponent, itemVO, 0, UIConstants.getItemCallout(itemVO, false, true, options), true) : "");
			$(slot).children(".item-slot-name").html(itemVO ? itemVO.name.toLowerCase() : "");

			GameGlobals.uiFunctions.toggle($(slot).children(".item-slot-type-empty"), itemVO === null);
			GameGlobals.uiFunctions.toggle($(slot).children(".item-slot-type-equipped"), itemVO !== null);
			GameGlobals.uiFunctions.toggle($(slot).children(".item-slot-name"), itemVO !== null);
			$(slot).toggleClass("item-slot-equipped", itemVO !== null);
		},

        onObsoleteToggled: function () {
            this.isShowObsoleteChecked = $("#checkbox-crafting-show-obsolete").is(':checked');
        },

        onTabChanged: function () {
            if (GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.bag) {
                this.refresh();
            }
        },

        onInventoryChanged: function () {
            if (GameGlobals.gameState.uiStatus.isHidden) return;
            this.updateItems();
            this.updateUseItems();
        },

        onEquipmentChanged: function () {
            if (GameGlobals.gameState.uiStatus.isHidden) return;
            this.updateItems();
            this.updateUseItems();
        },

        showObsolete: function () {
            return this.isShowObsoleteChecked || this.isShowObsoleteHidden;
        },

        isItemUnlocked: function (itemDefinition) {
            var actionName = "craft_" + itemDefinition.id;
            var reqsCheck = GameGlobals.playerActionsHelper.checkRequirements(actionName, false);
            return reqsCheck.value >= 1 || reqsCheck.reason === PlayerActionConstants.UNAVAILABLE_REASON_BAG_FULL || reqsCheck.reason === PlayerActionConstants.UNAVAILABLE_REASON_LOCKED_RESOURCES;
        },

        isObsolete: function (itemVO) {
            var itemsComponent = this.itemNodes.head.items;
            var equipped = itemsComponent.getEquipped(itemVO.type);

            // if item is equippable but the player already has one, equipped or not -> obsolete
            if (itemVO.equippable) {
                var inCamp = this.itemNodes.head.entity.get(PositionComponent).inCamp;
                var owned = itemsComponent.getUnique(inCamp);
                for (var j = 0; j < owned.length; j++) {
                    if (owned[j].id === itemVO.id) return true;
                }
            }

            // if no equipped item of type -> not obsolete
            if (equipped.length === 0) return false;

            // if item bonus is higher than any bonus on the currently equipped item of the same type -> not obsolete
            for (var bonusKey in ItemConstants.itemBonusTypes) {
                var bonusType = ItemConstants.itemBonusTypes[bonusKey];
                var itemBonus = itemVO.getBonus(bonusType);
                for (var i = 0; i < equipped.length; i++)
                    if (itemBonus > equipped[i].getBonus(bonusType)) {
                        return false;
                    }
            }

            // has equipped item of type and no bonus is higher -> obsolete
            return true;
        },

        getCraftableItemDefinitions: function () {
            if (this.craftableItemDefinitions && this.craftableItemDefinitions.length > 0) return this.craftableItemDefinitions;

            this.craftableItemDefinitions = {};
            var itemList;
            var itemDefinition;
            for (var type in ItemConstants.itemDefinitions) {
                itemList = ItemConstants.itemDefinitions[type];
                this.craftableItemDefinitions[type] = []
                for (var i in itemList) {
                    itemDefinition = itemList[i];
                    if (itemDefinition.craftable)
                        this.craftableItemDefinitions[type].push(itemDefinition);
                }
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
