define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/UIConstants',
	'game/constants/ItemConstants',
	'game/constants/FightConstants',
	'game/constants/FollowerConstants',
	'game/components/sector/events/RecruitComponent',
	'game/nodes/PlayerLocationNode',
	'game/nodes/player/PlayerStatsNode',
], function (Ash, GameGlobals, GlobalSignals, UIConstants, ItemConstants, FightConstants, FollowerConstants, RecruitComponent, PlayerLocationNode, PlayerStatsNode) {
	var UIOutFollowersSystem = Ash.System.extend({
		
		playerLocationNodes: null,
		playerStatsNodes: null,
		
		bubbleNumber: -1,
		
		followerSlotElementsByType: {},

		constructor: function () {
			this.initElements();
			return this;
		},

		addToEngine: function (engine) {
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			
			GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.onTabChanged);
			GlobalSignals.add(this, GlobalSignals.followersChangedSignal, this.onFollowersChanged);
			GlobalSignals.add(this, GlobalSignals.campEventStartedSignal, this.onCampEventStarted);
			GlobalSignals.add(this, GlobalSignals.campEventEndedSignal, this.onCampEventEnded);
		},

		removeFromEngine: function (engine) {
			this.playerLocationNodes = null;
			this.playerStatsNodes = null;
			GlobalSignals.removeAll(this);
		},
		
		initElements: function ()  {
			var slotsContainer = $("#container-party-slots");
			for (k in FollowerConstants.followerType) {
				let followerType = FollowerConstants.followerType[k];
				let slotID = "item-slot-" + followerType;
				let slot = "<div id='" + slotID + "' class='follower-slot follower-slot-big lvl13-box-1'>";
				slot += "<span class='follower-slot-type-empty'>" + FollowerConstants.getFollowerTypeDisplayName(followerType) + "</span>";
				slot += "<span class='follower-slot-type-selected'>" + FollowerConstants.getFollowerTypeDisplayName(followerType) + "</span>";
				slot += "<span class='follower-slot-follower'></span>";
				slot += "</div> ";
				slotsContainer.append(slot);
				
				let $slot =  $("#" + slotID);
				this.followerSlotElementsByType[followerType] = {};
				this.followerSlotElementsByType[followerType].slot = $slot;
				this.followerSlotElementsByType[followerType].container = $slot.find(".follower-slot-follower");
			}
		},

		update: function (time) {
			this.updateBubble();
		},
		
		refresh: function () {
			var followersComponent = this.playerStatsNodes.head.followers;
			let totalRecruited = followersComponent.getAll().length;
			let inCamp = GameGlobals.playerHelper.isInCamp();
			
			$("#tab-header h2").text("Exploration party");
			
			GameGlobals.uiFunctions.toggle($("#tab-followers-section-recruits"), inCamp && GameGlobals.campHelper.getTotalNumImprovementsBuilt(improvementNames.inn) > 0);
			GameGlobals.uiFunctions.toggle($("#tab-followers-section-unselected"), inCamp && totalRecruited > 0);
			
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
				let followerType = FollowerConstants.getFollowerTypeForAbilityType(follower.abilityType);
				let tr = "<tr>";
				tr += "<td class='maxwidth'>" + FollowerConstants.getFollowerTypeDisplayName(followerType) + " " + follower.name + "</td>";
				tr += "<td>" + UIConstants.getFollowerDiv(follower, false) + "</td>";
				tr += "<td>" + (recruitComponent.isFoundAsReward ? this.getFoundRecruitIcon() : "") + "</td>";
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
			let maxRecruited = GameGlobals.campHelper.getCurrentMaxFollowersRecruited();
			
			$("#followers-max").text("Total followers: " + + followers.length + "/" + maxRecruited);
			
			// slots
			let selectedFollowers = [];
			for (k in FollowerConstants.followerType) {
				let followerType = FollowerConstants.followerType[k];
				let selectedFollower = followersComponent.getFollowerInPartyByType(followerType);
				this.updateSelectedFollowerSlot(followerType, selectedFollower);
				selectedFollowers.push(selectedFollower);
			}
			
			// other followers
			$("#list-followers").empty();
			for (let i = 0; i < followers.length; i++) {
				var follower = followers[i];
				if (selectedFollowers.indexOf(follower) >= 0) continue;
				var li = "<li>" + UIConstants.getFollowerDiv(follower, true) + "</li>";
				$("#list-followers").append(li);
			}
			
			var hasFollowers = followers.length > 0;
			var showFollowers = hasFollowers || GameGlobals.gameState.unlockedFeatures.followers;
			
			GameGlobals.uiFunctions.toggle("#list-followers", hasFollowers);
			GameGlobals.uiFunctions.toggle("#header-followers", showFollowers);
			GameGlobals.uiFunctions.toggle("#followers-empty", showFollowers && !hasFollowers);
			
			GameGlobals.uiFunctions.generateCallouts("#list-followers");
			GameGlobals.uiFunctions.generateCallouts("#container-party-slots");
			GameGlobals.uiFunctions.registerActionButtonListeners("#list-followers");
			GameGlobals.uiFunctions.registerActionButtonListeners("#container-party-slots");
		},
		
		updateSelectedFollowerSlot: function (followerType, follower) {
			let elements = this.followerSlotElementsByType[followerType];
			let $slot = elements.slot;
			let $container = elements.container;
			
			GameGlobals.uiFunctions.toggle($slot.find(".follower-slot-type-empty"), follower == null);
			GameGlobals.uiFunctions.toggle($slot.find(".follower-slot-type-selected"), follower != null);
			
			$container.empty();
			
			if (follower) {
				$container.append(UIConstants.getFollowerDiv(follower, true));
			}
		},
		
		getFoundRecruitIcon: function () {
			var sunlit = $("body").hasClass("sunlit");
			var img = "<img src='img/eldorado/" + (sunlit ? "icon-star.png" : "icon-star-dark.png") + "' class='icon-ui-generic' alt='reward' />";
			return "<span class='icon info-callout-target info-callout-target-small' description='met while exploring'>" + img + "<span>";
		},
		
		getNumRecruits: function () {
			var recruitComponent = this.playerLocationNodes.head.entity.get(RecruitComponent);
			if (recruitComponent) return 1;
			return 0;
		},
		
		onCampEventStarted: function () {
			this.refreshRecruits();
		},
		
		onCampEventEnded: function () {
			this.refreshRecruits();
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
