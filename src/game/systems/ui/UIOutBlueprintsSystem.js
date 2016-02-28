define([
    'ash',
    'game/constants/UIConstants',
    'game/constants/UpgradeConstants',
    'game/nodes/tribe/TribeUpgradesNode',
], function (Ash, UIConstants, UpgradeConstants, TribeUpgradesNode) {
    var UIOutBlueprintsSystem = Ash.System.extend({
	
		uiFunctions : null,
		playerActions : null,
		upgradeEffectsHelper: null,
		
		engine: null,
		
		tabChangedSignal: null,
		
		tribeNodes: null,
        
        lastShownPieceCount: 0,
	
		constructor: function (uiFunctions, tabChangedSignal, playerActions, upgradeEffectsHelper) {
			this.uiFunctions = uiFunctions;
			this.tabChangedSignal = tabChangedSignal;
			this.playerActions = playerActions;
			this.upgradeEffectsHelper = upgradeEffectsHelper;

			var system = this;

			this.onTabChanged = function (tabID) {
				if (tabID === system.uiFunctions.elementIDs.tabs.blueprints) {
                    system.updateBlueprintList();
                }
			};
            
			return this;
		},
	
		addToEngine: function (engine) {
			this.engine = engine;
			this.tribeNodes = engine.getNodeList(TribeUpgradesNode);
			this.hasNeverBeenOpened = !this.uiFunctions.gameState.unlockedFeatures.blueprints;
			this.tabChangedSignal.add(this.onTabChanged);
            this.lastShownPieceCount = this.getCurrentPieceCount();
		},
	
		removeFromEngine: function (engine) {
			this.tabChangedSignal.remove(this.onTabChanged);
			this.engine = null;
			this.tribeNodes = null;
		},
	
		update: function (time) {
			var isActive = this.uiFunctions.gameState.uiStatus.currentTab === this.uiFunctions.elementIDs.tabs.blueprints;
			this.updateBubble();
            
            if (isActive) {
                $("#tab-header h2").text("Blueprints pieces");
                var resetList = this.tribeNodes.head.upgrades.getUnfinishedBlueprints().length !== $("#blueprints-pieces-list tr").length || $("#blueprints-pieces-list tr").length === 0;
                if (resetList) this.updateBlueprintList();
                this.lastShownPieceCount = this.getCurrentPieceCount();
            }
		},
        
        updateBubble: function () {
            this.bubbleNumber = Math.max(0, this.getCurrentPieceCount() - this.lastShownPieceCount);
            $("#switch-blueprints .bubble").text(this.bubbleNumber);
            $("#switch-blueprints .bubble").toggle(this.bubbleNumber > 0);
        },
        
        updateBlueprintList: function () {
			$("#blueprints-pieces-list").empty();
			for (var i = 0; i < this.tribeNodes.head.upgrades.newBlueprints.length; i++) {
                var blueprintVO = this.tribeNodes.head.upgrades.newBlueprints[i];
                if (blueprintVO.completed) continue;
                
                var upgradeDefinition = UpgradeConstants.upgradeDefinitions[blueprintVO.upgradeId];
                var nameTD = "<td class='item-name'>" + upgradeDefinition.name + "</td>";
                var piecesTD = "<td style='text-align:left'>";
                for (var j = 0; j < blueprintVO.maxPieces; j++) {
                    var icon = j < blueprintVO.currentPieces ? UIConstants.getBlueprintPieceIcon(blueprintVO) : "";
                    var classes = "blueprint-piece-box" + (j < blueprintVO.currentPieces ? " blueprint-piece-box-found" : " blueprint-piece-box-missing");
                    piecesTD += "<div class='" + classes + "'>" + icon + "</div>";
                }
                piecesTD += "</td>";
                var numbersTD = "<td class='hide-on-mobiles list-amount'>" + blueprintVO.currentPieces + " / " + blueprintVO.maxPieces + "</td>";
                var unlockTD = "<td class='list-action'><button class='action' action='create_blueprint_" + upgradeDefinition.id + "'>Unlock</button></td>";
                var tr = "<tr>" + nameTD + piecesTD + numbersTD + unlockTD + "</tr>";
				$("#blueprints-pieces-list").append(tr);
            }
			this.uiFunctions.generateButtonOverlays("#blueprints-pieces-list");
			this.uiFunctions.generateCallouts("#blueprints-pieces-list");
			this.uiFunctions.registerActionButtonListeners("#blueprints-pieces-list");
            
            $("#blueprints-list-empty-message").toggle($("#blueprints-pieces-list tr").length === 0);
        },
        
        getCurrentPieceCount: function () {
            var count = 0;
			for (var i = 0; i < this.tribeNodes.head.upgrades.newBlueprints.length; i++) {
                var blueprintVO = this.tribeNodes.head.upgrades.newBlueprints[i];
                if (blueprintVO.completed) continue;
                count += blueprintVO.currentPieces;
            }
            return count;
        },
		
    });

    return UIOutBlueprintsSystem;
});
