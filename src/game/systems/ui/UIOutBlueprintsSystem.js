define([
    'ash',
    'game/GameGlobals',
    'game/GlobalSignals',
    'game/constants/GameConstants',
    'game/constants/UIConstants',
    'game/constants/UpgradeConstants',
    'game/nodes/tribe/TribeUpgradesNode',
], function (Ash, GameGlobals, GlobalSignals, GameConstants, UIConstants, UpgradeConstants, TribeUpgradesNode) {
    var UIOutBlueprintsSystem = Ash.System.extend({
		
		engine: null,
		
		tribeNodes: null,
	
		constructor: function () {
			var system = this;
			this.onTabChanged = function (tabID) {
				if (tabID === GameGlobals.uiFunctions.elementIDs.tabs.blueprints) {
                    $("#tab-header h2").text("Blueprints pieces");
                    system.updateBlueprintList();
                }
			};
			return this;
		},
	
		addToEngine: function (engine) {
			this.engine = engine;
			this.tribeNodes = engine.getNodeList(TribeUpgradesNode);
			this.hasNeverBeenOpened = !GameGlobals.gameState.unlockedFeatures.blueprints;
			GlobalSignals.tabChangedSignal.add(this.onTabChanged);
			GlobalSignals.add(this, GlobalSignals.blueprintsChangedSignal, this.refresh);
		},
	
		removeFromEngine: function (engine) {
			GlobalSignals.tabChangedSignal.remove(this.onTabChanged);
			this.engine = null;
			this.tribeNodes = null;
		},
	
		update: function (time) {
			var isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.blueprints;
			this.updateBubble();
		},
        
        refresh: function () {
            this.updateBlueprintList();
        },
        
        updateBubble: function () {
            var newBubbleNumber = Math.max(0, this.getCurrentCompletableCount());
            if (this.bubbleNumber === newBubbleNumber)
                return;
            this.bubbleNumber = newBubbleNumber;
            $("#switch-blueprints .bubble").text(this.bubbleNumber);
            GameGlobals.uiFunctions.toggle("#switch-blueprints .bubble", this.bubbleNumber > 0);
        },
        
        updateBlueprintList: function () {
			$("#blueprints-pieces-list").empty();
			for (var i = 0; i < this.tribeNodes.head.upgrades.newBlueprints.length; i++) {
                var blueprintVO = this.tribeNodes.head.upgrades.newBlueprints[i];
                if (blueprintVO.completed) continue;
                if (this.tribeNodes.head.upgrades.hasUpgrade(blueprintVO.upgradeId)) continue;
                
                var upgradeDefinition = UpgradeConstants.upgradeDefinitions[blueprintVO.upgradeId];
                
                if (!upgradeDefinition) {
                    log.w("No definition found for upgrade: " + blueprintVO.upgradeId);
                    continue;
                }
                
                var nameTD = "<td class='item-name'>" + upgradeDefinition.name + "</td>";
                var piecesTD = "<td style='text-align:left'>";
                for (var j = 0; j < blueprintVO.maxPieces; j++) {
                    var icon = j < blueprintVO.currentPieces ? UIConstants.getBlueprintPieceIcon(blueprintVO.upgradeId) : "";
                    var classes = "blueprint-piece-box" + (j < blueprintVO.currentPieces ? " blueprint-piece-box-found" : " blueprint-piece-box-missing");
                    piecesTD += "<div class='" + classes + "'>" + icon + "</div>";
                }
                piecesTD += "</td>";
                var numbersTD = "<td class='hide-on-mobiles list-amount'>" + blueprintVO.currentPieces + " / " + blueprintVO.maxPieces + "</td>";
                var unlockTD = "<td class='list-action'><button class='action multiline' action='create_blueprint_" + upgradeDefinition.id + "'>Combine</button></td>";
                var tr = "<tr>" + nameTD + piecesTD + numbersTD + unlockTD + "</tr>";
				$("#blueprints-pieces-list").append(tr);
            }
			GameGlobals.uiFunctions.generateButtonOverlays("#blueprints-pieces-list");
			GameGlobals.uiFunctions.generateCallouts("#blueprints-pieces-list");
			GameGlobals.uiFunctions.registerActionButtonListeners("#blueprints-pieces-list");
            GlobalSignals.elementCreatedSignal.dispatch();
            
            GameGlobals.uiFunctions.toggle("#blueprints-list-empty-message", $("#blueprints-pieces-list tr").length === 0);
        },
        
        getCurrentCompletableCount: function () {
            if (!this.tribeNodes.head) return 0;
            var count = 0;
			for (var i = 0; i < this.tribeNodes.head.upgrades.newBlueprints.length; i++) {
                var blueprintVO = this.tribeNodes.head.upgrades.newBlueprints[i];
                if (blueprintVO.completed) continue;
                if (this.tribeNodes.head.upgrades.hasUpgrade(blueprintVO.upgradeId)) continue;
                if (blueprintVO.currentPieces === blueprintVO.maxPieces) count++;
            }
            return count;
        },
		
    });

    return UIOutBlueprintsSystem;
});
