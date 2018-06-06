define([
    'ash',
    'game/constants/UIConstants',
    'game/constants/CampConstants',
    'game/nodes/sector/CampNode',
    'game/nodes/PlayerPositionNode',
    'game/components/common/PositionComponent',
    'game/components/common/ResourcesComponent',
    'game/components/common/ResourceAccumulationComponent',
    'game/components/type/LevelComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/components/sector/events/TraderComponent',
    'game/components/sector/events/RaidComponent'
], function (
    Ash, UIConstants, CampConstants,
    CampNode, PlayerPositionNode,
    PositionComponent, ResourcesComponent, ResourceAccumulationComponent, LevelComponent, SectorImprovementsComponent, TraderComponent, RaidComponent
) {
    var UIOutTribeSystem = Ash.System.extend({
	
		uiFunctions : null,
		resourcesHelper: null,
		
		engine: null,
	
        campNodes: null,
		playerPosNodes: null,

        campNotificationTypes: {
            NONE: "none",
            EVENT_RAID: "event_raid",
            EVENT_TRADER: "event_trader",
            POP_UNASSIGNED: "population-unassigned",
            POP_DECREASING: "population-decreasing",
            POP_INCREASING: "population-increasing"
        },

        constructor: function (uiFunctions, resourcesHelper, levelHelper) {
			this.uiFunctions = uiFunctions;
			this.resourcesHelper = resourcesHelper;
            this.levelHelper = levelHelper;
            return this;
        },

        addToEngine: function (engine) {
			this.engine  = engine;
            this.campNodes = engine.getNodeList( CampNode );
            this.playerPosNodes = engine.getNodeList(PlayerPositionNode);
        },

        removeFromEngine: function (engine) {
			this.engine = null;
            this.campNodes = null;
            this.playerPosNodes = null;
        },

        update: function (time) {
            var isActive = this.uiFunctions.gameState.uiStatus.currentTab === this.uiFunctions.elementIDs.tabs.world;
			
            this.campsWithAlert = 0;
            for (var node = this.campNodes.head; node; node = node.next) {
                this.updateNode(node, isActive);
            }
            this.updateBubble();
            
			if (!isActive) {
				return;
			}
	    
			$("#tab-header h2").text("Tribe");
        },
        
        updateBubble: function () {
            if (this.campsWithAlert === this.bubbleNumber)
                return;
            this.bubbleNumber = this.campsWithAlert;
            this.uiFunctions.toggle("#switch-world .bubble", this.bubbleNumber > 0);
        },
	
		updateNode: function (node, isActive) {
			var camp = node.camp;
			var level = node.entity.get(PositionComponent).level;
			var playerPosComponent = this.playerPosNodes.head.position;
            var isPlayerInCampLevel = level === playerPosComponent.level;
            var unAssignedPopulation = camp.getFreePopulation();
            
            // determine alert
            var alerts = [];
            var hasTrader = node.entity.has(TraderComponent);
            var hasRaid = node.entity.has(RaidComponent);
            
            if (!isPlayerInCampLevel) {
                if (hasRaid) alerts.push(this.campNotificationTypes.EVENT_RAID);
                if (hasTrader) alerts.push(this.campNotificationTypes.EVENT_TRADER);
                if (unAssignedPopulation > 0) alerts.push(this.campNotificationTypes.POP_UNASSIGNED);
                if (camp.populationChangePerSec < 0) alerts.push(this.campNotificationTypes.POP_DECREASING);
            }
            
            var isAlert = alerts.length > 0;
            if (isAlert) this.campsWithAlert++;
            
            if (!isActive) return;
            
			var improvements = node.entity.get(SectorImprovementsComponent);
			var rowID = "summary-camp-" + level;
			var row = $("#camp-overview tr#" + rowID);
			
			// Create row
			var globalStorageCapacity = this.resourcesHelper.getCurrentStorageCap();
			if (row.length < 1) {
				var rowHTML = "<tr id='" + rowID + "' class='lvl13-box-1'>";
				var btnID = "out-action-move-camp-" + level;
                var btnAction = "move_camp_global_" + level;
				rowHTML += "<td class='camp-overview-level'><div class='camp-overview-level-container lvl13-box-1'>" + level + "</div></td>";
				rowHTML += "<td class='camp-overview-name'>" + camp.campName + "</td>";
				rowHTML += "<td class='camp-overview-population list-amount'><span class='value'></span><span class='change-indicator'></span></td>";
				rowHTML += "<td class='camp-overview-reputation list-amount'><span class='value'></span><span class='change-indicator'></span></td>";
				rowHTML += "<td class='camp-overview-levelpop list-amount'></td>";
				rowHTML += "<td class='camp-overview-improvements list-amount'>";
				rowHTML += "</span></td>";
				rowHTML += "<td class='camp-overview-storage list-amount'></td>";
				rowHTML += "<td class='camp-overview-production'>";
				for(var key in resourceNames) {
					var name = resourceNames[key];
					rowHTML += UIConstants.createResourceIndicator(name, false, rowID+"-"+name, false, true) + " ";
				}
				rowHTML += "</td>";
				
				rowHTML += "<td class='camp-overview-btn'><button class='btn-mini action action-move' id='" + btnID + "' action='" + btnAction + "'>Go</button></td>";
                rowHTML += "<td class='camp-overview-camp-bubble'><div class='bubble info-callout-target info-callout-target-small' description=''>!</div></td>";
				
				rowHTML += "</tr>";
				$("#camp-overview").append(rowHTML);
				var uiFunctions = this.uiFunctions;
				$("#" + btnID).click(function(e) {
					uiFunctions.onTabClicked(uiFunctions.elementIDs.tabs.in, uiFunctions.gameState, uiFunctions);
				});
                this.uiFunctions.registerActionButtonListeners("#" + rowID);
                this.uiFunctions.generateButtonOverlays("#" + rowID);
                this.uiFunctions.generateCallouts("#" + rowID);
			}
			
			// Update row
			$("#camp-overview tr#" + rowID).toggleClass("current", isPlayerInCampLevel);
			this.uiFunctions.toggle("#camp-overview tr#" + rowID + " .camp-overview-btn button", !isPlayerInCampLevel);
			$("#camp-overview tr#" + rowID + " .camp-overview-name").text(camp.campName);
			this.uiFunctions.toggle("#camp-overview tr#" + rowID + " .camp-overview-camp-bubble .bubble", isAlert);
			
            var alertDesc = "";
            for (var i = 0; i < alerts.length; i++) {
                alertDesc += this.getAlertDescription(alerts[i]);
                if (i !== alerts.length - 1) alertDesc += "<br/>";
            }
            UIConstants.updateCalloutContent("#camp-overview tr#" + rowID + " .camp-overview-camp-bubble .bubble", alertDesc, true)
			
			var maxPopulation = improvements.getCount(improvementNames.house) * CampConstants.POPULATION_PER_HOUSE;
			maxPopulation += improvements.getCount(improvementNames.house2) * CampConstants.POPULATION_PER_HOUSE2;
			$("#camp-overview tr#" + rowID + " .camp-overview-population .value").text(Math.floor(camp.population) + "/" + maxPopulation + (unAssignedPopulation > 0 ? " (" + unAssignedPopulation + ")" : ""));
			$("#camp-overview tr#" + rowID + " .camp-overview-population .value").toggleClass("warning", camp.populationChangePerSec < 0);
            this.updateChangeIndicator($("#camp-overview tr#" + rowID + " .camp-overview-population .change-indicator"), camp.populationChangePerSec);
            
            var reputationComponent = node.reputation;
            $("#camp-overview tr#" + rowID + " .camp-overview-reputation .value").text(UIConstants.roundValue(reputationComponent.value, true, false) + "/" + reputationComponent.targetValue);
            $("#camp-overview tr#" + rowID + " .camp-overview-reputation .value").toggleClass("warning", reputationComponent.targetValue < 1);
            this.updateChangeIndicator($("#camp-overview tr#" + rowID + " .camp-overview-reputation .change-indicator"), reputationComponent.accumulation);
            
            var levelVO = this.levelHelper.getLevelEntityForSector(node.entity).get(LevelComponent).levelVO;
			$("#camp-overview tr#" + rowID + " .camp-overview-levelpop").text(levelVO.populationGrowthFactor * 100 + "%");
			
			var hasTradePost = improvements.getCount(improvementNames.tradepost) > 0;
			$("#camp-overview tr#" + rowID + " .camp-overview-improvements").text(hasTradePost ? "X" : "-");
			
			var resources = node.entity.get(ResourcesComponent);
			var resourceAcc = node.entity.get(ResourceAccumulationComponent);
			for (var key in resourceNames) {
				var name = resourceNames[key];
				var amount = Math.floor(resources.resources[name]);
				var change = resourceAcc.resourceChange.getResource(name);
				UIConstants.updateResourceIndicator(
					this.uiFunctions,
					"#" + rowID + "-" + name,
					amount,
					change,
					globalStorageCapacity,
					false,
                    true,
					false,
					false,
                    name === resourceNames.food || name === resourceNames.water,
					amount > 0 || Math.abs(change) > 0.001);
				UIConstants.updateResourceIndicatorCallout("#" + rowID+"-"+name, resourceAcc.getSources(name));
			}
			
			$("#camp-overview tr#" + rowID + " .camp-overview-storage").text(resources.storageCapacity);
		},
        
        getAlertDescription: function (notificationType) {
            switch (notificationType) {
                case this.campNotificationTypes.EVENT_RAID: return "raid";
                case this.campNotificationTypes.EVENT_TRADER: return "trader";
                case this.campNotificationTypes.POP_UNASSIGNED: return "unassigned workers";
                case this.campNotificationTypes.POP_DECREASING: return "population decreasing";
                default: return "";
            }
        },
        
        updateChangeIndicator: function (indicator, accumulation, showWarning) {
            indicator.toggleClass("indicator-increase", accumulation > 0);
            indicator.toggleClass("indicator-even", accumulation === 0);
            indicator.toggleClass("indicator-decrease", !showWarning && accumulation < 0);
        },
	
    });

    return UIOutTribeSystem;
});
