define([
	'ash',
	'text/Text',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/UIConstants',
	'game/constants/CampConstants',
	'game/constants/ImprovementConstants',
	'game/constants/OccurrenceConstants',
	'game/constants/TextConstants',
	'game/constants/WorldConstants',
	'game/nodes/sector/CampNode',
	'game/nodes/PlayerPositionNode',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/tribe/TribeUpgradesNode',
	'game/components/common/PositionComponent',
	'game/components/common/ResourcesComponent',
	'game/components/common/ResourceAccumulationComponent',
	'game/components/player/HopeComponent',
	'game/components/type/LevelComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/sector/OutgoingCaravansComponent'
], function (
	Ash, Text, GameGlobals, GlobalSignals, UIConstants, CampConstants, ImprovementConstants, OccurrenceConstants, TextConstants, WorldConstants,
	CampNode, PlayerPositionNode, PlayerStatsNode, TribeUpgradesNode,
	PositionComponent, ResourcesComponent, ResourceAccumulationComponent, HopeComponent, LevelComponent, SectorImprovementsComponent, OutgoingCaravansComponent
) {
	var UIOutMilestonesSystem = Ash.System.extend({

		engine: null,

		campNodes: null,
		sortedCampNodes: null,
		playerPosNodes: null,
		playerStatsNodes: null,
		tribeUpgradesNodes: null,

		constructor: function () {
			return this;
		},

		addToEngine: function (engine) {
			this.engine = engine;
			this.campNodes = engine.getNodeList(CampNode);
			this.playerPosNodes = engine.getNodeList(PlayerPositionNode);
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
			GlobalSignals.add(this, GlobalSignals.milestoneUnlockedSignal, this.onMilestoneClaimed);
			GlobalSignals.add(this, GlobalSignals.populationChangedSignal, this.onPopulationChanged);
			GlobalSignals.add(this, GlobalSignals.slowUpdateSignal, this.slowUpdate);
			GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.onTabChanged);
		},

		removeFromEngine: function (engine) {
			this.engine = null;
			this.campNodes = null;
			this.playerPosNodes = null;
			GlobalSignals.removeAll(this);
		},

		update: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
		},

		slowUpdate: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			this.updateBubble();
		},

		refresh: function () {
			$("#tab-header h2").text(Text.t("ui.main.tab_milestones_header"));
			this.updateMilestones();
			this.updateBubble();
		},

		updateBubble: function () {
			let bubbleNumber = 0;
			if (this.canClaimMilestone()) bubbleNumber++;

			if (!GameGlobals.gameState.hasSeenTab(GameGlobals.uiFunctions.elementIDs.tabs.milestones)) bubbleNumber = "!";
			
			GameGlobals.uiFunctions.updateBubble("#switch-milestones .bubble", this.bubbleNumber, bubbleNumber);
			
			this.bubbleNumber = bubbleNumber;
		},
		
		updateMilestones: function () {
			let currentMilestone = GameGlobals.tribeHelper.getCurrentMilestone();
			let nextMilestone = GameGlobals.tribeHelper.getNextMilestone();
			let action = this.getUnlockMilestoneAction(nextMilestone);
			let hasDeity = GameGlobals.tribeHelper.hasDeity();
			let hasInsight = this.playerStatsNodes.head.insight.value > 0;
			let hasNextMilestone = nextMilestone.name && nextMilestone.name.length > 0;
			
			// texts
			$("#milestone-current-name").text(currentMilestone.name + " (" + currentMilestone.index + ")");
			$("#milestone-current-description").text(TextConstants.sentencify(currentMilestone.description));
			$("#milestone-next-name").text(nextMilestone.name + " (" + nextMilestone.index + ")");
			GameGlobals.uiFunctions.toggle($("#milestone-next-description"), false);
			
			GameGlobals.uiFunctions.toggle($("#milestone-container-next"), hasNextMilestone);
			
			if (!hasNextMilestone) return;
			
			// unlocks
			$("#milestone-current-unlocks").empty();
			let oldUnlocksDiv = "<div class='p-meta'>";
			oldUnlocksDiv += UIConstants.getMilestoneUnlocksDescriptionHTML(currentMilestone, null, false, false, hasDeity, hasInsight);
			oldUnlocksDiv += "</div>";
			$("#milestone-current-unlocks").append(oldUnlocksDiv);

			$("#milestone-next-unlocks").empty();
			let unlocksDiv = "<div class='p-meta'>";
			unlocksDiv += UIConstants.getMilestoneUnlocksDescriptionHTML(nextMilestone, currentMilestone, true, false, hasDeity, hasInsight);
			unlocksDiv += "</div>";
			$("#milestone-next-unlocks").append(unlocksDiv);
			
			// requirements
			$("#milestone-next-reqs").empty();
			let reqs = GameGlobals.playerActionsHelper.getReqs(action);
			if (reqs) {
				this.updatePopulation();
				
				let requirementsDiv = "<div style='flex-grow: 2'>";
				if (reqs.tribe && reqs.tribe.improvements) {
					for (let improvementID in reqs.tribe.improvements) {
						let improvementLevel = GameGlobals.campHelper.getCurrentMaxBuiltImprovementLevel(improvementID);
						let improvementDisplayNameKey = ImprovementConstants.getImprovementDisplayNameKey(improvementID, improvementLevel);
						let improvementDisplayName = Text.t(improvementDisplayNameKey);
						requirementsDiv += this.getMilestoneReqsListEntry(improvementDisplayName, reqs.tribe.improvements[improvementID][0], GameGlobals.playerActionsHelper.getCurrentImprovementCountTotal(improvementID));
					}
				}
				if (reqs.tribe && reqs.tribe.projects) {
					for (let improvementID in reqs.tribe.projects) {
						let improvementName = improvementNames[improvementID];
						requirementsDiv += this.getMilestoneReqsListEntry(improvementName, reqs.tribe.projects[improvementID], GameGlobals.playerActionsHelper.getCurrentImprovementCountTotal(improvementID));
					}
				}
				
				requirementsDiv += "</div>";
				$("#milestone-next-reqs").append(requirementsDiv);
			}
			
			// unlock button
			$("#milestone-next-button-container").empty();
			$("#milestone-next-button-container").append("<div><button class='action' action='" + action + "'>Unlock</button></div>");
			
			GameGlobals.uiFunctions.createButtons("#milestone-next-button-container");
		},
		
		updatePopulation: function () {
			let currentMilestone = GameGlobals.tribeHelper.getCurrentMilestone();
			let nextMilestone = GameGlobals.tribeHelper.getNextMilestone();
			let action = this.getUnlockMilestoneAction(nextMilestone);
			let reqs = GameGlobals.playerActionsHelper.getReqs(action);
			
			let showPopulation = reqs && reqs.tribe && reqs.tribe.population && reqs.tribe.population > 0;
			
			GameGlobals.uiFunctions.toggle($("#milestone-population-bar"), showPopulation);
			
			if (showPopulation) {
				let requiredPopulation = reqs.tribe.population || 1;
				let currentPopulation = GameGlobals.tribeHelper.getTotalPopulation()
				
				// - requirements: population
				let populationProgress = Math.min(currentPopulation / requiredPopulation, 1);
				$("#milestone-population-bar").data("progress-percent", populationProgress * 100);
				$("#milestone-population-bar .progress-label").text(Text.t("ui.milestones.population_progress_label", { current: currentPopulation, max: requiredPopulation }));
			}
		},
		
		getUnlockMilestoneAction: function (milestone) {
			return "claim_milestone_" + milestone.index;
		},
		
		canClaimMilestone: function () {
			let nextMilestone = GameGlobals.tribeHelper.getNextMilestone();
			if (!nextMilestone.name) return false;
			let action = "claim_milestone_" + nextMilestone.index;
			return GameGlobals.playerActionsHelper.checkAvailability(action);
		},
		
		getMilestoneReqsListEntry: function (displayName, reqAmount, currentAmount) {
			let isReady = currentAmount >= reqAmount;
			let spanName = "<span>" + displayName + "</span>";
			let spanAmount = "<span class='" + (isReady ? "" : "action-cost-blocker") + "'>" + currentAmount + "/" + reqAmount + "</span>";
			let spanIcon = isReady ? "<span class='reqs-checkmark' title='checkmark' />" : "";
			return "<span class='reqs-list-entry'>" + spanName + ": " + spanAmount + spanIcon + "</span>";
		},

		onTabChanged: function () {
			if (GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.milestones) {
				this.refresh();
			}
		},
		
		onMilestoneClaimed: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			this.updateBubble();
			if (GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.milestones) {
				this.updateMilestones();
			}
		},
		
		onPopulationChanged: function () {
			this.updatePopulation();
		},

	});

	return UIOutMilestonesSystem;
});
