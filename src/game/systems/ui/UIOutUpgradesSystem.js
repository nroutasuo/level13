define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/CampConstants',
	'game/constants/ImprovementConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/UIConstants',
	'game/constants/UpgradeConstants',
	'game/constants/TextConstants',
	'game/nodes/tribe/TribeUpgradesNode',
], function (Ash, GameGlobals, GlobalSignals, CampConstants, ImprovementConstants, PlayerActionConstants, UIConstants, UpgradeConstants, TextConstants, TribeUpgradesNode) {
	
	var UpgradeStatusEnum = {
		HIDDEN: 0,
		BLUEPRINT_IN_PROGRESS: 1,
		BLUEPRINT_USABLE: 2,
		VISIBLE: 3,
		UNLOCKABLE: 4,
		UNLOCKED: 5,
	};
	
	var UIOutUpgradesSystem = Ash.System.extend({

		engine: null,

		tribeNodes: null,

		lastUpdateUpgradeCount: 0,

		numCurrentNewBlueprints: 0,
		numCurrentResearchableUpgrades: 0,
		numShownResearchableUpgrades: 0,

		constructor: function () {
			var sys = this;
			this.vis = GameGlobals.uiTechTreeHelper.init("researched-upgrades-vis", "upgrades-vis-overlay", function () {
				sys.refreshTechDetails();
			});
		},

		addToEngine: function (engine) {
			this.engine = engine;
			this.tribeNodes = engine.getNodeList(TribeUpgradesNode);
			this.lastUpdateUpgradeCount = 0;
			GameGlobals.uiTechTreeHelper.enableScrolling(this.vis);
			GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.onTabChanged);
			GlobalSignals.add(this, GlobalSignals.blueprintsChangedSignal, this.onBlueprintsChanged);
			GlobalSignals.add(this, GlobalSignals.upgradeUnlockedSignal, this.onUpgradeUnlocked);
		},

		removeFromEngine: function (engine) {
			this.engine = null;
			this.tribeNodes = null;
			GlobalSignals.removeAll(this);
		},

		update: function (time) {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			if (!GameGlobals.gameState.uiStatus.isInCamp) return;
			var isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.upgrades;

			this.updateBubble();
			// TODO performance bottleneck (GC rrelated to update status check)
			this.updateUpgradesLists(isActive);
		},
		
		refresh: function () {
			$("#tab-header h2").text("Upgrades");
			this.refreshUpgradesLists();
			this.refreshTechTree(true);
			this.refreshTechDetails();
			GameGlobals.uiFunctions.toggle("#world-blueprints", $("#blueprints-list tr").length > 0);
			GameGlobals.uiFunctions.toggle("#world-upgrades-count", this.lastUpdateUpgradeCount > 0);
			$("#world-upgrades-count").text("Upgrades researched: " + this.lastUpdateUpgradeCount);
		},

		updateBubble: function () {
			var completedBlueprintsNum = Math.max(0, this.getCurrentCompletableCount());
			var newBlueprintsNum = this.numCurrentNewBlueprints;
			var upgradesNum = this.numCurrentResearchableUpgrades - this.numShownResearchableUpgrades;
			var newBubbleNumber = completedBlueprintsNum + newBlueprintsNum + upgradesNum;
			if (this.bubbleNumber === newBubbleNumber)
				return;
			
			GameGlobals.uiFunctions.updateBubble("#switch-upgrades .bubble", this.bubbleNumber, newBubbleNumber);
			this.bubbleNumber = newBubbleNumber;
		},

		updateUpgradesLists: function (isActive) {
			this.numCurrentNewBlueprints = 0;
			this.numCurrentResearchableUpgrades = 0;

			var status;
			for (var id in UpgradeConstants.upgradeDefinitions) {
				status = this.getUpgradeStatus(id);
				switch (status) {
					case UpgradeStatusEnum.BLUEPRINT_USABLE:
						this.numCurrentNewBlueprints++;
						break;
					case UpgradeStatusEnum.UNLOCKABLE:
						this.numCurrentResearchableUpgrades++;
						break;
				}
			}

			if (isActive) this.numShownResearchableUpgrades = this.numCurrentResearchableUpgrades;
		},
		
		refreshUpgradesLists: function () {
			$("#blueprints-list").empty();
			$("#upgrades-list").empty();

			var upgradeDefinition;
			var status;
			var numUnResearched = 0;
			
			for (var id in UpgradeConstants.upgradeDefinitions) {
				upgradeDefinition = UpgradeConstants.upgradeDefinitions[id];
				status = this.getUpgradeStatus(id);
				
				if (status != UpgradeStatusEnum.UNLOCKED)
					numUnResearched++;
					
				switch (status) {
					case UpgradeStatusEnum.UNLOCKABLE:
					case UpgradeStatusEnum.VISIBLE:
						var tr = this.getUpgradeTR(upgradeDefinition, status);
						$("#upgrades-list").append(tr);
						break;
					case UpgradeStatusEnum.BLUEPRINT_USABLE:
					case UpgradeStatusEnum.BLUEPRINT_IN_PROGRESS:
						var tr = this.getUpgradeTR(upgradeDefinition, status);
							$("#blueprints-list").append(tr);
						break;
				}
			}
			
			GameGlobals.uiFunctions.toggle("#world-upgrades-info", this.tribeNodes.head.upgrades.boughtUpgrades.length > 0);
			var noUpgrades = $("#upgrades-list tr").length === 0;
			GameGlobals.uiFunctions.toggle("#world-upgrades-empty-message", noUpgrades);
			if (noUpgrades) {
				var allResearched = numUnResearched === 0;
				$("#world-upgrades-empty-message").text(allResearched ?
					"All upgrades researched." : "No upgrades available at the moment.");
			}

			$.each($("#upgrades-list button.action"), function () {
				$(this).click(function () {
					GameGlobals.playerActionFunctions.buyUpgrade($(this).attr("action"));
				})
			});

			GameGlobals.uiFunctions.generateButtonOverlays("#upgrades-list");
			GameGlobals.uiFunctions.generateCallouts("#upgrades-list");
			GameGlobals.uiFunctions.generateButtonOverlays("#blueprints-list");
			GameGlobals.uiFunctions.generateCallouts("#blueprints-list");
			GameGlobals.uiFunctions.registerActionButtonListeners("#blueprints-list");
			GlobalSignals.elementCreatedSignal.dispatch();
			this.lastUpdateUpgradeCount = this.tribeNodes.head.upgrades.boughtUpgrades.length;
		},

		refreshTechTree: function (resetLists) {
			if (!resetLists)
				return;
			GameGlobals.uiTechTreeHelper.drawTechTree(this.vis);
		},

		refreshTechDetails: function () {
			var hasSelection = this.vis.selectedID !== null;
			GameGlobals.uiFunctions.toggle($("#upgrade-details-content-empty"), !hasSelection);
			GameGlobals.uiFunctions.toggle($("#upgrade-details-content"), hasSelection);
			if (hasSelection) {
				var definition = UpgradeConstants.upgradeDefinitions[this.vis.selectedID];
				var isUnlocked = this.tribeNodes.head.upgrades.hasUpgrade(definition.id);
				var isAvailable = GameGlobals.playerActionsHelper.checkRequirements(definition.id, false).value > 0;
				var statusS = isUnlocked ? "researched" : isAvailable ? "available" : "locked";
				$("#upgrade-details-status").text(statusS);
				$("#upgrade-details-name").text(definition.name);
				$("#upgrade-details-desc").text(definition.description);
				$("#upgrade-details-effect").text(this.getEffectDescription(this.vis.selectedID, false));
			}
		},
		
		getCurrentCompletableCount: function () {
			if (!this.tribeNodes.head) return 0;
			var count = 0;
			for (let i = 0; i < this.tribeNodes.head.upgrades.newBlueprints.length; i++) {
				var blueprintVO = this.tribeNodes.head.upgrades.newBlueprints[i];
				if (blueprintVO.completed) continue;
				if (this.tribeNodes.head.upgrades.hasUpgrade(blueprintVO.upgradeID)) continue;
				var actionName = "create_blueprint_" + blueprintVO.upgradeID;
				var reqsCheck = GameGlobals.playerActionsHelper.checkRequirements(actionName, false);
				if (reqsCheck.value < 1) continue;
				if (blueprintVO.currentPieces === blueprintVO.maxPieces) count++;
			}
			return count;
		},
			
		onTabChanged: function () {
			var isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.upgrades;
			if (isActive) {
				this.vis.selectedID = null;
				this.refresh();
			}
		},
		
		onUpgradeUnlocked: function () {
			var isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.upgrades;
			if (isActive) this.refresh();
		},
		
		onBlueprintsChanged: function () {
			var isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.upgrades;
			if (isActive) this.refresh();
			else this.updateUpgradesLists(false, false);
		},
		
		getUpgradeStatus: function (id) {
			if (this.tribeNodes.head.upgrades.hasUpgrade(id))
				return UpgradeStatusEnum.UNLOCKED;
			if (GameGlobals.playerActionsHelper.checkAvailability(id, false))
				return UpgradeStatusEnum.UNLOCKABLE;
			if (GameGlobals.playerActionsHelper.isRequirementsMet(id))
				return UpgradeStatusEnum.VISIBLE;
			if (this.tribeNodes.head.upgrades.hasAvailableBlueprint(id))
				return UpgradeStatusEnum.VISIBLE;
			if (this.tribeNodes.head.upgrades.hasNewBlueprint(id))
				return UpgradeStatusEnum.BLUEPRINT_USABLE;
			if (this.tribeNodes.head.upgrades.hasUnfinishedBlueprint(id))
				return UpgradeStatusEnum.BLUEPRINT_IN_PROGRESS;
				
			return UpgradeStatusEnum.HIDDEN;
		},
		
		getUpgradeTR: function (upgradeDefinition, status) {
			var nameTD = "<td class='item-name'>" + upgradeDefinition.name + "</td>";
			var classes = status == UpgradeStatusEnum.BLUEPRINT_USABLE ? "item item-equipped" : "item";
			var iconTD = "<td style='padding: 0px 3px'>";
			var hasBlueprint = this.tribeNodes.head.upgrades.getBlueprint(upgradeDefinition.id);
			if (hasBlueprint)
				iconTD += "<span class='" + classes + "'><div class='info-callout-target info-callout-target-small' description='blueprint'><img src='img/items/blueprint.png' alt='blueprint'/></div></span>";
			iconTD += "</td>";

			var effectDesc = "<span class='p-meta'>" + this.getEffectDescription(upgradeDefinition.id, status) + "</span>"
			var descriptionTD = "<td class='maxwidth'>";
			descriptionTD += upgradeDefinition.description + "<br/>" + effectDesc + "</td>";

			var buttonTD;
			switch (status) {
				case UpgradeStatusEnum.VISIBLE:
				case UpgradeStatusEnum.UNLOCKABLE:
					let action = upgradeDefinition.id;
					let baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(action);
					buttonTD = "<td class='minwidth'><button class='action' action='" + action + "' baseaction='" + baseActionID + "'>research</button></td>";
					break;
				case UpgradeStatusEnum.BLUEPRINT_USABLE:
					 buttonTD = "<td class='minwidth'><button class='action' action='unlock_upgrade_" + upgradeDefinition.id + "'>unlock</button></td>";
					 break;
				case UpgradeStatusEnum.BLUEPRINT_IN_PROGRESS:
					var blueprintVO = this.tribeNodes.head.upgrades.getBlueprint(upgradeDefinition.id);
					var piecesTD = "<td style='text-align:left'>";
					for (let j = 0; j < blueprintVO.maxPieces; j++) {
						var icon = j < blueprintVO.currentPieces ? UIConstants.getBlueprintPieceIcon(blueprintVO.upgradeID) : "";
						var classes = "blueprint-piece-box" + (j < blueprintVO.currentPieces ? " blueprint-piece-box-found" : " blueprint-piece-box-missing");
						piecesTD += "<div class='" + classes + "'>" + icon + "</div>";
					}
					piecesTD += "</td>";
					descriptionTD = piecesTD;
					iconTD = "<td class='hide-on-mobiles list-amount'>" + blueprintVO.currentPieces + " / " + blueprintVO.maxPieces + "</td>";
					buttonTD = "<td class='list-action'><button class='action multiline' action='create_blueprint_" + upgradeDefinition.id + "'>Combine</button></td>";
					break;
				default:
					buttonTD = "<td></td>";
					break;
			}
			return "<tr data-upgrade-id='" + upgradeDefinition.id + "' data-status='" + status + "'>" + nameTD + "" + descriptionTD + "" + iconTD + "" + buttonTD + "</tr>";
		},

		getEffectDescription: function (upgradeID, status) {
			var effects = "";

			if (status == UpgradeStatusEnum.BLUEPRINT_USABLE || status == UpgradeStatusEnum.BLUEPRINT_IN_PROGRESS) {
				effects = "";
			} else {
				var unlockedBuildings = GameGlobals.upgradeEffectsHelper.getUnlockedBuildings(upgradeID);
				if (unlockedBuildings.length > 0) {
					effects += "buildings: ";
					for (let i in unlockedBuildings) {
						effects += this.getImprovementDisplayName(unlockedBuildings[i]).toLowerCase();
						effects += ", ";
					}
				}

				var improvedBuildings = GameGlobals.upgradeEffectsHelper.getImprovedBuildings(upgradeID);
				if (improvedBuildings.length > 0) {
					for (let i in improvedBuildings) {
						effects += "improved " + this.getImprovementDisplayName(improvedBuildings[i]).toLowerCase();
						effects += ", ";
					}
				}

				var unlockedWorkers = GameGlobals.upgradeEffectsHelper.getUnlockedWorkers(upgradeID);
				if (unlockedWorkers.length > 0) {
					effects += "workers: ";
					for (let i in unlockedWorkers)
						effects += unlockedWorkers[i];
					effects += ", ";
				}

				var improvedWorkers = GameGlobals.upgradeEffectsHelper.getImprovedWorkers(upgradeID);
				if (improvedWorkers.length > 0) {
					for (let i in improvedWorkers) {
						// TOOD make a global get worker display name function
						var name = CampConstants.getWorkerDisplayName(improvedWorkers[i]);
						effects += "improved " + name;
					}
					effects += ", ";
				}

				var unlockedItems = GameGlobals.upgradeEffectsHelper.getUnlockedItems(upgradeID);
				if (unlockedItems.length > 0) {
					effects += "items: ";
					for (let i in unlockedItems) {
						effects += unlockedItems[i].name.toLowerCase();
						effects += ", ";
					}
				}

				var unlockedOccurrences = GameGlobals.upgradeEffectsHelper.getUnlockedOccurrences(upgradeID);
				if (unlockedOccurrences.length > 0) {
					effects += "events: ";
					for (let i in unlockedOccurrences) {
						effects += unlockedOccurrences[i];
					}
					effects += ", ";
				}

				var improvedOccurrences = GameGlobals.upgradeEffectsHelper.getImprovedOccurrences(upgradeID);
				if (improvedOccurrences.length > 0) {
					for (let i in improvedOccurrences) {
						effects += "improved " + improvedOccurrences[i];
					}
					effects += ", ";
				}

				var unlockedActions = GameGlobals.upgradeEffectsHelper.getUnlockedGeneralActions(upgradeID);
				if (unlockedActions.length > 0) {
					for (let i in unlockedActions) {
						let baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(unlockedActions[i])
						effects += "enable " + TextConstants.getActionName(baseActionID);
					}
					effects += ", ";
				}

				if (effects.length > 0) effects = effects.slice(0, -2);
			}

			return effects;
		},
		
		getImprovementDisplayName: function (improvementName) {
			// TODO determine what improvement level to use (average? current camp?)
			return ImprovementConstants.getImprovementDisplayName(improvementName);
		},
		
	});

	return UIOutUpgradesSystem;
});
