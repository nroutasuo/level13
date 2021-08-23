define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/UIConstants',
	'game/constants/ItemConstants',
	'game/constants/FightConstants',
	'game/components/sector/events/RecruitComponent',
	'game/nodes/PlayerLocationNode',
	'game/nodes/player/ItemsNode',
], function (Ash, GameGlobals, GlobalSignals, UIConstants, ItemConstants, FightConstants, RecruitComponent, PlayerLocationNode, ItemsNode) {
	var UIOutFollowersSystem = Ash.System.extend({
		
		playerLocationNodes: null,
		itemNodes: null,
		
		bubbleNumber: -1,

		constructor: function () {
			return this;
		},

		addToEngine: function (engine) {
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			this.itemNodes = engine.getNodeList(ItemsNode);
			
			GlobalSignals.add(this, GlobalSignals.gameStartedSignal, this.onGameStarted);
			GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.onTabChanged);
			GlobalSignals.add(this, GlobalSignals.inventoryChangedSignal, this.onInventoryChanged);
			GlobalSignals.add(this, GlobalSignals.equipmentChangedSignal, this.onEquipmentChanged);
		},

		removeFromEngine: function (engine) {
			this.playerLocationNodes = null;
			this.itemNodes = null;
			GlobalSignals.removeAll(this);
		},

		update: function (time) {
			var itemsComponent = this.itemNodes.head.items;
			this.updateBubble();
		},
		
		refresh: function () {
			$("#tab-header h2").text("Exploration party");
			$("#followers-max").text("Maximum followers: " + GameGlobals.campHelper.getCurrentMaxFollowersRecruited());
			this.updateItems();
			this.refreshRecruits();
		},
		
		updateBubble: function () {
			var newBubbleNumber = this.getNumRecruits();
			if (this.bubbleNumber === newBubbleNumber)
				return;
			this.bubbleNumber = newBubbleNumber;
			$("#switch-followers .bubble").text(this.bubbleNumber);
			GameGlobals.uiFunctions.toggle("#switch-followers .bubble", this.bubbleNumber > 0);
		},
		
		refreshRecruits: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			
			// TODO FOLLOWERS call also when recruit leaves / arrives
			let $table = $("#recruits-container table");
			$table.empty();
			
			var recruitComponent = this.playerLocationNodes.head.entity.get(RecruitComponent);
			GameGlobals.uiFunctions.toggle($("#recruits-empty-message"), recruitComponent == null);
			if (recruitComponent && recruitComponent.follower) {
				let follower = recruitComponent.follower;
				let tr = "<tr>";
				tr += "<td class='item-name'>Follower</td>";
				tr += "<td><button class='action recruit-select' action='recruit_follower_" + follower.id + "'>Recruit</button></td>";
				tr += "<td><button class='action recruit-dismiss btn-secondary' action='dismiss_recruit_" + follower.id + "'>Dismiss</button></td>";
				tr += "</tr>";
				$table.append(tr);
			}

			GameGlobals.uiFunctions.generateButtonOverlays("#recruits-container table");
			GameGlobals.uiFunctions.generateCallouts("#recruits-container table");
			GameGlobals.uiFunctions.registerActionButtonListeners("#recruits-container table");
		},

		updateItems: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			// TODO FOLLOWERS
			/*
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
			*/
		},
		
		getNumRecruits: function () {
			var recruitComponent = this.playerLocationNodes.head.entity.get(RecruitComponent);
			if (recruitComponent) return 1;
			return 0;
		},
		
		onGameStarted: function () {
			var itemsComponent = this.itemNodes.head.items;
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
