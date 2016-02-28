define([
    'ash',
    'game/constants/UIConstants',
    'game/constants/ItemConstants',
    'game/nodes/player/ItemsNode',
    'game/components/common/ResourcesComponent',
    'game/components/player/StaminaComponent',
    'game/components/player/VisionComponent',
], function (Ash, UIConstants, ItemConstants, ItemsNode, ResourcesComponent, StaminaComponent, VisionComponent) {
    var UIOutFollowersSystem = Ash.System.extend({

		uiFunctions : null,
		gameState: null,

		tabChangedSignal: null,

		itemNodes: null,
		
		bubbleNumber: 0,
		followerCount: -1,
		lastShownFollowerCount: -1,

		constructor: function (uiFunctions, tabChangedSignal, gameState) {
			this.gameState = gameState;
			this.uiFunctions = uiFunctions;
			this.tabChangedSignal = tabChangedSignal;

			var system = this;
			$("#container-tab-two-followers .whole").mouseleave(function (e) {
				system.setSelectedItemLI(null);
			});

			return this;
		},

		addToEngine: function (engine) {
			this.itemNodes = engine.getNodeList(ItemsNode);
			this.initButtonListeners();
			var itemsComponent = this.itemNodes.head.items;
            this.followerCount = itemsComponent.getCountByType(ItemConstants.itemTypes.follower);
            this.updateItems();
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
		},

		removeFromEngine: function (engine) {
			this.itemNodes = null;
			this.tabChangedSignal.remove(this.onTabChanged);
			$("button[action='discard_item']").click(null);
		},

		update: function (time) {
			var isActive = this.uiFunctions.gameState.uiStatus.currentTab === this.uiFunctions.elementIDs.tabs.followers;
			var itemsComponent = this.itemNodes.head.items;
            
			this.updateBubble();
			
			if (!isActive) return;

			// Header
			$("#tab-header h2").text("Party");

            this.followerCount = itemsComponent.getCountByType(ItemConstants.itemTypes.follower);
            if (this.followerCount !== this.lastShownFollowerCount) {
                this.updateItems();
            }
		},
        
        updateBubble: function () {
            this.bubbleNumber = Math.max(0, this.followerCount - this.lastShownFollowerCount);
            $("#switch-followers .bubble").text(this.bubbleNumber);
            $("#switch-followers .bubble").toggle(this.bubbleNumber > 0);
        },

		updateItems: function () {
            this.lastShownFollowerCount = this.followerCount;
			var itemsComponent = this.itemNodes.head.items;
			var items = itemsComponent.getUnique();
			$("#list-followers").empty();
			for (var i = 0; i < items.length; i++) {
				var item = items[i];
				if (item.type !== ItemConstants.itemTypes.follower) continue;
				
				var count = itemsComponent.getCount(item);
				var li = "<li>" + UIConstants.getItemDiv(item, -1, false, false) + "</li>";
				$("#list-followers").append(li);
			}

			var hasFollowers = $("#list-followers li").length > 0;
			var showFollowers = hasFollowers || this.gameState.unlockedFeatures.followers;
			$("#list-followers").toggle(hasFollowers);
			$("#header-followers").toggle(showFollowers);
			$("#followers-empty").toggle(showFollowers && !hasFollowers);
			this.uiFunctions.generateCallouts("#list-followers");
		},
    
	});

    return UIOutFollowersSystem;
});
