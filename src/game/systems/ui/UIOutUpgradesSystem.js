define([
	'ash',
	'text/Text',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/UIConstants',
	'game/constants/UpgradeConstants',
	'game/constants/TextConstants',
	'game/nodes/tribe/TribeUpgradesNode',
], function (Ash, Text, GameGlobals, GlobalSignals, GameConstants, UIConstants, UpgradeConstants, TextConstants, TribeUpgradesNode) {
	
	let UIOutUpgradesSystem = Ash.System.extend({

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
			GlobalSignals.add(this, GlobalSignals.slowUpdateSignal, this.slowUpdate);
			GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.onTabChanged);
			GlobalSignals.add(this, GlobalSignals.blueprintsChangedSignal, this.onBlueprintsChanged);
			GlobalSignals.add(this, GlobalSignals.upgradeUnlockedSignal, this.onUpgradeUnlocked);
		},

		removeFromEngine: function (engine) {
			GlobalSignals.removeAll(this);
			this.engine = null;
			this.tribeNodes = null;
		},

		update: function (time) {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			if (!GameGlobals.gameState.uiStatus.isInCamp) return;
			let isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.upgrades;
			if (isActive) this.updateBubble();
		},

		slowUpdate: function (time) {
			let isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.upgrades;
			this.updateUpgradeCounts(isActive);
			this.updateBubble();
		},
		
		refresh: function () {
			$("#tab-header h2").text(Text.t("ui.main.tab_upgrades_header"));
			this.refreshUpgradesLists();
			this.refreshTechTree(true);
			this.refreshTechDetails();
			this.updateBubble();
			GameGlobals.uiFunctions.toggle("#world-blueprints", $("#blueprints-list tr").length > 0);
			GameGlobals.uiFunctions.toggle("#world-upgrades-count", this.lastUpdateUpgradeCount > 0);
			$("#world-upgrades-count").text(Text.t("ui.upgrades.reseached_upgrades_field", { num: this.lastUpdateUpgradeCount }));
		},

		updateBubble: function () {
			var completedBlueprintsNum = Math.max(0, this.getCurrentCompletableCount());
			var newBlueprintsNum = this.numCurrentNewBlueprints;
			var upgradesNum = Math.max(0, this.numCurrentResearchableUpgrades - this.numShownResearchableUpgrades);

			if (this.tribeNodes.head.upgrades.boughtUpgrades.length > 0) {
				GameGlobals.gameState.markSeenTab(GameGlobals.uiFunctions.elementIDs.tabs.upgrades);
			}

			let newBubbleNumber = completedBlueprintsNum + newBlueprintsNum + upgradesNum;
			if (!GameGlobals.gameState.hasSeenTab(GameGlobals.uiFunctions.elementIDs.tabs.upgrades)) newBubbleNumber = "!";
			
			GameGlobals.uiFunctions.updateBubble("#switch-upgrades .bubble", this.bubbleNumber, newBubbleNumber);
			this.bubbleNumber = newBubbleNumber;
		},

		updateUpgradeCounts: function (isActive) {
			this.numCurrentNewBlueprints = 0;
			this.numCurrentResearchableUpgrades = 0;

			for (let id in UpgradeConstants.upgradeDefinitions) {
				let status = GameGlobals.tribeHelper.getUpgradeStatus(id);
				switch (status) {
					case UpgradeConstants.upgradeStatus.BLUEPRINT_USABLE:
						this.numCurrentNewBlueprints++;
						break;
					case UpgradeConstants.upgradeStatus.UNLOCKABLE:
						this.numCurrentResearchableUpgrades++;
						break;
				}
			}

			if (isActive) this.numShownResearchableUpgrades = this.numCurrentResearchableUpgrades;
		},
		
		refreshUpgradesLists: function () {
			$("#blueprints-list").empty();
			$("#upgrades-list").empty();

			let numUnResearched = 0;

			let upgradeDefinitions = [];
			
			for (let id in UpgradeConstants.upgradeDefinitions) {
				let upgradeDefinition = UpgradeConstants.upgradeDefinitions[id];
				upgradeDefinitions.push(upgradeDefinition);
			}

			upgradeDefinitions.sort((a, b) => a.campOrdinal - b.campOrdinal);

			for (let i = 0; i < upgradeDefinitions.length; i++) {
				let upgradeDefinition = upgradeDefinitions[i];
				let id = upgradeDefinition.id;
				let status = GameGlobals.tribeHelper.getUpgradeStatus(id);
				
				if (status != UpgradeConstants.upgradeStatus.UNLOCKED)
					numUnResearched++;
					
				switch (status) {
					case UpgradeConstants.upgradeStatus.UNLOCKABLE:
					case UpgradeConstants.upgradeStatus.VISIBLE_FULL:
						var tr = this.getUpgradeTR(upgradeDefinition, status);
						$("#upgrades-list").append(tr);
						break;
					case UpgradeConstants.upgradeStatus.BLUEPRINT_USABLE:
					case UpgradeConstants.upgradeStatus.BLUEPRINT_IN_PROGRESS:
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
					GlobalSignals.triggerSoundSignal.dispatch(UIConstants.soundTriggerIDs.buttonClicked);
					GameGlobals.playerActionFunctions.buyUpgrade($(this).attr("action"));
				})
			});

			GameGlobals.uiFunctions.createButtons("#upgrades-list");
			GameGlobals.uiFunctions.generateInfoCallouts("#upgrades-list");
			
			GameGlobals.uiFunctions.createButtons("#blueprints-list");
			GameGlobals.uiFunctions.generateInfoCallouts("#blueprints-list");
			
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
				let name = Text.t(UpgradeConstants.getDisplayNameTextKey(definition.id));
				let description = Text.t(UpgradeConstants.getDescriptionTextKey(definition.id));
				$("#upgrade-details-status").text(statusS);
				$("#upgrade-details-name").text(name);
				$("#upgrade-details-desc").text(description);
				$("#upgrade-details-effect").text(this.getEffectDescription(this.vis.selectedID, false));
				$("#upgrade-details-unlocked-research").text(this.getUnlockedResearchDescription(this.vis.selectedID));
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
				let requiredPieces = GameConstants.cheatModeBlueprints ? 1 : blueprintVO.maxPieces;
				if (blueprintVO.currentPieces === requiredPieces) count++;
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
			else this.updateUpgradeCounts(false);
		},
		
		getUpgradeTR: function (upgradeDefinition, status) {
			let isSmallLayout = $("body").hasClass("layout-small");

			let classes = status == UpgradeConstants.upgradeStatus.BLUEPRINT_USABLE ? "item item-equipped" : "item";
			let iconTD = "<td style='padding: 0px 3px'>";
			let hasBlueprint = this.tribeNodes.head.upgrades.getBlueprint(upgradeDefinition.id);
			if (hasBlueprint && !isSmallLayout)
				iconTD += "<span class='" + classes + "'><div class='info-callout-target info-callout-target-small' description='blueprint'><img src='img/items/blueprint.png' alt='blueprint'/></div></span>";
			iconTD += "</td>";

			let unlockedResearchDescription = this.getUnlockedResearchDescription(upgradeDefinition.id);

			let effectSpan = "<span class='p-meta'>" + this.getEffectDescription(upgradeDefinition.id, status) + "</span>"
			let unlockedResearchSpan = "<span class='p-meta'>" + unlockedResearchDescription + "</span>"
			let description = Text.t(UpgradeConstants.getDescriptionTextKey(upgradeDefinition.id)) + "<br/>" + effectSpan;
			
			if (unlockedResearchDescription && unlockedResearchDescription.length > 0) {
				description += "<br/>" + unlockedResearchSpan;
			}
			
			let showDescription = true;
			let blueprintTD = "";

			let buttonTD;
			switch (status) {
				case UpgradeConstants.upgradeStatus.VISIBLE_FULL:
				case UpgradeConstants.upgradeStatus.UNLOCKABLE:
					let action = upgradeDefinition.id;
					let baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(action);
					buttonTD = "<td class='minwidth'><button class='action' action='" + action + "' baseaction='" + baseActionID + "'>research</button></td>";
					break;
				case UpgradeConstants.upgradeStatus.BLUEPRINT_USABLE:
					 buttonTD = "<td class='minwidth'><button class='action' action='unlock_upgrade_" + upgradeDefinition.id + "'>unlock</button></td>";
					 break;
				case UpgradeConstants.upgradeStatus.BLUEPRINT_IN_PROGRESS:
					var blueprintVO = this.tribeNodes.head.upgrades.getBlueprint(upgradeDefinition.id);
					blueprintTD = "<td style='text-align:left'>";
					for (let j = 0; j < blueprintVO.maxPieces; j++) {
						let icon = j < blueprintVO.currentPieces ? UIConstants.getBlueprintPieceIcon(blueprintVO.upgradeID) : "";
						let isFilled = j < blueprintVO.currentPieces;
						let blueprintLevel = this.getBlueprintLevel(upgradeDefinition.id);
						classes = "blueprint-piece-box" + (isFilled ? " blueprint-piece-box-found info-callout-target info-callout-target-side" : " blueprint-piece-box-missing");
						let blueprintPieceDescription = isFilled ? 
							Text.t("ui.upgrades.blueprint_piece_found_level_hint", blueprintLevel) :
							Text.t("ui.upgrades.blueprint_piece_missing_hint");
						blueprintTD += "<div class='" + classes + "' description='" + blueprintPieceDescription + "'>" + icon + "</div>";
					}
					blueprintTD += "</td>";
					showDescription = false;
					iconTD = "<td class='hide-on-mobiles list-amount'>" + blueprintVO.currentPieces + " / " + blueprintVO.maxPieces + "</td>";
					buttonTD = "<td class='list-action'><button class='action multiline' action='create_blueprint_" + upgradeDefinition.id + "'>Combine</button></td>";
					break;
				default:
					buttonTD = "<td></td>";
					break;
			}

			let name = Text.t(UpgradeConstants.getDisplayNameTextKey(upgradeDefinition.id));

			if (GameConstants.isDebugVersion) name += " <span class='debug-info'>" + upgradeDefinition.campOrdinal  + "</span>";

			if (isSmallLayout) {
				let nameAndDescriptionTD = "<td class='item-name'>" + name + (showDescription ? ("<br/>" + description) : "") + "</td>";
				return "<tr data-upgrade-id='" + upgradeDefinition.id + "' data-status='" + status + "'>" + nameAndDescriptionTD + "" + blueprintTD + "" + iconTD + "" + buttonTD + "</tr>";
			} else {
				let nameTD = "<td class='item-name'>" + name + "</td>";
				let descriptionTD = "<td class='maxwidth'>" + description + "</td>";
				return "<tr data-upgrade-id='" + upgradeDefinition.id + "' data-status='" + status + "'>" + nameTD + "" + (showDescription ? descriptionTD : "") + ""+ blueprintTD + "" + iconTD + "" + buttonTD + "</tr>";
			}
		},

		getBlueprintLevel: function (upgradeID) {
			let campOrdinal = UpgradeConstants.getBlueprintCampOrdinal(upgradeID);
			let levelIndex = UpgradeConstants.getBlueprintLevelIndex(upgradeID);

			let levelsForCamp = GameGlobals.gameState.getLevelsForCamp(campOrdinal);
			if (levelsForCamp.length == 1) return levelsForCamp[0];
			if (levelIndex == 0) return levelsForCamp[0];

			return levelsForCamp[1];
		},

		getEffectDescription: function (upgradeID, status) {
			let effects = "";

			if (status == UpgradeConstants.upgradeStatus.BLUEPRINT_USABLE || status == UpgradeConstants.upgradeStatus.BLUEPRINT_IN_PROGRESS) {
				effects = "";
			} else {
				effects = GameGlobals.upgradeEffectsHelper.getEffectDescription(upgradeID, false);
			}

			return effects;
		},

		getUnlockedResearchDescription: function (upgradeID) {
			let status = GameGlobals.tribeHelper.getUpgradeStatus(upgradeID);

			switch (status) {
				case UpgradeConstants.upgradeStatus.HIDDEN:
				case UpgradeConstants.upgradeStatus.VISIBLE_HINT:
				case UpgradeConstants.upgradeStatus.BLUEPRINT_IN_PROGRESS:
				case UpgradeConstants.upgradeStatus.BLUEPRINT_USABLE:
					return "";
				
				default:
					let researchIDs = GameGlobals.upgradeEffectsHelper.getUnlockedResearchIDs(upgradeID);

					if (researchIDs.length == 0) return "";

					let shownResearchNames = [];
					let hiddenResearchNames = [];

					for (let i = 0; i < researchIDs.length; i++) {
						let researchStatus = GameGlobals.tribeHelper.getUpgradeStatus(researchIDs[i]);
						let researchID = UpgradeConstants.upgradeDefinitions[researchIDs[i]].id;
						let researchName = Text.t(UpgradeConstants.getDisplayNameTextKey(researchID))

						switch (researchStatus) {
							case UpgradeConstants.upgradeStatus.HIDDEN:
								hiddenResearchNames.push(researchName);
								break;
							default:
								shownResearchNames.push(researchName);
								break;
						}
					}

					if (shownResearchNames.length == 0) return "";

					return "unlocked research: " + shownResearchNames.join(", ");
			}
		},
		
	});

	return UIOutUpgradesSystem;
});
