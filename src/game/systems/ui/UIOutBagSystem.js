define([
    'ash',
    'game/constants/UIConstants',
    'game/constants/ItemConstants',
    'game/constants/FightConstants',
    'game/constants/PlayerStatConstants',
    'game/nodes/player/ItemsNode',
    'game/components/common/ResourcesComponent',
    'game/components/common/PositionComponent',
    'game/components/player/StaminaComponent',
    'game/components/player/VisionComponent',
], function (Ash, UIConstants, ItemConstants, FightConstants, PlayerStatConstants, ItemsNode, ResourcesComponent, PositionComponent, StaminaComponent, VisionComponent) {
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
		lastShownAvailableCraftableItems: -1,
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
				var rawType = $(this).attr("id").split("-")[2];
                var typeDisplay = ItemConstants.itemTypes[rawType].toLowerCase();
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
            var hasMap = itemsComponent.getCountById(ItemConstants.itemDefinitions.uniqueEquipment[0].id, true) > 0;
			var inCamp = this.itemNodes.head.entity.get(PositionComponent).inCamp;
			var uniqueItems = itemsComponent.getUnique(inCamp);
			
			this.uniqueItemsCount = uniqueItems.length;
			
			if (hasMap) this.uniqueItemsCount--;
			if (isActive || this.lastShownUniqueItemsCount < 0) this.lastShownUniqueItemsCount = this.uniqueItemsCount;
			
			this.updateCrafting(isActive);
			this.updateBubble();
			
			if (!isActive) return;

			// Header
			$("#tab-header h2").text("Bag");

			this.updateItems(uniqueItems);
            this.updateUseItems();
            this.updateStats();
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
			var checkBoxHidden = !($("#checkbox-crafting-show-obsolete").is(':visible')) && $("#self-craft").is(":visible");
			var showObsolete = $("#checkbox-crafting-show-obsolete").is(':checked') || checkBoxHidden;
			var requiresUpdate = $("#self-craft table tr").length !== this.craftableItems || showObsolete !== this.showObsolete;
			this.showObsolete = showObsolete;
			
			var countObsolete = 0;
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
					if (itemDefinition.craftable) itemDefinitionList.push(itemDefinition);
				}
			}
			
			itemDefinitionList = itemDefinitionList.sort(UIConstants.sortItemsByType);
			
			var tr;
			for (var j = 0; j < itemDefinitionList.length; j++) {
				var itemDefinition = itemDefinitionList[j];
				var actionName = "craft_" + itemDefinition.id;
                // TODO re-implement item obsolete check after new item slots and bonuses
				var isObsolete = this.isObsolete(itemDefinition);
				var reqsCheck = this.playerActionsHelper.checkRequirements(actionName, false);
                var ordinal = this.playerActionsHelper.getOrdinal(actionName);
                var costFactor = this.playerActionsHelper.getCostFactor(actionName);
                var hasCosts = Object.keys(this.playerActionsHelper.getCosts(actionName, ordinal, costFactor)).length > 0;
                if (isActive && !hasCosts) {
                    console.log("WARN: Craftable item has no costs: " + itemDefinition.id);
                }
				if (reqsCheck.value >= 1 || reqsCheck.reason === "Bag full.") {
					if (isObsolete) countObsolete++;
					if (!isObsolete || showObsolete) {
						var isAvailable = this.playerActionsHelper.checkAvailability(actionName, false);
						if (requiresUpdate) {
							tr = "<tr><td><button class='action' action='" + actionName + "'>" + itemDefinition.name + "</button></td></tr>";
							$("#self-craft table").append(tr);
						}
						this.craftableItems++;
					
						if (isAvailable && !itemsComponent.contains(itemDefinition.name) && !this.isObsolete(itemDefinition))
							this.availableCraftableItems++;
					}
				}
			}
			
			$("#checkbox-crafting-show-obsolete").toggle(countObsolete > 0);
			$("#label-crafting-show-obsolete").toggle(countObsolete > 0);

			if (requiresUpdate) {
				this.uiFunctions.registerActionButtonListeners("#self-craft");
				this.uiFunctions.generateButtonOverlays("#self-craft");
				this.uiFunctions.generateCallouts("#self-craft");
			}
			
			if (isActive || this.lastShownCraftableItems < 0) this.lastShownCraftableItems = this.craftableItems;
			if (isActive || this.lastShownAvailableCraftableItems < 0) this.lastShownAvailableCraftableItems = this.availableCraftableItems;
		},
        
        updateUseItems: function () {
            var itemDefinitionList = [];

            var itemList;
            var itemDefinition;
            for ( var type in ItemConstants.itemDefinitions ) {
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
            
            $("#header-self-use-items").toggle(itemDefinitionList.length > 0);
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
        },
        
        updateStats: function () {
            var itemsComponent = this.itemNodes.head.items;
            var playerStamina = this.itemNodes.head.entity.get(StaminaComponent);
            var playerVision = this.itemNodes.head.entity.get(VisionComponent);
            for (var bonusKey in ItemConstants.itemBonusTypes) {
                var bonusType = ItemConstants.itemBonusTypes[bonusKey];
                var bonus = itemsComponent.getCurrentBonus(bonusType);
                var value = bonus;
                var detail = bonus + " from items";
                switch (bonusType) {
                    case ItemConstants.itemBonusTypes.fight_att:
                        value = FightConstants.getPlayerAtt(playerStamina, itemsComponent);
                        detail = FightConstants.getPlayerAttDesc(playerStamina, itemsComponent);
                        break;
                        
                    case ItemConstants.itemBonusTypes.fight_def:
                        value = FightConstants.getPlayerDef(playerStamina, itemsComponent);
                        detail = FightConstants.getPlayerDefDesc(playerStamina, itemsComponent);
                        break;
                        
                    case ItemConstants.itemBonusTypes.light:
                        value = playerVision.value;
                        break;
                }
                $("#stats-equipment-" + bonusKey + " .value").text(value + " (" + detail + ")");
                $("#stats-equipment-" + bonusKey).toggle(value > 0);
            }
        },

		updateItemLists: function () {
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

			$("#bag-items").empty();
			for (var i = 0; i < items.length; i++) {
				var item = items[i];
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
			
			var rowItemCount = Math.floor($("#bag-items").width() / 46);
			var rowsToShow = 1 + Math.ceil($("#bag-items li").length / rowItemCount);
			for (var j = items.length; j <= rowsToShow * rowItemCount; j++) {
				$("#bag-items").append(UIConstants.getItemSlot(null));
			}

            this.uiFunctions.generateCallouts("#container-tab-two-bag .three-quarters");
		},

		refreshItemLists: function () {
			var itemsComponent = this.itemNodes.head.items;
			var inCamp = this.itemNodes.head.entity.get(PositionComponent).inCamp;
			$.each($("#bag-items li .item"), function () {
				var id = $(this).attr("data-itemid");
				var count = itemsComponent.getCountById(id, inCamp);
				var showCount = itemsComponent.getItem(id).equipped ? count - 1 : count;
				$(this).find(".item-count").text(showCount + "x");
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
			
			$(slot).children(".item-slot-type").toggle(itemVO === null);
			$(slot).children(".item-slot-effect").toggle(itemVO !== null);
			$(slot).toggleClass("item-slot-equipped", itemVO !== null);
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
        }
    
	});

    return UIOutBagSystem;
});
