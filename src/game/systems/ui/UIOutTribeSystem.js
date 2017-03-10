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
		
		tabChangedSignal: null,
	
        campNodes: null,
		playerPosNodes: null,

        constructor: function (uiFunctions, tabChangedSignal, resourcesHelper, levelHelper) {
			this.uiFunctions = uiFunctions;
			this.tabChangedSignal = tabChangedSignal;
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
            this.bubbleNumber = this.campsWithAlert;
            $("#switch-world .bubble").toggle(this.bubbleNumber > 0);
        },
	
		updateNode: function (node, isActive) {
			var camp = node.camp;
			var level = node.entity.get(PositionComponent).level;
			var playerPosComponent = this.playerPosNodes.head.position;
            var isPlayerInCampLevel = level === playerPosComponent.level;
            
            // TODO also so alert for raids that are over until camp is visited again; new CampAlertComponent? Event components should stay simple and only show current event
            var unAssignedPopulation = camp.getFreePopulation();
            var hasTrader = node.entity.has(TraderComponent);
            var hasRaid = node.entity.has(RaidComponent);
            
            var isAlert = false;
            
            if ((unAssignedPopulation > 0 || hasTrader || hasRaid) && !isPlayerInCampLevel) {
                this.campsWithAlert++;
                isAlert = true;
            }
            
            if (!isActive) return;
            
			var improvements = node.entity.get(SectorImprovementsComponent);
			var rowID = "summary-camp-" + level;
			var row = $("#camp-overview tr#" + rowID);
			
			// Create row
			var globalStorageCapacity = this.resourcesHelper.getCurrentStorageCap();
			if (row.length < 1) {
				var rowHTML = "<tr id='" + rowID + "'>";
				var btnID = "out-action-move-camp-" + level;
				rowHTML += "<td class='camp-overview-level'>" + level + "</td>";
				rowHTML += "<td class='camp-overview-name'>" + camp.campName + "</td>";
				rowHTML += "<td class='camp-overview-population list-amount'></td>";
				rowHTML += "<td class='camp-overview-reputation list-amount'></td>";
				rowHTML += "<td class='camp-overview-levelpop list-amount'></td>";
				rowHTML += "<td class='camp-overview-improvements'>";
				rowHTML += "</span></td>";
				rowHTML += "<td class='camp-overview-storage list-amount'></td>";
				rowHTML += "<td class='camp-overview-production'>";
				for(var key in resourceNames) {
					var name = resourceNames[key];
					rowHTML += UIConstants.createResourceIndicator(name, false, rowID+"-"+name, false, true) + " ";
				}
				rowHTML += "</td>";
				
				rowHTML += "<td class='camp-overview-btn'><button class='btn-mini action action-move' id='" + btnID + "' action='move_camp_global'>Go</button></td>";
                rowHTML += "<td class='camp-overview-camp-bubble'><div class='bubble'>!</div></td>";
				rowHTML += "</tr>";
				$("#camp-overview").append(rowHTML);
				var uiFunctions = this.uiFunctions;
				$("#" + btnID).click(function(e) {
					uiFunctions.onTabClicked(uiFunctions.elementIDs.tabs.in, uiFunctions.elementIDs, uiFunctions.gameState, uiFunctions.playerActions);
					uiFunctions.onMoveButtonClicked(this, uiFunctions.playerActions);
				});
                this.uiFunctions.generateButtonOverlays("#" + rowID);
                this.uiFunctions.generateCallouts("#" + rowID);
			}
			
			// Update row
			$("#camp-overview tr#" + rowID).toggleClass("current", isPlayerInCampLevel);
			$("#camp-overview tr#" + rowID + " .camp-overview-btn button").toggle(!isPlayerInCampLevel);
			$("#camp-overview tr#" + rowID + " .camp-overview-name").text(camp.campName);
			$("#camp-overview tr#" + rowID + " .camp-overview-camp-bubble .bubble").toggle(isAlert);
			
			var maxPopulation = improvements.getCount(improvementNames.house) * CampConstants.POPULATION_PER_HOUSE;
			maxPopulation += improvements.getCount(improvementNames.house2) * CampConstants.POPULATION_PER_HOUSE2;
			$("#camp-overview tr#" + rowID + " .camp-overview-population").text(Math.floor(camp.population) + "/" + maxPopulation + (unAssignedPopulation > 0 ? " (" + unAssignedPopulation + ")" : ""));
			
            var reputationComponent = node.reputation;
            $("#camp-overview tr#" + rowID + " .camp-overview-reputation").text(UIConstants.roundValue(reputationComponent.value, true, false) + "/" + reputationComponent.targetValue + "%");
            $("#camp-overview tr#" + rowID + " .camp-overview-reputation").toggleClass("warning", reputationComponent.targetValue < 1);
            
            var levelVO = this.levelHelper.getLevelEntityForSector(node.entity).get(LevelComponent).levelVO;
			$("#camp-overview tr#" + rowID + " .camp-overview-levelpop").text(levelVO.populationGrowthFactor * 100 + "%");
			
			var improvementsText = "";
			var improvementList = improvements.getAll();
			for(var i = 0; i < improvementList.length; i++) {
				var improvement = improvementList[i];
				var count = improvement.count;
				var name = improvement.name;
				if (count > 0 &&
					name != improvementNames.collector_food &&
					name != improvementNames.collector_water &&
					name != improvementNames.bridge &&
					name != improvementNames.house &&
					name != improvementNames.house2 &&
					name != improvementNames.campfire &&
					name != improvementNames.smithy &&
					name != improvementNames.cementmill &&
					name != improvementNames.radio &&
					name != improvementNames.lights &&
					name != improvementNames.barracks &&
					name != improvementNames.apothecary &&
					name != improvementNames.home &&
					name != improvementNames.fortification &&
					name != improvementNames.darkfarm &&
					name != improvementNames.storage) {
					improvementsText += count + "x" + name.substring(0,1) + " ";
				}
			}
			$("#camp-overview tr#" + rowID + " .camp-overview-improvements").text(improvementsText);
			
			var productionText = "";
			var resources = node.entity.get(ResourcesComponent);
			var resourceAcc = node.entity.get(ResourceAccumulationComponent);
			for (var key in resourceNames) {
				var name = resourceNames[key];
				var amount = Math.floor(resources.resources[name]);
				var change = resourceAcc.resourceChange.getResource(name);
				UIConstants.updateResourceIndicator(
					name,
					"#" + rowID + "-" + name,
					amount,
					change,
					globalStorageCapacity,
					false,
                    true,
					true,
					false,
                    name === resourceNames.food || name === resourceNames.water,
					amount > 0 || Math.abs(change) > 0.001);
				UIConstants.updateResourceIndicatorCallout("#" + rowID+"-"+name, resourceAcc.getSources(name));
			}
			
			$("#camp-overview tr#" + rowID + " .camp-overview-storage").text(resources.storageCapacity);
		}
	
    });

    return UIOutTribeSystem;
});
