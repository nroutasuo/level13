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
			let sys = this;
			var slotsContainer = $("#container-party-slots");
			for (k in FollowerConstants.followerType) {
				let followerType = FollowerConstants.followerType[k];
				let slotID = "follower-slot-" + followerType;
				let slot = "<div id='" + slotID + "' class='follower-slot follower-slot-big lvl13-box-1' data-followertype='" + followerType + "'>";
				slot += "<span class='follower-slot-type-empty'>" + FollowerConstants.getFollowerTypeDisplayName(followerType) + "</span>";
				slot += "<span class='follower-slot-type-selected'>" + FollowerConstants.getFollowerTypeDisplayName(followerType) + "</span>";
				slot += "<div class='follower-slot-image'></div>";
				slot += "</div> ";
				slotsContainer.append(slot);
				
				let $slot =  $("#" + slotID);
				
				$slot.hover(function () {
					sys.highlightFollowerType(followerType);
				}, function () {
					sys.highlightFollowerType(null);
				});
				
				this.followerSlotElementsByType[followerType] = {};
				this.followerSlotElementsByType[followerType].slot = $slot;
				this.followerSlotElementsByType[followerType].container = $slot.find(".follower-slot-image");
			}
		},

		update: function (time) {
			this.updateBubble();
		},
		
		refresh: function () {
			let followersComponent = this.playerStatsNodes.head.followers;
			let totalRecruited = followersComponent.getAll().length;
			let totalSelected = followersComponent.getParty().length;
			let totalUnselected = totalRecruited - totalSelected;
			let inCamp = GameGlobals.playerHelper.isInCamp();
			let recruitComponent = this.playerLocationNodes.head.entity.get(RecruitComponent);
			let hasRecruit = recruitComponent && recruitComponent.follower != null;
			let showVisitors = GameGlobals.campHelper.getTotalNumImprovementsBuilt(improvementNames.inn) > 0 || hasRecruit;
			
			$("#tab-header h2").text("Exploration party");
			
			GameGlobals.uiFunctions.toggle($("#tab-followers-section-recruits"), inCamp && showVisitors);
			GameGlobals.uiFunctions.toggle($("#tab-followers-section-unselected"), inCamp);
			
			this.updateFollowers();
			this.refreshRecruits();
		},
		
		updateBubble: function () {
			let inCamp = GameGlobals.playerHelper.isInCamp();
			var newBubbleNumber = inCamp ? this.getNumRecruits() : 0;
			if (this.bubbleNumber === newBubbleNumber)
				return;
			this.bubbleNumber = newBubbleNumber;
			$("#switch-followers .bubble").text(this.bubbleNumber);
			GameGlobals.uiFunctions.toggle("#switch-followers .bubble", this.bubbleNumber > 0);
		},
		
		refreshRecruits: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			
			let $table = $("#recruits-container table");
			$table.empty();
			
			var recruitComponent = this.playerLocationNodes.head.entity.get(RecruitComponent);
			GameGlobals.uiFunctions.toggle($("#recruits-empty-message"), recruitComponent == null);
			if (recruitComponent && recruitComponent.follower) {
				let follower = recruitComponent.follower;
				let followerType = FollowerConstants.getFollowerTypeForAbilityType(follower.abilityType);
				let tr = "<tr>";
				tr += "<td class='maxwidth'>" + FollowerConstants.getFollowerTypeDisplayName(followerType) + " " + follower.name + "</td>";
				tr += "<td>" + UIConstants.getFollowerDiv(follower, false, false, false) + "</td>";
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
			let party = followersComponent.getParty();
			let maxRecruited = GameGlobals.campHelper.getCurrentMaxFollowersRecruited();
			let inCamp = GameGlobals.playerHelper.isInCamp();
			
			$("#followers-max").text("Total followers: " + + followers.length + "/" + maxRecruited);
			
			// slots
			let selectedFollowers = [];
			for (k in FollowerConstants.followerType) {
				let followerType = FollowerConstants.followerType[k];
				let selectedFollower = followersComponent.getFollowerInPartyByType(followerType);
				this.updateSelectedFollowerSlot(followerType, selectedFollower, inCamp);
				selectedFollowers.push(selectedFollower);
			}
			
			// other (non-selected) followers
			followers.sort(UIConstants.sortFollowersByType);
			$("#list-followers").empty();
			for (let i = 0; i < followers.length; i++) {
				var follower = followers[i];
				if (selectedFollowers.indexOf(follower) >= 0) continue;
				var li = "<li>" + UIConstants.getFollowerDiv(follower, true, inCamp, false) + "</li>";
				$("#list-followers").append(li);
			}
			
			let sys = this;
			$("#list-followers .item").each(function () {
				let id = $(this).attr("data-followerid");
				let follower = followersComponent.getFollowerByID(id);
				let followerType = FollowerConstants.getFollowerTypeForAbilityType(follower.abilityType);
				$(this).hover(function () {
					sys.highlightFollowerType(followerType);
				}, function () {
					sys.highlightFollowerType(null);
				});
			});
			
			let hasFollowers = followers.length > 0;
			let hasUnselectedFollowers = followers.length - party.length > 0;
			let showFollowers = hasFollowers || GameGlobals.gameState.unlockedFeatures.followers;
			
			GameGlobals.uiFunctions.toggle("#list-followers", hasFollowers && hasUnselectedFollowers);
			GameGlobals.uiFunctions.toggle("#header-followers", showFollowers);
			GameGlobals.uiFunctions.toggle("#followers-empty", showFollowers && !hasUnselectedFollowers);
			
			GameGlobals.uiFunctions.generateCallouts("#list-followers");
			GameGlobals.uiFunctions.generateCallouts("#container-party-slots");
			GameGlobals.uiFunctions.generateButtonOverlays("#list-followers");
			GameGlobals.uiFunctions.generateButtonOverlays("#container-party-slots");
			GameGlobals.uiFunctions.registerActionButtonListeners("#list-followers");
			GameGlobals.uiFunctions.registerActionButtonListeners("#container-party-slots");
		},
		
		updateSelectedFollowerSlot: function (followerType, follower, inCamp) {
			let elements = this.followerSlotElementsByType[followerType];
			let $slot = elements.slot;
			let $container = elements.container;
			
			GameGlobals.uiFunctions.toggle($slot.find(".follower-slot-type-empty"), follower == null);
			GameGlobals.uiFunctions.toggle($slot.find(".follower-slot-type-selected"), follower != null);
			
			$container.empty();
			
			if (follower) {
				$container.append(UIConstants.getFollowerDiv(follower, true, inCamp, true));
			}
		},
		
		updateComparisonIndicators: function () {
			let followersComponent = this.playerStatsNodes.head.followers;
			
			$("#list-followers .item").each(function () {
				let id = $(this).attr("data-followerid");
				let follower = followersComponent.getFollowerByID(id);
				let comparison = followersComponent.getFollowerComparison(follower);
				let isSelected = follower.inParty == true;
				
				let indicator = $(this).find(".item-comparison-indicator");
				
				$(indicator).toggleClass("indicator-equipped", isSelected);
				$(indicator).toggleClass("indicator-increase", !isSelected && comparison > 0);
				$(indicator).toggleClass("indicator-even", !isSelected && comparison == 0);
				$(indicator).toggleClass("indicator-decrease", !isSelected && comparison < 0);
			});
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
		
		highlightFollowerType: function (followerType) {
			let followersComponent = this.playerStatsNodes.head.followers;
			$("#list-followers .item").each(function () {
				let id = $(this).attr("data-followerid");
				let follower = followersComponent.getFollowerByID(id);
				let type = FollowerConstants.getFollowerTypeForAbilityType(follower.abilityType);
				if (followerType && follower && followerType == type) {
					$(this).toggleClass("highlighted", true);
				} else {
					$(this).toggleClass("highlighted", false);
				}
			});
			$.each($("#container-party-slots .follower-slot"), function () {
				var rawType = $(this).attr("data-followertype");
				if (followerType && followerType == rawType) {
					$(this).toggleClass("highlighted", true);
				} else {
					$(this).toggleClass("highlighted", false);
				}
			});
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
				this.updateComparisonIndicators();
			}
		},
		
		onFollowersChanged: function () {
			this.updateFollowers();
			this.updateComparisonIndicators();
			this.highlightFollowerType(null);
		},
	
	});

	return UIOutFollowersSystem;
});
