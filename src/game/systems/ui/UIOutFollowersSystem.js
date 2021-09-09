define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/UIConstants',
	'game/constants/ItemConstants',
	'game/constants/FightConstants',
	'game/components/sector/events/RecruitComponent',
	'game/nodes/PlayerLocationNode',
	'game/nodes/player/PlayerStatsNode',
], function (Ash, GameGlobals, GlobalSignals, UIConstants, ItemConstants, FightConstants, RecruitComponent, PlayerLocationNode, PlayerStatsNode) {
	var UIOutFollowersSystem = Ash.System.extend({
		
		playerLocationNodes: null,
		playerStatsNodes: null,
		
		bubbleNumber: -1,

		constructor: function () {
			return this;
		},

		addToEngine: function (engine) {
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			
			GlobalSignals.add(this, GlobalSignals.gameStartedSignal, this.onGameStarted);
			GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.onTabChanged);
			GlobalSignals.add(this, GlobalSignals.followersChangedSignal, this.onFollowersChanged);
		},

		removeFromEngine: function (engine) {
			this.playerLocationNodes = null;
			this.playerStatsNodes = null;
			GlobalSignals.removeAll(this);
		},

		update: function (time) {
			this.updateBubble();
		},
		
		refresh: function () {
			$("#tab-header h2").text("Exploration party");
			$("#followers-max").text("Maximum followers: " + GameGlobals.campHelper.getCurrentMaxFollowersRecruited());
			this.updateFollowers();
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

		updateFollowers: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			
			var followersComponent = this.playerStatsNodes.head.followers;
			var followers = followersComponent.getAll();
			$("#list-followers").empty();
			for (var i = 0; i < followers.length; i++) {
				var follower = followers[i];
				var li = "<li>" + UIConstants.getFollowerDiv(follower) + "</li>";
				$("#list-followers").append(li);
			}
			
			var hasFollowers = followers.length > 0;
			var showFollowers = hasFollowers || GameGlobals.gameState.unlockedFeatures.followers;
			GameGlobals.uiFunctions.toggle("#list-followers", hasFollowers);
			GameGlobals.uiFunctions.toggle("#header-followers", showFollowers);
			GameGlobals.uiFunctions.toggle("#followers-empty", showFollowers && !hasFollowers);
			GameGlobals.uiFunctions.generateCallouts("#list-followers");
			GameGlobals.uiFunctions.registerActionButtonListeners("#list-followers");
		},
		
		getNumRecruits: function () {
			var recruitComponent = this.playerLocationNodes.head.entity.get(RecruitComponent);
			if (recruitComponent) return 1;
			return 0;
		},
		
		onGameStarted: function () {
		},
		
		onTabChanged: function () {
			if (GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.followers) {
				this.refresh();
			}
		},
		
		onFollowersChanged: function () {
			this.updateFollowers();
		},
	
	});

	return UIOutFollowersSystem;
});
