define([
    'ash',
    'game/GameGlobals',
    'game/GlobalSignals',
    'game/constants/PlayerActionConstants',
    'game/constants/UIConstants',
    'game/constants/UpgradeConstants',
    'game/nodes/tribe/TribeUpgradesNode',
], function (Ash, GameGlobals, GlobalSignals, PlayerActionConstants, UIConstants, UpgradeConstants, TribeUpgradesNode) {
    
    var UpgradeStatusEnum = {
        HIDDEN: 0,
        BLUEPRINT_USABLE: 1,
        VISIBLE: 2,
        UNLOCKABLE: 3,
        UNLOCKED: 4,
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
			var blueprintsNum = this.numCurrentNewBlueprints;
			var upgradesNum = this.numCurrentResearchableUpgrades - this.numShownResearchableUpgrades;
            var newBubbleNumber = blueprintsNum + upgradesNum;
            if (this.bubbleNumber === newBubbleNumber)
                return;
            this.bubbleNumber = blueprintsNum + upgradesNum;
            $("#switch-upgrades .bubble").text(this.bubbleNumber);
            GameGlobals.uiFunctions.toggle("#switch-upgrades .bubble", this.bubbleNumber > 0);
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
            var requirements = GameGlobals.playerActionsHelper.checkRequirements(id, false);
            if (requirements.value > 0)
                return UpgradeStatusEnum.VISIBLE;
            if (this.tribeNodes.head.upgrades.hasAvailableBlueprint(id))
                return UpgradeStatusEnum.VISIBLE;
            if (this.tribeNodes.head.upgrades.hasNewBlueprint(id))
                return UpgradeStatusEnum.BLUEPRINT_USABLE;
                
            return UpgradeStatusEnum.HIDDEN;
        },
        
		getUpgradeTR: function (upgradeDefinition, status) {
			var nameTD = "<td class='item-name'>" + upgradeDefinition.name + "</td>";
			var classes = status == UpgradeStatusEnum.BLUEPRINT_USABLE ? "item item-equipped" : "item";
			var iconTD = "<td style='padding: 0px 3px'>";
            var hasBlueprint = this.tribeNodes.head.upgrades.getBlueprint(upgradeDefinition.id);
			if (hasBlueprint)
				iconTD += "<span class='" + classes + "'><div class='info-callout-target info-callout-target-small' description='blueprint'><img src='img/items/blueprint.png'/></div></span>";
			iconTD += "</td>";

            var effectDesc = "<span class='p-meta'>" + this.getEffectDescription(upgradeDefinition.id, status) + "</span>"
			var descriptionTD = "<td class='maxwidth'>";
			descriptionTD += upgradeDefinition.description + "<br/>" + effectDesc + "</td>";

            var buttonTD;
			switch (status) {
                case UpgradeStatusEnum.VISIBLE:
                case UpgradeStatusEnum.UNLOCKABLE:
    				buttonTD = "<td class='minwidth'><button class='action' action='" + upgradeDefinition.id + "'>research</button></td>";
                    break;
                case UpgradeStatusEnum.BLUEPRINT_USABLE:
			         buttonTD = "<td class='minwidth'><button class='action' action='unlock_upgrade_" + upgradeDefinition.id + "'>unlock</button></td>";
                     break;
                default:
		            buttonTD = "<td></td>";
                    break;
            }

			return "<tr>" + nameTD + "" + descriptionTD + "" + iconTD + "" + buttonTD + "</tr>";
		},

		getEffectDescription: function (upgradeId, status) {
			var effects = "";

			if (status == UpgradeStatusEnum.BLUEPRINT_USABLE) {
				effects = "";
			} else {
				var unlockedBuildings = GameGlobals.upgradeEffectsHelper.getUnlockedBuildings(upgradeId);
				if (unlockedBuildings.length > 0) {
					effects += "buildings: ";
					for (var i in unlockedBuildings) {
						effects += this.getImprovementDisplayName(unlockedBuildings[i]).toLowerCase();
                        effects += ", ";
					}
				}

				var improvedBuildings = GameGlobals.upgradeEffectsHelper.getImprovedBuildings(upgradeId);
				if (improvedBuildings.length > 0) {
					for (var i in improvedBuildings) {
						effects += "improved " + improvedBuildings[i].toLowerCase();
					}
					effects += ", ";
				}

				var unlockedWorkers = GameGlobals.upgradeEffectsHelper.getUnlockedWorkers(upgradeId);
				if (unlockedWorkers.length > 0) {
					effects += "workers: ";
					for (var i in unlockedWorkers)
						effects += unlockedWorkers[i];
					effects += ", ";
				}

				var improvedWorkers = GameGlobals.upgradeEffectsHelper.getImprovedWorkers(upgradeId);
				if (improvedWorkers.length > 0) {
					for (var i in improvedWorkers) {
                        // TOOD make a global get worker display name function
                        var name = improvedWorkers[i] == "weaver" ? "rope-maker" : improvedWorkers[i];
						effects += "improved " + name;
					}
					effects += ", ";
				}

				var unlockedItems = GameGlobals.upgradeEffectsHelper.getUnlockedItems(upgradeId);
				if (unlockedItems.length > 0) {
					effects += "items: ";
					for (var i in unlockedItems) {
						effects += unlockedItems[i].toLowerCase();
						effects += ", ";
					}
				}

				var unlockedOccurrences = GameGlobals.upgradeEffectsHelper.getUnlockedOccurrences(upgradeId);
				if (unlockedOccurrences.length > 0) {
					effects += "events: ";
					for (var i in unlockedOccurrences) {
						effects += unlockedOccurrences[i];
					}
					effects += ", ";
				}

				var improvedOccurrences = GameGlobals.upgradeEffectsHelper.getImprovedOccurrences(upgradeId);
				if (improvedOccurrences.length > 0) {
					for (var i in improvedOccurrences) {
						effects += "improved " + improvedOccurrences[i];
					}
					effects += ", ";
				}

				var unlockedUI = GameGlobals.upgradeEffectsHelper.getUnlockedUI(upgradeId);
				if (unlockedUI.length > 0) {
					for (var i in unlockedUI) {
						effects += "show " + unlockedUI[i];
					}
					effects += ", ";
				}

				// TODO unlocked upgrades? only when other requirements met / blueprint not required?

				if (effects.length > 0) effects = effects.slice(0, -2);
			}

			return effects;
		},
        
        getImprovementDisplayName: function (improvementName) {
            return improvementName;
        },
        
    });

    return UIOutUpgradesSystem;
});
