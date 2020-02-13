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
		numCraftableUnlockedUnseen: -1,
		numCraftableAvailableUnseen: -1,

		constructor: function () {
            this.elements = {};
            this.elements.tabHeader = $("#tab-header h2");

            var sys = this;
            $("#checkbox-crafting-show-obsolete").change(function () {
                sys.onObsoleteToggled();
            });
            
			this.initItemSlots();
            this.initCraftingButtons();

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

		initItemSlots: function () {
            var sys = this;
			$.each($("#container-equipment-slots .item-slot"), function () {
				var rawType = $(this).attr("id").split("-")[2];
                var itemTypeName = ItemConstants.itemTypes[rawType];
                var typeDisplay = ItemConstants.itemTypes[rawType].toLowerCase();
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
        },

		removeFromEngine: function (engine) {
			this.itemNodes = null;
            GlobalSignals.removeAll(this);
		},

		update: function (time) {
            if (GameGlobals.gameState.uiStatus.isHidden) return;
			var isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.bag;

			this.updateBubble();

			if (!isActive) {
                this.updateItemCounts(isActive);
                this.craftableItemDefinitions = {};
                return;
            }

            this.bubbleCleared = false;
		},

        slowUpdate: function () {
            if (GameGlobals.gameState.uiStatus.isHidden) return;
            this.updateCrafting();
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
            this.updateCrafting();
        },

        updateBubble: function () {
            var isStatIncreaseAvailable = this.isStatIncreaseAvailable();
            var numImmediatelyUsable = this.getNumImmediatelyUsable();
            var newBubbleNumber = Math.max(0, this.numCraftableUnlockedUnseen + this.numCraftableAvailableUnseen + numImmediatelyUsable);
            if (this.isStatIncreaseShown == isStatIncreaseAvailable && this.bubbleNumber === newBubbleNumber)
                return;
                
            this.bubbleNumber = newBubbleNumber;
            this.isStatIncreaseShown = isStatIncreaseAvailable;

            if (this.isStatIncreaseShown) {
                $("#switch-bag .bubble").text("");
                $("#switch-bag .bubble").toggleClass("bubble-increase", true);
            } else {
                $("#switch-bag .bubble").text(this.bubbleNumber);
                $("#switch-bag .bubble").toggleClass("bubble-increase", false);
            }
            GameGlobals.uiFunctions.toggle("#switch-bag .bubble", this.bubbleNumber > 0 || this.isStatIncreaseShown);
        },

		updateItems: function () {
            this.updateItemLists();
            this.updateItemComparisonIndicators();
		},

		updateCrafting: function () {
            var isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.bag;
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
                        var reqsCheck = GameGlobals.playerActionsHelper.checkRequirements(actionName, false);
                        var isAvailable = GameGlobals.playerActionsHelper.checkAvailability(actionName, false);
                        var costsCheck = GameGlobals.playerActionsHelper.checkCosts(actionName);
                        var showItem = isAvailable || (costsCheck >= 1 && reqsCheck.reason == PlayerActionConstants.UNAVAILABLE_REASON_NOT_IN_CAMP);
                        if (showItem) {
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
                var actionVerb = itemDefinition.id.startsWith("cache_metal") ? "Disassemble" : "Use";
                tr = "<tr><td><button class='action multiline' action='" + actionName + "'>" + actionVerb + " " + itemDefinition.name + "</button></td></tr>";
                $("#self-use-items table").append(tr);
            }

            GameGlobals.uiFunctions.registerActionButtonListeners("#self-use-items");
            GameGlobals.uiFunctions.generateButtonOverlays("#self-use-items");
            GameGlobals.uiFunctions.generateCallouts("#self-use-items");
            GlobalSignals.elementCreatedSignal.dispatch();
        },

        updateItemCounts: function (isActive) {
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

			$("#bag-items").empty();
			for (var i = 0; i < this.inventoryItemsAll.length; i++) {
				var item = this.inventoryItemsAll[i];
                // TODO less hacky fix for the fact that getUnique doesn't prefer equipped items (could return unequipped instance even when an equipped one exists)
                var equipped = itemsComponent.getEquipped(item.type);
                var isEquipped = equipped && equipped.length > 0 && equipped[0].id == item.id;
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
                        var canEquip = !isEquipped;
                        var canDiscard = itemsComponent.isItemDiscardable(item);
						if (isEquipped) {
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

        updateItemCount: function (isActive, item) {
            if (GameGlobals.gameState.uiBagStatus.itemsOwnedSeen.indexOf(item.id) < 0) {
                if (item.id !== "equipment_map" && item.type !== ItemConstants.itemTypes.follower) {
                    if (isActive || this.bubbleCleared) {
                        GameGlobals.gameState.uiBagStatus.itemsOwnedSeen.push(item.id);
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
			$(slot).children(".item-slot-image").html(itemVO ? UIConstants.getItemDiv(itemsComponent, itemVO, null, UIConstants.getItemCallout(itemVO, false, true, options), true) : "");
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
            this.isShowObsoleteChecked = $("#checkbox-crafting-show-obsolete").is(':checked');
            this.updateCrafting();
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
            this.updateCrafting();
        },

        onEquipmentChanged: function () {
            if (GameGlobals.gameState.uiStatus.isHidden) return;
            this.updateItems();
            this.updateUseItems();
            this.highlightItemType(null);
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
            var inCamp = this.itemNodes.head.entity.get(PositionComponent).inCamp;
            return GameGlobals.itemsHelper.isObsolete(itemVO, itemsComponent, inCamp);
        },
        
        isStatIncreaseAvailable: function () {
            var itemsComponent = this.itemNodes.head.items;
			for (var i = 0; i < this.inventoryItemsBag.length; i++) {
                var item = this.inventoryItemsBag[i];
                if (!item.equippable) continue;
                var comparison = itemsComponent.getEquipmentComparison(item);
                if (comparison > 0) return true;
            }
            return false;
        },
        
        getNumImmediatelyUsable: function () {
            // TODO remove hardcoded item ids
            var itemsComponent = this.itemNodes.head.items;
            var inCamp = this.itemNodes.head.entity.get(PositionComponent).inCamp;
            if (inCamp) {
                return itemsComponent.getCountById("cache_metal_1", true) + itemsComponent.getCountById("cache_metal_2", true);
            } else {
                return 0;
            }
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
