define([
    'ash',
    'game/GlobalSignals',
    'game/constants/UIConstants',
    'game/constants/ItemConstants',
    'game/constants/FightConstants',
    'game/nodes/player/ItemsNode',
], function (Ash, GlobalSignals, UIConstants, ItemConstants, FightConstants, ItemsNode) {
    var UIOutFollowersSystem = Ash.System.extend({

		uiFunctions : null,
		gameState: null,

		itemNodes: null,
		
		bubbleNumber: -1,
		followerCount: -1,
		lastShownFollowerCount: -1,

		constructor: function (uiFunctions, gameState) {
			this.gameState = gameState;
			this.uiFunctions = uiFunctions;

			return this;
		},

		addToEngine: function (engine) {
			this.itemNodes = engine.getNodeList(ItemsNode);
			var itemsComponent = this.itemNodes.head.items;
            this.followerCount = itemsComponent.getCountByType(ItemConstants.itemTypes.follower);
            this.lastShownFollowerCount = this.followerCount;
            
            GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.onTabChanged);
            GlobalSignals.add(this, GlobalSignals.inventoryChangedSignal, this.onInventoryChanged);
            GlobalSignals.add(this, GlobalSignals.equipmentChangedSignal, this.onEquipmentChanged);
		},

		removeFromEngine: function (engine) {
			this.itemNodes = null;
            GlobalSignals.removeAll(this);
		},

		update: function (time) {
			var itemsComponent = this.itemNodes.head.items;
            
            this.followerCount = itemsComponent.getCountByType(ItemConstants.itemTypes.follower);
			this.updateBubble();
		},
        
        refresh: function () {
			$("#tab-header h2").text("Exploration party");
            $("#followers-max").text("Maximum followers: " + FightConstants.getMaxFollowers(this.gameState.numCamps));
            this.updateItems();
        },
        
        updateBubble: function () {
            var newBubbleNumber = Math.max(0, this.followerCount - this.lastShownFollowerCount);
            if (this.bubbleNumber === newBubbleNumber)
                return;
            this.bubbleNumber = newBubbleNumber;
            $("#switch-followers .bubble").text(this.bubbleNumber);
            this.uiFunctions.toggle("#switch-followers .bubble", this.bubbleNumber > 0);
        },

		updateItems: function () {
			var itemsComponent = this.itemNodes.head.items;
			var items = itemsComponent.getAllByType(ItemConstants.itemTypes.follower);
            console.log("update followers items: "+ items.length)
			$("#list-followers").empty();
			for (var i = 0; i < items.length; i++) {
				var item = items[i];
				var li = "<li>" + UIConstants.getItemDiv(itemsComponent, item, -1, UIConstants.getItemCallout(item), true) + "</li>";
				$("#list-followers").append(li);
			}

			var hasFollowers = $("#list-followers li").length > 0;
			var showFollowers = hasFollowers || this.gameState.unlockedFeatures.followers;
			this.uiFunctions.toggle("#list-followers", hasFollowers);
			this.uiFunctions.toggle("#header-followers", showFollowers);
			this.uiFunctions.toggle("#followers-empty", showFollowers && !hasFollowers);
			this.uiFunctions.generateCallouts("#list-followers");
            this.lastShownFollowerCount = this.followerCount;
		},
        
        onTabChanged: function () {
            if (this.uiFunctions.gameState.uiStatus.currentTab === this.uiFunctions.elementIDs.tabs.followers) {
                this.refresh();
            }
        },
        
        onInventoryChanged: function () {
            this.updateItems();
        },
        
        onEquipmentChanged: function () {
            this.updateItems();
        },
    
	});

    return UIOutFollowersSystem;
});
