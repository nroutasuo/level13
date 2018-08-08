define([
    'ash',
    'game/GlobalSignals',
    'game/constants/UIConstants',
    'game/constants/UpgradeConstants',
    'game/constants/PlayerActionsHelperConstants',
    'game/constants/OccurrenceConstants',
    'game/constants/CampConstants',
    'game/constants/PerkConstants',
    'game/constants/TextConstants',
    'game/nodes/level/PlayerLevelNode',
    'game/nodes/PlayerPositionNode',
    'game/nodes/PlayerLocationNode',
    'game/nodes/player/DeityNode',
    'game/nodes/tribe/TribeUpgradesNode',
    'game/components/player/PerksComponent',
    'game/components/common/CampComponent',
    'game/components/sector/ReputationComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/components/sector/events/CampEventTimersComponent',
    'game/components/sector/events/TraderComponent',
    'game/components/sector/events/RaidComponent'
], function (
    Ash, GlobalSignals, UIConstants, UpgradeConstants, PlayerActionsHelperConstants, OccurrenceConstants, CampConstants, PerkConstants, TextConstants,
    PlayerLevelNode, PlayerPositionNode, PlayerLocationNode, DeityNode, TribeUpgradesNode,
    PerksComponent,
    CampComponent, ReputationComponent, SectorImprovementsComponent, CampEventTimersComponent,
    TraderComponent, RaidComponent
) {
    var UIOutCampSystem = Ash.System.extend({
	
        uiFunctions : null,
        gameState : null,
        
        engine: null,
	
        playerPosNodes: null,
        playerLocationNodes: null,
        playerLevelNodes: null,
        deityNodes: null,
        tribeUpgradesNodes: null,
        
        bubbleNumber: -1,
        visibleBuildingCount: 0,
        availableBuildingCount: 0,
        lastShownVisibleBuildingCount: 0,
        lastShownAvailableBuildingCount: 0,
        currentEvents: 0,
        lastShownEvents: 0,
        currentPopulation: 0,
        lastShownPopulation: 0,
        
        elements: {
            steppers: {},
        },

        constructor: function (uiFunctions, gameState, levelHelper, upgradesHelper, campHelper, upgradeEffectsHelper) {
            this.uiFunctions = uiFunctions;
            this.gameState = gameState;
            this.levelHelper = levelHelper;
			this.upgradesHelper = upgradesHelper;
            this.campHelper = campHelper;
            
            return this;
        },

        addToEngine: function (engine) {
            this.engine  = engine;
            this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
            this.playerPosNodes = engine.getNodeList(PlayerPositionNode);
            this.playerLevelNodes = engine.getNodeList(PlayerLevelNode);
            this.deityNodes = engine.getNodeList(DeityNode);
            this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
            GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.onTabChanged);
            GlobalSignals.add(this, GlobalSignals.improvementBuiltSignal, this.onImprovementBuilt);
            GlobalSignals.add(this, GlobalSignals.playerMovedSignal, this.onPlayerMoved);
            GlobalSignals.add(this, GlobalSignals.campRenamedSignal, this.onCampRenamed);
            GlobalSignals.add(this, GlobalSignals.populationChangedSignal, this.onPopulationChanged);
            GlobalSignals.add(this, GlobalSignals.workersAssignedSignal, this.onWorkersAssigned);
            
            this.refresh();
        },

        removeFromEngine: function (engine) {
            this.engine = null;
            this.playerLocationNodes = null;
            this.playerPosNodes = null;
            this.playerLevelNodes = null;
            this.deityNodes = null;
            this.tribeUpgradesNodes = null;
            GlobalSignals.removeAll(this);
        },

        update: function (time) {
            var isActive = this.gameState.uiStatus.currentTab === this.uiFunctions.elementIDs.tabs.in;
            var campCount = this.gameState.numCamps;
            if (!this.playerLocationNodes.head) return;
            if (!this.playerPosNodes.head.position.inCamp) return;
            
            this.updateImprovements(isActive, campCount);
            this.updateWorkers(isActive);
            this.updateEvents(isActive);
            this.updateBubble();
            
            if (!isActive) {
                return;
            }
	    
            var campComponent = this.playerLocationNodes.head.entity.get(CampComponent);
            if (!campComponent) {
                console.log("WARN: Camp UI systen active but no camp found.");
                this.uiFunctions.showTab(this.uiFunctions.elementIDs.tabs.out);
                return;
            }
            
            // Vis
            // TODO camp vis
               
            this.updateStats();
        },
        
        refresh: function () {
            if (!this.playerLocationNodes.head) return;
            if (!this.playerPosNodes.head.position.inCamp) return;
            
            var campComponent = this.playerLocationNodes.head.entity.get(CampComponent);
            if (!campComponent) return;
            var campCount = this.gameState.numCamps;
            
            // Header
            var header = campComponent.getName();
            if (campCount > 1) header += " (" + this.playerPosNodes.head.position.getPosition().getInGameFormat(true) + ")";
            $("#tab-header h2").text(header);
            
            this.updateAssignedWorkers();
            this.updateWorkerMaxDescriptions();
        },
        
        updateBubble: function () {
            var buildingNum = this.availableBuildingCount - this.lastShownAvailableBuildingCount + this.visibleBuildingCount - this.lastShownVisibleBuildingCount;
            var eventNum = this.currentEvents - this.lastShownEvents;
            var populationNum = this.currentPopulation - this.lastShownPopulation;
            var newBubbleNumber = buildingNum + eventNum + populationNum;
            if (this.bubbleNumber === newBubbleNumber)
                return;
            this.bubbleNumber = newBubbleNumber;
            $("#switch-in .bubble").text(this.bubbleNumber);
            this.uiFunctions.toggle("#switch-in .bubble", this.bubbleNumber > 0);
        },
	
        updateWorkers: function (isActive) {
            var campComponent = this.playerLocationNodes.head.entity.get(CampComponent);
			if (!campComponent) return;
            
            this.currentPopulation = Math.floor(campComponent.population);
            if (isActive) this.lastShownPopulation = this.currentPopulation;
            
            if (!isActive) return;
            
            var showPopulation = campComponent.population > 0 || this.gameState.numCamps > 1;
            this.uiFunctions.toggle("#in-population", showPopulation);
            if (!showPopulation) return;
            
            var reputation = this.playerLocationNodes.head.entity.get(ReputationComponent).value;
            var maxPopulation = this.getCampMaxPopulation();
            this.updatePopulationChangeDisplay(campComponent, maxPopulation, reputation);
        },
        
        getCampMaxPopulation: function () {
            if (!this.playerLocationNodes.head) return;
            var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);            
            var maxPopulation = improvements.getCount(improvementNames.house) * CampConstants.POPULATION_PER_HOUSE;
            maxPopulation += improvements.getCount(improvementNames.house2) * CampConstants.POPULATION_PER_HOUSE2;
            return maxPopulation;
        },
        
        updateWorkerStepper: function (campComponent, id, workerType, maxWorkers, showMax) {
            this.uiFunctions.toggle($(id).closest("tr"), maxWorkers > 0);
            
            var freePopulation = campComponent.getFreePopulation();
            var assignedWorkers = campComponent.assignedWorkers[workerType];
            var maxAssigned = Math.min(assignedWorkers + freePopulation, maxWorkers);
            this.uiFunctions.updateStepper(id, assignedWorkers, 0, maxAssigned);
            
            if (maxWorkers === 0) return;
			$(id).parent().siblings(".in-assign-worker-limit").children(".callout-container").children(".info-callout-target").html(showMax ? "<span>/ " + maxWorkers + "</span>" : "");
        },
        
        updatePopulationChangeDisplay: function (campComponent, maxPopulation, reputation) {
            var freePopulation = campComponent.getFreePopulation();
            var isPopulationMaxed = campComponent.population >= maxPopulation;
            var populationChangePerSec = campComponent.populationChangePerSec;
            var isPopulationStill = isPopulationMaxed && populationChangePerSec !== 0;
            
            var reqRepCur = CampConstants.getRequiredReputation(Math.floor(campComponent.population));
            var reqRepNext = CampConstants.getRequiredReputation(Math.floor(campComponent.population) + 1);
            var isReputationBlocking = reqRepNext < reputation;

            $("#in-population-next").text(campComponent.populationChangePerSec >= 0 ? "Next worker:" : "Worker leaving:");
            $("#in-population-reputation").text("Reputation required: " + reqRepCur + " (current) " + reqRepNext + " (next)");
            $("#in-population h3").text("Population: " + Math.floor(campComponent.population) + " / " + (maxPopulation));
            $("#in-population p#in-population-status").text("Free workers: " + freePopulation);
            
            if (!isPopulationStill) {
                var secondsToChange = 0;
                var progress = 0;
                if (populationChangePerSec > 0) {
                    progress = (campComponent.population - Math.floor(campComponent.population));
                    secondsToChange = (1 - progress) / populationChangePerSec;
                } else if(populationChangePerSec < 0) {
                    progress = (campComponent.population - Math.floor(campComponent.population));
                    secondsToChange = progress / populationChangePerSec;
                } else {
                    progress = 0;
                }
                
                var progressLabel = populationChangePerSec !== 0 ? UIConstants.getTimeToNum(secondsToChange) : "no change";
                
                $("#in-population-bar-next").toggleClass("warning", populationChangePerSec < 0);
                $("#in-population-bar-next").data("progress-percent", progress * 100);
                $("#in-population-bar-next .progress-label").text(progressLabel);
                $("#in-population-bar-next").data("animation-length", 500);
            }
            
            this.uiFunctions.slideToggleIf("#in-population-reputation", null, campComponent.population > 0 && !isPopulationStill, 200, 200);
            this.uiFunctions.slideToggleIf("#in-population-bar-next", null, campComponent.population > 0 && !isPopulationStill, 200, 200);
            this.uiFunctions.slideToggleIf("#in-population-next", null, campComponent.population > 0 && !isPopulationStill, 200, 200);
            this.uiFunctions.slideToggleIf("#in-population-status", null, campComponent.population >= 1, 200, 200);
            this.uiFunctions.slideToggleIf("#in-assign-workers", null, campComponent.population >= 1, 200, 200);
        },
        
        updateAssignedWorkers: function (campComponent) {
            var campComponent = this.playerLocationNodes.head.entity.get(CampComponent);
			if (!campComponent) return;

            var maxPopulation = this.getCampMaxPopulation();
            var posComponent = this.playerPosNodes.head.position;
            var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
            
            var workerConsumptionS = "<br/><span class='warning'>water -" + this.campHelper.getWaterConsumptionPerSecond(1) + "/s</span>" +
                "<br/><span class='warning'>food -" + this.campHelper.getFoodConsumptionPerSecond(1) + "/s</span>";
            UIConstants.updateCalloutContent("#in-assign-water .in-assing-worker-desc .info-callout-target", "water +" + this.campHelper.getWaterProductionPerSecond(1, improvements) + "/s" + workerConsumptionS, true);
            UIConstants.updateCalloutContent("#in-assign-scavenger .in-assing-worker-desc .info-callout-target", "metal +" + this.campHelper.getMetalProductionPerSecond(1, improvements) + "/s" + workerConsumptionS, true);
            UIConstants.updateCalloutContent("#in-assign-trapper .in-assing-worker-desc .info-callout-target", "food +" + this.campHelper.getFoodProductionPerSecond(1, improvements) + "/s" + workerConsumptionS, true);
            UIConstants.updateCalloutContent("#in-assign-weaver .in-assing-worker-desc .info-callout-target", "rope +" + this.campHelper.getRopeProductionPerSecond(1, improvements) + "/s" + workerConsumptionS, true);
            UIConstants.updateCalloutContent("#in-assign-chemist .in-assing-worker-desc .info-callout-target", "fuel +" + this.campHelper.getFuelProductionPerSecond(1, improvements) + "/s" + workerConsumptionS, true);
            UIConstants.updateCalloutContent("#in-assign-apothecary .in-assing-worker-desc .info-callout-target", "medicine +" + this.campHelper.getMedicineProductionPerSecond(1, improvements) + "/s" + workerConsumptionS + "<br/><span class='warning'>herbs -" + this.campHelper.getHerbsConsumptionPerSecond(1) + "/s</span>", true);
            UIConstants.updateCalloutContent("#in-assign-concrete .in-assing-worker-desc .info-callout-target", "concrete +" + this.campHelper.getConcreteProductionPerSecond(1, improvements) + "/s" + workerConsumptionS + "<br/><span class='warning'>metal -" + this.campHelper.getMetalConsumptionPerSecondConcrete(1) + "/s</span>", true);
            UIConstants.updateCalloutContent("#in-assign-smith .in-assing-worker-desc .info-callout-target", "tools +" + this.campHelper.getToolsProductionPerSecond(1, improvements) + "/s" + workerConsumptionS + "<br/><span class='warning'>metal -" + this.campHelper.getMetalConsumptionPerSecondSmith(1) + "/s</span>", true);
            UIConstants.updateCalloutContent("#in-assign-soldier .in-assing-worker-desc .info-callout-target", "camp defence +1" + workerConsumptionS, true);
            
            var refineriesOnLevel = this.levelHelper.getLevelClearedWorkshopCount(posComponent.level, resourceNames.fuel);
            var apothecariesInCamp = improvements.getCount(improvementNames.apothecary);
            var cementMillsInCamp = improvements.getCount(improvementNames.cementmill);
            var smithiesInCamp = improvements.getCount(improvementNames.smithy);
            var barracksInCamp = improvements.getCount(improvementNames.barracks);
            
            var maxApothecaries = apothecariesInCamp * CampConstants.getApothecariesPerShop(this.upgradesHelper.getBuildingUpgradeLevel(improvementNames.apothecary, this.tribeUpgradesNodes.head.upgrades));
            var maxConcrete = cementMillsInCamp * CampConstants.getWorkersPerMill(this.upgradesHelper.getBuildingUpgradeLevel(improvementNames.cementmill, this.tribeUpgradesNodes.head.upgrades));
            var maxSmiths = smithiesInCamp * CampConstants.getSmithsPerSmithy(this.upgradesHelper.getBuildingUpgradeLevel(improvementNames.smithy, this.tribeUpgradesNodes.head.upgrades));
            var maxSoldiers = barracksInCamp * CampConstants.getSoldiersPerBarracks(this.upgradesHelper.getBuildingUpgradeLevel(improvementNames.barracks, this.tribeUpgradesNodes.head.upgrades));
            var maxChemists = refineriesOnLevel * CampConstants.CHEMISTS_PER_WORKSHOP;
            
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
        
        updateWorkerMaxDescriptions: function () {
            var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
            var posComponent = this.playerPosNodes.head.position;
            
            var refineriesOnLevel = this.levelHelper.getLevelClearedWorkshopCount(posComponent.level, resourceNames.fuel);
            var apothecariesInCamp = improvements.getCount(improvementNames.apothecary);
            var cementMillsInCamp = improvements.getCount(improvementNames.cementmill);
            var smithiesInCamp = improvements.getCount(improvementNames.smithy);
            var barracksInCamp = improvements.getCount(improvementNames.barracks);
            
            UIConstants.updateCalloutContent("#in-assign-chemist .in-assign-worker-limit .info-callout-target", refineriesOnLevel + " refineries found", true);
            UIConstants.updateCalloutContent("#in-assign-apothecary .in-assign-worker-limit .info-callout-target", apothecariesInCamp + " apothecaries built", true);
            UIConstants.updateCalloutContent("#in-assign-concrete .in-assign-worker-limit .info-callout-target", cementMillsInCamp + " cement mills built", true);
            UIConstants.updateCalloutContent("#in-assign-smith .in-assign-worker-limit .info-callout-target", smithiesInCamp + " smithies built", true);
            UIConstants.updateCalloutContent("#in-assign-soldier .in-assign-worker-limit .info-callout-target", barracksInCamp + " barracks built", true);
        },
        
        updateImprovements: function (isActive, campCount) {
            var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
            var hasTradePost = improvements.getCount(improvementNames.tradepost) > 0;
            var hasDeity = this.deityNodes.head !== null;
            
            var availableBuildingCount = 0;
            var visibleBuildingCount = 0;
            
            var playerActionsHelper = this.uiFunctions.playerActions.playerActionsHelper;
            var uiFunctions = this.uiFunctions;
            $.each($("#in-improvements tr"), function () {
                var actionName = $(this).find("button.action-build").attr("action");
                var id = $(this).attr("id");
                if (actionName) {
                    var improvementName = playerActionsHelper.getImprovementNameForAction(actionName);
                    if (improvementName) {
						var requirementCheck = playerActionsHelper.checkRequirements(actionName, false, null);
                        var actionEnabled = requirementCheck.value >= 1;
                        var showActionDisabledReason = false;
                        if (!actionEnabled) {
                            switch (requirementCheck.reason) {
                                case PlayerActionsHelperConstants.DISABLED_REASON_NOT_ENOUGH_LEVEL_POP:
                                    showActionDisabledReason = true;
                            }
                        }
                        var actionAvailable = playerActionsHelper.checkAvailability(actionName, false);
                        var existingImprovements = improvements.getCount(improvementName);
                        if (isActive) {
                            $(this).find(".list-amount").text(existingImprovements);
                            uiFunctions.toggle($(this).find(".action-use"), existingImprovements > 0);
                        }
                        
                        var commonVisibilityRule = (actionEnabled || existingImprovements > 0 || showActionDisabledReason);
                        var specialVisibilityRule = true;
                        // TODO get rid of these & move to requirements
                        if (id === "in-improvements-shrine") specialVisibilityRule = hasDeity;
                        if (id === "in-improvements-trading") specialVisibilityRule = campCount > 1;
                        if (id === "in-improvements-research") specialVisibilityRule = campCount > 1;
                        if (id === "in-improvements-market") specialVisibilityRule = hasTradePost;
                        if (id === "in-improvements-inn") specialVisibilityRule = hasTradePost;
                        var isVisible = specialVisibilityRule && commonVisibilityRule;
                        uiFunctions.toggle($(this), isVisible);
                        if (isVisible) visibleBuildingCount++;
                        if (actionAvailable) availableBuildingCount++;
                    }
                }
            });
			
            var perksComponent = this.playerPosNodes.head.entity.get(PerksComponent);
			var hasHospital = improvements.getCount(improvementNames.hospital) > 0;
			var isInjured = perksComponent.getTotalEffect(PerkConstants.perkTypes.injury) !== 1;
			var isAugmented = perksComponent.hasPerk(PerkConstants.perkIds.healthAugment);
			var isAugmentAvailable = this.hasUpgrade(this.upgradesHelper.getUpgradeIdsForImprovement(improvementNames.hospital)[0]);
			this.uiFunctions.toggle("#btn-use_in_hospital", hasHospital && (isInjured || isAugmented || !isAugmentAvailable));
			this.uiFunctions.toggle("#btn-use_in_hospital2", hasHospital && !isInjured && !isAugmented && isAugmentAvailable);
            
            this.availableBuildingCount = availableBuildingCount;
            if (isActive) this.lastShownAvailableBuildingCount = this.availableBuildingCount;
            this.visibleBuildingCount = visibleBuildingCount;
            if (isActive) this.lastShownVisibleBuildingCount = this.visibleBuildingCount;
        },
    
        updateEvents: function (isActive) {
            var campComponent = this.playerLocationNodes.head.entity.get(CampComponent);
            if (!campComponent) return;
            
            var hasEvents = false;
            var eventTimers = this.playerLocationNodes.head.entity.get(CampEventTimersComponent);
            this.currentEvents = 0;
            
            var showEvents = campComponent.population >= 1 || this.gameState.numCamps > 1;
            this.uiFunctions.toggle("#in-occurrences", showEvents);
            
            // Traders
            var hasTrader = this.playerLocationNodes.head.entity.has(TraderComponent);
            if (isActive && showEvents) {
                var isTraderLeaving = hasTrader && eventTimers.getEventTimeLeft(OccurrenceConstants.campOccurrenceTypes.trader) < 5;
                hasEvents = hasEvents || hasTrader;
                this.uiFunctions.toggle("#in-occurrences-trader", hasTrader);
                $("#in-occurrences-trader .progress-label").toggleClass("event-ending", isTraderLeaving);
                $("#in-occurrences-trader").data("progress-percent", eventTimers.getEventTimePercentage(OccurrenceConstants.campOccurrenceTypes.trader));
            }
            
            // Raiders
            var hasRaid = this.playerLocationNodes.head.entity.has(RaidComponent);
            if (isActive && showEvents) {
                this.uiFunctions.toggle("#in-occurrences-raid", hasRaid);
                $("#in-occurrences-raid .progress-label").toggleClass("event-ending", hasRaid);
                $("#in-occurrences-raid").data("progress-percent", eventTimers.getEventTimePercentage(OccurrenceConstants.campOccurrenceTypes.raid));
            }
            
            if (hasRaid) this.currentEvents++;
            if (isActive) this.lastShownEvents = this.currentEvents;
            
            hasEvents = hasEvents || hasRaid;
            this.uiFunctions.toggle("#in-occurrences-empty", !hasEvents);
        },
        
        updateStats: function () {
            var campComponent = this.playerLocationNodes.head.entity.get(CampComponent);
			if (!campComponent) return;
			
			var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			var soldiers = this.playerLocationNodes.head.entity.get(CampComponent).assignedWorkers.soldier;
            var fortificationUpgradeLevel = this.upgradesHelper.getBuildingUpgradeLevel(improvementNames.fortification, this.tribeUpgradesNodes.head.upgrades);
			var raidDanger = Math.round(OccurrenceConstants.getRaidDanger(improvements, soldiers, fortificationUpgradeLevel));
            var raidDefence = OccurrenceConstants.getRaidDefence(improvements, soldiers, fortificationUpgradeLevel);
            
            var inGameFoundingDate = UIConstants.getInGameDate(campComponent.foundedTimeStamp);
            var showCalendar = this.tribeUpgradesNodes.head.upgrades.hasUpgrade(this.upgradesHelper.getUpgradeIdForUIEffect(UpgradeConstants.upgradeUIEffects.calendar));
            $("#in-demographics-general-age .value").text(inGameFoundingDate);
            this.uiFunctions.toggle("#in-demographics-general-age", showCalendar);
			
			var showRaid = raidDanger > 0 || raidDefence > 0;
			if (showRaid) {
				$("#in-demographics-raid-danger .value").text(raidDanger + "%");
				$("#in-demographics-raid-defence .value").text(raidDefence);
                var lastRaidS = "(none)";
                if (campComponent.lastRaid && campComponent.lastRaid.isValid()) {
                    if (campComponent.lastRaid.wasVictory) {
                        lastRaidS = "Camp was defended";
                    } else {
                        var resourcesLost = campComponent.lastRaid.resourcesLost;
                        if (resourcesLost && resourcesLost.getTotal() > 0) {
                            var resLog = TextConstants.getLogResourceText(resourcesLost);
                            var resS = TextConstants.createTextFromLogMessage(resLog.msg, resLog.replacements, resLog.values);
                            lastRaidS = "Camp attacked, lost: " + resS;
                        } else {
                            lastRaidS = "Camp attacked, nothing left to steal";
                        }
                    }
                    lastRaidS += " (" + UIConstants.getTimeSinceText(campComponent.lastRaid.timestamp) + " ago)";
                }
				$("#in-demographics-raid-last .value").text(lastRaidS);
			}
			this.uiFunctions.toggle("#in-demographics-raid", showRaid);
            
            var showLevelStats = this.gameState.numCamps > 1;
            if (showLevelStats) {
                var levelVO = this.playerLevelNodes.head.level.levelVO;
				$("#in-demographics-level-population .value").text(levelVO.populationGrowthFactor * 100 + "%");
            }
            
            this.uiFunctions.toggle("#id-demographics-level", showLevelStats);
            this.uiFunctions.toggle("#in-demographics", showCalendar || showRaid || showLevelStats);
        },
        
        onTabChanged: function () {
            if (this.uiFunctions.gameState.uiStatus.currentTab === this.uiFunctions.elementIDs.tabs.in) {
                this.refresh();
            }
        },
        
        onImprovementBuilt: function () {
            this.refresh();
        },
        
        onPlayerMoved: function () {
            this.refresh();
        },
        
        onCampRenamed: function () {
            this.refresh();
        },
        
        onPopulationChanged: function (entity) {
            if (this.playerLocationNodes.head.entity === entity) {
                this.refresh();
            }
        },
        
        onWorkersAssigned: function (entity) {
            if (this.playerLocationNodes.head.entity === entity) {
                this.refresh();
            }
        },
        
        hasUpgrade: function (upgradeId) {
            return this.tribeUpgradesNodes.head.upgrades.hasUpgrade(upgradeId);
        }
        
    });

    return UIOutCampSystem;
});
