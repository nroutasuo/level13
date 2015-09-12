define([
    'ash',
    'game/constants/UpgradeConstants',
    'game/constants/OccurrenceConstants',
    'game/constants/CampConstants',
    'game/constants/PerkConstants',
    'game/nodes/PlayerPositionNode',
    'game/nodes/PlayerLocationNode',
    'game/nodes/sector/CampNode',
    'game/nodes/player/DeityNode',
    'game/nodes/tribe/TribeUpgradesNode',
    'game/components/player/PerksComponent',
    'game/components/sector/SectorFeaturesComponent',
    'game/components/common/PositionComponent',
    'game/components/sector/improvements/CampComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/components/sector/SectorControlComponent',
    'game/components/sector/events/CampEventTimersComponent',
    'game/components/sector/events/TraderComponent',
    'game/components/sector/events/RaidComponent',
], function (
    Ash, UpgradeConstants, OccurrenceConstants, CampConstants, PerkConstants,
    PlayerPositionNode, PlayerLocationNode, CampNode, DeityNode, TribeUpgradesNode,
    PerksComponent,
	SectorFeaturesComponent, PositionComponent,
    CampComponent, SectorImprovementsComponent, SectorControlComponent, CampEventTimersComponent,
    TraderComponent, RaidComponent
) {
    var UIOutCampSystem = Ash.System.extend({
	
        uiFunctions : null,
        gameState : null,
        
        engine: null,
		
		tabChangedSignal: null,
	
        playerPosNodes: null,
        playerLocationNodes: null,
        deityNodes: null,
        tribeUpgradesNodes: null,

        constructor: function (uiFunctions, tabChangedSignal, gameState, levelHelper, upgradesHelper) {
            this.uiFunctions = uiFunctions;
			this.tabChangedSignal = tabChangedSignal;
            this.gameState = gameState;
            this.levelHelper = levelHelper;
			this.upgradesHelper = upgradesHelper;
            return this;
        },

        addToEngine: function (engine) {
            this.engine  = engine;
            this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
            this.playerPosNodes = engine.getNodeList(PlayerPositionNode);
            this.deityNodes = engine.getNodeList(DeityNode);
            this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
        },

        removeFromEngine: function (engine) {
            this.engine = null;
            this.playerLocationNodes = null;
            this.playerPosNodes = null;
            this.deityNodes = null;
            this.tribeUpgradesNodes = null;
        },

        update: function (time) {
            if (this.gameState.uiStatus.currentTab !== this.uiFunctions.elementIDs.tabs.in) {
                return;
            }
	    
            var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
            var campComponent = null;
            var campCount = 0;
            for (var node = this.engine.getNodeList(CampNode).head; node; node = node.next) {
                if (node.entity.get(PositionComponent).level == this.playerPosNodes.head.position.level) {
                    campComponent = node.camp;
                }
                campCount++;
            }
            
            if (!campComponent) {
                console.log("WARN: Camp UI systen active but no camp found.");
                this.uiFunctions.showTab(this.uiFunctions.elementIDs.tabs.out);
                return;
            }
            
            // Header
            var header = campComponent.getName();
            if (campCount > 1) header += " (lvl " + this.playerPosNodes.head.position.level + ")";
            $("#tab-header h2").text(header);
            
            // Vis
            // TODO camp vis
               
            this.updateWorkers();
            this.updateImprovements(campCount);
            this.updateEvents();
            this.updateStats();
        },
	
        updateWorkers: function () {
            var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
            var campComponent = this.playerLocationNodes.head.entity.get(CampComponent);
			if (!campComponent) return;
            var posComponent = this.playerPosNodes.head.position;
            
            var maxPopulation = improvements.getCount(improvementNames.house) * CampConstants.POPULATION_PER_HOUSE;
            maxPopulation += improvements.getCount(improvementNames.house2) * CampConstants.POPULATION_PER_HOUSE2;
            nextWorkerProgress = (campComponent.population - Math.floor(campComponent.population)) * 100;
            var freePopulation = campComponent.getFreePopulation();
            var isPopulationMaxed = campComponent.population >= maxPopulation;
            $("#in-population h3").text("Population: " + Math.floor(campComponent.population) + " / " + (maxPopulation));
            $("#in-population p#in-population-status").text("Free workers: " + freePopulation);
            if (!isPopulationMaxed) {
                $("#in-population-bar-next").data("progress-percent", nextWorkerProgress);
                // TODO show time to next worker in min/s
                $("#in-population-bar-next .progress-label").text(Math.round(nextWorkerProgress) + "%");
                $("#in-population-bar-next").data("animation-length", 500);
            }
            this.uiFunctions.slideToggleIf("#in-population-bar-next", null, campComponent.population >= 1 && !isPopulationMaxed, 200, 200);
            this.uiFunctions.slideToggleIf("#in-population-next", null, campComponent.population >= 1 && !isPopulationMaxed, 200, 200);
            this.uiFunctions.slideToggleIf("#in-population-status", null, campComponent.population >= 1, 200, 200);
            this.uiFunctions.slideToggleIf("#in-assign-workers", null, campComponent.population >= 1, 200, 200);
            
            $("#in-assign-weaver").toggle(this.hasUpgrade(this.upgradesHelper.getUpgradeIdForWorker("weaver")));
            $("#in-assign-chemist").toggle(this.levelHelper.getLevelClearedWorkshopCount(posComponent.level, resourceNames.fuel) > 0);
            $("#in-assign-apothecary").toggle(this.hasUpgrade(this.upgradesHelper.getUpgradeIdForWorker("apothecary")));
            $("#in-assign-concrete").toggle(this.hasUpgrade(this.upgradesHelper.getUpgradeIdForWorker("concrete")));
            $("#in-assign-smith").toggle(this.hasUpgrade(this.upgradesHelper.getUpgradeIdForWorker("smith")));
            $("#in-assign-soldier").toggle(this.hasUpgrade(this.upgradesHelper.getUpgradeIdForWorker("soldier")));
            
            var maxApothecaries = improvements.getCount(improvementNames.apothecary) * CampConstants.APOTECARIES_PER_SHOP;
            var maxConcrete = improvements.getCount(improvementNames.cementmill) * CampConstants.CONCRETE_WORKERS_PER_MILL;
            var maxSmiths = improvements.getCount(improvementNames.smithy) * CampConstants.SMIHTS_PER_SMITHY;
            var maxSoldiers = improvements.getCount(improvementNames.barracks) * CampConstants.SOLDIERS_PER_BARRACKS;
            var maxChemists = this.levelHelper.getLevelClearedWorkshopCount(posComponent.level, resourceNames.fuel) * CampConstants.CHEMISTS_PER_WORKSHOP;
            this.updateWorkerStepper(campComponent, "#stepper-scavenger", "scavenger", maxPopulation, false);
            this.updateWorkerStepper(campComponent, "#stepper-trapper", "trapper", maxPopulation, false);
            this.updateWorkerStepper(campComponent, "#stepper-water", "water", maxPopulation, false);
            this.updateWorkerStepper(campComponent, "#stepper-rope", "ropemaker", maxPopulation, false);
            this.updateWorkerStepper(campComponent, "#stepper-fuel", "chemist", maxChemists, true);
            this.updateWorkerStepper(campComponent, "#stepper-medicine", "apothecary", maxApothecaries, true);
            this.updateWorkerStepper(campComponent, "#stepper-concrete", "concrete", maxConcrete, true);
            this.updateWorkerStepper(campComponent, "#stepper-smith", "toolsmith", maxSmiths, true);
            this.updateWorkerStepper(campComponent, "#stepper-soldier", "soldier", maxSoldiers, true);
        },
        
        updateWorkerStepper: function (campComponent, id, workerType, maxWorkers, showMax) {
            var freePopulation = campComponent.getFreePopulation();
            var assignedWorkers = campComponent.assignedWorkers[workerType];
            $(id + " input").attr("max", Math.min(assignedWorkers + freePopulation, maxWorkers));
            $(id + " input").val(assignedWorkers);
			$(id).parent().siblings(".in-assign-worker-limit").text(showMax ? " / " + maxWorkers : "");
        },
        
        updateImprovements: function (campCount) {
            var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
            var hasTradePost = improvements.getCount(improvementNames.tradepost) > 0;
            $("#in-improvements-shrine").toggle(this.deityNodes.head != null);
            $("#in-improvements-trading").toggle(campCount > 1);
            $("#in-improvements-research").toggle(campCount > 1);
            $("#in-improvements-market").toggle(hasTradePost);
            $("#in-improvements-inn").toggle(hasTradePost);
            
            // TODO performance bottleneck
            var playerActionsHelper = this.uiFunctions.playerActions.playerActionsHelper;
            $.each($("#in-improvements tr"), function () {
                var actionName = $(this).find("button.action-build").attr("action");
                if (actionName) {
                    var improvementName = playerActionsHelper.getImprovementNameForAction(actionName);
                    if (improvementName) {
						var requirementCheck = playerActionsHelper.checkRequirements(actionName, false, null);
                        var actionEnabled = requirementCheck.value >= 1;
                        var existingImprovements = improvements.getCount(improvementName);
                        $(this).find(".list-amount").text(existingImprovements);
                        $(this).find(".action-use").toggle(existingImprovements > 0);
                        $(this).toggle(actionEnabled || existingImprovements > 0);
                    }
                }
            });
			
            var perksComponent = this.playerPosNodes.head.entity.get(PerksComponent);
			var hasHospital = improvements.getCount(improvementNames.hospital) > 0;
			var isInjured = perksComponent.getTotalEffect(PerkConstants.perkTypes.injury) != 1;
			var isAugmented = perksComponent.hasPerk(PerkConstants.perkIds.healthAugment);
			var isAugmentAvailable = this.hasUpgrade(this.upgradesHelper.getUpgradeIdsForImprovement(improvementNames.hospital)[0]);
			$("#btn-use_in_hospital").toggle(hasHospital && (isInjured || isAugmented || !isAugmentAvailable));
			$("#btn-use_in_hospital2").toggle(hasHospital && !isInjured && !isAugmented && isAugmentAvailable);
            
            var numProjectsTR = $("#in-improvements-level table tr").length;
            var projects = this.levelHelper.getAvailableProjectsForCamp(this.playerLocationNodes.head.entity, this.uiFunctions.playerActions);
            var level = this.playerLocationNodes.head.entity.get(PositionComponent).level;
            if (numProjectsTR !== projects.length) {
                $("#in-improvements-level table").empty();
                for (var i = 0; i < projects.length; i++) {
                    var project = projects[i];
                    var name = project.name;
                    var info = project.name + " on sector " + project.sector + (project.level === level ? "" : " (level " + project.level + ")");
                    var classes = "action action-build action-level-project";
                    var action = project.action;
                    var sector = project.level + "-" + project.sector;
                    var tr = "<tr><td><button class='" + classes + "' action='" + action + "' sector='" + sector + "'>" + name + "</button></td><td>" + info + "</td></tr>";
                    $("#in-improvements-level table").append(tr);
                }
                this.uiFunctions.registerActionButtonListeners("#in-improvements-level");
                this.uiFunctions.generateButtonOverlays("#in-improvements-level");
                this.uiFunctions.generateCallouts("#in-improvements-level");
            }
            $("#header-in-improvements-level").toggle(projects.length > 0);
        },
    
        updateEvents: function () {
            var hasEvents = false;
            var eventTimers = this.playerLocationNodes.head.entity.get(CampEventTimersComponent);
            
            // Traders
            var hasTrader = this.playerLocationNodes.head.entity.has(TraderComponent);
            var isTraderLeaving = hasTrader && eventTimers.getEventTimeLeft(OccurrenceConstants.campOccurrenceTypes.trader) < 5; 
            hasEvents = hasEvents || hasTrader;
            $("#in-occurrences-trader").toggle(hasTrader);
            $("#in-occurrences-trader").toggleClass("event-ending", isTraderLeaving);
            
            // Raiders
            var hasRaid = this.playerLocationNodes.head.entity.has(RaidComponent);
            hasEvents = hasEvents || hasRaid;
            $("#in-occurrences-raid").toggle(hasRaid);
            $("#in-occurrences-raid").toggleClass("event-ending", hasRaid);
            
            $("#in-occurrences-empty").toggle(!hasEvents);
        },
        
        updateStats: function () {
			if (!this.playerLocationNodes.head.entity.get(CampComponent)) return;
			
			var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			var soldiers = this.playerLocationNodes.head.entity.get(CampComponent).assignedWorkers.soldier;
			var raidDanger = Math.round(OccurrenceConstants.getRaidDanger(improvements, soldiers));
			
			var showRaid = raidDanger > 0;
			if (showRaid) {
				var raidDefence = OccurrenceConstants.getRaidDefence(improvements, soldiers);
				$("#in-demographics-raid-danger .value").text(raidDanger + "%");
				$("#in-demographics-raid-defence .value").text(raidDefence);
			}
			$("#in-demographics-raid").toggle(showRaid);
			
			$("#in-demographics").toggle(showRaid);
        },
        
        hasUpgrade: function (upgradeId) {
            return this.tribeUpgradesNodes.head.upgrades.hasBought(upgradeId);
        },
        
    });

    return UIOutCampSystem;
});
