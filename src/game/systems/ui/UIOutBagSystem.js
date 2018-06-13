define([
    'ash',
    'game/GlobalSignals',
    'game/constants/UIConstants',
    'game/constants/ItemConstants',
    'game/nodes/player/ItemsNode',
    'game/components/common/PositionComponent',
], function (Ash, GlobalSignals, UIConstants, ItemConstants, ItemsNode, PositionComponent) {
    
    var UIOutBagSystem = Ash.System.extend({

		uiFunctions : null,
		playerActionsHelper: null,
		gameState: null,

		itemNodes: null,
        
        craftableItemDefinitions: {},
		
		bubbleNumber: -1,
        craftableItems: -1,
        lastShownCraftableItems: -1,
        numOwned: -1,
        numOwnedUnseen: 0,
		numCraftableUnlockedUnseen: -1,
		numCraftableAvailableUnseen: -1,

		constructor: function (uiFunctions, playerActionsHelper, gameState) {
			this.gameState = gameState;
			this.uiFunctions = uiFunctions;
			this.playerActionsHelper = playerActionsHelper;
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
			this.initButtonListeners();
			this.initItemSlots();
            this.initCraftingButtons();
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
				var rawType = $(this).attr("id").split("-")[2];
                var typeDisplay = ItemConstants.itemTypes[rawType].toLowerCase();
				$(this).append("<span class='item-slot-type'>" + typeDisplay + "</span>");
				$(this).append("<span class='item-slot-effect'></span>");
				$(this).append("<div class='item-slot-image'></div>");
			});
		},
		
        initCraftingButtons: function () {
			var itemDefinitions = this.getCraftableItemDefinitions();
            var itemList;
            var itemDefinition;
            for (var type in itemDefinitions) {
                itemList = itemDefinitions[type];
                if (itemList.length === 0) continue;
                var tbl = "<table id='self-craft-" + type + "'>";
                for (var i in itemList) {
                    itemDefinition = itemList[i];
                    var trID = this.getItemCraftTRID(itemDefinition);
                    tbl += "<tr id='" + trID + "'><td> " + this.makeCraftingButton(itemDefinition) + " </td></tr>";
                }
                tbl += "</table>";
                var header = "<p id='world-upgrades-count' class='collapsible-header'>" + ItemConstants.itemTypes[type] + "<span class='header-count'>0</span></p>"
                var content = "<div class='collapsible-content'>" + tbl + "</div>"
                var containerID = this.getItemCraftContainerID(type);
                var container = "<div class='collapsible-container' id='" + containerID + "'>" + header + content + "</div>";
                $("#self-craft").append(container);
            }
            
            this.uiFunctions.registerActionButtonListeners("#self-craft");
            this.uiFunctions.registerCollapsibleContainerListeners("#self-craft");
            this.uiFunctions.generateButtonOverlays("#self-craft");
            this.uiFunctions.generateCallouts("#self-craft");
            GlobalSignals.elementCreatedSignal.dispatch();
        },
        
		removeFromEngine: function (engine) {
			this.itemNodes = null;
			$("button[action='discard_item']").click(null);
		},

		update: function (time) {
			var isActive = this.uiFunctions.gameState.uiStatus.currentTab === this.uiFunctions.elementIDs.tabs.bag;
			
			this.updateCrafting(isActive);
			this.updateBubble();
			
			if (!isActive) {
                this.updateItemCounts(isActive);
                this.craftableItemDefinitions = {};
                return;
            }

			// Header
			this.elements.tabHeader.text("Bag");

			var itemsComponent = this.itemNodes.head.items;
			var inCamp = this.itemNodes.head.entity.get(PositionComponent).inCamp;
			var uniqueItems = itemsComponent.getUnique(inCamp);
            
			this.updateItems(uniqueItems);
            this.updateUseItems();
		},
        
        updateBubble: function () {
            var newBubbleNumber = Math.max(0, this.numOwnedUnseen + this.numCraftableUnlockedUnseen + this.numCraftableAvailableUnseen);
            if (this.bubbleNumber === newBubbleNumber)
                return;
            
            this.bubbleNumber = newBubbleNumber;
            $("#switch-bag .bubble").text(this.bubbleNumber);
            this.uiFunctions.toggle("#switch-bag .bubble", this.bubbleNumber > 0);
        },

		updateItems: function (uniqueItems) {
			if (uniqueItems.length !== this.numOwned) {
				this.numOwned = uniqueItems.length;
				this.updateItemLists();
			} else {
				this.refreshItemLists();
			}
		},

		updateCrafting: function (isActive) {
            var checkBoxHidden = !($("#checkbox-crafting-show-obsolete").is(':visible')) && $("#self-craft").is(":visible");
            var showObsolete = this.isShowObsoleteChecked || checkBoxHidden;
			
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
                    var reqsCheck = this.playerActionsHelper.checkRequirements(actionName, false);
                    var ordinal = this.playerActionsHelper.getOrdinal(actionName);
                    var costFactor = this.playerActionsHelper.getCostFactor(actionName);
                    var hasCosts = Object.keys(this.playerActionsHelper.getCosts(actionName, ordinal, costFactor)).length > 0;
                    
                    if (isActive && !hasCosts) {
                        console.log("WARN: Craftable item has no costs: " + itemDefinition.id);
                    }
                    
                    var trID = this.getItemCraftTRID(itemDefinition);
                    var tr = $("#" + trID);
                    var isUnlocked = reqsCheck.value >= 1 || reqsCheck.reason === "Bag full.";
                    var isObsolete = this.isObsolete(itemDefinition);
                    var isAvailable = isUnlocked && this.playerActionsHelper.checkAvailability(actionName, false);
                    var isVisible = isUnlocked && (!isObsolete || showObsolete);
                    
                    if (isUnlocked && isObsolete) countObsolete++;
                    
                    if (isUnlocked) {
                        if (!isObsolete) {
                            if (this.gameState.uiBagStatus.itemsCraftableUnlockedSeen.indexOf(itemDefinition.id) < 0) {
                                if (isActive) {
                                    this.gameState.uiBagStatus.itemsCraftableUnlockedSeen.push(itemDefinition.id);
                                } else {
                                    this.numCraftableUnlockedUnseen++;
                                }
                            }
                        }

                        if (isVisible) {
                            this.craftableItems++;

                            if (isAvailable && !itemsComponent.contains(itemDefinition.name) && !isObsolete) {
                                if (this.gameState.uiBagStatus.itemsCraftableAvailableSeen.indexOf(itemDefinition.id) < 0) {
                                    if (isActive) {
                                        this.gameState.uiBagStatus.itemsCraftableAvailableSeen.push(itemDefinition.id);
                                    } else {
                                        this.numCraftableAvailableUnseen++;
                                    }
                                }
                            }
                        }
                    }
                    
                    if (isActive) {
                        this.uiFunctions.toggle(tr, isVisible);
                        if (isVisible) numVisible++;
                    }
                }
                    
                if (isActive) {
                    this.uiFunctions.toggle($("#" + containerID), numVisible > 0);
                    $("#" + containerID + " .header-count").text(" (" + numVisible + ")");
                }
            }
			
            if (isActive) {
                this.uiFunctions.toggle("#checkbox-crafting-show-obsolete", countObsolete > 0);
                this.uiFunctions.toggle("#label-crafting-show-obsolete", countObsolete > 0);
            }
		},
        
        makeCraftingButton: function(itemDefinition) {
            var actionName = "craft_" + itemDefinition.id;    
            return "<button class='action' action='" + actionName + "'>" + itemDefinition.name + "</button>";
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
                        var reqsCheck = this.playerActionsHelper.checkAvailability(actionName, false);
                        if (reqsCheck) {                
                            itemDefinitionList.push(itemDefinition);
                        }
                    }
                }
            }
            
            this.uiFunctions.toggle("#header-self-use-items", itemDefinitionList.length > 0);
            if ($("#self-use-items table tr").length === itemDefinitionList.length) return;            
            $("#self-use-items table").empty();

            itemDefinitionList = itemDefinitionList.sort(UIConstants.sortItemsByType);

            var tr;
            for (var j = 0; j < itemDefinitionList.length; j++) {
                var itemDefinition = itemDefinitionList[j];
                var actionName = "use_item_" + itemDefinition.id;
                tr = "<tr><td><button class='action' action='" + actionName + "'>Use " + itemDefinition.name + "</button></td></tr>";
                $("#self-use-items table").append(tr);
            }
            
            this.uiFunctions.registerActionButtonListeners("#self-use-items");
            this.uiFunctions.generateButtonOverlays("#self-use-items");
            this.uiFunctions.generateCallouts("#self-use-items");
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

		updateItemLists: function () {
            var isActive = this.uiFunctions.gameState.uiStatus.currentTab === this.uiFunctions.elementIDs.tabs.bag;
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
			
			items = items.sort(UIConstants.sortItemsByType);
            
            this.numOwnedUnseen = 0;

			$("#bag-items").empty();
			for (var i = 0; i < items.length; i++) {
				var item = items[i];
                this.updateItemCount(isActive, item);
				var count = itemsComponent.getCount(item, inCamp);
				var smallSlot = UIConstants.getItemSlot(item, count);
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

            this.uiFunctions.generateCallouts("#container-tab-two-bag .three-quarters");
		},
        
        updateItemCount: function (isActive, item) {
            if (this.gameState.uiBagStatus.itemsOwnedSeen.indexOf(item.id) < 0) {
                if (item.id !== "equipment_map" && item.type !== ItemConstants.itemTypes.follower) {
                    if (isActive) {
                        this.gameState.uiBagStatus.itemsOwnedSeen.push(item.id);
                    } else {
                        this.numOwnedUnseen++;
                    }
                }
            }
        },

		refreshItemLists: function () {
			var itemsComponent = this.itemNodes.head.items;
			var inCamp = this.itemNodes.head.entity.get(PositionComponent).inCamp;
			$.each($("#bag-items li .item"), function () {
				var id = $(this).attr("data-itemid");
				var count = itemsComponent.getCountById(id, inCamp);
                var item = itemsComponent.getItem(id);
                if (item) {
                    var showCount = item.equipped ? count - 1 : count;
                    $(this).find(".item-count").text(showCount + "x");
                }
			});
		},
		
		updateItemSlot: function (itemType, itemVO) {
			var slot = $("#item-slot-" + itemType.toLowerCase());
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
                
			$(slot).children(".item-slot-effect").html(itemVO ? UIConstants.getItemBonusDescription(itemVO, false, true) : "");
			$(slot).children(".item-slot-image").html(itemVO ? UIConstants.getItemDiv(itemVO, 0, false, false) : "");
			
			this.uiFunctions.toggle($(slot).children(".item-slot-type"), itemVO === null);
			this.uiFunctions.toggle($(slot).children(".item-slot-effect"), itemVO !== null);
			$(slot).toggleClass("item-slot-equipped", itemVO !== null);
		},
        
        onObsoleteToggled: function () {
            this.isShowObsoleteChecked = $("#checkbox-crafting-show-obsolete").is(':checked');
        },
        
        isObsolete: function (itemVO) {
            var itemsComponent = this.itemNodes.head.items;
            var equipped = itemsComponent.getEquipped(itemVO.type);
            
            // if no equipped item of type -> not obsolete
            if (equipped.length === 0) return false;

            // if item is equippable but the player already has one, not equipped -> obsolete
            if (itemVO.equippable) {
                var inCamp = this.itemNodes.head.entity.get(PositionComponent).inCamp;
                var all = itemsComponent.getUnique(inCamp);
                for (var j = 0; j < all.length; j++) {
                    if (!all[j].equipped && all[j].id === itemVO.id) return true;
                }
            }
            
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
        }
    
	});

    return UIOutBagSystem;
});
