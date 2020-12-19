define([
    'ash',
    'game/GameGlobals',
    'game/GlobalSignals',
    'game/constants/UIConstants',
    'game/constants/ItemConstants',
    'game/constants/FightConstants',
    'game/nodes/player/ItemsNode',
], function (Ash, GameGlobals, GlobalSignals, UIConstants, ItemConstants, FightConstants, ItemsNode) {
    var UIOutFollowersSystem = Ash.System.extend({

		itemNodes: null,
		
		bubbleNumber: -1,
		followerCount: -1,
		lastShownFollowerCount: -1,

		constructor: function () {
			return this;
		},

		addToEngine: function (engine) {
			this.itemNodes = engine.getNodeList(ItemsNode);
            
            GlobalSignals.add(this, GlobalSignals.gameStartedSignal, this.onGameStarted);
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
            $("#followers-max").text("Maximum followers: " + FightConstants.getMaxFollowers(GameGlobals.gameState.numCamps));
            this.updateItems();
        },
        
        updateBubble: function () {
            var newBubbleNumber = 0;// Math.max(0, this.followerCount - this.lastShownFollowerCount);
            if (this.bubbleNumber === newBubbleNumber)
                return;
            this.bubbleNumber = newBubbleNumber;
            $("#switch-followers .bubble").text(this.bubbleNumber);
            GameGlobals.uiFunctions.toggle("#switch-followers .bubble", this.bubbleNumber > 0);
        },

		updateItems: function () {
            if (GameGlobals.gameState.uiStatus.isHidden) return;
			var itemsComponent = this.itemNodes.head.items;
			var items = itemsComponent.getAllByType(ItemConstants.itemTypes.follower, true);
			$("#list-followers").empty();
			for (var i = 0; i < items.length; i++) {
				var item = items[i];
				var li = "<li>" + UIConstants.getItemDiv(itemsComponent, item, null, UIConstants.getItemCallout(item), true) + "</li>";
				$("#list-followers").append(li);
			}

			var hasFollowers = items.length > 0;
			var showFollowers = hasFollowers || GameGlobals.gameState.unlockedFeatures.followers;
			GameGlobals.uiFunctions.toggle("#list-followers", hasFollowers);
			GameGlobals.uiFunctions.toggle("#header-followers", showFollowers);
			GameGlobals.uiFunctions.toggle("#followers-empty", showFollowers && !hasFollowers);
			GameGlobals.uiFunctions.generateCallouts("#list-followers");
            this.lastShownFollowerCount = this.followerCount;
		},
        
        onGameStarted: function () {
            var itemsComponent = this.itemNodes.head.items;
            this.followerCount = itemsComponent.getCountByType(ItemConstants.itemTypes.follower);
            this.lastShownFollowerCount = this.followerCount;
        },
        
        onTabChanged: function () {
            if (GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.followers) {
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
