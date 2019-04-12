 define([
    'ash',
    'utils/UIState',
    'game/GameGlobals',
    'game/GlobalSignals',
	'game/constants/PlayerActionConstants',
    'game/constants/UIConstants',
    'game/constants/UpgradeConstants',
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
	'game/components/sector/OutgoingCaravansComponent',
    'game/components/sector/ReputationComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/components/sector/events/CampEventTimersComponent',
    'game/components/sector/events/TraderComponent',
    'game/components/sector/events/RaidComponent',
], function (
    Ash, UIState, GameGlobals, GlobalSignals, PlayerActionConstants, UIConstants, UpgradeConstants, OccurrenceConstants, CampConstants, PerkConstants, TextConstants,
    PlayerLevelNode, PlayerPositionNode, PlayerLocationNode, DeityNode, TribeUpgradesNode,
    PerksComponent,
    CampComponent, OutgoingCaravansComponent, ReputationComponent, SectorImprovementsComponent, CampEventTimersComponent,
    TraderComponent, RaidComponent
) {
    var UIOutCampSystem = Ash.System.extend({

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
            improvementButtons: [],
            steppers: {},
        },

        constructor: function () {
            this.initImprovements();
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
            GlobalSignals.add(this, GlobalSignals.gameShownSignal, this.onGameShown);
            GlobalSignals.add(this, GlobalSignals.slowUpdateSignal, this.slowUpdate);
            GlobalSignals.add(this, GlobalSignals.gameStartedSignal, this.refresh);

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
            var isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.in;
            var campCount = GameGlobals.gameState.numCamps;
            if (!this.playerLocationNodes.head) return;
            if (!this.playerPosNodes.head.position.inCamp) return;

            this.updateWorkers(isActive);
            this.updateEvents(isActive);

            if (!isActive) {
                return;
            }

            var campComponent = this.playerLocationNodes.head.entity.get(CampComponent);
            if (!campComponent) {
                console.log("WARN: Camp UI systen active but no camp found.");
                GameGlobals.uiFunctions.showTab(GameGlobals.uiFunctions.elementIDs.tabs.out);
                return;
            }
        },

        slowUpdate: function () {
            this.updateImprovements();
            this.updateBubble();
            this.updateStats();
        },

        refresh: function () {
            if (!this.playerLocationNodes.head) return;
            if (!this.playerPosNodes.head.position.inCamp) return;
            if (GameGlobals.gameState.uiStatus.isHidden) return;

            var campComponent = this.playerLocationNodes.head.entity.get(CampComponent);
            if (!campComponent) return;
            var campCount = GameGlobals.gameState.numCamps;

            // Header
            var header = campComponent.getName();
            if (campCount > 1) header += " (" + this.playerPosNodes.head.position.getPosition().getInGameFormat(true) + ")";
            $("#tab-header h2").text(header);

            this.updateAssignedWorkers();
            this.updateWorkerMaxDescriptions();
            this.updateImprovements();
            this.updateStats();
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
            GameGlobals.uiFunctions.toggle("#switch-in .bubble", this.bubbleNumber > 0);
        },

        updateWorkers: function (isActive) {
            var campComponent = this.playerLocationNodes.head.entity.get(CampComponent);
			if (!campComponent) return;

            this.currentPopulation = Math.floor(campComponent.population);
            if (isActive) this.lastShownPopulation = this.currentPopulation;

            if (!isActive) return;

            var showPopulation = campComponent.population > 0 || GameGlobals.gameState.numCamps > 1;
            GameGlobals.uiFunctions.toggle("#in-population", showPopulation);
            if (!showPopulation) return;

            var reputation = this.playerLocationNodes.head.entity.get(ReputationComponent).value;
            var maxPopulation = this.getCampMaxPopulation();
            this.updatePopulationChangeDisplay(campComponent, maxPopulation, reputation);
        },

        getCampMaxPopulation: function () {
            if (!this.playerLocationNodes.head) return;
            var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
            return CampConstants.getHousingCap(improvements);
        },

        updateWorkerStepper: function (campComponent, id, workerType, maxWorkers, showMax) {
            GameGlobals.uiFunctions.toggle($(id).closest("tr"), maxWorkers > 0);

            var freePopulation = campComponent.getFreePopulation();
            var assignedWorkers = campComponent.assignedWorkers[workerType] || 0;
            var maxAssigned = Math.min(assignedWorkers + freePopulation, maxWorkers);
            GameGlobals.uiFunctions.updateStepper(id, assignedWorkers, 0, maxAssigned);

            if (maxWorkers === 0) return;
			$(id).parent().siblings(".in-assign-worker-limit").children(".callout-container").children(".info-callout-target").html(showMax ? "<span>/ " + maxWorkers + "</span>" : "");
        },

        updatePopulationChangeDisplay: function (campComponent, maxPopulation, reputation) {
            var freePopulation = campComponent.getFreePopulation();
            var isPopulationMaxed = campComponent.population >= maxPopulation;
            var populationChangePerSec = campComponent.populationChangePerSec;
            var isPopulationStill = isPopulationMaxed && populationChangePerSec === 0;

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

            GameGlobals.uiFunctions.slideToggleIf("#in-population-reputation", null, campComponent.population > 0 && !isPopulationStill, 200, 200);
            GameGlobals.uiFunctions.slideToggleIf("#in-population-bar-next", null, campComponent.population > 0 && !isPopulationStill, 200, 200);
            GameGlobals.uiFunctions.slideToggleIf("#in-population-next", null, campComponent.population > 0 && !isPopulationStill, 200, 200);
            GameGlobals.uiFunctions.slideToggleIf("#in-population-status", null, campComponent.population >= 1, 200, 200);
            GameGlobals.uiFunctions.slideToggleIf("#in-assign-workers", null, campComponent.population >= 1, 200, 200);
        },

        updateAssignedWorkers: function (campComponent) {
            var campComponent = this.playerLocationNodes.head.entity.get(CampComponent);
			if (!campComponent) return;

            var maxPopulation = this.getCampMaxPopulation();
            var posComponent = this.playerPosNodes.head.position;
            var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
            var hasUnlockedRopers = GameGlobals.upgradeEffectsHelper.getWorkerLevel("rope-maker", this.tribeUpgradesNodes.head.upgrades) > 0;
            var hasUnlockedScientists = GameGlobals.upgradeEffectsHelper.getWorkerLevel("scientist", this.tribeUpgradesNodes.head.upgrades) > 0;
            var soldierLevel = GameGlobals.upgradeEffectsHelper.getWorkerLevel("soldier", this.tribeUpgradesNodes.head.upgrades);

            var workerConsumptionS = "<br/><span class='warning'>water -" + GameGlobals.campHelper.getWaterConsumptionPerSecond(1) + "/s</span>" +
                "<br/><span class='warning'>food -" + GameGlobals.campHelper.getFoodConsumptionPerSecond(1) + "/s</span>";
            UIConstants.updateCalloutContent("#in-assign-water .in-assing-worker-desc .info-callout-target", "water +" + GameGlobals.campHelper.getWaterProductionPerSecond(1, improvements) + "/s" + workerConsumptionS, true);
            UIConstants.updateCalloutContent("#in-assign-scavenger .in-assing-worker-desc .info-callout-target", "metal +" + GameGlobals.campHelper.getMetalProductionPerSecond(1, improvements) + "/s" + workerConsumptionS, true);
            UIConstants.updateCalloutContent("#in-assign-trapper .in-assing-worker-desc .info-callout-target", "food +" + GameGlobals.campHelper.getFoodProductionPerSecond(1, improvements) + "/s" + workerConsumptionS, true);
            UIConstants.updateCalloutContent("#in-assign-weaver .in-assing-worker-desc .info-callout-target", "rope +" + GameGlobals.campHelper.getRopeProductionPerSecond(1, improvements) + "/s" + workerConsumptionS, true);
            UIConstants.updateCalloutContent("#in-assign-chemist .in-assing-worker-desc .info-callout-target", "fuel +" + GameGlobals.campHelper.getFuelProductionPerSecond(1, improvements) + "/s" + workerConsumptionS, true);
            UIConstants.updateCalloutContent("#in-assign-apothecary .in-assing-worker-desc .info-callout-target", "medicine +" + GameGlobals.campHelper.getMedicineProductionPerSecond(1, improvements) + "/s" + workerConsumptionS + "<br/><span class='warning'>herbs -" + GameGlobals.campHelper.getHerbsConsumptionPerSecond(1) + "/s</span>", true);
            UIConstants.updateCalloutContent("#in-assign-concrete .in-assing-worker-desc .info-callout-target", "concrete +" + GameGlobals.campHelper.getConcreteProductionPerSecond(1, improvements) + "/s" + workerConsumptionS + "<br/><span class='warning'>metal -" + GameGlobals.campHelper.getMetalConsumptionPerSecondConcrete(1) + "/s</span>", true);
            UIConstants.updateCalloutContent("#in-assign-smith .in-assing-worker-desc .info-callout-target", "tools +" + GameGlobals.campHelper.getToolsProductionPerSecond(1, improvements) + "/s" + workerConsumptionS + "<br/><span class='warning'>metal -" + GameGlobals.campHelper.getMetalConsumptionPerSecondSmith(1) + "/s</span>", true);
            UIConstants.updateCalloutContent("#in-assign-scientist .in-assing-worker-desc .info-callout-target", "evidence +" + GameGlobals.campHelper.getEvidenceProductionPerSecond(1, improvements) + "/s" + workerConsumptionS, true);
            UIConstants.updateCalloutContent("#in-assign-soldier .in-assing-worker-desc .info-callout-target", "camp defence +" + CampConstants.getSoldierDefence(soldierLevel) + workerConsumptionS, true);

            var refineriesOnLevel = GameGlobals.levelHelper.getLevelClearedWorkshopCount(posComponent.level, resourceNames.fuel);
            var apothecariesInCamp = improvements.getCount(improvementNames.apothecary);
            var cementMillsInCamp = improvements.getCount(improvementNames.cementmill);
            var smithiesInCamp = improvements.getCount(improvementNames.smithy);
            var barracksInCamp = improvements.getCount(improvementNames.barracks);
            var librariesInCamp = improvements.getCount(improvementNames.library);

            var maxRopers = hasUnlockedRopers ? maxPopulation : 0;
            var maxApothecaries = apothecariesInCamp * CampConstants.getApothecariesPerShop(GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.apothecary, this.tribeUpgradesNodes.head.upgrades));
            var maxConcrete = cementMillsInCamp * CampConstants.getWorkersPerMill(GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.cementmill, this.tribeUpgradesNodes.head.upgrades));
            var maxSmiths = smithiesInCamp * CampConstants.getSmithsPerSmithy(GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.smithy, this.tribeUpgradesNodes.head.upgrades));
            var maxSoldiers = barracksInCamp * CampConstants.getSoldiersPerBarracks(GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.barracks, this.tribeUpgradesNodes.head.upgrades));
            var maxScientists = hasUnlockedScientists ? librariesInCamp * CampConstants.getScientistsPerLibrary(GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.library, this.tribeUpgradesNodes.head.upgrades)) : 0;
            var maxChemists = refineriesOnLevel * CampConstants.CHEMISTS_PER_WORKSHOP;

            this.updateWorkerStepper(campComponent, "#stepper-scavenger", "scavenger", maxPopulation, false);
            this.updateWorkerStepper(campComponent, "#stepper-trapper", "trapper", maxPopulation, false);
            this.updateWorkerStepper(campComponent, "#stepper-water", "water", maxPopulation, false);
            this.updateWorkerStepper(campComponent, "#stepper-rope", "ropemaker", maxRopers, false);
            this.updateWorkerStepper(campComponent, "#stepper-fuel", "chemist", maxChemists, true);
            this.updateWorkerStepper(campComponent, "#stepper-medicine", "apothecary", maxApothecaries, true);
            this.updateWorkerStepper(campComponent, "#stepper-concrete", "concrete", maxConcrete, true);
            this.updateWorkerStepper(campComponent, "#stepper-smith", "toolsmith", maxSmiths, true);
            this.updateWorkerStepper(campComponent, "#stepper-soldier", "soldier", maxSoldiers, true);
            this.updateWorkerStepper(campComponent, "#stepper-scientist", "scientist", maxScientists, true);
        },

        updateWorkerMaxDescriptions: function () {
            var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
            var posComponent = this.playerPosNodes.head.position;

            var refineriesOnLevel = GameGlobals.levelHelper.getLevelClearedWorkshopCount(posComponent.level, resourceNames.fuel);
            var apothecariesInCamp = improvements.getCount(improvementNames.apothecary);
            var cementMillsInCamp = improvements.getCount(improvementNames.cementmill);
            var smithiesInCamp = improvements.getCount(improvementNames.smithy);
            var librariesInCamp = improvements.getCount(improvementNames.library);
            var barracksInCamp = improvements.getCount(improvementNames.barracks);

            UIConstants.updateCalloutContent("#in-assign-chemist .in-assign-worker-limit .info-callout-target", refineriesOnLevel + " refineries found", true);
            UIConstants.updateCalloutContent("#in-assign-apothecary .in-assign-worker-limit .info-callout-target", apothecariesInCamp + " apothecaries built", true);
            UIConstants.updateCalloutContent("#in-assign-concrete .in-assign-worker-limit .info-callout-target", cementMillsInCamp + " cement mills built", true);
            UIConstants.updateCalloutContent("#in-assign-smith .in-assign-worker-limit .info-callout-target", smithiesInCamp + " smithies built", true);
            UIConstants.updateCalloutContent("#in-assign-scientist .in-assign-worker-limit .info-callout-target", librariesInCamp + " libraries built", true);
            UIConstants.updateCalloutContent("#in-assign-soldier .in-assign-worker-limit .info-callout-target", barracksInCamp + " barracks built", true);
        },

        initImprovements: function () {
            var result = [];
            $.each($("#in-improvements tr"), function () {
                var id = $(this).attr("id");
                var actionName = $(this).find("button.action-build").attr("action");
                if (!actionName) {
                    console.log("WARN: In improvement tr without action name: #" + id);
                } else {
                    var improvementName = GameGlobals.playerActionsHelper.getImprovementNameForAction(actionName);
                    if (improvementName) {
                        var btnUse = $(this).find(".action-use");
                        var listAmount =  $(this).find(".list-amount")
                        result.push({ elem: $(this), btnUse: btnUse, listAmount: listAmount, id: id, action: actionName, improvementName: improvementName });
                    }
                }
            });
            this.elements.improvementButtons = result;
        },

        updateImprovements: function () {
            if (!this.playerLocationNodes.head) return;
            var isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.in;
            var campCount = GameGlobals.gameState.numCamps;

            var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
            var hasTradePost = improvements.getCount(improvementNames.tradepost) > 0;
            var hasDeity = this.deityNodes.head !== null;

            var availableBuildingCount = 0;
            var visibleBuildingCount = 0;

            for (var i = 0; i < this.elements.improvementButtons.length; i++) {
                var elem = this.elements.improvementButtons[i];
                var actionName = elem.action;
                var id = elem.id;
                var improvementName = elem.improvementName;
				var requirementCheck = GameGlobals.playerActionsHelper.checkRequirements(actionName, false, null);
                var actionEnabled = requirementCheck.value >= 1;
                var showActionDisabledReason = false;
                if (!actionEnabled) {
                    switch (requirementCheck.reason) {
                        case PlayerActionConstants.DISABLED_REASON_NOT_ENOUGH_LEVEL_POP:
                        case PlayerActionConstants.UNAVAILABLE_REASON_LOCKED_RESOURCES:
                            showActionDisabledReason = true;
                    }
                }
                var actionAvailable = GameGlobals.playerActionsHelper.checkAvailability(actionName, false);
                var existingImprovements = improvements.getCount(improvementName);
                if (isActive) {
                    elem.listAmount.text(existingImprovements);
                    if (improvementName !== improvementNames.hospital) {
                        GameGlobals.uiFunctions.toggle(elem.btnUse, existingImprovements > 0);
                    }
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
                GameGlobals.uiFunctions.toggle(elem.elem, isVisible);
                if (isVisible) visibleBuildingCount++;
                if (actionAvailable) availableBuildingCount++;
            }

            var perksComponent = this.playerPosNodes.head.entity.get(PerksComponent);
			var hasHospital = improvements.getCount(improvementNames.hospital) > 0;
			var isInjured = perksComponent.getTotalEffect(PerkConstants.perkTypes.injury) !== 1;
			var isAugmented = perksComponent.hasPerk(PerkConstants.perkIds.healthAugment);
			var isAugmentAvailable = this.hasUpgrade(GameGlobals.upgradeEffectsHelper.getUpgradeIdsForImprovement(improvementNames.hospital)[0]);
			GameGlobals.uiFunctions.toggle("#btn-use_in_hospital1", hasHospital && (isInjured || isAugmented || !isAugmentAvailable));
            GameGlobals.uiFunctions.toggle("#btn-use_in_hospital2", hasHospital && !isInjured && !isAugmented && isAugmentAvailable);

            this.availableBuildingCount = availableBuildingCount;
            if (isActive) this.lastShownAvailableBuildingCount = this.availableBuildingCount;
            this.visibleBuildingCount = visibleBuildingCount;
            if (isActive) this.lastShownVisibleBuildingCount = this.visibleBuildingCount;
        },

        updateEvents: function (isActive) {
            var campComponent = this.playerLocationNodes.head.entity.get(CampComponent);
            if (!campComponent) return;
            var eventTimers = this.playerLocationNodes.head.entity.get(CampEventTimersComponent);
			var caravansComponent = this.playerLocationNodes.head.entity.get(OutgoingCaravansComponent);

            var hasEvents = false;
            var hasOther = false;

            var showEvents = campComponent.population >= 1 || GameGlobals.gameState.numCamps > 1;
            GameGlobals.uiFunctions.toggle("#in-occurrences", showEvents);

            // Traders
            var hasTrader = this.playerLocationNodes.head.entity.has(TraderComponent);
            hasEvents = hasEvents || hasTrader;
            if (isActive && showEvents) {
                var isTraderLeaving = hasTrader && eventTimers.getEventTimeLeft(OccurrenceConstants.campOccurrenceTypes.trader) < 5;
                GameGlobals.uiFunctions.toggle("#in-occurrences-trader", hasTrader);
                $("#in-occurrences-trader .progress-label").toggleClass("event-ending", isTraderLeaving);
                $("#in-occurrences-trader").data("progress-percent", eventTimers.getEventTimePercentage(OccurrenceConstants.campOccurrenceTypes.trader));
            }

            // Raiders
            var hasRaid = this.playerLocationNodes.head.entity.has(RaidComponent);
            hasEvents = hasEvents || hasRaid;
            if (isActive && showEvents) {
                GameGlobals.uiFunctions.toggle("#in-occurrences-raid", hasRaid);
                $("#in-occurrences-raid .progress-label").toggleClass("event-ending", hasRaid);
                $("#in-occurrences-raid").data("progress-percent", eventTimers.getEventTimePercentage(OccurrenceConstants.campOccurrenceTypes.raid));
            }
            
            // Outgoing caravans
            var numCaravans = caravansComponent.outgoingCaravans.length;
            hasOther = hasOther || numCaravans > 0;
            if (isActive && showEvents) {
                GameGlobals.uiFunctions.toggle("#in-occurrences-outgoing-caravans-container", numCaravans > 0);
                UIState.refreshState(this, "outgoing-caravans-num", numCaravans, function () {
                    $("#in-occurrences-outgoing-caravans-container").empty();
                    for (var i = 0; i < numCaravans; i++) {
                        var bar = '';
                        bar += '<div id="in-occurrences-outgoing-caravans-' + i + '" class="progress-wrap progress">';
                        bar += '<div class="progress-bar progress"></div>';
                        bar += '<span class="progress progress-label">Outgoing caravan</span>';
                        bar += '</div>';
                        $("#in-occurrences-outgoing-caravans-container").append(bar)
                    }
                });
                for (var i = 0; i < numCaravans; i++) {
                    var caravan = caravansComponent.outgoingCaravans[i];
                    var duration = caravan.returnDuration * 1000;
                    var timeLeft = caravan.returnTimeStamp - new Date().getTime();
                    $("#in-occurrences-outgoing-caravans-" + i).data("progress-percent",  (1 - timeLeft / duration) * 100);
                }
            }

            GameGlobals.uiFunctions.toggle("#in-occurrences-empty", showEvents && !hasEvents && !hasOther);
            
            this.currentEvents = 0;
            if (hasTrader) this.currentEvents++;
            if (hasRaid) this.currentEvents++;
            if (isActive) this.lastShownEvents = this.currentEvents;
        },

        updateStats: function () {
            var campComponent = this.playerLocationNodes.head.entity.get(CampComponent);
			if (!campComponent) return;

			var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			var soldiers = this.playerLocationNodes.head.entity.get(CampComponent).assignedWorkers.soldier;
            var soldierLevel = GameGlobals.upgradeEffectsHelper.getWorkerLevel("soldier", this.tribeUpgradesNodes.head.upgrades);
			var raidDanger = OccurrenceConstants.getRaidDanger(improvements, soldiers, soldierLevel);
            var raidAttack = OccurrenceConstants.getRaidDangerPoints(improvements);
            var raidDefence = OccurrenceConstants.getRaidDefencePoints(improvements, soldiers, soldierLevel);

            var inGameFoundingDate = UIConstants.getInGameDate(campComponent.foundedTimeStamp);
            var showCalendar = this.tribeUpgradesNodes.head.upgrades.hasUpgrade(GameGlobals.upgradeEffectsHelper.getUpgradeIdForUIEffect(UpgradeConstants.upgradeUIEffects.calendar));
            $("#in-demographics-general-age .value").text(inGameFoundingDate);
            GameGlobals.uiFunctions.toggle("#in-demographics-general-age", showCalendar);

			var showRaid = raidDanger > 0 || raidDefence > CampConstants.CAMP_BASE_DEFENCE || campComponent.population > 1;
			if (showRaid) {
                var defenceS = OccurrenceConstants.getRaidDefenceString(improvements, soldiers, soldierLevel);
				$("#in-demographics-raid-danger .value").text(Math.round(raidDanger * 100) + "%");
				$("#in-demographics-raid-defence .value").text(raidDefence);
                UIConstants.updateCalloutContent("#in-demographics-raid-danger", "Increases with camp size and decreases with camp defences.");
                UIConstants.updateCalloutContent("#in-demographics-raid-defence", defenceS);
                var hasLastRaid = campComponent.lastRaid && campComponent.lastRaid.isValid();
                if (hasLastRaid) {
                    var lastRaidS = "(none)";
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
    				$("#in-demographics-raid-last .value").text(lastRaidS);
                }
    			GameGlobals.uiFunctions.toggle("#in-demographics-raid-last", hasLastRaid);
			}
			GameGlobals.uiFunctions.toggle("#in-demographics-raid", showRaid);

            var showLevelStats = GameGlobals.gameState.numCamps > 1;
            if (showLevelStats) {
                var levelVO = this.playerLevelNodes.head.level.levelVO;
				$("#in-demographics-level-population .value").text(levelVO.populationGrowthFactor * 100 + "%");
            }

            GameGlobals.uiFunctions.toggle("#id-demographics-level", showLevelStats);
            GameGlobals.uiFunctions.toggle("#in-demographics", showCalendar || showRaid || showLevelStats);
        },

        onTabChanged: function () {
            if (GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.in) {
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
            if (!this.playerLocationNodes.head) return;
            if (this.playerLocationNodes.head.entity === entity) {
                this.refresh();
            }
        },

        onWorkersAssigned: function (entity) {
            if (!this.playerLocationNodes.head) return;
            if (this.playerLocationNodes.head.entity === entity) {
                this.refresh();
            }
        },

        onGameShown: function (entity) {
            if (!this.playerLocationNodes.head) return;
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
