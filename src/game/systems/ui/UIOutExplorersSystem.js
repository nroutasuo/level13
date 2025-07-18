define([
	'ash',
	'utils/UIState',
	'utils/UIList',
	'utils/ValueCache',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/UIConstants',
	'game/constants/DialogueConstants',
	'game/constants/ExplorerConstants',
	'game/components/sector/events/RecruitComponent',
	'game/nodes/PlayerLocationNode',
	'game/nodes/player/PlayerStatsNode',
], function (Ash, UIState, UIList, ValueCache, GameGlobals, GlobalSignals, UIConstants, DialogueConstants, ExplorerConstants, RecruitComponent, PlayerLocationNode, PlayerStatsNode) {

	let UIOutExplorersSystem = Ash.System.extend({
		
		playerLocationNodes: null,
		playerStatsNodes: null,
		
		explorerSlotElementsByType: {},

		isPendingExplorerStatusUpdate: false,

		constructor: function () {
			this.initElements();
			return this;
		},

		addToEngine: function (engine) {
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			
			GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.onTabChanged);
			GlobalSignals.add(this, GlobalSignals.actionCompletedSignal, this.onActionCompleted);
			GlobalSignals.add(this, GlobalSignals.dialogueCompletedSignal, this.onDialogueCompleted);
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
			let slotsContainer = $("#container-party-slots");
			
			for (k in ExplorerConstants.explorerType) {
				let explorerType = ExplorerConstants.explorerType[k];
				let slotID = "explorer-slot-" + explorerType;
				let slot = "<div id='" + slotID + "' class='explorer-slot explorer-slot-big lvl13-box-1' data-explorertype='" + explorerType + "'>";
				slot += "<span class='explorer-slot-type-empty'>" + ExplorerConstants.getExplorerTypeDisplayName(explorerType) + "</span>";
				slot += "<span class='explorer-slot-type-selected'>" + ExplorerConstants.getExplorerTypeDisplayName(explorerType) + "</span>";
				slot += "<div class='explorer-slot-container'></div>";
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
				this.explorerSlotElementsByType[explorerType].container = $slot.find(".explorer-slot-container");
			}
		},

		update: function (time) {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			if (GameGlobals.gameState.uiStatus.isTransitioning) return;
			this.updateBubble();
			if (this.isPendingExplorerStatusUpdate) {
				this.updateExplorersStatus();
				this.isPendingExplorerStatusUpdate = false;
			}
		},
		
		refresh: function () {
			let explorersComponent = this.playerStatsNodes.head.explorers;

			let totalRecruited = explorersComponent.getAll().length;
			let totalSelected = explorersComponent.getParty().length;
			let totalUnselected = totalRecruited - totalSelected;

			let inCamp = GameGlobals.playerHelper.isInCamp();
			let recruitComponent = this.playerLocationNodes.head.entity.get(RecruitComponent);
			let hasRecruit = recruitComponent && recruitComponent.explorer != null;
			let showRecruits = GameGlobals.campHelper.getTotalNumImprovementsBuilt(improvementNames.inn) > 0 || hasRecruit;
			
			$("#tab-header h2").text("Exploration party");
			
			GameGlobals.uiFunctions.toggle($("#tab-explorers-section-recruits"), inCamp && showRecruits);
			GameGlobals.uiFunctions.toggle($("#tab-explorers-section-unselected"), inCamp);
			
			this.updateExplorers();
			this.updateExplorersStatus();
			this.refreshRecruits();
		},
		
		updateBubble: function () {
			let inCamp = GameGlobals.playerHelper.isInCamp();
			let hasSeenTab = GameGlobals.gameState.hasSeenTab(GameGlobals.uiFunctions.elementIDs.tabs.explorers);

			let bubbleNumber = 0;
			if (inCamp) { 
				bubbleNumber = this.getNumRecruits() + this.getNumUrgentDialogues() + this.getNumInjuredExplorersInParty() + this.getNumForcedExplorersNotInParty()
			}
			let isStatIncreaseAvailable = this.getIsStatIncreaseAvailable();
			
			let state = bubbleNumber + (isStatIncreaseAvailable ? 1000 : 0);
			
			if (!hasSeenTab) state = "!";

			UIState.refreshState(this, "bubble-num", state, function () {
				if (bubbleNumber > 0) {
					$("#switch-explorers .bubble").text(bubbleNumber);
					$("#switch-explorers .bubble").toggleClass("bubble-increase", false);
				} else if (isStatIncreaseAvailable) {
					$("#switch-explorers .bubble").text("");
					$("#switch-explorers .bubble").toggleClass("bubble-increase", true);
				} else {
					$("#switch-explorers .bubble").text(state);
					$("#switch-explorers .bubble").toggleClass("bubble-increase", false);
				}

				GameGlobals.uiFunctions.toggle("#switch-explorers .bubble", bubbleNumber > 0 || isStatIncreaseAvailable || !hasSeenTab);
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
				let talkAction = "start_explorer_dialogue_" + explorer.id;
				let costs = GameGlobals.playerActionsHelper.getCosts(recruitAction);
				
				let tr = "<tr>";
				tr += "<td>" + ExplorerConstants.getExplorerTypeDisplayName(explorerType) + " " + explorer.name + "</td>";
				tr += "<td class='list-ordinal'>" + UIConstants.getCostsSpans(recruitAction, costs) + "</td>";
				tr += "<td class='minwidth'>" + UIConstants.getExplorerDivSimple(explorer, false, false, false) + "</td>";
				tr += "<td class='list-ordinal'>" + (recruitComponent.isFoundAsReward ? this.getFoundRecruitIcon() : "") + "</td>";
				tr += "<td class='minwidth'><button class='action recruit-select' action='" + recruitAction + "'>Recruit</button></td>";
				tr += "<td class='minwidth'><button class='action recruit-select' action='" + talkAction + "'>Talk</button></td>";
				tr += "<td class='minwidth'>";
				if (GameGlobals.explorerHelper.isDismissable(explorer)) {
					tr += "<button class='action recruit-dismiss btn-secondary' action='dismiss_recruit_" + explorer.id + "'>Dismiss</button>";
				}
				tr += "</td>";
				tr += "</tr>";
				$table.append(tr);
			}

			GameGlobals.uiFunctions.createButtons("#recruits-container table");
			GameGlobals.uiFunctions.generateInfoCallouts("#recruits-container table");
		},

		updateExplorers: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			
			let explorersComponent = this.playerStatsNodes.head.explorers;
			let explorers = explorersComponent.getAll();
			let party = explorersComponent.getParty();
			let inCamp = GameGlobals.playerHelper.isInCamp();

			let forcedExplorerID = GameGlobals.explorerHelper.getForcedExplorerID();
			
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
				let questTextKey = this.getQuestTextKey(explorer);
				let isForced = explorer.id == forcedExplorerID;
				explorer.hasUrgentDialogue = this.hasExplorerUrgentDialogue(explorer);
				var li = "<li>" + UIConstants.getExplorerDivWithOptions(explorer, true, inCamp, questTextKey, isForced) + "</li>";
				$("#list-explorers").append(li);
			}
			
			let sys = this;
			$("#list-explorers .npc").each(function () {
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
			
			GameGlobals.uiFunctions.generateInfoCallouts("#list-explorers");
			GameGlobals.uiFunctions.generateInfoCallouts("#container-party-slots");
			GameGlobals.uiFunctions.createButtons("#list-explorers");
			GameGlobals.uiFunctions.createButtons("#container-party-slots");

			GlobalSignals.elementCreatedSignal.dispatch();
		},
		
		updateSelectedExplorerSlot: function (explorerType, explorer, inCamp) {
			let elements = this.explorerSlotElementsByType[explorerType];
			let $slot = elements.slot;
			let $container = elements.container;

			let forcedExplorerID = GameGlobals.explorerHelper.getForcedExplorerID();
			
			GameGlobals.uiFunctions.toggle($slot.find(".explorer-slot-type-empty"), explorer == null);
			GameGlobals.uiFunctions.toggle($slot.find(".explorer-slot-type-selected"), explorer != null);
			
			$container.empty();
			
			if (explorer) {
				let questTextKey = this.getQuestTextKey(explorer);
				let isForced = explorer.id == forcedExplorerID;
				explorer.hasUrgentDialogue = this.hasExplorerUrgentDialogue(explorer);
				$container.append(UIConstants.getExplorerDivWithOptions(explorer, true, inCamp, questTextKey, isForced));
			}
		},

		updateExplorersStatus: function () {
			let inCamp = GameGlobals.playerHelper.isInCamp();
			let explorersComponent = this.playerStatsNodes.head.explorers;
			let sys = this;

			let forcedExplorerID = GameGlobals.explorerHelper.getForcedExplorerID();
			
			// all explorers
			$("#container-tab-two-explorers .npc-container").each(function () {
				let id = $(this).attr("data-explorerid");
				let explorerVO = explorersComponent.getExplorerByID(id);

				if (!explorerVO) return;

				let isSelected = explorerVO && explorerVO.inParty == true;
				let questTextKey = sys.getQuestTextKey(explorerVO);
				let isForced = explorerVO.id == forcedExplorerID;
				let isForcedNotInParty = isForced && !explorerVO.inParty;

				let hasUrgentDialogue = sys.hasExplorerUrgentDialogue(explorerVO, true);

				explorerVO.hasUrgentDialogue = hasUrgentDialogue;
				
				// comparison
				let comparison = explorersComponent.getExplorerComparison(explorerVO);
				let isValidComparison = comparison != null;
				let comparisonIndicator = $(this).find(".item-comparison-indicator");				
				$(comparisonIndicator).toggleClass("indicator-equipped", isSelected);
				$(comparisonIndicator).toggleClass("indicator-increase", !isSelected && isValidComparison && comparison > 0);
				$(comparisonIndicator).toggleClass("indicator-even", !isSelected && isValidComparison && comparison == 0);
				$(comparisonIndicator).toggleClass("indicator-decrease", !isSelected && isValidComparison && comparison < 0);
				$(comparisonIndicator).toggleClass("indicator-unique", !isSelected && !isValidComparison);

				// heal button
				let healButton = $(this).find(".btn-heal-explorer");
				GameGlobals.uiFunctions.toggle(healButton, !inCamp && explorerVO.injuredTimer > 0);
				
				// dialogue
				let dialogueIndicator = $(this).find(".npc-dialogue-indicator");	
				$(dialogueIndicator).toggleClass("indicator-disabled", !hasUrgentDialogue);
				$(dialogueIndicator).toggleClass("indicator-urgent", hasUrgentDialogue);

				// quest
				let questIndicator = $(this).find(".npc-quest-indicator");
				$(questIndicator).toggleClass("hidden", questTextKey == null);

				// callout
				let calloutContent = UIConstants.getExplorerCallout(explorerVO, true, inCamp, false, questTextKey, isForced);
				UIConstants.updateCalloutContent($(this), calloutContent)

				// bubble
				let hasBubble = hasUrgentDialogue || isForcedNotInParty;
				let bubble = $(this).find(".bubble");
				$(bubble).toggleClass("hidden", !hasBubble);
			});
		},

		hasExplorerUrgentDialogue: function (explorerVO, skipCache) {
			if (!explorerVO) return false;
			let timestamp = GameGlobals.gameState.lastActionTimestamp;
			if (skipCache) timestamp = new Date().getTime();
			return ValueCache.getValue("ExplorerHasUrgentDialogue-" + explorerVO.id, 10, timestamp, () => {
				let status = GameGlobals.dialogueHelper.getExplorerDialogueStatus(explorerVO, DialogueConstants.dialogueSettings.interact);
				return status == DialogueConstants.STATUS_URGENT || status == DialogueConstants.STATUS_FORCED;
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
		
		getNumUrgentDialogues: function () {
			let result = 0;
			let explorers = GameGlobals.playerHelper.getExplorers();
			for (let i = 0; i < explorers.length; i++) {
				let explorerVO = explorers[i];
				if (this.hasExplorerUrgentDialogue(explorerVO)) {
					result++;
				}
			}
			return result;
		},

		getNumInjuredExplorersInParty: function () {
			let result = 0;

			let explorers = GameGlobals.playerHelper.getExplorers();

			for (let i = 0; i < explorers.length; i++) {
				let explorerVO = explorers[i];
				if (!explorerVO.inParty) continue;
				if (explorerVO.injuredTimer >= 0) result++;
			}
			return result;
		},

		getForcedExplorerVO: function () {
			let forcedExplorerID = GameGlobals.explorerHelper.getForcedExplorerID();
			return GameGlobals.playerHelper.getExplorerByID(forcedExplorerID);
		},

		getNumForcedExplorersNotInParty: function () {
			let forcedExplorerVO = this.getForcedExplorerVO();
			return forcedExplorerVO ? !forcedExplorerVO.inParty : 0;
		},
		
		getIsStatIncreaseAvailable: function () {
			let inCamp = GameGlobals.playerHelper.isInCamp();
			if (!inCamp) return false;
			
			let explorersComponent = this.playerStatsNodes.head.explorers;
			let explorers = explorersComponent.getAll();
			
			let forcedExplorerVO = this.getForcedExplorerVO();
			let forcedExplorerType = forcedExplorerVO ? ExplorerConstants.getExplorerTypeForAbilityType(forcedExplorerVO.abilityType) : null;
			
			for (let i = 0; i < explorers.length; i++) {
				let explorer = explorers[i];
				if (explorer.inParty) continue;
				if (explorer.injuredTimer >= 0) continue;

				let type = ExplorerConstants.getExplorerTypeForAbilityType(explorer.abilityType);
				if (forcedExplorerType && forcedExplorerType == type) continue;				
				
				let comparison = explorersComponent.getExplorerComparison(explorer);
				if (comparison > 0) return true;
			}
			
			return false;
		},
		
		highlightExplorerType: function (explorerType) {
			let explorersComponent = this.playerStatsNodes.head.explorers;
			$("#list-explorers .npc-container").each(function () {
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

		getQuestTextKey: function (explorerVO) {
			if (!explorerVO) return null;
			let storyID = GameGlobals.storyHelper.getExplorerQuestStory(explorerVO);
			if (!storyID) return null;
			return "story.stories." + storyID + "_quest_description";
		},
		
		onCampEventStarted: function () {
			this.refreshRecruits();
		},
		
		onCampEventEnded: function () {
			this.refreshRecruits();
		},
		
		onTabChanged: function () {
			if (GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.explorers) {
				this.refresh();
			}
		},
		
		onExplorersChanged: function () {
			this.updateExplorers();
			this.highlightExplorerType(null);

			this.isPendingExplorerStatusUpdate = true;
		},

		onActionCompleted: function () {
			this.isPendingExplorerStatusUpdate = true;
		},

		onDialogueCompleted: function () {
			this.isPendingExplorerStatusUpdate = true;
		}
	
	});

	return UIOutExplorersSystem;
});
