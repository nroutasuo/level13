define([
    'ash',
    'game/constants/UIConstants',
    'game/nodes/player/PlayerActionResultNode',
    'game/components/common/PositionComponent',
    'game/components/player/BagComponent',
], function (Ash, UIConstants, PlayerActionResultNode, PositionComponent, BagComponent) {
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
            
			if (!($("#common-popup").is(":visible")) || $("#common-popup").data("fading") == true) return;
			if (!($("#info-results").is(":visible"))) return;
		},
        
        updateLists: function () {
            $("#resultlist-inventorymanagement-found ul").empty();
            $("#resultlist-inventorymanagement-kept ul").empty();
            
            var selectedCapacity = 0;
            var sys = this;
            
			var inCamp = this.playerActionResultNodes.head.entity.get(PositionComponent).inCamp;
            var resultNode = this.playerActionResultNodes.head;
            var bagComponent = this.playerActionResultNodes.head.entity.get(BagComponent);
            var rewards = resultNode.result.pendingResultVO;
            var playerItems = resultNode.items.getUnique(inCamp);
            var li;
            
            var findItemById = function (itemId) {
                var item = null;
                for (var i = 0; i < rewards.gainedItems.length; i++) {
                    var gainedItem = rewards.gainedItems[i];
                    if (gainedItem.id === itemId) {
                        item = gainedItem;
                        break;
                    }
                }
                if (!item) {
                    for (var k = 0; k < playerItems.length; k++) {
                        var playerItem = playerItems[k];
                        if (playerItem.id === itemId) {
                            item = playerItem;
                            break;
                        }
                    }
                }
                return item;
            }
        
            var onLiClicked = function (e) {
                var divRes = $(this).find(".res");
                var divItem = $(this).find(".item");
                var resourceName = $(divRes).attr("data-resourcename");
                var itemId = $(divItem).attr("data-itemid");
                
                var isSelected = $(this).parents("#resultlist-inventorymanagement-kept").length > 0;
                
                if (resourceName) {
                    console.log(isSelected + " " + resourceName);
                    if (isSelected) {
                        rewards.discardedResources.addResource(resourceName, 1);
                    } else {
                        rewards.selectedResources.addResource(resourceName, 1);
                    }
                    console.log(rewards);
                } else if (itemId) {
                    var item = findItemById(itemId);
                    
                    if (!item) {
                        console.log("WARN: No item found.");
                        return;
                    }
                    
                    var isInRewards = rewards.gainedItems.indexOf(item) >= 0;
                    
                    console.log(isSelected + " " + isInRewards + " " + itemId);
                    
                    if (isSelected) {
                        if (isInRewards)
                            rewards.selectedItems.splice(rewards.selectedItems.indexOf(item));
                        else
                            rewards.discardedItems.push(item);
                    } else {
                        if (isInRewards)
                            rewards.selectedItems.push(item);
                        else
                            rewards.discardedItems.splice(rewards.discardedItems.indexOf(item));
                    }
                    
                    console.log(rewards);
                }
                
                sys.updateLists();
            };
            
            // gained items: non-selected to found, selected to kept
            for (var i = 0; i < rewards.gainedItems.length; i++) {
				var item = rewards.gainedItems[i];
                li = UIConstants.getItemSlot(item, 1);
                if (rewards.selectedItems.indexOf(item) < 0) {
                    $("#resultlist-inventorymanagement-found ul").append(li);
                    selectedCapacity++;
                } else {
                    $("#resultlist-inventorymanagement-kept ul").append(li);
                }
            }
            
            // bag items: non-discarded to kept, discarded to found
            for (var k = 0; k < playerItems.length; k++) {
				var item = playerItems[k];
                li = UIConstants.getItemSlot(item, 1);
                if (rewards.discardedItems.indexOf(item) < 0) {
                    $("#resultlist-inventorymanagement-kept ul").append(li);
                } else {
                    $("#resultlist-inventorymanagement-found ul").append(li);
                    selectedCapacity++;
                }
            }
            
            // bag resources: non-discarded to kept, discarded to found
            // gained resources: non-selected to found, selected to kept
			for (var key in resourceNames) {
				var name = resourceNames[key];
                var amountOriginal = resultNode.resources.resources.getResource(name);
				var amountGained = rewards.gainedResources.getResource(name);
                var amountDiscarded = rewards.discardedResources.getResource(name);
                var amountSelected = rewards.selectedResources.getResource(name);
                var amountKept = amountOriginal - amountDiscarded + amountSelected;
                var amountFound = amountGained + amountDiscarded - amountSelected;
                if (amountKept >= 1) {
                    $("#resultlist-inventorymanagement-kept ul").append(
                        UIConstants.getResourceLi(name, amountKept)
                    );
                }
                if (amountFound >= 1) {
                    $("#resultlist-inventorymanagement-found ul").append(
                        UIConstants.getResourceLi(name, amountFound)
                    );
                }
                
                selectedCapacity += amountKept;
            }
            
            $("#resultlist-inventorymanagement-kept li").click(onLiClicked);
            $("#resultlist-inventorymanagement-found li").click(onLiClicked);
            
            var emptySlots = 3;
			for (var j = 0; j < emptySlots; j++) {
                $("#resultlist-inventorymanagement-kept ul").append(UIConstants.getItemSlot(null));
            }
            
            this.uiFunctions.generateCallouts("#resultlist-inventorymanagement-kept");
            this.uiFunctions.generateCallouts("#resultlist-inventorymanagement-found");
            
            bagComponent.selectedCapacity = selectedCapacity;
            
            this.pendingListUpdate = false;
        },
    
	});

    return UIOutPopupInventorySystem;
});
