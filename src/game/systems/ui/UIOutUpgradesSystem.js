define([
    'ash',
    'game/constants/UIConstants',
    'game/constants/UpgradeConstants',
    'game/nodes/tribe/TribeUpgradesNode',
], function (Ash, UIConstants, UpgradeConstants, TribeUpgradesNode) {
    var UIOutUpgradesSystem = Ash.System.extend({
	
		uiFunctions : null,
		playerActions : null,
		upgradeEffectsHelper: null,
		
		engine: null,
		
		tabChangedSignal: null,
		
		tribeNodes: null,
		
		lastUpdateUpgradeCount: 0,
	
		constructor: function (uiFunctions, tabChangedSignal, playerActions, upgradeEffectsHelper) {
			this.uiFunctions = uiFunctions;
			this.tabChangedSignal = tabChangedSignal;
			this.playerActions = playerActions;
			this.upgradeEffectsHelper = upgradeEffectsHelper;
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
					if (hasBlueprintNew || isAvailable) {
						var nameTD = "<td class='item-name'>" + upgradeDefinition.name + "</td>";
						var classes = hasBlueprintNew ? "item item-equipped" : "item";
						var iconTD = "<td style='padding: 0px 3px'>";
						if (hasBlueprintUnlocked || hasBlueprintNew)
							iconTD += "<span class='" + classes + "'><div class='info-callout-target info-callout-target-small' description='blueprint'><img src='img/items/blueprint.png'/></div></span>";
						iconTD += "</td>";
						var descriptionTD = "<td class='maxwidth'>" + upgradeDefinition.description + "<br/>" + this.getEffectDescription(upgradeDefinition.id, hasBlueprintNew)  + "</td>";
						
						if (isAvailable)
							buttonTD = "<td class='minwidth'><button class='action' action='" + upgradeDefinition.id + "'>research</button></td>";
						else if(hasBlueprintNew)
							buttonTD = "<td class='minwidth'><button class='action' action='unlock_upgrade_" + upgradeDefinition.id + "'>unlock</button></td>";
						else
							buttonTD = "<td></td>";
							
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
		
		getEffectDescription: function (upgradeId, isUnlockable) {
			var effects = "";
			
			if(isUnlockable) {
				effects = "";
			} else {
				var unlockedBuildings = this.upgradeEffectsHelper.getUnlockedBuildings(upgradeId);
				if (unlockedBuildings.length > 0) {
					effects += "buildings: ";
					for (var i in unlockedBuildings) {
						effects += unlockedBuildings[i];
					}
					effects += ", ";
				}
				
				var improvedBuildings = this.upgradeEffectsHelper.getImprovedBuildings(upgradeId);
				if (improvedBuildings.length > 0) {
					for (var i in improvedBuildings) {
						effects += "improved " + improvedBuildings[i];
					}
					effects += ", ";
				}
				
				var unlockedWorkers = this.upgradeEffectsHelper.getUnlockedWorkers(upgradeId);
				if (unlockedWorkers.length > 0) {
					effects += "workers: ";
					for (var i in unlockedWorkers) {
						effects += unlockedWorkers[i];
					}
					effects += ", ";
				}
				
				var improvedWorkers = this.upgradeEffectsHelper.getImprovedWorkers(upgradeId);
				if (improvedWorkers.length > 0) {
					for (var i in improvedWorkers) {
						effects += "improved " + improvedWorkers[i];
					}
					effects += ", ";
				}
				
				var unlockedItems = this.upgradeEffectsHelper.getUnlockedItems(upgradeId);
				if (unlockedItems.length > 0) {
					effects += "items: ";
					for (var i in unlockedItems) {
						effects += unlockedItems[i];
					}
					effects += ", ";
				}
				
				var unlockedOccurrences = this.upgradeEffectsHelper.getUnlockedOccurrences(upgradeId);
				if (unlockedOccurrences.length > 0) {
					effects += "events: ";
					for (var i in unlockedOccurrences) {
						effects += unlockedOccurrences[i];
					}
					effects += ", ";
				}
				
				var improvedOccurrences = this.upgradeEffectsHelper.getImprovedOccurrences(upgradeId);
				if (improvedOccurrences.length > 0) {
					for (var i in improvedOccurrences) {
						effects += "improved " + improvedOccurrences[i];
					}
					effects += ", ";
				}
			
				// TODO unlocked upgrades? only when other requirements met / blueprint not required?

				if (effects.length > 0) effects = effects.slice(0, -2);
			}
			
			return "<span class='p-meta'>" + effects + " </span>";
		},
    });

    return UIOutUpgradesSystem;
});
