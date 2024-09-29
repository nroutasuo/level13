define([
	'ash',
	'utils/UIState',
	'utils/UIList',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/UIConstants',
	'game/constants/ExplorerConstants',
	'game/components/sector/events/RecruitComponent',
	'game/components/sector/events/RefugeesComponent',
	'game/components/sector/events/VisitorComponent',
	'game/nodes/PlayerLocationNode',
	'game/nodes/player/PlayerStatsNode',
], function (Ash, UIState, UIList, GameGlobals, GlobalSignals, UIConstants, ExplorerConstants, RecruitComponent, RefugeesComponent, VisitorComponent, PlayerLocationNode, PlayerStatsNode) {
	var UIOutExplorersSystem = Ash.System.extend({
		
		playerLocationNodes: null,
		playerStatsNodes: null,
		
		explorerSlotElementsByType: {},

		constructor: function () {
			this.initElements();
			return this;
		},

		addToEngine: function (engine) {
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			
			GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.onTabChanged);
			GlobalSignals.add(this, GlobalSignals.explorersChangedSignal, this.onExplorersChanged);
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
			for (k in ExplorerConstants.explorerType) {
				let explorerType = ExplorerConstants.explorerType[k];
				let slotID = "explorer-slot-" + explorerType;
				let slot = "<div id='" + slotID + "' class='explorer-slot explorer-slot-big lvl13-box-1' data-explorertype='" + explorerType + "'>";
				slot += "<span class='explorer-slot-type-empty'>" + ExplorerConstants.getExplorerTypeDisplayName(explorerType) + "</span>";
				slot += "<span class='explorer-slot-type-selected'>" + ExplorerConstants.getExplorerTypeDisplayName(explorerType) + "</span>";
				slot += "<div class='explorer-slot-image'></div>";
				slot += "</div> ";
				slotsContainer.append(slot);
				
				let $slot =  $("#" + slotID);
				
				$slot.hover(function () {
					sys.highlightExplorerType(explorerType);
				}, function () {
					sys.highlightExplorerType(null);
				});
				
				this.explorerSlotElementsByType[explorerType] = {};
				this.explorerSlotElementsByType[explorerType].slot = $slot;
				this.explorerSlotElementsByType[explorerType].container = $slot.find(".explorer-slot-image");
			}

			this.visitorList = UIList.create(this, $("#visitors-container table"), this.createVisitorListItem, this.updateVisitorListItem);
		},

		update: function (time) {
			this.updateBubble();
		},
		
		refresh: function () {
			let explorersComponent = this.playerStatsNodes.head.explorers;
			let totalRecruited = explorersComponent.getAll().length;
			let totalSelected = explorersComponent.getParty().length;
			let totalUnselected = totalRecruited - totalSelected;
			let inCamp = GameGlobals.playerHelper.isInCamp();
			let recruitComponent = this.playerLocationNodes.head.entity.get(RecruitComponent);
			let hasRecruit = recruitComponent && recruitComponent.explorer != null;
			let showVisitors = GameGlobals.campHelper.getTotalNumImprovementsBuilt(improvementNames.inn) > 0 || hasRecruit;
			
			$("#tab-header h2").text("Exploration party");
			
			GameGlobals.uiFunctions.toggle($("#tab-explorers-section-recruits"), inCamp && showVisitors);
			GameGlobals.uiFunctions.toggle($("#tab-explorers-section-unselected"), inCamp);
			
			this.updateExplorers();
			this.refreshRecruits();
			this.refreshVisitors();
		},
		
		updateBubble: function () {
			let inCamp = GameGlobals.playerHelper.isInCamp();
			let bubbleNumber = inCamp ? this.getNumRecruits() + this.getNumVisitors() + this.getNumRefugees() : 0;
			let isStatIncreaseAvailable = this.getIsStatIncreaseAvailable();
			
			let state = bubbleNumber + (isStatIncreaseAvailable ? 1000 : 0);
			UIState.refreshState(this, "bubble-num", state, function () {
				if (isStatIncreaseAvailable) {
					$("#switch-explorers .bubble").text("");
					$("#switch-explorers .bubble").toggleClass("bubble-increase", true);
				} else {
					$("#switch-explorers .bubble").text(bubbleNumber);
					$("#switch-explorers .bubble").toggleClass("bubble-increase", false);
				}
				GameGlobals.uiFunctions.toggle("#switch-explorers .bubble", bubbleNumber > 0 || isStatIncreaseAvailable);
			});
		},
		
		refreshRecruits: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			
			let $table = $("#recruits-container table");
			$table.empty();
			
			let recruitComponent = this.playerLocationNodes.head.entity.get(RecruitComponent);
			GameGlobals.uiFunctions.toggle($("#recruits-empty-message"), recruitComponent == null);
			if (recruitComponent && recruitComponent.explorer) {
				let explorer = recruitComponent.explorer;
				let explorerType = ExplorerConstants.getExplorerTypeForAbilityType(explorer.abilityType);
				let recruitAction = "recruit_explorer_" + explorer.id;
				let costs = GameGlobals.playerActionsHelper.getCosts(recruitAction);
				
				let tr = "<tr>";
				tr += "<td>" + ExplorerConstants.getExplorerTypeDisplayName(explorerType) + " " + explorer.name + "</td>";
				tr += "<td class='list-ordinal'>" + UIConstants.getCostsSpans(recruitAction, costs) + "</td>";
				tr += "<td class='minwidth'>" + UIConstants.getExplorerDiv(explorer, false, false, false) + "</td>";
				tr += "<td class='list-ordinal'>" + (recruitComponent.isFoundAsReward ? this.getFoundRecruitIcon() : "") + "</td>";
				tr += "<td class='minwidth'><button class='action recruit-select' action='" + recruitAction + "'>Recruit</button></td>";
				tr += "<td class='minwidth'><button class='action recruit-dismiss btn-secondary' action='dismiss_recruit_" + explorer.id + "'>Dismiss</button></td>";
				tr += "</tr>";
				$table.append(tr);
			}

			GameGlobals.uiFunctions.createButtons("#recruits-container table");
			GameGlobals.uiFunctions.generateInfoCallouts("#recruits-container table");
		},

		refreshVisitors: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			
			let visitorData = this.getCampVisitorData();
			let numNewListItems = UIList.update(this.visitorList, visitorData);

			GameGlobals.uiFunctions.toggle($("#visitors-empty-message"), visitorData.length == 0);

			if (numNewListItems.length > 0) {
				GameGlobals.uiFunctions.createButtons("#visitors-container table");
				GlobalSignals.elementCreatedSignal.dispatch();
			}
		},

		getCampVisitorData: function () {
			let result = [];

			let visitorComponent = this.playerLocationNodes.head.entity.get(VisitorComponent);
			if (visitorComponent) {
				result.push({ id: "visitor", type: "visitor" });
			}

			let refugeesComponent = this.playerLocationNodes.head.entity.get(RefugeesComponent);
			if (refugeesComponent) {
				result.push({ id: "refugees", type: "refugees", num: refugeesComponent.num, acceptAction: "accept_refugees", dismissAction: "dismiss_refugees" });
			}

			return result;
		},

		updateExplorers: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			
			var explorersComponent = this.playerStatsNodes.head.explorers;
			var explorers = explorersComponent.getAll();
			let party = explorersComponent.getParty();
			let maxRecruited = GameGlobals.campHelper.getCurrentMaxExplorersRecruited();
			let inCamp = GameGlobals.playerHelper.isInCamp();
			
			$("#explorers-max").text("Total explorers: " + explorers.length + "/" + maxRecruited);
			
			// slots
			let selectedExplorers = [];
			for (k in ExplorerConstants.explorerType) {
				let explorerType = ExplorerConstants.explorerType[k];
				let selectedExplorer = explorersComponent.getExplorerInPartyByType(explorerType);
				this.updateSelectedExplorerSlot(explorerType, selectedExplorer, inCamp);
				selectedExplorers.push(selectedExplorer);
			}
			
			// other (non-selected) explorers
			explorers.sort(UIConstants.sortExplorersByType);
			$("#list-explorers").empty();
			for (let i = 0; i < explorers.length; i++) {
				var explorer = explorers[i];
				if (selectedExplorers.indexOf(explorer) >= 0) continue;
				var li = "<li>" + UIConstants.getExplorerDiv(explorer, true, inCamp, false) + "</li>";
				$("#list-explorers").append(li);
			}
			
			let sys = this;
			$("#list-explorers .item").each(function () {
				let id = $(this).attr("data-explorerid");
				let explorer = explorersComponent.getExplorerByID(id);
				let explorerType = ExplorerConstants.getExplorerTypeForAbilityType(explorer.abilityType);
				$(this).hover(function () {
					sys.highlightExplorerType(explorerType);
				}, function () {
					sys.highlightExplorerType(null);
				});
			});
			
			let hasExplorers = explorers.length > 0;
			let hasUnselectedExplorers = explorers.length - party.length > 0;
			let showExplorers = hasExplorers || GameGlobals.gameState.unlockedFeatures.explorers;
			
			GameGlobals.uiFunctions.toggle("#list-explorers", hasExplorers && hasUnselectedExplorers);
			GameGlobals.uiFunctions.toggle("#header-explorers", showExplorers);
			GameGlobals.uiFunctions.toggle("#explorers-empty", showExplorers && !hasUnselectedExplorers);
			
			GameGlobals.uiFunctions.createButtons("#list-explorers");
			GameGlobals.uiFunctions.createButtons("#container-party-slots");
			GameGlobals.uiFunctions.generateInfoCallouts("#list-explorers");
			GameGlobals.uiFunctions.generateInfoCallouts("#container-party-slots");
		},
		
		updateSelectedExplorerSlot: function (explorerType, explorer, inCamp) {
			let elements = this.explorerSlotElementsByType[explorerType];
			let $slot = elements.slot;
			let $container = elements.container;
			
			GameGlobals.uiFunctions.toggle($slot.find(".explorer-slot-type-empty"), explorer == null);
			GameGlobals.uiFunctions.toggle($slot.find(".explorer-slot-type-selected"), explorer != null);
			
			$container.empty();
			
			if (explorer) {
				$container.append(UIConstants.getExplorerDiv(explorer, true, inCamp, true));
			}
		},
		
		updateComparisonIndicators: function () {
			let explorersComponent = this.playerStatsNodes.head.explorers;
			
			$("#list-explorers .item").each(function () {
				let id = $(this).attr("data-explorerid");
				let explorer = explorersComponent.getExplorerByID(id);
				let comparison = explorersComponent.getExplorerComparison(explorer);
				let isSelected = explorer.inParty == true;
				
				let indicator = $(this).find(".item-comparison-indicator");
				
				$(indicator).toggleClass("indicator-equipped", isSelected);
				$(indicator).toggleClass("indicator-increase", !isSelected && comparison > 0);
				$(indicator).toggleClass("indicator-even", !isSelected && comparison == 0);
				$(indicator).toggleClass("indicator-decrease", !isSelected && comparison < 0);
			});
		},
		
		createVisitorListItem: function () {
			let li = {};
			let div = UIConstants.getNPCDiv();

			let tr = "<tr>";
			tr += "<td class='visitor-type'></td>";
			tr += "<td>" + div + "</td>";
			tr += "<td class='list-ordinal'></td>";
			tr += "<td class='minwidth'><button class='action visitor-accept'>Accept</button></td>";
			tr += "<td class='minwidth'><button class='action visitor-dismiss btn-secondary'>Dismiss</button></td>";
			tr += "</tr>";

			li.$root = $(tr);
			li.$typeLabel = li.$root.find(".visitor-type");
			li.$numLabel = li.$root.find(".list-ordinal");
			li.$acceptButton = li.$root.find(".visitor-accept");
			li.$dismissButton = li.$root.find(".visitor-dismiss");

			return li;
		},
		
		updateVisitorListItem: function (li, data) {
			let acceptAction = data.acceptAction || null;
			let dismissAction = data.dismissAction || null;

			li.$typeLabel.html(data.type);
			li.$numLabel.html(data.num || "");

			li.$acceptButton.attr("action", acceptAction);
			li.$dismissButton.attr("action", dismissAction);

			GameGlobals.uiFunctions.toggle(li.$acceptButton, acceptAction != null);
			GameGlobals.uiFunctions.toggle(li.$dismissButton, dismissAction != null);
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
		
		getNumVisitors: function () {
			let visitorComponent = this.playerLocationNodes.head.entity.get(VisitorComponent);
			if (visitorComponent) return 1;
			return 0;
		},
		
		getNumRefugees: function () {
			let refugeesComponent = this.playerLocationNodes.head.entity.get(RefugeesComponent);
			if (refugeesComponent) return 1;
			return 0;
		},
		
		getIsStatIncreaseAvailable: function () {
			let inCamp = GameGlobals.playerHelper.isInCamp();
			if (!inCamp) return false;
			
			let explorersComponent = this.playerStatsNodes.head.explorers;
			let explorers = explorersComponent.getAll();
			
			for (let i = 0; i < explorers.length; i++) {
				let explorer = explorers[i];
				if (explorer.inParty) continue;
				
				let comparison = explorersComponent.getExplorerComparison(explorer);
				if (comparison > 0) return true;
			}
			
			return false;
		},
		
		highlightExplorerType: function (explorerType) {
			let explorersComponent = this.playerStatsNodes.head.explorers;
			$("#list-explorers .item").each(function () {
				let id = $(this).attr("data-explorerid");
				let explorer = explorersComponent.getExplorerByID(id);
				let type = ExplorerConstants.getExplorerTypeForAbilityType(explorer.abilityType);
				if (explorerType && explorer && explorerType == type) {
					$(this).toggleClass("highlighted", true);
				} else {
					$(this).toggleClass("highlighted", false);
				}
			});
			$.each($("#container-party-slots .explorer-slot"), function () {
				var rawType = $(this).attr("data-explorertype");
				if (explorerType && explorerType == rawType) {
					$(this).toggleClass("highlighted", true);
				} else {
					$(this).toggleClass("highlighted", false);
				}
			});
		},
		
		onCampEventStarted: function () {
			this.refreshRecruits();
			this.refreshVisitors();
		},
		
		onCampEventEnded: function () {
			this.refreshRecruits();
			this.refreshVisitors();
		},
		
		onTabChanged: function () {
			if (GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.explorers) {
				this.refresh();
				this.updateComparisonIndicators();
			}
		},
		
		onExplorersChanged: function () {
			this.updateExplorers();
			this.updateComparisonIndicators();
			this.highlightExplorerType(null);
		},
	
	});

	return UIOutExplorersSystem;
});
