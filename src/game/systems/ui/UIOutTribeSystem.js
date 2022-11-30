define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/UIConstants',
	'game/constants/CampConstants',
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
	Ash, GameGlobals, GlobalSignals, UIConstants, CampConstants, OccurrenceConstants, WorldConstants,
	CampNode, PlayerPositionNode, PlayerStatsNode, TribeUpgradesNode,
	PositionComponent, ResourcesComponent, ResourceAccumulationComponent, DeityComponent, LevelComponent, SectorImprovementsComponent, RecruitComponent, TraderComponent, RaidComponent, OutgoingCaravansComponent
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
			EVENT_RECRUIT: "event_recruit",
			POP_UNASSIGNED: "population-unassigned",
			POP_DECREASING: "population-decreasing",
			POP_INCREASING: "population-increasing",
			BUILDING_DAMAGED: "building-damaged",
			EVENT_OUTGOING_CARAVAN: "outoing-caravan",
			STATUS_NON_REACHABLE_BY_TRADERS: "not-reachable-by-traders",
		},

		constructor: function () {
			this.initElements();
			return this;
		},

		addToEngine: function (engine) {
			this.engine = engine;
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
		
		initElements: function () {
			for (let i = WorldConstants.CAMPS_TOTAL; i > WorldConstants.CAMP_ORDINAL_GROUND; i--) {
				this.createCampRow(i, this.getCampRowID(i));
			}
			this.createLevel14Row();
			for (let i = 1; i <= WorldConstants.CAMP_ORDINAL_GROUND; i++) {
				this.createCampRow(i, this.getCampRowID(i));
			}
		},

		update: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			this.updateBubble();
		},

		slowUpdate: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			var isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.world;
			this.updateNodes(isActive);
		},

		refresh: function () {
			$("#tab-header h2").text("Tribe");
			this.updateNodes(true);
			this.updateMessages();
			
			GameGlobals.uiFunctions.toggle(".camp-overview-lvl14", GameGlobals.gameState.numCamps > 8);
			$(".camp-overview-lvl14 hr").toggleClass("warning", GameGlobals.levelHelper.getLevelBuiltOutImprovementsCount(14, improvementNames.tradepost_connector) <= 0);
		},
		
		updateNodes: function (isActive) {
			this.alerts = {};
			this.notifications = {};
			this.campsWithAlert = 0;
			for (let i = 0; i < this.sortedCampNodes.length; i++) {
				this.updateNode(this.sortedCampNodes[i], isActive);
			}
		},

		updateBubble: function () {
			GameGlobals.uiFunctions.updateBubble("#switch-world .bubble", this.bubbleNumber, this.campsWithAlert);
			this.bubbleNumber = this.campsWithAlert;
		},

		updateMessages: function () {
			// pick one
			var vosbyprio = [];
			var highestprio = -1;
			for (var lvl in this.notifications) {
				for (let i = 0; i < this.notifications[lvl].length; i++) {
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
			var campOrdinal = GameGlobals.gameState.getCampOrdinal(level);
			
			this.updateCampNotifications(node);

			var isAlert = this.alerts[level].length > 0;
			if (isAlert) this.campsWithAlert++;

			if (!isActive) return;

			var rowID = this.getCampRowID(campOrdinal);
			var row = $("#camp-overview tr#" + rowID);
			
			GameGlobals.uiFunctions.toggle(row, true);

			if (row.length < 1) {
				log.w("camp row missing: " + campOrdinal);
				return;
			}

			// Update row
			this.updateCampRowMisc(node, rowID, isAlert, this.alerts[level]);
			this.updateCampRowResources(node, rowID);
			this.updateCampRowStats(node, rowID);
		},

		updateCampNotifications: function (node) {
			var camp = node.camp;
			var level = node.entity.get(PositionComponent).level;
			var caravansComponent = node.entity.get(OutgoingCaravansComponent);
			var playerPosComponent = this.playerPosNodes.head.position;
			var isPlayerInCampLevel = level === playerPosComponent.level;

			this.alerts[level] = [];
			this.notifications[level] = [];

			var hasTrader = node.entity.has(TraderComponent);
			var hasRecruit = node.entity.has(RecruitComponent);
			var hasRaid = node.entity.has(RaidComponent);
			var secondsSinceLastRaid = camp.lastRaid ? Math.floor((new Date() - camp.lastRaid.timestamp) / 1000) : 0;
			var hasRecentRaid = camp.lastRaid && !camp.lastRaid.wasVictory && camp.lastRaid.isValid() && secondsSinceLastRaid < 60 * 60;
			var unAssignedPopulation = camp.getFreePopulation();
			
			var improvements = node.entity.get(SectorImprovementsComponent);
			let hasDamagedBuildings = improvements.hasDamagedBuildings();
			
			var numCaravans = caravansComponent.outgoingCaravans.length;

			if (!isPlayerInCampLevel) {
				if (hasRaid) {
					this.notifications[level].push(this.campNotificationTypes.EVENT_RAID_ONGOING);
				}
				if (hasRecentRaid) {
					this.notifications[level].push(this.campNotificationTypes.EVENT_RAID_RECENT);
				}
				if (hasRecruit) {
					this.alerts[level].push(this.campNotificationTypes.EVENT_RECRUIT);
					this.notifications[level].push(this.campNotificationTypes.EVENT_RECRUIT);
				}
				if (hasTrader) {
					this.alerts[level].push(this.campNotificationTypes.EVENT_TRADER);
					this.notifications[level].push(this.campNotificationTypes.EVENT_TRADER);
				}
				if (unAssignedPopulation > 0) {
					this.alerts[level].push(this.campNotificationTypes.POP_UNASSIGNED);
					this.notifications[level].push(this.campNotificationTypes.POP_UNASSIGNED);
				}
				if (hasDamagedBuildings) {
					this.alerts[level].push(this.campNotificationTypes.BUILDING_DAMAGED);
					this.notifications[level].push(this.campNotificationTypes.BUILDING_DAMAGED);
				}
				if (camp.populationChangePerSec < 0) {
					this.alerts[level].push(this.campNotificationTypes.POP_DECREASING);
					this.notifications[level].push(this.campNotificationTypes.POP_DECREASING);
				}
				if (camp.populationChangePerSec > 0) {
					this.notifications[level].push(this.campNotificationTypes.POP_INCREASING);
				}
				if (numCaravans > 0) {
					this.notifications[level].push(this.campNotificationTypes.EVENT_OUTGOING_CARAVAN);
				}
			}
			
			if (level > 14 && !GameGlobals.levelHelper.isCampReachableByTribeTraders(node.entity)) {
				this.notifications[level].push(this.campNotificationTypes.STATUS_NON_REACHABLE_BY_TRADERS)
			}
		},

		createCampRow: function (campOrdinal, rowID) {
			var rowHTML = "<tr id='" + rowID + "' class='camp-overview-camp'>";
			var btnID = "out-action-move-camp-" + campOrdinal;
			var btnAction = "move_camp_global_" + campOrdinal;
			rowHTML += "<td class='camp-overview-level'><div class='camp-overview-level-container lvl13-box-1'></div></td>";
			rowHTML += "<td class='camp-overview-name'></td>";
			rowHTML += "<td class='camp-overview-population list-amount nowrap'><span class='value'></span><span class='change-indicator'></span></td>";
			rowHTML += "<td class='camp-overview-reputation list-amount nowrap'><span class='value'></span><span class='change-indicator'></span></td>";
			rowHTML += "<td class='camp-overview-raid list-amount'><span class='value'></span></span></td>";
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
			rowHTML += "<span class='icon'><img src='img/stat-rumours.png' alt='rumours'/></span><span class='change-indicator'></span> ";
			rowHTML += "</span>";
			rowHTML += "<span class='camp-overview-stats-favour info-callout-target info-callout-target-small'>";
			rowHTML += "<span class='icon'><img src='img/stat-favour.png' alt='favour'/></span><span class='change-indicator'></span> ";
			rowHTML += "</span>";
			rowHTML += "</td>";

			rowHTML += "<td class='camp-overview-btn'><button class='btn-mini action action-move' id='" + btnID + "' action='" + btnAction + "'>Go</button></td>";
			rowHTML += "<td class='camp-overview-camp-bubble'><div class='bubble info-callout-target info-callout-target-small' description=''>!</div></td>";

			rowHTML += "</tr>";
			$("#camp-overview").append(rowHTML);
			$("#" + btnID).click(function(e) {
				GameGlobals.uiFunctions.onTabClicked(GameGlobals.uiFunctions.elementIDs.tabs.in, GameGlobals.gameState, GameGlobals.uiFunctions);
			});
			
			var row = $("#camp-overview tr#" + rowID);
			GameGlobals.uiFunctions.toggle(row, false);
		},
		
		createLevel14Row: function () {
			var rowHTML = "<tr class='camp-overview-special-row'>";
			rowHTML += "<td class='camp-overview-lvl14' colspan=10><hr></td>";
			rowHTML += "</tr>";
			$("#camp-overview").append(rowHTML);
		},

		updateCampRowMisc: function (node, rowID, isAlert, alerts) {
			var camp = node.camp;
			var level = node.entity.get(PositionComponent).level;
			var playerPosComponent = this.playerPosNodes.head.position;
			var isPlayerInCampLevel = level === playerPosComponent.level;
			var unAssignedPopulation = camp.getFreePopulation();
			var improvements = node.entity.get(SectorImprovementsComponent);
			var levelComponent = GameGlobals.levelHelper.getLevelEntityForSector(node.entity).get(LevelComponent);

			$("#camp-overview tr#" + rowID).toggleClass("current", isPlayerInCampLevel);
			GameGlobals.uiFunctions.toggle("#camp-overview tr#" + rowID + " .camp-overview-btn button", !isPlayerInCampLevel);
			$("#camp-overview tr#" + rowID + " .camp-overview-name").text(camp.campName);
			GameGlobals.uiFunctions.toggle("#camp-overview tr#" + rowID + " .camp-overview-camp-bubble .bubble", isAlert);
			
			$("#camp-overview tr#" + rowID + " .camp-overview-level-container").text(level);
			$("#camp-overview tr#" + rowID + " .camp-overview-level-container").toggleClass("lvl-container-camp-normal", levelComponent.populationFactor == 1);
			$("#camp-overview tr#" + rowID + " .camp-overview-level-container").toggleClass("lvl-container-camp-outpost", levelComponent.populationFactor < 1);
			$("#camp-overview tr#" + rowID + " .camp-overview-level-container").toggleClass("lvl-container-camp-capital", levelComponent.populationFactor > 1);

			var alertDesc = "";
			for (let i = 0; i < alerts.length; i++) {
				alertDesc += this.getAlertDescription(alerts[i]);
				if (i !== alerts.length - 1) alertDesc += "<br/>";
			}
			UIConstants.updateCalloutContent("#camp-overview tr#" + rowID + " .camp-overview-camp-bubble .bubble", alertDesc, true);
			
			var maxPopulation = CampConstants.getHousingCap(improvements);
			$("#camp-overview tr#" + rowID + " .camp-overview-population .value").text(Math.floor(camp.population) + "/" + maxPopulation + (unAssignedPopulation > 0 ? " (" + unAssignedPopulation + ")" : ""));
			$("#camp-overview tr#" + rowID + " .camp-overview-population .value").toggleClass("warning", camp.populationChangePerSec < 0);
			this.updateChangeIndicator($("#camp-overview tr#" + rowID + " .camp-overview-population .change-indicator"), camp.populationChangePerSec);

			var reputationComponent = node.reputation;
			let reputationValue = UIConstants.roundValue(reputationComponent.value, true, true);
			$("#camp-overview tr#" + rowID + " .camp-overview-reputation .value").text(reputationValue);
			$("#camp-overview tr#" + rowID + " .camp-overview-reputation .value").toggleClass("warning", reputationComponent.targetValue < 1);
			this.updateChangeIndicator($("#camp-overview tr#" + rowID + " .camp-overview-reputation .change-indicator"), reputationComponent.accumulation);
			
			var soldiers = camp.assignedWorkers.soldier;
			var soldierLevel = GameGlobals.upgradeEffectsHelper.getWorkerLevel("soldier", this.tribeUpgradesNodes.head.upgrades);
			var raidDanger = OccurrenceConstants.getRaidDanger(improvements, soldiers, soldierLevel, levelComponent.raidDangerFactor);
			var raidWarning = raidDanger > CampConstants.REPUTATION_PENALTY_DEFENCES_THRESHOLD;
			$("#camp-overview tr#" + rowID + " .camp-overview-raid .value").text(UIConstants.roundValue(raidDanger * 100) + "%");
			$("#camp-overview tr#" + rowID + " .camp-overview-raid .value").toggleClass("warning", raidWarning);
			
			var resources = node.entity.get(ResourcesComponent);
			var hasTradePost = improvements.getCount(improvementNames.tradepost) > 0;
			var storageText = resources.storageCapacity;
			if (!hasTradePost) {
				storageText = "(" + resources.storageCapacity + ")";
			}
			$("#camp-overview tr#" + rowID + " .camp-overview-storage").text(storageText);
		},
		
		updateCampRowResources: function (node, rowID) {
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
					true,
					false,
					false,
					name === resourceNames.food || name === resourceNames.water,
					Math.abs(change) > 0.001,
					false
				);
				UIConstants.updateResourceIndicatorCallout("#" + rowID+"-"+name, resourceAcc.getSources(name));
			}
		},
		
		updateCampRowStats: function (node, rowID) {
			var level = node.entity.get(PositionComponent).level;
			
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
			
			var deityComponent = this.playerStatsNodes.head.entity.get(DeityComponent);
			var favourChange = deityComponent ? deityComponent.accumulationPerCamp[level] || 0 : 0;
			GameGlobals.uiFunctions.toggle($("#camp-overview tr#" + rowID + " .camp-overview-stats-favour"), favourChange > 0);
			this.updateChangeIndicator($("#camp-overview tr#" + rowID + " .camp-overview-stats-favour .change-indicator"), favourChange);
			UIConstants.updateCalloutContent("#camp-overview tr#" + rowID + " .camp-overview-stats-favour", "favour: " + UIConstants.roundValue(favourChange, true, true, 1000), true);
		},

		getAlertDescription: function (notificationType) {
			switch (notificationType) {
				case this.campNotificationTypes.EVENT_RAID_ONGOING: return "raid";
				case this.campNotificationTypes.EVENT_TRADER: return "trader";
				case this.campNotificationTypes.EVENT_RECRUIT: return "visitor";
				case this.campNotificationTypes.POP_UNASSIGNED: return "unassigned workers";
				case this.campNotificationTypes.POP_DECREASING: return "population decreasing";
				case this.campNotificationTypes.BUILDING_DAMAGED: return "damaged building";
				case this.campNotificationTypes.EVENT_OUTGOING_CARAVAN: return "outgoing caravan";
				default: return "";
			}
		},

		getNotificationMessage: function (notificationType, level) {
			let campNode = GameGlobals.campHelper.getCampNodeForLevel(level);
			switch (notificationType) {
				case this.campNotificationTypes.EVENT_RAID_RECENT:
					let campComponent = campNode.camp;
					let timeS = "(" + UIConstants.getTimeSinceText(campComponent.lastRaid.timestamp) + " ago)";
					return "There has been a raid on level " + level + " " + timeS + ". We need better defences.";
					
				case this.campNotificationTypes.EVENT_TRADER:
					let traderComponent = campNode.entity.get(TraderComponent);
					if (!traderComponent || !traderComponent.caravan) return "";
					return "There is a trader (" + traderComponent.caravan.name + ") currently on level " + level + ".";
				
				case this.campNotificationTypes.EVENT_OUTGOING_CARAVAN:
					let caravansComponent = campNode.entity.get(OutgoingCaravansComponent);
					if (!caravansComponent || caravansComponent.outgoingCaravans.length < 1) return null;
					let caravan = caravansComponent.outgoingCaravans[0];
					
					let duration = caravan.returnDuration * 1000;
					let timeLeft = (caravan.returnTimeStamp - new Date().getTime()) / 1000;
					let caravanTimeS = timeLeft < 30 ? "very soon" : UIConstants.getTimeToNum(timeLeft);
					
				 	return "Outgoing caravan on level " + level + " (expected to return in " + caravanTimeS + ").";
					
				case this.campNotificationTypes.EVENT_RECRUIT: return "There is a visitor currently on level " + level + ".";
				case this.campNotificationTypes.POP_UNASSIGNED: return "Unassigned workers on level " + level + ".";
				case this.campNotificationTypes.POP_DECREASING: return "Population is decreasing on level " + level + "!";
				case this.campNotificationTypes.POP_INCREASING: return "Population is increasing on level " + level + ".";
				case this.campNotificationTypes.BUILDING_DAMAGED: return "Damaged building(s) on level " + level + ".";
				case this.campNotificationTypes.STATUS_NON_REACHABLE_BY_TRADERS: return "Camp on level " + level + " can't trade resources with other camps.";
				default: return null;
			}
		},

		// smaller number -> higher prio
		getNotificationPriority: function (notificationType) {
			switch (notificationType) {
				case this.campNotificationTypes.POP_DECREASING: return 1;
				case this.campNotificationTypes.EVENT_RAID_ONGOING: return 2;
				case this.campNotificationTypes.EVENT_RAID_RECENT: return 2;
				case this.campNotificationTypes.EVENT_TRADER: return 3;
				case this.campNotificationTypes.EVENT_RECRUIT: return 3;
				case this.campNotificationTypes.BUILDING_DAMAGED: return 4;
				case this.campNotificationTypes.POP_UNASSIGNED: return 5;
				case this.campNotificationTypes.EVENT_OUTGOING_CARAVAN: return 6;
				case this.campNotificationTypes.STATUS_NON_REACHABLE_BY_TRADERS: return 7;
				case this.campNotificationTypes.POP_INCREASING: return 8;
				default: return 9;
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
		
		getCampRowID: function (campOrdinal) {
			return "summary-camp-" + campOrdinal;
		},

		onTabChanged: function () {
			this.sortCampNodes();
			if (GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.world) {
				this.refresh();
			}
		},
		
		onCampBuilt: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			this.sortCampNodes();
			this.refresh();
		},

	});

	return UIOutTribeSystem;
});
