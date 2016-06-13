define([
    'ash',
    'game/constants/UIConstants',
    'game/constants/ItemConstants',
    'game/nodes/player/PlayerActionResultNode',
    'game/components/common/PositionComponent',
    'game/components/player/BagComponent',
], function (Ash, UIConstants, ItemConstants, PlayerActionResultNode, PositionComponent, BagComponent) {
    var UIOutPopupInventorySystem = Ash.System.extend({

        uiFunctions: null,
        playerActionResultNodes: null,
    
        constructor: function (uiFunctions) {
            this.uiFunctions = uiFunctions;
			return this;
        },

        addToEngine: function (engine) {
            this.playerActionResultNodes = engine.getNodeList(PlayerActionResultNode);
            this.playerActionResultNodes.nodeAdded.add(this.onNodeAdded, this);
        },
		
        removeFromEngine: function (engine) {
            this.playerActionResultNodes.nodeAdded.remove(this.onNodeAdded, this);
            this.playerActionResultNodes = null;
        },
        
        onNodeAdded: function (node) {
            this.pendingListUpdate = true;
        },

        update: function (time) {
            if (this.pendingListUpdate) {
                this.updateLists();
            }
            
            if (!($(".popup").is(":visible")) || $(".popup").data("fading") == true) return;
        },
        
        updateLists: function () {            
            $("#resultlist-inventorymanagement-found ul").empty();
            $("#resultlist-inventorymanagement-kept ul").empty();
            $("#resultlist-loststuff-lost ul").empty();
            
            var sys = this;
            
            var inCamp = this.playerActionResultNodes.head.entity.get(PositionComponent).inCamp;
            var resultNode = this.playerActionResultNodes.head;
            var rewards = resultNode.result.pendingResultVO;
            
            var playerAllItems = resultNode.items.getAll(inCamp);
            
            var findItemById = function (itemID, itemList, notInItemList) {
                for (var i = 0; i < itemList.length; i++) {
                    var item = itemList[i];
                    if (item.id === itemID) {
                        var foundInOtherList = false;
                        if (notInItemList !== null) {
                            for (var j = 0; j < notInItemList.length; j++) {
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
                            console.log("leave: " + itemToLeave);
                            rewards.selectedItems.splice(itemToLeave);
                        } else {
                            var itemToDiscard = findItemById(itemId, playerAllItems, rewards.discardedItems);
                            console.log("discard: " + itemToDiscard);
                            rewards.discardedItems.push(itemToDiscard);
                        }
                    } else {
                        // player wants to take an item; take own items first then rewards
                        if (isInRewards) {
                            var itemToTake = findItemById(itemId, rewards.gainedItems, rewards.selectedItems);
                            console.log("take: " + itemToTake);
                            rewards.selectedItems.push(itemToTake);
                        } else {
                            var itemToKeep = findItemById(itemId, rewards.discardedItems, null);
                            console.log("keep: " + itemToKeep);
                            rewards.discardedItems.splice(itemToKeep);
                        }
                    }
                }
                
                sys.updateLists();
            };
            
            this.addItemsToLists(rewards, playerAllItems);
            this.addResourcesToLists(rewards, resultNode);
            
            $("#resultlist-inventorymanagement-kept li").click(onLiClicked);
            $("#resultlist-inventorymanagement-found li").click(onLiClicked);
            
            this.uiFunctions.generateCallouts("#resultlist-inventorymanagement-kept");
            this.uiFunctions.generateCallouts("#resultlist-inventorymanagement-found");
            this.uiFunctions.generateCallouts("#resultlist-loststuff-lost");
            
            this.updateCapacity(rewards, resultNode, playerAllItems);
            
            this.pendingListUpdate = false;
        },
        
        updateCapacity: function (rewards, resultNode, playerAllItems) {
            var bagComponent = this.playerActionResultNodes.head.entity.get(BagComponent);
            
            var originalResC = this.getResourcesCapacity(resultNode.resources.resources);
            var discardedResC = this.getResourcesCapacity(rewards.discardedResources);
            var lostResC = this.getResourcesCapacity(rewards.lostResources);
            var selectedResC = this.getResourcesCapacity(rewards.selectedResources);
            var gainedResC = this.getResourcesCapacity(rewards.gainedResources);
            
            var originalItemC = this.getItemsCapacity(playerAllItems);
            var discardedItemC = this.getItemsCapacity(rewards.discardedItems);
            var lostItemC = this.getItemsCapacity(rewards.lostItems);
            var selectedItemC = this.getItemsCapacity(rewards.selectedItems);
            var gainedItemC = this.getItemsCapacity(rewards.gainedItems);
            
            var originalCapacity = originalResC + originalItemC;
            var selectedCapacity = originalResC - discardedResC - lostResC + selectedResC + originalItemC - discardedItemC - lostItemC + selectedItemC;
            var selectableCapacity = originalResC - lostResC + gainedResC + originalItemC - lostItemC + gainedItemC;
            
            $("#inventory-popup-bar").data("progress-percent", selectedCapacity/bagComponent.totalCapacity*100);
            $("#inventory-popup-bar .progress-label").text(Math.ceil(selectedCapacity) + " / " + bagComponent.totalCapacity);
            
            $("#confirmation-takeall").toggle(selectableCapacity > originalCapacity);

            bagComponent.selectedCapacity = selectedCapacity;
            bagComponent.selectableCapacity = selectableCapacity;
        },
        
        addItemsToLists: function (rewards, playerAllItems) {
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
            for (var j = 0; j < rewards.lostItems.length; j++) {
                countLostItem(rewards.lostItems[j]);
            }

            // gained items: non-selected to found, selected to kept
            for ( var i = 0; i < rewards.gainedItems.length; i++ ) {
                item = rewards.gainedItems[i];
                li = UIConstants.getItemSlot(item, 1);
                if (rewards.selectedItems.indexOf(item) < 0) {
                    countFoundItem(item);
                } else {
                    countKeptItem(item);
                }
            }

            // bag items: non-discarded to kept, discarded to found
            for (var k = 0; k < playerAllItems.length; k++ ) {
                item = playerAllItems[k];
                if (item.type === ItemConstants.itemTypes.bag) continue;
                if (rewards.lostItems.indexOf(item) >= 0) continue; 
                if (rewards.discardedItems.indexOf(item) < 0) {
                    countKeptItem(item);
                } else {
                    countFoundItem(item);
                }
            }
            
            for (var itemId in lostItemCounts ) {
                item = lostItemVOs[itemId];
                li = UIConstants.getItemSlot(item, lostItemCounts[itemId], true);
                $("#resultlist-loststuff-lost ul").append(li);
            }
            
            for (var itemId in foundItemCounts) {
                item = foundItemVOs[itemId];
                li = UIConstants.getItemSlot(item, foundItemCounts[itemId]);
                $("#resultlist-inventorymanagement-found ul").append(li);
            }

            for (var itemId in keptItemCounts ) {
                item = keptItemVOs[itemId];
                li = UIConstants.getItemSlot(item, keptItemCounts[itemId]);
                $("#resultlist-inventorymanagement-kept ul").append(li);
            }
        },
        
        addResourcesToLists: function (rewards, resultNode) {
            
            // bag resources: non-discarded to kept, discarded to found
            // gained resources: non-selected to found, selected to kept
            for ( var key in resourceNames ) {
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
        
        getResourcesCapacity: function (resourcesVO) {
            return resourcesVO.getTotal();
        },
        
        getItemsCapacity: function (itemList) {
            return itemList.length;
        }
    
	});

    return UIOutPopupInventorySystem;
});
