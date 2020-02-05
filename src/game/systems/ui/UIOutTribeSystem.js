define([
    'ash',
    'game/GameGlobals',
    'game/GlobalSignals',
    'game/constants/UIConstants',
    'game/constants/CampConstants',
    'game/constants/OccurrenceConstants',
    'game/nodes/sector/CampNode',
    'game/nodes/PlayerPositionNode',
	'game/nodes/player/PlayerStatsNode',
    'game/nodes/tribe/TribeUpgradesNode',
    'game/components/common/PositionComponent',
    'game/components/common/ResourcesComponent',
    'game/components/common/ResourceAccumulationComponent',
    'game/components/type/LevelComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/components/sector/events/TraderComponent',
    'game/components/sector/events/RaidComponent'
], function (
    Ash, GameGlobals, GlobalSignals, UIConstants, CampConstants, OccurrenceConstants,
    CampNode, PlayerPositionNode, PlayerStatsNode, TribeUpgradesNode,
    PositionComponent, ResourcesComponent, ResourceAccumulationComponent, LevelComponent, SectorImprovementsComponent, TraderComponent, RaidComponent
) {
    var UIOutTribeSystem = Ash.System.extend({

		engine: null,

        campNodes: null,
        sortedCampNodes: null,
		playerPosNodes: null,
        playerStatsNodes: null,
        tribeUpgradesNodes: null,

        campNotificationTypes: {
            NONE: "none",
            EVENT_RAID_ONGOING: "event_raid-ongoing",
            EVENT_RAID_RECENT: "event_raid-recent",
            EVENT_TRADER: "event_trader",
            POP_UNASSIGNED: "population-unassigned",
            POP_DECREASING: "population-decreasing",
            POP_INCREASING: "population-increasing"
        },

        constructor: function () {
            return this;
        },

        addToEngine: function (engine) {
			this.engine  = engine;
            this.campNodes = engine.getNodeList(CampNode);
            this.playerPosNodes = engine.getNodeList(PlayerPositionNode);
            this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
            this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
            GlobalSignals.add(this, GlobalSignals.campBuiltSignal, this.onCampBuilt);
            GlobalSignals.add(this, GlobalSignals.slowUpdateSignal, this.slowUpdate);
            GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.onTabChanged);
            
            this.sortCampNodes();
        },

        removeFromEngine: function (engine) {
			this.engine = null;
            this.campNodes = null;
            this.playerPosNodes = null;
            GlobalSignals.removeAll(this);
        },

        update: function () {
            if (GameGlobals.gameState.uiStatus.isHidden) return;
            var isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.world;
            if (isActive) this.updateNodes(isActive);
            this.updateBubble();
        },

        slowUpdate: function () {
            if (GameGlobals.gameState.uiStatus.isHidden) return;
            var isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.world;
            if (!isActive) this.updateNodes(isActive);
        },

        updateNodes: function (isActive) {
            this.alerts = {};
            this.notifications = {};
            this.campsWithAlert = 0;
            for (var i = 0; i < this.sortedCampNodes.length; i++) {
                this.updateNode(this.sortedCampNodes[i], isActive);
            }
        },

        refresh: function () {
			$("#tab-header h2").text("Tribe");
            this.updateMessages();
            this.updateNodes();
        },

        updateBubble: function () {
            if (this.campsWithAlert === this.bubbleNumber)
                return;
            this.updateMessages();
            this.bubbleNumber = this.campsWithAlert;
            $("#switch-world .bubble").text(this.bubbleNumber)
            GameGlobals.uiFunctions.toggle("#switch-world .bubble", this.bubbleNumber > 0);
        },

        updateMessages: function () {
            // pick one
            var vosbyprio = [];
            var highestprio = -1;
            for (var lvl in this.notifications) {
                for (var i = 0; i < this.notifications[lvl].length; i++) {
                    var type = this.notifications[lvl][i];
                    var prio = this.getNotificationPriority(type);
                    if (!vosbyprio[prio]) vosbyprio[prio] = [];
                    if (highestprio < 0 || prio < highestprio) highestprio = prio;
                    vosbyprio[prio].push({ lvl: lvl, type: type });
                }
            }

            // show
            var msg = "No news from other camps at the moment.";
            if (highestprio > 0) {
                var selection = vosbyprio[highestprio];
                var vo = selection[Math.floor(Math.random()*selection.length)];
                msg = this.getNotificationMessage(vo.type, vo.lvl) || msg;
            }
            $("#world-message").text(msg);
        },

		updateNode: function (node, isActive) {
            if (!node.entity) return;
            
			var camp = node.camp;
			var level = node.entity.get(PositionComponent).level;

            this.updateCampNotifications(node);

            var isAlert = this.alerts[level].length > 0;
            if (isAlert) this.campsWithAlert++;

            if (!isActive) return;

			var rowID = "summary-camp-" + level;
			var row = $("#camp-overview tr#" + rowID);

			if (row.length < 1) {
				this.createCampRow(node, rowID);
			}

			// Update row
			this.updateCampRow(node, rowID, isAlert, this.alerts[level]);
		},

        updateCampNotifications: function (node) {
			var camp = node.camp;
			var level = node.entity.get(PositionComponent).level;
			var playerPosComponent = this.playerPosNodes.head.position;
            var isPlayerInCampLevel = level === playerPosComponent.level;

            this.alerts[level] = [];
            this.notifications[level] = [];

            var hasTrader = node.entity.has(TraderComponent);
            var hasRaid = node.entity.has(RaidComponent);
            var secondsSinceLastRaid = camp.lastRaid ? Math.floor((new Date() - camp.lastRaid.timestamp) / 1000) : 0;
            var hasRecentRaid = camp.lastRaid && !camp.lastRaid.wasVictory && camp.lastRaid.isValid() && secondsSinceLastRaid < 60 * 60;
            var unAssignedPopulation = camp.getFreePopulation();

            if (!isPlayerInCampLevel) {
                if (hasRaid) {
                    this.alerts[level].push(this.campNotificationTypes.EVENT_RAID_ONGOING);
                    this.notifications[level].push(this.campNotificationTypes.EVENT_RAID_ONGOING);
                }
                if (hasRecentRaid) {
                    this.notifications[level].push(this.campNotificationTypes.EVENT_RAID_RECENT);
                }
                if (hasTrader) {
                    this.alerts[level].push(this.campNotificationTypes.EVENT_TRADER);
                    this.notifications[level].push(this.campNotificationTypes.EVENT_TRADER);
                }
                if (unAssignedPopulation > 0) {
                    this.alerts[level].push(this.campNotificationTypes.POP_UNASSIGNED);
                    this.notifications[level].push(this.campNotificationTypes.POP_UNASSIGNED);
                }
                if (camp.populationChangePerSec < 0) {
                    this.alerts[level].push(this.campNotificationTypes.POP_DECREASING);
                    this.notifications[level].push(this.campNotificationTypes.POP_DECREASING);
                }
                if (camp.populationChangePerSec > 0) {
                    this.notifications[level].push(this.campNotificationTypes.POP_INCREASING);
                }
            }
        },

        createCampRow: function (node, rowID) {
			var camp = node.camp;
			var level = node.entity.get(PositionComponent).level;

            var rowHTML = "<tr id='" + rowID + "' class='lvl13-box-1 camp-overview-camp'>";
            var btnID = "out-action-move-camp-" + level;
            var btnAction = "move_camp_global_" + level;
            rowHTML += "<td class='camp-overview-level'><div class='camp-overview-level-container lvl13-box-1'>" + level + "</div></td>";
            rowHTML += "<td class='camp-overview-name'>" + camp.campName + "</td>";
            rowHTML += "<td class='camp-overview-population list-amount'><span class='value'></span><span class='change-indicator'></span></td>";
            rowHTML += "<td class='camp-overview-reputation list-amount'><span class='value'></span><span class='change-indicator'></span></td>";
            rowHTML += "<td class='camp-overview-raid list-amount'><span class='value'></span></span></td>";
            rowHTML += "<td class='camp-overview-levelpop list-amount'></td>";
            rowHTML += "<td class='camp-overview-storage list-amount'></td>";
            rowHTML += "<td class='camp-overview-production'>";
            for(var key in resourceNames) {
                var name = resourceNames[key];
                rowHTML += UIConstants.createResourceIndicator(name, false, rowID + "-" + name, false, true) + " ";
            }
            rowHTML += "</td>";
            
            rowHTML += "<td class='camp-overview-stats'>";
            rowHTML += "<span class='camp-overview-stats-evidence info-callout-target info-callout-target-small'>";
            rowHTML += "<span class='icon'><img src='img/stat-evidence.png' alt='evidence'/></span><span class='change-indicator'></span> ";
            rowHTML += "</span> ";
            rowHTML += "<span class='camp-overview-stats-rumours info-callout-target info-callout-target-small'>";
            rowHTML += "<span class='icon'><img src='img/stat-rumours.png' alt='rumours'/><span class='change-indicator'></span> ";
            rowHTML += "</span>";
            rowHTML += "</td>";

            rowHTML += "<td class='camp-overview-btn'><button class='btn-mini action action-move' id='" + btnID + "' action='" + btnAction + "'>Go</button></td>";
            rowHTML += "<td class='camp-overview-camp-bubble'><div class='bubble info-callout-target info-callout-target-small' description=''>!</div></td>";

            rowHTML += "</tr>";
            $("#camp-overview").append(rowHTML);
            $("#" + btnID).click(function(e) {
                GameGlobals.uiFunctions.onTabClicked(GameGlobals.uiFunctions.elementIDs.tabs.in, GameGlobals.gameState, GameGlobals.uiFunctions);
            });
            GameGlobals.uiFunctions.registerActionButtonListeners("#" + rowID);
            GameGlobals.uiFunctions.generateButtonOverlays("#" + rowID);
            GameGlobals.uiFunctions.generateCallouts("#" + rowID);
            GlobalSignals.elementCreatedSignal.dispatch();
        },

        updateCampRow: function (node, rowID, isAlert, alerts) {
			var camp = node.camp;
			var level = node.entity.get(PositionComponent).level;
			var playerPosComponent = this.playerPosNodes.head.position;
            var isPlayerInCampLevel = level === playerPosComponent.level;
            var unAssignedPopulation = camp.getFreePopulation();
			var improvements = node.entity.get(SectorImprovementsComponent);

            $("#camp-overview tr#" + rowID).toggleClass("current", isPlayerInCampLevel);
			GameGlobals.uiFunctions.toggle("#camp-overview tr#" + rowID + " .camp-overview-btn button", !isPlayerInCampLevel);
			$("#camp-overview tr#" + rowID + " .camp-overview-name").text(camp.campName);
			GameGlobals.uiFunctions.toggle("#camp-overview tr#" + rowID + " .camp-overview-camp-bubble .bubble", isAlert);

            var alertDesc = "";
            for (var i = 0; i < alerts.length; i++) {
                alertDesc += this.getAlertDescription(alerts[i]);
                if (i !== alerts.length - 1) alertDesc += "<br/>";
            }
            UIConstants.updateCalloutContent("#camp-overview tr#" + rowID + " .camp-overview-camp-bubble .bubble", alertDesc, true);
            
            var maxPopulation = CampConstants.getHousingCap(improvements);
			$("#camp-overview tr#" + rowID + " .camp-overview-population .value").text(Math.floor(camp.population) + "/" + maxPopulation + (unAssignedPopulation > 0 ? " (" + unAssignedPopulation + ")" : ""));
			$("#camp-overview tr#" + rowID + " .camp-overview-population .value").toggleClass("warning", camp.populationChangePerSec < 0);
            this.updateChangeIndicator($("#camp-overview tr#" + rowID + " .camp-overview-population .change-indicator"), camp.populationChangePerSec);

            var reputationComponent = node.reputation;
            $("#camp-overview tr#" + rowID + " .camp-overview-reputation .value").text(UIConstants.roundValue(reputationComponent.value, true, true) + "/" + UIConstants.roundValue(reputationComponent.targetValue, true, true));
            $("#camp-overview tr#" + rowID + " .camp-overview-reputation .value").toggleClass("warning", reputationComponent.targetValue < 1);
            this.updateChangeIndicator($("#camp-overview tr#" + rowID + " .camp-overview-reputation .change-indicator"), reputationComponent.accumulation);
            
			var soldiers = camp.assignedWorkers.soldier;
            var soldierLevel = GameGlobals.upgradeEffectsHelper.getWorkerLevel("soldier", this.tribeUpgradesNodes.head.upgrades);
			var raidDanger = OccurrenceConstants.getRaidDanger(improvements, soldiers, soldierLevel);
            var raidWarning = raidDanger > CampConstants.REPUTATION_PENALTY_DEFENCES_THRESHOLD;
            $("#camp-overview tr#" + rowID + " .camp-overview-raid .value").text(UIConstants.roundValue(raidDanger * 100) + "%");
            $("#camp-overview tr#" + rowID + " .camp-overview-raid .value").toggleClass("warning", raidWarning);

            var levelVO = GameGlobals.levelHelper.getLevelEntityForSector(node.entity).get(LevelComponent).levelVO;
			$("#camp-overview tr#" + rowID + " .camp-overview-levelpop").text(levelVO.populationGrowthFactor * 100 + "%");

            // TODO updateResourceIndicatorCallout is a performance bottleneck
			var resources = node.entity.get(ResourcesComponent);
			var resourceAcc = node.entity.get(ResourceAccumulationComponent);
			for (var key in resourceNames) {
				var name = resourceNames[key];
				var amount = Math.floor(resources.resources[name]);
				var change = resourceAcc.resourceChange.getResource(name);
                var storage = GameGlobals.resourcesHelper.getCurrentCampStorage(node.entity);
                var indicatorID = "#" + rowID + "-" + name;
				UIConstants.updateResourceIndicator(
					indicatorID,
					amount,
					change,
					storage,
					false,
                    true,
					false,
					false,
                    name === resourceNames.food || name === resourceNames.water,
					amount > 0 || Math.abs(change) > 0.001);
				UIConstants.updateResourceIndicatorCallout("#" + rowID+"-"+name, resourceAcc.getSources(name));
			}
            
			var evidenceComponent = this.playerStatsNodes.head.evidence;
            var evidenceChange = evidenceComponent.accumulationPerCamp[level] || 0;
            GameGlobals.uiFunctions.toggle($("#camp-overview tr#" + rowID + " .camp-overview-stats-evidence"), evidenceChange > 0);
            this.updateChangeIndicator($("#camp-overview tr#" + rowID + " .camp-overview-stats-evidence .change-indicator"), evidenceChange);
            UIConstants.updateCalloutContent("#camp-overview tr#" + rowID + " .camp-overview-stats-evidence", "evidence: " + UIConstants.roundValue(evidenceChange, true, true, 1000), true);
            
			var rumoursComponent = this.playerStatsNodes.head.rumours;
            var rumoursChange = rumoursComponent.accumulationPerCamp[level] || 0;
            GameGlobals.uiFunctions.toggle($("#camp-overview tr#" + rowID + " .camp-overview-stats-rumours"), rumoursChange > 0);
            this.updateChangeIndicator($("#camp-overview tr#" + rowID + " .camp-overview-stats-rumours .change-indicator"), rumoursChange);
            UIConstants.updateCalloutContent("#camp-overview tr#" + rowID + " .camp-overview-stats-rumours", "rumours: " + UIConstants.roundValue(rumoursChange, true, true, 1000), true);
            
			var hasTradePost = improvements.getCount(improvementNames.tradepost) > 0;
            var storageText = resources.storageCapacity;
            if (!hasTradePost) {
                storageText = "(" + resources.storageCapacity + ")";
            }
			$("#camp-overview tr#" + rowID + " .camp-overview-storage").text(storageText);
        },

        getAlertDescription: function (notificationType) {
            switch (notificationType) {
                case this.campNotificationTypes.EVENT_RAID_ONGOING: return "raid";
                case this.campNotificationTypes.EVENT_TRADER: return "trader";
                case this.campNotificationTypes.POP_UNASSIGNED: return "unassigned workers";
                case this.campNotificationTypes.POP_DECREASING: return "population decreasing";
                default: return "";
            }
        },

        getNotificationMessage: function (notificationType, level) {
            switch (notificationType) {
                case this.campNotificationTypes.EVENT_RAID_RECENT:
                    var campComponent = null;
                    // TODO global solution to level -> camp node
                    for (var node = this.campNodes.head; node; node = node.next) {
                        if (node.entity.get(PositionComponent).level == level) {
                            campComponent = node.camp;
                        }
                    }
                    var timeS = "(" + UIConstants.getTimeSinceText(campComponent.lastRaid.timestamp) + " ago)";
                    return "There has been a raid on level " + level + " " + timeS + ". We need better defences.";
                case this.campNotificationTypes.EVENT_TRADER: return "There is a trader currently on level " + level + ".";
                case this.campNotificationTypes.POP_UNASSIGNED: return "Unassigned workers on level " + level + ".";
                case this.campNotificationTypes.POP_DECREASING: return "Population is decreasing on level " + level + "!";
                case this.campNotificationTypes.POP_INCREASING: return "Population is increasing on level " + level + ".";
                default: return null;
            }
        },

        // smaller number -> higher prio
        getNotificationPriority: function (notificationType) {
            switch (notificationType) {
                case this.campNotificationTypes.EVENT_RAID_ONGOING: return 2;
                case this.campNotificationTypes.EVENT_RAID_RECENT: return 2;
                case this.campNotificationTypes.EVENT_TRADER: return 3;
                case this.campNotificationTypes.POP_UNASSIGNED: return 2;
                case this.campNotificationTypes.POP_DECREASING: return 1;
                case this.campNotificationTypes.POP_INCREASING: return 4;
                default: return 5;
            }
        },

        updateChangeIndicator: function (indicator, accumulation, showWarning) {
            indicator.toggleClass("indicator-increase", accumulation > 0);
            indicator.toggleClass("indicator-even", accumulation === 0);
            indicator.toggleClass("indicator-decrease", !showWarning && accumulation < 0);
        },
        
        sortCampNodes: function () {
            // todo don't do the first loop on every update?
            var nodes = [];
            for (var node = this.campNodes.head; node; node = node.next) {
                nodes.push(node);
            }
            nodes.sort(function (a, b) {
                var levela = a.entity.get(PositionComponent).level;
                var levelb = b.entity.get(PositionComponent).level;
                return levelb - levela;
            });
            this.sortedCampNodes = nodes;
        },

        onTabChanged: function () {
            if (GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.world) {
                this.sortCampNodes();
                this.refresh();
            }
        },
        
        onCampBuilt: function () {
            $("#camp-overview .camp-overview-camp").remove();
            this.sortCampNodes();
        }

    });

    return UIOutTribeSystem;
});
