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
		
		tribeNodes: null,
		
		lastUpdateUpgradeCount: 0,
	
		constructor: function (uiFunctions, playerActions) {
			this.uiFunctions = uiFunctions;
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
			
			var listsEmpty = $("#upgrades-list button").length + $("#unlocked-upgrades-list button").length <= 0;
			if (listsEmpty || this.lastUpdateUpgradeCount != this.tribeNodes.head.upgrades.boughtUpgrades.length) {
				this.updateUpgradesList();
			}
			
			$("#tab-header h2").text("Upgrades");
			$("#world-upgrades-count").toggle(this.lastUpdateUpgradeCount > 0);
			$("#world-upgrades-count").text("Upgrades unlocked: " + this.lastUpdateUpgradeCount);
		},
		
		updateUpgradesList: function () {
			$("#upgrades-list").empty();
			$("#unlocked-upgrades-list").empty();
			var upgradeDefinition;
			for (var id in UpgradeConstants.upgradeDefinitions) {
				upgradeDefinition = UpgradeConstants.upgradeDefinitions[id];
				if (!this.tribeNodes.head.upgrades.hasBought(id)) {
					console.log(id + " | " + this.playerActions.checkRequirements(id, false).value)
					if (this.playerActions.checkRequirements(id, false).value > 0) {
						var buttonTD = "<td><button class='action btn-wide' action='" + upgradeDefinition.id + "'>" + upgradeDefinition.name + "</button></td>";
						var descriptionTD = "<td>"+ upgradeDefinition.description +"</td>"
						var tr = "<tr>" + buttonTD + "" + descriptionTD + "</tr>";
						$("#upgrades-list").append(tr);
					}
				} else {
					var nameTD = "<td><span class='upgrade'>" + upgradeDefinition.name + "</span></td>";
					var descriptionTD = "<td>"+ upgradeDefinition.description +"</td>"
					var tr = "<tr>" + nameTD + "" + descriptionTD + "</tr>";
					$("#unlocked-upgrades-list").append(tr);		    
				}
			}
			
			var playerActions = this.playerActions;
			$.each($("#upgrades-list button.action"), function() {
				$(this).click(function () {
					playerActions.buyUpgrade($(this).attr("action"));
				})
			});
			
			this.uiFunctions.generateButtonOverlays("#upgrades-list");
			this.uiFunctions.generateCallouts("#upgrades-list");
			
			console.log("Update upgrade list " + this.tribeNodes.head.upgrades.boughtUpgrades.length);
			this.lastUpdateUpgradeCount = this.tribeNodes.head.upgrades.boughtUpgrades.length;
		},
	
    });

    return UIOutUpgradesSystem;
});
