define([
    'ash',
    'game/constants/UIConstants',
    'game/constants/FightConstants',
    'game/constants/ItemConstants',
    'game/nodes/ItemsNode',
    'game/components/common/ResourcesComponent',
    'game/components/player/StaminaComponent',
    'game/components/player/VisionComponent',
], function (Ash, UIConstants, FightConstants, ItemConstants, ItemsNode, ResourcesComponent, StaminaComponent, VisionComponent) {
    var UIOutBagSystem = Ash.System.extend({
	
		uiFunctions : null,
		gameState: null,
		
		tabChangedSignal: null,
		
		itemNodes: null,
	
		constructor: function (uiFunctions, tabChangedSignal, gameState) {
			this.gameState = gameState;
			this.uiFunctions = uiFunctions;
			this.tabChangedSignal = tabChangedSignal;
			
			var system = this;
			$("#container-tab-two-bag .golden-large").mouseleave(function (e) {
				system.setSelectedItemLI(null);
			});
			
			this.onTabChanged = function () {
				system.updateCrafting();
			};
			
			return this;
		},
	
		addToEngine: function (engine) {
			this.itemNodes = engine.getNodeList(ItemsNode);
			this.initButtonListeners();
			this.setSelectedItemLI(null);
			
			this.tabChangedSignal.add(this.onTabChanged);
		},
		
		initButtonListeners: function () {
			var itemsComponent = this.itemNodes.head.items;
			var uiFunctions = this.uiFunctions;
			var system = this;
			$("button[action='discard_item']").click(function (e) {
				var item = itemsComponent.selectedItem;
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
				uiFunctions.showConfirmation(
					"Are you sure you want to discard all of these items?",
					function () {
						itemsComponent.discardItems(item);
						itemsComponent.selectedItem = null;
						system.updateItemList();
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
			if (this.uiFunctions.gameState.uiStatus.currentTab !== this.uiFunctions.elementIDs.tabs.bag) return;
			
			var itemsComponent = this.itemNodes.head.items;
			var selectedItem = itemsComponent.selectedItem;
			
			// Header
			$("#tab-header h2").text("Bag");
			
			// Items
			var itemsComponent = this.itemNodes.head.items;
			var uniqueItems = itemsComponent.getUnique();
			this.updateItems(uniqueItems);
			
			// Description
			$("#items-empty").toggle(uniqueItems.length === 0);
			this.updateItemDetails(selectedItem, itemsComponent.getCount(selectedItem));
			
			// Additional infos
			this.updateStats();
		},
		
		updateItems: function (uniqueItems) {
			var itemListL = $("#bag-items li").length;
			var followerListL = $("#list-followers li").length;
			if (uniqueItems.length !== itemListL + followerListL) {
				this.updateItemLists();
			} else {
				this.refreshItemLists();
			}
		},
		
		updateCrafting: function () {
			if (this.uiFunctions.gameState.uiStatus.currentTab !== this.uiFunctions.elementIDs.tabs.bag) return;
			$("#self-craft table").empty();
			
			var itemList;
			var itemDefinition;
			var tr;
			for (var type in ItemConstants.itemDefinitions) {
				itemList = ItemConstants.itemDefinitions[type];
				for (var i in itemList) {
					itemDefinition = itemList[i];
					if (itemDefinition.craftable) {
						tr = "<tr><td><button class='action' action='craft_" + itemDefinition.id + "'>" + itemDefinition.name + "</button></td></tr>";
						$("#self-craft table").append(tr);
					}
				}
			}
			
			this.uiFunctions.registerActionButtonListeners("#self-craft");
			this.uiFunctions.generateButtonOverlays("#self-craft");
			this.uiFunctions.generateCallouts("#self-craft");
		},
		
		updateStats: function () {
			// TODO update only when necessary
			var playerStamina = this.itemNodes.head.entity.get(StaminaComponent);
			var itemsComponent = this.itemNodes.head.items;
			$("#self-status-fight-att").text("Fight strength: " + FightConstants.getPlayerAtt(playerStamina, itemsComponent));
			var attCalloutContent = FightConstants.getPlayerAttDesc(playerStamina, itemsComponent);
			UIConstants.updateCalloutContent("#self-status-fight-att", attCalloutContent);
			
			$("#self-status-fight-def").text("Fight defence: " + FightConstants.getPlayerDef(playerStamina, itemsComponent));
			var defCalloutContent = FightConstants.getPlayerDefDesc(playerStamina, itemsComponent);
			UIConstants.updateCalloutContent("#self-status-fight-def", defCalloutContent);
				
			var numCamps = this.gameState.numCamps;
			$("#self-status-fight-followers").toggle(this.gameState.unlockedFeatures.followers);
			if (this.gameState.unlockedFeatures.followers) {
				$("#self-status-fight-followers").text("Max followers: " + FightConstants.getMaxFollowers(numCamps));
				var defCalloutContent = "More camps allow more followers.";
				UIConstants.updateCalloutContent("#self-status-fight-followers", defCalloutContent);
			}
			
			var playerHealth = playerStamina.health;
			var playerVision = this.itemNodes.head.entity.get(VisionComponent).value;
			var scavengeEfficiency = Math.round(this.uiFunctions.playerActions.playerActionResultsHelper.getScavengeEfficiency() * 200) / 2;
			$("#self-status-efficiency-scavenge").text("Scavenge efficiency: " + scavengeEfficiency + "%");
			UIConstants.updateCalloutContent("#self-status-efficiency-scavenge", "health: " + Math.round(playerHealth) + "<br/>vision: " + Math.round(playerVision));
		},
		
		updateItemLists: function () {
			var itemsComponent = this.itemNodes.head.items;
			var items = itemsComponent.getUnique();
			$("#bag-items").empty();
			$("#list-followers").empty();
			var uiFunctions = this.uiFunctions;
			var UIOutBagSystem = this;
			for (var i = 0; i < items.length; i++) {
				var item = items[i];
				var li = UIConstants.getItemLI(item, itemsComponent.getCount(item), true);
				if (item.type != ItemConstants.itemTypes.follower) {
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
				var index = ($(this)).parent().children("li").index($(this));
				var item = items[index];
				var count = itemsComponent.getCount(item);
				$(this).children(".item-count").text(count + "x");
			});
		},
		
		updateItemDetails: function (selectedItem, count) {
			if (selectedItem) {
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
				$("#item-desc-div p#item-desc-equipped").text(selectedItem.equippable && !selectedItem.unequippable ? (selectedItem.equipped ? "Equipped" : "Not equipped") : "");
				$("#item-desc-div p#item-desc-desc").text(selectedItem.description);
		
				var isFollower = selectedItem.type === ItemConstants.itemTypes.follower;
				$("button[action='equip_item']").text(selectedItem.equipped ? "Unequip" : "Equip");
				$("button[action='equip_item']").toggle((!selectedItem.equipped && selectedItem.equippable) || (selectedItem.equipped && selectedItem.unequippable));
				$("button[action='discard_item']").text(isFollower ? "Part ways" : "Discard");
				$("button[action='discard_item_all']").toggle(count > 1);
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
		},
    });

    return UIOutBagSystem;
});
