define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/UIConstants',
	'game/constants/CampConstants',
	'game/constants/ImprovementConstants',
	'game/constants/OccurrenceConstants',
	'game/constants/WorldConstants',
	'game/nodes/sector/CampNode',
	'game/nodes/PlayerPositionNode',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/tribe/TribeUpgradesNode',
	'game/components/common/PositionComponent',
	'game/components/common/ResourcesComponent',
	'game/components/common/ResourceAccumulationComponent',
	'game/components/player/DeityComponent',
	'game/components/type/LevelComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/sector/events/RecruitComponent',
	'game/components/sector/events/TraderComponent',
	'game/components/sector/events/RaidComponent',
	'game/components/sector/OutgoingCaravansComponent'
], function (
	Ash, GameGlobals, GlobalSignals, UIConstants, CampConstants, ImprovementConstants, OccurrenceConstants, WorldConstants,
	CampNode, PlayerPositionNode, PlayerStatsNode, TribeUpgradesNode,
	PositionComponent, ResourcesComponent, ResourceAccumulationComponent, DeityComponent, LevelComponent, SectorImprovementsComponent, RecruitComponent, TraderComponent, RaidComponent, OutgoingCaravansComponent
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
			this.updateBubble();
		},

		slowUpdate: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
		},

		refresh: function () {
			$("#tab-header h2").text("Milestones");
			this.updateMilestones();
		},

		updateBubble: function () {
			let bubbleNumber = 0;
			if (this.canClaimMilestone()) bubbleNumber++;
			
			GameGlobals.uiFunctions.updateBubble("#switch-milestones .bubble", this.bubbleNumber, bubbleNumber);
			
			this.bubbleNumber = bubbleNumber;
		},
		
		updateMilestones: function () {
			let currentMilestone = GameGlobals.tribeHelper.getCurrentMilestone();
			let nextMilestone = GameGlobals.tribeHelper.getNextMilestone();
			let hasDeity = this.playerStatsNodes.head.entity.has(DeityComponent);
			
			$("#milestone-current-name").text("Current tribe level: " + currentMilestone.name + " (" + currentMilestone.index + ")");
			$("#milestone-next-name").text("Next tribe level: " + nextMilestone.name + " (" + nextMilestone.index + ")");
			
			let action = "claim_milestone_" + nextMilestone.index;
			
			let reqs = GameGlobals.playerActionsHelper.getReqs(action);
			let requirementsDiv = "<div style='flex-grow: 2'>";
			if (reqs) {
				if (reqs.tribe && reqs.tribe.population) {
					requirementsDiv += this.getMilestoneReqsListEntry("Population", reqs.tribe.population, GameGlobals.tribeHelper.getTotalPopulation());
				}
				if (reqs.tribe && reqs.tribe.improvements) {
					for (let improvementID in reqs.tribe.improvements) {
						let improvementLevel = GameGlobals.campHelper.getCurrentMaxBuiltImprovementLevel(improvementID);
						let getImprovementDisplayName = ImprovementConstants.getImprovementDisplayName(improvementID, improvementLevel);
						requirementsDiv += this.getMilestoneReqsListEntry(getImprovementDisplayName, reqs.tribe.improvements[improvementID], GameGlobals.playerActionsHelper.getCurrentImprovementCountTotal(improvementID));
					}
				}
				if (reqs.tribe && reqs.tribe.projects) {
					for (let improvementID in reqs.tribe.projects) {
						requirementsDiv += this.getMilestoneReqsListEntry(improvementID, reqs.tribe.projects[improvementID], GameGlobals.playerActionsHelper.getCurrentImprovementCountTotal(improvementID));
					}
				}
			}
			requirementsDiv += "</div>";
			
			let unlocksDiv = "<div style='flex-grow: 2'>";
			unlocksDiv += "Max evidence: " + nextMilestone.maxEvidence;
			unlocksDiv += "Max rumours: " + nextMilestone.maxRumours;
			if (nextMilestone.maxFavour && hasDeity) {
				unlocksDiv += "Max favour: " + nextMilestone.maxFavour;
			}
			if (nextMilestone.baseReputation && nextMilestone.baseReputation > currentMilestone.baseReputation) {
				unlocksDiv += "Base reputation: " + nextMilestone.baseReputation;
			}
			if (nextMilestone.unlockedFeatures) {
				for (let i = 0; i < nextMilestone.unlockedFeatures.length; i++) {
					unlocksDiv += UIConstants.getUnlockedFeatureDisplayName(nextMilestone.unlockedFeatures[i]);
				}
			}
			unlocksDiv += "</div>";
			
			$("#milestone-container").empty();
			$("#milestone-container").append(requirementsDiv);
			$("#milestone-container").append(unlocksDiv);
			$("#milestone-container").append("<div><button class='action' action='" + action + "'>Unlock</button></div>");
			
			GameGlobals.uiFunctions.generateButtonOverlays("#milestone-container");
			GameGlobals.uiFunctions.generateCallouts("#milestone-container");
			GameGlobals.uiFunctions.registerActionButtonListeners("#milestone-container");
		},
		
		canClaimMilestone: function () {
			let nextMilestone = GameGlobals.tribeHelper.getNextMilestone();
			let action = "claim_milestone_" + nextMilestone.index;
			return GameGlobals.playerActionsHelper.checkAvailability(action);
		},
		
		getMilestoneReqsListEntry: function (name, reqAmount, currentAmount) {
			let isReady = currentAmount >= reqAmount;
			let spanName = "<span>" + name + "</span>";
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
			if (GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.milestones) {
				this.updateMilestones();
			}
		}

	});

	return UIOutMilestonesSystem;
});
