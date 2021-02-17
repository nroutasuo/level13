 define([
    'ash',
    'utils/UIState',
    'game/GameGlobals',
    'game/GlobalSignals',
	'game/constants/ImprovementConstants',
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
    Ash, UIState, GameGlobals, GlobalSignals,
    ImprovementConstants, PlayerActionConstants, UIConstants, UpgradeConstants, OccurrenceConstants, CampConstants, PerkConstants, TextConstants,
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

        elements: {
            improvementRows: [],
            steppers: {},
        },

        constructor: function () {
            this.initImprovements();
            this.initWorkers();
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

        update: function () {
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
                log.w("Camp UI systen active but no camp found. Switching out.");
                this.playerPosNodes.head.position.inCamp = false;
                GameGlobals.uiFunctions.showTab(GameGlobals.uiFunctions.elementIDs.tabs.out);
                return;
            }
        },

        slowUpdate: function () {
            if (!this.playerLocationNodes.head) return;
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
            this.updateBubble();
        },

        updateBubble: function () {
            var campComponent = this.playerLocationNodes.head.entity.get(CampComponent);
            if (!campComponent) return;
            var buildingNum = this.availableBuildingCount - this.lastShownAvailableBuildingCount + this.visibleBuildingCount - this.lastShownVisibleBuildingCount;
            var eventNum = this.currentEvents - this.lastShownEvents;

            let currentPopulation = Math.floor(campComponent.population);
            var freePopulation = campComponent.getFreePopulation();

            var newBubbleNumber = buildingNum + eventNum + freePopulation;
            if (this.bubbleNumber === newBubbleNumber)
                return;
            this.bubbleNumber = newBubbleNumber;
            $("#switch-in .bubble").text(this.bubbleNumber);
            GameGlobals.uiFunctions.toggle("#switch-in .bubble", this.bubbleNumber > 0);
        },

        updateWorkers: function (isActive) {
            isActive = isActive && !GameGlobals.gameState.uiStatus.isBlocked;
            var campComponent = this.playerLocationNodes.head.entity.get(CampComponent);
			if (!campComponent) return;

            let currentPopulation = Math.floor(campComponent.population);

            if (!isActive) return;
            
            var maxPopulation = this.getCampMaxPopulation();
            var reputation = this.playerLocationNodes.head.entity.get(ReputationComponent).value;
            this.updatePopulationChangeDisplay(campComponent, maxPopulation, reputation);
        },

        getCampMaxPopulation: function () {
            if (!this.playerLocationNodes.head) return;
            return GameGlobals.campHelper.getCampMaxPopulation(this.playerLocationNodes.head.entity);
        },

        updateWorkerStepper: function (campComponent, id, workerType, maxWorkers, showMax) {
            GameGlobals.uiFunctions.toggle($(id).closest("tr"), maxWorkers > 0);

            var freePopulation = campComponent.getFreePopulation();
            var assignedWorkers = Math.max(0, campComponent.assignedWorkers[workerType]) || 0;
            var maxAssigned = Math.min(assignedWorkers + freePopulation, maxWorkers);
            GameGlobals.uiFunctions.updateStepper(id, assignedWorkers, 0, maxAssigned);

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
            $("#in-population p#in-population-status").text("Unassigned workers: " + freePopulation);

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

            GameGlobals.uiFunctions.slideToggleIf("#in-population h3", null, maxPopulation > 0 || campComponent.population > 0, 200, 200);
            GameGlobals.uiFunctions.slideToggleIf("#in-population-reputation", null, maxPopulation > 0 && !isPopulationMaxed, 200, 200);
            GameGlobals.uiFunctions.slideToggleIf("#in-population-bar-next", null, campComponent.population > 0 && !isPopulationStill, 200, 200);
            GameGlobals.uiFunctions.slideToggleIf("#in-population-next", null, campComponent.population > 0 && !isPopulationStill, 200, 200);
            GameGlobals.uiFunctions.slideToggleIf("#in-population-status", null, campComponent.population >= 1, 200, 200);
            GameGlobals.uiFunctions.slideToggleIf("#in-assign-workers", null, campComponent.population >= 1, 200, 200);
        },

        updateAssignedWorkers: function (campComponent) {
            var campComponent = this.playerLocationNodes.head.entity.get(CampComponent);
			if (!campComponent) return;
                
            for (var key in CampConstants.workerTypes) {
                var def = CampConstants.workerTypes[key];
                UIConstants.updateCalloutContent("#in-assign-" + key + " .in-assign-worker-desc .info-callout-target", this.getWorkerDescription(def), true);
            }
            
            for (var key in CampConstants.workerTypes) {
                var def = CampConstants.workerTypes[key];
                var maxWorkers = GameGlobals.campHelper.getMaxWorkers(this.playerLocationNodes.head.entity, key);
                var showMax = maxWorkers >= 0;
                if (maxWorkers < 0) maxWorkers = GameGlobals.campHelper.getCampMaxPopulation(this.playerLocationNodes.head.entity);
                this.updateWorkerStepper(campComponent, "#stepper-" + def.id, def.id, maxWorkers, showMax);
            }
        },

        updateWorkerMaxDescriptions: function () {
            var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
            var posComponent = this.playerPosNodes.head.position;
			var campOrdinal = GameGlobals.gameState.getCampOrdinal(posComponent.level);
            
            for (var key in CampConstants.workerTypes) {
                var def = CampConstants.workerTypes[key];
                var maxWorkers = GameGlobals.campHelper.getMaxWorkers(this.playerLocationNodes.head.entity, key);
                if (maxWorkers <= 0) continue;
                var num = def.getLimitNum(campOrdinal, improvements);
                var text = def.getLimitText(num);
                UIConstants.updateCalloutContent("#in-assign-" + def.id + " .in-assign-worker-limit .info-callout-target", text, true);
            }
        },

        initImprovements: function () {
            var $table = $("#in-improvements table");
            var trs = "";
            this.elements.improvementRows = {};
            for (var key in ImprovementConstants.campImprovements) {
                var def = ImprovementConstants.campImprovements[key];
                var tds = "";
                var buildAction = "build_in_" + key;
                var improveAction = "improve_in_" + key;
                var hasImproveAction = PlayerActionConstants.hasAction(improveAction);
                var useAction = "use_in_" + key;
                var hasUseAction = PlayerActionConstants.hasAction(useAction);
                
                var name = improvementNames[key];
                var buildButton = "<button class='action action-build action-location' action='" + buildAction +"'>" + name + "</button>";
                var useButton = "";
                if (hasUseAction) {
                    useButton = "<button class='action action-use action-location btn-narrow' action='" + useAction + "'>" + def.useActionName + "</button>";
                }
                var improveButton = "";
                if (hasImproveAction) {
                    improveButton = "<button class='action action-improve btn-compact' action='" + improveAction + "'>↑</button>";
                }
                tds += "<td>" + buildButton + "</td>";
                tds += "<td><span class='improvement-badge improvement-count'>0</span></td>";
                tds += "<td style='position:relative'><span class='improvement-badge improvement-level'>0</span>";
                tds += "<span class='improvement-badge improvement-upgrade-level'>0</span>";
                tds += "</td>";
                tds += "<td>" + improveButton + "</td>";
                tds += "<td>" + useButton + "</td>";
                trs += "<tr id='in-improvements-" + key + "'>" + tds + "</tr>";
            }
            let ths = "<tr class='header-mini'><th></th><th>count</th><th>lvl</th><th></th><th></th></tr>"
            $table.append(ths);
            $table.append(trs);
            
            // TODO save elements already in the previous loop
            var result = [];
            $.each($("#in-improvements tr"), function () {
                var id = $(this).attr("id");
                var buildAction = $(this).find("button.action-build").attr("action");
                if (!buildAction) {
                    log.w("In improvement tr without action name: #" + id);
                    return;
                }
                var improveAction = $(this).find("button.action-improve").attr("action");
                var improvementName = GameGlobals.playerActionsHelper.getImprovementNameForAction(buildAction);
                if (!improvementName) return;
                var btnUse = $(this).find(".action-use");
                var btnImprove = $(this).find(".action-improve");
                var count =  $(this).find(".improvement-count")
                var level =  $(this).find(".improvement-level")
                var upgradeLevel =  $(this).find(".improvement-upgrade-level")
                result.push({ tr: $(this), btnUse: btnUse, btnImprove: btnImprove, count: count, level: level, upgradeLevel: upgradeLevel, id: id, action: buildAction, improveAction: improveAction, improvementName: improvementName });
            });
            this.elements.improvementRows = result;
        },
        
        initWorkers: function () {
            var $table = $("#in-assign-workers");
            var trs = "";
            for (var key in CampConstants.workerTypes) {
                var def = CampConstants.workerTypes[key];
                var tds = "";
                tds += "<td class='in-assign-worker-desc'><div class='info-callout-target info-callout-target-small'>" + (def.displayName || def.id) + "</div></td>";
                tds += "<td><div class='stepper' id='stepper-" + def.id + "'></div></td>";
                tds += "<td class='in-assign-worker-limit'><div class='info-callout-target info-callout-target-small'></div></td>"
                trs += "<tr id='in-assign-" + key + "'>" + tds + "</tr>";
            }
            $table.append(trs);
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

            for (var i = 0; i < this.elements.improvementRows.length; i++) {
                var elem = this.elements.improvementRows[i];
                var buildAction = elem.action;
                var id = elem.id;
                var improveAction = elem.improveAction;
                var improvementName = elem.improvementName;
				var requirementCheck = GameGlobals.playerActionsHelper.checkRequirements(buildAction, false, null);
                var buildActionEnabled = requirementCheck.value >= 1;
                var showActionDisabledReason = false;
                if (!buildActionEnabled) {
                    switch (requirementCheck.reason) {
                        case PlayerActionConstants.DISABLED_REASON_NOT_ENOUGH_LEVEL_POP:
                        case PlayerActionConstants.UNAVAILABLE_REASON_LOCKED_RESOURCES:
                            showActionDisabledReason = true;
                    }
                }
                var actionAvailable = GameGlobals.playerActionsHelper.checkAvailability(buildAction, false);
                var existingImprovements = improvements.getCount(improvementName);
                var improvementLevel = improvements.getLevel(improvementName);
                var upgradeLevel = GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementName, this.tribeUpgradesNodes.head.upgrades);
                elem.count.text(existingImprovements);
                elem.count.toggleClass("badge-disabled", existingImprovements < 1);
                elem.level.text(improvementLevel);
                elem.level.toggleClass("badge-disabled", existingImprovements < 1 || !improveAction);
                elem.upgradeLevel.text("+");
                elem.upgradeLevel.toggleClass("badge-disabled", existingImprovements < 1);
                GameGlobals.uiFunctions.toggle(elem.upgradeLevel, existingImprovements > 0 && upgradeLevel > 1);

                var commonVisibilityRule = (buildActionEnabled || existingImprovements > 0 || showActionDisabledReason);
                var specialVisibilityRule = true;
                // TODO get rid of these & move to requirements
                // TODO check TR ids after improvements table remake
                if (id === "in-improvements-shrine") specialVisibilityRule = hasDeity;
                if (id === "in-improvements-tradepost") specialVisibilityRule = campCount > 1;
                if (id === "in-improvements-research") specialVisibilityRule = campCount > 1;
                if (id === "in-improvements-market") specialVisibilityRule = hasTradePost;
                if (id === "in-improvements-inn") specialVisibilityRule = hasTradePost;
                var isVisible = specialVisibilityRule && commonVisibilityRule;
                GameGlobals.uiFunctions.toggle(elem.tr, isVisible);
                GameGlobals.uiFunctions.toggle(elem.btnUse, existingImprovements > 0);
                GameGlobals.uiFunctions.toggle(elem.btnImprove, existingImprovements > 0);
                if (isVisible) visibleBuildingCount++;
                if (actionAvailable) availableBuildingCount++;
            }

            this.availableBuildingCount = availableBuildingCount;
            if (isActive) this.lastShownAvailableBuildingCount = this.availableBuildingCount;
            this.visibleBuildingCount = visibleBuildingCount;
            if (isActive) this.lastShownVisibleBuildingCount = this.visibleBuildingCount;
        },

        updateEvents: function (isActive) {
            isActive = isActive && !GameGlobals.gameState.uiStatus.isBlocked;
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
                    // TODO fix to use game time (and check other usages)
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
                var raidWarning = raidDanger > CampConstants.REPUTATION_PENALTY_DEFENCES_THRESHOLD;
                var defenceS = OccurrenceConstants.getRaidDefenceString(improvements, soldiers, soldierLevel);
				$("#in-demographics-raid-danger .value").text(Math.round(raidDanger * 100) + "%");
				$("#in-demographics-raid-danger .value").toggleClass("warning", raidWarning);
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
                var levelComponent = this.playerLevelNodes.head.level;
				$("#in-demographics-level-population .value").text(levelComponent.populationFactor * 100 + "%");
            }

            GameGlobals.uiFunctions.toggle("#id-demographics-level", showLevelStats);
            GameGlobals.uiFunctions.toggle("#in-demographics", showCalendar || showRaid || showLevelStats);
        },

        getWorkerDescription: function (def) {
            var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
            var productionS = "";
            var generalConsumptionS =
                "<br/><span class='warning'>water -" + UIConstants.roundValue(GameGlobals.campHelper.getWaterConsumptionPerSecond(1), true, true) + "/s</span>" +
                "<br/><span class='warning'>food -" + UIConstants.roundValue(GameGlobals.campHelper.getFoodConsumptionPerSecond(1), true, true) + "/s</span>";
            var specialConsumptionS = "";
            switch (def.id) {
                case CampConstants.workerTypes.scavenger.id:
                    productionS = "metal +" + UIConstants.roundValue(GameGlobals.campHelper.getMetalProductionPerSecond(1, improvements), true, true) + "/s";
                    break;
                case CampConstants.workerTypes.trapper.id:
                    productionS = "food +" + UIConstants.roundValue(GameGlobals.campHelper.getFoodProductionPerSecond(1, improvements), true, true) + "/s";
                    break;
                case CampConstants.workerTypes.water.id:
                    productionS = "water +" + UIConstants.roundValue(GameGlobals.campHelper.getWaterProductionPerSecond(1, improvements), true, true) + "/s";
                    break;
                case CampConstants.workerTypes.ropemaker.id:
                    productionS = "rope +" + UIConstants.roundValue(GameGlobals.campHelper.getRopeProductionPerSecond(1, improvements), true, true) + "/s";
                    break;
                case CampConstants.workerTypes.chemist.id:
                    productionS = "fuel +" + UIConstants.roundValue(GameGlobals.campHelper.getFuelProductionPerSecond(1, improvements), true, true) + "/s";
                    break;
                case CampConstants.workerTypes.rubbermaker.id:
                    productionS = "rubber +" + UIConstants.roundValue(GameGlobals.campHelper.getRubberProductionPerSecond(1, improvements), true, true) + "/s";
                    break;
                case CampConstants.workerTypes.gardener.id:
                    productionS = "herbs +" + UIConstants.roundValue(GameGlobals.campHelper.getHerbsProductionPerSecond(1, improvements), true, true) + "/s";
                    break;
                case CampConstants.workerTypes.apothecary.id:
                    productionS = "medicine +" + UIConstants.roundValue(GameGlobals.campHelper.getMedicineProductionPerSecond(1, improvements), true, true) + "/s";
                    specialConsumptionS = "<br/><span class='warning'>herbs -" + GameGlobals.campHelper.getHerbsConsumptionPerSecond(1) + "/s</span>";
                    break;
                case CampConstants.workerTypes.concrete.id:
                    productionS = "concrete +" + UIConstants.roundValue(GameGlobals.campHelper.getConcreteProductionPerSecond(1, improvements), true, true) + "/s";
                    specialConsumptionS = "<br/><span class='warning'>metal -" + GameGlobals.campHelper.getMetalConsumptionPerSecondConcrete(1) + "/s</span>";
                    break;
                case CampConstants.workerTypes.toolsmith.id:
                    productionS = "tools +" + UIConstants.roundValue(GameGlobals.campHelper.getToolsProductionPerSecond(1, improvements), true, true) + "/s";
                    specialConsumptionS = "<br/><span class='warning'>metal -" + GameGlobals.campHelper.getMetalConsumptionPerSecondSmith(1) + "/s</span>";
                    break;
                case CampConstants.workerTypes.scientist.id:
                    productionS = "evidence +" + UIConstants.roundValue(GameGlobals.campHelper.getEvidenceProductionPerSecond(1, improvements), true, true) + "/s";
                    break;
                case CampConstants.workerTypes.cleric.id:
                    productionS = "favour +" + UIConstants.roundValue(GameGlobals.campHelper.getFavourProductionPerSecond(1, improvements), true, true, 100000) + "/s";
                    break;
                case CampConstants.workerTypes.soldier.id:
                    var soldierLevel = GameGlobals.upgradeEffectsHelper.getWorkerLevel("soldier", this.tribeUpgradesNodes.head.upgrades);
                    productionS = "camp defence +" + CampConstants.getSoldierDefence(soldierLevel);
                    break;
                default:
                    log.w("no description defined for worker type: " + def.id);
                    break;
            }
            return productionS + generalConsumptionS + specialConsumptionS;
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

        onGameShown: function () {
            if (!this.playerLocationNodes.head) return;
            this.refresh();
        },

        hasUpgrade: function (upgradeId) {
            return this.tribeUpgradesNodes.head.upgrades.hasUpgrade(upgradeId);
        }

    });

    return UIOutCampSystem;
});
