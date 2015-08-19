define([
    'ash',
    'game/constants/UIConstants',
    'game/constants/UpgradeConstants',
    'game/nodes/tribe/TribeUpgradesNode',
], function (Ash, UIConstants, UpgradeConstants, TribeUpgradesNode) {
    var UIOutUpgradesSystem = Ash.System.extend({
	
		uiFunctions : null,
		playerActions : null,
		
		engine: null,
		
		tabChangedSignal: null,
		
		tribeNodes: null,
		
		lastUpdateUpgradeCount: 0,
	
		constructor: function (uiFunctions, tabChangedSignal, playerActions) {
			this.uiFunctions = uiFunctions;
			this.tabChangedSignal = tabChangedSignal;
			this.playerActions = playerActions;
			return this;
		},
	
		addToEngine: function (engine) {
			this.engine = engine;
			this.tribeNodes = engine.getNodeList(TribeUpgradesNode);
			this.lastUpdateUpgradeCount = 0;
		},
	
		removeFromEngine: function (engine) {
			this.engine = null;
			this.tribeNodes = null;
		},
	
		update: function (time) {
			if (this.uiFunctions.gameState.uiStatus.currentTab != this.uiFunctions.elementIDs.tabs.upgrades) {
				return;
			}
			
			var blueprintsShown = $("#blueprints-list tr").length;
			if (blueprintsShown !== this.tribeNodes.head.upgrades.newBlueprints.length)
				this.updateUpgradesLists();
			$("#world-blueprints").toggle($("#blueprints-list tr").length > 0);
			
			var listsEmpty = $("#upgrades-list button").length + $("#researched-upgrades-list button").length <= 0;
			if (listsEmpty || this.lastUpdateUpgradeCount !== this.tribeNodes.head.upgrades.boughtUpgrades.length) {
				this.updateUpgradesLists();
			}
			
			$("#tab-header h2").text("Upgrades");
			$("#world-upgrades-count").toggle(this.lastUpdateUpgradeCount > 0);
			$("#world-upgrades-count").text("Upgrades researched: " + this.lastUpdateUpgradeCount);
		},
		
		updateUpgradesLists: function () {
			$("#blueprints-list").empty();
			$("#upgrades-list").empty();
			$("#researched-upgrades-list").empty();
			var upgradeDefinition;
			var hasBlueprintUnlocked;
			var hasBlueprintNew;
			var isAvailable;
			var buttonTD;
			for (var id in UpgradeConstants.upgradeDefinitions) {
				upgradeDefinition = UpgradeConstants.upgradeDefinitions[id];
				if (!this.tribeNodes.head.upgrades.hasBought(id)) {
					hasBlueprintUnlocked = this.tribeNodes.head.upgrades.hasAvailableBlueprint(id);
					hasBlueprintNew = this.tribeNodes.head.upgrades.hasNewBlueprint(id);
					isAvailable = this.playerActions.playerActionsHelper.checkRequirements(id, false).value > 0;
					if (hasBlueprintNew || hasBlueprintUnlocked || isAvailable) {
						var nameTD = "<td class='item-name'>" + upgradeDefinition.name + "</td>";
						var classes = hasBlueprintNew ? "item item-equipped" : "item";
						var iconTD = "<td style='padding: 0px 3px'>";
						if (hasBlueprintUnlocked || hasBlueprintNew)
							iconTD += "<span class='" + classes + "'><div class='info-callout-target info-callout-target-small' description='blueprint'><img src='img/items/blueprint.png'/></div></span>";
						iconTD += "</td>";
						var descriptionTD = "<td>" + upgradeDefinition.description + "</td>";
						
						if (isAvailable)
							buttonTD = "<td><button class='action' action='" + upgradeDefinition.id + "'>research</button></td>";
						else
							buttonTD = "<td><button class='action' action='unlock_upgrade_" + upgradeDefinition.id + "'>unlock</button></td>";
							
						var tr = "<tr>" + nameTD + "" + descriptionTD + "" + iconTD + "" + buttonTD + "</tr>";
						if (hasBlueprintNew)
							$("#blueprints-list").append(tr);
						else
							$("#upgrades-list").append(tr);
					}
				} else {
					var nameTD = "<td class='item-name'><span class='upgrade'>" + upgradeDefinition.name + "</span></td>";
					var descriptionTD = "<td>"+ upgradeDefinition.description +"</td>"
					var tr = "<tr>" + nameTD + "" + descriptionTD + "</tr>";
					$("#researched-upgrades-list").append(tr);
				}
			}
			
			$("#world-upgrades-info").toggle($("#researched-upgrades-list tr").length > 0);
			
			var playerActions = this.playerActions;
			$.each($("#upgrades-list button.action"), function () {
				$(this).click(function () {
					playerActions.buyUpgrade($(this).attr("action"));
				})
			});
			
			this.uiFunctions.generateButtonOverlays("#upgrades-list");
			this.uiFunctions.generateCallouts("#upgrades-list");
			this.uiFunctions.generateButtonOverlays("#blueprints-list");
			this.uiFunctions.generateCallouts("#blueprints-list");
			this.uiFunctions.registerActionButtonListeners("#blueprints-list");
			this.lastUpdateUpgradeCount = this.tribeNodes.head.upgrades.boughtUpgrades.length;
		},
    });

    return UIOutUpgradesSystem;
});
